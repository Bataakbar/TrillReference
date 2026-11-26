import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff, Plus, Settings, Trash2 } from 'lucide-react';
import {
  getActiveEmaSmaSlots,
  getActiveVolumeSlots,
  getIndicatorDisplayTitle,
  hexWithOpacity,
  type IndicatorInstance,
} from '../indicators/customIndicators';
import { LineStyleSwatch } from './DrawingToolIcon';

interface ChartIndicatorLegendProps {
  indicators: IndicatorInstance[];
  onToggleVisible: (id: string) => void;
  onEdit: (indicator: IndicatorInstance) => void;
  onRemove: (id: string) => void;
  onQuickAddMA: () => void;
}

const LEGEND_COLLAPSED_KEY = 'meridian_indicator_legend_collapsed_v1';

function loadInitialCollapsed(): boolean {
  try {
    return window.localStorage.getItem(LEGEND_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * TradingView-style floating on-chart active indicator legend.
 * Includes a compact TradingView chevron toggle (^ / v) to collapse/expand the
 * indicator list so it never obstructs the price candles.
 */
export default function ChartIndicatorLegend({
  indicators,
  onToggleVisible,
  onEdit,
  onRemove,
  onQuickAddMA,
}: ChartIndicatorLegendProps) {
  const [collapsed, setCollapsed] = useState<boolean>(loadInitialCollapsed);
  const mainIndicators = indicators.filter((ind) => ind.pane === 'main');
  const subIndicators = indicators.filter((ind) => ind.pane === 'sub');
  const totalCount = indicators.length;

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(LEGEND_COLLAPSED_KEY, String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  return (
    <div
      aria-label="Active chart indicators"
      className="hidden sm:flex flex-col items-start gap-1 absolute top-[44px] left-2.5 z-15 pointer-events-none select-none max-w-[calc(100%-96px)]"
    >
      {!collapsed && (
        <>
          {mainIndicators.map((ind) => {
            const title = getIndicatorDisplayTitle(ind);
            const isEmaSma = ind.kind === 'EMA_SMA';
            const activeSlots = isEmaSma ? getActiveEmaSmaSlots(ind) : [];
            const primaryPlot = ind.plots[0];

            return (
              <div
                key={ind.id}
                data-testid={`indicator-legend-${ind.id}`}
                className="pointer-events-auto group flex items-center flex-wrap gap-1.5 px-2 py-0.5 rounded bg-white/85 dark:bg-[#0e1117]/80 hover:bg-white dark:hover:bg-[#1a1f2c] border border-transparent hover:border-slate-200 dark:hover:border-[#2d3446] transition-colors text-[11px]"
              >
                {isEmaSma ? (
                  <button
                    type="button"
                    onClick={() => onEdit(ind)}
                    className="flex items-center gap-1.5 cursor-pointer"
                    title="Configure EMA/SMA lengths, colors & visibility"
                  >
                    <span
                      className={`font-semibold tracking-tight ${
                        ind.visible
                          ? 'text-slate-900 dark:text-[#e6eaf2]'
                          : 'text-slate-400 dark:text-[#667085] line-through'
                      }`}
                    >
                      EMA/SMA
                    </span>
                    {ind.visible && activeSlots.length > 0 && (
                      <span className="flex items-center gap-1.5 font-mono text-[11px]">
                        {activeSlots.map((slot) => (
                          <span
                            key={slot.key}
                            className="inline-flex items-center gap-1"
                            style={{ color: hexWithOpacity(slot.color, slot.opacity) }}
                          >
                            <LineStyleSwatch
                              color={hexWithOpacity(slot.color, slot.opacity)}
                              lineWidth={Math.min(2.5, slot.lineWidth)}
                              lineStyle={slot.lineStyle}
                              className="w-3 h-2"
                            />
                            <span>{slot.length}</span>
                          </span>
                        ))}
                      </span>
                    )}
                  </button>
                ) : (
                  <>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {ind.plots.slice(0, 3).map((plot) => (
                        <LineStyleSwatch
                          key={plot.key}
                          color={ind.visible ? plot.color : '#64748b'}
                          lineWidth={plot.lineWidth}
                          lineStyle={plot.lineStyle}
                          className="w-5 h-2.5"
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => onEdit(ind)}
                      className={`font-mono font-medium cursor-pointer transition-opacity ${
                        ind.visible
                          ? 'text-slate-800 dark:text-[#e6eaf2]'
                          : 'text-slate-400 dark:text-[#667085] line-through'
                      }`}
                      style={ind.visible && primaryPlot ? { color: primaryPlot.color } : undefined}
                      title={`Configure ${title}`}
                    >
                      {title}
                    </button>
                  </>
                )}

                {/* TradingView Inline Controls: Hide/Show, Settings Gear, Delete */}
                <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity ml-0.5">
                  <button
                    type="button"
                    onClick={() => onToggleVisible(ind.id)}
                    aria-label={ind.visible ? `Hide ${title}` : `Show ${title}`}
                    title={ind.visible ? 'Hide' : 'Show'}
                    className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 dark:text-[#8b95a7] dark:hover:bg-[#252c3d] dark:hover:text-white cursor-pointer"
                  >
                    {ind.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(ind)}
                    aria-label={`Settings for ${title}`}
                    title="Settings (Inputs, Style & Visibility)"
                    className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 dark:text-[#8b95a7] dark:hover:bg-[#252c3d] dark:hover:text-white cursor-pointer"
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(ind.id)}
                    aria-label={`Remove ${title}`}
                    title="Remove"
                    className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:bg-red-100 hover:text-red-600 dark:text-[#8b95a7] dark:hover:bg-red-500/20 dark:hover:text-[#ef5350] cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
          {subIndicators.map((ind) => {
            const title = getIndicatorDisplayTitle(ind);
            const isVol = ind.kind === 'VOL';
            const volSlots = isVol ? getActiveVolumeSlots(ind) : [];
            const primaryPlot = ind.plots[0];
            return (
              <div
                key={ind.id}
                data-testid={`indicator-legend-${ind.id}`}
                className="pointer-events-auto group flex items-center flex-wrap gap-1.5 px-2 py-0.5 rounded bg-white/85 dark:bg-[#0e1117]/80 hover:bg-white dark:hover:bg-[#1a1f2c] border border-transparent hover:border-slate-200 dark:hover:border-[#2d3446] transition-colors text-[11px]"
              >
                {isVol ? (
                  <button
                    type="button"
                    onClick={() => onEdit(ind)}
                    className="flex items-center gap-1.5 cursor-pointer"
                    title="Configure Volume MA lines, colors & styles"
                  >
                    <span
                      className={`font-semibold tracking-tight ${
                        ind.visible
                          ? 'text-slate-900 dark:text-[#e6eaf2]'
                          : 'text-slate-400 dark:text-[#667085] line-through'
                      }`}
                    >
                      VOL
                    </span>
                    {ind.visible && volSlots.length > 0 && (
                      <span className="flex items-center gap-1.5 font-mono text-[11px]">
                        {volSlots.map((slot) => (
                          <span
                            key={slot.key}
                            className="inline-flex items-center gap-1"
                            style={{ color: hexWithOpacity(slot.color, slot.opacity) }}
                          >
                            <LineStyleSwatch
                              color={hexWithOpacity(slot.color, slot.opacity)}
                              lineWidth={Math.min(2.5, slot.lineWidth)}
                              lineStyle={slot.lineStyle}
                              className="w-3 h-2"
                            />
                            <span>MA{slot.length}</span>
                          </span>
                        ))}
                      </span>
                    )}
                  </button>
                ) : (
                  <>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <LineStyleSwatch
                        color={ind.visible ? (primaryPlot?.color ?? '#FF9800') : '#64748b'}
                        lineWidth={primaryPlot?.lineWidth ?? 1.5}
                        lineStyle={primaryPlot?.lineStyle ?? 'solid'}
                        className="w-5 h-2.5"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => onEdit(ind)}
                      className={`font-mono font-medium cursor-pointer transition-opacity ${
                        ind.visible
                          ? 'text-slate-800 dark:text-[#e6eaf2]'
                          : 'text-slate-400 dark:text-[#667085] line-through'
                      }`}
                      style={ind.visible && primaryPlot ? { color: primaryPlot.color } : undefined}
                      title={`Configure ${title}`}
                    >
                      {title}
                    </button>
                  </>
                )}
                <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity ml-0.5">
                  <button
                    type="button"
                    onClick={() => onToggleVisible(ind.id)}
                    aria-label={ind.visible ? `Hide ${title}` : `Show ${title}`}
                    title={ind.visible ? 'Hide' : 'Show'}
                    className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 dark:text-[#8b95a7] dark:hover:bg-[#252c3d] dark:hover:text-white cursor-pointer"
                  >
                    {ind.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(ind)}
                    aria-label={`Settings for ${title}`}
                    title="Settings (MA Length, Color & Line)"
                    className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 dark:text-[#8b95a7] dark:hover:bg-[#252c3d] dark:hover:text-white cursor-pointer"
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(ind.id)}
                    aria-label={`Remove ${title}`}
                    title="Remove"
                    className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:bg-red-100 hover:text-red-600 dark:text-[#8b95a7] dark:hover:bg-red-500/20 dark:hover:text-[#ef5350] cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* TradingView Collapse/Expand Indicator Legend Chevron + Compact Add MA */}
      <div className="pointer-events-auto flex items-center gap-1.5 mt-0.5">
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={
            collapsed
              ? `Expand indicator legend (${totalCount})`
              : 'Collapse indicator legend'
          }
          title={
            collapsed
              ? `Show indicator legend (${totalCount})`
              : 'Hide indicator legend'
          }
          data-testid="indicator-legend-collapse-toggle"
          className="h-[22px] min-w-[28px] px-1.5 rounded-[4px] flex items-center justify-center gap-1 bg-white/85 dark:bg-[#141720]/85 hover:bg-white dark:hover:bg-[#1e2433] border border-slate-300/90 dark:border-[#2f3545] text-slate-600 hover:text-slate-900 dark:text-[#98a2b3] dark:hover:text-white shadow-xs transition-colors cursor-pointer"
        >
          {collapsed ? (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              {totalCount > 0 && (
                <span className="font-mono text-[10px] leading-none font-medium">
                  {totalCount}
                </span>
              )}
            </>
          ) : (
            <ChevronUp className="w-3.5 h-3.5" />
          )}
        </button>

        {!collapsed && (
          <button
            type="button"
            onClick={onQuickAddMA}
            aria-label="Add another Moving Average line"
            title="Add standalone MA / EMA line"
            className="h-[22px] flex items-center gap-1 px-1.5 rounded-[4px] text-[11px] text-slate-500 hover:text-[#2962ff] hover:bg-white/90 dark:text-[#788296] dark:hover:text-[#5b9cf6] dark:hover:bg-[#1a1f2c]/90 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Add MA</span>
          </button>
        )}
      </div>
    </div>
  );
}
