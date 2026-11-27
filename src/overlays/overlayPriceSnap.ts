import { isIdxSymbol, snapToIdxTick } from '../../shared/timeframes';
import type { ThemeMode } from '../types/chart';

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

function parseHexRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.trim().replace(/^#/, '');
  const full =
    clean.length === 3
      ? `${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`
      : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

/**
 * Chooses `#131722` or `#ffffff` text contrast for a colored Y-axis price pill.
 */
export function pickContrastTextColor(bgHex: string): string {
  const rgb = parseHexRgb(bgHex);
  if (!rgb) return '#ffffff';
  const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
  return luminance > 165 ? '#131722' : '#ffffff';
}

/**
 * Returns true if a hex color is near-white (needs a subtle pill outline when
 * rendered over a light-theme price scale).
 */
export function isLightColorHex(hex: string): boolean {
  const rgb = parseHexRgb(hex);
  if (!rgb) return false;
  return rgb.r >= 235 && rgb.g >= 235 && rgb.b >= 235;
}

/**
 * Infers chart theme ('dark' | 'light') from KLineChart styles object without
 * depending on DOM/React state inside overlay callbacks.
 */
export function detectChartThemeFromStyles(styles: unknown): ThemeMode {
  if (!styles || typeof styles !== 'object') return 'dark';
  const s = styles as {
    overlay?: { line?: { color?: unknown } };
    yAxis?: { tickText?: { color?: unknown } };
    grid?: { horizontal?: { color?: unknown } };
  };
  const overlayColor = typeof s.overlay?.line?.color === 'string' ? s.overlay.line.color : '';
  if (overlayColor) {
    const rgb = parseHexRgb(overlayColor);
    if (rgb) {
      const lum = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
      return lum < 128 ? 'light' : 'dark';
    }
  }
  const tickColor = typeof s.yAxis?.tickText?.color === 'string' ? s.yAxis.tickText.color : '';
  if (tickColor.toLowerCase() === '#64748b') return 'light';
  const gridColor = typeof s.grid?.horizontal?.color === 'string' ? s.grid.horizontal.color : '';
  if (gridColor) {
    const rgb = parseHexRgb(gridColor);
    if (rgb) {
      const lum = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
      return lum > 160 ? 'light' : 'dark';
    }
  }
  return 'dark';
}

/**
 * Adapts monochrome default drawing ink (`#ffffff` <-> `#1e293b`) to the active
 * chart theme so lines and Y-axis pills never vanish white-on-white in Light
 * mode or dark-on-dark in Dark mode, while preserving all explicit colors.
 */
export function resolveThemeAwareOverlayColor(
  rawColor: string | undefined,
  theme: ThemeMode
): string {
  const defaultInk = theme === 'light' ? '#1E293B' : '#FFFFFF';
  if (!rawColor || typeof rawColor !== 'string') return defaultInk;
  const normalized = rawColor.trim().toUpperCase();
  if (theme === 'light' && (normalized === '#FFFFFF' || normalized === '#FFF')) {
    return '#1E293B';
  }
  if (
    theme === 'dark' &&
    (normalized === '#1E293B' || normalized === '#131722' || normalized === '#0F172A')
  ) {
    return '#FFFFFF';
  }
  return rawColor;
}

export interface YAxisPillFigure {
  type: 'text';
  ignoreEvent: true;
  attrs: {
    x: number;
    y: number;
    text: string;
    align: 'left' | 'right';
    baseline: 'middle';
  };
  styles: {
    style: 'fill' | 'stroke_fill';
    color: string;
    backgroundColor: string;
    borderColor?: string;
    borderSize?: number;
    paddingLeft: number;
    paddingRight: number;
    paddingTop: number;
    paddingBottom: number;
    borderRadius: number;
    size: number;
    weight: string;
    family: string;
  };
}

/**
 * Builds a TradingView-style Y-axis price pill flush to the inside edge of
 * the 1px vertical axis divider (`x = 1` when `isFromZero`), never crossing
 * or erasing the border line, with text aligned to KLineChart's `x = 8px` tick column.
 */
export function buildTradingViewYAxisPill(options: {
  boundingWidth: number;
  boundingHeight?: number;
  isFromZero: boolean;
  y: number;
  text: string;
  color: string;
}): YAxisPillFigure | null {
  const { boundingWidth, boundingHeight, isFromZero, y, text, color } = options;
  if (!Number.isFinite(y) || !text) return null;
  if (
    typeof boundingHeight === 'number' &&
    Number.isFinite(boundingHeight) &&
    (y < -1 || y > boundingHeight + 1)
  ) {
    return null;
  }
  const needsBorder = isLightColorHex(color);
  return {
    type: 'text',
    ignoreEvent: true,
    attrs: {
      x: isFromZero ? 1 : boundingWidth - 1,
      y,
      text,
      align: isFromZero ? 'left' : 'right',
      baseline: 'middle',
    },
    styles: {
      style: needsBorder ? 'stroke_fill' : 'fill',
      color: pickContrastTextColor(color),
      backgroundColor: color,
      ...(needsBorder ? { borderColor: 'rgba(15, 23, 42, 0.28)', borderSize: 1 } : {}),
      paddingLeft: 7,
      paddingRight: 6,
      paddingTop: 3,
      paddingBottom: 3,
      borderRadius: 2,
      size: 11,
      weight: '500',
      family: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
    },
  };
}

/**
 * Prevents vertical pill collision inside multi-tag overlays (e.g., Long/Short Position)
 * by gently nudging adjacent pills apart while staying inside `[minY, maxY]`.
 */
export function resolveNonOverlappingYPositions(
  entries: ReadonlyArray<{ y: number; priority: number }>,
  boundingHeight: number,
  minSpacing = 18
): number[] {
  if (entries.length === 0) return [];
  const halfPill = minSpacing / 2;
  const minY = halfPill;
  const maxY = Math.max(halfPill, boundingHeight - halfPill);

  const indexed = entries.map((e, idx) => ({
    idx,
    y: Math.max(minY, Math.min(maxY, e.y)),
    priority: e.priority,
  }));
  indexed.sort((a, b) => (a.y !== b.y ? a.y - b.y : a.priority - b.priority));

  for (let i = 1; i < indexed.length; i++) {
    const prev = indexed[i - 1];
    const curr = indexed[i];
    if (curr.y - prev.y < minSpacing) {
      curr.y = Math.min(maxY, prev.y + minSpacing);
    }
  }
  for (let i = indexed.length - 2; i >= 0; i--) {
    const curr = indexed[i];
    const next = indexed[i + 1];
    if (next.y - curr.y < minSpacing) {
      curr.y = Math.max(minY, next.y - minSpacing);
    }
  }

  const out = new Array<number>(entries.length);
  for (const item of indexed) {
    out[item.idx] = item.y;
  }
  return out;
}
