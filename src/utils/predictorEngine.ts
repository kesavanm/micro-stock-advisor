import type { StockPrediction, LimitOrderStrategy, PortfolioSummary } from '../types/stock';

export function calculateLimitOrderStrategy(
  totalBudget: number = 200,
  stocks: StockPrediction[] = []
): PortfolioSummary {
  if (!stocks || stocks.length === 0) {
    return {
      totalBudget,
      allocatedAmount: 0,
      remainingCash: totalBudget,
      topPicksCount: 0,
      totalProjectedEodValue: 0,
      totalProjectedProfit: 0,
      totalProjectedRoiPercent: 0,
      limitOrders: [],
    };
  }

  // 1. Filter bullish positive sentiment stocks sorted by sentiment score descending
  let bullishStocks = stocks
    .filter((s) => s.sentimentRating === '+' && s.expectedGainPercent > 0)
    .sort((a, b) => b.sentimentScore - a.sentimentScore);

  // If no positive sentiment stocks exist in the feed, take the best available gainers
  if (bullishStocks.length === 0) {
    bullishStocks = [...stocks].sort((a, b) => b.expectedGainPercent - a.expectedGainPercent);
  }

  // Take top 5 picks
  const top5Picks = bullishStocks.slice(0, 5);
  const count = top5Picks.length;

  if (count === 0) {
    return {
      totalBudget,
      allocatedAmount: 0,
      remainingCash: totalBudget,
      topPicksCount: 0,
      totalProjectedEodValue: 0,
      totalProjectedProfit: 0,
      totalProjectedRoiPercent: 0,
      limitOrders: [],
    };
  }

  // 2. Equal allocation per stock (e.g., $200 / 5 = $40 per stock)
  const allocationPerStock = totalBudget / count;
  let totalAllocated = 0;
  let totalProjectedEodValue = 0;

  const limitOrders: LimitOrderStrategy[] = top5Picks.map((stock) => {
    const allocatedAmount = allocationPerStock;
    totalAllocated += allocatedAmount;

    // Fractional share count based on current price
    const shareCount = Number((allocatedAmount / Math.max(0.01, stock.currentPrice)).toFixed(4));
    
    // Target EOD Limit Sell Price
    const limitSellPrice = stock.predictedEodTarget;

    // 5% Stop-loss protection trigger
    const stopLossPrice = Number((stock.currentPrice * 0.95).toFixed(2));

    // Projected EOD Value for this position
    const projectedEodValue = shareCount * limitSellPrice;
    totalProjectedEodValue += projectedEodValue;

    const projectedProfit = projectedEodValue - allocatedAmount;
    const projectedProfitPercent = stock.expectedGainPercent;

    return {
      ticker: stock.ticker,
      name: stock.name,
      allocatedAmount,
      currentPrice: stock.currentPrice,
      shareCount,
      limitSellPrice,
      stopLossPrice,
      projectedProfit,
      projectedProfitPercent,
      executionStatus: 'LIMIT_SET',
    };
  });

  const totalProjectedProfit = totalProjectedEodValue - totalAllocated;
  const totalProjectedRoiPercent = totalAllocated > 0 
    ? (totalProjectedProfit / totalAllocated) * 100 
    : 0;

  return {
    totalBudget,
    allocatedAmount: totalAllocated,
    remainingCash: totalBudget - totalAllocated,
    topPicksCount: count,
    totalProjectedEodValue,
    totalProjectedProfit,
    totalProjectedRoiPercent,
    limitOrders,
  };
}
