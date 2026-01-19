import { WhaleTable } from './WhaleTable';
import { WhaleInsights } from './WhaleInsights';
import { StatsCards } from './StatsCards';
import { MonitoredMarkets } from './MonitoredMarkets';
import { useWebSocket } from '../hooks/useWebSocket';

export function Dashboard() {
  const { whales, stats, isConnected, clearWhales } = useWebSocket();

  return (
    <div className="min-h-screen text-neutral-900 p-4 md:p-8 max-w-6xl mx-auto">
        <header className="mb-6 md:mb-10 border-b border-neutral-300 pb-4">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
                Polymarket Whale Detector
              </h1>
              <p className="text-neutral-500 text-xs md:text-sm mt-1">
                Real-time large trade monitoring
              </p>
            </div>
            <div className="flex items-center gap-2 mt-2 md:mt-0">
              <span
                className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-600' : 'bg-red-500'}`}
              />
              <span className="text-xs text-neutral-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </header>

        <StatsCards stats={stats} />

        <div className="mt-6 md:mt-8 space-y-4">
          <WhaleInsights whales={whales} />
          <WhaleTable whales={whales} onClear={clearWhales} />
        </div>

        <MonitoredMarkets />

        <footer className="mt-10 pt-4 border-t border-neutral-300 text-center text-neutral-400 text-xs">
          <p>Data from Polymarket. Whale detection via statistical anomaly analysis.</p>
        </footer>
      </div>
  );
}
