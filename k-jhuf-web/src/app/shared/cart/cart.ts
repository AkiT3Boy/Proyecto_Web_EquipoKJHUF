import { CommonModule } from '@angular/common';
import { Component, DestroyRef, NgZone, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Carrito, CartItem } from '../../services/carrito';
import { Pedidos } from '../../services/pedidos';
import { UsuarioSesion, UsuariosService } from '../../services/usuarios';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cart.html',
  styleUrls: ['./cart.css'],
})
export class Cart {
  abierto = false;
  items: CartItem[] = [];
  total = 0;
  enviando = false;
  mensaje = '';
  modalConfirmacionAbierto = false;
  modalPedidoAbierto = false;
  modalUsuarioAbierto = false;
  modalUsuarioExitoAbierto = false;
  modoUsuario: 'login' | 'registro' = 'login';

  cliente = '';
  telefono = '';
  notas = '';
  authNombre = '';
  authTelefono = '';
  authPassword = '';
  authConfirm = '';
  authError = '';
  authExito = '';
  continuarPedidoTrasAuth = false;
  authTouched = {
    nombre: false,
    telefono: false,
    password: false,
    confirm: false,
  };
  pedidoTouched = {
    cliente: false,
    telefono: false,
  };
  usuario: UsuarioSesion | null = null;

  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);

  constructor(
    private readonly carrito: Carrito,
    private readonly pedidos: Pedidos,
    private readonly usuarios: UsuariosService,
  ) {
    this.carrito.abierto.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((abierto) => {
      this.abierto = abierto;
    });

    this.carrito.items.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((items) => {
      this.items = items;
      this.total = this.carrito.getSubtotal();
    });

    this.usuarios.usuario$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((usuario) => {
      this.usuario = usuario;
      if (usuario) {
        this.cliente = usuario.nombre;
        this.telefono = usuario.telefono;
      } else {
        this.cliente = '';
        this.telefono = '';
      }
    });

    if (this.usuarios.isAuthenticated() && !this.usuarios.getUsuarioActual()) {
      this.usuarios.me().subscribe({
        error: () => this.usuarios.clearSession(),
      });
    }
  }

  cerrar(): void {
    this.carrito.close();
  }

  cambiarCantidad(productoId: string, cantidad: string): void {
    this.carrito.updateQuantity(productoId, Number(cantidad));
  }

  eliminar(productoId: string): void {
    this.carrito.remove(productoId);
  }

  confirmarPedido(): void {
    this.mensaje = '';

    if (!this.items.length) {
      return;
    }

    if (!this.usuario || !this.usuarios.isAuthenticated()) {
      this.modalUsuarioAbierto = true;
      this.continuarPedidoTrasAuth = true;
      this.authError = 'Necesitas registrarte o iniciar sesion para agendar pedidos.';
      return;
    }

    this.pedidoTouched.cliente = true;
    this.pedidoTouched.telefono = true;

    if (this.clienteError || this.telefonoError) {
      this.mensaje = '';
      return;
    }

    this.modalConfirmacionAbierto = true;
  }

  enviarPedido(): void {
    if (!this.items.length || this.enviando) {
      return;
    }

    this.mensaje = '';
    this.enviando = true;
    this.pedidos
      .crearPedido({
        cliente: this.cliente || 'Cliente mostrador',
        telefono: this.telefono,
        notas: this.notas,
        items: this.items.map((item) => ({
          producto_id: item.producto_id,
          nombre: item.nombre,
          precio: item.precio,
          cantidad: item.cantidad,
          imagen_url: item.imagen_url,
        })),
      })
      .subscribe({
        next: (response) => {
          this.ngZone.run(() => {
            this.enviando = false;
            this.modalConfirmacionAbierto = false;
            this.mensaje = response.msg || 'Se agendo el pedido.';
            this.modalPedidoAbierto = true;
            this.carrito.clear();
            this.cliente = this.usuario?.nombre || '';
            this.telefono = this.usuario?.telefono || '';
            this.notas = '';
          });
        },
        error: (error) => {
          this.ngZone.run(() => {
            this.enviando = false;
            this.modalConfirmacionAbierto = true;
            this.mensaje = error?.error?.msg || error?.message || 'No se pudo enviar el pedido. Intenta otra vez.';
          });
        },
      });
  }

  cancelarConfirmacion(): void {
    this.modalConfirmacionAbierto = false;
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
    this.continuarPedidoTrasAuth = false;
    this.resetAuthState();
  }

  cerrarModalExitoUsuario(continuar = false): void {
    this.modalUsuarioExitoAbierto = false;
    this.authExito = '';
    if (continuar && this.continuarPedidoTrasAuth && this.items.length) {
      this.continuarPedidoTrasAuth = false;
      this.confirmarPedido();
      return;
    }
    this.continuarPedidoTrasAuth = false;
  }

  enviarAuthUsuario(): void {
    this.authError = '';
    this.marcarCamposAuth();

    if (this.authNombreError || this.authTelefonoError || this.authPasswordError || this.authConfirmError) {
      return;
    }

    if (this.modoUsuario === 'registro') {
      this.usuarios.register({
        nombre: this.authNombre.trim(),
        telefono: this.sanitizePhone(this.authTelefono),
        password: this.authPassword,
      }).subscribe({
        next: ({ usuario }) => {
          const continuar = this.continuarPedidoTrasAuth;
          this.usuario = usuario;
          this.cliente = usuario.nombre;
          this.telefono = usuario.telefono;
          this.modalUsuarioAbierto = false;
          this.resetAuthState();
          this.continuarPedidoTrasAuth = continuar;
          this.authExito = `Cuenta creada para ${usuario.nombre}.`;
          this.modalUsuarioExitoAbierto = true;
        },
        error: (error) => {
          this.authError = error?.error?.msg || 'No se pudo completar el registro.';
        },
      });
      return;
    }

    this.usuarios.login({
      telefono: this.sanitizePhone(this.authTelefono),
      password: this.authPassword,
    }).subscribe({
      next: ({ usuario }) => {
        const continuar = this.continuarPedidoTrasAuth;
        this.usuario = usuario;
        this.cliente = usuario.nombre;
        this.telefono = usuario.telefono;
        this.modalUsuarioAbierto = false;
        this.resetAuthState();
        this.continuarPedidoTrasAuth = continuar;
        this.authExito = `Sesion iniciada como ${usuario.nombre}.`;
        this.modalUsuarioExitoAbierto = true;
      },
      error: (error) => {
        this.authError = error?.error?.msg || 'No se pudo iniciar sesion.';
      },
      });
  }

  onClienteChange(valor: string): void {
    this.cliente = valor;
    this.pedidoTouched.cliente = true;
  }

  onTelefonoChange(valor: string): void {
    this.telefono = this.sanitizePhone(valor);
    this.pedidoTouched.telefono = true;
  }

  onAuthNombreChange(valor: string): void {
    this.authNombre = valor;
    this.authTouched.nombre = true;
  }

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

  get clienteError(): string {
    if (!this.pedidoTouched.cliente) {
      return '';
    }
    return this.nombreValido(this.cliente) ? '' : 'El nombre debe tener al menos 3 caracteres.';
  }

  get telefonoError(): string {
    if (!this.pedidoTouched.telefono) {
      return '';
    }
    return this.telefonoValido(this.telefono) ? '' : 'El telefono debe tener 10 digitos.';
  }

  cerrarModalPedido(): void {
    this.modalPedidoAbierto = false;
    this.mensaje = '';
    this.cerrar();
  }

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
}
