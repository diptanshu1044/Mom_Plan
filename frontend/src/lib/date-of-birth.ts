import { format, isValid, parse } from "date-fns";

export const DOB_DISPLAY_FORMAT = "MM/dd/yyyy";
export const DOB_ISO_FORMAT = "yyyy-MM-dd";

export interface DateOfBirthBounds {
  minDate: Date;
  maxDate: Date;
  minYear: number;
  maxYear: number;
}

/** Parse YYYY-MM-DD as a local calendar date (no UTC shift). */
export function parseIsoDateLocal(iso: string): Date | null {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/** Format a Date as YYYY-MM-DD using local calendar fields. */
export function formatIsoDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Format an ISO date string for display (MM/DD/YYYY). */
export function formatDobDisplay(iso: string): string {
  const date = parseIsoDateLocal(iso);
  if (!date) return "";
  return format(date, DOB_DISPLAY_FORMAT);
}

/** Parse user-typed MM/DD/YYYY into a local Date. */
export function parseDobDisplay(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = parse(trimmed, DOB_DISPLAY_FORMAT, new Date(0));
  if (!isValid(parsed)) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

export function getAdultDobBounds(
  minAge = 16,
  maxAge = 100,
  referenceDate = new Date()
): DateOfBirthBounds {
  const currentYear = referenceDate.getFullYear();
  const maxDate = new Date(
    currentYear - minAge,
    referenceDate.getMonth(),
    referenceDate.getDate()
  );
  const minDate = new Date(currentYear - maxAge, 0, 1);

  return {
    minDate,
    maxDate,
    minYear: minDate.getFullYear(),
    maxYear: maxDate.getFullYear(),
  };
}

export function getChildDobBounds(
  maxAge = 18,
  referenceDate = new Date()
): DateOfBirthBounds {
  const currentYear = referenceDate.getFullYear();
  const maxDate = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );
  const minDate = new Date(currentYear - maxAge, 0, 1);

  return {
    minDate,
    maxDate,
    minYear: minDate.getFullYear(),
    maxYear: maxDate.getFullYear(),
  };
}

export type DobValidationResult =
  | { valid: true; iso: string }
  | { valid: false; message: string };

export function validateDateOfBirth(
  date: Date | null,
  bounds: DateOfBirthBounds,
  options: { required?: boolean; minAge?: number; maxAge?: number } = {}
): DobValidationResult {
  const { required = false, minAge = 16, maxAge = 100 } = options;

  if (!date) {
    if (required) {
      return { valid: false, message: "Date of birth is required." };
    }
    return { valid: true, iso: "" };
  }

  if (date < bounds.minDate) {
    return {
      valid: false,
      message: `Date must be on or after ${format(bounds.minDate, DOB_DISPLAY_FORMAT)} (maximum age ${maxAge}).`,
    };
  }

  if (date > bounds.maxDate) {
    return {
      valid: false,
      message: `Date must be on or before ${format(bounds.maxDate, DOB_DISPLAY_FORMAT)} (minimum age ${minAge}).`,
    };
  }

  return { valid: true, iso: formatIsoDateLocal(date) };
}

export function validateDobInput(
  raw: string,
  bounds: DateOfBirthBounds,
  options: { required?: boolean; minAge?: number; maxAge?: number } = {}
): DobValidationResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return validateDateOfBirth(null, bounds, options);
  }

  const parsed = parseDobDisplay(trimmed);
  if (!parsed) {
    return {
      valid: false,
      message: `Enter a valid date (${DOB_DISPLAY_FORMAT}).`,
    };
  }

  return validateDateOfBirth(parsed, bounds, { ...options, required: true });
}

/** Convert API/profile date values to YYYY-MM-DD without timezone shift. */
export function apiDateToIsoLocal(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (typeof value === "string") {
    const isoMatch = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) return isoMatch[1];
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) return "";
    return formatIsoDateLocal(parsed);
  }
  if (value instanceof Date && !isNaN(value.getTime())) {
    return formatIsoDateLocal(value);
  }
  return "";
}
