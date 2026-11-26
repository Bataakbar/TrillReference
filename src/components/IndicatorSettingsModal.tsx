import React, { useEffect, useState } from 'react';
import { Check, ChevronDown, Pin, RotateCcw, X } from 'lucide-react';
import {
  DEFAULT_TIMEFRAME_VISIBILITY,
  MA_TYPE_OPTIONS,
  PRICE_SOURCE_OPTIONS,
  TRADINGVIEW_COLOR_PALETTE,
  createDefaultEmaSmaSlots,
  createDefaultVolumeMaSlots,
  getCatalogEntry,
  getIndicatorDisplayTitle,
  hexWithOpacity,
  type EmaSmaSlot,
  type IndicatorInstance,
  type IndicatorPlotStyle,
  type LineDashPreset,
  type MovingAverageType,
  type PlotVisualType,
  type PriceSource,
  type TimeframeVisibility,
} from '../indicators/customIndicators';

interface IndicatorSettingsModalProps {
  indicator: IndicatorInstance | null;
  onLiveChange: (updated: IndicatorInstance) => void;
  onConfirm: (updated: IndicatorInstance) => void;
  onCancel: (original: IndicatorInstance) => void;
}

const LENGTH_PRESETS = [9, 20, 50, 100, 200];
const WIDTH_OPTIONS = [1, 1.5, 2, 3, 4];
const LINE_STYLE_OPTIONS: ReadonlyArray<{ value: LineDashPreset; label: string; dash?: string }> = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed', dash: '6 4' },
  { value: 'dotted', label: 'Dotted', dash: '2 3' },
];

const PLOT_TYPE_OPTIONS: ReadonlyArray<{ value: PlotVisualType; label: string }> = [
  { value: 'line', label: 'Line' },
  { value: 'smooth', label: 'Smooth' },
  { value: 'step', label: 'Step' },
  { value: 'circles', label: 'Circles' },
];

const VISIBILITY_ROWS: ReadonlyArray<{ key: keyof TimeframeVisibility; label: string; range: string }> = [
  { key: 'minutes', label: 'Minutes', range: '1m – 30m' },
  { key: 'hours', label: 'Hours', range: '1H – 4H' },
  { key: 'days', label: 'Days', range: '1D' },
  { key: 'weeks', label: 'Weeks', range: '1W' },
  { key: 'months', label: 'Months', range: '1M – 1Y' },
];

function PlotTypeIcon({ type, className = 'w-4 h-4' }: { type: PlotVisualType; className?: string }) {
  switch (type) {
    case 'smooth':
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M2.5 13 C 5.5 5, 8.5 5, 10 10 C 11.5 15, 14.5 15, 17.5 7" />
        </svg>
      );
    case 'step':
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M2.5 14 H 7 V 9 H 12.5 V 12 H 15.5 V 6 H 17.5" />
        </svg>
      );
    case 'circles':
      return (
        <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
          <circle cx="3.5" cy="13" r="1.5" />
          <circle cx="7.5" cy="8.5" r="1.5" />
          <circle cx="12" cy="11.5" r="1.5" />
          <circle cx="16.5" cy="6.5" r="1.5" />
        </svg>
      );
    case 'line':
    default:
      return (
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
          <path d="M2.5 13.5 L 7 7.5 L 12 12 L 17.5 6.5" />
        </svg>
      );
  }
}

function TradingViewCheckbox({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      className={`w-[18px] h-[18px] rounded-[4px] flex items-center justify-center border transition-colors shrink-0 cursor-pointer ${
        checked
          ? 'bg-slate-900 border-slate-900 text-white dark:bg-[#f0f3fa] dark:border-[#f0f3fa] dark:text-[#131722]'
          : 'bg-transparent border-slate-400 hover:border-slate-600 dark:border-[#5b6270] dark:hover:border-[#98a2b3]'
      }`}
    >
      {checked && <Check className="w-3 h-3 stroke-[3]" />}
    </button>
  );
}

