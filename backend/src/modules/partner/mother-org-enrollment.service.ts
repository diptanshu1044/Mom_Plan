import { prisma } from '../../config/prisma';
import { NotFoundError } from '../../utils/errors';
import {
  organizationPublicSelect,
  OrganizationListMatchLevel,
  OrganizationLocationFilters,
  buildOrganizationCountyWhere,
  buildOrganizationStateWhere,
  toPublicOrganization,
} from '../../utils/organization.utils';

function buildAddress(fp: {
  street_address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
} | null | undefined): string | null {
  if (!fp) return null;
  const line = [fp.street_address, fp.city, fp.state, fp.zip_code].filter(Boolean).join(', ');
  return line || null;
}

export async function pickCaseworker(orgId: string): Promise<string | null> {
  const caseworkers = await prisma.orgUser.findMany({
    where: {
      org_id: orgId,
      is_active: true,
      role: { in: ['caseworker', 'admin'] },
    },
    include: { _count: { select: { cases: true } } },
    orderBy: { full_name: 'asc' },
  });

  if (caseworkers.length === 0) {
    const fallback = await prisma.orgUser.findFirst({
      where: { org_id: orgId, is_active: true },
      orderBy: { created_at: 'asc' },
    });
    return fallback?.id ?? null;
  }

  caseworkers.sort((a, b) => a._count.cases - b._count.cases);
  return caseworkers[0]!.id;
}

export class MotherOrgEnrollmentService {
  async listOrganizations(filters?: OrganizationLocationFilters): Promise<{
    organizations: ReturnType<typeof toPublicOrganization>[];
    matchLevel: OrganizationListMatchLevel;
  }> {
    const state = filters?.state?.trim();
    const county = filters?.county?.trim();

    if (!county) {
      const orgs = await prisma.organization.findMany({
        where: buildOrganizationStateWhere(state),
        select: organizationPublicSelect,
        orderBy: { org_name: 'asc' },
      });
      return {
        organizations: orgs.map(toPublicOrganization),
        matchLevel: null,
      };
    }

    const countyMatches = await prisma.organization.findMany({
      where: buildOrganizationCountyWhere(county, state),
      select: organizationPublicSelect,
      orderBy: { org_name: 'asc' },
    });

    if (countyMatches.length > 0) {
      return {
        organizations: countyMatches.map(toPublicOrganization),
        matchLevel: 'county',
      };
    }

    if (filters?.stateFallback && state) {
      const stateOrgs = await prisma.organization.findMany({
        where: buildOrganizationStateWhere(state),
        select: organizationPublicSelect,
        orderBy: { org_name: 'asc' },
      });
      return {
        organizations: stateOrgs.map(toPublicOrganization),
        matchLevel: 'state',
      };
    }

    return {
      organizations: [],
      matchLevel: null,
    };
  }

  async enrollUserInPartnerOrg(userId: string, orgId: string) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundError('Partner organization not found');

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { family_profile: true },
    });
    if (!user) throw new NotFoundError('User not found');

    const caseworkerId = await pickCaseworker(orgId);
    const fp = user.family_profile;
    const dob = fp?.date_of_birth ?? null;
    const phone = fp?.phone ?? user.phone ?? null;
    const address = buildAddress(fp);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          org_id: orgId,
          org_type: org.category || org.org_type || null,
        },
      });

      const mother = await tx.mother.findUnique({ where: { user_id: userId } });

      if (!mother) {
        await tx.mother.create({
          data: {
            user_id: userId,
            caseworker_id: caseworkerId,
            dob,
            phone,
            address,
            enrollment_status: 'pending',
          },
        });
      } else if (caseworkerId && mother.caseworker_id !== caseworkerId) {
        await tx.mother.update({
          where: { id: mother.id },
          data: { caseworker_id: caseworkerId },
        });
      }
    });

    return { org_id: org.id };
  }

  /** Ensure a Mother row exists for a MomPlan user enrolled with a partner org. */
  async ensureMotherForOrg(userId: string, orgId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { family_profile: true, mother_profile: true },
    });
    if (!user) return null;

    const fp = user.family_profile;
    const dob = fp?.date_of_birth ?? null;
    const phone = fp?.phone ?? user.phone ?? null;
    const address = buildAddress(fp);

    if (user.mother_profile) {
      if (user.mother_profile.caseworker_id) return user.mother_profile;
      const caseworkerId = await pickCaseworker(orgId);
      return prisma.mother.update({
        where: { id: user.mother_profile.id },
        data: { caseworker_id: caseworkerId },
      });
    }

    const caseworkerId = await pickCaseworker(orgId);
    return prisma.mother.create({
      data: {
        user_id: userId,
        caseworker_id: caseworkerId,
        dob,
        phone,
        address,
        enrollment_status: 'pending',
      },
    });
  }
}
