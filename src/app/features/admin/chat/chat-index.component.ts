import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { JoinedChannelsService } from '../../../core/services/joined-channels.service';
import { ApiService } from '../../../core/services/api.service';
import { TokenService } from '../../../core/services/token.service';
import { SwalService } from '../../../shared/swal/swal.service';

@Component({
  selector: 'app-chat-index',
  standalone: true,
  imports: [CommonModule, RouterLink],
  host: {
    '(document:click)': 'closeContextMenu()',
    '(document:keydown.escape)': 'closeContextMenu()',
  },
  template: `
    <div class="h-full w-full flex flex-col bg-slate-50 rounded-3xl overflow-hidden">
      <div class="px-6 py-5 border-b border-slate-200">
        <p class="text-lg font-semibold text-slate-900">รายการห้องแชท</p>
        <p class="text-xs text-slate-500">เลือกห้องเพื่อดูข้อความล่าสุดจากฝ่ายต่างๆ</p>
      </div>

      <div class="flex-1 overflow-y-auto px-4 py-5 custom-scrollbar">
        <div *ngIf="channelsService.loading()" class="h-full flex items-center justify-center">
          <div class="text-slate-500 font-medium">กำลังโหลดห้องแชท...</div>
        </div>

        <div *ngIf="!channelsService.loading() && generalChannels().length === 0"
          class="h-full flex flex-col items-center justify-center text-center gap-2 text-slate-500">
          <div class="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
            <span class="text-3xl">🗂️</span>
          </div>
          <p class="font-semibold">ยังไม่มีห้องแชทในระบบ</p>
          <p class="text-xs text-slate-400">สร้างห้องใหม่หรือมอบหมายบทบาทเพื่อเริ่มต้น</p>
        </div>

        <ng-container *ngIf="!channelsService.loading() && generalChannels().length > 0">
          <section *ngIf="defaultChannels().length > 0" class="mb-6">
            <div class="mb-3 text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Default Rooms</div>
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <a *ngFor="let c of defaultChannels()"
                [routerLink]="['/admin/chat', c.id]"
                (contextmenu)="openContextMenu($event, c)"
                class="group block rounded-2xl border border-transparent bg-white p-3 shadow-sm transition hover:border-slate-200 hover:shadow-md"
                [class.opacity-60]="!c.is_active">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-lg text-white material-icon-glyph"
                    [style.background]="normalizeColor(c.icon_color) || '#1e293b'">
                    {{ iconGlyph(c.icon_codepoint) || (c.name[0] || '?') }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-slate-900 truncate">{{ c.name }}</p>
                    <p class="text-[11px] text-slate-400">{{ c.is_active ? 'เผยแพร่ให้ทุกคน' : 'ปิดใช้งาน' }}</p>
                  </div>
                </div>
                <p class="mt-3 text-[13px] text-slate-600 min-h-[40px] truncate">
                  {{ c.last_message_content || 'ยังไม่มีข้อความภายในห้องนี้' }}
                </p>
                <div class="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{{ c.is_active ? 'Online' : 'Off' }}</span>
                  <span>{{ c.last_message_at ? (c.last_message_at | date:'HH:mm dd/MM/yyyy') : 'ยังไม่มีเวลา' }}</span>
                </div>
              </a>
            </div>
          </section>

          <section *ngIf="roleChannels().length > 0">
            <div class="mb-3 text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Role-based Rooms</div>
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <a *ngFor="let c of roleChannels()"
                [routerLink]="['/admin/chat', c.id]"
                (contextmenu)="openContextMenu($event, c)"
                class="group block rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                [class.opacity-60]="!c.is_active">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-lg text-white material-icon-glyph"
                    [style.background]="normalizeColor(c.icon_color) || '#334155'">
                    {{ iconGlyph(c.icon_codepoint) || (c.name[0] || '?') }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-slate-900 truncate">{{ c.name }}</p>
                    <p class="text-[11px] text-slate-400">{{ c.is_active ? 'จำกัดบทบาทเฉพาะ' : 'ปิดใช้งาน' }}</p>
                  </div>
                </div>
                <p class="mt-3 text-[13px] text-slate-600 min-h-[40px] truncate">
                  {{ c.last_message_content || 'ยังไม่มีข้อความภายในห้องนี้' }}
                </p>
                <div class="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{{ c.is_active ? 'Online' : 'Off' }}</span>
                  <span>{{ c.last_message_at ? (c.last_message_at | date:'HH:mm dd/MM/yyyy') : 'ยังไม่มีเวลา' }}</span>
                </div>
              </a>
            </div>
          </section>
        </ng-container>
      </div>
    </div>

    @if (contextMenu()) {
      <div
        class="fixed z-[3200] min-w-[180px] rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl"
        [style.left.px]="contextMenu()!.x"
        [style.top.px]="contextMenu()!.y"
        (click)="$event.stopPropagation()"
        (contextmenu)="$event.preventDefault()">
        <button
          type="button"
          class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          (click)="deleteChannelFromMenu()">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 6h18M8 6V4h8v2m-7 4v6m4-6v6M5 6l1 14h12l1-14" />
          </svg>
          ลบแชท
        </button>
      </div>
    }
  `,
})
export class ChatIndexComponent implements OnInit {
  contextMenu = signal<{ x: number; y: number; channelId: number; channelName: string } | null>(null);

