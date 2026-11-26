import type { WatchlistQuote } from '../types/chart';
import { DEFAULT_WATCHLIST_SYMBOLS } from './drawingStorage';

export const WATCHLIST_FLAGS_STORAGE_KEY = 'meridian_watchlist_flags_v1';
export const WATCHLIST_FLAGS_V2_STORAGE_KEY = 'meridian_watchlist_flags_v2';
export const CUSTOM_WATCHLISTS_STORAGE_KEY = 'meridian_custom_watchlists_v1';
export const ACTIVE_WATCHLIST_REF_STORAGE_KEY = 'meridian_active_watchlist_v1';
export const WATCHLIST_COLUMN_PREFS_STORAGE_KEY = 'meridian_watchlist_cols_v1';
export const LEGACY_WATCHLIST_STORAGE_KEY = 'meridian_watchlist_v1';

export type FlagColor = 'red' | 'blue' | 'green' | 'orange' | 'purple' | 'cyan' | 'pink';

export const DEFAULT_FLAG_COLOR: FlagColor = 'red';

export interface FlagColorMeta {
  id: FlagColor;
  label: string;
  listName: string;
  hex: string;
}

export const FLAG_COLOR_OPTIONS: readonly FlagColorMeta[] = [
  { id: 'red', label: 'Red', listName: 'Red list', hex: '#f23645' },
  { id: 'blue', label: 'Blue', listName: 'Blue list', hex: '#2962ff' },
  { id: 'green', label: 'Green', listName: 'Green list', hex: '#089981' },
  { id: 'orange', label: 'Orange', listName: 'Orange list', hex: '#ff9800' },
  { id: 'purple', label: 'Purple', listName: 'Purple list', hex: '#9c27b0' },
  { id: 'cyan', label: 'Cyan', listName: 'Cyan list', hex: '#00bcd4' },
  { id: 'pink', label: 'Pink', listName: 'Pink list', hex: '#f06292' },
];

export type WatchlistFlagMap = Record<string, FlagColor>;

export interface CustomWatchlist {
  id: string;
  name: string;
  symbols: string[];
}

export type ActiveWatchlistRef =
  | { kind: 'custom'; id: string }
  | { kind: 'flagged'; color: FlagColor };

export interface WatchlistColumnPrefs {
  showLast: boolean;
  showChange: boolean;
  showChangePct: boolean;
  showVolume: boolean;
  showLogo: boolean;
}

export const DEFAULT_WATCHLIST_COLUMN_PREFS: WatchlistColumnPrefs = {
  showLast: true,
  showChange: true,
  showChangePct: true,
  showVolume: false,
  showLogo: true,
};

export type WatchlistMarketFilter = 'all' | 'idx' | 'us' | 'global';
export type WatchlistSortKey = 'symbol' | 'last' | 'chg' | 'chgPct' | 'volume';
export type WatchlistSortDirection = 'asc' | 'desc';

export interface WatchlistSortState {
  key: WatchlistSortKey | null;
  direction: WatchlistSortDirection;
}

const VALID_FLAG_COLORS = new Set<string>(FLAG_COLOR_OPTIONS.map((c) => c.id));

export function isFlagColor(value: unknown): value is FlagColor {
  return typeof value === 'string' && VALID_FLAG_COLORS.has(value);
}

export function getFlagColorMeta(color: FlagColor): FlagColorMeta {
  return FLAG_COLOR_OPTIONS.find((c) => c.id === color) ?? FLAG_COLOR_OPTIONS[0];
}

export function normalizeSymbol(raw: string): string {
  return raw.trim().toUpperCase();
}

export function classifyWatchlistSymbol(symbol: string): Exclude<WatchlistMarketFilter, 'all'> {
  const upper = symbol.toUpperCase();
  if (upper.endsWith('.JK') || upper === '^JKSE') return 'idx';
  if (upper.includes('-USD') || upper.includes('=X') || upper.includes('=F')) return 'global';
  return 'us';
}

export function setSymbolFlag(
  flagMap: WatchlistFlagMap,
  rawSymbol: string,
  color: FlagColor | null = DEFAULT_FLAG_COLOR
): WatchlistFlagMap {
  const sym = normalizeSymbol(rawSymbol);
  if (!sym) return flagMap;
  if (color === null) {
    if (!(sym in flagMap)) return flagMap;
    const copy = { ...flagMap };
    delete copy[sym];
    return copy;
  }
  if (flagMap[sym] === color) return flagMap;
  return { ...flagMap, [sym]: color };
}

