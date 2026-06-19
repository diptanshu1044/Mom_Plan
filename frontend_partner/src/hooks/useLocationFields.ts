import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  extractZip5,
  isZipValidationEnabled,
  lookupCity,
  lookupZip,
  normalizeZipInput,
  validateZip,
} from "@/services/zipValidation";

const ZIP_STALE_TIME_MS = 24 * 60 * 60 * 1000;
const ZIP_DEBOUNCE_MS = 500;
const CITY_DEBOUNCE_MS = 500;

export interface LocationFieldValues {
  state: string;
  city: string;
  zip: string;
}

interface UseLocationFieldsOptions {
  values: LocationFieldValues;
  onChange: (field: keyof LocationFieldValues, value: string) => void;
  requireCity?: boolean;
  requireZip?: boolean;
}

function normalizeCity(value: string): string {
  return value.trim().toLowerCase();
}

export function useLocationFields({
  values,
  onChange,
  requireCity = true,
  requireZip = false,
}: UseLocationFieldsOptions) {
  const enabled = isZipValidationEnabled();
  const [debouncedZip, setDebouncedZip] = useState(values.zip);
  const [debouncedCity, setDebouncedCity] = useState(values.city);
  const zipAutofillRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setTimeout(() => setDebouncedZip(values.zip), ZIP_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [values.zip, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setTimeout(() => setDebouncedCity(values.city), CITY_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [values.city, enabled]);

  const zip5 = extractZip5(enabled ? debouncedZip : values.zip);
  const isDebouncingZip = enabled && values.zip !== debouncedZip;
  const isDebouncingCity = enabled && values.city !== debouncedCity;

  const lookupQuery = useQuery({
    queryKey: ["zip-lookup", zip5],
    queryFn: () => lookupZip(debouncedZip),
    enabled: enabled && Boolean(zip5),
    staleTime: ZIP_STALE_TIME_MS,
    gcTime: ZIP_STALE_TIME_MS,
    retry: (failureCount, error) => {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("valid US ZIP") || message.includes("could not be verified")) {
        return false;
      }
      return failureCount < 1;
    },
  });

  const cityLookupQuery = useQuery({
    queryKey: ["city-lookup", values.state, debouncedCity],
    queryFn: () => lookupCity(values.state, debouncedCity),
    enabled:
      enabled &&
      values.state.length === 2 &&
      Boolean(debouncedCity.trim()) &&
      !zip5,
    staleTime: ZIP_STALE_TIME_MS,
    gcTime: ZIP_STALE_TIME_MS,
  });

  const validationQuery = useQuery({
    queryKey: ["zip-validation", zip5, values.state, values.city],
    queryFn: () => validateZip(debouncedZip, values.state, values.city || undefined),
    enabled:
      enabled &&
      Boolean(zip5 && values.state.length === 2 && (!requireCity || values.city.trim())),
    staleTime: ZIP_STALE_TIME_MS,
    gcTime: ZIP_STALE_TIME_MS,
    retry: (failureCount, error) => {
      const message = error instanceof Error ? error.message : "";
      if (
        message.includes("valid US ZIP") ||
        message.includes("is assigned to") ||
        message.includes("does not belong") ||
        message.includes("could not be verified")
      ) {
        return false;
      }
      return failureCount < 1;
    },
  });

  useEffect(() => {
    if (!enabled || !lookupQuery.data || lookupQuery.isFetching) return;
    if (!zip5 || lookupQuery.data.error) return;

    zipAutofillRef.current = true;

    if (lookupQuery.data.state && lookupQuery.data.state !== values.state) {
      onChange("state", lookupQuery.data.state);
    }

    const zipCities = lookupQuery.data.cities;
    if (zipCities.length >= 1) {
      const canonicalCity =
        zipCities.find((city) => normalizeCity(city) === normalizeCity(values.city)) ??
        zipCities[0];
      if (values.city !== canonicalCity) {
        onChange("city", canonicalCity);
      }
    }

    const timer = window.setTimeout(() => {
      zipAutofillRef.current = false;
    }, 0);
    return () => window.clearTimeout(timer);
  }, [enabled, lookupQuery.data, lookupQuery.isFetching, zip5, values.state, values.city, onChange]);

  useEffect(() => {
    if (!enabled || zip5 || !cityLookupQuery.data?.valid || cityLookupQuery.isFetching) return;
    const canonicalCity = cityLookupQuery.data.city;
    if (canonicalCity && values.city !== canonicalCity) {
      onChange("city", canonicalCity);
    }
  }, [
    enabled,
    zip5,
    cityLookupQuery.data,
    cityLookupQuery.isFetching,
    values.city,
    onChange,
  ]);

  const zipCityOptions = useMemo(() => {
    const zipCities = lookupQuery.data?.cities ?? [];
    const validationCities = validationQuery.data?.cities ?? [];
    const merged = new Set<string>([...zipCities, ...validationCities]);
    if (values.city.trim()) merged.add(values.city.trim());
    return [...merged].sort((a, b) => a.localeCompare(b));
  }, [lookupQuery.data?.cities, validationQuery.data?.cities, values.city]);

  const useZipCityDropdown = Boolean(zip5 && zipCityOptions.length > 0);

  const cityOptions = useMemo(
    () =>
      zipCityOptions.map((city) => ({
        value: city,
        label: city,
      })),
    [zipCityOptions]
  );

  const handleStateChange = useCallback(
    (state: string) => {
      onChange("state", state);
      if (!zipAutofillRef.current) {
        onChange("city", "");
      }
    },
    [onChange]
  );

  const handleCityChange = useCallback(
    (city: string) => {
      onChange("city", city);
    },
    [onChange]
  );

  const handleZipChange = useCallback(
    (raw: string) => {
      onChange("zip", normalizeZipInput(raw));
    },
    [onChange]
  );

  const zipFormatError = useMemo(() => {
    if (!enabled || !values.zip.trim()) return null;
    if (!zip5) return "Please enter a valid US ZIP code.";
    return null;
  }, [enabled, values.zip, zip5]);

  const lookupError =
    enabled && zip5 && lookupQuery.data?.error ? lookupQuery.data.error : null;

  const cityLookupError = useMemo(() => {
    if (!enabled || zip5 || !values.state || !debouncedCity.trim()) return null;
    if (isDebouncingCity || cityLookupQuery.isFetching) return null;
    return cityLookupQuery.data?.error ?? null;
  }, [
    enabled,
    zip5,
    values.state,
    debouncedCity,
    isDebouncingCity,
    cityLookupQuery.isFetching,
    cityLookupQuery.data?.error,
  ]);

  const validationError =
    enabled && zip5 && values.state.length === 2 && values.city.trim()
      ? validationQuery.data?.error ?? null
      : null;

  const isLoading =
    isDebouncingZip ||
    isDebouncingCity ||
    lookupQuery.isFetching ||
    cityLookupQuery.isFetching ||
    (Boolean(zip5 && values.state.length === 2 && values.city.trim()) &&
      validationQuery.isFetching);

  const isVerified = Boolean(
    enabled &&
      zip5 &&
      values.state.length === 2 &&
      (!requireCity || values.city.trim()) &&
      !isLoading &&
      validationQuery.data?.valid
  );

  const validate = useCallback((): boolean => {
    if (!enabled) return true;

    if (requireZip && !values.zip.trim()) return false;
    if (values.zip.trim() && !zip5) return false;
    if (zip5 && values.state.length !== 2) return false;
    if (requireCity && !values.city.trim()) return false;
    if (isLoading) return false;

    if (zip5 && values.state.length === 2) {
      if (lookupError) return false;
      if (requireCity && values.city.trim() && validationError) return false;
      if (requireCity && values.city.trim() && !validationQuery.data?.valid) return false;
      return true;
    }

    if (!zip5 && values.state.length === 2 && values.city.trim()) {
      return Boolean(cityLookupQuery.data?.valid);
    }

    return true;
  }, [
    enabled,
    requireZip,
    requireCity,
    values.zip,
    values.state,
    values.city,
    zip5,
    isLoading,
    lookupError,
    validationError,
    validationQuery.data?.valid,
    cityLookupQuery.data?.valid,
  ]);

  const getValidationError = useCallback((): string | null => {
    if (!enabled) return null;
    if (requireZip && !values.zip.trim()) return "ZIP code is required.";
    if (zipFormatError) return zipFormatError;
    if (zip5 && values.state.length !== 2) return "Please select a valid US state.";
    if (requireCity && !values.city.trim()) return "City is required.";
    if (isLoading) return "Verifying location…";
    if (lookupError) return lookupError;
    if (cityLookupError) return cityLookupError;
    if (validationError) return validationError;
    if (
      zip5 &&
      values.state.length === 2 &&
      values.city.trim() &&
      validationQuery.data &&
      !validationQuery.data.valid
    ) {
      return validationQuery.data.error || "Please verify your ZIP code, state, and city.";
    }
    if (
      !zip5 &&
      values.state.length === 2 &&
      values.city.trim() &&
      cityLookupQuery.data &&
      !cityLookupQuery.data.valid
    ) {
      return cityLookupQuery.data.error || "Please enter a valid city for your state.";
    }
    return null;
  }, [
    enabled,
    requireZip,
    requireCity,
    values.zip,
    values.state,
    values.city,
    zip5,
    zipFormatError,
    isLoading,
    lookupError,
    cityLookupError,
    validationError,
    validationQuery.data,
    cityLookupQuery.data,
  ]);

  return {
    isEnabled: enabled,
    cityOptions,
    useZipCityDropdown,
    isLoading,
    isVerified,
    zipFormatError,
    lookupError,
    cityLookupError,
    validationError,
    handleStateChange,
    handleCityChange,
    handleZipChange,
    validate,
    getValidationError,
  };
}

export type UseLocationFieldsResult = ReturnType<typeof useLocationFields>;
