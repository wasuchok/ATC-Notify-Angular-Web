import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { User } from './user.model';

@Component({
  selector: 'app-user-view-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (visible && user) {
      <div class="fixed inset-0 z-[1800] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" (click)="close.emit()"></div>
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div class="relative h-32 bg-gradient-to-r from-primary-600 to-primary-400">
            <button (click)="close.emit()" class="absolute top-4 right-4 text-white/80 hover:text-white transition-colors bg-black/10 hover:bg-black/20 rounded-full p-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
          <div class="px-6 pb-6">
            <div class="relative -mt-12 mb-4 flex justify-center">
              <div class="w-24 h-24 overflow-hidden rounded-full border-4 border-white shadow-md flex items-center justify-center text-3xl font-bold text-white" [ngClass]="user.avatarColor">
                @if (user.avatarUrl) {
                  <img [src]="user.avatarUrl" class="h-full w-full object-cover" />
                } @else {
                  {{ user.name.charAt(0) }}
                }
              </div>
            </div>

            <div class="text-center mb-6">
              <h3 class="text-xl font-bold text-slate-800">{{ user.name }}</h3>
              <p class="text-slate-500 font-medium">{{ user.email }}</p>
              <div class="mt-2 flex justify-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold border" [ngClass]="user.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-600 border-slate-200'">
                  {{ user.status === 'Active' ? 'ใช้งานอยู่' : 'ระงับการใช้งาน' }}
                </span>
              </div>
            </div>

            <div class="space-y-4">
              <div>
                <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Roles</h4>
                @if (user.roles.length) {
                  <div class="flex flex-wrap gap-2">
                    @for (role of user.roles; track role) {
                      <span class="px-3 py-1 rounded-full text-xs font-semibold border" [ngClass]="roleStyleFn(role)">
                        {{ role }}
                      </span>
                    }
                  </div>
                } @else {
                  <div class="px-3 py-2 rounded-lg bg-slate-50 text-slate-500 text-xs border border-slate-200">
                    ยังไม่ได้กำหนด Role
                  </div>
                }
              </div>

              <div class="pt-4 border-t border-slate-100 flex justify-between text-sm">
                <span class="text-slate-500">เข้าสู่ระบบล่าสุด</span>
                <span class="font-semibold text-slate-700">{{ user.lastLogin }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class UserViewModalComponent {
  @Input() visible = false;
  @Input() user: User | null = null;
  @Input() roleStyleFn: (role: string) => string = () => '';

  @Output() close = new EventEmitter<void>();
}
