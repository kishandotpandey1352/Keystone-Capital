import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PLATFORM_ID } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { PortfolioComponent } from '../../features/portfolio/portfolio.component';

// Update the path below to the correct location of api.service.ts if different
// Update the path below to the correct location of api.service.ts if different
// Update the path below to the correct location of api.service.ts if different
import { ApiService, Watchlist, NewsCategoryBlock } from '../../core/services/api.service';
// If the above import fails, try correcting the path, for example:
// import { ApiService, Watchlist } from '../../../core/services/api.service';
// or
// import { ApiService, Watchlist } from 'src/app/core/services/api.service';
// Update the import path below if the actual location is different
import { WsService } from '../../core/services/ws.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTabsModule, PortfolioComponent],
  templateUrl: './app-shell.component.html',
  styleUrls: ['./app-shell.component.css'],
})
export class AppShellComponent implements OnInit, OnDestroy {
  apiStatus = 'unknown';
  wsStatus = 'disconnected';
  lastMsg: any = null;
  inputText = 'hello';

  watchlists: Watchlist[] = [];
  newWatchlistName = '';
  isLoading = false;
  errorMsg = '';

  newsBlocks: NewsCategoryBlock[] = [];
  newsLoading = false;
  newsError = '';
  selectedNewsCategory = 'all';
  lastNewsRefresh: Date | null = null;
  private newsRefreshTimer?: number;
  private readonly newsRefreshIntervalMs = 5 * 60 * 1000;
  selectedNewsUrl: SafeResourceUrl | null = null;
  selectedNewsTitle = '';

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

  sidebarOpen = false;
  profileOpen = false;
  currentMenu = 'our-picks';
  currentTab = 'Short-Term Bull';
  selectedMenuIndex = 0;

  private hiddenDescriptions: Record<string, boolean> = {};

