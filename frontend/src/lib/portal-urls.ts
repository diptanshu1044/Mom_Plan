const DEFAULT_MOTHER_URL = "http://localhost:3000";
const DEFAULT_PARTNER_URL = "http://localhost:3002";

function normalizeBase(url: string): string {
  return url.replace(/\/$/, "");
}

function joinPath(base: string, path: string): string {
  if (!path) return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getMotherPortalUrl(path = ""): string {
  const base = normalizeBase(
    process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_MOTHER_URL,
  );
  return joinPath(base, path);
}

export function getPartnerPortalUrl(path = ""): string {
  const base = normalizeBase(
    process.env.NEXT_PUBLIC_PARTNER_PORTAL_URL ?? DEFAULT_PARTNER_URL,
  );
  return joinPath(base, path);
}
