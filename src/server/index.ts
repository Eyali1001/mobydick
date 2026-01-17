import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

import apiRoutes from './routes/api.js';
import { polymarketWs } from './services/websocket.js';
import { anomalyDetector } from './services/anomaly.js';
import { polymarketClient } from './services/polymarket.js';
import { saveTrade, saveAlert, prisma } from './services/database.js';
import type { Trade, TradeData } from './types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/api', apiRoutes);

// Health check at root for Railway
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy' });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const staticPath = path.join(__dirname, '../../dist/client');
  app.use(express.static(staticPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

// Market title cache
const marketTitleCache = new Map<string, string>();

async function getMarketTitle(marketId: string): Promise<string> {
  if (marketTitleCache.has(marketId)) {
    return marketTitleCache.get(marketId)!;
  }

  try {
    const market = await polymarketClient.getMarket(marketId);
    const title = market.title || market.question || 'Unknown Market';
    marketTitleCache.set(marketId, title);
    return title;
  } catch {
    return 'Unknown Market';
  }
}

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Handle incoming trades from Polymarket WebSocket
polymarketWs.on('trade', async (tradeData: TradeData) => {
  try {
    const usdcSize = tradeData.size * tradeData.price;

    // Run anomaly detection
    const anomaly = anomalyDetector.addTrade({
      size: tradeData.size,
      usdcSize,
      marketId: tradeData.marketId,
      timestamp: tradeData.timestamp,
    });

    // If it's a whale trade, process and store it
    if (anomaly.isAnomaly) {
      const marketTitle = await getMarketTitle(tradeData.marketId);

      // Skip trades with unknown market titles
      if (marketTitle === 'Unknown Market') {
        return;
      }

      const trade: Trade = {
        transactionHash: `${tradeData.marketId}-${tradeData.timestamp.getTime()}-${Math.random().toString(36).substring(7)}`,
        marketId: tradeData.marketId,
        marketTitle,
        assetId: tradeData.assetId,
        side: tradeData.side,
        size: tradeData.size,
        usdcSize,
        price: tradeData.price,
        timestamp: tradeData.timestamp,
        walletAddress: 'unknown', // WebSocket doesn't provide wallet
        zScore: anomaly.zScore,
        percentile: anomaly.percentile,
        suspicionScore: anomaly.suspicionScore,
        isWhale: true,
      };

      // Emit to connected clients
      io.emit('whale', {
        trade,
        anomaly,
      });

      // Save to database (don't block the event loop)
      saveTrade(trade, anomaly).catch((err) => {
        console.error('Failed to save trade:', err);
      });

      // Create alert for high severity
      if (anomaly.severity === 'HIGH' || anomaly.severity === 'EXTREME') {
        const description = `${anomaly.severity} whale alert: ${trade.side} $${usdcSize.toFixed(2)} on "${marketTitle}"`;
        saveAlert(
          trade.transactionHash,
          trade.marketId,
          anomaly.severity,
          anomaly.suspicionScore,
          description
        ).catch((err) => {
          console.error('Failed to save alert:', err);
        });
      }

      console.log(
        `[WHALE] ${anomaly.severity} - ${trade.side} $${usdcSize.toFixed(2)} - Z:${anomaly.zScore.toFixed(2)} - "${marketTitle}"`
      );
    }
  } catch (error) {
    console.error('Error processing trade:', error);
  }
});

polymarketWs.on('connected', () => {
  io.emit('status', { connected: true });
});

polymarketWs.on('disconnected', () => {
  io.emit('status', { connected: false });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  polymarketWs.disconnect();
  await prisma.$disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down...');
  polymarketWs.disconnect();
  await prisma.$disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Poll for real trades from Data API
const seenTransactions = new Set<string>();
let topMarkets: Array<{ conditionId: string; title: string; volume: number }> = [];

// Refresh top markets by volume periodically
async function refreshTopMarkets() {
  try {
    const markets = await polymarketClient.getMarkets({ limit: 100, active: true });
    topMarkets = markets
      .filter(m => m.volume && m.volume > 0)
      .sort((a, b) => (b.volume || 0) - (a.volume || 0))
      .slice(0, 50)
      .map(m => ({
        conditionId: m.conditionId,
        title: m.question || m.title || 'Unknown',
        volume: m.volume || 0,
      }));
    console.log(`[MARKETS] Monitoring ${topMarkets.length} top markets by volume`);
    if (topMarkets.length > 0) {
      console.log(`[MARKETS] Top market: "${topMarkets[0].title}" ($${(topMarkets[0].volume / 1000000).toFixed(1)}M volume)`);
    }
  } catch (error) {
    console.error('Error refreshing top markets:', error);
  }
}

async function pollTrades() {
  try {
    // Fetch recent trades (these come from all markets, but we also poll top markets specifically)
    const recentTrades = await polymarketClient.getTrades({ limit: 100 });

    // Also fetch trades from top 10 markets by volume to ensure coverage
    const topMarketTrades = await Promise.all(
      topMarkets.slice(0, 10).map(async (market) => {
        try {
          const trades = await polymarketClient.getTrades({ market: market.conditionId, limit: 20 });
          return trades;
        } catch {
          return [];
        }
      })
    );

    // Combine all trades
    const allTrades = [...recentTrades, ...topMarketTrades.flat()];

    for (const trade of allTrades) {
      // Skip if we've already seen this transaction
      if (seenTransactions.has(trade.transactionHash)) continue;
      seenTransactions.add(trade.transactionHash);

      // Keep set from growing too large
      if (seenTransactions.size > 10000) {
        const arr = Array.from(seenTransactions);
        seenTransactions.clear();
        arr.slice(-5000).forEach(t => seenTransactions.add(t));
      }

      const tradeData: TradeData = {
        assetId: trade.asset,
        marketId: trade.conditionId,
        price: trade.price,
        size: trade.size,
        side: trade.side,
        timestamp: new Date(trade.timestamp * 1000),
      };

      const usdcSize = trade.usdcSize || (trade.size * trade.price);

      // Run anomaly detection
      const anomaly = anomalyDetector.addTrade({
        size: trade.size,
        usdcSize,
        marketId: trade.conditionId,
        timestamp: tradeData.timestamp,
      });

      // If it's a whale trade, emit it
      if (anomaly.isAnomaly) {
        // Try to get title from trade, fallback to our market cache
        let marketTitle = trade.title;
        if (!marketTitle) {
          const cachedMarket = topMarkets.find(m => m.conditionId === trade.conditionId);
          marketTitle = cachedMarket?.title;
          if (marketTitle) {
            console.log(`[DEBUG] Trade missing title, used cache for: ${marketTitle}`);
          } else {
            console.log(`[DEBUG] Trade missing title, conditionId: ${trade.conditionId}, skipping`);
            continue;
          }
        }

        const tradeRecord: Trade = {
          transactionHash: trade.transactionHash,
          marketId: trade.conditionId,
          marketTitle,
          assetId: trade.asset,
          side: trade.side,
          outcome: trade.outcome,
          size: trade.size,
          usdcSize,
          price: trade.price,
          timestamp: tradeData.timestamp,
          walletAddress: trade.proxyWallet || 'unknown',
          zScore: anomaly.zScore,
          percentile: anomaly.percentile,
          suspicionScore: anomaly.suspicionScore,
          isWhale: true,
        };

        io.emit('whale', { trade: tradeRecord, anomaly });

        saveTrade(tradeRecord, anomaly).catch(err => {
          console.error('Failed to save trade:', err);
        });

        console.log(
          `[WHALE] ${anomaly.severity} - ${trade.side} ${trade.outcome || '?'} $${usdcSize.toFixed(2)} - Z:${anomaly.zScore.toFixed(2)} - "${trade.title}"`
        );
      }
    }
  } catch (error) {
    console.error('Error polling trades:', error);
  }
}

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Connect to Polymarket WebSocket for real-time price updates
  polymarketWs.connect();

  // Refresh top markets on startup and every 5 minutes
  refreshTopMarkets();
  setInterval(refreshTopMarkets, 5 * 60 * 1000);

  // Poll for real trades every 5 seconds
  setInterval(pollTrades, 5000);
  setTimeout(pollTrades, 2000); // Initial poll after markets load
});

export { app, server };
