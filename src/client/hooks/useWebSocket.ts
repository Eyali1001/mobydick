import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

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
  zScore: number;
  percentile: number;
}

interface Stats {
  globalTradeCount: number;
  marketCount: number;
  avgTradeSize: number;
  whaleCount: number;
  totalWhales: number;
  last24h: number;
  totalVolume: number;
  recentActivity: Array<{
    timestamp: string;
    count: number;
    volume: number;
  }>;
}

interface WhaleEvent {
  trade: {
    transactionHash: string;
    marketTitle: string;
    side: 'BUY' | 'SELL';
    size: number;
    usdcSize: number;
    price: number;
    timestamp: string;
    walletAddress: string;
  };
  anomaly: {
    zScore: number;
    percentile: number;
    suspicionScore: number;
    severity: string;
  };
}

const SOCKET_URL =
  import.meta.env.MODE === 'production' ? '' : 'http://localhost:3000';

export function useWebSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [whales, setWhales] = useState<Whale[]>([]);
  const [stats, setStats] = useState<Stats>({
    globalTradeCount: 0,
    marketCount: 0,
    avgTradeSize: 0,
    whaleCount: 0,
    totalWhales: 0,
    last24h: 0,
    totalVolume: 0,
    recentActivity: [],
  });

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('whale', (data: WhaleEvent) => {
      const newWhale: Whale = {
        id: data.trade.transactionHash,
        marketTitle: data.trade.marketTitle,
        side: data.trade.side,
        size: data.trade.size,
        usdcSize: data.trade.usdcSize,
        price: data.trade.price,
        suspicionScore: data.anomaly.suspicionScore,
        severity: data.anomaly.severity,
        timestamp: new Date(data.trade.timestamp),
        walletAddress: data.trade.walletAddress,
        zScore: data.anomaly.zScore,
        percentile: data.anomaly.percentile,
      };

      setWhales((prev) => sortWhalesBySeverity([newWhale, ...prev]).slice(0, 100));
      setStats((prev) => ({
        ...prev,
        whaleCount: prev.whaleCount + 1,
      }));
    });

    newSocket.on('status', (data: { connected: boolean }) => {
      console.log('Polymarket WebSocket status:', data.connected);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const fetchInitialData = useCallback(async () => {
    try {
      const [whalesRes, statsRes] = await Promise.all([
        fetch(`${SOCKET_URL}/api/whales`),
        fetch(`${SOCKET_URL}/api/stats`),
      ]);

      if (whalesRes.ok) {
        const whalesData = await whalesRes.json();
        const mappedWhales = whalesData.map(
          (w: {
            transactionHash: string;
            marketTitle: string;
            side: 'BUY' | 'SELL';
            size: number;
            usdcSize: number;
            price: number;
            suspicionScore: number;
            zScore: number;
            percentile: number;
            timestamp: string;
            walletAddress: string;
          }) => ({
            id: w.transactionHash,
            marketTitle: w.marketTitle,
            side: w.side,
            size: w.size,
            usdcSize: w.usdcSize,
            price: w.price,
            suspicionScore: w.suspicionScore || 0,
            severity: getSeverityFromZScoreAndSize(w.zScore || 0, w.usdcSize),
            timestamp: new Date(w.timestamp),
            walletAddress: w.walletAddress,
            zScore: w.zScore || 0,
            percentile: w.percentile || 0,
          })
        );
        setWhales(sortWhalesBySeverity(mappedWhales));
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Poll for stats updates every 5 seconds
  useEffect(() => {
    const pollStats = async () => {
      try {
        const statsRes = await fetch(`${SOCKET_URL}/api/stats`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      } catch (error) {
        console.error('Failed to poll stats:', error);
      }
    };

    const interval = setInterval(pollStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const clearWhales = useCallback(() => {
    setWhales([]);
  }, []);

  return {
    socket,
    isConnected,
    whales,
    stats,
    refreshData: fetchInitialData,
    clearWhales,
  };
}

function getSeverityFromZScoreAndSize(zScore: number, usdcSize: number): string {
  if (zScore > 4 || usdcSize > 100000) return 'EXTREME';
  if (zScore > 3 || usdcSize > 50000) return 'HIGH';
  if (zScore > 2.5 || usdcSize > 25000) return 'MEDIUM';
  return 'LOW';
}

const SEVERITY_ORDER: Record<string, number> = {
  EXTREME: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

function sortWhalesBySeverity(whales: Whale[]): Whale[] {
  return [...whales].sort((a, b) => {
    const severityDiff = SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity];
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}
