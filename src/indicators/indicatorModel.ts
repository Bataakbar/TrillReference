import {
  calcATRSeries,
  calcMovingAverageSeries,
  calcSupertrendSeries,
  calcVWAPSeries,
  extractSourceValue,
  type MovingAverageType,
  type OHLCVSourceBar,
  type PriceSource,
  type VwapAnchorMode,
} from '../../shared/movingAverageMath.js';

export {
  calcATRSeries,
  calcMovingAverageSeries,
  calcSupertrendSeries,
  calcVWAPSeries,
  extractSourceValue,
  type MovingAverageType,
  type OHLCVSourceBar,
  type PriceSource,
  type VwapAnchorMode,
};
export type LineDashPreset = 'solid' | 'dashed' | 'dotted';
export type PlotVisualType = 'line' | 'smooth' | 'step' | 'circles';

export interface TimeframeVisibility {
  minutes: boolean;
  hours: boolean;
  days: boolean;
  weeks: boolean;
  months: boolean;
}

export const DEFAULT_TIMEFRAME_VISIBILITY: TimeframeVisibility = {
  minutes: true,
  hours: true,
  days: true,
  weeks: true,
  months: true,
};

export interface EmaSmaSlot {
  key: string;
  label: string;
  maType: MovingAverageType;
  length: number;
  enabled: boolean;
  color: string;
  opacity: number;
  lineWidth: number;
  lineStyle: LineDashPreset;
  plotType: PlotVisualType;
}

export interface IndicatorPlotStyle {
  key: string;
  label: string;
  color: string;
  lineWidth: number;
  lineStyle: LineDashPreset;
  smooth: boolean;
}

export interface IndicatorInstance {
  id: string;
  /** Registered klinecharts indicator name ('EMA_SMA', 'FLEX_MA', 'BOLL', 'MACD', etc.) */
  kind: string;
  pane: 'main' | 'sub';
  visible: boolean;
  /** Timeframe visibility rules (TradingView Visibility tab) */
  visibility?: TimeframeVisibility;
  /** Used when kind === 'EMA_SMA' */
  slots?: EmaSmaSlot[];
  /** Used when kind === 'FLEX_MA' */
  maType?: MovingAverageType;
  /** Used for FLEX_MA and EMA_SMA */
  source?: PriceSource;
  offset?: number;
  /** Used when kind === 'VWAP' */
  vwapAnchor?: VwapAnchorMode;
  /** Numeric calculation parameters (e.g. [20] for FLEX_MA, [20, 2] for BOLL, [12, 26, 9] for MACD) */
  params: number[];
  /** Per-line visual styling */
  plots: IndicatorPlotStyle[];
}

export interface IndicatorParamSpec {
  label: string;
  min: number;
  max: number;
  step?: number;
}

export interface IndicatorCatalogEntry {
  kind: string;
  name: string;
  shortDesc: string;
  pane: 'main' | 'sub';
  allowMultiple: boolean;
  visualShape: 'line' | 'bands' | 'dots' | 'histogram' | 'oscillator' | 'macd';
  paramSpecs: IndicatorParamSpec[];
  defaultParams: number[];
  defaultPlots: IndicatorPlotStyle[];
}

export const MA_TYPE_OPTIONS: ReadonlyArray<{ value: MovingAverageType; label: string }> = [
  { value: 'EMA', label: 'EMA — Exponential Moving Average' },
  { value: 'SMA', label: 'SMA — Simple Moving Average' },
  { value: 'WMA', label: 'WMA — Weighted Moving Average' },
  { value: 'RMA', label: 'RMA — Smoothed Moving Average (SMMA)' },
  { value: 'HMA', label: 'HMA — Hull Moving Average' },
  { value: 'VWMA', label: 'VWMA — Volume Weighted MA' },
];

