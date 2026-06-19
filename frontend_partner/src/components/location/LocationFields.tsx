"use client";

import { useEffect, type MutableRefObject } from "react";
import { Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { US_STATES } from "@/lib/us-states";
import {
  useLocationFields,
  type LocationFieldValues,
  type UseLocationFieldsResult,
} from "@/hooks/useLocationFields";
import { cn } from "@/lib/utils";

export type { LocationFieldValues, UseLocationFieldsResult };

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1">
        {label}
        {required && <span className="text-primary-500">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-text-soft">{hint}</p>}
      {error && <p className="text-xs text-status-error">{error}</p>}
    </div>
  );
}

export interface LocationFieldsProps {
  values: LocationFieldValues;
  onChange: (field: keyof LocationFieldValues, value: string) => void;
  errors?: Partial<Record<keyof LocationFieldValues | "zip", string | undefined>>;
  onLocationChange?: () => void;
  requireState?: boolean;
  requireCity?: boolean;
  requireZip?: boolean;
  showZip?: boolean;
  lockDerivedFields?: boolean;
  className?: string;
  sectionTitle?: string;
  zipHint?: string;
  cityHint?: string;
  validationRef?: MutableRefObject<UseLocationFieldsResult | null>;
}

export function LocationFields({
  values,
  onChange,
  errors,
  onLocationChange,
  requireState = true,
  requireCity = true,
  requireZip = false,
  showZip = true,
  lockDerivedFields = false,
  className,
  sectionTitle,
  zipHint,
  cityHint,
  validationRef,
}: LocationFieldsProps) {
  const location = useLocationFields({
    values,
    onChange: (field, value) => {
      onChange(field, value);
      if (field === "state" || field === "city") {
        onLocationChange?.();
      }
    },
    requireCity,
    requireZip,
  });

  useEffect(() => {
    if (validationRef) {
      validationRef.current = location;
    }
  }, [location, validationRef]);

  const stateError = errors?.state;
  const cityError = errors?.city || location.cityLookupError;
  const zipError =
    errors?.zip || location.zipFormatError || location.lookupError || location.validationError;

  return (
    <div className={cn("space-y-4", className)}>
      {sectionTitle && (
        <div>
          <h3 className="text-sm font-semibold text-text-dark">{sectionTitle}</h3>
          <p className="text-xs text-text-soft mt-0.5">
            Enter your ZIP first — we use USPS data to auto-fill and verify your city.
          </p>
        </div>
      )}

      {showZip && (
        <Field
          label="ZIP Code"
          required={requireZip}
          hint={
            zipHint ??
            (location.isVerified
              ? "ZIP code verified for your city and state."
              : "Start here — we'll auto-fill your state and city from USPS data.")
          }
          error={zipError ?? undefined}
        >
          <div className="relative">
            <Input
              placeholder="30303"
              maxLength={10}
              inputMode="numeric"
              value={values.zip}
              onChange={(event) => location.handleZipChange(event.target.value)}
              error={Boolean(zipError)}
              autoComplete="postal-code"
            />
            {(location.isLoading || location.isVerified) && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                {location.isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : (
                  <Check className="w-4 h-4 text-status-success" />
                )}
              </span>
            )}
          </div>
        </Field>
      )}

      {lockDerivedFields ? (
        <Field label="State" required={requireState} hint="Auto-filled from your ZIP code.">
          <Input value={values.state} readOnly disabled autoComplete="address-level1" />
        </Field>
      ) : (
        <Field label="State" required={requireState} error={stateError}>
          <Select value={values.state || undefined} onValueChange={location.handleStateChange}>
            <SelectTrigger error={Boolean(stateError)}>
              <SelectValue placeholder="Select your state…" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((state) => (
                <SelectItem key={state.value} value={state.value}>
                  {state.label} ({state.value})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {lockDerivedFields ? (
        <Field label="City" required={requireCity} hint="Auto-filled from your ZIP code.">
          <Input value={values.city} readOnly disabled autoComplete="address-level2" />
        </Field>
      ) : location.useZipCityDropdown ? (
        <Field
          label="City"
          required={requireCity}
          error={cityError ?? undefined}
          hint={cityHint ?? "City options come from your ZIP code (USPS data)."}
        >
          <Select value={values.city || undefined} onValueChange={location.handleCityChange}>
            <SelectTrigger error={Boolean(cityError)}>
              <SelectValue placeholder="Select your city…" />
            </SelectTrigger>
            <SelectContent>
              {location.cityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : (
        <Field
          label="City"
          required={requireCity}
          error={cityError ?? undefined}
          hint={
            cityHint ??
            (values.state
              ? "Enter your city name — we'll verify it against USPS data."
              : "Choose your state first.")
          }
        >
          <Input
            placeholder={values.state ? "Springfield" : "Select a state first…"}
            value={values.city}
            onChange={(event) => location.handleCityChange(event.target.value)}
            disabled={!values.state}
            error={Boolean(cityError)}
            autoComplete="address-level2"
          />
        </Field>
      )}
    </div>
  );
}

export { useLocationFields };
