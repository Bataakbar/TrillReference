import { registerFigure, registerOverlay, type DeepPartial, type Overlay, type OverlayStyle } from 'klinecharts';
import { hexWithOpacity, lineDashToKLine } from '../indicators/indicatorModel';
import type { DrawingOverlayStyle, DrawingToolGroup } from '../types/chart';
import {
  computeAlignedThirdPoint,
  computeLinearRegressionChannel,
  computeParallelChannelGeometry,
  resolveBarIndexFromPoint,
} from './parallelChannelMath';

export function buildKLineOverlayStyles(style: DrawingOverlayStyle): DeepPartial<OverlayStyle> {
  const dash = lineDashToKLine(style.lineStyle);
  return {
    line: {
      color: style.color,
      size: style.size,
      style: dash.style,
      dashedValue: dash.dashedValue,
    },
    polygon: {
      color: hexWithOpacity(style.color, 16),
      borderColor: style.color,
      borderSize: style.size,
    },
    rect: {
      color: hexWithOpacity(style.color, 16),
      borderColor: style.color,
      borderSize: style.size,
    },
    circle: {
      color: hexWithOpacity(style.color, 16),
      borderColor: style.color,
      borderSize: style.size,
    },
    text: {
      backgroundColor: style.color,
    },
  };
}

function readCustomOverlayLineStyle(
  overlay: Overlay<unknown>,
  fallbackColor = '#ffffff',
  fallbackSize = 1.5
): { color: string; size: number; style: 'solid' | 'dashed'; dashedValue: number[] } {
  const line = overlay.styles?.line;
  const color = typeof line?.color === 'string' ? line.color : fallbackColor;
  const size = typeof line?.size === 'number' && Number.isFinite(line.size) ? line.size : fallbackSize;
  const style = line?.style === 'dashed' ? 'dashed' : 'solid';
  const dashedValue = Array.isArray(line?.dashedValue) ? line.dashedValue : [];
  return { color, size, style, dashedValue };
}

let registered = false;

export const DRAWING_GROUPS: readonly DrawingToolGroup[] = [
  {
    id: 'lines',
    label: 'Trend Lines',
    tools: [
      { key: 'segment', label: 'Trendline', hint: 'Click start and end points' },
      { key: 'rayLine', label: 'Ray', hint: 'Click origin and direction point' },
      { key: 'infoLine', label: 'Info line', hint: 'Click two points to show price change, %, angle & bars' },
      { key: 'straightLine', label: 'Extended line', hint: 'Click two points to extend both ways' },
      { key: 'trendAngle', label: 'Trend angle', hint: 'Click origin and slope point to measure angle in degrees' },
      { key: 'horizontalStraightLine', label: 'Horizontal line', hint: 'Click price level' },
      { key: 'horizontalRayLine', label: 'Horizontal ray', hint: 'Click start price level' },
      { key: 'horizontalSegment', label: 'Horizontal segment', hint: 'Click start and end on level' },
      { key: 'verticalStraightLine', label: 'Vertical line', hint: 'Click timestamp' },
      { key: 'verticalRayLine', label: 'Vertical ray', hint: 'Click origin point' },
      { key: 'verticalSegment', label: 'Vertical segment', hint: 'Click start and end vertically' },
      { key: 'crossLine', label: 'Crossline', hint: 'Click a point to place infinite horizontal + vertical lines' },
      { key: 'priceLine', label: 'Price line', hint: 'Click to mark price level with tag' },
      { key: 'arrowLine', label: 'Arrow line', hint: 'Click tail and arrowhead points' },
      { key: 'fibonacciLine', label: 'Fib Retracement', hint: 'Click swing start and swing end' },
      { key: 'abcdPattern', label: 'ABCD Pattern', hint: 'Click 4 points: A, B, C, D' },
    ],
  },
  {
    id: 'channels',
    label: 'Channels',
    tools: [
      { key: 'parallelChannel', label: 'Parallel Channel', hint: 'Click start & end of trendline, then drag to set channel width' },
      { key: 'regressionTrend', label: 'Regression Trend', hint: 'Click start bar and end bar to plot OLS linear regression ±2σ channel' },
    ],
  },
  {
    id: 'shapes',
    label: 'Rectangle',
    tools: [
      { key: 'rectZone', label: 'Rectangle (Zone)', hint: 'Click two opposite corners' },
    ],
  },
  {
    id: 'freehand',
    label: 'Brush & Annotations',
    tools: [
      { key: 'plainText', label: 'Text', hint: 'Click anywhere on chart to place editable text' },
      { key: 'simpleAnnotation', label: 'Callout', hint: 'Click anchor point to place callout note' },
      { key: 'flagMark', label: 'Flag mark', hint: 'Click anchor point to place flag marker' },
      { key: 'chartImage', label: 'Image', hint: 'Click point on chart to upload an image' },
      { key: 'brush', label: 'Freehand Brush', hint: 'Click and drag freely on the chart' },
    ],
  },
  {
    id: 'patterns',
    label: 'Positions (Long / Short)',
    tools: [
      { key: 'longPosition', label: 'Long Position (R:R)', hint: 'Click Entry, then Target (TP), then Stop Loss (SL)' },
      { key: 'shortPosition', label: 'Short Position (R:R)', hint: 'Click Entry, then Target (TP below), then Stop Loss (SL above)' },
    ],
  },
  {
    id: 'measure',
    label: 'Measure Tool',
    tools: [
      { key: 'measureRuler', label: 'Price & Bar Ruler', hint: 'Click start and end to measure Δ price, % and bars' },
    ],
  },
];

export function findDrawingTool(key: string | null) {
  if (!key) return null;
  for (const group of DRAWING_GROUPS) {
    const found = group.tools.find((t) => t.key === key);
    if (found) return found;
  }
  return null;
}

function buildEllipsePoints(cx: number, cy: number, rx: number, ry: number, segments = 48) {
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    pts.push({
      x: cx + rx * Math.cos(theta),
      y: cy + ry * Math.sin(theta),
    });
  }
  return pts;
}

interface CachedAnnotationImage {
  img: HTMLImageElement;
  status: 'loading' | 'loaded' | 'error';
}

const annotationImageCache = new Map<string, CachedAnnotationImage>();

export interface ChartImageExtendData {
  src: string;
  width?: number;
  height?: number;
}