export const PRICE_SOURCE_OPTIONS: ReadonlyArray<{ value: PriceSource; label: string }> = [
  { value: 'close', label: 'Close' },
  { value: 'open', label: 'Open' },
  { value: 'high', label: 'High' },
  { value: 'low', label: 'Low' },
  { value: 'hl2', label: 'HL2 (High + Low) / 2' },
  { value: 'hlc3', label: 'HLC3 (H + L + C) / 3' },
  { value: 'ohlc4', label: 'OHLC4 (O + H + L + C) / 4' },
];

export const TRADINGVIEW_COLOR_PALETTE: readonly string[] = [
  '#1E88E5',
  '#00BCD4',
  '#D500F9',
  '#00C853',
  '#D4C83B',
  '#FF9800',
  '#EF5350',
  '#E91E63',
  '#9A5B13',
  '#82911A',
  '#5C4DB1',
  '#FFFFFF',
];

export const EMA_SMA_SLOT_KEYS = [
  'ema1',
  'ema2',
  'ema3',
  'ema4',
  'ema5',
  'ema6',
  'ema7',
  'ema8',
  'sma1',
  'sma2',
  'sma3',
  'sma4',
] as const;

/**
 * TradingView EMA/SMA multi-line indicator defaults:
 * 8 EMAs (EMA1..EMA8) + 4 SMAs (SMA1..SMA4), with exact default lengths,
 * checkboxes, and colors matching the TradingView EMA/SMA settings panel.
 */
export function createDefaultEmaSmaSlots(): EmaSmaSlot[] {
  return [
    { key: 'ema1', label: 'EMA1', maType: 'EMA', length: 10, enabled: true, color: '#1E88E5', opacity: 100, lineWidth: 1.5, lineStyle: 'solid', plotType: 'line' },
    { key: 'ema2', label: 'EMA2', maType: 'EMA', length: 20, enabled: true, color: '#00BCD4', opacity: 100, lineWidth: 1.5, lineStyle: 'solid', plotType: 'line' },
    { key: 'ema3', label: 'EMA3', maType: 'EMA', length: 50, enabled: true, color: '#D500F9', opacity: 100, lineWidth: 1.5, lineStyle: 'solid', plotType: 'line' },
    { key: 'ema4', label: 'EMA4', maType: 'EMA', length: 200, enabled: true, color: '#00C853', opacity: 100, lineWidth: 1.5, lineStyle: 'solid', plotType: 'line' },
    { key: 'ema5', label: 'EMA5', maType: 'EMA', length: 150, enabled: false, color: '#8D6E63', opacity: 100, lineWidth: 1.5, lineStyle: 'solid', plotType: 'line' },
    { key: 'ema6', label: 'EMA6', maType: 'EMA', length: 250, enabled: false, color: '#9A5B13', opacity: 100, lineWidth: 1.5, lineStyle: 'solid', plotType: 'line' },
    { key: 'ema7', label: 'EMA7', maType: 'EMA', length: 124, enabled: false, color: '#7E6F86', opacity: 100, lineWidth: 1.5, lineStyle: 'solid', plotType: 'line' },
    { key: 'ema8', label: 'EMA8', maType: 'EMA', length: 0, enabled: false, color: '#9C5A1F', opacity: 100, lineWidth: 1.5, lineStyle: 'solid', plotType: 'line' },
    { key: 'sma1', label: 'SMA1', maType: 'SMA', length: 65, enabled: true, color: '#D4C83B', opacity: 100, lineWidth: 1.5, lineStyle: 'solid', plotType: 'line' },
    { key: 'sma2', label: 'SMA2', maType: 'SMA', length: 30, enabled: false, color: '#82911A', opacity: 100, lineWidth: 1.5, lineStyle: 'solid', plotType: 'line' },
    { key: 'sma3', label: 'SMA3', maType: 'SMA', length: 100, enabled: false, color: '#5C4DB1', opacity: 100, lineWidth: 1.5, lineStyle: 'solid', plotType: 'line' },
    { key: 'sma4', label: 'SMA4', maType: 'SMA', length: 200, enabled: false, color: '#78909C', opacity: 100, lineWidth: 1.5, lineStyle: 'solid', plotType: 'line' },
  ];
}

