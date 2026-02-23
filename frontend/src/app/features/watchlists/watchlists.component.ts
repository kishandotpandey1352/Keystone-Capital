import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-watchlists',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './watchlists.component.html',
  styleUrls: ['./watchlists.component.css'],
})
export class WatchlistsComponent {
  watchlistSearch = '';
  watchlistListSearch = '';
  holdingsSearch = '';

  readonly availableStocks = [
    { symbol: 'AAPL', name: 'Apple Inc' },
    { symbol: 'MSFT', name: 'Microsoft Corp' },
    { symbol: 'NVDA', name: 'NVIDIA Corp' },
    { symbol: 'AMZN', name: 'Amazon.com Inc' },
    { symbol: 'TSLA', name: 'Tesla Inc' },
    { symbol: 'META', name: 'Meta Platforms' },
    { symbol: 'GOOGL', name: 'Alphabet Inc' },
    { symbol: 'AMD', name: 'Advanced Micro Devices' },
    { symbol: 'NFLX', name: 'Netflix Inc' },
    { symbol: 'JPM', name: 'JPMorgan Chase' },
  ];

  readonly localWatchlists: Array<{
    id: number;
    name: string;
    description: string;
    isPrivate: boolean;
    stocks: Array<{ symbol: string; name: string }>;
  }> = [
    {
      id: 1,
      name: 'AI Leaders',
      description: 'Large-cap AI beneficiaries',
      isPrivate: true,
      stocks: [
        { symbol: 'NVDA', name: 'NVIDIA Corp' },
        { symbol: 'MSFT', name: 'Microsoft Corp' },
        { symbol: 'META', name: 'Meta Platforms' },
      ],
    },
    {
      id: 2,
      name: 'Mega Cap Core',
      description: 'Core long-term holdings',
      isPrivate: true,
      stocks: [
        { symbol: 'AAPL', name: 'Apple Inc' },
        { symbol: 'AMZN', name: 'Amazon.com Inc' },
        { symbol: 'GOOGL', name: 'Alphabet Inc' },
      ],
    },
    {
      id: 3,
      name: 'Options Flow',
      description: 'High open interest names',
      isPrivate: true,
      stocks: [
        { symbol: 'TSLA', name: 'Tesla Inc' },
        { symbol: 'AMD', name: 'Advanced Micro Devices' },
      ],
    },
  ];

  selectedWatchlistId = 1;

  get filteredStocks() {
    const q = this.watchlistSearch.trim().toLowerCase();
    if (!q) return this.availableStocks;
    return this.availableStocks.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q)
    );
  }

  get filteredWatchlists() {
    const q = this.watchlistListSearch.trim().toLowerCase();
    if (!q) return this.localWatchlists;
    return this.localWatchlists.filter(
      (wl) =>
        wl.name.toLowerCase().includes(q) ||
        wl.description.toLowerCase().includes(q)
    );
  }

  get selectedWatchlist() {
    return this.localWatchlists.find((w) => w.id === this.selectedWatchlistId);
  }

  get filteredHoldings() {
    const wl = this.selectedWatchlist;
    if (!wl) return [];
    const q = this.holdingsSearch.trim().toLowerCase();
    if (!q) return wl.stocks;
    return wl.stocks.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q)
    );
  }

  selectWatchlist(id: number) {
    this.selectedWatchlistId = id;
  }

  addStockToWatchlist(stock: { symbol: string; name: string }) {
    const wl = this.selectedWatchlist;
    if (!wl) return;
    if (wl.stocks.find((s) => s.symbol === stock.symbol)) return;
    wl.stocks = [...wl.stocks, stock];
  }

  removeStockFromWatchlist(symbol: string) {
    const wl = this.selectedWatchlist;
    if (!wl) return;
    wl.stocks = wl.stocks.filter((s) => s.symbol !== symbol);
  }
}
