import type { AnomalyResult } from '../types/index.js';

interface TradeInput {
  size: number;
  usdcSize: number;
  marketId: string;
  timestamp: Date;
}

export class AnomalyDetector {
  private globalTrades: number[] = [];
  private marketTrades: Map<string, number[]> = new Map();
  private totalTradesAnalyzed: number = 0;
  private readonly GLOBAL_WINDOW = 5000;
  private readonly MARKET_WINDOW = 500;

  addTrade(trade: TradeInput): AnomalyResult {
    this.totalTradesAnalyzed++;
    const { usdcSize, marketId } = trade;

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
    const combinedZScore = globalZScore * 0.4 + marketZScore * 0.6;

    // Calculate suspicion score (0-100)
    const suspicionScore = this.calculateSuspicionScore(
      combinedZScore,
      percentile,
      usdcSize
    );

    // Determine severity
    const severity = this.getSeverity(combinedZScore, usdcSize);

    return {
      isAnomaly: combinedZScore > 1.5 || usdcSize > 5000,
      zScore: combinedZScore,
      percentile,
      suspicionScore,
      severity,
    };
  }

  private calculateZScore(value: number, dataset: number[]): number {
    if (dataset.length < 10) return 0;

    const mean = dataset.reduce((a, b) => a + b, 0) / dataset.length;
    const variance =
      dataset.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      dataset.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return 0;
    return (value - mean) / stdDev;
  }

  private calculatePercentile(value: number, dataset: number[]): number {
    if (dataset.length === 0) return 50;

    const sorted = [...dataset].sort((a, b) => a - b);
    const index = sorted.findIndex((v) => v >= value);

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

  private getSeverity(
    zScore: number,
    usdcSize: number
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' {
    if (zScore > 4 || usdcSize > 100000) return 'EXTREME';
    if (zScore > 3 || usdcSize > 50000) return 'HIGH';
    if (zScore > 2.5 || usdcSize > 25000) return 'MEDIUM';
    return 'LOW';
  }

  getStats(): {
    globalTradeCount: number;
    marketCount: number;
    avgTradeSize: number;
  } {
    return {
      globalTradeCount: this.totalTradesAnalyzed,
      marketCount: this.marketTrades.size,
      avgTradeSize:
        this.globalTrades.length > 0
          ? this.globalTrades.reduce((a, b) => a + b, 0) /
            this.globalTrades.length
          : 0,
    };
  }

  reset(): void {
    this.globalTrades = [];
    this.marketTrades.clear();
    this.totalTradesAnalyzed = 0;
  }
}

export const anomalyDetector = new AnomalyDetector();
