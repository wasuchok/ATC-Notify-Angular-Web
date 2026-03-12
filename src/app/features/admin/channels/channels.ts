import { CommonModule } from '@angular/common';
import { Component, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { JoinedChannelsService } from '../../../core/services/joined-channels.service';
import { LoadingService } from '../../../core/services/loading.service';
import { TokenService } from '../../../core/services/token.service';
import { SwalService } from '../../../shared/swal/swal.service';

const CHANNEL_ICON_OPTIONS: number[] = [
  0xf62f, // chat_bubble_outline_rounded
  0xf0d9, // group_outlined
  0xf237, // notifications_outlined
  0xef27, // campaign_outlined
  0xf0ee, // headset_mic_outlined
  0xf1ae, // map_outlined
  0xe5fd, // star_outline
  0xf086, // flight_takeoff_outlined
  0xf379, // shield_outlined
  0xe37c, // lightbulb_outline
  0xe6f4, // work_outline
  0xf022, // engineering_outlined
  0xf34c, // security_outlined
  0xf0653, // rocket_launch_outlined
  0xe621, // support_agent
  0xf1be, // medical_services_outlined
  0xf4ae, // warning_amber_outlined
  0xf4d0, // wifi_tethering_outlined
  0xf0681, // tips_and_updates_outlined
  0xf2ef, // receipt_long_outlined
  0xef11, // calendar_today_outlined
  0xf0df, // handyman_outlined
  0xef6f, // commute_outlined
  0xf134, // inventory_2_outlined
  0xf0693, // warehouse_outlined
  0xf05f7, // factory_outlined
  0xf2e4, // radar_outlined
  0xf35a, // sensors_outlined
  0xe03a, // access_time
  0xf2ac, // place_outlined
];

const CHANNEL_COLOR_OPTIONS: string[] = [
  'FF1E88E5',
  'FF43A047',
  'FFF4511E',
  'FFFB8C00',
  'FF8E24AA',
  'FF3949AB',
  'FF00ACC1',
  'FF00897B',
  'FF5D4037',
  'FF546E7A',
];

const DEFAULT_ICON_CODEPOINT = CHANNEL_ICON_OPTIONS[0] ?? 0xe03a;
const DEFAULT_ICON_COLOR = CHANNEL_COLOR_OPTIONS[0] ?? 'FF1E88E5';

type Channel = {
  id: number;
  name: string;
  channel_type?: string | null;
  official_parent_id?: number | null;
  official_parent?: {
    name?: string | null;
    icon_codepoint?: number | null;
    icon_color?: string | null;
  } | null;
  icon_codepoint: number | null;
  icon_color: string | null;
  is_active: boolean;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  Users?: {
    display_name?: string | null;
  } | null;
  channel_role_visibility?: Array<{
    channel_id: number;
    roles: { id: string; name: string };
  }>;
  last_message_content: string | null;
  last_message_at: string | null;
  unread_count: number;
};

type RoleVisibility = { id: string; name: string; hasAccess: boolean };

@Component({
  selector: 'app-channels',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './channels.html',
  styleUrl: './channels.css',
})
export class Channels {
  channels = signal<Channel[]>([]);
  loading = signal(false);
  query = signal('');
  statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  channelScope = signal<'general' | 'official'>('general');
  createType = signal<'general' | 'official'>('general');
  createName = signal('');
  createOfficialHandle = signal('');
  createIconCodepoint = signal<number>(DEFAULT_ICON_CODEPOINT);
  createIconColor = signal<string>(DEFAULT_ICON_COLOR);
  creatingChannel = signal(false);
  channelIconOptions = CHANNEL_ICON_OPTIONS;
  channelColorOptions = CHANNEL_COLOR_OPTIONS;
  showCreateModal = signal(false);
  showRolesModal = signal(false);
  showEditModal = signal(false);
  rolesLoading = signal(false);
  rolesSaving = signal(false);
  rolesQuery = signal('');
  roleVisibility = signal<RoleVisibility[]>([]);
  selectedChannel = signal<Channel | null>(null);
  editName = signal('');
  editStatus = signal<'active' | 'inactive'>('active');

  rolesTotal = signal<number | null>(null);
  visibilitySummary = signal<Record<number, { selected: number; total: number | null }>>({});
  channelRoleNames = signal<Record<number, string[]>>({});

  constructor(
    private readonly api: ApiService,
    private readonly joinedChannels: JoinedChannelsService,
    private readonly loadingService: LoadingService,
    private readonly swal: SwalService,
    private readonly tokenService: TokenService
  ) {
    let previousOverflow = '';
    effect((onCleanup) => {
      if (typeof document === 'undefined') return;
      const open = this.showCreateModal() || this.showRolesModal() || this.showEditModal();
      if (open) {
        previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = previousOverflow || '';
      }

      const onKeyDown = (event: KeyboardEvent) => {
        if (!this.showCreateModal() && !this.showRolesModal() && !this.showEditModal()) return;
        if (event.key === 'Escape') this.closeOverlays();
      };

      window.addEventListener('keydown', onKeyDown);
      onCleanup(() => window.removeEventListener('keydown', onKeyDown));
    });
  }

  async ngOnInit() {
    await Promise.all([this.fetchRolesTotal(), this.fetchChannels()]);
  }

  async fetchRolesTotal() {
    try {
      const res = await firstValueFrom(
        this.api.getPrivate<{ data: Array<{ id: string; name: string }> }>('/role', {
          withCredentials: true,
        })
      );
      this.rolesTotal.set((res.data || []).length);

      const total = this.rolesTotal();
      if (total !== null) {
        this.visibilitySummary.update((m) => {
          const next: Record<number, { selected: number; total: number | null }> = { ...m };
          for (const k of Object.keys(next)) {
            next[Number(k)] = { ...next[Number(k)], total };
          }
          return next;
        });
      }
    } catch {
      this.rolesTotal.set(null);
    }
  }

  async fetchChannels() {
    this.loading.set(true);

    this.loadingService.show();
    try {
      const res = await firstValueFrom(
        this.api.getPrivate<{ data: Channel[] }>('/channel', { withCredentials: true })
      );
      const channels = res.data || [];
      this.channels.set(channels);

      const total = this.rolesTotal();
      const roleNames: Record<number, string[]> = {};
      const summary: Record<number, { selected: number; total: number | null }> = {};

      for (const channel of channels) {
        const names = Array.from(
          new Set((channel.channel_role_visibility || []).map((v) => v.roles?.name).filter(Boolean))
        ) as string[];
        roleNames[channel.id] = names;
        summary[channel.id] = { selected: names.length, total };
      }

      this.channelRoleNames.set(roleNames);
      this.visibilitySummary.set(summary);
    } catch (err: any) {
      const message = err?.error?.message || 'ไม่สามารถดึงข้อมูลแชนแนลได้';
      this.swal.error('แจ้งเตือน', message);
    } finally {
      this.loading.set(false);
      this.loadingService.hide();
    }
  }

  get generalChannels() {
    return this.applyStatusAndQuery((this.channels() || []).filter((c) => !this.isOfficialDirect(c)));
  }

  get officialChannels() {
    return this.applyStatusAndQuery((this.channels() || []).filter((c) => this.isOfficialDirect(c)));
  }

  get filteredChannels() {
    return this.channelScope() === 'official' ? this.officialChannels : this.generalChannels;
  }

  private applyStatusAndQuery(channels: Channel[]) {
    const q = this.query().trim().toLowerCase();
    const filter = this.statusFilter();
    return channels
      .filter((c) => {
        if (filter === 'active' && !c.is_active) return false;
        if (filter === 'inactive' && c.is_active) return false;
        if (!q) return true;
        return c.name.toLowerCase().includes(q) || String(c.id).includes(q);
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }



  closeOverlays() {
    this.showCreateModal.set(false);
    this.showRolesModal.set(false);
    this.showEditModal.set(false);
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

  codepointHex(codepoint: number | null) {
    if (!codepoint || Number.isNaN(codepoint)) return '';
    return `0x${codepoint.toString(16).toUpperCase()}`;
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

  shortUuid(uuid: string | null) {
    if (!uuid) return '-';
    if (uuid.length <= 8) return uuid;
    return `${uuid.slice(0, 4)}…${uuid.slice(-4)}`;
  }

  thaiDate(iso: string | null) {
    if (!iso) return '-';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  openCreateModal() {
    this.createType.set('general');
    this.createName.set('');
    this.createOfficialHandle.set('');
    this.createIconCodepoint.set(DEFAULT_ICON_CODEPOINT);
    this.createIconColor.set(DEFAULT_ICON_COLOR);
    this.showCreateModal.set(true);
  }

  async submitCreateChannel() {
    if (this.creatingChannel()) return;

    const name = this.createName().trim();
    if (!name) {
      await this.swal.warning('ต้องการชื่อแชนแนล', 'กรุณากรอกชื่อแชนแนลก่อนสร้าง');
      return;
    }

    const type = this.createType();
    const isOfficial = type === 'official';
    const officialHandle = this.createOfficialHandle().trim();

    if (isOfficial && !officialHandle) {
      await this.swal.warning('ต้องการ handle', 'กรุณากรอก handle ของ OA เช่น @atc123');
      return;
    }

    const payload = this.tokenService.getAccessTokenPayload();
    const createdBy = typeof payload?.sub === 'string' ? payload.sub : null;
    const iconCodepoint = this.createIconCodepoint();
    const iconColor = this.createIconColor();

    this.creatingChannel.set(true);
    this.loadingService.show();
    try {
      if (isOfficial) {
        await firstValueFrom(
          this.api.postPrivate(
            '/channel/official',
            {
              name,
              official_handle: officialHandle,
              icon_codepoint: iconCodepoint,
              icon_color: iconColor,
            },
            { withCredentials: true }
          )
        );
      } else {
        await firstValueFrom(
          this.api.postPrivate(
            '/channel/create',
            {
              name,
              icon_codepoint: iconCodepoint,
              icon_color: iconColor,
              created_by: createdBy,
            },
            { withCredentials: true }
          )
        );
      }

      this.showCreateModal.set(false);
      this.channelScope.set('general');
      await this.fetchChannels();
      await this.syncSidebarChannels();
      await this.swal.success('สำเร็จ', isOfficial ? 'สร้าง OA เรียบร้อยแล้ว' : 'สร้างแชนแนลเรียบร้อยแล้ว');
    } catch (err: any) {
      const message = err?.error?.message || 'ไม่สามารถสร้างแชนแนลได้';
      await this.swal.error('ไม่สำเร็จ', message);
    } finally {
      this.creatingChannel.set(false);
      this.loadingService.hide();
    }
  }


  async onStatusChange(value: string) {
    const next = (['all', 'active', 'inactive'] as const).includes(value as any)
      ? (value as 'all' | 'active' | 'inactive')
      : 'all';
    if (next === this.statusFilter()) return;
    this.statusFilter.set(next);
    await this.fetchChannels();
  }

  setChannelScope(value: string) {
    const next = value === 'official' ? 'official' : 'general';
    this.channelScope.set(next);
  }

  setCreateType(value: string) {
    const next = value === 'official' ? 'official' : 'general';
    this.createType.set(next);
    if (next !== 'official') this.createOfficialHandle.set('');
  }

  async confirmDelete(channel: Channel) {
    const ok = await this.swal.question('ยืนยันการลบ', `ต้องการลบแชนแนล "${channel.name}" ใช่หรือไม่?`);
    if (!ok) return;

    this.loadingService.show();
    try {
      await firstValueFrom(this.api.deletePrivate(`/channel/${channel.id}`));
      await this.fetchChannels();
      await this.syncSidebarChannels();
      await this.swal.success('สำเร็จ', 'ลบแชนแนลเรียบร้อยแล้ว');
    } catch (err: any) {
      const message = err?.error?.message || 'ไม่สามารถลบแชนแนลได้';
      await this.swal.error('ไม่สำเร็จ', message);
    } finally {
      this.loadingService.hide();
    }
  }

  openEdit(channel: Channel) {
    this.selectedChannel.set(channel);
    this.editName.set(channel.name || '');
    this.editStatus.set(channel.is_active ? 'active' : 'inactive');
    this.showEditModal.set(true);
  }

  async saveEdit() {
    const channel = this.selectedChannel();
    if (!channel) return;

    const name = this.editName().trim();
    const isActive = this.editStatus() === 'active';

    if (!name) {
      await this.swal.error('ไม่สำเร็จ', 'กรุณาระบุชื่อแชนแนล');
      return;
    }

    this.loadingService.show();
    try {
      await firstValueFrom(
        this.api.putPrivate(`/channel/${channel.id}`, { name, is_active: isActive })
      );
      this.showEditModal.set(false);
      await this.fetchChannels();
      await this.syncSidebarChannels();
      await this.swal.success('สำเร็จ', 'บันทึกข้อมูลแชนแนลเรียบร้อยแล้ว');
    } catch (err: any) {
      const message = err?.error?.message || 'ไม่สามารถแก้ไขแชนแนลได้';
      await this.swal.error('ไม่สำเร็จ', message);
    } finally {
      this.loadingService.hide();
    }
  }

  async openRoleVisibility(channel: Channel) {
    this.selectedChannel.set(channel);
    this.rolesQuery.set('');
    this.roleVisibility.set([]);
    this.rolesLoading.set(true);
    this.showRolesModal.set(true);
    this.loadingService.show();

    try {
      const res = await firstValueFrom(
        this.api.getPrivate<{ data: RoleVisibility[] }>(`/channel/${channel.id}/roles`)
      );
      const roles = res.data || [];
      this.roleVisibility.set(roles);
      this.visibilitySummary.update((m) => ({
        ...m,
        [channel.id]: { selected: roles.filter((r) => r.hasAccess).length, total: roles.length },
      }));
    } catch (err: any) {
      const message = err?.error?.message || 'ไม่สามารถดึงข้อมูล role ได้';
      await this.swal.error('ไม่สำเร็จ', message);
      this.showRolesModal.set(false);
    } finally {
      this.rolesLoading.set(false);
      this.loadingService.hide();
    }
  }

  get filteredRoles() {
    const q = this.rolesQuery().trim().toLowerCase();
    const roles = this.roleVisibility();
    if (!q) return roles;
    return roles.filter((r) => r.name.toLowerCase().includes(q));
  }

  toggleRole(roleId: string, value: boolean) {
    this.roleVisibility.update((roles) =>
      roles.map((r) => (r.id === roleId ? { ...r, hasAccess: value } : r))
    );
  }

  setAllRoles(value: boolean) {
    this.roleVisibility.update((roles) => roles.map((r) => ({ ...r, hasAccess: value })));
  }

  async saveRoleVisibility() {
    const channel = this.selectedChannel();
    if (!channel) return;
    if (this.rolesSaving()) return;

    const roleIds = (this.roleVisibility() || []).filter((r) => r.hasAccess).map((r) => r.id);
    this.rolesSaving.set(true);
    this.loadingService.show();

    try {
      await firstValueFrom(this.api.putPrivate(`/channel/${channel.id}/roles`, { role_ids: roleIds }));

      this.visibilitySummary.update((m) => ({
        ...m,
        [channel.id]: { selected: roleIds.length, total: (this.roleVisibility() || []).length },
      }));

      this.showRolesModal.set(false);
      await this.swal.success('สำเร็จ', 'บันทึกสิทธิ์การมองเห็นเรียบร้อยแล้ว');
    } catch (err: any) {
      const message = err?.error?.message || 'ไม่สามารถบันทึก role ได้';
      await this.swal.error('ไม่สำเร็จ', message);
    } finally {
      this.rolesSaving.set(false);
      this.loadingService.hide();
    }
  }

  isOfficialDirect(channel: { channel_type?: string | null; official_parent_id?: number | null }) {
    const type = (channel.channel_type || '').toLowerCase();
    const parentId = typeof channel.official_parent_id === 'number' ? channel.official_parent_id : null;
    return type === 'direct' && !!parentId;
  }

  private async syncSidebarChannels() {
    try {
      await this.joinedChannels.refresh();
    } catch {
     
    }
  }

}
