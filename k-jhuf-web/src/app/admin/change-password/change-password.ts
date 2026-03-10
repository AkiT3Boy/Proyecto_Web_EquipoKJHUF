import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './change-password.html',
  styleUrls: ['./change-password.css']
})
export class ChangePasswordComponent {

  oldPassword = '';
  newPassword = '';
  confirmPassword = '';
  loading = false;
  error = '';
  success = '';
  isOpen = false;

  constructor(private authService: Auth) {}

  open(): void {
    this.isOpen = true;
    this.clearForm();
  }

  close(): void {
    this.isOpen = false;
    this.clearForm();
  }

  clearForm(): void {
    this.oldPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.error = '';
    this.success = '';
  }

  changePassword(): void {
    this.error = '';
    this.success = '';

    if (!this.oldPassword || !this.newPassword || !this.confirmPassword) {
      this.error = 'Todos los campos son requeridos';
      return;
    }

    if (this.newPassword.length < 4) {
      this.error = 'La nueva contraseña debe tener al menos 4 caracteres';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Las nuevas contraseñas no coinciden';
      return;
    }

    if (this.oldPassword === this.newPassword) {
      this.error = 'La nueva contraseña debe ser diferente a la antigua';
      return;
    }

    this.loading = true;

    this.authService.changePassword(this.oldPassword, this.newPassword).subscribe({
      next: (response: any) => {
        this.loading = false;
        this.success = '¡Contraseña actualizada correctamente!';
        
        setTimeout(() => {
          this.close();
        }, 2000);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Error al cambiar contraseña';
      }
    });
  }
}
