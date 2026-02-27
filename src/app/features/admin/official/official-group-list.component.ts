import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { JoinedChannel, JoinedChannelsService } from '../../../core/services/joined-channels.service';

type OfficialGroupView = {
  id: number;
  name: string;
  icon_codepoint: number | null;
  icon_color: string | null;
  channels: JoinedChannel[];
  unread_total: number;
  latest_ms: number;
};

@Component({
  selector: 'app-official-group-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="h-full w-full flex flex-col bg-slate-50 rounded-3xl overflow-hidden">
      <div class="px-6 py-5 border-b border-slate-200 bg-white">
        <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <p class="text-lg font-semibold text-slate-900">ห้อง OA</p>
            <p class="text-xs text-slate-500">รวมแชลแนลแบบ OA (Direct) ตามกลุ่ม OA</p>
          </div>
          <div class="flex items-center gap-2">
            <input
              class="w-56 max-w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-4 focus:ring-slate-200 outline-none"
              [ngModel]="query()"
              (ngModelChange)="query.set($event)"
              placeholder="ค้นหา OA..." />
            <button
              type="button"
              class="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              [disabled]="channelsService.loading()"
              (click)="refresh()">
              {{ channelsService.loading() ? 'กำลังโหลด...' : 'รีเฟรช' }}
            </button>
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-4 py-5 custom-scrollbar">
        <div *ngIf="channelsService.loading()" class="h-full flex items-center justify-center">
          <div class="text-slate-500 font-medium">กำลังโหลดห้อง OA...</div>
        </div>

        <div *ngIf="!channelsService.loading() && filteredGroups().length === 0"
          class="h-full flex flex-col items-center justify-center text-center gap-2 text-slate-500">
          <div class="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
            <span class="text-3xl">💬</span>
          </div>
          <p class="font-semibold">ยังไม่มีห้อง OA</p>
          <p class="text-xs text-slate-400">เมื่อมีการ Subscribe OA ห้องจะขึ้นที่หน้านี้</p>
        </div>

        <ng-container *ngIf="!channelsService.loading() && filteredGroups().length > 0">
          <div class="space-y-4">
            <section *ngFor="let group of filteredGroups()" class="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div class="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                <div class="w-11 h-11 rounded-2xl flex items-center justify-center text-white material-icon-glyph"
                  [style.background]="normalizeColor(group.icon_color) || '#0f172a'">
                  {{ iconGlyph(group.icon_codepoint) || (group.name[0] || '?') }}
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-slate-900 truncate">{{ group.name }}</p>
                  <p class="text-[11px] text-slate-500">
                    {{ group.channels.length }} ห้อง
                    <span *ngIf="group.unread_total > 0"> • ไม่อ่าน {{ group.unread_total }}</span>
                  </p>
                </div>
              </div>

              <div class="divide-y divide-slate-100">
                <a *ngFor="let c of group.channels"
                  [routerLink]="['/admin/chat', c.id]"
                  class="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                  [class.opacity-50]="!c.is_active"
                  [class.pointer-events-none]="!c.is_active"
                  [title]="c.name">
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-slate-900 truncate">{{ roomName(c, group.name) }}</p>
                    <p class="text-[11px] text-slate-500 truncate">{{ c.last_message_content || 'ยังไม่มีข้อความ' }}</p>
                  </div>
                  <div class="flex items-center gap-2 flex-shrink-0">
                    <span class="text-[11px] text-slate-400">{{ timeLabel(c.last_message_at || c.created_at || null) }}</span>
                    <span *ngIf="(c.unread_count || 0) > 0"
                      class="min-w-5 h-5 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {{ (c.unread_count || 0) > 99 ? '99+' : (c.unread_count || 0) }}
                    </span>
                  </div>
                </a>
              </div>
            </section>
          </div>
        </ng-container>
      </div>
    </div>
  `,
})
export class OfficialGroupListComponent {
  query = signal('');

  groups = computed<OfficialGroupView[]>(() => {
    const channels = this.channelsService.channels() || [];
    const grouped = new Map<number, OfficialGroupView>();

    for (const channel of channels) {
      const type = (channel.channel_type || '').toLowerCase();
      const parentId = typeof channel.official_parent_id === 'number' ? channel.official_parent_id : null;
      const isOfficialDirect = type === 'direct' && !!parentId;
      const isOfficialMain = type === 'official';
      if (!isOfficialDirect && !isOfficialMain) continue;

      const groupId = isOfficialMain ? channel.id : (parentId as number);
      const parent = channel.official_parent || null;
      const groupName =
        (isOfficialMain ? channel.name : parent?.name) ||
        this.fallbackGroupName(channel.name || '', groupId);
      const groupIconCodepoint =
        (isOfficialMain ? channel.icon_codepoint : parent?.icon_codepoint) ??
        channel.icon_codepoint ??
        null;
      const groupIconColor =
        (isOfficialMain ? channel.icon_color : parent?.icon_color) ??
        channel.icon_color ??
        null;

      if (!grouped.has(groupId)) {
        grouped.set(groupId, {
          id: groupId,
          name: groupName,
          icon_codepoint: groupIconCodepoint,
          icon_color: groupIconColor,
          channels: [],
          unread_total: 0,
          latest_ms: 0,
        });
      }

      const group = grouped.get(groupId)!;
      if (!group.channels.some((c) => c.id === channel.id)) {
        group.channels.push(channel);
      }
      group.unread_total += typeof channel.unread_count === 'number' ? channel.unread_count : 0;

      const ms = this.toMillis(channel.last_message_at || channel.created_at || null);
      if (ms > group.latest_ms) group.latest_ms = ms;
    }

    const result = Array.from(grouped.values());
    for (const g of result) {
      g.channels.sort((a, b) => {
        const aUnread = typeof a.unread_count === 'number' ? a.unread_count : 0;
        const bUnread = typeof b.unread_count === 'number' ? b.unread_count : 0;
        if (aUnread !== bUnread) return bUnread - aUnread;
        const aMs = this.toMillis(a.last_message_at || a.created_at || null);
        const bMs = this.toMillis(b.last_message_at || b.created_at || null);
        if (aMs !== bMs) return bMs - aMs;
        return (a.name || '').localeCompare(b.name || '', 'th');
      });
    }

    result.sort((a, b) => {
      if (a.unread_total !== b.unread_total) return b.unread_total - a.unread_total;
      if (a.latest_ms !== b.latest_ms) return b.latest_ms - a.latest_ms;
      return a.name.localeCompare(b.name, 'th');
    });

    return result;
  });

  filteredGroups = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.groups();
    return this.groups().filter((g) => g.name.toLowerCase().includes(q));
  });

  constructor(public readonly channelsService: JoinedChannelsService) {}

  async ngOnInit() {
    if (this.channelsService.channels().length === 0) {
      await this.channelsService.refresh().catch(() => null);
    }
  }

  async refresh() {
    await this.channelsService.refresh().catch(() => null);
  }

  roomName(channel: JoinedChannel, groupName: string) {
    const raw = String(channel.name || '').trim();
    if (!raw) return `ห้อง #${channel.id}`;
    const prefix = `${groupName} - `;
    if (raw.startsWith(prefix)) return raw.slice(prefix.length).trim() || raw;
    if (raw.includes(' - ')) {
      const parts = raw.split(' - ').map((p) => p.trim()).filter(Boolean);
      if (parts.length > 1) return parts.slice(1).join(' - ');
    }
    return raw;
  }

  timeLabel(iso: string | null) {
    if (!iso) return '-';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  normalizeColor(value: string | null | undefined) {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const hex = raw.startsWith('#') ? raw.slice(1) : raw;
    if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(hex)) return null;
    if (hex.length === 8) {
      const alpha = hex.slice(0, 2);
      const rgb = hex.slice(2);
      return `#${rgb}${alpha}`;
    }
    return `#${hex}`;
  }

  iconGlyph(codepoint: number | null | undefined) {
    if (!codepoint || Number.isNaN(codepoint)) return '';
    if (codepoint <= 0 || codepoint >= 0x110000) return '';
    try {
      return String.fromCodePoint(codepoint);
    } catch {
      return '';
    }
  }

  private toMillis(iso: string | null) {
    if (!iso) return 0;
    const t = Date.parse(iso);
    return Number.isFinite(t) ? t : 0;
  }

  private fallbackGroupName(rawName: string, id: number) {
    const parts = rawName.split(' - ').map((v) => v.trim()).filter(Boolean);
    if (parts.length > 1) return parts[0];
    return `OA #${id}`;
  }
}
