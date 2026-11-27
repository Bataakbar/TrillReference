import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dispose, init, type Chart, type KLineData, type OverlayEvent } from 'klinecharts';
import {
  Bookmark,
  CandlestickChart,
  Loader2,
  Maximize2,
  Minus,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { computeHeikinAshiBars } from '../../shared/movingAverageMath';
import {
  TIMEFRAMES,
  getPricePrecision,
  getTimeframeByKey,
  periodToTimeframeKey,
} from '../../shared/timeframes';
import {
  buildKLineOverlayStyles,
  findDrawingTool,
  readChartImageExtendData,
  registerCustomOverlays,
  type ChartImageExtendData,
} from '../overlays/customOverlays';
import {
  setActiveDrawingSymbol,
  snapOverlayPointsForSymbol,
} from '../overlays/overlayPriceSnap';
import {
  buildKLineIndicatorConfig,
  createIndicatorInstance,
  registerCustomIndicators,
  type IndicatorInstance,
} from '../indicators/customIndicators';
import {
  DEFAULT_CHART_SETTINGS,
  buildChartStyles,
  loadChartSettings,
  saveChartSettings,
  type ChartDisplaySettings,
} from '../utils/chartStyles';
import {
  registerIdxYAxes,
  resolveCandleYAxisName,
} from '../utils/idxPriceAxis';
import {
  DEFAULT_BAR_SPACE,
  MAX_BAR_SPACE,
  MIN_BAR_SPACE,
  computeFitBarSpace,
  computeSteppedBarSpace,
} from '../utils/chartZoom';
import {
  loadIndicatorConfigs,
  saveIndicatorConfigs,
  saveSymbolDrawings,
  serializeOverlays,
} from '../utils/drawingStorage';
import {
  loadFavoriteTimeframes,
  normalizeFavoriteTimeframes,
  saveFavoriteTimeframes,
} from '../utils/timeframeFavorites';
import {
  resolveDrawingsWithCloud,
  saveCloudWorkspaceState,
  upsertCloudDrawings,
  type CloudSyncStatus,
  type CloudWorkspaceState,
} from '../lib/cloudStorage';
import {
  DEFAULT_FLAG_COLOR,
  addSymbolToCustomWatchlist,
  clearCustomWatchlist,
  createCustomWatchlist,
  deleteCustomWatchlist,
  getAllUniqueWatchedSymbols,
  loadActiveWatchlistRef,
  loadCustomWatchlists,
  loadWatchlistColumnPrefs,
  loadWatchlistFlagMap,
  removeSymbolFromCustomWatchlist,
  renameCustomWatchlist,
  reorderCustomWatchlistSymbols,
  resolveActiveListSymbols,
  saveActiveWatchlistRef,
  saveCustomWatchlists,
  saveWatchlistColumnPrefs,
  saveWatchlistFlagMap,
  setSymbolFlag,
  toggleSymbolFlag,
  unflagAllSymbols,
  type ActiveWatchlistRef,
  type CustomWatchlist,
  type FlagColor,
  type WatchlistColumnPrefs,
  type WatchlistFlagMap,
} from '../utils/watchlistModel';
import type {
  ChartCandleType,
  ChartMeta,
  DrawingOverlayStyle,
  MagnetMode,
  SerializedOverlay,
  ThemeMode,
  WatchlistQuote,
  YAxisScaleType,
} from '../types/chart';
import TopToolbar from './TopToolbar';
import DrawingSidebar from './DrawingSidebar';
import WatchlistPanel from './WatchlistPanel';
import SymbolSearchModal from './SymbolSearchModal';
import WatchlistsModal from './WatchlistsModal';
import ChartIndicatorLegend from './ChartIndicatorLegend';
import IndicatorSettingsModal from './IndicatorSettingsModal';
import FloatingDrawingToolbar from './FloatingDrawingToolbar';
import ChartSettingsModal from './ChartSettingsModal';
import StockScreenerPanel from './StockScreenerPanel';
import type { ScreenerPreset } from '../../shared/screenerModel';

const DEFAULT_DRAWING_STYLE: DrawingOverlayStyle = {
  color: '#FFFFFF',
  size: 1.5,
  lineStyle: 'solid',
};

function readDrawingStyleFromOverlay(ov: { styles?: unknown } | undefined): DrawingOverlayStyle {
  const styles = ov?.styles as
    | { line?: { color?: string; size?: number; style?: string; dashedValue?: number[] } }
    | undefined;
  const line = styles?.line;
  if (!line) return { ...DEFAULT_DRAWING_STYLE };
  let lineStyle: DrawingOverlayStyle['lineStyle'] = 'solid';
  if (line.style === 'dashed') {
    const firstDash = Array.isArray(line.dashedValue) ? line.dashedValue[0] : 6;
    lineStyle = typeof firstDash === 'number' && firstDash <= 3 ? 'dotted' : 'dashed';
  }
  return {
    color: typeof line.color === 'string' && line.color ? line.color : DEFAULT_DRAWING_STYLE.color,
    size: typeof line.size === 'number' && Number.isFinite(line.size) ? line.size : DEFAULT_DRAWING_STYLE.size,
    lineStyle,
  };
}

interface ChartPaginationMeta {
  hasMore: boolean;
  nextCursor: number | null;
  firstTradeDate?: number | null;
}

interface ChartApiResponse {
  symbol: string;
  tf: string;
  meta?: ChartMeta;
  bars: KLineData[];
  pagination?: ChartPaginationMeta;
  error?: string;
}

export interface TradingViewWorkspaceProps {
  userId?: string;
  username?: string;
  accessToken?: string;
  initialCloudState?: CloudWorkspaceState | null;
  initialCloudDrawings?: Record<string, SerializedOverlay[]>;
  onSignOut?: () => Promise<void> | void;
}

export default function TradingViewWorkspace({
  userId,
  username,
  accessToken,
  initialCloudState,
  initialCloudDrawings,
  onSignOut,
}: TradingViewWorkspaceProps = {}) {
  const initialSymbol = initialCloudState?.symbol || 'BBCA.JK';
  const initialTimeframe =
    initialCloudState?.timeframe && getTimeframeByKey(initialCloudState.timeframe)
      ? initialCloudState.timeframe
      : '1d';

  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const pendingOverlayIdRef = useRef<string | null>(null);
  const completedOverlayIdsRef = useRef<string[]>([]);
  const activeSymbolRef = useRef<string>(initialSymbol);
  const activeTfRef = useRef<string>(initialTimeframe);
  const drawingsLockedRef = useRef<boolean>(false);
  const drawingsVisibleRef = useRef<boolean>(true);
  const magnetModeRef = useRef<MagnetMode>('normal');
  const loadedOverlaySymbolRef = useRef<string | null>(null);
  const reloadNonceRef = useRef<number>(0);
  const initAbortRef = useRef<AbortController | null>(null);
  const historyAbortRef = useRef<AbortController | null>(null);
  const paginationRef = useRef<{
    nonce: number;
    symbol: string;
    tfKey: string;
    nextCursor: number | null;
    hasMore: boolean;
  }>({
    nonce: 0,
    symbol: initialSymbol,
    tfKey: initialTimeframe,
    nextCursor: null,
    hasMore: false,
  });
  const lastReloadTickRef = useRef<number>(0);

  // Supabase cloud sync state & dirty queues
  const userIdRef = useRef<string | undefined>(userId);
  userIdRef.current = userId;
  const accessTokenRef = useRef<string | undefined>(accessToken);
  accessTokenRef.current = accessToken;
  const cloudDrawingsRef = useRef<Record<string, SerializedOverlay[]>>({
    ...(initialCloudDrawings ?? {}),
  });
  const pendingDirtyDrawingsRef = useRef<Map<string, SerializedOverlay[]>>(new Map());
  const drawingSyncTimersRef = useRef<Map<string, number>>(new Map());
  const workspaceSyncTimerRef = useRef<number | null>(null);
  const workspaceDirtyRef = useRef<boolean>(false);
  const workspaceMountedRef = useRef<boolean>(false);

  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('synced');
  const [symbol, setSymbol] = useState<string>(initialSymbol);
  const [timeframe, setTimeframe] = useState<string>(initialTimeframe);
  const [chartType, setChartType] = useState<ChartCandleType>(
    initialCloudState?.chartType || 'candle_solid'
  );
  const [yAxisScale, setYAxisScale] = useState<YAxisScaleType>(
    initialCloudState?.yAxisScale === 'logarithm' ? 'logarithm' : 'normal'
  );
  const [theme, setTheme] = useState<ThemeMode>(initialCloudState?.theme || 'dark');
  const [meta, setMeta] = useState<ChartMeta | null>(null);
  const [loadingChart, setLoadingChart] = useState<boolean>(true);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [reloadTick, setReloadTick] = useState<number>(0);

  // Flexible TradingView-style Indicator Instances
  const [indicators, setIndicators] = useState<IndicatorInstance[]>(() =>
    initialCloudState?.indicators && initialCloudState.indicators.length > 0
      ? initialCloudState.indicators
      : loadIndicatorConfigs()
  );
  const indicatorsRef = useRef<IndicatorInstance[]>(indicators);
  indicatorsRef.current = indicators;
  const [editingIndicatorId, setEditingIndicatorId] = useState<string | null>(null);

  // Drawings
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [magnetMode, setMagnetMode] = useState<MagnetMode>('normal');
  const [drawingsLocked, setDrawingsLocked] = useState<boolean>(false);
  const [drawingsVisible, setDrawingsVisible] = useState<boolean>(true);
  const [drawingCount, setDrawingCount] = useState<number>(0);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [selectedOverlayMeta, setSelectedOverlayMeta] = useState<{
    name: string;
    style: DrawingOverlayStyle;
    locked: boolean;
  } | null>(null);
  const [editingCallout, setEditingCallout] = useState<{
    id: string;
    label: string;
    text: string;
    initialText: string;
  } | null>(null);
  const [editingImage, setEditingImage] = useState<{
    id: string;
    src: string;
    width: number;
    height: number;
    initialData: ChartImageExtendData;
  } | null>(null);
  const calloutInputRef = useRef<HTMLInputElement>(null);
  const overlayInteractedRef = useRef<boolean>(false);
  const selectedOverlayIdRef = useRef<string | null>(null);
  selectedOverlayIdRef.current = selectedOverlayId;

  // Panels & modals
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchMode, setSearchMode] = useState<'chart' | 'watchlist'>('chart');
  const [watchlistsModalOpen, setWatchlistsModalOpen] = useState<boolean>(false);
  const [chartSettingsOpen, setChartSettingsOpen] = useState<boolean>(false);
  const [chartSettings, setChartSettings] = useState<ChartDisplaySettings>(() =>
    initialCloudState?.chartSettings
      ? { ...DEFAULT_CHART_SETTINGS, ...initialCloudState.chartSettings }
      : loadChartSettings()
  );
  const [pendingDeleteList, setPendingDeleteList] = useState<{ id: string; name: string } | null>(
    null
  );
  const [pendingClearDrawings, setPendingClearDrawings] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isCompactViewport, setIsCompactViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  );
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [mobileToolsOpen, setMobileToolsOpen] = useState<boolean>(false);
  const [watchlistOpen, setWatchlistOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [screenerOpen, setScreenerOpen] = useState<boolean>(false);
  const [screenerExpanded, setScreenerExpanded] = useState<boolean>(false);
  const [savedScreenerPresets, setSavedScreenerPresets] = useState<ScreenerPreset[]>(() => {
    if (initialCloudState?.savedScreenerPresets && Array.isArray(initialCloudState.savedScreenerPresets)) {
      return initialCloudState.savedScreenerPresets;
    }
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem('meridian_screener_presets_v1');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ScreenerPreset[]) : [];
    } catch {
      return [];
    }
  });
  const [customWatchlists, setCustomWatchlists] = useState<CustomWatchlist[]>(() =>
    initialCloudState?.customWatchlists && initialCloudState.customWatchlists.length > 0
      ? initialCloudState.customWatchlists
      : loadCustomWatchlists()
  );
  const [activeWatchlistRef, setActiveWatchlistRef] = useState<ActiveWatchlistRef>(() =>
    initialCloudState?.activeWatchlistRef
      ? initialCloudState.activeWatchlistRef
      : loadActiveWatchlistRef(
          initialCloudState?.customWatchlists && initialCloudState.customWatchlists.length > 0
            ? initialCloudState.customWatchlists
            : loadCustomWatchlists()
        )
  );
  const [watchlistFlagMap, setWatchlistFlagMap] = useState<WatchlistFlagMap>(() =>
    initialCloudState?.watchlistFlagMap ?? loadWatchlistFlagMap()
  );
  const [watchlistColumnPrefs, setWatchlistColumnPrefs] = useState<WatchlistColumnPrefs>(() =>
    initialCloudState?.watchlistColumnPrefs
      ? initialCloudState.watchlistColumnPrefs
      : loadWatchlistColumnPrefs()
  );
  const [favoriteTimeframes, setFavoriteTimeframes] = useState<string[]>(() =>
    initialCloudState?.favoriteTimeframes && initialCloudState.favoriteTimeframes.length > 0
      ? normalizeFavoriteTimeframes(initialCloudState.favoriteTimeframes)
      : loadFavoriteTimeframes()
  );
  const [watchlistQuotes, setWatchlistQuotes] = useState<Record<string, WatchlistQuote>>({});
  const [loadingQuotes, setLoadingQuotes] = useState<boolean>(false);

  const activeWatchlistSymbols = useMemo(
    () => resolveActiveListSymbols(activeWatchlistRef, customWatchlists, watchlistFlagMap),
    [activeWatchlistRef, customWatchlists, watchlistFlagMap]
  );

  const allWatchedSymbols = useMemo(
    () => getAllUniqueWatchedSymbols(customWatchlists, watchlistFlagMap),
    [customWatchlists, watchlistFlagMap]
  );

  // Sync refs
  const themeRef = useRef<ThemeMode>(theme);
  themeRef.current = theme;
  const chartTypeRef = useRef<ChartCandleType>(chartType);
  chartTypeRef.current = chartType;
  const prevChartTypeRef = useRef<ChartCandleType>(chartType);
  const rawBarsCacheRef = useRef<{
    symbol: string;
    tfKey: string;
    bars: KLineData[];
    nextCursor: number | null;
    hasMore: boolean;
  } | null>(null);
  const forceReloadRef = useRef<boolean>(false);
  activeSymbolRef.current = symbol;
  activeTfRef.current = timeframe;
  drawingsLockedRef.current = drawingsLocked;
  drawingsVisibleRef.current = drawingsVisible;
  magnetModeRef.current = magnetMode;

  // Sync <html> dark class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const buildCurrentWorkspaceSnapshot = useCallback((): CloudWorkspaceState => ({
    symbol,
    timeframe,
    chartType,
    yAxisScale,
    theme,
    indicators,
    customWatchlists,
    activeWatchlistRef,
    watchlistFlagMap,
    watchlistColumnPrefs,
    chartSettings,
    favoriteTimeframes,
    savedScreenerPresets,
  }), [
    symbol,
    timeframe,
    chartType,
    yAxisScale,
    theme,
    indicators,
    customWatchlists,
    activeWatchlistRef,
    watchlistFlagMap,
    watchlistColumnPrefs,
    chartSettings,
    favoriteTimeframes,
    savedScreenerPresets,
  ]);
  const workspaceSnapshotRef = useRef<CloudWorkspaceState>(buildCurrentWorkspaceSnapshot());
  workspaceSnapshotRef.current = buildCurrentWorkspaceSnapshot();

  const flushCloudPending = useCallback(async (useKeepalive = false) => {
    const uid = userIdRef.current;
    if (!uid) return;

    const tasks: Array<Promise<void>> = [];

    for (const [symKey, overlays] of Array.from(pendingDirtyDrawingsRef.current.entries())) {
      const existingTimer = drawingSyncTimersRef.current.get(symKey);
      if (existingTimer !== undefined) {
        window.clearTimeout(existingTimer);
        drawingSyncTimersRef.current.delete(symKey);
      }
      pendingDirtyDrawingsRef.current.delete(symKey);
      tasks.push(
        upsertCloudDrawings(uid, symKey, overlays, {
          accessToken: accessTokenRef.current,
          keepalive: useKeepalive,
        })
      );
    }

    if (workspaceDirtyRef.current) {
      if (workspaceSyncTimerRef.current !== null) {
        window.clearTimeout(workspaceSyncTimerRef.current);
        workspaceSyncTimerRef.current = null;
      }
      workspaceDirtyRef.current = false;
      tasks.push(
        saveCloudWorkspaceState(uid, workspaceSnapshotRef.current, {
          accessToken: accessTokenRef.current,
          keepalive: useKeepalive,
        })
      );
    }

    if (tasks.length === 0) return;
    try {
      await Promise.all(tasks);
      if (
        pendingDirtyDrawingsRef.current.size === 0 &&
        !workspaceDirtyRef.current &&
        !useKeepalive
      ) {
        setCloudSyncStatus('synced');
      }
    } catch {
      if (!useKeepalive) {
        setCloudSyncStatus('error');
      }
    }
  }, []);

  const scheduleCloudDrawingsSync = useCallback(
    (rawSymbol: string, serialized: SerializedOverlay[]) => {
      const uid = userIdRef.current;
      const symKey = rawSymbol.trim().toUpperCase();
      if (!uid || !symKey) return;

      pendingDirtyDrawingsRef.current.set(symKey, serialized);
      setCloudSyncStatus('saving');

      const existingTimer = drawingSyncTimersRef.current.get(symKey);
      if (existingTimer !== undefined) {
        window.clearTimeout(existingTimer);
      }

      const flushSingle = async () => {
        drawingSyncTimersRef.current.delete(symKey);
        const latest = pendingDirtyDrawingsRef.current.get(symKey);
        if (!latest) return;
        pendingDirtyDrawingsRef.current.delete(symKey);
        try {
          await upsertCloudDrawings(uid, symKey, latest);
          if (pendingDirtyDrawingsRef.current.size === 0 && !workspaceDirtyRef.current) {
            setCloudSyncStatus('synced');
          }
        } catch {
          setCloudSyncStatus('error');
        }
      };

      const hasLargePayload = serialized.some((o) => o.name === 'chartImage');
      if (hasLargePayload) {
        void flushSingle();
      } else {
        const timerId = window.setTimeout(() => {
          void flushSingle();
        }, 150);
        drawingSyncTimersRef.current.set(symKey, timerId);
      }
    },
    []
  );

  // Persist workspace settings to Supabase whenever preferences change
  useEffect(() => {
    if (!userIdRef.current) return;
    if (!workspaceMountedRef.current) {
      workspaceMountedRef.current = true;
      // Save initial snapshot once if user has no cloud state row yet
      if (!initialCloudState) {
        workspaceDirtyRef.current = true;
        saveCloudWorkspaceState(userIdRef.current, workspaceSnapshotRef.current)
          .then(() => {
            workspaceDirtyRef.current = false;
          })
          .catch(() => {});
      }
      return;
    }

    workspaceDirtyRef.current = true;
    setCloudSyncStatus('saving');
    if (workspaceSyncTimerRef.current !== null) {
      window.clearTimeout(workspaceSyncTimerRef.current);
    }
    workspaceSyncTimerRef.current = window.setTimeout(() => {
      workspaceSyncTimerRef.current = null;
      const uid = userIdRef.current;
      if (!uid || !workspaceDirtyRef.current) return;
      workspaceDirtyRef.current = false;
      saveCloudWorkspaceState(uid, workspaceSnapshotRef.current)
        .then(() => {
          if (pendingDirtyDrawingsRef.current.size === 0 && !workspaceDirtyRef.current) {
            setCloudSyncStatus('synced');
          }
        })
        .catch(() => setCloudSyncStatus('error'));
    }, 600);
  }, [
    symbol,
    timeframe,
    chartType,
    yAxisScale,
    theme,
    indicators,
    customWatchlists,
    activeWatchlistRef,
    watchlistFlagMap,
    watchlistColumnPrefs,
    chartSettings,
    favoriteTimeframes,
    savedScreenerPresets,
    initialCloudState,
  ]);

  // Flush pending drawings/settings when tab is closed, backgrounded, or page unloads
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void flushCloudPending(true);
      }
    };
    const onPageHide = () => {
      void flushCloudPending(true);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onPageHide);
    };
  }, [flushCloudPending]);

  const handleSignOutWithFlush = useCallback(async () => {
    await flushCloudPending(false);
    await onSignOut?.();
  }, [flushCloudPending, onSignOut]);

  // Persist completed overlays for active symbol (local cache + Supabase cloud)
  const persistCurrentOverlays = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const all = chart.getOverlays();
    const completed = all.filter((ov) => ov.id !== pendingOverlayIdRef.current);
    completedOverlayIdsRef.current = completed.map((ov) => ov.id);
    setDrawingCount(completed.length);

    const symKey = activeSymbolRef.current.trim().toUpperCase();
    const serialized = serializeOverlays(completed);
    cloudDrawingsRef.current[symKey] = serialized;
    saveSymbolDrawings(symKey, serialized);
    scheduleCloudDrawingsSync(symKey, serialized);
  }, [scheduleCloudDrawingsSync]);

  // Sync floating toolbar state with a selected overlay on the chart
  const syncSelectedOverlay = useCallback((overlayId: string | null) => {
    const chart = chartRef.current;
    if (!chart || !overlayId) {
      setSelectedOverlayId(null);
      setSelectedOverlayMeta(null);
      return;
    }
    const ov = chart.getOverlays({ id: overlayId })[0];
    if (!ov) {
      setSelectedOverlayId(null);
      setSelectedOverlayMeta(null);
      return;
    }
    setSelectedOverlayId(ov.id);
    setSelectedOverlayMeta({
      name: ov.name,
      style: readDrawingStyleFromOverlay(ov),
      locked: Boolean(ov.lock),
    });
  }, []);

  // Open inline text editor for Text (plainText) or Callout (simpleAnnotation) overlay
  const openCalloutEditor = useCallback((overlayId: string) => {
    const chart = chartRef.current;
    if (!chart) return;
    const ov = chart.getOverlays({ id: overlayId })[0];
    if (!ov || (ov.name !== 'simpleAnnotation' && ov.name !== 'plainText')) return;
    const raw = typeof ov.extendData === 'string' ? ov.extendData : '';
    const initialText = raw.trim().length > 0 ? raw : 'Text';
    setEditingImage(null);
    setEditingCallout({
      id: ov.id,
      label: ov.name === 'plainText' ? 'Text' : 'Callout',
      text: initialText,
      initialText,
    });
  }, []);

  // Open inline image picker/URL editor for Image (chartImage) overlay
  const openImageEditor = useCallback((overlayId: string) => {
    const chart = chartRef.current;
    if (!chart) return;
    const ov = chart.getOverlays({ id: overlayId })[0];
    if (!ov || ov.name !== 'chartImage') return;
    const data = readChartImageExtendData(ov.extendData);
    setEditingCallout(null);
    setEditingImage({
      id: ov.id,
      src: data.src,
      width: data.width ?? 200,
      height: data.height ?? 130,
      initialData: data,
    });
  }, []);

  // Auto-focus and select text input when text/callout editor opens
  useEffect(() => {
    if (!editingCallout) return;
    const raf = window.requestAnimationFrame(() => {
      const input = calloutInputRef.current;
      if (input) {
        input.focus();
        input.select();
      }
    });
    return () => window.cancelAnimationFrame(raf);
  }, [editingCallout?.id]);

  // Support Escape key while inline image editor is open
  useEffect(() => {
    if (!editingImage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancelImageAnnotation();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingImage?.id]);

  // Build shared overlay event handlers
  const createOverlayHandlers = useCallback(
    () => ({
      onDrawEnd: (event: OverlayEvent<unknown>) => {
        if (pendingOverlayIdRef.current === event.overlay.id) {
          pendingOverlayIdRef.current = null;
        }
        setActiveTool(null);
        overlayInteractedRef.current = true;
        if (event.overlay.name === 'brush' && (event.overlay.points?.length ?? 0) < 2) {
          chartRef.current?.removeOverlay({ id: event.overlay.id });
          return;
        }
        if (event.overlay.name === 'simpleAnnotation' || event.overlay.name === 'plainText') {
          const chart = chartRef.current;
          const existing =
            typeof event.overlay.extendData === 'string' &&
            event.overlay.extendData.trim().length > 0
              ? event.overlay.extendData
              : 'Text';
          chart?.overrideOverlay({ id: event.overlay.id, extendData: existing });
          persistCurrentOverlays();
          syncSelectedOverlay(event.overlay.id);
          setEditingImage(null);
          setEditingCallout({
            id: event.overlay.id,
            label: event.overlay.name === 'plainText' ? 'Text' : 'Callout',
            text: existing,
            initialText: existing,
          });
          return;
        }
        if (event.overlay.name === 'chartImage') {
          const data = readChartImageExtendData(event.overlay.extendData);
          chartRef.current?.overrideOverlay({ id: event.overlay.id, extendData: data });
          persistCurrentOverlays();
          syncSelectedOverlay(event.overlay.id);
          setEditingCallout(null);
          setEditingImage({
            id: event.overlay.id,
            src: data.src,
            width: data.width ?? 200,
            height: data.height ?? 130,
            initialData: data,
          });
          return;
        }
        const isCandlePane = !event.overlay.paneId || event.overlay.paneId === 'candle_pane';
        const snappedPts = snapOverlayPointsForSymbol(
          activeSymbolRef.current,
          event.overlay.points ?? [],
          isCandlePane
        );
        chartRef.current?.overrideOverlay({ id: event.overlay.id, points: snappedPts });
        persistCurrentOverlays();
        syncSelectedOverlay(event.overlay.id);
      },
      onSelected: (event: OverlayEvent<unknown>) => {
        if (event?.overlay?.id && pendingOverlayIdRef.current !== event.overlay.id) {
          overlayInteractedRef.current = true;
          syncSelectedOverlay(event.overlay.id);
        }
      },
      onClick: (event: OverlayEvent<unknown>) => {
        if (event?.overlay?.id && pendingOverlayIdRef.current !== event.overlay.id) {
          overlayInteractedRef.current = true;
          syncSelectedOverlay(event.overlay.id);
        }
      },
      onDoubleClick: (event: OverlayEvent<unknown>) => {
        if (
          event?.overlay?.id &&
          pendingOverlayIdRef.current !== event.overlay.id
        ) {
          if (event.overlay.name === 'simpleAnnotation' || event.overlay.name === 'plainText') {
            syncSelectedOverlay(event.overlay.id);
            openCalloutEditor(event.overlay.id);
          } else if (event.overlay.name === 'chartImage') {
            syncSelectedOverlay(event.overlay.id);
            openImageEditor(event.overlay.id);
          }
        }
      },
      onDeselected: (event: OverlayEvent<unknown>) => {
        if (selectedOverlayIdRef.current === event?.overlay?.id) {
          setSelectedOverlayId(null);
          setSelectedOverlayMeta(null);
        }
      },
      onRemoved: (event: OverlayEvent<unknown>) => {
        if (selectedOverlayIdRef.current === event?.overlay?.id) {
          setSelectedOverlayId(null);
          setSelectedOverlayMeta(null);
        }
        setEditingCallout((curr) => (curr?.id === event?.overlay?.id ? null : curr));
        setEditingImage((curr) => (curr?.id === event?.overlay?.id ? null : curr));
      },
      onPressedMoveEnd: (event: OverlayEvent<unknown>) => {
        if (event?.overlay?.id && Array.isArray(event.overlay.points)) {
          const isCandlePane = !event.overlay.paneId || event.overlay.paneId === 'candle_pane';
          const snappedPts = snapOverlayPointsForSymbol(
            activeSymbolRef.current,
            event.overlay.points,
            isCandlePane
          );
          chartRef.current?.overrideOverlay({ id: event.overlay.id, points: snappedPts });
        }
        persistCurrentOverlays();
      },
      onRightClick: (event: OverlayEvent<unknown>) => {
        // Prevent KLineChart's default right-click removal; drawings are deleted via click -> Delete
        event.preventDefault?.();
      },
    }),
    [openCalloutEditor, openImageEditor, persistCurrentOverlays, syncSelectedOverlay]
  );

  // Restore saved drawings for a symbol once bars are rendered
  const restoreDrawingsForSymbol = useCallback(
    (sym: string) => {
      const chart = chartRef.current;
      if (!chart) return;
      if (loadedOverlaySymbolRef.current === sym) return;

      loadedOverlaySymbolRef.current = sym;
      pendingOverlayIdRef.current = null;
      setActiveTool(null);
      setSelectedOverlayId(null);
      setSelectedOverlayMeta(null);
      chart.removeOverlay();

      const saved = resolveDrawingsWithCloud(sym, cloudDrawingsRef.current);
      const handlers = createOverlayHandlers();
      const restoredIds: string[] = [];

      for (const item of saved) {
        const snappedPoints = snapOverlayPointsForSymbol(sym, item.points, true);
        const id = chart.createOverlay({
          name: item.name,
          points: snappedPoints,
          extendData: item.extendData,
          ...(item.style ? { styles: buildKLineOverlayStyles(item.style) } : {}),
          mode: magnetModeRef.current,
          lock: drawingsLockedRef.current,
          visible: drawingsVisibleRef.current,
          ...handlers,
        });
        if (typeof id === 'string') {
          restoredIds.push(id);
        }
      }
      completedOverlayIdsRef.current = restoredIds;
      setDrawingCount(restoredIds.length);
    },
    [createOverlayHandlers]
  );

  // Initialize KLineChart v10 once
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;

    setActiveDrawingSymbol(activeSymbolRef.current);
    registerCustomOverlays();
    registerCustomIndicators();
    registerIdxYAxes();

    const chart = init(el, {
      styles: buildChartStyles('dark', 'candle_solid', window.innerWidth < 640, chartSettings),
      layout: {
        barSpaceLimit: {
          min: MIN_BAR_SPACE,
          max: MAX_BAR_SPACE,
        },
      },
    });
    if (!chart) return;
    chartRef.current = chart;

    // Mount all saved / default flexible indicators
    for (const inst of indicatorsRef.current) {
      chart.createIndicator(
        buildKLineIndicatorConfig(inst, activeTfRef.current),
        inst.pane === 'main'
      );
    }

    chart.setDataLoader({
      getBars: async ({ type, timestamp, symbol: symInfo, period, callback }) => {
        const tfKey = periodToTimeframeKey(period);
        const requestTicker = symInfo.ticker;

        if (type === 'init') {
          initAbortRef.current?.abort();
          historyAbortRef.current?.abort();
          const controller = new AbortController();
          initAbortRef.current = controller;

          const myNonce = ++reloadNonceRef.current;
          paginationRef.current = {
            nonce: myNonce,
            symbol: requestTicker,
            tfKey,
            nextCursor: null,
            hasMore: false,
          };

          setLoadingChart(true);
          setLoadingHistory(false);
          setErrorMsg('');

          try {
            const cachedRaw = rawBarsCacheRef.current;
            if (
              !forceReloadRef.current &&
              cachedRaw &&
              cachedRaw.symbol === requestTicker &&
              cachedRaw.tfKey === tfKey &&
              cachedRaw.bars.length > 0
            ) {
              paginationRef.current = {
                nonce: myNonce,
                symbol: requestTicker,
                tfKey,
                nextCursor: cachedRaw.nextCursor,
                hasMore: cachedRaw.hasMore,
              };
              const displayBars =
                chartTypeRef.current === 'heikin_ashi'
                  ? computeHeikinAshiBars(cachedRaw.bars)
                  : cachedRaw.bars;
              setLoadingChart(false);
              callback(displayBars, { forward: cachedRaw.hasMore, backward: false });
              window.requestAnimationFrame(() => {
                restoreDrawingsForSymbol(requestTicker);
              });
              return;
            }
            forceReloadRef.current = false;

            const res = await fetch(
              `/api/chart?symbol=${encodeURIComponent(requestTicker)}&tf=${encodeURIComponent(tfKey)}`,
              { signal: controller.signal }
            );
            const data = (await res.json()) as ChartApiResponse;

            if (controller.signal.aborted || myNonce !== reloadNonceRef.current) {
              return;
            }

            if (!res.ok) {
              throw new Error(data.error || `Failed to load ${requestTicker}`);
            }

            if (data.meta) {
              setMeta(data.meta);
            }
            const bars = data.bars ?? [];
            const nextCursor = data.pagination?.nextCursor ?? null;
            const hasMore = Boolean(data.pagination?.hasMore) && nextCursor !== null;

            rawBarsCacheRef.current = {
              symbol: requestTicker,
              tfKey,
              bars,
              nextCursor,
              hasMore,
            };

            paginationRef.current = {
              nonce: myNonce,
              symbol: requestTicker,
              tfKey,
              nextCursor,
              hasMore,
            };

            const displayBars =
              chartTypeRef.current === 'heikin_ashi' ? computeHeikinAshiBars(bars) : bars;
            callback(displayBars, { forward: hasMore, backward: false });

            window.requestAnimationFrame(() => {
              restoreDrawingsForSymbol(requestTicker);
            });
          } catch (err) {
            if (controller.signal.aborted || myNonce !== reloadNonceRef.current) {
              return;
            }
            setErrorMsg(err instanceof Error ? err.message : 'Unable to fetch chart data');
            callback([], { forward: false, backward: false });
          } finally {
            if (myNonce === reloadNonceRef.current) {
              setLoadingChart(false);
            }
          }
          return;
        }

        // KLineChart v10 invokes 'forward' when panning/zooming to the oldest loaded bar (from === 0)
        if (type === 'forward') {
          const state = paginationRef.current;
          if (
            state.nonce !== reloadNonceRef.current ||
            state.symbol !== requestTicker ||
            state.tfKey !== tfKey ||
            !state.hasMore
          ) {
            callback([], { forward: false, backward: false });
            return;
          }

          const cursor = state.nextCursor ?? timestamp;
          if (typeof cursor !== 'number' || !Number.isFinite(cursor) || cursor <= 0) {
            callback([], { forward: false, backward: false });
            return;
          }

          historyAbortRef.current?.abort();
          const controller = new AbortController();
          historyAbortRef.current = controller;
          const capturedNonce = state.nonce;

          setLoadingHistory(true);

          try {
            const res = await fetch(
              `/api/chart?symbol=${encodeURIComponent(requestTicker)}&tf=${encodeURIComponent(tfKey)}&before=${encodeURIComponent(String(cursor))}`,
              { signal: controller.signal }
            );
            const data = (await res.json()) as ChartApiResponse;

            if (controller.signal.aborted || capturedNonce !== reloadNonceRef.current) {
              return;
            }

            if (!res.ok) {
              callback([], { forward: false, backward: false });
              return;
            }

            const oldestLoadedTs =
              rawBarsCacheRef.current?.symbol === requestTicker &&
              rawBarsCacheRef.current?.tfKey === tfKey &&
              rawBarsCacheRef.current.bars.length > 0
                ? rawBarsCacheRef.current.bars[0].timestamp
                : chart.getDataList()[0]?.timestamp ?? timestamp ?? Number.POSITIVE_INFINITY;
            const rawBars = Array.isArray(data.bars) ? data.bars : [];
            const olderBars = rawBars.filter((b) => b.timestamp < oldestLoadedTs);

            const nextCursor = data.pagination?.nextCursor ?? null;
            const nextHasMore = Boolean(data.pagination?.hasMore) && nextCursor !== null;

            if (
              rawBarsCacheRef.current &&
              rawBarsCacheRef.current.symbol === requestTicker &&
              rawBarsCacheRef.current.tfKey === tfKey
            ) {
              rawBarsCacheRef.current = {
                ...rawBarsCacheRef.current,
                bars: [...olderBars, ...rawBarsCacheRef.current.bars],
                nextCursor,
                hasMore: nextHasMore,
              };
            }

            paginationRef.current = {
              nonce: capturedNonce,
              symbol: requestTicker,
              tfKey,
              nextCursor,
              hasMore: nextHasMore,
            };

            const displayOlder =
              chartTypeRef.current === 'heikin_ashi' ? computeHeikinAshiBars(olderBars) : olderBars;
            callback(displayOlder, { forward: nextHasMore, backward: false });
          } catch {
            if (controller.signal.aborted || capturedNonce !== reloadNonceRef.current) {
              return;
            }
            callback([], { forward: false, backward: false });
          } finally {
            if (capturedNonce === reloadNonceRef.current) {
              setLoadingHistory(false);
            }
          }
          return;
        }

        callback([], { forward: false, backward: false });
      },
      subscribeBar: ({ symbol: symInfo, period, callback }) => {
        if (pollTimerRef.current !== null) {
          window.clearInterval(pollTimerRef.current);
        }
        const tfKey = periodToTimeframeKey(period);

        pollTimerRef.current = window.setInterval(async () => {
          try {
            const res = await fetch(
              `/api/chart?symbol=${encodeURIComponent(symInfo.ticker)}&tf=${encodeURIComponent(tfKey)}&latestOnly=1`
            );
            if (!res.ok) return;
            const data = (await res.json()) as ChartApiResponse;
            if (symInfo.ticker !== activeSymbolRef.current) return;
            if (data.meta) setMeta(data.meta);
            if (data.bars && data.bars.length > 0) {
              const latestBar = data.bars[data.bars.length - 1];
              const cachedRaw = rawBarsCacheRef.current;
              if (cachedRaw && cachedRaw.symbol === symInfo.ticker && cachedRaw.tfKey === tfKey) {
                const updatedBars = [...cachedRaw.bars];
                const lastIdx = updatedBars.length - 1;
                if (lastIdx >= 0 && updatedBars[lastIdx].timestamp === latestBar.timestamp) {
                  updatedBars[lastIdx] = latestBar;
                } else {
                  updatedBars.push(latestBar);
                }
                rawBarsCacheRef.current = { ...cachedRaw, bars: updatedBars };
                const outBar =
                  chartTypeRef.current === 'heikin_ashi'
                    ? computeHeikinAshiBars(updatedBars)[updatedBars.length - 1]
                    : latestBar;
                callback(outBar);
              } else {
                callback(latestBar);
              }
            }
          } catch {
            // Silent transient polling failure
          }
        }, 20_000);
      },
      unsubscribeBar: () => {
        if (pollTimerRef.current !== null) {
          window.clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        }
      },
    });

    const resizeObserver = new ResizeObserver(() => {
      chart.resize();
    });
    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
      initAbortRef.current?.abort();
      historyAbortRef.current?.abort();
      if (pollTimerRef.current !== null) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      dispose(el);
      chartRef.current = null;
    };
  }, [restoreDrawingsForSymbol]);

  // Apply symbol & period changes to chart (skip redundant setSymbol when only timeframe changed)
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const tfDef = getTimeframeByKey(timeframe) ?? getTimeframeByKey('1d') ?? TIMEFRAMES[0];
    const precision = getPricePrecision(symbol);
    const forceReload = reloadTick !== lastReloadTickRef.current;
    lastReloadTickRef.current = reloadTick;
    if (forceReload) {
      forceReloadRef.current = true;
      rawBarsCacheRef.current = null;
    }

    if (loadedOverlaySymbolRef.current && loadedOverlaySymbolRef.current !== symbol) {
      pendingOverlayIdRef.current = null;
      setActiveTool(null);
      setSelectedOverlayId(null);
      setSelectedOverlayMeta(null);
      setEditingCallout(null);
      setEditingImage(null);
      chart.removeOverlay();
      loadedOverlaySymbolRef.current = null;
    }

    const currentTicker = chart.getSymbol()?.ticker;
    if (forceReload || currentTicker !== symbol) {
      chart.setSymbol({
        ticker: symbol,
        pricePrecision: precision,
        volumePrecision: 0,
      });
    }
    if (chart.getPeriod() !== tfDef.period) {
      chart.setPeriod(tfDef.period);
    }

    // Sync timeframe-based indicator visibility (TradingView Visibility tab)
    for (const inst of indicatorsRef.current) {
      chart.overrideIndicator(buildKLineIndicatorConfig(inst, timeframe));
    }
  }, [symbol, timeframe, reloadTick]);

  // Track narrow/mobile viewports for responsive chart tooltip & mobile layout
  useEffect(() => {
    const onResize = () => {
      setIsCompactViewport(window.innerWidth < 640);
      setIsMobileViewport(window.innerWidth < 768);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Apply theme, candle type, compact legend, and chart settings updates
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.setStyles(
      buildChartStyles(theme, chartType, isCompactViewport, chartSettings)
    );
    const prevType = prevChartTypeRef.current;
    prevChartTypeRef.current = chartType;
    if (prevType !== chartType && (prevType === 'heikin_ashi' || chartType === 'heikin_ashi')) {
      chart.resetData();
    }
  }, [theme, chartType, isCompactViewport, chartSettings]);

  // Apply Y-axis scale mode (Price / Log) & IDX tick-size formatting via KLineChart v10 overrideYAxis
  useEffect(() => {
    setActiveDrawingSymbol(symbol);
    registerIdxYAxes();
    chartRef.current?.overrideYAxis({
      paneId: 'candle_pane',
      name: resolveCandleYAxisName(symbol, yAxisScale),
    });
  }, [symbol, yAxisScale]);

  // Fetch live Yahoo Finance quotes for Watchlist
  const fetchWatchlistQuotes = useCallback(async (symbolsToFetch: string[]) => {
    if (symbolsToFetch.length === 0) return;
    setLoadingQuotes(true);
    try {
      const res = await fetch(
        `/api/quotes?symbols=${encodeURIComponent(symbolsToFetch.join(','))}`
      );
      if (!res.ok) return;
      const data = (await res.json()) as { quotes?: WatchlistQuote[] };
      const map: Record<string, WatchlistQuote> = {};
      for (const q of data.quotes ?? []) {
        map[q.symbol] = q;
      }
      setWatchlistQuotes((prev) => ({ ...prev, ...map }));
    } catch {
      // Ignore transient watchlist error
    } finally {
      setLoadingQuotes(false);
    }
  }, []);

  useEffect(() => {
    fetchWatchlistQuotes(allWatchedSymbols);
    const interval = window.setInterval(() => {
      fetchWatchlistQuotes(allWatchedSymbols);
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [allWatchedSymbols, fetchWatchlistQuotes]);

  // ============================================================================
  // Flexible Indicator Handlers (Add, Toggle, Live Update, Visibility, Remove)
  // ============================================================================

  const handleAddIndicator = useCallback((kind: string) => {
    const chart = chartRef.current;
    if (!chart) return;
    const sameKindCount = indicatorsRef.current.filter((i) => i.kind === kind).length;
    const instance = createIndicatorInstance(kind, sameKindCount);
    chart.createIndicator(
      buildKLineIndicatorConfig(instance, activeTfRef.current),
      instance.pane === 'main'
    );

    setIndicators((prev) => {
      const next = [...prev, instance];
      saveIndicatorConfigs(next);
      return next;
    });
  }, []);

  const handleToggleSingleIndicator = useCallback((kind: string) => {
    const chart = chartRef.current;
    if (!chart) return;
    const existing = indicatorsRef.current.find((i) => i.kind === kind);
    if (existing) {
      chart.removeIndicator({ id: existing.id });
      setIndicators((prev) => {
        const next = prev.filter((i) => i.id !== existing.id);
        saveIndicatorConfigs(next);
        return next;
      });
    } else {
      const instance = createIndicatorInstance(kind, 0);
      chart.createIndicator(
        buildKLineIndicatorConfig(instance, activeTfRef.current),
        instance.pane === 'main'
      );
      setIndicators((prev) => {
        const next = [...prev, instance];
        saveIndicatorConfigs(next);
        return next;
      });
    }
  }, []);

  const handleLiveUpdateIndicator = useCallback((updated: IndicatorInstance) => {
    const chart = chartRef.current;
    if (chart) {
      chart.overrideIndicator(buildKLineIndicatorConfig(updated, activeTfRef.current));
    }
    setIndicators((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  }, []);

  const handleConfirmIndicatorSettings = useCallback((updated: IndicatorInstance) => {
    const chart = chartRef.current;
    if (chart) {
      chart.overrideIndicator(buildKLineIndicatorConfig(updated, activeTfRef.current));
    }
    setIndicators((prev) => {
      const next = prev.map((item) => (item.id === updated.id ? updated : item));
      saveIndicatorConfigs(next);
      return next;
    });
    setEditingIndicatorId(null);
  }, []);

  const handleCancelIndicatorSettings = useCallback((original: IndicatorInstance) => {
    const chart = chartRef.current;
    if (chart) {
      chart.overrideIndicator(buildKLineIndicatorConfig(original, activeTfRef.current));
    }
    setIndicators((prev) => prev.map((item) => (item.id === original.id ? original : item)));
    setEditingIndicatorId(null);
  }, []);

  const handleToggleIndicatorVisible = useCallback((id: string) => {
    const chart = chartRef.current;
    setIndicators((prev) => {
      const next = prev.map((item) => {
        if (item.id !== id) return item;
        const toggled = { ...item, visible: !item.visible };
        chart?.overrideIndicator(buildKLineIndicatorConfig(toggled, activeTfRef.current));
        return toggled;
      });
      saveIndicatorConfigs(next);
      return next;
    });
  }, []);

  const handleRemoveIndicator = useCallback((id: string) => {
    chartRef.current?.removeIndicator({ id });
    setIndicators((prev) => {
      const next = prev.filter((item) => item.id !== id);
      saveIndicatorConfigs(next);
      return next;
    });
    setEditingIndicatorId((curr) => (curr === id ? null : curr));
  }, []);

  // ============================================================================
  // Drawing Actions
  // ============================================================================

  const cancelPendingDrawing = useCallback(() => {
    const chart = chartRef.current;
    if (chart && pendingOverlayIdRef.current) {
      chart.removeOverlay({ id: pendingOverlayIdRef.current });
      pendingOverlayIdRef.current = null;
    }
    setActiveTool(null);
  }, []);

  const handleSelectTool = useCallback(
    (toolKey: string) => {
      const chart = chartRef.current;
      if (!chart) return;

      if (pendingOverlayIdRef.current) {
        chart.removeOverlay({ id: pendingOverlayIdRef.current });
        pendingOverlayIdRef.current = null;
      }

      setEditingCallout(null);
      setEditingImage(null);
      setActiveTool(toolKey);
      const handlers = createOverlayHandlers();

      const defaultLineColor = themeRef.current === 'dark' ? '#FFFFFF' : '#1E293B';
      const overlayId = chart.createOverlay({
        name: toolKey,
        ...(toolKey === 'simpleAnnotation' || toolKey === 'plainText'
          ? { extendData: 'Text' }
          : toolKey === 'chartImage'
            ? { extendData: { src: '', width: 200, height: 130 } }
            : {}),
        styles: buildKLineOverlayStyles({
          color: defaultLineColor,
          size: 1.5,
          lineStyle: 'solid',
        }),
        mode: magnetModeRef.current,
        lock: drawingsLockedRef.current,
        visible: drawingsVisibleRef.current,
        ...handlers,
      });

      if (typeof overlayId === 'string') {
        pendingOverlayIdRef.current = overlayId;
      }
    },
    [createOverlayHandlers]
  );

  const handleCycleMagnet = useCallback(() => {
    const order: MagnetMode[] = ['normal', 'weak_magnet', 'strong_magnet'];
    const next = order[(order.indexOf(magnetModeRef.current) + 1) % order.length];
    setMagnetMode(next);
    chartRef.current?.overrideOverlay({ mode: next });
  }, []);

  const handleToggleLock = useCallback(() => {
    const next = !drawingsLockedRef.current;
    setDrawingsLocked(next);
    chartRef.current?.overrideOverlay({ lock: next });
  }, []);

  const handleToggleVisible = useCallback(() => {
    const next = !drawingsVisibleRef.current;
    setDrawingsVisible(next);
    chartRef.current?.overrideOverlay({ visible: next });
  }, []);

  const handleUndoDrawing = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    if (pendingOverlayIdRef.current) {
      cancelPendingDrawing();
      return;
    }
    const lastId = completedOverlayIdsRef.current.pop();
    if (lastId) {
      chart.removeOverlay({ id: lastId });
      persistCurrentOverlays();
    }
  }, [cancelPendingDrawing, persistCurrentOverlays]);

  const handleClearAllDrawings = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    pendingOverlayIdRef.current = null;
    completedOverlayIdsRef.current = [];
    setActiveTool(null);
    setSelectedOverlayId(null);
    setSelectedOverlayMeta(null);
    setEditingCallout(null);
    setEditingImage(null);
    chart.removeOverlay();
    setDrawingCount(0);
    const symKey = activeSymbolRef.current.trim().toUpperCase();
    cloudDrawingsRef.current[symKey] = [];
    saveSymbolDrawings(symKey, []);
    scheduleCloudDrawingsSync(symKey, []);
    setPendingClearDrawings(false);
  }, [scheduleCloudDrawingsSync]);

  const handleRequestClearAllDrawings = useCallback(() => {
    if (completedOverlayIdsRef.current.length === 0) {
      cancelPendingDrawing();
      return;
    }
    setPendingClearDrawings(true);
  }, [cancelPendingDrawing]);

  const handleUpdateSelectedOverlayStyle = useCallback(
    (patch: Partial<DrawingOverlayStyle>) => {
      const chart = chartRef.current;
      const id = selectedOverlayIdRef.current;
      if (!chart || !id) return;

      setSelectedOverlayMeta((prev) => {
        if (!prev) return prev;
        const nextStyle: DrawingOverlayStyle = {
          ...prev.style,
          ...patch,
        };
        chart.overrideOverlay({
          id,
          styles: buildKLineOverlayStyles(nextStyle),
        });
        persistCurrentOverlays();
        return { ...prev, style: nextStyle };
      });
    },
    [persistCurrentOverlays]
  );

  const handleToggleSelectedOverlayLock = useCallback(() => {
    const chart = chartRef.current;
    const id = selectedOverlayIdRef.current;
    if (!chart || !id) return;

    setSelectedOverlayMeta((prev) => {
      if (!prev) return prev;
      const nextLocked = !prev.locked;
      chart.overrideOverlay({ id, lock: nextLocked });
      return { ...prev, locked: nextLocked };
    });
  }, []);

  const handleDeleteSelectedOverlay = useCallback(() => {
    const chart = chartRef.current;
    const id = selectedOverlayIdRef.current;
    if (!chart || !id) return;

    chart.removeOverlay({ id });
    setSelectedOverlayId(null);
    setSelectedOverlayMeta(null);
    setEditingCallout((curr) => (curr?.id === id ? null : curr));
    setEditingImage((curr) => (curr?.id === id ? null : curr));
    persistCurrentOverlays();
  }, [persistCurrentOverlays]);

  const handleCalloutTextChange = useCallback((nextText: string) => {
    setEditingCallout((prev) => {
      if (!prev) return prev;
      chartRef.current?.overrideOverlay({
        id: prev.id,
        extendData: nextText.length > 0 ? nextText : 'Text',
      });
      return { ...prev, text: nextText };
    });
  }, []);

  const handleSaveCalloutText = useCallback(() => {
    if (!editingCallout) return;
    const finalText = editingCallout.text.trim().length > 0 ? editingCallout.text.trim() : 'Text';
    chartRef.current?.overrideOverlay({
      id: editingCallout.id,
      extendData: finalText,
    });
    persistCurrentOverlays();
    setEditingCallout(null);
  }, [editingCallout, persistCurrentOverlays]);

  const handleCancelCalloutText = useCallback(() => {
    if (!editingCallout) return;
    chartRef.current?.overrideOverlay({
      id: editingCallout.id,
      extendData: editingCallout.initialText,
    });
    persistCurrentOverlays();
    setEditingCallout(null);
  }, [editingCallout, persistCurrentOverlays]);

  const handleImageDataChange = useCallback(
    (patch: Partial<ChartImageExtendData>) => {
      setEditingImage((prev) => {
        if (!prev) return prev;
        const nextSrc = patch.src ?? prev.src;
        const nextWidth = patch.width ?? prev.width;
        const nextHeight = patch.height ?? prev.height;
        chartRef.current?.overrideOverlay({
          id: prev.id,
          extendData: { src: nextSrc, width: nextWidth, height: nextHeight },
        });
        return { ...prev, src: nextSrc, width: nextWidth, height: nextHeight };
      });
    },
    []
  );

  const handleImageFileUpload = useCallback(
    (file: File | undefined) => {
      if (!file || !editingImage) return;
      const targetOverlayId = editingImage.id;
      const reader = new FileReader();
      reader.onload = () => {
        const rawDataUrl = typeof reader.result === 'string' ? reader.result : '';
        if (!rawDataUrl) return;
        const img = new Image();
        img.onload = () => {
          const chart = chartRef.current;
          const maxDim = 900;
          const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
          const targetW = Math.max(80, Math.round((img.naturalWidth || 200) * scale));
          const targetH = Math.max(60, Math.round((img.naturalHeight || 130) * scale));
          const offscreen = document.createElement('canvas');
          offscreen.width = targetW;
          offscreen.height = targetH;
          const ctx = offscreen.getContext('2d');
          let finalSrc = rawDataUrl;
          if (ctx) {
            ctx.drawImage(img, 0, 0, targetW, targetH);
            finalSrc = offscreen.toDataURL('image/png');
          }

          const displayW = Math.min(280, targetW);
          const displayH = Math.max(60, Math.round((displayW * targetH) / Math.max(1, targetW)));

          if (chart) {
            const ov = chart.getOverlays({ id: targetOverlayId })[0];
            let nextPoints = ov?.points;
            if (ov && ov.points.length >= 1) {
              const px0Raw = chart.convertToPixel([ov.points[0]], { paneId: 'candle_pane' });
              const px0 = Array.isArray(px0Raw) ? px0Raw[0] : px0Raw;
              if (px0 && typeof px0.x === 'number' && typeof px0.y === 'number') {
                const topLeftCoord =
                  ov.points.length >= 2
                    ? { x: px0.x, y: px0.y }
                    : { x: px0.x - displayW / 2, y: px0.y - displayH / 2 };
                const bottomRightCoord = {
                  x: topLeftCoord.x + displayW,
                  y: topLeftCoord.y + displayH,
                };
                const pts = chart.convertFromPixel([topLeftCoord, bottomRightCoord], {
                  paneId: 'candle_pane',
                });
                if (Array.isArray(pts) && pts.length === 2) {
                  nextPoints = pts;
                }
              }
            }
            chart.overrideOverlay({
              id: targetOverlayId,
              ...(nextPoints ? { points: nextPoints } : {}),
              extendData: { src: finalSrc, width: displayW, height: displayH },
            });
            persistCurrentOverlays();
            syncSelectedOverlay(targetOverlayId);
          }
          setEditingImage(null);
        };
        img.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    },
    [editingImage, persistCurrentOverlays, syncSelectedOverlay]
  );

  const handleSaveImageAnnotation = useCallback(() => {
    if (!editingImage) return;
    chartRef.current?.overrideOverlay({
      id: editingImage.id,
      extendData: {
        src: editingImage.src.trim(),
        width: editingImage.width,
        height: editingImage.height,
      },
    });
    persistCurrentOverlays();
    setEditingImage(null);
  }, [editingImage, persistCurrentOverlays]);

  const handleCancelImageAnnotation = useCallback(() => {
    if (!editingImage) return;
    chartRef.current?.overrideOverlay({
      id: editingImage.id,
      extendData: editingImage.initialData,
    });
    persistCurrentOverlays();
    setEditingImage(null);
  }, [editingImage, persistCurrentOverlays]);

  // Keyboard shortcuts: Escape cancels drawing/selection, Delete removes selected drawing, Ctrl/Cmd+Z undoes,
  // Shift+W opens Watchlists modal, Alt+Enter toggles default Red flag on active symbol
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (searchOpen || watchlistsModalOpen || chartSettingsOpen || editingIndicatorId || editingCallout || editingImage) return;
      const target = e.target as HTMLElement | null;
      const isEditingText =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (isEditingText) return;

      if (e.key === 'Escape') {
        if (pendingDeleteList) {
          setPendingDeleteList(null);
          return;
        }
        if (pendingClearDrawings) {
          setPendingClearDrawings(false);
          return;
        }
        if (activeTool) {
          cancelPendingDrawing();
        } else if (selectedOverlayIdRef.current) {
          setSelectedOverlayId(null);
          setSelectedOverlayMeta(null);
        }
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedOverlayIdRef.current) {
        e.preventDefault();
        handleDeleteSelectedOverlay();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        if (completedOverlayIdsRef.current.length > 0 || pendingOverlayIdRef.current) {
          e.preventDefault();
          handleUndoDrawing();
        }
      } else if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        setWatchlistsModalOpen(true);
      } else if (e.altKey && e.key === 'Enter') {
        e.preventDefault();
        const fallbackColor =
          activeWatchlistRef.kind === 'flagged' ? activeWatchlistRef.color : DEFAULT_FLAG_COLOR;
        setWatchlistFlagMap((prev) => {
          const next = toggleSymbolFlag(prev, activeSymbolRef.current, fallbackColor);
          saveWatchlistFlagMap(next);
          return next;
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeWatchlistRef,
    activeTool,
    pendingDeleteList,
    pendingClearDrawings,
    searchOpen,
    watchlistsModalOpen,
    chartSettingsOpen,
    editingIndicatorId,
    editingCallout,
    editingImage,
    cancelPendingDrawing,
    handleDeleteSelectedOverlay,
    handleUndoDrawing,
  ]);

  // Y-axis scale toggle between stock price (normal) and logarithmic (never trap right ruler in %)
  const handleCycleYAxisScale = useCallback(() => {
    setYAxisScale((prev) => (prev === 'normal' ? 'logarithm' : 'normal'));
  }, []);

  // Horizontal X-axis zoom & Fit All controls (supports sub-pixel zoom down to 0.05 px/bar)
  const handleZoomOutX = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const current = chart.getBarSpace().bar;
    chart.setBarSpace(computeSteppedBarSpace(current, 0.62));
  }, []);

  const handleZoomInX = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const current = chart.getBarSpace().bar;
    chart.setBarSpace(computeSteppedBarSpace(current, 1.5));
  }, []);

  const handleFitAllX = useCallback(() => {
    const chart = chartRef.current;
    const el = canvasContainerRef.current;
    if (!chart || !el) return;
    const bars = chart.getDataList();
    if (!bars.length) return;
    const targetSpace = computeFitBarSpace(el.clientWidth, bars.length);
    chart.setBarSpace(targetSpace);
    chart.scrollToRealTime(0);
  }, []);

  const handleResetZoomX = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.setBarSpace(DEFAULT_BAR_SPACE);
    chart.scrollToRealTime(150);
  }, []);

  // Screenshot PNG export
  const handleScreenshot = useCallback(() => {
    const bg = theme === 'dark' ? '#181c27' : '#ffffff';
    const url = chartRef.current?.getConvertPictureUrl(true, 'png', bg);
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = `${symbol}_${timeframe}.png`;
    link.click();
  }, [symbol, timeframe, theme]);

  // Fullscreen toggle
  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      wrapperRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Watchlist & Color-Flagged List mutations
  const handleSelectWatchlistRef = useCallback((ref: ActiveWatchlistRef) => {
    setActiveWatchlistRef(ref);
    saveActiveWatchlistRef(ref);
  }, []);

  const handleCreateCustomWatchlist = useCallback(
    (name: string, initialSymbols: string[] = []) => {
      setCustomWatchlists((prev) => {
        const { lists, created } = createCustomWatchlist(prev, name, initialSymbols);
        saveCustomWatchlists(lists);
        const nextRef: ActiveWatchlistRef = { kind: 'custom', id: created.id };
        setActiveWatchlistRef(nextRef);
        saveActiveWatchlistRef(nextRef);
        return lists;
      });
    },
    []
  );

  const handleRenameCustomWatchlist = useCallback((id: string, name: string) => {
    setCustomWatchlists((prev) => {
      const next = renameCustomWatchlist(prev, id, name);
      saveCustomWatchlists(next);
      return next;
    });
  }, []);

  const handleRequestDeleteCustomWatchlist = useCallback(
    (id: string) => {
      if (id === 'default') return;
      const target = customWatchlists.find((l) => l.id === id);
      if (!target) return;
      setPendingDeleteList({ id: target.id, name: target.name });
    },
    [customWatchlists]
  );

  const handleConfirmDeleteCustomWatchlist = useCallback(() => {
    if (!pendingDeleteList) return;
    const { id } = pendingDeleteList;
    setCustomWatchlists((prev) => {
      const next = deleteCustomWatchlist(prev, id);
      saveCustomWatchlists(next);
      if (activeWatchlistRef.kind === 'custom' && activeWatchlistRef.id === id) {
        const fallback: ActiveWatchlistRef = { kind: 'custom', id: next[0]?.id ?? 'default' };
        setActiveWatchlistRef(fallback);
        saveActiveWatchlistRef(fallback);
      }
      return next;
    });
    setPendingDeleteList(null);
  }, [pendingDeleteList, activeWatchlistRef]);

  const handleAddSymbolToTargetList = useCallback(
    (target: ActiveWatchlistRef, rawSym: string) => {
      const clean = rawSym.trim().toUpperCase();
      if (!clean) return;
      if (target.kind === 'flagged') {
        setWatchlistFlagMap((prev) => {
          const next = setSymbolFlag(prev, clean, target.color);
          saveWatchlistFlagMap(next);
          return next;
        });
      } else {
        setCustomWatchlists((prev) => {
          const next = addSymbolToCustomWatchlist(prev, target.id, clean);
          saveCustomWatchlists(next);
          return next;
        });
      }
    },
    []
  );

  const handleRemoveSymbolFromTargetList = useCallback(
    (target: ActiveWatchlistRef, rawSym: string) => {
      const clean = rawSym.trim().toUpperCase();
      if (!clean) return;
      if (target.kind === 'flagged') {
        setWatchlistFlagMap((prev) => {
          if (prev[clean] !== target.color) return prev;
          const next = setSymbolFlag(prev, clean, null);
          saveWatchlistFlagMap(next);
          return next;
        });
      } else {
        setCustomWatchlists((prev) => {
          const next = removeSymbolFromCustomWatchlist(prev, target.id, clean);
          saveCustomWatchlists(next);
          return next;
        });
      }
    },
    []
  );

  const handleAddSymbolToCustomList = useCallback((listId: string, rawSym: string) => {
    setCustomWatchlists((prev) => {
      const next = addSymbolToCustomWatchlist(prev, listId, rawSym);
      saveCustomWatchlists(next);
      return next;
    });
  }, []);

  const handleAddCurrentSymbol = useCallback(() => {
    handleAddSymbolToTargetList(activeWatchlistRef, symbol);
  }, [activeWatchlistRef, symbol, handleAddSymbolToTargetList]);

  const handleRemoveActiveWatchlistSymbol = useCallback(
    (sym: string) => {
      handleRemoveSymbolFromTargetList(activeWatchlistRef, sym);
    },
    [activeWatchlistRef, handleRemoveSymbolFromTargetList]
  );

  const handleClearActiveList = useCallback(() => {
    if (activeWatchlistRef.kind === 'flagged') {
      setWatchlistFlagMap((prev) => {
        const next = unflagAllSymbols(prev, activeWatchlistRef.color);
        saveWatchlistFlagMap(next);
        return next;
      });
    } else {
      setCustomWatchlists((prev) => {
        const next = clearCustomWatchlist(prev, activeWatchlistRef.id);
        saveCustomWatchlists(next);
        return next;
      });
    }
  }, [activeWatchlistRef]);

  const handleToggleWatchlistFlag = useCallback(
    (sym: string) => {
      const fallbackColor =
        activeWatchlistRef.kind === 'flagged' ? activeWatchlistRef.color : DEFAULT_FLAG_COLOR;
      setWatchlistFlagMap((prev) => {
        const next = toggleSymbolFlag(prev, sym, fallbackColor);
        saveWatchlistFlagMap(next);
        return next;
      });
    },
    [activeWatchlistRef]
  );

  const handleSetWatchlistFlagColor = useCallback((sym: string, color: FlagColor | null) => {
    setWatchlistFlagMap((prev) => {
      const next = setSymbolFlag(prev, sym, color);
      saveWatchlistFlagMap(next);
      return next;
    });
  }, []);

  const handleUnflagAll = useCallback(() => {
    setWatchlistFlagMap({});
    saveWatchlistFlagMap({});
  }, []);

  const handleReorderWatchlistSymbols = useCallback(
    (nextSymbols: string[]) => {
      if (activeWatchlistRef.kind !== 'custom') return;
      setCustomWatchlists((prev) => {
        const next = prev.map((list) =>
          list.id === activeWatchlistRef.id ? { ...list, symbols: nextSymbols } : list
        );
        saveCustomWatchlists(next);
        return next;
      });
    },
    [activeWatchlistRef]
  );

  const handleUpdateColumnPrefs = useCallback((next: WatchlistColumnPrefs) => {
    setWatchlistColumnPrefs(next);
    saveWatchlistColumnPrefs(next);
  }, []);

  const activeToolDef = findDrawingTool(activeTool);
  const editingIndicator = indicators.find((i) => i.id === editingIndicatorId) ?? null;

  return (
    <div
      ref={wrapperRef}
      data-testid="tradingview-workspace"
      data-symbol={symbol}
      data-timeframe={timeframe}
      data-theme={theme}
      className="flex flex-col w-screen h-dvh bg-slate-50 dark:bg-[#000000] text-slate-900 dark:text-[#e6eaf2] overflow-hidden"
    >
      <TopToolbar
        symbol={symbol}
        meta={meta}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        chartType={chartType}
        onChartTypeChange={setChartType}
        yAxisScale={yAxisScale}
        onCycleYAxisScale={handleCycleYAxisScale}
        indicators={indicators}
        onAddIndicator={handleAddIndicator}
        onToggleSingleIndicator={handleToggleSingleIndicator}
        onEditIndicator={(ind) => setEditingIndicatorId(ind.id)}
        onToggleIndicatorVisible={handleToggleIndicatorVisible}
        onRemoveIndicator={handleRemoveIndicator}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        watchlistOpen={watchlistOpen}
        onToggleWatchlist={() => setWatchlistOpen((prev) => !prev)}
        screenerOpen={screenerOpen}
        onToggleScreener={() => setScreenerOpen((prev) => !prev)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        onScreenshot={handleScreenshot}
        onOpenSearch={() => {
          setSearchMode('chart');
          setSearchOpen(true);
        }}
        onOpenChartSettings={() => setChartSettingsOpen(true)}
        activeFlagColor={watchlistFlagMap[symbol] ?? null}
        onToggleActiveFlag={() => handleToggleWatchlistFlag(symbol)}
        favoriteTimeframes={favoriteTimeframes}
        onFavoriteTimeframesChange={(nextKeys) => {
          setFavoriteTimeframes(nextKeys);
          saveFavoriteTimeframes(nextKeys);
        }}
        username={username}
        cloudSyncStatus={userId ? cloudSyncStatus : 'idle'}
        onSignOut={onSignOut ? handleSignOutWithFlush : undefined}
      />

      <div
        className={`flex flex-1 min-h-0 relative lg:overflow-hidden ${
          screenerOpen && (screenerExpanded || isMobileViewport) ? 'hidden' : ''
        }`}
      >
        <DrawingSidebar
          mobileOpen={mobileToolsOpen}
          activeTool={activeTool}
          onSelectTool={handleSelectTool}
          onCancelDrawing={cancelPendingDrawing}
          magnetMode={magnetMode}
          onCycleMagnet={handleCycleMagnet}
          drawingsLocked={drawingsLocked}
          onToggleLock={handleToggleLock}
          drawingsVisible={drawingsVisible}
          onToggleVisible={handleToggleVisible}
          drawingCount={drawingCount}
          onUndo={handleUndoDrawing}
          onClearAll={handleRequestClearAllDrawings}
        />

        {/* Central Chart Canvas */}
        <main className="relative flex-1 min-w-0 min-h-0 bg-white dark:bg-[#181C27]">
          {/* TradingView-Style On-Chart Active Indicator Legend */}
          <ChartIndicatorLegend
            indicators={indicators}
            onToggleVisible={handleToggleIndicatorVisible}
            onEdit={(ind) => setEditingIndicatorId(ind.id)}
            onRemove={handleRemoveIndicator}
            onQuickAddMA={() => handleAddIndicator('FLEX_MA')}
          />

          {/* TradingView-Style Floating Drawing Style Toolbar (on trendline/drawing click) */}
          <FloatingDrawingToolbar
            visible={Boolean(selectedOverlayId && selectedOverlayMeta && !activeTool)}
            toolLabel={
              findDrawingTool(selectedOverlayMeta?.name ?? null)?.label ??
              selectedOverlayMeta?.name ??
              'Drawing'
            }
            style={selectedOverlayMeta?.style ?? DEFAULT_DRAWING_STYLE}
            locked={selectedOverlayMeta?.locked ?? false}
            onChangeStyle={handleUpdateSelectedOverlayStyle}
            onToggleLock={handleToggleSelectedOverlayLock}
            onDelete={handleDeleteSelectedOverlay}
            onEditText={
              (selectedOverlayMeta?.name === 'simpleAnnotation' ||
                selectedOverlayMeta?.name === 'plainText') &&
              selectedOverlayId
                ? () => openCalloutEditor(selectedOverlayId)
                : undefined
            }
            onEditImage={
              selectedOverlayMeta?.name === 'chartImage' && selectedOverlayId
                ? () => openImageEditor(selectedOverlayId)
                : undefined
            }
          />

          {/* Inline Text / Callout Note Editor */}
          {editingCallout && (
            <form
              data-testid="callout-text-editor"
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveCalloutText();
              }}
              className="absolute top-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/95 dark:bg-[#16181d]/95 border border-slate-200 dark:border-[#2e323d] shadow-2xl backdrop-blur-sm"
            >
              <label htmlFor="callout-text-input" className="text-[11px] font-medium text-slate-500 dark:text-[#8b95a7] whitespace-nowrap">
                {editingCallout.label}
              </label>
              <input
                id="callout-text-input"
                ref={calloutInputRef}
                type="text"
                aria-label="Callout text"
                value={editingCallout.text}
                placeholder="Type note..."
                onChange={(e) => handleCalloutTextChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCancelCalloutText();
                  }
                }}
                className="w-52 px-2.5 py-1 rounded bg-slate-100 dark:bg-[#0e1117] border border-slate-300 dark:border-[#2e323d] text-xs text-slate-900 dark:text-[#f8fafc] focus:outline-none focus:border-[#2962ff]"
              />
              <button
                type="submit"
                className="px-2.5 py-1 rounded bg-[#2962ff] hover:bg-[#1e53e5] text-white text-xs font-medium transition-colors cursor-pointer"
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleCancelCalloutText}
                aria-label="Cancel callout text"
                className="px-2 py-1 rounded text-xs text-slate-600 hover:bg-slate-100 dark:text-[#b2b5be] dark:hover:bg-[#232732] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </form>
          )}

          {/* Minimal Upload Image Button (drag image corners directly on chart to resize) */}
          {editingImage && (
            <div
              data-testid="image-annotation-editor"
              className="absolute top-14 left-1/2 -translate-x-1/2 z-30"
            >
              <label className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white/95 hover:bg-slate-100 dark:bg-[#1e222d]/95 dark:hover:bg-[#2a2e39] border border-slate-200 dark:border-[#363a45] text-xs font-medium text-slate-800 dark:text-[#f0f3fa] shadow-2xl backdrop-blur-sm cursor-pointer whitespace-nowrap transition-colors">
                Upload Image
                <input
                  type="file"
                  accept="image/*"
                  aria-label="Upload image file"
                  onChange={(e) => handleImageFileUpload(e.target.files?.[0])}
                  className="sr-only"
                />
              </label>
            </div>
          )}

          {/* Loading state overlay */}
          {loadingChart && (
            <div
              role="status"
              aria-live="polite"
              className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded bg-white/95 dark:bg-[#1a1f2c]/95 border border-slate-200 dark:border-[#2d3446] text-xs text-slate-700 dark:text-[#d5dce8] shadow-md pointer-events-none"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2962ff]" />
              <span>
                Loading <span className="font-mono font-semibold">{symbol}</span> ({timeframe})
              </span>
            </div>
          )}

          {/* Subtle TradingView-style historical chunk loading pill */}
          {!loadingChart && loadingHistory && (
            <div
              role="status"
              aria-live="polite"
              data-testid="history-loading-indicator"
              className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-2.5 py-1 rounded bg-white/90 dark:bg-[#1a1f2c]/90 border border-slate-200/80 dark:border-[#2d3446]/80 text-[11px] text-slate-600 dark:text-[#b2b5be] shadow-sm pointer-events-none"
            >
              <Loader2 className="w-3 h-3 animate-spin text-[#2962ff]" />
              <span>Loading older history…</span>
            </div>
          )}

          {/* Error banner with retry */}
          {errorMsg && !loadingChart && (
            <div
              role="alert"
              className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-3.5 py-2 rounded bg-red-50 dark:bg-[#2a1518] border border-red-300 dark:border-[#ef5350]/50 text-xs text-red-700 dark:text-[#fca5a5] shadow-md"
            >
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={() => setReloadTick((n) => n + 1)}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            </div>
          )}

          {/* Subtle TradingView-Style Bottom-Center X-Axis Zoom & Fit Controls */}
          {!activeToolDef && chartSettings.showZoomControls && (
            <div
              role="group"
              aria-label="Chart horizontal zoom controls"
              data-testid="chart-zoom-controls"
              className="absolute bottom-9 left-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5 px-1 py-0.5 rounded-md bg-white/90 dark:bg-[#161a25]/90 border border-slate-200/90 dark:border-[#2a3142]/90 shadow-lg backdrop-blur-xs opacity-85 sm:opacity-55 hover:opacity-100 focus-within:opacity-100 transition-opacity"
            >
              <button
                type="button"
                onClick={handleZoomOutX}
                aria-label="Zoom out X axis"
                title="Perkecil kurva / Zoom out X"
                className="w-7 h-7 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#b2b5be] dark:hover:bg-[#23293a] dark:hover:text-white transition-colors cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleZoomInX}
                aria-label="Zoom in X axis"
                title="Perbesar kurva / Zoom in X"
                className="w-7 h-7 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#b2b5be] dark:hover:bg-[#23293a] dark:hover:text-white transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-slate-200 dark:bg-[#2a3142] mx-0.5" />
              <button
                type="button"
                onClick={handleFitAllX}
                aria-label="Fit all bars on X axis"
                title="Tampilkan seluruh data pada sumbu X (Fit All)"
                className="h-7 px-2 rounded flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#b2b5be] dark:hover:bg-[#23293a] dark:hover:text-white transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Fit</span>
              </button>
              <button
                type="button"
                onClick={handleResetZoomX}
                aria-label="Reset chart zoom"
                title="Reset zoom ke default"
                className="w-7 h-7 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#b2b5be] dark:hover:bg-[#23293a] dark:hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Contextual Drawing Mode Instruction Bar */}
          {activeToolDef && (
            <div
              data-testid="drawing-mode-banner"
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-3.5 py-2 rounded-md bg-white/95 dark:bg-[#1a1f2c]/95 border border-[#2962ff]/50 text-xs text-slate-800 dark:text-[#e6eaf2] shadow-lg"
            >
              <span>
                <strong className="text-[#2962ff] dark:text-[#5b9cf6]">{activeToolDef.label}</strong>
                {' — '}
                {activeToolDef.hint}
              </span>
              <button
                type="button"
                onClick={cancelPendingDrawing}
                aria-label="Cancel drawing mode"
                className="p-0.5 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-[#8b95a7] dark:hover:bg-[#252c3d] dark:hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div
            ref={canvasContainerRef}
            data-testid="chart-canvas"
            onMouseDown={() => {
              overlayInteractedRef.current = false;
            }}
            onClick={() => {
              window.requestAnimationFrame(() => {
                if (!overlayInteractedRef.current && selectedOverlayIdRef.current && !activeTool) {
                  setSelectedOverlayId(null);
                  setSelectedOverlayMeta(null);
                }
                overlayInteractedRef.current = false;
              });
            }}
            className="w-full h-full touch-none"
          />
        </main>

        <WatchlistPanel
          open={watchlistOpen}
          screenerOpen={screenerOpen}
          onClose={() => setWatchlistOpen(false)}
          activeSymbol={symbol}
          activeMeta={meta}
          activeRef={activeWatchlistRef}
          customWatchlists={customWatchlists}
          symbols={activeWatchlistSymbols}
          flagMap={watchlistFlagMap}
          columnPrefs={watchlistColumnPrefs}
          quotes={watchlistQuotes}
          loadingQuotes={loadingQuotes}
          onSelectSymbol={(nextSym) => {
            setSymbol(nextSym);
            if (window.innerWidth < 1024) setWatchlistOpen(false);
          }}
          onSelectList={handleSelectWatchlistRef}
          onCreateList={handleCreateCustomWatchlist}
          onOpenWatchlistsModal={() => setWatchlistsModalOpen(true)}
          onAddCurrentSymbol={handleAddCurrentSymbol}
          onAddSymbolToCustomList={handleAddSymbolToCustomList}
          onRemoveSymbol={handleRemoveActiveWatchlistSymbol}
          onToggleFlag={handleToggleWatchlistFlag}
          onSetFlagColor={handleSetWatchlistFlagColor}
          onUnflagAll={handleUnflagAll}
          onReorderSymbols={handleReorderWatchlistSymbols}
          onUpdateColumnPrefs={handleUpdateColumnPrefs}
          onRefreshQuotes={() => fetchWatchlistQuotes(allWatchedSymbols)}
          onOpenWatchlistAdd={() => {
            setSearchMode('watchlist');
            setSearchOpen(true);
          }}
        />
      </div>

      <StockScreenerPanel
        open={screenerOpen}
        expanded={screenerExpanded || isMobileViewport}
        onToggleExpand={() => setScreenerExpanded((prev) => !prev)}
        onClose={() => {
          setScreenerOpen(false);
          setScreenerExpanded(false);
        }}
        activeSymbol={symbol}
        watchlistSymbols={allWatchedSymbols}
        flagMap={watchlistFlagMap}
        savedPresets={savedScreenerPresets}
        onSavePresets={(next) => {
          setSavedScreenerPresets(next);
          try {
            window.localStorage.setItem('meridian_screener_presets_v1', JSON.stringify(next));
          } catch {
            // Ignore localStorage quota issues
          }
        }}
        onSelectSymbol={(nextSym) => {
          setSymbol(nextSym);
          if (isMobileViewport) {
            setScreenerOpen(false);
            setScreenerExpanded(false);
          }
        }}
        onToggleFlag={handleToggleWatchlistFlag}
        onAddToActiveWatchlist={(nextSym) => handleAddSymbolToTargetList(activeWatchlistRef, nextSym)}
        onSaveMatchesToWatchlist={(symbolsList, suggestedName) => {
          handleCreateCustomWatchlist(suggestedName, symbolsList);
          if (window.innerWidth >= 1024) {
            setWatchlistOpen(true);
          }
        }}
      />

      {/* Mobile Bottom Navigation Bar (TradingView Mobile style on phones < 768px) */}
      <nav
        aria-label="Mobile workspace navigation"
        data-testid="mobile-bottom-nav"
        className="md:hidden shrink-0 flex items-stretch justify-around bg-white dark:bg-[#090b10] border-t border-slate-200 dark:border-[#1f2430] px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] z-50 select-none"
      >
        <button
          type="button"
          onClick={() => {
            setScreenerOpen(false);
            setScreenerExpanded(false);
            setWatchlistOpen(false);
          }}
          className={`flex-1 py-1.5 rounded-lg flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
            !screenerOpen && !watchlistOpen
              ? 'text-[#2962ff] dark:text-[#60a5fa]'
              : 'text-slate-500 dark:text-[#8b95a7]'
          }`}
        >
          <CandlestickChart className="w-4 h-4" />
          <span>Chart</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setWatchlistOpen(false);
            setScreenerOpen((prev) => {
              const next = !prev;
              setScreenerExpanded(next);
              return next;
            });
          }}
          className={`flex-1 py-1.5 rounded-lg flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
            screenerOpen
              ? 'text-[#2962ff] dark:text-[#60a5fa]'
              : 'text-slate-500 dark:text-[#8b95a7]'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Screener</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setScreenerOpen(false);
            setScreenerExpanded(false);
            setWatchlistOpen(false);
            setMobileToolsOpen((prev) => !prev);
          }}
          className={`relative flex-1 py-1.5 rounded-lg flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
            mobileToolsOpen || activeTool
              ? 'text-[#2962ff] dark:text-[#60a5fa]'
              : 'text-slate-500 dark:text-[#8b95a7]'
          }`}
        >
          <Pencil className="w-4 h-4" />
          <span>Draw</span>
          {drawingCount > 0 && (
            <span className="absolute top-1 right-4 min-w-[14px] h-[14px] px-1 rounded-full bg-[#2962ff] text-white text-[9px] font-mono flex items-center justify-center">
              {drawingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setScreenerOpen(false);
            setScreenerExpanded(false);
            setWatchlistOpen((prev) => !prev);
          }}
          className={`flex-1 py-1.5 rounded-lg flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
            watchlistOpen
              ? 'text-[#2962ff] dark:text-[#60a5fa]'
              : 'text-slate-500 dark:text-[#8b95a7]'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Watchlist</span>
        </button>
      </nav>

      <SymbolSearchModal
        open={searchOpen}
        mode={searchMode}
        activeSymbol={symbol}
        activeRef={activeWatchlistRef}
        customWatchlists={customWatchlists}
        flagMap={watchlistFlagMap}
        onClose={() => setSearchOpen(false)}
        onSelectSymbol={(nextSym) => setSymbol(nextSym)}
        onAddToTargetList={handleAddSymbolToTargetList}
        onRemoveFromTargetList={handleRemoveSymbolFromTargetList}
        onToggleFlag={handleToggleWatchlistFlag}
        onSetFlagColor={handleSetWatchlistFlagColor}
      />

      <WatchlistsModal
        open={watchlistsModalOpen}
        onClose={() => setWatchlistsModalOpen(false)}
        activeRef={activeWatchlistRef}
        customWatchlists={customWatchlists}
        flagMap={watchlistFlagMap}
        onSelectList={handleSelectWatchlistRef}
        onCreateList={(name) => handleCreateCustomWatchlist(name)}
        onRenameList={handleRenameCustomWatchlist}
        onDeleteList={handleRequestDeleteCustomWatchlist}
      />

      {(pendingDeleteList || pendingClearDrawings) && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={pendingDeleteList ? 'Konfirmasi hapus list' : 'Konfirmasi hapus semua gambar'}
          className="fixed inset-0 bg-black/60 flex items-center justify-center px-4 z-[90]"
          onClick={() => {
            setPendingDeleteList(null);
            setPendingClearDrawings(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-lg bg-white dark:bg-[#1e222d] border border-slate-200 dark:border-[#2a2e39] shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-[#f0f3fa]">
                {pendingDeleteList ? 'Hapus List Watchlist?' : 'Hapus Semua Gambar?'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-[#b2b5be]">
                {pendingDeleteList ? (
                  <>
                    Apakah Anda yakin ingin menghapus list{' '}
                    <span className="font-semibold text-slate-900 dark:text-[#f0f3fa]">
                      "{pendingDeleteList.name}"
                    </span>
                    ? Tindakan ini tidak dapat dibatalkan.
                  </>
                ) : (
                  <>
                    Apakah Anda yakin ingin menghapus semua{' '}
                    <span className="font-semibold text-slate-900 dark:text-[#f0f3fa]">
                      {drawingCount}
                    </span>{' '}
                    gambar pada chart{' '}
                    <span className="font-semibold text-slate-900 dark:text-[#f0f3fa]">
                      {symbol}
                    </span>
                    ? Tindakan ini tidak dapat dibatalkan.
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPendingDeleteList(null);
                  setPendingClearDrawings(false);
                }}
                className="h-8 px-3 rounded text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-[#d1d4dc] dark:hover:bg-[#2a2e39] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={
                  pendingDeleteList ? handleConfirmDeleteCustomWatchlist : handleClearAllDrawings
                }
                className="h-8 px-3.5 rounded text-xs font-semibold bg-[#f23645] hover:bg-[#d92b3a] text-white cursor-pointer"
              >
                {pendingDeleteList ? 'Ya, Hapus' : 'Ya, Hapus Semua'}
              </button>
            </div>
          </div>
        </div>
      )}

      <IndicatorSettingsModal
        indicator={editingIndicator}
        onLiveChange={handleLiveUpdateIndicator}
        onConfirm={handleConfirmIndicatorSettings}
        onCancel={handleCancelIndicatorSettings}
      />

      <ChartSettingsModal
        open={chartSettingsOpen}
        settings={chartSettings}
        onLiveChange={(next) => setChartSettings(next)}
        onConfirm={(next) => {
          setChartSettings(next);
          saveChartSettings(next);
          setChartSettingsOpen(false);
        }}
        onCancel={(original) => {
          setChartSettings(original);
          setChartSettingsOpen(false);
        }}
      />
    </div>
  );
}
