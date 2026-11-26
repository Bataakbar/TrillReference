import {
  registerIndicator,
  type DeepPartial,
  type IndicatorCreate,
  type IndicatorStyle,
  type KLineData,
} from 'klinecharts';
import {
  EMA_SMA_SLOT_KEYS,
  calcATRSeries,
  calcEmaSmaMultiSeries,
  calcMovingAverageSeries,
  calcSupertrendSeries,
  calcVWAPSeries,
  createDefaultEmaSmaSlots,
  getActiveVolumeSlots,
  hexWithOpacity,
  isIndicatorVisibleForTimeframe,
  lineDashToKLine,
  type EmaSmaSlot,
  type IndicatorInstance,
  type IndicatorPlotStyle,
  type MovingAverageType,
  type PriceSource,
  type VwapAnchorMode,
} from './indicatorModel';

export * from './indicatorModel';

export interface VwapExtendData {
  vwapAnchor: VwapAnchorMode;
}

export interface SupertrendExtendData {
  plots: IndicatorPlotStyle[];
}

export interface FlexMAExtendData {
  maType: MovingAverageType;
  source: PriceSource;
  offset: number;
}

export interface EmaSmaExtendData {
  slots: EmaSmaSlot[];
  source: PriceSource;
  calcSignature: string;
}

function buildEmaSmaCalcSignature(slots: EmaSmaSlot[], source: PriceSource): string {
  return `${source}|${slots.map((s) => `${s.key}:${s.maType}:${s.length}:${s.enabled ? 1 : 0}`).join(',')}`;
}

let customIndicatorsRegistered = false;