export function toggleSymbolFlag(
  flagMap: WatchlistFlagMap,
  rawSymbol: string,
  defaultColor: FlagColor = DEFAULT_FLAG_COLOR
): WatchlistFlagMap {
  const sym = normalizeSymbol(rawSymbol);
  if (!sym) return flagMap;
  if (sym in flagMap) {
    const copy = { ...flagMap };
    delete copy[sym];
    return copy;
  }
  return { ...flagMap, [sym]: defaultColor };
}

export function unflagAllSymbols(
  flagMap: WatchlistFlagMap,
  onlyColor?: FlagColor
): WatchlistFlagMap {
  if (!onlyColor) return {};
  const next: WatchlistFlagMap = {};
  for (const [sym, col] of Object.entries(flagMap)) {
    if (col !== onlyColor) {
      next[sym] = col;
    }
  }
  return next;
}

export function getSymbolsForFlagColor(
  flagMap: WatchlistFlagMap,
  color: FlagColor
): string[] {
  return Object.entries(flagMap)
    .filter(([, c]) => c === color)
    .map(([sym]) => sym);
}

export function countSymbolsByFlagColor(
  flagMap: WatchlistFlagMap
): Record<FlagColor, number> {
  const counts: Record<FlagColor, number> = {
    red: 0,
    blue: 0,
    green: 0,
    orange: 0,
    purple: 0,
    cyan: 0,
    pink: 0,
  };
  for (const color of Object.values(flagMap)) {
    if (isFlagColor(color)) {
      counts[color] += 1;
    }
  }
  return counts;
}

export function loadWatchlistFlagMap(): WatchlistFlagMap {
  if (typeof window === 'undefined') return {};
  try {
    const v2Raw = window.localStorage.getItem(WATCHLIST_FLAGS_V2_STORAGE_KEY);
    if (v2Raw) {
      const parsed = JSON.parse(v2Raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const result: WatchlistFlagMap = {};
        for (const [key, val] of Object.entries(parsed)) {
          const sym = normalizeSymbol(key);
          if (sym && isFlagColor(val)) {
            result[sym] = val;
          }
        }
        return result;
      }
    }

    // Migrate legacy v1 array of flagged symbols to default red flag
    const v1Raw = window.localStorage.getItem(WATCHLIST_FLAGS_STORAGE_KEY);
    if (v1Raw) {
      const parsed = JSON.parse(v1Raw);
      if (Array.isArray(parsed)) {
        const migrated: WatchlistFlagMap = {};
        for (const item of parsed) {
          if (typeof item === 'string' && item.trim()) {
            migrated[normalizeSymbol(item)] = DEFAULT_FLAG_COLOR;
          }
        }
        saveWatchlistFlagMap(migrated);
        return migrated;
      }
    }
    return {};
  } catch {
    return {};
  }
}

export function saveWatchlistFlagMap(flagMap: WatchlistFlagMap): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(WATCHLIST_FLAGS_V2_STORAGE_KEY, JSON.stringify(flagMap));
  } catch {
    // Ignore storage quota errors
  }
}

export const DEFAULT_WATCHLIST_ID = 'default';

export function createDefaultCustomWatchlists(initialSymbols?: string[]): CustomWatchlist[] {
  return [
    {
      id: DEFAULT_WATCHLIST_ID,
      name: 'Watchlist',
      symbols:
        initialSymbols && initialSymbols.length > 0
          ? [...initialSymbols]
          : [...DEFAULT_WATCHLIST_SYMBOLS],
    },
  ];
}

export function loadCustomWatchlists(): CustomWatchlist[] {
  if (typeof window === 'undefined') return createDefaultCustomWatchlists();
  try {
    const raw = window.localStorage.getItem(CUSTOM_WATCHLISTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const valid = parsed
          .filter(
            (item): item is CustomWatchlist =>
              Boolean(
                item &&
                  typeof item.id === 'string' &&
                  item.id.trim().length > 0 &&
                  typeof item.name === 'string' &&
                  item.name.trim().length > 0 &&
                  Array.isArray(item.symbols)
              )
          )
          .map((item) => ({
            id: item.id,
            name: item.name.trim(),
            symbols: Array.from(
              new Set(
                item.symbols
                  .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
                  .map(normalizeSymbol)
              )
            ),
          }));
        if (valid.length > 0) return valid;
      }
    }

    // Migrate legacy single watchlist if present
    const legacyRaw = window.localStorage.getItem(LEGACY_WATCHLIST_STORAGE_KEY);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      if (Array.isArray(parsed)) {
        const legacySyms = Array.from(
          new Set(
            parsed
              .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
              .map(normalizeSymbol)
          )
        );
        if (legacySyms.length > 0) {
          const migrated = createDefaultCustomWatchlists(legacySyms);
          saveCustomWatchlists(migrated);
          return migrated;
        }
      }
    }
    return createDefaultCustomWatchlists();
  } catch {
    return createDefaultCustomWatchlists();
  }
}

