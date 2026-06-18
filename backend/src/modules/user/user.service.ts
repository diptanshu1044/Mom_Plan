import { prisma } from '../../config/prisma';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import { zipValidationService, isZipValidationEnabled } from '../../services/zipValidation.service';
import { MotherOrgEnrollmentService } from '../partner/mother-org-enrollment.service';
import { joinFullName, userNameSelect } from '../../utils/name.utils';
import { EligibilityService } from '../eligibility/eligibility.service';
import {
  buildFamilyProfilePatch,
  buildUserProfilePatch,
  mergeProfileResponse,
  profileUpdateAffectsEligibility,
  ProfileWithFamily,
} from './profile-update.utils';
import { decimalToNumberOrNull } from '../../utils/decimal.utils';

const eligibilityService = new EligibilityService();

const motherOrgEnrollment = new MotherOrgEnrollmentService();

/**
 * Serializes Decimal fields in a family_profile object to plain numbers
 * so they are never sent to the client as Prisma Decimal objects ([object Object]).
 */
function serializeProfile(user: any): any {
  if (!user?.family_profile) return user;
  const fp = user.family_profile;
  return {
    ...user,
    family_profile: {
      ...fp,
      monthly_rent: decimalToNumberOrNull(fp.monthly_rent),
      monthly_utilities: decimalToNumberOrNull(fp.monthly_utilities),
      monthly_childcare_cost: decimalToNumberOrNull(fp.monthly_childcare_cost),
      monthly_income: decimalToNumberOrNull(fp.monthly_income),
    },
  };
}

