const DEFAULT_MOTHER_URL = "http://localhost:3000";

function normalizeBase(url: string): string {
  return url.replace(/\/$/, "");
}

function joinPath(base: string, path: string): string {
  if (!path) return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getMotherPortalUrl(path = ""): string {
  const base = normalizeBase(
    process.env.NEXT_PUBLIC_MOTHER_PORTAL_URL ?? DEFAULT_MOTHER_URL,
  );
  return joinPath(base, path);
}
