const fs = require('fs');
const path = require('path');

// Read API key from environment or .env file
function getApiKey() {
  if (process.env.VITE_FINNHUB_API_KEY) {
    return process.env.VITE_FINNHUB_API_KEY;
  }
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/VITE_FINNHUB_API_KEY=([^\r\n]+)/);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return '';
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('HTTP ' + res.status + ' for ' + url);
  }
  return res.json();
}

async function generateTrendingCache() {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('Error: No VITE_FINNHUB_API_KEY found in environment or .env');
    process.exit(1);
  }

  console.log('1. Fetching live morning financial news...');
  const news = await fetchJson('https://finnhub.io/api/v1/news?category=general&token=' + apiKey);
  if (!Array.isArray(news) || news.length === 0) {
    console.error('No news returned from Finnhub.');
    process.exit(1);
  }

  console.log('Received ' + news.length + ' news articles.');

  // Extract candidate company names/keywords from headlines
  const keywords = new Set();
  const wordRegex = /\b[A-Z][a-zA-Z0-9]{2,15}\b/g;

  const stopWords = new Set([
    'The', 'Why', 'How', 'What', 'When', 'Where', 'Who', 'Plus', 'This', 'That',
    'With', 'From', 'About', 'After', 'Before', 'Into', 'Over', 'More', 'Most',
    'Some', 'Other', 'News', 'Daily', 'Report', 'Market', 'Markets', 'Stock', 'Stocks',
    'Trading', 'Investors', 'Investing', 'Economy', 'Global', 'America', 'American',
    'President', 'Election', 'Congress', 'Senate', 'House', 'White', 'State', 'States',
    'Reuters', 'CNBC', 'Bloomberg', 'Wall', 'Street', 'Live', 'Watch', 'Says', 'Will',
    'Could', 'Should', 'May', 'Can', 'Makes', 'Takes', 'Kicking', 'Bets', 'Lead',
    'Slaps', 'Masks', 'Seize', 'Cheers', 'Maps', 'Blows', 'Ties', 'Vance', 'Trump',
    'Biden', 'Democrats', 'Republicans', 'Ukraine', 'Russia', 'China', 'Iran', 'Israel',
    'Bank', 'Banks', 'Federal', 'Reserve', 'Rates', 'Dollar', 'Yield', 'Yields', 'Gold',
    'Oil', 'Energy', 'Fund', 'Funds', 'Tech', 'Technology', 'Bull', 'Bear', 'Deal'
  ]);

  for (const item of news.slice(0, 50)) {
    const text = item.headline + ' ' + (item.summary || '');
    const words = text.match(wordRegex) || [];
    for (const w of words) {
      if (!stopWords.has(w) && w.length >= 3) {
        keywords.add(w);
      }
    }
  }

  console.log('Found ' + keywords.size + ' potential keywords in headlines.');

  // Match symbols using Finnhub search API
  const foundTickers = new Map();
  const keywordArray = Array.from(keywords).slice(0, 20);

  for (const kw of keywordArray) {
    try {
      const searchRes = await fetchJson('https://finnhub.io/api/v1/search?q=' + encodeURIComponent(kw) + '&token=' + apiKey);
      if (searchRes.result && searchRes.result.length > 0) {
        const top = searchRes.result.find(r => r.type === 'Common Stock' && !r.symbol.includes('.') && r.symbol.length <= 5);
        if (top) {
          foundTickers.set(top.symbol, { name: top.description, keyword: kw });
        }
      }
    } catch (err) {
      // ignore individual search error
    }
  }

  // Expand with peers of the top matched companies to ensure a full list of active liquid stocks
  const tickerList = Array.from(foundTickers.keys());
  for (const sym of tickerList.slice(0, 3)) {
    try {
      const peers = await fetchJson('https://finnhub.io/api/v1/stock/peers?symbol=' + sym + '&token=' + apiKey);
      if (Array.isArray(peers)) {
        for (const p of peers) {
          if (!p.includes('.') && p.length <= 5 && !foundTickers.has(p)) {
            foundTickers.set(p, { name: p, keyword: 'Peer of ' + sym });
          }
        }
      }
    } catch (err) {
      // ignore
    }
  }

  console.log('Identified ' + foundTickers.size + ' active equity candidates.');

  // Query live quotes to verify valid pricing and calculate morning momentum/positivity
  const scored = [];
  for (const [sym, meta] of foundTickers.entries()) {
    try {
      const quote = await fetchJson('https://finnhub.io/api/v1/quote?symbol=' + sym + '&token=' + apiKey);
      if (quote && typeof quote.c === 'number' && quote.c > 0) {
        const changePercent = typeof quote.dp === 'number' ? quote.dp : 0;
        scored.push({
          ticker: sym,
          name: meta.name,
          currentPrice: quote.c,
          changePercent: changePercent,
        });
      }
    } catch (err) {
      // ignore quote error
    }
  }

  // Sort candidates by positive day momentum
  scored.sort((a, b) => b.changePercent - a.changePercent);

  // Take top 8 as trending morning watchlist, next 10 as suggestions
  const trendingTickers = scored.slice(0, 8).map(s => s.ticker);
  const suggestions = scored.slice(8, 18).map(s => s.ticker);

  const ttlHours = Number(process.env.VITE_NEWS_CACHE_TTL_HOURS) || 2;
  const output = {
    updatedAt: new Date().toISOString(),
    timestamp: Date.now(),
    ttlHours: ttlHours,
    trendingTickers: trendingTickers,
    suggestions: suggestions,
  };

  console.log('\nGenerated Trending Cache:');
  console.log(JSON.stringify(output, null, 2));

  // Write to public/trending-cache.json and /var/www/html/advisor/trending-cache.json if directory exists
  const publicPath = path.resolve(__dirname, '../public/trending-cache.json');
  fs.writeFileSync(publicPath, JSON.stringify(output, null, 2));
  console.log('\nSaved to: ' + publicPath);

  const apachePath = '/var/www/html/advisor/trending-cache.json';
  if (fs.existsSync('/var/www/html/advisor')) {
    try {
      fs.writeFileSync(apachePath, JSON.stringify(output, null, 2));
      console.log('Saved to: ' + apachePath);
    } catch (e) {
      console.warn('Could not write directly to Apache path (may need sudo):', e.message);
    }
  }

  return output;
}

generateTrendingCache().catch(err => {
  console.error('Fatal error generating cache:', err);
  process.exit(1);
});