export function createDefaultVolumeMaSlots(): EmaSmaSlot[] {
  return [
    { key: 'ma1', label: 'MA1', maType: 'SMA', length: 50, enabled: true, color: '#FF9800', opacity: 100, lineWidth: 1.5, lineStyle: 'solid', plotType: 'line' },
    { key: 'ma2', label: 'MA2', maType: 'SMA', length: 20, enabled: false, color: '#2962FF', opacity: 100, lineWidth: 1.5, lineStyle: 'solid', plotType: 'line' },
    { key: 'ma3', label: 'MA3', maType: 'SMA', length: 100, enabled: false, color: '#AB47BC', opacity: 100, lineWidth: 1.5, lineStyle: 'solid', plotType: 'line' },
    { key: 'ma4', label: 'MA4', maType: 'SMA', length: 200, enabled: false, color: '#00C853', opacity: 100, lineWidth: 1.5, lineStyle: 'solid', plotType: 'line' },
  ];
}

export const INDICATOR_CATALOG: readonly IndicatorCatalogEntry[] = [
  {
    kind: 'EMA_SMA',
    name: 'EMA/SMA (Multi-Line Ribbon)',
    shortDesc: '8 EMAs + 4 SMAs with individual length, toggle, color & line style',
    pane: 'main',
    allowMultiple: false,
    visualShape: 'line',
    paramSpecs: [],
    defaultParams: [10, 20, 50, 200, 150, 250, 124, 0, 65, 30, 100, 200],
    defaultPlots: createDefaultEmaSmaSlots().map((s) => ({
      key: s.key,
      label: s.label,
      color: s.color,
      lineWidth: s.lineWidth,
      lineStyle: s.lineStyle,
      smooth: s.plotType === 'smooth',
    })),
  },
  {
    kind: 'FLEX_MA',
    name: 'Single Moving Average (EMA / SMA / WMA / HMA)',
    shortDesc: 'Standalone MA — change type, length, source, offset & line style',
    pane: 'main',
    allowMultiple: true,
    visualShape: 'line',
    paramSpecs: [{ label: 'Length', min: 1, max: 500 }],
    defaultParams: [20],
    defaultPlots: [
      { key: 'ma', label: 'MA Line', color: '#2962FF', lineWidth: 2, lineStyle: 'solid', smooth: false },
    ],
  },
  {
    kind: 'VWAP',
    name: 'VWAP (Volume Weighted Average Price)',
    shortDesc: 'Institutional fair-value benchmark anchored daily or weekly',
    pane: 'main',
    allowMultiple: false,
    visualShape: 'line',
    paramSpecs: [],
    defaultParams: [],
    defaultPlots: [
      { key: 'vwap', label: 'VWAP Line', color: '#F59E0B', lineWidth: 2, lineStyle: 'solid', smooth: false },
    ],
  },
  {
    kind: 'SUPERTREND',
    name: 'Supertrend',
    shortDesc: 'ATR-based trend-following support & resistance trailing line',
    pane: 'main',
    allowMultiple: false,
    visualShape: 'line',
    paramSpecs: [
      { label: 'ATR Period', min: 2, max: 100 },
      { label: 'Multiplier', min: 0.5, max: 10, step: 0.5 },
    ],
    defaultParams: [10, 3],
    defaultPlots: [
      { key: 'up', label: 'Uptrend Line (Bull)', color: '#089981', lineWidth: 2, lineStyle: 'solid', smooth: false },
      { key: 'down', label: 'Downtrend Line (Bear)', color: '#F23645', lineWidth: 2, lineStyle: 'solid', smooth: false },
    ],
  },
  {
    kind: 'BOLL',
    name: 'Bollinger Bands (BOLL)',
    shortDesc: 'Upper, basis & lower volatility envelope',
    pane: 'main',
    allowMultiple: false,
    visualShape: 'bands',
    paramSpecs: [
      { label: 'Length', min: 2, max: 200 },
      { label: 'StdDev Multiplier', min: 1, max: 5, step: 0.5 },
    ],
    defaultParams: [20, 2],
    defaultPlots: [
      { key: 'up', label: 'Upper Band', color: '#2962FF', lineWidth: 1.5, lineStyle: 'solid', smooth: false },
      { key: 'mid', label: 'Basis (Middle)', color: '#FF9800', lineWidth: 1.5, lineStyle: 'dashed', smooth: false },
      { key: 'dn', label: 'Lower Band', color: '#2962FF', lineWidth: 1.5, lineStyle: 'solid', smooth: false },
    ],
  },
  {
    kind: 'SAR',
    name: 'Parabolic SAR',
    shortDesc: 'Stop and reverse trailing trend dots',
    pane: 'main',
    allowMultiple: false,
    visualShape: 'dots',
    paramSpecs: [
      { label: 'Start Step (x100)', min: 1, max: 20 },
      { label: 'Increment (x100)', min: 1, max: 20 },
      { label: 'Max Value (x100)', min: 5, max: 50 },
    ],
    defaultParams: [2, 2, 20],
    defaultPlots: [
      { key: 'sar', label: 'SAR Dots', color: '#00BCD4', lineWidth: 2, lineStyle: 'dotted', smooth: false },
    ],
  },
  {
    kind: 'BBI',
    name: 'Bull & Bear Index (BBI)',
    shortDesc: 'Composite 4-period trend average',
    pane: 'main',
    allowMultiple: false,
    visualShape: 'line',
    paramSpecs: [
      { label: 'Period 1', min: 1, max: 100 },
      { label: 'Period 2', min: 1, max: 100 },
      { label: 'Period 3', min: 1, max: 200 },
      { label: 'Period 4', min: 1, max: 300 },
    ],
    defaultParams: [3, 6, 12, 24],
    defaultPlots: [
      { key: 'bbi', label: 'BBI Line', color: '#AB47BC', lineWidth: 2, lineStyle: 'solid', smooth: false },
    ],
  },
  {
    kind: 'VOL',
    name: 'Volume (VOL)',
    shortDesc: 'Trading volume histogram with multi-line MAs (default MA50)',
    pane: 'sub',
    allowMultiple: false,
    visualShape: 'histogram',
    paramSpecs: [],
    defaultParams: createDefaultVolumeMaSlots().map((s) => s.length),
    defaultPlots: createDefaultVolumeMaSlots().map((s) => ({
      key: s.key,
      label: s.label,
      color: s.color,
      lineWidth: s.lineWidth,
      lineStyle: s.lineStyle,
      smooth: s.plotType === 'smooth',
    })),
  },
  {
    kind: 'MACD',
    name: 'MACD',
    shortDesc: 'Moving average convergence / divergence',
    pane: 'sub',
    allowMultiple: false,
    visualShape: 'macd',
    paramSpecs: [
      { label: 'Fast Length', min: 2, max: 100 },
      { label: 'Slow Length', min: 2, max: 200 },
      { label: 'Signal Smoothing', min: 1, max: 100 },
    ],
    defaultParams: [12, 26, 9],
    defaultPlots: [
      { key: 'dif', label: 'MACD Line (DIF)', color: '#2962FF', lineWidth: 1.5, lineStyle: 'solid', smooth: false },
      { key: 'dea', label: 'Signal Line (DEA)', color: '#FF9800', lineWidth: 1.5, lineStyle: 'solid', smooth: false },
    ],
  },
  {
    kind: 'RSI',
    name: 'Relative Strength Index (RSI)',
    shortDesc: 'Momentum oscillator (0–100)',
    pane: 'sub',
    allowMultiple: false,
    visualShape: 'oscillator',
    paramSpecs: [{ label: 'RSI Length', min: 2, max: 100 }],
    defaultParams: [14],
    defaultPlots: [
      { key: 'rsi1', label: 'RSI Line', color: '#AB47BC', lineWidth: 1.5, lineStyle: 'solid', smooth: false },
    ],
  },
  {
    kind: 'KDJ',
    name: 'Stochastic KDJ',
    shortDesc: 'K, D, and J momentum lines',
    pane: 'sub',
    allowMultiple: false,
    visualShape: 'oscillator',
    paramSpecs: [
      { label: 'Period (N)', min: 2, max: 100 },
      { label: 'K Smooth', min: 1, max: 50 },
      { label: 'D Smooth', min: 1, max: 50 },
    ],
    defaultParams: [9, 3, 3],
    defaultPlots: [
      { key: 'k', label: '%K Line', color: '#2962FF', lineWidth: 1.5, lineStyle: 'solid', smooth: false },
      { key: 'd', label: '%D Line', color: '#FF9800', lineWidth: 1.5, lineStyle: 'solid', smooth: false },
      { key: 'j', label: '%J Line', color: '#E91E63', lineWidth: 1.5, lineStyle: 'solid', smooth: false },
    ],
  },
  {
    kind: 'WR',
    name: 'Williams %R',
    shortDesc: 'Overbought / oversold range oscillator',
    pane: 'sub',
    allowMultiple: false,
    visualShape: 'oscillator',
    paramSpecs: [{ label: 'Length', min: 2, max: 100 }],
    defaultParams: [14],
    defaultPlots: [
      { key: 'wr1', label: 'WR Line', color: '#00BCD4', lineWidth: 1.5, lineStyle: 'solid', smooth: false },
    ],
  },
  {
    kind: 'CCI',
    name: 'Commodity Channel Index (CCI)',
    shortDesc: 'Cyclical price deviation oscillator',
    pane: 'sub',
    allowMultiple: false,
    visualShape: 'oscillator',
    paramSpecs: [{ label: 'Length', min: 2, max: 100 }],
    defaultParams: [20],
    defaultPlots: [
      { key: 'cci', label: 'CCI Line', color: '#26A69A', lineWidth: 1.5, lineStyle: 'solid', smooth: false },
    ],
  },
  {
    kind: 'DMI',
    name: 'Directional Movement (DMI / ADX)',
    shortDesc: '+DI, -DI, and ADX trend strength',
    pane: 'sub',
    allowMultiple: false,
    visualShape: 'oscillator',
    paramSpecs: [
      { label: 'DI Length', min: 2, max: 100 },
      { label: 'ADX Smoothing', min: 2, max: 100 },
    ],
    defaultParams: [14, 14],
    defaultPlots: [
      { key: 'pdi', label: '+DI Line', color: '#26A69A', lineWidth: 1.5, lineStyle: 'solid', smooth: false },
      { key: 'mdi', label: '-DI Line', color: '#EF5350', lineWidth: 1.5, lineStyle: 'solid', smooth: false },
      { key: 'adx', label: 'ADX Line', color: '#FF9800', lineWidth: 1.5, lineStyle: 'solid', smooth: false },
    ],
  },
  {
    kind: 'OBV',
    name: 'On-Balance Volume (OBV)',
    shortDesc: 'Cumulative volume flow',
    pane: 'sub',
    allowMultiple: false,
    visualShape: 'line',
    paramSpecs: [{ label: 'MA Length', min: 2, max: 100 }],
    defaultParams: [30],
    defaultPlots: [
      { key: 'obv', label: 'OBV Line', color: '#2962FF', lineWidth: 1.5, lineStyle: 'solid', smooth: false },
      { key: 'maObv', label: 'OBV MA', color: '#FF9800', lineWidth: 1.2, lineStyle: 'dashed', smooth: false },
    ],
  },
  {
    kind: 'AO',
    name: 'Awesome Oscillator (AO)',
    shortDesc: 'Market momentum histogram',
    pane: 'sub',
    allowMultiple: false,
    visualShape: 'histogram',
    paramSpecs: [
      { label: 'Fast Period', min: 2, max: 50 },
      { label: 'Slow Period', min: 5, max: 100 },
    ],
    defaultParams: [5, 34],
    defaultPlots: [
      { key: 'ao', label: 'AO Histogram', color: '#26A69A', lineWidth: 1.5, lineStyle: 'solid', smooth: false },
    ],
  },
  {
    kind: 'ATR',
    name: 'Average True Range (ATR)',
    shortDesc: 'Market volatility & stop-loss distance measure',
    pane: 'sub',
    allowMultiple: false,
    visualShape: 'line',
    paramSpecs: [{ label: 'ATR Length', min: 2, max: 100 }],
    defaultParams: [14],
    defaultPlots: [
      { key: 'atr', label: 'ATR Line', color: '#F97316', lineWidth: 1.5, lineStyle: 'solid', smooth: false },
    ],
  },
];

