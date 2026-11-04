import React from 'react';
import type { PortfolioSummary } from '../types/stock';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { TrendingUp } from 'lucide-react';

interface PortfolioChartProps {
  summary: PortfolioSummary;
}

export const PortfolioChart: React.FC<PortfolioChartProps> = ({ summary }) => {
  const hasOrders = summary.limitOrders && summary.limitOrders.length > 0;
  const initialBudget = hasOrders ? summary.allocatedAmount : summary.totalBudget;
  const profit = hasOrders ? summary.totalProjectedProfit : 0;
  const targetValue = hasOrders ? summary.totalProjectedEodValue : initialBudget;

  // Intraday progression data points from 09:30 AM to 16:00 PM
  const chartData = [
    { time: '09:30 AM', value: Number(initialBudget.toFixed(2)), profit: 0 },
    { time: '10:30 AM', value: Number((initialBudget + profit * 0.25).toFixed(2)), profit: Number((profit * 0.25).toFixed(2)) },
    { time: '11:30 AM', value: Number((initialBudget + profit * 0.45).toFixed(2)), profit: Number((profit * 0.45).toFixed(2)) },
    { time: '13:00 PM', value: Number((initialBudget + profit * 0.68).toFixed(2)), profit: Number((profit * 0.68).toFixed(2)) },
    { time: '14:30 PM', value: Number((initialBudget + profit * 0.88).toFixed(2)), profit: Number((profit * 0.88).toFixed(2)) },
    { time: '16:00 PM (EOD)', value: Number(targetValue.toFixed(2)), profit: Number(profit.toFixed(2)) },
  ];

  return (
    <div className="glass-card p-5 sm:p-6 mb-8">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4 mb-6">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-white">
              Intraday Limit Order Execution & Value Growth Curve
            </h3>
            <p className="text-xs text-slate-400">
              {hasOrders 
                ? 'Simulated EOD portfolio trajectory as automated Limit Orders fill across market hours' 
                : 'Awaiting market quotes to plot dynamic portfolio trajectory'}
            </p>
          </div>
        </div>

        <div className="text-xs font-mono font-bold text-emerald-400">
          Target Gain: {summary.totalProjectedProfit >= 0 ? '+' : ''}${summary.totalProjectedProfit.toFixed(2)} ({summary.totalProjectedRoiPercent >= 0 ? '+' : ''}{summary.totalProjectedRoiPercent.toFixed(1)}%)
        </div>
      </div>

      {/* Recharts Area Chart */}
      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
            <YAxis stroke="#94a3b8" fontSize={11} domain={['auto', 'auto']} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: 'rgba(16, 185, 129, 0.4)',
                borderRadius: '0.75rem',
                fontSize: '12px',
                color: '#fff',
              }}
              formatter={(value: any) => [`$${value}`, 'Portfolio Value']}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#10b981"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorValue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
};
