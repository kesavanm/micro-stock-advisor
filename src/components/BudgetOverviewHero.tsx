import type { PortfolioSummary } from '../types/stock';
import { Sparkles, ShieldCheck, Zap, Target, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface BudgetOverviewHeroProps {
  summary: PortfolioSummary;
  dailyBudget: number;
  onBudgetChange: (budget: number) => void;
  onSimulateExecution: () => void;
}

export const BudgetOverviewHero: React.FC<BudgetOverviewHeroProps> = ({
  summary,
  dailyBudget,
  onBudgetChange,
  onSimulateExecution,
}) => {
  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
    onSimulateExecution();
  };

  const targetProfitGoal = 100; // $100 daily profit expectation requested by user
  const profitProgressPercent = Math.min(100, (summary.totalProjectedProfit / targetProfitGoal) * 100);

  return (
    <div className="glass-card-emerald p-6 md:p-8 mb-8 relative overflow-hidden">
      
      {/* Background Subtle Gradient Orb */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        
        {/* Left Column: Daily Budget Slider & Goal Progress */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                Micro-Investor Strategy Engine
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-400">Max Budget $200 / Day</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 dark:text-white leading-tight">
              5-Stock Daily Allocation Strategy for <span className="text-emerald-600 dark:text-emerald-400">${dailyBudget} Budget</span>
            </h2>

            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              AI parses morning news catalysts, isolates the 5 highest-positivity stocks, allocates equal budget (${(dailyBudget / 5).toFixed(0)} per stock), and sets automated <strong className="text-cyan-700 dark:text-cyan-300 font-bold">Take-Profit Limit Sell Orders</strong> for End-Of-Day execution.
            </p>
          </div>

          {/* Interactive Budget Slider */}
          <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">Your Daily Investing Budget</span>
              <span className="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400">${dailyBudget}.00 / Day</span>
            </div>

            <input
              type="range"
              min={50}
              max={500}
              step={10}
              value={dailyBudget}
              onChange={(e) => onBudgetChange(Number(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer h-2 bg-slate-100 dark:bg-slate-800 rounded-lg"
            />

            <div className="flex justify-between text-[11px] text-slate-500">
              <span>$50 (Micro)</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">$200 (Default Target)</span>
              <span>$500 (Max)</span>
            </div>
          </div>

          {/* $100 Daily Profit Target Meter */}
          <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-950/80 border border-slate-200 dark:border-white/10 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-700 dark:text-slate-300 font-bold flex items-center space-x-1.5">
                <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Daily Profit Target Progress ($100 Goal)</span>
              </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                ${summary.totalProjectedProfit.toFixed(2)} / ${targetProfitGoal}.00 Goal ({profitProgressPercent.toFixed(0)}%)
              </span>
            </div>

            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200/70 dark:border-white/5">
              <div
                className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full rounded-full transition-all duration-500 shadow-md glow-emerald"
                style={{ width: `${profitProgressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Right Column: Key KPI Cards & Action Button */}
        <div className="lg:col-span-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Projected EOD Value */}
            <div className="p-4 rounded-xl bg-white/90 dark:bg-slate-950/90 border border-slate-200 dark:border-white/10 space-y-1">
              <span className="text-[11px] text-slate-600 dark:text-slate-400 uppercase font-bold tracking-wider block">
                Projected EOD Portfolio
              </span>
              <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                ${summary.totalProjectedEodValue.toFixed(2)}
              </div>
              <span className="text-[10px] text-slate-500 block">
                Allocated across 5 stocks (${(dailyBudget / 5).toFixed(2)} / stock)
              </span>
            </div>

            {/* Estimated Daily Profit */}
            <div className="p-4 rounded-xl bg-white/90 dark:bg-slate-950/90 border border-emerald-500/40 space-y-1">
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 uppercase font-bold tracking-wider block">
                Estimated Daily Profit
              </span>
              <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                +${summary.totalProjectedProfit.toFixed(2)}
              </div>
              <span className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 font-bold block">
                +{summary.totalProjectedRoiPercent.toFixed(1)}% Projected Daily ROI
              </span>
            </div>
          </div>

          {/* Action Button: Simulate Executing Limit Orders */}
          <button
            onClick={triggerConfetti}
            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-cyan-500 text-slate-950 font-display font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-[0.99] transition flex items-center justify-center space-x-2 glow-emerald"
          >
            <Zap className="w-5 h-5 fill-slate-950" />
            <span>Simulate Setting 5 Take-Profit Limit Orders</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          <div className="flex items-center justify-center space-x-2 text-[11px] text-slate-600 dark:text-slate-400 text-center">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <span>Simulated brokerage execution — Limits automatically set to EOD targets.</span>
          </div>
        </div>

      </div>

    </div>
  );
};
