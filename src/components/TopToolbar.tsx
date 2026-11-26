import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart2,
  Camera,
  ChevronDown,
  ChevronUp,
  Cloud,
  CloudOff,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  Maximize2,
  Minimize2,
  Moon,
  PanelRight,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Star,
  Sun,
  Trash2,
  User,
  X,
} from 'lucide-react';
import type { CloudSyncStatus } from '../lib/cloudStorage';
import {
  TIMEFRAMES,
  getTimeframeByKey,
  getPricePrecision,
  type TimeframeGroup,
} from '../../shared/timeframes';
import {
  MAX_FAVORITE_TIMEFRAMES,
  loadFavoriteTimeframes,
  saveFavoriteTimeframes,
  toggleFavoriteTimeframe,
} from '../utils/timeframeFavorites';
import {
  INDICATOR_CATALOG,
  getIndicatorDisplayTitle,
  type IndicatorInstance,
} from '../indicators/customIndicators';
import { IndicatorShapeIcon, LineStyleSwatch } from './DrawingToolIcon';
import { FlagRibbonIcon } from './FlagRibbon';
import { getFlagColorMeta, type FlagColor } from '../utils/watchlistModel';
import type {
  ChartCandleType,
  ChartMeta,
  ThemeMode,
  YAxisScaleType,
} from '../types/chart';

const CHART_TYPES: ReadonlyArray<{ key: ChartCandleType; label: string }> = [
  { key: 'candle_solid', label: 'Candles' },
  { key: 'candle_stroke', label: 'Hollow Candles' },
  { key: 'candle_up_stroke', label: 'Up Hollow' },
  { key: 'ohlc', label: 'OHLC Bars' },
  { key: 'area', label: 'Area' },
];

const Y_SCALE_LABELS: Record<YAxisScaleType, string> = {
  normal: 'Auto',
  logarithm: 'Log',
  percentage: '%',
};

interface TopToolbarProps {
  symbol: string;
  meta: ChartMeta | null;
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  chartType: ChartCandleType;
  onChartTypeChange: (ct: ChartCandleType) => void;
  yAxisScale: YAxisScaleType;
  onCycleYAxisScale: () => void;
  indicators: IndicatorInstance[];
  onAddIndicator: (kind: string) => void;
  onToggleSingleIndicator: (kind: string) => void;
  onEditIndicator: (indicator: IndicatorInstance) => void;
  onToggleIndicatorVisible: (id: string) => void;
  onRemoveIndicator: (id: string) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  watchlistOpen: boolean;
  onToggleWatchlist: () => void;
  screenerOpen?: boolean;
  onToggleScreener?: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onScreenshot: () => void;
  onOpenSearch: () => void;
  onOpenChartSettings: () => void;
  activeFlagColor?: FlagColor | null;
  onToggleActiveFlag?: () => void;
  favoriteTimeframes?: string[];
  onFavoriteTimeframesChange?: (keys: string[]) => void;
  username?: string;
  cloudSyncStatus?: CloudSyncStatus;
  onSignOut?: () => void;
}

