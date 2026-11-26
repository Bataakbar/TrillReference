import type { SerializedOverlay } from '../types/chart';
import {
  createDefaultIndicators,
  createDefaultVolumeMaSlots,
  type IndicatorInstance,
} from '../indicators/indicatorModel';

const DRAWINGS_KEY_PREFIX = 'meridian_drawings_v1_';
const WATCHLIST_KEY = 'meridian_watchlist_v1';
const INDICATORS_KEY = 'meridian_indicators_v2';

export const DEFAULT_WATCHLIST_SYMBOLS: readonly string[] = [
  'BBCA.JK',
  'BBRI.JK',
  'BMRI.JK',
  'TLKM.JK',
  '^JKSE',
  'AAPL',
  'NVDA',
  'MSFT',
  '^GSPC',
  'BTC-USD',
  'ETH-USD',
  'GC=F',
  'USDIDR=X',
];

export interface RawOverlayLike {
  name?: unknown;
  points?: Array<{ timestamp?: unknown; dataIndex?: unknown; value?: unknown }>;
  extendData?: unknown;
  style?: { color?: unknown; size?: unknown; lineStyle?: unknown } | null;
  styles?: {
    line?: { color?: unknown; size?: unknown; style?: unknown; dashedValue?: unknown } | null;
  } | null;
}

function extractOverlayStyle(ov: RawOverlayLike): SerializedOverlay['style'] {
  if (
    ov.style &&
    typeof ov.style.color === 'string' &&
    typeof ov.style.size === 'number' &&
    (ov.style.lineStyle === 'solid' ||
      ov.style.lineStyle === 'dashed' ||
      ov.style.lineStyle === 'dotted')
  ) {
    return {
      color: ov.style.color,
      size: ov.style.size,
      lineStyle: ov.style.lineStyle,
    };
  }

  const line = ov.styles?.line;
  if (line && typeof line.color === 'string') {
    const size = typeof line.size === 'number' && Number.isFinite(line.size) ? line.size : 1.5;
    let lineStyle: 'solid' | 'dashed' | 'dotted' = 'solid';
    if (line.style === 'dashed') {
      const firstDash = Array.isArray(line.dashedValue) ? Number(line.dashedValue[0]) : 6;
      lineStyle = firstDash <= 3 ? 'dotted' : 'dashed';
    }
    return { color: line.color, size, lineStyle };
  }

  return undefined;
}

export function serializeOverlays(overlays: RawOverlayLike[]): SerializedOverlay[] {
  const result: SerializedOverlay[] = [];
  for (const ov of overlays) {
    if (typeof ov?.name !== 'string' || !ov.name) continue;
    if (!Array.isArray(ov.points) || ov.points.length === 0) continue;

    const validPoints = ov.points
      .filter(
        (pt) =>
          pt &&
          (typeof pt.timestamp === 'number' ||
            typeof pt.dataIndex === 'number' ||
            typeof pt.value === 'number')
      )
      .map((pt) => ({
        ...(typeof pt.timestamp === 'number' ? { timestamp: pt.timestamp } : {}),
        ...(typeof pt.dataIndex === 'number' && typeof pt.timestamp !== 'number'
          ? { dataIndex: pt.dataIndex }
          : {}),
        ...(typeof pt.value === 'number' ? { value: pt.value } : {}),
      }));

    if (validPoints.length === 0) continue;
    const style = extractOverlayStyle(ov);

    result.push({
      name: ov.name,
      points: validPoints,
      ...(ov.extendData !== undefined ? { extendData: ov.extendData } : {}),
      ...(style ? { style } : {}),
    });
  }
  return result;
}

export function parseSerializedOverlays(raw: string | null): SerializedOverlay[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return serializeOverlays(parsed as RawOverlayLike[]);
  } catch {
    return [];
  }
}

export function loadSymbolDrawings(symbol: string): SerializedOverlay[] {
  try {
    const raw = window.localStorage.getItem(`${DRAWINGS_KEY_PREFIX}${symbol.toUpperCase()}`);
    return parseSerializedOverlays(raw);
  } catch {
    return [];
  }
}

export function saveSymbolDrawings(symbol: string, overlays: RawOverlayLike[]): void {
  try {
    const serialized = serializeOverlays(overlays);
    const key = `${DRAWINGS_KEY_PREFIX}${symbol.toUpperCase()}`;
    if (serialized.length === 0) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(serialized));
    }
  } catch {
    // Ignore quota or storage restriction errors silently
  }
}

export function loadWatchlistSymbols(): string[] {
  try {
    const raw = window.localStorage.getItem(WATCHLIST_KEY);
    if (!raw) return [...DEFAULT_WATCHLIST_SYMBOLS];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [...DEFAULT_WATCHLIST_SYMBOLS];
    }
    const valid = parsed.filter((s): s is string => typeof s === 'string' && s.trim().length > 0);
    return valid.length > 0 ? valid : [...DEFAULT_WATCHLIST_SYMBOLS];
  } catch {
    return [...DEFAULT_WATCHLIST_SYMBOLS];
  }
}

export function saveWatchlistSymbols(symbols: string[]): void {
  try {
    window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify(symbols));
  } catch {
    // Ignore storage errors
  }
}

export function loadIndicatorConfigs(): IndicatorInstance[] {
  try {
    const raw = window.localStorage.getItem(INDICATORS_KEY);
    if (!raw) return createDefaultIndicators();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return createDefaultIndicators();
    }
    const valid = parsed
      .filter(
        (item): item is IndicatorInstance =>
          Boolean(
            item &&
              typeof item.id === 'string' &&
              typeof item.kind === 'string' &&
              Array.isArray(item.params) &&
              Array.isArray(item.plots)
          )
      )
      .map((item) => {
        // Normalize VOL to multi-line slots (MA50 enabled by default; preserving any single customized MA1)
        if (item.kind === 'VOL' && (!Array.isArray(item.slots) || item.slots.length === 0)) {
          const isLegacyDefault =
            item.params.length === 3 &&
            item.params[0] === 5 &&
            item.params[1] === 10 &&
            item.params[2] === 20;
          const slots = createDefaultVolumeMaSlots();
          const firstPlot = item.plots[0];
          if (!isLegacyDefault && typeof item.params[0] === 'number' && item.params[0] > 0) {
            slots[0].length = item.params[0];
          }
          if (!isLegacyDefault && firstPlot) {
            slots[0].color = firstPlot.color;
            slots[0].lineWidth = firstPlot.lineWidth;
            slots[0].lineStyle = firstPlot.lineStyle;
            slots[0].plotType = firstPlot.smooth ? 'smooth' : 'line';
          }
          return {
            ...item,
            slots,
            params: slots.map((s) => s.length),
            plots: slots.map((s) => ({
              key: s.key,
              label: s.label,
              color: s.color,
              lineWidth: s.lineWidth,
              lineStyle: s.lineStyle,
              smooth: s.plotType === 'smooth',
            })),
          };
        }
        return item;
      });
    return valid.length > 0 ? valid : createDefaultIndicators();
  } catch {
    return createDefaultIndicators();
  }
}

export function saveIndicatorConfigs(indicators: IndicatorInstance[]): void {
  try {
    window.localStorage.setItem(INDICATORS_KEY, JSON.stringify(indicators));
  } catch {
    // Ignore storage errors
  }
}

export function formatCompactVolume(vol: number): string {
  if (!Number.isFinite(vol) || vol <= 0) return '—';
  if (vol >= 1_000_000_000) return `${(vol / 1_000_000_000).toFixed(2)}B`;
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(2)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(1)}K`;
  return Math.round(vol).toString();
}
