import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api.service';
import { RealtimePayload, RealtimeService } from './realtime.service';

export type JoinedChannel = {
  id: number;
  name: string;
  icon_codepoint: number | null;
  icon_color: string | null;
  is_active: boolean;
  is_default: boolean | null;
  created_at?: string | null;
  channel_type?: string | null;
  official_parent_id?: number | null;
  direct_user_uuid?: string | null;
  assigned_agent_uuid?: string | null;
  official_parent?: {
    name?: string | null;
    icon_codepoint?: number | null;
    icon_color?: string | null;
  } | null;
  last_message_content?: string | null;
  last_message_at?: string | null;
  unread_count?: number;
};

@Injectable({ providedIn: 'root' })
export class JoinedChannelsService {
  channels = signal<JoinedChannel[]>([]);
  loading = signal(false);

  constructor(private readonly api: ApiService, realtime: RealtimeService) {
    realtime.subscribe((payload) => this.onRealtime(payload, realtime.activeChannelId(), realtime.userId()));
  }

  async refresh() {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.api.getPrivate<{ data: JoinedChannel[] }>('/channel', { withCredentials: true })
      );
      const list = (res.data || []).slice();
      list.sort((a, b) => this.compareChannels(a, b));
      this.channels.set(list);
    } finally {
      this.loading.set(false);
    }
  }

  getById(id: number) {
    return (this.channels() || []).find((c) => c.id === id) || null;
  }

  private onRealtime(payload: RealtimePayload, activeChannelId: number | null, currentUserId: string | null) {
    if (payload.event !== 'message:new') return;
    const data: any = payload.data || {};
    const channelId = Number(data.channel_id);
    if (Number.isNaN(channelId)) return;
    if (currentUserId && data.sender_uuid === currentUserId) return;

    this.channels.update((prev) => {
      const next = prev.slice();
      const idx = next.findIndex((c) => c.id === channelId);
      if (idx < 0) return prev;

      const current = next[idx];
      const isActive = activeChannelId === channelId;
      const unread = typeof current.unread_count === 'number' ? current.unread_count : 0;
      next[idx] = {
        ...current,
        last_message_content: typeof data.content === 'string' ? data.content : current.last_message_content ?? null,
        last_message_at: data.created_at || current.last_message_at || null,
        unread_count: isActive ? 0 : unread + 1,
      };
      next.sort((a, b) => this.compareChannels(a, b));
      return next;
    });
  }

  private compareChannels(a: JoinedChannel, b: JoinedChannel) {
    const ad = a.is_default ? 1 : 0;
    const bd = b.is_default ? 1 : 0;
    if (ad !== bd) return bd - ad;

    const aUnread = typeof a.unread_count === 'number' ? a.unread_count : 0;
    const bUnread = typeof b.unread_count === 'number' ? b.unread_count : 0;
    if (aUnread !== bUnread) return bUnread - aUnread;

    const aTime = this.toMillis(a.last_message_at || a.created_at || null);
    const bTime = this.toMillis(b.last_message_at || b.created_at || null);
    if (aTime !== bTime) return bTime - aTime;

    return (a.name || '').localeCompare(b.name || '', 'th');
  }

  private toMillis(iso: string | null) {
    if (!iso) return 0;
    const t = Date.parse(iso);
    return Number.isFinite(t) ? t : 0;
  }
}
