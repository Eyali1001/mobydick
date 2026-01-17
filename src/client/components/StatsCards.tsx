interface Stats {
  globalTradeCount: number;
  marketCount: number;
  avgTradeSize: number;
  whaleCount: number;
  totalWhales?: number;
  last24h?: number;
  totalVolume?: number;
}

interface StatsCardsProps {
  stats: Stats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      label: 'Total Whales',
      value: stats.totalWhales?.toLocaleString() || stats.whaleCount.toLocaleString(),
      emoji: '🐋',
      tooltip: 'Total whale trades detected in database',
    },
    {
      label: 'Last 24h',
      value: stats.last24h?.toLocaleString() || '0',
      emoji: '📊',
      tooltip: 'Whale trades detected in the last 24 hours',
    },
    {
      label: 'Whale Volume',
      value: `$${((stats.totalVolume || 0) / 1000).toFixed(1)}K`,
      emoji: '💰',
      tooltip: 'Total USDC volume of detected whale trades',
    },
    {
      label: 'Avg Size',
      value: `$${stats.avgTradeSize.toFixed(0)}`,
      emoji: '📈',
      tooltip: 'Average trade size in rolling analysis window',
    },
    {
      label: 'Monitored',
      value: stats.marketCount.toLocaleString(),
      emoji: '🎯',
      tooltip: 'Number of markets currently being monitored',
    },
    {
      label: 'Analyzed',
      value: stats.globalTradeCount.toLocaleString(),
      emoji: '⚡',
      tooltip: 'Recent trades analyzed from monitored markets (rolling window)',
    },
  ];

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white/20 backdrop-blur-md rounded-xl p-3 md:p-4 border border-white/30 shadow-xl hover:bg-white/30 transition-all duration-200 cursor-help"
          title={card.tooltip}
        >
          <div className="flex items-center gap-1 md:gap-2">
            <span className="text-lg md:text-xl">{card.emoji}</span>
            <p className="text-white/80 text-xs md:text-sm font-medium truncate">{card.label}</p>
          </div>
          <p className="text-xl md:text-2xl lg:text-3xl font-bold text-white drop-shadow-lg mt-1">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
