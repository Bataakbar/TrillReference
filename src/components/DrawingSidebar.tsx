import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronRight,
  Crosshair,
  Eye,
  EyeOff,
  Lock,
  Magnet,
  Trash2,
  Undo2,
  Unlock,
} from 'lucide-react';
import { DRAWING_GROUPS } from '../overlays/customOverlays';
import { DrawingToolIcon } from './DrawingToolIcon';
import type { MagnetMode } from '../types/chart';

interface DrawingSidebarProps {
  activeTool: string | null;
  onSelectTool: (toolKey: string) => void;
  onCancelDrawing: () => void;
  magnetMode: MagnetMode;
  onCycleMagnet: () => void;
  drawingsLocked: boolean;
  onToggleLock: () => void;
  drawingsVisible: boolean;
  onToggleVisible: () => void;
  drawingCount: number;
  onUndo: () => void;
  onClearAll: () => void;
  mobileOpen?: boolean;
}

export default function DrawingSidebar({
  activeTool,
  onSelectTool,
  onCancelDrawing,
  magnetMode,
  onCycleMagnet,
  drawingsLocked,
  onToggleLock,
  drawingsVisible,
  onToggleVisible,
  drawingCount,
  onUndo,
  onClearAll,
  mobileOpen = false,
}: DrawingSidebarProps) {
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [lastUsedByGroup, setLastUsedByGroup] = useState<Record<string, string>>({
    freehand: 'simpleAnnotation',
  });
  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setOpenGroupId(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenGroupId(null);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handlePickTool = (groupId: string, toolKey: string) => {
    setLastUsedByGroup((prev) => ({ ...prev, [groupId]: toolKey }));
    setOpenGroupId(null);
    onSelectTool(toolKey);
  };

  const magnetLabel =
    magnetMode === 'strong_magnet'
      ? 'Magnet mode: Strong (snap to OHLC)'
      : magnetMode === 'weak_magnet'
        ? 'Magnet mode: Weak (nearby OHLC)'
        : 'Magnet mode: Off';

  return (
    <aside
      ref={sidebarRef}
      aria-label="Drawing tools toolbar"
      className={`${
        mobileOpen ? 'flex' : 'hidden'
      } md:flex w-12 shrink-0 bg-white dark:bg-[#000000] border-r border-slate-200 dark:border-[#1f2430] flex-col items-center py-2 gap-1 select-none z-25`}
    >
      {/* Crosshair / Select Cursor */}
      <button
        type="button"
        onClick={() => {
          setOpenGroupId(null);
          onCancelDrawing();
        }}
        aria-label="Crosshair cursor (exit drawing mode)"
        title="Crosshair / Select (Esc)"
        className={`w-9 h-9 rounded flex items-center justify-center transition-colors cursor-pointer ${
          activeTool === null
            ? 'bg-slate-200 text-slate-900 dark:bg-[#2a2e39] dark:text-[#f0f3fa]'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#b2b5be] dark:hover:bg-[#1e222d] dark:hover:text-[#f0f3fa]'
        }`}
      >
        <Crosshair className="w-[17px] h-[17px]" />
      </button>

      <div className="w-6 h-px bg-slate-200 dark:bg-[#262c3a] my-0.5" />

      {/* 7 Drawing Tool Groups (30 Total Tools with TradingView Line Visualization Icons) */}
      {DRAWING_GROUPS.map((group, groupIndex) => {
        const isGroupActive = group.tools.some((t) => t.key === activeTool);
        const isOpen = openGroupId === group.id;
        const hasSubmenu = group.tools.length > 1;
        const preferredTool = lastUsedByGroup[group.id] ?? group.tools[0].key;
        const openUpward = groupIndex >= 4;

        return (
          <div key={group.id} className="relative">
            <button
              type="button"
              onClick={() => {
                if (!hasSubmenu) {
                  handlePickTool(group.id, preferredTool);
                } else {
                  setOpenGroupId(isOpen ? null : group.id);
                }
              }}
              aria-expanded={hasSubmenu ? isOpen : undefined}
              aria-label={group.label}
              title={group.label}
              className={`relative w-9 h-9 rounded flex items-center justify-center transition-colors cursor-pointer ${
                isGroupActive || isOpen
                  ? 'bg-slate-200 text-slate-900 dark:bg-[#2a2e39] dark:text-[#f0f3fa]'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#b2b5be] dark:hover:bg-[#1e222d] dark:hover:text-[#f0f3fa]'
              }`}
            >
              <DrawingToolIcon toolKey={preferredTool} className="w-[19px] h-[19px]" />
              {hasSubmenu && (
                <ChevronRight className="w-2.5 h-2.5 absolute right-0.5 bottom-0.5 opacity-60" />
              )}
            </button>

            {isOpen && (
              <div
                role="menu"
                aria-label={`${group.label} tools`}
                className={`absolute left-11 ${openUpward ? 'bottom-0' : 'top-0'} w-60 max-w-[calc(100vw-60px)] max-h-[68dvh] overflow-y-auto thin-scrollbar rounded-md bg-white dark:bg-[#1e222d] border border-slate-200 dark:border-[#2a2e39] shadow-2xl py-1.5 px-1.5 z-50 flex flex-col gap-0.5`}
              >
                <div className="px-2.5 py-1.5 text-[11px] font-medium text-slate-500 dark:text-[#8b95a7] border-b border-slate-100 dark:border-[#2a2e39] mb-1">
                  {group.label}
                </div>
                {group.tools.map((tool) => {
                  const isActive = activeTool === tool.key;
                  return (
                    <button
                      key={tool.key}
                      type="button"
                      role="menuitem"
                      onClick={() => handlePickTool(group.id, tool.key)}
                      className={`w-full flex items-center gap-3 text-left px-2.5 py-2 rounded text-[13px] transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-slate-200 text-slate-900 dark:bg-[#2a2e39] dark:text-[#f0f3fa] font-medium'
                          : 'text-slate-700 hover:bg-slate-100 dark:text-[#d1d4dc] dark:hover:bg-[#2a2e39]/60'
                      }`}
                    >
                      <DrawingToolIcon
                        toolKey={tool.key}
                        className="w-5 h-5 shrink-0 opacity-90"
                      />
                      <span className="truncate">{tool.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className="w-6 h-px bg-slate-200 dark:bg-[#262c3a] my-1" />

      {/* Magnet Mode */}
      <button
        type="button"
        onClick={onCycleMagnet}
        aria-label={magnetLabel}
        title={magnetLabel}
        className={`relative w-9 h-9 rounded flex items-center justify-center transition-colors cursor-pointer ${
          magnetMode !== 'normal'
            ? 'bg-slate-200 text-slate-900 dark:bg-[#2a2e39] dark:text-[#f0f3fa]'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#b2b5be] dark:hover:bg-[#1e222d] dark:hover:text-[#f0f3fa]'
        }`}
      >
        <Magnet className="w-[17px] h-[17px]" />
        {magnetMode === 'weak_magnet' && (
          <span className="absolute right-0.5 top-0.5 text-[9px] font-mono font-bold leading-none">
            W
          </span>
        )}
        {magnetMode === 'strong_magnet' && (
          <span className="absolute right-0.5 top-0.5 text-[9px] font-mono font-bold leading-none">
            S
          </span>
        )}
      </button>

      {/* Lock / Unlock Drawings */}
      <button
        type="button"
        onClick={onToggleLock}
        aria-pressed={drawingsLocked}
        aria-label={drawingsLocked ? 'Unlock all drawings' : 'Lock all drawings'}
        title={drawingsLocked ? 'Unlock All Drawings' : 'Lock All Drawings'}
        className={`w-9 h-9 rounded flex items-center justify-center transition-colors cursor-pointer ${
          drawingsLocked
            ? 'bg-slate-200 text-slate-900 dark:bg-[#2a2e39] dark:text-[#f0f3fa]'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#b2b5be] dark:hover:bg-[#1e222d] dark:hover:text-[#f0f3fa]'
        }`}
      >
        {drawingsLocked ? <Lock className="w-[17px] h-[17px]" /> : <Unlock className="w-[17px] h-[17px]" />}
      </button>

      {/* Show / Hide Drawings */}
      <button
        type="button"
        onClick={onToggleVisible}
        aria-pressed={!drawingsVisible}
        aria-label={drawingsVisible ? 'Hide all drawings' : 'Show all drawings'}
        title={drawingsVisible ? 'Hide All Drawings' : 'Show All Drawings'}
        className={`w-9 h-9 rounded flex items-center justify-center transition-colors cursor-pointer ${
          !drawingsVisible
            ? 'bg-slate-200 text-slate-900 dark:bg-[#2a2e39] dark:text-[#f0f3fa]'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#b2b5be] dark:hover:bg-[#1e222d] dark:hover:text-[#f0f3fa]'
        }`}
      >
        {drawingsVisible ? <Eye className="w-[17px] h-[17px]" /> : <EyeOff className="w-[17px] h-[17px]" />}
      </button>

      {/* Undo Last Drawing */}
      <button
        type="button"
        onClick={onUndo}
        disabled={drawingCount === 0}
        aria-label="Undo last drawing"
        title="Undo Last Drawing (Ctrl+Z)"
        className="w-9 h-9 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#98a2b3] dark:hover:bg-[#1e2433] dark:hover:text-white disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
      >
        <Undo2 className="w-[17px] h-[17px]" />
      </button>

      {/* Clear All Drawings */}
      <button
        type="button"
        onClick={onClearAll}
        disabled={drawingCount === 0 && activeTool === null}
        aria-label={`Remove all drawings (${drawingCount})`}
        title={`Remove All Drawings (${drawingCount}) · Click any drawing and press Delete to remove one`}
        className="relative w-9 h-9 rounded flex items-center justify-center text-slate-600 hover:bg-red-50 hover:text-red-600 dark:text-[#98a2b3] dark:hover:bg-red-500/15 dark:hover:text-[#ef5350] disabled:opacity-35 disabled:pointer-events-none transition-colors cursor-pointer"
      >
        <Trash2 className="w-[17px] h-[17px]" />
        {drawingCount > 0 && (
          <span
            data-testid="drawing-count"
            className="absolute right-0.5 bottom-0.5 text-[9px] font-mono font-semibold leading-none text-slate-500 dark:text-[#8b95a7]"
          >
            {drawingCount}
          </span>
        )}
      </button>
    </aside>
  );
}
