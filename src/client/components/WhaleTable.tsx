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
      All: whales.length,
      Politics: 0,
      Crypto: 0,
      Sports: 0,
      Entertainment: 0,
      Science: 0,
      Business: 0,
      Other: 0,
    };
    whales.forEach(whale => {
      const cat = inferCategory(whale.marketTitle);
      counts[cat]++;
    });
    return counts;
  }, [whales]);
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'EXTREME':
        return 'bg-red-600';
      case 'HIGH':
        return 'bg-orange-500';
      case 'MEDIUM':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getSeverityBorder = (severity: string) => {
    switch (severity) {
      case 'EXTREME':
        return 'border-l-red-600';
      case 'HIGH':
        return 'border-l-orange-500';
      case 'MEDIUM':
        return 'border-l-yellow-500';
      default:
        return 'border-l-blue-500';
    }
  };

  if (whales.length === 0) {
    return (
      <div className="bg-white/20 backdrop-blur-md rounded-xl p-6 md:p-8 text-center border border-white/30">
        <p className="text-white text-lg">No whale activity detected yet</p>
        <p className="text-white/60 text-sm mt-2">
          Monitoring Polymarket for large trades...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white/20 backdrop-blur-md rounded-xl overflow-hidden border border-white/30">
      <div className="p-3 md:p-4 border-b border-white/20">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg md:text-xl font-bold text-white">🐋 Recent Whale Activity</h2>
          <div className="flex items-center gap-2 md:gap-3">
            <span className="text-xs md:text-sm text-white/70">
              {filteredWhales.length}{selectedCategory !== 'All' ? ` / ${whales.length}` : ''} detected
            </span>
            {onClear && whales.length > 0 && (
              <button
                onClick={onClear}
                className="px-2 py-1 md:px-3 md:py-1.5 text-xs md:text-sm bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg transition-colors border border-white/20"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 md:gap-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-2 py-1 md:px-3 md:py-1.5 text-xs md:text-sm rounded-lg transition-colors ${
                selectedCategory === category
                  ? 'bg-white/30 text-white font-medium'
                  : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
              }`}
            >
              {category}
              {categoryCounts[category] > 0 && (
                <span className="ml-1 text-white/50">({categoryCounts[category]})</span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-auto max-h-[500px]">
        <table className="w-full">
          <thead className="bg-white/10">
            <tr>
              <th
                className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-medium text-white/80 cursor-help"
                title="Trade severity level: LOW (Z>2), MEDIUM (Z>2.5 or >$25K), HIGH (Z>3 or >$50K), EXTREME (Z>4 or >$100K)"
              >
                Severity
              </th>
              <th
                className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-medium text-white/80 cursor-help"
                title="The Polymarket prediction market where the trade occurred"
              >
                Market
              </th>
              <th
                className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-medium text-white/80 cursor-help"
                title="Trade direction and outcome: e.g., BUY Yes = betting the outcome happens"
              >
                Position
              </th>
              <th
                className="px-2 md:px-4 py-2 md:py-3 text-right text-xs md:text-sm font-medium text-white/80 cursor-help"
                title="Trade size in USDC (US Dollar stablecoin) - the dollar value of the trade"
              >
                Size
              </th>
              <th
                className="px-2 md:px-4 py-2 md:py-3 text-right text-xs md:text-sm font-medium text-white/80 cursor-help hidden lg:table-cell"
                title="Probability price: the implied likelihood of the outcome (e.g., 65% = market thinks 65% chance)"
              >
                Price
              </th>
              <th
                className="px-2 md:px-4 py-2 md:py-3 text-right text-xs md:text-sm font-medium text-white/80 cursor-help hidden lg:table-cell"
                title="Z-Score: how many standard deviations this trade is from average. Higher = more unusual. >2 is notable, >3 is rare, >4 is extreme"
              >
                Z-Score
              </th>
              <th
                className="px-2 md:px-4 py-2 md:py-3 text-right text-xs md:text-sm font-medium text-white/80 cursor-help hidden md:table-cell"
                title="Suspicion Score (0-100): combined metric factoring in trade size, z-score, and percentile. Higher = more unusual activity"
              >
                Score
              </th>
              <th
                className="px-2 md:px-4 py-2 md:py-3 text-left text-xs md:text-sm font-medium text-white/80 cursor-help"
                title="When the trade was executed"
              >
                Time
              </th>
              <th
                className="px-2 md:px-4 py-2 md:py-3 text-center text-xs md:text-sm font-medium text-white/80 cursor-help"
                title="View trader's Polymarket profile"
              >
                Profile
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {filteredWhales.map((whale) => (
              <tr
                key={whale.id}
                className={`border-l-4 ${getSeverityBorder(whale.severity)} hover:bg-white/10 transition-colors`}
              >
                <td className="px-2 md:px-4 py-2 md:py-3">
                  <span
                    className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded text-[10px] md:text-xs font-medium ${getSeverityColor(whale.severity)} text-white`}
                  >
                    {whale.severity}
                  </span>
                </td>
                <td className="px-2 md:px-4 py-2 md:py-3 max-w-[120px] md:max-w-xs">
                  <a
                    href={whale.marketSlug
                      ? `https://polymarket.com/market/${whale.marketSlug}`
                      : `https://polymarket.com/markets?_q=${encodeURIComponent(whale.marketTitle.slice(0, 50))}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-xs md:text-sm text-white hover:text-blue-300 transition-colors block"
                    title={whale.marketTitle}
                  >
                    {whale.marketTitle}
                  </a>
                </td>
                <td className="px-2 md:px-4 py-2 md:py-3">
                  <span
                    className={`font-medium text-xs md:text-sm ${whale.side === 'BUY' ? 'text-emerald-300' : 'text-rose-300'}`}
                  >
                    {whale.side} {whale.outcome || ''}
                  </span>
                </td>
                <td className="px-2 md:px-4 py-2 md:py-3 text-right font-mono text-xs md:text-sm text-white">
                  ${whale.usdcSize.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
                <td className="px-2 md:px-4 py-2 md:py-3 text-right font-mono text-sm text-white/80 hidden lg:table-cell">
                  {(whale.price * 100).toFixed(1)}%
                </td>
                <td className="px-2 md:px-4 py-2 md:py-3 text-right font-mono text-sm hidden lg:table-cell">
                  <span
                    className={
                      whale.zScore > 3
                        ? 'text-rose-300'
                        : whale.zScore > 2
                          ? 'text-amber-300'
                          : 'text-white/70'
                    }
                  >
                    {whale.zScore.toFixed(2)}
                  </span>
                </td>
                <td className="px-2 md:px-4 py-2 md:py-3 text-right hidden md:table-cell">
                  <span
                    className={`font-bold text-sm ${
                      whale.suspicionScore > 80
                        ? 'text-rose-300'
                        : whale.suspicionScore > 60
                          ? 'text-orange-300'
                          : whale.suspicionScore > 40
                            ? 'text-amber-300'
                            : 'text-sky-300'
                    }`}
                  >
                    {whale.suspicionScore.toFixed(0)}
                  </span>
                </td>
                <td className="px-2 md:px-4 py-2 md:py-3 text-white/60 text-xs md:text-sm">
                  {formatDistanceToNow(new Date(whale.timestamp), {
                    addSuffix: true,
                  })}
                </td>
                <td className="px-2 md:px-4 py-2 md:py-3 text-center">
                  <a
                    href={`https://polymarket.com/profile/${whale.walletAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/70 hover:text-white"
                    title={`View profile: ${whale.walletAddress.slice(0, 6)}...${whale.walletAddress.slice(-4)}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
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
