import { FamilyProfile, User } from '@prisma/client';

export interface EligibilitySyncStatus {
  /** True when profile was updated after the most recent eligibility scan. */
  isStale: boolean;
  /** True when the user has at least one eligibility scan result. */
  hasScan: boolean;
  /** Latest profile change timestamp (user or family profile). */
  lastProfileUpdateAt: Date | null;
  /** Timestamp of the most recent eligibility scan. */
  lastEligibilityScanAt: Date | null;
}

export function computeLastProfileUpdateAt(
  user: Pick<User, 'updated_at'>,
  familyProfile: Pick<FamilyProfile, 'updated_at'> | null | undefined
): Date | null {
  const timestamps = [user.updated_at, familyProfile?.updated_at].filter(
    (d): d is Date => d instanceof Date
  );
  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps.map((d) => d.getTime())));
}

export function computeEligibilitySyncStatus(
  user: Pick<User, 'updated_at'>,
  familyProfile: Pick<FamilyProfile, 'updated_at'> | null | undefined,
  lastEligibilityScanAt: Date | null
): EligibilitySyncStatus {
  const lastProfileUpdateAt = computeLastProfileUpdateAt(user, familyProfile);
  const hasScan = lastEligibilityScanAt !== null;

  const isStale =
    hasScan &&
    lastProfileUpdateAt !== null &&
    lastProfileUpdateAt.getTime() > lastEligibilityScanAt.getTime();

  return {
    isStale,
    hasScan,
    lastProfileUpdateAt,
    lastEligibilityScanAt,
  };
}

export function serializeEligibilitySyncStatus(status: EligibilitySyncStatus) {
  return {
    isStale: status.isStale,
    hasScan: status.hasScan,
    lastProfileUpdateAt: status.lastProfileUpdateAt?.toISOString() ?? null,
    lastEligibilityScanAt: status.lastEligibilityScanAt?.toISOString() ?? null,
  };
}
