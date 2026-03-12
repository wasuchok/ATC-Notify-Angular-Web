import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, signal } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import { ApiService } from '../../../core/services/api.service';
import { JoinedChannelsService } from '../../../core/services/joined-channels.service';
import { LoadingService } from '../../../core/services/loading.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { TokenService } from '../../../core/services/token.service';
import { AvatarCropperModalComponent } from '../../../shared/avatar/avatar-cropper-modal.component';
import { SwalService } from '../../../shared/swal/swal.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, AvatarCropperModalComponent],
  template: `
    @if (loading()) {
      <div class="fixed inset-0 z-[1000] bg-black/20 backdrop-blur-sm flex items-center justify-center">
        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-xl flex flex-col items-center justify-center min-w-[200px]">
          <div class="spinner mb-4"></div>
          <p class="text-slate-700 text-sm font-medium">กรุณารอสักครู่...</p>
        </div>
      </div>
    }

    <div class="flex h-screen bg-slate-50 overflow-hidden font-sarabun">
      <!-- Discord-like left bar -->
      <aside class="w-[76px] bg-slate-900 border-r border-slate-800 text-slate-200 flex flex-col">
        <div class="px-2 pt-3">
          <a routerLink="/admin/chat"
            class="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-slate-700 transition-colors mx-auto">
            <img src="/assets/logo.png" alt="Logo" class="w-8 h-8 object-contain" />
          </a>
        </div>

        <div class="mt-3 px-2 space-y-2">
          <a routerLink="/admin/chat"
            routerLinkActive="bg-slate-800 border-slate-700"
            [routerLinkActiveOptions]="{ exact: false }"
            class="w-full h-11 rounded-2xl bg-slate-900 border border-transparent hover:bg-slate-800 hover:border-slate-700 transition-colors flex items-center justify-center"
            title="แชท">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M8 10h8M8 14h5m-8 4h10l5 3V6a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </a>
          <a routerLink="/admin/oa"
            routerLinkActive="bg-slate-800 border-slate-700"
            class="w-full h-11 rounded-2xl bg-slate-900 border border-transparent hover:bg-slate-800 hover:border-slate-700 transition-colors flex items-center justify-center"
            title="OA">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </a>
        </div>

        <div class="mt-3 flex-1 overflow-y-auto custom-scrollbar px-2 space-y-2">


          <a *ngFor="let c of generalChannels()"
            [routerLink]="['/admin/chat', c.id]"
            routerLinkActive="ring-2 ring-white/10 bg-slate-800"
            class="group w-full h-11 rounded-2xl border border-transparent hover:border-slate-700 hover:bg-slate-800 transition-all flex items-center justify-center relative"
            [class.opacity-50]="!c.is_active"
            [class.pointer-events-none]="!c.is_active"
            (mouseenter)="showChannelTooltip(c.name, $event)"
            (mouseleave)="hideChannelTooltip()"
            (focus)="showChannelTooltip(c.name, $event)"
            (blur)="hideChannelTooltip()">

            <div class="w-10 h-10 rounded-2xl flex items-center justify-center ring-1 ring-black/10"
              [style.background]="normalizeColor(c.icon_color) || '#334155'">
              <span class="material-icon-glyph text-white/95 text-lg leading-none">
                {{ iconGlyph(c.icon_codepoint) || (c.name[0] || '?') }}
              </span>
            </div>

            @if ((c.unread_count || 0) > 0) {
              <span class="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-slate-900">
                {{ (c.unread_count || 0) > 99 ? '99+' : (c.unread_count || 0) }}
              </span>
            }
          </a>
        </div>

        <div class="p-2 border-t border-slate-800 space-y-2">
          @if (isAdmin()) {
            <a routerLink="/admin/settings" routerLinkActive="bg-slate-800 border-slate-700"
              class="w-full h-11 rounded-2xl bg-slate-900 border border-transparent hover:bg-slate-800 hover:border-slate-700 transition-colors flex items-center justify-center"
              title="ตั้งค่า">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M11.983 2.25c.426 0 .84.048 1.238.139l.385 2.311a7.5 7.5 0 011.624.94l2.18-.94a.75.75 0 01.92.33l1.5 2.598a.75.75 0 01-.184.96l-1.795 1.372a7.55 7.55 0 010 1.88l1.795 1.372a.75.75 0 01.184.96l-1.5 2.598a.75.75 0 01-.92.33l-2.18-.94a7.5 7.5 0 01-1.624.94l-.385 2.311a.75.75 0 01-.74.627h-3a.75.75 0 01-.74-.627l-.385-2.311a7.5 7.5 0 01-1.624-.94l-2.18.94a.75.75 0 01-.92-.33l-1.5-2.598a.75.75 0 01.184-.96l1.795-1.372a7.55 7.55 0 010-1.88L2.324 9.29a.75.75 0 01-.184-.96l1.5-2.598a.75.75 0 01.92-.33l2.18.94a7.5 7.5 0 011.624-.94l.385-2.311a.75.75 0 01.74-.627h3zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" />
              </svg>
            </a>
          }
        </div>
      </aside>

      @if (channelTooltipVisible()) {
        <div
          class="fixed left-[84px] z-[2600] pointer-events-none"
          [style.top.px]="channelTooltipTop()"
          style="transform: translateY(-50%);">
          <div class="px-2 py-1 rounded-md bg-slate-900 text-white text-[11px] font-semibold shadow-lg whitespace-nowrap">
            {{ channelTooltipName() }}
          </div>
        </div>
      }

      <div class="flex-1 min-w-0 flex flex-col overflow-hidden">
        <header class="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-5">
          <div class="min-w-0">
            <p class="text-sm font-bold text-slate-900 truncate">{{ currentTitle() }}</p>
            <p class="text-[11px] text-slate-500 truncate">{{ currentSubtitle() }}</p>
          </div>

          <div class="flex items-center gap-2">
            <div
              class="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors"
              [class.border-emerald-200]="isRealtimeConnected()"
              [class.bg-emerald-50]="isRealtimeConnected()"
              [class.text-emerald-700]="isRealtimeConnected()"
              [class.border-slate-200]="!isRealtimeConnected()"
              [class.bg-slate-100]="!isRealtimeConnected()"
              [class.text-slate-600]="!isRealtimeConnected()"
              [attr.title]="realtimeStatusTitle()">
              <span
                class="h-2.5 w-2.5 rounded-full ring-4"
                [class.bg-emerald-500]="isRealtimeConnected()"
                [class.ring-emerald-100]="isRealtimeConnected()"
                [class.bg-slate-400]="!isRealtimeConnected()"
                [class.ring-slate-200]="!isRealtimeConnected()"></span>
              <span>{{ realtimeStatusText() }}</span>
            </div>


            <div class="relative">
              <button type="button" (click)="toggleProfileMenu()"
                class="h-9 w-9 overflow-hidden rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                @if (profileAvatarUrl()) {
                  <img [src]="profileAvatarUrl()!" class="h-full w-full object-cover" />
                } @else {
                  {{ profileInitial() }}
                }
              </button>

              @if (profileMenuOpen()) {
                <div class="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl py-1 border border-slate-100 z-[2100]">
                  <div class="px-4 py-4 border-b border-slate-50 bg-slate-50/50">
                    <div class="flex items-center gap-3">
                      <div class="h-14 w-14 overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                        @if (profileAvatarUrl()) {
                          <img [src]="profileAvatarUrl()!" class="h-full w-full object-cover" />
                        } @else {
                          {{ profileInitial() }}
                        }
                      </div>
                      <div class="min-w-0">
                        <p class="text-sm font-bold text-slate-800 truncate">{{ profileName() || defaultProfileName() }}</p>
                        <p class="text-xs text-slate-500 truncate">{{ profileEmail() || defaultProfileEmail() }}</p>
                      </div>
                    </div>
                  </div>
                  <div class="px-2 py-2">
                    <button
                      type="button"
                      (click)="openSelfAvatarPicker()"
                      class="w-full rounded-xl px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      [disabled]="avatarUploading()">
                      {{ avatarUploading() ? 'กำลังอัปโหลดรูป...' : 'เปลี่ยนรูปโปรไฟล์' }}
                    </button>
                  </div>
                  <div class="border-t border-slate-100 my-1"></div>
                  <button
                    type="button"
                    (click)="logout()"
                    class="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50">
                    ออกจากระบบ
                  </button>
                </div>
                <div (click)="toggleProfileMenu()" class="fixed inset-0 z-[2000]" style="cursor: default;"></div>
              }
            </div>
          </div>
        </header>

        <main class="flex-1 overflow-y-auto overflow-x-hidden p-5">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>

    <input #avatarInput type="file" accept="image/png,image/jpeg,image/webp" class="hidden" (change)="onSelfAvatarSelected($event)" />

    <app-avatar-cropper-modal
      [file]="avatarCropFile()"
      title="รูปโปรไฟล์ของฉัน"
      (close)="closeAvatarCropper()"
      (confirm)="uploadSelfAvatar($event)"></app-avatar-cropper-modal>
  `,
  styles: [
    `
      .spinner {
        border: 4px solid rgba(0, 0, 0, 0.1);
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border-left-color: var(--color-primary-600);
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `,
  ],
})
export class AdminLayoutComponent {
  @ViewChild('avatarInput') avatarInput?: ElementRef<HTMLInputElement>;
  profileMenuOpen = signal(false);
  currentTitle = signal('แชท');
  currentSubtitle = signal('เลือกห้องแชทจากแถบซ้าย');
  profileName = signal<string | null>(null);
  profileEmail = signal<string | null>(null);
  profileAvatarUrl = signal<string | null>(null);
  avatarUploading = signal(false);
  avatarCropFile = signal<File | null>(null);
  channelTooltipVisible = signal(false);
  channelTooltipName = signal('');
  channelTooltipTop = signal(0);

