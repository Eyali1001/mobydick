# Polymarket Whale Detector - Claude Code Instructions

## Project Overview

Build a dashboard application that monitors Polymarket for unusually large trades ("whale" activity) in real-time. The app should detect, score, and display suspicious trading activity to help users identify significant market moves.

---

## 1. API Architecture

### Primary APIs to Use

| API | Base URL | Purpose |
|-----|----------|---------|
| **CLOB API** | `https://clob.polymarket.com` | Order management, prices, orderbooks |
| **Gamma API** | `https://gamma-api.polymarket.com` | Market discovery, metadata, events |
| **Data API** | `https://data-api.polymarket.com` | User positions, activity, trade history |
| **CLOB WebSocket** | `wss://ws-subscriptions-clob.polymarket.com/ws/` | Real-time orderbook updates, trades |

### Key Endpoints

#### Data API (Primary for Trade Monitoring)
```
GET /trades
  - Query params: market, start, end, limit
  - Returns: Trade history with size, price, side, timestamp

GET /activity
  - Query params: user, market, type=TRADE, start, end
  - Returns: On-chain activity including trades, splits, merges

GET /positions
  - Query params: user, sizeThreshold
  - Returns: Current positions for a wallet
```

#### Gamma API (Market Metadata)
```
GET /events
  - Returns: List of events with associated markets

GET /markets
  - Returns: Market details including volume, outcomes, prices

GET /markets/{id}
  - Returns: Specific market with clobTokenIds
```

#### CLOB API (Real-time Prices)
```
GET /price?token_id={id}
  - Returns: Current price for a token

GET /book?token_id={id}
  - Returns: Full orderbook
```

### WebSocket for Real-Time Trades

Connect to the Market Channel for live trade events:

```javascript
const ws = new WebSocket('wss://ws-subscriptions-clob.polymarket.com/ws/market');

// Subscribe to market updates
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'market',
  markets: ['<market_condition_id>']  // Or subscribe to all
}));

// Trade event structure (event_type: "last_trade_price")
{
  "asset_id": "...",
  "event_type": "last_trade_price",
  "market": "0x...",
  "price": "0.456",
  "side": "BUY",
  "size": "219.217767",
  "timestamp": "1750428146322"
}
```

### Rate Limits
- **Burst**: Up to 3,500 requests per 10 seconds (350/s)
- **Sustained**: ~60 orders/minute for order endpoints
- **Read endpoints**: More generous, ~100-1000 requests/minute
- **Best practice**: Use WebSocket for real-time data, REST for historical

---

## 2. Anomaly Detection Methods

### Method 1: Z-Score Analysis (Recommended Primary)

The Z-score measures how many standard deviations a data point is from the mean.

```
Z = (X - μ) / σ

Where:
- X = current trade size
- μ = mean trade size (rolling window)
- σ = standard deviation of trade sizes
```

**Implementation:**
```javascript
class AnomalyDetector {
  constructor(windowSize = 1000) {
    this.trades = [];
    this.windowSize = windowSize;
  }

  addTrade(trade) {
    this.trades.push(trade.size);
    if (this.trades.length > this.windowSize) {
      this.trades.shift();
    }
  }

  calculateStats() {
    const n = this.trades.length;
    if (n < 10) return null;
    
    const mean = this.trades.reduce((a, b) => a + b, 0) / n;
    const variance = this.trades.reduce((sum, val) => 
      sum + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    
    return { mean, stdDev };
  }

  getZScore(tradeSize) {
    const stats = this.calculateStats();
    if (!stats || stats.stdDev === 0) return 0;
    return (tradeSize - stats.mean) / stats.stdDev;
  }

  isAnomaly(tradeSize, threshold = 2.5) {
    return Math.abs(this.getZScore(tradeSize)) > threshold;
  }
}
```

### Method 2: Percentile-Based Detection

Flag trades above the 95th or 99th percentile:

```javascript
function getPercentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function isWhale(tradeSize, historicalTrades, percentile = 95) {
  const threshold = getPercentile(historicalTrades, percentile);
  return tradeSize > threshold;
}
```

### Method 3: Market-Specific Thresholds

Different markets have different typical volumes. Calculate thresholds per market:

