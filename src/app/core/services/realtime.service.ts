import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { API_BASE_URL } from '../config/api.config';
import { TokenService } from './token.service';

export type RealtimePayload =
  | { event: 'connected'; data: any }
  | { event: 'heartbeat'; data: any }
  | { event: 'message:new'; data: any }
  | { event: 'message:read'; data: any }
  | { event: 'error'; data: any };

const SERVER_HEARTBEAT_INTERVAL_MS = 30_000;
const CONNECTION_STALE_AFTER_MS = SERVER_HEARTBEAT_INTERVAL_MS * 2 + 15_000;
const HEALTH_CHECK_INTERVAL_MS = 15_000;

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  connected = signal(false);
  activeChannelId = signal<number | null>(null);
  userId = signal<string | null>(null);

  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private shouldReconnect = false;
  private connectInFlight: Promise<void> | null = null;
  private browserEventsBound = false;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private lastActivityAt = 0;
  private readonly listeners = new Set<(payload: RealtimePayload) => void>();

  constructor(
    private readonly tokenService: TokenService,
    private readonly api: ApiService,
  ) {
    this.bindBrowserEvents();
  }

  connect() {
    this.shouldReconnect = true;
    if (this.connectInFlight) return this.connectInFlight;

    this.connectInFlight = this.openSocket().finally(() => {
      this.connectInFlight = null;
    });

    return this.connectInFlight;
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHealthMonitor();
    this.reconnectAttempt = 0;
    this.connected.set(false);
    this.userId.set(null);
    this.lastActivityAt = 0;
    if (this.socket) {
      try {
        this.socket.close(1000, 'manual disconnect');
      } catch {
        // ignore
      }
      this.socket = null;
    }
  }

  subscribe(fn: (payload: RealtimePayload) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private scheduleReconnect() {
    if (!this.shouldReconnect || this.reconnectTimer) return;
    const delay = Math.min(15000, 500 * Math.pow(2, this.reconnectAttempt));
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, delay);
  }

  private async openSocket() {
    if (!this.shouldReconnect) return;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const token = await this.getValidAccessToken();
    if (!token || !this.shouldReconnect) {
      this.connected.set(false);
      if (!token) {
        this.userId.set(null);
      }
      return;
    }

    this.userId.set(this.parseUserId(token));
    const socket = new WebSocket(this.buildWsUrl(token));
    this.socket = socket;

    socket.addEventListener('open', () => {
      if (this.socket !== socket) return;
      this.lastActivityAt = Date.now();
      this.startHealthMonitor();
      this.connected.set(true);
      this.reconnectAttempt = 0;
    });

    socket.addEventListener('close', () => {
      if (this.socket !== socket) return;
      this.stopHealthMonitor();
      this.connected.set(false);
      this.lastActivityAt = 0;
      this.socket = null;
      if (!this.shouldReconnect) return;
      this.scheduleReconnect();
    });

    socket.addEventListener('error', () => {
      if (this.socket !== socket) return;
      this.connected.set(false);
    });

    socket.addEventListener('message', (ev) => {
      if (this.socket !== socket) return;
      try {
        const payload = JSON.parse(String(ev.data)) as RealtimePayload;
        this.markActivity();
        this.listeners.forEach((fn) => fn(payload));
      } catch {
        // ignore
      }
    });
  }

  private buildWsUrl(token: string) {
    // API_BASE_URL: http://host:3300/api/v1 -> ws://host:3300/ws
    const wsBase = API_BASE_URL.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:').replace(/\/api\/v1\/?$/, '');
    const params = new URLSearchParams({ token });
    return `${wsBase}/ws?${params.toString()}`;
  }

  private parseUserId(token: string): string | null {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const json = decodeURIComponent(
        atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
          .split('')
          .map((c) => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
          .join('')
      );
      const payload = JSON.parse(json);
      return typeof payload?.sub === 'string' ? payload.sub : null;
    } catch {
      return null;
    }
  }

  private async getValidAccessToken(): Promise<string | null> {
    const accessToken = this.tokenService.getAccessToken();
    if (accessToken && !this.isTokenExpired(accessToken)) {
      return accessToken;
    }

    const refreshToken = this.tokenService.getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    try {
      const res = await firstValueFrom(this.api.refreshToken());
      const pair = ApiService.extractTokenPair(res);
      this.tokenService.setTokens(pair);
      return pair.accessToken;
    } catch {
      this.tokenService.clearTokens();
      return null;
    }
  }

  private isTokenExpired(token: string, skewSeconds = 30): boolean {
    try {
      const parts = token.split('.');
      if (parts.length < 2) return true;
      const json = decodeURIComponent(
        atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
          .split('')
          .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
          .join('')
      );
      const payload = JSON.parse(json) as { exp?: number };
      if (typeof payload.exp !== 'number') return true;
      return Date.now() >= (payload.exp - skewSeconds) * 1000;
    } catch {
      return true;
    }
  }

  private bindBrowserEvents() {
    if (this.browserEventsBound || typeof window === 'undefined') return;
    this.browserEventsBound = true;

    window.addEventListener('online', () => {
      this.handleForegroundResume();
    });

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.handleForegroundResume();
        }
      });
    }
  }

  private markActivity() {
    this.lastActivityAt = Date.now();
    this.connected.set(true);
  }

  private startHealthMonitor() {
    if (this.healthCheckTimer) return;
    this.healthCheckTimer = setInterval(() => this.checkConnectionHealth(), HEALTH_CHECK_INTERVAL_MS);
  }

  private stopHealthMonitor() {
    if (!this.healthCheckTimer) return;
    clearInterval(this.healthCheckTimer);
    this.healthCheckTimer = null;
  }

  private checkConnectionHealth() {
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    if (!this.lastActivityAt) {
      this.connected.set(false);
      return;
    }

    const staleFor = Date.now() - this.lastActivityAt;
    if (staleFor < CONNECTION_STALE_AFTER_MS) {
      return;
    }

    this.forceReconnect(socket);
  }

  private handleForegroundResume() {
    if (!this.shouldReconnect) return;
    if (this.isConnectionStale()) {
      if (this.socket) {
        this.forceReconnect(this.socket);
        return;
      }
      this.connected.set(false);
    }
    if (!this.connected()) {
      void this.connect();
    }
  }

  private isConnectionStale() {
    if (!this.lastActivityAt) return true;
    return Date.now() - this.lastActivityAt >= CONNECTION_STALE_AFTER_MS;
  }

  private forceReconnect(socket: WebSocket) {
    if (this.socket !== socket) return;

    this.connected.set(false);
    this.lastActivityAt = 0;
    this.stopHealthMonitor();
    this.socket = null;

    try {
      socket.close();
    } catch {
      // ignore
    }

    this.scheduleReconnect();
  }
}
