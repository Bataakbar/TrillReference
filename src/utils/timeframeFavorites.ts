import { TIMEFRAMES, getTimeframeByKey } from '../../shared/timeframes';

export const FAVORITE_TIMEFRAMES_STORAGE_KEY = 'meridian_favorite_timeframes_v1';
export const MAX_FAVORITE_TIMEFRAMES = 8;

export const DEFAULT_FAVORITE_TIMEFRAMES: readonly string[] = TIMEFRAMES.filter(
  (tf) => tf.quickBar
).map((tf) => tf.key);

const CANONICAL_ORDER = new Map<string, number>(
  TIMEFRAMES.map((tf, index) => [tf.key, index])
);

export function normalizeFavoriteTimeframes(rawKeys: unknown): string[] {
  if (!Array.isArray(rawKeys)) {
    return [...DEFAULT_FAVORITE_TIMEFRAMES];
  }

  const seen = new Set<string>();
  const valid: string[] = [];

  for (const item of rawKeys) {
    if (typeof item !== 'string') continue;
    const tf = getTimeframeByKey(item);
    if (!tf || seen.has(tf.key)) continue;
    seen.add(tf.key);
    valid.push(tf.key);
  }

  valid.sort((a, b) => (CANONICAL_ORDER.get(a) ?? 999) - (CANONICAL_ORDER.get(b) ?? 999));
  return valid.slice(0, MAX_FAVORITE_TIMEFRAMES);
}

export function loadFavoriteTimeframes(): string[] {
  if (typeof window === 'undefined') {
    return [...DEFAULT_FAVORITE_TIMEFRAMES];
  }
  try {
    const raw = window.localStorage.getItem(FAVORITE_TIMEFRAMES_STORAGE_KEY);
    if (raw === null) {
      return [...DEFAULT_FAVORITE_TIMEFRAMES];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [...DEFAULT_FAVORITE_TIMEFRAMES];
    }
    return normalizeFavoriteTimeframes(parsed);
  } catch {
    return [...DEFAULT_FAVORITE_TIMEFRAMES];
  }
}

export function saveFavoriteTimeframes(keys: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      FAVORITE_TIMEFRAMES_STORAGE_KEY,
      JSON.stringify(normalizeFavoriteTimeframes(keys))
    );
  } catch {
    // Ignore storage quota errors
  }
}

export interface ToggleFavoriteResult {
  nextFavorites: string[];
  added: boolean;
  limitExceeded: boolean;
}

export function toggleFavoriteTimeframe(
  currentFavorites: string[],
  targetKey: string
): ToggleFavoriteResult {
  const tf = getTimeframeByKey(targetKey);
  if (!tf) {
    return {
      nextFavorites: currentFavorites,
      added: false,
      limitExceeded: false,
    };
  }

  const normalized = normalizeFavoriteTimeframes(currentFavorites);
  if (normalized.includes(tf.key)) {
    return {
      nextFavorites: normalized.filter((k) => k !== tf.key),
      added: false,
      limitExceeded: false,
    };
  }

  if (normalized.length >= MAX_FAVORITE_TIMEFRAMES) {
    return {
      nextFavorites: normalized,
      added: false,
      limitExceeded: true,
    };
  }

  const nextFavorites = normalizeFavoriteTimeframes([...normalized, tf.key]);
  return {
    nextFavorites,
    added: true,
    limitExceeded: false,
  };
}
