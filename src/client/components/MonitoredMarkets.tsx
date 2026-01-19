import { useState, useEffect } from 'react';

interface TopMarket {
  conditionId: string;
  title: string;
  slug: string;
  volume: number;
}

const SOCKET_URL =
  import.meta.env.MODE === 'production' ? '' : 'http://localhost:3000';

export function MonitoredMarkets() {
  const [markets, setMarkets] = useState<TopMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

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

  const displayedMarkets = expanded ? markets : markets.slice(0, 10);

  return (
    <div className="bg-white/20 backdrop-blur-md rounded-xl p-3 md:p-4 mt-6 border border-white/30">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base md:text-lg font-bold text-white">🎯 Monitored Markets (by volume)</h3>
        <span className="text-xs md:text-sm text-white/70">
          {markets.length} markets
        </span>
      </div>

      {loading ? (
        <div className="text-center py-8 text-white/60">
          Loading markets...
        </div>
      ) : markets.length === 0 ? (
        <div className="text-center py-8 text-white/60">
          No markets being monitored
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {displayedMarkets.map((market, index) => (
              <a
                key={market.conditionId}
                href={`https://polymarket.com/market/${market.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 md:p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all border border-white/10 hover:border-white/30"
              >
                <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                  <span className="text-white/50 text-xs md:text-sm font-mono w-5 md:w-6 text-right shrink-0">
                    {index + 1}
                  </span>
                  <p className="text-xs md:text-sm text-white truncate" title={market.title}>
                    {market.title}
                  </p>
                </div>
                <span className="text-xs md:text-sm text-white/60 font-mono shrink-0 ml-2">
                  ${(market.volume / 1000000).toFixed(1)}M
                </span>
              </a>
            ))}
          </div>

          {markets.length > 10 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-4 w-full py-2 md:py-2.5 text-xs md:text-sm text-white bg-white/20 hover:bg-white/30 rounded-lg transition-all border border-white/20"
            >
              {expanded
                ? 'Show less'
                : `Show all ${markets.length} markets`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
