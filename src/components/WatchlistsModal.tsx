import React, { useEffect, useMemo, useState } from 'react';
import { Bookmark, Check, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import {
  DEFAULT_FLAG_COLOR,
  DEFAULT_WATCHLIST_ID,
  FLAG_COLOR_OPTIONS,
  countSymbolsByFlagColor,
  type ActiveWatchlistRef,
  type CustomWatchlist,
  type WatchlistFlagMap,
} from '../utils/watchlistModel';
import { FlagRibbonIcon } from './FlagRibbon';

interface WatchlistsModalProps {
  open: boolean;
  onClose: () => void;
  activeRef: ActiveWatchlistRef;
  customWatchlists: CustomWatchlist[];
  flagMap: WatchlistFlagMap;
  onSelectList: (ref: ActiveWatchlistRef) => void;
  onCreateList: (name: string) => void;
  onRenameList: (id: string, name: string) => void;
  onDeleteList: (id: string) => void;
}

export default function WatchlistsModal({
  open,
  onClose,
  activeRef,
  customWatchlists,
  flagMap,
  onSelectList,
  onCreateList,
  onRenameList,
  onDeleteList,
}: WatchlistsModalProps) {
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    if (!open) {
      setSearch('');
      setCreating(false);
      setNewListName('');
      setEditingId(null);
      setEditingName('');
      return;
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const flagCounts = useMemo(() => countSymbolsByFlagColor(flagMap), [flagMap]);

  if (!open) return null;

  const q = search.trim().toLowerCase();

  const filteredFlagged = FLAG_COLOR_OPTIONS.filter((opt) =>
    !q ? true : opt.listName.toLowerCase().includes(q) || opt.label.toLowerCase().includes(q)
  );

  const filteredCreated = customWatchlists.filter((list) =>
    !q ? true : list.name.toLowerCase().includes(q)
  );

  const handleConfirmCreate = () => {
    const trimmed = newListName.trim();
    if (!trimmed) return;
    onCreateList(trimmed);
    setNewListName('');
    setCreating(false);
  };

  const handleConfirmRename = (id: string) => {
    const trimmed = editingName.trim();
    if (trimmed) {
      onRenameList(id, trimmed);
    }
    setEditingId(null);
    setEditingName('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Watchlists"
      className="fixed inset-0 bg-black/60 flex justify-center items-start pt-16 sm:pt-20 px-4 z-[65]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-lg bg-white dark:bg-[#1e222d] border border-slate-200 dark:border-[#2a2e39] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-[#2a2e39] flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-[#f0f3fa]">
            Watchlists
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setCreating(true);
                setEditingId(null);
              }}
              className="h-7 px-2.5 rounded text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-[#2a2e39] dark:hover:bg-[#363a45] dark:text-[#f0f3fa] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create new list</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close watchlists modal"
              className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-[#2a2e39] dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search lists input */}
        <div className="px-5 py-2.5 border-b border-slate-200 dark:border-[#2a2e39]">
          <div className="flex items-center gap-2 px-3 h-9 rounded-md border border-slate-200 dark:border-[#363a45] bg-slate-50 dark:bg-[#131722] focus-within:border-[#2962ff]">
            <Search className="w-4 h-4 text-slate-400 dark:text-[#787b86] shrink-0" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search lists"
              aria-label="Search lists"
              className="flex-1 bg-transparent text-sm text-slate-900 dark:text-[#f0f3fa] placeholder:text-slate-400 dark:placeholder:text-[#787b86] outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Create New List Inline Bar */}
        {creating && (
          <div className="px-5 py-2.5 bg-slate-50 dark:bg-[#181c27] border-b border-slate-200 dark:border-[#2a2e39] flex items-center gap-2">
            <input
              autoFocus
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmCreate();
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  setCreating(false);
                }
              }}
              placeholder="New watchlist name (e.g. Swing IDX, Tech Leaders)..."
              className="flex-1 h-8 px-2.5 rounded border border-slate-300 dark:border-[#363a45] bg-white dark:bg-[#131722] text-xs text-slate-900 dark:text-[#f0f3fa] outline-none focus:border-[#2962ff]"
            />
            <button
              type="button"
              onClick={handleConfirmCreate}
              className="h-8 px-3 rounded bg-[#2962ff] hover:bg-[#1e53e5] text-white text-xs font-semibold cursor-pointer"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="h-8 px-2.5 rounded text-xs text-slate-500 hover:bg-slate-200 dark:text-[#b2b5be] dark:hover:bg-[#2a2e39] cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Two-section list: FLAGGED LISTS (color-coded) + CREATED LISTS */}
        <div className="max-h-[420px] overflow-y-auto thin-scrollbar px-3 py-3 space-y-4">
          {/* FLAGGED LISTS */}
          <div>
            <div className="px-2.5 pb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#787b86]">
              <span>Flagged lists</span>
              <span>Symbols</span>
            </div>
            <div className="space-y-0.5">
              {filteredFlagged.map((opt) => {
                const isActive =
                  activeRef.kind === 'flagged' && activeRef.color === opt.id;
                const count = flagCounts[opt.id];
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      onSelectList({ kind: 'flagged', color: opt.id });
                      onClose();
                    }}
                    className={`w-full px-3 py-2 rounded-md flex items-center justify-between text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white dark:bg-[#f0f3fa] dark:text-[#131722] font-semibold'
                        : 'text-slate-800 hover:bg-slate-100 dark:text-[#d1d4dc] dark:hover:bg-[#2a2e39]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FlagRibbonIcon color={opt.id} className="w-3.5 h-2.5 shrink-0" />
                      <span className="text-sm truncate">{opt.listName}</span>
                      {opt.id === DEFAULT_FLAG_COLOR && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            isActive
                              ? 'bg-white/20 text-white dark:bg-[#131722]/15 dark:text-[#131722]'
                              : 'bg-red-500/10 text-[#f23645]'
                          }`}
                        >
                          Default
                        </span>
                      )}
                    </div>
                    <span className="text-xs tabular-nums opacity-80">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CREATED LISTS */}
          <div>
            <div className="px-2.5 pb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#787b86]">
              <span>Created lists</span>
              <span>Symbols</span>
            </div>
            <div className="space-y-0.5">
              {filteredCreated.map((list) => {
                const isActive =
                  activeRef.kind === 'custom' && activeRef.id === list.id;
                const isEditing = editingId === list.id;

                if (isEditing) {
                  return (
                    <div
                      key={list.id}
                      className="px-3 py-1.5 rounded-md bg-slate-100 dark:bg-[#2a2e39] flex items-center gap-2"
                    >
                      <input
                        autoFocus
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleConfirmRename(list.id);
                          if (e.key === 'Escape') {
                            e.stopPropagation();
                            setEditingId(null);
                          }
                        }}
                        className="flex-1 h-7 px-2 rounded bg-white dark:bg-[#131722] border border-[#2962ff] text-xs text-slate-900 dark:text-[#f0f3fa] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleConfirmRename(list.id)}
                        className="w-7 h-7 rounded flex items-center justify-center text-[#089981] hover:bg-black/10 cursor-pointer"
                        aria-label="Save list name"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={list.id}
                    className={`group px-3 py-2 rounded-md flex items-center justify-between transition-colors ${
                      isActive
                        ? 'bg-slate-900 text-white dark:bg-[#f0f3fa] dark:text-[#131722] font-semibold'
                        : 'text-slate-800 hover:bg-slate-100 dark:text-[#d1d4dc] dark:hover:bg-[#2a2e39]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectList({ kind: 'custom', id: list.id });
                        onClose();
                      }}
                      className="flex-1 flex items-center gap-2.5 text-left min-w-0 cursor-pointer"
                    >
                      <Bookmark className="w-3.5 h-3.5 opacity-70 shrink-0" />
                      <span className="text-sm truncate">{list.name}</span>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(list.id);
                          setEditingName(list.name);
                        }}
                        aria-label={`Rename ${list.name}`}
                        title="Rename"
                        className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer transition-opacity"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      {list.id !== DEFAULT_WATCHLIST_ID && customWatchlists.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteList(list.id);
                          }}
                          aria-label={`Delete ${list.name}`}
                          title="Delete list"
                          className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center hover:text-[#f23645] cursor-pointer transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                      <span className="text-xs tabular-nums opacity-80 min-w-[18px] text-right">
                        {list.symbols.length}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
