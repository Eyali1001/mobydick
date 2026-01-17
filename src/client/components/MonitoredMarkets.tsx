import { useState, useEffect, useMemo } from 'react';

interface Market {
  id: string;
  question: string;
  image: string;
  icon: string;
  slug: string;
  volume: number;
  liquidity: number;
  category: string;
}

const SOCKET_URL =
  import.meta.env.MODE === 'production' ? '' : 'http://localhost:3000';

const CATEGORY_COLORS: Record<string, string> = {
  All: 'from-violet-500 to-fuchsia-500',
  Sports: 'from-emerald-500 to-teal-500',
  Politics: 'from-blue-500 to-indigo-500',
  'Crypto & Finance': 'from-amber-500 to-orange-500',
  Tech: 'from-cyan-500 to-sky-500',
  Other: 'from-pink-500 to-rose-500',
};

export function MonitoredMarkets() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    async function fetchMarkets() {
      try {
        const response = await fetch(`${SOCKET_URL}/api/monitored-markets`);
        if (response.ok) {
          const data = await response.json();
          setMarkets(data);
        }
      } catch (error) {
        console.error('Failed to fetch monitored markets:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchMarkets();
    const interval = setInterval(fetchMarkets, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(markets.map((m) => m.category));
    return ['All', ...Array.from(cats).sort()];
  }, [markets]);

  const filteredMarkets = useMemo(() => {
    if (activeCategory === 'All') return markets;
    return markets.filter((m) => m.category === activeCategory);
  }, [markets, activeCategory]);

  const displayedMarkets = expanded ? filteredMarkets : filteredMarkets.slice(0, 10);

  const getCategoryCount = (cat: string) => {
    if (cat === 'All') return markets.length;
    return markets.filter((m) => m.category === cat).length;
  };

  return (
    <div className="bg-white/20 backdrop-blur-md rounded-xl p-3 md:p-4 mt-6 border border-white/30">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base md:text-lg font-bold text-white">🎯 Monitored Markets</h3>
        <span className="text-xs md:text-sm text-white/70">
          {filteredMarkets.length} markets
        </span>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-1.5 md:gap-2 mb-4">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setActiveCategory(cat);
              setExpanded(false);
            }}
            className={`px-2 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
              activeCategory === cat
                ? `bg-gradient-to-r ${CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other} text-white shadow-lg`
                : 'bg-white/20 text-white/80 hover:bg-white/30'
            }`}
          >
            {cat}
            <span className="ml-1 md:ml-2 text-[10px] md:text-xs opacity-70">
              ({getCategoryCount(cat)})
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-white/60">
          Loading markets...
        </div>
      ) : filteredMarkets.length === 0 ? (
        <div className="text-center py-8 text-white/60">
          No markets in this category
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
            {displayedMarkets.map((market) => (
              <a
                key={market.id}
                href={`https://polymarket.com/market/${market.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-white/20 rounded-xl p-2 md:p-3 hover:bg-white/30 transition-all border border-white/20 hover:border-white/40"
              >
                <div className="aspect-square mb-2 overflow-hidden rounded-lg bg-white/10">
                  {market.image ? (
                    <img
                      src={market.image}
                      alt={market.question}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/30">
                      <svg
                        className="w-6 md:w-8 h-6 md:h-8"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <p
                  className="text-[10px] md:text-xs text-white line-clamp-2 leading-tight font-medium"
                  title={market.question}
                >
                  {market.question}
                </p>
                <div className="flex items-center justify-between mt-1 md:mt-2">
                  <p className="text-[10px] md:text-xs text-white/60">
                    ${(market.volume / 1000).toFixed(0)}K
                  </p>
                  <span
                    className={`text-[8px] md:text-[10px] px-1 md:px-1.5 py-0.5 rounded bg-gradient-to-r ${CATEGORY_COLORS[market.category] || CATEGORY_COLORS.Other} text-white/90`}
                  >
                    {market.category}
                  </span>
                </div>
              </a>
            ))}
          </div>

          {filteredMarkets.length > 10 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-4 w-full py-2 md:py-2.5 text-xs md:text-sm text-white bg-white/20 hover:bg-white/30 rounded-lg transition-all border border-white/20"
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
