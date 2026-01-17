import { WhaleTable } from './WhaleTable';
import { WhaleInsights } from './WhaleInsights';
import { StatsCards } from './StatsCards';
import { MonitoredMarkets } from './MonitoredMarkets';
import { AnimatedBackground } from './AnimatedBackground';
import { useWebSocket } from '../hooks/useWebSocket';

export function Dashboard() {
  const { whales, stats, isConnected, clearWhales } = useWebSocket();

  return (
    <>
      <AnimatedBackground />
      <div className="relative min-h-screen text-white p-3 md:p-6">
        <header className="mb-4 md:mb-8">
          <div className="flex flex-col items-center text-center mb-4 md:mb-6">
            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight bg-gradient-to-r from-white via-sky-100 to-white bg-clip-text text-transparent drop-shadow-2xl" style={{ fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif" }}>
              POLYMARKET
            </h1>
            <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-wide text-white/90 mt-0.5 md:mt-1" style={{ fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif" }}>
              WHALE DETECTOR
            </h2>
            <p className="text-white/70 mt-1 md:mt-2 text-xs md:text-base">
              Real-time monitoring of large trades
            </p>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-white/30 mt-2 md:mt-4">
              <span
                className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50' : 'bg-red-400'}`}
              />
              <span className="text-xs md:text-sm text-white font-medium">
                {isConnected ? 'Live' : 'Disconnected'}
              </span>
            </div>
          </div>
        </header>

        <StatsCards stats={stats} />

        <div className="mt-4 md:mt-6 space-y-2 md:space-y-3">
          <WhaleInsights whales={whales} />
          <WhaleTable whales={whales} onClear={clearWhales} />
        </div>

        <MonitoredMarkets />

        <footer className="mt-8 text-center text-white/50 text-xs md:text-sm">
          <p>
            Data provided by Polymarket APIs. Whale detection uses statistical anomaly analysis.
          </p>
        </footer>
      </div>
    </>
  );
}
