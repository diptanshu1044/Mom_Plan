import { api } from "@/lib/api";

export function isZipValidationEnabled(): boolean {
  return process.env.NODE_ENV === "production";
}

export type ZipValidationErrorCode =
  | "INVALID_FORMAT"
  | "NOT_FOUND"
  | "STATE_MISMATCH"
  | "NETWORK_ERROR";

export interface ZipValidationResult {
  valid: boolean;
  city: string | null;
  state: string | null;
  zip: string | null;
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
  if (message.includes("does not belong")) return "STATE_MISMATCH";
  if (message.includes("Unable to verify")) return "NETWORK_ERROR";
  return undefined;
}

export async function validateZip(zip: string, state: string): Promise<ZipValidationResult> {
  if (!isZipValidationEnabled()) {
    return {
      valid: true,
      city: null,
      state: state || null,
      zip: extractZip5(zip),
      error: null,
    };
  }

  const zip5 = extractZip5(zip);
  if (!zip5) {
    return {
      valid: false,
      city: null,
      state: null,
      zip: null,
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
      error: "Please select a valid US state.",
      errorCode: "INVALID_FORMAT",
    };
  }

  try {
    const response = await api.post("/api/location/validate-zip", {
      zip,
      state,
    });

    const data = response.data.data as {
      valid: boolean;
      city: string | null;
      state: string | null;
      zip: string | null;
      error: string | null;
    };

    return {
      valid: data.valid,
      city: data.city,
      state: data.state,
      zip: data.zip,
      error: data.error,
      errorCode: inferErrorCode(data.error),
    };
  } catch {
    return {
      valid: false,
      city: null,
      state: null,
      zip: zip5,
      error: "Unable to verify ZIP code right now. Please try again.",
      errorCode: "NETWORK_ERROR",
    };
  }
}
