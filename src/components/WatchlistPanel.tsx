import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  FolderOpen,
  MoreHorizontal,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react';
import { getPricePrecision } from '../../shared/timeframes';
import { formatCompactVolume } from '../utils/drawingStorage';
import {
  DEFAULT_FLAG_COLOR,
  FLAG_COLOR_OPTIONS,
  classifyWatchlistSymbol,
  computeRangeRatio,
  countSymbolsByFlagColor,
  getActiveListLabel,
  getFlagColorMeta,
  getTickerAvatar,
  nextSortState,
  reorderWatchlistSymbols,
  sortWatchlistSymbols,
  type ActiveWatchlistRef,
  type CustomWatchlist,
  type FlagColor,
  type WatchlistColumnPrefs,
  type WatchlistFlagMap,
  type WatchlistMarketFilter,
  type WatchlistSortKey,
  type WatchlistSortState,
} from '../utils/watchlistModel';
import type { ChartMeta, WatchlistQuote } from '../types/chart';
import { FlagColorSwatchRow, FlagRibbonIcon } from './FlagRibbon';

interface WatchlistPanelProps {
  open: boolean;
  screenerOpen?: boolean;
  onClose: () => void;
  activeSymbol: string;
  activeMeta: ChartMeta | null;
  activeRef: ActiveWatchlistRef;
  customWatchlists: CustomWatchlist[];
  symbols: string[];
  flagMap: WatchlistFlagMap;
  columnPrefs: WatchlistColumnPrefs;
  quotes: Record<string, WatchlistQuote>;
  loadingQuotes: boolean;
  onSelectSymbol: (symbol: string) => void;
  onSelectList: (ref: ActiveWatchlistRef) => void;
  onCreateList: (name: string, initialSymbols?: string[]) => void;
  onOpenWatchlistsModal: () => void;
  onAddCurrentSymbol: () => void;
  onAddSymbolToCustomList: (listId: string, symbol: string) => void;
  onRemoveSymbol: (symbol: string) => void;
  onToggleFlag: (symbol: string) => void;
  onSetFlagColor: (symbol: string, color: FlagColor | null) => void;
  onUnflagAll: () => void;
  onReorderSymbols: (nextSymbols: string[]) => void;
  onUpdateColumnPrefs: (next: WatchlistColumnPrefs) => void;
  onRefreshQuotes: () => void;
  onOpenWatchlistAdd: () => void;
}