  constructor(
    private readonly router: Router,
    public readonly loadingService: LoadingService,
    public readonly channelsService: JoinedChannelsService,
    private readonly realtime: RealtimeService,
    private readonly tokenService: TokenService,
    private readonly swal: SwalService,
    private readonly api: ApiService
  ) {
    const payload = this.tokenService.getAccessTokenPayload();
    const payloadEmail = typeof payload?.email === 'string' ? payload.email : null;
    const payloadRole = typeof payload?.role === 'string' ? payload.role.trim().toLowerCase() : null;
    this.profileEmail.set(payloadEmail);
    this.profileName.set(payloadRole === 'admin' ? 'ผู้ดูแลระบบ' : payloadEmail ? 'ผู้ใช้งาน' : null);

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.updateHeaderByUrl();
      }
    });

    void this.realtime.connect();
    void this.refreshChannels();
    void this.loadUserProfile();

    window.addEventListener('notify:avatar-updated', this.onAvatarUpdated as EventListener);
  }

  loading() {
    return this.loadingService.loading();
  }

  isRealtimeConnected() {
    return this.realtime.connected();
  }

  realtimeStatusText() {
    return this.isRealtimeConnected() ? 'ออนไลน์' : 'ออฟไลน์';
  }

  realtimeStatusTitle() {
    return this.isRealtimeConnected()
      ? 'WebSocket เชื่อมต่อกับ server อยู่'
      : 'WebSocket ไม่ได้เชื่อมต่อกับ server';
  }

  isAdmin() {
    return this.tokenService.isAdmin();
  }

  defaultProfileName() {
    const role = this.tokenService.getRole();
    return role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้งาน';
  }

  defaultProfileEmail() {
    const payload = this.tokenService.getAccessTokenPayload();
    const email = typeof payload?.email === 'string' ? payload.email.trim() : '';
    return email || '-';
  }

  profileInitial() {
    const display = this.profileName() || this.profileEmail() || this.defaultProfileName();
    const value = String(display || '').trim();
    return value ? value.charAt(0).toUpperCase() : 'U';
  }

  private readonly onAvatarUpdated = (event: Event) => {
    const customEvent = event as CustomEvent<{ userId?: string; avatarUrl?: string | null }>;
    const payload = this.tokenService.getAccessTokenPayload();
    const me = typeof payload?.sub === 'string' ? payload.sub : '';
    const userId = String(customEvent.detail?.userId || '').trim();
    if (!me || userId !== me) return;
    this.profileAvatarUrl.set(this.resolveUploadUrl(customEvent.detail?.avatarUrl ?? null));
  };

  async logout() {
    const confirmed = await this.swal.question('ออกจากระบบ', 'ต้องการออกจากระบบใช่หรือไม่?');
    if (!confirmed) return;

    const refreshToken = this.tokenService.getRefreshToken();
    if (refreshToken) {
      try {
        await firstValueFrom(this.api.postPublic('/auth/logout', { refreshToken }));
      } catch {
        // ignore logout API error and continue local sign out
      }
    }

    this.profileMenuOpen.set(false);
    this.realtime.disconnect();
    this.tokenService.clearTokens();
    await this.router.navigateByUrl('/login');
  }

  async loadUserProfile() {
    const payload = this.tokenService.getAccessTokenPayload();
    const id = payload?.sub;
    if (!id) return;
    try {
      const res = await firstValueFrom(
        this.api.getPrivate<{ data: { display_name: string | null; email: string | null; avatar_url?: string | null } }>(`/users/${id}`, {
          withCredentials: true,
        })
      );
      this.profileName.set(res.data?.display_name ?? payload.email ?? null);
      this.profileEmail.set(res.data?.email ?? payload.email ?? null);
      this.profileAvatarUrl.set(this.resolveUploadUrl(res.data?.avatar_url ?? null));
    } catch {
      const payloadEmail = typeof payload?.email === 'string' ? payload.email : null;
      const payloadRole = typeof payload?.role === 'string' ? payload.role.trim().toLowerCase() : null;
      this.profileEmail.set(payloadEmail);
      this.profileName.set(payloadRole === 'admin' ? 'ผู้ดูแลระบบ' : payloadEmail ? 'ผู้ใช้งาน' : null);
      this.profileAvatarUrl.set(null);
    }
  }

  openSelfAvatarPicker() {
    const input = this.avatarInput?.nativeElement;
    if (!input) return;
    input.value = '';
    input.click();
  }

  onSelfAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    if (!file) return;
    this.avatarCropFile.set(file);
  }

  closeAvatarCropper() {
    this.avatarCropFile.set(null);
  }

  async uploadSelfAvatar(blob: Blob) {
    const payload = this.tokenService.getAccessTokenPayload();
    const id = typeof payload?.sub === 'string' ? payload.sub : '';
    if (!id) return;

    const formData = new FormData();
    formData.append('image', new File([blob], 'avatar.png', { type: blob.type || 'image/png' }));

    this.avatarUploading.set(true);
    try {
      const res = await firstValueFrom(
        this.api.postPrivate<{ data?: { avatar_url?: string | null } }>(`/users/${id}/avatar`, formData, {
          withCredentials: true,
        })
      );
      this.profileAvatarUrl.set(this.resolveUploadUrl(res?.data?.avatar_url ?? null));
      this.avatarCropFile.set(null);
      this.profileMenuOpen.set(false);
      await this.swal.success('สำเร็จ', 'อัปเดตรูปโปรไฟล์แล้ว');
    } catch (err: any) {
      const message = err?.error?.message || 'ไม่สามารถอัปโหลดรูปโปรไฟล์ได้';
      await this.swal.error('ไม่สำเร็จ', message);
    } finally {
      this.avatarUploading.set(false);
    }
  }

  async refreshChannels() {
    try {
      await this.channelsService.refresh();
      this.updateHeaderByUrl();
    } catch (err: any) {
      const message = err?.error?.message || 'ไม่สามารถดึงรายการห้องแชทได้';
      this.swal.error('แจ้งเตือน', message);
    }
  }

  toggleProfileMenu() {
    this.profileMenuOpen.update((v) => !v);
  }

  resolveUploadUrl(url: string | null | undefined) {
    const raw = String(url || '').trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    const base = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
    return raw.startsWith('/') ? `${base}${raw}` : `${base}/${raw}`;
  }

  showChannelTooltip(name: string | null | undefined, event: MouseEvent | FocusEvent) {
    const target = (event.currentTarget || event.target) as HTMLElement | null;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    this.channelTooltipName.set(String(name ?? '').trim() || 'Unnamed');
    this.channelTooltipTop.set(rect.top + rect.height / 2);
    this.channelTooltipVisible.set(true);
  }

  hideChannelTooltip() {
    this.channelTooltipVisible.set(false);
  }

  updateHeaderByUrl() {
    const url = this.router.url || '';

    if (url.startsWith('/admin/settings')) {
      this.realtime.activeChannelId.set(null);
      this.currentTitle.set('ตั้งค่า');
      this.currentSubtitle.set('เมนูผู้ดูแลระบบ');
      return;
    }

    if (url.startsWith('/admin/oa')) {
      this.realtime.activeChannelId.set(null);
      this.currentTitle.set('ห้อง OA');
      this.currentSubtitle.set('รวมแชลแนล OA ที่มีห้องสนทนาแล้ว');
      return;
    }

    const chatMatch = url.match(/\/admin\/chat\/(\d+)/);
    if (chatMatch) {
      const id = Number(chatMatch[1]);
      this.realtime.activeChannelId.set(id);
      const channel = this.channelsService.getById(id);
      this.currentTitle.set(channel?.name || `ห้องแชท #${id}`);
      const unread = channel?.unread_count ?? 0;
      this.currentSubtitle.set(unread > 0 ? `${unread} ข้อความใหม่` : 'ข้อความล่าสุด');
      return;
    }

    this.realtime.activeChannelId.set(null);
    this.currentTitle.set('แชท');
    this.currentSubtitle.set('เลือกห้องแชทจากแถบซ้าย');
  }

  generalChannels() {
    return (this.channelsService.channels() || []).filter((c) => !this.isOfficialDirect(c));
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