```javascript
class MarketAnomalyDetector {
  constructor() {
    this.marketStats = new Map(); // marketId -> { trades: [], stats: {} }
  }

  updateMarket(marketId, tradeSize) {
    if (!this.marketStats.has(marketId)) {
      this.marketStats.set(marketId, { trades: [], stats: null });
    }
    
    const market = this.marketStats.get(marketId);
    market.trades.push(tradeSize);
    
    // Keep last 500 trades per market
    if (market.trades.length > 500) {
      market.trades.shift();
    }
    
    // Recalculate stats
    if (market.trades.length >= 20) {
      const mean = market.trades.reduce((a, b) => a + b, 0) / market.trades.length;
      const stdDev = Math.sqrt(
        market.trades.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / market.trades.length
      );
      market.stats = { mean, stdDev };
    }
  }

  isAnomaly(marketId, tradeSize) {
    const market = this.marketStats.get(marketId);
    if (!market?.stats) return tradeSize > 10000; // Fallback: $10k+
    
    const zScore = (tradeSize - market.stats.mean) / market.stats.stdDev;
    return Math.abs(zScore) > 2.5;
  }
}
```

### Recommended Detection Thresholds

| Severity | Z-Score | Percentile | Typical USD Value |
|----------|---------|------------|-------------------|
| **Low** | 2.0-2.5 | 90-95th | $5,000-$10,000 |
| **Medium** | 2.5-3.0 | 95-98th | $10,000-$50,000 |
| **High** | 3.0-4.0 | 98-99th | $50,000-$100,000 |
| **Extreme** | >4.0 | >99th | >$100,000 |

### Composite Scoring System

Combine multiple signals for better detection:

```javascript
function calculateSuspicionScore(trade, marketStats, globalStats) {
  let score = 0;
  
  // Factor 1: Size relative to market (0-40 points)
  const marketZScore = getMarketZScore(trade, marketStats);
  score += Math.min(40, marketZScore * 10);
  
  // Factor 2: Size relative to global (0-30 points)
  const globalZScore = getGlobalZScore(trade, globalStats);
  score += Math.min(30, globalZScore * 8);
  
  // Factor 3: Price impact potential (0-15 points)
  // Large trades on low-liquidity markets are more suspicious
  const liquidityRatio = trade.size / marketStats.avgDailyVolume;
  score += Math.min(15, liquidityRatio * 50);
  
  // Factor 4: Timing (0-15 points)
  // Trades during low-volume hours
  const hour = new Date(trade.timestamp).getUTCHours();
  if (hour >= 2 && hour <= 8) score += 10; // Off-peak hours
  
  return Math.min(100, score);
}
```

---

## 3. Recommended Tech Stack

### Backend
- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js or Fastify
- **WebSocket**: `ws` library for Polymarket connection
- **Database**: PostgreSQL (via Railway) for trade history
- **Cache**: Redis for real-time stats (optional)

### Frontend
- **Framework**: React 18+ with TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts or Chart.js
- **Real-time**: Socket.io for frontend updates

### Project Structure
```
polymarket-whale-detector/
├── src/
│   ├── server/
│   │   ├── index.ts              # Express server entry
│   │   ├── routes/
│   │   │   └── api.ts            # REST endpoints
│   │   ├── services/
│   │   │   ├── polymarket.ts     # Polymarket API client
│   │   │   ├── websocket.ts      # WebSocket connection
│   │   │   ├── anomaly.ts        # Detection algorithms
│   │   │   └── database.ts       # DB operations
│   │   └── types/
│   │       └── index.ts          # TypeScript interfaces
│   └── client/
│       ├── App.tsx
│       ├── components/
│       │   ├── Dashboard.tsx
│       │   ├── WhaleTable.tsx
│       │   ├── MarketChart.tsx
│       │   └── AlertCard.tsx
│       └── hooks/
│           └── useWebSocket.ts
├── prisma/
│   └── schema.prisma             # Database schema
├── package.json
├── tsconfig.json
├── railway.json                  # Railway config
└── Dockerfile
```

---

## 4. Database Schema (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Trade {
  id            String   @id @default(cuid())
  transactionHash String @unique
  marketId      String
  marketTitle   String
  assetId       String
  side          String   // BUY or SELL
  size          Float    // Token amount
  usdcSize      Float    // USDC value
  price         Float
  timestamp     DateTime
  walletAddress String
  
  // Anomaly detection fields
  zScore        Float?
  percentile    Float?
  suspicionScore Float?
  isWhale       Boolean  @default(false)
  
  createdAt     DateTime @default(now())
  
  @@index([marketId])
  @@index([timestamp])
  @@index([isWhale])
  @@index([walletAddress])
}

