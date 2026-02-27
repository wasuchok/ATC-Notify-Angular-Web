import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { LoadingService } from '../../../core/services/loading.service';
import { SwalService } from '../../../shared/swal/swal.service';

type PageAvailabilityFlag = {
  id: number;
  key: string;
  enabled: boolean;
  message: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

type DraftFlag = {
  enabled: boolean;
  message: string;
};

@Component({
  selector: 'app-feature-flags',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="font-sarabun space-y-5">
      <div class="bg-white border border-slate-200 rounded-3xl p-5">
        <div class="flex flex-col sm:flex-row sm:items-end gap-3">
          <div class="flex-1">
            <h2 class="text-2xl font-bold text-slate-900 tracking-tight">Feature Flags</h2>
            <p class="text-slate-500 text-sm mt-1">จัดการเปิด/ปิดการใช้งานหน้าจาก Backend</p>
            <input
              class="mt-3 w-full px-3 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm outline-none focus:ring-4 focus:ring-slate-200"
              [ngModel]="query()"
              (ngModelChange)="query.set($event)"
              placeholder="ค้นหา key..." />
          </div>
          <button
            type="button"
            class="px-4 py-2.5 rounded-2xl border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            [disabled]="loading()"
            (click)="fetchFlags()">
            {{ loading() ? 'กำลังโหลด...' : 'รีเฟรช' }}
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="bg-white border border-slate-200 rounded-3xl p-6 text-sm text-slate-500">กำลังโหลดข้อมูล...</div>
      } @else if (filteredFlags().length === 0) {
        <div class="bg-white border border-slate-200 rounded-3xl p-6 text-sm text-slate-500">
          ไม่พบรายการที่ตรงกับคำค้นหา
        </div>
      } @else {
        <div class="space-y-3">
          <div *ngFor="let flag of filteredFlags()" class="bg-white border border-slate-200 rounded-3xl p-5">
            <div class="flex flex-col lg:flex-row gap-4 lg:items-start lg:justify-between">
              <div class="min-w-0">
                <p class="text-sm font-bold text-slate-900 break-all">{{ flag.key }}</p>
                <p class="text-xs text-slate-500 mt-1">
                  อัปเดตล่าสุด: {{ thaiDate(flag.updated_at) }}
                  <span *ngIf="flag.updated_by"> • by {{ shortUuid(flag.updated_by) }}</span>
                </p>
              </div>

              <label class="inline-flex items-center gap-2 text-sm text-slate-700 font-semibold">
                <input
                  type="checkbox"
                  class="w-4 h-4 rounded border-slate-300"
                  [ngModel]="draftEnabled(flag)"
                  (ngModelChange)="setDraftEnabled(flag.key, $event)" />
                {{ draftEnabled(flag) ? 'Enabled' : 'Disabled' }}
              </label>
            </div>

            <div class="mt-3">
              <label class="block text-xs font-semibold text-slate-600 mb-1">ข้อความแจ้งเตือน (ถ้ามี)</label>
              <textarea
                rows="2"
                class="w-full px-3 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm outline-none focus:ring-4 focus:ring-slate-200 resize-y"
                [ngModel]="draftMessage(flag)"
                (ngModelChange)="setDraftMessage(flag.key, $event)"
                placeholder="เช่น หน้านี้ปิดปรับปรุงชั่วคราว"></textarea>
            </div>

            <div class="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                class="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                [disabled]="!isDirty(flag.key) || isSaving(flag.key)"
                (click)="resetDraft(flag.key)">
                รีเซ็ต
              </button>
              <button
                type="button"
                class="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                [disabled]="!isDirty(flag.key) || isSaving(flag.key)"
                (click)="saveFlag(flag.key)">
                {{ isSaving(flag.key) ? 'กำลังบันทึก...' : 'บันทึก' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class FeatureFlagsComponent {
  flags = signal<PageAvailabilityFlag[]>([]);
  loading = signal(false);
  query = signal('');
  private drafts = signal<Record<string, DraftFlag>>({});
  private savingByKey = signal<Record<string, boolean>>({});

  filteredFlags = computed(() => {
    const q = this.query().trim().toLowerCase();
    const list = this.flags();
    if (!q) return list;
    return list.filter((f) => f.key.toLowerCase().includes(q));
  });

  constructor(
    private readonly api: ApiService,
    private readonly loadingService: LoadingService,
    private readonly swal: SwalService
  ) {}

  async ngOnInit() {
    await this.fetchFlags();
  }

  async fetchFlags() {
    this.loading.set(true);
    this.loadingService.show();
    try {
      const res = await firstValueFrom(this.api.getPrivate<{ data: PageAvailabilityFlag[] }>('/feature-flags/pages/admin'));
      const list = Array.isArray(res?.data) ? res.data : [];
      this.flags.set(list);

      const nextDrafts: Record<string, DraftFlag> = {};
      for (const item of list) {
        nextDrafts[item.key] = {
          enabled: !!item.enabled,
          message: item.message ?? '',
        };
      }
      this.drafts.set(nextDrafts);
    } catch (err: any) {
      const message = err?.error?.message || 'ไม่สามารถดึงรายการ feature flags ได้';
      this.swal.error('แจ้งเตือน', message);
      this.flags.set([]);
      this.drafts.set({});
    } finally {
      this.loading.set(false);
      this.loadingService.hide();
    }
  }

  draftEnabled(flag: PageAvailabilityFlag) {
    return this.drafts()[flag.key]?.enabled ?? !!flag.enabled;
  }

  draftMessage(flag: PageAvailabilityFlag) {
    return this.drafts()[flag.key]?.message ?? (flag.message ?? '');
  }

  setDraftEnabled(key: string, value: boolean) {
    this.drafts.update((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { enabled: false, message: '' }),
        enabled: !!value,
      },
    }));
  }

  setDraftMessage(key: string, value: string) {
    this.drafts.update((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || { enabled: false, message: '' }),
        message: String(value ?? ''),
      },
    }));
  }

  isDirty(key: string) {
    const original = this.flags().find((f) => f.key === key);
    const draft = this.drafts()[key];
    if (!original || !draft) return false;
    const draftMessage = draft.message.trim();
    const originalMessage = (original.message ?? '').trim();
    return draft.enabled !== original.enabled || draftMessage !== originalMessage;
  }

  resetDraft(key: string) {
    const original = this.flags().find((f) => f.key === key);
    if (!original) return;
    this.drafts.update((prev) => ({
      ...prev,
      [key]: {
        enabled: !!original.enabled,
        message: original.message ?? '',
      },
    }));
  }

  isSaving(key: string) {
    return !!this.savingByKey()[key];
  }

  async saveFlag(key: string) {
    const original = this.flags().find((f) => f.key === key);
    const draft = this.drafts()[key];
    if (!original || !draft) return;
    if (!this.isDirty(key)) return;

    const message = draft.message.trim();

    this.savingByKey.update((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await firstValueFrom(
        this.api.putPrivate<{ data: { key: string; enabled: boolean; message: string | null; updated_at: string } }>(
          `/feature-flags/pages/${encodeURIComponent(key)}`,
          {
            enabled: !!draft.enabled,
            message: message || null,
          }
        )
      );

      const updated = res?.data;
      if (updated) {
        this.flags.update((prev) =>
          prev.map((f) =>
            f.key !== key
              ? f
              : {
                  ...f,
                  enabled: !!updated.enabled,
                  message: updated.message,
                  updated_at: updated.updated_at || f.updated_at,
                }
          )
        );
      } else {
        await this.fetchFlags();
      }

      this.resetDraft(key);
      this.swal.success('สำเร็จ', 'บันทึกสถานะหน้าเรียบร้อยแล้ว');
    } catch (err: any) {
      const errorMessage = err?.error?.message || 'ไม่สามารถบันทึกข้อมูลได้';
      this.swal.error('แจ้งเตือน', errorMessage);
    } finally {
      this.savingByKey.update((prev) => ({ ...prev, [key]: false }));
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

  shortUuid(value: string | null | undefined) {
    const raw = String(value ?? '').trim();
    if (!raw) return '-';
    if (raw.length <= 8) return raw;
    return `${raw.slice(0, 4)}…${raw.slice(-4)}`;
  }
}
