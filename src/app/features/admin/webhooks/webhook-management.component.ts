import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import { ApiService } from '../../../core/services/api.service';
import { LoadingService } from '../../../core/services/loading.service';
import { SwalService } from '../../../shared/swal/swal.service';

type Channel = {
  id: number;
  name: string;
  is_active: boolean;
  channel_type?: string | null;
  official_parent_id?: number | null;
};
type Webhook = { id: number; channel_id: number; name: string; created_at: string };
type CreatedWebhook = Webhook & { secret_token: string };
type WebhookDetail = {
  id: number;
  channel_id: number;
  channel_name: string | null;
  name: string;
  secret_token: string;
  created_at: string;
};

@Component({
  selector: 'app-webhook-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="font-sarabun space-y-6">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-slate-900 tracking-tight">Webhook</h2>
          <p class="text-slate-500 text-sm mt-1">สร้าง secret สำหรับยิงข้อความเข้าแชนแนล</p>
        </div>
      </div>

      @if (created()) {
        <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm font-bold text-emerald-900">สร้าง Webhook สำเร็จ</p>
              <p class="text-xs text-emerald-700 mt-1">Secret จะแสดงครั้งเดียว กรุณาเก็บไว้ให้ปลอดภัย</p>
            </div>
            <button
              type="button"
              class="px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-emerald-700 text-xs font-semibold hover:bg-emerald-50"
              (click)="created.set(null)">
              ปิด
            </button>
          </div>

          <div class="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div class="bg-white border border-emerald-200 rounded-2xl p-3">
              <p class="text-[11px] font-semibold text-slate-500">Incoming URL</p>
              <div class="mt-1 flex items-center gap-2">
                <code class="text-xs text-slate-800 break-all">{{ incomingUrl }}</code>
                <button
                  type="button"
                  class="ml-auto px-2.5 py-1 rounded-xl border border-slate-200 text-xs text-slate-700 hover:bg-slate-50"
                  (click)="copy(incomingUrl)">
                  คัดลอก
                </button>
              </div>
            </div>

            <div class="bg-white border border-emerald-200 rounded-2xl p-3">
              <p class="text-[11px] font-semibold text-slate-500">Secret Token</p>
              <div class="mt-1 flex items-center gap-2">
                <code class="text-xs text-slate-800 break-all">{{ created()!.secret_token }}</code>
                <button
                  type="button"
                  class="ml-auto px-2.5 py-1 rounded-xl border border-slate-200 text-xs text-slate-700 hover:bg-slate-50"
                  (click)="copy(created()!.secret_token)">
                  คัดลอก
                </button>
              </div>
            </div>
          </div>

          <div class="mt-3 bg-white border border-emerald-200 rounded-2xl p-3">
            <p class="text-[11px] font-semibold text-slate-500 mb-1">ตัวอย่าง (curl)</p>
            <pre class="text-[11px] leading-relaxed text-slate-800 whitespace-pre-wrap break-words">{{ curlExample() }}</pre>
            <button
              type="button"
              class="mt-2 px-2.5 py-1 rounded-xl border border-slate-200 text-xs text-slate-700 hover:bg-slate-50"
              (click)="copy(curlExample())">
              คัดลอกคำสั่ง
            </button>
          </div>
        </div>
      }

      <div class="bg-white border border-slate-200 rounded-3xl p-5 space-y-4">
        <div class="grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1">แชนแนล</label>
            <select
              class="w-full px-3 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm outline-none focus:ring-4 focus:ring-slate-200"
              [ngModel]="selectedChannelId()"
              (ngModelChange)="onChannelChange($event)">
              <option [ngValue]="null">เลือกแชนแนล...</option>
              <option *ngFor="let c of channels()" [ngValue]="c.id">
                #{{ c.id }} • {{ c.name }}{{ c.is_active ? '' : ' (inactive)' }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1">ชื่อ Webhook</label>
            <input
              class="w-full px-3 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm outline-none focus:ring-4 focus:ring-slate-200"
              placeholder="เช่น CI/CD, Monitoring"
              [ngModel]="webhookName()"
              (ngModelChange)="webhookName.set($event)" />
          </div>

          <button
            type="button"
            class="px-5 py-2.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            [disabled]="creating() || !canCreate()"
            (click)="create()">
            {{ creating() ? 'กำลังสร้าง...' : 'สร้าง Webhook' }}
          </button>
        </div>
      </div>

      <div class="bg-white border border-slate-200 rounded-3xl p-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-bold text-slate-900">รายการ Webhook</p>
            <p class="text-xs text-slate-500">เลือกแชนแนลเพื่อดูรายการ (Secret จะไม่แสดง)</p>
          </div>
          <button
            type="button"
            class="px-3 py-2 rounded-2xl border border-slate-200 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            [disabled]="!selectedChannelId()"
            (click)="refreshList()">
            รีเฟรช
          </button>
        </div>

        @if (!selectedChannelId()) {
          <div class="mt-4 text-sm text-slate-500">กรุณาเลือกแชนแนล</div>
        } @else if (listLoading()) {
          <div class="mt-4 text-sm text-slate-500">กำลังโหลด...</div>
        } @else if ((webhooks() || []).length === 0) {
          <div class="mt-4 text-sm text-slate-500">ยังไม่มี webhook สำหรับแชนแนลนี้</div>
        } @else {
          <div class="mt-4 overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead>
                <tr class="text-left text-xs text-slate-500">
                  <th class="py-2 pr-4">ชื่อ</th>
                  <th class="py-2 pr-4">สร้างเมื่อ</th>
                  <th class="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let w of webhooks()" class="border-t border-slate-100">
                  <td class="py-3 pr-4 font-semibold text-slate-800">{{ w.name }}</td>
                  <td class="py-3 pr-4 text-slate-600">{{ thaiDate(w.created_at) }}</td>
                  <td class="py-3 pr-4 text-right">
                    <button
                      type="button"
                      class="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 hover:bg-slate-50"
                      (click)="openDetail(w)">
                      ดูรายละเอียด
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>

    @if (detailOpen()) {
      <div class="fixed inset-0 z-[3000] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="w-full max-w-3xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
          <div class="p-5 border-b border-slate-100 flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-lg font-bold text-slate-900">รายละเอียด Webhook</p>
              <p class="text-xs text-slate-500 mt-0.5">ดู secret และตัวอย่างการยิง API</p>
            </div>
            <button
              type="button"
              class="w-10 h-10 rounded-2xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600"
              (click)="closeDetail()"
              title="ปิด">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            @if (detailLoading()) {
              <div class="text-sm text-slate-500">กำลังโหลด...</div>
            } @else if (!detail()) {
              <div class="text-sm text-slate-500">ไม่พบข้อมูล</div>
            } @else {
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                  <p class="text-[11px] font-semibold text-slate-500">ชื่อ</p>
                  <p class="text-sm font-bold text-slate-900 mt-1">{{ detail()!.name }}</p>
                  <p class="text-xs text-slate-600 mt-1">สร้างเมื่อ: {{ thaiDate(detail()!.created_at) }}</p>
                </div>
                <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                  <p class="text-[11px] font-semibold text-slate-500">แชนแนล</p>
                  <p class="text-sm font-bold text-slate-900 mt-1">
                    #{{ detail()!.channel_id }} • {{ detail()!.channel_name || '-' }}
                  </p>
                  <p class="text-xs text-slate-600 mt-1">Webhook ID: {{ detail()!.id }}</p>
                </div>
              </div>

              <div class="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                <div>
                  <p class="text-[11px] font-semibold text-slate-500">Incoming URL</p>
                  <div class="mt-1 flex items-center gap-2">
                    <code class="text-xs text-slate-800 break-all">{{ incomingUrl }}</code>
                    <button
                      type="button"
                      class="ml-auto px-2.5 py-1 rounded-xl border border-slate-200 text-xs text-slate-700 hover:bg-slate-50"
                      (click)="copy(incomingUrl)">
                      คัดลอก
                    </button>
                  </div>
                </div>

                <div>
                  <p class="text-[11px] font-semibold text-slate-500">Secret Token</p>
                  <div class="mt-1 flex items-center gap-2">
                    <code class="text-xs text-slate-800 break-all">{{ detail()!.secret_token }}</code>
                    <button
                      type="button"
                      class="ml-auto px-2.5 py-1 rounded-xl border border-slate-200 text-xs text-slate-700 hover:bg-slate-50"
                      (click)="copy(detail()!.secret_token)">
                      คัดลอก
                    </button>
                  </div>
                </div>
              </div>

              <div class="bg-white border border-slate-200 rounded-2xl p-4">
                <p class="text-sm font-bold text-slate-900">ตัวอย่างยิง API (ข้อความ)</p>
                <p class="text-xs text-slate-500 mt-0.5">ส่ง JSON พร้อม header <code class="font-mono">X-Webhook-Secret</code></p>
                <pre class="mt-2 text-[11px] leading-relaxed text-slate-800 whitespace-pre-wrap break-words">{{ detailCurlExample() }}</pre>
                <button
                  type="button"
                  class="mt-2 px-2.5 py-1 rounded-xl border border-slate-200 text-xs text-slate-700 hover:bg-slate-50"
                  (click)="copy(detailCurlExample())">
                  คัดลอกคำสั่ง
                </button>
              </div>

              <div class="bg-white border border-slate-200 rounded-2xl p-4">
                <p class="text-sm font-bold text-slate-900">ตัวอย่างยิง API (รูปภาพ)</p>
                <p class="text-xs text-slate-500 mt-0.5">
                  ส่งแบบ <code class="font-mono">multipart/form-data</code> โดยแนบไฟล์ใน field <code class="font-mono">image</code>
                </p>
                <pre class="mt-2 text-[11px] leading-relaxed text-slate-800 whitespace-pre-wrap break-words">{{ detailImageCurlExample() }}</pre>
                <button
                  type="button"
                  class="mt-2 px-2.5 py-1 rounded-xl border border-slate-200 text-xs text-slate-700 hover:bg-slate-50"
                  (click)="copy(detailImageCurlExample())">
                  คัดลอกคำสั่ง
                </button>
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class WebhookManagementComponent {
  channels = signal<Channel[]>([]);
  selectedChannelId = signal<number | null>(null);
  webhookName = signal('');
  creating = signal(false);
  listLoading = signal(false);
  webhooks = signal<Webhook[]>([]);
  created = signal<CreatedWebhook | null>(null);
  detailOpen = signal(false);
  detailLoading = signal(false);
  detail = signal<WebhookDetail | null>(null);

  incomingUrl = `${API_BASE_URL}/webhooks/incoming`;

  canCreate = computed(() => {
    const channelId = this.selectedChannelId();
    const name = this.webhookName().trim();
    return !!channelId && !!name;
  });

  curlExample = computed(() => {
    const c = this.created();
    const channelId = c?.channel_id ?? this.selectedChannelId() ?? 0;
    const secret = c?.secret_token ?? 'YOUR_SECRET';
    return [
      `curl -X POST "${this.incomingUrl}" \\`,
      `  -H "Content-Type: application/json" \\`,
      `  -H "X-Webhook-Secret: ${secret}" \\`,
      `  -d '{"channel_id": ${channelId}, "content": "Hello from webhook"}'`,
    ].join('\n');
  });

  detailCurlExample = computed(() => {
    const d = this.detail();
    const channelId = d?.channel_id ?? 0;
    const secret = d?.secret_token ?? 'YOUR_SECRET';
    return [
      `curl -X POST "${this.incomingUrl}" \\`,
      `  -H "Content-Type: application/json" \\`,
      `  -H "X-Webhook-Secret: ${secret}" \\`,
      `  -d '{"channel_id": ${channelId}, "content": "Hello from webhook"}'`,
    ].join('\n');
  });

  detailImageCurlExample = computed(() => {
    const d = this.detail();
    const channelId = d?.channel_id ?? 0;
    const secret = d?.secret_token ?? 'YOUR_SECRET';
    return [
      `curl -X POST "${this.incomingUrl}" \\`,
      `  -H "X-Webhook-Secret: ${secret}" \\`,
      `  -F "channel_id=${channelId}" \\`,
      `  -F "content=Image from webhook" \\`,
      `  -F "image=@./image.png"`,
    ].join('\n');
  });

  constructor(
    private readonly api: ApiService,
    private readonly loadingService: LoadingService,
    private readonly swal: SwalService
  ) {}

  async ngOnInit() {
    await this.fetchChannels();
  }

  async fetchChannels() {
    this.loadingService.show();
    try {
      const res = await firstValueFrom(this.api.getPrivate<{ data: any[] }>('/channel'));
      const channels: Channel[] = Array.isArray(res?.data)
        ? res.data
            .map((c: any) => ({
              id: Number(c?.id),
              name: String(c?.name ?? ''),
              is_active: !!c?.is_active,
              channel_type: typeof c?.channel_type === 'string' ? c.channel_type : null,
              official_parent_id:
                typeof c?.official_parent_id === 'number' ? c.official_parent_id : null,
            }))
            .filter((c: Channel) => {
              if (!Number.isFinite(c.id) || !c.name) return false;
              const type = String(c.channel_type ?? '').toLowerCase();
              // Webhook หน้านี้รองรับเฉพาะห้องหลัก (general)
              if (type && type !== 'general') return false;
              return c.official_parent_id == null;
            })
        : [];
      this.channels.set(channels);

      const selectedId = this.selectedChannelId();
      if (selectedId && !channels.some((c) => c.id === selectedId)) {
        this.selectedChannelId.set(null);
        this.webhooks.set([]);
        this.created.set(null);
      }
    } catch (err: any) {
      const message = err?.error?.message || 'ไม่สามารถดึงรายการแชนแนลได้';
      this.swal.error('แจ้งเตือน', message);
      this.channels.set([]);
    } finally {
      this.loadingService.hide();
    }
  }

  async onChannelChange(value: number | null) {
    this.selectedChannelId.set(value ? Number(value) : null);
    this.created.set(null);
    await this.refreshList();
  }

  async refreshList() {
    const channelId = this.selectedChannelId();
    if (!channelId) {
      this.webhooks.set([]);
      return;
    }

    this.listLoading.set(true);
    try {
      const res = await firstValueFrom(
        this.api.getPrivate<{ data: Webhook[] }>(`/webhooks/${channelId}`)
      );
      this.webhooks.set(Array.isArray(res?.data) ? res.data : []);
    } catch (err: any) {
      const message = err?.error?.message || 'ไม่สามารถดึงรายการ webhook ได้';
      this.swal.error('แจ้งเตือน', message);
      this.webhooks.set([]);
    } finally {
      this.listLoading.set(false);
    }
  }

  closeDetail() {
    this.detailOpen.set(false);
    this.detail.set(null);
  }

  async openDetail(webhook: Webhook) {
    this.detailOpen.set(true);
    this.detailLoading.set(true);
    this.detail.set(null);
    try {
      const res = await firstValueFrom(
        this.api.getPrivate<{ data: WebhookDetail }>(`/webhooks/item/${webhook.id}`)
      );
      this.detail.set(res?.data ?? null);
    } catch (err: any) {
      const message = err?.error?.message || 'ไม่สามารถดึงรายละเอียด webhook ได้';
      this.swal.error('แจ้งเตือน', message);
      this.closeDetail();
    } finally {
      this.detailLoading.set(false);
    }
  }

  async create() {
    if (this.creating()) return;
    if (!this.canCreate()) return;

    const channelId = this.selectedChannelId();
    const name = this.webhookName().trim();
    if (!channelId || !name) return;

    this.creating.set(true);
    this.loadingService.show();
    try {
      const res = await firstValueFrom(
        this.api.postPrivate<{ data: CreatedWebhook }>('/webhooks', {
          channel_id: channelId,
          name,
        })
      );
      const created = res?.data;
      if (created?.secret_token) {
        this.created.set(created);
      }
      this.webhookName.set('');
      await this.refreshList();
    } catch (err: any) {
      const message = err?.error?.message || 'ไม่สามารถสร้าง webhook ได้';
      this.swal.error('แจ้งเตือน', message);
    } finally {
      this.loadingService.hide();
      this.creating.set(false);
    }
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

  async copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      await this.swal.success('คัดลอกแล้ว', 'คัดลอกไปยังคลิปบอร์ดเรียบร้อย');
    } catch {
      await this.swal.info('คัดลอกไม่สำเร็จ', 'เบราว์เซอร์ไม่อนุญาตให้คัดลอกอัตโนมัติ');
    }
  }
}
