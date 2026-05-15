// On web, point to the API server (Vite/Hono backend)
const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "https://58c4ipm2bu9el237kqimq-preview-4200.runable.site";

export const api = {};

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");
  const url = `${BASE_URL}/api/${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers });
  return res.json();
}

// Web stubs — same interface as native, no caching needed (web has its own browser cache)
export function cachedFetch(
  path: string,
  onUpdate: (data: any) => void,
  options: RequestInit = {},
): any | null {
  apiFetch(path, options).then((data) => {
    if (data && !data.error) onUpdate(data);
  });
  return null;
}

export async function cachedFetchAsync(path: string, options: RequestInit = {}): Promise<any> {
  return apiFetch(path, options);
}
