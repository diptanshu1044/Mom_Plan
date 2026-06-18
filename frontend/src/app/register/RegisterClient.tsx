"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from "lucide-react";
import { getPartnerPortalUrl } from "@/lib/portal-urls";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SignupBgPattern } from "@/components/signup/SignupBgPattern";
import { SignupBrandPill } from "@/components/signup/SignupBrandPill";
import { PartnerOrgSelect } from "@/components/profile/PartnerOrgSelect";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/errors";
import { US_STATES } from "@/lib/us-states";

const registerSchema = z
  .object({
    first_name: z.string().trim().min(1, "First name is required"),
    middle_name: z.string().trim().optional(),
    last_name: z.string().trim().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    phone: z
      .string()
      .optional()
      .refine((val) => !val || /^\d{10}$/.test(val), {
        message: "Enter a valid 10-digit US phone number",
      }),
    state: z.string().trim().min(1, "State is required"),
    city: z.string().trim().min(1, "City is required"),
    county: z.string().trim().min(1, "County is required"),
    org_type: z.string().optional(),
    org_id: z
      .string()
      .optional()
      .refine((val) => !val || z.string().uuid().safeParse(val).success, {
        message: "Please select a valid partner organization",
      }),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

const passwordStrength = (password: string): number => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4);
};

const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];
const strengthColors = ["", "bg-red-400", "bg-amber-400", "bg-blue-400", "bg-emerald-500"];

