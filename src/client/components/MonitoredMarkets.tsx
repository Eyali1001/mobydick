import { useState, useEffect, useMemo } from 'react';

interface TopMarket {
  conditionId: string;
  title: string;
  slug: string;
  volume: number;
}

type Category = 'All' | 'Politics' | 'Crypto' | 'Sports' | 'Entertainment' | 'Science' | 'Business' | 'Other';

const CATEGORY_KEYWORDS: Record<Exclude<Category, 'All' | 'Other'>, string[]> = {
  Politics: ['trump', 'biden', 'election', 'president', 'congress', 'senate', 'democrat', 'republican', 'governor', 'mayor', 'vote', 'primary', 'gop', 'political', 'white house', 'supreme court', 'impeach', 'cabinet', 'minister', 'parliament', 'putin', 'zelensky', 'ukraine', 'china', 'iran', 'israel', 'gaza', 'war', 'military', 'nato', 'un ', 'sanctions', 'khamenei', 'netanyahu', 'modi', 'trudeau', 'macron', 'starmer', 'xi jinping'],
  Crypto: ['bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'solana', 'sol', 'dogecoin', 'doge', 'nft', 'defi', 'blockchain', 'binance', 'coinbase', 'token', 'altcoin', 'memecoin', 'xrp', 'cardano'],
  Sports: ['nfl', 'nba', 'mlb', 'nhl', 'football', 'basketball', 'baseball', 'hockey', 'soccer', 'tennis', 'golf', 'ufc', 'mma', 'boxing', 'super bowl', 'world cup', 'olympics', 'championship', 'playoff', 'lakers', 'celtics', 'warriors', 'chiefs', 'eagles', 'mvp', 'premier league', 'champions league', 'fifa'],
  Entertainment: ['oscar', 'grammy', 'emmy', 'movie', 'film', 'album', 'song', 'spotify', 'netflix', 'disney', 'celebrity', 'kardashian', 'taylor swift', 'kanye', 'drake', 'beyonce', 'tv show', 'streaming', 'youtube', 'tiktok', 'influencer', 'viral'],
  Science: ['ai', 'artificial intelligence', 'openai', 'chatgpt', 'gpt', 'spacex', 'nasa', 'mars', 'moon', 'climate', 'fda', 'vaccine', 'covid', 'pandemic', 'research', 'scientist', 'discovery', 'medical', 'health', 'disease'],
  Business: ['stock', 'market', 'fed', 'federal reserve', 'interest rate', 'inflation', 'recession', 'gdp', 'earnings', 'ipo', 'merger', 'acquisition', 'tesla', 'apple', 'google', 'amazon', 'microsoft', 'nvidia', 'meta', 'layoff', 'ceo', 'company', 's&p', 'dow', 'nasdaq'],
};

function inferCategory(title: string): Category {
  const lowerTitle = title.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => lowerTitle.includes(keyword))) {
      return category as Category;
    }
  }
  return 'Other';
}

const SOCKET_URL =
  import.meta.env.MODE === 'production' ? '' : 'http://localhost:3000';

export function MonitoredMarkets() {
  const [markets, setMarkets] = useState<TopMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');

  useEffect(() => {
    async function fetchMarkets() {
      try {
        const response = await fetch(`${SOCKET_URL}/api/top-markets`);
        if (response.ok) {
          const data = await response.json();
          setMarkets(data);
        }
      } catch (error) {
        console.error('Failed to fetch top markets:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchMarkets();
    const interval = setInterval(fetchMarkets, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const categories: Category[] = ['All', 'Politics', 'Crypto', 'Sports', 'Entertainment', 'Science', 'Business', 'Other'];

  const filteredMarkets = useMemo(() => {
    if (selectedCategory === 'All') return markets;
    return markets.filter(market => inferCategory(market.title) === selectedCategory);
  }, [markets, selectedCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<Category, number> = {
      All: markets.length,
      Politics: 0, Crypto: 0, Sports: 0, Entertainment: 0, Science: 0, Business: 0, Other: 0,
    };
    markets.forEach(market => {
      counts[inferCategory(market.title)]++;
    });
    return counts;
  }, [markets]);

  const displayedMarkets = expanded ? filteredMarkets : filteredMarkets.slice(0, 10);

  return (
    <div className="border border-neutral-300 rounded p-3 md:p-4 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-neutral-900">Monitored Markets (by volume)</h3>
        <span className="text-xs text-neutral-500">
          {filteredMarkets.length}{selectedCategory !== 'All' ? ` / ${markets.length}` : ''} markets
        </span>
      </div>
      <div className="flex flex-wrap gap-1 mb-4">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => { setSelectedCategory(category); setExpanded(false); }}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              selectedCategory === category
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300'
            }`}
          >
            {category}
            {categoryCounts[category] > 0 && (
              <span className="ml-1 opacity-60">({categoryCounts[category]})</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-neutral-500 text-sm">
          Loading markets...
        </div>
      ) : markets.length === 0 ? (
        <div className="text-center py-8 text-neutral-500 text-sm">
          No markets being monitored
        </div>
      ) : (
        <>
          <div className="space-y-1">
            {displayedMarkets.map((market, index) => (
              <a
                key={market.conditionId}
                href={`https://polymarket.com/market/${market.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 hover:bg-neutral-100 rounded transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-neutral-400 text-xs font-mono w-5 text-right shrink-0">
                    {index + 1}
                  </span>
                  <p className="text-xs text-neutral-900 truncate" title={market.title}>
                    {market.title}
                  </p>
                </div>
                <span className="text-xs text-neutral-500 font-mono shrink-0 ml-2">
                  ${(market.volume / 1000000).toFixed(1)}M
                </span>
              </a>
            ))}
          </div>

          {filteredMarkets.length > 10 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-3 w-full py-2 text-xs text-neutral-600 border border-neutral-300 hover:border-neutral-400 rounded transition-colors"
            >
              {expanded
                ? 'Show less'
                : `Show all ${filteredMarkets.length} markets`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