export function saveCustomWatchlists(lists: CustomWatchlist[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CUSTOM_WATCHLISTS_STORAGE_KEY, JSON.stringify(lists));
  } catch {
    // Ignore storage quota errors
  }
}

export function createCustomWatchlist(
  lists: CustomWatchlist[],
  rawName: string,
  initialSymbols: string[] = []
): { lists: CustomWatchlist[]; created: CustomWatchlist } {
  const trimmed = rawName.trim() || `Watchlist ${lists.length + 1}`;
  const slugBase = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'list';
  let id = `${slugBase}-${Date.now().toString(36)}`;
  while (lists.some((l) => l.id === id)) {
    id = `${id}x`;
  }
  const cleanSymbols = Array.from(
    new Set(initialSymbols.map(normalizeSymbol).filter(Boolean))
  );
  const created: CustomWatchlist = {
    id,
    name: trimmed,
    symbols: cleanSymbols,
  };
  return { lists: [...lists, created], created };
}

export function renameCustomWatchlist(
  lists: CustomWatchlist[],
  id: string,
  rawName: string
): CustomWatchlist[] {
  const trimmed = rawName.trim();
  if (!trimmed) return lists;
  return lists.map((list) => (list.id === id ? { ...list, name: trimmed } : list));
}

export function deleteCustomWatchlist(
  lists: CustomWatchlist[],
  id: string
): CustomWatchlist[] {
  if (id === DEFAULT_WATCHLIST_ID || lists.length <= 1) return lists;
  return lists.filter((list) => list.id !== id);
}

export function addSymbolToCustomWatchlist(
  lists: CustomWatchlist[],
  listId: string,
  rawSymbol: string
): CustomWatchlist[] {
  const sym = normalizeSymbol(rawSymbol);
  if (!sym) return lists;
  return lists.map((list) => {
    if (list.id !== listId) return list;
    if (list.symbols.includes(sym)) return list;
    return { ...list, symbols: [sym, ...list.symbols] };
  });
}

export function removeSymbolFromCustomWatchlist(
  lists: CustomWatchlist[],
  listId: string,
  rawSymbol: string
): CustomWatchlist[] {
  const sym = normalizeSymbol(rawSymbol);
  return lists.map((list) => {
    if (list.id !== listId) return list;
    return { ...list, symbols: list.symbols.filter((s) => s !== sym) };
  });
}

export function clearCustomWatchlist(
  lists: CustomWatchlist[],
  listId: string
): CustomWatchlist[] {
  return lists.map((list) => (list.id === listId ? { ...list, symbols: [] } : list));
}

export function reorderCustomWatchlistSymbols(
  lists: CustomWatchlist[],
  listId: string,
  fromSymbol: string,
  toSymbol: string
): CustomWatchlist[] {
  return lists.map((list) => {
    if (list.id !== listId) return list;
    return {
      ...list,
      symbols: reorderWatchlistSymbols(list.symbols, fromSymbol, toSymbol),
    };
  });
}

export function loadActiveWatchlistRef(lists: CustomWatchlist[]): ActiveWatchlistRef {
  const fallback: ActiveWatchlistRef = { kind: 'custom', id: lists[0]?.id ?? 'default' };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(ACTIVE_WATCHLIST_REF_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed?.kind === 'flagged' && isFlagColor(parsed.color)) {
      return { kind: 'flagged', color: parsed.color };
    }
    if (
      parsed?.kind === 'custom' &&
      typeof parsed.id === 'string' &&
      lists.some((l) => l.id === parsed.id)
    ) {
      return { kind: 'custom', id: parsed.id };
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export function saveActiveWatchlistRef(ref: ActiveWatchlistRef): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ACTIVE_WATCHLIST_REF_STORAGE_KEY, JSON.stringify(ref));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadWatchlistColumnPrefs(): WatchlistColumnPrefs {
  if (typeof window === 'undefined') return { ...DEFAULT_WATCHLIST_COLUMN_PREFS };
  try {
    const raw = window.localStorage.getItem(WATCHLIST_COLUMN_PREFS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_WATCHLIST_COLUMN_PREFS };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_WATCHLIST_COLUMN_PREFS };
    }
    return {
      showLast:
        typeof parsed.showLast === 'boolean'
          ? parsed.showLast
          : DEFAULT_WATCHLIST_COLUMN_PREFS.showLast,
      showChange:
        typeof parsed.showChange === 'boolean'
          ? parsed.showChange
          : DEFAULT_WATCHLIST_COLUMN_PREFS.showChange,
      showChangePct:
        typeof parsed.showChangePct === 'boolean'
          ? parsed.showChangePct
          : DEFAULT_WATCHLIST_COLUMN_PREFS.showChangePct,
      showVolume:
        typeof parsed.showVolume === 'boolean'
          ? parsed.showVolume
          : DEFAULT_WATCHLIST_COLUMN_PREFS.showVolume,
      showLogo:
        typeof parsed.showLogo === 'boolean'
          ? parsed.showLogo
          : DEFAULT_WATCHLIST_COLUMN_PREFS.showLogo,
    };
  } catch {
    return { ...DEFAULT_WATCHLIST_COLUMN_PREFS };
  }
}