export default function WatchlistPanel({
  open,
  screenerOpen = false,
  onClose,
  activeSymbol,
  activeMeta,
  activeRef,
  customWatchlists,
  symbols,
  flagMap,
  columnPrefs,
  quotes,
  loadingQuotes,
  onSelectSymbol,
  onSelectList,
  onCreateList,
  onOpenWatchlistsModal,
  onAddCurrentSymbol,
  onAddSymbolToCustomList,
  onRemoveSymbol,
  onToggleFlag,
  onSetFlagColor,
  onUnflagAll,
  onReorderSymbols,
  onUpdateColumnPrefs,
  onRefreshQuotes,
  onOpenWatchlistAdd,
}: WatchlistPanelProps) {
  const [filter, setFilter] = useState<WatchlistMarketFilter>('all');
  const [sort, setSort] = useState<WatchlistSortState>({ key: null, direction: 'asc' });
  const [detailsExpanded, setDetailsExpanded] = useState<boolean>(true);
  const [draggingSymbol, setDraggingSymbol] = useState<string | null>(null);

  // Header menus
  const [listDropdownOpen, setListDropdownOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [inlineCreatingList, setInlineCreatingList] = useState(false);
  const [inlineNewListName, setInlineNewListName] = useState('');

  // Row context menu & Details flag color popover
  const [rowMenu, setRowMenu] = useState<{
    symbol: string;
    x: number;
    y: number;
  } | null>(null);
  const [addToSubmenuOpen, setAddToSubmenuOpen] = useState(false);
  const [detailsFlagMenuOpen, setDetailsFlagMenuOpen] = useState(false);

  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(target)) {
        setListDropdownOpen(false);
        setSettingsMenuOpen(false);
        setDetailsFlagMenuOpen(false);
      }
      setRowMenu(null);
      setAddToSubmenuOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setListDropdownOpen(false);
        setSettingsMenuOpen(false);
        setRowMenu(null);
        setAddToSubmenuOpen(false);
        setDetailsFlagMenuOpen(false);
        setInlineCreatingList(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  const flagCounts = useMemo(() => countSymbolsByFlagColor(flagMap), [flagMap]);

  const visibleSymbols = useMemo(() => {
    const filtered =
      filter === 'all'
        ? symbols
        : symbols.filter((s) => classifyWatchlistSymbol(s) === filter);

    return sortWatchlistSymbols(filtered, quotes, sort);
  }, [symbols, filter, quotes, sort]);

  if (!open) return null;

  const activeListName = getActiveListLabel(activeRef, customWatchlists);
  const activeFlagColor = activeRef.kind === 'flagged' ? activeRef.color : null;
  const activeCustomList =
    activeRef.kind === 'custom'
      ? customWatchlists.find((l) => l.id === activeRef.id) ?? customWatchlists[0]
      : null;

  const isCurrentInList = symbols.includes(activeSymbol);
  const currentSymbolFlag = flagMap[activeSymbol] ?? null;
  const precision = getPricePrecision(activeSymbol, activeMeta?.price);
  const isPositive = (activeMeta?.change ?? 0) >= 0;
  const activeAvatar = getTickerAvatar(activeSymbol);

  const dayRatio = activeMeta
    ? computeRangeRatio(activeMeta.price, activeMeta.dayLow, activeMeta.dayHigh)
    : 0.5;
  const has52W =
    activeMeta &&
    typeof activeMeta.fiftyTwoWeekLow === 'number' &&
    typeof activeMeta.fiftyTwoWeekHigh === 'number' &&
    activeMeta.fiftyTwoWeekHigh > activeMeta.fiftyTwoWeekLow;
  const week52Ratio =
    has52W && activeMeta
      ? computeRangeRatio(
          activeMeta.price,
          activeMeta.fiftyTwoWeekLow as number,
          activeMeta.fiftyTwoWeekHigh as number
        )
      : 0.5;

  // Dynamic column grid template matching TradingView Customize Columns
  const gridColsParts = ['minmax(0,1.25fr)'];
  if (columnPrefs.showLast) gridColsParts.push('minmax(0,0.8fr)');
  if (columnPrefs.showChange) gridColsParts.push('minmax(0,0.68fr)');
  if (columnPrefs.showChangePct) gridColsParts.push('minmax(0,0.75fr)');
  if (columnPrefs.showVolume) gridColsParts.push('minmax(0,0.7fr)');
  const gridTemplateStyle = { gridTemplateColumns: gridColsParts.join(' ') };

  const handleSortClick = (key: WatchlistSortKey) => {
    setSort((prev) => nextSortState(prev, key));
  };

  const renderSortIcon = (key: WatchlistSortKey) => {
    if (sort.key !== key) return null;
    return sort.direction === 'asc' ? (
      <ArrowUp className="w-2.5 h-2.5 inline ml-0.5 text-slate-700 dark:text-[#f0f3fa]" />
    ) : (
      <ArrowDown className="w-2.5 h-2.5 inline ml-0.5 text-slate-700 dark:text-[#f0f3fa]" />
    );
  };

  const handleRowKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === 'ArrowDown' && idx < visibleSymbols.length - 1) {
      e.preventDefault();
      onSelectSymbol(visibleSymbols[idx + 1]);
    } else if (e.key === 'ArrowUp' && idx > 0) {
      e.preventDefault();
      onSelectSymbol(visibleSymbols[idx - 1]);
    }
  };

  const formatChange = (chg: number, prec: number): string => {
    const sign = chg >= 0 ? '+' : '';
    return `${sign}${chg.toFixed(prec)}`;
  };

  const openContextMenuForSymbol = (e: React.MouseEvent, sym: string) => {
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 240;
    const menuHeight = 310;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 8);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 8);
    setRowMenu({ symbol: sym, x: Math.max(8, x), y: Math.max(8, y) });
    setAddToSubmenuOpen(false);
    setListDropdownOpen(false);
    setSettingsMenuOpen(false);
  };

  const rowMenuFlagColor = rowMenu ? flagMap[rowMenu.symbol] ?? null : null;

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 lg:hidden ${screenerOpen ? 'z-10' : 'z-30'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        ref={panelRef}
        aria-label="Market watchlist"
        className={`fixed lg:relative right-0 top-12 bottom-[52px] md:bottom-0 w-[min(88vw,320px)] lg:top-auto lg:bottom-auto lg:right-auto lg:w-[296px] lg:h-full lg:min-h-0 lg:overflow-hidden shrink-0 bg-white dark:bg-[#000000] border-l border-slate-200 dark:border-[#1f2430] flex flex-col select-none ${
          screenerOpen ? 'z-20 lg:z-10' : 'z-40 lg:z-10'
        }`}
      >
        {/* Header: Watchlist Switcher Dropdown + Add Symbol (+) & Settings (...) */}
        <div className="h-10 px-2.5 border-b border-slate-200 dark:border-[#1f2430] flex items-center justify-between shrink-0 relative">
          <button
            type="button"
            onClick={() => {
              setListDropdownOpen((prev) => !prev);
              setSettingsMenuOpen(false);
              setInlineCreatingList(false);
            }}
            aria-expanded={listDropdownOpen}
            aria-label={`Select watchlist, current ${activeListName}`}
            className="h-7 px-1.5 -ml-0.5 rounded flex items-center gap-1.5 min-w-0 hover:bg-slate-100 dark:hover:bg-[#1e222d] transition-colors cursor-pointer"
          >
            {activeFlagColor && (
              <FlagRibbonIcon color={activeFlagColor} className="w-3.5 h-2.5 shrink-0" />
            )}
            <span className="text-[13px] font-semibold text-slate-900 dark:text-[#f0f3fa] truncate">
              {activeListName}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-[#787b86] tabular-nums shrink-0">
              {symbols.length}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-[#b2b5be] shrink-0" />
          </button>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={onOpenWatchlistAdd}
              aria-label="Add symbol to watchlist"
              title={`Add symbol to ${activeListName}`}
              className="w-7 h-7 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#b2b5be] dark:hover:bg-[#1e222d] dark:hover:text-[#f0f3fa] transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setSettingsMenuOpen((prev) => !prev);
                setListDropdownOpen(false);
              }}
              aria-expanded={settingsMenuOpen}
              aria-label="Watchlist settings"
              title="Settings"
              className="w-7 h-7 rounded flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-[#787b86] dark:hover:bg-[#1e222d] dark:hover:text-[#f0f3fa] transition-colors cursor-pointer"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close watchlist panel"
              className="lg:hidden w-7 h-7 rounded flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:text-[#787b86] dark:hover:bg-[#1e222d] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Watchlist Switcher Dropdown Menu */}
          {listDropdownOpen && (
            <div
              role="menu"
              aria-label="Watchlist menu"
              className="absolute left-2 top-10 w-64 rounded-lg bg-white dark:bg-[#1e222d] border border-slate-200 dark:border-[#2a2e39] shadow-2xl py-1.5 z-50 text-xs"
            >
              {inlineCreatingList ? (
                <div className="px-2.5 py-1.5 flex items-center gap-1.5">
                  <input
                    autoFocus
                    type="text"
                    value={inlineNewListName}
                    onChange={(e) => setInlineNewListName(e.target.value)}
                    placeholder="List name..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && inlineNewListName.trim()) {
                        onCreateList(inlineNewListName.trim());
                        setInlineNewListName('');
                        setInlineCreatingList(false);
                        setListDropdownOpen(false);
                      }
                      if (e.key === 'Escape') {
                        e.stopPropagation();
                        setInlineCreatingList(false);
                      }
                    }}
                    className="flex-1 h-7 px-2 rounded bg-slate-50 dark:bg-[#131722] border border-[#2962ff] text-xs text-slate-900 dark:text-[#f0f3fa] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (inlineNewListName.trim()) {
                        onCreateList(inlineNewListName.trim());
                        setInlineNewListName('');
                        setInlineCreatingList(false);
                        setListDropdownOpen(false);
                      }
                    }}
                    className="px-2 h-7 rounded bg-[#2962ff] text-white text-[11px] font-semibold cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setInlineCreatingList(true)}
                  className="w-full px-3 py-1.5 flex items-center gap-2.5 text-slate-700 hover:bg-slate-100 dark:text-[#d1d4dc] dark:hover:bg-[#2a2e39] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-400 dark:text-[#787b86]" />
                  <span>Create new list…</span>
                </button>
              )}

              {/* Flagged Lists Section (7 Colors, Red Default) */}
              <div className="my-1 border-t border-slate-100 dark:border-[#2a2e39]" />
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#787b86]">
                Flagged lists
              </div>
              <div className="max-h-44 overflow-y-auto thin-scrollbar">
                {FLAG_COLOR_OPTIONS.map((opt) => {
                  const selected = activeRef.kind === 'flagged' && activeRef.color === opt.id;
                  const cnt = flagCounts[opt.id];
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        onSelectList({ kind: 'flagged', color: opt.id });
                        setListDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-1.5 flex items-center justify-between transition-colors cursor-pointer ${
                        selected
                          ? 'bg-slate-100 text-slate-900 dark:bg-[#2a2e39] dark:text-[#ffffff] font-semibold'
                          : 'text-slate-700 hover:bg-slate-50 dark:text-[#d1d4dc] dark:hover:bg-[#2a2e39]/60'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <FlagRibbonIcon color={opt.id} className="w-3 h-2.5 shrink-0" />
                        <span className="truncate">{opt.listName}</span>
                        {opt.id === DEFAULT_FLAG_COLOR && (
                          <span className="text-[10px] text-[#f23645] font-medium">
                            Default
                          </span>
                        )}
                      </span>
                      <span className="text-[11px] tabular-nums text-slate-400 dark:text-[#787b86]">
                        {cnt}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Created Watchlists Section */}
              <div className="my-1 border-t border-slate-100 dark:border-[#2a2e39]" />
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#787b86]">
                Created lists
              </div>
              <div className="max-h-32 overflow-y-auto thin-scrollbar">
                {customWatchlists.map((list) => {
                  const selected = activeRef.kind === 'custom' && activeRef.id === list.id;
                  return (
                    <button
                      key={list.id}
                      type="button"
                      onClick={() => {
                        onSelectList({ kind: 'custom', id: list.id });
                        setListDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-1.5 flex items-center justify-between transition-colors cursor-pointer ${
                        selected
                          ? 'bg-slate-100 text-slate-900 dark:bg-[#2a2e39] dark:text-[#ffffff] font-semibold'
                          : 'text-slate-700 hover:bg-slate-50 dark:text-[#d1d4dc] dark:hover:bg-[#2a2e39]/60'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Bookmark className="w-3 h-3 text-slate-400 dark:text-[#787b86] shrink-0" />
                        <span className="truncate">{list.name}</span>
                      </span>
                      <span className="text-[11px] tabular-nums text-slate-400 dark:text-[#787b86]">
                        {list.symbols.length}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Open list... (Shift + W) */}
              <div className="mt-1 pt-1 border-t border-slate-100 dark:border-[#2a2e39]">
                <button
                  type="button"
                  onClick={() => {
                    setListDropdownOpen(false);
                    onOpenWatchlistsModal();
                  }}
                  className="w-full px-3 py-1.5 flex items-center justify-between text-slate-700 hover:bg-slate-100 dark:text-[#d1d4dc] dark:hover:bg-[#2a2e39] cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FolderOpen className="w-3.5 h-3.5 text-slate-400 dark:text-[#787b86]" />
                    <span>Open list…</span>
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-[#787b86]">Shift + W</span>
                </button>
              </div>
            </div>
          )}

          {/* Settings (...) Menu (TradingView Customize Columns & Display) */}
          {settingsMenuOpen && (
            <div
              role="menu"
              aria-label="Watchlist settings"
              className="absolute right-2 top-10 w-52 rounded-lg bg-white dark:bg-[#1e222d] border border-slate-200 dark:border-[#2a2e39] shadow-2xl py-1.5 z-50 text-xs"
            >
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#787b86]">
                Customize columns
              </div>
              {(
                [
                  { key: 'showLast', label: 'Last' },
                  { key: 'showChange', label: 'Change' },
                  { key: 'showChangePct', label: 'Change %' },
                  { key: 'showVolume', label: 'Volume' },
                ] as const
              ).map((col) => {
                const checked = columnPrefs[col.key];
                return (
                  <button
                    key={col.key}
                    type="button"
                    onClick={() =>
                      onUpdateColumnPrefs({ ...columnPrefs, [col.key]: !checked })
                    }
                    className="w-full px-3 py-1.5 flex items-center gap-2.5 text-slate-700 hover:bg-slate-100 dark:text-[#d1d4dc] dark:hover:bg-[#2a2e39] cursor-pointer"
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                        checked
                          ? 'bg-[#2962ff] border-[#2962ff] text-white'
                          : 'border-slate-300 dark:border-[#434651]'
                      }`}
                    >
                      {checked && <Check className="w-2.5 h-2.5" />}
                    </span>
                    <span>{col.label}</span>
                  </button>
                );
              })}

              <div className="my-1 border-t border-slate-100 dark:border-[#2a2e39]" />
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#787b86]">
                Symbol display
              </div>
              <button
                type="button"
                onClick={() =>
                  onUpdateColumnPrefs({ ...columnPrefs, showLogo: !columnPrefs.showLogo })
                }
                className="w-full px-3 py-1.5 flex items-center gap-2.5 text-slate-700 hover:bg-slate-100 dark:text-[#d1d4dc] dark:hover:bg-[#2a2e39] cursor-pointer"
              >
                <span
                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                    columnPrefs.showLogo
                      ? 'bg-[#2962ff] border-[#2962ff] text-white'
                      : 'border-slate-300 dark:border-[#434651]'
                  }`}
                >
                  {columnPrefs.showLogo && <Check className="w-2.5 h-2.5" />}
                </span>
                <span>Logo</span>
              </button>

              <div className="my-1 border-t border-slate-100 dark:border-[#2a2e39]" />
              <button
                type="button"
                onClick={() => {
                  onRefreshQuotes();
                  setSettingsMenuOpen(false);
                }}
                className="w-full px-3 py-1.5 flex items-center gap-2.5 text-slate-700 hover:bg-slate-100 dark:text-[#d1d4dc] dark:hover:bg-[#2a2e39] cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-slate-400 dark:text-[#787b86] ${
                    loadingQuotes ? 'animate-spin' : ''
                  }`}
                />
                <span>Refresh quotes</span>
              </button>
            </div>
          )}
        </div>

        {/* Market Filter Strip (All | IDX | US | Crypto/FX) */}
        <div className="px-2 py-1.5 border-b border-slate-200 dark:border-[#1f2430] flex items-center gap-1 overflow-x-auto thin-scrollbar shrink-0">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'idx', label: 'IDX' },
              { id: 'us', label: 'US' },
              { id: 'global', label: 'Crypto/FX' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              aria-pressed={filter === tab.id}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                filter === tab.id
                  ? 'bg-slate-200 text-slate-900 dark:bg-[#2a2e39] dark:text-[#f0f3fa] font-semibold'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-[#b2b5be] dark:hover:bg-[#1e222d] dark:hover:text-[#f0f3fa]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Prompt to add active chart symbol if not yet in active list */}
        {!isCurrentInList && (
          <div className="px-3 py-1.5 border-b border-slate-200 dark:border-[#1f2430] flex items-center justify-between bg-slate-50 dark:bg-[#12151c] shrink-0">
            <span className="text-[11px] font-medium text-slate-600 dark:text-[#b2b5be] truncate">
              {activeSymbol} not in {activeListName}
            </span>
            <button
              type="button"
              onClick={onAddCurrentSymbol}
              className="text-[11px] font-semibold text-[#2962ff] hover:underline whitespace-nowrap cursor-pointer ml-2"
            >
              {activeFlagColor
                ? `+ Flag ${getFlagColorMeta(activeFlagColor).label}`
                : '+ Add to list'}
            </button>
          </div>
        )}

        {/* Sortable TradingView Column Headers */}
        <div
          className="px-2.5 h-7 grid items-center gap-1 text-[11px] text-slate-400 dark:text-[#787b86] border-b border-slate-100 dark:border-[#1a1e28] shrink-0"
          style={gridTemplateStyle}
        >
          <button
            type="button"
            onClick={() => handleSortClick('symbol')}
            aria-label="Sort by Symbol"
            className="text-left hover:text-slate-700 dark:hover:text-[#d1d4dc] truncate cursor-pointer pl-4"
          >
            Symbol{renderSortIcon('symbol')}
          </button>
          {columnPrefs.showLast && (
            <button
              type="button"
              onClick={() => handleSortClick('last')}
              aria-label="Sort by Last price"
              className="text-right hover:text-slate-700 dark:hover:text-[#d1d4dc] cursor-pointer"
            >
              Last{renderSortIcon('last')}
            </button>
          )}
          {columnPrefs.showChange && (
            <button
              type="button"
              onClick={() => handleSortClick('chg')}
              aria-label="Sort by Change"
              className="text-right hover:text-slate-700 dark:hover:text-[#d1d4dc] cursor-pointer"
            >
              Chg{renderSortIcon('chg')}
            </button>
          )}
          {columnPrefs.showChangePct && (
            <button
              type="button"
              onClick={() => handleSortClick('chgPct')}
              aria-label="Sort by Change percent"
              className="text-right hover:text-slate-700 dark:hover:text-[#d1d4dc] cursor-pointer"
            >
              Chg%{renderSortIcon('chgPct')}
            </button>
          )}
          {columnPrefs.showVolume && (
            <button
              type="button"
              onClick={() => handleSortClick('volume')}
              aria-label="Sort by Volume"
              className="text-right hover:text-slate-700 dark:hover:text-[#d1d4dc] cursor-pointer"
            >
              Vol{renderSortIcon('volume')}
            </button>
          )}
        </div>

        {/* Dense Single-Line Watchlist Rows */}
        <div
          role="listbox"
          aria-label="Watchlist symbols"
          className="flex-1 min-h-0 overflow-y-auto thin-scrollbar divide-y divide-slate-100/80 dark:divide-[#141720]"
        >
          {visibleSymbols.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-slate-500 dark:text-[#787b86] space-y-2">
              <p>
                {activeFlagColor
                  ? `No symbols in ${activeListName} yet. Right-click any symbol or click + to add.`
                  : 'No symbols in this list yet.'}
              </p>
              <button
                type="button"
                onClick={onOpenWatchlistAdd}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-[#1e222d] dark:hover:bg-[#2a2e39] text-slate-800 dark:text-[#f0f3fa] font-medium cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add symbol</span>
              </button>
            </div>
          ) : (
            visibleSymbols.map((sym, idx) => {
              const q = quotes[sym];
              const isSelected = sym === activeSymbol;
              const symFlag = flagMap[sym] ?? null;
              const isFlagged = symFlag !== null;
              const chg = q?.change ?? 0;
              const pct = q?.changePercent ?? 0;
              const up = pct >= 0;
              const rowPrec = getPricePrecision(sym, q?.price);
              const avatar = getTickerAvatar(sym);

              return (
                <div
                  key={sym}
                  draggable={
                    activeRef.kind === 'custom' && sort.key === null && filter === 'all'
                  }
                  onDragStart={() => setDraggingSymbol(sym)}
                  onDragOver={(e) => {
                    if (
                      activeRef.kind === 'custom' &&
                      draggingSymbol &&
                      draggingSymbol !== sym &&
                      sort.key === null &&
                      filter === 'all'
                    ) {
                      e.preventDefault();
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (
                      activeRef.kind === 'custom' &&
                      draggingSymbol &&
                      draggingSymbol !== sym &&
                      sort.key === null &&
                      filter === 'all'
                    ) {
                      onReorderSymbols(reorderWatchlistSymbols(symbols, draggingSymbol, sym));
                    }
                    setDraggingSymbol(null);
                  }}
                  onDragEnd={() => setDraggingSymbol(null)}
                  onContextMenu={(e) => openContextMenuForSymbol(e, sym)}
                  className={`group relative flex items-center h-[34px] px-2 text-xs transition-colors ${
                    isSelected
                      ? 'bg-slate-100 dark:bg-[#2a2e39]/80'
                      : 'hover:bg-slate-50 dark:hover:bg-[#1e222d]/65'
                  }`}
                >
                  {/* TradingView Notched Flag Ribbon Toggle (Left-click: Red default / unflag; Right-click: 7-color context menu) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFlag(sym);
                    }}
                    onContextMenu={(e) => openContextMenuForSymbol(e, sym)}
                    aria-label={
                      isFlagged
                        ? `Unflag ${sym} (${getFlagColorMeta(symFlag).listName})`
                        : `Flag ${sym} (Red default)`
                    }
                    aria-pressed={isFlagged}
                    title={
                      isFlagged
                        ? `${getFlagColorMeta(symFlag).listName} · Click to unflag, right-click for colors`
                        : 'Flag Red (default) · Right-click for colors'
                    }
                    className={`w-4 h-5 flex items-center justify-center shrink-0 mr-1 transition-opacity cursor-pointer ${
                      isFlagged
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-slate-400 hover:text-[#f23645] dark:text-[#787b86]'
                    }`}
                  >
                    <FlagRibbonIcon color={symFlag} className="w-3.5 h-2.5" />
                  </button>

                  {/* Main Row Clickable Grid */}
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => onSelectSymbol(sym)}
                    onKeyDown={(e) => handleRowKeyDown(e, idx)}
                    title={q?.shortName ? `${sym} · ${q.shortName}` : sym}
                    className="flex-1 grid items-center gap-1 text-left min-w-0 cursor-pointer"
                    style={gridTemplateStyle}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {columnPrefs.showLogo && (
                        <span
                          aria-hidden="true"
                          style={{ backgroundColor: avatar.color }}
                          className="w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center shrink-0"
                        >
                          {avatar.letter}
                        </span>
                      )}
                      <span
                        className={`text-[12px] font-semibold truncate ${
                          isSelected
                            ? 'text-slate-900 dark:text-[#ffffff]'
                            : 'text-slate-900 dark:text-[#d1d4dc]'
                        }`}
                      >
                        {sym}
                      </span>
                    </div>

                    {columnPrefs.showLast && (
                      <span className="tabular-nums text-right text-[12px] text-slate-800 dark:text-[#d1d4dc] truncate">
                        {q && q.price > 0
                          ? q.price.toLocaleString(undefined, {
                              minimumFractionDigits: rowPrec,
                              maximumFractionDigits: rowPrec,
                            })
                          : '—'}
                      </span>
                    )}

                    {columnPrefs.showChange && (
                      <span
                        className={`tabular-nums text-right text-[11px] truncate ${
                          !q
                            ? 'text-slate-400 dark:text-[#787b86]'
                            : up
                              ? 'text-[#16a34a] dark:text-[#089981]'
                              : 'text-[#dc2626] dark:text-[#f23645]'
                        }`}
                      >
                        {q ? formatChange(chg, rowPrec) : '—'}
                      </span>
                    )}

                    {columnPrefs.showChangePct && (
                      <span
                        className={`tabular-nums text-right text-[12px] font-medium truncate ${
                          !q
                            ? 'text-slate-400 dark:text-[#787b86]'
                            : up
                              ? 'text-[#16a34a] dark:text-[#089981]'
                              : 'text-[#dc2626] dark:text-[#f23645]'
                        }`}
                      >
                        {q ? `${up ? '+' : ''}${pct.toFixed(2)}%` : '—'}
                      </span>
                    )}

                    {columnPrefs.showVolume && (
                      <span className="tabular-nums text-right text-[11px] text-slate-500 dark:text-[#9598a1] truncate">
                        {q?.volume ? formatCompactVolume(q.volume) : '—'}
                      </span>
                    )}
                  </button>

                  {/* Hover Remove Action (removes from custom list or unflags in color list) */}
                  {(activeRef.kind === 'flagged' || symbols.length > 1) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveSymbol(sym);
                      }}
                      aria-label={`Remove ${sym} from ${activeListName}`}
                      title={activeRef.kind === 'flagged' ? 'Unflag' : 'Remove'}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center bg-slate-200/95 dark:bg-[#2a2e39] text-slate-600 hover:text-[#f23645] dark:text-[#b2b5be] dark:hover:text-[#f23645] shadow transition-opacity cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Collapsible TradingView Instrument Details Split Pane */}
        {activeMeta && (
          <div className="border-t-2 border-slate-200 dark:border-[#1f2430] bg-slate-50/70 dark:bg-[#000000] shrink-0 max-h-[55%] flex flex-col min-h-0">
            <button
              type="button"
              onClick={() => setDetailsExpanded((prev) => !prev)}
              aria-expanded={detailsExpanded}
              className="w-full px-3 py-1.5 flex items-center justify-between text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:text-[#787b86] dark:hover:text-[#d1d4dc] cursor-pointer shrink-0"
            >
              <span className="tracking-wide uppercase">Details</span>
              {detailsExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
            </button>

            {detailsExpanded && (
              <div className="px-3 pb-3 pt-0.5 relative overflow-y-auto thin-scrollbar min-h-0">
                {/* Instrument Title Row */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      aria-hidden="true"
                      style={{ backgroundColor: activeAvatar.color }}
                      className="w-6 h-6 rounded-full text-[11px] font-bold text-white flex items-center justify-center shrink-0"
                    >
                      {activeAvatar.letter}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-900 dark:text-[#f0f3fa] truncate">
                          {activeSymbol}
                        </span>
                        {/* Flag button + 7-color selector trigger */}
                        <button
                          type="button"
                          onClick={() => onToggleFlag(activeSymbol)}
                          aria-label={
                            currentSymbolFlag
                              ? `Unflag ${activeSymbol}`
                              : `Flag ${activeSymbol} (Red default)`
                          }
                          title={
                            currentSymbolFlag
                              ? `${getFlagColorMeta(currentSymbolFlag).listName} · Click to unflag`
                              : 'Flag Red (Default)'
                          }
                          className={`cursor-pointer ${
                            currentSymbolFlag
                              ? 'opacity-100'
                              : 'text-slate-400 hover:text-[#f23645] dark:text-[#787b86]'
                          }`}
                        >
                          <FlagRibbonIcon color={currentSymbolFlag} className="w-3.5 h-2.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailsFlagMenuOpen((prev) => !prev);
                          }}
                          aria-label="Choose flag color"
                          title="Choose flag color list"
                          className="w-4 h-4 rounded flex items-center justify-center text-slate-400 hover:bg-slate-200 dark:text-[#787b86] dark:hover:bg-[#2a2e39] cursor-pointer"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-[#787b86] truncate">
                        {activeMeta.shortName}
                        {activeMeta.exchangeName ? ` · ${activeMeta.exchangeName}` : ''}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-[#1e222d] text-slate-600 dark:text-[#b2b5be] shrink-0">
                    {activeMeta.currency}
                  </span>
                </div>

                {/* Details 7-Color Flag Popover */}
                {detailsFlagMenuOpen && (
                  <div
                    onMouseDown={(e) => e.stopPropagation()}
                    className="mb-2 p-2 rounded-md bg-white dark:bg-[#1e222d] border border-slate-200 dark:border-[#2a2e39] shadow-lg space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-[#787b86]">
                      <span>Assign color list (Default: Red)</span>
                      {currentSymbolFlag && (
                        <button
                          type="button"
                          onClick={() => {
                            onSetFlagColor(activeSymbol, null);
                            setDetailsFlagMenuOpen(false);
                          }}
                          className="text-[#f23645] hover:underline cursor-pointer"
                        >
                          Unflag
                        </button>
                      )}
                    </div>
                    <FlagColorSwatchRow
                      selectedColor={currentSymbolFlag}
                      onSelectColor={(color) => {
                        onSetFlagColor(activeSymbol, color);
                        setDetailsFlagMenuOpen(false);
                      }}
                    />
                  </div>
                )}

                {/* Big Last Price & Change */}
                <div className="flex items-baseline gap-2 mb-2.5">
                  <span className="text-xl font-bold text-slate-900 dark:text-[#f0f3fa] tabular-nums">
                    {activeMeta.price.toLocaleString(undefined, {
                      minimumFractionDigits: precision,
                      maximumFractionDigits: precision,
                    })}
                  </span>
                  <span
                    className={`text-xs font-medium tabular-nums ${
                      isPositive
                        ? 'text-[#16a34a] dark:text-[#089981]'
                        : 'text-[#dc2626] dark:text-[#f23645]'
                    }`}
                  >
                    {isPositive ? '+' : ''}
                    {activeMeta.change.toFixed(precision)} ({isPositive ? '+' : ''}
                    {activeMeta.changePercent.toFixed(2)}%)
                  </span>
                </div>

                {/* TradingView Visual Day's Range Progress Bar */}
                <div className="mb-2.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-[#787b86] mb-1">
                    <span>Day's Range</span>
                    <span className="tabular-nums text-slate-700 dark:text-[#b2b5be]">
                      {activeMeta.dayLow.toLocaleString(undefined, {
                        minimumFractionDigits: precision,
                        maximumFractionDigits: precision,
                      })}{' '}
                      –{' '}
                      {activeMeta.dayHigh.toLocaleString(undefined, {
                        minimumFractionDigits: precision,
                        maximumFractionDigits: precision,
                      })}
                    </span>
                  </div>
                  <div className="relative h-1.5 rounded-full bg-slate-200 dark:bg-[#2a2e39]">
                    <div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-slate-900 dark:bg-[#f0f3fa] border-2 border-white dark:border-[#000000]"
                      style={{ left: `${(dayRatio * 100).toFixed(1)}%` }}
                    />
                  </div>
                </div>

                {/* 52-Week Range Visual Bar (when available) */}
                {has52W && (
                  <div className="mb-2.5">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-[#787b86] mb-1">
                      <span>52W Range</span>
                      <span className="tabular-nums text-slate-700 dark:text-[#b2b5be]">
                        {(activeMeta.fiftyTwoWeekLow as number).toLocaleString(undefined, {
                          minimumFractionDigits: precision,
                          maximumFractionDigits: precision,
                        })}{' '}
                        –{' '}
                        {(activeMeta.fiftyTwoWeekHigh as number).toLocaleString(undefined, {
                          minimumFractionDigits: precision,
                          maximumFractionDigits: precision,
                        })}
                      </span>
                    </div>
                    <div className="relative h-1.5 rounded-full bg-slate-200 dark:bg-[#2a2e39]">
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-slate-600 dark:bg-[#787b86] border-2 border-white dark:border-[#000000]"
                        style={{ left: `${(week52Ratio * 100).toFixed(1)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Prev Close & Volume Key Metrics */}
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] pt-1 border-t border-slate-200/70 dark:border-[#1f2430]">
                  <div className="flex justify-between">
                    <dt className="text-slate-500 dark:text-[#787b86]">Prev Close</dt>
                    <dd className="tabular-nums text-slate-800 dark:text-[#d1d4dc]">
                      {activeMeta.prevClose.toLocaleString(undefined, {
                        minimumFractionDigits: precision,
                        maximumFractionDigits: precision,
                      })}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500 dark:text-[#787b86]">Volume</dt>
                    <dd className="tabular-nums text-slate-800 dark:text-[#d1d4dc]">
                      {formatCompactVolume(activeMeta.volume)}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* TradingView Row Right-Click Context Menu (Flag/Unflag + 7 Color Swatches + Add to Watchlist) */}
      {rowMenu && (
        <div
          role="menu"
          aria-label={`Actions for ${rowMenu.symbol}`}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ left: rowMenu.x, top: rowMenu.y }}
          className="fixed w-60 rounded-lg bg-white dark:bg-[#1e222d] border border-slate-200 dark:border-[#2a2e39] shadow-2xl py-1.5 z-[80] text-xs"
        >
          <button
            type="button"
            onClick={() => {
              onToggleFlag(rowMenu.symbol);
              setRowMenu(null);
            }}
            className="w-full px-3 py-1.5 flex items-center justify-between text-slate-800 hover:bg-slate-100 dark:text-[#f0f3fa] dark:hover:bg-[#2a2e39] cursor-pointer"
          >
            <span>
              {rowMenuFlagColor ? `Unflag ${rowMenu.symbol}` : `Flag ${rowMenu.symbol}`}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-[#787b86]">Alt + ↵</span>
          </button>

          {/* 7 Color Flag Swatches (Red Default) */}
          <div className="px-3 py-2">
            <FlagColorSwatchRow
              selectedColor={rowMenuFlagColor ?? DEFAULT_FLAG_COLOR}
              onSelectColor={(color) => {
                onSetFlagColor(rowMenu.symbol, color);
                setRowMenu(null);
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              onUnflagAll();
              setRowMenu(null);
            }}
            className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-100 dark:text-[#d1d4dc] dark:hover:bg-[#2a2e39] cursor-pointer"
          >
            Unflag all symbols
          </button>

          <div className="my-1 border-t border-slate-100 dark:border-[#2a2e39]" />

          {/* Add <SYMBOL> to watchlist > submenu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setAddToSubmenuOpen((prev) => !prev)}
              onMouseEnter={() => setAddToSubmenuOpen(true)}
              className="w-full px-3 py-1.5 flex items-center justify-between text-slate-700 hover:bg-slate-100 dark:text-[#d1d4dc] dark:hover:bg-[#2a2e39] cursor-pointer"
            >
              <span className="truncate">Add {rowMenu.symbol} to watchlist</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {addToSubmenuOpen && (
              <div className="absolute left-full top-0 ml-1 w-48 rounded-lg bg-white dark:bg-[#1e222d] border border-slate-200 dark:border-[#2a2e39] shadow-2xl py-1 z-[85]">
                {customWatchlists.map((list) => {
                  const alreadyIn = list.symbols.includes(rowMenu.symbol);
                  return (
                    <button
                      key={list.id}
                      type="button"
                      onClick={() => {
                        onAddSymbolToCustomList(list.id, rowMenu.symbol);
                        setRowMenu(null);
                        setAddToSubmenuOpen(false);
                      }}
                      className="w-full px-3 py-1.5 flex items-center justify-between text-slate-700 hover:bg-slate-100 dark:text-[#d1d4dc] dark:hover:bg-[#2a2e39] cursor-pointer"
                    >
                      <span className="truncate">{list.name}</span>
                      {alreadyIn && <Check className="w-3 h-3 text-[#089981] shrink-0" />}
                    </button>
                  );
                })}
                <div className="my-1 border-t border-slate-100 dark:border-[#2a2e39]" />
                <button
                  type="button"
                  onClick={() => {
                    const name = `List ${customWatchlists.length + 1}`;
                    onCreateList(name, [rowMenu.symbol]);
                    setRowMenu(null);
                    setAddToSubmenuOpen(false);
                  }}
                  className="w-full px-3 py-1.5 flex items-center gap-1.5 text-[#2962ff] hover:bg-slate-100 dark:hover:bg-[#2a2e39] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create new list with {rowMenu.symbol}</span>
                </button>
              </div>
            )}
          </div>

          {(activeRef.kind === 'flagged' || symbols.length > 1) && (
            <button
              type="button"
              onClick={() => {
                onRemoveSymbol(rowMenu.symbol);
                setRowMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left text-[#f23645] hover:bg-red-50 dark:hover:bg-[#2a2e39] cursor-pointer"
            >
              {activeRef.kind === 'flagged'
                ? `Remove ${rowMenu.symbol} from ${activeListName}`
                : `Remove ${rowMenu.symbol} from list`}
            </button>
          )}

          <div className="my-1 border-t border-slate-100 dark:border-[#2a2e39]" />

          <button
            type="button"
            onClick={() => {
              setRowMenu(null);
              onOpenWatchlistAdd();
            }}
            className="w-full px-3 py-1.5 flex items-center gap-2 text-slate-700 hover:bg-slate-100 dark:text-[#d1d4dc] dark:hover:bg-[#2a2e39] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-slate-400" />
            <span>Add symbol</span>
          </button>
        </div>
      )}
    </>
  );
}
