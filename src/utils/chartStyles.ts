import type { DeepPartial, Styles } from 'klinecharts';
import type { ChartCandleType, ThemeMode } from '../types/chart';

export const CHART_SETTINGS_STORAGE_KEY = 'meridian_chart_settings_v1';

export interface ChartDisplaySettings {
  showZoomControls: boolean;
  showGridLines: boolean;
  showCrosshair: boolean;
  showHighLowMarks: boolean;
  showLastPriceLine: boolean;
  showOhlcHeader: boolean;
}

export const DEFAULT_CHART_SETTINGS: ChartDisplaySettings = {
  showZoomControls: true,
  showGridLines: true,
  showCrosshair: true,
  showHighLowMarks: true,
  showLastPriceLine: true,
  showOhlcHeader: true,
};

export function loadChartSettings(): ChartDisplaySettings {
  if (typeof window === 'undefined') return { ...DEFAULT_CHART_SETTINGS };
  try {
    const raw = window.localStorage.getItem(CHART_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CHART_SETTINGS };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_CHART_SETTINGS };
    return {
      showZoomControls:
        typeof parsed.showZoomControls === 'boolean'
          ? parsed.showZoomControls
          : DEFAULT_CHART_SETTINGS.showZoomControls,
      showGridLines:
        typeof parsed.showGridLines === 'boolean'
          ? parsed.showGridLines
          : DEFAULT_CHART_SETTINGS.showGridLines,
      showCrosshair:
        typeof parsed.showCrosshair === 'boolean'
          ? parsed.showCrosshair
          : DEFAULT_CHART_SETTINGS.showCrosshair,
      showHighLowMarks:
        typeof parsed.showHighLowMarks === 'boolean'
          ? parsed.showHighLowMarks
          : DEFAULT_CHART_SETTINGS.showHighLowMarks,
      showLastPriceLine:
        typeof parsed.showLastPriceLine === 'boolean'
          ? parsed.showLastPriceLine
          : DEFAULT_CHART_SETTINGS.showLastPriceLine,
      showOhlcHeader:
        typeof parsed.showOhlcHeader === 'boolean'
          ? parsed.showOhlcHeader
          : DEFAULT_CHART_SETTINGS.showOhlcHeader,
    };
  } catch {
    return { ...DEFAULT_CHART_SETTINGS };
  }
}

export function saveChartSettings(settings: ChartDisplaySettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CHART_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}

export function buildChartStyles(
  theme: ThemeMode,
  candleType: ChartCandleType,
  compact = false,
  settings: ChartDisplaySettings = DEFAULT_CHART_SETTINGS
): DeepPartial<Styles> {
  const isDark = theme === 'dark';

  const gridLine = isDark ? '#222736' : '#eef1f6';
  const axisLine = isDark ? '#2b3142' : '#d8dee9';
  const tickText = isDark ? '#8b95a7' : '#64748b';
  const legendText = isDark ? '#d5dce8' : '#1e293b';
  const crosshairLine = isDark ? '#64748b' : '#94a3b8';
  const crosshairBg = isDark ? '#252b3b' : '#1e293b';
  const upColor = '#089981';
  const downColor = '#f23645';
  const flatColor = '#787b86';

  return {
    grid: {
      show: settings.showGridLines,
      horizontal: { show: settings.showGridLines, size: 1, color: gridLine, style: 'solid' },
      vertical: { show: settings.showGridLines, size: 1, color: gridLine, style: 'solid' },
    },
    candle: {
      type: candleType === 'heikin_ashi' ? 'candle_solid' : candleType,
      bar: {
        upColor,
        downColor,
        noChangeColor: flatColor,
        upBorderColor: upColor,
        downBorderColor: downColor,
        noChangeBorderColor: flatColor,
        upWickColor: upColor,
        downWickColor: downColor,
        noChangeWickColor: flatColor,
      },
      area: {
        lineSize: 2,
        lineColor: '#2962ff',
        backgroundColor: [
          { offset: 0, color: 'rgba(41, 98, 255, 0.02)' },
          { offset: 1, color: 'rgba(41, 98, 255, 0.24)' },
        ],
      },
      priceMark: {
        show: settings.showHighLowMarks || settings.showLastPriceLine,
        high: { show: settings.showHighLowMarks, color: tickText, textSize: 10, textFamily: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif' },
        low: { show: settings.showHighLowMarks, color: tickText, textSize: 10, textFamily: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif' },
        last: {
          show: settings.showLastPriceLine,
          upColor,
          downColor,
          noChangeColor: flatColor,
          line: { show: settings.showLastPriceLine, style: 'dashed', dashedValue: [4, 4], size: 1 },
          text: {
            show: settings.showLastPriceLine,
            color: '#ffffff',
            size: 11,
            family: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
            paddingLeft: 6,
            paddingRight: 6,
            paddingTop: 3,
            paddingBottom: 3,
          },
        },
      },
      tooltip: {
        showRule: !settings.showOhlcHeader ? 'none' : compact ? 'follow_cross' : 'always',
        showType: 'standard',
        legend: {
          size: compact ? 10 : 12,
          family: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
          color: legendText,
        },
      },
    },
    indicator: {
      ohlc: {
        upColor: 'rgba(8, 153, 129, 0.7)',
        downColor: 'rgba(242, 54, 69, 0.7)',
        noChangeColor: flatColor,
      },
      bars: [
        {
          style: 'fill',
          borderStyle: 'solid',
          borderSize: 1,
          borderDashedValue: [2, 2],
          upColor: 'rgba(8, 153, 129, 0.55)',
          downColor: 'rgba(242, 54, 69, 0.55)',
          noChangeColor: flatColor,
        },
      ],
      tooltip: {
        showRule: compact ? 'follow_cross' : 'always',
        legend: {
          size: compact ? 10 : 11,
          family: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
        },
      },
    },
    crosshair: {
      show: settings.showCrosshair,
      horizontal: {
        show: true,
        line: { show: true, style: 'dashed', dashedValue: [4, 3], size: 1, color: crosshairLine },
        text: {
          show: true,
          color: '#ffffff',
          backgroundColor: crosshairBg,
          size: 11,
          family: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
        },
      },
      vertical: {
        show: true,
        line: { show: true, style: 'dashed', dashedValue: [4, 3], size: 1, color: crosshairLine },
        text: {
          show: true,
          color: '#ffffff',
          backgroundColor: crosshairBg,
          size: 11,
          family: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
        },
      },
    },
    xAxis: {
      axisLine: { show: true, color: axisLine },
      tickText: { color: tickText, size: 11, family: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif' },
      tickLine: { show: true, color: axisLine },
    },
    yAxis: {
      axisLine: { show: true, color: axisLine },
      tickText: { color: tickText, size: 11, family: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif' },
      tickLine: { show: true, color: axisLine },
    },
    separator: {
      size: 1,
      color: axisLine,
      activeBackgroundColor: 'rgba(41, 98, 255, 0.2)',
    },
    overlay: {
      line: { color: isDark ? '#ffffff' : '#1e293b', size: 1.5 },
      polygon: {
        color: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(30, 41, 59, 0.14)',
        borderColor: isDark ? '#ffffff' : '#1e293b',
        borderSize: 1.5,
      },
      text: {
        color: isDark ? '#131722' : '#ffffff',
        backgroundColor: isDark ? '#ffffff' : '#1e293b',
        size: 11,
        family: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif',
      },
    },
  };
}
