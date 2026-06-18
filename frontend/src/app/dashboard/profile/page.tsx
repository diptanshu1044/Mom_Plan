"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  User,
  Lock,
  Save,
  ShieldAlert,
  AlertTriangle,
  Calendar,
  Languages,
  Activity,
  Home,
  DollarSign,
  Briefcase,
  Users,
  Heart,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PlanBadge } from "@/components/ui/Badge";
import { PartnerOrgSelect } from "@/components/profile/PartnerOrgSelect";
import { LocationFields, type UseLocationFieldsResult } from "@/components/profile/LocationFields";
import { formatPhoneForApi, normalizeUsPhoneDigits } from "@/lib/phone";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { formatUserName, userInitials } from "@/lib/name";
import { getUserLocationDefaults } from "@/hooks/useUserLocationDefaults";

/**
 * Safely converts a Prisma Decimal, number, or string to a string for form inputs.
 * Handles stale Zustand state with raw Decimal objects ({ s, e, d }) before the
 * backend serialization fix was deployed.
 */
function parseDecimalToString(val: any): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "number") return String(val);
  if (typeof val === "string") return val;
  if (typeof val?.toJSON === "function") return String(val.toJSON());
  if (typeof val?.toString === "function") {
    const str = val.toString();
    if (!isNaN(Number(str))) return str;
  }
  return "";
}

const PREFERRED_LANGUAGE_OPTIONS = [
  { value: "English", label: "English" },
  { value: "Spanish", label: "Español (Spanish)" },
  { value: "Vietnamese", label: "Tiếng Việt (Vietnamese)" },
  { value: "Chinese", label: "中文 (Chinese)" },
];

const IMMIGRATION_STATUS_OPTIONS = [
  { value: "citizen", label: "US Citizen" },
  { value: "eligible_non_citizen", label: "Green Card / Eligible Non-Citizen" },
  { value: "daca", label: "DACA Recipient" },
  { value: "visa_holder", label: "Other Visa Holder / Non-Citizen" },
];

const MARITAL_STATUS_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "separated", label: "Separated" },
  { value: "widowed", label: "Widowed" },
];

const HOUSING_STATUS_OPTIONS = [
  { value: "renting", label: "Renting an apartment/home" },
  { value: "owning", label: "Owning a home" },
  { value: "with_family", label: "Living with family/friends" },
  { value: "subsidized_housing", label: "Subsidized / Section 8 Housing" },
  { value: "homeless", label: "Experiencing homelessness / temporary shelter" },
];

const EMPLOYMENT_STATUS_OPTIONS = [
  { value: "full_time", label: "Employed Full-time" },
  { value: "part_time", label: "Employed Part-time" },
  { value: "self_employed", label: "Self-employed / Freelance" },
  { value: "unemployed", label: "Currently Unemployed" },
  { value: "student", label: "Active Student" },
  { value: "disabled", label: "Receiving Disability Assistance" },
];

const HEALTH_INSURANCE_OPTIONS = [
  { value: "none", label: "Uninsured" },
  { value: "private", label: "Private (Employer/Individual)" },
  { value: "medicaid", label: "Medicaid / PeachCare" },
  { value: "medicare", label: "Medicare" },
  { value: "other", label: "Other Public Plan" },
];

const SAVINGS_ASSETS_OPTIONS = [
  { value: "none", label: "No assets / Under $2,000" },
  { value: "low", label: "Low ($2,000 - $5,000)" },
  { value: "medium", label: "Medium ($5,000 - $10,000)" },
  { value: "high", label: "Significant (Above $10,000)" },
];

const URGENCY_OPTIONS = [
  { value: "emergency", label: "Emergency — Intake needed today/tomorrow" },
  { value: "urgent", label: "Urgent — Intake needed within 2 weeks" },
  { value: "soon", label: "Soon — Intake needed within a month" },
  { value: "not_urgent", label: "Not urgent — Planning ahead" },
];

const INCOME_SOURCES_OPTIONS = [
  { id: "Job or wages", label: "Job or wages" },
  { id: "Self-employment", label: "Self-employment / freelance" },
  { id: "Child support", label: "Child support" },
  { id: "Alimony", label: "Alimony / spousal support" },
  { id: "SSI", label: "Social Security or SSI" },
  { id: "SSDI", label: "Disability (SSDI)" },
  { id: "Unemployment", label: "Unemployment benefits" },
  { id: "TANF", label: "TANF / cash assistance" },
  { id: "No income", label: "No income right now" },
];

