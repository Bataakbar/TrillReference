import { registerYAxis, type AxisRange } from 'klinecharts';
import { deduplicateIdxAxisTicks, snapToIdxTick } from '../../shared/timeframes';
import {
  clampYAxisZoomRange,
  logarithmToValue,
  resolveCandleYAxisName,
  valueToLogarithm,
} from './yAxisRangeClamp';

export { clampYAxisZoomRange, resolveCandleYAxisName };

function findBaseSetRange(
  instance: object,
  ownSetRange: unknown
): ((range: AxisRange) => void) | null {
  let proto = Object.getPrototypeOf(instance);
  while (proto) {
    if (typeof proto.setRange === 'function' && proto.setRange !== ownSetRange) {
      return proto.setRange as (range: AxisRange) => void;
    }
    proto = Object.getPrototypeOf(proto);
  }
  return null;
}

function createClampedSetRange(options: { isIdx: boolean; isLog: boolean }) {
  const clampedSetRange = function (
    this: { _autoCalcTickFlag?: boolean; _range?: AxisRange },
    range: AxisRange
  ) {
    const nextRange = clampYAxisZoomRange(range, options);
    const baseSetRange = findBaseSetRange(this, clampedSetRange);
    if (baseSetRange) {
      baseSetRange.call(this, nextRange);
    } else {
      this._autoCalcTickFlag = false;
      this._range = nextRange;
    }
  };
  return clampedSetRange;
}

/**
 * Registers IDX (BEI) tick-size ("fraksi harga") Y-axis templates and guarded
 * Y-axis zoom templates on KLineChart v10 so continuous Y-axis upward dragging
 * preserves readable ticks and horizontal grid lines across all markets.
 */
export function registerIdxYAxes(): void {
  const logScaleHelpers = {
    minSpan: (precision: number) => 0.05 * Math.pow(10, -precision),
    valueToRealValue: (value: number) => valueToLogarithm(value),
    realValueToDisplayValue: (value: number) => logarithmToValue(value),
    displayValueToRealValue: (value: number) => valueToLogarithm(value),
    realValueToValue: (value: number) => logarithmToValue(value),
    createRange: ({ defaultRange }: { defaultRange: AxisRange }) => {
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
  };

  registerYAxis({
    name: 'idx_normal',
    displayValueToText: (value: number) => String(snapToIdxTick(value)),
    createTicks: ({ defaultTicks }) => deduplicateIdxAxisTicks(defaultTicks),
    setRange: createClampedSetRange({ isIdx: true, isLog: false }),
  } as Parameters<typeof registerYAxis>[0]);

  registerYAxis({
    name: 'idx_logarithm',
    ...logScaleHelpers,
    displayValueToText: (value: number) => String(snapToIdxTick(value)),
    createTicks: ({ defaultTicks }) => deduplicateIdxAxisTicks(defaultTicks),
    setRange: createClampedSetRange({ isIdx: true, isLog: true }),
  } as Parameters<typeof registerYAxis>[0]);

  registerYAxis({
    name: 'price_normal',
    setRange: createClampedSetRange({ isIdx: false, isLog: false }),
  } as Parameters<typeof registerYAxis>[0]);

  registerYAxis({
    name: 'price_logarithm',
    ...logScaleHelpers,
    setRange: createClampedSetRange({ isIdx: false, isLog: true }),
  } as Parameters<typeof registerYAxis>[0]);
}