export default function IndicatorSettingsModal({
  indicator,
  onLiveChange,
  onConfirm,
  onCancel,
}: IndicatorSettingsModalProps) {
  const [tab, setTab] = useState<'inputs' | 'style' | 'visibility'>('inputs');
  const [draft, setDraft] = useState<IndicatorInstance | null>(indicator);
  const [snapshot, setSnapshot] = useState<IndicatorInstance | null>(indicator);
  const [pinned, setPinned] = useState<boolean>(false);
  const [expandedSlotKey, setExpandedSlotKey] = useState<string | null>(null);
  const [plotMenuSlotKey, setPlotMenuSlotKey] = useState<string | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState<boolean>(false);

  useEffect(() => {
    if (indicator) {
      const cloned = structuredClone(indicator);
      if (cloned.kind === 'EMA_SMA' && (!cloned.slots || cloned.slots.length === 0)) {
        cloned.slots = createDefaultEmaSmaSlots();
      } else if (cloned.kind === 'VOL' && (!cloned.slots || cloned.slots.length === 0)) {
        cloned.slots = createDefaultVolumeMaSlots();
      }
      if (!cloned.visibility) {
        cloned.visibility = { ...DEFAULT_TIMEFRAME_VISIBILITY };
      }
      setDraft(cloned);
      setSnapshot(structuredClone(cloned));
      setTab('inputs');
      setExpandedSlotKey(null);
      setPlotMenuSlotKey(null);
      setConfirmResetOpen(false);
    } else {
      setDraft(null);
      setSnapshot(null);
      setExpandedSlotKey(null);
      setPlotMenuSlotKey(null);
      setConfirmResetOpen(false);
    }
    // Reset only when switching active edited indicator id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicator?.id]);

  useEffect(() => {
    if (!draft || !snapshot) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmResetOpen) {
          setConfirmResetOpen(false);
        } else {
          onCancel(snapshot);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [draft, snapshot, confirmResetOpen, onCancel]);

  if (!draft || !snapshot) return null;

  const catalog = getCatalogEntry(draft.kind);
  const isEmaSma = draft.kind === 'EMA_SMA';
  const isVol = draft.kind === 'VOL';
  const hasMultiSlots = isEmaSma || isVol;
  const isFlexMa = draft.kind === 'FLEX_MA';
  const visibility: TimeframeVisibility = draft.visibility ?? DEFAULT_TIMEFRAME_VISIBILITY;

  const getDefaultSlots = () =>
    isVol ? createDefaultVolumeMaSlots() : createDefaultEmaSmaSlots();

  const applyDraft = (next: IndicatorInstance) => {
    setDraft(next);
    onLiveChange(next);
  };

  const updateSlot = (slotKey: string, patch: Partial<EmaSmaSlot>) => {
    const currentSlots = draft.slots ?? getDefaultSlots();
    const nextSlots = currentSlots.map((slot) =>
      slot.key === slotKey ? { ...slot, ...patch } : slot
    );
    applyDraft({
      ...draft,
      slots: nextSlots,
      params: nextSlots.map((s) => s.length),
      plots: nextSlots.map((s) => ({
        key: s.key,
        label: s.label,
        color: s.color,
        lineWidth: s.lineWidth,
        lineStyle: s.lineStyle,
        smooth: s.plotType === 'smooth',
      })),
    });
  };

  const updateParam = (index: number, rawVal: number) => {
    const spec = catalog?.paramSpecs[index];
    const clamped = spec
      ? Math.min(spec.max, Math.max(spec.min, Number.isFinite(rawVal) ? rawVal : spec.min))
      : rawVal;
    const nextParams = [...draft.params];
    nextParams[index] = clamped;
    applyDraft({ ...draft, params: nextParams });
  };

  const updatePlot = (plotIdx: number, patch: Partial<IndicatorPlotStyle>) => {
    const nextPlots = draft.plots.map((p, idx) => (idx === plotIdx ? { ...p, ...patch } : p));
    applyDraft({ ...draft, plots: nextPlots });
  };

  const updateVisibility = (key: keyof TimeframeVisibility) => {
    const nextVis: TimeframeVisibility = {
      ...visibility,
      [key]: !visibility[key],
    };
    applyDraft({ ...draft, visibility: nextVis });
  };

  const handleResetDefaults = () => {
    if (hasMultiSlots) {
      const defaultSlots = getDefaultSlots();
      applyDraft({
        ...draft,
        ...(isEmaSma ? { source: 'close' } : {}),
        visibility: { ...DEFAULT_TIMEFRAME_VISIBILITY },
        slots: defaultSlots,
        params: defaultSlots.map((s) => s.length),
        plots: defaultSlots.map((s) => ({
          key: s.key,
          label: s.label,
          color: s.color,
          lineWidth: s.lineWidth,
          lineStyle: s.lineStyle,
          smooth: s.plotType === 'smooth',
        })),
      });
      setExpandedSlotKey(null);
      setPlotMenuSlotKey(null);
      return;
    }

    if (!catalog) return;
    const reset: IndicatorInstance = {
      ...draft,
      visibility: { ...DEFAULT_TIMEFRAME_VISIBILITY },
      ...(isFlexMa ? { maType: 'EMA' as MovingAverageType, source: 'close' as PriceSource, offset: 0 } : {}),
      params: [...catalog.defaultParams],
      plots: catalog.defaultPlots.map((p) => ({ ...p })),
    };
    applyDraft(reset);
  };

  const primaryPlot = draft.plots[0];
  const slots = draft.slots ?? getDefaultSlots();

  return (
    <div
      role="dialog"
      aria-modal={!pinned}
      aria-label={`Indicator settings: ${getIndicatorDisplayTitle(draft)}`}
      className={`fixed inset-0 flex items-center justify-center p-4 z-50 transition-colors ${
        pinned ? 'pointer-events-none bg-transparent' : 'bg-black/55'
      }`}
      onClick={() => {
        if (!pinned) onCancel(snapshot);
      }}
    >
      <div
        className="pointer-events-auto w-full max-w-[404px] rounded-xl bg-white dark:bg-[#17181c] border border-slate-200 dark:border-[#2c2f38] shadow-2xl overflow-hidden flex flex-col max-h-[86vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TradingView Header: Title + Pin + Close */}
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold tracking-tight text-slate-900 dark:text-[#f0f3fa]">
            {getIndicatorDisplayTitle(draft)}
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPinned((p) => !p)}
              aria-pressed={pinned}
              aria-label={pinned ? 'Unpin settings panel' : 'Pin settings panel to view chart live'}
              title={pinned ? 'Unpin panel' : 'Keep chart clear while editing'}
              className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                pinned
                  ? 'bg-[#2962ff]/15 text-[#2962ff] dark:bg-[#2962ff]/25 dark:text-[#5b9cf6]'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:text-[#8b95a7] dark:hover:bg-[#252832] dark:hover:text-white'
              }`}
            >
              <Pin className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onCancel(snapshot)}
              aria-label="Close indicator settings"
              className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:text-[#8b95a7] dark:hover:bg-[#252832] dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>

        {/* TradingView Tabs: Inputs | Style | Visibility */}
        <div
          role="tablist"
          aria-label="Indicator settings sections"
          className="px-5 border-b border-slate-200 dark:border-[#2c2f38] flex items-center gap-6"
        >
          {(
            [
              { id: 'inputs', label: 'Inputs' },
              { id: 'style', label: 'Style' },
              { id: 'visibility', label: 'Visibility' },
            ] as const
          ).map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
                  active
                    ? 'border-slate-900 text-slate-900 dark:border-[#f0f3fa] dark:text-[#f0f3fa] font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-[#98a2b3] dark:hover:text-white'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="px-5 py-4 overflow-y-auto thin-scrollbar flex-1">
          {/* ==============================================================
              TAB 1: INPUTS
             ============================================================== */}
          {tab === 'inputs' && (
            <div className="space-y-3">
              {hasMultiSlots ? (
                <>
                  {slots.map((slot) => (
                    <div
                      key={slot.key}
                      className="flex items-center justify-between gap-4"
                    >
                      <label
                        htmlFor={`emasmaslot-len-${slot.key}`}
                        className="text-[13px] text-slate-700 dark:text-[#d1d4dc] select-none"
                      >
                        {slot.label} Length
                      </label>
                      <input
                        id={`emasmaslot-len-${slot.key}`}
                        type="text"
                        inputMode="numeric"
                        value={String(slot.length)}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '');
                          const raw = digits ? Number.parseInt(digits, 10) : 0;
                          const nextLen = Math.max(0, Math.min(1000, raw));
                          updateSlot(slot.key, { length: nextLen });
                        }}
                        className="w-[108px] h-9 px-3 rounded-md bg-slate-50 dark:bg-[#131519] border border-slate-300 dark:border-[#363a45] text-[13px] font-mono text-slate-900 dark:text-[#f0f3fa] outline-none focus:border-[#2962ff] transition-colors"
                      />
                    </div>
                  ))}

                  {/* Price Source selector (for EMA/SMA only) */}
                  {isEmaSma && (
                    <div className="pt-3 mt-2 border-t border-slate-200 dark:border-[#2c2f38] flex items-center justify-between gap-4">
                      <label
                        htmlFor="emasmaslot-source"
                        className="text-[13px] text-slate-700 dark:text-[#d1d4dc]"
                      >
                        Source
                      </label>
                      <select
                        id="emasmaslot-source"
                        value={draft.source ?? 'close'}
                        onChange={(e) =>
                          applyDraft({ ...draft, source: e.target.value as PriceSource })
                        }
                        className="w-[172px] h-9 px-2.5 rounded-md bg-slate-50 dark:bg-[#131519] border border-slate-300 dark:border-[#363a45] text-xs text-slate-900 dark:text-[#f0f3fa] outline-none focus:border-[#2962ff]"
                      >
                        {PRICE_SOURCE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              ) : isFlexMa ? (
                <>
                  {/* Live Visual Line Preview Strip for single FLEX_MA */}
                  {primaryPlot && (
                    <div className="rounded-md bg-slate-100/90 dark:bg-[#0e1117] border border-slate-200 dark:border-[#262c3a] px-3 py-2.5 mb-3">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-[#8b95a7] mb-1.5">
                        <span>Line visualization preview</span>
                        <span className="font-mono text-slate-700 dark:text-[#cbd5e1]">
                          {getIndicatorDisplayTitle(draft)}
                        </span>
                      </div>
                      <svg viewBox="0 0 360 40" className="w-full h-10 overflow-visible" aria-hidden="true">
                        <line x1="0" y1="10" x2="360" y2="10" stroke="currentColor" className="text-slate-200 dark:text-[#1e2433]" strokeWidth="1" />
                        <line x1="0" y1="30" x2="360" y2="30" stroke="currentColor" className="text-slate-200 dark:text-[#1e2433]" strokeWidth="1" />
                        <path
                          d={
                            primaryPlot.smooth
                              ? 'M 6 28 C 70 26, 95 10, 155 16 C 215 22, 260 6, 354 12'
                              : 'M 6 28 L 65 23 L 120 11 L 185 19 L 245 8 L 300 15 L 354 10'
                          }
                          fill="none"
                          stroke={primaryPlot.color}
                          strokeWidth={primaryPlot.lineWidth}
                          strokeDasharray={
                            primaryPlot.lineStyle === 'dashed'
                              ? '7 4'
                              : primaryPlot.lineStyle === 'dotted'
                                ? '2 3.5'
                                : undefined
                          }
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="ind-ma-type" className="text-[13px] text-slate-700 dark:text-[#d1d4dc]">
                      MA Type
                    </label>
                    <select
                      id="ind-ma-type"
                      value={draft.maType ?? 'EMA'}
                      onChange={(e) =>
                        applyDraft({ ...draft, maType: e.target.value as MovingAverageType })
                      }
                      className="w-56 h-9 px-2.5 rounded-md bg-slate-50 dark:bg-[#131519] border border-slate-300 dark:border-[#363a45] text-xs text-slate-900 dark:text-[#f0f3fa] outline-none focus:border-[#2962ff]"
                    >
                      {MA_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor="ind-param-0" className="text-[13px] text-slate-700 dark:text-[#d1d4dc]">
                        Length
                      </label>
                      <input
                        id="ind-param-0"
                        type="text"
                        inputMode="numeric"
                        value={String(draft.params[0] ?? 20)}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '');
                          updateParam(0, digits ? Number.parseInt(digits, 10) : 1);
                        }}
                        className="w-28 h-9 px-3 rounded-md bg-slate-50 dark:bg-[#131519] border border-slate-300 dark:border-[#363a45] text-[13px] font-mono text-slate-900 dark:text-[#f0f3fa] outline-none focus:border-[#2962ff]"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      {LENGTH_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => updateParam(0, preset)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
                            draft.params[0] === preset
                              ? 'bg-[#2962ff] border-[#2962ff] text-white font-semibold'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-[#131519] dark:border-[#2c2f38] dark:text-[#98a2b3] dark:hover:text-white'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="ind-ma-source" className="text-[13px] text-slate-700 dark:text-[#d1d4dc]">
                      Source
                    </label>
                    <select
                      id="ind-ma-source"
                      value={draft.source ?? 'close'}
                      onChange={(e) =>
                        applyDraft({ ...draft, source: e.target.value as PriceSource })
                      }
                      className="w-56 h-9 px-2.5 rounded-md bg-slate-50 dark:bg-[#131519] border border-slate-300 dark:border-[#363a45] text-xs text-slate-900 dark:text-[#f0f3fa] outline-none focus:border-[#2962ff]"
                    >
                      {PRICE_SOURCE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="ind-ma-offset" className="text-[13px] text-slate-700 dark:text-[#d1d4dc]">
                      Offset (bars)
                    </label>
                    <input
                      id="ind-ma-offset"
                      type="text"
                      inputMode="numeric"
                      value={String(draft.offset ?? 0)}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const sanitized = e.target.value.replace(/(?!^-)\D/g, '');
                        const v = sanitized === '' || sanitized === '-' ? 0 : Number.parseInt(sanitized, 10);
                        const clamped = Math.max(-50, Math.min(50, Number.isFinite(v) ? v : 0));
                        applyDraft({ ...draft, offset: clamped });
                      }}
                      className="w-28 h-9 px-3 rounded-md bg-slate-50 dark:bg-[#131519] border border-slate-300 dark:border-[#363a45] text-[13px] font-mono text-slate-900 dark:text-[#f0f3fa] outline-none focus:border-[#2962ff]"
                    />
                  </div>
                </>
              ) : draft.kind === 'VWAP' ? (
                <div className="flex items-center justify-between gap-4">
                  <label htmlFor="ind-vwap-anchor" className="text-[13px] text-slate-700 dark:text-[#d1d4dc]">
                    Anchor Period
                  </label>
                  <select
                    id="ind-vwap-anchor"
                    value={draft.vwapAnchor ?? 'session'}
                    onChange={(e) =>
                      applyDraft({ ...draft, vwapAnchor: e.target.value as 'session' | 'week' })
                    }
                    className="w-48 h-9 px-2.5 rounded-md bg-slate-50 dark:bg-[#131519] border border-slate-300 dark:border-[#363a45] text-xs text-slate-900 dark:text-[#f0f3fa] outline-none focus:border-[#2962ff]"
                  >
                    <option value="session">Session (Daily)</option>
                    <option value="week">Week (Weekly)</option>
                  </select>
                </div>
              ) : (
                (catalog?.paramSpecs ?? []).map((spec, idx) => (
                  <div key={spec.label} className="flex items-center justify-between gap-4">
                    <label
                      htmlFor={`ind-param-${idx}`}
                      className="text-[13px] text-slate-700 dark:text-[#d1d4dc]"
                    >
                      {spec.label}
                    </label>
                    <input
                      id={`ind-param-${idx}`}
                      type="text"
                      inputMode={spec.step && spec.step < 1 ? 'decimal' : 'numeric'}
                      value={String(draft.params[idx] ?? catalog?.defaultParams[idx] ?? 14)}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const allowDecimal = Boolean(spec.step && spec.step < 1);
                        const sanitized = allowDecimal
                          ? e.target.value.replace(/[^0-9.]/g, '')
                          : e.target.value.replace(/\D/g, '');
                        const num = sanitized ? Number(sanitized) : spec.min;
                        updateParam(idx, num);
                      }}
                      className="w-28 h-9 px-3 rounded-md bg-slate-50 dark:bg-[#131519] border border-slate-300 dark:border-[#363a45] text-[13px] font-mono text-slate-900 dark:text-[#f0f3fa] outline-none focus:border-[#2962ff]"
                    />
                  </div>
                ))
              )}
            </div>
          )}

          {/* ==============================================================
              TAB 2: STYLE (Exact TradingView EMA/SMA multi-row layout)
             ============================================================== */}
          {tab === 'style' && (
            <div className="space-y-2.5">
              {hasMultiSlots ? (
                slots.map((slot) => {
                  const isColorOpen = expandedSlotKey === slot.key;
                  const isPlotOpen = plotMenuSlotKey === slot.key;
                  const effectiveColor = hexWithOpacity(slot.color, slot.opacity);
                  const dashAttr =
                    slot.lineStyle === 'dashed'
                      ? '5 3'
                      : slot.lineStyle === 'dotted'
                        ? '1.8 2.5'
                        : undefined;

                  return (
                    <div key={slot.key} className="space-y-2">
                      <div className="flex items-center gap-3">
                        {/* 1. Checkbox */}
                        <TradingViewCheckbox
                          checked={slot.enabled}
                          onChange={() => updateSlot(slot.key, { enabled: !slot.enabled })}
                          ariaLabel={`Toggle ${slot.label} visibility`}
                        />

                        {/* 2. Slot Label */}
                        <button
                          type="button"
                          onClick={() => updateSlot(slot.key, { enabled: !slot.enabled })}
                          className={`w-16 text-left text-[13px] transition-opacity cursor-pointer ${
                            slot.enabled
                              ? 'text-slate-900 dark:text-[#e6eaf2]'
                              : 'text-slate-400 dark:text-[#787b86]'
                          }`}
                        >
                          {slot.label}
                        </button>

                        {/* 3. TradingView Color + Line Preview Pill */}
                        <button
                          type="button"
                          onClick={() => {
                            setPlotMenuSlotKey(null);
                            setExpandedSlotKey(isColorOpen ? null : slot.key);
                          }}
                          aria-expanded={isColorOpen}
                          aria-label={`Style color and line for ${slot.label}`}
                          className={`h-9 px-2 rounded-md border flex items-center gap-2.5 transition-colors cursor-pointer ${
                            isColorOpen
                              ? 'border-[#2962ff] bg-[#2962ff]/5 dark:bg-[#2962ff]/12'
                              : 'border-slate-300 hover:border-slate-400 dark:border-[#363a45] dark:hover:border-[#505666] bg-transparent'
                          } ${slot.enabled ? 'opacity-100' : 'opacity-65'}`}
                        >
                          {/* Checkerboard-backed color square */}
                          <span
                            className="w-[22px] h-[22px] rounded-[4px] overflow-hidden relative shrink-0 border border-black/15 dark:border-white/10"
                            style={{
                              backgroundImage:
                                'linear-gradient(45deg, #4b5563 25%, transparent 25%), linear-gradient(-45deg, #4b5563 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #4b5563 75%), linear-gradient(-45deg, transparent 75%, #4b5563 75%)',
                              backgroundSize: '8px 8px',
                              backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0',
                            }}
                          >
                            <span
                              className="block w-full h-full"
                              style={{ backgroundColor: effectiveColor }}
                            />
                          </span>

                          {/* Line stroke preview */}
                          <svg viewBox="0 0 36 8" className="w-9 h-2" aria-hidden="true">
                            <line
                              x1="1"
                              y1="4"
                              x2="35"
                              y2="4"
                              stroke={effectiveColor}
                              strokeWidth={Math.min(3.5, slot.lineWidth)}
                              strokeDasharray={dashAttr}
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>

                        {/* 4. Plot Style Icon Button (~) */}
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedSlotKey(null);
                            setPlotMenuSlotKey(isPlotOpen ? null : slot.key);
                          }}
                          aria-expanded={isPlotOpen}
                          aria-label={`Plot type for ${slot.label}: ${slot.plotType}`}
                          title={`Plot style: ${slot.plotType}`}
                          className={`w-9 h-9 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                            isPlotOpen
                              ? 'border-[#2962ff] text-[#2962ff] bg-[#2962ff]/10 dark:text-[#5b9cf6]'
                              : 'border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-[#363a45] dark:text-[#b2b5be] dark:hover:border-[#505666] dark:hover:text-white'
                          } ${slot.enabled ? 'opacity-100' : 'opacity-65'}`}
                        >
                          <PlotTypeIcon type={slot.plotType} className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Inline Expanded TradingView Color + Thickness + Line Style Popover */}
                      {isColorOpen && (
                        <div className="ml-7 p-3 rounded-lg bg-slate-50 dark:bg-[#1e2027] border border-slate-200 dark:border-[#343844] space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-slate-500 dark:text-[#98a2b3]">
                              {slot.label} ({slot.maType} {slot.length})
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] text-slate-500 dark:text-[#8b95a7] uppercase">
                                {slot.color}
                              </span>
                              <label className="relative w-5 h-5 rounded border border-slate-300 dark:border-[#4b5162] overflow-hidden cursor-pointer">
                                <input
                                  type="color"
                                  aria-label={`${slot.label} custom color`}
                                  value={slot.color}
                                  onChange={(e) => updateSlot(slot.key, { color: e.target.value })}
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                />
                                <span
                                  className="block w-full h-full"
                                  style={{ backgroundColor: slot.color }}
                                />
                              </label>
                            </div>
                          </div>

                          {/* Color Swatches */}
                          <div className="grid grid-cols-12 gap-1">
                            {TRADINGVIEW_COLOR_PALETTE.map((hex) => {
                              const selected = slot.color.toLowerCase() === hex.toLowerCase();
                              return (
                                <button
                                  key={hex}
                                  type="button"
                                  title={hex}
                                  aria-label={`Set ${slot.label} color to ${hex}`}
                                  onClick={() => updateSlot(slot.key, { color: hex })}
                                  className={`w-5 h-5 rounded-[3px] border transition-transform cursor-pointer ${
                                    selected
                                      ? 'ring-2 ring-[#2962ff] ring-offset-1 ring-offset-white dark:ring-offset-[#1e2027] scale-110 border-white'
                                      : 'border-black/20 dark:border-white/15 hover:scale-110'
                                  }`}
                                  style={{ backgroundColor: hex }}
                                />
                              );
                            })}
                          </div>

                          {/* Opacity Slider */}
                          <div className="flex items-center gap-2.5">
                            <span className="text-[11px] text-slate-500 dark:text-[#98a2b3] w-14">
                              Opacity
                            </span>
                            <input
                              type="range"
                              min={15}
                              max={100}
                              step={5}
                              aria-label={`${slot.label} opacity`}
                              value={slot.opacity}
                              onChange={(e) =>
                                updateSlot(slot.key, { opacity: Number(e.target.value) })
                              }
                              className="flex-1 accent-[#2962ff] h-1.5 cursor-pointer"
                            />
                            <span className="font-mono text-[11px] text-slate-600 dark:text-[#cbd5e1] w-8 text-right">
                              {slot.opacity}%
                            </span>
                          </div>

                          {/* Thickness Picker */}
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-500 dark:text-[#98a2b3] w-14">
                              Thickness
                            </span>
                            <div className="grid grid-cols-5 gap-1 flex-1">
                              {WIDTH_OPTIONS.map((w) => {
                                const active = slot.lineWidth === w;
                                return (
                                  <button
                                    key={w}
                                    type="button"
                                    onClick={() => updateSlot(slot.key, { lineWidth: w })}
                                    aria-label={`${slot.label} thickness ${w}px`}
                                    aria-pressed={active}
                                    className={`h-7 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                                      active
                                        ? 'border-[#2962ff] bg-[#2962ff]/12 dark:bg-[#2962ff]/20'
                                        : 'border-slate-200 dark:border-[#343844] hover:border-slate-400'
                                    }`}
                                  >
                                    <span
                                      className="w-5 rounded-full"
                                      style={{ height: `${Math.max(1, w)}px`, backgroundColor: effectiveColor }}
                                    />
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Line Style Picker (Solid / Dashed / Dotted) */}
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-500 dark:text-[#98a2b3] w-14">
                              Style
                            </span>
                            <div className="grid grid-cols-3 gap-1 flex-1">
                              {LINE_STYLE_OPTIONS.map((opt) => {
                                const active = slot.lineStyle === opt.value;
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => updateSlot(slot.key, { lineStyle: opt.value })}
                                    aria-label={`${slot.label} line style ${opt.label}`}
                                    aria-pressed={active}
                                    className={`h-7 px-1.5 rounded border flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                                      active
                                        ? 'border-[#2962ff] bg-[#2962ff]/12 text-[#2962ff] dark:bg-[#2962ff]/20 dark:text-[#5b9cf6]'
                                        : 'border-slate-200 dark:border-[#343844] text-slate-600 dark:text-[#98a2b3]'
                                    }`}
                                  >
                                    <svg viewBox="0 0 28 6" className="w-7 h-1.5" aria-hidden="true">
                                      <line
                                        x1="1"
                                        y1="3"
                                        x2="27"
                                        y2="3"
                                        stroke={effectiveColor}
                                        strokeWidth="2"
                                        strokeDasharray={opt.dash}
                                        strokeLinecap="round"
                                      />
                                    </svg>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Flexible MA Type override per slot (EMA/SMA only; VOL uses Volume SMA) */}
                          {isEmaSma && (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-500 dark:text-[#98a2b3] w-14">
                                MA Type
                              </span>
                              <select
                                aria-label={`${slot.label} MA type`}
                                value={slot.maType}
                                onChange={(e) =>
                                  updateSlot(slot.key, {
                                    maType: e.target.value as MovingAverageType,
                                  })
                                }
                                className="flex-1 h-7 px-2 rounded bg-white dark:bg-[#131519] border border-slate-300 dark:border-[#363a45] text-[11px] text-slate-900 dark:text-[#f0f3fa] outline-none focus:border-[#2962ff]"
                              >
                                {MA_TYPE_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.value}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Inline Plot Type Picker (Line / Smooth / Step / Circles) */}
                      {isPlotOpen && (
                        <div className="ml-7 p-2 rounded-lg bg-slate-50 dark:bg-[#1e2027] border border-slate-200 dark:border-[#343844] grid grid-cols-4 gap-1.5">
                          {PLOT_TYPE_OPTIONS.map((pt) => {
                            const active = slot.plotType === pt.value;
                            return (
                              <button
                                key={pt.value}
                                type="button"
                                onClick={() => {
                                  updateSlot(slot.key, { plotType: pt.value });
                                  setPlotMenuSlotKey(null);
                                }}
                                aria-pressed={active}
                                className={`py-1.5 px-1 rounded border flex flex-col items-center gap-1 text-[10px] transition-colors cursor-pointer ${
                                  active
                                    ? 'border-[#2962ff] bg-[#2962ff]/12 text-[#2962ff] dark:bg-[#2962ff]/20 dark:text-[#5b9cf6] font-medium'
                                    : 'border-slate-200 dark:border-[#343844] text-slate-600 dark:text-[#98a2b3] hover:text-slate-900 dark:hover:text-white'
                                }`}
                              >
                                <PlotTypeIcon type={pt.value} className="w-4 h-4" />
                                <span>{pt.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                /* Standard Style Tab for FLEX_MA, BOLL, MACD, RSI, etc. */
                draft.plots.map((plot, idx) => (
                  <div
                    key={plot.key}
                    className={
                      idx > 0
                        ? 'pt-4 border-t border-slate-200 dark:border-[#2c2f38] space-y-3'
                        : 'space-y-3'
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800 dark:text-[#e6eaf2]">
                        {plot.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-slate-500 dark:text-[#8b95a7] uppercase">
                          {plot.color}
                        </span>
                        <label className="relative w-6 h-6 rounded border border-slate-300 dark:border-[#363e52] overflow-hidden cursor-pointer">
                          <input
                            type="color"
                            aria-label={`${plot.label} custom color`}
                            value={plot.color}
                            onChange={(e) => updatePlot(idx, { color: e.target.value })}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          />
                          <span
                            className="block w-full h-full"
                            style={{ backgroundColor: plot.color }}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-1.5">
                      {TRADINGVIEW_COLOR_PALETTE.map((hex) => {
                        const selected = plot.color.toLowerCase() === hex.toLowerCase();
                        return (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => updatePlot(idx, { color: hex })}
                            aria-label={`Set ${plot.label} color to ${hex}`}
                            title={hex}
                            className={`w-6 h-6 rounded border transition-transform cursor-pointer ${
                              selected
                                ? 'ring-2 ring-[#2962ff] ring-offset-1 ring-offset-white dark:ring-offset-[#17181c] scale-105 border-white'
                                : 'border-black/20 dark:border-white/15 hover:scale-105'
                            }`}
                            style={{ backgroundColor: hex }}
                          />
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-[88px_1fr] items-center gap-3">
                      <span className="text-xs text-slate-600 dark:text-[#98a2b3]">Thickness</span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[1, 2, 3, 4].map((w) => {
                          const active = Math.round(plot.lineWidth) === w;
                          return (
                            <button
                              key={w}
                              type="button"
                              onClick={() => updatePlot(idx, { lineWidth: w })}
                              aria-label={`${plot.label} thickness ${w}px`}
                              aria-pressed={active}
                              className={`h-8 rounded border flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
                                active
                                  ? 'bg-[#2962ff]/12 border-[#2962ff] text-[#2962ff] dark:bg-[#2962ff]/20 dark:text-[#5b9cf6]'
                                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-[#131519] dark:border-[#2c2f38] dark:text-[#98a2b3]'
                              }`}
                            >
                              <span
                                className="w-6 rounded-full"
                                style={{ height: `${w}px`, backgroundColor: plot.color }}
                              />
                              <span className="text-[10px] font-mono leading-none">{w}px</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-[88px_1fr] items-center gap-3">
                      <span className="text-xs text-slate-600 dark:text-[#98a2b3]">Line style</span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {LINE_STYLE_OPTIONS.map((opt) => {
                          const active = plot.lineStyle === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => updatePlot(idx, { lineStyle: opt.value })}
                              aria-pressed={active}
                              aria-label={`${plot.label} line style ${opt.label}`}
                              className={`h-8 px-2 rounded border flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                                active
                                  ? 'bg-[#2962ff]/12 border-[#2962ff] text-[#2962ff] dark:bg-[#2962ff]/20 dark:text-[#5b9cf6]'
                                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-[#131519] dark:border-[#2c2f38] dark:text-[#98a2b3]'
                              }`}
                            >
                              <svg viewBox="0 0 36 6" className="w-8 h-1.5" aria-hidden="true">
                                <line
                                  x1="1"
                                  y1="3"
                                  x2="35"
                                  y2="3"
                                  stroke={plot.color}
                                  strokeWidth="2"
                                  strokeDasharray={opt.dash}
                                  strokeLinecap="round"
                                />
                              </svg>
                              <span className="text-[10px] leading-none">{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      <label
                        htmlFor={`smooth-${plot.key}`}
                        className="text-xs text-slate-600 dark:text-[#98a2b3] cursor-pointer"
                      >
                        Smooth curve interpolation
                      </label>
                      <input
                        id={`smooth-${plot.key}`}
                        type="checkbox"
                        checked={plot.smooth}
                        onChange={(e) => updatePlot(idx, { smooth: e.target.checked })}
                        className="w-4 h-4 accent-[#2962ff] cursor-pointer"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ==============================================================
              TAB 3: VISIBILITY (TradingView Timeframe Visibility Rules)
             ============================================================== */}
          {tab === 'visibility' && (
            <div className="space-y-3.5">
              <p className="text-xs text-slate-500 dark:text-[#8b95a7]">
                Choose which chart timeframe groups display this indicator.
              </p>
              {VISIBILITY_ROWS.map((row) => (
                <div key={row.key} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <TradingViewCheckbox
                      checked={visibility[row.key]}
                      onChange={() => updateVisibility(row.key)}
                      ariaLabel={`Show on ${row.label} timeframes`}
                    />
                    <button
                      type="button"
                      onClick={() => updateVisibility(row.key)}
                      className="text-[13px] text-slate-800 dark:text-[#d1d4dc] cursor-pointer"
                    >
                      {row.label}
                    </button>
                  </div>
                  <span className="text-xs font-mono text-slate-500 dark:text-[#787b86]">
                    {row.range}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer: Defaults | Cancel Ok */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-[#2c2f38] flex items-center justify-between bg-slate-50/70 dark:bg-[#17181c]">
          <button
            type="button"
            onClick={() => setConfirmResetOpen(true)}
            className="h-9 px-3 rounded-md border border-slate-300 dark:border-[#363a45] flex items-center gap-1.5 text-[13px] text-slate-700 hover:bg-slate-100 dark:text-[#d1d4dc] dark:hover:bg-[#252832] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Defaults</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onCancel(snapshot)}
              className="h-9 px-4 rounded-md border border-slate-300 dark:border-[#434651] text-[13px] font-medium text-slate-700 hover:bg-slate-100 dark:text-[#f0f3fa] dark:hover:bg-[#252832] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(draft)}
              className="h-9 px-5 rounded-md text-[13px] font-semibold bg-slate-900 text-white hover:bg-slate-800 dark:bg-[#f0f3fa] dark:text-[#131722] dark:hover:bg-white transition-colors cursor-pointer"
            >
              Ok
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Popup Before Resetting to Defaults */}
      {confirmResetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Konfirmasi reset default"
          className="fixed inset-0 bg-black/60 flex items-center justify-center px-4 z-[70]"
          onClick={() => setConfirmResetOpen(false)}
        >
          <div
            className="pointer-events-auto w-full max-w-sm rounded-lg bg-white dark:bg-[#1e222d] border border-slate-200 dark:border-[#2a2e39] shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-[#f0f3fa]">
                Reset ke Pengaturan Default?
              </h3>
              <p className="text-xs text-slate-600 dark:text-[#b2b5be]">
                Apakah Anda yakin ingin mengembalikan pengaturan{' '}
                <span className="font-semibold text-slate-900 dark:text-[#f0f3fa]">
                  {getIndicatorDisplayTitle(draft)}
                </span>{' '}
                ke nilai default?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="h-8 px-3 rounded text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-[#d1d4dc] dark:hover:bg-[#2a2e39] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  handleResetDefaults();
                  setConfirmResetOpen(false);
                }}
                className="h-8 px-3.5 rounded text-xs font-semibold bg-[#f23645] hover:bg-[#d92b3a] text-white cursor-pointer"
              >
                Ya, Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
