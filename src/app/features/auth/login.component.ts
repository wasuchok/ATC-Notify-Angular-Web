import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { TokenService } from '../../core/services/token.service';
import { SwalService } from '../../shared/swal/swal.service';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  email = '';
  password = '';
  showPassword = false;
  loading = signal(false);

  constructor(
    private readonly api: ApiService,
    private readonly tokenService: TokenService,
    private readonly router: Router,
    private readonly swal: SwalService
  ) { }

  async onSubmit() {
    if (this.loading()) return;
    if (!this.email || !this.password) {
      this.swal.warning('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.api.postPublic<any>('/auth/login', { email: this.email, password: this.password })
      );

      this.tokenService.setTokens({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
      this.swal.success('เข้าสู่ระบบสำเร็จ', 'กำลังพาไปยังหน้าแดชบอร์ด');

      await this.router.navigateByUrl('/admin/chat');
    } catch (err: any) {
      const message = err?.error?.message || 'ไม่สามารถเข้าสู่ระบบได้';
      this.swal.error('ไม่สามารถเข้าสู่ระบบได้', message || 'โปรดลองใหม่');
    } finally {
      this.loading.set(false);
    }
  }

}
