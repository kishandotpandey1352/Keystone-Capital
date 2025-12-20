import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService } from './api.service';
import { WsService } from './ws.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  apiStatus = 'unknown';
  wsStatus = 'disconnected';
  lastMsg: any = null;
  inputText = 'hello';

  constructor(private api: ApiService, private ws: WsService) {}

  ngOnInit(): void {
    this.api.health().subscribe({
      next: () => (this.apiStatus = 'ok'),
      error: () => (this.apiStatus = 'fail'),
    });

    this.ws.connect(
      (msg) => (this.lastMsg = msg),
      (s) => (this.wsStatus = s)
    );
  }

  send() {
    this.ws.send(this.inputText);
  }
}
