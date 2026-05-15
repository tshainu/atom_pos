/**
 * Simple in-memory + AsyncStorage cache with TTL.
 * Stale-while-revalidate: returns cached value instantly,
 * lets callers refresh in background.
 */

interface CacheEntry {
  data: any;
  fetchedAt: number; // ms timestamp
}

// In-memory map — lives as long as the JS runtime (app session)
const memCache: Map<string, CacheEntry> = new Map();

// TTL in ms per cache key prefix
const TTL_MAP: { prefix: string; ttl: number }[] = [
  { prefix: "items",            ttl: 5 * 60 * 1000 },   // 5 min  — items change rarely
  { prefix: "categories",       ttl: 5 * 60 * 1000 },   // 5 min
  { prefix: "settings",         ttl: 5 * 60 * 1000 },   // 5 min
  { prefix: "staff",            ttl: 2 * 60 * 1000 },   // 2 min
  { prefix: "reports/summary",  ttl: 30 * 1000 },        // 30 s
  { prefix: "reports/today",    ttl: 30 * 1000 },        // 30 s
  { prefix: "reports/sales-chart", ttl: 30 * 1000 },     // 30 s
  { prefix: "reports/",         ttl: 30 * 1000 },        // 30 s fallback
  { prefix: "sales/recent",     ttl: 15 * 1000 },        // 15 s
  { prefix: "sales/held",       ttl: 15 * 1000 },        // 15 s
];

function getTTL(key: string): number {
  for (const { prefix, ttl } of TTL_MAP) {
    if (key.includes(prefix)) return ttl;
  }
  return 60 * 1000; // default 1 min
}

export function cacheGet(key: string): { data: any; stale: boolean } | null {
  const entry = memCache.get(key);
  if (!entry) return null;
  const age = Date.now() - entry.fetchedAt;
  const stale = age > getTTL(key);
  return { data: entry.data, stale };
}

export function cacheSet(key: string, data: any) {
  memCache.set(key, { data, fetchedAt: Date.now() });
}

export function cacheInvalidate(prefix: string) {
  for (const k of memCache.keys()) {
    if (k.includes(prefix)) memCache.delete(k);
  }
}

export function cacheInvalidateAll() {
  memCache.clear();
}
