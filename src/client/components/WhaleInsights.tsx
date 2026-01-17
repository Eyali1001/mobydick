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
  // Calculate severity breakdown
  const severityCounts = whales.reduce(
    (acc, w) => {
      acc[w.severity] = (acc[w.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Calculate buy/sell
  const buys = whales.filter((w) => w.side === 'BUY').length;
  const sells = whales.filter((w) => w.side === 'SELL').length;
  const total = buys + sells;
  const buyPercent = total > 0 ? (buys / total) * 100 : 50;

  const severityColors: Record<string, string> = {
    LOW: 'bg-blue-500',
    MEDIUM: 'bg-yellow-500',
    HIGH: 'bg-orange-500',
    EXTREME: 'bg-red-600',
  };

  const severityOrder = ['LOW', 'MEDIUM', 'HIGH', 'EXTREME'];

  if (whales.length === 0) {
    return null;
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 md:p-3 border border-white/10">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-center">
        {/* Severity Breakdown - compact */}
        <div className="flex items-center gap-2 flex-1">
          <span className="text-[10px] md:text-xs text-white/60 whitespace-nowrap">Severity:</span>
          <div className="flex gap-0.5 h-2 rounded-full overflow-hidden bg-white/10 flex-1 max-w-[120px] md:max-w-[150px]">
            {severityOrder.map((severity) => {
              const count = severityCounts[severity] || 0;
              const percent = total > 0 ? (count / total) * 100 : 0;
              if (percent === 0) return null;
              return (
                <div
                  key={severity}
                  className={`${severityColors[severity]}`}
                  style={{ width: `${percent}%` }}
                  title={`${severity}: ${count}`}
                />
              );
            })}
          </div>
          <div className="flex gap-1.5">
            {severityOrder.map((severity) => {
              const count = severityCounts[severity] || 0;
              if (count === 0) return null;
              return (
                <span key={severity} className="text-[10px] md:text-xs text-white/60">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${severityColors[severity]} mr-0.5`} />
                  {count}
                </span>
              );
            })}
          </div>
        </div>

        {/* Buy/Sell - compact */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] md:text-xs text-white/60 whitespace-nowrap">Direction:</span>
          <div className="flex gap-0.5 h-2 w-16 md:w-20 rounded-full overflow-hidden bg-white/10">
            <div className="bg-emerald-500" style={{ width: `${buyPercent}%` }} />
            <div className="bg-rose-500" style={{ width: `${100 - buyPercent}%` }} />
          </div>
          <span className="text-[10px] md:text-xs text-emerald-400">{buys}B</span>
          <span className="text-[10px] md:text-xs text-rose-400">{sells}S</span>
        </div>
      </div>
    </div>
  );
}
