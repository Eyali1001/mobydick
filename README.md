# Moby Dick - Polymarket Whale Detector

A real-time dashboard for monitoring large trades ("whale activity") on [Polymarket](https://polymarket.com), the world's largest prediction market.

![Dashboard Preview](https://img.shields.io/badge/status-live-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue)

## What It Does

Moby Dick connects to Polymarket's APIs and WebSocket feeds to detect unusually large trades in real-time. It uses statistical anomaly detection to identify "whale" activity that could indicate significant market moves.

### Key Features

- **Real-time Trade Monitoring** - WebSocket connection to Polymarket for live trade data
- **Anomaly Detection** - Z-score and percentile-based analysis to identify unusual trades
- **Severity Classification** - Trades categorized as LOW, MEDIUM, HIGH, or EXTREME based on size and statistical deviation
- **Whale Insights** - Visual breakdown of severity distribution and buy/sell ratios
- **Profile Links** - Direct links to trader profiles on Polymarket
- **Mobile Responsive** - Works on desktop and mobile devices
- **Monitored Markets** - Browse all markets being tracked with category filters

## How It Works

### Detection Algorithm

Trades are flagged as "whales" when they meet either criterion:
- **Z-Score > 1.5** - More than 1.5 standard deviations above the mean trade size
- **Trade Size > $5,000** - Absolute threshold for significant trades

Severity levels are assigned based on:
| Severity | Z-Score | Trade Size |
|----------|---------|------------|
| LOW | > 1.5 | > $5,000 |
| MEDIUM | > 2.5 | > $25,000 |
| HIGH | > 3.0 | > $50,000 |
| EXTREME | > 4.0 | > $100,000 |

### Data Sources

- **Gamma API** - Market discovery and metadata
- **Data API** - Trade history and user activity
- **CLOB WebSocket** - Real-time price updates

## Tech Stack

### Backend
- Node.js + TypeScript
- Express.js
- WebSocket (ws)
- Prisma + SQLite
- Socket.io for real-time client updates

### Frontend
- React 18 + TypeScript
- Tailwind CSS
- Vite
- Recharts

## Getting Started

### Prerequisites
- Node.js 20+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Eyali1001/mobydick.git
cd mobydick

# Install dependencies
npm install

# Set up the database
npx prisma generate
npx prisma db push

# Start development servers
npm run dev          # Backend on port 3000
npm run dev:client   # Frontend on port 5173
```

### Environment Variables

Create a `.env` file (see `.env.example`):

```env
DATABASE_URL="file:./dev.db"
NODE_ENV=development
PORT=3000
```

## Project Structure

```
mobydick/
├── src/
│   ├── server/
│   │   ├── index.ts              # Express server entry
│   │   ├── routes/api.ts         # REST endpoints
│   │   └── services/
│   │       ├── polymarket.ts     # Polymarket API client
│   │       ├── websocket.ts      # WebSocket connection
│   │       ├── anomaly.ts        # Detection algorithms
│   │       └── database.ts       # Prisma operations
│   └── client/
│       ├── App.tsx
│       ├── components/
│       │   ├── Dashboard.tsx
│       │   ├── WhaleTable.tsx
│       │   ├── WhaleInsights.tsx
│       │   ├── StatsCards.tsx
│       │   └── MonitoredMarkets.tsx
│       └── hooks/
│           └── useWebSocket.ts
├── prisma/
│   └── schema.prisma
└── package.json
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/whales` | Recent whale trades (sorted by severity) |
| `GET /api/stats` | Aggregate statistics |
| `GET /api/markets` | All Polymarket markets |
| `GET /api/monitored-markets` | Currently monitored markets |
| `GET /api/alerts` | High-severity alerts |
| `POST /api/cleanup-unknown` | Remove unknown market entries |

## Deployment

The project includes configuration for Railway deployment:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway add --database postgres
railway up
```

See `railway.json` and `Dockerfile` for deployment configuration.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details.

## Disclaimer

This tool is for informational purposes only. It is not financial advice. Trading on prediction markets involves risk. Always do your own research before making any trading decisions.

---

Built with Claude Code
