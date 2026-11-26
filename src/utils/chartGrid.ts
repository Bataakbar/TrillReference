import { deduplicateIdxAxisTicks, snapToIdxTick } from '../../shared/timeframes';

export interface AxisTickLike {
  coord: number;
  value: number | string;
  text: string;
}

export const TV_DARK_GRID_COLOR = 'rgba(224, 229, 240, 0.115)';
export const TV_LIGHT_GRID_COLOR = 'rgba(15, 23, 42, 0.11)';
export const TV_DEFAULT_GRID_WIDTH_PX = 52;
export const TV_DEFAULT_GRID_HEIGHT_PX = 50;
const MIN_Y_LABEL_GAP_PX = 32;

function clampCoordRange(ticks: AxisTickLike[], maxCoord: number): AxisTickLike[] {
  const deduped: AxisTickLike[] = [];
  const sorted = [...ticks]
    .filter((t) => Number.isFinite(t.coord))
    .sort((a, b) => a.coord - b.coord);

  for (const tick of sorted) {
    if (tick.coord < 2 || (maxCoord > 0 && tick.coord > maxCoord - 2)) {
      if (tick.text === '') continue;
    }
    const prev = deduped[deduped.length - 1];
    if (prev && Math.abs(prev.coord - tick.coord) < 6) {
      if (tick.text !== '' && prev.text === '') {
        deduped[deduped.length - 1] = tick;
      }
      continue;
    }
    deduped.push(tick);
  }
  return deduped;
}

/**
 * Subdivides sparse X-axis time ticks into an evenly spaced vertical grid
 * (~52px columns like TradingView) locked to existing labeled ticks so columns
 * pan/zoom smoothly with candlesticks without colliding date labels.
 */
export function subdivideXAxisGridTicks(
  defaultTicks: ReadonlyArray<AxisTickLike>,
  boundingWidth: number,
  targetBoxWidth = TV_DEFAULT_GRID_WIDTH_PX
): AxisTickLike[] {
  if (!Number.isFinite(boundingWidth) || boundingWidth <= 0) {
    return [...defaultTicks];
  }

  const target = Math.max(38, Math.min(96, targetBoxWidth));
  const sorted = [...defaultTicks]
    .filter((t) => Number.isFinite(t.coord))
    .sort((a, b) => a.coord - b.coord);

  const out: AxisTickLike[] = [];

  if (sorted.length === 0) {
    for (let x = target; x <= boundingWidth - 4; x += target) {
      out.push({ coord: Math.round(x * 10) / 10, value: '', text: '' });
    }
    return out;
  }

  if (sorted.length === 1) {
    const anchor = sorted[0];
    for (let x = anchor.coord - target; x >= 8; x -= target) {
      out.push({ coord: Math.round(x * 10) / 10, value: anchor.value, text: '' });
    }
    out.push(anchor);
    for (let x = anchor.coord + target; x <= boundingWidth - 4; x += target) {
      out.push({ coord: Math.round(x * 10) / 10, value: anchor.value, text: '' });
    }
    return clampCoordRange(out, boundingWidth);
  }

  let firstStep = target;
  let lastStep = target;

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    out.push(cur);
    if (i === sorted.length - 1) break;

    const next = sorted[i + 1];
    const gap = next.coord - cur.coord;
    const segments = gap > target * 1.15 ? Math.min(16, Math.max(2, Math.round(gap / target))) : 1;
    const stepPx = gap / segments;

    if (i === 0) firstStep = Math.max(32, Math.min(110, stepPx));
    if (i === sorted.length - 2) lastStep = Math.max(32, Math.min(110, stepPx));

    for (let k = 1; k < segments; k++) {
      out.push({
        coord: Math.round((cur.coord + stepPx * k) * 10) / 10,
        value: cur.value,
        text: '',
      });
    }
  }

  // Extend grid columns cleanly into left and right margins
  const leftFirst = sorted[0];
  for (let x = leftFirst.coord - firstStep; x >= 8; x -= firstStep) {
    out.push({ coord: Math.round(x * 10) / 10, value: leftFirst.value, text: '' });
  }
  const rightLast = sorted[sorted.length - 1];
  for (let x = rightLast.coord + lastStep; x <= boundingWidth - 4; x += lastStep) {
    out.push({ coord: Math.round(x * 10) / 10, value: rightLast.value, text: '' });
  }

  return clampCoordRange(out, boundingWidth);
}

