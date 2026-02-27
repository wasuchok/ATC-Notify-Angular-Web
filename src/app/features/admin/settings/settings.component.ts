import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="font-sarabun">
      <div class="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 items-start">
        <!-- Left pane (System Settings style) -->
        <aside class="bg-white rounded-3xl border border-slate-200 overflow-hidden lg:sticky lg:top-5">
          <div class="p-4 bg-slate-50/60 border-b border-slate-200">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <h1 class="text-lg font-bold text-slate-900">ตั้งค่า</h1>
                <p class="text-xs text-slate-500">เมนูผู้ดูแลระบบ</p>
              </div>
              <a routerLink="/admin/chat"
                class="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 flex-shrink-0"
                title="กลับไปแชท">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7 7-7" />
                </svg>
              </a>
            </div>

            <div class="relative mt-3">
              <span class="absolute inset-y-0 left-3 flex items-center text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 103.5 10.5a7.5 7.5 0 0013.15 6.15z" />
                </svg>
              </span>
              <input [ngModel]="query()" (ngModelChange)="query.set($event)"
                placeholder="ค้นหาเมนู..."
                class="w-full pl-10 pr-3 py-2.5 rounded-2xl border border-slate-200 bg-white focus:border-slate-300 focus:ring-4 focus:ring-slate-200 outline-none transition-all text-sm" />
            </div>
          </div>

          <div class="p-2">
            <div *ngFor="let group of groupedItems()">
              <p class="px-3 pt-3 pb-1 text-[11px] font-semibold text-slate-400 tracking-wide uppercase">
                {{ group.label }}
              </p>
              <div class="space-y-1">
                <a *ngFor="let item of group.items"
                  [routerLink]="item.path"
                  routerLinkActive
                  #rla="routerLinkActive"
                  class="flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-colors"
                  [class.bg-slate-100]="rla.isActive"
                  [class.border-slate-200]="rla.isActive"
                  [class.text-slate-900]="rla.isActive"
                  [class.bg-white]="!rla.isActive"
                  [class.border-transparent]="!rla.isActive"
                  [class.text-slate-700]="!rla.isActive"
                  [class.hover:bg-slate-50]="!rla.isActive"
                  [class.hover:border-slate-200]="!rla.isActive">

                  <span class="w-9 h-9 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" [attr.d]="item.icon" />
                    </svg>
                  </span>

                  <div class="min-w-0">
                    <p class="text-sm font-semibold truncate">{{ item.label }}</p>
                    <p class="text-[11px] text-slate-500 truncate">{{ item.description }}</p>
                  </div>

                  <span class="ml-auto text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </a>
              </div>
            </div>

            <div class="mt-3 px-3 pb-3 text-[11px] text-slate-500">
              {{ filteredItems().length }} รายการ • พิมพ์เพื่อค้นหาเมนู
            </div>
          </div>
        </aside>

        <!-- Right pane -->
        <section class="min-w-0">
          <router-outlet></router-outlet>
        </section>
      </div>
    </div>
  `,
})
export class SettingsComponent {
  query = signal('');

  private readonly items = [
    {
      path: 'dashboard',
      label: 'ภาพรวมระบบ',
      description: 'Dashboard & สถิติ',
      icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
    },
    {
      path: 'users',
      label: 'จัดการผู้ใช้งาน',
      description: 'สิทธิ์และบัญชีผู้ใช้',
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    },
    {
      path: 'teams',
      label: 'จัดการทีม',
      description: 'Roles & สมาชิกทีม',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a4 4 0 11-8 0 4 4 0 018 0z',
    },
    {
      path: 'channels',
      label: 'จัดการแชนแนล',
      description: 'สร้าง/สิทธิ์/ลบแชนแนล',
      icon: 'M8 10h8M8 14h5m-8 4h10l5 3V6a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    },
    {
      path: 'webhooks',
      label: 'Webhook',
      description: 'สร้าง Webhook สำหรับยิงเข้าแชนแนล',
      icon: 'M4 12a8 8 0 018-8v3m0 10v3a8 8 0 01-8-8zm16 0a8 8 0 01-8 8v-3m0-10V4a8 8 0 018 8z',
    },
    {
      path: 'feature-flags',
      label: 'Feature Flags',
      description: 'เปิด/ปิดหน้าการใช้งานจาก Backend',
      icon: 'M9 12l2 2 4-4m5-2a9 9 0 11-18 0 9 9 0 0118 0z',
    },
  ];

  filteredItems = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.items;
    return this.items.filter((i) => {
      const hay = `${i.label} ${i.description}`.toLowerCase();
      return hay.includes(q);
    });
  });

  groupedItems = computed(() => {
    const items = this.filteredItems();
    const dashboard = items.filter((i) => i.path === 'dashboard');
    const people = items.filter((i) => i.path === 'users' || i.path === 'teams');
    const channels = items.filter((i) => i.path === 'channels');
    const integrations = items.filter((i) => i.path === 'webhooks');
    const system = items.filter((i) => i.path === 'feature-flags');

    const groups: Array<{ label: string; items: typeof items }> = [];
    if (dashboard.length) groups.push({ label: 'ทั่วไป', items: dashboard });
    if (people.length) groups.push({ label: 'ผู้ใช้และทีม', items: people });
    if (channels.length) groups.push({ label: 'แชนแนล', items: channels });
    if (integrations.length) groups.push({ label: 'การเชื่อมต่อ', items: integrations });
    if (system.length) groups.push({ label: 'ระบบ', items: system });
    return groups;
  });
}
