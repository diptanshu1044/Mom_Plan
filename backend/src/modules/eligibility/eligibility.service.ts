import { randomUUID } from 'node:crypto';
import { ANTHROPIC_MODEL } from '../../config/anthropic';
import { prisma } from '../../config/prisma';
import { RulesEngine } from './rules.engine';
import Anthropic from '@anthropic-ai/sdk';
import { FamilyProfile } from '@prisma/client';
import {
  applyEligibilityFilters,
  computeAvailableStates,
  computeSummary,
  EligibilityResultsFilters,
  EligibilityResultsResponse,
  filterStateOptions,
  normalizeStateCode,
} from './eligibility.filters';
import { getProgramsForEligibilityScan, formatEstimatedBenefit, EligibilityScanProgram } from '../programs/programs.eligibility';
import {
  buildQuarterDueDatesByProgramAndYear,
  getAvailableYearsFromProgramYearMap,
  getQuarterForMonth,
  getRelevantDueDateInQuarter,
  quarterDueDatesByYearToObject,
  QuarterDueDatesByProgramAndYear,
} from '../programs/quarterDueDates.service';

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) return fenced[1].trim();
  const openOnly = trimmed.match(/^```(?:json)?\s*([\s\S]*)$/i);
  if (openOnly) return openOnly[1].trim();
  return trimmed;
}

function extractJsonArray(text: string): string {
  const start = text.indexOf('[');
  if (start === -1) return text;
  const end = text.lastIndexOf(']');
  return end > start ? text.slice(start, end + 1) : text.slice(start);
}

function salvageJsonObjects(text: string): unknown[] {
  const results: unknown[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        try {
          results.push(JSON.parse(text.slice(start, i + 1)));
        } catch {
          // skip malformed object
        }
        start = -1;
      }
    }
  }
  return results;
}

function parseAiJsonArray(text: string): unknown[] {
  const cleaned = extractJsonArray(stripJsonFences(text));
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    const salvaged = salvageJsonObjects(cleaned);
    if (salvaged.length > 0) return salvaged;
    throw new Error(`Invalid JSON from AI response (${cleaned.length} chars)`);
  }
  throw new Error('AI response is not a JSON array');
}

const AI_MAX_TOKENS = 8192;
/** ~120 chars/object — keeps each batch well under AI_MAX_TOKENS output. */
const AI_BATCH_SIZE = 50;
const AI_MIN_SCORE = 60;
const AI_MAX_SCORE = 80;
const MAX_AI_PROGRAMS = 20;

function needsAiRefinement(ruleResult: { score: number }): boolean {
  return ruleResult.score >= AI_MIN_SCORE && ruleResult.score <= AI_MAX_SCORE;
}

type AiEligibilityResult = {
  programId: string;
  status: string;
  confidence_score?: number;
  reasoning?: string;
};

type RuleScanResult = {
  programId: string;
  score: number;
  status: string;
  reasoning: string;
};

function buildCompactProfile(profile: FamilyProfile, state: string) {
  return {
    state,
    household_size: profile.household_size,
    num_children: profile.num_children,
    children_ages: profile.children_ages,
    monthly_income: profile.monthly_income,
    employment_status: profile.employment_status,
    is_pregnant: profile.is_pregnant,
    has_disability: profile.has_disability,
    housing_status: profile.housing_status,
    immigration_status: profile.immigration_status,
    needs_childcare: profile.needs_childcare,
    monthly_rent: profile.monthly_rent,
    eviction_risk: profile.eviction_risk,
    domestic_violence: profile.domestic_violence,
    health_insurance: profile.health_insurance,
    legal_issues: profile.legal_issues,
    urgency: profile.urgency,
  };
}

type AiRefinementProgram = {
  id: string;
  name: string;
  state_code: string | null;
  program_type: string;
  estimated_benefit: string | null;
  eligibility_summary: string | null;
  rules_engine_score: number;
};

function buildAiProgramPayload(
  ruleResult: RuleScanResult,
  program: EligibilityScanProgram
): AiRefinementProgram {
  return {
    id: program.id,
    name: program.name,
    state_code: program.state_code,
    program_type: program.program_type,
    estimated_benefit: formatEstimatedBenefit(program),
    eligibility_summary: program.eligibility_summary,
    rules_engine_score: ruleResult.score,
  };
}

function buildAiPrompt(
  profileSummary: ReturnType<typeof buildCompactProfile>,
  programs: AiRefinementProgram[]
): string {
  return [
    'Refine only the rule-engine results below. Return one JSON object per programId (use the program id field) in the batch.',
    `Profile: ${JSON.stringify(profileSummary)}`,
    `Programs: ${JSON.stringify(programs)}`,
  ].join('\n');
}

function mergeAiWithRuleResults(
  ruleResults: RuleScanResult[],
  aiByProgramId: Map<string, AiEligibilityResult>
) {
  return ruleResults.map((r) => {
    const ai = aiByProgramId.get(r.programId);
    return ai
      ? {
          programId: r.programId,
          status: ai.status,
          confidence_score: ai.confidence_score ?? r.score,
          reasoning: ai.reasoning ?? r.reasoning,
        }
      : {
          programId: r.programId,
          status: r.status,
          confidence_score: r.score,
          reasoning: r.reasoning,
        };
  });
}

export class EligibilityService {
  private static scansInProgress = new Set<string>();
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder',
    });
  }

  async runScan(userId: string) {
    if (EligibilityService.scansInProgress.has(userId)) {
      throw new Error('Eligibility scan already in progress. Please wait for it to finish.');
    }
    EligibilityService.scansInProgress.add(userId);

    try {
      return await this.executeScan(userId);
    } finally {
      EligibilityService.scansInProgress.delete(userId);
    }
  }

  private async executeScan(userId: string) {
    // 1. Get user profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { family_profile: true },
    });

    if (!user || !user.family_profile) {
      throw new Error('User profile not found. Please complete your profile first.');
    }

    const profile = user.family_profile;

    const userState = user.state || profile.state || 'GA';

    // 2. Active programs scoped to user state + federal (DB-filtered)
    const programs = await getProgramsForEligibilityScan(userState);

    // 3. Run Deterministic Rules Engine
    const rulesEngine = new RulesEngine();
    const ruleResults = programs.map((p) => {
      const evaluation = rulesEngine.evaluate(p, {
        household_size: profile.household_size ?? 1,
        number_of_children: profile.num_children ?? 0,
        children_ages: Array.isArray(profile.children_ages) ? (profile.children_ages as number[]) : [],
        monthly_income: profile.monthly_income ?? 0,
        employment_status: profile.employment_status ?? 'unemployed',
        state: userState,
        pregnancy_status: profile.is_pregnant ?? false,
        disability_status: profile.has_disability ?? false,
        housing_status: profile.housing_status ?? 'stable',
        student_status: profile.employment_status === 'student',
        
        // Map citizenship_status correctly (citizen or eligible_non_citizen)
        citizenship_status: profile.immigration_status === 'citizen' || profile.immigration_status === 'eligible_non_citizen'
          ? profile.immigration_status
          : 'citizen',
        
        // Apply Wiser Moms eligibility fields
        needs_childcare: profile.needs_childcare ?? undefined,
        monthly_rent: profile.monthly_rent ? Number(profile.monthly_rent) : undefined,
        eviction_risk: profile.eviction_risk ?? undefined,
        domestic_violence: profile.domestic_violence ?? undefined,
        chronic_illness: profile.chronic_illness ?? undefined,
        preferred_language: profile.preferred_language || undefined,
        marital_status: profile.marital_status || undefined,
        income_sources: (profile.income_sources as string[]) || undefined,
        health_insurance: profile.health_insurance || undefined,
        savings_assets: profile.savings_assets || undefined,
        monthly_childcare_cost: profile.monthly_childcare_cost ? Number(profile.monthly_childcare_cost) : undefined,
        legal_issues: profile.legal_issues && Array.isArray(profile.legal_issues) ? (profile.legal_issues as string[]) : [],
        urgency: profile.urgency || undefined,
      });
      return { programId: p.id, ...evaluation };
    });

    // 4. Refine with AI (Claude) if API key is present
    const isPlaceholder = process.env.ANTHROPIC_API_KEY?.includes('placeholder') || !process.env.ANTHROPIC_API_KEY;
    let parsedResults: any[] = [];

    if (isPlaceholder) {
      // Fallback to rules only
      parsedResults = ruleResults.map((r) => ({
        programId: r.programId,
        status: r.status,
        confidence_score: r.score,
        reasoning: r.reasoning,
      }));
    } else {
      try {
        parsedResults = await this.refineWithAi(
          profile,
          userState,
          programs,
          ruleResults
        );
      } catch (err) {
        console.error('AI Refinement Error:', err);
        // Fallback to rules on error
        parsedResults = ruleResults.map((r) => ({
          programId: r.programId,
          status: r.status,
          confidence_score: r.score,
          reasoning: r.reasoning,
        }));
      }
    }

    // 5. Replace prior results in bulk (delete + createMany) — one transaction, two round trips
    const programById = new Map(programs.map((p) => [p.id, p]));
    const resultIdsByProgramId = new Map<string, string>();
    const eligibilityRows = parsedResults
      .map((res) => {
        const program = programById.get(res.programId);
        if (!program) return null;
        const id = randomUUID();
        resultIdsByProgramId.set(program.id, id);
        return {
          id,
          user_id: userId,
          program_id: program.id,
          status: res.status,
          confidence_score: res.confidence_score || 0,
          reasoning: res.reasoning,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    await prisma.$transaction(async (tx) => {
      await tx.eligibilityResult.deleteMany({
        where: { user_id: userId },
      });

      if (eligibilityRows.length > 0) {
        await tx.eligibilityResult.createMany({
          data: eligibilityRows,
        });
      }
    });

    // 6. Save a scan-complete notification
    const qualified = parsedResults.filter(
      (r) => r.status === 'qualified' || r.status === 'likely_qualified'
    );

    await prisma.notification.create({
      data: {
        user_id: userId,
        type: 'status_update',
        title: '🎯 Eligibility Scan Complete',
        message: `Scan complete: ${qualified.length} program${qualified.length !== 1 ? 's' : ''} matched out of ${parsedResults.length} checked. View your Benefits page for details.`,
      },
    }).catch(() => {
      // Non-critical — swallow if notification creation fails
    });

    const profileState =
      normalizeStateCode(user.state) ?? normalizeStateCode(profile.state);

    return this.buildScanResultsFromMemory(
      parsedResults,
      programs,
      userId,
      resultIdsByProgramId,
      profileState
    );
  }

  private buildScanResultsFromMemory(
    parsedResults: Array<{
      programId: string;
      status: string;
      confidence_score?: number;
      reasoning?: string;
    }>,
    programs: EligibilityScanProgram[],
    userId: string,
    resultIdsByProgramId: Map<string, string>,
    profileState?: string
  ) {
    const programById = new Map(programs.map((p) => [p.id, p]));
    const checkedAt = new Date();

    const results = parsedResults
      .map((res) => {
        const program = programById.get(res.programId);
        if (!program) return null;

        return {
          id: resultIdsByProgramId.get(program.id) ?? randomUUID(),
          user_id: userId,
          program_id: program.id,
          status: res.status,
          confidence_score: res.confidence_score || 0,
          reasoning: res.reasoning ?? '',
          checked_at: checkedAt,
          program,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => b.confidence_score - a.confidence_score);

    const filtered = profileState
      ? applyEligibilityFilters(results, { profileState })
      : results;

    const emptyQuarterMap: QuarterDueDatesByProgramAndYear = new Map();
    return this.enrichResultsWithQuarterDueDates(filtered, emptyQuarterMap);
  }

  private async refineWithAi(
    profile: FamilyProfile,
    state: string,
    programs: EligibilityScanProgram[],
    ruleResults: RuleScanResult[]
  ) {
    const toRefine = ruleResults
      .filter(needsAiRefinement)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_AI_PROGRAMS);

    if (toRefine.length === 0) {
      return mergeAiWithRuleResults(ruleResults, new Map());
    }

    const programById = new Map(programs.map((p) => [p.id, p]));
    const profileSummary = buildCompactProfile(profile, state);
    const aiByProgramId = new Map<string, AiEligibilityResult>();

    for (let i = 0; i < toRefine.length; i += AI_BATCH_SIZE) {
      const batch = toRefine.slice(i, i + AI_BATCH_SIZE);
      const programPayloads = batch.map((r) => {
        const program = programById.get(r.programId);
        if (!program) {
          return {
            id: r.programId,
            name: r.programId,
            state_code: null,
            program_type: 'unknown',
            estimated_benefit: null,
            eligibility_summary: null,
            rules_engine_score: r.score,
          };
        }
        return buildAiProgramPayload(r, program);
      });
      const prompt = buildAiPrompt(profileSummary, programPayloads);

      const { text: aiResponse, stopReason } = await Promise.race([
        this.callClaudeApi(prompt),
        new Promise<{ text: string; stopReason: string | null }>((_, reject) =>
          setTimeout(() => reject(new Error('AI Refinement Timeout')), 60000)
        ),
      ]);

      if (stopReason === 'max_tokens') {
        console.warn(
          `AI eligibility batch ${Math.floor(i / AI_BATCH_SIZE) + 1} truncated at max_tokens; salvaging complete objects`
        );
      }

      const aiParsed = parseAiJsonArray(aiResponse) as AiEligibilityResult[];

      for (const result of aiParsed) {
        if (result.programId) aiByProgramId.set(result.programId, result);
      }
    }

    return mergeAiWithRuleResults(ruleResults, aiByProgramId);
  }

  private async callClaudeApi(
    prompt: string
  ): Promise<{ text: string; stopReason: string | null }> {
    const response = await this.anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: AI_MAX_TOKENS,
      system:
        'You refine borderline eligibility matches for MomPlan. Return ONLY a raw JSON array (no markdown). Each object: programId, status (qualified|likely_qualified|check_required|not_qualified), confidence_score (0-100), reasoning (max 80 chars). One object per programId in the user message. No extra keys.',
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    const text = content.type === 'text' ? content.text : '';
    return { text, stopReason: response.stop_reason ?? null };
  }

  async getResults(
    userId: string,
    filters?: EligibilityResultsFilters
  ): Promise<EligibilityResultsResponse> {
    const [results, user] = await Promise.all([
      prisma.eligibilityResult.findMany({
        where: { user_id: userId },
        include: { program: true },
        orderBy: { confidence_score: 'desc' },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        include: { family_profile: true },
      }),
    ]);

    const profileState =
      normalizeStateCode(user?.state) ?? normalizeStateCode(user?.family_profile?.state);

    const filtersWithProfile: EligibilityResultsFilters = {
      ...filters,
      profileState,
    };

    const programIds = results.map((result) => result.program_id);

    const quarterRecords =
      programIds.length > 0
        ? await prisma.programQuarterDueDate.findMany({
            where: { program_id: { in: programIds } },
            select: {
              program_id: true,
              year: true,
              quarter: true,
              due_dates_json: true,
            },
          })
        : [];

    const quarterDueDatesByProgramAndYear =
      buildQuarterDueDatesByProgramAndYear(quarterRecords);
    const availableYears = getAvailableYearsFromProgramYearMap(quarterDueDatesByProgramAndYear);

    const filtered = applyEligibilityFilters(
      results,
      filtersWithProfile,
      quarterDueDatesByProgramAndYear
    );

    const enrichedResults = this.enrichResultsWithQuarterDueDates(
      filtered,
      quarterDueDatesByProgramAndYear
    );

    const profileScopedResults = applyEligibilityFilters(
      results,
      { profileState },
      quarterDueDatesByProgramAndYear
    );

    const availableStates = filterStateOptions(
      computeAvailableStates(profileScopedResults),
      filters?.stateSearch ?? ''
    );

    const summary = computeSummary(filtered);

    return {
      results: enrichedResults,
      summary,
      availableStates,
      availableYears,
      profileState: profileState ?? null,
    };
  }

  async getResultByProgramId(userId: string, programId: string) {
    const result = await prisma.eligibilityResult.findUnique({
      where: {
        user_id_program_id: {
          user_id: userId,
          program_id: programId,
        },
      },
      include: { program: true },
    });

    if (!result) return null;

    const quarterRecords = await prisma.programQuarterDueDate.findMany({
      where: { program_id: programId },
      select: {
        program_id: true,
        year: true,
        quarter: true,
        due_dates_json: true,
      },
    });
    const quarterDueDatesByProgramAndYear =
      buildQuarterDueDatesByProgramAndYear(quarterRecords);
    const [enriched] = this.enrichResultsWithQuarterDueDates(
      [result],
      quarterDueDatesByProgramAndYear
    );
    return enriched;
  }

  private enrichResultsWithQuarterDueDates<
    T extends { program: { id: string } | null }
  >(
    results: T[],
    quarterDueDatesByProgramAndYear: QuarterDueDatesByProgramAndYear
  ) {
    const referenceDate = new Date();
    const year = referenceDate.getUTCFullYear();
    const currentQuarter = getQuarterForMonth(referenceDate.getUTCMonth() + 1);

    return results.map((result) => {
      if (!result.program) return result;

      const yearMap = quarterDueDatesByProgramAndYear.get(result.program.id);
      const quarterDueDatesByYear = quarterDueDatesByYearToObject(yearMap);
      const currentYearQuarters = yearMap?.get(year) ?? {};
      const currentQuarterDates = currentYearQuarters[currentQuarter] ?? [];

      return {
        ...result,
        program: {
          ...result.program,
          current_quarter: currentQuarter,
          current_quarter_due_date: getRelevantDueDateInQuarter(
            currentQuarterDates,
            referenceDate
          ),
          quarter_due_dates: currentYearQuarters,
          quarter_due_dates_by_year: quarterDueDatesByYear,
        },
      };
    });
  }
}
