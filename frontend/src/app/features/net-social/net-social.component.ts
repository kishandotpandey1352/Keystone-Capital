import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { ApiService, SentimentAnalysisResponse } from '../../core/services/api.service';

@Component({
  selector: 'app-net-social',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './net-social.component.html',
  styleUrls: ['./net-social.component.css'],
})
export class NetSocialComponent implements OnInit {
  showIntroDetails = true;
  selectedMode: 'dashboard' | 'single' | 'batch' | 'report' | 'demo' = 'dashboard';
  sentimentWatchlistId = 1;
  sentimentTicker = '';
  sentimentLoading = false;
  sentimentError = '';
  sentimentData: SentimentAnalysisResponse | null = null;

  batchLoading = false;
  batchError = '';
  maxBatchSize = 6;
  batchResults: Array<{
    ticker: string;
    score: number;
    label: string;
    price: number | null;
  }> = [];
  reportText = '';

  private sentimentRequestId = 0;
  private batchRequestId = 0;

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

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    if (this.localWatchlists.length) {
      this.sentimentWatchlistId = this.localWatchlists[0].id;
      this.syncSentimentTicker();
    }
  }

  hideIntroDetails() {
    this.showIntroDetails = false;
  }

  showIntroDetailsOnHover() {
    this.showIntroDetails = true;
  }

  setMode(mode: 'dashboard' | 'single' | 'batch' | 'report' | 'demo') {
    this.selectedMode = mode;
    if (mode === 'dashboard' || mode === 'single') {
      this.batchLoading = false;
    } else {
      this.sentimentLoading = false;
    }
  }

  onSentimentWatchlistChange(id: number) {
    this.sentimentWatchlistId = id;
    this.syncSentimentTicker();
    this.sentimentData = null;
    this.sentimentError = '';
    this.batchResults = [];
    this.batchError = '';
  }

  onSentimentTickerChange(ticker: string) {
    this.sentimentTicker = ticker;
    this.sentimentData = null;
    this.sentimentError = '';
  }

  async analyzeSentiment() {
    const ticker = this.sentimentTicker.trim().toUpperCase();
    if (!ticker || this.sentimentLoading) return;

    const requestId = ++this.sentimentRequestId;
    this.sentimentLoading = true;
    this.sentimentError = '';
    this.sentimentData = null;

    try {
      const data = await firstValueFrom(this.api.analyzeSentiment(ticker));
      if (requestId === this.sentimentRequestId) {
        this.sentimentData = data;
      }
    } catch {
      if (requestId === this.sentimentRequestId) {
        this.sentimentError = 'Failed to analyze sentiment.';
      }
    } finally {
      if (requestId === this.sentimentRequestId) {
        this.sentimentLoading = false;
        this.cdr.detectChanges();
      }
    }
  }

  async runBatchAnalysis(useDemo = false) {
    if (this.batchLoading) return;

    const tickers = this.getBatchTickers(useDemo);
    if (!tickers.length) {
      this.batchError = 'No tickers available for batch analysis.';
      return;
    }

    const requestId = ++this.batchRequestId;
    this.batchLoading = true;
    this.batchError = '';
    this.batchResults = [];
    this.reportText = '';

    try {
      for (const ticker of tickers) {
        try {
          const data = await firstValueFrom(this.api.analyzeSentiment(ticker));
          if (requestId === this.batchRequestId) {
            this.batchResults.push({
              ticker: data.ticker,
              score: data.overall_score,
              label: data.sentiment_label,
              price: data.current_price,
            });
            this.cdr.detectChanges();
          }
        } catch {
          if (requestId === this.batchRequestId) {
            this.batchError = `Failed to analyze ${ticker}.`;
            this.cdr.detectChanges();
          }
        }
      }

      if (requestId === this.batchRequestId && !this.batchResults.length) {
        this.batchError = this.batchError || 'No batch results available.';
      }
    } finally {
      if (requestId === this.batchRequestId) {
        this.batchLoading = false;
        this.cdr.detectChanges();
      }
    }
  }

  async generateMarketReport() {
    if (!this.batchResults.length) {
      await this.runBatchAnalysis(false);
    }
    if (!this.batchResults.length) return;
    this.reportText = this.buildReportText();
  }

  downloadReport() {
    if (!this.reportText) return;
    const blob = new Blob([this.reportText], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sentiment-report-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  get sentimentWatchlist() {
    return this.localWatchlists.find((w) => w.id === this.sentimentWatchlistId);
  }

  get sentimentTickers() {
    return this.sentimentWatchlist?.stocks ?? [];
  }

  get sentimentDistributionTotal() {
    const dist = this.sentimentData?.distribution;
    if (!dist) return 0;
    return dist.positive + dist.neutral + dist.negative;
  }

  get sentimentScoreDisplay() {
    if (!this.sentimentData) return '0.000';
    return this.sentimentData.overall_score.toFixed(3);
  }

  get gaugeAngle() {
    const score = this.sentimentData?.overall_score ?? 0;
    const clamped = Math.max(-1, Math.min(1, score));
    return clamped * 90;
  }

  get gaugeLabel() {
    return this.sentimentData?.sentiment_label ?? 'Neutral';
  }

  get batchAverageScore() {
    if (!this.batchResults.length) return 0;
    return (
      this.batchResults.reduce((sum, r) => sum + r.score, 0) /
      this.batchResults.length
    );
  }

  get batchMostPositive() {
    if (!this.batchResults.length) return null;
    return this.batchResults.reduce((max, r) => (r.score > max.score ? r : max));
  }

  get batchMostNegative() {
    if (!this.batchResults.length) return null;
    return this.batchResults.reduce((min, r) => (r.score < min.score ? r : min));
  }

  get priceSeriesPath() {
    return this.buildLinePath(
      this.sentimentData?.price_history ?? [],
      (point) => point.close
    );
  }

  get sentimentSeriesPath() {
    return this.buildLinePath(
      this.sentimentData?.sentiment_history ?? [],
      (point) => point.score
    );
  }

  private syncSentimentTicker() {
    const tickers = this.sentimentTickers;
    this.sentimentTicker = tickers.length ? tickers[0].symbol : '';
  }

  private getBatchTickers(useDemo: boolean) {
    const watchlistTickers = this.sentimentTickers.map((s) => s.symbol);
    const fallback = ['AAPL', 'MSFT', 'NVDA'];
    const base = watchlistTickers.length ? watchlistTickers : fallback;
    const list = useDemo ? base.slice(0, 3) : base.slice(0, this.maxBatchSize);
    return list.map((t) => t.toUpperCase());
  }

  private buildReportText() {
    const avg = this.batchAverageScore.toFixed(3);
    const mostPositive = this.batchMostPositive;
    const mostNegative = this.batchMostNegative;
    const lines = [
      'FINANCIAL SENTIMENT ANALYSIS REPORT',
      '===================================',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      `Average Sentiment Score: ${avg}`,
      mostPositive
        ? `Most Positive: ${mostPositive.ticker} (${mostPositive.score.toFixed(3)})`
        : 'Most Positive: N/A',
      mostNegative
        ? `Most Negative: ${mostNegative.ticker} (${mostNegative.score.toFixed(3)})`
        : 'Most Negative: N/A',
      '',
      'Ticker Summary:',
    ];

    for (const row of this.batchResults) {
      const price = row.price === null ? 'n/a' : `$${row.price.toFixed(2)}`;
      lines.push(
        `${row.ticker.padEnd(6)} | ${row.label.padEnd(8)} | ${row.score.toFixed(3)} | ${price}`
      );
    }

    return lines.join('\n');
  }

  private buildLinePath<T>(
    data: T[],
    valueSelector: (point: T) => number,
    width = 320,
    height = 110
  ) {
    if (!data.length) return '';
    const values = data
      .map((point) => Number(valueSelector(point)))
      .filter((v) => Number.isFinite(v));
    if (!values.length) return '';
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const step = width / Math.max(values.length - 1, 1);

    return values
      .map((value, index) => {
        const x = index * step;
        const y = height - ((value - min) / range) * height;
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }
}
