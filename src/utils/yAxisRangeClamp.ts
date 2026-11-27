import type { AxisRange } from 'klinecharts';
import { getIdxTickSize, isIdxSymbol } from '../../shared/timeframes';
import type { YAxisScaleType } from '../types/chart';

export function valueToLogarithm(value: number): number {
  return value < 0 ? -Math.log10(1 - value) : Math.log10(1 + value);
}

export function logarithmToValue(value: number): number {
  return value < 0 ? 1 - Math.pow(10, -value) : Math.pow(10, value) - 1;
}

/**
 * Clamps manual Y-axis zoom ranges so continuous upward dragging or zooming in
 * stops cleanly at a readable minimum price span (~8 grid intervals) instead of
 * inverting, collapsing to zero ticks/grid lines, or stretching candles off-screen.
 */
export function clampYAxisZoomRange(
  range: AxisRange,
  options: { isIdx: boolean; isLog: boolean; precision?: number }
): AxisRange {
  const { isIdx, isLog, precision = 2 } = options;
  const rawFrom = Number.isFinite(range.from) ? range.from : 0;
  const rawTo = Number.isFinite(range.to) ? range.to : 100;
  const center = (rawFrom + rawTo) / 2;
  const absMid = Math.abs(center);

  const minSpan = isIdx
    ? Math.max(getIdxTickSize(absMid || 1) * 8, absMid * 0.005, 8)
    : Math.max(Math.pow(10, -Math.min(6, Math.max(0, precision))) * 8, absMid * 0.002, 1e-6);

  const currentSpan = range.to - range.from;
  if (Number.isFinite(currentSpan) && currentSpan >= minSpan && range.realRange > 0) {
    return range;
  }

  const from = center - minSpan / 2;
  const to = center + minSpan / 2;
  const realFrom = isLog ? valueToLogarithm(from) : from;
  const realTo = isLog ? valueToLogarithm(to) : to;

  return {
    from,
    to,
    range: minSpan,
    realFrom,
    realTo,
    realRange: realTo - realFrom,
    displayFrom: from,
    displayTo: to,
    displayRange: minSpan,
  };
}

export function resolveCandleYAxisName(symbol: string, scale: YAxisScaleType): string {
  if (isIdxSymbol(symbol)) {
    return scale === 'logarithm' ? 'idx_logarithm' : 'idx_normal';
  }
  if (scale === 'logarithm') return 'price_logarithm';
  if (scale === 'percentage') return 'percentage';
  return 'price_normal';
}
