import { isIdxSymbol, snapToIdxTick } from '../../shared/timeframes';

let activeDrawingSymbol = '';

export function setActiveDrawingSymbol(symbol: string): void {
  activeDrawingSymbol = symbol.trim();
}

export function getActiveDrawingSymbol(): string {
  return activeDrawingSymbol;
}

/**
 * Snaps an overlay price coordinate to the active market's legal tick ladder
 * (BEI fraksi harga for `.JK` tickers) when drawn on the main candle pane.
 */
export function snapOverlayPriceForSymbol(
  symbol: string | null | undefined,
  value: number,
  isCandlePane = true
): number {
  if (!Number.isFinite(value)) return value;
  if (!isCandlePane || !isIdxSymbol(symbol ?? '')) return value;
  return snapToIdxTick(value);
}

/**
 * Formats an overlay price badge cleanly according to symbol tick rules
 * (integer Rupiah with thousands separator for IDX, fixed decimals elsewhere).
 */
export function formatOverlayPriceForSymbol(
  symbol: string | null | undefined,
  value: number,
  precision = 2,
  isCandlePane = true
): string {
  if (!Number.isFinite(value)) return '';
  const snapped = snapOverlayPriceForSymbol(symbol, value, isCandlePane);
  if (isCandlePane && isIdxSymbol(symbol ?? '')) {
    return Math.round(snapped).toLocaleString('en-US');
  }
  const safePrec = Math.max(0, Math.min(6, precision));
  return snapped.toLocaleString('en-US', {
    minimumFractionDigits: safePrec,
    maximumFractionDigits: safePrec,
  });
}

/**
 * Normalizes an array of overlay points by snapping numeric `value` coordinates
 * to valid IDX tick increments for `.JK` symbols.
 */
export function snapOverlayPointsForSymbol<T extends { value?: number }>(
  symbol: string | null | undefined,
  points: ReadonlyArray<T>,
  isCandlePane = true
): T[] {
  if (!isCandlePane || !isIdxSymbol(symbol ?? '')) {
    return points.map((pt) => ({ ...pt }));
  }
  return points.map((pt) =>
    typeof pt.value === 'number' && Number.isFinite(pt.value)
      ? { ...pt, value: snapToIdxTick(pt.value) }
      : { ...pt }
  );
}

/**
 * Chooses `#131722` or `#ffffff` text contrast for a colored Y-axis price pill.
 */
export function pickContrastTextColor(bgHex: string): string {
  const clean = bgHex.trim().replace(/^#/, '');
  const full =
    clean.length === 3
      ? `${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`
      : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return '#ffffff';
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 165 ? '#131722' : '#ffffff';
}
