"use client";

import { useEffect, type MutableRefObject } from "react";
import { Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Label } from "@/components/ui/label";
import { US_STATES } from "@/lib/us-states";
import {
  useLocationFields,
  type LocationFieldValues,
  type UseLocationFieldsResult,
} from "@/hooks/useLocationFields";
import { extractZip5 } from "@/services/zipValidation";
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
  requireCounty?: boolean;
  requireZip?: boolean;
  showZip?: boolean;
  showCounty?: boolean;
  lockDerivedFields?: boolean;
  className?: string;
  sectionTitle?: string;
  zipHint?: string;
  cityHint?: string;
  countyHint?: string;
  validationRef?: MutableRefObject<UseLocationFieldsResult | null>;
}

function formatStateLabel(stateCode: string): string {
  const match = US_STATES.find((state) => state.value === stateCode);
  return match ? `${match.label} (${stateCode})` : stateCode;
}

export function LocationFields({
  values,
  onChange,
  errors,
  onLocationChange,
  requireState = true,
  requireCity = true,
  requireCounty = true,
  requireZip = false,
  showZip = true,
  showCounty = true,
  lockDerivedFields = false,
  className,
  sectionTitle,
  zipHint,
  cityHint,
  countyHint,
  validationRef,
}: LocationFieldsProps) {
  const location = useLocationFields({
    values,
    onChange: (field, value) => {
      onChange(field, value);
      if (field === "state" || field === "city" || field === "county") {
        onLocationChange?.();
      }
    },
    requireCity,
    requireZip,
    requireCounty,
  });

  useEffect(() => {
    if (validationRef) {
      validationRef.current = location;
    }
  }, [location, validationRef]);

  const stateError = errors?.state;
  const cityError = errors?.city;
  const countyError = errors?.county || location.countyError;
  const zipError =
    errors?.zip || location.zipFormatError || location.lookupError || location.validationError;

  return (
    <div className={cn("space-y-4", className)}>
      {sectionTitle && (
        <div>
          <h3 className="text-sm font-semibold text-text-dark">{sectionTitle}</h3>
          <p className="text-xs text-text-soft mt-0.5">
            Enter your ZIP first — we use USPS data to auto-fill your city, state, and county.
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
              ? "ZIP code verified for your city, state, and county."
              : "Enter your 5-digit ZIP — we'll auto-fill your location from USPS data.")
          }
          error={zipError ?? undefined}
        >
          <div className="relative">
            <Input
              placeholder="30303"
              maxLength={5}
              inputMode="numeric"
              numericOnly
              value={values.zip}
              onChange={(event) => location.handleZipChange(event.target.value)}
              onBlur={location.handleZipBlur}
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

      {lockDerivedFields && (
        <Field label="State" required={requireState} hint="Auto-filled from your ZIP code.">
          <Input
            value={values.state ? formatStateLabel(values.state) : ""}
            readOnly
            disabled
            autoComplete="address-level1"
          />
        </Field>
      )}

      {lockDerivedFields && (
        <Field label="City" required={requireCity} hint="Auto-filled from your ZIP code.">
          <Input value={values.city} readOnly disabled autoComplete="address-level2" />
        </Field>
      )}

      {showCounty && extractZip5(values.zip) && (
        <SearchableSelect
          label="County"
          required={requireCounty}
          placeholder={
            location.isLoading && location.countyOptions.length === 0
              ? "Loading counties…"
              : "Select your county…"
          }
          options={location.countyOptions}
          value={values.county}
          onChange={location.handleCountyChange}
          error={countyError ?? undefined}
          hint={
            countyHint ??
            (location.requiresCountySelection
              ? "This ZIP spans multiple counties — please select yours."
              : location.countyOptions.length === 1
                ? "Auto-filled from your ZIP code. Open the dropdown to confirm."
                : "Select the county that matches your ZIP code.")
          }
          disabled={location.isLoading && location.countyOptions.length === 0}
          autoComplete="address-level3"
        />
      )}
    </div>
  );
}

export { useLocationFields };
