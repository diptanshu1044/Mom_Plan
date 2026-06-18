export const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "DC", label: "District of Columbia" },
  { value: "WY", label: "Wyoming" },
] as const;

export const STATE_LABEL_BY_CODE = Object.fromEntries(
  US_STATES.map((state) => [state.value, state.label])
) as Record<string, string>;

const STATE_CODE_BY_LABEL = Object.fromEntries(
  US_STATES.map((state) => [state.label.toUpperCase(), state.value])
) as Record<string, string>;

export function resolveStateCode(input: string | null | undefined): string | undefined {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return undefined;

  const upper = trimmed.toUpperCase();
  if (STATE_LABEL_BY_CODE[upper]) return upper;
  return STATE_CODE_BY_LABEL[upper];
}

/** Normalize API payloads that may be string codes or legacy { code } objects. */
export function normalizeStateCodesFromApi(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  const codes = raw
    .map((item) => {
      if (typeof item === "string") return resolveStateCode(item);
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        const code = record.code ?? record.value ?? record.state;
        if (typeof code === "string") return resolveStateCode(code);
      }
      return undefined;
    })
    .filter((code): code is string => Boolean(code));

  return [...new Set(codes)].sort();
}

export function mergeStateCodes(...groups: string[][]): string[] {
  return [...new Set(groups.flat().map((code) => resolveStateCode(code)).filter(Boolean) as string[])].sort();
}

/** Map API state codes to labeled options for select dropdowns. */
export function filterStatesByCodes(codes: readonly string[]) {
  const normalized = [
    ...new Set(
      codes.map((code) => resolveStateCode(code)).filter(Boolean) as string[]
    ),
  ].sort();

  const known = US_STATES.filter((state) => normalized.includes(state.value));
  const knownValues = new Set<string>(known.map((state) => state.value));
  const extras = normalized
    .filter((code) => !knownValues.has(code))
    .map((code) => ({ value: code, label: code }));

  return [...known, ...extras];
}
