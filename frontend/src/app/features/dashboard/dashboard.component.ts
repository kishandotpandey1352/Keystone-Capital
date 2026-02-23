import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService, Watchlist } from '../../core/services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  @Input() lastMsg: any = null;
  @Output() sendWs = new EventEmitter<string>();

  watchlists: Watchlist[] = [];
  newWatchlistName = '';
  isLoading = false;
  errorMsg = '';

  inputText = 'hello';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadWatchlists();
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

  send() {
    const text = this.inputText.trim();
    if (!text) return;
    this.sendWs.emit(text);
  }
}
