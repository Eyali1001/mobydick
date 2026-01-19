interface Whale {
  id: string;
  marketTitle: string;
  side: 'BUY' | 'SELL';
  usdcSize: number;
  severity: string;
}

interface WhaleInsightsProps {
  whales: Whale[];
}

export function WhaleInsights({ whales }: WhaleInsightsProps) {
  const severityCounts = whales.reduce(
    (acc, w) => {
      acc[w.severity] = (acc[w.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const buys = whales.filter((w) => w.side === 'BUY').length;
  const sells = whales.filter((w) => w.side === 'SELL').length;

  if (whales.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-4 text-xs text-neutral-600">
      <div className="flex items-center gap-2">
        <span className="text-neutral-400">Severity:</span>
        {['LOW', 'MEDIUM', 'HIGH', 'EXTREME'].map((severity) => {
          const count = severityCounts[severity] || 0;
          if (count === 0) return null;
          return (
            <span key={severity} className="text-neutral-700">
              {severity} ({count})
            </span>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-neutral-400">Direction:</span>
        <span className="text-green-700">Buy {buys}</span>
        <span className="text-red-700">Sell {sells}</span>
      </div>
    </div>
  );
}
