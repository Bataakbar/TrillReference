import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Bookmark,
  Check,
  ChevronDown,
  Columns3,
  Download,
  Filter,
  Loader2,
  Maximize2,
  Minimize2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import { STOCK_SECTOR_OPTIONS } from '../../shared/instrumentCatalog';
import { getPricePrecision } from '../../shared/timeframes';
import {
  BUILT_IN_SCREENER_PRESETS,
  DEFAULT_SCREENER_FILTERS,
  NUMERIC_RULE_FIELD_LABELS,
  SCREENER_COLUMNS,
  SCREENER_TABS,
  countActiveScreenerFilters,
  filterScreenerRows,
  sortScreenerRows,
  type ChangeBandFilter,
  type Ema9FilterMode,
  type MaTrendFilterMode,
  type MarketCapBandFilter,
  type MacdSignalFilter,
  type RsiBandFilter,
  type ScreenerColumnKey,
  type ScreenerFilterState,
  type ScreenerMarket,
  type ScreenerNumericField,
  type ScreenerNumericOp,
  type ScreenerNumericRule,
  type ScreenerPreset,
  type ScreenerRow,
  type ScreenerSortState,
  type ScreenerTabId,
  type ScreenerTimeframe,
  type TechRatingFilter,
  type TechRatingLabel,
} from '../../shared/screenerModel';
import { formatCompactVolume } from '../utils/drawingStorage';
import { getTickerAvatar, type FlagColor, type WatchlistFlagMap } from '../utils/watchlistModel';
import { FlagRibbonIcon } from './FlagRibbon';

interface ScreenerApiResponse {
  market: ScreenerMarket;
  tf: ScreenerTimeframe;
  rows: ScreenerRow[];
  scannedAt: number;
  totalUniverse: number;
  technicalReadyCount: number;
  error?: string;
}

interface StockScreenerPanelProps {
  open: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onClose: () => void;
  activeSymbol: string;
  watchlistSymbols: string[];
  flagMap: WatchlistFlagMap;
  savedPresets: ScreenerPreset[];
  onSavePresets: (next: ScreenerPreset[]) => void;
  onSelectSymbol: (symbol: string) => void;
  onToggleFlag: (symbol: string) => void;
  onAddToActiveWatchlist?: (symbol: string) => void;
}

const MARKET_OPTIONS: ReadonlyArray<{ id: ScreenerMarket; label: string; badge: string }> = [
  { id: 'ID', label: 'Indonesia (IDX)', badge: '🇮🇩 IDX' },
  { id: 'US', label: 'USA (NASDAQ / NYSE)', badge: '🇺🇸 US' },
  { id: 'GLOBAL', label: 'Global Equities', badge: '🌏 Global' },
  { id: 'CRYPTO', label: 'Crypto Pairs', badge: '₿ Crypto' },
  { id: 'WATCHLIST', label: 'My Watchlist', badge: '★ Watchlist' },
];

const TF_OPTIONS: ReadonlyArray<{ id: ScreenerTimeframe; label: string }> = [
  { id: '1d', label: '1D' },
  { id: '1w', label: '1W' },
  { id: '4h', label: '4H' },
  { id: '1h', label: '1H' },
  { id: '15m', label: '15m' },
];

const EMA9_OPTIONS: ReadonlyArray<{ id: Ema9FilterMode; label: string }> = [
  { id: 'all', label: 'EMA 9: All' },
  { id: 'above_ema9', label: 'Harga > EMA 9' },
  { id: 'cross_above_ema9', label: 'Cross Up EMA 9' },
  { id: 'above_ema9_20', label: 'Harga > EMA 9 > 20' },
  { id: 'golden_stack', label: 'Trend (> EMA 9 > 20 > SMA 50)' },
  { id: 'below_ema9', label: 'Harga < EMA 9' },
];

function formatCompactMoney(val: number | null, currency: string): string {
  if (val === null || !Number.isFinite(val)) return '—';
  const prefix = currency.toUpperCase() === 'IDR' ? 'Rp ' : '$';
  const abs = Math.abs(val);
  if (abs >= 1e12) return `${prefix}${(val / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${prefix}${(val / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${prefix}${(val / 1e6).toFixed(1)}M`;
  return `${prefix}${val.toLocaleString()}`;
}

function formatPriceValue(val: number | null, symbol: string): string {
  if (val === null || !Number.isFinite(val)) return '—';
  const prec = getPricePrecision(symbol, val);
  return val.toLocaleString(undefined, {
    minimumFractionDigits: prec,
    maximumFractionDigits: prec,
  });
}

