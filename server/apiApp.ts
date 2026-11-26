import express from 'express';
import YahooFinance from 'yahoo-finance2';
import {
  buildFetchWindows,
  buildFetchWindowsForRange,
  computePaginatedRange,
  getTimeframeByKey,
  hasReachedEarliestHistory,
  normalizeAndValidateSymbol,
  normalizeQuotesToBars,
  parseFirstTradeDateMs,
  resampleBars,
  computeQuoteSummary,
  type OHLCVBar,
  type RawYahooQuote,
} from '../shared/timeframes.js';
import {
  INSTRUMENT_CATALOG,
  queryInstrumentCatalog,
  type CatalogInstrument,
  type SearchCategoryFilter,
  type StockTypeFilter,
} from '../shared/instrumentCatalog.js';
import {
  SCREENER_FETCH_SPEC,
  computeScreenerTechnicals,
  normalizeScreenerTimeframe,
  type ScreenerMarket,
  type ScreenerRow,
  type ScreenerTechnicalSnapshot,
} from '../shared/screenerModel.js';

// Initialize yahoo-finance2 v3/v4 instance safely
const yahooFinance = new YahooFinance({
  suppressNotices: ['yahooSurvey', 'ripHistorical'],
});

interface CacheEntry<T> {
  expiresAt: number;
  data: T;
}

const chartCache = new Map<string, CacheEntry<unknown>>();
const quoteCache = new Map<string, CacheEntry<unknown>>();
const searchCache = new Map<string, CacheEntry<CatalogInstrument[]>>();
const screenerCache = new Map<string, CacheEntry<CatalogInstrument[]>>();
const screenerTechCache = new Map<string, CacheEntry<ScreenerTechnicalSnapshot>>();
const screenerPayloadCache = new Map<string, CacheEntry<unknown>>();
const firstTradeCache = new Map<string, number>();

function isYahooRangeExhaustedError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("data doesn't exist") ||
    msg.includes('not available for starttime') ||
    msg.includes('within the last')
  );
}

async function fetchYahooWindows(
  symbol: string,
  interval: Parameters<typeof yahooFinance.chart>[1]['interval'],
  windows: Array<{ period1: Date; period2: Date }>
): Promise<{ meta: Record<string, unknown>; quotes: RawYahooQuote[] }> {
  if (windows.length === 1) {
    const resChart = await yahooFinance.chart(symbol, {
      period1: windows[0].period1,
      period2: windows[0].period2,
      interval,
    });
    return {
      meta: (resChart?.meta ?? {}) as Record<string, unknown>,
      quotes: (Array.isArray(resChart?.quotes) ? resChart.quotes : []) as RawYahooQuote[],
    };
  }

  const settled = await Promise.allSettled(
    windows.map((w) =>
      yahooFinance.chart(symbol, {
        period1: w.period1,
        period2: w.period2,
        interval,
      })
    )
  );

  const mergedQuotes: RawYahooQuote[] = [];
  let freshestMeta: Record<string, unknown> | null = null;
  let firstError: unknown = null;
  let successCount = 0;

  for (const item of settled) {
    if (item.status === 'fulfilled') {
      successCount += 1;
      const val = item.value as { meta?: Record<string, unknown>; quotes?: unknown[] };
      if (!freshestMeta && val?.meta) {
        freshestMeta = val.meta;
      }
      if (Array.isArray(val?.quotes)) {
        mergedQuotes.push(...(val.quotes as RawYahooQuote[]));
      }
    } else if (!firstError) {
      firstError = item.reason;
    }
  }

  if (successCount === 0) {
    throw firstError ?? new Error('Unable to fetch chunked chart windows');
  }

  return {
    // Windows are ordered newest-first, so the first fulfilled chunk carries the freshest meta
    meta: freshestMeta ?? {},
    quotes: mergedQuotes,
  };
}