export function readChartImageExtendData(extendData: unknown): ChartImageExtendData {
  if (typeof extendData === 'string') {
    return { src: extendData, width: 200, height: 130 };
  }
  if (extendData && typeof extendData === 'object') {
    const rec = extendData as { src?: unknown; width?: unknown; height?: unknown };
    const src = typeof rec.src === 'string' ? rec.src : '';
    const width =
      typeof rec.width === 'number' && Number.isFinite(rec.width)
        ? Math.max(40, Math.min(1200, rec.width))
        : 200;
    const height =
      typeof rec.height === 'number' && Number.isFinite(rec.height)
        ? Math.max(40, Math.min(900, rec.height))
        : 130;
    return { src, width, height };
  }
  return { src: '', width: 200, height: 130 };
}

interface ChartImageBoxAttrs {
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
  borderColor: string;
  borderSize: number;
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

interface FreehandStrokeAttrs {
  coordinates: Array<{ x: number; y: number }>;
  color: string;
  size: number;
  style: 'solid' | 'dashed';
  dashedValue: number[];
}

function pointToSegmentDistSq(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return (px - x1) * (px - x1) + (py - y1) * (py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return (px - projX) * (px - projX) + (py - projY) * (py - projY);
}

export function registerCustomOverlays(): void {
  if (registered) return;
  registered = true;

  // Custom smooth freehand stroke figure with generous hit-testing
  registerFigure<FreehandStrokeAttrs>({
    name: 'freehandStroke',
    checkEventOn: (coordinate, attrs) => {
      const pts = attrs.coordinates;
      if (!pts || pts.length === 0) return false;
      const hitRadius = Math.max(11, attrs.size / 2 + 8);
      const hitRadiusSq = hitRadius * hitRadius;
      if (pts.length === 1) {
        const dx = coordinate.x - pts[0].x;
        const dy = coordinate.y - pts[0].y;
        return dx * dx + dy * dy <= hitRadiusSq;
      }
      for (let i = 0; i < pts.length - 1; i++) {
        if (
          pointToSegmentDistSq(
            coordinate.x,
            coordinate.y,
            pts[i].x,
            pts[i].y,
            pts[i + 1].x,
            pts[i + 1].y
          ) <= hitRadiusSq
        ) {
          return true;
        }
      }
      return false;
    },
    draw: (ctx, attrs) => {
      const pts = attrs.coordinates;
      if (!pts || pts.length < 2) return;
      ctx.save();
      ctx.strokeStyle = attrs.color;
      ctx.lineWidth = Math.max(1, attrs.size);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash(attrs.style === 'dashed' ? attrs.dashedValue : []);

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      if (pts.length === 2) {
        ctx.lineTo(pts[1].x, pts[1].y);
      } else {
        for (let i = 1; i < pts.length - 1; i++) {
          const midX = (pts[i].x + pts[i + 1].x) / 2;
          const midY = (pts[i].y + pts[i + 1].y) / 2;
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
        }
        const last = pts[pts.length - 1];
        ctx.lineTo(last.x, last.y);
      }
      ctx.stroke();
      ctx.restore();
    },
  });

  // Custom canvas figure for Image annotations
  registerFigure<ChartImageBoxAttrs>({
    name: 'chartImageBox',
    checkEventOn: (coordinate, attrs) =>
      coordinate.x >= attrs.x &&
      coordinate.x <= attrs.x + attrs.width &&
      coordinate.y >= attrs.y &&
      coordinate.y <= attrs.y + attrs.height,
    draw: (ctx, attrs) => {
      const { x, y, width, height, src, borderColor, borderSize } = attrs;
      ctx.save();
      drawRoundedRectPath(ctx, x, y, width, height, 6);
      ctx.fillStyle = '#131722';
      ctx.fill();

      const entry = src ? annotationImageCache.get(src) : undefined;
      if (entry && entry.status === 'loaded' && entry.img.naturalWidth > 0) {
        ctx.save();
        drawRoundedRectPath(ctx, x + 1.5, y + 1.5, width - 3, height - 3, 5);
        ctx.clip();
        ctx.drawImage(entry.img, x + 1.5, y + 1.5, width - 3, height - 3);
        ctx.restore();
      } else {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 12px -apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = !src
          ? 'Image (empty)'
          : entry?.status === 'error'
            ? 'Image failed to load'
            : 'Loading image...';
        ctx.fillText(label, x + width / 2, y + height / 2, width - 16);
      }

      drawRoundedRectPath(ctx, x, y, width, height, 6);
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = Math.max(1, borderSize);
      ctx.stroke();
      ctx.restore();
    },
  });

  // 0. TradingView Parallel Channel (Bounded & Right-Extended)
  // Step 1: P1, Step 2: P2 (finite trendline segment), Step 3: P3 (parallel offset with shaded fill + dashed 50% midline)
  const registerParallelChannelOverlay = (name: string, extendRight: boolean) => {
    registerOverlay({
      name,
      totalStep: 4,
      needDefaultPointFigure: true,
      needDefaultXAxisFigure: true,
      needDefaultYAxisFigure: true,
      performEventMoveForDrawing: ({ currentStep, points, performPoint }) => {
        if (currentStep === 3 && points.length >= 2) {
          points[2] = computeAlignedThirdPoint(points[0], points[1], performPoint);
        }
      },
      performEventPressedMove: ({ points, performPointIndex, performPoint }) => {
        if (performPointIndex === 2 && points.length >= 2) {
          points[2] = computeAlignedThirdPoint(points[0], points[1], performPoint);
        }
      },
      createPointFigures: ({ overlay, coordinates, bounding }) => {
        const ls = readCustomOverlayLineStyle(overlay, '#ffffff', 1.5);
        if (coordinates.length === 2) {
          return [
            {
              type: 'line',
              attrs: { coordinates: [coordinates[0], coordinates[1]] },
              styles: { color: ls.color, size: ls.size, style: ls.style, dashedValue: ls.dashedValue },
            },
          ];
        }
        if (coordinates.length === 3) {
          const geom = computeParallelChannelGeometry(
            coordinates[0],
            coordinates[1],
            coordinates[2],
            { extendRight, boundingWidth: bounding.width }
          );
          return [
            {
              type: 'polygon',
              attrs: { coordinates: geom.fillPolygon },
              styles: {
                style: 'fill',
                color: hexWithOpacity(ls.color, 16),
              },
            },
            {
              type: 'line',
              attrs: { coordinates: geom.baseLine },
              styles: { color: ls.color, size: ls.size, style: ls.style, dashedValue: ls.dashedValue },
            },
            {
              type: 'line',
              attrs: { coordinates: geom.oppositeLine },
              styles: { color: ls.color, size: ls.size, style: ls.style, dashedValue: ls.dashedValue },
            },
            {
              type: 'line',
              ignoreEvent: true,
              attrs: { coordinates: geom.midLine },
              styles: {
                style: 'dashed',
                dashedValue: [5, 4],
                color: ls.color,
                size: Math.max(1, ls.size - 0.5),
              },
            },
          ];
        }
        return [];
      },
    });
  };

  registerParallelChannelOverlay('parallelChannel', false);
  registerParallelChannelOverlay('extendedParallelChannel', true);

  // 0.1 TradingView Regression Trend (OLS Linear Regression + Upper +2σ Red / Lower -2σ Blue Zones + Pearson r)
  registerOverlay({
    name: 'regressionTrend',
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    performEventPressedMove: ({ points, performPointIndex, performPoint }) => {
      // Keep timestamp synchronized when dragging an anchor handle horizontally
      if (points[performPointIndex]) {
        points[performPointIndex] = {
          ...(typeof performPoint.timestamp === 'number'
            ? { timestamp: performPoint.timestamp }
            : {}),
          ...(typeof performPoint.dataIndex === 'number'
            ? { dataIndex: performPoint.dataIndex }
            : {}),
          ...(typeof performPoint.value === 'number' ? { value: performPoint.value } : {}),
        };
      }
    },
    createPointFigures: ({ chart, overlay, coordinates, bounding, xAxis, yAxis }) => {
      if (coordinates.length < 2 || overlay.points.length < 2 || !xAxis || !yAxis) {
        return [];
      }

      const dataList = chart.getDataList();
      if (!dataList || dataList.length < 2) return [];

      const timestamps = dataList.map((bar) => bar.timestamp);
      const rawIdxA = resolveBarIndexFromPoint(timestamps, overlay.points[0]);
      const rawIdxB = resolveBarIndexFromPoint(timestamps, overlay.points[1]);
      if (rawIdxA === null || rawIdxB === null) return [];

      let idxA = rawIdxA;
      let idxB = rawIdxB;
      if (idxA === idxB) {
        // Ensure at least a 2-bar regression span if both clicks land on the same bar
        if (idxB < dataList.length - 1) {
          idxB = idxA + 1;
        } else {
          idxA = Math.max(0, idxB - 1);
        }
      }

      const closes = dataList.map((bar) => bar.close);
      const reg = computeLinearRegressionChannel(closes, idxA, idxB, 2);
      if (!reg) return [];

      const xStart = xAxis.convertToPixel(reg.startIndex);
      const xEnd = xAxis.convertToPixel(reg.endIndex);

      // Safe price -> pixel conversion (protects logarithmic Y-axis against <= 0 prices)
      const safeToY = (price: number): number => {
        const y = yAxis.convertToPixel(price);
        if (Number.isFinite(y)) return y;
        const clamped = yAxis.convertToPixel(Math.max(0.0001, price));
        return Number.isFinite(clamped) ? clamped : bounding.height;
      };

      const yUpperStart = safeToY(reg.upperStart);
      const yUpperEnd = safeToY(reg.upperEnd);
      const yMidStart = safeToY(reg.midStart);
      const yMidEnd = safeToY(reg.midEnd);
      const yLowerStart = safeToY(reg.lowerStart);
      const yLowerEnd = safeToY(reg.lowerEnd);

      // Snap BOTH anchor points & default handle coordinates cleanly onto the OLS centerline
      // so the blue control dots and Y-axis price tags NEVER float detached from the channel!
      const isForward = rawIdxA <= rawIdxB;
      const startPtIdx = isForward ? 0 : 1;
      const endPtIdx = isForward ? 1 : 0;

      overlay.points[startPtIdx].dataIndex = reg.startIndex;
      overlay.points[startPtIdx].timestamp = dataList[reg.startIndex].timestamp;
      overlay.points[startPtIdx].value = reg.midStart;

      overlay.points[endPtIdx].dataIndex = reg.endIndex;
      overlay.points[endPtIdx].timestamp = dataList[reg.endIndex].timestamp;
      overlay.points[endPtIdx].value = reg.midEnd;

      coordinates[startPtIdx].x = xStart;
      coordinates[startPtIdx].y = yMidStart;
      coordinates[endPtIdx].x = xEnd;
      coordinates[endPtIdx].y = yMidEnd;

      const pUpperStart = { x: xStart, y: yUpperStart };
      const pUpperEnd = { x: xEnd, y: yUpperEnd };
      const pMidStart = { x: xStart, y: yMidStart };
      const pMidEnd = { x: xEnd, y: yMidEnd };
      const pLowerStart = { x: xStart, y: yLowerStart };
      const pLowerEnd = { x: xEnd, y: yLowerEnd };

      const ls = readCustomOverlayLineStyle(overlay, '#ffffff', 1.5);
      // Keep Pearson r badge readable inside the candle pane viewport
      const labelX = Math.max(8, Math.min(bounding.width - 76, xStart + 6));
      const labelY = Math.max(16, Math.min(bounding.height - 16, yLowerStart + 14));

      return [
        // Upper +2σ translucent red/rose half (TradingView Regression Trend upper zone)
        {
          type: 'polygon',
          attrs: { coordinates: [pUpperStart, pUpperEnd, pMidEnd, pMidStart] },
          styles: {
            style: 'fill',
            color: 'rgba(239, 83, 80, 0.14)',
          },
        },
        // Lower -2σ translucent neutral/white half
        {
          type: 'polygon',
          attrs: { coordinates: [pMidStart, pMidEnd, pLowerEnd, pLowerStart] },
          styles: {
            style: 'fill',
            color: hexWithOpacity(ls.color, 14),
          },
        },
        // Upper +2σ boundary
        {
          type: 'line',
          attrs: { coordinates: [pUpperStart, pUpperEnd] },
          styles: { color: '#ef5350', size: ls.size },
        },
        // Lower -2σ boundary
        {
          type: 'line',
          attrs: { coordinates: [pLowerStart, pLowerEnd] },
          styles: { color: ls.color, size: ls.size },
        },
        // OLS Linear Regression Center Line (basis)
        {
          type: 'line',
          attrs: { coordinates: [pMidStart, pMidEnd] },
          styles: {
            style: 'dashed',
            dashedValue: [5, 4],
            color: ls.color,
            size: ls.size,
          },
        },
        // Pearson correlation coefficient (r) badge
        {
          type: 'text',
          ignoreEvent: true,
          attrs: {
            x: labelX,
            y: labelY,
            text: `r = ${reg.pearsonR.toFixed(2)}`,
            align: 'left',
            baseline: 'middle',
          },
          styles: {
            color: '#e2e8f0',
            backgroundColor: 'rgba(19, 23, 34, 0.86)',
            borderColor: ls.color,
            borderSize: 1,
            paddingLeft: 6,
            paddingRight: 6,
            paddingTop: 2,
            paddingBottom: 2,
            borderRadius: 3,
            size: 11,
            family: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
          },
        },
      ];
    },
  });

  // 0a. TradingView Info Line (Trendline + floating Δ price, Δ %, angle & bars box)
  registerOverlay({
    name: 'infoLine',
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ coordinates, overlay }) => {
      if (coordinates.length === 2 && overlay.points.length >= 2) {
        const ls = readCustomOverlayLineStyle(overlay, '#ffffff', 1.5);
        const [c1, c2] = coordinates;
        const [p1, p2] = overlay.points;
        const v1 = p1.value ?? 0;
        const v2 = p2.value ?? 0;
        const diff = v2 - v1;
        const pct = v1 !== 0 ? (diff / v1) * 100 : 0;
        const bars = Math.abs((p2.dataIndex ?? 0) - (p1.dataIndex ?? 0));
        const angleDeg = (-Math.atan2(c2.y - c1.y, c2.x - c1.x) * 180) / Math.PI;
        const sign = diff >= 0 ? '+' : '';
        const text = `${sign}${diff.toFixed(2)} (${sign}${pct.toFixed(2)}%) · ${bars} bars · ${angleDeg.toFixed(1)}°`;
        return [
          {
            type: 'line',
            attrs: { coordinates: [c1, c2] },
            styles: { color: ls.color, size: ls.size, style: ls.style, dashedValue: ls.dashedValue },
          },
          {
            type: 'text',
            ignoreEvent: true,
            attrs: {
              x: (c1.x + c2.x) / 2,
              y: (c1.y + c2.y) / 2 - 14,
              text,
              align: 'center',
              baseline: 'middle',
            },
            styles: {
              color: '#ffffff',
              backgroundColor: '#1e222d',
              borderColor: ls.color,
              borderSize: 1,
              paddingLeft: 7,
              paddingRight: 7,
              paddingTop: 4,
              paddingBottom: 4,
              borderRadius: 4,
              size: 11,
              family: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
            },
          },
        ];
      }
      return [];
    },
  });