  readonly menuItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'watchlists', label: 'Watchlists' },
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'alerts', label: 'Alerts' },
    { id: 'our-picks', label: 'Our Picks' },
    { id: 'screeners', label: 'Screeners' },
    { id: 'market-news', label: 'Market News' },
    { id: 'earnings-calendar', label: 'Earnings Calendar' },
    { id: 'education', label: 'Learn' },
    { id: 'upside-breakout', label: 'Upside Breakout' },
    { id: 'downside-breakout', label: 'Downside Breakout' },
    { id: 'profitability', label: 'Profitability' },
    { id: 'market-similarity', label: 'Market Similarity' },
    { id: 'growth', label: 'Growth' },
    { id: 'net-options', label: 'Net Options Sentiment' },
    { id: 'net-social', label: 'Net Social Sentiment' },
    { id: 'technical-flow', label: 'Technical Flow' },
    { id: 'dark-pool', label: 'Dark Pool Rating' },
    { id: 'short-pressure', label: 'Short Pressure Rating' },
  ];

  readonly bottomTabs = [
    { id: 'our-picks', label: 'Our Picks', icon: '⭐' },
    { id: 'upside-breakout', label: 'Upside', icon: '⬆' },
    { id: 'net-options', label: 'Options', icon: '⚙' },
    { id: 'dark-pool', label: 'Dark Pool', icon: '▵' },
    { id: 'short-pressure', label: 'Short', icon: '⚡' },
  ];

  readonly screens: Record<
    string,
    {
      title: string;
      subtitle: string;
      updatedAt: string;
      descriptionTitle: string;
      description: string;
      accent: string;
      tabs?: string[];
    }
  > = {
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Watchlists & live signals',
      updatedAt: 'January 22, 02:00 AM',
      descriptionTitle: 'Welcome',
      description: 'Manage watchlists and compute signals from here.',
      accent: '⭐',
    },
    watchlists: {
      title: 'Watchlists',
      subtitle: 'Track your custom baskets',
      updatedAt: 'January 22, 02:05 AM',
      descriptionTitle: 'Organize',
      description: 'Create and monitor groups of tickers that matter to you.',
      accent: '📌',
    },
    portfolio: {
      title: 'Portfolio',
      subtitle: 'Holdings & performance',
      updatedAt: 'January 22, 02:05 AM',
      descriptionTitle: 'Overview',
      description: 'Review holdings, exposure, and performance at a glance.',
      accent: '💼',
    },
    alerts: {
      title: 'Alerts',
      subtitle: 'Price, news, and signal alerts',
      updatedAt: 'January 22, 02:05 AM',
      descriptionTitle: 'Stay notified',
      description: 'Set alerts for price moves, volatility spikes, and news.',
      accent: '🔔',
    },
    'our-picks': {
      title: 'Our Picks',
      subtitle: 'Best ideas across timeframes',
      updatedAt: 'January 22, 01:52 AM',
      descriptionTitle: 'Long Term Bull',
      description:
        'High Upside & Profitability + Low Downside support price gain over the next year. Great to buy, hold, and watch.',
      accent: '⭐',
      tabs: ['Short-Term Bull', 'Long-Term Bull', 'Short-Term Bear', 'Long-Term Bear'],
    },
    'upside-breakout': {
      title: 'Upside Breakout',
      subtitle: 'Long-term breakout candidates',
      updatedAt: 'January 22, 01:52 AM',
      descriptionTitle: 'Upside Breakout',
      description:
        'Higher Upside Breakout scores indicate a larger chance of a sharp move upwards in price any time within the next year or two.',
      accent: '⬆',
      tabs: ['Bullish - Long', 'Bullish - Short', 'Bearish - Long', 'Bearish - Short'],
    },
    'downside-breakout': {
      title: 'Downside Breakout',
      subtitle: 'Bearish momentum watch',
      updatedAt: 'January 22, 01:52 AM',
      descriptionTitle: 'Downside Breakout',
      description:
        'Lower scores reduce breakdown risk. Use to screen for downside momentum candidates.',
      accent: '⬇',
      tabs: ['Bullish - Long', 'Bullish - Short', 'Bearish - Long', 'Bearish - Short'],
    },
    profitability: {
      title: 'Profitability',
      subtitle: 'Durable earnings potential',
      updatedAt: 'January 22, 01:54 AM',
      descriptionTitle: 'Profitability',
      description: 'How likely the company is to be profitable over the next few years.',
      accent: '$',
      tabs: ['Bullish - Long', 'Bullish - Short', 'Bearish - Long', 'Bearish - Short'],
    },
    'market-similarity': {
      title: 'Market Similarity',
      subtitle: 'Peer-based signal alignment',
      updatedAt: 'January 22, 01:54 AM',
      descriptionTitle: 'Market Similarity',
      description: 'Measures similarity to top-performing peers and momentum clusters.',
      accent: '⛰',
      tabs: ['Bullish - Long', 'Bullish - Short', 'Bearish - Long', 'Bearish - Short'],
    },
    growth: {
      title: 'Growth',
      subtitle: 'Expansion potential',
      updatedAt: 'January 22, 01:54 AM',
      descriptionTitle: 'Growth',
      description: 'Projected growth across revenue, margins, and demand.',
      accent: '📈',
      tabs: ['Bullish - Long', 'Bullish - Short', 'Bearish - Long', 'Bearish - Short'],
    },
    'net-options': {
      title: 'Net Options Sentiment',
      subtitle: 'Options flow signals',
      updatedAt: 'January 22, 01:54 AM',
      descriptionTitle: 'Net Options Sentiment',
      description:
        'Quantity of Call and Put Options as well as the difference in options prices.',
      accent: '⚙',
      tabs: ['Bullish - Long', 'Bullish - Short', 'Bearish - Long', 'Bearish - Short'],
    },
    'net-social': {
      title: 'Net Social Sentiment',
      subtitle: 'Crowd-driven signals',
      updatedAt: 'January 22, 01:54 AM',
      descriptionTitle: 'Net Social Sentiment',
      description: 'Measures social chatter strength and direction.',
      accent: '💬',
      tabs: ['Bullish - Long', 'Bullish - Short', 'Bearish - Long', 'Bearish - Short'],
    },
    'technical-flow': {
      title: 'Technical Flow',
      subtitle: 'Price and volume dynamics',
      updatedAt: 'January 22, 01:54 AM',
      descriptionTitle: 'Technical Flow',
      description: 'Signals derived from momentum, volume, and volatility.',
      accent: '📊',
      tabs: ['Bullish - Long', 'Bullish - Short', 'Bearish - Long', 'Bearish - Short'],
    },
    'dark-pool': {
      title: 'Dark Pool Rating',
      subtitle: 'Institutional positioning',
      updatedAt: 'January 22, 01:54 AM',
      descriptionTitle: 'Dark Pool Rating',
      description: 'Tracks off-exchange accumulation and large block activity.',
      accent: '▵',
      tabs: ['Bullish - Long', 'Bullish - Short', 'Bearish - Long', 'Bearish - Short'],
    },
    'short-pressure': {
      title: 'Short Pressure Rating',
      subtitle: 'Short squeeze potential',
      updatedAt: 'January 22, 01:54 AM',
      descriptionTitle: 'Short Pressure Rating',
      description: 'Indicates probability of short squeeze over the near term.',
      accent: '⚡',
      tabs: ['Bullish - Long', 'Bullish - Short', 'Bearish - Long', 'Bearish - Short'],
    },
    screeners: {
      title: 'Screeners',
      subtitle: 'Filter by fundamentals & signals',
      updatedAt: 'January 22, 02:05 AM',
      descriptionTitle: 'Find candidates',
      description: 'Build custom filters for value, growth, momentum, or flow.',
      accent: '🔎',
    },
    'market-news': {
      title: 'Market News',
      subtitle: 'Top stories & catalysts',
      updatedAt: 'January 22, 02:05 AM',
      descriptionTitle: 'What’s moving',
      description: 'Track headlines and catalysts across sectors and tickers.',
      accent: '📰',
    },
    'earnings-calendar': {
      title: 'Earnings Calendar',
      subtitle: 'Upcoming reports & guidance',
      updatedAt: 'January 22, 02:05 AM',
      descriptionTitle: 'Earnings season',
      description: 'Plan around earnings dates, guidance, and expected volatility.',
      accent: '📅',
    },
    education: {
      title: 'Learn',
      subtitle: 'Trading knowledge & guides',
      updatedAt: 'January 22, 02:05 AM',
      descriptionTitle: 'Grow your edge',
      description: 'Tutorials on options, risk, and strategy building.',
      accent: '🎓',
    },
  };

  readonly sampleStocks = [
    {
      symbol: 'CAT',
      name: 'Caterpillar Inc',
      price: '$647.48',
      longTerm: [
        { label: 'Upside', value: '91', trend: 'up' },
        { label: 'Downside', value: '10', trend: 'down' },
        { label: 'Profitability', value: '85', trend: 'up' },
      ],
      shortTerm: [
        { label: 'Net Options', value: '77', trend: 'up' },
        { label: 'Net Social', value: '49', trend: 'down' },
        { label: 'Technical', value: '98', trend: 'up' },
      ],
    },
    {
      symbol: 'BIDU',
      name: 'Baidu Inc',
      price: '$162.25',
      longTerm: [
        { label: 'Upside', value: '94', trend: 'up' },
        { label: 'Downside', value: '24', trend: 'down' },
        { label: 'Profitability', value: '78', trend: 'up' },
      ],
      shortTerm: [
        { label: 'Net Options', value: '98', trend: 'up' },
        { label: 'Net Social', value: '41', trend: 'down' },
        { label: 'Technical', value: '88', trend: 'up' },
      ],
    },
  ];

  readonly ourPicksTabContent: Record<
    string,
    {
      subtitle: string;
      descriptionTitle: string;
      description: string;
      stocks: (typeof AppShellComponent.prototype.sampleStocks);
    }
  > = {
    'Short-Term Bull': {
      subtitle: 'Short-Term Bull',
      descriptionTitle: 'Short-Term Bull',
      description:
        'Near-term momentum names with strong upside catalysts and improving flow signals.',
      stocks: this.sampleStocks,
    },
    'Long-Term Bull': {
      subtitle: 'Long-Term Bull',
      descriptionTitle: 'Long-Term Bull',
      description:
        'High Upside & Profitability + Low Downside support price gain over the next year. Great to buy, hold, and watch.',
      stocks: this.sampleStocks,
    },
    'Short-Term Bear': {
      subtitle: 'Short-Term Bear',
      descriptionTitle: 'Short-Term Bear',
      description:
        'Short-duration bearish setups with weaker sentiment and fading momentum.',
      stocks: this.sampleStocks,
    },
    'Long-Term Bear': {
      subtitle: 'Long-Term Bear',
      descriptionTitle: 'Long-Term Bear',
      description:
        'Longer-term risk flags driven by downside and deteriorating fundamentals.',
      stocks: this.sampleStocks,
    },
  };

  private platformId = inject(PLATFORM_ID);

  constructor(
    private api: ApiService,
    private ws: WsService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.api.health().subscribe({
      next: () => (this.apiStatus = 'ok'),
      error: () => (this.apiStatus = 'fail'),
    });

    this.loadWatchlists();

    this.loadNews();

    this.newsRefreshTimer = window.setInterval(() => {
      this.loadNews();
    }, this.newsRefreshIntervalMs);

    this.updateBottomTabSelection(this.currentMenu);

    if (isPlatformBrowser(this.platformId)) {
      this.ws.connect(
        (msg) => (this.lastMsg = msg),
        (s) => (this.wsStatus = s)
      );
    }
  }

  ngOnDestroy(): void {
    if (this.newsRefreshTimer) {
      clearInterval(this.newsRefreshTimer);
    }
  }

  send() {
    this.ws.send(this.inputText);
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleProfile() {
    this.profileOpen = !this.profileOpen;
  }

  closeSidebar() {
    this.sidebarOpen = false;
  }

  closeProfile() {
    this.profileOpen = false;
  }

  selectMenu(menuId: string) {
    this.currentMenu = menuId;
    const tabs = this.screens[menuId]?.tabs;
    this.currentTab = tabs?.length ? tabs[0] : 'Highest';
    this.updateBottomTabSelection(menuId);
    if (menuId === 'market-news') {
      this.loadNews();
    }
    this.closeSidebar();
    this.closeProfile();
  }

  onBottomTabChange(index: number) {
    const tab = this.bottomTabs[index];
    if (tab) {
      this.selectMenu(tab.id);
    }
  }

  private updateBottomTabSelection(menuId: string) {
    const idx = this.bottomTabs.findIndex((tab) => tab.id === menuId);
    if (idx >= 0) {
      this.selectedMenuIndex = idx;
    } else {
      this.selectedMenuIndex = -1;
    }
  }

  selectTab(tab: string) {
    this.currentTab = tab;
  }

  getSubtitle(menuId: string): string {
    if (menuId === 'our-picks') {
      return this.ourPicksTabContent[this.currentTab]?.subtitle ?? this.currentTab;
    }

    return this.screens[menuId]?.subtitle ?? '';
  }

  getDescriptionTitle(menuId: string): string {
    if (menuId === 'our-picks') {
      return (
        this.ourPicksTabContent[this.currentTab]?.descriptionTitle ??
        this.screens[menuId]?.descriptionTitle ??
        ''
      );
    }

    return this.screens[menuId]?.descriptionTitle ?? '';
  }

  getDescriptionText(menuId: string): string {
    if (menuId === 'our-picks') {
      return (
        this.ourPicksTabContent[this.currentTab]?.description ??
        this.screens[menuId]?.description ??
        ''
      );
    }

    return this.screens[menuId]?.description ?? '';
  }

  getStocks(menuId: string) {
    if (menuId === 'our-picks') {
      return this.ourPicksTabContent[this.currentTab]?.stocks ?? this.sampleStocks;
    }

    return this.sampleStocks;
  }

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

  isDescriptionHidden(menuId: string): boolean {
    return this.hiddenDescriptions[menuId] === true;
  }

  hideDescription(menuId: string) {
    this.hiddenDescriptions[menuId] = true;
  }

  showDescription(menuId: string) {
    this.hiddenDescriptions[menuId] = false;
  }

  loadWatchlists() {
    this.isLoading = true;
    this.errorMsg = '';
    this.api.getWatchlists().subscribe({
      next: (data) => (this.watchlists = data ?? []),
      error: () => (this.errorMsg = 'Failed to load watchlists.'),
      complete: () => (this.isLoading = false),
    });
  }

  createWatchlist() {
    const name = this.newWatchlistName.trim();
    if (!name) return;

    this.isLoading = true;
    this.errorMsg = '';
    this.api.createWatchlist(name).subscribe({
      next: (wl) => {
        this.watchlists = [wl, ...this.watchlists];
        this.newWatchlistName = '';
      },
      error: () => (this.errorMsg = 'Failed to create watchlist.'),
      complete: () => (this.isLoading = false),
    });
  }

  computeSignal(watchlistId: number) {
    this.api.computeSignal(watchlistId).subscribe({
      error: () => (this.errorMsg = 'Failed to enqueue compute task.'),
    });
  }

  deleteWatchlist(watchlistId: number) {
    this.api.deleteWatchlist(watchlistId).subscribe({
      next: () => {
        this.watchlists = this.watchlists.filter((w) => w.id !== watchlistId);
      },
      error: () => (this.errorMsg = 'Failed to delete watchlist.'),
    });
  }

  loadNews() {
    if (this.newsLoading) return;
    this.newsLoading = true;
    this.newsError = '';
    this.api.getHomeNews(8, 4).subscribe({
      next: (data) => {
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
      },
      error: () => (this.newsError = 'Failed to load market news.'),
      complete: () => (this.newsLoading = false),
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
    return this.newsBlocks.filter(
      (b) => b.category === this.selectedNewsCategory
    );
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
}
