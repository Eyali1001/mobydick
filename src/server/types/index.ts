export interface Trade {
  id?: string;
  transactionHash: string;
  marketId: string;
  marketTitle: string;
  assetId: string;
  side: 'BUY' | 'SELL';
  outcome?: string;
  size: number;
  usdcSize: number;
  price: number;
  timestamp: Date;
  walletAddress: string;
  zScore?: number;
  percentile?: number;
  suspicionScore?: number;
  isWhale?: boolean;
}

export interface Market {
  id: string;
  conditionId: string;
  title: string;
  slug: string;
  question?: string;
  description?: string;
  outcomes?: string[];
  outcomePrices?: string[];
  volume?: number;
  volumeNum?: number;
  liquidity?: number;
  liquidityNum?: number;
  active?: boolean;
  closed?: boolean;
  clobTokenIds?: string[];
}

export interface WebSocketTradeEvent {
  asset_id: string;
  event_type: string;
  market: string;
  price: string;
  side: 'BUY' | 'SELL';
  size: string;
  timestamp: string;
  fee_rate_bps?: string;
}

export interface TradeData {
  assetId: string;
  marketId: string;
  price: number;
  size: number;
  side: 'BUY' | 'SELL';
  timestamp: Date;
  feeRateBps?: number;
}

export interface AnomalyResult {
  isAnomaly: boolean;
  zScore: number;
  percentile: number;
  suspicionScore: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
}

export interface WhaleAlert {
  id: string;
  trade: Trade;
  anomaly: AnomalyResult;
  createdAt: Date;
}

export interface Stats {
  globalTradeCount: number;
  marketCount: number;
  avgTradeSize: number;
  whaleCount: number;
  recentActivity: ActivityPoint[];
}

export interface ActivityPoint {
  timestamp: string;
  count: number;
  volume: number;
}

export interface DataApiTrade {
  proxyWallet: string;
  timestamp: number;
  conditionId: string;
  type: string;
  size: number;
  usdcSize: number;
  transactionHash: string;
  price: number;
  asset: string;
  side: 'BUY' | 'SELL';
  outcomeIndex: number;
  title: string;
  slug: string;
  outcome: string;
}

export interface Activity {
  proxyWallet: string;
  timestamp: number;
  conditionId: string;
  type: string;
  size: number;
  usdcSize: number;
  transactionHash: string;
  price?: number;
  asset?: string;
  side?: 'BUY' | 'SELL';
}
