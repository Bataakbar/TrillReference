export interface Point2D {
  x: number;
  y: number;
}

export interface ChartAnchorPoint {
  timestamp?: number;
  dataIndex?: number;
  value?: number;
}

export interface ParallelChannelGeometry {
  /** Base trendline segment (P1 -> P2, or extended right if extendRight=true) */
  baseLine: [Point2D, Point2D];
  /** Opposite parallel segment (Q1 -> Q2, strictly parallel to baseLine) */
  oppositeLine: [Point2D, Point2D];
  /** 50% dashed median line halfway between baseLine and oppositeLine */
  midLine: [Point2D, Point2D];
  /** 4-vertex closed parallelogram polygon for translucent channel fill */
  fillPolygon: [Point2D, Point2D, Point2D, Point2D];
}

/**
 * Computes TradingView-style Parallel Channel geometry from 3 anchor pixel coordinates:
 * - c0, c1: start and end of the base trendline segment
 * - c2: any point defining the parallel channel width
 *
 * Unlike infinite straight lines, the channel is bounded strictly between c0.x and c1.x
 * (unless extendRight is explicitly requested), with an exact parallel opposite boundary,
 * a 50% median line, and a 4-corner parallelogram fill polygon.
 */
export function computeParallelChannelGeometry(
  c0: Point2D,
  c1: Point2D,
  c2: Point2D,
  options?: { extendRight?: boolean; boundingWidth?: number }
): ParallelChannelGeometry {
  const dx = c1.x - c0.x;
  const dy = c1.y - c0.y;

  // Vertical edge case (c0.x === c1.x)
  if (Math.abs(dx) < 0.5) {
    const offsetX = c2.x - c0.x;
    const p0: Point2D = { x: c0.x, y: c0.y };
    const p1: Point2D = { x: c1.x, y: c1.y };
    const q0: Point2D = { x: c0.x + offsetX, y: c0.y };
    const q1: Point2D = { x: c1.x + offsetX, y: c1.y };
    const m0: Point2D = { x: c0.x + offsetX / 2, y: c0.y };
    const m1: Point2D = { x: c1.x + offsetX / 2, y: c1.y };

    return {
      baseLine: [p0, p1],
      oppositeLine: [q0, q1],
      midLine: [m0, m1],
      fillPolygon: [p0, p1, q1, q0],
    };
  }

  const slope = dy / dx;
  const yOnBaseAtC2 = c0.y + slope * (c2.x - c0.x);
  const offsetY = c2.y - yOnBaseAtC2;

  let startX = c0.x;
  let startY = c0.y;
  let endX = c1.x;
  let endY = c1.y;

  if (options?.extendRight && typeof options.boundingWidth === 'number') {
    const targetX = dx >= 0 ? Math.max(c1.x, options.boundingWidth) : Math.min(c1.x, 0);
    endX = targetX;
    endY = c0.y + slope * (targetX - c0.x);
  }

  const p0: Point2D = { x: startX, y: startY };
  const p1: Point2D = { x: endX, y: endY };
  const q0: Point2D = { x: startX, y: startY + offsetY };
  const q1: Point2D = { x: endX, y: endY + offsetY };
  const m0: Point2D = { x: startX, y: startY + offsetY / 2 };
  const m1: Point2D = { x: endX, y: endY + offsetY / 2 };

  return {
    baseLine: [p0, p1],
    oppositeLine: [q0, q1],
    midLine: [m0, m1],
    fillPolygon: [p0, p1, q1, q0],
  };
}

/**
 * Projects the 3rd anchor point (channel width handle) cleanly onto P1's bar/timestamp
 * while preserving the exact vertical price distance between the cursor and the P1->P2 trendline.
 * Result: the opposite parallel line always passes directly through the user's cursor,
 * and the 3rd control node rests cleanly on the channel's opposite corner (Q0).
 */
