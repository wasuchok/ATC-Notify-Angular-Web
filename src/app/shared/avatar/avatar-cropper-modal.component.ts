import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';

@Component({
  selector: 'app-avatar-cropper-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ImageCropperComponent],
  template: `
    @if (file) {
      <div class="fixed inset-0 z-[4700]">
        <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" (click)="close.emit()"></div>
        <div class="absolute inset-0 flex items-center justify-center p-4">
          <div class="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 class="text-base font-bold text-slate-900">{{ title }}</h3>
                <p class="text-xs text-slate-500">ครอปภาพสี่เหลี่ยมจัตุรัสก่อนอัปโหลด</p>
              </div>
              <button
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                (click)="close.emit()">
                ✕
              </button>
            </div>

            <div class="grid gap-0 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div class="min-h-[420px] bg-slate-950">
                <image-cropper
                  [imageFile]="file"
                  [maintainAspectRatio]="true"
                  [aspectRatio]="1"
                  [resizeToWidth]="1024"
                  [onlyScaleDown]="true"
                  [transform]="{ scale: zoom() }"
                  format="png"
                  (imageCropped)="onCropped($event)"></image-cropper>
              </div>

              <div class="border-t border-slate-100 bg-slate-50/70 p-5 lg:border-l lg:border-t-0">
                <div class="rounded-2xl border border-slate-200 bg-white p-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Preview</p>
                  <div class="mt-4 flex justify-center">
                    <div class="h-36 w-36 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-md">
                      @if (previewUrl()) {
                        <img [src]="previewUrl()!" class="h-full w-full object-cover" />
                      } @else {
                        <div class="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-400">No preview</div>
                      }
                    </div>
                  </div>
                </div>

                <div class="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <label class="block text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Zoom</label>
                  <input
                    type="range"
                    min="1"
                    max="2.5"
                    step="0.05"
                    [ngModel]="zoom()"
                    (ngModelChange)="zoom.set(asNumber($event))"
                    class="mt-3 w-full accent-slate-900" />
                </div>

                <div class="mt-4 flex gap-2">
                  <button
                    type="button"
                    class="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    (click)="close.emit()">
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    class="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    [disabled]="!croppedBlob()"
                    (click)="confirmCrop()">
                    ใช้รูปนี้
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class AvatarCropperModalComponent {
  @Input() file: File | null = null;
  @Input() title = 'รูปโปรไฟล์';
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<Blob>();

  zoom = signal(1);
  previewUrl = signal<string | null>(null);
  croppedBlob = signal<Blob | null>(null);

  onCropped(event: ImageCroppedEvent) {
    if (event.blob) {
      this.croppedBlob.set(event.blob);
    }
    if (event.objectUrl) {
      this.previewUrl.set(event.objectUrl);
    }
  }

  confirmCrop() {
    const blob = this.croppedBlob();
    if (!blob) return;
    this.confirm.emit(blob);
  }

  asNumber(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 1;
  }
}