  // 0b. TradingView Trend Angle (Diagonal + Horizontal Base + Angle Arc + Degree Label)
  registerOverlay({
    name: 'trendAngle',
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ coordinates, overlay }) => {
      if (coordinates.length === 2) {
        const ls = readCustomOverlayLineStyle(overlay, '#ffffff', 1.5);
        const [c1, c2] = coordinates;
        const dx = c2.x - c1.x;
        const dy = c2.y - c1.y;
        const dist = Math.hypot(dx, dy);
        const angleRad = Math.atan2(-dy, dx);
        const angleDeg = (angleRad * 180) / Math.PI;
        const baseLen = Math.max(Math.min(dist, 90), 48);
        const dir = dx >= 0 ? 1 : -1;
        const arcRadius = Math.min(34, baseLen * 0.55);

        const arcPts: Array<{ x: number; y: number }> = [];
        const startA = dx >= 0 ? 0 : Math.PI;
        const endA = Math.atan2(dy, dx);
        const steps = 16;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          let delta = endA - startA;
          if (delta > Math.PI) delta -= Math.PI * 2;
          if (delta < -Math.PI) delta += Math.PI * 2;
          const a = startA + delta * t;
          arcPts.push({
            x: c1.x + Math.cos(a) * arcRadius,
            y: c1.y + Math.sin(a) * arcRadius,
          });
        }

        return [
          {
            type: 'line',
            attrs: { coordinates: [c1, c2] },
            styles: { color: ls.color, size: ls.size, style: ls.style, dashedValue: ls.dashedValue },
          },
          {
            type: 'line',
            attrs: {
              coordinates: [c1, { x: c1.x + baseLen * dir, y: c1.y }],
            },
            styles: { style: 'dashed', dashedValue: [4, 3], color: '#787b86', size: 1 },
          },
          {
            type: 'line',
            attrs: { coordinates: arcPts },
            styles: { color: ls.color, size: 1 },
          },
          {
            type: 'text',
            ignoreEvent: true,
            attrs: {
              x: c1.x + (arcRadius + 16) * dir,
              y: c1.y + (dy < 0 ? -12 : 12),
              text: `${angleDeg.toFixed(1)}°`,
              align: dir > 0 ? 'left' : 'right',
              baseline: 'middle',
            },
            styles: {
              color: '#ffffff',
              backgroundColor: '#1e222d',
              borderColor: ls.color,
              borderSize: 1,
              paddingLeft: 6,
              paddingRight: 6,
              paddingTop: 3,
              paddingBottom: 3,
              borderRadius: 3,
              size: 11,
              family: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
            },
          },
        ];
      }
      return [];
    },
  });

  // 0c. TradingView Crossline (Infinite Horizontal + Vertical Cross anchored at 1 point)
  registerOverlay({
    name: 'crossLine',
    totalStep: 2,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ coordinates, overlay, bounding }) => {
      if (coordinates.length === 1) {
        const ls = readCustomOverlayLineStyle(overlay, '#ffffff', 1.5);
        const c = coordinates[0];
        return [
          {
            type: 'line',
            attrs: {
              coordinates: [
                { x: 0, y: c.y },
                { x: bounding.width, y: c.y },
              ],
            },
            styles: { color: ls.color, size: ls.size, style: ls.style, dashedValue: ls.dashedValue },
          },
          {
            type: 'line',
            attrs: {
              coordinates: [
                { x: c.x, y: 0 },
                { x: c.x, y: bounding.height },
              ],
            },
            styles: { color: ls.color, size: ls.size, style: ls.style, dashedValue: ls.dashedValue },
          },
        ];
      }
      return [];
    },
  });

  // 1. Rectangle (Supply / Demand Zone)
  registerOverlay({
    name: 'rectZone',
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ coordinates, overlay }) => {
      if (coordinates.length === 2) {
        const ls = readCustomOverlayLineStyle(overlay, '#ffffff', 1.5);
        const x = Math.min(coordinates[0].x, coordinates[1].x);
        const y = Math.min(coordinates[0].y, coordinates[1].y);
        const width = Math.abs(coordinates[1].x - coordinates[0].x);
        const height = Math.abs(coordinates[1].y - coordinates[0].y);
        return [
          {
            type: 'rect',
            attrs: { x, y, width, height },
            styles: {
              style: 'stroke_fill',
              color: hexWithOpacity(ls.color, 16),
              borderColor: ls.color,
              borderSize: ls.size,
            },
          },
        ];
      }
      return [];
    },
  });

  // 2. Circle
  registerOverlay({
    name: 'circleShape',
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ coordinates, overlay }) => {
      if (coordinates.length === 2) {
        const ls = readCustomOverlayLineStyle(overlay, '#ffffff', 1.5);
        const dx = coordinates[1].x - coordinates[0].x;
        const dy = coordinates[1].y - coordinates[0].y;
        const r = Math.hypot(dx, dy);
        return [
          {
            type: 'circle',
            attrs: { x: coordinates[0].x, y: coordinates[0].y, r },
            styles: {
              style: 'stroke_fill',
              color: hexWithOpacity(ls.color, 14),
              borderColor: ls.color,
              borderSize: ls.size,
            },
          },
        ];
      }
      return [];
    },
  });

  // 3. Ellipse
  registerOverlay({
    name: 'ellipseShape',
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ coordinates, overlay }) => {
      if (coordinates.length === 2) {
        const ls = readCustomOverlayLineStyle(overlay, '#ffffff', 1.5);
        const cx = (coordinates[0].x + coordinates[1].x) / 2;
        const cy = (coordinates[0].y + coordinates[1].y) / 2;
        const rx = Math.max(Math.abs(coordinates[1].x - coordinates[0].x) / 2, 2);
        const ry = Math.max(Math.abs(coordinates[1].y - coordinates[0].y) / 2, 2);
        return [
          {
            type: 'polygon',
            attrs: { coordinates: buildEllipsePoints(cx, cy, rx, ry) },
            styles: {
              style: 'stroke_fill',
              color: hexWithOpacity(ls.color, 14),
              borderColor: ls.color,
              borderSize: ls.size,
            },
          },
        ];
      }
      return [];
    },
  });

  // 4. Triangle
  registerOverlay({
    name: 'triangleShape',
    totalStep: 4,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ coordinates, overlay }) => {
      const ls = readCustomOverlayLineStyle(overlay, '#ffffff', 1.5);
      if (coordinates.length === 2) {
        return [
          {
            type: 'line',
            attrs: { coordinates },
            styles: { color: ls.color, size: ls.size, style: ls.style, dashedValue: ls.dashedValue },
          },
        ];
      }
      if (coordinates.length === 3) {
        return [
          {
            type: 'polygon',
            attrs: { coordinates },
            styles: {
              style: 'stroke_fill',
              color: hexWithOpacity(ls.color, 16),
              borderColor: ls.color,
              borderSize: ls.size,
            },
          },
        ];
      }
      return [];
    },
  });

  // 5. Arrow Line
  registerOverlay({
    name: 'arrowLine',
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ coordinates, overlay }) => {
      if (coordinates.length === 2) {
        const ls = readCustomOverlayLineStyle(overlay, '#ffffff', 2);
        const [p1, p2] = coordinates;
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const headLen = 13;
        const left = {
          x: p2.x - headLen * Math.cos(angle - Math.PI / 6),
          y: p2.y - headLen * Math.sin(angle - Math.PI / 6),
        };
        const right = {
          x: p2.x - headLen * Math.cos(angle + Math.PI / 6),
          y: p2.y - headLen * Math.sin(angle + Math.PI / 6),
        };
        return [
          {
            type: 'line',
            attrs: { coordinates: [p1, p2] },
            styles: { color: ls.color, size: ls.size, style: ls.style, dashedValue: ls.dashedValue },
          },
          {
            type: 'polygon',
            attrs: { coordinates: [p2, left, right] },
            styles: { style: 'fill', color: ls.color },
          },
        ];
      }
      return [];
    },
  });

  // 6. Price & Bar Measure Ruler
  registerOverlay({
    name: 'measureRuler',
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ coordinates, overlay }) => {
      if (coordinates.length === 2 && overlay.points.length >= 2) {
        const [c1, c2] = coordinates;
        const [p1, p2] = overlay.points;
        const v1 = p1.value ?? 0;
        const v2 = p2.value ?? 0;
        const priceDiff = v2 - v1;
        const pct = v1 !== 0 ? (priceDiff / v1) * 100 : 0;
        const barDiff = Math.abs((p2.dataIndex ?? 0) - (p1.dataIndex ?? 0));
        const isUp = priceDiff >= 0;

        const x = Math.min(c1.x, c2.x);
        const y = Math.min(c1.y, c2.y);
        const width = Math.abs(c2.x - c1.x);
        const height = Math.abs(c2.y - c1.y);

        const bg = isUp ? 'rgba(38, 166, 154, 0.2)' : 'rgba(239, 83, 80, 0.2)';
        const accent = isUp ? '#26a69a' : '#ef5350';
        const sign = isUp ? '+' : '';
        const label = `${sign}${priceDiff.toFixed(2)} (${sign}${pct.toFixed(2)}%) · ${barDiff} bars`;

        return [
          {
            type: 'rect',
            attrs: { x, y, width, height },
            styles: { style: 'stroke_fill', color: bg, borderColor: accent, borderSize: 1 },
          },
          {
            type: 'line',
            attrs: {
              coordinates: [
                { x: c1.x, y: (c1.y + c2.y) / 2 },
                { x: c2.x, y: (c1.y + c2.y) / 2 },
              ],
            },
            styles: { style: 'dashed', color: accent, size: 1 },
          },
          {
            type: 'line',
            attrs: {
              coordinates: [
                { x: (c1.x + c2.x) / 2, y: c1.y },
                { x: (c1.x + c2.x) / 2, y: c2.y },
              ],
            },
            styles: { style: 'dashed', color: accent, size: 1 },
          },
          {
            type: 'text',
            ignoreEvent: true,
            attrs: {
              x: (c1.x + c2.x) / 2,
              y: isUp ? y - 12 : y + height + 12,
              text: label,
              align: 'center',
              baseline: 'middle',
            },
            styles: {
              color: '#ffffff',
              backgroundColor: accent,
              paddingLeft: 8,
              paddingRight: 8,
              paddingTop: 4,
              paddingBottom: 4,
              borderRadius: 4,
              size: 11,
              family: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
            },
          },
        ];
      }
      return [];
    },
  });

  // 7. Trend-Based Fibonacci Extension (3 Points)
  registerOverlay({
    name: 'fibExtension',
    totalStep: 4,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ coordinates, overlay, bounding }) => {
      const figures: Array<{
        type: string;
        attrs: unknown;
        styles?: unknown;
        ignoreEvent?: boolean;
      }> = [];

      if (coordinates.length >= 2) {
        figures.push({
          type: 'line',
          attrs: { coordinates: coordinates.slice(0, 3) },
          styles: { style: 'dashed', color: '#787b86', size: 1 },
        });
      }

      if (coordinates.length === 3 && overlay.points.length >= 3) {
        const [p0, p1, p2] = overlay.points;
        const [c0, c1, c2] = coordinates;
        const valDiff = (p1.value ?? 0) - (p0.value ?? 0);
        const yDiff = c1.y - c0.y;
        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.272, 1.618, 2.618];
        const colors = [
          '#787b86',
          '#ef5350',
          '#f59e0b',
          '#22c55e',
          '#26a69a',
          '#2962ff',
          '#94a3b8',
          '#ab47bc',
          '#ec4899',
          '#06b6d4',
        ];

        levels.forEach((lvl, idx) => {
          const y = c2.y + yDiff * lvl;
          const price = (p2.value ?? 0) + valDiff * lvl;
          const color = colors[idx % colors.length];
          figures.push(
            {
              type: 'line',
              attrs: {
                coordinates: [
                  { x: Math.min(c2.x, bounding.width), y },
                  { x: bounding.width, y },
                ],
              },
              styles: { color, size: 1 },
            },
            {
              type: 'text',
              ignoreEvent: true,
              attrs: {
                x: c2.x + 6,
                y: y - 4,
                text: `${lvl} (${price.toFixed(2)})`,
                align: 'left',
                baseline: 'bottom',
              },
              styles: {
                color,
                size: 11,
                backgroundColor: 'transparent',
                family: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
              },
            }
          );
        });
      }
      return figures;
    },
  });

  // 8. ABCD Pattern (4 Points)
  registerOverlay({
    name: 'abcdPattern',
    totalStep: 5,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ coordinates, overlay }) => {
      const ls = readCustomOverlayLineStyle(overlay, '#ffffff', 2);
      const labels = ['A', 'B', 'C', 'D'];
      const figures: Array<{
        type: string;
        attrs: unknown;
        styles?: unknown;
        ignoreEvent?: boolean;
      }> = [];

      if (coordinates.length >= 2) {
        figures.push({
          type: 'line',
          attrs: { coordinates },
          styles: { color: ls.color, size: ls.size, style: ls.style, dashedValue: ls.dashedValue },
        });
      }
      if (coordinates.length >= 3) {
        figures.push({
          type: 'line',
          attrs: { coordinates: [coordinates[0], coordinates[2]] },
          styles: { style: 'dashed', color: '#787b86', size: 1 },
        });
      }
      if (coordinates.length === 4) {
        figures.push({
          type: 'line',
          attrs: { coordinates: [coordinates[1], coordinates[3]] },
          styles: { style: 'dashed', color: '#787b86', size: 1 },
        });
      }
      coordinates.forEach((c, idx) => {
        figures.push({
          type: 'text',
          ignoreEvent: true,
          attrs: { x: c.x, y: c.y - 12, text: labels[idx] ?? '', align: 'center', baseline: 'bottom' },
          styles: {
            color: '#ffffff',
            backgroundColor: '#1e222d',
            borderColor: ls.color,
            borderSize: 1,
            paddingLeft: 5,
            paddingRight: 5,
            paddingTop: 2,
            paddingBottom: 2,
            borderRadius: 3,
            size: 11,
          },
        });
      });
      return figures;
    },
  });

  // 9. XABCD Harmonic Pattern (5 Points)
  registerOverlay({
    name: 'xabcdPattern',
    totalStep: 6,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ coordinates, overlay }) => {
      const ls = readCustomOverlayLineStyle(overlay, '#ffffff', 2);
      const labels = ['X', 'A', 'B', 'C', 'D'];
      const figures: Array<{
        type: string;
        attrs: unknown;
        styles?: unknown;
        ignoreEvent?: boolean;
      }> = [];

      if (coordinates.length >= 3) {
        figures.push({
          type: 'polygon',
          attrs: { coordinates: [coordinates[0], coordinates[1], coordinates[2]] },
          styles: {
            style: 'fill',
            color: hexWithOpacity(ls.color, 14),
          },
        });
      }
      if (coordinates.length >= 5) {
        figures.push({
          type: 'polygon',
          attrs: { coordinates: [coordinates[2], coordinates[3], coordinates[4]] },
          styles: {
            style: 'fill',
            color: 'rgba(38, 166, 154, 0.16)',
          },
        });
      }
      if (coordinates.length >= 2) {
        figures.push({
          type: 'line',
          attrs: { coordinates },
          styles: { color: ls.color, size: ls.size, style: ls.style, dashedValue: ls.dashedValue },
        });
      }
      if (coordinates.length >= 4) {
        figures.push({
          type: 'line',
          attrs: { coordinates: [coordinates[1], coordinates[3]] },
          styles: { style: 'dashed', color: '#787b86', size: 1 },
        });
      }
      if (coordinates.length >= 5) {
        figures.push({
          type: 'line',
          attrs: { coordinates: [coordinates[0], coordinates[4]] },
          styles: { style: 'dashed', color: '#787b86', size: 1 },
        });
      }
      coordinates.forEach((c, idx) => {
        figures.push({
          type: 'text',
          ignoreEvent: true,
          attrs: { x: c.x, y: c.y - 12, text: labels[idx] ?? '', align: 'center', baseline: 'bottom' },
          styles: {
            color: '#ffffff',
            backgroundColor: '#1e293b',
            paddingLeft: 5,
            paddingRight: 5,
            paddingTop: 2,
            paddingBottom: 2,
            borderRadius: 3,
            size: 11,
          },
        });
      });
      return figures;
    },
  });

  // 10 & 11. Long & Short Risk/Reward Position Tools (3 Points: Entry -> Target -> Stop)
  const registerPositionTool = (name: string, isLong: boolean) => {
    registerOverlay({
      name,
      totalStep: 4,
      needDefaultPointFigure: true,
      needDefaultXAxisFigure: true,
      needDefaultYAxisFigure: true,
      createPointFigures: ({ coordinates, overlay }) => {
        if (coordinates.length < 2) return [];
        const cEntry = coordinates[0];
        const cTarget = coordinates[1];
        const cStop = coordinates[2] ?? {
          x: cTarget.x,
          y: cEntry.y + (cEntry.y - cTarget.y) * 0.5,
        };

        const xLeft = Math.min(cEntry.x, cTarget.x);
        const width = Math.max(Math.abs(cTarget.x - cEntry.x), 96);

        const entryVal = overlay.points[0]?.value ?? 0;
        const targetVal = overlay.points[1]?.value ?? entryVal;
        const stopVal = overlay.points[2]?.value ?? entryVal;

        const reward = Math.abs(targetVal - entryVal);
        const risk = Math.abs(entryVal - stopVal);
        const rr = risk > 0 ? (reward / risk).toFixed(2) : '—';
        const profitPct = entryVal ? ((reward / entryVal) * 100).toFixed(2) : '0.00';
        const lossPct = entryVal ? ((risk / entryVal) * 100).toFixed(2) : '0.00';

        const profitY = Math.min(cEntry.y, cTarget.y);
        const profitH = Math.abs(cTarget.y - cEntry.y);
        const lossY = Math.min(cEntry.y, cStop.y);
        const lossH = Math.abs(cStop.y - cEntry.y);

        return [
          {
            type: 'rect',
            attrs: { x: xLeft, y: profitY, width, height: profitH },
            styles: {
              style: 'stroke_fill',
              color: 'rgba(38, 166, 154, 0.22)',
              borderColor: '#26a69a',
              borderSize: 1,
            },
          },
          {
            type: 'rect',
            attrs: { x: xLeft, y: lossY, width, height: lossH },
            styles: {
              style: 'stroke_fill',
              color: 'rgba(239, 83, 80, 0.22)',
              borderColor: '#ef5350',
              borderSize: 1,
            },
          },
          {
            type: 'line',
            attrs: {
              coordinates: [
                { x: xLeft, y: cEntry.y },
                { x: xLeft + width, y: cEntry.y },
              ],
            },
            styles: { color: '#cbd5e1', size: 1.5 },
          },
          {
            type: 'text',
            ignoreEvent: true,
            attrs: {
              x: xLeft + width / 2,
              y: cEntry.y,
              text: `${isLong ? 'LONG' : 'SHORT'} · R:R ${rr} · TP +${profitPct}% / SL -${lossPct}%`,
              align: 'center',
              baseline: 'middle',
            },
            styles: {
              color: '#ffffff',
              backgroundColor: '#1e222d',
              paddingLeft: 8,
              paddingRight: 8,
              paddingTop: 4,
              paddingBottom: 4,
              borderRadius: 3,
              size: 11,
              family: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
            },
          },
        ];
      },
    });
  };

  registerPositionTool('longPosition', true);
  registerPositionTool('shortPosition', false);

  // 12. TradingView Text Callout (Interactive, clickable, draggable, editable note)
  registerOverlay({
    name: 'simpleAnnotation',
    totalStep: 2,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ overlay, coordinates, bounding }) => {
      if (coordinates.length < 1) return [];
      const c = coordinates[0];
      const ls = readCustomOverlayLineStyle(overlay, '#ffffff', 1.5);
      const rawText =
        typeof overlay.extendData === 'string'
          ? overlay.extendData
          : typeof overlay.extendData === 'function'
            ? String((overlay.extendData as (ov: Overlay<unknown>) => string)(overlay) ?? '')
            : '';
      const displayText = rawText.trim().length > 0 ? rawText : 'Text';

      // Flip callout downward if anchor is near top edge so the note stays inside the pane
      const dirUp = c.y >= 78;
      const stemEndY = dirUp ? c.y - 42 : c.y + 42;
      const boxX = Math.max(48, Math.min(Math.max(48, bounding.width - 48), c.x));
      const dotRadius = Math.max(3, ls.size + 1.5);

      return [
        {
          type: 'line',
          attrs: {
            coordinates: [
              { x: c.x, y: c.y },
              { x: boxX, y: stemEndY },
            ],
          },
          styles: {
            color: ls.color,
            size: ls.size,
            style: ls.style,
            dashedValue: ls.dashedValue,
          },
        },
        {
          type: 'circle',
          attrs: {
            x: c.x,
            y: c.y,
            r: dotRadius,
          },
          styles: {
            style: 'fill',
            color: ls.color,
          },
        },
        {
          type: 'text',
          attrs: {
            x: boxX,
            y: stemEndY,
            text: displayText,
            align: 'center',
            baseline: dirUp ? 'bottom' : 'top',
          },
          styles: {
            style: 'stroke_fill',
            color: '#f8fafc',
            backgroundColor: '#131722',
            borderColor: ls.color,
            borderSize: Math.max(1.5, ls.size),
            paddingLeft: 10,
            paddingRight: 10,
            paddingTop: 6,
            paddingBottom: 6,
            borderRadius: 6,
            size: 12,
            weight: '500',
            family: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
          },
        },
      ];
    },
  });

  // 13. TradingView Plain Text (Interactive, clickable, draggable, editable chart text)
  registerOverlay({
    name: 'plainText',
    totalStep: 2,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ overlay, coordinates }) => {
      if (coordinates.length < 1) return [];
      const c = coordinates[0];
      const ls = readCustomOverlayLineStyle(overlay, '#ffffff', 1.5);
      const rawText = typeof overlay.extendData === 'string' ? overlay.extendData : '';
      const displayText = rawText.trim().length > 0 ? rawText : 'Text';
      const fontSize = Math.round(12 + Math.max(0, ls.size - 1) * 2.5);

      return [
        {
          type: 'text',
          attrs: {
            x: c.x,
            y: c.y,
            text: displayText,
            align: 'center',
            baseline: 'middle',
          },
          styles: {
            style: 'fill',
            color: ls.color,
            backgroundColor: 'rgba(14, 17, 23, 0.45)',
            paddingLeft: 6,
            paddingRight: 6,
            paddingTop: 4,
            paddingBottom: 4,
            borderRadius: 4,
            size: fontSize,
            weight: '600',
            family: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
          },
        },
      ];
    },
  });

  // 14. TradingView Flag Mark (Vertical pole + notched pennant flag, color/thickness customizable)
  registerOverlay({
    name: 'flagMark',
    totalStep: 2,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    createPointFigures: ({ overlay, coordinates }) => {
      if (coordinates.length < 1) return [];
      const c = coordinates[0];
      const ls = readCustomOverlayLineStyle(overlay, '#ffffff', 1.5);
      const dirUp = c.y >= 54;
      const poleTopY = dirUp ? c.y - 36 : c.y + 36;
      const flagTopY = dirUp ? poleTopY : poleTopY - 15;
      const flagBottomY = flagTopY + 15;
      const flagMidY = flagTopY + 7.5;
      const flagRightX = c.x + 24;
      const notchX = c.x + 18;

      return [
        {
          type: 'line',
          attrs: {
            coordinates: [
              { x: c.x, y: c.y },
              { x: c.x, y: poleTopY },
            ],
          },
          styles: {
            color: ls.color,
            size: Math.max(1.5, ls.size),
            style: ls.style,
            dashedValue: ls.dashedValue,
          },
        },
        {
          type: 'circle',
          attrs: {
            x: c.x,
            y: c.y,
            r: Math.max(3, ls.size + 1.2),
          },
          styles: {
            style: 'fill',
            color: ls.color,
          },
        },
        {
          type: 'polygon',
          attrs: {
            coordinates: [
              { x: c.x, y: flagTopY },
              { x: flagRightX, y: flagTopY },
              { x: notchX, y: flagMidY },
              { x: flagRightX, y: flagBottomY },
              { x: c.x, y: flagBottomY },
            ],
          },
          styles: {
            style: 'stroke_fill',
            color: hexWithOpacity(ls.color, 85),
            borderColor: ls.color,
            borderSize: Math.max(1.2, ls.size),
          },
        },
      ];
    },
  });

  // 15. Interactive Resizable Chart Image Annotation (Local uploaded images only; drag body to move, drag corners to resize)
  registerOverlay({
    name: 'chartImage',
    totalStep: 2,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    performEventPressedMove: ({ points, performPointIndex, performPoint }) => {
      if (points[performPointIndex]) {
        points[performPointIndex] = {
          ...(typeof performPoint.timestamp === 'number'
            ? { timestamp: performPoint.timestamp }
            : {}),
          ...(typeof performPoint.dataIndex === 'number'
            ? { dataIndex: performPoint.dataIndex }
            : {}),
          ...(typeof performPoint.value === 'number' ? { value: performPoint.value } : {}),
        };
      }
    },
    createPointFigures: ({ chart, overlay, coordinates }) => {
      if (coordinates.length < 1) return [];
      const ls = readCustomOverlayLineStyle(overlay, '#ffffff', 1.5);
      const data = readChartImageExtendData(overlay.extendData);

      let x = 0;
      let y = 0;
      let width = data.width ?? 200;
      let height = data.height ?? 130;

      if (coordinates.length >= 2) {
        const c0 = coordinates[0];
        const c1 = coordinates[1];
        x = Math.round(Math.min(c0.x, c1.x));
        y = Math.round(Math.min(c0.y, c1.y));
        width = Math.max(40, Math.round(Math.abs(c1.x - c0.x)));
        height = Math.max(40, Math.round(Math.abs(c1.y - c0.y)));
      } else {
        const c = coordinates[0];
        x = Math.round(c.x - width / 2);
        y = Math.round(c.y - height / 2);
      }

      if (data.src && data.src.startsWith('data:image/') && !annotationImageCache.has(data.src) && typeof Image !== 'undefined') {
        const img = new Image();
        const entry: CachedAnnotationImage = { img, status: 'loading' };
        annotationImageCache.set(data.src, entry);
        img.onload = () => {
          entry.status = 'loaded';
          try {
            chart.overrideOverlay({ id: overlay.id });
          } catch {
            // Ignore if chart or overlay was already disposed
          }
        };
        img.onerror = () => {
          entry.status = 'error';
          try {
            chart.overrideOverlay({ id: overlay.id });
          } catch {
            // Ignore if chart or overlay was already disposed
          }
        };
        img.src = data.src;
      }

      return [
        {
          type: 'chartImageBox',
          attrs: {
            x,
            y,
            width,
            height,
            src: data.src.startsWith('data:image/') ? data.src : '',
            borderColor: ls.color,
            borderSize: ls.size,
          },
        },
      ];
    },
  });

  // 16. Enhanced Freehand Brush (smooth quadratic curve, 11px hit-test, and right-margin drag support)
  registerOverlay({
    name: 'brush',
    totalStep: 2,
    drawingMode: 'continuous',
    needDefaultPointFigure: false,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,
    createPointFigures: ({ overlay, coordinates }) => {
      if (coordinates.length < 2) return [];
      const ls = readCustomOverlayLineStyle(overlay, '#ffffff', 2);
      return [
        {
          type: 'freehandStroke',
          attrs: {
            coordinates,
            color: ls.color,
            size: ls.size,
            style: ls.style,
            dashedValue: ls.dashedValue,
          },
        },
      ];
    },
  });
}
