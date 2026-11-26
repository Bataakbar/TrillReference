import {
  registerIndicator,
  type DeepPartial,
  type IndicatorCreate,
  type IndicatorStyle,
  type KLineData,
} from 'klinecharts';
import {
  EMA_SMA_SLOT_KEYS,
  calcEmaSmaMultiSeries,
  calcMovingAverageSeries,
  createDefaultEmaSmaSlots,
  getActiveVolumeSlots,
  hexWithOpacity,
  isIndicatorVisibleForTimeframe,
  lineDashToKLine,
  type EmaSmaSlot,
  type IndicatorInstance,
  type MovingAverageType,
  type PriceSource,
} from './indicatorModel';

export * from './indicatorModel';

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
    styles,
  };
}