model Market {
  id              String   @id
  conditionId     String   @unique
  title           String
  slug            String
  volume          Float    @default(0)
  avgTradeSize    Float    @default(0)
  tradeCount      Int      @default(0)
  lastUpdated     DateTime @default(now())
  
  @@index([slug])
}

model MarketStats {
  id            String   @id @default(cuid())
  marketId      String
  windowStart   DateTime
  windowEnd     DateTime
  meanSize      Float
  stdDevSize    Float
  tradeCount    Int
  percentile95  Float
  percentile99  Float
  
  @@unique([marketId, windowStart])
  @@index([marketId])
}

model Alert {
  id            String   @id @default(cuid())
  tradeId       String
  marketId      String
  severity      String   // LOW, MEDIUM, HIGH, EXTREME
  score         Float
  description   String
  acknowledged  Boolean  @default(false)
  createdAt     DateTime @default(now())
  
  @@index([severity])
  @@index([createdAt])
}
```

---

## 5. Core Implementation Code

### Polymarket API Client

```typescript
// src/server/services/polymarket.ts
import axios from 'axios';

const GAMMA_API = 'https://gamma-api.polymarket.com';
const DATA_API = 'https://data-api.polymarket.com';
const CLOB_API = 'https://clob.polymarket.com';

export class PolymarketClient {
  private axiosInstance = axios.create({
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  // Fetch all active markets
  async getMarkets(limit = 100): Promise<Market[]> {
    const response = await this.axiosInstance.get(
      `${GAMMA_API}/markets`,
      { params: { limit, active: true, closed: false } }
    );
    return response.data;
  }

  // Fetch recent trades for a market
  async getTrades(params: {
    market?: string;
    limit?: number;
    start?: number;
    end?: number;
  }): Promise<Trade[]> {
    const response = await this.axiosInstance.get(
      `${DATA_API}/trades`,
      { params }
    );
    return response.data;
  }

  // Fetch activity (includes trades, splits, merges)
  async getActivity(params: {
    user?: string;
    market?: string;
    type?: string;
    limit?: number;
  }): Promise<Activity[]> {
    const response = await this.axiosInstance.get(
      `${DATA_API}/activity`,
      { params }
    );
    return response.data;
  }

  // Get current price for a token
  async getPrice(tokenId: string): Promise<number> {
    const response = await this.axiosInstance.get(
      `${CLOB_API}/price`,
      { params: { token_id: tokenId } }
    );
    return parseFloat(response.data.price);
  }

  // Get market details
  async getMarket(marketId: string): Promise<Market> {
    const response = await this.axiosInstance.get(
      `${GAMMA_API}/markets/${marketId}`
    );
    return response.data;
  }
}
```

### WebSocket Trade Monitor

```typescript
// src/server/services/websocket.ts
import WebSocket from 'ws';
import { EventEmitter } from 'events';

export class PolymarketWebSocket extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectInterval = 5000;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
  }

