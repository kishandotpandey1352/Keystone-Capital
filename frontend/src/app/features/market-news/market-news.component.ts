import { Component, OnDestroy, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatTabsModule } from '@angular/material/tabs';

import { ApiService, NewsCategoryBlock } from '../../core/services/api.service';

@Component({
  selector: 'app-market-news',
  standalone: true,
  imports: [CommonModule, MatTabsModule],
  templateUrl: './market-news.component.html',
  styleUrls: ['./market-news.component.css'],
})
export class MarketNewsComponent implements OnInit, OnDestroy {
  newsBlocks: NewsCategoryBlock[] = [];
  newsLoading = false;
  newsError = '';
  selectedNewsCategory = 'all';
  lastNewsRefresh: Date | null = null;
  selectedNewsUrl: SafeResourceUrl | null = null;
  selectedNewsTitle = '';

  descriptionHidden = false;

  private newsRefreshTimer?: number;
  private readonly newsRefreshIntervalMs = 5 * 60 * 1000;

  constructor(
    private api: ApiService,
    private sanitizer: DomSanitizer,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadNews();
    this.newsRefreshTimer = window.setInterval(() => {
      this.loadNews();
    }, this.newsRefreshIntervalMs);
  }

  ngOnDestroy(): void {
    if (this.newsRefreshTimer) {
      clearInterval(this.newsRefreshTimer);
    }
  }

  loadNews() {
    if (this.newsLoading) return;
    this.newsLoading = true;
    this.newsError = '';
    this.api.getHomeNews(8, 4).subscribe({
      next: (data) => {
        setTimeout(() => {
          this.zone.run(() => {
            this.newsBlocks = data?.categories ?? [];
            this.lastNewsRefresh = new Date();
            if (!this.newsBlocks.length) {
              this.selectedNewsCategory = 'all';
            } else if (
              this.selectedNewsCategory !== 'all' &&
              !this.newsBlocks.some((b) => b.category === this.selectedNewsCategory)
            ) {
              this.selectedNewsCategory = 'all';
            }
            this.cdr.detectChanges();
          });
        }, 0);
      },
      error: () => {
        setTimeout(() => {
          this.zone.run(() => {
            this.newsError = 'Failed to load market news.';
            this.cdr.detectChanges();
          });
        }, 0);
      },
      complete: () => {
        setTimeout(() => {
          this.zone.run(() => {
            this.newsLoading = false;
            this.cdr.detectChanges();
          });
        }, 0);
      },
    });
  }

  onNewsTabChange(index: number) {
    const categories = this.newsTabCategories;
    this.selectedNewsCategory = categories[index] ?? 'all';
  }

  get newsTabCategories() {
    return ['all', ...this.newsBlocks.map((b) => b.category)];
  }

  get filteredNewsBlocks() {
    if (this.selectedNewsCategory === 'all') {
      return this.newsBlocks;
    }
    return this.newsBlocks.filter((b) => b.category === this.selectedNewsCategory);
  }

  openNewsArticle(article: { url: string; headline: string }) {
    this.selectedNewsTitle = article.headline;
    this.selectedNewsUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      article.url
    );
  }

  closeNewsArticle() {
    this.selectedNewsUrl = null;
    this.selectedNewsTitle = '';
  }

  hideDescription() {
    this.descriptionHidden = true;
  }

  showDescription() {
    this.descriptionHidden = false;
  }
}