export function saveWatchlistColumnPrefs(prefs: WatchlistColumnPrefs): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(WATCHLIST_COLUMN_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage quota errors
  }
}

export function resolveActiveListSymbols(
  activeRef: ActiveWatchlistRef,
  lists: CustomWatchlist[],
  flagMap: WatchlistFlagMap
): string[] {
  if (activeRef.kind === 'flagged') {
    return getSymbolsForFlagColor(flagMap, activeRef.color);
  }
  const found = lists.find((l) => l.id === activeRef.id) ?? lists[0];
  return found ? found.symbols : [];
}

export function getActiveListLabel(
  activeRef: ActiveWatchlistRef,
  lists: CustomWatchlist[]
): string {
  if (activeRef.kind === 'flagged') {
    return getFlagColorMeta(activeRef.color).listName;
  }
  const found = lists.find((l) => l.id === activeRef.id) ?? lists[0];
  return found?.name ?? 'Watchlist';
}

export function getAllUniqueWatchedSymbols(
  lists: CustomWatchlist[],
  flagMap: WatchlistFlagMap
): string[] {
  const seen = new Set<string>();
  for (const list of lists) {
    for (const sym of list.symbols) {
      seen.add(sym);
    }
  }
  for (const sym of Object.keys(flagMap)) {
    seen.add(sym);
  }
  return Array.from(seen);
}

export function nextSortState(
  current: WatchlistSortState,
  clickedKey: WatchlistSortKey
): WatchlistSortState {
  if (current.key !== clickedKey) {
    return { key: clickedKey, direction: 'asc' };
  }
  if (current.direction === 'asc') {
    return { key: clickedKey, direction: 'desc' };
  }
  return { key: null, direction: 'asc' };
}

export function sortWatchlistSymbols(
  symbols: string[],
  quotes: Record<string, WatchlistQuote>,
  sort: WatchlistSortState
): string[] {
  if (!sort.key) return symbols;
  const dir = sort.direction === 'asc' ? 1 : -1;

  return [...symbols].sort((a, b) => {
    if (sort.key === 'symbol') {
      return a.localeCompare(b) * dir;
    }
    const qa = quotes[a];
    const qb = quotes[b];
    const getVal = (q?: WatchlistQuote): number => {
      if (!q) return Number.NEGATIVE_INFINITY;
      if (sort.key === 'last') return q.price ?? 0;
      if (sort.key === 'chg') return q.change ?? 0;
      if (sort.key === 'chgPct') return q.changePercent ?? 0;
      return q.volume ?? 0;
    };
    const va = getVal(qa);
    const vb = getVal(qb);
    if (va === vb) return a.localeCompare(b);
    return (va - vb) * dir;
  });
}

export function reorderWatchlistSymbols(
  symbols: string[],
  fromSymbol: string,
  toSymbol: string
): string[] {
  if (fromSymbol === toSymbol) return symbols;
  const fromIdx = symbols.indexOf(fromSymbol);
  const toIdx = symbols.indexOf(toSymbol);
  if (fromIdx === -1 || toIdx === -1) return symbols;
  const copy = [...symbols];
  const [moved] = copy.splice(fromIdx, 1);
  copy.splice(toIdx, 0, moved);
  return copy;
}

export function computeRangeRatio(price: number, low: number, high: number): number {
  if (!Number.isFinite(price) || !Number.isFinite(low) || !Number.isFinite(high)) {
    return 0.5;
  }
  const span = high - low;
  if (span <= 0) return 0.5;
  return Math.max(0, Math.min(1, (price - low) / span));
}

const AVATAR_PALETTE = [
  '#089981',
  '#2962ff',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#10b981',
  '#ef5350',
];

export function getTickerAvatar(symbol: string): { letter: string; color: string; shortDisplay: string } {
  const clean = symbol.replace(/^\^/, '');
  const shortDisplay = clean.replace(/\.JK$|=X$|=F$/i, '').replace(/-USD$/i, '');
  const letter = (shortDisplay[0] || 'S').toUpperCase();
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = (hash * 31 + symbol.charCodeAt(i)) >>> 0;
  }
  return {
    letter,
    color: AVATAR_PALETTE[hash % AVATAR_PALETTE.length],
    shortDisplay: shortDisplay || symbol,
  };
}
