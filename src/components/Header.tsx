import { TrendingUp, Clock, DollarSign } from 'lucide-react';

interface HeaderProps {
  dailyBudget: number;
  onBudgetChange: (budget: number) => void;
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  dailyBudget,
  onReset,
}) => {
  return (
    <header className="sticky top-0 z-50 glass-card border-b border-white/10 bg-slate-950/80 backdrop-blur-xl py-3.5 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Logo & Brand */}
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 text-slate-950 shadow-lg glow-emerald">
            <TrendingUp className="w-5 h-5 font-black" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-display font-extrabold text-xl tracking-tight text-white">
                MicroStock <span className="text-emerald-400">Predictor</span>
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                AI Morning News Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Daily $200 Micro-Investor AI Stock Recommendations & Take-Profit Limit Orders
            </p>
          </div>
        </div>

        {/* Live Market Clock & Budget Indicator */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-slate-300">Pre-Market Active</span>
            <span className="text-slate-500">|</span>
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono text-cyan-300 font-bold">08:45 AM EST</span>
          </div>

          <div className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 font-bold font-mono">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>Cap: ${dailyBudget} / Day</span>
          </div>

          <button
            onClick={onReset}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/10 text-xs font-semibold transition"
            title="Reset to Default $200 Allocation"
          >
            Reset
          </button>
        </div>

      </div>
    </header>
  );
};
