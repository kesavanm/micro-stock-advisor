import React from 'react';
import type { StockPrediction } from '../types/stock';
import { Table, ArrowUpRight, ArrowDownRight, CheckCircle2, ShieldAlert } from 'lucide-react';

interface StockPredictorTableProps {
  stocks: StockPrediction[];
  top5Tickers: string[];
}

export const StockPredictorTable: React.FC<StockPredictorTableProps> = ({
  stocks,
  top5Tickers,
}) => {
  return (
    <div className="glass-card p-5 sm:p-6 mb-8">
      
      {/* Title */}
      <div className="flex items-center space-x-2 border-b border-white/10 pb-4 mb-6">
        <Table className="w-5 h-5 text-cyan-400" />
        <h3 className="font-display font-bold text-lg text-white">
          All Morning AI Stock Forecasts & EOD Targets
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Stock & Ticker</th>
              <th className="py-3 px-4">AI Sentiment</th>
              <th className="py-3 px-4">Current Price</th>
              <th className="py-3 px-4">Predicted % Change</th>
              <th className="py-3 px-4">Target EOD Price</th>
              <th className="py-3 px-4">Portfolio Strategy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-200">
            {stocks.map((stock) => {
              const isBullish = stock.sentimentRating === '+';
              const isSelectedTop5 = top5Tickers.includes(stock.ticker);

              return (
                <tr
                  key={stock.ticker}
                  className={`transition ${
                    isSelectedTop5
                      ? 'bg-emerald-950/20 hover:bg-emerald-950/30'
                      : 'hover:bg-slate-900/50'
                  }`}
                >
                  {/* Stock Ticker & Name */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-black text-white text-sm">
                        {stock.ticker}
                      </span>
                      <span className="text-slate-400 text-xs hidden sm:inline">
                        — {stock.name}
                      </span>
                    </div>
                  </td>

                  {/* Sentiment Rating */}
                  <td className="py-3.5 px-4 font-mono font-bold">
                    <span className={`px-2 py-0.5 rounded text-xs inline-flex items-center space-x-1 ${
                      isBullish
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      <span>[{stock.sentimentRating}]</span>
                      <span>Score {stock.sentimentScore}</span>
                    </span>
                  </td>

                  {/* Current Price */}
                  <td className="py-3.5 px-4 font-mono text-slate-200">
                    ${stock.currentPrice.toFixed(2)}
                  </td>

                  {/* Predicted % Change */}
                  <td className="py-3.5 px-4 font-mono font-bold">
                    <span className={`flex items-center ${
                      isBullish ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {isBullish ? <ArrowUpRight className="w-4 h-4 mr-0.5" /> : <ArrowDownRight className="w-4 h-4 mr-0.5" />}
                      Should go by {stock.expectedGainPercent.toFixed(1)}%
                    </span>
                  </td>

                  {/* Target EOD Price */}
                  <td className="py-3.5 px-4 font-mono font-extrabold text-cyan-300">
                    Target ${stock.predictedEodTarget.toFixed(2)} EOD
                  </td>

                  {/* Portfolio Strategy Badge */}
                  <td className="py-3.5 px-4">
                    {isSelectedTop5 ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/40">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Included in $200 Plan</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs border border-white/5">
                        <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
                        <span>Watchlist / Avoid</span>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
};
