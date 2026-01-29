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
}
