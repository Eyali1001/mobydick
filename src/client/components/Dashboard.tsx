import { WhaleTable } from './WhaleTable';
import { WhaleInsights } from './WhaleInsights';
import { StatsCards } from './StatsCards';
import { MonitoredMarkets } from './MonitoredMarkets';
import { useWebSocket } from '../hooks/useWebSocket';

export function Dashboard() {
  const { whales, stats, isConnected, clearWhales } = useWebSocket();

  return (
    <div className="min-h-screen bg-beige text-ink p-6 md:px-6 md:py-12 max-w-5xl mx-auto">
      <header className="mb-12">
        <h1 className="text-3xl font-serif tracking-tight">Polymarket Whale Detector</h1>
        <p className="text-ink-muted text-sm mt-1 font-mono">Real-time large trade monitoring</p>
        <div className="flex items-center gap-2 mt-2">
          <span
            className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-700' : 'bg-red-600'}`}
          />
          <span className="text-xs text-ink-muted font-mono">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <a
          href="https://harpoon-frontend-production.up.railway.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-4 text-sm font-bold text-blue-700 hover:text-blue-900 font-mono"
        >
          Analyze Wallets and Profiles
        </a>
      </header>

      <StatsCards stats={stats} />

      <div className="mt-8 space-y-6">
        <WhaleInsights whales={whales} />
        <WhaleTable whales={whales} onClear={clearWhales} />
      </div>

      <MonitoredMarkets />

      <footer className="mt-16 pt-8 border-t border-beige-border">
        <p className="text-xs text-ink-muted font-mono">
          Data from Polymarket. Whale detection via statistical anomaly analysis.
        </p>
      </footer>
    </div>
  );
}
