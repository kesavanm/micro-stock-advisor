import type { LimitOrderStrategy } from '../types/stock';
import { Target, ShieldAlert, ArrowUpRight, CheckCircle2, Layers } from 'lucide-react';

interface Top5LimitOrdersProps {
  limitOrders: LimitOrderStrategy[];
  totalBudget: number;
}

export const Top5LimitOrders: React.FC<Top5LimitOrdersProps> = ({
  limitOrders,
  totalBudget,
}) => {
  return (
    <div className="glass-card p-5 sm:p-6 mb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4 mb-6">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-white">
              Top 5 Recommended Stock Portfolio & Limit Sell Strategy
            </h3>
            <p className="text-xs text-slate-400">
              Balanced ${(totalBudget / 5).toFixed(2)} allocation per stock with automated Take-Profit Limit Orders
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 self-start sm:self-auto">
          <Layers className="w-4 h-4 text-emerald-400" />
          <span>5 Positions | ${(totalBudget / 5).toFixed(0)} Each</span>
        </div>
      </div>

      {/* Grid of 5 Stocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {limitOrders.map((order, index) => {
          return (
            <div
              key={order.ticker}
              className="p-4 rounded-xl bg-slate-900/90 border border-white/10 hover:border-emerald-500/40 transition-all duration-300 space-y-4 relative group"
            >
              {/* Badge Rank */}
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-xs flex items-center justify-center border border-emerald-500/40">
                    #{index + 1}
                  </span>
                  <div>
                    <h4 className="font-display font-extrabold text-base text-white tracking-wide">
                      {order.ticker}
                    </h4>
                    <span className="text-[11px] text-slate-400 truncate block max-w-[160px]">
                      {order.name}
                    </span>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono font-extrabold text-xs border border-emerald-500/40 flex items-center space-x-1">
                  <span>[+]</span>
                  <ArrowUpRight className="w-3 h-3" />
                  <span>+{order.projectedProfitPercent.toFixed(1)}%</span>
                </span>
              </div>

              {/* Price & Allocation Breakdown */}
              <div className="p-3 rounded-lg bg-slate-950/80 border border-white/5 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Budget Allocation:</span>
                  <span className="font-bold text-white">${order.allocatedAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Current Price:</span>
                  <span className="font-bold text-slate-200">${order.currentPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Share Quantity:</span>
                  <span className="font-bold text-cyan-300">{order.shareCount} shares</span>
                </div>
              </div>

              {/* Take-Profit Limit Sell Target */}
              <div className="p-3 rounded-lg bg-gradient-to-r from-emerald-950/40 to-cyan-950/40 border border-emerald-500/30 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                    Take-Profit Limit Sell Order
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    +${order.projectedProfit.toFixed(2)} Gain
                  </span>
                </div>
                <div className="text-xl font-extrabold font-mono text-cyan-300">
                  Set Limit Sell @ ${order.limitSellPrice.toFixed(2)}
                </div>
              </div>

              {/* Stop Loss Guard & Execution Badge */}
              <div className="flex justify-between items-center text-[11px] pt-1">
                <span className="text-slate-400 flex items-center space-x-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>Stop-Loss: <strong className="text-slate-200 font-mono">${order.stopLossPrice.toFixed(2)}</strong></span>
                </span>

                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 text-[10px] font-bold border border-cyan-500/30">
                  <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                  <span>Order Ready</span>
                </span>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
