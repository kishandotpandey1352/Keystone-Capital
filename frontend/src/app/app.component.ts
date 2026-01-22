import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { ApiService, Watchlist } from './api.service';
import { WsService } from './ws.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.css'],
})
export class AppComponent implements OnInit {
  apiStatus = 'unknown';
  wsStatus = 'disconnected';
  lastMsg: any = null;
  inputText = 'hello';

  watchlists: Watchlist[] = [];
  newWatchlistName = '';
  isLoading = false;
  errorMsg = '';

  sidebarOpen = false;

  private platformId = inject(PLATFORM_ID);

  constructor(private api: ApiService, private ws: WsService) {}

  ngOnInit(): void {
    this.api.health().subscribe({
      next: () => (this.apiStatus = 'ok'),
      error: () => (this.apiStatus = 'fail'),
    });

    this.loadWatchlists();

    if (isPlatformBrowser(this.platformId)) {
      this.ws.connect(
        (msg) => (this.lastMsg = msg),
        (s) => (this.wsStatus = s)
      );
    }
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar() {
    this.sidebarOpen = false;
  }

  send() {
    this.ws.send(this.inputText);
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
  }