const LEGAL_ISSUES_OPTIONS = [
  { id: "eviction", label: "Eviction or threat of eviction" },
  { id: "custody", label: "Child custody or visitation" },
  { id: "domestic_violence", label: "Domestic violence / protective order" },
  { id: "divorce", label: "Divorce or separation" },
  { id: "child_support", label: "Child support issues" },
  { id: "immigration", label: "Immigration or DACA issue" },
  { id: "benefits_denial", label: "Benefits denial or appeal" },
  { id: "debt_collection", label: "Debt collection" },
];

const profileSchema = z.object({
  first_name: z.string().min(1, "Required"),
  middle_name: z.string().optional(),
  last_name: z.string().min(1, "Required"),
  email: z.string().email("Invalid email"),
  phone: z
    .string()
    .optional()
    .refine((val) => !val || /^\d{10}$/.test(val), {
      message: "Enter a valid 10-digit US phone number",
    }),
  state: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  zip_code: z.string().optional(),
  profile_picture: z.string().optional(),
  org_type: z.string().optional(),
  org_id: z
    .string()
    .optional()
    .refine((val) => !val || z.string().uuid().safeParse(val).success, {
      message: "Please select a valid partner organization",
    }),

  // Family profile base fields
  household_size: z.string().optional(),
  num_children: z.string().optional(),
  monthly_income: z.string().optional(),
  employment_status: z.string().optional(),
  housing_status: z.string().optional(),
  is_pregnant: z.boolean().optional(),
  has_disability: z.boolean().optional(),

  // Extended Wiser Moms fields
  date_of_birth: z.string().optional(),
  preferred_language: z.string().optional(),
  monthly_rent: z.string().optional(),
  eviction_risk: z.boolean().optional(),
  needs_childcare: z.boolean().optional(),
  monthly_childcare_cost: z.string().optional(),
  health_insurance: z.string().optional(),
  chronic_illness: z.boolean().optional(),
  immigration_status: z.string().optional(),
  domestic_violence: z.boolean().optional(),
  marital_status: z.string().optional(),
  other_adults: z.boolean().optional(),
  income_sources: z.array(z.string()).optional(),
  savings_assets: z.string().optional(),
  legal_issues: z.array(z.string()).optional(),
  urgency: z.string().optional(),
});

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Required"),
    new_password: z.string().min(8, "Min 8 characters"),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();

  const getFormDefaults = (currentUser: typeof user) => {
    const locationDefaults = getUserLocationDefaults(currentUser);
    return {
      first_name: currentUser?.first_name || "",
      middle_name: currentUser?.middle_name || "",
      last_name: currentUser?.last_name || "",
      email: currentUser?.email || "",
      phone: normalizeUsPhoneDigits(currentUser?.phone || ""),
      state: locationDefaults.state,
      city: locationDefaults.city,
      county: locationDefaults.county,
      zip_code: locationDefaults.zip_code,
      profile_picture: currentUser?.profile_picture || "",
      org_type: currentUser?.org_type || "",
      org_id: currentUser?.org_id || "",
      household_size: String(currentUser?.family_profile?.household_size || ""),
      num_children: String(currentUser?.family_profile?.num_children || ""),
      monthly_income: String(currentUser?.family_profile?.monthly_income || ""),
      employment_status: currentUser?.family_profile?.employment_status || "full_time",
      housing_status: currentUser?.family_profile?.housing_status || "renting",
      is_pregnant: currentUser?.family_profile?.is_pregnant || false,
      has_disability: currentUser?.family_profile?.has_disability || false,
      date_of_birth: (() => {
        if (!currentUser?.family_profile?.date_of_birth) return "";
        try {
          const d = new Date(currentUser.family_profile.date_of_birth);
          return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
        } catch {
          return "";
        }
      })(),
      preferred_language: currentUser?.family_profile?.preferred_language || "English",
      monthly_rent: parseDecimalToString(currentUser?.family_profile?.monthly_rent),
      eviction_risk: currentUser?.family_profile?.eviction_risk || false,
      needs_childcare: currentUser?.family_profile?.needs_childcare || false,
      monthly_childcare_cost: parseDecimalToString(currentUser?.family_profile?.monthly_childcare_cost),
      health_insurance: currentUser?.family_profile?.health_insurance || "none",
      chronic_illness: currentUser?.family_profile?.chronic_illness || false,
      immigration_status: currentUser?.family_profile?.immigration_status || "citizen",
      domestic_violence: currentUser?.family_profile?.domestic_violence || false,
      marital_status: currentUser?.family_profile?.marital_status || "single",
      other_adults: currentUser?.family_profile?.other_adults || false,
      income_sources: (currentUser?.family_profile?.income_sources as string[]) || [],
      savings_assets: currentUser?.family_profile?.savings_assets || "none",
      legal_issues: (currentUser?.family_profile?.legal_issues as string[]) || [],
      urgency: currentUser?.family_profile?.urgency || "not_urgent",
    };
  };

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: getFormDefaults(user),
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  });

  // Watch fields to dynamically show conditional inputs
  const watchHousingStatus = profileForm.watch("housing_status");
  const watchNeedsChildcare = profileForm.watch("needs_childcare");
  const watchState = profileForm.watch("state") || "";
  const watchCity = profileForm.watch("city") || "";
  const watchCounty = profileForm.watch("county") || "";
  const watchZipCode = profileForm.watch("zip_code") || "";

  const locationValidationRef = useRef<UseLocationFieldsResult | null>(null);

  const clearPartnerOrgSelection = () => {
    profileForm.setValue("org_id", "", { shouldValidate: true });
    profileForm.setValue("org_type", "", { shouldValidate: true });
  };

  const hasHydratedForm = useRef(false);

  // Sync form once when profile data first loads (e.g. after dashboard layout fetch)
  useEffect(() => {
    if (!user?.family_profile || hasHydratedForm.current) return;
    profileForm.reset(getFormDefaults(user));
    hasHydratedForm.current = true;
  }, [user?.family_profile]);

  const profileMutation = useMutation({
    mutationFn: (data: ProfileForm) => {
      const payload = {
        ...data,
        phone: data.phone ? formatPhoneForApi(data.phone) : undefined,
        org_type: data.org_type || null,
        org_id: data.org_id || null,
        household_size: data.household_size ? parseInt(data.household_size) : undefined,
        num_children: data.num_children ? parseInt(data.num_children) : undefined,
        monthly_income: data.monthly_income ? parseFloat(data.monthly_income) : undefined,
        monthly_rent: data.monthly_rent ? parseFloat(data.monthly_rent) : undefined,
        monthly_childcare_cost: data.needs_childcare && data.monthly_childcare_cost 
          ? parseFloat(data.monthly_childcare_cost) 
          : null,
      };
      return api.put("/api/user/profile", payload);
    },
    onSuccess: (res) => {
      updateUser(res.data.data);
      toast.success("Profile saved");

      queryClient.invalidateQueries({
        queryKey: ["eligibility-results"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({ queryKey: ["applications"], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["deadlines"], refetchType: "none" });
    },
    onError: (error) => {
      const message =
        (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message || "Failed to save profile";
      toast.error(message);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (data: PasswordForm) => api.put("/api/auth/password", data),
    onSuccess: () => {
      passwordForm.reset();
      toast.success("Password updated");
    },
    onError: (error) => {
      const message =
        (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message || "Password change failed";
      toast.error(message);
    },
  });

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl lg:text-3xl text-on-surface mb-1">
          Profile
        </h1>
        <p className="text-sm text-on-surface-variant">
          Manage your account information and family eligibility profile
        </p>
      </div>

      {/* Avatar & Plan */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-8 p-6 bg-gradient-hero rounded-2xl border border-outline-variant/10"
      >
        {user?.profile_picture ? (
          <img src={user.profile_picture} alt="Profile" className="w-16 h-16 rounded-full object-cover border-2 border-primary-500/20" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center text-white font-display font-bold text-2xl shrink-0">
            {userInitials(user) || "M"}
          </div>
        )}
        <div>
          <div className="font-display font-bold text-lg text-on-surface mb-1">
            {formatUserName(user)}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-on-surface-variant">{user?.email}</span>
            <PlanBadge plan={user?.plan || "community"} />
          </div>
        </div>
      </motion.div>

      {/* Main Profile Form */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary-500" />
            <CardTitle>My Verification Profile</CardTitle>
          </div>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={profileForm.handleSubmit((data) => {
              if (!locationValidationRef.current?.validate()) {
                toast.error(
                  locationValidationRef.current?.getValidationError() ||
                    "Please verify your state, city, and ZIP code."
                );
                return;
              }
              profileMutation.mutate(data);
            })}
            className="space-y-8"
          >
            {/* Section 1: Basic Info */}
            <div className="space-y-4">
              <h3 className="font-display font-bold text-lg text-primary-900 flex items-center gap-2 pb-2 border-b border-outline-variant/20">
                <User className="w-4 h-4" /> Personal Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  error={profileForm.formState.errors.first_name?.message}
                  {...profileForm.register("first_name")}
                />
                <Input
                  label="Middle Name"
                  error={profileForm.formState.errors.middle_name?.message}
                  {...profileForm.register("middle_name")}
                />
                <Input
                  label="Last Name"
                  error={profileForm.formState.errors.last_name?.message}
                  {...profileForm.register("last_name")}
                />
                <Input
                  label="Email Address"
                  type="email"
                  error={profileForm.formState.errors.email?.message}
                  {...profileForm.register("email")}
                />
                <Input
                  label="Profile Picture URL"
                  placeholder="https://example.com/avatar.jpg"
                  {...profileForm.register("profile_picture")}
                />
                <Input
                  label="Phone Number"
                  type="tel"
                  inputMode="numeric"
                  numericOnly={true}
                  prefix="+1"
                  placeholder="5550000000"
                  maxLength={10}
                  hint="Used for deadline SMS alerts"
                  error={profileForm.formState.errors.phone?.message}
                  autoComplete="tel-national"
                  {...profileForm.register("phone")}
                />
                <LocationFields
                  sectionTitle="Where do you live?"
                  values={{
                    state: watchState,
                    city: watchCity,
                    zip: watchZipCode,
                  }}
                  onChange={(field, value) => {
                    const formField = field === "zip" ? "zip_code" : field;
                    profileForm.setValue(formField, value, { shouldValidate: true });
                  }}
                  errors={{
                    state: profileForm.formState.errors.state?.message,
                    city: profileForm.formState.errors.city?.message,
                    zip: profileForm.formState.errors.zip_code?.message,
                  }}
                  requireZip
                  lockDerivedFields
                  onLocationChange={clearPartnerOrgSelection}
                  validationRef={locationValidationRef}
                  className="sm:col-span-2"
                />
                <Input
                  label="County"
                  type="text"
                  placeholder="Fulton"
                  hint="Set during signup — update your ZIP in Profile to refresh location"
                  readOnly
                  disabled
                  value={watchCounty}
                  error={profileForm.formState.errors.county?.message}
                />
                <Input
                  label="Date of Birth"
                  type="date"
                  {...profileForm.register("date_of_birth")}
                />
                <div className="sm:col-span-2">
                  <PartnerOrgSelect
                    value={profileForm.watch("org_id") || ""}
                    onChange={(id) =>
                      profileForm.setValue("org_id", id, { shouldValidate: true })
                    }
                    onOrgTypeChange={(type) =>
                      profileForm.setValue("org_type", type, { shouldValidate: true })
                    }
                    error={profileForm.formState.errors.org_id?.message}
                    requireLocation
                    locationFilters={{
                      state: watchState,
                      city: watchCity,
                      county: watchCounty,
                    }}
                  />
                </div>
                <Input
                  label="Organization Type"
                  placeholder="Select an organization first…"
                  readOnly
                  disabled
                  hint="Set automatically from your selected organization"
                  error={profileForm.formState.errors.org_type?.message}
                  {...profileForm.register("org_type")}
                />
                <Select
                  label="Preferred Language"
                  options={PREFERRED_LANGUAGE_OPTIONS}
                  {...profileForm.register("preferred_language")}
                />
              </div>
            </div>

            {/* Section 2: Family Setup */}
            <div className="space-y-4 pt-4 border-t border-outline-variant/10">
              <h3 className="font-display font-bold text-lg text-primary-900 flex items-center gap-2 pb-2 border-b border-outline-variant/20">
                <Users className="w-4 h-4" /> Household & Family Structure
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Household Size"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  numericOnly={true}
                  hint="Total people in your home including you"
                  {...profileForm.register("household_size")}
                />
                <Input
                  label="Number of Children"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  numericOnly={true}
                  hint="Children under 18 living with you"
                  {...profileForm.register("num_children")}
                />
                <Select
                  label="Marital Status"
                  options={MARITAL_STATUS_OPTIONS}
                  {...profileForm.register("marital_status")}
                />
                <Select
                  label="Immigration Status"
                  options={IMMIGRATION_STATUS_OPTIONS}
                  {...profileForm.register("immigration_status")}
                />
              </div>

              {/* Family Condition Checkboxes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-outline-variant/30 bg-surface-container-low hover:bg-surface-container cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    className="w-4 h-4 mt-0.5 rounded accent-primary-500 shrink-0"
                    {...profileForm.register("other_adults")}
                  />
                  <div>
                    <div className="font-semibold text-xs text-on-surface">Other Adults</div>
                    <div className="text-[10px] text-on-surface-variant">Living with you</div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-outline-variant/30 bg-rose-50/10 hover:bg-rose-50/20 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    className="w-4 h-4 mt-0.5 rounded accent-rose-500 shrink-0"
                    {...profileForm.register("is_pregnant")}
                  />
                  <div>
                    <div className="font-semibold text-xs text-rose-800">Currently Pregnant?</div>
                    <div className="text-[10px] text-rose-700">WIC & Medicaid triggers</div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-outline-variant/30 bg-surface-container-low hover:bg-surface-container cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    className="w-4 h-4 mt-0.5 rounded accent-primary-500 shrink-0"
                    {...profileForm.register("has_disability")}
                  />
                  <div>
                    <div className="font-semibold text-xs text-on-surface">Diagnosed Disability</div>
                    <div className="text-[10px] text-on-surface-variant">Unlocks SSI/Caregiver aids</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Section 3: Housing Setup */}
            <div className="space-y-4 pt-4 border-t border-outline-variant/10">
              <h3 className="font-display font-bold text-lg text-primary-900 flex items-center gap-2 pb-2 border-b border-outline-variant/20">
                <Home className="w-4 h-4" /> Housing & Rent Setup
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Housing Situation"
                  options={HOUSING_STATUS_OPTIONS}
                  {...profileForm.register("housing_status")}
                />
                {watchHousingStatus === "renting" && (
                  <Input
                    label="Monthly Rent Contribution"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    numericOnly={true}
                    leftIcon={<DollarSign className="w-4 h-4" />}
                    {...profileForm.register("monthly_rent")}
                  />
                )}
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-3.5 p-3.5 rounded-xl border border-amber-200 bg-amber-50/10 hover:bg-amber-50/20 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    className="w-5 h-5 mt-0.5 rounded accent-amber-500 shrink-0"
                    {...profileForm.register("eviction_risk")}
                  />
                  <div>
                    <div className="font-semibold text-sm text-amber-800 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" /> Immediate Eviction Risk?
                    </div>
                    <div className="text-xs text-amber-700/80 mt-0.5">
                      Select if you have received an active notice. Flags rapid housing vouchers.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Section 4: Income & Employment */}
            <div className="space-y-4 pt-4 border-t border-outline-variant/10">
              <h3 className="font-display font-bold text-lg text-primary-900 flex items-center gap-2 pb-2 border-b border-outline-variant/20">
                <Briefcase className="w-4 h-4" /> Work, Income & Assets
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Monthly Income"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  numericOnly={true}
                  leftIcon={<DollarSign className="w-4 h-4" />}
                  hint="Gross income before taxes"
                  {...profileForm.register("monthly_income")}
                />
                <Select
                  label="Work Situation"
                  options={EMPLOYMENT_STATUS_OPTIONS}
                  {...profileForm.register("employment_status")}
                />
                <Select
                  label="Savings & Assets"
                  options={SAVINGS_ASSETS_OPTIONS}
                  {...profileForm.register("savings_assets")}
                />
              </div>

              {/* Income Sources (array of checkboxes) */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                  Income Sources
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {INCOME_SOURCES_OPTIONS.map((option) => (
                    <label
                      key={option.id}
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-low hover:bg-surface-container cursor-pointer transition-all"
                    >
                      <input
                        type="checkbox"
                        value={option.id}
                        className="w-4 h-4 rounded accent-primary-500 shrink-0"
                        {...profileForm.register("income_sources")}
                      />
                      <span className="text-xs font-medium text-on-surface">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 5: Health & Childcare */}
            <div className="space-y-4 pt-4 border-t border-outline-variant/10">
              <h3 className="font-display font-bold text-lg text-primary-900 flex items-center gap-2 pb-2 border-b border-outline-variant/20">
                <Activity className="w-4 h-4" /> Health & Childcare
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Health Insurance"
                  options={HEALTH_INSURANCE_OPTIONS}
                  {...profileForm.register("health_insurance")}
                />
                {watchNeedsChildcare && (
                  <Input
                    label="Estimated Monthly Childcare Cost"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    numericOnly={true}
                    leftIcon={<DollarSign className="w-4 h-4" />}
                    {...profileForm.register("monthly_childcare_cost")}
                  />
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-outline-variant/30 bg-surface-container-low hover:bg-surface-container cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    className="w-4 h-4 mt-0.5 rounded accent-primary-500 shrink-0"
                    {...profileForm.register("needs_childcare")}
                  />
                  <div>
                    <div className="font-semibold text-xs text-on-surface">Needs Childcare?</div>
                    <div className="text-[10px] text-on-surface-variant">
                      For working or studying mothers needing day-care subsidies.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-outline-variant/30 bg-surface-container-low hover:bg-surface-container cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    className="w-4 h-4 mt-0.5 rounded accent-primary-500 shrink-0"
                    {...profileForm.register("chronic_illness")}
                  />
                  <div>
                    <div className="font-semibold text-xs text-on-surface">Chronic Illness?</div>
                    <div className="text-[10px] text-on-surface-variant">
                      Deductions for high recurring medical costs.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Section 6: Safety & Situational */}
            <div className="space-y-4 pt-4 border-t border-outline-variant/10">
              <h3 className="font-display font-bold text-lg text-primary-900 flex items-center gap-2 pb-2 border-b border-outline-variant/20">
                <ShieldAlert className="w-4 h-4" /> Safety & Legal Screening
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Urgency Level"
                  options={URGENCY_OPTIONS}
                  {...profileForm.register("urgency")}
                />
              </div>

              {/* Domestic Violence Alert */}
              <div className="pt-2">
                <label className="flex items-start gap-3.5 p-3.5 rounded-xl border border-red-200 bg-red-50/10 hover:bg-red-50/20 cursor-pointer transition-all">
                  <input
                    type="checkbox"
                    className="w-5 h-5 mt-0.5 rounded accent-red-500 shrink-0"
                    {...profileForm.register("domestic_violence")}
                  />
                  <div>
                    <div className="font-semibold text-sm text-red-800 flex items-center gap-1">
                      <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" /> Are you or your kids currently experiencing abuse?
                    </div>
                    <div className="text-xs text-red-700/80 mt-0.5">
                      Confidential. Flags emergency shelter resources and priority legal assistance.
                    </div>
                  </div>
                </label>
              </div>

              {/* Civil Legal Issues (array of checkboxes) */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                  Active Legal Issues
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {LEGAL_ISSUES_OPTIONS.map((option) => (
                    <label
                      key={option.id}
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-low hover:bg-surface-container cursor-pointer transition-all"
                    >
                      <input
                        type="checkbox"
                        value={option.id}
                        className="w-4 h-4 rounded accent-primary-500 shrink-0"
                        {...profileForm.register("legal_issues")}
                      />
                      <span className="text-xs font-medium text-on-surface">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-6 border-t border-outline-variant/10">
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={profileMutation.isPending}
                className="w-full sm:w-auto"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Password Change Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary-500" />
            <CardTitle>Change Password</CardTitle>
          </div>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={passwordForm.handleSubmit((data) => passwordMutation.mutate(data))}
            className="space-y-4"
          >
            <Input
              label="Current Password"
              type="password"
              error={passwordForm.formState.errors.current_password?.message}
              {...passwordForm.register("current_password")}
            />
            <Input
              label="New Password"
              type="password"
              error={passwordForm.formState.errors.new_password?.message}
              {...passwordForm.register("new_password")}
            />
            <Input
              label="Confirm New Password"
              type="password"
              error={passwordForm.formState.errors.confirm_password?.message}
              {...passwordForm.register("confirm_password")}
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={passwordMutation.isPending}
            >
              <Lock className="w-4 h-4" />
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
