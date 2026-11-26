import { registerYAxis } from 'klinecharts';
import { deduplicateIdxAxisTicks, isIdxSymbol, snapToIdxTick } from '../../shared/timeframes';
import type { YAxisScaleType } from '../types/chart';

let idxYAxesRegistered = false;

function valueToLogarithm(value: number): number {
  return value < 0 ? -Math.log10(1 - value) : Math.log10(1 + value);
}

function logarithmToValue(value: number): number {
  return value < 0 ? 1 - Math.pow(10, -value) : Math.pow(10, value) - 1;
}

/**
 * Registers IDX (BEI) tick-size ("fraksi harga") Y-axis templates on KLineChart v10
 * so the Y-axis crosshair badge, last price tag, and tick labels snap cleanly to valid
 * IDX tick multiples (1, 2, 5, 10, 25) while keeping the dashed crosshair line smooth.
 */
export function registerIdxYAxes(): void {
  if (idxYAxesRegistered) return;
  idxYAxesRegistered = true;

  registerYAxis({
    name: 'idx_normal',
    displayValueToText: (value: number) => String(snapToIdxTick(value)),
    createTicks: ({ defaultTicks }) => deduplicateIdxAxisTicks(defaultTicks),
  });

  registerYAxis({
    name: 'idx_logarithm',
    minSpan: (precision: number) => 0.05 * Math.pow(10, -precision),
    valueToRealValue: (value: number) => valueToLogarithm(value),
    realValueToDisplayValue: (value: number) => logarithmToValue(value),
    displayValueToRealValue: (value: number) => valueToLogarithm(value),
    realValueToValue: (value: number) => logarithmToValue(value),
    createRange: ({ defaultRange }) => {
      const { from, to, range } = defaultRange;
      const realFrom = valueToLogarithm(from);
      const realTo = valueToLogarithm(to);
      return {
        ...defaultRange,
        from,
        to,
        range,
        realFrom,
        realTo,
        realRange: realTo - realFrom,
        displayFrom: from,
        displayTo: to,
        displayRange: range,
      };
    },
    displayValueToText: (value: number) => String(snapToIdxTick(value)),
    createTicks: ({ defaultTicks }) => deduplicateIdxAxisTicks(defaultTicks),
  });
}

export function resolveCandleYAxisName(symbol: string, scale: YAxisScaleType): string {
  if (isIdxSymbol(symbol)) {
    return scale === 'logarithm' ? 'idx_logarithm' : 'idx_normal';
  }
  return scale;
}
