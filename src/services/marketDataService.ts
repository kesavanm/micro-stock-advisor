import type { StockPrediction, NewsItem, StockCategory, SentimentRating } from '../types/stock';

const DEFAULT_FINNHUB_KEY = import.meta.env.VITE_FINNHUB_API_KEY || '';

// Configurable cache TTL (defaults to 2 hours)
const DEFAULT_TTL_HOURS = Number(import.meta.env.VITE_NEWS_CACHE_TTL_HOURS) || 2;
const CACHE_TTL_MS = Math.max(15, DEFAULT_TTL_HOURS * 60) * 60 * 1000;
const CACHE_STORAGE_KEY = 'micro_advisor_trending_cache';

export interface TrendingCacheData {
  timestamp: number;
  trendingTickers: string[];
  suggestions: string[];
}

export function getCachedTrending(): TrendingCacheData | null {
  try {
    const raw = localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return null;
    const parsed: TrendingCacheData = JSON.parse(raw);
    if (!parsed || !parsed.timestamp || !Array.isArray(parsed.trendingTickers)) {
      return null;
    }
    const age = Date.now() - parsed.timestamp;
    if (age < CACHE_TTL_MS) {
      return parsed;
    }
  } catch (err) {
    console.warn('Failed reading trending cache from localStorage:', err);
  }
  return null;
}

export function setCachedTrending(trendingTickers: string[], suggestions: string[]): void {
  try {
    const payload: TrendingCacheData = {
      timestamp: Date.now(),
      trendingTickers: Array.from(new Set(trendingTickers.map((t) => t.toUpperCase().trim()).filter(Boolean))),
      suggestions: Array.from(new Set(suggestions.map((t) => t.toUpperCase().trim()).filter(Boolean))),
    };
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Failed saving trending cache to localStorage:', err);
  }
}

export async function loadInitialTrendingCache(): Promise<TrendingCacheData | null> {
  // 1. Check local storage cache first (< 2 hours old)
  const local = getCachedTrending();
  if (local && local.trendingTickers.length > 0) {
    return local;
  }

  // 2. Fetch server-served 2-hour morning news cache
  try {
    const basePath = import.meta.env.BASE_URL || '/advisor/';
    const cacheUrl = `${basePath.endsWith('/') ? basePath : basePath + '/'}trending-cache.json?v=${Date.now()}`;
    const res = await fetch(cacheUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.trendingTickers) && data.trendingTickers.length > 0) {
        setCachedTrending(data.trendingTickers, data.suggestions || []);
        return {
          timestamp: data.timestamp || Date.now(),
          trendingTickers: data.trendingTickers,
          suggestions: data.suggestions || [],
        };
      }
    }
  } catch (err) {
    console.warn('Could not load trending-cache.json from server:', err);
  }

  return null;
}

export function getSavedWatchlist(): string[] {
  try {
    const saved = localStorage.getItem('micro_advisor_watchlist');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((t) => String(t).toUpperCase().trim()).filter(Boolean);
      }
    }
  } catch (err) {
    console.warn('Failed to parse saved watchlist from localStorage:', err);
  }

  const envTickers = import.meta.env.VITE_DEFAULT_TICKERS;
  if (envTickers && typeof envTickers === 'string') {
    const list = envTickers.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean);
    if (list.length > 0) return list;
  }

  const cached = getCachedTrending();
  if (cached && cached.trendingTickers.length > 0) {
    return cached.trendingTickers;
  }

  return [];
}

export function saveWatchlist(tickers: string[]): void {
  try {
    const sanitized = Array.from(new Set(tickers.map((t) => t.toUpperCase().trim()).filter(Boolean)));
    localStorage.setItem('micro_advisor_watchlist', JSON.stringify(sanitized));
  } catch (err) {
    console.warn('Failed to save watchlist to localStorage:', err);
  }
}

export function resetSavedWatchlist(): string[] {
  try {
    localStorage.removeItem('micro_advisor_watchlist');
  } catch (err) {
    console.warn('Failed to reset watchlist in localStorage:', err);
  }

  const cached = getCachedTrending();
  if (cached && cached.trendingTickers.length > 0) {
    return cached.trendingTickers;
  }

  const envTickers = import.meta.env.VITE_DEFAULT_TICKERS;
  if (envTickers && typeof envTickers === 'string') {
    const list = envTickers.split(',').map((t) => t.trim().toUpperCase()).filter(Boolean);
    if (list.length > 0) return list;
  }

  return [];
}

interface FinnhubQuote {
  c: number;  // Current price
  d: number;  // Change
  dp: number; // Percent change
  h: number;  // High price of the day
  l: number;  // Low price of the day
  o: number;  // Open price of the day
  pc: number; // Previous close price
  t: number;  // Timestamp
}

interface FinnhubProfile {
  name?: string;
  ticker?: string;
  finnhubIndustry?: string;
}