function inferDecimalPlaces(ticks: ReadonlyArray<AxisTickLike>): number {
  let maxDec = 0;
  for (const t of ticks) {
    const dotIdx = t.text.indexOf('.');
    if (dotIdx !== -1) {
      maxDec = Math.max(maxDec, t.text.length - dotIdx - 1);
    }
  }
  return Math.min(6, maxDec);
}

function parseNumericTickValue(tick: AxisTickLike): number {
  if (typeof tick.value === 'number' && Number.isFinite(tick.value)) return tick.value;
  const cleaned = String(tick.value).replace(/,/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : Number.NaN;
}

function formatAxisPriceText(
  val: number,
  options: { isIdx: boolean; decimals: number; useComma: boolean }
): string {
  if (!Number.isFinite(val)) return '';
  if (options.isIdx) {
    const snapped = snapToIdxTick(val);
    return options.useComma ? Math.round(snapped).toLocaleString('en-US') : String(snapped);
  }
  if (options.useComma) {
    return val.toLocaleString('en-US', {
      minimumFractionDigits: options.decimals,
      maximumFractionDigits: options.decimals,
    });
  }
  return val.toFixed(options.decimals);
}

/**
 * Adds crisp horizontal TradingView-style grid rows when Y-axis ticks are taller than ~68px,
 * formatting intermediate labels cleanly (respecting IDX BEI fraksi harga and log scales)
 * while maintaining >=32px vertical clearance between Y-axis labels.
 */
export function subdivideYAxisGridTicks(
  defaultTicks: ReadonlyArray<AxisTickLike>,
  options?: { isIdx?: boolean; isLog?: boolean; targetBoxHeight?: number }
): AxisTickLike[] {
  const isIdx = Boolean(options?.isIdx);
  const isLog = Boolean(options?.isLog);
  const targetH = Math.max(38, Math.min(72, options?.targetBoxHeight ?? TV_DEFAULT_GRID_HEIGHT_PX));

  const sorted = [...defaultTicks]
    .filter((t) => Number.isFinite(t.coord))
    .sort((a, b) => a.coord - b.coord);

  if (sorted.length < 2) {
    return isIdx ? deduplicateIdxAxisTicks(sorted) : sorted;
  }

  const useComma = sorted.some((t) => t.text.includes(',')) || isIdx;
  const decimals = isIdx ? 0 : inferDecimalPlaces(sorted);
  const out: AxisTickLike[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    out.push(cur);
    if (i === sorted.length - 1) break;

    const next = sorted[i + 1];
    const gap = Math.abs(next.coord - cur.coord);
    if (gap < MIN_Y_LABEL_GAP_PX * 2) continue;

    const va = parseNumericTickValue(cur);
    const vb = parseNumericTickValue(next);
    if (!Number.isFinite(va) || !Number.isFinite(vb)) continue;

    const maxByLabelSpace = Math.floor(gap / MIN_Y_LABEL_GAP_PX);
    const desiredSteps = Math.max(2, Math.floor(gap / targetH));
    const steps = Math.min(4, maxByLabelSpace, desiredSteps);
    if (steps < 2) continue;

    for (let k = 1; k < steps; k++) {
      const ratio = k / steps;
      const coord = Math.round((cur.coord + (next.coord - cur.coord) * ratio) * 10) / 10;
      const rawVal =
        isLog && va > 0 && vb > 0
          ? va * Math.pow(vb / va, ratio)
          : va + (vb - va) * ratio;
      const finalVal = isIdx ? snapToIdxTick(rawVal) : rawVal;
      out.push({
        coord,
        value: finalVal,
        text: formatAxisPriceText(finalVal, { isIdx, decimals, useComma }),
      });
    }
  }

  return isIdx ? deduplicateIdxAxisTicks(out) : out;
}
