import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { SwalService } from '../../../shared/swal/swal.service';

type RegisterKeyStatus = 'active' | 'expired';

type RegisterKey = {
  id: string;
  invite_code: string;
  expires_at: string;
  is_used: boolean;
  used_at: string | null;
  used_by: string | null;
  created_by: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  status: RegisterKeyStatus;
};

@Component({
  selector: 'app-register-key-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="font-sarabun space-y-5">
      <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold text-slate-900 tracking-tight">รหัสคำเชิญสมัครสมาชิก</h2>
          <p class="text-sm text-slate-500 mt-1">สร้างรหัสคำเชิญ 6 หลัก และกำหนดวันหมดอายุสำหรับหน้า Register</p>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="px-3 py-2 rounded-2xl border border-slate-200 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            [disabled]="loading()"
            (click)="fetchKeys()">
            {{ loading() ? 'กำลังโหลด...' : 'รีเฟรช' }}
          </button>
          <button
            type="button"
            class="px-3 py-2 rounded-2xl border border-rose-200 text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-60"
            [disabled]="loading() || purging()"
            (click)="purgeExpiredUnused()">
            {{ purging() ? 'กำลังลบ...' : 'ลบที่หมดอายุ' }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 items-start">
        <section class="bg-white border border-slate-200 rounded-3xl p-5 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">รหัสคำเชิญ (ไม่บังคับ)</label>
              <input
                [ngModel]="inviteCodeInput"
                (ngModelChange)="onInviteCodeChange($event)"
                maxlength="6"
                inputmode="numeric"
                placeholder="ปล่อยว่างเพื่อสุ่ม"
                class="w-full px-3 py-2.5 rounded-2xl border border-slate-200 bg-white text-center tracking-[0.35em] font-semibold text-slate-900 outline-none focus:ring-4 focus:ring-slate-200 focus:border-slate-300" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">วันหมดอายุ</label>
              <input
                type="datetime-local"
                [ngModel]="expiresAtInput"
                (ngModelChange)="onExpiresAtChange($event)"
                class="w-full px-3 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm outline-none focus:ring-4 focus:ring-slate-200 focus:border-slate-300" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">โน้ต (ไม่บังคับ)</label>
              <input
                [ngModel]="noteInput"
                (ngModelChange)="onNoteChange($event)"
                maxlength="255"
                placeholder="เช่น onboarding ทีม Sales"
                class="w-full px-3 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm outline-none focus:ring-4 focus:ring-slate-200 focus:border-slate-300" />
            </div>
          </div>

          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p class="text-xs text-slate-500">
              ถ้าไม่ใส่รหัส ระบบจะสุ่มรหัสตัวเลข 6 หลักให้อัตโนมัติ
            </p>
            <button
              type="button"
              class="px-4 py-2.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              [disabled]="creating()"
              (click)="createKey()">
              {{ creating() ? 'กำลังสร้าง...' : 'สร้างรหัสคำเชิญ' }}
            </button>
          </div>
        </section>

        <aside class="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-3">
          <div class="bg-white border border-slate-200 rounded-2xl p-4">
            <p class="text-xs font-semibold text-slate-500">คีย์ที่ใช้งานได้</p>
            <p class="mt-1 text-2xl font-bold text-emerald-600 tabular-nums">{{ activeCount() }}</p>
          </div>
          <div class="bg-white border border-slate-200 rounded-2xl p-4">
            <p class="text-xs font-semibold text-slate-500">คีย์ทั้งหมด</p>
            <p class="mt-1 text-2xl font-bold text-slate-800 tabular-nums">{{ totalCount() }}</p>
          </div>
          <div class="bg-white border border-slate-200 rounded-2xl p-4">
            <p class="text-xs font-semibold text-slate-500">คีย์ที่หมดอายุ</p>
            <p class="mt-1 text-2xl font-bold text-rose-600 tabular-nums">{{ expiredCount() }}</p>
          </div>
        </aside>
      </div>

      <div class="bg-white border border-slate-200 rounded-3xl overflow-hidden">
        <div class="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p class="text-sm font-bold text-slate-900">รายการรหัสคำเชิญ</p>
            <p class="text-xs text-slate-500">ทั้งหมด {{ filteredKeys().length }} รายการ</p>
          </div>
          <input
            [ngModel]="query()"
            (ngModelChange)="onQueryChange($event)"
            placeholder="ค้นหารหัส หรือ note..."
            class="w-full sm:w-64 px-3 py-2 rounded-2xl border border-slate-200 bg-white text-sm outline-none focus:ring-4 focus:ring-slate-200 focus:border-slate-300" />
        </div>

        @if (loading()) {
          <div class="p-6 text-sm text-slate-500">กำลังโหลดรายการ...</div>
        } @else if (filteredKeys().length === 0) {
          <div class="p-6 text-sm text-slate-500">ยังไม่มีรหัสคำเชิญ</div>
        } @else {
          <div class="hidden lg:block overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead>
                <tr class="bg-slate-50 text-slate-500 text-xs">
                  <th class="py-3 px-4 text-left">รหัส</th>
                  <th class="py-3 px-4 text-left">สถานะ</th>
                  <th class="py-3 px-4 text-left">หมดอายุ</th>
                  <th class="py-3 px-4 text-left">สร้างเมื่อ</th>
                  <th class="py-3 px-4 text-left">โน้ต</th>
                  <th class="py-3 px-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of filteredKeys()" class="border-t border-slate-100">
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-2">
                      <span class="font-mono text-base tracking-[0.25em] text-slate-900">{{ item.invite_code }}</span>
                      <button
                        type="button"
                        class="px-2 py-1 rounded-xl border border-slate-200 text-[11px] text-slate-700 hover:bg-slate-50"
                        (click)="copyCode(item.invite_code)">
                        คัดลอก
                      </button>
                    </div>
                  </td>
                  <td class="py-3 px-4">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold border" [class]="statusClass(item.status)">
                      {{ statusLabel(item.status) }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-slate-700">{{ thaiDate(item.expires_at) }}</td>
                  <td class="py-3 px-4 text-slate-600">{{ thaiDate(item.created_at) }}</td>
                  <td class="py-3 px-4 text-slate-600">{{ item.note || '-' }}</td>
                  <td class="py-3 px-4 text-right">
                    <button
                      type="button"
                      class="px-3 py-1.5 rounded-xl border border-rose-200 text-xs text-rose-700 hover:bg-rose-50"
                      (click)="deleteKey(item)">
                      ลบ
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="lg:hidden divide-y divide-slate-100">
            <div *ngFor="let item of filteredKeys()" class="p-4 space-y-3">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-mono text-base font-semibold tracking-[0.2em] text-slate-900">{{ item.invite_code }}</p>
                  <p class="text-xs text-slate-500 mt-1">หมดอายุ: {{ thaiDate(item.expires_at) }}</p>
                </div>
                <span class="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold border" [class]="statusClass(item.status)">
                  {{ statusLabel(item.status) }}
                </span>
              </div>
              <p class="text-xs text-slate-600">สร้างเมื่อ: {{ thaiDate(item.created_at) }}</p>
              <p class="text-xs text-slate-600">โน้ต: {{ item.note || '-' }}</p>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 hover:bg-slate-50"
                  (click)="copyCode(item.invite_code)">
                  คัดลอก
                </button>
                <button
                  type="button"
                  class="px-3 py-1.5 rounded-xl border border-rose-200 text-xs text-rose-700 hover:bg-rose-50"
                  (click)="deleteKey(item)">
                  ลบ
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class RegisterKeyManagementComponent {
  keys = signal<RegisterKey[]>([]);
  loading = signal(false);
  creating = signal(false);
  purging = signal(false);
  query = signal('');

  inviteCodeInput = '';
  expiresAtInput = '';
  noteInput = '';

  filteredKeys = computed(() => {
    const q = this.query().trim().toLowerCase();
    const list = this.keys();
    if (!q) return list;
    return list.filter((item) => {
      const hay = `${item.invite_code} ${item.note ?? ''} ${item.status}`.toLowerCase();
      return hay.includes(q);
    });
  });

  activeCount = computed(() => this.keys().filter((item) => item.status === 'active').length);
  totalCount = computed(() => this.keys().length);
  expiredCount = computed(() => this.keys().filter((item) => item.status === 'expired').length);

  constructor(
    private readonly api: ApiService,
    private readonly swal: SwalService
  ) {
    this.resetDefaultExpiresAt();
  }

  async ngOnInit() {
    await this.fetchKeys();
  }

  onInviteCodeChange(value: string) {
    this.inviteCodeInput = String(value ?? '').replace(/\D/g, '').slice(0, 6);
  }

  onExpiresAtChange(value: unknown) {
    this.expiresAtInput = String(value ?? '');
  }

  onNoteChange(value: unknown) {
    this.noteInput = String(value ?? '');
  }

  onQueryChange(value: unknown) {
    this.query.set(String(value ?? ''));
  }

  async fetchKeys() {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(this.api.getPrivate<{ data: RegisterKey[] }>('/register-keys'));
      const list = Array.isArray(res?.data) ? res.data : [];
      this.keys.set(list.map((item) => this.normalizeKey(item)));
    } catch (err: any) {
      const message = err?.error?.message || 'ไม่สามารถโหลดรายการรหัสคำเชิญได้';
      this.swal.error('แจ้งเตือน', message);
      this.keys.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  async createKey() {
    if (this.creating()) return;

    const inviteCode = this.inviteCodeInput.trim();
    if (inviteCode && !/^\d{6}$/.test(inviteCode)) {
      await this.swal.warning('รูปแบบไม่ถูกต้อง', 'รหัสคำเชิญต้องเป็นตัวเลข 6 หลัก');
      return;
    }

    const expiresAt = this.parseDateTimeLocal(this.expiresAtInput);
    if (!expiresAt) {
      await this.swal.warning('ข้อมูลไม่ครบถ้วน', 'กรุณาเลือกวันหมดอายุให้ถูกต้อง');
      return;
    }

    if (expiresAt.getTime() <= Date.now()) {
      await this.swal.warning('วันหมดอายุไม่ถูกต้อง', 'วันหมดอายุต้องมากกว่าเวลาปัจจุบัน');
      return;
    }

    this.creating.set(true);
    try {
      const res = await firstValueFrom(
        this.api.postPrivate<{ data: RegisterKey; message?: string }>('/register-keys', {
          invite_code: inviteCode || undefined,
          expires_at: expiresAt.toISOString(),
          note: this.noteInput.trim() || undefined,
        })
      );

      const created = res?.data ? this.normalizeKey(res.data) : null;
      if (created) {
        this.keys.update((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
      } else {
        await this.fetchKeys();
      }

      this.inviteCodeInput = '';
      this.noteInput = '';
      this.resetDefaultExpiresAt();
      await this.swal.success('สำเร็จ', `สร้างรหัสคำเชิญ ${created?.invite_code ?? ''} เรียบร้อย`);
    } catch (err: any) {
      const message = err?.error?.message || 'ไม่สามารถสร้างรหัสคำเชิญได้';
      await this.swal.error('แจ้งเตือน', message);
    } finally {
      this.creating.set(false);
    }
  }

  async deleteKey(item: RegisterKey) {
    const confirmed = await this.swal.question('ลบรหัสคำเชิญ', `ต้องการลบรหัส ${item.invite_code} ใช่หรือไม่?`);
    if (!confirmed) return;

    try {
      await firstValueFrom(this.api.deletePrivate(`/register-keys/${encodeURIComponent(item.id)}`));
      this.keys.update((prev) => prev.filter((k) => k.id !== item.id));
      await this.swal.success('สำเร็จ', 'ลบรหัสคำเชิญเรียบร้อย');
    } catch (err: any) {
      const message = err?.error?.message || 'ไม่สามารถลบรหัสคำเชิญได้';
      await this.swal.error('แจ้งเตือน', message);
    }
  }

  async purgeExpiredUnused() {
    const hasExpired = this.keys().some((item) => item.status === 'expired');
    if (!hasExpired) {
      await this.swal.info('ไม่มีข้อมูล', 'ยังไม่มีคีย์ที่หมดอายุ');
      return;
    }

    const confirmed = await this.swal.question(
      'ล้างคีย์หมดอายุ',
      'ต้องการลบคีย์ที่หมดอายุทั้งหมดใช่หรือไม่?'
    );
    if (!confirmed) return;

    this.purging.set(true);
    try {
      const res = await firstValueFrom(this.api.deletePrivate<{ data?: { deleted?: number } }>('/register-keys/expired'));
      const deleted = Number(res?.data?.deleted ?? 0);
      await this.fetchKeys();
      await this.swal.success('สำเร็จ', `ลบคีย์หมดอายุแล้ว ${deleted} รายการ`);
    } catch (err: any) {
      const message = err?.error?.message || 'ไม่สามารถลบคีย์หมดอายุได้';
      await this.swal.error('แจ้งเตือน', message);
    } finally {
      this.purging.set(false);
    }
  }

  async copyCode(code: string) {
    const value = String(code ?? '').trim();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      await this.swal.success('คัดลอกแล้ว', value);
    } catch {
      await this.swal.warning('คัดลอกไม่สำเร็จ', 'อุปกรณ์นี้ไม่รองรับ clipboard');
    }
  }

  statusLabel(status: RegisterKeyStatus) {
    if (status === 'expired') return 'หมดอายุ';
    return 'พร้อมใช้งาน';
  }

  statusClass(status: RegisterKeyStatus) {
    if (status === 'expired') return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }

  thaiDate(iso: string | null | undefined) {
    const raw = String(iso ?? '').trim();
    if (!raw) return '-';
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private normalizeKey(item: RegisterKey): RegisterKey {
    const status = item.status || this.computeStatus(item);
    return { ...item, status };
  }

  private computeStatus(item: Pick<RegisterKey, 'expires_at'>): RegisterKeyStatus {
    const expiresAt = new Date(item.expires_at);
    if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now()) return 'expired';
    return 'active';
  }

  private resetDefaultExpiresAt() {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    date.setHours(23, 59, 0, 0);
    this.expiresAtInput = this.toDateTimeLocal(date);
  }

  private toDateTimeLocal(date: Date) {
    const pad = (v: number) => String(v).padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const mi = pad(date.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }

  private parseDateTimeLocal(value: string) {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }
}
