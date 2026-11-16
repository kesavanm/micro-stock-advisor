import type { LimitOrderStrategy } from '../types/stock';
import { CheckCircle2, ShieldCheck, X } from 'lucide-react';

interface OrderSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitOrders: LimitOrderStrategy[];
}

export const OrderSimulatorModal: React.FC<OrderSimulatorModalProps> = ({
  isOpen,
  onClose,
  limitOrders,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-card p-6 max-w-2xl w-full border border-emerald-500/40 relative space-y-6 glow-emerald">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 border-b border-slate-200 dark:border-white/10 pb-4">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-xl text-slate-900 dark:text-white">
              Limit Orders Successfully Transmitted!
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300">
              5 Take-Profit Limit Sell Orders placed for EOD execution via Simulated Broker API
            </p>
          </div>
        </div>

        {/* Order Executed List */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 no-scrollbar">
          {limitOrders.map((ord) => (
            <div
              key={ord.ticker}
              className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs font-mono"
            >
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-900 dark:text-white text-sm">{ord.ticker}</span>
                <span className="text-slate-600 dark:text-slate-400">({ord.shareCount} sh @ ${ord.currentPrice.toFixed(2)})</span>
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  Limit Sell @ ${ord.limitSellPrice.toFixed(2)}
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  ACTIVE
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Status Callout */}
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-200 flex items-center space-x-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <strong>Risk Protection Enabled:</strong> Each position includes a 5% trailing stop-loss trigger to cap maximum daily downside while locking in up to <strong className="text-emerald-600 dark:text-emerald-400 font-bold">$100.00 daily profit goal</strong>.
          </div>
        </div>

        {/* Close Action */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-emerald-500 text-slate-950 font-display font-bold text-sm uppercase tracking-wider hover:bg-emerald-400 transition"
        >
          Return to Dashboard
        </button>

      </div>
    </div>
  );
};
