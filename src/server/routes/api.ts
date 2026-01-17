import { Router, Request, Response } from 'express';
import { polymarketClient } from '../services/polymarket.js';
import { anomalyDetector } from '../services/anomaly.js';
import { polymarketWs } from '../services/websocket.js';
import {
  getRecentWhales,
  getWhaleStats,
  getRecentAlerts,
  acknowledgeAlert,
  deleteUnknownMarketTrades,
} from '../services/database.js';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

router.get('/markets', async (_req: Request, res: Response) => {
  try {
    const markets = await polymarketClient.getMarkets({ limit: 100 });
    res.json(markets);
  } catch (error) {
    console.error('Error fetching markets:', error);
    res.status(500).json({ error: 'Failed to fetch markets' });
  }
});

router.get('/markets/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const market = await polymarketClient.getMarket(req.params.id);
    res.json(market);
  } catch (error) {
    console.error('Error fetching market:', error);
    res.status(500).json({ error: 'Failed to fetch market' });
  }
});

router.get('/trades', async (req: Request, res: Response) => {
  try {
    const { market, limit, start, end } = req.query;
    const trades = await polymarketClient.getTrades({
      market: market as string | undefined,
      limit: limit ? parseInt(limit as string) : 100,
      start: start ? parseInt(start as string) : undefined,
      end: end ? parseInt(end as string) : undefined,
    });
    res.json(trades);
  } catch (error) {
    console.error('Error fetching trades:', error);
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
});

router.get('/whales', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const whales = await getRecentWhales(limit);
    res.json(whales);
  } catch (error) {
    console.error('Error fetching whales:', error);
    res.status(500).json({ error: 'Failed to fetch whale trades' });
  }
});

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [whaleStats, detectorStats] = await Promise.all([
      getWhaleStats(),
      Promise.resolve(anomalyDetector.getStats()),
    ]);

    res.json({
      ...whaleStats,
      ...detectorStats,
      recentActivity: [],
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const alerts = await getRecentAlerts(limit);
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

router.post('/alerts/:id/acknowledge', async (req: Request<{ id: string }>, res: Response) => {
  try {
    await acknowledgeAlert(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

router.get('/price/:tokenId', async (req: Request<{ tokenId: string }>, res: Response) => {
  try {
    const price = await polymarketClient.getPrice(req.params.tokenId);
    res.json({ price });
  } catch (error) {
    console.error('Error fetching price:', error);
    res.status(500).json({ error: 'Failed to fetch price' });
  }
});

router.get('/monitored-markets', (_req: Request, res: Response) => {
  try {
    const markets = polymarketWs.getMonitoredMarkets();
    res.json(markets);
  } catch (error) {
    console.error('Error fetching monitored markets:', error);
    res.status(500).json({ error: 'Failed to fetch monitored markets' });
  }
});

router.post('/cleanup-unknown', async (_req: Request, res: Response) => {
  try {
    const deletedCount = await deleteUnknownMarketTrades();
    console.log(`Deleted ${deletedCount} Unknown Market entries`);
    res.json({ success: true, deletedCount });
  } catch (error) {
    console.error('Error cleaning up unknown markets:', error);
    res.status(500).json({ error: 'Failed to cleanup unknown markets' });
  }
});

export default router;
