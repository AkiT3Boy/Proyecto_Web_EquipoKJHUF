import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Carrito } from '../../services/carrito';
import { UsuarioSesion, UsuariosService } from '../../services/usuarios';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css'],
})
export class Navbar {
  menuAbierto = false;
  totalItems = 0;
  modalUsuarioAbierto = false;
  modalUsuarioExitoAbierto = false;
  modoUsuario: 'login' | 'registro' = 'login';
  authNombre = '';
  authTelefono = '';
  authPassword = '';
  authConfirm = '';
  authError = '';
  authExito = '';
  authTouched = {
    nombre: false,
    telefono: false,
    password: false,
    confirm: false,
  };
  usuario: UsuarioSesion | null = null;
  readonly avatarDefault =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
        <defs>
          <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="#ff9a6b"/>
            <stop offset="100%" stop-color="#f05f41"/>
          </linearGradient>
        </defs>
        <rect width="96" height="96" rx="24" fill="url(#g)"/>
        <circle cx="48" cy="35" r="16" fill="#fff3ec"/>
        <path d="M20 80c4-15 15-23 28-23s24 8 28 23" fill="#fff3ec"/>
      </svg>`,
    );
  private readonly destroyRef = inject(DestroyRef);

  readonly enlaces = [
    { label: 'Inicio', ruta: '/' },
    { label: 'Productos', ruta: '/productos' },
    { label: 'Promociones', ruta: '/promociones' },
    { label: 'Contacto', ruta: '/contacto' },
  ];

  // Límite máximo para el nombre
  readonly NOMBRE_MAX_LENGTH = 50;

  constructor(
    private readonly carrito: Carrito,
    private readonly usuarios: UsuariosService,
  ) {
    this.carrito.items.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.totalItems = this.carrito.getCount();
    });

    this.usuarios.usuario$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((usuario) => {
      this.usuario = usuario;
    });

    if (this.usuarios.isAuthenticated() && !this.usuarios.getUsuarioActual()) {
      this.usuarios.me().subscribe({
        error: () => this.usuarios.clearSession(),
      });
    }
  }

  toggleMenu(): void {
    this.menuAbierto = !this.menuAbierto;
  }

  cerrarMenu(): void {
    this.menuAbierto = false;
  }

  abrirCarrito(): void {
    this.carrito.open();
    this.cerrarMenu();
  }

  cerrarSesionUsuario(): void {
    this.usuarios.logout().subscribe({
      next: () => {
        this.cerrarMenu();
      },
      error: () => {
        this.usuarios.clearSession();
        this.cerrarMenu();
      },
    });
  }

  abrirRegistro(): void {
    this.modalUsuarioAbierto = true;
    this.modoUsuario = 'registro';
    this.resetAuthState();
  }

  abrirLogin(): void {
    this.modalUsuarioAbierto = true;
    this.modoUsuario = 'login';
    this.resetAuthState();
  }

  cerrarModalUsuario(): void {
    this.modalUsuarioAbierto = false;
    this.resetAuthState();
  }

  cerrarModalExitoUsuario(): void {
    this.modalUsuarioExitoAbierto = false;
    this.authExito = '';
  }

  enviarAuthUsuario(): void {
    this.authError = '';
    this.marcarCamposAuth();

    if (this.authNombreError || this.authTelefonoError || this.authPasswordError || this.authConfirmError) {
      return;
    }

    if (this.modoUsuario === 'registro') {
      this.usuarios
        .register({
          nombre: this.authNombre.trim(),
          telefono: this.sanitizePhone(this.authTelefono),
          password: this.authPassword,
        })
        .subscribe({
          next: ({ usuario }) => {
            this.cerrarModalUsuario();
            this.authExito = `Cuenta creada para ${usuario.nombre}.`;
            this.modalUsuarioExitoAbierto = true;
            this.cerrarMenu();
          },
          error: (error) => {
            this.authError = error?.error?.msg || 'No se pudo completar el registro.';
          },
        });
      return;
    }

    this.usuarios
      .login({
        telefono: this.sanitizePhone(this.authTelefono),
        password: this.authPassword,
      })
      .subscribe({
        next: ({ usuario }) => {
          this.cerrarModalUsuario();
          this.authExito = `Sesion iniciada como ${usuario.nombre}.`;
          this.modalUsuarioExitoAbierto = true;
          this.cerrarMenu();
        },
        error: (error) => {
          this.authError = error?.error?.msg || 'No se pudo iniciar sesion.';
        },
      });
  }

  // --- MÉTODO PARA NOMBRE: filtra números y limita longitud ---
  onAuthNombreChange(valor: string): void {
    // Eliminar números
    let valorFiltrado = valor.replace(/\d/g, '');
    // Limitar a NOMBRE_MAX_LENGTH caracteres
    if (valorFiltrado.length > this.NOMBRE_MAX_LENGTH) {
      valorFiltrado = valorFiltrado.slice(0, this.NOMBRE_MAX_LENGTH);
    }
    this.authNombre = valorFiltrado;
    this.authTouched.nombre = true;
  }

  // --- MÉTODO PARA TELÉFONO: usa sanitizePhone (ya filtra no dígitos y limita a 10) ---
  onAuthTelefonoChange(valor: string): void {
    this.authTelefono = this.sanitizePhone(valor);
    this.authTouched.telefono = true;
  }

  onAuthPasswordChange(valor: string): void {
    this.authPassword = valor;
    this.authTouched.password = true;
  }

  onAuthConfirmChange(valor: string): void {
    this.authConfirm = valor;
    this.authTouched.confirm = true;
  }

  // --- Getters de error (sin cambios) ---
  get authNombreError(): string {
    if (this.modoUsuario !== 'registro' || !this.authTouched.nombre) {
      return '';
    }
    return this.nombreValido(this.authNombre) ? '' : 'Ingresa un nombre valido de al menos 3 caracteres.';
  }

  get authTelefonoError(): string {
    if (!this.authTouched.telefono) {
      return '';
    }
    return this.telefonoValido(this.authTelefono) ? '' : 'Ingresa un numero de 10 digitos.';
  }

  get authPasswordError(): string {
    if (!this.authTouched.password) {
      return '';
    }
    return this.authPassword.trim().length >= 4 ? '' : 'La contrasena debe tener al menos 4 caracteres.';
  }

  get authConfirmError(): string {
    if (this.modoUsuario !== 'registro' || !this.authTouched.confirm) {
      return '';
    }
    return this.authPassword === this.authConfirm ? '' : 'Las contrasenas no coinciden.';
  }

  // --- Validaciones privadas ---
  private nombreValido(nombre: string): boolean {
    const valor = (nombre || '').trim();
    return valor.length >= 3 && /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(valor);
  }

  private telefonoValido(telefono: string): boolean {
    const limpio = this.sanitizePhone(telefono);
    return limpio.length === 10;
  }

  private sanitizePhone(telefono: string): string {
    return (telefono || '').replace(/\D/g, '').slice(0, 10);
  }

  private marcarCamposAuth(): void {
    this.authTouched.telefono = true;
    this.authTouched.password = true;
    if (this.modoUsuario === 'registro') {
      this.authTouched.nombre = true;
      this.authTouched.confirm = true;
    }
  }

  private resetAuthState(): void {
    this.authError = '';
    this.authNombre = '';
    this.authTelefono = '';
    this.authPassword = '';
    this.authConfirm = '';
    this.authTouched = {
      nombre: false,
      telefono: false,
      password: false,
      confirm: false,
    };
  }
    soloLetras(event: KeyboardEvent) {
    const char = event.key;
    const regex = /^[A-Za-zÁÉÍÓÚáéíóúñÑ ]+$/;

    if (!regex.test(char)) {
      event.preventDefault();
    }
  }

  soloNumeros(event: KeyboardEvent) {
    const char = event.key;
    const regex = /^[0-9]+$/;

    if (!regex.test(char)) {
      event.preventDefault();
    }
  }
}