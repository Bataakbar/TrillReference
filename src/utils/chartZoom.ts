/**
 * Pure X-axis zoom and bar-space math for Meridian Chart.
 * Allows sub-pixel horizontal compression down to 0.05 px/bar so multi-thousand-bar
 * intraday windows (e.g. 30 days of 1m data) can be zoomed out onto a single screen.
 */

export const MIN_BAR_SPACE = 0.05;
export const MAX_BAR_SPACE = 80;
export const DEFAULT_BAR_SPACE = 8;

export function clampBarSpace(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_BAR_SPACE;
  return Math.max(MIN_BAR_SPACE, Math.min(MAX_BAR_SPACE, value));
}

export function computeSteppedBarSpace(currentBarSpace: number, factor: number): number {
  const base =
    Number.isFinite(currentBarSpace) && currentBarSpace > 0
      ? currentBarSpace
      : DEFAULT_BAR_SPACE;
  return clampBarSpace(base * factor);
}

export function computeFitBarSpace(
  canvasWidth: number,
  barCount: number,
  yAxisReservedPx = 76
): number {
  if (!Number.isFinite(canvasWidth) || !Number.isFinite(barCount) || barCount <= 0) {
    return DEFAULT_BAR_SPACE;
  }
  const plotWidth = Math.max(120, canvasWidth - yAxisReservedPx);
  // Leave a subtle 4% margin on the right edge so the latest candle isn't pressed against the Y-axis
  const target = (plotWidth * 0.96) / barCount;
  return clampBarSpace(target);
}
