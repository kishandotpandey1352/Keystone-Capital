import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface Watchlist {
  id: number;
  name: string;
  is_deleted: boolean;
  deleted_at?: string | null;
  created_at?: string | null;
}

export interface NewsArticle {
  id: number;
  category: string;
  datetime: number;
  headline: string;
  image?: string | null;
  related?: string | null;
  source?: string | null;
  summary?: string | null;
  url: string;
}

export interface NewsCategoryBlock {
  category: string;
  articles: NewsArticle[];
}

export interface HomeNewsResponse {
  categories: NewsCategoryBlock[];
}

export interface Portfolio {
  id: number;
  name: string;
  created_at?: string | null;
}

export interface Position {
  id: number;
  portfolio_id: number;
  symbol: string;
  market: string;
  quantity: number;
  buy_price: number;
  buy_date: string;
  created_at?: string | null;
}

export interface PortfolioTimelinePoint {
  date: string;
  value: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  health() {
    return this.http.get<{ status: string }>(`${environment.apiBaseUrl}/health`);
  }

  getWatchlists() {
    return this.http.get<Watchlist[]>(`${environment.apiBaseUrl}/watchlists`);
  }

  createWatchlist(name: string) {
    return this.http.post<Watchlist>(`${environment.apiBaseUrl}/watchlists`, { name });
  }

  computeSignal(watchlistId: number) {
    return this.http.post<{ status: string }>(
      `${environment.apiBaseUrl}/watchlists/${watchlistId}/compute`,
      {}
    );
  }

  deleteWatchlist(watchlistId: number) {
    return this.http.delete<{ status: string }>(
      `${environment.apiBaseUrl}/watchlists/${watchlistId}`
    );
  }

  getHomeNews(limit = 10, maxCategories = 4) {
    return this.http.get<HomeNewsResponse>(
      `${environment.apiBaseUrl}/news/home`,
      {
        params: {
          limit,
          max_categories: maxCategories,
        },
      }
    );
  }

  createPortfolio(name: string) {
    return this.http.post<Portfolio>(`${environment.apiBaseUrl}/portfolios`, { name });
  }

  listPortfolios() {
    return this.http.get<Portfolio[]>(`${environment.apiBaseUrl}/portfolios`);
  }

  addPosition(portfolioId: number, payload: Omit<Position, 'id' | 'portfolio_id' | 'created_at'>) {
    return this.http.post<Position>(
      `${environment.apiBaseUrl}/portfolios/${portfolioId}/positions`,
      payload
    );
  }

  listPositions(portfolioId: number) {
    return this.http.get<Position[]>(
      `${environment.apiBaseUrl}/portfolios/${portfolioId}/positions`
    );
  }

  getPriceOnDate(symbol: string, market: string, date: string) {
    return this.http.get<{ symbol: string; date: string; close: number; source: string }>(
      `${environment.apiBaseUrl}/portfolios/prices/close`,
      {
        params: { symbol, market, date },
      }
    );
  }

  getPortfolioTimeline(portfolioId: number, start: string, end: string) {
    return this.http.get<PortfolioTimelinePoint[]>(
      `${environment.apiBaseUrl}/portfolios/${portfolioId}/timeline`,
      { params: { start, end } }
    );
  }
}