interface FinnhubNewsArticle {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

// In-memory cache for company profiles to avoid redundant network calls
const profileCache = new Map<string, { name: string; category: StockCategory }>();

function mapIndustryToCategory(industry?: string): StockCategory {
  if (!industry) return 'Tech';
  const lower = industry.toLowerCase();
  if (lower.includes('auto') || lower.includes('motor') || lower.includes('vehicle')) return 'EV & Auto';
  if (lower.includes('bio') || lower.includes('pharma') || lower.includes('health')) return 'Biotech';
  if (lower.includes('finan') || lower.includes('bank') || lower.includes('invest') || lower.includes('crypto')) return 'AI & Fintech';
  if (lower.includes('retail') || lower.includes('consumer') || lower.includes('beverage') || lower.includes('food')) return 'Consumer';
  if (lower.includes('tech') || lower.includes('semiconductor') || lower.includes('software')) return 'Tech';
  return 'General';
}

async function fetchCompanyProfile(ticker: string, apiKey: string): Promise<{ name: string; category: StockCategory }> {
  const cached = profileCache.get(ticker);
  if (cached) return cached;

  try {
    const res = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${ticker}&token=${apiKey}`);
    if (res.ok) {
      const data: FinnhubProfile = await res.json();
      if (data && data.name) {
        const info = {
          name: data.name,
          category: mapIndustryToCategory(data.finnhubIndustry),
        };
        profileCache.set(ticker, info);
        return info;
      }
    }
  } catch (err) {
    console.warn(`Could not load profile for ${ticker}:`, err);
  }

  const fallback = { name: ticker, category: 'Tech' as StockCategory };
  profileCache.set(ticker, fallback);
  return fallback;
}

// NLP financial lexicon for market news sentiment scoring
const BULLISH_TERMS = [
  'surge', 'jump', 'gain', 'profit', 'upgrade', 'beat', 'record', 'outperform',
  'growth', 'rise', 'rally', 'boost', 'bull', 'advance', 'expand', 'expansion',
  'contract', 'partnership', 'partner', 'deal', 'agreement', 'dividend', 'launch',
  'accelerate', 'milestone', 'optimistic', 'strong', 'higher', 'positive', 'win'
];

const BEARISH_TERMS = [
  'drop', 'fall', 'sink', 'plunge', 'slump', 'loss', 'miss', 'delay', 'cut',
  'downgrade', 'warning', 'sanction', 'crash', 'probe', 'investigation', 'lawsuit',
  'decline', 'threat', 'weak', 'bear', 'slashing', 'risk', 'negative', 'tariff', 'halt'
];

export function analyzeNewsSentiment(text: string): { score: number; rating: SentimentRating } {
  const lower = text.toLowerCase();
  let bullCount = 0;
  let bearCount = 0;

  for (const word of BULLISH_TERMS) {
    if (lower.includes(word)) bullCount++;
  }
  for (const word of BEARISH_TERMS) {
    if (lower.includes(word)) bearCount++;
  }

  if (bullCount === 0 && bearCount === 0) {
    return { score: 65, rating: '+' };
  }

  const rawScore = 50 + (bullCount * 12) - (bearCount * 15);
  const score = Math.max(15, Math.min(98, Math.round(rawScore)));
  const rating: SentimentRating = score >= 55 ? '+' : score <= 45 ? '-' : '0';

  return { score, rating };
}

export function classifyCatalystType(headline: string, summary: string): NewsItem['catalystType'] {
  const text = `${headline} ${summary}`.toLowerCase();
  if (text.includes('earnings') || text.includes('revenue') || text.includes('eps') || text.includes('profit') || text.includes('quarter') || text.includes('beat')) {
    return 'Earnings Beat';
  }
  if (text.includes('fda') || text.includes('approval') || text.includes('clinical') || text.includes('trial') || text.includes('drug')) {
    return 'FDA Approval';
  }
  if (text.includes('upgrade') || text.includes('price target') || text.includes('analyst') || text.includes('outperform') || text.includes('rating')) {
    return 'Analyst Upgrade';
  }
  if (text.includes('partner') || text.includes('deal') || text.includes('contract') || text.includes('acquisition') || text.includes('agreement') || text.includes('alliance')) {
    return 'Partnership';
  }
  return 'Retail Momentum';
}

function formatPublishedTime(timestampSec: number): string {
  if (!timestampSec) return 'Just now';
  const date = new Date(timestampSec * 1000);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York',
  }) + ' EST';
}

export async function fetchLiveNews(apiKey: string = DEFAULT_FINNHUB_KEY): Promise<NewsItem[]> {
  if (!apiKey) return [];

  try {
    const res = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${apiKey}`);
    if (!res.ok) {
      throw new Error(`Finnhub news API error: ${res.status}`);
    }
    const articles: FinnhubNewsArticle[] = await res.json();
    if (!Array.isArray(articles) || articles.length === 0) {
      return [];
    }

    return articles.slice(0, 30).map((art, idx) => {
      const { score, rating } = analyzeNewsSentiment(`${art.headline} ${art.summary}`);
      const catalystType = classifyCatalystType(art.headline, art.summary);
      const ticker = art.related && art.related.trim().length > 0 && art.related.length <= 5
        ? art.related.toUpperCase()
        : 'MARKET';

      return {
        id: `finnhub-news-${art.id || idx}`,
        ticker,
        headline: art.headline,
        source: art.source || 'Financial Wire',
        publishedTime: formatPublishedTime(art.datetime),
        sentimentRating: rating,
        sentimentScore: score,
        summary: art.summary || art.headline,
        catalystType,
        url: art.url,
      };
    });
  } catch (err) {
    console.warn('Failed to fetch real-time news from Finnhub:', err);
    return [];
  }
}

