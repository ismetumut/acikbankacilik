/**
 * Thin fetch client for the Akort backend API.
 *
 * When `VITE_API_URL` is set (dev, or a deployment with a backend), the app runs
 * against the real server with JWT auth. When it's absent (e.g. the static
 * Netlify demo), `API_ENABLED` is false and the app falls back to the in-browser
 * demo provider — so the product keeps working with zero backend.
 */
const API_URL = import.meta.env.VITE_API_URL as string | undefined;
export const API_ENABLED = Boolean(API_URL);

const TOKEN_KEY = "akort.token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type QueryValue = string | number | boolean | undefined;

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, QueryValue>;
}

function buildQuery(query?: Record<string, QueryValue>): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}${buildQuery(opts.query)}`, {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 401) {
    clearToken();
    window.dispatchEvent(new Event("akort:unauthorized"));
    throw new ApiError(401, "Oturum sonlandı. Lütfen tekrar giriş yapın.");
  }
  if (!res.ok) {
    const detail = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(res.status, detail.error ?? "İstek başarısız oldu.");
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
