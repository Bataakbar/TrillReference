export type ThemeMode = 'dark' | 'light';

export type ChartCandleType =
  | 'candle_solid'
  | 'candle_stroke'
  | 'candle_up_stroke'
  | 'ohlc'
  | 'area';

export type YAxisScaleType = 'normal' | 'logarithm' | 'percentage';

export type MagnetMode = 'normal' | 'weak_magnet' | 'strong_magnet';

export interface ChartMeta {
  shortName: string;
  currency: string;
  exchangeName: string;
  instrumentType: string;
  price: number;
  prevClose: number;
  change: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
}

export interface SearchQuoteResult {
  symbol: string;
  shortname: string;
  exchange: string;
  type: string;
}

export interface WatchlistQuote {
  symbol: string;
  shortName: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  exchange: string;
  volume?: number;
}

export interface SerializedOverlayPoint {
  timestamp?: number;
  dataIndex?: number;
  value?: number;
}

export interface DrawingOverlayStyle {
  color: string;
  size: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
}

export interface SerializedOverlay {
  name: string;
  points: SerializedOverlayPoint[];
  extendData?: unknown;
  style?: DrawingOverlayStyle;
}

export interface DrawingToolItem {
  key: string;
  label: string;
  hint: string;
}

export interface DrawingToolGroup {
  id: string;
  label: string;
  tools: DrawingToolItem[];
}
