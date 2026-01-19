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
      tooltip: 'Total whale trades detected',
    },
    {
      label: 'Last 24h',
      value: stats.last24h?.toLocaleString() || '0',
      tooltip: 'Whale trades in the last 24 hours',
    },
    {
      label: 'Volume',
      value: `$${((stats.totalVolume || 0) / 1000).toFixed(0)}K`,
      tooltip: 'Total whale trade volume',
    },
    {
      label: 'Avg Size',
      value: `$${stats.avgTradeSize.toFixed(0)}`,
      tooltip: 'Average trade size',
    },
    {
      label: 'Markets',
      value: stats.marketCount.toLocaleString(),
      tooltip: 'Markets monitored',
    },
    {
      label: 'Analyzed',
      value: stats.globalTradeCount.toLocaleString(),
      tooltip: 'Trades analyzed',
    },
  ];

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="border border-beige-border px-3 py-2 md:px-4 md:py-3 cursor-help hover:bg-beige-dark transition-colors"
          title={card.tooltip}
        >
          <p className="text-ink-muted text-xs uppercase tracking-wide font-mono">{card.label}</p>
          <p className="text-lg md:text-xl font-medium text-ink mt-0.5 font-mono">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
