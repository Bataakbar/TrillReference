import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_FLAG_COLOR,
  FLAG_COLOR_OPTIONS,
  addSymbolToCustomWatchlist,
  classifyWatchlistSymbol,
  clearCustomWatchlist,
  computeRangeRatio,
  countSymbolsByFlagColor,
  createCustomWatchlist,
  createDefaultCustomWatchlists,
  deleteCustomWatchlist,
  getActiveListLabel,
  getAllUniqueWatchedSymbols,
  getSymbolsForFlagColor,
  getTickerAvatar,
  nextSortState,
  removeSymbolFromCustomWatchlist,
  renameCustomWatchlist,
  reorderCustomWatchlistSymbols,
  reorderWatchlistSymbols,
  resolveActiveListSymbols,
  setSymbolFlag,
  sortWatchlistSymbols,
  toggleSymbolFlag,
  unflagAllSymbols,
} from './watchlistModel';
import type { WatchlistQuote } from '../types/chart';

test('FLAG_COLOR_OPTIONS defaults to red first with 7 TradingView colors', () => {
  assert.equal(DEFAULT_FLAG_COLOR, 'red');
  assert.equal(FLAG_COLOR_OPTIONS[0].id, 'red');
  assert.equal(FLAG_COLOR_OPTIONS[0].listName, 'Red list');
  assert.equal(FLAG_COLOR_OPTIONS.length, 7);
});

test('toggleSymbolFlag defaults to red and setSymbolFlag assigns/clears colors cleanly', () => {
  let flags = toggleSymbolFlag({}, 'bbca.jk');
  assert.deepEqual(flags, { 'BBCA.JK': 'red' });

  // Toggling again unflags
  flags = toggleSymbolFlag(flags, 'BBCA.JK');
  assert.deepEqual(flags, {});

  // Assign distinct color flags -> split into color-based lists
  flags = setSymbolFlag(flags, 'PTRO.JK', 'red');
  flags = setSymbolFlag(flags, 'NVDA', 'blue');
  flags = setSymbolFlag(flags, 'AAPL', 'green');
  flags = setSymbolFlag(flags, 'DEWA.JK'); // defaults to red

  assert.deepEqual(getSymbolsForFlagColor(flags, 'red'), ['PTRO.JK', 'DEWA.JK']);
  assert.deepEqual(getSymbolsForFlagColor(flags, 'blue'), ['NVDA']);
  assert.deepEqual(getSymbolsForFlagColor(flags, 'green'), ['AAPL']);

  const counts = countSymbolsByFlagColor(flags);
  assert.equal(counts.red, 2);
  assert.equal(counts.blue, 1);
  assert.equal(counts.green, 1);
  assert.equal(counts.orange, 0);

  // Unflag single color preserves other color lists
  const withoutRed = unflagAllSymbols(flags, 'red');
  assert.deepEqual(getSymbolsForFlagColor(withoutRed, 'red'), []);
  assert.deepEqual(getSymbolsForFlagColor(withoutRed, 'blue'), ['NVDA']);
});

test('custom watchlists support create, rename, add/remove, reorder, clear, and delete safely', () => {
  let lists = createDefaultCustomWatchlists(['BBCA.JK', 'AAPL']);
  assert.equal(lists.length, 1);
  assert.equal(lists[0].name, 'Watchlist');

  // Deleting the sole custom watchlist is prevented
  assert.equal(deleteCustomWatchlist(lists, 'default').length, 1);

  const createdRes = createCustomWatchlist(lists, 'IDX Movers', ['ptro.jk']);
  lists = createdRes.lists;
  assert.equal(lists.length, 2);
  assert.equal(createdRes.created.name, 'IDX Movers');
  assert.deepEqual(createdRes.created.symbols, ['PTRO.JK']);

  lists = addSymbolToCustomWatchlist(lists, createdRes.created.id, 'dewa.jk');
  assert.deepEqual(lists[1].symbols, ['DEWA.JK', 'PTRO.JK']);

  lists = reorderCustomWatchlistSymbols(lists, createdRes.created.id, 'PTRO.JK', 'DEWA.JK');
  assert.deepEqual(lists[1].symbols, ['PTRO.JK', 'DEWA.JK']);

  lists = renameCustomWatchlist(lists, createdRes.created.id, 'IDX Hot');
  assert.equal(lists[1].name, 'IDX Hot');

  lists = removeSymbolFromCustomWatchlist(lists, createdRes.created.id, 'PTRO.JK');
  assert.deepEqual(lists[1].symbols, ['DEWA.JK']);

  lists = clearCustomWatchlist(lists, createdRes.created.id);
  assert.deepEqual(lists[1].symbols, []);

  // Deleting the default Watchlist is always prevented even when multiple lists exist
  assert.equal(deleteCustomWatchlist(lists, 'default').length, 2);

  lists = deleteCustomWatchlist(lists, createdRes.created.id);
  assert.equal(lists.length, 1);
});

