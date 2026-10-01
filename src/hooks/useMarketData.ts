import { useState, useEffect, useCallback, useRef } from 'react';
import type { StockPrediction, NewsItem } from '../types/stock';
import { MOCK_STOCKS, MOCK_MORNING_NEWS } from '../data/mockNewsAndStocks';
import { fetchLiveStockQuotes, fetchLiveNews } from '../services/marketDataService';

export function useMarketData() {
  const [stocks, setStocks] = useState<StockPrediction[]>(MOCK_STOCKS);
  const [news, setNews] = useState<NewsItem[]>(MOCK_MORNING_NEWS);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isMounted = useRef<boolean>(true);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const apiKey = localStorage.getItem('finnhub_api_key') || import.meta.env.VITE_FINNHUB_API_KEY || '';

    try {
      const [liveQuotes, liveNews] = await Promise.all([
        fetchLiveStockQuotes(apiKey),
        fetchLiveNews(apiKey),
      ]);

      if (!isMounted.current) return;

      if (liveQuotes.length > 0) {
        setStocks(liveQuotes);
        setIsLive(true);
      } else {
        console.warn('Live quotes returned empty, retaining fallback.');
      }

      if (liveNews.length > 0) {
        setNews(liveNews);
      }

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
    stocks,
    news,
    loading,
    isLive,
    lastUpdated,
    error,
    refreshData,
  };
}