export function computeAlignedThirdPoint(
  p0: ChartAnchorPoint,
  p1: ChartAnchorPoint,
  cursor: ChartAnchorPoint
): ChartAnchorPoint {
  if (
    typeof p0.dataIndex !== 'number' ||
    typeof p1.dataIndex !== 'number' ||
    typeof p0.value !== 'number' ||
    typeof p1.value !== 'number' ||
    typeof cursor.dataIndex !== 'number' ||
    typeof cursor.value !== 'number'
  ) {
    return { ...cursor };
  }

  const dIdx = p1.dataIndex - p0.dataIndex;
  if (dIdx === 0) {
    return { ...cursor };
  }

  const priceSlopePerBar = (p1.value - p0.value) / dIdx;
  const baseValueAtCursor = p0.value + priceSlopePerBar * (cursor.dataIndex - p0.dataIndex);
  const deltaValue = cursor.value - baseValueAtCursor;

  return {
    ...(typeof p0.timestamp === 'number' ? { timestamp: p0.timestamp } : {}),
    dataIndex: p0.dataIndex,
    value: p0.value + deltaValue,
  };
}

export interface RegressionChannelResult {
  startIndex: number;
  endIndex: number;
  midStart: number;
  midEnd: number;
  upperStart: number;
  upperEnd: number;
  lowerStart: number;
  lowerEnd: number;
  slope: number;
  stdDev: number;
  /** Pearson correlation coefficient (-1 to +1) */
  pearsonR: number;
}

/**
 * Computes TradingView-style Ordinary Least Squares (OLS) Linear Regression Trend
 * over closing prices in [idxA, idxB] with upper (+devMult * sigma) and lower (-devMult * sigma)
 * parallel standard deviation channels and Pearson correlation coefficient (r).
 */
export function computeLinearRegressionChannel(
  closes: readonly number[],
  idxA: number,
  idxB: number,
  devMultiplier = 2
): RegressionChannelResult | null {
  if (closes.length < 2) return null;

  const rawStart = Math.min(Math.round(idxA), Math.round(idxB));
  const rawEnd = Math.max(Math.round(idxA), Math.round(idxB));
  const startIndex = Math.max(0, Math.min(closes.length - 1, rawStart));
  const endIndex = Math.max(0, Math.min(closes.length - 1, rawEnd));

  const n = endIndex - startIndex + 1;
  if (n < 2) return null;

  const meanX = (n - 1) / 2;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumY += closes[startIndex + i];
  }
  const meanY = sumY / n;

  let covXY = 0;
  let varX = 0;
  let varY = 0;
  for (let i = 0; i < n; i++) {
    const dx = i - meanX;
    const dy = closes[startIndex + i] - meanY;
    covXY += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }

  if (varX === 0) return null;

  const slope = covXY / varX;
  const intercept = meanY - slope * meanX;

  let sumSqResiduals = 0;
  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * i;
    const residual = closes[startIndex + i] - predicted;
    sumSqResiduals += residual * residual;
  }
  const stdDev = Math.sqrt(sumSqResiduals / n);
  const pearsonR = varY > 0 ? covXY / Math.sqrt(varX * varY) : 0;

  const midStart = intercept;
  const midEnd = intercept + slope * (n - 1);
  const bandOffset = stdDev * devMultiplier;

  return {
    startIndex,
    endIndex,
    midStart,
    midEnd,
    upperStart: midStart + bandOffset,
    upperEnd: midEnd + bandOffset,
    lowerStart: midStart - bandOffset,
    lowerEnd: midEnd - bandOffset,
    slope,
    stdDev,
    pearsonR,
  };
}

/**
 * Resolves a chart anchor point to a valid bar index in dataList.
 * Prioritizes timestamp lookup (matching KLineChart's own OverlayView resolution
 * across timeframe switches and LocalStorage reloads) and falls back to dataIndex
 * when dragging past bar edges where timestamp may be undefined.
 */
export function resolveBarIndexFromPoint(
  timestamps: readonly number[],
  point: ChartAnchorPoint
): number | null {
  const len = timestamps.length;
  if (len === 0) return null;

  if (typeof point.timestamp === 'number' && Number.isFinite(point.timestamp)) {
    // Binary search for exact or nearest bar timestamp
    let lo = 0;
    let hi = len - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const ts = timestamps[mid];
      if (ts === point.timestamp) return mid;
      if (ts < point.timestamp) {
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    if (lo <= 0) return 0;
    if (lo >= len) return len - 1;
    // Choose closer neighbor between lo - 1 and lo
    return Math.abs(timestamps[lo] - point.timestamp) <
      Math.abs(timestamps[lo - 1] - point.timestamp)
      ? lo
      : lo - 1;
  }

  if (typeof point.dataIndex === 'number' && Number.isFinite(point.dataIndex)) {
    return Math.max(0, Math.min(len - 1, Math.round(point.dataIndex)));
  }

  return null;
}


