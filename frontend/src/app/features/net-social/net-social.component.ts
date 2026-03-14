import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import {
  ApiService,
  PriceHistoryPoint,
  SentimentAnalysisResponse,
  SentimentHistoryPoint,
  TickerSuggestion,
} from '../../core/services/api.service';

@Component({
  selector: 'app-net-social',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './net-social.component.html',
  styleUrls: ['./net-social.component.css'],
})
export class NetSocialComponent {
  showIntroDetails = true;
  sentimentTicker = '';
  sentimentLoading = false;
  sentimentError = '';
  sentimentData: SentimentAnalysisResponse | null = null;
  tickerSuggestions: TickerSuggestion[] = [];
  tickerDropdownOpen = false;
  tickerSearchLoading = false;
  activeChartDialog: 'price' | 'sentiment' | null = null;
  chartHover: Record<
    'price' | 'sentiment',
    | {
        index: number;
        x: number;
        y: number;
        label: string;
        value: string;
        boxX: number;
        boxY: number;
        boxWidth: number;
      }
    | null
  > = {
    price: null,
    sentiment: null,
  };

  readonly chartWidth = 320;
  readonly chartHeight = 110;
  readonly chartPaddingLeft = 26;
  readonly chartPaddingRight = 10;
  readonly chartPaddingTop = 8;
  readonly chartPaddingBottom = 18;

  private sentimentRequestId = 0;
  private tickerSearchRequestId = 0;
  private tickerSearchTimer: number | undefined;
  private readonly chartZoom: Record<
    'price' | 'sentiment',
    { start: number; end: number } | null
  > = {
    price: null,
    sentiment: null,
  };

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  hideIntroDetails() {
    this.showIntroDetails = false;
  }

  showIntroDetailsOnHover() {
    this.showIntroDetails = true;
  }

  onSentimentTickerChange(ticker: string) {
    this.sentimentTicker = ticker;
    this.sentimentData = null;
    this.sentimentError = '';
    this.queueTickerSearch(ticker);
  }

  onTickerInputFocus() {
    this.tickerDropdownOpen = true;
    if (this.sentimentTicker) {
      this.queueTickerSearch(this.sentimentTicker);
    }
  }

  onTickerInputBlur() {
    window.setTimeout(() => {
      this.tickerDropdownOpen = false;
      this.cdr.detectChanges();
    }, 150);
  }

  onSelectTickerSuggestion(item: TickerSuggestion) {
    this.sentimentTicker = item.symbol.toUpperCase();
    this.tickerSuggestions = [];
    this.tickerDropdownOpen = false;
  }

  normalizeNewsUrl(url: string | null | undefined) {
    const raw = (url || '').trim();
    if (!raw) return 'https://finance.yahoo.com';
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    return `https://${raw}`;
  }

