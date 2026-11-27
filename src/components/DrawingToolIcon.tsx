import React from 'react';
import type { LineDashPreset } from '../indicators/customIndicators';

interface DrawingToolIconProps {
  toolKey: string;
  className?: string;
}

/**
 * TradingView-faithful vector icons visualizing the exact line/geometry shape
 * of every drawing tool (hollow circular anchor nodes + crisp 1.3px strokes).
 */
export function DrawingToolIcon({ toolKey, className = 'w-5 h-5' }: DrawingToolIconProps) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  };

  switch (toolKey) {
    // ── Trend Lines & Rays (matching TradingView exact reference icons) ──
    case 'segment': // Trendline
      return (
        <svg {...common}>
          <line x1="6.2" y1="17.8" x2="17.8" y2="6.2" />
          <circle cx="4.8" cy="19.2" r="2" />
          <circle cx="19.2" cy="4.8" r="2" />
        </svg>
      );

    case 'rayLine': // Ray
      return (
        <svg {...common}>
          <line x1="6.2" y1="17.8" x2="10.6" y2="13.4" />
          <line x1="13.4" y1="10.6" x2="20.5" y2="3.5" />
          <circle cx="4.8" cy="19.2" r="2" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      );

    case 'infoLine': // Info line
      return (
        <svg {...common}>
          <line x1="6.2" y1="17.8" x2="17.8" y2="6.2" />
          <circle cx="4.8" cy="19.2" r="2" />
          <circle cx="19.2" cy="4.8" r="2" />
          <rect x="13" y="14.5" width="7.5" height="5" rx="1.4" />
        </svg>
      );

    case 'straightLine': // Extended line
      return (
        <svg {...common}>
          <line x1="3" y1="21" x2="7.2" y2="16.8" />
          <line x1="10" y1="14" x2="14" y2="10" />
          <line x1="16.8" y1="7.2" x2="21" y2="3" />
          <circle cx="8.6" cy="15.4" r="2" />
          <circle cx="15.4" cy="8.6" r="2" />
        </svg>
      );

    case 'trendAngle': // Trend angle
      return (
        <svg {...common}>
          <line x1="6.2" y1="17.8" x2="17.8" y2="6.2" />
          <line x1="6.8" y1="19.2" x2="21" y2="19.2" />
          <path d="M12.5 19.2 A 7.7 7.7 0 0 0 10.3 13.7" />
          <circle cx="4.8" cy="19.2" r="2" />
          <circle cx="19.2" cy="4.8" r="2" />
        </svg>
      );

    case 'horizontalStraightLine': // Horizontal line
      return (
        <svg {...common}>
          <line x1="2.5" y1="12" x2="10" y2="12" />
          <line x1="14" y1="12" x2="21.5" y2="12" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      );

    case 'horizontalRayLine': // Horizontal ray
      return (
        <svg {...common}>
          <line x1="7.5" y1="12" x2="21.5" y2="12" />
          <circle cx="5.5" cy="12" r="2" />
        </svg>
      );

    case 'horizontalSegment': // Horizontal segment
      return (
        <svg {...common}>
          <line x1="7.5" y1="12" x2="16.5" y2="12" />
          <circle cx="5.5" cy="12" r="2" />
          <circle cx="18.5" cy="12" r="2" />
        </svg>
      );

    case 'crossLine': // Crossline
      return (
        <svg {...common}>
          <line x1="2.5" y1="12" x2="10" y2="12" />
          <line x1="14" y1="12" x2="21.5" y2="12" />
          <line x1="12" y1="2.5" x2="12" y2="10" />
          <line x1="12" y1="14" x2="12" y2="21.5" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      );

    case 'priceLine': // Price line
      return (
        <svg {...common}>
          <line x1="3" y1="12" x2="13.5" y2="12" strokeDasharray="2.5 2" />
          <rect x="13.5" y="8.5" width="8" height="7" rx="1.2" />
          <line x1="15.5" y1="12" x2="19.5" y2="12" />
        </svg>
      );

    case 'arrowLine': // Arrow line
      return (
        <svg {...common}>
          <line x1="6.2" y1="17.8" x2="19" y2="5" />
          <polyline points="13.5 5 19 5 19 10.5" />
          <circle cx="4.8" cy="19.2" r="2" />
        </svg>
      );

    // ── Channels ──
    case 'parallelChannel':
    case 'parallelStraightLine':
      return (
        <svg {...common}>
          <line x1="4" y1="14" x2="15.5" y2="4.5" />
          <line x1="6.3" y1="16.8" x2="17.8" y2="7.3" strokeDasharray="2 2" strokeOpacity="0.65" />
          <line x1="8.5" y1="19.5" x2="20" y2="10" />
          <circle cx="4" cy="14" r="1.7" />
          <circle cx="15.5" cy="4.5" r="1.7" />
          <circle cx="8.5" cy="19.5" r="1.7" />
        </svg>
      );

    case 'extendedParallelChannel':
    case 'priceChannelLine':
      return (
        <svg {...common}>
          <line x1="4" y1="14" x2="20.5" y2="3.5" />
          <line x1="6" y1="17" x2="21" y2="7.5" strokeDasharray="2 2" strokeOpacity="0.65" />
          <line x1="8" y1="20" x2="21" y2="11.5" />
          <circle cx="4" cy="14" r="1.6" />
          <circle cx="13" cy="8.3" r="1.6" />
          <circle cx="8" cy="20" r="1.6" />
        </svg>
      );

    case 'regressionTrend':
      return (
        <svg {...common}>
          <line x1="4" y1="12.5" x2="17" y2="4.5" strokeOpacity="0.85" />
          <line x1="5.5" y1="16" x2="18.5" y2="8" strokeDasharray="2.2 2" />
          <line x1="7" y1="19.5" x2="20" y2="11.5" strokeOpacity="0.85" />
          <circle cx="5.5" cy="16" r="1.8" />
          <circle cx="18.5" cy="8" r="1.8" />
        </svg>
      );

    // ── Fibonacci ──
    case 'fibonacciLine':
      return (
        <svg {...common}>
          <line x1="3" y1="5" x2="21" y2="5" />
          <line x1="3" y1="9.7" x2="21" y2="9.7" strokeOpacity="0.7" />
          <line x1="3" y1="14.3" x2="21" y2="14.3" strokeOpacity="0.7" />
          <line x1="3" y1="19" x2="21" y2="19" />
          <line x1="6.5" y1="17.5" x2="17.5" y2="6.5" strokeDasharray="2 2" />
          <circle cx="5.5" cy="19" r="1.6" />
          <circle cx="18.5" cy="5" r="1.6" />
        </svg>
      );

    case 'fibExtension':
      return (
        <svg {...common}>
          <polyline points="4 18 10 6 14 14" strokeDasharray="2 2" />
          <line x1="13" y1="5" x2="21" y2="5" />
          <line x1="13" y1="10" x2="21" y2="10" />
          <line x1="13" y1="15" x2="21" y2="15" />
          <circle cx="4" cy="18" r="1.5" />
          <circle cx="10" cy="6" r="1.5" />
          <circle cx="14" cy="14" r="1.5" />
        </svg>
      );

    // ── Geometric Shapes ──
    case 'rectZone':
      return (
        <svg {...common}>
          <rect x="5" y="6" width="14" height="12" rx="0.8" />
          <circle cx="5" cy="6" r="1.7" fill="currentColor" fillOpacity="0.15" />
          <circle cx="19" cy="18" r="1.7" fill="currentColor" fillOpacity="0.15" />
        </svg>
      );

    case 'circleShape':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19.5" cy="12" r="1.5" />
        </svg>
      );

    case 'ellipseShape':
      return (
        <svg {...common}>
          <ellipse cx="12" cy="12" rx="8.5" ry="5.5" transform="rotate(-18 12 12)" />
          <circle cx="4.8" cy="14.4" r="1.5" />
          <circle cx="19.2" cy="9.6" r="1.5" />
        </svg>
      );

    case 'triangleShape':
      return (
        <svg {...common}>
          <polygon points="12 4.5 4.5 18.5 19.5 18.5" />
          <circle cx="12" cy="4.5" r="1.6" />
          <circle cx="4.5" cy="18.5" r="1.6" />
          <circle cx="19.5" cy="18.5" r="1.6" />
        </svg>
      );

    // ── Brush & Annotations ──
    case 'plainText':
      return (
        <svg {...common}>
          <path d="M6 6.5 H18" />
          <path d="M6 6.5 V8.2" />
          <path d="M18 6.5 V8.2" />
          <line x1="12" y1="6.5" x2="12" y2="18.5" />
          <path d="M9.5 18.5 H14.5" />
        </svg>
      );

    case 'brush':
      return (
        <svg {...common}>
          <path d="M4 17.5 C7 11, 10 19, 13.5 12 C16 7, 18.5 8, 20 5.5" />
        </svg>
      );

    case 'simpleAnnotation':
      return (
        <svg {...common}>
          <path d="M4 5.5 h16 v10 h-9 l-4 3.5 v-3.5 H4 z" />
          <line x1="8" y1="10.5" x2="16" y2="10.5" />
        </svg>
      );

    case 'flagMark':
      return (
        <svg {...common}>
          <line x1="6.5" y1="4.5" x2="6.5" y2="19.5" />
          <path d="M6.5 5.5 H18.5 L15.5 9.5 L18.5 13.5 H6.5" />
        </svg>
      );

    case 'chartImage':
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <circle cx="9" cy="9.5" r="1.4" />
          <path d="M4.5 16.5 L9.5 12 L13.5 15.5 L16 13 L19.5 16.5" />
        </svg>
      );

    case 'simpleTag':
      return (
        <svg {...common}>
          <path d="M4 12 L9 7.5 H20 V16.5 H9 Z" />
          <circle cx="10.5" cy="12" r="1.2" />
        </svg>
      );

    // ── Positions & Patterns ──
    case 'longPosition':
      return (
        <svg {...common}>
          <rect x="4" y="4.5" width="16" height="8" stroke="#26a69a" fill="#26a69a" fillOpacity="0.16" />
          <rect x="4" y="12.5" width="16" height="7" stroke="#ef5350" fill="#ef5350" fillOpacity="0.16" />
          <line x1="4" y1="12.5" x2="20" y2="12.5" />
        </svg>
      );

    case 'shortPosition':
      return (
        <svg {...common}>
          <rect x="4" y="4.5" width="16" height="7" stroke="#ef5350" fill="#ef5350" fillOpacity="0.16" />
          <rect x="4" y="11.5" width="16" height="8" stroke="#26a69a" fill="#26a69a" fillOpacity="0.16" />
          <line x1="4" y1="11.5" x2="20" y2="11.5" />
        </svg>
      );

    case 'abcdPattern':
      return (
        <svg {...common}>
          <polyline points="4 17 9 7 15 14 20 5" />
          <circle cx="4" cy="17" r="1.4" />
          <circle cx="9" cy="7" r="1.4" />
          <circle cx="15" cy="14" r="1.4" />
          <circle cx="20" cy="5" r="1.4" />
        </svg>
      );

    case 'xabcdPattern':
      return (
        <svg {...common}>
          <polyline points="3 18 7.5 6 12 14 16.5 7 21 17" />
          <line x1="3" y1="18" x2="12" y2="14" strokeDasharray="2 2" strokeOpacity="0.55" />
          <line x1="12" y1="14" x2="21" y2="17" strokeDasharray="2 2" strokeOpacity="0.55" />
          <circle cx="3" cy="18" r="1.2" />
          <circle cx="7.5" cy="6" r="1.2" />
          <circle cx="12" cy="14" r="1.2" />
          <circle cx="16.5" cy="7" r="1.2" />
          <circle cx="21" cy="17" r="1.2" />
        </svg>
      );

    // ── Measure Ruler ──
    case 'measureRuler':
      return (
        <svg {...common}>
          <path d="M4.5 16.5 L16.5 4.5 L19.5 7.5 L7.5 19.5 Z" />
          <line x1="9" y1="12" x2="10.6" y2="13.6" />
          <line x1="12" y1="9" x2="13.6" y2="10.6" />
          <line x1="14.8" y1="6.2" x2="16.2" y2="7.6" />
        </svg>
      );

    default:
      return (
        <svg {...common}>
          <line x1="5" y1="19" x2="19" y2="5" />
        </svg>
      );
  }
}

