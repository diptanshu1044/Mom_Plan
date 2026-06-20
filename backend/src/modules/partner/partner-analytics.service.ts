import { prisma } from '../../config/prisma';
import type { OrgAccessContext } from './partner-access';
import { isOrgAdmin } from './partner-access';

const ACTIVE_STATUSES = ['not_started', 'in_progress', 'submitted', 'approved', 'renewal_due'];
const DEFAULT_CAPACITY = 8;
const AT_RISK_UTILIZATION = 0.75;

type CaseworkerLoadStatus = 'overloaded' | 'at_risk' | 'healthy';

function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return fullName;
  const last = parts[parts.length - 1]!;
  return `${parts[0]![0]}. ${last}`;
}

function loadStatus(activeCases: number, capacity: number): CaseworkerLoadStatus {
  if (capacity <= 0) return 'healthy';
  if (activeCases >= capacity) return 'overloaded';
  if (activeCases >= capacity * AT_RISK_UTILIZATION) return 'at_risk';
  return 'healthy';
}

function programCode(programId: string): string {
  return programId.replace(/_/g, ' ').toUpperCase();
}

export class PartnerAnalyticsService {
  async getCaseworkerCards(ctx: OrgAccessContext) {
    if (!isOrgAdmin(ctx)) {
      return { caseworkers: [] };
    }

    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const caseworkers = await prisma.orgUser.findMany({
      where: { org_id: ctx.orgId, role: 'caseworker', is_active: true },
      select: {
        id: true,
        full_name: true,
        caseload_capacity: true,
        cases: {
          where: { status: { in: ACTIVE_STATUSES } },
          select: {
            id: true,
            status: true,
            program_id: true,
            deadlines: {
              where: { is_resolved: false, type: 'renewal' },
              select: { due_date: true },
            },
            documents: {
              where: { review_status: 'pending' },
              select: { id: true },
            },
            communications: {
              orderBy: { sent_at: 'desc' },
              take: 1,
              select: { sent_at: true },
            },
          },
        },
      },
      orderBy: { full_name: 'asc' },
    });

    const cards = caseworkers.map((cw) => {
      const capacity = cw.caseload_capacity ?? DEFAULT_CAPACITY;
      const activeCases = cw.cases.length;
      const utilization = capacity > 0 ? Math.round((activeCases / capacity) * 100) : 0;
      const status = loadStatus(activeCases, capacity);

      const renewalsDue = cw.cases.filter((c) =>
        c.deadlines.some((d) => d.due_date >= now && d.due_date <= weekEnd)
      ).length;

      const docsOverdue = cw.cases.reduce((sum, c) => sum + c.documents.length, 0);

      const programs = [...new Set(cw.cases.map((c) => programCode(c.program_id)))].slice(0, 4);

      const closedCases = cw.cases.filter((c) =>
        ['approved', 'submitted'].includes(c.status)
      ).length;
      const completionRate =
        activeCases > 0 ? Math.round((closedCases / activeCases) * 100) : 0;

      const alerts: string[] = [];
      if (activeCases > capacity) {
        alerts.push(`${activeCases} cases — ${activeCases - capacity} over capacity limit`);
      } else if (activeCases === capacity) {
        alerts.push(`At capacity limit — ${activeCases}/${capacity} cases`);
      }
      if (renewalsDue > 0) {
        alerts.push(`${renewalsDue} renewal${renewalsDue === 1 ? '' : 's'} due this week`);
      }
      if (docsOverdue > 0) {
        alerts.push(`${docsOverdue} doc${docsOverdue === 1 ? '' : 's'} overdue`);
      }

      return {
        id: cw.id,
        name: shortName(cw.full_name),
        full_name: cw.full_name,
        initials: initials(cw.full_name),
        title: 'Caseworker',
        status,
        active_cases: activeCases,
        capacity_limit: capacity,
        utilization_pct: utilization,
        completion_rate: completionRate,
        avg_response_hours: null as number | null,
        programs,
        renewals_due: renewalsDue,
        docs_overdue: docsOverdue,
        alerts,
      };
    });

    return { caseworkers: cards };
  }

  async getAnalytics(ctx: OrgAccessContext) {
    const quarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`;
    const year = new Date().getFullYear();

    const [totalCases, openCases, closedThisMonth, mothersCount] = await Promise.all([
      prisma.partnerCase.count({
        where: { caseworker: { org_id: ctx.orgId } },
      }),
      prisma.partnerCase.count({
        where: {
          caseworker: { org_id: ctx.orgId },
          status: { in: ACTIVE_STATUSES },
        },
      }),
      prisma.partnerCase.count({
        where: {
          caseworker: { org_id: ctx.orgId },
          status: 'approved',
          updated_at: {
            gte: new Date(year, new Date().getMonth(), 1),
          },
        },
      }),
      prisma.mother.count({
        where: { caseworker: { org_id: ctx.orgId } },
      }),
    ]);

    const caseworkerCards = await this.getCaseworkerCards(ctx);

    return {
      metrics: {
        total_cases: totalCases,
        open_cases: openCases,
        closed_this_month: closedThisMonth,
        total_referrals: 0,
        pending_referrals: 0,
        accepted_referrals: 0,
        total_mothers_served: mothersCount,
        new_mothers_this_month: 0,
        total_documents: 0,
        avg_case_resolution_days: null,
      },
      caseTrend: [],
      referralTrend: [],
      casesByStatus: [],
      caseworkers: caseworkerCards.caseworkers,
      quarter,
      year,
    };
  }
}
