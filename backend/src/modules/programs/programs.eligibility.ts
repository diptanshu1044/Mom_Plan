import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { normalizeStateCode } from '../eligibility/eligibility.filters';

export const eligibilityScanSelect = {
  id: true,
  name: true,
  state_code: true,
  program_type: true,
  estimated_monthly_value_min: true,
  estimated_monthly_value_max: true,
  eligibility_summary: true,
  metadata: true,
} satisfies Prisma.BenefitProgramSelect;

export type EligibilityScanProgram = Prisma.BenefitProgramGetPayload<{
  select: typeof eligibilityScanSelect;
}>;

/** Active programs scoped to the user's state plus federal programs (DB-filtered). */
export async function getProgramsForEligibilityScan(
  state: string | null | undefined
): Promise<EligibilityScanProgram[]> {
  const stateCode = normalizeStateCode(state) ?? 'GA';

  return prisma.benefitProgram.findMany({
    where: {
      is_active: true,
      OR: [
        { state_code: stateCode },
        { federal_or_state: { contains: 'federal', mode: 'insensitive' } },
      ],
    },
    select: eligibilityScanSelect,
    orderBy: { name: 'asc' },
  });
}

export function formatEstimatedBenefit(
  program: Pick<EligibilityScanProgram, 'estimated_monthly_value_min' | 'estimated_monthly_value_max'>
): string | null {
  const min = program.estimated_monthly_value_min;
  const max = program.estimated_monthly_value_max;
  if (min == null && max == null) return null;
  if (min != null && max != null) return `$${min}-$${max}/mo`;
  if (min != null) return `$${min}+/mo`;
  return `up to $${max}/mo`;
}