export function getCatalogEntry(kind: string): IndicatorCatalogEntry | undefined {
  return INDICATOR_CATALOG.find((entry) => entry.kind === kind);
}

export function createDefaultIndicators(): IndicatorInstance[] {
  const defaultSlots = createDefaultEmaSmaSlots();
  return [
    {
      id: 'ema_sma_default',
      kind: 'EMA_SMA',
      pane: 'main',
      visible: true,
      visibility: { ...DEFAULT_TIMEFRAME_VISIBILITY },
      source: 'close',
      slots: defaultSlots,
      params: defaultSlots.map((s) => s.length),
      plots: defaultSlots.map((s) => ({
        key: s.key,
        label: s.label,
        color: s.color,
        lineWidth: s.lineWidth,
        lineStyle: s.lineStyle,
        smooth: s.plotType === 'smooth',
      })),
    },
    {
      id: 'sub_vol_default',
      kind: 'VOL',
      pane: 'sub',
      visible: true,
      visibility: { ...DEFAULT_TIMEFRAME_VISIBILITY },
      slots: createDefaultVolumeMaSlots(),
      params: createDefaultVolumeMaSlots().map((s) => s.length),
      plots: createDefaultVolumeMaSlots().map((s) => ({
        key: s.key,
        label: s.label,
        color: s.color,
        lineWidth: s.lineWidth,
        lineStyle: s.lineStyle,
        smooth: s.plotType === 'smooth',
      })),
    },
  ];
}

