import { useCallback, useEffect, useRef } from 'react';

/**
 * Кешируем черновик формы в sessionStorage.
 * При обновлении страницы данные восстанавливаются.
 * После успешного сохранения вызываем clear().
 *
 * @param key     — уникальный ключ (например 'form:technology:tech-1')
 * @param value   — текущее значение формы
 * @param onLoad  — вызывается один раз с сохранённым черновиком (если есть)
 */
export function useFormCache<T>(
  key: string,
  value: T,
  onLoad: (cached: T) => void,
): { clear: () => void; isDirty: boolean } {
  const loadedRef = useRef(false);
  const savedRef = useRef<string>('');

  // Восстанавливаем черновик один раз при монтировании
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as T;
        onLoad(parsed);
      }
    } catch {
      // игнорируем битые данные
    }
  // onLoad намеренно не в deps — вызываем только при монтировании
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Сохраняем при каждом изменении формы (дебаунс 400 мс)
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const serialized = JSON.stringify(value);
      if (serialized === savedRef.current) return;
      savedRef.current = serialized;
      try {
        sessionStorage.setItem(key, serialized);
      } catch {
        // sessionStorage может быть недоступен
      }
    }, 400);
    return () => clearTimeout(timerRef.current);
  }, [key, value]);

  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(key);
      savedRef.current = '';
    } catch {/* */}
  }, [key]);

  // isDirty — есть ли сохранённый черновик
  const isDirty = (() => {
    try { return Boolean(sessionStorage.getItem(key)); } catch { return false; }
  })();

  return { clear, isDirty };
}
