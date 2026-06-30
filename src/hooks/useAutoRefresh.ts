import { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY_PREFIX = 'auto_refresh_interval:';
const DEFAULT_INTERVAL = 0;

export const REFRESH_OPTIONS = [
  { value: 0, label: 'Выкл' },
  { value: 30, label: '30 сек' },
  { value: 60, label: '1 мин' },
  { value: 300, label: '5 мин' },
  { value: 600, label: '10 мин' },
];

function loadInterval(section: string): number {
  const raw = localStorage.getItem(STORAGE_KEY_PREFIX + section);
  if (raw === null) return DEFAULT_INTERVAL;
  const val = parseInt(raw, 10);
  return isNaN(val) ? DEFAULT_INTERVAL : val;
}

export function useAutoRefresh(
  section: string,
  onRefresh: () => void,
): {
  intervalSeconds: number;
  setIntervalSeconds: (v: number) => void;
} {
  const [intervalSeconds, setIntervalSecondsState] = useState<number>(() =>
    loadInterval(section),
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const setIntervalSeconds = useCallback(
    (v: number) => {
      localStorage.setItem(STORAGE_KEY_PREFIX + section, String(v));
      setIntervalSecondsState(v);
    },
    [section],
  );

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (intervalSeconds <= 0) return;
    intervalRef.current = setInterval(() => {
      onRefreshRef.current();
    }, intervalSeconds * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [intervalSeconds]);

  return { intervalSeconds, setIntervalSeconds };
}
