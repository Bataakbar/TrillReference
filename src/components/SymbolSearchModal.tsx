import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, Globe, Loader2, Plus, Search, X } from 'lucide-react';
import {
  COUNTRY_SOURCES,
  STOCK_SECTOR_OPTIONS,
  STOCK_TYPE_OPTIONS,
  getCountryFlagEmoji,
  inferDefaultStockCountry,
  type CatalogInstrument,
  type SearchCategoryFilter,
  type SourceRegion,
  type StockTypeFilter,
} from '../../shared/instrumentCatalog';
import {
  DEFAULT_FLAG_COLOR,
  FLAG_COLOR_OPTIONS,
  getActiveListLabel,
  getFlagColorMeta,
  getTickerAvatar,
  resolveActiveListSymbols,
  type ActiveWatchlistRef,
  type CustomWatchlist,
  type FlagColor,
  type WatchlistFlagMap,
} from '../utils/watchlistModel';
import { FlagColorSwatchRow, FlagRibbonIcon } from './FlagRibbon';

const CATEGORY_TABS: ReadonlyArray<{ id: SearchCategoryFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'stocks', label: 'Stocks' },
  { id: 'crypto', label: 'Crypto' },
  { id: 'forex', label: 'Forex' },
  { id: 'indices', label: 'Indices' },
];

const SOURCE_REGIONS: readonly SourceRegion[] = [
  'NORTH AMERICA',
  'EUROPE',
  'ASIA / PACIFIC',
];

const ROW_HEIGHT = 56;
const OVERSCAN_ROWS = 6;
const PAGE_SIZE = 50;

interface VirtualInstrumentRowProps {
  item: CatalogInstrument;
  inList: boolean;
  symFlag: FlagColor | null;
  defaultFlagColor: FlagColor;
  targetLabel: string;
  showColorPicker: boolean;
  onChooseRow: (sym: string) => void;
  onToggleTarget: (sym: string) => void;
  onToggleFlag: (sym: string) => void;
  onToggleColorPicker: (sym: string) => void;
  onSelectFlagColor: (sym: string, color: FlagColor) => void;
}