/**
 * Compact visual preview of an indicator's line style (color, width, solid/dashed/dotted).
 */
export function LineStyleSwatch({
  color,
  lineWidth = 2,
  lineStyle = 'solid',
  className = 'w-6 h-3',
}: {
  color: string;
  lineWidth?: number;
  lineStyle?: LineDashPreset;
  className?: string;
}) {
  const dashArray =
    lineStyle === 'dashed' ? '5 3' : lineStyle === 'dotted' ? '1.8 2.8' : undefined;

  return (
    <svg viewBox="0 0 28 10" className={className} aria-hidden="true">
      <line
        x1="1"
        y1="5"
        x2="27"
        y2="5"
        stroke={color}
        strokeWidth={Math.min(Math.max(lineWidth, 1.2), 3.6)}
        strokeDasharray={dashArray}
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Visual shape badge for each indicator category inside the Indicators picker menu.
 */
export function IndicatorShapeIcon({
  shape,
  className = 'w-5 h-5',
}: {
  shape: 'line' | 'bands' | 'dots' | 'histogram' | 'oscillator' | 'macd';
  className?: string;
}) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  };

  switch (shape) {
    case 'line':
      return (
        <svg {...common}>
          <path d="M3 16 C7 14, 9 10, 13 11 C17 12, 18.5 7, 21 5.5" stroke="#2962FF" />
          <path d="M3 19 C8 17.5, 11 15, 15 14.5 C18 14, 19.5 11, 21 10" stroke="#FF9800" strokeOpacity="0.85" />
        </svg>
      );
    case 'bands':
      return (
        <svg {...common}>
          <path d="M3 9 C8 5, 15 5, 21 8" stroke="#2962FF" />
          <path d="M3 13 C8 10, 15 10, 21 12.5" stroke="#FF9800" strokeDasharray="2.5 2" />
          <path d="M3 17 C8 15, 15 15, 21 17" stroke="#2962FF" />
        </svg>
      );
    case 'dots':
      return (
        <svg {...common}>
          <circle cx="5" cy="17" r="1.4" fill="#00BCD4" stroke="none" />
          <circle cx="9.5" cy="14" r="1.4" fill="#00BCD4" stroke="none" />
          <circle cx="14" cy="10.5" r="1.4" fill="#00BCD4" stroke="none" />
          <circle cx="18.5" cy="7.5" r="1.4" fill="#00BCD4" stroke="none" />
        </svg>
      );
    case 'histogram':
      return (
        <svg {...common}>
          <rect x="4" y="13" width="3" height="7" fill="#26A69A" stroke="none" rx="0.5" />
          <rect x="8.5" y="9" width="3" height="11" fill="#26A69A" stroke="none" rx="0.5" />
          <rect x="13" y="14" width="3" height="6" fill="#EF5350" stroke="none" rx="0.5" />
          <rect x="17.5" y="7" width="3" height="13" fill="#26A69A" stroke="none" rx="0.5" />
        </svg>
      );
    case 'macd':
      return (
        <svg {...common}>
          <rect x="4" y="12" width="2.5" height="6" fill="#EF5350" stroke="none" rx="0.4" />
          <rect x="8" y="12" width="2.5" height="3.5" fill="#EF5350" stroke="none" rx="0.4" />
          <rect x="12.5" y="9" width="2.5" height="3" fill="#26A69A" stroke="none" rx="0.4" />
          <rect x="16.5" y="6.5" width="2.5" height="5.5" fill="#26A69A" stroke="none" rx="0.4" />
          <path d="M3 16 C8 14, 14 9, 21 6" stroke="#2962FF" />
          <path d="M3 18 C9 16, 15 12, 21 9" stroke="#FF9800" />
        </svg>
      );
    case 'oscillator':
    default:
      return (
        <svg {...common}>
          <line x1="3" y1="8" x2="21" y2="8" strokeOpacity="0.25" strokeDasharray="2 2" />
          <line x1="3" y1="16" x2="21" y2="16" strokeOpacity="0.25" strokeDasharray="2 2" />
          <path d="M3 14 L7 9 L11.5 15.5 L16 8.5 L21 12" stroke="#AB47BC" />
        </svg>
      );
  }
}
