import { formatDistanceToNow } from 'date-fns';
import { useState, useMemo } from 'react';

interface Whale {
  id: string;
  marketTitle: string;
  marketSlug?: string;
  side: 'BUY' | 'SELL';
  outcome?: string;
  size: number;
  usdcSize: number;
  price: number;
  suspicionScore: number;
  severity: string;
  timestamp: Date;
  walletAddress: string;
  zScore: number;
  percentile: number;
}

interface WhaleTableProps {
  whales: Whale[];
  onClear?: () => void;
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

function inferCategory(marketTitle: string): Category {
  const lowerTitle = marketTitle.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(keyword => lowerTitle.includes(keyword))) {
      return category as Category;
    }
  }
  return 'Other';
}

export function WhaleTable({ whales, onClear }: WhaleTableProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');
  const categories: Category[] = ['All', 'Politics', 'Crypto', 'Sports', 'Entertainment', 'Science', 'Business', 'Other'];

  const filteredWhales = useMemo(() => {
    if (selectedCategory === 'All') return whales;
    return whales.filter(whale => inferCategory(whale.marketTitle) === selectedCategory);
  }, [whales, selectedCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<Category, number> = {
      All: whales.length, Politics: 0, Crypto: 0, Sports: 0, Entertainment: 0, Science: 0, Business: 0, Other: 0,
    };
    whales.forEach(whale => { counts[inferCategory(whale.marketTitle)]++; });
    return counts;
  }, [whales]);

  if (whales.length === 0) {
    return (
      <div className="border border-beige-border p-8 text-center">
        <p className="text-ink-muted text-sm font-mono">No whale activity detected yet</p>
        <p className="text-ink-muted text-xs mt-1 font-mono">Monitoring for large trades...</p>
      </div>
    );
  }

  return (
    <div className="border border-beige-border overflow-hidden">
      <div className="px-4 py-3 border-b border-beige-border bg-beige-dark">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-serif text-ink">Recent Whale Activity</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-muted font-mono">
              {filteredWhales.length}{selectedCategory !== 'All' ? ` / ${whales.length}` : ''}
            </span>
            {onClear && whales.length > 0 && (
              <button
                onClick={onClear}
                className="text-xs text-ink-muted hover:text-ink underline font-mono"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-2 py-1 text-xs font-mono transition-colors ${
                selectedCategory === category
                  ? 'bg-ink text-beige'
                  : 'border border-beige-border text-ink-muted hover:bg-beige-dark hover:text-ink'
              }`}
            >
              {category}
              {categoryCounts[category] > 0 && (
                <span className="ml-1 opacity-60">({categoryCounts[category]})</span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-auto max-h-[500px]">
        <table className="w-full text-xs font-mono">
          <thead className="bg-beige-dark sticky top-0">
            <tr className="border-b border-beige-border">
              <th className="px-3 py-2 text-left font-medium text-ink-muted uppercase tracking-wider">Severity</th>
              <th className="px-3 py-2 text-left font-medium text-ink-muted uppercase tracking-wider">Market</th>
              <th className="px-3 py-2 text-left font-medium text-ink-muted uppercase tracking-wider">Position</th>
              <th className="px-3 py-2 text-right font-medium text-ink-muted uppercase tracking-wider">Size</th>
              <th className="px-3 py-2 text-right font-medium text-ink-muted uppercase tracking-wider hidden md:table-cell">Price</th>
              <th className="px-3 py-2 text-right font-medium text-ink-muted uppercase tracking-wider hidden lg:table-cell">Z-Score</th>
              <th className="px-3 py-2 text-left font-medium text-ink-muted uppercase tracking-wider">Time</th>
              <th className="px-3 py-2 text-center font-medium text-ink-muted uppercase tracking-wider">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-beige-border">
            {filteredWhales.map((whale) => (
              <tr key={whale.id} className="hover:bg-beige-dark transition-colors">
                <td className="px-3 py-2">
                  <span className={`text-xs font-medium ${
                    whale.severity === 'EXTREME' ? 'text-red-700' :
                    whale.severity === 'HIGH' ? 'text-orange-700' :
                    whale.severity === 'MEDIUM' ? 'text-yellow-700' : 'text-ink-muted'
                  }`}>
                    {whale.severity}
                  </span>
                </td>
                <td className="px-3 py-2 max-w-[200px]">
                  <a
                    href={whale.marketSlug
                      ? `https://polymarket.com/market/${whale.marketSlug}`
                      : `https://polymarket.com/markets?_q=${encodeURIComponent(whale.marketTitle.slice(0, 50))}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink hover:underline truncate block"
                    title={whale.marketTitle}
                  >
                    {whale.marketTitle}
                  </a>
                </td>
                <td className="px-3 py-2">
                  <span className={whale.side === 'BUY' ? 'text-green-700' : 'text-red-700'}>
                    {whale.side} {whale.outcome || ''}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-ink">
                  ${whale.usdcSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className="px-3 py-2 text-right text-ink-muted hidden md:table-cell">
                  {(whale.price * 100).toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-right text-ink-muted hidden lg:table-cell">
                  {whale.zScore.toFixed(2)}
                </td>
                <td className="px-3 py-2 text-ink-muted">
                  {formatDistanceToNow(new Date(whale.timestamp), { addSuffix: true })}
                </td>
                <td className="px-3 py-2 text-center">
                  <a
                    href={`https://polymarket.com/profile/${whale.walletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink-muted hover:text-ink"
                    title="View profile"
                  >
                    View
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