const VirtualInstrumentRow = memo(function VirtualInstrumentRow({
  item,
  inList,
  symFlag,
  defaultFlagColor,
  targetLabel,
  showColorPicker,
  onChooseRow,
  onToggleTarget,
  onToggleFlag,
  onToggleColorPicker,
  onSelectFlagColor,
}: VirtualInstrumentRowProps) {
  const sym = item.symbol.toUpperCase();
  const avatar = getTickerAvatar(sym);
  const countryFlag = getCountryFlagEmoji(item.country);
  const targetColorMeta = getFlagColorMeta(defaultFlagColor);

  return (
    <div
      style={{ height: ROW_HEIGHT }}
      className="group px-4 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-[#2a2e39]/60 transition-colors relative border-b border-slate-100/70 dark:border-[#2a2e39]/40"
    >
      <button
        type="button"
        onClick={() => onChooseRow(sym)}
        className="flex-1 flex items-center gap-3 text-left min-w-0 cursor-pointer h-full"
      >
        <span
          aria-hidden="true"
          style={{ backgroundColor: avatar.color }}
          className="w-7 h-7 rounded-full text-[11px] font-bold text-white flex items-center justify-center shrink-0"
        >
          {avatar.letter}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-bold text-slate-900 dark:text-[#f0f3fa] truncate">
              {item.symbol}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-[#787b86] truncate">
            <span className="truncate">{item.shortname}</span>
            <span className="px-1 py-0.2 rounded bg-slate-100 dark:bg-[#2a2e39] text-[9px] font-semibold uppercase tracking-wide shrink-0">
              {item.stockType && item.stockType !== 'Common stock'
                ? item.stockType
                : item.type}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {item.exchange && (
            <span className="text-[11px] text-slate-500 dark:text-[#787b86] whitespace-nowrap">
              {item.exchange}
            </span>
          )}
          {countryFlag && (
            <span
              aria-hidden="true"
              className="w-5 h-5 rounded-full bg-slate-100 dark:bg-[#131722] flex items-center justify-center text-xs shrink-0"
            >
              {countryFlag}
            </span>
          )}
        </div>
      </button>

      {/* Inline Flag Button (uses active color list if selected, otherwise Red default; right-click for all 7 colors) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFlag(sym);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleColorPicker(sym);
        }}
        aria-label={
          symFlag === defaultFlagColor
            ? `Unflag ${sym} (${getFlagColorMeta(symFlag).listName})`
            : `Flag ${sym} (${targetColorMeta.listName})`
        }
        title={
          symFlag
            ? symFlag === defaultFlagColor
              ? `${getFlagColorMeta(symFlag).listName} · Click to unflag, right-click for colors`
              : `${getFlagColorMeta(symFlag).listName} · Click to move to ${targetColorMeta.listName}, right-click for colors`
            : `Flag ${targetColorMeta.label} (${targetColorMeta.listName}) · Right-click for colors`
        }
        style={!symFlag ? { color: undefined } : undefined}
        className={`w-6 h-6 rounded flex items-center justify-center shrink-0 transition-opacity cursor-pointer ${
          symFlag
            ? 'opacity-100 hover:bg-slate-200/70 dark:hover:bg-[#363a45]'
            : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-slate-400 dark:text-[#787b86]'
        }`}
      >
        <FlagRibbonIcon color={symFlag} className="w-3.5 h-2.5" />
      </button>

      {/* Explicit + / Check Watchlist Toggle */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleTarget(sym);
        }}
        aria-label={
          inList
            ? `Remove ${sym} from ${targetLabel}`
            : `Add ${sym} to ${targetLabel}`
        }
        title={
          inList
            ? `In ${targetLabel} (click to remove)`
            : `Add to ${targetLabel}`
        }
        className={`w-7 h-7 rounded flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
          inList
            ? 'bg-[#089981]/15 text-[#089981] hover:bg-[#f23645]/15 hover:text-[#f23645]'
            : 'text-slate-500 hover:bg-slate-200 dark:text-[#b2b5be] dark:hover:bg-[#363a45] dark:hover:text-[#f0f3fa]'
        }`}
      >
        {inList ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </button>

      {showColorPicker && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-10 top-11 z-40 p-2 rounded-md bg-white dark:bg-[#1e222d] border border-slate-200 dark:border-[#2a2e39] shadow-xl flex items-center gap-2"
        >
          <FlagColorSwatchRow
            selectedColor={symFlag ?? DEFAULT_FLAG_COLOR}
            onSelectColor={(color) => onSelectFlagColor(sym, color)}
          />
        </div>
      )}
    </div>
  );
});

interface SymbolSearchModalProps {
  open: boolean;
  mode?: 'chart' | 'watchlist';
  activeSymbol?: string;
  activeRef: ActiveWatchlistRef;
  customWatchlists: CustomWatchlist[];
  flagMap: WatchlistFlagMap;
  onClose: () => void;
  onSelectSymbol: (symbol: string) => void;
  onAddToTargetList: (target: ActiveWatchlistRef, symbol: string) => void;
  onRemoveFromTargetList: (target: ActiveWatchlistRef, symbol: string) => void;
  onToggleFlag: (symbol: string) => void;
  onSetFlagColor: (symbol: string, color: FlagColor | null) => void;
}

export default function SymbolSearchModal({
  open,
  mode = 'chart',
  activeSymbol = 'BBCA.JK',
  activeRef,
  customWatchlists,
  flagMap,
  onClose,
  onSelectSymbol,
  onAddToTargetList,
  onRemoveFromTargetList,
  onToggleFlag,
  onSetFlagColor,
}: SymbolSearchModalProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SearchCategoryFilter>('all');

  // TradingView-style Stocks sub-filters
  const [stockCountry, setStockCountry] = useState<string | null>(() =>
    inferDefaultStockCountry(activeSymbol)
  );
  const [stockType, setStockType] = useState<StockTypeFilter>('all');
  const [stockSector, setStockSector] = useState<string>('All sectors');

  // Sub-menus & Sources view
  const [sourcesViewOpen, setSourcesViewOpen] = useState(false);
  const [sourcesSearch, setSourcesSearch] = useState('');
  const [openDropdown, setOpenDropdown] = useState<'types' | 'sectors' | 'target' | null>(null);
  const [flagPopoverSym, setFlagPopoverSym] = useState<string | null>(null);

  // Target watchlist state
  const [targetRef, setTargetRef] = useState<ActiveWatchlistRef>(activeRef);

  // Paginated instrument state + virtual scroll state
  const [items, setItems] = useState<CatalogInstrument[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [viewportHeight, setViewportHeight] = useState<number>(392);

  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const rafRef = useRef<number | null>(null);

  const prevOpenRef = useRef<boolean>(false);

  // Reset modal transient state ONLY on open/close transitions
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    if (!open && wasOpen) {
      setQuery('');
      setCategory('all');
      setStockType('all');
      setStockSector('All sectors');
      setSourcesViewOpen(false);
      setSourcesSearch('');
      setOpenDropdown(null);
      setFlagPopoverSym(null);
      setItems([]);
      setScrollTop(0);
    } else if (open && !wasOpen) {
      setTargetRef(activeRef);
      setStockCountry(inferDefaultStockCountry(activeSymbol));
    }
  }, [open, activeRef, activeSymbol]);

  // Escape key handler (separate so changing dropdown/sources never resets targetRef)
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (sourcesViewOpen) {
          setSourcesViewOpen(false);
        } else if (openDropdown) {
          setOpenDropdown(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, sourcesViewOpen, openDropdown, onClose]);

  // Fetch page helper
  const fetchPage = useCallback(
    async (offset: number, append: boolean, signal?: AbortSignal) => {
      const params = new URLSearchParams();
      params.set('category', category);
      if (category === 'stocks') {
        if (stockCountry) params.set('country', stockCountry);
        if (stockType !== 'all') params.set('stockType', stockType);
        if (stockSector !== 'All sectors') params.set('sector', stockSector);
      }
      if (query.trim()) params.set('q', query.trim());
      params.set('offset', String(offset));
      params.set('limit', String(PAGE_SIZE));

      const res = await fetch(`/api/instruments?${params.toString()}`, { signal });
      if (!res.ok) return;
      const data = (await res.json()) as {
        items?: CatalogInstrument[];
        total?: number;
        hasMore?: boolean;
      };
      const incoming = data.items ?? [];
      setTotalCount(data.total ?? incoming.length);
      setHasMore(Boolean(data.hasMore));
      if (append) {
        setItems((prev) => {
          const seen = new Set(prev.map((p) => p.symbol.toUpperCase()));
          const unique = incoming.filter((i) => !seen.has(i.symbol.toUpperCase()));
          return unique.length > 0 ? [...prev, ...unique] : prev;
        });
      } else {
        setItems(incoming);
      }
    },
    [category, stockCountry, stockType, stockSector, query]
  );

  // Initial / filter-changed fetch (debounced only when typing search text)
  useEffect(() => {
    if (!open || sourcesViewOpen) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoadingInitial(true);
    setScrollTop(0);
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }

    const delay = query.trim() ? 180 : 0;
    const timer = window.setTimeout(async () => {
      try {
        await fetchPage(0, false, controller.signal);
      } catch {
        // Ignore abort/transient errors
      } finally {
        if (!controller.signal.aborted) {
          setLoadingInitial(false);
        }
      }
    }, delay);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, sourcesViewOpen, category, stockCountry, stockType, stockSector, query, fetchPage]);

  // Measure viewport height when modal opens
  useEffect(() => {
    if (open && listRef.current) {
      setViewportHeight(listRef.current.clientHeight || 392);
    }
  }, [open, sourcesViewOpen]);

  // Load next batch of 50 when approaching bottom
  const loadMore = useCallback(async () => {
    if (loadingMore || loadingInitial || !hasMore) return;
    setLoadingMore(true);
    try {
      await fetchPage(items.length, true);
    } catch {
      // Ignore transient error
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, loadingInitial, hasMore, fetchPage, items.length]);

  const handleListScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const nextTop = el.scrollTop;
      const clientH = el.clientHeight;
      const scrollH = el.scrollHeight;

      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = window.requestAnimationFrame(() => {
        setScrollTop(nextTop);
        if (clientH > 0 && clientH !== viewportHeight) {
          setViewportHeight(clientH);
        }
      });

      if (scrollH - nextTop - clientH < 260 && hasMore && !loadingMore && !loadingInitial) {
        void loadMore();
      }
    },
    [viewportHeight, hasMore, loadingMore, loadingInitial, loadMore]
  );

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const targetSymbolsSet = useMemo(
    () => new Set(resolveActiveListSymbols(targetRef, customWatchlists, flagMap)),
    [targetRef, customWatchlists, flagMap]
  );

  const isWatchlistMode = mode === 'watchlist';
  const targetLabel = getActiveListLabel(targetRef, customWatchlists);
  const targetFlagColor = targetRef.kind === 'flagged' ? targetRef.color : null;
  const defaultFlagColorForTarget: FlagColor = targetFlagColor ?? DEFAULT_FLAG_COLOR;

  const handleToggleFlagInModal = useCallback(
    (sym: string) => {
      if (targetRef.kind === 'flagged') {
        const current = flagMap[sym] ?? null;
        onSetFlagColor(sym, current === targetRef.color ? null : targetRef.color);
      } else {
        onToggleFlag(sym);
      }
    },
    [targetRef, flagMap, onSetFlagColor, onToggleFlag]
  );

  const handleToggleTarget = useCallback(
    (sym: string) => {
      if (targetSymbolsSet.has(sym)) {
        onRemoveFromTargetList(targetRef, sym);
      } else {
        onAddToTargetList(targetRef, sym);
      }
    },
    [targetSymbolsSet, targetRef, onAddToTargetList, onRemoveFromTargetList]
  );

  const handleChooseRow = useCallback(
    (sym: string) => {
      if (isWatchlistMode) {
        handleToggleTarget(sym);
      } else {
        onSelectSymbol(sym);
        onClose();
      }
    },
    [isWatchlistMode, handleToggleTarget, onSelectSymbol, onClose]
  );

  const handleToggleColorPicker = useCallback((sym: string) => {
    setFlagPopoverSym((prev) => (prev === sym ? null : sym));
  }, []);

  const handleSelectFlagColor = useCallback(
    (sym: string, color: FlagColor) => {
      onSetFlagColor(sym, color);
      setFlagPopoverSym(null);
    },
    [onSetFlagColor]
  );

  if (!open) return null;

  const activeCountryMeta = stockCountry
    ? COUNTRY_SOURCES.find((c) => c.id === stockCountry) ?? null
    : null;

  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS);
  const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN_ROWS * 2;
  const endIndex = Math.min(items.length, startIndex + visibleCount);
  const visibleSlice = items.slice(startIndex, endIndex);

  const filteredCountries = COUNTRY_SOURCES.filter((c) => {
    const q = sourcesSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.exchanges.toLowerCase().includes(q)
    );
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isWatchlistMode ? 'Add symbol to watchlist' : 'Symbol search'}
      className="fixed inset-0 bg-black/60 flex justify-center items-start pt-6 sm:pt-16 px-2.5 sm:px-4 z-[60]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88dvh] rounded-lg bg-white dark:bg-[#1e222d] border border-slate-200 dark:border-[#2a2e39] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => {
          e.stopPropagation();
          setOpenDropdown(null);
          setFlagPopoverSym(null);
        }}
      >
        {sourcesViewOpen ? (
          /* TradingView "< Sources" Country/Exchange Picker Sub-View */
          <>
            <div className="px-4 py-3 border-b border-slate-200 dark:border-[#2a2e39] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSourcesViewOpen(false)}
                className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-[#f0f3fa] hover:opacity-80 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Sources</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close symbol search"
                className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-[#2a2e39] dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-slate-200 dark:border-[#2a2e39]">
              <Search className="w-4 h-4 text-slate-400 dark:text-[#787b86] shrink-0" />
              <input
                autoFocus
                type="text"
                value={sourcesSearch}
                onChange={(e) => setSourcesSearch(e.target.value)}
                placeholder="Search country or exchange (e.g. Indonesia, IDX, NASDAQ)..."
                className="flex-1 bg-transparent text-base sm:text-sm text-slate-900 dark:text-[#f0f3fa] placeholder:text-slate-400 dark:placeholder:text-[#787b86] outline-none"
              />
            </div>

            <div className="h-[392px] overflow-y-auto thin-scrollbar px-4 py-3 space-y-4">
              <button
                type="button"
                onClick={() => {
                  setStockCountry(null);
                  setSourcesViewOpen(false);
                }}
                className={`w-full px-3 py-2 rounded-md flex items-center gap-2.5 text-left text-sm transition-colors cursor-pointer ${
                  stockCountry === null
                    ? 'bg-slate-100 dark:bg-[#2a2e39] font-semibold text-slate-900 dark:text-white'
                    : 'text-slate-700 hover:bg-slate-50 dark:text-[#d1d4dc] dark:hover:bg-[#2a2e39]/60'
                }`}
              >
                <Globe className="w-4 h-4 text-slate-500 dark:text-[#b2b5be]" />
                <span>All countries</span>
              </button>

              {SOURCE_REGIONS.map((region) => {
                const regionItems = filteredCountries.filter((c) => c.region === region);
                if (regionItems.length === 0) return null;
                return (
                  <div key={region}>
                    <div className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#787b86]">
                      {region}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {regionItems.map((country) => {
                        const selected = stockCountry === country.id;
                        return (
                          <button
                            key={country.id}
                            type="button"
                            onClick={() => {
                              setStockCountry(country.id);
                              setSourcesViewOpen(false);
                            }}
                            className={`px-3 py-2 rounded-md flex items-center gap-2.5 text-left transition-colors cursor-pointer ${
                              selected
                                ? 'bg-slate-100 dark:bg-[#2a2e39] text-slate-900 dark:text-white'
                                : 'hover:bg-slate-50 dark:hover:bg-[#2a2e39]/60 text-slate-800 dark:text-[#d1d4dc]'
                            }`}
                          >
                            <span className="text-lg leading-none shrink-0">{country.flag}</span>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold truncate">{country.name}</div>
                              <div className="text-[11px] text-slate-400 dark:text-[#787b86] truncate">
                                {country.exchanges}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* Main TradingView Symbol Search View */
          <>
            {/* Top Header + Destination Watchlist/Color Picker */}
            <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2 border-b border-slate-100 dark:border-[#2a2e39]/60">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-semibold text-slate-800 dark:text-[#f0f3fa]">
                  {isWatchlistMode ? 'Add symbol' : 'Symbol Search'}
                </span>

                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdown((prev) => (prev === 'target' ? null : 'target'));
                    }}
                    className="h-6 px-2 rounded bg-slate-100 hover:bg-slate-200 dark:bg-[#131722] dark:hover:bg-[#2a2e39] border border-slate-200 dark:border-[#363a45] text-[11px] font-medium text-slate-700 dark:text-[#d1d4dc] flex items-center gap-1.5 cursor-pointer"
                    title="Choose destination watchlist or color list"
                  >
                    <span className="text-slate-400 dark:text-[#787b86]">→</span>
                    {targetFlagColor && (
                      <FlagRibbonIcon color={targetFlagColor} className="w-3 h-2 shrink-0" />
                    )}
                    <span className="truncate max-w-[120px]">{targetLabel}</span>
                    <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                  </button>

                  {openDropdown === 'target' && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-7 w-52 rounded-lg bg-white dark:bg-[#1e222d] border border-slate-200 dark:border-[#2a2e39] shadow-2xl py-1 z-50 text-xs max-h-64 overflow-y-auto thin-scrollbar"
                    >
                      <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#787b86]">
                        Created lists
                      </div>
                      {customWatchlists.map((list) => {
                        const selected =
                          targetRef.kind === 'custom' && targetRef.id === list.id;
                        return (
                          <button
                            key={list.id}
                            type="button"
                            onClick={() => {
                              setTargetRef({ kind: 'custom', id: list.id });
                              setOpenDropdown(null);
                            }}
                            className={`w-full px-3 py-1.5 flex items-center justify-between text-left cursor-pointer ${
                              selected
                                ? 'bg-slate-100 dark:bg-[#2a2e39] font-semibold text-slate-900 dark:text-white'
                                : 'text-slate-700 hover:bg-slate-50 dark:text-[#d1d4dc] dark:hover:bg-[#2a2e39]/60'
                            }`}
                          >
                            <span className="truncate">{list.name}</span>
                            {selected && <Check className="w-3 h-3 text-[#2962ff]" />}
                          </button>
                        );
                      })}

                      <div className="my-1 border-t border-slate-100 dark:border-[#2a2e39]" />
                      <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#787b86]">
                        Flagged lists (by color)
                      </div>
                      {FLAG_COLOR_OPTIONS.map((opt) => {
                        const selected =
                          targetRef.kind === 'flagged' && targetRef.color === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setTargetRef({ kind: 'flagged', color: opt.id });
                              setOpenDropdown(null);
                            }}
                            className={`w-full px-3 py-1.5 flex items-center justify-between text-left cursor-pointer ${
                              selected
                                ? 'bg-slate-100 dark:bg-[#2a2e39] font-semibold text-slate-900 dark:text-white'
                                : 'text-slate-700 hover:bg-slate-50 dark:text-[#d1d4dc] dark:hover:bg-[#2a2e39]/60'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <FlagRibbonIcon color={opt.id} className="w-3 h-2.5 shrink-0" />
                              <span>{opt.listName}</span>
                              {opt.id === DEFAULT_FLAG_COLOR && (
                                <span className="text-[10px] text-[#f23645]">Default</span>
                              )}
                            </span>
                            {selected && <Check className="w-3 h-3 text-[#2962ff]" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close symbol search"
                className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-[#2a2e39] dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-slate-200 dark:border-[#2a2e39]">
              <Search className="w-4 h-4 text-slate-400 dark:text-[#787b86] shrink-0" />
              <input
                autoFocus
                type="text"
                aria-label="Search symbol or company"
                placeholder="Symbol, ticker, or company name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && query.trim()) {
                    const chosen = items[0]?.symbol ?? query.trim().toUpperCase();
                    if (isWatchlistMode) {
                      if (!targetSymbolsSet.has(chosen.toUpperCase())) {
                        onAddToTargetList(targetRef, chosen);
                      }
                    } else {
                      onSelectSymbol(chosen);
                      onClose();
                    }
                  }
                }}
                className="flex-1 bg-transparent text-base sm:text-sm text-slate-900 dark:text-[#f0f3fa] placeholder:text-slate-400 dark:placeholder:text-[#787b86] outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-[#f0f3fa] cursor-pointer"
                >
                  Clear
                </button>
              )}
              {loadingInitial && (
                <Loader2 className="w-4 h-4 animate-spin text-slate-500 dark:text-[#b2b5be]" />
              )}
            </div>

            {/* TradingView Filter Bar */}
            <div className="px-4 py-2 border-b border-slate-200 dark:border-[#2a2e39] flex items-center gap-2 flex-wrap relative">
              {category !== 'stocks' ? (
                /* 5 Clean Category Pills: All, Stocks, Crypto, Forex, Indices */
                <div className="flex items-center gap-1.5 overflow-x-auto thin-scrollbar">
                  {CATEGORY_TABS.map((cat) => {
                    const active = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                          active
                            ? 'bg-slate-900 text-white dark:bg-[#f0f3fa] dark:text-[#131722] font-semibold'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#2a2e39]/60 dark:text-[#d1d4dc] dark:hover:bg-[#2a2e39]'
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* TradingView Stocks Sub-Filter Bar: [Stocks ×] | [Country ×] [All types ⌄] [All sectors ⌄] */
                <>
                  <button
                    type="button"
                    onClick={() => setCategory('all')}
                    className="h-7 pl-3 pr-2 rounded-full bg-slate-900 text-white dark:bg-[#f0f3fa] dark:text-[#131722] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Stocks</span>
                    <X className="w-3.5 h-3.5 opacity-80" />
                  </button>

                  <div className="h-4 w-px bg-slate-200 dark:bg-[#363a45]" />

                  {/* Country / Sources Filter Pill */}
                  <div
                    className={`h-7 rounded-full flex items-center text-xs font-medium transition-colors ${
                      activeCountryMeta
                        ? 'bg-slate-900 text-white dark:bg-[#f0f3fa] dark:text-[#131722] font-semibold'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-[#2a2e39]/70 dark:text-[#d1d4dc] dark:hover:bg-[#2a2e39]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSourcesViewOpen(true)}
                      className={`h-full flex items-center gap-1.5 cursor-pointer ${
                        activeCountryMeta ? 'pl-2.5 pr-1' : 'px-3'
                      }`}
                    >
                      {activeCountryMeta ? (
                        <>
                          <span className="text-sm leading-none">{activeCountryMeta.flag}</span>
                          <span>{activeCountryMeta.name}</span>
                        </>
                      ) : (
                        <>
                          <Globe className="w-3.5 h-3.5 opacity-75" />
                          <span>All countries</span>
                        </>
                      )}
                    </button>
                    {activeCountryMeta && (
                      <button
                        type="button"
                        onClick={() => setStockCountry(null)}
                        aria-label="Clear country filter"
                        className="h-full pr-2 pl-0.5 flex items-center opacity-80 hover:opacity-100 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* All types Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdown((prev) => (prev === 'types' ? null : 'types'));
                      }}
                      className={`h-7 px-3 rounded-full text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                        stockType !== 'all'
                          ? 'bg-slate-900 text-white dark:bg-[#f0f3fa] dark:text-[#131722] font-semibold'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-[#2a2e39]/70 dark:text-[#d1d4dc] dark:hover:bg-[#2a2e39]'
                      }`}
                    >
                      <span>{stockType === 'all' ? 'All types' : stockType}</span>
                      <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                    </button>

                    {openDropdown === 'types' && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute left-0 top-8 w-44 rounded-lg bg-white dark:bg-[#1e222d] border border-slate-200 dark:border-[#2a2e39] shadow-2xl py-1 z-50 text-xs"
                      >
                        {STOCK_TYPE_OPTIONS.map((opt) => {
                          const selected = stockType === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setStockType(opt.id);
                                setOpenDropdown(null);
                              }}
                              className={`w-full px-3 py-1.5 text-left transition-colors cursor-pointer ${
                                selected
                                  ? 'bg-slate-100 dark:bg-[#f0f3fa] dark:text-[#131722] font-semibold text-slate-900'
                                  : 'text-slate-700 hover:bg-slate-50 dark:text-[#d1d4dc] dark:hover:bg-[#2a2e39]'
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* All sectors Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdown((prev) => (prev === 'sectors' ? null : 'sectors'));
                      }}
                      className={`h-7 px-3 rounded-full text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                        stockSector !== 'All sectors'
                          ? 'bg-slate-900 text-white dark:bg-[#f0f3fa] dark:text-[#131722] font-semibold'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-[#2a2e39]/70 dark:text-[#d1d4dc] dark:hover:bg-[#2a2e39]'
                      }`}
                    >
                      <span className="truncate max-w-[130px]">{stockSector}</span>
                      <ChevronDown className="w-3.5 h-3.5 opacity-70 shrink-0" />
                    </button>

                    {openDropdown === 'sectors' && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute left-0 top-8 w-52 max-h-64 overflow-y-auto thin-scrollbar rounded-lg bg-white dark:bg-[#1e222d] border border-slate-200 dark:border-[#2a2e39] shadow-2xl py-1 z-50 text-xs"
                      >
                        {STOCK_SECTOR_OPTIONS.map((sec) => {
                          const selected = stockSector === sec;
                          return (
                            <button
                              key={sec}
                              type="button"
                              onClick={() => {
                                setStockSector(sec);
                                setOpenDropdown(null);
                              }}
                              className={`w-full px-3 py-1.5 text-left transition-colors cursor-pointer ${
                                selected
                                  ? 'bg-slate-100 dark:bg-[#f0f3fa] dark:text-[#131722] font-semibold text-slate-900'
                                  : 'text-slate-700 hover:bg-slate-50 dark:text-[#d1d4dc] dark:hover:bg-[#2a2e39]'
                              }`}
                            >
                              {sec}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Virtualized Infinite-Scroll Result Viewport (0 Lag) */}
            <div
              ref={listRef}
              onScroll={handleListScroll}
              className="h-[392px] overflow-y-auto thin-scrollbar relative"
            >
              {!loadingInitial && items.length === 0 ? (
                <div className="px-4 py-10 text-center text-xs text-slate-500 dark:text-[#787b86]">
                  {query.trim() ? (
                    <>
                      No matches for "{query}". Press Enter to{' '}
                      {isWatchlistMode ? `add to ${targetLabel}` : 'load'}{' '}
                      <span className="font-semibold text-slate-700 dark:text-[#d1d4dc]">
                        {query.trim().toUpperCase()}
                      </span>
                      .
                    </>
                  ) : (
                    'No instruments match the active filters.'
                  )}
                </div>
              ) : (
                <div
                  style={{
                    height: items.length * ROW_HEIGHT,
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      transform: `translateY(${startIndex * ROW_HEIGHT}px)`,
                      willChange: 'transform',
                    }}
                  >
                    {visibleSlice.map((item) => {
                      const sym = item.symbol.toUpperCase();
                      return (
                        <VirtualInstrumentRow
                          key={sym}
                          item={item}
                          inList={targetSymbolsSet.has(sym)}
                          symFlag={flagMap[sym] ?? null}
                          defaultFlagColor={defaultFlagColorForTarget}
                          targetLabel={targetLabel}
                          showColorPicker={flagPopoverSym === sym}
                          onChooseRow={handleChooseRow}
                          onToggleTarget={handleToggleTarget}
                          onToggleFlag={handleToggleFlagInModal}
                          onToggleColorPicker={handleToggleColorPicker}
                          onSelectFlagColor={handleSelectFlagColor}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {loadingMore && (
                <div className="py-3 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-[#787b86]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading more instruments...</span>
                </div>
              )}
            </div>

            {/* Footer status bar */}
            <div className="px-4 py-2 bg-slate-50 dark:bg-[#131722] border-t border-slate-200 dark:border-[#2a2e39] flex items-center justify-between text-[11px] text-slate-500 dark:text-[#787b86]">
              <span>
                {isWatchlistMode
                  ? `Click + or row to add to ${targetLabel}.`
                  : `Click row to open chart · Click + to add to ${targetLabel}.`}
              </span>
              <span className="tabular-nums">
                {items.length}
                {totalCount > items.length ? ` / ${totalCount}+` : ''} items
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
