import WebSocket from 'ws';
import { EventEmitter } from 'events';
import axios from 'axios';
import type { TradeData, WebSocketTradeEvent } from '../types/index.js';

const GAMMA_API = 'https://gamma-api.polymarket.com';

interface PriceChange {
  asset_id: string;
  price: string;
}

interface PriceChangeMessage {
  market: string;
  price_changes: PriceChange[];
}

export interface MonitoredMarket {
  id: string;
  question: string;
  image: string;
  icon: string;
  slug: string;
  volume: number;
  liquidity: number;
  category: string;
}

export class PolymarketWebSocket extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectInterval = 5000;
  private pingInterval: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private subscribedAssets: Set<string> = new Set();
  private monitoredMarkets: MonitoredMarket[] = [];

  constructor() {
    super();
  }

  async connect(): Promise<void> {
    if (this.isConnecting) return;
    this.isConnecting = true;

    console.log('Connecting to Polymarket WebSocket...');
    this.ws = new WebSocket(
      'wss://ws-subscriptions-clob.polymarket.com/ws/market'
    );

    this.ws.on('open', async () => {
      console.log('Connected to Polymarket WebSocket');
      this.isConnecting = false;
      this.startPing();
      await this.subscribeToActiveMarkets();
      this.emit('connected');
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      const dataStr = data.toString();
      // Skip non-JSON messages like "INVALID OPERATION"
      if (!dataStr.startsWith('{') && !dataStr.startsWith('[')) {
        return;
      }
      try {
        const message = JSON.parse(dataStr);
        this.handleMessage(message);
      } catch {
        // Silently ignore parse errors
      }
    });

    this.ws.on('close', () => {
      console.log('WebSocket closed, reconnecting...');
      this.isConnecting = false;
      this.stopPing();
      this.emit('disconnected');
      setTimeout(() => this.connect(), this.reconnectInterval);
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.isConnecting = false;
      this.emit('error', error);
    });
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private async subscribeToActiveMarkets(): Promise<void> {
    try {
      // Fetch active markets
      const response = await axios.get(`${GAMMA_API}/markets`, {
        params: { limit: 50, active: true, closed: false },
      });

      const markets = response.data;
      const assetIds: string[] = [];

      // Store market info and extract clobTokenIds
      this.monitoredMarkets = [];
      for (const market of markets) {
        // Detect category from market data
        const question = (market.question || market.title || '').toLowerCase();
        const slug = (market.slug || '').toLowerCase();
        const eventSlug = market.events?.[0]?.slug?.toLowerCase() || '';

        let category = 'Other';
        if (slug.includes('nfl') || slug.includes('nba') || slug.includes('mlb') ||
            slug.includes('nhl') || slug.includes('super-bowl') || slug.includes('world-series') ||
            slug.includes('premier-league') || slug.includes('champions-league') ||
            eventSlug.includes('sport') || question.includes('win the game') ||
            question.includes('win super bowl') || question.includes('win the championship') ||
            slug.includes('spl-') || slug.includes('epl-') || slug.includes('laliga-')) {
          category = 'Sports';
        } else if (question.includes('trump') || question.includes('biden') ||
                   question.includes('election') || question.includes('president') ||
                   question.includes('congress') || question.includes('senate') ||
                   question.includes('governor') || question.includes('political') ||
                   slug.includes('election') || slug.includes('politic')) {
          category = 'Politics';
        } else if (question.includes('crypto') || question.includes('bitcoin') ||
                   question.includes('ethereum') || question.includes('price') ||
                   question.includes('fed') || question.includes('rate') ||
                   slug.includes('crypto') || slug.includes('bitcoin')) {
          category = 'Crypto & Finance';
        } else if (question.includes('ai') || question.includes('tech') ||
                   question.includes('openai') || question.includes('google') ||
                   question.includes('apple') || question.includes('tesla')) {
          category = 'Tech';
        }

        // Store market info for display
        this.monitoredMarkets.push({
          id: market.id,
          question: market.question || market.title || 'Unknown',
          image: market.image || '',
          icon: market.icon || market.image || '',
          slug: market.slug || '',
          volume: market.volumeNum || parseFloat(market.volume) || 0,
          liquidity: market.liquidityNum || parseFloat(market.liquidity) || 0,
          category,
        });

        if (market.clobTokenIds) {
          try {
            // clobTokenIds comes as a JSON string from the API
            const tokenIds = typeof market.clobTokenIds === 'string'
              ? JSON.parse(market.clobTokenIds)
              : market.clobTokenIds;
            if (Array.isArray(tokenIds)) {
              assetIds.push(...tokenIds);
            }
          } catch {
            // Skip if parsing fails
          }
        }
      }

      // Sort markets by volume (highest first)
      this.monitoredMarkets.sort((a, b) => b.volume - a.volume);

      if (assetIds.length > 0) {
        this.subscribeToAssets(assetIds.slice(0, 100)); // Limit to 100 assets
        console.log(`Subscribed to ${Math.min(assetIds.length, 100)} assets from ${markets.length} markets`);
      }
    } catch (error) {
      console.error('Failed to fetch markets for subscription:', error);
    }
  }

  getMonitoredMarkets(): MonitoredMarket[] {
    return this.monitoredMarkets;
  }

  private subscribeToAssets(assetIds: string[]): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      // Subscribe to assets using the correct format
      const message = {
        assets_ids: assetIds,
        type: 'market',
      };
      this.ws.send(JSON.stringify(message));
      assetIds.forEach((id) => this.subscribedAssets.add(id));
    }
  }

  subscribeToMarket(conditionId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = {
        assets_ids: [conditionId],
        type: 'market',
      };
      this.ws.send(JSON.stringify(message));
    }
  }

  private handleMessage(message: WebSocketTradeEvent | { type: string } | unknown[] | PriceChangeMessage): void {
    // Handle array of events
    if (Array.isArray(message)) {
      for (const event of message) {
        this.processEvent(event);
      }
      return;
    }

    // Handle single event
    if (typeof message === 'object' && message !== null) {
      this.processEvent(message);
    }
  }

  private processEvent(event: unknown): void {
    const e = event as Record<string, unknown>;

    // Handle last_trade_price event (original format)
    if (e.event_type === 'last_trade_price' || e.event_type === 'trade') {
      const tradeEvent = e as unknown as WebSocketTradeEvent;
      const tradeData: TradeData = {
        assetId: tradeEvent.asset_id,
        marketId: tradeEvent.market,
        price: parseFloat(tradeEvent.price),
        size: parseFloat(tradeEvent.size),
        side: tradeEvent.side,
        timestamp: new Date(parseInt(tradeEvent.timestamp)),
        feeRateBps: tradeEvent.fee_rate_bps
          ? parseInt(tradeEvent.fee_rate_bps)
          : undefined,
      };
      this.emit('trade', tradeData);
      return;
    }

    // Handle price_changes event - just count for activity tracking
    // Don't emit as trades since we don't have size/title info
    // Real trades come from Data API polling
    if (e.price_changes && Array.isArray(e.price_changes)) {
      this.emit('priceUpdate', {
        market: e.market,
        changes: e.price_changes,
      });
    }
  }

  disconnect(): void {
    this.stopPing();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const polymarketWs = new PolymarketWebSocket();