export default function TopToolbar({
  symbol,
  meta,
  timeframe,
  onTimeframeChange,
  chartType,
  onChartTypeChange,
  yAxisScale,
  onCycleYAxisScale,
  indicators,
  onAddIndicator,
  onToggleSingleIndicator,
  onEditIndicator,
  onToggleIndicatorVisible,
  onRemoveIndicator,
  theme,
  onToggleTheme,
  watchlistOpen,
  onToggleWatchlist,
  screenerOpen = false,
  onToggleScreener,
  isFullscreen,
  onToggleFullscreen,
  onScreenshot,
  onOpenSearch,
  onOpenChartSettings,
  activeFlagColor = null,
  onToggleActiveFlag,
  favoriteTimeframes: controlledFavorites,
  onFavoriteTimeframesChange,
  username,
  cloudSyncStatus = 'idle',
  onSignOut,
}: TopToolbarProps) {
  const [openMenu, setOpenMenu] = useState<
    'timeframes' | 'chartType' | 'indicators' | 'account' | null
  >(null);
  const [internalFavorites, setInternalFavorites] = useState<string[]>(() =>
    loadFavoriteTimeframes()
  );
  const favoriteKeys = controlledFavorites ?? internalFavorites;
  const [collapsedGroups, setCollapsedGroups] = useState<Record<TimeframeGroup, boolean>>({
    minutes: false,
    hours: false,
    days: false,
  });
  const [limitNotice, setLimitNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const toolbarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current !== null) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  const showLimitWarning = (message: string) => {
    setLimitNotice(message);
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setLimitNotice(null);
      noticeTimerRef.current = null;
    }, 4500);
  };

  const handleToggleFavorite = (tfKey: string) => {
    const result = toggleFavoriteTimeframe(favoriteKeys, tfKey);
    if (result.limitExceeded) {
      showLimitWarning(
        `Jumlah favorit sudah terlalu banyak (maksimal ${MAX_FAVORITE_TIMEFRAMES}). Hapus salah satu favorit terlebih dahulu.`
      );
      return;
    }
    if (onFavoriteTimeframesChange) {
      onFavoriteTimeframesChange(result.nextFavorites);
    } else {
      setInternalFavorites(result.nextFavorites);
    }
    saveFavoriteTimeframes(result.nextFavorites);
    if (limitNotice) {
      setLimitNotice(null);
      if (noticeTimerRef.current !== null) {
        window.clearTimeout(noticeTimerRef.current);
        noticeTimerRef.current = null;
      }
    }
  };

  const currentTf = getTimeframeByKey(timeframe) ?? getTimeframeByKey('1d') ?? TIMEFRAMES[0];
  const favoriteTimeframes = TIMEFRAMES.filter((t) => favoriteKeys.includes(t.key));
  const isCurrentFavorite = favoriteKeys.includes(currentTf.key);
  const precision = getPricePrecision(symbol, meta?.price);
  const isPositive = (meta?.change ?? 0) >= 0;

  const groupedTimeframes = {
    minutes: TIMEFRAMES.filter((t) => t.group === 'minutes'),
    hours: TIMEFRAMES.filter((t) => t.group === 'hours'),
    days: TIMEFRAMES.filter((t) => t.group === 'days'),
  };

  const mainCatalog = INDICATOR_CATALOG.filter((c) => c.pane === 'main');
  const subCatalog = INDICATOR_CATALOG.filter((c) => c.pane === 'sub');

  return (
    <header
      ref={toolbarRef}
      className="h-12 shrink-0 flex items-center justify-between gap-2 px-2.5 bg-white dark:bg-[#000000] border-b border-slate-200 dark:border-[#1f2430] select-none z-50"
    >
      {/* Left: Symbol Search & Inline Quote Metadata */}
      <div className="flex items-center gap-1.5 min-w-0">
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label={`Search symbol, current ${symbol}`}
          className="h-8 px-2.5 flex items-center gap-2 rounded bg-slate-100 hover:bg-slate-200/80 dark:bg-[#12151e] dark:hover:bg-[#1d2230] border border-slate-200 dark:border-[#262c3a] text-slate-900 dark:text-[#f0f3fa] text-xs font-semibold tracking-tight transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-slate-500 dark:text-[#8b95a7]" />
          <span className="font-mono font-bold">{symbol}</span>
        </button>

        {onToggleActiveFlag && (
          <button
            type="button"
            onClick={onToggleActiveFlag}
            aria-label={
              activeFlagColor
                ? `Unflag ${symbol} (${getFlagColorMeta(activeFlagColor).listName})`
                : `Flag ${symbol} (Red default)`
            }
            title={
              activeFlagColor
                ? `${getFlagColorMeta(activeFlagColor).listName} (Alt+Enter to unflag)`
                : 'Flag Red default (Alt+Enter)'
            }
            className={`h-8 w-7 rounded flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
              activeFlagColor
                ? 'hover:bg-slate-100 dark:hover:bg-[#1d2230]'
                : 'text-slate-400 hover:text-[#f23645] hover:bg-slate-100 dark:text-[#787b86] dark:hover:bg-[#1d2230]'
            }`}
          >
            <FlagRibbonIcon color={activeFlagColor} className="w-3.5 h-2.5" />
          </button>
        )}

        {meta && (
          <div className="flex items-baseline gap-2 text-xs whitespace-nowrap overflow-hidden">
            <span className="font-mono font-semibold text-xs sm:text-sm text-slate-900 dark:text-[#f0f3fa] tabular-nums">
              {meta.price.toLocaleString(undefined, {
                minimumFractionDigits: precision,
                maximumFractionDigits: precision,
              })}
            </span>
            <span
              className={`hidden sm:inline font-mono font-medium tabular-nums ${
                isPositive ? 'text-[#16a34a] dark:text-[#089981]' : 'text-[#dc2626] dark:text-[#f23645]'
              }`}
            >
              {isPositive ? '+' : ''}
              {meta.change.toFixed(precision)} ({isPositive ? '+' : ''}
              {meta.changePercent.toFixed(2)}%)
            </span>
            <span aria-hidden="true" className="hidden xl:inline text-slate-300 dark:text-[#363e52]">
              ·
            </span>
            <span className="hidden xl:inline text-slate-500 dark:text-[#8b95a7] truncate max-w-[140px]">
              {meta.currency}
              {meta.exchangeName ? ` / ${meta.exchangeName}` : ''}
            </span>
          </div>
        )}

        <div className="h-5 w-px bg-slate-200 dark:bg-[#262c3a] shrink-0" />

        {/* Favorite Timeframe Controls (Max 8 shown on main bar) */}
        <div className="flex items-center gap-0.5">
          {favoriteTimeframes.length > 0 && (
            <div className="hidden md:flex items-center gap-0.5" role="group" aria-label="Favorite timeframes">
              {favoriteTimeframes.map((tf) => {
                const active = timeframe === tf.key;
                return (
                  <button
                    key={tf.key}
                    type="button"
                    onClick={() => {
                      onTimeframeChange(tf.key);
                      setOpenMenu(null);
                    }}
                    aria-pressed={active}
                    className={`h-8 px-2 rounded text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-slate-200 text-slate-900 dark:bg-[#2a2e39] dark:text-[#f0f3fa] font-semibold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#b2b5be] dark:hover:bg-[#1e222d] dark:hover:text-[#f0f3fa]'
                    }`}
                  >
                    {tf.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Complete 18-Timeframe Dropdown (Minutes / Hours / Days with Star Favorites) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenMenu(openMenu === 'timeframes' ? null : 'timeframes')}
              aria-expanded={openMenu === 'timeframes'}
              aria-label={`All timeframes, active ${currentTf.fullLabel}`}
              className={`h-8 px-1.5 flex items-center gap-1 rounded text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                !isCurrentFavorite || openMenu === 'timeframes'
                  ? 'bg-slate-200 text-slate-900 dark:bg-[#2a2e39] dark:text-[#f0f3fa] font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#b2b5be] dark:hover:bg-[#1e222d] dark:hover:text-[#f0f3fa]'
              }`}
            >
              <span className="md:hidden px-0.5">{currentTf.label}</span>
              {!isCurrentFavorite && (
                <span className="hidden md:inline px-0.5">{currentTf.label}</span>
              )}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {openMenu === 'timeframes' && (
              <div
                role="menu"
                aria-label="All timeframes menu"
                className="absolute left-0 top-10 w-[228px] max-h-[calc(100vh-64px)] overflow-y-auto thin-scrollbar rounded-md bg-white dark:bg-[#1e222d] border border-slate-200 dark:border-[#2a2e39] shadow-2xl py-1.5 z-50"
              >
                {(
                  [
                    { key: 'minutes' as const, title: 'MINUTES', items: groupedTimeframes.minutes },
                    { key: 'hours' as const, title: 'HOURS', items: groupedTimeframes.hours },
                    { key: 'days' as const, title: 'DAYS', items: groupedTimeframes.days },
                  ] as const
                ).map((section, idx) => {
                  const isCollapsed = collapsedGroups[section.key];
                  return (
                    <div
                      key={section.key}
                      className={idx > 0 ? 'mt-1 pt-1 border-t border-slate-200 dark:border-[#2a2e39]' : ''}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsedGroups((prev) => ({
                            ...prev,
                            [section.key]: !prev[section.key],
                          }))
                        }
                        aria-expanded={!isCollapsed}
                        className="w-full px-3 py-1.5 flex items-center justify-between text-[11px] font-medium tracking-wider text-slate-500 hover:text-slate-800 dark:text-[#787b86] dark:hover:text-[#b2b5be] transition-colors cursor-pointer"
                      >
                        <span>{section.title}</span>
                        {isCollapsed ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronUp className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {!isCollapsed && (
                        <div className="space-y-0.5 pb-1">
                          {section.items.map((tf) => {
                            const active = timeframe === tf.key;
                            const isFav = favoriteKeys.includes(tf.key);
                            return (
                              <div
                                key={tf.key}
                                className={`group flex items-center mx-1 rounded transition-colors ${
                                  active
                                    ? 'bg-slate-900 text-white dark:bg-[#f0f3fa] dark:text-[#131722] font-medium'
                                    : 'text-slate-700 hover:bg-slate-100 dark:text-[#d1d4dc] dark:hover:bg-[#2a2e39]'
                                }`}
                              >
                                <button
                                  type="button"
                                  role="menuitemradio"
                                  aria-checked={active}
                                  onClick={() => {
                                    onTimeframeChange(tf.key);
                                    setOpenMenu(null);
                                  }}
                                  title={tf.resampleMs ? `${tf.fullLabel} (Resampled)` : tf.fullLabel}
                                  className="flex-1 h-8 pl-2.5 pr-1 text-left text-[13px] truncate cursor-pointer"
                                >
                                  {tf.fullLabel}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleFavorite(tf.key);
                                  }}
                                  aria-label={
                                    isFav
                                      ? `Remove ${tf.fullLabel} from favorites`
                                      : `Add ${tf.fullLabel} to favorites`
                                  }
                                  aria-pressed={isFav}
                                  title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                                  className={`mr-1.5 w-6 h-6 rounded flex items-center justify-center shrink-0 transition-opacity cursor-pointer ${
                                    isFav
                                      ? active
                                        ? 'opacity-100 text-white dark:text-[#131722]'
                                        : 'opacity-100 text-slate-900 dark:text-[#f0f3fa]'
                                      : active
                                        ? 'opacity-80 hover:opacity-100 text-white/80 dark:text-[#131722]/75'
                                        : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 focus-visible:opacity-100 text-slate-400 hover:text-slate-700 dark:text-[#787b86] dark:hover:text-[#f0f3fa]'
                                  }`}
                                >
                                  <Star
                                    className="w-3.5 h-3.5"
                                    fill={isFav ? 'currentColor' : 'none'}
                                    strokeWidth={1.75}
                                  />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div
                  className={`mt-1 pt-1.5 px-3 pb-1 border-t border-slate-200 dark:border-[#2a2e39] flex items-center justify-between text-[11px] transition-colors ${
                    limitNotice
                      ? 'text-amber-600 dark:text-amber-400 font-medium'
                      : 'text-slate-500 dark:text-[#787b86]'
                  }`}
                >
                  <span>Favorit layar utama</span>
                  <span className="tabular-nums font-medium">
                    {favoriteKeys.length}/{MAX_FAVORITE_TIMEFRAMES}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="hidden lg:block h-5 w-px bg-slate-200 dark:bg-[#262c3a] shrink-0" />

        {/* Chart Type Selector */}
        <div className="relative hidden sm:block">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === 'chartType' ? null : 'chartType')}
            aria-expanded={openMenu === 'chartType'}
            aria-label="Chart candle style"
            className={`h-8 px-2 flex items-center gap-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              openMenu === 'chartType'
                ? 'bg-slate-200 text-slate-900 dark:bg-[#2a2e39] dark:text-[#f0f3fa]'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#b2b5be] dark:hover:bg-[#1e222d] dark:hover:text-[#f0f3fa]'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">
              {CHART_TYPES.find((c) => c.key === chartType)?.label ?? 'Candles'}
            </span>
            <ChevronDown className="w-3 h-3" />
          </button>

          {openMenu === 'chartType' && (
            <div
              role="menu"
              aria-label="Chart styles"
              className="absolute left-0 top-10 w-44 rounded-md bg-white dark:bg-[#1e222d] border border-slate-200 dark:border-[#2a2e39] shadow-xl p-1.5 z-50 flex flex-col gap-0.5"
            >
              {CHART_TYPES.map((ct) => (
                <button
                  key={ct.key}
                  type="button"
                  onClick={() => {
                    onChartTypeChange(ct.key);
                    setOpenMenu(null);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                    chartType === ct.key
                      ? 'bg-slate-200 text-slate-900 dark:bg-[#2a2e39] dark:text-[#f0f3fa] font-semibold'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-[#d1d4dc] dark:hover:bg-[#2a2e39]/60'
                  }`}
                >
                  {ct.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* TradingView-Style Flexible Indicators Manager */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === 'indicators' ? null : 'indicators')}
            aria-expanded={openMenu === 'indicators'}
            aria-label={`Technical indicators (${indicators.length} active)`}
            className={`h-8 px-2.5 flex items-center gap-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              openMenu === 'indicators'
                ? 'bg-slate-200 text-slate-900 dark:bg-[#2a2e39] dark:text-[#f0f3fa]'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#b2b5be] dark:hover:bg-[#1e222d] dark:hover:text-[#f0f3fa]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Indicators</span>
            <span className="font-mono text-[11px] text-slate-400 dark:text-[#787b86]">
              ({indicators.length})
            </span>
          </button>

          {openMenu === 'indicators' && (
            <div
              role="menu"
              aria-label="Technical indicators menu"
              className="fixed sm:absolute left-2 right-2 sm:left-0 sm:right-auto top-12 sm:top-10 sm:w-[360px] max-h-[78vh] overflow-y-auto thin-scrollbar rounded-md bg-white dark:bg-[#1e222d] border border-slate-200 dark:border-[#2a2e39] shadow-2xl p-3 z-50 space-y-3"
            >
              {/* Active Indicators with Live Line Preview + Settings Gear */}
              {indicators.length > 0 && (
                <div>
                  <div className="text-[11px] font-medium text-slate-500 dark:text-[#8b95a7] mb-1.5">
                    Active on Chart ({indicators.length})
                  </div>
                  <div className="space-y-1">
                    {indicators.map((inst) => {
                      const title = getIndicatorDisplayTitle(inst);
                      return (
                        <div
                          key={inst.id}
                          className="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-slate-50 dark:bg-[#1e2330] border border-slate-200/80 dark:border-[#2a3142]"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenu(null);
                              onEditIndicator(inst);
                            }}
                            className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                          >
                            <LineStyleSwatch
                              color={inst.visible ? (inst.plots[0]?.color ?? '#2962FF') : '#64748b'}
                              lineWidth={inst.plots[0]?.lineWidth ?? 2}
                              lineStyle={inst.plots[0]?.lineStyle ?? 'solid'}
                              className="w-6 h-3 shrink-0"
                            />
                            <span
                              className={`font-mono text-xs truncate ${
                                inst.visible
                                  ? 'text-slate-900 dark:text-[#e6eaf2] font-medium'
                                  : 'text-slate-400 dark:text-[#667085] line-through'
                              }`}
                            >
                              {title}
                            </span>
                          </button>

                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => onToggleIndicatorVisible(inst.id)}
                              aria-label={inst.visible ? `Hide ${title}` : `Show ${title}`}
                              className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:bg-slate-200/70 dark:text-[#8b95a7] dark:hover:bg-[#2a3142] dark:hover:text-white cursor-pointer"
                            >
                              {inst.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenu(null);
                                onEditIndicator(inst);
                              }}
                              aria-label={`Configure ${title}`}
                              title="Settings (Type, Length, Color, Line Style)"
                              className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:bg-slate-200/70 dark:text-[#8b95a7] dark:hover:bg-[#2a3142] dark:hover:text-white cursor-pointer"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemoveIndicator(inst.id)}
                              aria-label={`Delete ${title}`}
                              className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:bg-red-100 hover:text-red-600 dark:text-[#8b95a7] dark:hover:bg-red-500/20 dark:hover:text-[#ef5350] cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add Overlays (Flexible Multi-Instance Moving Averages + BOLL / SAR / BBI) */}
              <div className={indicators.length > 0 ? 'pt-2.5 border-t border-slate-200 dark:border-[#242a38]' : ''}>
                <div className="text-[11px] font-medium text-slate-500 dark:text-[#8b95a7] mb-1.5">
                  Main Chart Overlays
                </div>
                <div className="space-y-1">
                  {mainCatalog.map((entry) => {
                    const existing = indicators.find((i) => i.kind === entry.kind);
                    const isActive = !entry.allowMultiple && Boolean(existing);
                    return (
                      <button
                        key={entry.kind}
                        type="button"
                        onClick={() => {
                          if (entry.allowMultiple) {
                            onAddIndicator(entry.kind);
                          } else {
                            onToggleSingleIndicator(entry.kind);
                          }
                        }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded text-left transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-slate-200 text-slate-900 dark:bg-[#2a2e39] dark:text-[#f0f3fa]'
                            : 'hover:bg-slate-100 dark:hover:bg-[#2a2e39]/60 text-slate-800 dark:text-[#d5dce8]'
                        }`}
                      >
                        <IndicatorShapeIcon shape={entry.visualShape} className="w-5 h-5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium truncate">{entry.name}</div>
                          <div className="text-[10px] text-slate-500 dark:text-[#788296] truncate">
                            {entry.shortDesc}
                          </div>
                        </div>
                        {entry.allowMultiple ? (
                          <span className="flex items-center gap-0.5 text-[11px] font-medium text-slate-700 dark:text-[#d1d4dc] shrink-0">
                            <Plus className="w-3.5 h-3.5" />
                            Add
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono shrink-0">
                            {isActive ? 'On' : 'Off'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Oscillators & Sub-Pane Indicators */}
              <div className="pt-2.5 border-t border-slate-200 dark:border-[#2a2e39]">
                <div className="text-[11px] font-medium text-slate-500 dark:text-[#8b95a7] mb-1.5">
                  Oscillators & Sub-Panes
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {subCatalog.map((entry) => {
                    const isActive = indicators.some((i) => i.kind === entry.kind);
                    return (
                      <button
                        key={entry.kind}
                        type="button"
                        onClick={() => onToggleSingleIndicator(entry.kind)}
                        aria-pressed={isActive}
                        title={entry.shortDesc}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs border transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-slate-200 border-slate-400 text-slate-900 dark:bg-[#2a2e39] dark:border-[#434651] dark:text-[#f0f3fa] font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-[#131722] dark:border-[#2a2e39] dark:text-[#cbd5e1] dark:hover:bg-[#2a2e39]/60'
                        }`}
                      >
                        <IndicatorShapeIcon shape={entry.visualShape} className="w-4 h-4 shrink-0" />
                        <span className="font-mono truncate">{entry.kind}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {onToggleScreener && (
          <button
            type="button"
            data-testid="screener-toggle-button"
            onClick={onToggleScreener}
            aria-expanded={screenerOpen}
            title="Toggle Stock Screener (EMA 9, Technicals, Valuation)"
            className={`h-8 px-2.5 flex items-center gap-1.5 rounded text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              screenerOpen
                ? 'bg-[#2962ff]/12 border-[#2962ff]/45 text-[#2962ff] dark:text-[#60a5fa]'
                : 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#b2b5be] dark:hover:bg-[#1e2433] dark:hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Screener</span>
          </button>
        )}
      </div>

      {/* Right: Scale, Theme, Watchlist, Screenshot, Fullscreen */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onCycleYAxisScale}
          aria-label={`Price scale mode: ${Y_SCALE_LABELS[yAxisScale]}`}
          title="Cycle Y-Axis Scale (Auto / Log / %)"
          className="hidden md:flex h-8 px-2 items-center rounded text-xs font-mono font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#98a2b3] dark:hover:bg-[#1e2433] dark:hover:text-white transition-colors cursor-pointer"
        >
          {Y_SCALE_LABELS[yAxisScale]}
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
          className="h-8 w-8 flex items-center justify-center rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#98a2b3] dark:hover:bg-[#1e2433] dark:hover:text-white transition-colors cursor-pointer"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={onOpenChartSettings}
          aria-label="Chart settings"
          title="Chart Settings"
          className="h-8 w-8 flex items-center justify-center rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#98a2b3] dark:hover:bg-[#1e2433] dark:hover:text-white transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onScreenshot}
          aria-label="Download chart screenshot"
          title="Screenshot PNG"
          className="hidden sm:flex h-8 w-8 items-center justify-center rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#98a2b3] dark:hover:bg-[#1e2433] dark:hover:text-white transition-colors cursor-pointer"
        >
          <Camera className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          className="hidden sm:flex h-8 w-8 items-center justify-center rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#98a2b3] dark:hover:bg-[#1e2433] dark:hover:text-white transition-colors cursor-pointer"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        <div className="h-5 w-px bg-slate-200 dark:bg-[#262c3a] mx-0.5" />

        {username && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenMenu(openMenu === 'account' ? null : 'account')}
              aria-expanded={openMenu === 'account'}
              aria-label={`Account ${username}`}
              data-testid="account-menu-button"
              title={
                cloudSyncStatus === 'saving'
                  ? 'Menyimpan gambar & setting ke Supabase…'
                  : cloudSyncStatus === 'error'
                    ? 'Sinkronisasi cloud gagal (tersimpan di cache lokal)'
                    : 'Tersinkronisasi dengan Supabase Cloud'
              }
              className={`h-8 px-2 flex items-center gap-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                openMenu === 'account'
                  ? 'bg-slate-200 text-slate-900 dark:bg-[#2a2e39] dark:text-[#f0f3fa]'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#b2b5be] dark:hover:bg-[#1e222d] dark:hover:text-[#f0f3fa]'
              }`}
            >
              {cloudSyncStatus === 'saving' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2962ff]" />
              ) : cloudSyncStatus === 'error' ? (
                <CloudOff className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <Cloud className="w-3.5 h-3.5 text-[#089981]" />
              )}
              <span className="hidden lg:inline font-mono text-[11px]">{username}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {openMenu === 'account' && (
              <div
                role="menu"
                aria-label="User account menu"
                className="absolute right-0 top-10 w-52 rounded-md bg-white dark:bg-[#1e222d] border border-slate-200 dark:border-[#2a2e39] shadow-2xl py-1.5 z-50"
              >
                <div className="px-3 py-2 border-b border-slate-200 dark:border-[#2a2e39]">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-[#f0f3fa]">
                    <User className="w-3.5 h-3.5 text-[#5b9cf6]" />
                    <span className="font-mono truncate">{username}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-[#787b86]">
                    {cloudSyncStatus === 'saving'
                      ? 'Menyimpan ke Supabase…'
                      : cloudSyncStatus === 'error'
                        ? 'Menunggu koneksi ulang cloud'
                        : 'Cloud Sync Aktif (Supabase)'}
                  </p>
                </div>
                {onSignOut && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpenMenu(null);
                      onSignOut();
                    }}
                    className="w-full px-3 py-2 flex items-center gap-2 text-xs font-medium text-[#dc2626] dark:text-[#f23645] hover:bg-slate-100 dark:hover:bg-[#2a2e39] transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar (Sign Out)</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onToggleWatchlist}
          aria-expanded={watchlistOpen}
          aria-label={watchlistOpen ? 'Hide watchlist panel' : 'Show watchlist panel'}
          title="Toggle Watchlist"
          className={`h-8 w-8 flex items-center justify-center rounded transition-colors cursor-pointer ${
            watchlistOpen
              ? 'bg-slate-200 text-slate-900 dark:bg-[#2a2e39] dark:text-[#f0f3fa]'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#b2b5be] dark:hover:bg-[#1e222d] dark:hover:text-[#f0f3fa]'
          }`}
        >
          <PanelRight className="w-4 h-4" />
        </button>
      </div>

      {/* Favorite limit exceeded notification */}
      {limitNotice && (
        <div
          role="alert"
          data-testid="favorite-limit-alert"
          className={`fixed top-14 right-4 z-[70] flex items-start gap-2 px-3 py-2 rounded-md bg-amber-50 dark:bg-[#2a2215] border border-amber-300 dark:border-amber-500/60 text-amber-900 dark:text-amber-200 text-xs font-medium shadow-2xl max-w-[calc(100vw-32px)] ${
            watchlistOpen ? 'lg:right-[308px] lg:max-w-[272px]' : 'sm:right-6 sm:max-w-md'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>{limitNotice}</span>
          <button
            type="button"
            onClick={() => setLimitNotice(null)}
            aria-label="Tutup notifikasi batas favorit"
            className="ml-1 p-0.5 rounded hover:bg-amber-200/60 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </header>
  );
}
