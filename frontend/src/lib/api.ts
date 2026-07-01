import { useAuthStore } from "@/store/auth";

const BASE = "/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { tokens } = useAuthStore.getState();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (tokens?.access) {
    headers["Authorization"] = `Bearer ${tokens.access}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    useAuthStore.getState().logout();
    window.location.href = "/login";
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(error.detail ?? JSON.stringify(error));
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (path: string) => request<void>(path, { method: "DELETE" }),
};
