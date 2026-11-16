import { useState } from 'react';
import type { NewsItem } from '../types/stock';
import { Newspaper, Search, ThumbsUp, ThumbsDown, ExternalLink } from 'lucide-react';

interface NewsSentimentFeedProps {
  newsItems: NewsItem[];
}

export const NewsSentimentFeed: React.FC<NewsSentimentFeedProps> = ({ newsItems }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSentiment, setSelectedSentiment] = useState<'ALL' | '+' | '-'>('ALL');

  const filteredNews = newsItems.filter((item) => {
    const matchesQuery = 
      item.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.headline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSentiment = 
      selectedSentiment === 'ALL' || item.sentimentRating === selectedSentiment;

    return matchesQuery && matchesSentiment;
  });

  return (
    <div className="glass-card p-5 sm:p-6 mb-8">
      
      {/* Title & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4 mb-6">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
            <Newspaper className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
              Morning Financial News Sentiment Feed
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              AI-analyzed market catalysts, pre-market press releases, and earnings reports
            </p>
          </div>
        </div>

        {/* Search & Sentiment Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search ticker or news..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 w-44 sm:w-56"
            />
          </div>

          <div className="flex bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-white/10 text-xs">
            <button
              onClick={() => setSelectedSentiment('ALL')}
              className={`px-2.5 py-1 rounded-md transition font-semibold ${
                selectedSentiment === 'ALL'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All News
            </button>
            <button
              onClick={() => setSelectedSentiment('+')}
              className={`px-2.5 py-1 rounded-md transition font-semibold flex items-center space-x-1 ${
                selectedSentiment === '+'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              <ThumbsUp className="w-3 h-3" />
              <span>Bullish [+]</span>
            </button>
            <button
              onClick={() => setSelectedSentiment('-')}
              className={`px-2.5 py-1 rounded-md transition font-semibold flex items-center space-x-1 ${
                selectedSentiment === '-'
                  ? 'bg-rose-500 text-slate-900 dark:text-white font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
              }`}
            >
              <ThumbsDown className="w-3 h-3" />
              <span>Bearish [-]</span>
            </button>
          </div>
        </div>
      </div>

      {/* News List */}
      <div className="space-y-3">
        {filteredNews.map((item) => {
          const isBullish = item.sentimentRating === '+';
          return (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 transition space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-black text-sm px-2.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10">
                    {item.ticker}
                  </span>

                  <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                    isBullish
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40'
                  }`}>
                    [{item.sentimentRating}] Score: {item.sentimentScore}/100
                  </span>

                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-[10px] font-semibold border border-cyan-500/30">
                    {item.catalystType}
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                  <span>{item.source} • {item.publishedTime}</span>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition"
                      title="Open full news article"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              <h4 className="font-display font-bold text-sm text-slate-900 dark:text-slate-100 leading-snug">
                {item.headline}
              </h4>

              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {item.summary}
              </p>
            </div>
          );
        })}

        {filteredNews.length === 0 && (
          <div className="text-center py-8 text-xs text-slate-500">
            No news articles found matching filter criteria.
          </div>
        )}
      </div>

    </div>
  );
};
