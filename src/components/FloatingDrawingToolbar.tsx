import React, { useEffect, useRef, useState } from 'react';
import { GripVertical, Image as ImageIcon, LayoutGrid, Lock, Pencil, Trash2, Type, Unlock } from 'lucide-react';
import { TRADINGVIEW_COLOR_PALETTE } from '../indicators/indicatorModel';
import type { DrawingOverlayStyle } from '../types/chart';

interface FloatingDrawingToolbarProps {
  visible: boolean;
  toolLabel: string;
  style: DrawingOverlayStyle;
  locked: boolean;
  onChangeStyle: (patch: Partial<DrawingOverlayStyle>) => void;
  onToggleLock: () => void;
  onDelete: () => void;
  onEditText?: () => void;
  onEditImage?: () => void;
}

const THICKNESS_OPTIONS = [1, 2, 3, 4] as const;
const LINE_STYLE_OPTIONS: ReadonlyArray<{
  value: DrawingOverlayStyle['lineStyle'];
  label: string;
  dash?: string;
}> = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed', dash: '6 4' },
  { value: 'dotted', label: 'Dotted', dash: '2 3' },
];

const QUICK_PRESETS: ReadonlyArray<{ label: string; style: DrawingOverlayStyle }> = [
  { label: 'Default White (1.5px)', style: { color: '#FFFFFF', size: 1.5, lineStyle: 'solid' } },
  { label: 'Highlight Yellow (2px)', style: { color: '#FACC15', size: 2, lineStyle: 'solid' } },
  { label: 'Support Green (2px)', style: { color: '#26A69A', size: 2, lineStyle: 'solid' } },
  { label: 'Resistance Red (2px)', style: { color: '#EF5350', size: 2, lineStyle: 'solid' } },
  { label: 'Dashed Neutral (1px)', style: { color: '#94A3B8', size: 1, lineStyle: 'dashed' } },
];

/**
 * TradingView-style floating drawing toolbar that appears when a trendline or
 * any drawing overlay is selected, supporting drag repositioning, line color,
 * thickness (1px-4px), line style (solid/dashed/dotted), lock, and delete.
 */
