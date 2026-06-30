import { useEffect, useState } from 'react';

export type NavCounts = Record<string, number>;

const CACHE_KEY = 'nav_counts';
const CACHE_TTL = 60_000;

interface CacheEntry { counts: NavCounts; ts: number }

const ENDPOINTS: Record<string, string> = {
  'org-domain':   'https://functions.poehali.dev/5f3f729b-229c-4030-a076-3c99047514cb',
  'tech-domain':  'https://functions.poehali.dev/9fa81744-e3d1-4877-aad6-fe08b57027cd',
  'technologies': 'https://functions.poehali.dev/b63791b9-6309-4098-aec2-6847a4871e31',
  'requirements': 'https://functions.poehali.dev/14afbc19-4fdc-4803-b634-10174f2a44dd',
  'solutions':    'https://functions.poehali.dev/52d789a0-323c-4a86-b298-c509d0e606f7',
  'hardening':    'https://functions.poehali.dev/c7ab52b7-af0c-44db-9d2e-3ee901e15e55',
  'templates':    'https://functions.poehali.dev/20c2f5e5-2e8b-40fa-8ffb-e978290332d7',
};

function readCache(): NavCounts | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.ts > CACHE_TTL) return null;
    // Не возвращать кеш если все значения 0 (были ошибки при загрузке)
    const vals = Object.values(entry.counts);
    if (vals.length > 0 && vals.every((v) => v === 0)) return null;
    return entry.counts;
  } catch {
    return null;
  }
}

function writeCache(counts: NavCounts) {
  try {
    const entry: CacheEntry = { counts, ts: Date.now() };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch { /* */ }
}

function clearCache() {
  try { sessionStorage.removeItem(CACHE_KEY); } catch { /* */ }
}

export function useNavCounts(): NavCounts {
  const [counts, setCounts] = useState<NavCounts>(() => readCache() ?? {});

  useEffect(() => {
    if (readCache()) return;

    let cancelled = false;
    const entries = Object.entries(ENDPOINTS);

    Promise.all(
      entries.map(([key, url]) =>
        fetch(url, { signal: AbortSignal.timeout(8000) })
          .then((r) => {
            if (!r.ok) return [key, null] as const;
            return r.json().then((data: unknown) => [key, Array.isArray(data) ? data.length : null] as const);
          })
          .catch(() => [key, null] as const),
      ),
    ).then((results) => {
      if (cancelled) return;

      const next: NavCounts = {};
      let anySuccess = false;

      for (const [key, count] of results) {
        if (count !== null) {
          next[key] = count;
          anySuccess = true;
        }
      }

      if (!anySuccess) {
        // Все запросы упали — не кешировать, попробуем снова при следующем рендере
        clearCache();
        return;
      }

      writeCache(next);
      setCounts(next);
    });

    return () => { cancelled = true; };
  }, []);

  return counts;
}