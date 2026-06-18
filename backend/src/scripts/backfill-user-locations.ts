/**
 * Backfill user location fields from saved ZIP codes via Zippopotam.us.
 *
 * Usage: npx tsx src/scripts/backfill-user-locations.ts
 */
import { prisma } from '../config/prisma';
import { zipValidationService } from '../services/zipValidation.service';

async function main() {
  const users = await prisma.user.findMany({
    where: { zip_code: { not: null } },
    include: { family_profile: true },
  });

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of users) {
    const zip = user.zip_code?.trim();
    if (!zip) {
      skipped++;
      continue;
    }

    try {
      const resolved = await zipValidationService.resolveLocationFromZip(zip);
      const fp = user.family_profile;
      const needsUserUpdate =
        user.state !== resolved.state || user.zip_code !== resolved.zip_code;
      const needsProfileUpdate =
        !fp ||
        fp.state !== resolved.state ||
        fp.zip_code !== resolved.zip_code ||
        fp.city !== resolved.city;

      if (!needsUserUpdate && !needsProfileUpdate) {
        skipped++;
        continue;
      }

      if (needsUserUpdate) {
        await prisma.user.update({
          where: { id: user.id },
          data: { state: resolved.state, zip_code: resolved.zip_code },
        });
      }

      if (fp) {
        await prisma.familyProfile.update({
          where: { user_id: user.id },
          data: {
            state: resolved.state,
            zip_code: resolved.zip_code,
            city: resolved.city,
          },
        });
      } else {
        await prisma.familyProfile.create({
          data: {
            user_id: user.id,
            state: resolved.state,
            zip_code: resolved.zip_code,
            city: resolved.city,
          },
        });
      }

      updated++;
      console.log(`Updated ${user.email}: ${resolved.zip_code} → ${resolved.city}, ${resolved.state}`);
    } catch (error) {
      failed++;
      console.warn(`Failed for ${user.email} (${zip}):`, error instanceof Error ? error.message : error);
    }
  }

  console.log(`Done. Updated: ${updated}, skipped: ${skipped}, failed: ${failed}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
