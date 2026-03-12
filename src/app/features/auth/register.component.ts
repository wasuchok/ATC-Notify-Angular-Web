import { CommonModule } from '@angular/common';
import { Component, ElementRef, QueryList, ViewChild, ViewChildren, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { SeoService } from '../../core/services/seo.service';
import { AvatarCropperModalComponent } from '../../shared/avatar/avatar-cropper-modal.component';
import { SwalService } from '../../shared/swal/swal.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AvatarCropperModalComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  readonly inviteLength = 6;
  readonly inviteIndexes = [0, 1, 2, 3, 4, 5];

  @ViewChildren('inviteDigit') private inviteInputRefs?: QueryList<ElementRef<HTMLInputElement>>;
  @ViewChild('avatarInput') private avatarInput?: ElementRef<HTMLInputElement>;
  private inviteValidationSequence = 0;

  displayName = '';
  email = '';
  branch = '';
  avatarPreviewUrl = signal<string | null>(null);
  avatarCropSourceFile = signal<File | null>(null);
  avatarFile = signal<File | null>(null);
  inviteCodeDigits: string[] = this.inviteIndexes.map(() => '');
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;
  loading = signal(false);
  inviteChecking = signal(false);
  inviteValid = signal<boolean | null>(null);
  inviteValidationMessage = signal('');
  inviteValidationReason = signal<string | null>(null);
  inviteValidatedCode = signal('');

  constructor(
    private readonly api: ApiService,
    private readonly router: Router,
    private readonly seo: SeoService,
    private readonly swal: SwalService
  ) {
    this.seo.setPublicPage({
      title: 'ลงทะเบียน Anotix by Aoyama',
      description: 'ลงทะเบียนใช้งาน Anotix by Aoyama เพื่อเข้าถึงระบบแจ้งเตือนและการสื่อสารภายในองค์กร',
      path: '/register',
    });
  }

  get inviteCode(): string {
    return this.inviteCodeDigits.join('');
  }

  onInviteInput(index: number, event: Event) {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;

    const sanitized = input.value.replace(/\D/g, '');
    const value = sanitized ? sanitized[sanitized.length - 1] : '';
    this.inviteCodeDigits[index] = value;
    input.value = value;

    if (value && index < this.inviteLength - 1) {
      this.focusInviteInput(index + 1);
    }

    this.onInviteCodeChanged();
  }

  onInviteFocus(event: FocusEvent) {
    const input = event.target as HTMLInputElement | null;
    input?.select();
  }

  onInviteKeydown(index: number, event: KeyboardEvent) {
    const key = event.key;
    const current = this.inviteCodeDigits[index] ?? '';

    if (key === 'Backspace') {
      if (!current && index > 0) {
        event.preventDefault();
        this.focusInviteInput(index - 1);
      }
      return;
    }

    if (key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      this.focusInviteInput(index - 1);
      return;
    }

    if (key === 'ArrowRight' && index < this.inviteLength - 1) {
      event.preventDefault();
      this.focusInviteInput(index + 1);
      return;
    }

    const allowKeys = ['Tab', 'Delete', 'Home', 'End'];
    if (allowKeys.includes(key)) return;

    if (!/^\d$/.test(key)) {
      event.preventDefault();
    }
  }

  onInvitePaste(event: ClipboardEvent) {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') ?? '';
    const digits = text.replace(/\D/g, '').slice(0, this.inviteLength).split('');
    if (digits.length === 0) return;

    this.inviteCodeDigits = this.inviteIndexes.map((_, i) => digits[i] ?? '');

    const targetIndex = Math.min(digits.length, this.inviteLength - 1);
    this.focusInviteInput(targetIndex);
    this.onInviteCodeChanged();
  }

  private focusInviteInput(index: number) {
    this.inviteInputRefs?.get(index)?.nativeElement.focus();
  }

  async onSubmit() {
    if (this.loading()) return;

    const display_name = this.displayName.trim();
    const email = this.email.trim().toLowerCase();
    const branch = this.branch.trim();
    const invite_code = this.inviteCode;

    if (!display_name || !email || !this.password || !this.confirmPassword) {
      this.swal.warning('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกข้อมูลที่จำเป็นให้ครบ');
      return;
    }

    if (!/^\d{6}$/.test(invite_code)) {
      this.swal.warning('รหัสคำเชิญไม่ถูกต้อง', 'กรุณากรอกรหัสคำเชิญตัวเลข 6 หลัก');
      return;
    }

    const invitePass = await this.ensureInviteCodeValidated(invite_code);
    if (!invitePass) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.swal.warning('รูปแบบอีเมลไม่ถูกต้อง', 'กรุณาตรวจสอบอีเมลอีกครั้ง');
      return;
    }

    if (this.password.length < 6) {
      this.swal.warning('รหัสผ่านสั้นเกินไป', 'กรุณาตั้งรหัสผ่านอย่างน้อย 6 ตัวอักษร');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.swal.warning('รหัสผ่านไม่ตรงกัน', 'กรุณาตรวจสอบรหัสผ่านและยืนยันรหัสผ่าน');
      return;
    }

    this.loading.set(true);
    try {
      const formData = new FormData();
      formData.append('display_name', display_name);
      formData.append('email', email);
      formData.append('password', this.password);
      formData.append('invite_code', invite_code);
      if (branch) formData.append('branch', branch);
      const avatarFile = this.avatarFile();
      if (avatarFile) {
        formData.append('image', avatarFile);
      }

      await firstValueFrom(this.api.postPublic('/auth/register', formData));

      this.swal.success('ลงทะเบียนสำเร็จ', 'กรุณาเข้าสู่ระบบด้วยบัญชีที่สร้างใหม่');
      await this.router.navigate(['/login'], { queryParams: { email } });
    } catch (err: any) {
      const message = err?.error?.message || 'ไม่สามารถลงทะเบียนได้';
      this.swal.error('ลงทะเบียนไม่สำเร็จ', message || 'โปรดลองใหม่');
    } finally {
      this.loading.set(false);
    }
  }

  openAvatarPicker() {
    const input = this.avatarInput?.nativeElement;
    if (!input) return;
    input.value = '';
    input.click();
  }

  onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    if (!file) return;
    this.avatarCropSourceFile.set(file);
  }

  closeAvatarCropper() {
    this.avatarCropSourceFile.set(null);
  }

  onAvatarCropped(blob: Blob) {
    this.avatarFile.set(new File([blob], 'avatar.png', { type: blob.type || 'image/png' }));
    this.avatarCropSourceFile.set(null);
    this.avatarPreviewUrl.set(URL.createObjectURL(blob));
  }

  clearAvatar() {
    this.avatarCropSourceFile.set(null);
    this.avatarFile.set(null);
    this.avatarPreviewUrl.set(null);
  }

  private onInviteCodeChanged() {
    const inviteCode = this.inviteCode;

    this.inviteValidationSequence += 1;
    this.inviteValidatedCode.set('');

    if (!inviteCode) {
      this.inviteValid.set(null);
      this.inviteValidationMessage.set('');
      this.inviteValidationReason.set(null);
      this.inviteChecking.set(false);
      return;
    }

    if (inviteCode.length < this.inviteLength) {
      this.inviteValid.set(null);
      this.inviteValidationMessage.set('กรุณากรอกรหัสคำเชิญให้ครบ 6 หลัก');
      this.inviteValidationReason.set(null);
      this.inviteChecking.set(false);
      return;
    }

    void this.validateInviteCodeWithApi(inviteCode, false);
  }

  private async ensureInviteCodeValidated(inviteCode: string) {
    if (this.inviteValidatedCode() === inviteCode && this.inviteValid() === true) {
      return true;
    }
    return this.validateInviteCodeWithApi(inviteCode, true);
  }

  private async validateInviteCodeWithApi(inviteCode: string, showAlertOnInvalid: boolean) {
    const requestId = ++this.inviteValidationSequence;
    this.inviteChecking.set(true);
    this.inviteValidationMessage.set('กำลังตรวจสอบรหัสคำเชิญ...');
    this.inviteValidationReason.set(null);

    try {
      const res = await firstValueFrom(
        this.api.postPublic<{
          message?: string;
          data?: {
            valid: boolean;
            reason: string | null;
            invite_code: string | null;
            expires_at: string | null;
          };
        }>('/auth/register/validate-invite-code', { invite_code: inviteCode })
      );

      if (requestId !== this.inviteValidationSequence) return false;

      const valid = !!res?.data?.valid;
      const message = res?.message || (valid ? 'รหัสคำเชิญใช้งานได้' : 'รหัสคำเชิญไม่ถูกต้อง');

      this.inviteValidatedCode.set(inviteCode);
      this.inviteValid.set(valid);
      this.inviteValidationReason.set(res?.data?.reason ?? null);
      this.inviteValidationMessage.set(message);

      if (!valid && showAlertOnInvalid) {
        await this.swal.warning('รหัสคำเชิญไม่ถูกต้อง', message);
      }
      return valid;
    } catch (err: any) {
      if (requestId !== this.inviteValidationSequence) return false;

      const message = err?.error?.message || 'รหัสคำเชิญไม่ถูกต้อง';
      const reason = err?.error?.data?.reason ?? 'INVALID';
      this.inviteValidatedCode.set(inviteCode);
      this.inviteValid.set(false);
      this.inviteValidationReason.set(String(reason));
      this.inviteValidationMessage.set(message);

      if (showAlertOnInvalid) {
        await this.swal.warning('รหัสคำเชิญไม่ถูกต้อง', message);
      }
      return false;
    } finally {
      if (requestId === this.inviteValidationSequence) {
        this.inviteChecking.set(false);
      }
    }
  }
}
