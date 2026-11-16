import { useState } from 'react';
import { X, Plus, RotateCcw, ListFilter, Sparkles } from 'lucide-react';

interface WatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  watchlist: string[];
  suggestions: string[];
  onAddTicker: (ticker: string) => boolean;
  onRemoveTicker: (ticker: string) => void;
  onResetWatchlist: () => void;
}

export const WatchlistModal: React.FC<WatchlistModalProps> = ({
  isOpen,
  onClose,
  watchlist,
  suggestions = [],
  onAddTicker,
  onRemoveTicker,
  onResetWatchlist,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = (symbolToAdd?: string) => {
    const symbol = (symbolToAdd || inputVal).toUpperCase().trim();
    setErrorMsg(null);

    if (!symbol) return;
    if (!/^[A-Z0-9.]{1,8}$/.test(symbol)) {
      setErrorMsg('Please enter a valid stock symbol');
      return;
    }

    if (watchlist.includes(symbol)) {
      setErrorMsg(`${symbol} is already in your watchlist.`);
      return;
    }

    const ok = onAddTicker(symbol);
    if (ok) {
      setInputVal('');
    }
  };

  const availableSuggestions = suggestions.filter((s) => !watchlist.includes(s));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-card p-6 max-w-lg w-full border border-cyan-500/30 relative space-y-6 glow-cyan shadow-2xl">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 border-b border-slate-200 dark:border-white/10 pb-4">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
            <ListFilter className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-xl text-slate-900 dark:text-white">
              Manage Active Watchlist
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Customize the stocks tracked by the AI morning scanner and $200 limit advisor
            </p>
          </div>
        </div>

        {/* Add Ticker Input Bar */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
            Add Stock Ticker Symbol
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Enter stock ticker symbol..."
              value={inputVal}
              onChange={(e) => {
                setInputVal(e.target.value.toUpperCase());
                setErrorMsg(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              className="flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-sm font-mono text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 uppercase"
              maxLength={8}
            />
            <button
              onClick={() => handleAdd()}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-display font-bold text-xs uppercase tracking-wider flex items-center space-x-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>
          {errorMsg && (
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{errorMsg}</p>
          )}
        </div>

        {/* Currently Active Tickers */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Active Tickers ({watchlist.length})
            </span>
            <button
              onClick={onResetWatchlist}
              className="text-slate-600 dark:text-slate-400 hover:text-cyan-700 dark:hover:text-cyan-300 flex items-center space-x-1 transition text-[11px]"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Defaults</span>
            </button>
          </div>

          <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10 min-h-[90px] max-h-48 overflow-y-auto flex flex-wrap gap-2 items-start">
            {watchlist.map((ticker) => (
              <span
                key={ticker}
                className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-xs font-mono font-bold text-slate-900 dark:text-white hover:border-cyan-400/40 transition group"
              >
                <span>{ticker}</span>
                <button
                  onClick={() => onRemoveTicker(ticker)}
                  className="text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 rounded transition"
                  title={`Remove ${ticker}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}

            {watchlist.length === 0 && (
              <p className="text-xs text-slate-500 italic p-2">
                No tickers in watchlist. Add tickers above or await morning news scan.
              </p>
            )}
          </div>
        </div>

        {/* Dynamic Suggestions from Morning News Cache */}
        {availableSuggestions.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-slate-200/70 dark:border-white/5">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
              <span>Trending in Morning News:</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              {availableSuggestions.slice(0, 10).map((sym) => (
                <button
                  key={sym}
                  onClick={() => handleAdd(sym)}
                  className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyan-300 border border-slate-200/70 dark:border-white/5 transition flex items-center space-x-1"
                >
                  <Plus className="w-2.5 h-2.5 text-cyan-600 dark:text-cyan-400" />
                  <span>{sym}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Done Button */}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 font-display font-semibold text-xs uppercase tracking-wider transition"
        >
          Save & Return to Dashboard
        </button>

      </div>
    </div>
  );
};
