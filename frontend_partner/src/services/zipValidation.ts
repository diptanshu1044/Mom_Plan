import { api } from "@/lib/api";

export function isZipValidationEnabled(): boolean {
  return true;
}

export type ZipValidationErrorCode =
  | "INVALID_FORMAT"
  | "NOT_FOUND"
  | "STATE_MISMATCH"
  | "CITY_MISMATCH"
  | "NETWORK_ERROR";

export interface ZipValidationResult {
  valid: boolean;
  city: string | null;
  state: string | null;
  zip: string | null;
  cities: string[];
  error: string | null;
  errorCode?: ZipValidationErrorCode;
}

export interface ZipLookupResult {
  zip: string;
  state: string | null;
  cities: string[];
  error: string | null;
  errorCode?: ZipValidationErrorCode;
}

export interface CityLookupResult {
  valid: boolean;
  city: string | null;
  state: string | null;
  zips: string[];
  error: string | null;
  errorCode?: ZipValidationErrorCode;
}

export function extractZip5(zip: string): string | null {
  const match = zip.trim().match(/^(\d{5})(?:-\d{4})?$/);
  return match ? match[1] : null;
}

export function isValidZipFormat(zip: string): boolean {
  return extractZip5(zip) !== null;
}

export function normalizeZipInput(value: string): string {
  const cleaned = value.replace(/[^\d-]/g, "");
  const digits = cleaned.replace(/-/g, "");

  if (digits.length <= 5) {
    return digits;
  }

  return `${digits.slice(0, 5)}-${digits.slice(5, 9)}`;
}

function inferErrorCode(message: string | null): ZipValidationErrorCode | undefined {
  if (!message) return undefined;
  if (message.includes("valid US ZIP")) return "INVALID_FORMAT";
  if (message.includes("could not be verified")) return "NOT_FOUND";
  if (message.includes("is assigned to")) return "CITY_MISMATCH";
  if (message.includes("does not belong")) return "STATE_MISMATCH";
  if (message.includes("Unable to verify")) return "NETWORK_ERROR";
  return undefined;
}

export async function validateZip(
  zip: string,
  state: string,
  city?: string
): Promise<ZipValidationResult> {
  const zip5 = extractZip5(zip);
  if (!zip5) {
    return {
      valid: false,
      city: null,
      state: null,
      zip: null,
      cities: [],
      error: "Please enter a valid US ZIP code.",
      errorCode: "INVALID_FORMAT",
    };
  }

  if (!state || state.length !== 2) {
    return {
      valid: false,
      city: null,
      state: null,
      zip: zip5,
      cities: [],
      error: "Please select a valid US state.",
      errorCode: "INVALID_FORMAT",
    };
  }

  try {
    const response = await api.post("/api/location/validate-zip", {
      zip,
      state,
      city: city || undefined,
    });

    const data = response.data.data as {
      valid: boolean;
      city: string | null;
      state: string | null;
      zip: string | null;
      cities?: string[];
      error: string | null;
    };

    return {
      valid: data.valid,
      city: data.city,
      state: data.state,
      zip: data.zip,
      cities: data.cities ?? [],
      error: data.error,
      errorCode: inferErrorCode(data.error),
    };
  } catch {
    return {
      valid: false,
      city: null,
      state: null,
      zip: zip5,
      cities: [],
      error: "Unable to verify ZIP code right now. Please try again.",
      errorCode: "NETWORK_ERROR",
    };
  }
}

export async function lookupZip(zip: string): Promise<ZipLookupResult> {
  const zip5 = extractZip5(zip);
  if (!zip5) {
    return {
      zip: "",
      state: null,
      cities: [],
      error: "Please enter a valid US ZIP code.",
      errorCode: "INVALID_FORMAT",
    };
  }

  try {
    const response = await api.post("/api/location/lookup-zip", { zip });
    const data = response.data.data as {
      zip: string;
      state: string | null;
      cities: string[];
      error: string | null;
    };

    return {
      zip: data.zip,
      state: data.state,
      cities: data.cities ?? [],
      error: data.error,
      errorCode: inferErrorCode(data.error),
    };
  } catch {
    return {
      zip: zip5,
      state: null,
      cities: [],
      error: "Unable to verify ZIP code right now. Please try again.",
      errorCode: "NETWORK_ERROR",
    };
  }
}

export async function lookupCity(state: string, city: string): Promise<CityLookupResult> {
  if (!state || state.length !== 2 || !city.trim()) {
    return {
      valid: false,
      city: null,
      state: state || null,
      zips: [],
      error: "State and city are required.",
      errorCode: "INVALID_FORMAT",
    };
  }

  try {
    const response = await api.get("/api/location/lookup-city", {
      params: { state, city: city.trim() },
    });
    const data = response.data.data as {
      valid: boolean;
      city: string | null;
      state: string | null;
      zips: string[];
      error: string | null;
    };

    return {
      valid: data.valid,
      city: data.city,
      state: data.state,
      zips: data.zips ?? [],
      error: data.error,
      errorCode: inferErrorCode(data.error),
    };
  } catch {
    return {
      valid: false,
      city: null,
      state: state.toUpperCase(),
      zips: [],
      error: "Unable to verify city right now. Please try again.",
      errorCode: "NETWORK_ERROR",
    };
  }
}
