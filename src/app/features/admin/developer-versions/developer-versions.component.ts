import { CommonModule } from '@angular/common';
import { Component, VERSION, computed, signal } from '@angular/core';

type VersionManifest = {
  name: string;
  version: string;
  packageManager: string;
  generatedAt: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

@Component({
  selector: 'app-developer-versions',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="font-sarabun space-y-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="text-2xl font-bold text-slate-900 tracking-tight">เวอร์ชั่นนักพัฒนา</h2>
          <p class="text-slate-500 text-sm mt-1">ตรวจสอบ Angular และเวอร์ชั่นแพ็กเกจที่ใช้งานในระบบ</p>
        </div>
        <button
          type="button"
          class="px-3 py-2 rounded-2xl border border-slate-200 text-xs text-slate-700 hover:bg-slate-50"
          (click)="loadManifest()">
          รีเฟรช
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div class="bg-white border border-slate-200 rounded-2xl p-4">
          <div class="flex items-center gap-3">
            <img src="assets/angular-logo.svg" alt="Angular Logo" class="w-9 h-9 rounded-lg" />
            <div>
              <p class="text-[11px] font-semibold text-slate-500">Angular Runtime</p>
              <p class="mt-1 text-lg font-bold text-slate-900">{{ angularVersion }}</p>
            </div>
          </div>
        </div>
        <div class="bg-white border border-slate-200 rounded-2xl p-4">
          <p class="text-[11px] font-semibold text-slate-500">App Version</p>
          <p class="mt-1 text-lg font-bold text-slate-900">{{ manifest()?.version || '-' }}</p>
        </div>
        <div class="bg-white border border-slate-200 rounded-2xl p-4">
          <p class="text-[11px] font-semibold text-slate-500">Generated At</p>
          <p class="mt-1 text-sm font-semibold text-slate-900">{{ generatedAtLabel() }}</p>
        </div>
      </div>

      @if (loading()) {
        <div class="bg-white border border-slate-200 rounded-2xl p-4 text-sm text-slate-500">กำลังโหลดข้อมูลเวอร์ชั่น...</div>
      } @else if (loadError()) {
        <div class="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-sm text-rose-700">
          {{ loadError() }}
        </div>
      } @else {
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div class="bg-white border border-slate-200 rounded-2xl p-4">
            <div class="flex items-center justify-between gap-3 mb-3">
              <p class="text-sm font-bold text-slate-900">Dependencies</p>
              <p class="text-xs text-slate-500">{{ dependencies().length }} รายการ</p>
            </div>
            <div class="max-h-[420px] overflow-auto border border-slate-100 rounded-xl">
              <table class="w-full text-xs">
                <thead class="sticky top-0 bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th class="px-3 py-2 text-left font-semibold text-slate-500">Package</th>
                    <th class="px-3 py-2 text-right font-semibold text-slate-500">Version</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of dependencies()" class="border-b border-slate-100 last:border-b-0">
                    <td class="px-3 py-2 font-mono text-slate-700">{{ item.name }}</td>
                    <td class="px-3 py-2 text-right text-slate-900 font-semibold">{{ item.version }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="bg-white border border-slate-200 rounded-2xl p-4">
            <div class="flex items-center justify-between gap-3 mb-3">
              <p class="text-sm font-bold text-slate-900">Dev Dependencies</p>
              <p class="text-xs text-slate-500">{{ devDependencies().length }} รายการ</p>
            </div>
            <div class="max-h-[420px] overflow-auto border border-slate-100 rounded-xl">
              <table class="w-full text-xs">
                <thead class="sticky top-0 bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th class="px-3 py-2 text-left font-semibold text-slate-500">Package</th>
                    <th class="px-3 py-2 text-right font-semibold text-slate-500">Version</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of devDependencies()" class="border-b border-slate-100 last:border-b-0">
                    <td class="px-3 py-2 font-mono text-slate-700">{{ item.name }}</td>
                    <td class="px-3 py-2 text-right text-slate-900 font-semibold">{{ item.version }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class DeveloperVersionsComponent {
  angularVersion = VERSION.full;
  loading = signal(false);
  loadError = signal('');
  manifest = signal<VersionManifest | null>(null);

  dependencies = computed(() => this.sortedEntries(this.manifest()?.dependencies));
  devDependencies = computed(() => this.sortedEntries(this.manifest()?.devDependencies));
  generatedAtLabel = computed(() => this.thaiDate(this.manifest()?.generatedAt ?? null));

  async ngOnInit() {
    await this.loadManifest();
  }

  async loadManifest() {
    this.loading.set(true);
    this.loadError.set('');
    try {
      const manifestUrl = new URL('assets/version-manifest.json', document.baseURI).toString();
      const res = await fetch(manifestUrl, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as VersionManifest;
      this.manifest.set(data);
    } catch {
      this.loadError.set('ไม่สามารถโหลดข้อมูลเวอร์ชั่นได้ กรุณาตรวจสอบไฟล์ assets/version-manifest.json');
      this.manifest.set(null);
    } finally {
      this.loading.set(false);
    }
  }

  private sortedEntries(source?: Record<string, string> | null) {
    return Object.entries(source ?? {})
      .map(([name, version]) => ({ name, version }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private thaiDate(iso: string | null) {
    if (!iso) return '-';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
}