function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const { setAuth } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const password = watch("password", "");
  const strength = passwordStrength(password || "");
  const state = watch("state", "");
  const city = watch("city", "");
  const county = watch("county", "");

  const onSubmit = async (data: RegisterFormData) => {
    setError("");
    try {
      const response = await api.post("/api/auth/register", {
        first_name: data.first_name,
        middle_name: data.middle_name || undefined,
        last_name: data.last_name,
        email: data.email,
        password: data.password,
        phone: data.phone ? `+1${data.phone}` : undefined,
        state: data.state,
        city: data.city,
        county: data.county,
        org_type: data.org_type || undefined,
        org_id: data.org_id || undefined,
      });
      const { user, accessToken } = response.data.data;
      setAuth(user, accessToken);

      if (redirectTo === "eligibility") {
        router.push("/eligibility");
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Registration failed. Please try again."));
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-hero" suppressHydrationWarning>
      <SignupBgPattern />

      <div className="relative z-10 min-h-screen flex flex-col items-center px-6 pt-8 pb-12">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-7"
        >
          <SignupBrandPill />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="w-full max-w-[680px] bg-white rounded-3xl shadow-glass-lg border border-primary-100 overflow-hidden"
        >
          <div className="h-1 bg-gradient-to-r from-primary-500 to-secondary-500" />

          <div className="px-6 sm:px-8 pt-6 pb-0">
            <div className="flex items-center gap-2.5 mb-1">
              <span className="text-[22px] leading-none">🌸</span>
              <h1 className="font-display font-semibold text-[22px] text-on-surface">
                Mother Sign Up
              </h1>
              <Link
                href="/signup"
                className="ml-auto rounded-full bg-primary-50 border-0 px-3 py-1 text-[11px] font-bold text-on-surface-variant hover:text-primary-600 transition-colors"
              >
                ← Change
              </Link>
            </div>
            <p className="text-[13px] text-on-surface-variant/80 mb-5">
              Start discovering benefits your family qualifies for. Your information stays private and secure.
            </p>
            <p className="text-xs text-on-surface-variant mb-5">
              Looking for an organization account?{" "}
              <a
                href={getPartnerPortalUrl("/signup")}
                className="text-primary-500 hover:text-primary-600 font-semibold"
              >
                Sign up as an Organization instead
              </a>
            </p>
          </div>

          <div className="px-6 sm:px-8 pb-8">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  type="text"
                  placeholder="Maria"
                  leftIcon={<User className="w-4 h-4" />}
                  error={errors.first_name?.message}
                  autoComplete="given-name"
                  required
                  {...register("first_name")}
                />

                <Input
                  label="Last Name"
                  type="text"
                  placeholder="Johnson"
                  error={errors.last_name?.message}
                  autoComplete="family-name"
                  required
                  {...register("last_name")}
                />
              </div>

              <Input
                label="Middle Name"
                type="text"
                placeholder="Anne"
                hint="Optional"
                autoComplete="additional-name"
                error={errors.middle_name?.message}
                {...register("middle_name")}
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                leftIcon={<Mail className="w-4 h-4" />}
                error={errors.email?.message}
                autoComplete="email"
                {...register("email")}
              />

              <Input
                label="Phone Number"
                type="tel"
                inputMode="numeric"
                numericOnly={true}
                prefix="+1"
                placeholder="5550000000"
                maxLength={10}
                hint="Optional — 10-digit US number for deadline SMS alerts"
                error={errors.phone?.message}
                autoComplete="tel-national"
                {...register("phone")}
              />

              <div>
                <label className="block text-sm font-medium text-on-surface mb-1.5">
                  State <span className="text-red-500">*</span>
                </label>
                <select
                  {...register("state", {
                    onChange: () => {
                      setValue("org_id", "");
                      setValue("org_type", "");
                    },
                  })}
                  className={`w-full px-3 py-2.5 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    errors.state ? "border-red-400" : "border-outline-variant/60"
                  }`}
                  autoComplete="address-level1"
                >
                  <option value="">Select your state…</option>
                  {US_STATES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label} ({s.value})
                    </option>
                  ))}
                </select>
                {errors.state?.message && (
                  <p className="text-xs text-red-600 mt-1">{errors.state.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="City"
                  type="text"
                  placeholder="Atlanta"
                  required
                  autoComplete="address-level2"
                  error={errors.city?.message}
                  {...register("city", {
                    onChange: () => {
                      setValue("org_id", "");
                      setValue("org_type", "");
                    },
                  })}
                />

                <Input
                  label="County"
                  type="text"
                  placeholder="Fulton"
                  required
                  hint="The county where you live"
                  error={errors.county?.message}
                  {...register("county", {
                    onChange: () => {
                      setValue("org_id", "");
                      setValue("org_type", "");
                    },
                  })}
                />
              </div>

              <Controller
                name="org_id"
                control={control}
                render={({ field }) => (
                  <PartnerOrgSelect
                    value={field.value || ""}
                    onChange={field.onChange}
                    onOrgTypeChange={(type) =>
                      setValue("org_type", type, { shouldValidate: true })
                    }
                    error={errors.org_id?.message}
                    requireLocation
                    locationFilters={{ state, city, county }}
                  />
                )}
              />

              <Input
                label="Organization Type"
                placeholder="Select an organization first…"
                readOnly
                disabled
                hint="Set automatically from your selected organization"
                error={errors.org_type?.message}
                {...register("org_type")}
              />

              <div>
                <Input
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="hover:text-primary-500 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  error={errors.password?.message}
                  autoComplete="new-password"
                  {...register("password")}
                />
                {password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            i < strength ? strengthColors[strength] : "bg-surface-container"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-on-surface-variant">
                      Strength:{" "}
                      <span className={strength >= 3 ? "text-emerald-600" : "text-amber-600"}>
                        {strengthLabels[strength]}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              <Input
                label="Confirm Password"
                type={showPassword ? "text" : "password"}
                placeholder="Repeat your password"
                leftIcon={<Lock className="w-4 h-4" />}
                error={errors.confirmPassword?.message}
                autoComplete="new-password"
                {...register("confirmPassword")}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isSubmitting}
                className="w-full mt-2 rounded-full"
              >
                Create Account
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>

            <div className="flex flex-wrap gap-1.5 mt-5">
              {["🔒 Private & secure", "💜 Free to use", "🤝 No judgment here"].map((badge) => (
                <span
                  key={badge}
                  className="text-[11px] font-bold text-on-surface-variant px-2.5 py-1 rounded-full bg-primary-50 border border-primary-100"
                >
                  {badge}
                </span>
              ))}
            </div>

            <p className="text-center text-sm text-on-surface-variant mt-6">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-primary-500 hover:text-primary-600 font-semibold"
              >
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>

        <p className="text-center text-xs text-on-surface-variant mt-6 opacity-60 max-w-[680px]">
          By creating an account, you agree to our{" "}
          <Link href="/terms" className="underline">Terms</Link> and{" "}
          <Link href="/privacy" className="underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-hero flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <RegisterForm />
    </Suspense>
  );
}
