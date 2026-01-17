import { PrismaClient } from '@prisma/client';
import type { Trade, AnomalyResult } from '../types/index.js';

const prisma = new PrismaClient();

export async function saveTrade(
  trade: Trade,
  anomaly: AnomalyResult
): Promise<void> {
  await prisma.trade.create({
    data: {
      transactionHash: trade.transactionHash,
      marketId: trade.marketId,
      marketTitle: trade.marketTitle,
      assetId: trade.assetId,
      side: trade.side,
      outcome: trade.outcome,
      size: trade.size,
      usdcSize: trade.usdcSize,
      price: trade.price,
      timestamp: trade.timestamp,
      walletAddress: trade.walletAddress,
      zScore: anomaly.zScore,
      percentile: anomaly.percentile,
      suspicionScore: anomaly.suspicionScore,
      isWhale: anomaly.isAnomaly,
    },
  });
}

export async function saveAlert(
  tradeId: string,
  marketId: string,
  severity: string,
  score: number,
  description: string
): Promise<void> {
  await prisma.alert.create({
    data: {
      tradeId,
      marketId,
      severity,
      score,
      description,
    },
  });
}

// Severity order for sorting (higher number = more severe)
const SEVERITY_ORDER: Record<string, number> = {
  EXTREME: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

function getSeverity(zScore: number, usdcSize: number): string {
  if (zScore > 4 || usdcSize > 100000) return 'EXTREME';
  if (zScore > 3 || usdcSize > 50000) return 'HIGH';
  if (zScore > 2.5 || usdcSize > 25000) return 'MEDIUM';
  return 'LOW';
}

export async function getRecentWhales(limit = 50): Promise<Trade[]> {
  const trades = await prisma.trade.findMany({
    where: {
      isWhale: true,
      NOT: { marketTitle: 'Unknown Market' }
    },
    orderBy: { timestamp: 'desc' },
    take: limit * 2, // Fetch more to account for sorting
  });

  // Sort by severity (descending), then by timestamp (descending)
  const sortedTrades = trades.sort((a, b) => {
    const severityA = getSeverity(a.zScore || 0, a.usdcSize);
    const severityB = getSeverity(b.zScore || 0, b.usdcSize);
    const severityDiff = SEVERITY_ORDER[severityB] - SEVERITY_ORDER[severityA];
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return sortedTrades.slice(0, limit) as Trade[];
}

export async function deleteUnknownMarketTrades(): Promise<number> {
  const result = await prisma.trade.deleteMany({
    where: { marketTitle: 'Unknown Market' }
  });
  return result.count;
}

export async function getWhaleStats(): Promise<{
  totalWhales: number;
  last24h: number;
  totalVolume: number;
}> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [totalWhales, last24h, volumeResult] = await Promise.all([
    prisma.trade.count({ where: { isWhale: true } }),
    prisma.trade.count({
      where: { isWhale: true, timestamp: { gte: oneDayAgo } },
    }),
    prisma.trade.aggregate({
      where: { isWhale: true },
      _sum: { usdcSize: true },
    }),
  ]);

  return {
    totalWhales,
    last24h,
    totalVolume: volumeResult._sum.usdcSize || 0,
  };
}

export async function getRecentAlerts(limit = 20): Promise<
  Array<{
    id: string;
    tradeId: string;
    marketId: string;
    severity: string;
    score: number;
    description: string;
    acknowledged: boolean;
    createdAt: Date;
  }>
> {
  return prisma.alert.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function acknowledgeAlert(alertId: string): Promise<void> {
  await prisma.alert.update({
    where: { id: alertId },
    data: { acknowledged: true },
  });
}

export async function updateMarketStats(
  marketId: string,
  title: string,
  slug: string,
  volume: number
): Promise<void> {
  await prisma.market.upsert({
    where: { id: marketId },
    create: {
      id: marketId,
      conditionId: marketId,
      title,
      slug,
      volume,
      lastUpdated: new Date(),
    },
    update: {
      volume,
      lastUpdated: new Date(),
    },
  });
}

export { prisma };
