import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  ApiService,
  Portfolio,
  Position,
  PortfolioTimelinePoint,
} from '../../core/services/api.service';

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './portfolio.component.html',
  styleUrls: ['./portfolio.component.css'],
})
export class PortfolioComponent implements OnInit {
  portfolio: Portfolio | null = null;
  positions: Position[] = [];
  timeline: PortfolioTimelinePoint[] = [];

  isLoading = false;
  errorMsg = '';

  symbol = '';
  market: 'US' | 'IN' = 'US';
  quantity = 1;
  buyDate = new Date().toISOString().slice(0, 10);
  buyPrice = 0;
  priceLoading = false;
  tradeModalOpen = false;
  tradeErrors: string[] = [];

  private readonly holidayCalendar: Record<'US' | 'IN', string[]> = {
    US: [
      '2026-01-01',
      '2026-01-19',
      '2026-02-16',
      '2026-04-03',
      '2026-05-25',
      '2026-07-03',
      '2026-09-07',
      '2026-11-26',
      '2026-12-25',
    ],
    IN: [
      '2026-01-26',
      '2026-03-06',
      '2026-03-25',
      '2026-05-01',
      '2026-08-15',
      '2026-10-02',
      '2026-10-20',
      '2026-11-09',
      '2026-12-25',
    ],
  };

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadPortfolio();
  }

  loadPortfolio() {
    this.isLoading = true;
    this.errorMsg = '';
    this.api.listPortfolios().subscribe({
      next: (portfolios) => {
        const existing = portfolios?.[0];
        if (existing) {
          this.portfolio = existing;
          this.loadPositions();
          this.loadTimeline();
        } else {
          this.createDefaultPortfolio();
        }
      },
      error: () => (this.errorMsg = 'Failed to load portfolio.'),
      complete: () => (this.isLoading = false),
    });
  }

  createDefaultPortfolio() {
    this.api.createPortfolio('My Portfolio').subscribe({
      next: (portfolio) => {
        this.portfolio = portfolio;
        this.positions = [];
        this.timeline = [];
      },
      error: () => (this.errorMsg = 'Failed to create portfolio.'),
    });
  }

  loadPositions() {
    if (!this.portfolio) return;
    this.api.listPositions(this.portfolio.id).subscribe({
      next: (positions) => (this.positions = positions ?? []),
      error: () => (this.errorMsg = 'Failed to load positions.'),
    });
  }

  loadTimeline() {
    if (!this.portfolio) return;
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 90);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    this.api.getPortfolioTimeline(this.portfolio.id, startStr, endStr).subscribe({
      next: (points) => (this.timeline = points ?? []),
      error: () => (this.errorMsg = 'Failed to load timeline.'),
    });
  }

  fetchPrice() {
    const symbol = this.symbol.trim();
    if (!symbol) return;
    this.priceLoading = true;
    this.api.getPriceOnDate(symbol, this.market, this.buyDate).subscribe({
      next: (data) => (this.buyPrice = data?.close ?? 0),
      error: () => (this.errorMsg = 'Failed to fetch price.'),
      complete: () => (this.priceLoading = false),
    });
  }

  addPosition() {
    if (!this.portfolio) return;
    const symbol = this.symbol.trim().toUpperCase();
    this.tradeErrors = this.validateTrade();
    if (this.tradeErrors.length) return;

    this.api
      .addPosition(this.portfolio.id, {
        symbol,
        market: this.market,
        quantity: this.quantity,
        buy_price: this.buyPrice,
        buy_date: this.buyDate,
      })
      .subscribe({
        next: (position) => {
          this.positions = [position, ...this.positions];
          this.loadTimeline();
          this.symbol = '';
          this.quantity = 1;
          this.buyPrice = 0;
          this.tradeModalOpen = false;
        },
        error: () => (this.errorMsg = 'Failed to add position.'),
      });
  }

  openTradeModal() {
    this.tradeErrors = [];
    this.tradeModalOpen = true;
  }

  closeTradeModal() {
    this.tradeErrors = [];
    this.tradeModalOpen = false;
  }

  private isWeekend(dateStr: string) {
    const date = new Date(dateStr);
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  private isHoliday(dateStr: string) {
    return this.holidayCalendar[this.market]?.includes(dateStr) ?? false;
  }

  validateTrade() {
    const errors: string[] = [];
    const symbol = this.symbol.trim();

    if (!symbol) errors.push('Symbol is required.');
    if (!this.buyDate) errors.push('Buy date is required.');
    if (this.buyDate && this.isWeekend(this.buyDate)) {
      errors.push('Buy date cannot be on a weekend.');
    }
    if (this.buyDate && this.isHoliday(this.buyDate)) {
      errors.push('Buy date cannot be on a market holiday.');
    }
    if (this.quantity <= 0) errors.push('Quantity must be greater than zero.');
    if (this.buyPrice <= 0) errors.push('Buy price must be greater than zero.');

    return errors;
  }

  get totalInvested() {
    return this.positions.reduce(
      (sum, p) => sum + p.quantity * p.buy_price,
      0
    );
  }

  get latestValue() {
    if (!this.timeline.length) return 0;
    return this.timeline[this.timeline.length - 1].value;
  }

  get performancePct() {
    const invested = this.totalInvested;
    if (!invested) return 0;
    return ((this.latestValue - invested) / invested) * 100;
  }

  get chartPoints() {
    if (this.timeline.length < 2) return '';
    const width = 600;
    const height = 220;
    const values = this.timeline.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return this.timeline
      .map((p, idx) => {
        const x = (idx / (this.timeline.length - 1)) * width;
        const y = height - ((p.value - min) / range) * height;
        return `${x},${y}`;
      })
      .join(' ');
  }
}