  constructor(
    public readonly channelsService: JoinedChannelsService,
    private readonly api: ApiService,
    private readonly tokenService: TokenService,
    private readonly swal: SwalService
  ) {}

  async ngOnInit() {
    if (this.channelsService.channels().length === 0) {
      await this.channelsService.refresh().catch(() => null);
    }
  }

  openContextMenu(event: MouseEvent, channel: { id: number; name: string }) {
    if (!this.tokenService.isAdmin()) return;
    event.preventDefault();
    event.stopPropagation();

    const menuWidth = 180;
    const menuHeight = 56;
    const padding = 12;
    const maxX = window.innerWidth - menuWidth - padding;
    const maxY = window.innerHeight - menuHeight - padding;

    this.contextMenu.set({
      x: Math.min(event.clientX, Math.max(padding, maxX)),
      y: Math.min(event.clientY, Math.max(padding, maxY)),
      channelId: channel.id,
      channelName: channel.name,
    });
  }

  closeContextMenu() {
    this.contextMenu.set(null);
  }

  async deleteChannelFromMenu() {
    const menu = this.contextMenu();
    if (!menu) return;

    this.closeContextMenu();
    const confirmed = await this.swal.fire({
      title: 'ลบแชท',
      text: `ต้องการลบห้อง "${menu.channelName}" ใช่หรือไม่`,
      type: 'warning',
      confirmText: 'ลบ',
      cancelText: 'ยกเลิก',
      showCancel: true,
    });
    if (!confirmed) return;

    try {
      await firstValueFrom(this.api.deletePrivate(`/channel/${menu.channelId}`));
      await this.channelsService.refresh();
      await this.swal.success('สำเร็จ', 'ลบแชทแล้ว');
    } catch (err: any) {
      const message = err?.error?.message || 'ไม่สามารถลบแชทได้';
      await this.swal.error('ไม่สำเร็จ', message);
    }
  }

  generalChannels() {
    return (this.channelsService.channels() || []).filter((c) => !this.isOfficialDirect(c));
  }

  defaultChannels() {
    return this.generalChannels().filter((c) => c.is_default === true);
  }

  roleChannels() {
    return this.generalChannels().filter((c) => c.is_default !== true);
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

  iconGlyph(codepoint: number | null) {
    if (!codepoint || Number.isNaN(codepoint)) return '';
    if (codepoint <= 0 || codepoint >= 0x110000) return '';
    try {
      return String.fromCodePoint(codepoint);
    } catch {
      return '';
    }
  }

  private isOfficialDirect(channel: { channel_type?: string | null; official_parent_id?: number | null }) {
    const type = (channel.channel_type || '').toLowerCase();
    const parentId = typeof channel.official_parent_id === 'number' ? channel.official_parent_id : null;
    return type === 'direct' && !!parentId;
  }
}
