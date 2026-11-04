import { useState, useMemo } from 'react';
import { calculateLimitOrderStrategy } from './utils/predictorEngine';
import { useMarketData } from './hooks/useMarketData';
import { Header } from './components/Header';
import { MarketTickerTape } from './components/MarketTickerTape';
import { BudgetOverviewHero } from './components/BudgetOverviewHero';
import { Top5LimitOrders } from './components/Top5LimitOrders';
import { StockPredictorTable } from './components/StockPredictorTable';
import { NewsSentimentFeed } from './components/NewsSentimentFeed';
import { PortfolioChart } from './components/PortfolioChart';
import { OrderSimulatorModal } from './components/OrderSimulatorModal';
import { WatchlistModal } from './components/WatchlistModal';
import { TrendingUp, AlertCircle } from 'lucide-react';

export function App() {
  const [dailyBudget, setDailyBudget] = useState<number>(200);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [isWatchlistOpen, setIsWatchlistOpen] = useState<boolean>(false);

  // Hook connecting real-time Finnhub market quotes, general news & dynamic 2-hour trending cache
  const {
    watchlist,
    suggestions,
    stocks,
    news,
    loading,
    isLive,
    lastUpdated,
    error,
    refreshData,
    addTicker,
    removeTicker,
    resetToDefaultWatchlist,
  } = useMarketData();

  // Recalculate 5-stock allocation & limit sell orders dynamically from live stocks
  const summary = useMemo(() => {
    return calculateLimitOrderStrategy(dailyBudget, stocks);
  }, [dailyBudget, stocks]);

  const top5Tickers = summary.limitOrders.map((o) => o.ticker);

  const handleReset = () => {
    setDailyBudget(200);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950 font-sans">
      
      {/* Top Header with live status, clock, watchlist, and refresh */}
      <Header
        dailyBudget={dailyBudget}
        onBudgetChange={setDailyBudget}
        onReset={handleReset}
        isLive={isLive}
        loading={loading}
        lastUpdated={lastUpdated}
        onRefresh={() => refreshData()}
        watchlistCount={watchlist.length}
        onOpenWatchlist={() => setIsWatchlistOpen(true)}
      />

      {/* Error alert banner if API key or connection fails */}
      {error && (
        <div className="bg-rose-950/60 border-b border-rose-500/30 px-4 py-2.5 text-xs text-rose-300 flex items-center justify-between">
          <div className="flex items-center space-x-2 max-w-7xl mx-auto w-full">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Rolling Live Market Ticker Tape */}
      <MarketTickerTape stocks={stocks} />

      {/* Main Trading Terminal Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Hero KPI Summary & Budget Controller */}
        <BudgetOverviewHero
          summary={summary}
          dailyBudget={dailyBudget}
          onBudgetChange={setDailyBudget}
          onSimulateExecution={() => setIsSimulatorOpen(true)}
        />

        {/* Top 5 Recommended Stocks & Limit Sell Strategy Cards */}
        <Top5LimitOrders
          limitOrders={summary.limitOrders}
          totalBudget={dailyBudget}
        />

        {/* Forecast Chart: Intraday Trajectory */}
        <PortfolioChart summary={summary} />

        {/* Comprehensive EOD Target Predictions Table */}
        <StockPredictorTable
          stocks={stocks}
          top5Tickers={top5Tickers}
        />

        {/* Morning Financial News AI Sentiment Parser Feed */}
        <NewsSentimentFeed newsItems={news} />

      </main>

      {/* Order Execution Simulator Modal */}
      <OrderSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        limitOrders={summary.limitOrders}
      />

      {/* Dynamic Watchlist Manager Modal with Morning News Suggestions */}
      <WatchlistModal
        isOpen={isWatchlistOpen}
        onClose={() => setIsWatchlistOpen(false)}
        watchlist={watchlist}
        suggestions={suggestions}
        onAddTicker={addTicker}
        onRemoveTicker={removeTicker}
        onResetWatchlist={resetToDefaultWatchlist}
      />

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950/80 py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="font-display font-semibold text-slate-200">MicroStock Predictor</span>
            <span>— Micro-Investor AI Morning News Stock Engine</span>
          </div>

          <div className="flex items-center space-x-4 text-slate-500">
            <span>Built for Micro-Capital Trading ($200/day max)</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;
