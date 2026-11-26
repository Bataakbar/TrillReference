import React from 'react';
import {
  DEFAULT_FLAG_COLOR,
  FLAG_COLOR_OPTIONS,
  getFlagColorMeta,
  type FlagColor,
} from '../utils/watchlistModel';

interface FlagRibbonIconProps {
  color?: FlagColor | null;
  className?: string;
}

/**
 * TradingView-style horizontal notched bookmark flag ribbon.
 */
export function FlagRibbonIcon({ color, className = 'w-3.5 h-2.5' }: FlagRibbonIconProps) {
  const hex = color ? getFlagColorMeta(color).hex : 'currentColor';
  return (
    <svg
      viewBox="0 0 16 12"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M1 1.5C1 1.22386 1.22386 1 1.5 1H14.3C14.702 1 14.9408 1.44943 14.7155 1.78246L11.85 6L14.7155 10.2175C14.9408 10.5506 14.702 11 14.3 11H1.5C1.22386 11 1 10.7761 1 10.5V1.5Z"
        fill={hex}
      />
    </svg>
  );
}

interface FlagColorSwatchRowProps {
  selectedColor?: FlagColor | null;
  onSelectColor: (color: FlagColor) => void;
}

/**
 * Row of 7 TradingView circular flag color swatches (Red is default).
 */
export function FlagColorSwatchRow({
  selectedColor,
  onSelectColor,
}: FlagColorSwatchRowProps) {
  const activeColor = selectedColor ?? DEFAULT_FLAG_COLOR;
  return (
    <div className="flex items-center gap-2" role="radiogroup" aria-label="Flag color">
      {FLAG_COLOR_OPTIONS.map((opt) => {
        const isSelected = activeColor === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`Set ${opt.label.toLowerCase()} flag${opt.id === DEFAULT_FLAG_COLOR ? ' (Default)' : ''}`}
            title={`${opt.listName}${opt.id === DEFAULT_FLAG_COLOR ? ' (Default)' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelectColor(opt.id);
            }}
            className="relative w-4 h-4 rounded-full transition-transform hover:scale-110 cursor-pointer flex items-center justify-center"
            style={{
              backgroundColor: opt.hex,
              ...(isSelected
                ? { boxShadow: `0 0 0 2px #1e222d, 0 0 0 4px ${opt.hex}` }
                : {}),
            }}
          />
        );
      })}
    </div>
  );
}
