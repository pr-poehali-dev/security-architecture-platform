import { useEffect, useState } from 'react';

export type NavCounts = Record<string, number>;

const CACHE_KEY = 'nav_counts';
const CACHE_TTL = 60_000; // 60 секунд

interface CacheEntry { counts: NavCounts; ts: number }

const ENDPOINTS: Record<string, string> = {
  'org-domain':    'https://functions.poehali.dev/5f3f729b-229c-4030-a076-3c99047514cb',
  'tech-domain':   'https://functions.poehali.dev/9fa81744-e3d1-4877-aad6-fe08b57027cd',
  'technologies':  'https://functions.poehali.dev/b63791b9-6309-4098-aec2-6847a4871e31',
  'requirements':  'https://functions.poehali.dev/14afbc19-4fdc-4803-b634-10174f2a44dd',
  'solutions':     'https://functions.poehali.dev/52d789a0-323c-4a86-b298-c509d0e606f7',
  'hardening':     'https://functions.poehali.dev/c7ab52b7-af0c-44db-9d2e-3ee901e15e55',
};

function readCache(): NavCounts | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.ts > CACHE_TTL) return null;
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

export function useNavCounts(): NavCounts {
  const [counts, setCounts] = useState<NavCounts>(() => readCache() ?? {});

  useEffect(() => {
    if (readCache()) return;

    let cancelled = false;
    const entries = Object.entries(ENDPOINTS);

    Promise.all(
      entries.map(([key, url]) =>
        fetch(url)
          .then((r) => r.ok ? r.json() : [])
          .then((data: unknown[]) => [key, Array.isArray(data) ? data.length : 0] as const)
          .catch(() => [key, 0] as const),
      ),
    ).then((results) => {
      if (cancelled) return;
      const next: NavCounts = {};
      for (const [key, count] of results) next[key] = count;
      writeCache(next);
      setCounts(next);
    });

    return () => { cancelled = true; };
  }, []);

  return counts;
}