function getCached<T>(map: Map<string, CacheEntry<unknown>>, key: string): T | null {
  const entry = map.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    map.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached(
  map: Map<string, CacheEntry<unknown>>,
  key: string,
  data: unknown,
  ttlMs: number
): void {
  if (map.size > 200) {
    const oldestKey = map.keys().next().value;
    if (oldestKey) map.delete(oldestKey);
  }
  map.set(key, { data, expiresAt: Date.now() + ttlMs });
}

async function fetchChartPayloadWithQuote(params: {
  symbol: string;
  cfg: NonNullable<ReturnType<typeof getTimeframeByKey>>;
  windows: Array<{ period1: Date; period2: Date }>;
  minBarTimestampMs?: number;
}) {
  const { symbol, cfg, windows, minBarTimestampMs } = params;
  const singleQuoteKey = `single:${symbol}`;
  const cachedSingleQuote = getCached<Record<string, unknown>>(quoteCache, singleQuoteKey);

  const [chartResult, liveQuote] = await Promise.all([
    fetchYahooWindows(symbol, cfg.yfInterval, windows),
    cachedSingleQuote
      ? Promise.resolve(cachedSingleQuote)
      : yahooFinance
          .quote(symbol)
          .then((q) => {
            const rec = (q ?? {}) as unknown as Record<string, unknown>;
            setCached(quoteCache, singleQuoteKey, rec, 20_000);
            return rec;
          })
          .catch(() => null),
  ]);

  let bars = normalizeQuotesToBars(chartResult.quotes);
  if (cfg.resampleMs) {
    bars = resampleBars(bars, cfg.resampleMs);
  }
  if (typeof minBarTimestampMs === 'number') {
    bars = bars.filter((b) => b.timestamp >= minBarTimestampMs);
  }

  const rawMeta = chartResult.meta;
  const parsedFirst = parseFirstTradeDateMs(rawMeta.firstTradeDate);
  if (parsedFirst !== null) {
    firstTradeCache.set(symbol, parsedFirst);
  }

  const summary = computeQuoteSummary(
    {
      regularMarketPrice:
        (liveQuote?.regularMarketPrice as number | undefined) ??
        (rawMeta.regularMarketPrice as number | undefined),
      regularMarketPreviousClose: liveQuote?.regularMarketPreviousClose as number | undefined,
      regularMarketChange: liveQuote?.regularMarketChange as number | undefined,
      regularMarketChangePercent: liveQuote?.regularMarketChangePercent as number | undefined,
      chartPreviousClose: rawMeta.chartPreviousClose as number | undefined,
      previousClose: rawMeta.previousClose as number | undefined,
      regularMarketDayHigh:
        (liveQuote?.regularMarketDayHigh as number | undefined) ??
        (rawMeta.regularMarketDayHigh as number | undefined),
      regularMarketDayLow:
        (liveQuote?.regularMarketDayLow as number | undefined) ??
        (rawMeta.regularMarketDayLow as number | undefined),
      regularMarketVolume:
        (liveQuote?.regularMarketVolume as number | undefined) ??
        (rawMeta.regularMarketVolume as number | undefined),
      isIntraday: cfg.group !== 'days',
    },
    bars
  );

  return {
    bars,
    parsedFirstTradeMs: parsedFirst,
    payloadBase: {
      symbol: typeof rawMeta.symbol === 'string' ? rawMeta.symbol : symbol,
      tf: cfg.key,
      meta: {
        shortName:
          (typeof liveQuote?.shortName === 'string' && liveQuote.shortName) ||
          (typeof rawMeta.shortName === 'string' && rawMeta.shortName) ||
          (typeof rawMeta.longName === 'string' && rawMeta.longName) ||
          symbol,
        currency:
          (typeof liveQuote?.currency === 'string' && liveQuote.currency) ||
          (typeof rawMeta.currency === 'string' ? rawMeta.currency : 'USD'),
        exchangeName:
          (typeof rawMeta.fullExchangeName === 'string' && rawMeta.fullExchangeName) ||
          (typeof liveQuote?.fullExchangeName === 'string' && liveQuote.fullExchangeName) ||
          (typeof rawMeta.exchangeName === 'string' ? rawMeta.exchangeName : ''),
        instrumentType: typeof rawMeta.instrumentType === 'string' ? rawMeta.instrumentType : '',
        fiftyTwoWeekHigh:
          typeof rawMeta.fiftyTwoWeekHigh === 'number' ? rawMeta.fiftyTwoWeekHigh : null,
        fiftyTwoWeekLow:
          typeof rawMeta.fiftyTwoWeekLow === 'number' ? rawMeta.fiftyTwoWeekLow : null,
        ...summary,
      },
      bars,
    },
  };
}

function mapYahooQuoteType(quoteType: string, symbol: string): CatalogInstrument['type'] | null {
  const qt = quoteType.toUpperCase();
  const sym = symbol.toUpperCase();
  if (qt === 'EQUITY' || qt === 'ETF') return 'STOCK';
  if (qt === 'CRYPTOCURRENCY' || sym.endsWith('-USD') || sym.endsWith('-IDR')) return 'CRYPTO';
  if (qt === 'CURRENCY' || sym.endsWith('=X')) return 'FOREX';
  if (qt === 'INDEX' || sym.startsWith('^')) return 'INDEX';
  return null;
}

function inferCountryFromYahoo(symbol: string, exchange: string): string | undefined {
  const sym = symbol.toUpperCase();
  const ex = exchange.toUpperCase();
  if (sym.endsWith('.JK') || ex === 'JKT' || ex === 'IDX') return 'ID';
  if (sym.endsWith('.SI') || ex === 'SES') return 'SG';
  if (sym.endsWith('.T') || ex === 'JPX') return 'JP';
  if (sym.endsWith('.HK') || ex === 'HKG') return 'HK';
  if (sym.endsWith('.L') || ex === 'LSE') return 'GB';
  if (sym.endsWith('.DE') || ex === 'GER') return 'DE';
  if (sym.endsWith('.AX') || ex === 'ASX') return 'AU';
  if (sym.endsWith('.NS') || sym.endsWith('.BO')) return 'IN';
  if (sym.endsWith('.TO') || ex === 'TOR') return 'CA';
  if (sym.endsWith('.KS') || ex === 'KSC') return 'KR';
  if (!sym.includes('.') && !sym.includes('-') && !sym.includes('=')) return 'US';
  return undefined;
}

export function createApiApp(): express.Express {
  const app = express();
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/chart', async (req, res) => {
    const rawSymbol = req.query.symbol ?? 'BBCA.JK';
    const symbol = normalizeAndValidateSymbol(rawSymbol);
    if (!symbol) {
      res.status(400).json({ error: 'Invalid ticker symbol format.' });
      return;
    }

    const tfParam = typeof req.query.tf === 'string' ? req.query.tf.trim() : '1d';
    const cfg = getTimeframeByKey(tfParam);
    if (!cfg) {
      res.status(400).json({ error: `Unsupported timeframe "${tfParam}".` });
      return;
    }

    const latestOnly = req.query.latestOnly === '1' || req.query.latestOnly === 'true';
    const rawBefore = typeof req.query.before === 'string' ? req.query.before.trim() : '';
    let beforeCursorMs: number | null = null;
    if (rawBefore.length > 0 && !latestOnly) {
      const parsedBefore = Number(rawBefore);
      if (!Number.isFinite(parsedBefore) || parsedBefore <= 0) {
        res.status(400).json({ error: 'Invalid "before" cursor timestamp.' });
        return;
      }
      beforeCursorMs = Math.trunc(parsedBefore);
    }

    const cacheKey = latestOnly
      ? `${symbol}:${cfg.key}:latest`
      : beforeCursorMs !== null
        ? `${symbol}:${cfg.key}:before:${beforeCursorMs}`
        : `${symbol}:${cfg.key}:init`;
    const cached = getCached<Record<string, unknown>>(chartCache, cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    try {
      const nowMs = Date.now();

      if (latestOnly) {
        const latestDaysCap = cfg.group === 'minutes' ? 2 : cfg.group === 'hours' ? 7 : 30;
        const effectiveDaysBack =
          cfg.daysBack !== null ? Math.min(cfg.daysBack, latestDaysCap) : latestDaysCap;
        const windows = buildFetchWindows(nowMs, effectiveDaysBack);

        const { payloadBase } = await fetchChartPayloadWithQuote({ symbol, cfg, windows });
        setCached(chartCache, cacheKey, payloadBase, 10_000);
        res.json(payloadBase);
        return;
      }

      const knownFirstTradeMs = firstTradeCache.get(symbol) ?? null;

      if (beforeCursorMs !== null) {
        let cursor: number | null = beforeCursorMs;
        let finalBars: OHLCVBar[] = [];
        let hasMore = false;
        let nextCursor: number | null = null;
        let resolvedFirstTradeMs = knownFirstTradeMs;
        let canonicalSymbol = symbol;

        const maxEmptyJumps = cfg.daysBack === null ? 2 : 3;
        for (let attempt = 0; attempt < maxEmptyJumps && cursor !== null; attempt++) {
          const plan = computePaginatedRange({
            cfg,
            nowMs,
            beforeCursorMs: cursor,
            firstTradeMs: resolvedFirstTradeMs,
          });

          if (plan.exhausted) {
            hasMore = false;
            nextCursor = null;
            break;
          }

          const windows = buildFetchWindowsForRange(
            plan.fetchStartMs,
            plan.fetchEndMs,
            cfg.maxDaysPerRequest
          );

          try {
            const chartResult = await fetchYahooWindows(symbol, cfg.yfInterval, windows);
            if (typeof chartResult.meta.symbol === 'string') {
              canonicalSymbol = chartResult.meta.symbol;
            }
            const parsedFirst = parseFirstTradeDateMs(chartResult.meta.firstTradeDate);
            if (parsedFirst !== null) {
              resolvedFirstTradeMs = parsedFirst;
              firstTradeCache.set(symbol, parsedFirst);
            }

            let bars = normalizeQuotesToBars(chartResult.quotes);
            if (cfg.resampleMs) {
              bars = resampleBars(bars, cfg.resampleMs);
            }
            bars = bars.filter(
              (b) => b.timestamp >= plan.windowStartMs && b.timestamp < plan.windowEndMs
            );

            const hitEarliest =
              !plan.hasMoreBeforeStart ||
              hasReachedEarliestHistory({
                windowStartMs: plan.windowStartMs,
                cfg,
                nowMs,
                firstTradeMs: resolvedFirstTradeMs,
              });

            if (bars.length > 0 || hitEarliest) {
              finalBars = bars;
              hasMore = !hitEarliest;
              nextCursor = hitEarliest ? null : plan.nextCursor;
              break;
            }

            cursor = plan.nextCursor;
            hasMore = !hitEarliest && cursor !== null;
            nextCursor = hasMore ? cursor : null;
          } catch (rangeErr) {
            if (isYahooRangeExhaustedError(rangeErr)) {
              hasMore = false;
              nextCursor = null;
              break;
            }
            throw rangeErr;
          }
        }

        if (
          finalBars.length === 0 &&
          hasMore &&
          cfg.daysBack === null &&
          resolvedFirstTradeMs !== null &&
          nextCursor !== null &&
          nextCursor > resolvedFirstTradeMs
        ) {
          try {
            const sweepStart = resolvedFirstTradeMs - 30 * 24 * 60 * 60 * 1000;
            const sweepRes = await fetchYahooWindows(symbol, cfg.yfInterval, [
              { period1: new Date(sweepStart), period2: new Date(nextCursor) },
            ]);
            let sweepBars = normalizeQuotesToBars(sweepRes.quotes);
            if (cfg.resampleMs) {
              sweepBars = resampleBars(sweepBars, cfg.resampleMs);
            }
            sweepBars = sweepBars.filter((b) => b.timestamp < nextCursor!);
            finalBars = sweepBars;
          } catch (sweepErr) {
            if (!isYahooRangeExhaustedError(sweepErr)) {
              throw sweepErr;
            }
          }
          hasMore = false;
          nextCursor = null;
        }

        const historyPayload = {
          symbol: canonicalSymbol,
          tf: cfg.key,
          bars: finalBars,
          pagination: {
            hasMore,
            nextCursor,
            firstTradeDate: resolvedFirstTradeMs,
          },
        };

        setCached(chartCache, cacheKey, historyPayload, 5 * 60_000);
        res.json(historyPayload);
        return;
      }

      const initPlan = computePaginatedRange({
        cfg,
        nowMs,
        beforeCursorMs: null,
        firstTradeMs: knownFirstTradeMs,
      });
      const windows = buildFetchWindowsForRange(
        initPlan.fetchStartMs,
        initPlan.fetchEndMs,
        cfg.maxDaysPerRequest
      );

      const { parsedFirstTradeMs, payloadBase } = await fetchChartPayloadWithQuote({
        symbol,
        cfg,
        windows,
        minBarTimestampMs: initPlan.windowStartMs,
      });

      const effectiveFirstTrade = parsedFirstTradeMs ?? knownFirstTradeMs;
      const hitEarliestOnInit =
        !initPlan.hasMoreBeforeStart ||
        hasReachedEarliestHistory({
          windowStartMs: initPlan.windowStartMs,
          cfg,
          nowMs,
          firstTradeMs: effectiveFirstTrade,
        });

      const payload = {
        ...payloadBase,
        pagination: {
          hasMore: !hitEarliestOnInit,
          nextCursor: hitEarliestOnInit ? null : initPlan.nextCursor,
          firstTradeDate: effectiveFirstTrade,
        },
      };

      const ttlMs =
        windows.length > 1
          ? 45_000
          : cfg.group === 'minutes'
            ? 15_000
            : cfg.group === 'hours'
              ? 20_000
              : 45_000;
      setCached(chartCache, cacheKey, payload, ttlMs);
      res.json(payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to fetch market data';
      console.error(`[Yahoo Finance Error] ${symbol} (${cfg.key}):`, msg);
      res.status(502).json({
        error: `Could not load ${symbol} (${cfg.label}) from Yahoo Finance.`,
      });
    }
  });

  app.get('/api/instruments', async (req, res) => {
    const rawCategory = typeof req.query.category === 'string' ? req.query.category : 'all';
    const category: SearchCategoryFilter =
      rawCategory === 'stocks' ||
      rawCategory === 'crypto' ||
      rawCategory === 'forex' ||
      rawCategory === 'indices'
        ? rawCategory
        : 'all';
    const country = typeof req.query.country === 'string' ? req.query.country.trim() : null;
    const stockType =
      typeof req.query.stockType === 'string'
        ? (req.query.stockType.trim() as StockTypeFilter)
        : 'all';
    const sector = typeof req.query.sector === 'string' ? req.query.sector.trim() : null;
    const rawQuery = typeof req.query.q === 'string' ? req.query.q : '';
    const cleanedQ = rawQuery.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, 40);
    const offset = Math.max(0, Number.parseInt(String(req.query.offset ?? '0'), 10) || 0);
    const limit = Math.max(
      10,
      Math.min(100, Number.parseInt(String(req.query.limit ?? '50'), 10) || 50)
    );

    const catalogPage = queryInstrumentCatalog({
      category,
      country,
      stockType,
      sector,
      q: cleanedQ,
      offset,
      limit,
    });

    if (cleanedQ && offset === 0) {
      let liveMatches = getCached<CatalogInstrument[]>(searchCache, cleanedQ.toLowerCase()) ?? null;
      if (!liveMatches) {
        try {
          const result = await yahooFinance.search(cleanedQ, { quotesCount: 25, newsCount: 0 });
          const rawQuotes = (result?.quotes ?? []) as unknown as Array<Record<string, unknown>>;
          liveMatches = rawQuotes
            .filter((item) => Boolean(item && typeof item === 'object' && item.symbol))
            .map((item): CatalogInstrument | null => {
              const sym = String(item.symbol);
              const mappedType = mapYahooQuoteType(String(item.quoteType || ''), sym);
              if (!mappedType) return null;
              const exch = String(item.exchDisp || item.exchange || '');
              return {
                symbol: sym,
                shortname: String(item.shortname || item.longname || sym),
                exchange: exch,
                type: mappedType,
                country: inferCountryFromYahoo(sym, exch),
                stockType: mappedType === 'STOCK' ? 'Common stock' : undefined,
              };
            })
            .filter((x): x is CatalogInstrument => x !== null);
          setCached(searchCache, cleanedQ.toLowerCase(), liveMatches, 60_000);
        } catch {
          liveMatches = [];
        }
      }

      const existing = new Set(catalogPage.items.map((i) => i.symbol.toUpperCase()));
      const extra = liveMatches.filter((item) => {
        if (existing.has(item.symbol.toUpperCase())) return false;
        if (category === 'stocks' && item.type !== 'STOCK') return false;
        if (category === 'crypto' && item.type !== 'CRYPTO') return false;
        if (category === 'forex' && item.type !== 'FOREX') return false;
        if (category === 'indices' && item.type !== 'INDEX') return false;
        if (category === 'stocks' && country && country !== 'all' && item.country !== country) {
          return false;
        }
        return true;
      });

      const merged = [...catalogPage.items, ...extra];
      res.json({
        items: merged,
        total: catalogPage.total + extra.length,
        offset,
        limit,
        hasMore: catalogPage.hasMore,
      });
      return;
    }

    if (
      !cleanedQ &&
      category === 'stocks' &&
      !catalogPage.hasMore &&
      (!sector || sector === 'All sectors') &&
      (!stockType || stockType === 'all' || stockType === 'Common stock') &&
      (!country || country === 'all' || country === 'US')
    ) {
      const screenerOffset = offset - catalogPage.total;
      const scrIds = [
        'most_actives',
        'day_gainers',
        'undervalued_large_caps',
        'growth_technology_stocks',
      ] as const;
      const batchIndex = Math.max(0, Math.floor(Math.max(0, screenerOffset) / 50));
      if (batchIndex < scrIds.length) {
        const scrId = scrIds[batchIndex];
        let extraStocks = getCached<CatalogInstrument[]>(screenerCache, scrId) ?? null;
        if (!extraStocks) {
          try {
            const scr = await yahooFinance.screener({ scrIds: scrId, count: 50 });
            const quotes =
              (scr as unknown as { quotes?: Array<Record<string, unknown>> })?.quotes ?? [];
            extraStocks = quotes
              .filter((q) => Boolean(q?.symbol))
              .map((q) => ({
                symbol: String(q.symbol),
                shortname: String(q.shortName || q.longName || q.symbol),
                exchange: String(q.fullExchangeName || q.exchange || 'NASDAQ / NYSE'),
                type: 'STOCK' as const,
                country: 'US',
                stockType: 'Common stock' as const,
              }));
            setCached(screenerCache, scrId, extraStocks, 5 * 60_000);
          } catch {
            extraStocks = [];
          }
        }
        const seen = new Set(catalogPage.items.map((i) => i.symbol.toUpperCase()));
        const appended = extraStocks.filter((s) => !seen.has(s.symbol.toUpperCase()));
        const combined = [...catalogPage.items, ...appended];
        res.json({
          items: combined,
          total: catalogPage.total + (batchIndex + 1) * 50,
          offset,
          limit,
          hasMore: batchIndex + 1 < scrIds.length && appended.length > 0,
        });
        return;
      }
    }

    res.json(catalogPage);
  });

  app.get('/api/search', async (req, res) => {
    const rawQuery = typeof req.query.q === 'string' ? req.query.q : '';
    const cleaned = rawQuery.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, 40);
    if (!cleaned) {
      res.json({ quotes: [] });
      return;
    }

    try {
      const result = await yahooFinance.search(cleaned, {
        quotesCount: 12,
        newsCount: 0,
      });

      const rawQuotes = (result?.quotes ?? []) as unknown as Array<Record<string, unknown>>;
      const quotes = rawQuotes
        .filter((item) => Boolean(item && typeof item === 'object' && item.symbol))
        .map((item) => ({
          symbol: String(item.symbol),
          shortname: String(item.shortname || item.longname || item.symbol),
          exchange: String(item.exchDisp || item.exchange || ''),
          type: String(item.quoteType || ''),
        }));

      res.json({ quotes });
    } catch (err) {
      console.error('[Yahoo Search Error]:', err instanceof Error ? err.message : err);
      res.status(502).json({ error: 'Search service temporarily unavailable.', quotes: [] });
    }
  });

  app.get('/api/quotes', async (req, res) => {
    const rawList = typeof req.query.symbols === 'string' ? req.query.symbols : '';
    const parsed = rawList
      .split(',')
      .map((s) => normalizeAndValidateSymbol(s))
      .filter((s): s is string => s !== null);

    const uniqueSymbols = Array.from(new Set(parsed)).slice(0, 50);
    if (uniqueSymbols.length === 0) {
      res.json({ quotes: [] });
      return;
    }

    const cacheKey = uniqueSymbols.join(',');
    const cached = getCached<Record<string, unknown>>(quoteCache, cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    try {
      const raw = await yahooFinance.quote(uniqueSymbols);
      const list = (Array.isArray(raw) ? raw : [raw]) as unknown as Array<Record<string, unknown>>;

      const quotes = list
        .filter((item) => Boolean(item && typeof item === 'object' && item.symbol))
        .map((item) => ({
          symbol: String(item.symbol),
          shortName: String(item.shortName || item.longName || item.symbol),
          price: typeof item.regularMarketPrice === 'number' ? item.regularMarketPrice : 0,
          change: typeof item.regularMarketChange === 'number' ? item.regularMarketChange : 0,
          changePercent:
            typeof item.regularMarketChangePercent === 'number'
              ? item.regularMarketChangePercent
              : 0,
          currency: typeof item.currency === 'string' ? item.currency : 'USD',
          volume:
            typeof item.regularMarketVolume === 'number' ? item.regularMarketVolume : undefined,
          exchange:
            typeof item.fullExchangeName === 'string'
              ? item.fullExchangeName
              : typeof item.exchange === 'string'
                ? item.exchange
                : '',
        }));

      const payload = { quotes };
      setCached(quoteCache, cacheKey, payload, 20_000);
      res.json(payload);
    } catch (err) {
      console.error('[Yahoo Quotes Error]:', err instanceof Error ? err.message : err);
      res.status(502).json({ error: 'Unable to fetch watchlist quotes.', quotes: [] });
    }
  });

  app.get('/api/screener', async (req, res) => {
    const rawMarket = typeof req.query.market === 'string' ? req.query.market.toUpperCase() : 'ID';
    const market: ScreenerMarket =
      rawMarket === 'US' ||
      rawMarket === 'GLOBAL' ||
      rawMarket === 'CRYPTO' ||
      rawMarket === 'WATCHLIST'
        ? rawMarket
        : 'ID';

    const tf = normalizeScreenerTimeframe(req.query.tf);
    const tfCfg = getTimeframeByKey(tf) ?? getTimeframeByKey('1d')!;
    const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';

    let universe: CatalogInstrument[];
    if (market === 'WATCHLIST') {
      const rawSymbols = typeof req.query.symbols === 'string' ? req.query.symbols : '';
      const validSymbols = Array.from(
        new Set(
          rawSymbols
            .split(',')
            .map((s) => normalizeAndValidateSymbol(s))
            .filter((s): s is string => s !== null)
        )
      ).slice(0, 100);

      const catalogBySym = new Map(INSTRUMENT_CATALOG.map((item) => [item.symbol.toUpperCase(), item]));
      universe = validSymbols.map(
        (sym) =>
          catalogBySym.get(sym.toUpperCase()) ?? {
            symbol: sym,
            shortname: sym,
            exchange: '',
            type: 'STOCK',
            country: inferCountryFromYahoo(sym, ''),
          }
      );
    } else if (market === 'CRYPTO') {
      universe = INSTRUMENT_CATALOG.filter((i) => i.type === 'CRYPTO');
    } else if (market === 'GLOBAL') {
      universe = INSTRUMENT_CATALOG.filter(
        (i) => i.type === 'STOCK' && i.country !== 'ID' && i.country !== 'US'
      );
    } else if (market === 'US') {
      universe = INSTRUMENT_CATALOG.filter((i) => i.type === 'STOCK' && i.country === 'US');
    } else {
      universe = INSTRUMENT_CATALOG.filter((i) => i.type === 'STOCK' && i.country === 'ID');
    }

    if (universe.length === 0) {
      res.json({
        market,
        tf,
        rows: [],
        scannedAt: Date.now(),
        totalUniverse: 0,
        technicalReadyCount: 0,
      });
      return;
    }

    const payloadCacheKey =
      market === 'WATCHLIST'
        ? `WATCHLIST:${tf}:${universe.map((u) => u.symbol).join(',')}`
        : `${market}:${tf}`;
    if (!forceRefresh) {
      const cachedPayload = getCached<Record<string, unknown>>(screenerPayloadCache, payloadCacheKey);
      if (cachedPayload) {
        res.json(cachedPayload);
        return;
      }
    }

    try {
      // 1. Fast batch Yahoo Finance quote lookup (chunks of 50)
      const symbolChunks: string[][] = [];
      for (let i = 0; i < universe.length; i += 50) {
        symbolChunks.push(universe.slice(i, i + 50).map((u) => u.symbol));
      }
      const quoteSettled = await Promise.allSettled(
        symbolChunks.map((chunk) => yahooFinance.quote(chunk))
      );
      const quoteMap = new Map<string, Record<string, unknown>>();
      for (const item of quoteSettled) {
        if (item.status !== 'fulfilled') continue;
        const arr = Array.isArray(item.value) ? item.value : [item.value];
        for (const q of arr) {
          const rec = q as unknown as Record<string, unknown>;
          if (rec && typeof rec.symbol === 'string') {
            quoteMap.set(rec.symbol.toUpperCase(), rec);
          }
        }
      }

      // 2. Concurrent OHLCV technical snapshot computation (EMA 9/20/50/200, RSI 14, MACD, Perf)
      const nowMs = Date.now();
      const spec = SCREENER_FETCH_SPEC[tf];
      const windows = buildFetchWindows(nowMs, spec.lookbackDays, spec.maxDaysPerRequest);

      const techMap = new Map<string, ScreenerTechnicalSnapshot>();
      const pendingSymbols: string[] = [];

      for (const item of universe) {
        const techKey = `${item.symbol.toUpperCase()}:${tf}`;
        if (!forceRefresh) {
          const cachedTech = getCached<ScreenerTechnicalSnapshot>(screenerTechCache, techKey);
          if (cachedTech) {
            techMap.set(item.symbol.toUpperCase(), cachedTech);
            continue;
          }
        }
        pendingSymbols.push(item.symbol);
      }

      const fetchTechnicalForSymbol = async (sym: string): Promise<void> => {
        const keyUpper = sym.toUpperCase();
        const q = quoteMap.get(keyUpper);
        const livePrice = typeof q?.regularMarketPrice === 'number' ? q.regularMarketPrice : null;
        const sma50Fallback =
          tf === '1d' && typeof q?.fiftyDayAverage === 'number' ? q.fiftyDayAverage : null;
        const sma200Fallback =
          tf === '1d' && typeof q?.twoHundredDayAverage === 'number' ? q.twoHundredDayAverage : null;

        try {
          const chartRes = await Promise.race([
            fetchYahooWindows(sym, tfCfg.yfInterval, windows),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Screener chart timeout')), 7000)
            ),
          ]);

          let bars = normalizeQuotesToBars(chartRes.quotes);
          if (tfCfg.resampleMs) {
            bars = resampleBars(bars, tfCfg.resampleMs);
          }

          const tech = computeScreenerTechnicals(bars, {
            livePrice,
            sma50Fallback,
            sma200Fallback,
          });
          techMap.set(keyUpper, tech);
          setCached(screenerTechCache, `${keyUpper}:${tf}`, tech, spec.ttlMs);
        } catch {
          const fallback = computeScreenerTechnicals([], {
            sma50Fallback,
            sma200Fallback,
          });
          techMap.set(keyUpper, fallback);
        }
      };

      // Bounded concurrency pool (12 workers) keeps scan fast without overwhelming Yahoo or server
      const workerCount = Math.min(12, pendingSymbols.length);
      let cursorIdx = 0;
      await Promise.all(
        Array.from({ length: workerCount }, async () => {
          while (cursorIdx < pendingSymbols.length) {
            const sym = pendingSymbols[cursorIdx++];
            await fetchTechnicalForSymbol(sym);
          }
        })
      );

      const num = (v: unknown): number | null =>
        typeof v === 'number' && Number.isFinite(v) ? v : null;

      const rows: ScreenerRow[] = [];
      let technicalReadyCount = 0;

      for (const item of universe) {
        const keyUpper = item.symbol.toUpperCase();
        const q = quoteMap.get(keyUpper);
        const tech =
          techMap.get(keyUpper) ??
          computeScreenerTechnicals([], {
            sma50Fallback: tf === '1d' ? num(q?.fiftyDayAverage) : null,
            sma200Fallback: tf === '1d' ? num(q?.twoHundredDayAverage) : null,
          });
        if (tech.ema9 !== null) technicalReadyCount++;

        const price = num(q?.regularMarketPrice) ?? 0;
        const change = num(q?.regularMarketChange) ?? 0;
        const changePercent = num(q?.regularMarketChangePercent) ?? 0;
        if (price <= 0 && !q) continue;

        const volume = num(q?.regularMarketVolume);
        const avgVolume10d = num(q?.averageDailyVolume10Day);
        const avgVolume3m = num(q?.averageDailyVolume3Month);
        const volBaseline = avgVolume10d && avgVolume10d > 0 ? avgVolume10d : avgVolume3m;
        const relVolume =
          volume !== null && volBaseline !== null && volBaseline > 0
            ? Math.round((volume / volBaseline) * 100) / 100
            : null;

        const rawTrailingYield = num(q?.trailingAnnualDividendYield);
        const rawDivYield = num(q?.dividendYield);
        const divYieldPct =
          rawTrailingYield !== null
            ? Math.round(rawTrailingYield * 10000) / 100
            : rawDivYield !== null
              ? Math.round(rawDivYield * 100) / 100
              : null;

        const high52 = num(q?.fiftyTwoWeekHigh);
        const low52 = num(q?.fiftyTwoWeekLow);
        const fiftyTwoWeekRangePos =
          high52 !== null && low52 !== null && high52 > low52 && price > 0
            ? Math.max(0, Math.min(100, Math.round(((price - low52) / (high52 - low52)) * 1000) / 10))
            : null;

        rows.push({
          ...tech,
          symbol: item.symbol,
          shortName:
            (typeof q?.shortName === 'string' && q.shortName) ||
            (typeof q?.longName === 'string' && q.longName) ||
            item.shortname,
          exchange:
            (typeof q?.fullExchangeName === 'string' && q.fullExchangeName) ||
            (typeof q?.exchange === 'string' && q.exchange) ||
            item.exchange,
          country: item.country,
          sector: item.sector,
          currency: typeof q?.currency === 'string' ? q.currency : item.country === 'ID' ? 'IDR' : 'USD',
          price,
          change,
          changePercent,
          volume,
          avgVolume10d,
          avgVolume3m,
          relVolume,
          marketCap: num(q?.marketCap),
          trailingPE: num(q?.trailingPE),
          forwardPE: num(q?.forwardPE),
          priceToBook: num(q?.priceToBook),
          epsTTM: num(q?.epsTrailingTwelveMonths),
          epsForward: num(q?.epsForward),
          bookValue: num(q?.bookValue),
          divYieldPct,
          divRate: num(q?.trailingAnnualDividendRate),
          beta: num(q?.beta),
          analystRating: typeof q?.averageAnalystRating === 'string' ? q.averageAnalystRating : null,
          fiftyTwoWeekLow: low52,
          fiftyTwoWeekHigh: high52,
          fiftyTwoWeekRangePos,
        });
      }

      const payload = {
        market,
        tf,
        rows,
        scannedAt: Date.now(),
        totalUniverse: universe.length,
        technicalReadyCount,
      };
      setCached(screenerPayloadCache, payloadCacheKey, payload, 60_000);
      res.json(payload);
    } catch (err) {
      console.error('[Yahoo Screener Error]:', err instanceof Error ? err.message : err);
      res.status(502).json({ error: 'Unable to run stock screener scan right now.' });
    }
  });

  return app;
}

const apiApp = createApiApp();
export default apiApp;