  connect() {
    this.ws = new WebSocket('wss://ws-subscriptions-clob.polymarket.com/ws/market');

    this.ws.on('open', () => {
      console.log('Connected to Polymarket WebSocket');
      this.startPing();
      this.subscribeToAllMarkets();
    });

    this.ws.on('message', (data: string) => {
      try {
        const message = JSON.parse(data);
        this.handleMessage(message);
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    });

    this.ws.on('close', () => {
      console.log('WebSocket closed, reconnecting...');
      this.stopPing();
      setTimeout(() => this.connect(), this.reconnectInterval);
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  private startPing() {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, 5000);
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
  }

  private subscribeToAllMarkets() {
    // Subscribe to market channel for all markets
    this.ws?.send(JSON.stringify({
      type: 'subscribe',
      channel: 'market'
    }));
  }

  private handleMessage(message: any) {
    if (message.event_type === 'last_trade_price') {
      // Emit trade event for processing
      this.emit('trade', {
        assetId: message.asset_id,
        marketId: message.market,
        price: parseFloat(message.price),
        size: parseFloat(message.size),
        side: message.side,
        timestamp: new Date(parseInt(message.timestamp)),
        feeRateBps: message.fee_rate_bps
      });
    }
  }

  disconnect() {
    this.stopPing();
    this.ws?.close();
  }
}
```

### Anomaly Detection Service

```typescript
// src/server/services/anomaly.ts

interface TradeData {
  size: number;
  usdcSize: number;
  marketId: string;
  timestamp: Date;
}

interface AnomalyResult {
  isAnomaly: boolean;
  zScore: number;
  percentile: number;
  suspicionScore: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
}

export class AnomalyDetector {
  private globalTrades: number[] = [];
  private marketTrades: Map<string, number[]> = new Map();
  private readonly GLOBAL_WINDOW = 5000;
  private readonly MARKET_WINDOW = 500;

  addTrade(trade: TradeData): AnomalyResult {
    const { size, usdcSize, marketId } = trade;
    
    // Update global stats
    this.globalTrades.push(usdcSize);
    if (this.globalTrades.length > this.GLOBAL_WINDOW) {
      this.globalTrades.shift();
    }

    // Update market-specific stats
    if (!this.marketTrades.has(marketId)) {
      this.marketTrades.set(marketId, []);
    }
    const marketTradesArr = this.marketTrades.get(marketId)!;
    marketTradesArr.push(usdcSize);
    if (marketTradesArr.length > this.MARKET_WINDOW) {
      marketTradesArr.shift();
    }

    // Calculate metrics
    const globalZScore = this.calculateZScore(usdcSize, this.globalTrades);
    const marketZScore = this.calculateZScore(usdcSize, marketTradesArr);
    const percentile = this.calculatePercentile(usdcSize, this.globalTrades);
    
    // Combined z-score (weighted)
    const combinedZScore = (globalZScore * 0.4) + (marketZScore * 0.6);
    
    // Calculate suspicion score (0-100)
    const suspicionScore = this.calculateSuspicionScore(
      combinedZScore,
      percentile,
      usdcSize
    );

    // Determine severity
    const severity = this.getSeverity(combinedZScore, usdcSize);
    
    return {
      isAnomaly: combinedZScore > 2.0 || usdcSize > 10000,
      zScore: combinedZScore,
      percentile,
      suspicionScore,
      severity
    };
  }

  private calculateZScore(value: number, dataset: number[]): number {
    if (dataset.length < 10) return 0;
    
    const mean = dataset.reduce((a, b) => a + b, 0) / dataset.length;
    const variance = dataset.reduce((sum, val) => 
      sum + Math.pow(val - mean, 2), 0) / dataset.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev === 0) return 0;
    return (value - mean) / stdDev;
  }

  private calculatePercentile(value: number, dataset: number[]): number {
    if (dataset.length === 0) return 50;
    
    const sorted = [...dataset].sort((a, b) => a - b);
    const index = sorted.findIndex(v => v >= value);
    
    if (index === -1) return 100;
    return (index / sorted.length) * 100;
  }

  private calculateSuspicionScore(
    zScore: number,
    percentile: number,
    usdcSize: number
  ): number {
    let score = 0;
    
    // Z-score contribution (0-40)
    score += Math.min(40, Math.abs(zScore) * 12);
    
    // Percentile contribution (0-30)
    score += Math.min(30, (percentile - 50) * 0.6);
    
    // Absolute size contribution (0-30)
    if (usdcSize > 100000) score += 30;
    else if (usdcSize > 50000) score += 25;
    else if (usdcSize > 25000) score += 20;
    else if (usdcSize > 10000) score += 15;
    else if (usdcSize > 5000) score += 10;
    
    return Math.min(100, Math.max(0, score));
  }

  private getSeverity(zScore: number, usdcSize: number): 
    'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' {
    if (zScore > 4 || usdcSize > 100000) return 'EXTREME';
    if (zScore > 3 || usdcSize > 50000) return 'HIGH';
    if (zScore > 2.5 || usdcSize > 25000) return 'MEDIUM';
    return 'LOW';
  }

  getStats() {
    return {
      globalTradeCount: this.globalTrades.length,
      marketCount: this.marketTrades.size,
      avgTradeSize: this.globalTrades.length > 0
        ? this.globalTrades.reduce((a, b) => a + b, 0) / this.globalTrades.length
        : 0
    };
  }
}
```

---

## 6. Railway Deployment Guide

### Step 1: Prepare Your Project

1. **Create `railway.json`** in project root:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm run start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

2. **Update `package.json`** scripts:
```json
{
  "scripts": {
    "dev": "tsx watch src/server/index.ts",
    "build": "tsc && npm run build:client",
    "build:client": "vite build",
    "start": "node dist/server/index.js",
    "db:migrate": "prisma migrate deploy",
    "db:generate": "prisma generate"
  }
}
```

3. **Create `Procfile`** (alternative to railway.json):
```
web: npm run start
release: npm run db:migrate
```

### Step 2: Set Up Railway Project

1. **Create Railway Account**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Install Railway CLI**
```bash
npm install -g @railway/cli
railway login
```

3. **Initialize Project**
```bash
# In your project directory
railway init

# Or link to existing project
railway link
```

### Step 3: Provision Database

1. **Add PostgreSQL via Dashboard**
   - Go to your project in Railway dashboard
   - Click "New" → "Database" → "PostgreSQL"
   - Railway auto-creates `DATABASE_URL` variable

2. **Or via CLI**
```bash
railway add --database postgres
```

### Step 4: Configure Environment Variables

Set these in Railway Dashboard → Service → Variables:

```env
# Database (auto-set if using Railway Postgres)
DATABASE_URL=postgresql://...

# App Configuration
NODE_ENV=production
PORT=3000

# Optional: External services
REDIS_URL=redis://...  # If using Redis for caching

# Monitoring (optional)
SENTRY_DSN=...
```

**Via CLI:**
```bash
railway variables set NODE_ENV=production
railway variables set PORT=3000
```

### Step 5: Deploy

**Option A: GitHub Integration (Recommended)**
1. Push code to GitHub
2. In Railway Dashboard → Service → Settings → Connect GitHub
3. Select repository and branch
4. Enable automatic deployments

**Option B: CLI Deploy**
```bash
railway up
```

**Option C: Docker Deploy**
```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY prisma ./prisma
RUN npx prisma generate

COPY dist ./dist
COPY public ./public

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "run", "start"]
```

### Step 6: Generate Domain

```bash
railway domain
```

Or in Dashboard → Service → Settings → Generate Domain

### Step 7: Database Migrations

```bash
# Run migrations on Railway
railway run npm run db:migrate

# Or add to release command in Procfile
```

### Step 8: Monitor Deployment

```bash
# View logs
railway logs

# View logs in real-time
railway logs -f

# Check status
railway status
```

### Railway Configuration Tips

1. **Health Checks**: Add a `/health` endpoint:
```typescript
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});
```

2. **Environment-specific configs**:
```typescript
const config = {
  port: process.env.PORT || 3000,
  dbUrl: process.env.DATABASE_URL,
  isProduction: process.env.NODE_ENV === 'production'
};
```

3. **Graceful shutdown**:
```typescript
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});
```

---

## 7. Complete Project Setup Commands

```bash
# 1. Create project
mkdir polymarket-whale-detector
cd polymarket-whale-detector
npm init -y

