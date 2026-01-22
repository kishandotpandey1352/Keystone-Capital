import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WsService {
  private ws?: WebSocket;

  connect(onMessage: (msg: any) => void, onStatus: (s: string) => void) {
    onStatus('connecting');
    this.ws = new WebSocket(environment.wsUrl);

    this.ws.onopen = () => onStatus('connected');
    this.ws.onclose = () => onStatus('disconnected');
    this.ws.onerror = () => onStatus('error');

    this.ws.onmessage = (evt) => {
      try { onMessage(JSON.parse(evt.data)); }
      catch { onMessage({ type: 'raw', payload: evt.data }); }
    };
  }

  send(text: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(text);
    }
  }
}
