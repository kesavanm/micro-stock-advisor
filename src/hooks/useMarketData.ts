import { useState, useEffect, useCallback, useRef } from 'react';
import type { StockPrediction, NewsItem } from '../types/stock';
import {
  fetchLiveStockQuotes,
  fetchLiveNews,
  fetchServerTrendingCache,
  getCachedTrending,
  isCustomWatchlistActive,
  getCustomWatchlist,
  saveCustomWatchlist,
  resetToAutoTrendingWatchlist,
} from '../services/marketDataService';

export function useMarketData() {
  const [watchlist, setWatchlistState] = useState<string[]>(() => {
    if (isCustomWatchlistActive()) {
      return getCustomWatchlist();
    }
    const cached = getCachedTrending();
    return cached && cached.trendingTickers ? cached.trendingTickers : [];
  });

  const [suggestions, setSuggestions] = useState<string[]>(() => {
    const cached = getCachedTrending();
    return cached && cached.suggestions ? cached.suggestions : [];
  });

  const [stocks, setStocks] = useState<StockPrediction[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isMounted = useRef<boolean>(true);

  const refreshData = useCallback(async (customTickers?: string[]) => {
    setLoading(true);
    setError(null);

    const apiKey = localStorage.getItem('finnhub_api_key') || import.meta.env.VITE_FINNHUB_API_KEY || '';

    if (!apiKey) {
      if (isMounted.current) {
        setError('No Finnhub API Key configured. Please configure your key in .env or settings.');
        setLoading(false);
      }
      return;
    }

    try {
      // 1. Always fetch fresh 2-hour server trending cache first
      const serverCache = await fetchServerTrendingCache();

      let activeWatchlist: string[];

      if (customTickers && customTickers.length > 0) {
        activeWatchlist = customTickers;
      } else if (isCustomWatchlistActive()) {
        activeWatchlist = getCustomWatchlist();
      } else if (serverCache && serverCache.trendingTickers.length > 0) {
        activeWatchlist = serverCache.trendingTickers;
      } else {
        const cached = getCachedTrending();
        activeWatchlist = cached ? cached.trendingTickers : [];
      }

      if (isMounted.current) {
        setWatchlistState(activeWatchlist);
        if (serverCache && Array.isArray(serverCache.suggestions)) {
          setSuggestions(serverCache.suggestions);
        }
      }

      // 2. Fetch live morning news from Finnhub
      const liveNews = await fetchLiveNews(apiKey);

      // 3. Fetch real-time quotes for the active watchlist
      const liveQuotes = await fetchLiveStockQuotes(apiKey, activeWatchlist, liveNews);

      if (!isMounted.current) return;

      if (liveQuotes.length > 0) {
        setStocks(liveQuotes);
        setIsLive(true);
      } else {
        setStocks([]);
        setIsLive(false);
      }

      setNews(liveNews);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Error refreshing market data:', err);
      if (isMounted.current) {
        setError(err?.message || 'Failed to fetch live market data');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  const updateWatchlist = useCallback((newTickers: string[]) => {
    const sanitized = Array.from(new Set(newTickers.map((t) => t.toUpperCase().trim()).filter(Boolean)));
    saveCustomWatchlist(sanitized);
    setWatchlistState(sanitized);
  }, []);

  const addTicker = useCallback((rawTicker: string) => {
    const symbol = rawTicker.toUpperCase().trim();
    if (!symbol || watchlist.includes(symbol)) return false;
    const updated = [...watchlist, symbol];
    updateWatchlist(updated);
    return true;
  }, [watchlist, updateWatchlist]);

  const removeTicker = useCallback((rawTicker: string) => {
    const symbol = rawTicker.toUpperCase().trim();
    const updated = watchlist.filter((t) => t !== symbol);
    updateWatchlist(updated);
  }, [watchlist, updateWatchlist]);

  const resetToDefaultWatchlist = useCallback(() => {
    const defaults = resetToAutoTrendingWatchlist();
    setWatchlistState(defaults);
    // Refresh to sync immediately with the server's trending cache
    refreshData(defaults);
  }, [refreshData]);

  useEffect(() => {
    isMounted.current = true;
    refreshData();

    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      refreshData();
    }, 60000);

    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [refreshData]);

  return {
    watchlist,
    suggestions,
    stocks,
    news,
    loading,
    isLive,
    lastUpdated,
    error,
    refreshData,
    addTicker,
    removeTicker,
    updateWatchlist,
    resetToDefaultWatchlist,
  };
}