export function registerCustomIndicators(): void {
  if (customIndicatorsRegistered) return;
  customIndicatorsRegistered = true;

  // Single flexible MA (EMA / SMA / WMA / RMA / HMA / VWMA)
  registerIndicator<{ ma?: number }, number, FlexMAExtendData>({
    name: 'FLEX_MA',
    shortName: 'EMA',
    series: 'price',
    calcParams: [20],
    figures: [{ key: 'ma', title: 'MA: ', type: 'line' }],
    shouldUpdate: (prev, current) => {
      const calcChanged =
        prev.calcParams?.[0] !== current.calcParams?.[0] ||
        prev.extendData?.maType !== current.extendData?.maType ||
        prev.extendData?.source !== current.extendData?.source ||
        prev.extendData?.offset !== current.extendData?.offset;
      return { calc: calcChanged, draw: true };
    },
    createTooltipDataSource: () => ({
      name: '',
      calcParamsText: '',
      features: [],
      legends: [],
    }),
    calc: (dataList: KLineData[], indicator) => {
      const length = Number(indicator.calcParams[0]) || 20;
      const ext = indicator.extendData ?? { maType: 'EMA', source: 'close', offset: 0 };
      const series = calcMovingAverageSeries(
        dataList,
        ext.maType ?? 'EMA',
        length,
        ext.source ?? 'close',
        ext.offset ?? 0
      );
      return series.map((val) => (val !== undefined ? { ma: val } : {}));
    },
  });

  // TradingView-style Multi-Line EMA/SMA Ribbon (EMA1..EMA8 + SMA1..SMA4)
  registerIndicator<Record<string, number>, number, EmaSmaExtendData>({
    name: 'EMA_SMA',
    shortName: 'EMA/SMA',
    series: 'price',
    calcParams: [10, 20, 50, 200, 150, 250, 124, 0, 65, 30, 100, 200],
    figures: EMA_SMA_SLOT_KEYS.map((key) => ({
      key,
      title: `${key.toUpperCase()}: `,
      type: 'line',
    })),
    shouldUpdate: (prev, current) => {
      const calcChanged = prev.extendData?.calcSignature !== current.extendData?.calcSignature;
      return { calc: calcChanged, draw: true };
    },
    createTooltipDataSource: () => ({
      name: '',
      calcParamsText: '',
      features: [],
      legends: [],
    }),
    calc: (dataList: KLineData[], indicator) => {
      const slots = indicator.extendData?.slots ?? createDefaultEmaSmaSlots();
      const source = indicator.extendData?.source ?? 'close';
      return calcEmaSmaMultiSeries(dataList, slots, source);
    },
    draw: ({ ctx, chart, indicator, xAxis, yAxis }) => {
      if (!indicator.visible) return true;
      const slots = indicator.extendData?.slots ?? createDefaultEmaSmaSlots();
      const result = indicator.result;
      if (!result || result.length === 0) return true;

      const visibleRange = chart.getVisibleRange();
      const startIdx = Math.max(0, visibleRange.from - 2);
      const endIdx = Math.min(result.length - 1, visibleRange.to + 2);
      if (endIdx < startIdx) return true;

      ctx.save();
      for (const slot of slots) {
        if (!slot.enabled || slot.length <= 0) continue;

        const strokeColor = hexWithOpacity(slot.color, slot.opacity);
        const dash = lineDashToKLine(slot.lineStyle);

        // Collect visible coordinate points for this slot
        const pts: Array<{ x: number; y: number }> = [];
        for (let i = startIdx; i <= endIdx; i++) {
          const val = result[i]?.[slot.key];
          if (typeof val === 'number' && Number.isFinite(val)) {
            pts.push({
              x: xAxis.convertToPixel(i),
              y: yAxis.convertToPixel(val),
            });
          }
        }
        if (pts.length === 0) continue;

        ctx.strokeStyle = strokeColor;
        ctx.fillStyle = strokeColor;
        ctx.lineWidth = slot.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash(dash.style === 'dashed' ? dash.dashedValue : []);

        if (slot.plotType === 'circles') {
          const radius = Math.max(1.5, slot.lineWidth * 1.15);
          for (const pt of pts) {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (slot.plotType === 'step') {
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let j = 1; j < pts.length; j++) {
            ctx.lineTo(pts[j].x, pts[j - 1].y);
            ctx.lineTo(pts[j].x, pts[j].y);
          }
          ctx.stroke();
        } else if (slot.plotType === 'smooth' && pts.length > 2) {
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let j = 1; j < pts.length - 1; j++) {
            const xc = (pts[j].x + pts[j + 1].x) / 2;
            const yc = (pts[j].y + pts[j + 1].y) / 2;
            ctx.quadraticCurveTo(pts[j].x, pts[j].y, xc, yc);
          }
          const last = pts[pts.length - 1];
          ctx.lineTo(last.x, last.y);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let j = 1; j < pts.length; j++) {
            ctx.lineTo(pts[j].x, pts[j].y);
          }
          ctx.stroke();
        }
      }
      ctx.restore();
      return true;
    },
  });

  // Session / Weekly VWAP Overlay
  registerIndicator<{ vwap?: number }, number, VwapExtendData>({
    name: 'VWAP',
    shortName: 'VWAP',
    series: 'price',
    calcParams: [],
    figures: [{ key: 'vwap', title: 'VWAP: ', type: 'line' }],
    shouldUpdate: (prev, current) => ({
      calc: prev.extendData?.vwapAnchor !== current.extendData?.vwapAnchor,
      draw: true,
    }),
    createTooltipDataSource: () => ({
      name: '',
      calcParamsText: '',
      features: [],
      legends: [],
    }),
    calc: (dataList: KLineData[], indicator) => {
      const anchor = indicator.extendData?.vwapAnchor ?? 'session';
      const series = calcVWAPSeries(dataList, anchor);
      return series.map((val) => (val !== undefined ? { vwap: val } : {}));
    },
  });

  // Average True Range (ATR) Sub-Pane Volatility Indicator
  registerIndicator<{ atr?: number }, number>({
    name: 'ATR',
    shortName: 'ATR',
    series: 'normal',
    calcParams: [14],
    figures: [{ key: 'atr', title: 'ATR: ', type: 'line' }],
    calc: (dataList: KLineData[], indicator) => {
      const length = Number(indicator.calcParams[0]) || 14;
      const series = calcATRSeries(dataList, length);
      return series.map((val) => (val !== undefined ? { atr: val } : {}));
    },
  });

  // Supertrend Overlay (Separate contiguous green Uptrend and red Downtrend segments)
  registerIndicator<{ up?: number; down?: number; dir?: number }, number, SupertrendExtendData>({
    name: 'SUPERTREND',
    shortName: 'SUPERTREND',
    series: 'price',
    calcParams: [10, 3],
    figures: [
      { key: 'up', title: 'Up: ', type: 'line' },
      { key: 'down', title: 'Down: ', type: 'line' },
    ],
    shouldUpdate: (prev, current) => ({
      calc:
        prev.calcParams?.[0] !== current.calcParams?.[0] ||
        prev.calcParams?.[1] !== current.calcParams?.[1],
      draw: true,
    }),
    createTooltipDataSource: () => ({
      name: '',
      calcParamsText: '',
      features: [],
      legends: [],
    }),
    calc: (dataList: KLineData[], indicator) => {
      const period = Number(indicator.calcParams[0]) || 10;
      const mult = Number(indicator.calcParams[1]) || 3;
      const series = calcSupertrendSeries(dataList, period, mult);
      return series.map((pt) => {
        if (pt.value === undefined || !pt.direction) return {};
        return pt.direction === 1 ? { up: pt.value, dir: 1 } : { down: pt.value, dir: -1 };
      });
    },
    draw: ({ ctx, chart, indicator, xAxis, yAxis }) => {
      if (!indicator.visible) return true;
      const result = indicator.result;
      if (!result || result.length === 0) return true;

      const visibleRange = chart.getVisibleRange();
      const startIdx = Math.max(0, visibleRange.from - 2);
      const endIdx = Math.min(result.length - 1, visibleRange.to + 2);
      if (endIdx < startIdx) return true;

      const plots = indicator.extendData?.plots;
      const upPlot = plots?.[0];
      const downPlot = plots?.[1];

      const drawTrendSegments = (key: 'up' | 'down', color: string, width: number, style: 'solid' | 'dashed' | 'dotted') => {
        const dash = lineDashToKLine(style);
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash(dash.style === 'dashed' ? dash.dashedValue : []);

        let started = false;
        ctx.beginPath();
        for (let i = startIdx; i <= endIdx; i++) {
          const val = result[i]?.[key];
          if (typeof val === 'number' && Number.isFinite(val)) {
            const x = xAxis.convertToPixel(i);
            const y = yAxis.convertToPixel(val);
            if (!started) {
              ctx.moveTo(x, y);
              started = true;
            } else {
              ctx.lineTo(x, y);
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();
        ctx.restore();
      };

      drawTrendSegments('up', upPlot?.color ?? '#089981', upPlot?.lineWidth ?? 2, upPlot?.lineStyle ?? 'solid');
      drawTrendSegments('down', downPlot?.color ?? '#F23645', downPlot?.lineWidth ?? 2, downPlot?.lineStyle ?? 'solid');
      return true;
    },
  });
}

export function buildKLineIndicatorConfig(
  inst: IndicatorInstance,
  activeTimeframe?: string
): IndicatorCreate {
  const effectiveVisible = isIndicatorVisibleForTimeframe(inst, activeTimeframe);

  if (inst.kind === 'EMA_SMA') {
    const slots = inst.slots ?? createDefaultEmaSmaSlots();
    const source = inst.source ?? 'close';
    const lines = slots.map((slot) => {
      const dash = lineDashToKLine(slot.lineStyle);
      return {
        color: hexWithOpacity(slot.color, slot.opacity),
        size: slot.lineWidth,
        style: dash.style,
        dashedValue: dash.dashedValue,
        smooth: slot.plotType === 'smooth',
      };
    });

    return {
      id: inst.id,
      name: 'EMA_SMA',
      shortName: 'EMA/SMA',
      paneId: 'candle_pane',
      calcParams: slots.map((s) => s.length),
      visible: effectiveVisible,
      extendData: {
        slots: slots.map((s) => ({ ...s })),
        source,
        calcSignature: buildEmaSmaCalcSignature(slots, source),
      },
      createTooltipDataSource: () => ({
        name: '',
        calcParamsText: '',
        features: [],
        legends: [],
      }),
      styles: { lines },
    };
  }

  if (inst.kind === 'VOL') {
    const activeSlots = getActiveVolumeSlots(inst);
    const volLines = activeSlots.map((slot) => {
      const dash = lineDashToKLine(slot.lineStyle);
      return {
        color: hexWithOpacity(slot.color, slot.opacity),
        size: slot.lineWidth,
        style: dash.style,
        dashedValue: dash.dashedValue,
        smooth: slot.plotType === 'smooth',
      };
    });
    return {
      id: inst.id,
      name: 'VOL',
      shortName: 'VOL',
      calcParams: activeSlots.map((s) => s.length),
      visible: effectiveVisible,
      styles: {
        lines: volLines,
      },
    };
  }

  const lines = inst.plots.map((plot) => {
    const dash = lineDashToKLine(plot.lineStyle);
    return {
      color: plot.color,
      size: plot.lineWidth,
      style: dash.style,
      dashedValue: dash.dashedValue,
      smooth: plot.smooth,
    };
  });

  const styles: DeepPartial<IndicatorStyle> = {
    lines,
  };

  return {
    id: inst.id,
    name: inst.kind,
    shortName: inst.kind === 'FLEX_MA' ? inst.maType ?? 'EMA' : inst.kind,
    ...(inst.pane === 'main'
      ? {
          paneId: 'candle_pane',
          createTooltipDataSource: () => ({
            name: '',
            calcParamsText: '',
            features: [],
            legends: [],
          }),
        }
      : {}),
    calcParams: inst.params,
    visible: effectiveVisible,
    ...(inst.kind === 'FLEX_MA'
      ? {
          extendData: {
            maType: inst.maType ?? 'EMA',
            source: inst.source ?? 'close',
            offset: inst.offset ?? 0,
          },
        }
      : {}),
    ...(inst.kind === 'VWAP'
      ? {
          extendData: {
            vwapAnchor: inst.vwapAnchor ?? 'session',
          },
        }
      : {}),
    ...(inst.kind === 'SUPERTREND'
      ? {
          extendData: {
            plots: inst.plots.map((p) => ({ ...p })),
          },
        }
      : {}),
    styles,
  };
}
