import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  Equal,
  TrendingUp,
} from 'lucide-react';
import {
  CANDLE_PATTERN_META,
  layoutTreemapRects,
  resolveRowEma,
  type CandlePatternId,
  type HeatmapColorMetric,
  type ScreenerRow,
  type TechRatingLabel,
} from '../../shared/screenerModel';
import { getPricePrecision } from '../../shared/timeframes';
import { getTickerAvatar, type WatchlistFlagMap } from '../utils/watchlistModel';
import { FlagRibbonIcon } from './FlagRibbon';

export function TechRatingBadge({
  rating,
  compact = false,
}: {
  rating: TechRatingLabel;
  compact?: boolean;
}) {
  const isStrongBuy = rating === 'Strong Buy';
  const isBuy = rating === 'Buy';
  const isStrongSell = rating === 'Strong Sell';
  const isSell = rating === 'Sell';

  const colorCls = isStrongBuy
    ? 'text-[#089981] dark:text-[#2dd4bf] bg-[#089981]/15 border-[#089981]/35 font-semibold'
    : isBuy
      ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25 font-medium'
      : isStrongSell
        ? 'text-[#dc2626] dark:text-[#f87171] bg-[#f23645]/15 border-[#f23645]/35 font-semibold'
        : isSell
          ? 'text-orange-700 dark:text-orange-400 bg-orange-500/10 border-orange-500/25 font-medium'
          : 'text-slate-600 dark:text-[#98a2b3] bg-slate-100 dark:bg-[#1e2433] border-slate-200 dark:border-[#2c3345]';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border text-[10px] leading-tight whitespace-nowrap ${
        compact ? 'px-1.5 py-0.5' : 'px-2 py-0.5'
      } ${colorCls}`}
    >
      {isStrongBuy && <ChevronsUp className="w-3 h-3 shrink-0" />}
      {isBuy && <ChevronUp className="w-3 h-3 shrink-0" />}
      {isStrongSell && <ChevronsDown className="w-3 h-3 shrink-0" />}
      {isSell && <ChevronDown className="w-3 h-3 shrink-0" />}
      {!isStrongBuy && !isBuy && !isStrongSell && !isSell && (
        <Equal className="w-2.5 h-2.5 shrink-0 opacity-75" />
      )}
      <span>{rating}</span>
    </span>
  );
}

export function CandlePatternGlyph({ pattern }: { pattern: CandlePatternId | null }) {
  if (!pattern) {
    return <span className="text-slate-400 dark:text-[#5b6374]">—</span>;
  }
  const meta = CANDLE_PATTERN_META[pattern];
  const strokeColor =
    meta.sentiment === 'bullish'
      ? '#089981'
      : meta.sentiment === 'bearish'
        ? '#f23645'
        : '#f59e0b';

  const isDoji = pattern.includes('doji');
  const isHammer = pattern === 'hammer';
  const isShootingStar = pattern === 'shooting_star';

  return (
    <span
      title={meta.label}
      className="inline-flex items-center gap-1.5 text-[11px] font-medium whitespace-nowrap text-slate-700 dark:text-[#cbd5e1]"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        aria-hidden="true"
        className="shrink-0"
      >
        {isDoji ? (
          <>
            <line
              x1="7"
              y1={pattern === 'dragonfly_doji' ? 3 : 1}
              x2="7"
              y2={pattern === 'gravestone_doji' ? 11 : 13}
              stroke={strokeColor}
              strokeWidth="1.4"
            />
            <line
              x1="3"
              y1={pattern === 'dragonfly_doji' ? 4 : pattern === 'gravestone_doji' ? 10 : 7}
              x2="11"
              y2={pattern === 'dragonfly_doji' ? 4 : pattern === 'gravestone_doji' ? 10 : 7}
              stroke={strokeColor}
              strokeWidth="1.8"
            />
          </>
        ) : isHammer ? (
          <>
            <line x1="7" y1="2" x2="7" y2="13" stroke={strokeColor} strokeWidth="1.3" />
            <rect x="4" y="2.5" width="6" height="4" rx="0.6" fill={strokeColor} />
          </>
        ) : isShootingStar ? (
          <>
            <line x1="7" y1="1" x2="7" y2="12" stroke={strokeColor} strokeWidth="1.3" />
            <rect x="4" y="7.5" width="6" height="4" rx="0.6" fill={strokeColor} />
          </>
        ) : (
          <>
            <line x1="7" y1="1" x2="7" y2="13" stroke={strokeColor} strokeWidth="1.3" />
            <rect x="4" y="3" width="6" height="8" rx="0.6" fill={strokeColor} />
          </>
        )}
      </svg>
      <span>{meta.shortLabel}</span>
    </span>
  );
}

function formatMiniPrice(price: number, symbol: string): string {
  const prec = getPricePrecision(symbol, price);
  return price.toLocaleString(undefined, {
    minimumFractionDigits: prec,
    maximumFractionDigits: prec,
  });
}

export function MiniChartGridView({
  rows,
  activeSymbol,
  flagMap,
  showEma9Overlay,
  emaPeriod = 9,
  chartStyle,
  onSelectSymbol,
  onToggleFlag,
}: {
  rows: ScreenerRow[];
  activeSymbol: string;
  flagMap: WatchlistFlagMap;
  showEma9Overlay: boolean;
  emaPeriod?: number;
  chartStyle: 'area' | 'line';
  onSelectSymbol: (symbol: string) => void;
  onToggleFlag: (symbol: string) => void;
}) {
  const [visibleLimit, setVisibleLimit] = useState(48);
  const shownRows = rows.slice(0, visibleLimit);

  return (
    <div className="p-3 space-y-3" data-testid="screener-charts-view">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {shownRows.map((row) => {
          const isSelected = row.symbol.toUpperCase() === activeSymbol.toUpperCase();
          const flagColor = flagMap[row.symbol.toUpperCase()];
          const avatar = getTickerAvatar(row.symbol);
          const isUp = row.changePercent >= 0;
          const stroke = isUp ? '#089981' : '#f23645';
          const emaSnap = resolveRowEma(row, emaPeriod);

          const series =
            row.sparkline && row.sparkline.length >= 2
              ? row.sparkline
              : [row.price, row.price];
          const domainValues =
            showEma9Overlay && emaSnap.value !== null ? [...series, emaSnap.value] : series;
          const minV = Math.min(...domainValues);
          const maxV = Math.max(...domainValues);
          const span = maxV - minV || Math.max(1, maxV * 0.02);
          const pad = span * 0.1;
          const lo = minV - pad;
          const hi = maxV + pad;
          const range = hi - lo || 1;

          const width = 280;
          const height = 84;
          const pts = series.map((val, idx) => {
            const x = series.length === 1 ? width : (idx / (series.length - 1)) * width;
            const y = height - ((val - lo) / range) * height;
            return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
          });
          const linePath = pts
            .map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p.x},${p.y}`)
            .join(' ');
          const areaPath = `${linePath} L${width},${height} L0,${height} Z`;
          const ema9Y =
            showEma9Overlay && emaSnap.value !== null
              ? Number((height - ((emaSnap.value - lo) / range) * height).toFixed(1))
              : null;
          const gradId = `tvChartGrad-${row.symbol.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

          return (
            <div
              key={row.symbol}
              role="button"
              tabIndex={0}
              data-testid={`screener-card-${row.symbol}`}
              onClick={() => onSelectSymbol(row.symbol)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectSymbol(row.symbol);
                }
              }}
              className={`group rounded-lg border p-2.5 flex flex-col gap-2 cursor-pointer transition-colors ${
                isSelected
                  ? 'border-[#2962ff] bg-[#2962ff]/8 dark:bg-[#2962ff]/12'
                  : 'border-slate-200 dark:border-[#222836] bg-white dark:bg-[#121620] hover:border-slate-300 dark:hover:border-[#343d52]'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFlag(row.symbol);
                    }}
                    aria-label={`Flag ${row.symbol}`}
                    className="p-0.5 rounded hover:bg-slate-200/70 dark:hover:bg-[#242b3b] cursor-pointer shrink-0"
                  >
                    <FlagRibbonIcon color={flagColor ?? null} />
                  </button>
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                    style={{ backgroundColor: avatar.color }}
                  >
                    {avatar.letter}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-xs text-slate-900 dark:text-[#f0f3fa] truncate">
                        {row.symbol}
                      </span>
                      <span className="text-[10px] px-1 rounded bg-slate-100 dark:bg-[#1d2332] text-slate-500 dark:text-[#8b95a7]">
                        {row.exchange}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-[#787b86] truncate">
                      {row.shortName}
                    </div>
                  </div>
                </div>

                <div className="text-right font-mono shrink-0">
                  <div className="text-xs font-semibold text-slate-900 dark:text-[#f0f3fa]">
                    {formatMiniPrice(row.price, row.symbol)}
                  </div>
                  <div
                    className={`text-[11px] font-semibold ${
                      isUp ? 'text-[#089981]' : 'text-[#f23645]'
                    }`}
                  >
                    {row.changePercent > 0 ? '+' : ''}
                    {row.changePercent.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Sparkline SVG */}
              <div className="relative h-[86px] w-full rounded bg-slate-50/80 dark:bg-[#0d1017] border border-slate-100 dark:border-[#1c212e] overflow-hidden">
                <svg
                  viewBox={`0 0 ${width} ${height}`}
                  preserveAspectRatio="none"
                  className="w-full h-full block"
                >
                  <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
                      <stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  {ema9Y !== null && (
                    <line
                      x1="0"
                      y1={ema9Y}
                      x2={width}
                      y2={ema9Y}
                      stroke="#2962ff"
                      strokeWidth="1.2"
                      strokeDasharray="4 3"
                      opacity="0.8"
                    />
                  )}
                  {chartStyle === 'area' && <path d={areaPath} fill={`url(#${gradId})`} />}
                  <path
                    d={linePath}
                    fill="none"
                    stroke={stroke}
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </svg>
                {showEma9Overlay && emaSnap.diffPct !== null && (
                  <span
                    className={`absolute right-1.5 top-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold backdrop-blur-xs ${
                      emaSnap.diffPct >= 0
                        ? 'bg-[#089981]/15 text-[#089981] dark:text-[#2dd4bf]'
                        : 'bg-[#f23645]/15 text-[#f23645] dark:text-[#fca5a5]'
                    }`}
                  >
                    EMA{emaSnap.period} {emaSnap.diffPct > 0 ? '+' : ''}
                    {emaSnap.diffPct.toFixed(1)}%
                  </span>
                )}
              </div>

              {/* Footer Metrics */}
              <div className="flex items-center justify-between gap-2 text-[10px] pt-0.5">
                <TechRatingBadge rating={row.techRating} compact />
                <div className="flex items-center gap-2 font-mono text-slate-500 dark:text-[#8b95a7]">
                  <span>RSI {row.rsi14 !== null ? row.rsi14.toFixed(0) : '—'}</span>
                  <span>
                    RVOL {row.relVolume !== null ? `${row.relVolume.toFixed(1)}x` : '—'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {rows.length > visibleLimit && (
        <div className="flex justify-center pt-1 pb-2">
          <button
            type="button"
            onClick={() => setVisibleLimit((v) => v + 48)}
            className="h-8 px-4 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-[#1a1f2b] dark:hover:bg-[#23293a] text-xs font-medium text-slate-700 dark:text-[#cbd5e1] cursor-pointer"
          >
            Load more charts ({rows.length - visibleLimit} remaining)
          </button>
        </div>
      )}
    </div>
  );
}

function normalizeMarketWeight(row: ScreenerRow): number {
  const mktCap = row.marketCap;
  if (typeof mktCap === 'number' && Number.isFinite(mktCap) && mktCap > 0) {
    const usdEq = row.currency.toUpperCase() === 'IDR' ? mktCap / 15_500 : mktCap;
    return Math.max(100, Math.pow(usdEq, 0.52));
  }
  const vol = row.volume;
  if (typeof vol === 'number' && Number.isFinite(vol) && vol > 0) {
    return Math.max(100, Math.pow(vol, 0.45));
  }
  return 1000;
}

function getHeatmapColors(row: ScreenerRow, metric: HeatmapColorMetric): {
  bg: string;
  text: string;
  displayValue: string;
} {
  if (metric === 'rsi14') {
    const r = row.rsi14;
    if (r === null) {
      return { bg: '#262b38', text: '#cbd5e1', displayValue: '—' };
    }
    const displayValue = `RSI ${r.toFixed(0)}`;
    if (r <= 30) return { bg: '#047857', text: '#ffffff', displayValue };
    if (r <= 45) return { bg: '#0d6854', text: '#ecfdf5', displayValue };
    if (r >= 75) return { bg: '#b91c1c', text: '#ffffff', displayValue };
    if (r >= 65) return { bg: '#991b1b', text: '#fef2f2', displayValue };
    return { bg: '#2c3547', text: '#e2e8f0', displayValue };
  }

  const raw = metric === 'ema9DiffPct' ? row.ema9DiffPct : row.changePercent;
  if (raw === null || !Number.isFinite(raw)) {
    return { bg: '#262b38', text: '#cbd5e1', displayValue: '—' };
  }
  const displayValue = `${raw > 0 ? '+' : ''}${raw.toFixed(2)}%`;

  if (raw >= 4) return { bg: '#059669', text: '#ffffff', displayValue };
  if (raw >= 2) return { bg: '#0d7f5f', text: '#ffffff', displayValue };
  if (raw > 0.15) return { bg: '#165b4a', text: '#ecfdf5', displayValue };
  if (raw <= -4) return { bg: '#dc2626', text: '#ffffff', displayValue };
  if (raw <= -2) return { bg: '#b91c1c', text: '#ffffff', displayValue };
  if (raw < -0.15) return { bg: '#7f242b', text: '#fef2f2', displayValue };
  return { bg: '#2c3342', text: '#e2e8f0', displayValue };
}

export function SectorHeatmapView({
  rows,
  activeSymbol,
  colorMetric,
  onSelectSymbol,
}: {
  rows: ScreenerRow[];
  activeSymbol: string;
  colorMetric: HeatmapColorMetric;
  onSelectSymbol: (symbol: string) => void;
}) {
  const sectorBoxes = useMemo(() => {
    const cappedRows = [...rows]
      .sort((a, b) => normalizeMarketWeight(b) - normalizeMarketWeight(a))
      .slice(0, 140);

    const bySector = new Map<string, ScreenerRow[]>();
    for (const row of cappedRows) {
      const sec = row.sector?.trim() || 'Other';
      const list = bySector.get(sec) ?? [];
      list.push(row);
      bySector.set(sec, list);
    }

    const sectorInputs = Array.from(bySector.entries()).map(([sector, items]) => ({
      id: sector,
      weight: items.reduce((sum, r) => sum + normalizeMarketWeight(r), 0),
      payload: items,
    }));

    const rects = layoutTreemapRects(sectorInputs, { x: 0, y: 0, w: 100, h: 100 });
    return rects.map((secRect) => {
      const tileInputs = secRect.payload.map((r) => ({
        id: r.symbol,
        weight: normalizeMarketWeight(r),
        payload: r,
      }));
      const tiles = layoutTreemapRects(tileInputs, { x: 0, y: 0, w: 100, h: 100 });
      return {
        sector: secRect.id,
        x: secRect.x,
        y: secRect.y,
        w: secRect.w,
        h: secRect.h,
        tiles,
      };
    });
  }, [rows]);

  if (rows.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-slate-500 dark:text-[#8b95a7] py-10">
        <TrendingUp className="w-4 h-4 mr-2 opacity-60" />
        <span>Tidak ada saham untuk ditampilkan pada Heatmap.</span>
      </div>
    );
  }

  return (
    <div className="p-2.5 flex flex-col gap-2 h-full min-h-[380px]" data-testid="screener-heatmap-view">
      <div className="relative flex-1 min-h-[340px] w-full rounded-lg overflow-hidden bg-[#0b0e14] border border-slate-200 dark:border-[#1f2430]">
        {sectorBoxes.map((sec) => {
          const showSectorHeader = sec.h > 9 && sec.w > 11;
          return (
            <div
              key={sec.sector}
              style={{
                left: `${sec.x}%`,
                top: `${sec.y}%`,
                width: `${sec.w}%`,
                height: `${sec.h}%`,
              }}
              className="absolute p-[2px] box-border"
            >
              <div className="w-full h-full flex flex-col rounded-[3px] overflow-hidden bg-[#131722] border border-[#0b0e14]">
                {showSectorHeader && (
                  <div className="px-1.5 py-0.5 text-[10px] font-semibold text-[#d1d4dc] bg-[#171c28] truncate shrink-0 leading-tight">
                    {sec.sector} ({sec.tiles.length})
                  </div>
                )}
                <div className="relative flex-1 min-h-0">
                  {sec.tiles.map((tile) => {
                    const row = tile.payload;
                    const { bg, text, displayValue } = getHeatmapColors(row, colorMetric);
                    const isSelected = row.symbol.toUpperCase() === activeSymbol.toUpperCase();
                    const tileArea = (sec.w * tile.w * sec.h * tile.h) / 10000;
                    const showValue = tileArea > 14;
                    const showTicker = tileArea > 4.5;
                    const showAvatar = tileArea > 65;
                    const shortTicker = row.symbol.replace(/\.JK$/i, '');

                    return (
                      <button
                        key={row.symbol}
                        type="button"
                        data-testid={`screener-heatmap-tile-${row.symbol}`}
                        onClick={() => onSelectSymbol(row.symbol)}
                        title={`${row.symbol} — ${row.shortName}\nPrice: ${formatMiniPrice(
                          row.price,
                          row.symbol
                        )} | Chg: ${row.changePercent > 0 ? '+' : ''}${row.changePercent.toFixed(
                          2
                        )}%${
                          row.ema9DiffPct !== null
                            ? ` | vs EMA 9: ${row.ema9DiffPct > 0 ? '+' : ''}${row.ema9DiffPct.toFixed(2)}%`
                            : ''
                        }`}
                        style={{
                          left: `${tile.x}%`,
                          top: `${tile.y}%`,
                          width: `${tile.w}%`,
                          height: `${tile.h}%`,
                          backgroundColor: bg,
                          color: text,
                        }}
                        className={`absolute box-border border border-[#0b0e14]/90 flex flex-col items-center justify-center p-0.5 overflow-hidden transition-opacity hover:opacity-90 cursor-pointer ${
                          isSelected ? 'ring-2 ring-inset ring-white z-10' : ''
                        }`}
                      >
                        {showAvatar && (
                          <span className="w-5 h-5 rounded-full bg-black/25 text-white text-[9px] font-bold flex items-center justify-center mb-0.5 shrink-0">
                            {shortTicker.slice(0, 2)}
                          </span>
                        )}
                        {showTicker && (
                          <span className="font-mono font-bold text-[10px] sm:text-[11px] leading-tight truncate max-w-full px-0.5">
                            {shortTicker}
                          </span>
                        )}
                        {showValue && (
                          <span className="font-mono text-[9px] sm:text-[10px] opacity-95 leading-tight truncate max-w-full">
                            {displayValue}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* TradingView-style bottom heatmap scale bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] text-slate-500 dark:text-[#8b95a7] shrink-0">
        {colorMetric === 'rsi14' ? (
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-2.5 rounded-xs bg-[#047857]" />
            <span>Oversold ≤ 30</span>
            <span className="inline-block w-3 h-2.5 rounded-xs bg-[#2c3547] ml-1.5" />
            <span>Neutral</span>
            <span className="inline-block w-3 h-2.5 rounded-xs bg-[#b91c1c] ml-1.5" />
            <span>Overbought ≥ 75</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 font-mono">
            <span className="px-1.5 py-0.5 rounded-xs bg-[#dc2626] text-white">-4%</span>
            <span className="px-1.5 py-0.5 rounded-xs bg-[#b91c1c] text-white">-2%</span>
            <span className="px-1.5 py-0.5 rounded-xs bg-[#7f242b] text-white">-0.5%</span>
            <span className="px-1.5 py-0.5 rounded-xs bg-[#2c3342] text-slate-200">0%</span>
            <span className="px-1.5 py-0.5 rounded-xs bg-[#165b4a] text-white">+0.5%</span>
            <span className="px-1.5 py-0.5 rounded-xs bg-[#0d7f5f] text-white">+2%</span>
            <span className="px-1.5 py-0.5 rounded-xs bg-[#059669] text-white">+4%</span>
          </div>
        )}
        <span>Tile size: Market Cap · Top {Math.min(rows.length, 140)} matches · Click to load chart</span>
      </div>
    </div>
  );
}
