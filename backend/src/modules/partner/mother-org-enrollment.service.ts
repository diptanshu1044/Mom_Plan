import { prisma } from '../../config/prisma';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import {
  organizationPublicSelect,
  toPublicOrganization,
} from '../../utils/organization.utils';

function currentQuarter(): string {
  const m = new Date().getMonth();
  if (m < 3) return 'Q1';
  if (m < 6) return 'Q2';
  if (m < 9) return 'Q3';
  return 'Q4';
}

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

async function pickCaseworker(orgId: string): Promise<string> {
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
    if (!fallback) {
      throw new BadRequestError('This organization has no active staff to receive members');
    }
    return fallback.id;
  }

  caseworkers.sort((a, b) => a._count.cases - b._count.cases);
  return caseworkers[0]!.id;
}

async function defaultIntakeProgramId(): Promise<string> {
  const snap = await prisma.benefitProgram.findFirst({
    where: { id: 'snap', is_active: true },
    select: { id: true },
  });
  if (snap) return snap.id;

  const any = await prisma.benefitProgram.findFirst({
    where: { is_active: true },
    orderBy: { name: 'asc' },
    select: { id: true },
  });
  if (!any) throw new BadRequestError('No benefit programs are configured');
  return any.id;
}

export class MotherOrgEnrollmentService {
  async listOrganizations() {
    const orgs = await prisma.organization.findMany({
      where: { active: true },
      select: organizationPublicSelect,
      orderBy: { org_name: 'asc' },
    });

    return orgs.map(toPublicOrganization);
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
    const quarter = currentQuarter();
    const programId = await defaultIntakeProgramId();

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          org_id: orgId,
          org_type: org.org_type || org.category || null,
        },
      });

      let mother = await tx.mother.findUnique({ where: { user_id: userId } });

      if (!mother) {
        mother = await tx.mother.create({
          data: {
            user_id: userId,
            caseworker_id: caseworkerId,
            dob,
            phone,
            address,
            enrollment_status: 'pending',
          },
        });
      } else {
        mother = await tx.mother.update({
          where: { id: mother.id },
          data: { caseworker_id: caseworkerId },
        });
      }

      const existingCase = await tx.partnerCase.findFirst({
        where: {
          mother_id: mother.id,
          caseworker: { org_id: orgId },
          status: { in: ['not_started', 'in_progress', 'submitted', 'renewal_due'] },
        },
      });

      if (existingCase) return;

      const partnerCase = await tx.partnerCase.create({
        data: {
          mother_id: mother.id,
          caseworker_id: caseworkerId,
          program_id: programId,
          status: 'not_started',
          urgency_level: 'normal',
          quarter,
          intake_date: new Date(),
          last_activity: new Date(),
        },
      });

      await tx.statusHistory.create({
        data: {
          case_id: partnerCase.id,
          old_status: null,
          new_status: 'not_started',
          changed_by: null,
          notes: `Enrolled with ${org.org_name} via MomPlan`,
        },
      });
    });

    return { org_id: org.id };
  }
}