export class UserService {
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        ...userNameSelect,
        phone: true,
        role: true,
        plan: true,
        state: true,
        zip_code: true,
        created_at: true,
        updated_at: true,
        last_active_at: true,
        status: true,
        profile_picture: true,
        partner_org_id: true,
        org_type: true,
        partner_organization: {
          select: { id: true, name: true, city: true, state: true },
        },
        family_profile: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User profile not found');
    }

    return serializeProfile(user);
  }

  async updateProfile(
    userId: string,
    data: any
  ) {
    const {
      first_name, middle_name, last_name, phone, email, state, zip_code, partner_org_id,
      org_type,
      household_size, num_children, children_ages, monthly_income,
      employment_status, housing_status, has_disability, is_pregnant,

      needs_childcare, monthly_rent, monthly_utilities, eviction_risk, domestic_violence,
      chronic_illness, immigration_status, date_of_birth, ssn_last_four, preferred_language,
      marital_status, other_adults, income_sources, work_situation, employer_name,
      health_insurance, savings_assets, child_support_status,
      monthly_childcare_cost, childcare_preference, childcare_provider, legal_issues, urgency,
      children_dobs,
      street_address, city,
      profile_picture,
    } = data;

    const existingProfile = (await prisma.user.findUnique({
      where: { id: userId },
      include: {
        family_profile: true,
        partner_organization: {
          select: { id: true, name: true, city: true, state: true },
        },
      },
    })) as ProfileWithFamily | null;

    if (!existingProfile) {
      throw new NotFoundError('User profile not found');
    }

    const parsedDob = date_of_birth ? new Date(date_of_birth) : undefined;
    const normalizedData = {
      ...data,
      ...(date_of_birth !== undefined && { date_of_birth: parsedDob }),
    };

    const shouldRescanEligibility = profileUpdateAffectsEligibility(existingProfile, normalizedData);

    const touchesAddress = [zip_code, state, street_address, city].some((v) => v !== undefined);
    if (touchesAddress && isZipValidationEnabled()) {
      const effectiveZip = zip_code !== undefined ? zip_code : existingProfile.zip_code;
      const effectiveState = state !== undefined ? state : existingProfile.state;

      if (effectiveZip && effectiveState) {
        const zipResult = await zipValidationService.validateZip(
          String(effectiveZip),
          String(effectiveState)
        );
        if (!zipResult.valid) {
          throw new BadRequestError(zipResult.error || 'Invalid ZIP code.');
        }
      } else if (zip_code || street_address || city) {
        throw new BadRequestError('ZIP code and state are required for address validation.');
      }
    }

    const userUpdate = buildUserProfilePatch(existingProfile, normalizedData);
    const familyUpdate = buildFamilyProfilePatch(existingProfile.family_profile, normalizedData);
    let partnerOrganization = existingProfile.partner_organization;

    if (partner_org_id !== undefined) {
      if (!partner_org_id) {
        if (existingProfile.partner_org_id !== null) {
          userUpdate.partner_org_id = null;
          userUpdate.org_type = null;
          partnerOrganization = null;
        }
      } else if (partner_org_id !== existingProfile.partner_org_id) {
        await motherOrgEnrollment.enrollUserInPartnerOrg(userId, partner_org_id);
        userUpdate.partner_org_id = partner_org_id;
        userUpdate.org_type = org_type || null;
        partnerOrganization = await prisma.partnerOrganization.findUnique({
          where: { id: partner_org_id },
          select: { id: true, name: true, city: true, state: true },
        });
      }
    }

    if (Object.keys(userUpdate).length > 0 || familyUpdate) {
      await prisma.$transaction(async (tx) => {
        if (Object.keys(userUpdate).length > 0) {
          await tx.user.update({
            where: { id: userId },
            data: userUpdate,
          });
        }

        if (familyUpdate) {
          if (existingProfile.family_profile) {
            await tx.familyProfile.update({
              where: { user_id: userId },
              data: familyUpdate,
            });
          } else {
            await tx.familyProfile.create({
              data: {
                user_id: userId,
                household_size: household_size || 1,
                num_children: num_children || 0,
                children_ages: children_ages || [],
                monthly_income: monthly_income || 0,
                employment_status: employment_status || 'unemployed',
                housing_status: housing_status || 'renting',
                has_disability: has_disability || false,
                is_pregnant: is_pregnant || false,
                needs_childcare: needs_childcare || false,
                monthly_rent: monthly_rent || 0,
                monthly_utilities: monthly_utilities || 0,
                eviction_risk: eviction_risk || false,
                domestic_violence: domestic_violence || false,
                chronic_illness: chronic_illness || false,
                immigration_status: immigration_status || 'citizen',
                date_of_birth: parsedDob,
                ssn_last_four: ssn_last_four || null,
                preferred_language: preferred_language || 'English',
                marital_status: marital_status || 'single',
                other_adults: other_adults || false,
                income_sources: income_sources || [],
                work_situation: work_situation || '',
                employer_name: employer_name || null,
                health_insurance: health_insurance || '',
                savings_assets: savings_assets || '',
                child_support_status: child_support_status || 'none',
                monthly_childcare_cost: monthly_childcare_cost || null,
                childcare_preference: childcare_preference || null,
                childcare_provider: childcare_provider || null,
                legal_issues: legal_issues || [],
                urgency: urgency || 'not_urgent',
                street_address: street_address || null,
                city: city || null,
                state: state || null,
                zip_code: zip_code || null,
                first_name: first_name || null,
                last_name: last_name || null,
                children_dobs: children_dobs || [],
                ...familyUpdate,
              },
            });
          }
        }
      });
    }

    const profile = serializeProfile(
      mergeProfileResponse(existingProfile, userUpdate, familyUpdate, partnerOrganization)
    );

    if (shouldRescanEligibility && profile.family_profile) {
      void eligibilityService.runScan(userId).catch((err) => {
        console.error('[UserService] Eligibility rescan failed:', err);
      });
    }

    return profile;
  }

  async getFamilyProfile(userId: string) {
    const profile = await prisma.familyProfile.findUnique({
      where: { user_id: userId },
    });

    if (!profile) {
      throw new NotFoundError('Family profile not configured yet');
    }

    return profile;
  }

  async updateFamilyProfile(
    userId: string,
    data: {
      household_size: number;
      num_children: number;
      children_ages: number[];
      monthly_income: number;
      employment_status: string;
      housing_status: string;
      has_disability: boolean;
      is_pregnant: boolean;
    }
  ) {
    return prisma.familyProfile.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        ...data,
      },
      update: data,
    });
  }
}