export function createIndicatorInstance(
  kind: string,
  existingCount = 0,
  overrides?: Partial<IndicatorInstance>
): IndicatorInstance {
  const entry = getCatalogEntry(kind) ?? INDICATOR_CATALOG[0];

  if (entry.kind === 'EMA_SMA' || entry.kind === 'VOL') {
    const slots =
      entry.kind === 'VOL' ? createDefaultVolumeMaSlots() : createDefaultEmaSmaSlots();
    return {
      id: `${entry.kind.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      kind: entry.kind,
      pane: entry.pane,
      visible: true,
      visibility: { ...DEFAULT_TIMEFRAME_VISIBILITY },
      ...(entry.kind === 'EMA_SMA' ? { source: 'close' as PriceSource } : {}),
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
      ...overrides,
    };
  }

  const colorCycle = ['#2962FF', '#FF9800', '#E91E63', '#26A69A', '#AB47BC', '#00BCD4', '#FACC15'];
  const lengthCycle = [20, 50, 200, 9, 100];

  const plots = entry.defaultPlots.map((p, idx) => ({
    ...p,
    color:
      entry.kind === 'FLEX_MA' && idx === 0
        ? colorCycle[existingCount % colorCycle.length]
        : p.color,
  }));

  const params =
    entry.kind === 'FLEX_MA'
      ? [lengthCycle[existingCount % lengthCycle.length]]
      : [...entry.defaultParams];

  return {
    id: `${entry.kind.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    kind: entry.kind,
    pane: entry.pane,
    visible: true,
    visibility: { ...DEFAULT_TIMEFRAME_VISIBILITY },
    ...(entry.kind === 'FLEX_MA'
      ? { maType: 'EMA' as MovingAverageType, source: 'close' as PriceSource, offset: 0 }
      : {}),
    ...(entry.kind === 'VWAP' ? { vwapAnchor: 'session' as VwapAnchorMode } : {}),
    params,
    plots,
    ...overrides,
  };
}

export function getIndicatorDisplayTitle(inst: IndicatorInstance): string {
  if (inst.kind === 'EMA_SMA') {
    return 'EMA/SMA';
  }
  if (inst.kind === 'FLEX_MA') {
    const type = inst.maType ?? 'EMA';
    const len = inst.params[0] ?? 20;
    const src = inst.source && inst.source !== 'close' ? ` ${inst.source}` : '';
    const off = inst.offset && inst.offset !== 0 ? ` ${inst.offset > 0 ? `+${inst.offset}` : inst.offset}` : '';
    return `${type} ${len}${src}${off}`;
  }
  if (inst.kind === 'VOL') {
    const active = getActiveVolumeSlots(inst);
    return active.length > 0
      ? `VOL (${active.map((s) => `MA${s.length}`).join(', ')})`
      : 'VOL';
  }
  if (inst.kind === 'VWAP') {
    return inst.vwapAnchor === 'week' ? 'VWAP (Week)' : 'VWAP';
  }
  return `${inst.kind} (${inst.params.join(', ')})`;
}

export function getActiveEmaSmaSlots(inst: IndicatorInstance): EmaSmaSlot[] {
  if (inst.kind !== 'EMA_SMA' || !Array.isArray(inst.slots)) return [];
  return inst.slots.filter((s) => s.enabled && s.length > 0);
}

export function getActiveVolumeSlots(inst: IndicatorInstance): EmaSmaSlot[] {
  if (inst.kind !== 'VOL') return [];
  const slots = Array.isArray(inst.slots) && inst.slots.length > 0
    ? inst.slots
    : createDefaultVolumeMaSlots();
  return slots.filter((s) => s.enabled && s.length > 0);
}

export function isIndicatorVisibleForTimeframe(
  inst: IndicatorInstance,
  timeframeKey?: string
): boolean {
  if (!inst.visible) return false;
  if (!timeframeKey || !inst.visibility) return true;
  const vis = inst.visibility;
  const key = timeframeKey.toLowerCase();
  if (key.endsWith('m') && key !== '1mo' && key !== '3mo') return vis.minutes;
  if (key.endsWith('h')) return vis.hours;
  if (key.endsWith('d')) return vis.days;
  if (key.endsWith('wk') || key.endsWith('w')) return vis.weeks;
  if (key.endsWith('mo') || key.endsWith('y')) return vis.months;
  return true;
}

export function hexWithOpacity(hex: string, opacityPercent: number): string {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(opacityPercent) ? opacityPercent : 100));
  if (clamped >= 100) return hex;
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${(clamped / 100).toFixed(2)})`;
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${(clamped / 100).toFixed(2)})`;
  }
  return hex;
}