function formatPct(val: number | null): string {
  if (val === null || !Number.isFinite(val)) return '—';
  return `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;
}

function techRatingBadgeClass(rating: TechRatingLabel): string {
  switch (rating) {
    case 'Strong Buy':
      return 'bg-[#089981]/20 text-[#089981] dark:text-[#2dd4bf] border-[#089981]/40';
    case 'Buy':
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    case 'Strong Sell':
      return 'bg-[#f23645]/20 text-[#dc2626] dark:text-[#f87171] border-[#f23645]/40';
    case 'Sell':
      return 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30';
    case 'Neutral':
    default:
      return 'bg-slate-100 text-slate-600 dark:bg-[#23293a] dark:text-[#98a2b3] border-slate-200 dark:border-[#30374a]';
  }
}

function getFlagTooltip(color: FlagColor | undefined): string {
  return color ? `Flagged (${color})` : 'Flag symbol';
}

export default function StockScreenerPanel({
  open,
  expanded,
  onToggleExpand,
  onClose,
  activeSymbol,
  watchlistSymbols,
  flagMap,
  savedPresets,
  onSavePresets,
  onSelectSymbol,
  onToggleFlag,
  onAddToActiveWatchlist,
}: StockScreenerPanelProps) {
  const [market, setMarket] = useState<ScreenerMarket>(() =>
    activeSymbol.toUpperCase().endsWith('.JK') ? 'ID' : 'US'
  );
  const [tf, setTf] = useState<ScreenerTimeframe>('1d');
  const [activeTab, setActiveTab] = useState<ScreenerTabId>('technicals');
  const [filters, setFilters] = useState<ScreenerFilterState>(() => ({
    ...DEFAULT_SCREENER_FILTERS,
    ema9Mode: 'above_ema9',
  }));
  const [activePresetId, setActivePresetId] = useState<string>('above-ema9');
  const [sort, setSort] = useState<ScreenerSortState>({
    key: 'ema9DiffPct',
    direction: 'desc',
  });
  const [customColumnsByTab, setCustomColumnsByTab] = useState<
    Partial<Record<ScreenerTabId, ScreenerColumnKey[]>>
  >({});

  // Data state
  const [rows, setRows] = useState<ScreenerRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [scannedAt, setScannedAt] = useState<number | null>(null);
  const [totalUniverse, setTotalUniverse] = useState<number>(0);

  // Popovers & Modals
  const [presetMenuOpen, setPresetMenuOpen] = useState(false);
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const [allFiltersOpen, setAllFiltersOpen] = useState(false);
  const [savingPreset, setSavingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // Draft custom rule builder state inside All Filters modal
  const [draftField, setDraftField] = useState<ScreenerNumericField>('ema9DiffPct');
  const [draftOp, setDraftOp] = useState<ScreenerNumericOp>('gte');
  const [draftVal, setDraftVal] = useState<string>('0');
  const [draftValMax, setDraftValMax] = useState<string>('5');

  const panelRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runScan = useCallback(
    async (opts?: { forceRefresh?: boolean }) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setLoading(true);
      setErrorMsg('');

      try {
        const params = new URLSearchParams({
          market,
          tf,
        });
        if (market === 'WATCHLIST') {
          params.set('symbols', watchlistSymbols.join(','));
        }
        if (opts?.forceRefresh) {
          params.set('refresh', '1');
        }

        const resp = await fetch(`/api/screener?${params.toString()}`, {
          signal: ctrl.signal,
        });
        const data = (await resp.json()) as ScreenerApiResponse;
        if (!resp.ok) {
          throw new Error(data.error || 'Gagal menjalankan scan screener.');
        }

        setRows(Array.isArray(data.rows) ? data.rows : []);
        setScannedAt(typeof data.scannedAt === 'number' ? data.scannedAt : Date.now());
        setTotalUniverse(typeof data.totalUniverse === 'number' ? data.totalUniverse : 0);
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        setErrorMsg(err instanceof Error ? err.message : 'Gagal memuat data screener.');
      } finally {
        if (!ctrl.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [market, tf, watchlistSymbols]
  );

  useEffect(() => {
    if (!open) return;
    runScan();
    return () => {
      abortRef.current?.abort();
    };
  }, [open, runScan]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPresetMenuOpen(false);
        setColumnsMenuOpen(false);
        setAllFiltersOpen(false);
      }
    };
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(target)) {
        setPresetMenuOpen(false);
        setColumnsMenuOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, []);

  const visibleColumns = useMemo<ScreenerColumnKey[]>(() => {
    const override = customColumnsByTab[activeTab];
    if (override && override.length > 0) return override;
    return SCREENER_TABS.find((t) => t.id === activeTab)?.columns ?? SCREENER_TABS[0].columns;
  }, [activeTab, customColumnsByTab]);

  const filteredRows = useMemo(() => filterScreenerRows(rows, filters), [rows, filters]);
  const sortedRows = useMemo(() => sortScreenerRows(filteredRows, sort), [filteredRows, sort]);
  const activeFilterCount = useMemo(() => countActiveScreenerFilters(filters), [filters]);
  const allPresets = useMemo(
    () => [...BUILT_IN_SCREENER_PRESETS, ...savedPresets],
    [savedPresets]
  );

  if (!open) return null;

  const updateFilter = <K extends keyof ScreenerFilterState>(
    key: K,
    value: ScreenerFilterState[K]
  ) => {
    setActivePresetId('custom');
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyPreset = (preset: ScreenerPreset) => {
    setActivePresetId(preset.id);
    setFilters({ ...preset.filters, customRules: [...preset.filters.customRules] });
    if (preset.tab) setActiveTab(preset.tab);
    setPresetMenuOpen(false);
  };

  const handleSaveNewPreset = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPresetName.trim();
    if (!trimmed) return;
    const nextPreset: ScreenerPreset = {
      id: `user_${Date.now()}`,
      name: trimmed,
      description: `${countActiveScreenerFilters(filters)} filter aktif`,
      isBuiltIn: false,
      tab: activeTab,
      filters: { ...filters, customRules: [...filters.customRules] },
    };
    const nextList = [...savedPresets, nextPreset];
    onSavePresets(nextList);
    setActivePresetId(nextPreset.id);
    setNewPresetName('');
    setSavingPreset(false);
  };

  const handleDeleteUserPreset = (id: string) => {
    const nextList = savedPresets.filter((p) => p.id !== id);
    onSavePresets(nextList);
    if (activePresetId === id) {
      setActivePresetId('custom');
    }
  };

  const handleHeaderSort = (colKey: ScreenerColumnKey) => {
    setSort((prev) => {
      if (prev.key === colKey) {
        return { key: colKey, direction: prev.direction === 'desc' ? 'asc' : 'desc' };
      }
      const defaultDir = colKey === 'symbol' || colKey === 'sector' ? 'asc' : 'desc';
      return { key: colKey, direction: defaultDir };
    });
  };

  const handleToggleColumn = (colKey: ScreenerColumnKey) => {
    if (colKey === 'symbol') return;
    const current = [...visibleColumns];
    const exists = current.includes(colKey);
    const next = exists ? current.filter((c) => c !== colKey) : [...current, colKey];
    setCustomColumnsByTab((prev) => ({ ...prev, [activeTab]: next }));
  };

  const handleAddCustomRule = () => {
    const v1 = Number(draftVal);
    if (!Number.isFinite(v1)) return;
    const v2 = Number(draftValMax);
    const rule: ScreenerNumericRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      field: draftField,
      operator: draftOp,
      value: v1,
      ...(draftOp === 'between' && Number.isFinite(v2) ? { valueMax: v2 } : {}),
    };
    setActivePresetId('custom');
    setFilters((prev) => ({ ...prev, customRules: [...prev.customRules, rule] }));
  };

  const handleExportCsv = () => {
    const headers = visibleColumns.map(
      (k) => SCREENER_COLUMNS.find((c) => c.key === k)?.label ?? k
    );
    const escapeCell = (val: unknown) => {
      const s = val === null || val === undefined ? '' : String(val);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      headers.map(escapeCell).join(','),
      ...sortedRows.map((row) =>
        visibleColumns.map((k) => escapeCell(row[k])).join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trillreference-screener-${market.toLowerCase()}-${tf}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activePresetLabel =
    allPresets.find((p) => p.id === activePresetId)?.name ?? 'Custom Screen';

  return (
    <section
      ref={panelRef}
      data-testid="stock-screener-panel"
      aria-label="Stock Screener"
      className={`flex flex-col bg-white dark:bg-[#0d1017] border-t border-slate-200 dark:border-[#1f2430] select-none z-30 ${
        expanded ? 'flex-1 min-h-0' : 'h-[46%] min-h-[290px] max-h-[540px] shrink-0'
      }`}
    >
      {/* Top Screener Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-slate-200 dark:border-[#1f2430] bg-slate-50/80 dark:bg-[#11141d]">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-[#f0f3fa]">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#2962ff]" />
            <span>Stock Screener</span>
          </div>

          <span
            data-testid="screener-match-count"
            className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-slate-200/80 dark:bg-[#1e2433] text-slate-700 dark:text-[#cbd5e1]"
          >
            {sortedRows.length} / {rows.length || totalUniverse}
          </span>

          {/* Market Selector */}
          <select
            aria-label="Screener market"
            data-testid="screener-market-select"
            value={market}
            onChange={(e) => setMarket(e.target.value as ScreenerMarket)}
            className="h-7 px-2 rounded bg-white dark:bg-[#171b26] border border-slate-200 dark:border-[#2a3142] text-xs font-medium text-slate-800 dark:text-[#e6eaf2] focus:outline-none focus:border-[#2962ff] cursor-pointer"
          >
            {MARKET_OPTIONS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.badge} — {m.label}
              </option>
            ))}
          </select>

          {/* Saved Screens / Presets Dropdown */}
          <div className="relative">
            <button
              type="button"
              data-testid="screener-presets-button"
              onClick={() => {
                setPresetMenuOpen((v) => !v);
                setColumnsMenuOpen(false);
              }}
              className="h-7 px-2.5 rounded bg-white dark:bg-[#171b26] hover:bg-slate-100 dark:hover:bg-[#1e2433] border border-slate-200 dark:border-[#2a3142] text-xs font-medium text-slate-800 dark:text-[#f0f3fa] flex items-center gap-1.5 cursor-pointer"
            >
              <Bookmark className="w-3 h-3 text-[#2962ff]" />
              <span className="max-w-[190px] truncate">{activePresetLabel}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {presetMenuOpen && (
              <div className="absolute left-0 top-8 w-80 rounded-lg bg-white dark:bg-[#161a24] border border-slate-200 dark:border-[#2a3142] shadow-2xl p-1.5 z-50">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#787b86]">
                  Built-In Screens
                </div>
                <div className="max-h-72 overflow-y-auto thin-scrollbar space-y-0.5">
                  {BUILT_IN_SCREENER_PRESETS.map((preset) => {
                    const active = activePresetId === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className={`w-full text-left px-2.5 py-1.5 rounded flex items-start justify-between gap-2 transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#2962ff]/12 text-[#2962ff] dark:text-[#60a5fa]'
                            : 'hover:bg-slate-100 dark:hover:bg-[#212736] text-slate-800 dark:text-[#e6eaf2]'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-medium">{preset.name}</div>
                          <div className="text-[10px] text-slate-500 dark:text-[#8b95a7]">
                            {preset.description}
                          </div>
                        </div>
                        {active && <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                      </button>
                    );
                  })}

                  {savedPresets.length > 0 && (
                    <>
                      <div className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#787b86] border-t border-slate-200 dark:border-[#242a38] mt-1">
                        Saved Screens
                      </div>
                      {savedPresets.map((preset) => {
                        const active = activePresetId === preset.id;
                        return (
                          <div
                            key={preset.id}
                            className={`flex items-center justify-between gap-1 rounded px-2 py-1.5 ${
                              active
                                ? 'bg-[#2962ff]/12 text-[#2962ff] dark:text-[#60a5fa]'
                                : 'hover:bg-slate-100 dark:hover:bg-[#212736] text-slate-800 dark:text-[#e6eaf2]'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => applyPreset(preset)}
                              className="flex-1 text-left cursor-pointer"
                            >
                              <div className="text-xs font-medium">{preset.name}</div>
                              <div className="text-[10px] text-slate-500 dark:text-[#8b95a7]">
                                {preset.description}
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUserPreset(preset.id)}
                              aria-label={`Delete saved screen ${preset.name}`}
                              className="p-1 rounded text-slate-400 hover:text-red-500 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>

                <div className="mt-1.5 pt-1.5 border-t border-slate-200 dark:border-[#242a38]">
                  {savingPreset ? (
                    <form onSubmit={handleSaveNewPreset} className="flex items-center gap-1 px-1">
                      <input
                        type="text"
                        autoFocus
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        placeholder="Nama screen baru..."
                        className="flex-1 h-7 px-2 rounded bg-slate-100 dark:bg-[#0d1017] border border-slate-300 dark:border-[#2a3142] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#2962ff]"
                      />
                      <button
                        type="submit"
                        className="h-7 px-2.5 rounded bg-[#2962ff] text-white text-xs font-medium cursor-pointer"
                      >
                        Simpan
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSavingPreset(true)}
                      className="w-full h-7 px-2 rounded flex items-center gap-1.5 text-xs font-medium text-[#2962ff] dark:text-[#60a5fa] hover:bg-slate-100 dark:hover:bg-[#212736] cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Save Current Screen…</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Technical Timeframe Selector */}
          <div
            role="group"
            aria-label="Screener indicator timeframe"
            className="flex items-center rounded bg-slate-200/70 dark:bg-[#171b26] p-0.5 border border-slate-200 dark:border-[#262c3a]"
          >
            {TF_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTf(opt.id)}
                className={`h-6 px-2 rounded text-[11px] font-mono font-medium transition-colors cursor-pointer ${
                  tf === opt.id
                    ? 'bg-white dark:bg-[#2962ff] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-[#8b95a7] hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Actions: Scan Status, Refresh, Expand, Close */}
        <div className="flex items-center gap-1.5">
          {scannedAt && !loading && (
            <span className="hidden xl:inline text-[11px] text-slate-400 dark:text-[#787b86]">
              Scan {new Date(scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            type="button"
            onClick={() => runScan({ forceRefresh: true })}
            disabled={loading}
            title="Refresh live Yahoo Finance quotes & EMA/RSI"
            className="h-7 px-2 rounded bg-white dark:bg-[#171b26] hover:bg-slate-100 dark:hover:bg-[#1e2433] border border-slate-200 dark:border-[#2a3142] text-xs text-slate-700 dark:text-[#cbd5e1] flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-[#2962ff]' : ''}`} />
            <span className="hidden sm:inline">{loading ? 'Scanning…' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleExpand}
            aria-label={expanded ? 'Split screener below chart' : 'Expand screener full view'}
            title={expanded ? 'Split View (Chart + Screener)' : 'Full Screener View'}
            className="h-7 w-7 rounded flex items-center justify-center text-slate-600 hover:bg-slate-200/70 dark:text-[#98a2b3] dark:hover:bg-[#1e2433] dark:hover:text-white cursor-pointer"
          >
            {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close screener"
            title="Close Screener"
            className="h-7 w-7 rounded flex items-center justify-center text-slate-600 hover:bg-slate-200/70 dark:text-[#98a2b3] dark:hover:bg-[#1e2433] dark:hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Filter Pills Bar (TradingView Style) */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-slate-200 dark:border-[#1f2430] overflow-x-auto thin-scrollbar bg-white dark:bg-[#0d1017]">
        {/* Ticker/Name search */}
        <div className="relative shrink-0">
          <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            aria-label="Filter screener symbol"
            value={filters.q}
            onChange={(e) => updateFilter('q', e.target.value)}
            placeholder="Filter ticker..."
            className="h-7 w-32 sm:w-36 pl-6 pr-2 rounded-md bg-slate-100 dark:bg-[#161a24] border border-slate-200 dark:border-[#262c3a] text-base sm:text-xs text-slate-900 dark:text-[#f0f3fa] placeholder:text-slate-400 focus:outline-none focus:border-[#2962ff]"
          />
        </div>

        {/* EMA 9 Quick Pill (Highlighted TradingView Style) */}
        <select
          aria-label="EMA 9 condition"
          data-testid="screener-ema9-filter"
          value={filters.ema9Mode}
          onChange={(e) => updateFilter('ema9Mode', e.target.value as Ema9FilterMode)}
          className={`h-7 px-2 rounded-md border text-xs font-medium cursor-pointer shrink-0 focus:outline-none ${
            filters.ema9Mode !== 'all'
              ? 'bg-[#2962ff]/12 border-[#2962ff]/50 text-[#2962ff] dark:text-[#60a5fa]'
              : 'bg-slate-100 dark:bg-[#161a24] border-slate-200 dark:border-[#262c3a] text-slate-700 dark:text-[#cbd5e1]'
          }`}
        >
          {EMA9_OPTIONS.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Sector Filter */}
        <select
          aria-label="Sector filter"
          value={filters.sector}
          onChange={(e) => updateFilter('sector', e.target.value)}
          className={`h-7 px-2 rounded-md border text-xs cursor-pointer shrink-0 focus:outline-none ${
            filters.sector !== 'All sectors'
              ? 'bg-[#2962ff]/12 border-[#2962ff]/50 text-[#2962ff] dark:text-[#60a5fa] font-medium'
              : 'bg-slate-100 dark:bg-[#161a24] border-slate-200 dark:border-[#262c3a] text-slate-700 dark:text-[#cbd5e1]'
          }`}
        >
          {STOCK_SECTOR_OPTIONS.map((sec) => (
            <option key={sec} value={sec}>
              {sec === 'All sectors' ? 'Sector: All' : sec}
            </option>
          ))}
        </select>

        {/* Price Change % */}
        <select
          aria-label="Change percent filter"
          value={filters.changeBand}
          onChange={(e) => updateFilter('changeBand', e.target.value as ChangeBandFilter)}
          className={`h-7 px-2 rounded-md border text-xs cursor-pointer shrink-0 focus:outline-none ${
            filters.changeBand !== 'all'
              ? 'bg-[#2962ff]/12 border-[#2962ff]/50 text-[#2962ff] dark:text-[#60a5fa] font-medium'
              : 'bg-slate-100 dark:bg-[#161a24] border-slate-200 dark:border-[#262c3a] text-slate-700 dark:text-[#cbd5e1]'
          }`}
        >
          <option value="all">Chg %: Any</option>
          <option value="gainers">Gainers (&gt; 0%)</option>
          <option value="up2">Strong (&gt;= +2%)</option>
          <option value="up5">Surge (&gt;= +5%)</option>
          <option value="losers">Losers (&lt; 0%)</option>
          <option value="down2">Drop (&lt;= -2%)</option>
        </select>

        {/* Relative Volume */}
        <select
          aria-label="Relative volume filter"
          value={filters.rvolMin === null ? '' : String(filters.rvolMin)}
          onChange={(e) => updateFilter('rvolMin', e.target.value ? Number(e.target.value) : null)}
          className={`h-7 px-2 rounded-md border text-xs cursor-pointer shrink-0 focus:outline-none ${
            filters.rvolMin !== null
              ? 'bg-[#2962ff]/12 border-[#2962ff]/50 text-[#2962ff] dark:text-[#60a5fa] font-medium'
              : 'bg-slate-100 dark:bg-[#161a24] border-slate-200 dark:border-[#262c3a] text-slate-700 dark:text-[#cbd5e1]'
          }`}
        >
          <option value="">Rel Vol: Any</option>
          <option value="1.2">RVOL &gt;= 1.2x</option>
          <option value="1.5">RVOL &gt;= 1.5x</option>
          <option value="2">RVOL &gt;= 2.0x</option>
          <option value="3">RVOL &gt;= 3.0x</option>
        </select>

        {/* RSI(14) */}
        <select
          aria-label="RSI 14 filter"
          value={filters.rsiBand}
          onChange={(e) => updateFilter('rsiBand', e.target.value as RsiBandFilter)}
          className={`h-7 px-2 rounded-md border text-xs cursor-pointer shrink-0 focus:outline-none ${
            filters.rsiBand !== 'all'
              ? 'bg-[#2962ff]/12 border-[#2962ff]/50 text-[#2962ff] dark:text-[#60a5fa] font-medium'
              : 'bg-slate-100 dark:bg-[#161a24] border-slate-200 dark:border-[#262c3a] text-slate-700 dark:text-[#cbd5e1]'
          }`}
        >
          <option value="all">RSI(14): Any</option>
          <option value="oversold">Oversold (&lt; 30)</option>
          <option value="bullish">Bullish (50 - 70)</option>
          <option value="neutral">Neutral (30 - 70)</option>
          <option value="overbought">Overbought (&gt; 70)</option>
        </select>

        {/* SMA 50 / 200 Trend */}
        <select
          aria-label="SMA trend filter"
          value={filters.maTrendMode}
          onChange={(e) => updateFilter('maTrendMode', e.target.value as MaTrendFilterMode)}
          className={`h-7 px-2 rounded-md border text-xs cursor-pointer shrink-0 focus:outline-none ${
            filters.maTrendMode !== 'all'
              ? 'bg-[#2962ff]/12 border-[#2962ff]/50 text-[#2962ff] dark:text-[#60a5fa] font-medium'
              : 'bg-slate-100 dark:bg-[#161a24] border-slate-200 dark:border-[#262c3a] text-slate-700 dark:text-[#cbd5e1]'
          }`}
        >
          <option value="all">SMA Trend: Any</option>
          <option value="above_sma50">Harga &gt; SMA 50</option>
          <option value="above_sma200">Harga &gt; SMA 200</option>
          <option value="golden_cross">SMA 50 &gt; SMA 200</option>
          <option value="below_sma200">Harga &lt; SMA 200</option>
        </select>

        {/* All Filters Modal Trigger */}
        <button
          type="button"
          onClick={() => setAllFiltersOpen(true)}
          className={`h-7 px-2.5 rounded-md border text-xs font-medium flex items-center gap-1.5 shrink-0 cursor-pointer ${
            filters.customRules.length > 0 ||
            filters.peMax !== null ||
            filters.divYieldMin !== null ||
            filters.macdFilter !== 'all' ||
            filters.techRatingFilter !== 'all' ||
            filters.marketCapBand !== 'all'
              ? 'bg-[#2962ff]/12 border-[#2962ff]/50 text-[#2962ff] dark:text-[#60a5fa]'
              : 'bg-slate-100 dark:bg-[#161a24] hover:bg-slate-200 dark:hover:bg-[#1e2433] border-slate-200 dark:border-[#262c3a] text-slate-700 dark:text-[#cbd5e1]'
          }`}
        >
          <Filter className="w-3 h-3" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="px-1.5 rounded-full bg-[#2962ff] text-white text-[10px] font-mono">
              {activeFilterCount}
            </span>
          )}
        </button>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setActivePresetId('all');
              setFilters({ ...DEFAULT_SCREENER_FILTERS });
            }}
            className="h-7 px-2 rounded-md text-xs text-slate-500 hover:text-slate-900 dark:text-[#8b95a7] dark:hover:text-white flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Category View Tabs & Table Tools */}
      <div className="flex items-center justify-between gap-2 px-3 py-1 border-b border-slate-200 dark:border-[#1f2430] bg-slate-50/50 dark:bg-[#0f1219]">
        <div role="tablist" aria-label="Screener column views" className="flex items-center gap-1 overflow-x-auto">
          {SCREENER_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`h-7 px-2.5 rounded text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-white dark:bg-[#1e2433] text-slate-900 dark:text-white shadow-2xs border border-slate-200 dark:border-[#2f3648]'
                    : 'text-slate-600 hover:text-slate-900 dark:text-[#8b95a7] dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 relative">
          <button
            type="button"
            onClick={() => {
              setColumnsMenuOpen((v) => !v);
              setPresetMenuOpen(false);
            }}
            title="Customize columns"
            className="h-7 px-2 rounded flex items-center gap-1 text-xs text-slate-600 hover:bg-slate-200/70 dark:text-[#98a2b3] dark:hover:bg-[#1e2433] dark:hover:text-white cursor-pointer"
          >
            <Columns3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Columns</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={sortedRows.length === 0}
            title="Export filtered table to CSV"
            className="h-7 px-2 rounded flex items-center gap-1 text-xs text-slate-600 hover:bg-slate-200/70 dark:text-[#98a2b3] dark:hover:bg-[#1e2433] dark:hover:text-white disabled:opacity-40 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          {columnsMenuOpen && (
            <div className="absolute right-0 top-8 w-64 rounded-lg bg-white dark:bg-[#161a24] border border-slate-200 dark:border-[#2a3142] shadow-2xl p-2 z-50">
              <div className="flex items-center justify-between px-1 pb-1.5 mb-1 border-b border-slate-200 dark:border-[#242a38]">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  Columns ({activeTab})
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCustomColumnsByTab((prev) => {
                      const next = { ...prev };
                      delete next[activeTab];
                      return next;
                    })
                  }
                  className="text-[11px] text-[#2962ff] hover:underline cursor-pointer"
                >
                  Default
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto thin-scrollbar grid grid-cols-1 gap-0.5">
                {SCREENER_COLUMNS.filter((c) => c.key !== 'symbol').map((col) => {
                  const checked = visibleColumns.includes(col.key);
                  return (
                    <label
                      key={col.key}
                      className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-[#212736] text-xs text-slate-700 dark:text-[#cbd5e1] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleColumn(col.key)}
                        className="accent-[#2962ff]"
                      />
                      <span>{col.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Table Container */}
      <div className="flex-1 min-h-0 overflow-auto thin-scrollbar relative">
        {loading && rows.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2.5 text-xs text-slate-500 dark:text-[#8b95a7] py-10">
            <Loader2 className="w-5 h-5 animate-spin text-[#2962ff]" />
            <span>
              Memindai {MARKET_OPTIONS.find((m) => m.id === market)?.label} ({tf.toUpperCase()}) &amp; menghitung EMA 9, EMA 20, SMA 50/200, RSI(14)…
            </span>
          </div>
        ) : errorMsg ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-xs text-red-600 dark:text-[#fca5a5] py-10">
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={() => runScan({ forceRefresh: true })}
              className="px-3 py-1 rounded bg-[#2962ff] text-white font-medium cursor-pointer"
            >
              Coba Lagi
            </button>
          </div>
        ) : sortedRows.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-xs text-slate-500 dark:text-[#8b95a7] py-10">
            <TrendingUp className="w-5 h-5 opacity-60" />
            <span>Tidak ada saham yang cocok dengan kombinasi filter saat ini.</span>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setActivePresetId('all');
                  setFilters({ ...DEFAULT_SCREENER_FILTERS });
                }}
                className="px-2.5 py-1 rounded bg-slate-200 dark:bg-[#1e2433] text-slate-800 dark:text-white font-medium cursor-pointer"
              >
                Tampilkan Semua Saham
              </button>
            )}
          </div>
        ) : (
          <table className="w-full border-collapse text-xs tabular-nums">
            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-[#131722] border-b border-slate-200 dark:border-[#242a38] text-[11px] font-medium text-slate-500 dark:text-[#8b95a7]">
              <tr>
                {visibleColumns.map((colKey, colIdx) => {
                  const meta = SCREENER_COLUMNS.find((c) => c.key === colKey);
                  if (!meta) return null;
                  const isSorted = sort.key === colKey;
                  const alignClass =
                    meta.align === 'right'
                      ? 'text-right justify-end'
                      : meta.align === 'center'
                        ? 'text-center justify-center'
                        : 'text-left justify-start';
                  return (
                    <th
                      key={colKey}
                      onClick={() => handleHeaderSort(colKey)}
                      className={`px-2 sm:px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors ${
                        colIdx === 0
                          ? 'sticky left-0 z-30 bg-slate-100 dark:bg-[#131722] border-r border-slate-200/70 dark:border-[#242a38]/70 min-w-[148px] max-w-[166px] sm:min-w-[230px] sm:max-w-none'
                          : ''
                      }`}
                    >
                      <div className={`flex items-center gap-1 ${alignClass}`}>
                        <span>{meta.label}</span>
                        {isSorted &&
                          (sort.direction === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-[#2962ff]" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-[#2962ff]" />
                          ))}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1a1f2b]">
              {sortedRows.map((row) => {
                const isSelected = row.symbol.toUpperCase() === activeSymbol.toUpperCase();
                const flagColor = flagMap[row.symbol.toUpperCase()];
                const avatar = getTickerAvatar(row.symbol);
                const isUp = row.changePercent >= 0;

                return (
                  <tr
                    key={row.symbol}
                    data-testid={`screener-row-${row.symbol}`}
                    onClick={() => onSelectSymbol(row.symbol)}
                    className={`group cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#2962ff]/10 dark:bg-[#2962ff]/15'
                        : 'hover:bg-slate-50 dark:hover:bg-[#161b26]'
                    }`}
                  >
                    {visibleColumns.map((colKey, colIdx) => {
                      if (colKey === 'symbol') {
                        return (
                          <td
                            key={colKey}
                            className={`px-2 sm:px-3 py-2 whitespace-nowrap sticky left-0 z-10 border-r border-slate-200/70 dark:border-[#242a38]/70 max-w-[166px] sm:max-w-none ${
                              isSelected
                                ? 'bg-[#edf2ff] dark:bg-[#162038]'
                                : 'bg-white dark:bg-[#0d1017] group-hover:bg-slate-50 dark:group-hover:bg-[#161b26]'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 sm:gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleFlag(row.symbol);
                                }}
                                aria-label={getFlagTooltip(flagColor)}
                                title={getFlagTooltip(flagColor)}
                                className="p-0.5 rounded hover:bg-slate-200/70 dark:hover:bg-[#262c3a] cursor-pointer shrink-0"
                              >
                                <FlagRibbonIcon color={flagColor ?? null} />
                              </button>

                              <span
                                className="hidden sm:flex w-6 h-6 rounded-full items-center justify-center text-[10px] font-bold text-white shrink-0"
                                style={{ backgroundColor: avatar.color }}
                              >
                                {avatar.letter}
                              </span>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1">
                                  <span className="font-mono font-bold text-slate-900 dark:text-[#f0f3fa] truncate">
                                    {row.symbol}
                                  </span>
                                  <span className="hidden sm:inline text-[10px] px-1 rounded bg-slate-100 dark:bg-[#1d2332] text-slate-500 dark:text-[#8b95a7]">
                                    {row.exchange}
                                  </span>
                                </div>
                                <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-[#787b86] truncate max-w-[90px] sm:max-w-[150px]">
                                  {row.shortName}
                                </div>
                              </div>

                              {onAddToActiveWatchlist && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddToActiveWatchlist(row.symbol);
                                  }}
                                  title="Add to active watchlist"
                                  aria-label={`Add ${row.symbol} to watchlist`}
                                  className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-[#2962ff] hover:bg-slate-200/60 dark:hover:bg-[#262c3a] transition-opacity cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      }

                      if (colKey === 'price') {
                        return (
                          <td
                            key={colKey}
                            className="px-3 py-2 text-right font-mono font-semibold text-slate-900 dark:text-[#f0f3fa] whitespace-nowrap"
                          >
                            {formatPriceValue(row.price, row.symbol)}
                          </td>
                        );
                      }

                      if (colKey === 'changePercent') {
                        return (
                          <td
                            key={colKey}
                            className={`px-3 py-2 text-right font-mono font-semibold whitespace-nowrap ${
                              isUp ? 'text-[#089981]' : 'text-[#f23645]'
                            }`}
                          >
                            {formatPct(row.changePercent)}
                          </td>
                        );
                      }

                      if (colKey === 'ema9') {
                        return (
                          <td key={colKey} className="px-3 py-2 text-right font-mono whitespace-nowrap text-slate-700 dark:text-[#cbd5e1]">
                            {formatPriceValue(row.ema9, row.symbol)}
                          </td>
                        );
                      }

                      if (colKey === 'ema9DiffPct') {
                        const above = (row.ema9DiffPct ?? 0) > 0;
                        return (
                          <td key={colKey} className="px-3 py-2 text-right font-mono whitespace-nowrap">
                            {row.ema9DiffPct === null ? (
                              <span className="text-slate-400">—</span>
                            ) : (
                              <span className="inline-flex items-center gap-1">
                                {row.ema9Signal === 'cross_above' && (
                                  <span className="px-1 py-0.2 rounded text-[9px] font-sans font-bold uppercase bg-[#089981]/20 text-[#089981] border border-[#089981]/40">
                                    Cross ↑
                                  </span>
                                )}
                                <span className={above ? 'text-[#089981] font-semibold' : 'text-[#f23645]'}>
                                  {formatPct(row.ema9DiffPct)}
                                </span>
                              </span>
                            )}
                          </td>
                        );
                      }

                      if (colKey === 'ema20' || colKey === 'ema50' || colKey === 'sma50' || colKey === 'sma200') {
                        const val = row[colKey];
                        const isAbove = val !== null && row.price > val;
                        return (
                          <td
                            key={colKey}
                            className={`px-3 py-2 text-right font-mono whitespace-nowrap ${
                              val === null
                                ? 'text-slate-400'
                                : isAbove
                                  ? 'text-[#089981]'
                                  : 'text-slate-500 dark:text-[#98a2b3]'
                            }`}
                          >
                            {formatPriceValue(val, row.symbol)}
                          </td>
                        );
                      }

                      if (colKey === 'rsi14') {
                        const r = row.rsi14;
                        return (
                          <td
                            key={colKey}
                            className={`px-3 py-2 text-right font-mono whitespace-nowrap ${
                              r === null
                                ? 'text-slate-400'
                                : r < 30
                                  ? 'text-[#089981] font-semibold'
                                  : r > 70
                                    ? 'text-[#f23645] font-semibold'
                                    : 'text-slate-700 dark:text-[#cbd5e1]'
                            }`}
                          >
                            {r === null ? '—' : r.toFixed(1)}
                          </td>
                        );
                      }

                      if (colKey === 'macdHist') {
                        const h = row.macdHist;
                        return (
                          <td
                            key={colKey}
                            className={`px-3 py-2 text-right font-mono whitespace-nowrap ${
                              h === null
                                ? 'text-slate-400'
                                : h >= 0
                                  ? 'text-[#089981]'
                                  : 'text-[#f23645]'
                            }`}
                          >
                            {h === null ? '—' : `${h > 0 ? '+' : ''}${h.toFixed(2)}`}
                          </td>
                        );
                      }

                      if (colKey === 'techRating') {
                        return (
                          <td key={colKey} className="px-3 py-2 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-2 py-0.5 rounded border text-[10px] font-semibold ${techRatingBadgeClass(
                                row.techRating
                              )}`}
                            >
                              {row.techRating}
                            </span>
                          </td>
                        );
                      }

                      if (colKey === 'volume') {
                        return (
                          <td key={colKey} className="px-3 py-2 text-right font-mono whitespace-nowrap text-slate-700 dark:text-[#cbd5e1]">
                            {row.volume !== null ? formatCompactVolume(row.volume) : '—'}
                          </td>
                        );
                      }

                      if (colKey === 'relVolume') {
                        return (
                          <td
                            key={colKey}
                            className={`px-3 py-2 text-right font-mono whitespace-nowrap ${
                              (row.relVolume ?? 0) >= 1.5
                                ? 'text-[#2962ff] dark:text-[#60a5fa] font-semibold'
                                : 'text-slate-700 dark:text-[#cbd5e1]'
                            }`}
                          >
                            {row.relVolume !== null ? `${row.relVolume.toFixed(2)}x` : '—'}
                          </td>
                        );
                      }

                      if (colKey === 'marketCap') {
                        return (
                          <td key={colKey} className="px-3 py-2 text-right font-mono whitespace-nowrap text-slate-700 dark:text-[#cbd5e1]">
                            {formatCompactMoney(row.marketCap, row.currency)}
                          </td>
                        );
                      }

                      if (colKey === 'perf1w' || colKey === 'perf1m' || colKey === 'perf3m') {
                        const v = row[colKey];
                        return (
                          <td
                            key={colKey}
                            className={`px-3 py-2 text-right font-mono whitespace-nowrap ${
                              v === null
                                ? 'text-slate-400'
                                : v >= 0
                                  ? 'text-[#089981]'
                                  : 'text-[#f23645]'
                            }`}
                          >
                            {formatPct(v)}
                          </td>
                        );
                      }

                      if (colKey === 'fiftyTwoWeekRangePos') {
                        const pos = row.fiftyTwoWeekRangePos;
                        return (
                          <td key={colKey} className="px-3 py-2 whitespace-nowrap min-w-[120px]">
                            {pos === null ? (
                              <div className="text-center text-slate-400">—</div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-[#23293a] overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-[#2962ff]"
                                    style={{ width: `${Math.max(4, Math.min(100, pos))}%` }}
                                  />
                                </div>
                                <span className="font-mono text-[10px] text-slate-500 dark:text-[#8b95a7] w-8 text-right">
                                  {pos.toFixed(0)}%
                                </span>
                              </div>
                            )}
                          </td>
                        );
                      }

                      if (
                        colKey === 'trailingPE' ||
                        colKey === 'forwardPE' ||
                        colKey === 'priceToBook' ||
                        colKey === 'epsTTM' ||
                        colKey === 'epsForward' ||
                        colKey === 'divRate' ||
                        colKey === 'beta'
                      ) {
                        const v = row[colKey];
                        return (
                          <td key={colKey} className="px-3 py-2 text-right font-mono whitespace-nowrap text-slate-700 dark:text-[#cbd5e1]">
                            {v === null ? '—' : v.toFixed(2)}
                          </td>
                        );
                      }

                      if (colKey === 'divYieldPct') {
                        const v = row.divYieldPct;
                        return (
                          <td
                            key={colKey}
                            className={`px-3 py-2 text-right font-mono whitespace-nowrap ${
                              v !== null && v >= 3
                                ? 'text-[#089981] font-semibold'
                                : 'text-slate-700 dark:text-[#cbd5e1]'
                            }`}
                          >
                            {v === null ? '—' : `${v.toFixed(2)}%`}
                          </td>
                        );
                      }

                      if (colKey === 'analystRating') {
                        return (
                          <td key={colKey} className="px-3 py-2 text-center whitespace-nowrap text-slate-600 dark:text-[#b2b5be]">
                            {row.analystRating ?? '—'}
                          </td>
                        );
                      }

                      return (
                        <td
                          key={colKey}
                          className={`px-3 py-2 whitespace-nowrap text-slate-600 dark:text-[#8b95a7] ${
                            colIdx === 0 ? 'sticky left-0' : ''
                          }`}
                        >
                          {String(row[colKey] ?? '—')}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* "+ All Filters" Advanced Filter Modal */}
      {allFiltersOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="All Screener Filters"
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[85]"
          onClick={() => setAllFiltersOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-xl bg-white dark:bg-[#161a24] border border-slate-200 dark:border-[#2a3142] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-[#242a38]">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <Filter className="w-4 h-4 text-[#2962ff]" />
                <span>All Screener Filters ({sortedRows.length} matches)</span>
              </div>
              <button
                type="button"
                onClick={() => setAllFiltersOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[72vh] overflow-y-auto thin-scrollbar">
              {/* Fundamental & Momentum Quick Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-[#8b95a7]">
                    MACD Momentum
                  </label>
                  <select
                    value={filters.macdFilter}
                    onChange={(e) => updateFilter('macdFilter', e.target.value as MacdSignalFilter)}
                    className="w-full h-8 px-2 rounded bg-slate-100 dark:bg-[#0d1017] border border-slate-200 dark:border-[#2a3142] text-xs text-slate-900 dark:text-white"
                  >
                    <option value="all">Any</option>
                    <option value="bullish">Bullish (Hist &gt; 0)</option>
                    <option value="bearish">Bearish (Hist &lt; 0)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-[#8b95a7]">
                    Technical Rating
                  </label>
                  <select
                    value={filters.techRatingFilter}
                    onChange={(e) =>
                      updateFilter('techRatingFilter', e.target.value as TechRatingFilter)
                    }
                    className="w-full h-8 px-2 rounded bg-slate-100 dark:bg-[#0d1017] border border-slate-200 dark:border-[#2a3142] text-xs text-slate-900 dark:text-white"
                  >
                    <option value="all">Any</option>
                    <option value="strong_buy">Strong Buy</option>
                    <option value="buy_or_strong">Buy / Strong Buy</option>
                    <option value="sell_or_strong">Sell / Strong Sell</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-[#8b95a7]">
                    Market Cap
                  </label>
                  <select
                    value={filters.marketCapBand}
                    onChange={(e) =>
                      updateFilter('marketCapBand', e.target.value as MarketCapBandFilter)
                    }
                    className="w-full h-8 px-2 rounded bg-slate-100 dark:bg-[#0d1017] border border-slate-200 dark:border-[#2a3142] text-xs text-slate-900 dark:text-white"
                  >
                    <option value="all">Any</option>
                    <option value="mega">Mega Cap (&gt;= $100B eq.)</option>
                    <option value="large">Large Cap (&gt;= $10B eq.)</option>
                    <option value="mid">Mid Cap ($2B - $10B eq.)</option>
                    <option value="small">Small Cap (&lt; $2B eq.)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-[#8b95a7]">
                    Max P/E (Profitable)
                  </label>
                  <select
                    value={filters.peMax === null ? '' : String(filters.peMax)}
                    onChange={(e) =>
                      updateFilter('peMax', e.target.value ? Number(e.target.value) : null)
                    }
                    className="w-full h-8 px-2 rounded bg-slate-100 dark:bg-[#0d1017] border border-slate-200 dark:border-[#2a3142] text-xs text-slate-900 dark:text-white"
                  >
                    <option value="">Any</option>
                    <option value="10">P/E &lt;= 10</option>
                    <option value="15">P/E &lt;= 15</option>
                    <option value="25">P/E &lt;= 25</option>
                    <option value="40">P/E &lt;= 40</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-[#8b95a7]">
                    Min Dividend Yield (%)
                  </label>
                  <select
                    value={filters.divYieldMin === null ? '' : String(filters.divYieldMin)}
                    onChange={(e) =>
                      updateFilter('divYieldMin', e.target.value ? Number(e.target.value) : null)
                    }
                    className="w-full h-8 px-2 rounded bg-slate-100 dark:bg-[#0d1017] border border-slate-200 dark:border-[#2a3142] text-xs text-slate-900 dark:text-white"
                  >
                    <option value="">Any</option>
                    <option value="2">&gt;= 2%</option>
                    <option value="3">&gt;= 3%</option>
                    <option value="5">&gt;= 5%</option>
                    <option value="7">&gt;= 7%</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-500 dark:text-[#8b95a7]">
                    Min Volume
                  </label>
                  <select
                    value={filters.minVolume === null ? '' : String(filters.minVolume)}
                    onChange={(e) =>
                      updateFilter('minVolume', e.target.value ? Number(e.target.value) : null)
                    }
                    className="w-full h-8 px-2 rounded bg-slate-100 dark:bg-[#0d1017] border border-slate-200 dark:border-[#2a3142] text-xs text-slate-900 dark:text-white"
                  >
                    <option value="">Any</option>
                    <option value="1000000">&gt;= 1M</option>
                    <option value="5000000">&gt;= 5M</option>
                    <option value="10000000">&gt;= 10M</option>
                    <option value="50000000">&gt;= 50M</option>
                  </select>
                </div>
              </div>

              {/* Custom Numeric Rules Builder */}
              <div className="pt-3 border-t border-slate-200 dark:border-[#242a38] space-y-2.5">
                <div className="text-xs font-semibold text-slate-800 dark:text-[#e6eaf2]">
                  Custom Numeric Rules
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={draftField}
                    onChange={(e) => setDraftField(e.target.value as ScreenerNumericField)}
                    className="h-8 px-2 rounded bg-slate-100 dark:bg-[#0d1017] border border-slate-200 dark:border-[#2a3142] text-xs text-slate-900 dark:text-white"
                  >
                    {Object.entries(NUMERIC_RULE_FIELD_LABELS).map(([k, lbl]) => (
                      <option key={k} value={k}>
                        {lbl}
                      </option>
                    ))}
                  </select>

                  <select
                    value={draftOp}
                    onChange={(e) => setDraftOp(e.target.value as ScreenerNumericOp)}
                    className="h-8 px-2 rounded bg-slate-100 dark:bg-[#0d1017] border border-slate-200 dark:border-[#2a3142] text-xs text-slate-900 dark:text-white"
                  >
                    <option value="gt">&gt; Above</option>
                    <option value="gte">&gt;= At least</option>
                    <option value="lt">&lt; Below</option>
                    <option value="lte">&lt;= At most</option>
                    <option value="between">Between</option>
                  </select>

                  <input
                    type="number"
                    step="any"
                    value={draftVal}
                    onChange={(e) => setDraftVal(e.target.value)}
                    className="h-8 w-24 px-2 rounded bg-slate-100 dark:bg-[#0d1017] border border-slate-200 dark:border-[#2a3142] text-xs text-slate-900 dark:text-white font-mono"
                  />

                  {draftOp === 'between' && (
                    <>
                      <span className="text-xs text-slate-400">and</span>
                      <input
                        type="number"
                        step="any"
                        value={draftValMax}
                        onChange={(e) => setDraftValMax(e.target.value)}
                        className="h-8 w-24 px-2 rounded bg-slate-100 dark:bg-[#0d1017] border border-slate-200 dark:border-[#2a3142] text-xs text-slate-900 dark:text-white font-mono"
                      />
                    </>
                  )}

                  <button
                    type="button"
                    onClick={handleAddCustomRule}
                    className="h-8 px-3 rounded bg-[#2962ff] hover:bg-[#1e53e5] text-white text-xs font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Rule</span>
                  </button>
                </div>

                {filters.customRules.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {filters.customRules.map((rule) => (
                      <span
                        key={rule.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2962ff]/12 border border-[#2962ff]/40 text-xs text-[#2962ff] dark:text-[#60a5fa]"
                      >
                        <span>
                          {NUMERIC_RULE_FIELD_LABELS[rule.field]}{' '}
                          {rule.operator === 'between'
                            ? `${rule.value}..${rule.valueMax ?? rule.value}`
                            : `${rule.operator} ${rule.value}`}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateFilter(
                              'customRules',
                              filters.customRules.filter((r) => r.id !== rule.id)
                            )
                          }
                          aria-label="Remove filter rule"
                          className="hover:text-red-500 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 dark:border-[#242a38] bg-slate-50 dark:bg-[#12161f]">
              <button
                type="button"
                onClick={() => {
                  setActivePresetId('all');
                  setFilters({ ...DEFAULT_SCREENER_FILTERS });
                }}
                className="text-xs text-slate-500 hover:text-slate-900 dark:text-[#8b95a7] dark:hover:text-white cursor-pointer"
              >
                Reset Semua Filter
              </button>
              <button
                type="button"
                onClick={() => setAllFiltersOpen(false)}
                className="h-8 px-4 rounded bg-[#2962ff] hover:bg-[#1e53e5] text-white text-xs font-semibold cursor-pointer"
              >
                Terapkan ({sortedRows.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
