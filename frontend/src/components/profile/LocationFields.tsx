"use client";

import { useEffect, type MutableRefObject } from "react";
import { Check, Loader2 } from "lucide-react";
import { Input, Select } from "@/components/ui/Input";
import { US_STATES } from "@/lib/us-states";
import {
  useLocationFields,
  type LocationFieldValues,
  type UseLocationFieldsResult,
} from "@/hooks/useLocationFields";
import { cn } from "@/lib/utils";

export type { LocationFieldValues, UseLocationFieldsResult };

export interface LocationFieldsProps {
  values: LocationFieldValues;
  onChange: (field: keyof LocationFieldValues, value: string) => void;
  errors?: Partial<Record<keyof LocationFieldValues | "zip", string | undefined>>;
  onLocationChange?: () => void;
  requireState?: boolean;
  requireCity?: boolean;
  requireZip?: boolean;
  showZip?: boolean;
  /** When true, state and city are read-only (derived from ZIP lookup). */
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
          <h3 className="text-sm font-semibold text-on-surface">{sectionTitle}</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Enter your ZIP first — we use USPS data to auto-fill and verify your city.
          </p>
        </div>
      )}

      {showZip && (
        <Input
          label="ZIP Code"
          required={requireZip}
          placeholder="30303"
          maxLength={10}
          inputMode="numeric"
          value={values.zip}
          onChange={(event) => location.handleZipChange(event.target.value)}
          error={zipError ?? undefined}
          hint={
            zipHint ??
            (location.isVerified
              ? "ZIP code verified for your city and state."
              : "Start here — we'll auto-fill your state and city from USPS data.")
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
          value={values.state}
          readOnly
          disabled
          hint="Auto-filled from your ZIP code."
          autoComplete="address-level1"
        />
      ) : (
        <Select
          label="State"
          required={requireState}
          placeholder="Select your state…"
          options={US_STATES.map((state) => ({
            value: state.value,
            label: `${state.label} (${state.value})`,
          }))}
          value={values.state}
          onChange={(event) => location.handleStateChange(event.target.value)}
          error={stateError}
          autoComplete="address-level1"
        />
      )}

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
      ) : location.useZipCityDropdown ? (
        <Select
          label="City"
          required={requireCity}
          placeholder="Select your city…"
          options={location.cityOptions}
          value={values.city}
          onChange={(event) => location.handleCityChange(event.target.value)}
          error={cityError ?? undefined}
          hint={
            cityHint ??
            "City options come from your ZIP code (USPS data)."
          }
          autoComplete="address-level2"
        />
      ) : (
        <Input
          label="City"
          required={requireCity}
          placeholder={values.state ? "Springfield" : "Select a state first…"}
          value={values.city}
          onChange={(event) => location.handleCityChange(event.target.value)}
          disabled={!values.state}
          error={cityError ?? undefined}
          hint={
            cityHint ??
            (values.state
              ? "Enter your city name — we'll verify it against USPS data."
              : "Choose your state first.")
          }
          autoComplete="address-level2"
        />
      )}
    </div>
  );
}

export { useLocationFields };