export default function FloatingDrawingToolbar({
  visible,
  toolLabel,
  style,
  locked,
  onChangeStyle,
  onToggleLock,
  onDelete,
  onEditText,
  onEditImage,
}: FloatingDrawingToolbarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [openMenu, setOpenMenu] = useState<'presets' | 'color' | 'width' | 'dash' | null>(null);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStateRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  // Close sub-popovers when toolbar hides or outside click happens
  useEffect(() => {
    if (!visible) {
      setOpenMenu(null);
      return;
    }
    const onPointerDown = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [visible]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      setOffset({
        x: drag.origX + (e.clientX - drag.startX),
        y: drag.origY + (e.clientY - drag.startY),
      });
    };
    const onUp = () => {
      dragStateRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  if (!visible) return null;

  const activeDash =
    style.lineStyle === 'dashed'
      ? '5 3'
      : style.lineStyle === 'dotted'
        ? '1.8 2.4'
        : undefined;

  return (
    <div
      ref={barRef}
      role="toolbar"
      aria-label={`Drawing style toolbar for ${toolLabel}`}
      data-testid="floating-drawing-toolbar"
      style={{
        transform: `translate(calc(-50% + ${offset.x}px), ${offset.y}px)`,
      }}
      className="absolute top-3 left-1/2 z-30 flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-white/95 dark:bg-[#16181d]/95 border border-slate-200 dark:border-[#2e323d] shadow-2xl backdrop-blur-sm select-none"
    >
      {/* 6-dot Drag Handle (matching TradingView screenshot) */}
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          dragStateRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            origX: offset.x,
            origY: offset.y,
          };
        }}
        aria-label="Drag drawing toolbar"
        title={`Drag toolbar (${toolLabel})`}
        className="w-5 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:text-[#667085] dark:hover:text-[#cbd5e1] cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>

      {/* Quick Style Presets (Template Grid icon matching TradingView screenshot) */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenMenu(openMenu === 'presets' ? null : 'presets')}
          aria-expanded={openMenu === 'presets'}
          aria-label="Drawing style templates"
          title="Style presets"
          className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
            openMenu === 'presets'
              ? 'bg-slate-100 text-slate-900 dark:bg-[#262a34] dark:text-white'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#b2b5be] dark:hover:bg-[#232732] dark:hover:text-white'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
        </button>

        {openMenu === 'presets' && (
          <div className="absolute left-0 top-10 w-48 rounded-lg bg-white dark:bg-[#181a20] border border-slate-200 dark:border-[#2e323d] shadow-2xl p-1.5 z-40 space-y-0.5">
            {QUICK_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  onChangeStyle(preset.style);
                  setOpenMenu(null);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-slate-700 hover:bg-slate-100 dark:text-[#d1d4dc] dark:hover:bg-[#252935] cursor-pointer"
              >
                <span
                  className="w-3.5 h-3.5 rounded-[3px] shrink-0 border border-black/15 dark:border-white/15"
                  style={{ backgroundColor: preset.style.color }}
                />
                <span className="truncate">{preset.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pencil + Colored Bar Button (Exact TradingView Color Picker from screenshot) */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenMenu(openMenu === 'color' ? null : 'color')}
          aria-expanded={openMenu === 'color'}
          aria-label="Change line color"
          title="Line color"
          className={`w-9 h-8 rounded-md flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
            openMenu === 'color'
              ? 'bg-slate-100 text-slate-900 dark:bg-[#262a34] dark:text-white'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-[#d1d4dc] dark:hover:bg-[#232732] dark:hover:text-white'
          }`}
        >
          <Pencil className="w-3.5 h-3.5" />
          <span
            className="w-4 h-[3px] rounded-full"
            style={{ backgroundColor: style.color }}
          />
        </button>

        {openMenu === 'color' && (
          <div className="absolute left-0 top-10 w-56 rounded-lg bg-white dark:bg-[#181a20] border border-slate-200 dark:border-[#2e323d] shadow-2xl p-2.5 z-40 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-[#8b95a7]">
              <span>Line color</span>
              <span className="font-mono uppercase">{style.color}</span>
            </div>
            <div className="grid grid-cols-6 gap-1.5">
              {TRADINGVIEW_COLOR_PALETTE.map((hex) => {
                const selected = style.color.toLowerCase() === hex.toLowerCase();
                return (
                  <button
                    key={hex}
                    type="button"
                    title={hex}
                    aria-label={`Set drawing color ${hex}`}
                    onClick={() => {
                      onChangeStyle({ color: hex });
                      setOpenMenu(null);
                    }}
                    className={`w-7 h-7 rounded border transition-transform cursor-pointer ${
                      selected
                        ? 'ring-2 ring-[#2962ff] ring-offset-1 ring-offset-white dark:ring-offset-[#181a20] scale-105 border-white'
                        : 'border-black/20 dark:border-white/15 hover:scale-105'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                );
              })}
            </div>
            <label className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200 dark:border-[#2c2f38] text-xs text-slate-600 dark:text-[#cbd5e1] cursor-pointer">
              <span>Custom color</span>
              <input
                type="color"
                aria-label="Custom drawing color"
                value={style.color}
                onChange={(e) => onChangeStyle({ color: e.target.value })}
                className="w-7 h-6 rounded border-0 bg-transparent cursor-pointer"
              />
            </label>
          </div>
        )}
      </div>

      {/* Line Thickness Picker (1px / 2px / 3px / 4px) */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenMenu(openMenu === 'width' ? null : 'width')}
          aria-expanded={openMenu === 'width'}
          aria-label={`Change line thickness (${style.size}px)`}
          title={`Line width (${style.size}px)`}
          className={`h-8 px-2 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
            openMenu === 'width'
              ? 'bg-slate-100 text-slate-900 dark:bg-[#262a34] dark:text-white'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-[#d1d4dc] dark:hover:bg-[#232732] dark:hover:text-white'
          }`}
        >
          <span
            className="w-4 rounded-full bg-current"
            style={{ height: `${Math.max(1, Math.min(4, Math.round(style.size)))}px` }}
          />
          <span className="font-mono text-[11px] leading-none">{style.size}px</span>
        </button>

        {openMenu === 'width' && (
          <div className="absolute left-0 top-10 w-32 rounded-lg bg-white dark:bg-[#181a20] border border-slate-200 dark:border-[#2e323d] shadow-2xl p-1.5 z-40 space-y-1">
            {THICKNESS_OPTIONS.map((w) => {
              const active = Math.round(style.size) === w;
              return (
                <button
                  key={w}
                  type="button"
                  aria-label={`Set drawing width ${w}px`}
                  aria-pressed={active}
                  onClick={() => {
                    onChangeStyle({ size: w });
                    setOpenMenu(null);
                  }}
                  className={`w-full h-8 px-2.5 rounded flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#2962ff]/12 text-[#2962ff] dark:bg-[#2962ff]/20 dark:text-[#5b9cf6]'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-[#d1d4dc] dark:hover:bg-[#252935]'
                  }`}
                >
                  <span
                    className="flex-1 rounded-full"
                    style={{ height: `${w}px`, backgroundColor: style.color }}
                  />
                  <span className="font-mono text-[11px]">{w}px</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Line Style Picker (Solid / Dashed / Dotted) */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenMenu(openMenu === 'dash' ? null : 'dash')}
          aria-expanded={openMenu === 'dash'}
          aria-label={`Change line style (${style.lineStyle})`}
          title={`Line style (${style.lineStyle})`}
          className={`w-9 h-8 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
            openMenu === 'dash'
              ? 'bg-slate-100 text-slate-900 dark:bg-[#262a34] dark:text-white'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-[#d1d4dc] dark:hover:bg-[#232732] dark:hover:text-white'
          }`}
        >
          <svg viewBox="0 0 24 6" className="w-5 h-2" aria-hidden="true">
            <line
              x1="1"
              y1="3"
              x2="23"
              y2="3"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={activeDash}
              strokeLinecap="round"
            />
          </svg>
        </button>

        {openMenu === 'dash' && (
          <div className="absolute left-0 top-10 w-36 rounded-lg bg-white dark:bg-[#181a20] border border-slate-200 dark:border-[#2e323d] shadow-2xl p-1.5 z-40 space-y-1">
            {LINE_STYLE_OPTIONS.map((opt) => {
              const active = style.lineStyle === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-label={`Set drawing line style ${opt.label}`}
                  aria-pressed={active}
                  onClick={() => {
                    onChangeStyle({ lineStyle: opt.value });
                    setOpenMenu(null);
                  }}
                  className={`w-full h-8 px-2.5 rounded flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#2962ff]/12 text-[#2962ff] dark:bg-[#2962ff]/20 dark:text-[#5b9cf6]'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-[#d1d4dc] dark:hover:bg-[#252935]'
                  }`}
                >
                  <svg viewBox="0 0 32 6" className="w-8 h-1.5" aria-hidden="true">
                    <line
                      x1="1"
                      y1="3"
                      x2="31"
                      y2="3"
                      stroke={style.color}
                      strokeWidth="2"
                      strokeDasharray={opt.dash}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="text-[11px]">{opt.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {onEditText && (
        <>
          <div className="w-px h-5 bg-slate-200 dark:bg-[#2c2f38] mx-0.5" />
          <button
            type="button"
            onClick={onEditText}
            aria-label="Edit callout text"
            title="Edit text"
            className="h-8 px-2 rounded-md flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-[#d1d4dc] dark:hover:bg-[#232732] dark:hover:text-white transition-colors cursor-pointer"
          >
            <Type className="w-3.5 h-3.5" />
            <span>Text</span>
          </button>
        </>
      )}

      {onEditImage && (
        <>
          <div className="w-px h-5 bg-slate-200 dark:bg-[#2c2f38] mx-0.5" />
          <button
            type="button"
            onClick={onEditImage}
            aria-label="Edit chart image"
            title="Change image"
            className="h-8 px-2 rounded-md flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-[#d1d4dc] dark:hover:bg-[#232732] dark:hover:text-white transition-colors cursor-pointer"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Image</span>
          </button>
        </>
      )}

      <div className="w-px h-5 bg-slate-200 dark:bg-[#2c2f38] mx-0.5" />

      {/* Lock Selected Drawing */}
      <button
        type="button"
        onClick={onToggleLock}
        aria-pressed={locked}
        aria-label={locked ? 'Unlock selected drawing' : 'Lock selected drawing'}
        title={locked ? 'Unlock drawing' : 'Lock drawing'}
        className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
          locked
            ? 'bg-amber-500/15 text-amber-500'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-[#b2b5be] dark:hover:bg-[#232732] dark:hover:text-white'
        }`}
      >
        {locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
      </button>

      {/* Delete Selected Drawing */}
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete selected drawing"
        title="Delete selected drawing (Del)"
        className="w-8 h-8 rounded-md flex items-center justify-center text-slate-600 hover:bg-red-50 hover:text-red-600 dark:text-[#b2b5be] dark:hover:bg-red-500/15 dark:hover:text-[#ef5350] transition-colors cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