export function lineDashToKLine(preset: LineDashPreset): {
  style: 'solid' | 'dashed';
  dashedValue: number[];
} {
  if (preset === 'dashed') return { style: 'dashed', dashedValue: [6, 4] };
  if (preset === 'dotted') return { style: 'dashed', dashedValue: [2, 3] };
  return { style: 'solid', dashedValue: [] };
}

/**
 * Computes all enabled EMA1..EMA8 & SMA1..SMA4 lines in a single pass for the EMA/SMA indicator.
 * Slots with enabled === false or length <= 0 are omitted cleanly.
 */
export function calcEmaSmaMultiSeries(
  bars: OHLCVSourceBar[],
  slots: EmaSmaSlot[],
  source: PriceSource = 'close'
): Array<Record<string, number>> {
  const output: Array<Record<string, number>> = Array.from({ length: bars.length }, () => ({}));

  for (const slot of slots) {
    if (!slot.enabled || !Number.isFinite(slot.length) || slot.length <= 0) {
      continue;
    }
    const series = calcMovingAverageSeries(bars, slot.maType, Math.round(slot.length), source, 0);
    for (let i = 0; i < series.length; i++) {
      const val = series[i];
      if (val !== undefined && Number.isFinite(val)) {
        output[i][slot.key] = val;
      }
    }
  }

  return output;
}
