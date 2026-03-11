import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../services/auth';
import { ModalService } from '../../services/modal';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class AdminLogin implements OnInit, OnDestroy {

  password = '';
  confirmPassword = '';
  passwordConfigured = false;
  isSetupMode = false;
  loading = false;
  error = '';
  success = '';
  isModalVisible = false;
  private subscription: Subscription = new Subscription();

  constructor(
    private authService: Auth,
    private router: Router,
    @Inject(ModalService) private modalService: ModalService
  ) {}

  ngOnInit(): void {
    this.checkPasswordConfigured();
    
    // Suscribirse a los cambios de visibilidad del modal
    this.subscription = this.modalService.loginModalVisible$.subscribe(
      (visible: boolean) => this.isModalVisible = visible
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
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

  closeModal(): void {
    this.modalService.closeLoginModal();
    this.error = '';
    this.success = '';
    this.password = '';
    this.confirmPassword = '';
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
        if (err.status === 0) {
          this.error = 'Error de conexión con el servidor; verifica que el backend esté activo';
        } else {
          this.error = err.error?.error || 'Error al configurar contraseña';
        }
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
        this.password = '';
        
        setTimeout(() => {
          this.closeModal();
          this.router.navigate(['/admin/dashboard']);
        }, 1500);
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 0) {
          this.error = 'Error de conexión con el servidor; verifica que el backend esté activo';
        } else {
          this.error = err.error?.error || 'Contraseña inválida';
        }
      }
    });
  }

  clearMessages(): void {
    this.error = '';
    this.success = '';
  }
}