export async function fetchLiveStockQuotes(
  apiKey: string = DEFAULT_FINNHUB_KEY,
  tickersToFetch?: string[],
  liveNews: NewsItem[] = []
): Promise<StockPrediction[]> {
  if (!apiKey) return [];

  const tickers = tickersToFetch && tickersToFetch.length > 0
    ? tickersToFetch
    : getSavedWatchlist();

  if (!tickers || tickers.length === 0) {
    return [];
  }

  const stockPromises = tickers.map(async (tickerSymbol) => {
    const ticker = tickerSymbol.toUpperCase().trim();
    if (!ticker) return null;

    try {
      const [quoteRes, profile] = await Promise.all([
        fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`),
        fetchCompanyProfile(ticker, apiKey),
      ]);

      if (!quoteRes.ok) {
        throw new Error(`Quote failed with HTTP ${quoteRes.status}`);
      }
      const quote: FinnhubQuote = await quoteRes.json();

      if (!quote || typeof quote.c !== 'number' || quote.c <= 0) {
        throw new Error(`Invalid quote payload for ${ticker}`);
      }

      const currentPrice = Number(quote.c.toFixed(2));
      const dayOpen = quote.o > 0 ? Number(quote.o.toFixed(2)) : currentPrice;
      const dayHigh = quote.h > 0 ? Number(quote.h.toFixed(2)) : currentPrice;
      const dayLow = quote.l > 0 ? Number(quote.l.toFixed(2)) : currentPrice;
      const changePercent = typeof quote.dp === 'number' ? Number(quote.dp.toFixed(2)) : 0;

      // Find if this ticker is explicitly mentioned in any live morning news article
      const matchingNews = liveNews.find((n) => n.ticker.toUpperCase() === ticker);

      let sentimentScore: number;
      let sentimentRating: SentimentRating;
      let catalystHeadline: string;

      if (matchingNews) {
        sentimentScore = matchingNews.sentimentScore;
        sentimentRating = matchingNews.sentimentRating;
        catalystHeadline = matchingNews.headline;
      } else {
        // Derive dynamic sentiment from market session momentum & price volatility
        sentimentScore = Math.max(20, Math.min(98, Math.round(50 + changePercent * 4 + (changePercent >= 0 ? 15 : -10))));
        sentimentRating = sentimentScore >= 55 ? '+' : sentimentScore <= 45 ? '-' : '0';
        catalystHeadline = `Market Session Action (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}% Intraday Momentum)`;
      }

      // Project realistic EOD Target based on current volatility and sentiment
      let expectedGainPercent: number;
      if (sentimentRating === '+') {
        const baseGain = Math.max(3.0, Math.abs(changePercent) * 1.3 + 4.0);
        expectedGainPercent = Number(Math.min(38.0, baseGain).toFixed(1));
      } else if (sentimentRating === '-') {
        const baseLoss = -Math.max(2.5, Math.abs(changePercent) * 1.2 + 2.0);
        expectedGainPercent = Number(Math.max(-25.0, baseLoss).toFixed(1));
      } else {
        expectedGainPercent = Number((changePercent * 0.8).toFixed(1));
      }

      const predictedEodTarget = Number((currentPrice * (1 + expectedGainPercent / 100)).toFixed(2));

      const recommendedAction = expectedGainPercent >= 20
        ? 'STRONG BUY'
        : expectedGainPercent >= 5
        ? 'BUY'
        : expectedGainPercent >= 0
        ? 'HOLD'
        : 'AVOID';

      // Dynamically generate realistic 6-step intraday progression curve
      const historicalIntraday = [
        { time: '09:30', price: dayOpen },
        { time: '10:30', price: Number((dayOpen + (dayLow - dayOpen) * 0.4).toFixed(2)) },
        { time: '11:30', price: Number(((dayLow + currentPrice) / 2).toFixed(2)) },
        { time: '13:00', price: Number(((currentPrice + dayHigh) / 2).toFixed(2)) },
        { time: '14:30', price: currentPrice },
        { time: '16:00', price: predictedEodTarget },
      ];

      const volumeSpike = `${(Math.abs(changePercent) * 0.6 + 1.8).toFixed(1)}x Vol`;

      return {
        ticker,
        name: profile.name || ticker,
        category: profile.category,
        currentPrice,
        predictedEodTarget,
        expectedGainPercent,
        sentimentRating,
        sentimentScore,
        catalystHeadline,
        volumeSpike,
        recommendedAction,
        historicalIntraday,
      } as StockPrediction;

    } catch (err) {
      console.warn(`Could not fetch live quote for ${ticker}:`, err);
      return null;
    }
  });

  const results = await Promise.all(stockPromises);
  return results.filter((s): s is StockPrediction => s !== null);
}