test('resolveActiveListSymbols, getActiveListLabel, and getAllUniqueWatchedSymbols unify custom & flagged views', () => {
  const lists = createDefaultCustomWatchlists(['BBCA.JK', 'AAPL']);
  const flags = setSymbolFlag(setSymbolFlag({}, 'PTRO.JK', 'red'), 'BTC-USD', 'purple');

  assert.deepEqual(
    resolveActiveListSymbols({ kind: 'custom', id: 'default' }, lists, flags),
    ['BBCA.JK', 'AAPL']
  );
  assert.deepEqual(
    resolveActiveListSymbols({ kind: 'flagged', color: 'red' }, lists, flags),
    ['PTRO.JK']
  );
  assert.equal(getActiveListLabel({ kind: 'flagged', color: 'red' }, lists), 'Red list');
  assert.equal(getActiveListLabel({ kind: 'custom', id: 'default' }, lists), 'Watchlist');

  assert.deepEqual(getAllUniqueWatchedSymbols(lists, flags), [
    'BBCA.JK',
    'AAPL',
    'PTRO.JK',
    'BTC-USD',
  ]);
});

test('nextSortState cycles asc -> desc -> none cleanly', () => {
  const s1 = nextSortState({ key: null, direction: 'asc' }, 'chgPct');
  assert.deepEqual(s1, { key: 'chgPct', direction: 'asc' });

  const s2 = nextSortState(s1, 'chgPct');
  assert.deepEqual(s2, { key: 'chgPct', direction: 'desc' });

  const s3 = nextSortState(s2, 'chgPct');
  assert.deepEqual(s3, { key: null, direction: 'asc' });
});

test('sortWatchlistSymbols sorts by symbol, last, chg, and chgPct', () => {
  const symbols = ['BBCA.JK', 'AAPL', 'BTC-USD'];
  const quotes: Record<string, WatchlistQuote> = {
    'BBCA.JK': {
      symbol: 'BBCA.JK',
      shortName: 'Bank Central Asia',
      price: 5825,
      change: 25,
      changePercent: 0.43,
      currency: 'IDR',
      exchange: 'IDX',
    },
    AAPL: {
      symbol: 'AAPL',
      shortName: 'Apple Inc.',
      price: 230,
      change: -4.2,
      changePercent: -1.79,
      currency: 'USD',
      exchange: 'NASDAQ',
    },
    'BTC-USD': {
      symbol: 'BTC-USD',
      shortName: 'Bitcoin USD',
      price: 92000,
      change: 1800,
      changePercent: 1.99,
      currency: 'USD',
      exchange: 'CCC',
    },
  };

  assert.deepEqual(sortWatchlistSymbols(symbols, quotes, { key: 'symbol', direction: 'asc' }), [
    'AAPL',
    'BBCA.JK',
    'BTC-USD',
  ]);

  assert.deepEqual(sortWatchlistSymbols(symbols, quotes, { key: 'chgPct', direction: 'desc' }), [
    'BTC-USD',
    'BBCA.JK',
    'AAPL',
  ]);

  assert.deepEqual(sortWatchlistSymbols(symbols, quotes, { key: 'last', direction: 'asc' }), [
    'AAPL',
    'BBCA.JK',
    'BTC-USD',
  ]);
});

test('reorderWatchlistSymbols moves dragged symbol cleanly without losing entries', () => {
  const list = ['BBCA.JK', 'BBRI.JK', 'AAPL', 'NVDA'];
  assert.deepEqual(reorderWatchlistSymbols(list, 'NVDA', 'BBRI.JK'), [
    'BBCA.JK',
    'NVDA',
    'BBRI.JK',
    'AAPL',
  ]);
  assert.deepEqual(reorderWatchlistSymbols(list, 'AAPL', 'AAPL'), list);
});

test('computeRangeRatio clamps price inside [0, 1] and handles flat range safely', () => {
  assert.equal(computeRangeRatio(550, 500, 600), 0.5);
  assert.equal(computeRangeRatio(400, 500, 600), 0);
  assert.equal(computeRangeRatio(700, 500, 600), 1);
  assert.equal(computeRangeRatio(500, 500, 500), 0.5);
});

test('classifyWatchlistSymbol and getTickerAvatar categorize markets cleanly', () => {
  assert.equal(classifyWatchlistSymbol('BBCA.JK'), 'idx');
  assert.equal(classifyWatchlistSymbol('^JKSE'), 'idx');
  assert.equal(classifyWatchlistSymbol('BTC-USD'), 'global');
  assert.equal(classifyWatchlistSymbol('USDIDR=X'), 'global');
  assert.equal(classifyWatchlistSymbol('NVDA'), 'us');

  const avatar = getTickerAvatar('BBCA.JK');
  assert.equal(avatar.letter, 'B');
  assert.equal(avatar.shortDisplay, 'BBCA');
});
