import axios, { AxiosInstance } from 'axios';
import type { Market, DataApiTrade, Activity } from '../types/index.js';

const GAMMA_API = 'https://gamma-api.polymarket.com';
const DATA_API = 'https://data-api.polymarket.com';
const CLOB_API = 'https://clob.polymarket.com';

export class PolymarketClient {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  async getMarkets(params?: {
    limit?: number;
    active?: boolean;
    closed?: boolean;
  }): Promise<Market[]> {
    const response = await this.axiosInstance.get(`${GAMMA_API}/markets`, {
      params: { limit: 100, active: true, closed: false, ...params },
    });
    return response.data;
  }

  async getMarket(marketId: string): Promise<Market> {
    const response = await this.axiosInstance.get(
      `${GAMMA_API}/markets/${marketId}`
    );
    return response.data;
  }

  async getTrades(params?: {
    market?: string;
    limit?: number;
    start?: number;
    end?: number;
  }): Promise<DataApiTrade[]> {
    const response = await this.axiosInstance.get(`${DATA_API}/trades`, {
      params,
    });
    return response.data;
  }

  async getActivity(params?: {
    user?: string;
    market?: string;
    type?: string;
    limit?: number;
  }): Promise<Activity[]> {
    const response = await this.axiosInstance.get(`${DATA_API}/activity`, {
      params,
    });
    return response.data;
  }

  async getPrice(tokenId: string): Promise<number> {
    const response = await this.axiosInstance.get(`${CLOB_API}/price`, {
      params: { token_id: tokenId },
    });
    return parseFloat(response.data.price);
  }

  async getOrderbook(tokenId: string): Promise<{
    bids: Array<{ price: string; size: string }>;
    asks: Array<{ price: string; size: string }>;
  }> {
    const response = await this.axiosInstance.get(`${CLOB_API}/book`, {
      params: { token_id: tokenId },
    });
    return response.data;
  }

  async getEvents(params?: { limit?: number }): Promise<
    Array<{
      id: string;
      title: string;
      slug: string;
      markets: Market[];
    }>
  > {
    const response = await this.axiosInstance.get(`${GAMMA_API}/events`, {
      params,
    });
    return response.data;
  }
}

export const polymarketClient = new PolymarketClient();
