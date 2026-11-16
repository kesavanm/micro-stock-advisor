import React, { useState, useEffect } from 'react';
import { TrendingUp, Clock, DollarSign, RefreshCw, Radio, ListFilter } from 'lucide-react';

interface HeaderProps {
  dailyBudget: number;
  onBudgetChange: (budget: number) => void;
  onReset: () => void;
  isLive: boolean;
  loading: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
  watchlistCount: number;
  onOpenWatchlist: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  dailyBudget,
  onReset,
  isLive,
  loading,
  lastUpdated,
  onRefresh,
  watchlistCount,
  onOpenWatchlist,
}) => {
  const [estTimeStr, setEstTimeStr] = useState<string>('');
  const [marketStatus, setMarketStatus] = useState<string>('Market Active');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format time in America/New_York (EST/EDT)
      const estFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      setEstTimeStr(estFormatter.format(now) + ' EST');

      // Determine market status
      const estParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        weekday: 'short',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      }).formatToParts(now);

      const weekday = estParts.find(p => p.type === 'weekday')?.value || '';
      const hour = parseInt(estParts.find(p => p.type === 'hour')?.value || '0', 10);
      const minute = parseInt(estParts.find(p => p.type === 'minute')?.value || '0', 10);
      const totalMin = hour * 60 + minute;

      if (weekday === 'Sat' || weekday === 'Sun') {
        setMarketStatus('Weekend Closed');
      } else if (totalMin >= 240 && totalMin < 570) {
        setMarketStatus('Pre-Market');
      } else if (totalMin >= 570 && totalMin < 960) {
        setMarketStatus('Market Open');
      } else if (totalMin >= 960 && totalMin < 1200) {
        setMarketStatus('After-Hours');
      } else {
        setMarketStatus('Market Closed');
      }
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-50 glass-card border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl py-3 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Logo & Brand */}
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 text-slate-950 shadow-lg glow-emerald">
            <TrendingUp className="w-5 h-5 font-black" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap">
              <h1 className="font-display font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
                MicroStock <span className="text-emerald-600 dark:text-emerald-400">Predictor</span>
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                AI Morning News Engine
              </span>
              {isLive ? (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 text-[10px] font-bold tracking-wider animate-pulse">
                  <Radio className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>LIVE FINNHUB</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-[10px] font-bold tracking-wider">
                  SCANNING
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 hidden sm:block">
              Daily $200 Micro-Investor AI Stock Recommendations & Take-Profit Limit Orders
            </p>
          </div>
        </div>

        {/* Live Market Clock, Watchlist, Budget Indicator & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Live Market Clock */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isLive ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{marketStatus}</span>
            <span className="text-slate-500">|</span>
            <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span className="font-mono text-cyan-700 dark:text-cyan-300 font-bold">{estTimeStr || '08:45 AM EST'}</span>
          </div>

          {/* Watchlist Manager Button */}
          <button
            onClick={onOpenWatchlist}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 text-xs font-semibold transition"
            title="Manage dynamic stock watchlist"
          >
            <ListFilter className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Watchlist ({watchlistCount})</span>
          </button>

          {/* Daily Budget Cap */}
          <div className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300 font-bold font-mono">
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Cap: ${dailyBudget} / Day</span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-white/10 text-xs font-semibold transition"
            title={lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : 'Refresh real-time data'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-600 dark:text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">{loading ? 'Updating...' : 'Refresh'}</span>
          </button>

          {/* Reset Budget */}
          <button
            onClick={onReset}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 text-xs font-semibold transition"
            title="Reset to Default $200 Allocation"
          >
            Reset
          </button>
        </div>

      </div>
    </header>
  );
};
