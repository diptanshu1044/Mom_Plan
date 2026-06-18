import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  extractZip5,
  isZipValidationEnabled,
  validateZip,
  type ZipValidationResult,
} from "@/services/zipValidation";

const ZIP_STALE_TIME_MS = 24 * 60 * 60 * 1000;

interface UseZipValidationOptions {
  zip: string;
  state: string;
  onCityResolved?: (city: string) => void;
  onCityCleared?: () => void;
}

export function useZipValidation({
  zip,
  state,
  onCityResolved,
  onCityCleared,
}: UseZipValidationOptions) {
  const enabled = isZipValidationEnabled();
  const [debouncedZip, setDebouncedZip] = useState(zip);

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setTimeout(() => setDebouncedZip(zip), 500);
    return () => window.clearTimeout(timer);
  }, [zip, enabled]);

  const zip5 = extractZip5(enabled ? debouncedZip : zip);
  const isDebouncing = enabled && zip !== debouncedZip;
  const canLookup = enabled && Boolean(zip5 && state.length === 2);

  const query = useQuery<ZipValidationResult>({
    queryKey: ["zip-validation", zip5, state],
    queryFn: () => validateZip(debouncedZip, state),
    enabled: canLookup,
    staleTime: ZIP_STALE_TIME_MS,
    gcTime: ZIP_STALE_TIME_MS,
    retry: (failureCount, error) => {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("valid US ZIP") || message.includes("does not belong")) {
        return false;
      }
      return failureCount < 1;
    },
  });

  useEffect(() => {
    if (!enabled) return;

    if (!zip5) {
      onCityCleared?.();
      return;
    }

    if (query.data?.valid && query.data.city) {
      onCityResolved?.(query.data.city);
    }
  }, [enabled, query.data, zip5, onCityResolved, onCityCleared]);

  const formatError = useMemo(() => {
    if (!enabled) return null;
    if (!debouncedZip.trim()) return null;
    if (!zip5) return "Please enter a valid US ZIP code.";
    return null;
  }, [enabled, debouncedZip, zip5]);

  if (!enabled) {
    return {
      isEnabled: false,
      zip5: extractZip5(zip),
      isLoading: false,
      isVerified: true,
      city: null,
      error: null,
      isFetching: false,
      isDebouncing: false,
    };
  }

  const validationError = formatError ?? (canLookup ? query.data?.error ?? null : null);
  const isLoading = isDebouncing || (canLookup && query.isFetching);
  const isVerified = Boolean(
    canLookup &&
      !isLoading &&
      query.data?.valid &&
      query.data.city &&
      query.data.state === state
  );

  return {
    isEnabled: true,
    zip5,
    isLoading,
    isVerified,
    city: query.data?.city ?? null,
    error: validationError,
    isFetching: query.isFetching,
    isDebouncing,
  };
}
