import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectInputComponent, SelectOption } from '../../../shared/form/select-input.component';
import { TextInputComponent } from '../../../shared/form/text-input.component';

export type RoleOption = { id: string; name: string };

export type UserFormModel = {
  display_name: string;
  email: string;
  password: string;
  confirmPassword?: string;
  role: string;
  branch?: string;
  teams: string[]; // role ids
};

@Component({
  selector: 'app-user-form-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, TextInputComponent, SelectInputComponent],
  template: `
    <div class="fixed inset-0 z-[2100] isolate">
      <div
        class="absolute inset-0 bg-slate-950/55 opacity-0 transition-opacity duration-300 ease-out motion-reduce:transition-none"
        [class.opacity-100]="open"
        (click)="close.emit()"></div>

      <div class="absolute inset-y-0 right-0 w-full max-w-md sm:max-w-lg">
        <div
          role="dialog"
          aria-modal="true"
          class="h-full w-full bg-white shadow-xl ring-1 ring-slate-900/10 flex flex-col transform-gpu [will-change:transform] [contain:layout_paint] transition-transform duration-300 ease-out motion-reduce:transition-none translate-x-full"
          [class.translate-x-0]="open"
          [class.translate-x-full]="!open">
          <div class="px-5 py-4 sm:px-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-white">
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-center gap-3">
                <div>
                  <h3 class="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">{{ title }}</h3>
                  <p *ngIf="subtitle" class="text-xs sm:text-sm text-slate-500">{{ subtitle }}</p>
                </div>
              </div>
              <button
                type="button"
                (click)="close.emit()"
                class="rounded-xl p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="ปิด">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fill-rule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clip-rule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto">
            <form [id]="formId" class="p-5 sm:p-6 space-y-6" (ngSubmit)="submit.emit()">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                @if (showAvatarUpload) {
                  <div class="md:col-span-2">
                    <label class="block text-sm font-semibold text-slate-800">รูปโปรไฟล์</label>
                    <div class="mt-2 flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div
                        class="h-16 w-16 overflow-hidden rounded-full ring-2 ring-white shadow-sm flex items-center justify-center text-lg font-bold text-white"
                        [ngClass]="avatarColor">
                        @if (avatarUrl) {
                          <img [src]="avatarUrl" class="h-full w-full object-cover" />
                        } @else {
                          {{ avatarInitial }}
                        }
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="text-sm font-semibold text-slate-800">อัปโหลดรูปโปรไฟล์</p>
                        <p class="text-xs text-slate-500">รองรับ jpg, png, webp ขนาดไม่เกิน 5MB</p>
                      </div>
                      <button
                        type="button"
                        class="inline-flex h-[42px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                        [disabled]="avatarUploading || loading"
                        (click)="chooseAvatar.emit()">
                        {{ avatarUploading ? 'กำลังอัปโหลด...' : 'เปลี่ยนรูป' }}
                      </button>
                    </div>

                    @if (userId || userStatus || userLevel || userBranch || userTeams.length || userLastLogin) {
                      <div class="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
                        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">ข้อมูลผู้ใช้งาน</p>
                        <div class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <p class="text-[11px] font-semibold text-slate-400">สถานะ</p>
                            <p class="mt-1 text-sm font-semibold text-slate-800">{{ userStatus || '-' }}</p>
                          </div>
                          <div>
                            <p class="text-[11px] font-semibold text-slate-400">ระดับสิทธิ์</p>
                            <p class="mt-1 text-sm font-semibold text-slate-800">{{ userLevel || '-' }}</p>
                          </div>
                          <div>
                            <p class="text-[11px] font-semibold text-slate-400">สาขา</p>
                            <p class="mt-1 text-sm font-semibold text-slate-800">{{ userBranch || '-' }}</p>
                          </div>
                          <div>
                            <p class="text-[11px] font-semibold text-slate-400">เข้าใช้งานล่าสุด</p>
                            <p class="mt-1 text-sm font-semibold text-slate-800">{{ userLastLogin || '-' }}</p>
                          </div>
                          <div class="sm:col-span-2">
                            <p class="text-[11px] font-semibold text-slate-400">ทีม</p>
                            @if (userTeams.length) {
                              <div class="mt-2 flex flex-wrap gap-2">
                                @for (team of userTeams; track team) {
                                  <span class="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                    {{ team }}
                                  </span>
                                }
                              </div>
                            } @else {
                              <p class="mt-1 text-sm font-semibold text-slate-800">-</p>
                            }
                          </div>
                          <div class="sm:col-span-2">
                            <p class="text-[11px] font-semibold text-slate-400">User ID</p>
                            <p class="mt-1 truncate font-mono text-xs text-slate-600">{{ userId || '-' }}</p>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                }

                <app-text-input
                  name="display_name"
                  [(ngModel)]="form.display_name"
                  [required]="true"
                  label="ชื่อ-นามสกุล"
                  placeholder="ชื่อผู้ใช้งาน"
                  autocomplete="name">
                </app-text-input>

                <app-text-input
                  name="email"
                  [(ngModel)]="form.email"
                  [required]="true"
                  type="email"
                  label="อีเมล"
                  placeholder="example@notify.com"
                  autocomplete="email">
                </app-text-input>

                @if (showPasswordFields) {
                  <app-text-input
                    name="password"
                    [(ngModel)]="form.password"
                    [required]="passwordRequired"
                    type="password"
                    label="รหัสผ่าน"
                    placeholder="ตั้งรหัสผ่าน"
                    autocomplete="new-password">
                  </app-text-input>

                  <app-text-input
                    name="confirmPassword"
                    [(ngModel)]="form.confirmPassword"
                    [required]="passwordRequired"
                    type="password"
                    label="ยืนยันรหัสผ่าน"
                    placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                    autocomplete="new-password">
                  </app-text-input>
                }
              </div>

              <div class="grid grid-cols-1 gap-3">
                <label class="block text-sm font-semibold text-slate-800">ระดับสิทธิ์</label>
                <select
                  [(ngModel)]="form.role"
                  name="role"
                  class="w-full h-[42px] rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition">
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>

                <app-text-input
                  name="branch"
                  [(ngModel)]="form.branch"
                  label="สาขา"
                  placeholder="เช่น ATC"
                  autocomplete="organization"
                  inputClass="h-[42px]">
                </app-text-input>

                <div class="space-y-1.5">
                  <label class="block text-sm font-semibold text-slate-800">ทีม</label>
                  <div class="space-y-2">
                    <div class="flex flex-wrap gap-2 min-h-7">
                      @for (teamId of form.teams; track teamId) {
                        <span
                          class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 text-xs border border-primary-200">
                          {{ roleName(teamId) }}
                          <button
                            type="button"
                            (click)="removeTeam(teamId)"
                            class="rounded-full px-1 text-primary-500 hover:text-primary-800 hover:bg-primary-100">
                            ×
                          </button>
                        </span>
                      } @empty {
                        <span class="text-xs text-slate-500">ยังไม่ได้เลือกทีม</span>
                      }
                    </div>

                    <div class="flex items-center gap-2">
                      <app-select-input
                        class="flex-1"
                        [(ngModel)]="selectedTeamId"
                        name="selectedTeam"
                        [options]="availableTeamOptions()"
                        placeholder="เลือกทีม"
                        emptyLabel="ไม่มีทีมให้เลือก"
                        [selectClass]="'h-[42px]'">
                      </app-select-input>
                      <button
                        type="button"
                        class="h-[42px] px-3.5 text-sm font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-60"
                        [disabled]="!selectedTeamId"
                        (click)="addTeam()">
                        เพิ่มทีม
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              @if (errorMessage) {
                <div class="text-sm text-rose-800 bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2.5">
                  {{ errorMessage }}
                </div>
              }

              <div class="pb-2"></div>
            </form>
          </div>

          <div class="px-5 sm:px-6 py-4 border-t border-slate-100 bg-white">
            <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                (click)="close.emit()"
                class="px-4 py-2.5 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition">
                ยกเลิก
              </button>
              <button
                type="submit"
                [attr.form]="formId"
                [disabled]="loading"
                class="px-4 py-2.5 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-lg shadow-primary-200 transition disabled:opacity-60">
                <span *ngIf="!loading; else submitting">{{ submitLabel }}</span>
                <ng-template #submitting>กำลังบันทึก...</ng-template>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class UserFormDrawerComponent {
  @Input({ required: true }) open = false;
  @Input({ required: true }) form!: UserFormModel;
  @Input() roleOptions: ReadonlyArray<RoleOption> = [];

  @Input() title = 'เพิ่มผู้ใช้งานใหม่';
  @Input() subtitle = '';
  @Input() submitLabel = 'บันทึก';
  @Input() loading = false;
  @Input() errorMessage = '';
  @Input() formId = 'user-form';

  @Input() showPasswordFields = true;
  @Input() passwordRequired = true;
  @Input() showAvatarUpload = false;
  @Input() avatarUrl: string | null = null;
  @Input() avatarColor = 'bg-slate-500';
  @Input() avatarInitial = 'U';
  @Input() avatarUploading = false;
  @Input() userStatus = '';
  @Input() userLevel = '';
  @Input() userBranch = '';
  @Input() userTeams: string[] = [];
  @Input() userLastLogin = '';
  @Input() userId = '';

  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<void>();
  @Output() chooseAvatar = new EventEmitter<void>();

  selectedTeamId = '';

  roleName(teamId: string) {
    return this.roleOptions.find((r) => r.id === teamId)?.name || teamId;
  }

  availableTeamOptions = () => {
    const chosen = new Set(this.form?.teams || []);
    const remaining = (this.roleOptions || []).filter((r) => !chosen.has(r.id));
    return remaining.map((r) => ({ value: r.id, label: r.name } satisfies SelectOption));
  };

  addTeam() {
    const next = (this.selectedTeamId || '').trim();
    if (!next) return;
    if (!Array.isArray(this.form.teams)) this.form.teams = [];
    if (!this.form.teams.includes(next)) this.form.teams.push(next);
    this.selectedTeamId = '';
  }

  removeTeam(teamId: string) {
    if (!Array.isArray(this.form.teams)) return;
    this.form.teams = this.form.teams.filter((id) => id !== teamId);
  }
}
