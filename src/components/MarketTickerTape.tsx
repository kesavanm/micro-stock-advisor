import React from 'react';
import type { StockPrediction } from '../types/stock';
import { ArrowUpRight, ArrowDownRight, Flame } from 'lucide-react';

interface MarketTickerTapeProps {
  stocks: StockPrediction[];
}

export const MarketTickerTape: React.FC<MarketTickerTapeProps> = ({ stocks }) => {
  if (!stocks || stocks.length === 0) {
    return (
      <div className="w-full bg-white dark:bg-slate-950 border-y border-slate-200 dark:border-white/10 py-2.5 overflow-hidden relative">
        <div className="flex items-center px-4 space-x-3 text-xs text-slate-600 dark:text-slate-400 font-mono">
          <Flame className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse" />
          <span className="uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400">Morning Signals:</span>
          <span className="animate-pulse text-slate-600 dark:text-slate-400">Connecting to live market stream & loading quotes...</span>
        </div>
      </div>
    );
  }

  // Duplicate array for seamless infinite marquee loop
  const tickerItems = [...stocks, ...stocks];

  return (
    <div className="w-full bg-white dark:bg-slate-950 border-y border-slate-200 dark:border-white/10 py-2.5 overflow-hidden relative">
      <div className="flex items-center">
        {/* Static Title Badge */}
        <div className="z-10 bg-white dark:bg-slate-950 px-4 py-1 flex items-center space-x-1.5 border-r border-slate-200 dark:border-white/10 text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0">
          <Flame className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse" />
          <span className="uppercase tracking-wider">Morning Signals:</span>
        </div>

        {/* Marquee Track */}
        <div className="animate-ticker space-x-6 pl-4 flex items-center">
          {tickerItems.map((item, idx) => {
            const isBullish = item.sentimentRating === '+';
            return (
              <div
                key={`${item.ticker}-${idx}`}
                className="flex items-center space-x-2 text-xs font-mono shrink-0 bg-white/80 dark:bg-slate-900/80 px-3 py-1 rounded-lg border border-slate-200/70 dark:border-white/5"
              >
                <span className="font-extrabold text-slate-900 dark:text-white">{item.ticker}</span>
                
                {/* Positivity Rating */}
                <span className={`px-1.5 py-0.2 rounded text-[11px] font-bold ${
                  isBullish
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                }`}>
                  [{item.sentimentRating}]
                </span>

                <span className="text-slate-600 dark:text-slate-400">${item.currentPrice.toFixed(2)}</span>

                <span className={`flex items-center font-bold ${
                  isBullish ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {isBullish ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
                  {isBullish ? '+' : ''}{item.expectedGainPercent.toFixed(1)}%
                </span>

                <span className="text-slate-500">→</span>
                <span className="text-cyan-700 dark:text-cyan-300 font-bold">Target ${item.predictedEodTarget.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
