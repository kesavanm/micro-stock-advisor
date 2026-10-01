export type SentimentRating = '+' | '0' | '-';

export type StockCategory = 'Tech' | 'AI & Fintech' | 'EV & Auto' | 'Biotech' | 'Consumer';

export interface NewsItem {
  id: string;
  ticker: string;
  headline: string;
  source: string;
  publishedTime: string;
  sentimentRating: SentimentRating;
  sentimentScore: number; // 0 to 100
  summary: string;
  catalystType: 'Earnings Beat' | 'FDA Approval' | 'Analyst Upgrade' | 'Partnership' | 'Retail Momentum';
  url?: string;
}

export interface StockPrediction {
  ticker: string;
  name: string;
  category: StockCategory;
  currentPrice: number;
  predictedEodTarget: number;
  expectedGainPercent: number;
  sentimentRating: SentimentRating;
  sentimentScore: number;
  catalystHeadline: string;
  volumeSpike: string;
  recommendedAction: 'STRONG BUY' | 'BUY' | 'HOLD' | 'AVOID';
  historicalIntraday: { time: string; price: number }[];
}

export interface LimitOrderStrategy {
  ticker: string;
  name: string;
  allocatedAmount: number;
  currentPrice: number;
  shareCount: number;
  limitSellPrice: number;
  stopLossPrice: number;
  projectedProfit: number;
  projectedProfitPercent: number;
  executionStatus: 'PENDING' | 'LIMIT_SET' | 'EXECUTED';
}

export interface PortfolioSummary {
  totalBudget: number;
  allocatedAmount: number;
  remainingCash: number;
  topPicksCount: number;
  totalProjectedEodValue: number;
  totalProjectedProfit: number;
  totalProjectedRoiPercent: number;
  limitOrders: LimitOrderStrategy[];
}
