import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INSTRUMENT_CATALOG,
  inferDefaultStockCountry,
  queryInstrumentCatalog,
} from './instrumentCatalog';

test('queryInstrumentCatalog paginates cleanly in batches of 50 with hasMore', () => {
  const page1 = queryInstrumentCatalog({ category: 'stocks', offset: 0, limit: 50 });
  assert.equal(page1.items.length, 50);
  assert.equal(page1.hasMore, true);
  assert.ok(page1.total > 200);

  const page2 = queryInstrumentCatalog({ category: 'stocks', offset: 50, limit: 50 });
  assert.equal(page2.items.length, 50);
  assert.notEqual(page2.items[0].symbol, page1.items[0].symbol);
});

test('queryInstrumentCatalog filters Stocks by country, type, sector, and text query', () => {
  const idxFinance = queryInstrumentCatalog({
    category: 'stocks',
    country: 'ID',
    sector: 'Finance',
    limit: 50,
  });
  assert.ok(idxFinance.items.length >= 20);
  assert.ok(idxFinance.items.every((i) => i.country === 'ID' && i.sector === 'Finance'));
  assert.ok(idxFinance.items.some((i) => i.symbol === 'BBCA.JK'));

  const drStocks = queryInstrumentCatalog({
    category: 'stocks',
    country: 'US',
    stockType: 'Depository Receipt',
    limit: 50,
  });
  assert.ok(drStocks.items.some((i) => i.symbol === 'TSM'));
  assert.ok(drStocks.items.every((i) => i.stockType === 'Depository Receipt'));

  const searchBca = queryInstrumentCatalog({
    category: 'all',
    q: 'BBCA',
    limit: 20,
  });
  assert.equal(searchBca.items[0].symbol, 'BBCA.JK');
});

test('queryInstrumentCatalog isolates crypto, forex, and indices categories cleanly', () => {
  const crypto = queryInstrumentCatalog({ category: 'crypto', limit: 50 });
  assert.ok(crypto.items.length >= 20);
  assert.ok(crypto.items.every((i) => i.type === 'CRYPTO'));

  const forex = queryInstrumentCatalog({ category: 'forex', limit: 50 });
  assert.ok(forex.items.length >= 20);
  assert.ok(forex.items.every((i) => i.type === 'FOREX'));

  const indices = queryInstrumentCatalog({ category: 'indices', limit: 50 });
  assert.ok(indices.items.length >= 15);
  assert.ok(indices.items.every((i) => i.type === 'INDEX'));
  assert.ok(INSTRUMENT_CATALOG.length > 300);
});

test('inferDefaultStockCountry detects Indonesian and global markets from active chart symbol', () => {
  assert.equal(inferDefaultStockCountry('BBCA.JK'), 'ID');
  assert.equal(inferDefaultStockCountry('^JKSE'), 'ID');
  assert.equal(inferDefaultStockCountry('D05.SI'), 'SG');
  assert.equal(inferDefaultStockCountry('AAPL'), null);
});
