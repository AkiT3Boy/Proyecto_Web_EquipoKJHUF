import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class AdminLogin implements OnInit {

  password = '';
  confirmPassword = '';
  passwordConfigured = false;
  isSetupMode = false;
  loading = false;
  error = '';
  success = '';

  constructor(
    private authService: Auth,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.checkPasswordConfigured();
  }

  checkPasswordConfigured(): void {
    this.authService.checkPasswordConfigured().subscribe({
      next: (response: any) => {
        this.passwordConfigured = response.passwordConfigured;
        this.isSetupMode = !this.passwordConfigured;
      },
      error: (err) => console.error(err)
    });
  }

  setupPassword(): void {
    this.error = '';
    this.success = '';

    if (!this.password) {
      this.error = 'Por favor ingresa una contraseña';
      return;
    }

    if (this.password.length < 4) {
      this.error = 'La contraseña debe tener al menos 4 caracteres';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error = 'Las contraseñas no coinciden';
      return;
    }

    this.loading = true;

    this.authService.setupPassword(this.password).subscribe({
      next: (response: any) => {
        this.loading = false;
        this.success = '¡Contraseña configurada correctamente!';
        this.password = '';
        this.confirmPassword = '';
        this.passwordConfigured = true;
        this.isSetupMode = false;
        
        setTimeout(() => {
          this.success = '';
        }, 3000);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Error al configurar contraseña';
      }
    });
  }

  login(): void {
    this.error = '';
    this.success = '';

    if (!this.password) {
      this.error = 'Por favor ingresa la contraseña';
      return;
    }

    this.loading = true;

    this.authService.login(this.password).subscribe({
      next: (response: any) => {
        this.loading = false;
        this.authService.setAuthenticated(true);
        this.success = '¡Bienvenido al panel de administración!';
        
        setTimeout(() => {
          this.router.navigate(['/admin']);
        }, 1000);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Contraseña incorrecta';
      }
    });
  }

  clearMessages(): void {
    this.error = '';
    this.success = '';
  }
}
