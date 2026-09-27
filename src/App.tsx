import { useState, useMemo } from 'react';
import { MOCK_STOCKS, MOCK_MORNING_NEWS } from './data/mockNewsAndStocks';
import { calculateLimitOrderStrategy } from './utils/predictorEngine';
import { Header } from './components/Header';
import { MarketTickerTape } from './components/MarketTickerTape';
import { BudgetOverviewHero } from './components/BudgetOverviewHero';
import { Top5LimitOrders } from './components/Top5LimitOrders';
import { StockPredictorTable } from './components/StockPredictorTable';
import { NewsSentimentFeed } from './components/NewsSentimentFeed';
import { PortfolioChart } from './components/PortfolioChart';
import { OrderSimulatorModal } from './components/OrderSimulatorModal';
import { TrendingUp } from 'lucide-react';

export function App() {
  const [dailyBudget, setDailyBudget] = useState<number>(200);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);

  // Recalculate 5-stock allocation & limit sell orders dynamically
  const summary = useMemo(() => {
    return calculateLimitOrderStrategy(dailyBudget, MOCK_STOCKS);
  }, [dailyBudget]);

  const top5Tickers = summary.limitOrders.map((o) => o.ticker);

  const handleReset = () => {
    setDailyBudget(200);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950 font-sans">
      
      {/* Top Header */}
      <Header
        dailyBudget={dailyBudget}
        onBudgetChange={setDailyBudget}
        onReset={handleReset}
      />

      {/* Rolling Live Market Ticker Tape */}
      <MarketTickerTape stocks={MOCK_STOCKS} />

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
          stocks={MOCK_STOCKS}
          top5Tickers={top5Tickers}
        />

        {/* Morning Financial News AI Sentiment Parser Feed */}
        <NewsSentimentFeed newsItems={MOCK_MORNING_NEWS} />

      </main>

      {/* Order Execution Simulator Modal */}
      <OrderSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        limitOrders={summary.limitOrders}
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
