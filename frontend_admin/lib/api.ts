import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

/** Strip trailing slashes so `${base}/api/...` never becomes `//api/...`. */
function normalizeApiBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

const API_URL = normalizeApiBaseUrl(
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
);

function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_URL}${normalizedPath}`;
}

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.__momplan_admin_access_token__ ?? null;
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type RefreshResult =
  | { status: "success"; accessToken: string }
  | { status: "unauthorized" }
  | { status: "error" };

let refreshPromise: Promise<RefreshResult> | null = null;

function isAuthRefreshRequest(config?: InternalAxiosRequestConfig): boolean {
  const url = config?.url ?? "";
  return url.includes("/api/auth/refresh");
}

export async function refreshAccessToken(): Promise<RefreshResult> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await axios.post(
        apiUrl("/api/auth/refresh"),
        {},
        { withCredentials: true }
      );
      const { accessToken } = response.data.data;
      setInMemoryToken(accessToken);
      return { status: "success", accessToken };
    } catch (error) {
      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        return { status: "unauthorized" };
      }
      return { status: "error" };
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (!originalRequest || error.response?.status !== 401 || isAuthRefreshRequest(originalRequest)) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    const refreshed = await refreshAccessToken();

    if (refreshed.status !== "success") {
      return Promise.reject(error);
    }

    originalRequest.headers.Authorization = `Bearer ${refreshed.accessToken}`;
    return api(originalRequest);
  }
);

export function setInMemoryToken(token: string) {
  if (typeof window !== "undefined") {
    window.__momplan_admin_access_token__ = token;
  }
}

export function clearInMemoryToken() {
  if (typeof window !== "undefined") {
    window.__momplan_admin_access_token__ = undefined;
  }
}

declare global {
  interface Window {
    __momplan_admin_access_token__?: string;
  }
}