  newsSummary(summary: unknown) {
    return typeof summary === 'string' ? summary.trim() : '';
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
        this.cdr.detectChanges();
      }
    } catch {
      if (requestId === this.sentimentRequestId) {
        this.sentimentError = 'Failed to analyze sentiment.';
        this.cdr.detectChanges();
      }
    } finally {
      if (requestId === this.sentimentRequestId) {
        this.sentimentLoading = false;
        this.cdr.detectChanges();
      }
    }
  }

  private queueTickerSearch(query: string) {
    if (this.tickerSearchTimer) {
      window.clearTimeout(this.tickerSearchTimer);
    }

    const trimmed = query.trim();
    if (!trimmed) {
      this.tickerSuggestions = [];
      return;
    }

    this.tickerSearchTimer = window.setTimeout(() => {
      this.fetchTickerSuggestions(trimmed);
    }, 250);
  }

  private async fetchTickerSuggestions(query: string) {
    const requestId = ++this.tickerSearchRequestId;
    this.tickerSearchLoading = true;

    try {
      const suggestions = await firstValueFrom(this.api.searchTickers(query, 20));
      if (requestId === this.tickerSearchRequestId) {
        this.tickerSuggestions = suggestions;
        this.tickerDropdownOpen = true;
      }
    } catch {
      if (requestId === this.tickerSearchRequestId) {
        this.tickerSuggestions = [];
      }
    } finally {
      if (requestId === this.tickerSearchRequestId) {
        this.tickerSearchLoading = false;
        this.cdr.detectChanges();
      }
    }
  }

  onOpenChartDialog(kind: 'price' | 'sentiment') {
    this.activeChartDialog = kind;
    this.chartZoom[kind] = null;
    this.chartHover[kind] = null;
  }

  closeChartDialog() {
    if (!this.activeChartDialog) return;
    const kind = this.activeChartDialog;
    this.chartZoom[kind] = null;
    this.chartHover[kind] = null;
    this.activeChartDialog = null;
  }

  async downloadPdf() {
    if (!this.sentimentData) return;
    const { jsPDF } = await import('jspdf');

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40;
    const lineHeight = 16;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = pageWidth - margin * 2;
    let y = margin;

    const addLine = (text: string, fontSize = 11, bold = false) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, maxWidth);
      for (const line of lines) {
        if (y > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      }
    };

    const data = this.sentimentData;
    addLine('Financial Sentiment Report', 16, true);
    addLine(`Generated: ${new Date().toLocaleString()}`);
    y += 8;

    addLine(`Ticker: ${data.ticker}`, 12, true);
    addLine(`Label: ${data.sentiment_label}`);
    addLine(`Score: ${data.overall_score.toFixed(3)}`);
    addLine(`Confidence: ${data.confidence.toFixed(2)}`);
    addLine(`Sources: ${data.sources_analyzed}`);
    addLine(
      `Current price: ${data.current_price === null ? 'n/a' : '$' + data.current_price.toFixed(2)}`
    );
    y += 8;

    addLine('Distribution', 12, true);
    addLine(`Positive: ${data.distribution.positive}`);
    addLine(`Neutral: ${data.distribution.neutral}`);
    addLine(`Negative: ${data.distribution.negative}`);
    y += 8;

    addLine('Recent News', 12, true);
    if (!data.news.length) {
      addLine('No news available.');
    } else {
      const items = data.news.slice(0, 8);
      for (const item of items) {
        const when = new Date(item.datetime * 1000).toLocaleString();
        addLine(`${item.headline}`, 11, true);
        addLine(`${item.source || 'Source'} | ${when}`);
        addLine(`${item.sentiment_label} (${item.sentiment_score.toFixed(2)})`);
        if (item.summary) addLine(item.summary);
        y += 6;
      }
    }

    const chartWidth = pageWidth - margin * 2;
    const chartHeight = (chartWidth / 560) * 220;

    const addChart = (title: string, kind: 'price' | 'sentiment') => {
      const image = this.renderChartImage(kind);
      if (!image) return;
      if (y + chartHeight + 36 > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      addLine(title, 12, true);
      doc.addImage(image, 'PNG', margin, y, chartWidth, chartHeight);
      y += chartHeight + 16;
    };

    addChart('Price Trend', 'price');
    addChart('Sentiment Trend', 'sentiment');

    doc.save(`sentiment-report-${data.ticker}-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  private renderChartImage(kind: 'price' | 'sentiment') {
    if (typeof document === 'undefined' || !this.sentimentData) return null;
    const data =
      kind === 'price'
        ? this.sentimentData.price_history
        : this.sentimentData.sentiment_history;
    if (!data?.length) return null;

    const width = 560;
    const height = 220;
    const padding = { left: 40, right: 20, top: 20, bottom: 30 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const values =
      kind === 'price'
        ? (data as Array<{ close: number }>).map((point) => point.close)
        : (data as Array<{ score: number }>).map((point) => point.score);
    const finiteValues = values.filter((value) => Number.isFinite(value));
    if (!finiteValues.length) return null;
    if (!values.length) return null;

    const min = kind === 'sentiment' ? -1 : Math.min(...finiteValues);
    const max = kind === 'sentiment' ? 1 : Math.max(...finiteValues);
    const range = max - min || 1;
    const step = plotWidth / Math.max(values.length - 1, 1);

    const points = finiteValues.map((value, index) => {
      const x = padding.left + index * step;
      const y = padding.top + (1 - (value - min) / range) * plotHeight;
      return { x, y, value };
    });

    const gridColor = 'rgba(26, 32, 40, 0.15)';
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    const ySteps = kind === 'sentiment' ? 2 : 4;
    for (let i = 0; i <= ySteps; i += 1) {
      const yLine = padding.top + (plotHeight / ySteps) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, yLine);
      ctx.lineTo(width - padding.right, yLine);
      ctx.stroke();
    }
    for (let i = 0; i <= 4; i += 1) {
      const xLine = padding.left + (plotWidth / 4) * i;
      ctx.beginPath();
      ctx.moveTo(xLine, padding.top);
      ctx.lineTo(xLine, height - padding.bottom);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(26, 32, 40, 0.35)';
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    ctx.strokeStyle = '#2aa8d6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.stroke();

    ctx.fillStyle = '#3c4a58';
    ctx.font = '10px Arial';
    const yLabels = kind === 'sentiment' ? [1, 0, -1] : this.buildValueTicks(min, max, 4);
    yLabels.forEach((value) => {
      const yPos = padding.top + (1 - (value - min) / range) * plotHeight;
      ctx.fillText(this.formatAxisValue(value, kind), 6, yPos + 3);
    });

    const labelDates = this.buildDateLabels(data.map((item) => item.date));
    labelDates.forEach((label) => {
      ctx.fillText(label.text, label.x, height - 10);
    });

    return canvas.toDataURL('image/png');
  }

  private buildValueTicks(min: number, max: number, steps: number) {
    const range = max - min || 1;
    return Array.from({ length: steps + 1 }, (_, index) => max - (range / steps) * index);
  }

  private buildDateLabels(dates: string[]) {
    if (dates.length < 2) return [] as Array<{ text: string; x: number }>;
    const lastIndex = dates.length - 1;
    const midIndex = Math.floor(lastIndex / 2);
    const indices = [0, midIndex, lastIndex];
    return indices.map((index) => {
      const x = 40 + (index / Math.max(lastIndex, 1)) * (560 - 40 - 20);
      return { text: this.formatDateLabel(dates[index]), x };
    });
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

  get priceSeriesPath() {
    const stats = this.getSeriesStats(
      this.getVisibleData('price', this.sentimentData?.price_history ?? []),
      (point) => point.close
    );
    return this.buildLinePathFromValues(stats);
  }

  get sentimentSeriesPath() {
    const stats = this.getSeriesStats(
      this.getVisibleData('sentiment', this.sentimentData?.sentiment_history ?? []),
      (point) => point.score
    );
    return this.buildLinePathFromValues(stats, { min: -1, max: 1 });
  }

  get priceYAxisTicks() {
    const stats = this.getSeriesStats(
      this.getVisibleData('price', this.sentimentData?.price_history ?? []),
      (point) => point.close
    );
    return this.buildYAxisTicks(stats, 'price');
  }

  get sentimentYAxisTicks() {
    const stats = this.getSeriesStats(
      this.getVisibleData('sentiment', this.sentimentData?.sentiment_history ?? []),
      (point) => point.score
    );
    return this.buildYAxisTicks(stats, 'sentiment');
  }

  get priceXAxisLabels() {
    return this.buildXAxisLabels(
      this.getVisibleData('price', this.sentimentData?.price_history ?? [])
    );
  }

  get sentimentXAxisLabels() {
    return this.buildXAxisLabels(
      this.getVisibleData('sentiment', this.sentimentData?.sentiment_history ?? [])
    );
  }

  get priceXAxisTicks() {
    return this.buildXAxisTicks(
      this.getVisibleData('price', this.sentimentData?.price_history ?? [])
    );
  }

  get sentimentXAxisTicks() {
    return this.buildXAxisTicks(
      this.getVisibleData('sentiment', this.sentimentData?.sentiment_history ?? [])
    );
  }

  onChartHover(event: MouseEvent, kind: 'price' | 'sentiment') {
    const data = this.getChartData(kind);
    if (!data.length) return;
    const points = this.buildChartPoints(kind, data);
    if (!points.length) return;

    const svg = event.currentTarget as SVGElement | null;
    const rect = svg?.getBoundingClientRect();
    if (!rect) return;
    const localX = ((event.clientX - rect.left) / rect.width) * this.chartWidth;
    const plotWidth =
      this.chartWidth - this.chartPaddingLeft - this.chartPaddingRight;
    const step = plotWidth / Math.max(points.length - 1, 1);
    const rawIndex = Math.round((localX - this.chartPaddingLeft) / step);
    const index = Math.max(0, Math.min(points.length - 1, rawIndex));
    const point = points[index];
    if (!point) return;

    const valueText = kind === 'price' ? `$${point.value.toFixed(2)}` : point.value.toFixed(3);
    const label = this.formatDateLabel(point.date);
    const textLength = Math.max(label.length, valueText.length);
    const boxWidth = Math.max(64, textLength * 6 + 12);
    const boxHeight = 28;
    const offsetX = point.x > this.chartWidth * 0.65 ? -boxWidth - 8 : 8;
    const boxX = Math.max(4, Math.min(this.chartWidth - boxWidth - 4, point.x + offsetX));
    const boxY = Math.max(6, point.y - boxHeight - 8);

    this.chartHover[kind] = {
      index: point.rawIndex,
      x: point.x,
      y: point.y,
      label,
      value: valueText,
      boxX,
      boxY,
      boxWidth,
    };
  }

  onChartLeave(kind: 'price' | 'sentiment') {
    this.chartHover[kind] = null;
  }

  onChartDoubleClick(event: MouseEvent, kind: 'price' | 'sentiment') {
    const data = this.getChartData(kind);
    if (!data.length) return;

    if (this.chartZoom[kind]) {
      this.chartZoom[kind] = null;
      this.chartHover[kind] = null;
      return;
    }

    const points = this.buildChartPoints(kind, data);
    if (!points.length) return;

    const svg = event.currentTarget as SVGElement | null;
    const rect = svg?.getBoundingClientRect();
    if (!rect) return;
    const localX = ((event.clientX - rect.left) / rect.width) * this.chartWidth;
    const plotWidth =
      this.chartWidth - this.chartPaddingLeft - this.chartPaddingRight;
    const step = plotWidth / Math.max(points.length - 1, 1);
    const visibleIndex = Math.max(
      0,
      Math.min(points.length - 1, Math.round((localX - this.chartPaddingLeft) / step))
    );
    const rawIndex = points[visibleIndex].rawIndex;

    const windowSize = Math.max(5, Math.floor(data.length * 0.35));
    const half = Math.floor(windowSize / 2);
    let start = Math.max(0, rawIndex - half);
    let end = Math.min(data.length - 1, start + windowSize - 1);
    start = Math.max(0, end - windowSize + 1);

    this.chartZoom[kind] = { start, end };
    this.onChartHover(event, kind);
  }

  private getSeriesStats<T>(data: T[], valueSelector: (point: T) => number) {
    const values = data
      .map((point) => Number(valueSelector(point)))
      .filter((v) => Number.isFinite(v));
    if (!values.length) {
      return { values: [], min: 0, max: 0 };
    }
    return {
      values,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }

  private buildLinePathFromValues(
    stats: { values: number[]; min: number; max: number },
    rangeOverride?: { min: number; max: number }
  ) {
    if (!stats.values.length) return '';
    const min = rangeOverride ? rangeOverride.min : stats.min;
    const max = rangeOverride ? rangeOverride.max : stats.max;
    const range = max - min || 1;
    const plotWidth =
      this.chartWidth - this.chartPaddingLeft - this.chartPaddingRight;
    const plotHeight =
      this.chartHeight - this.chartPaddingTop - this.chartPaddingBottom;
    const step = plotWidth / Math.max(stats.values.length - 1, 1);

    return stats.values
      .map((value, index) => {
        const x = this.chartPaddingLeft + index * step;
        const y =
          this.chartPaddingTop +
          (1 - (value - min) / range) * plotHeight;
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  private buildYAxisTicks(
    stats: { values: number[]; min: number; max: number },
    mode: 'price' | 'sentiment'
  ) {
    if (!stats.values.length) return [] as Array<{ y: number; label: string }>;
    if (mode === 'sentiment') {
      const plotHeight =
        this.chartHeight - this.chartPaddingTop - this.chartPaddingBottom;
      const range = 2;
      const values = [1, 0, -1];
      return values.map((value) => {
        const y =
          this.chartPaddingTop +
          (1 - (value + 1) / range) * plotHeight;
        return {
          y,
          label: this.formatAxisValue(value, mode),
        };
      });
    }

    const range = stats.max - stats.min || 1;
    const plotHeight =
      this.chartHeight - this.chartPaddingTop - this.chartPaddingBottom;
    const steps = 4;
    const values = Array.from({ length: steps + 1 }, (_, index) => {
      return stats.max - (range / steps) * index;
    });

    return values.map((value) => {
      const y =
        this.chartPaddingTop +
        (1 - (value - stats.min) / range) * plotHeight;
      return {
        y,
        label: this.formatAxisValue(value, mode),
      };
    });
  }

  private buildXAxisLabels<T extends { date: string }>(data: T[]) {
    if (data.length < 2) return [] as Array<{ x: number; label: string; anchor: string }>;
    const lastIndex = data.length - 1;
    const midIndex = Math.floor(lastIndex / 2);
    const positions = [
      { index: 0, anchor: 'start' },
      { index: midIndex, anchor: 'middle' },
      { index: lastIndex, anchor: 'end' },
    ];
    return positions.map((pos) => {
      const x = this.chartPaddingLeft +
        (pos.index / Math.max(lastIndex, 1)) *
          (this.chartWidth - this.chartPaddingLeft - this.chartPaddingRight);
      return {
        x,
        label: this.formatDateLabel(data[pos.index].date),
        anchor: pos.anchor,
      };
    });
  }

  private buildXAxisTicks<T extends { date: string }>(data: T[]) {
    if (data.length < 2) return [] as Array<{ x: number }>;
    const lastIndex = data.length - 1;
    const steps = 4;
    const plotWidth =
      this.chartWidth - this.chartPaddingLeft - this.chartPaddingRight;
    return Array.from({ length: steps + 1 }, (_, index) => {
      const x = this.chartPaddingLeft + (plotWidth / steps) * index;
      return { x };
    });
  }

  private formatAxisValue(value: number, mode: 'price' | 'sentiment') {
    if (mode === 'sentiment') return value.toFixed(2);
    const abs = Math.abs(value);
    if (abs >= 1000) return value.toFixed(0);
    if (abs >= 100) return value.toFixed(1);
    return value.toFixed(2);
  }

  private formatDateLabel(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  private getChartData(kind: 'price' | 'sentiment') {
    return kind === 'price'
      ? (this.sentimentData?.price_history ?? [])
      : (this.sentimentData?.sentiment_history ?? []);
  }

  private getVisibleData<T>(kind: 'price' | 'sentiment', data: T[]) {
    const zoom = this.chartZoom[kind];
    if (!zoom) return data;
    const start = Math.max(0, Math.min(zoom.start, data.length - 1));
    const end = Math.max(start, Math.min(zoom.end, data.length - 1));
    return data.slice(start, end + 1);
  }

  private applyDefaultZoom(kind: 'price' | 'sentiment') {
    const data = this.getChartData(kind);
    if (!data.length) return;
    this.chartZoom[kind] = this.buildDefaultZoomWindow(data.length);
  }

  private buildDefaultZoomWindow(length: number) {
    const windowSize = Math.max(5, Math.floor(length * 0.35));
    const half = Math.floor(windowSize / 2);
    const center = Math.floor(length / 2);
    let start = Math.max(0, center - half);
    let end = Math.min(length - 1, start + windowSize - 1);
    start = Math.max(0, end - windowSize + 1);
    return { start, end };
  }

  private buildChartPoints(
    kind: 'price' | 'sentiment',
    data: Array<PriceHistoryPoint | SentimentHistoryPoint>
  ) {
    const selector = (point: any) => (kind === 'price' ? point.close : point.score);
    const zoom = this.chartZoom[kind];
    const start = zoom ? Math.max(0, Math.min(zoom.start, data.length - 1)) : 0;
    const end = zoom ? Math.max(start, Math.min(zoom.end, data.length - 1)) : data.length - 1;
    const visible = data.slice(start, end + 1) as Array<{ date: string }>;
    if (!visible.length) return [] as Array<{ x: number; y: number; value: number; rawIndex: number; date: string }>;

    const values = visible
      .map((point) => Number(selector(point)))
      .filter((value) => Number.isFinite(value));
    if (!values.length) return [] as Array<{ x: number; y: number; value: number; rawIndex: number; date: string }>;

    const min = kind === 'sentiment' ? -1 : Math.min(...values);
    const max = kind === 'sentiment' ? 1 : Math.max(...values);
    const range = max - min || 1;
    const plotWidth =
      this.chartWidth - this.chartPaddingLeft - this.chartPaddingRight;
    const plotHeight =
      this.chartHeight - this.chartPaddingTop - this.chartPaddingBottom;
    const step = plotWidth / Math.max(visible.length - 1, 1);

    return visible.map((point: any, index) => {
      const value = Number(selector(point));
      const x = this.chartPaddingLeft + index * step;
      const y =
        this.chartPaddingTop +
        (1 - (value - min) / range) * plotHeight;
      return {
        x,
        y,
        value,
        rawIndex: start + index,
        date: point.date,
      };
    });
  }
}
