"use client";

import { useCallback, useEffect, type MutableRefObject } from "react";
import { Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { US_STATES } from "@/lib/us-states";
import {
  useLocationFields,
  type LocationFieldValues,
  type UseLocationFieldsResult,
} from "@/hooks/useLocationFields";
import { extractZip5 } from "@/services/zipValidation";
import { cn } from "@/lib/utils";

export type { LocationFieldValues, UseLocationFieldsResult };

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
  /** When true, state and city are read-only (derived from ZIP lookup). */
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
  const handleFieldChange = useCallback(
    (field: keyof LocationFieldValues, value: string) => {
      onChange(field, value);
      if (field === "state" || field === "city" || field === "county") {
        onLocationChange?.();
      }
    },
    [onChange, onLocationChange]
  );

  const location = useLocationFields({
    values,
    onChange: handleFieldChange,
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
          <h3 className="text-sm font-semibold text-on-surface">{sectionTitle}</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Enter your ZIP first — we use USPS data to auto-fill your city, state, and county.
          </p>
        </div>
      )}

      {showZip && (
        <Input
          label="ZIP Code"
          required={requireZip}
          placeholder="30303"
          maxLength={5}
          inputMode="numeric"
          numericOnly
          value={values.zip}
          onChange={(event) => location.handleZipChange(event.target.value)}
          onBlur={location.handleZipBlur}
          error={zipError ?? undefined}
          hint={
            zipHint ??
            (location.isVerified
              ? "ZIP code verified for your city, state, and county."
              : "Enter your 5-digit ZIP — we'll auto-fill your location from USPS data.")
          }
          rightIcon={
            location.isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
            ) : location.isVerified ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : undefined
          }
          autoComplete="postal-code"
        />
      )}

      {lockDerivedFields ? (
        <Input
          label="State"
          required={requireState}
          value={values.state ? formatStateLabel(values.state) : ""}
          readOnly
          disabled
          hint="Auto-filled from your ZIP code."
          autoComplete="address-level1"
        />
      ) : null}

      {lockDerivedFields ? (
        <Input
          label="City"
          required={requireCity}
          value={values.city}
          readOnly
          disabled
          hint="Auto-filled from your ZIP code."
          autoComplete="address-level2"
        />
      ) : null}

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
