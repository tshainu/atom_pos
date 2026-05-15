import { hc } from "hono/client";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { cacheGet, cacheSet } from "./cache";

const rawUrl =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ||
  process.env.EXPO_PUBLIC_API_URL ||
  "https://58c4ipm2bu9el237kqimq-preview-4200.runable.site";

if (__DEV__) console.log("[api] baseUrl resolved to:", rawUrl, "| expoConfig.extra:", Constants.expoConfig?.extra);

const baseUrl = rawUrl.replace(/\/$/, "");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = hc<any>(baseUrl);
export const api = client.api;

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem("token");
}

async function doFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = await getToken();
  const url = `${baseUrl}/api/${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers });
  return res.json();
}

/**
 * Standard fetch — no cache. Use for mutations (POST/PUT/DELETE).
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  return doFetch(path, options);
}

/**
 * Cached GET fetch — stale-while-revalidate.
 * - Returns cached data instantly if available (even if stale)
 * - Fires background refresh if stale or missing
 * - Calls onUpdate(newData) when background refresh completes
 *
 * Usage:
 *   cachedFetch("items?shopId=1", {}, (fresh) => setItems(fresh.items))
 */
export function cachedFetch(
  path: string,
  onUpdate: (data: any) => void,
  options: RequestInit = {},
): any | null {
  const cached = cacheGet(path);

  // Fire background refresh (always if stale, or if no cache)
  const refresh = () => {
    doFetch(path, options)
      .then((data) => {
        if (data && !data.error) {
          cacheSet(path, data);
          onUpdate(data);
        }
      })
      .catch(() => {}); // silently fail — user already has cached data
  };

  if (!cached) {
    // No cache — fire fetch and return null (caller shows skeleton)
    refresh();
    return null;
  }

  if (cached.stale) {
    // Has cached data — return it immediately, refresh in background
    refresh();
  }

  return cached.data;
}

/**
 * Async version — awaits fresh data on first load, returns cache instantly after.
 * Use in useEffect when you need async/await pattern but still want instant cache.
 */
export async function cachedFetchAsync(path: string, options: RequestInit = {}): Promise<any> {
  const cached = cacheGet(path);

  if (cached && !cached.stale) {
    // Fresh cache — return immediately
    return cached.data;
  }

  if (cached && cached.stale) {
    // Stale — return cached NOW, kick off background refresh
    doFetch(path, options)
      .then((data) => { if (data && !data.error) cacheSet(path, data); })
      .catch(() => {});
    return cached.data;
  }

  // No cache — must await
  const data = await doFetch(path, options);
  if (data && !data.error) cacheSet(path, data);
  return data;
}
