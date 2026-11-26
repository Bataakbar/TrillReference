import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_FAVORITE_TIMEFRAMES,
  MAX_FAVORITE_TIMEFRAMES,
  normalizeFavoriteTimeframes,
  toggleFavoriteTimeframe,
} from './timeframeFavorites';

test('DEFAULT_FAVORITE_TIMEFRAMES has 8 items matching TradingView defaults', () => {
  assert.equal(DEFAULT_FAVORITE_TIMEFRAMES.length, MAX_FAVORITE_TIMEFRAMES);
  assert.deepEqual(DEFAULT_FAVORITE_TIMEFRAMES, [
    '5m',
    '30m',
    '45m',
    '2h',
    '4h',
    '1d',
    '1wk',
    '1mo',
  ]);
});

test('normalizeFavoriteTimeframes deduplicates, sorts canonically, and caps at 8', () => {
  const result = normalizeFavoriteTimeframes([
    '1y',
    '1m',
    'invalid',
    '1m',
    '5m',
    '10m',
    '15m',
    '30m',
    '45m',
    '1h',
    '2h',
  ]);
  assert.equal(result.length, 8);
  assert.deepEqual(result, ['1m', '5m', '10m', '15m', '30m', '45m', '1h', '2h']);
});

test('toggleFavoriteTimeframe rejects adding a 9th favorite with limitExceeded=true', () => {
  const initial = [...DEFAULT_FAVORITE_TIMEFRAMES];
  assert.equal(initial.length, 8);

  const blocked = toggleFavoriteTimeframe(initial, '15m');
  assert.equal(blocked.limitExceeded, true);
  assert.equal(blocked.added, false);
  assert.deepEqual(blocked.nextFavorites, initial);
});

test('toggleFavoriteTimeframe allows removing an existing favorite and adding a new one', () => {
  const removed = toggleFavoriteTimeframe([...DEFAULT_FAVORITE_TIMEFRAMES], '5m');
  assert.equal(removed.limitExceeded, false);
  assert.equal(removed.added, false);
  assert.equal(removed.nextFavorites.length, 7);
  assert.equal(removed.nextFavorites.includes('5m'), false);

  const added = toggleFavoriteTimeframe(removed.nextFavorites, '15m');
  assert.equal(added.limitExceeded, false);
  assert.equal(added.added, true);
  assert.equal(added.nextFavorites.length, 8);
  assert.deepEqual(added.nextFavorites, [
    '15m',
    '30m',
    '45m',
    '2h',
    '4h',
    '1d',
    '1wk',
    '1mo',
  ]);
});