# 2. Install dependencies
npm install express ws axios prisma @prisma/client socket.io cors dotenv
npm install -D typescript tsx @types/node @types/express @types/ws
npm install -D vite @vitejs/plugin-react react react-dom
npm install -D @types/react @types/react-dom tailwindcss postcss autoprefixer
npm install recharts date-fns

# 3. Initialize TypeScript
npx tsc --init

# 4. Initialize Prisma
npx prisma init

# 5. Initialize Tailwind
npx tailwindcss init -p

# 6. Initialize Railway
railway login
railway init

# 7. Add PostgreSQL
railway add --database postgres

# 8. Set variables
railway variables set NODE_ENV=production

# 9. Deploy
railway up

# 10. Get domain
railway domain
```

---

## 8. Frontend Dashboard Components

### Main Dashboard Layout

```tsx
// src/client/components/Dashboard.tsx
import { useState, useEffect } from 'react';
import { WhaleTable } from './WhaleTable';
import { MarketChart } from './MarketChart';
import { StatsCards } from './StatsCards';
import { useWebSocket } from '../hooks/useWebSocket';

export function Dashboard() {
  const { whales, stats, isConnected } = useWebSocket();

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Polymarket Whale Detector</h1>
        <div className="flex items-center gap-2 mt-2">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-400">
            {isConnected ? 'Live' : 'Disconnected'}
          </span>
        </div>
      </header>

      <StatsCards stats={stats} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2">
          <WhaleTable whales={whales} />
        </div>
        <div>
          <MarketChart data={stats.recentActivity} />
        </div>
      </div>
    </div>
  );
}
```

### Whale Table Component

```tsx
// src/client/components/WhaleTable.tsx
interface Whale {
  id: string;
  marketTitle: string;
  side: 'BUY' | 'SELL';
  size: number;
  usdcSize: number;
  price: number;
  suspicionScore: number;
  severity: string;
  timestamp: Date;
  walletAddress: string;
}

