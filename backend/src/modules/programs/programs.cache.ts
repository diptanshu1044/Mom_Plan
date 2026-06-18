import { BenefitProgram } from '@prisma/client';
import { prisma } from '../../config/prisma';

const CACHE_TTL_MS = 10 * 60 * 1000;

let cachedActivePrograms: BenefitProgram[] | null = null;
let cacheTimestamp = 0;
let inflightFetch: Promise<BenefitProgram[]> | null = null;

async function fetchActivePrograms(): Promise<BenefitProgram[]> {
  return prisma.benefitProgram.findMany({
    where: { is_active: true },
    orderBy: { name: 'asc' },
  });
}

/** Shared in-memory cache for active programs — one DB round-trip serves program browse. */
export async function getActivePrograms(): Promise<BenefitProgram[]> {
  const now = Date.now();
  if (cachedActivePrograms && now - cacheTimestamp <= CACHE_TTL_MS) {
    return cachedActivePrograms;
  }

  if (!inflightFetch) {
    inflightFetch = fetchActivePrograms()
      .then((programs) => {
        cachedActivePrograms = programs;
        cacheTimestamp = Date.now();
        return programs;
      })
      .finally(() => {
        inflightFetch = null;
      });
  }

  return inflightFetch;
}

export function clearActiveProgramsCache() {
  cachedActivePrograms = null;
  cacheTimestamp = 0;
}
