import { CommonModule } from '@angular/common';
import { Component, ElementRef, QueryList, ViewChildren, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { SwalService } from '../../shared/swal/swal.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  readonly inviteLength = 6;
  readonly inviteIndexes = [0, 1, 2, 3, 4, 5];

  @ViewChildren('inviteDigit') private inviteInputRefs?: QueryList<ElementRef<HTMLInputElement>>;

  displayName = '';
  email = '';
  branch = '';
  inviteCodeDigits: string[] = this.inviteIndexes.map(() => '');
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;
  loading = signal(false);

  constructor(
    private readonly api: ApiService,
    private readonly router: Router,
    private readonly swal: SwalService
  ) {}

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
      await firstValueFrom(this.api.postPublic('/auth/register', {
        display_name,
        email,
        password: this.password,
        branch: branch || undefined,
        invite_code,
      }));

      this.swal.success('ลงทะเบียนสำเร็จ', 'กรุณาเข้าสู่ระบบด้วยบัญชีที่สร้างใหม่');
      await this.router.navigate(['/login'], { queryParams: { email } });
    } catch (err: any) {
      const message = err?.error?.message || 'ไม่สามารถลงทะเบียนได้';
      this.swal.error('ลงทะเบียนไม่สำเร็จ', message || 'โปรดลองใหม่');
    } finally {
      this.loading.set(false);
    }
  }
}