export function WhaleTable({ whales }: { whales: Whale[] }) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'EXTREME': return 'bg-red-600';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-semibold">Recent Whale Activity</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left">Severity</th>
              <th className="px-4 py-3 text-left">Market</th>
              <th className="px-4 py-3 text-left">Side</th>
              <th className="px-4 py-3 text-right">Size (USDC)</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Score</th>
              <th className="px-4 py-3 text-left">Time</th>
            </tr>
          </thead>
          <tbody>
            {whales.map((whale) => (
              <tr key={whale.id} className="border-b border-gray-700 hover:bg-gray-750">
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(whale.severity)}`}>
                    {whale.severity}
                  </span>
                </td>
                <td className="px-4 py-3 max-w-xs truncate">{whale.marketTitle}</td>
                <td className="px-4 py-3">
                  <span className={whale.side === 'BUY' ? 'text-green-400' : 'text-red-400'}>
                    {whale.side}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  ${whale.usdcSize.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  {(whale.price * 100).toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-bold">{whale.suspicionScore.toFixed(0)}</span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-sm">
                  {new Date(whale.timestamp).toLocaleTimeString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## 9. API Response Examples

### Trade from Data API
```json
{
  "proxyWallet": "0x6af75d4e4aaf700450efbac3708cce1665810ff1",
  "timestamp": 1705500000,
  "conditionId": "0xdd22472e552920b8438158ea7238bfadfa4f736aa4cee91a6b86c39ead110917",
  "type": "TRADE",
  "size": 50000,
  "usdcSize": 25000,
  "transactionHash": "0x...",
  "price": 0.50,
  "asset": "12345...",
  "side": "BUY",
  "outcomeIndex": 0,
  "title": "Will Bitcoin reach $100k by Dec 2024?",
  "slug": "bitcoin-100k-dec-2024",
  "outcome": "Yes"
}
```

### WebSocket Trade Event
```json
{
  "asset_id": "114122071509644379678018727908709560226618148003371446110114509806601493071694",
  "event_type": "last_trade_price",
  "fee_rate_bps": "0",
  "market": "0x6a67b9d828d53862160e470329ffea5246f338ecfffdf2cab45211ec578b0347",
  "price": "0.456",
  "side": "BUY",
  "size": "219.217767",
  "timestamp": "1750428146322"
}
```

---

## 10. Testing Checklist

- [ ] WebSocket connection establishes and reconnects
- [ ] Trades are received and processed in real-time
- [ ] Z-score calculations are accurate
- [ ] Severity classifications match thresholds
- [ ] Database stores trades correctly
- [ ] Frontend updates in real-time via Socket.io
- [ ] Health check endpoint responds
- [ ] Rate limiting is respected
- [ ] Graceful shutdown works

---

## Quick Reference: Key URLs

| Resource | URL |
|----------|-----|
| Polymarket Docs | https://docs.polymarket.com |
| CLOB API | https://clob.polymarket.com |
| Gamma API | https://gamma-api.polymarket.com |
| Data API | https://data-api.polymarket.com |
| Railway Dashboard | https://railway.app/dashboard |
| Railway Docs | https://docs.railway.com |

---

## Troubleshooting

### WebSocket Issues
- Ensure ping/pong every 5 seconds
- Handle reconnection on disconnect
- Check for rate limiting (HTTP 429)

### Database Connection
- Verify `DATABASE_URL` is set correctly
- Run `npx prisma generate` after schema changes
- Check Railway logs for connection errors

### Deployment Failures
- Check build logs in Railway dashboard
- Ensure `PORT` is set (Railway assigns dynamically)
- Verify all dependencies are in `package.json`
