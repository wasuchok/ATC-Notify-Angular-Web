import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { User } from './user.model';

@Component({
  selector: 'app-user-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="bg-white rounded-xl border border-slate-200 hover:border-primary-300 hover:shadow-lg hover:shadow-primary-100/50 transition-all duration-300 group relative flex flex-col h-full"
      [class.z-50]="dropdownOpen"
      [class.z-0]="!dropdownOpen">
      <div class="absolute top-3 right-3 z-10">
        <span class="flex h-2.5 w-2.5">
          <span
            class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            [ngClass]="user.status === 'Active' ? 'bg-green-400' : 'bg-slate-300'"></span>
          <span
            class="relative inline-flex rounded-full h-2.5 w-2.5"
            [ngClass]="user.status === 'Active' ? 'bg-green-500' : 'bg-slate-400'"></span>
        </span>
      </div>

      <div class="p-5 flex flex-col items-center flex-grow">
        <div
          class="w-14 h-14 overflow-hidden rounded-full flex items-center justify-center text-lg font-bold text-white mb-3 shadow-sm relative ring-2 ring-white"
          [ngClass]="user.avatarColor">
          @if (user.avatarUrl) {
            <img [src]="user.avatarUrl" class="h-full w-full object-cover" />
          } @else {
            {{ user.name.charAt(0) }}
          }
        </div>

        <h3 class="text-sm font-bold text-slate-800 text-center mb-0.5">{{ user.name }}</h3>
        <p class="text-slate-500 text-[11px] mb-4 font-medium">{{ user.email }}</p>

        <div class="w-full mt-3">
          <div class="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
            <span class="text-[11px] font-semibold text-slate-500">ระดับสิทธิ์</span>
            <span class="px-2.5 py-1 rounded-full text-[11px] font-bold border"
                  [ngClass]="levelClass">
              {{ levelLabel }}
            </span>
          </div>
        </div>
      </div>

      <div class="px-4 py-3 border-t border-slate-100 flex justify-between items-center gap-2 bg-slate-50/30 rounded-b-xl">
        <button
          (click)="viewProfile.emit(user)"
          class="flex-1 py-1.5 rounded text-slate-500 text-[11px] font-semibold hover:bg-white hover:text-slate-700 hover:shadow-sm border border-transparent hover:border-slate-200 transition-all">
          โปรไฟล์
        </button>
        <div class="w-px h-4 bg-slate-200"></div>
        <button
          (click)="editUser.emit(user)"
          class="flex-1 py-1.5 rounded text-primary-600 text-[11px] font-semibold hover:bg-white hover:text-primary-700 hover:shadow-sm border border-transparent hover:border-primary-100 transition-all">
          แก้ไข
        </button>
      </div>
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar {
      width: 4px;
      height: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 2px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }
  `]
})
export class UserCardComponent {
  @Input({ required: true }) user!: User;
  @Input() activeDropdownId: string | number | null = null;
  @Input() availableRoles: string[] = [];
  @Input() roleStyleFn: (role: string) => string = () => '';
  @Input() roleDotFn: (role: string) => string = () => '';

  @Output() viewProfile = new EventEmitter<User>();
  @Output() editUser = new EventEmitter<User>();
  @Output() addRole = new EventEmitter<{ user: User; role: string }>();
  @Output() removeRole = new EventEmitter<{ user: User; role: string }>();
  @Output() toggleDropdown = new EventEmitter<string | number>();
  @Output() closeDropdown = new EventEmitter<void>();

  get dropdownOpen(): boolean {
    return String(this.activeDropdownId) === String(this.user?.id);
  }

  get levelLabel(): string {
    const level = this.user?.level || 'employee';
    return level === 'admin' ? 'Admin' : 'Employee';
  }

  get levelClass(): string {
    const level = this.user?.level || 'employee';
    return level === 'admin'
      ? 'bg-rose-50 text-rose-700 border-rose-200'
      : 'bg-blue-50 text-blue-700 border-blue-200';
  }
}
