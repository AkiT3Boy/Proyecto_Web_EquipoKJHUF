import { CommonModule } from '@angular/common';
import { Component, DestroyRef, NgZone, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Carrito, CartItem } from '../../services/carrito';
import { Pedidos, Pedido } from '../../services/pedidos';
import { PreloadService } from '../../services/preload';
import { UsuarioSesion, UsuariosService } from '../../services/usuarios';
import { firstValueFrom } from 'rxjs';

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
  subtotal = 0;
  descuentos: Array<{ label: string; amount: number }> = [];
  enviando = false;
  mensaje = '';
  modalConfirmacionAbierto = false;
  modalPedidoAbierto = false;
  modalUsuarioAbierto = false;
  modalUsuarioExitoAbierto = false;
  modoUsuario: 'login' | 'registro' = 'login';
  modalPedidoTitulo = 'Pedido listo';
  modalPedidoTexto = 'Tu orden ya quedo registrada y el admin la va a ver en su panel.';
  modalPedidoConfirmado = false;
  estadoProcesoPedido = '';

  cliente = '';
  telefono = '';
  notas = '';
  horaEntrega = '';
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
    horaEntrega: false,
  };
  usuario: UsuarioSesion | null = null;

  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);

  constructor(
    private readonly carrito: Carrito,
    private readonly pedidos: Pedidos,
    private readonly usuarios: UsuariosService,
    private readonly preload: PreloadService,
    private readonly router: Router,
  ) {
    this.carrito.abierto.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((abierto) => {
      this.abierto = abierto;
    });

    this.carrito.items.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((items) => {
      this.items = items;
      const pricing = this.carrito.getPricing();
      this.subtotal = pricing.subtotal;
      this.total = pricing.total;
      this.descuentos = pricing.descuentos;
    });

    this.usuarios.usuario$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((usuario) => {
      this.usuario = usuario;
      if (usuario) {
        this.cliente = usuario.nombre;
        this.telefono = usuario.telefono;
        if (!this.horaEntrega) {
          this.horaEntrega = this.horaSugerida();
        }
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
    this.pedidoTouched.horaEntrega = true;

    if (this.clienteError || this.telefonoError || this.horaEntregaError) {
      this.mensaje = '';
      return;
    }

    this.modalConfirmacionAbierto = true;
  }

  async enviarPedido(): Promise<void> {
    if (!this.items.length || this.enviando) {
      return;
    }

    this.mensaje = '';
    this.enviando = true;
    this.modalConfirmacionAbierto = false;
    this.modalPedidoAbierto = true;
    this.modalPedidoTitulo = 'Procesando pedido';
    this.modalPedidoTexto = 'Estamos registrando tu pedido. Espera un momento.';
    this.modalPedidoConfirmado = false;
    this.estadoProcesoPedido = 'Enviando al servidor...';
    const payload = {
      cliente: this.cliente || 'Cliente mostrador',
      telefono: this.telefono,
      notas: this.notas,
      hora_entrega: this.horaEntrega,
      items: this.items.map((item) => ({
        producto_id: item.producto_id,
        nombre: item.nombre,
        precio: item.precioOriginal,
        cantidad: item.cantidad,
        imagen_url: item.imagen_url,
      })),
    };
    this.pedidos.setPedidoPendiente(payload);
    this.modalConfirmacionAbierto = false;
    this.modalPedidoAbierto = false;
    this.carrito.close();
    void this.router.navigateByUrl('/mis-pedidos');
    let resuelto = false;

    const marcarExito = (mensaje: string): void => {
      if (resuelto) {
        return;
      }
      resuelto = true;
      this.ngZone.run(() => {
        this.enviando = false;
        this.mensaje = mensaje || 'Se agendo el pedido.';
        this.modalConfirmacionAbierto = false;
        this.modalPedidoAbierto = false;
        this.modalPedidoConfirmado = false;
        this.estadoProcesoPedido = '';
        this.cliente = this.usuario?.nombre || '';
        this.telefono = this.usuario?.telefono || '';
        this.notas = '';
        this.horaEntrega = this.horaSugerida();
        this.carrito.clear();
      });
    };

    const marcarError = (mensaje: string): void => {
      if (resuelto) {
        return;
      }
      resuelto = true;
      this.ngZone.run(() => {
        this.enviando = false;
        this.modalConfirmacionAbierto = false;
        this.modalPedidoAbierto = false;
        this.modalPedidoTitulo = 'No se pudo confirmar';
        this.modalPedidoTexto = mensaje || 'No se pudo enviar el pedido. Intenta otra vez.';
        this.modalPedidoConfirmado = false;
        this.estadoProcesoPedido = '';
        this.mensaje = mensaje || 'No se pudo enviar el pedido. Intenta otra vez.';
      });
    };

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);
    const watchdogId = window.setTimeout(async () => {
      this.ngZone.run(() => {
        this.estadoProcesoPedido = 'Verificando tu pedido en historial...';
      });
      const encontrado = await this.buscarPedidoReciente(payload);
      if (encontrado) {
        marcarExito('Pedido recibido');
        controller.abort();
      } else {
        marcarError('No pudimos confirmar tu pedido. Intenta otra vez.');
      }
    }, 12000);
    const optimisticId = window.setTimeout(() => {
      if (!resuelto) {
        marcarExito('Pedido recibido');
      }
    }, 2000);

    void this.buscarPedidoReciente(payload).then((encontrado) => {
      if (encontrado) {
        marcarExito('Pedido recibido');
        controller.abort();
      }
    });

    try {
      const response = await fetch('http://localhost:3000/api/pedidos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Token': this.usuarios.getToken() || '',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const responsePayload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(responsePayload?.msg || 'No se pudo enviar el pedido. Intenta otra vez.');
      }

      this.ngZone.run(() => {
        this.estadoProcesoPedido = 'Servidor respondio correctamente.';
      });
      marcarExito(responsePayload?.msg || 'Se agendo el pedido.');
    } catch (error: any) {
      this.ngZone.run(() => {
        this.estadoProcesoPedido = 'Revisando si el pedido ya quedo guardado...';
      });
      const encontrado = await this.buscarPedidoReciente(payload, 3, 800);
      if (encontrado) {
        marcarExito('Pedido recibido');
      } else {
        marcarError(
          error?.name === 'AbortError'
            ? 'El servidor tardo demasiado en responder. Intenta otra vez.'
            : error?.message || 'No se pudo enviar el pedido. Intenta otra vez.',
        );
      }
    } finally {
      window.clearTimeout(timeoutId);
      window.clearTimeout(watchdogId);
      window.clearTimeout(optimisticId);
    }
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
          this.preload.preloadUser();
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
        this.preload.preloadUser();
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

  onHoraEntregaChange(valor: string): void {
    this.horaEntrega = valor;
    this.pedidoTouched.horaEntrega = true;
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

  get horaEntregaError(): string {
    if (!this.pedidoTouched.horaEntrega) {
      return '';
    }

    const validacion = this.validarHoraEntrega(this.horaEntrega);
    return validacion === true ? '' : validacion;
  }

  cerrarModalPedido(): void {
    this.modalPedidoAbierto = false;
    this.mensaje = '';
    this.modalPedidoTitulo = 'Pedido listo';
    this.modalPedidoTexto = 'Tu orden ya quedo registrada y el admin la va a ver en su panel.';
    this.modalPedidoConfirmado = false;
    this.estadoProcesoPedido = '';
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

  private validarHoraEntrega(valor: string): true | string {
    if (!valor) {
      return 'Selecciona una hora para tu pedido.';
    }

    const [horaTexto, minutoTexto] = valor.split(':');
    const hora = Number(horaTexto);
    const minuto = Number(minutoTexto);
    const totalMinutos = hora * 60 + minuto;
    const ahora = new Date();
    const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();

    if (Number.isNaN(totalMinutos)) {
      return 'La hora del pedido no es valida.';
    }

    if (totalMinutos < 1080 || totalMinutos > 1380) {
      return 'El horario para pedidos es de 6:00 p. m. a 11:00 p. m.';
    }

    if (totalMinutos < minutosActuales) {
      return 'La hora del pedido debe ser de hoy y no puede ser anterior a la hora actual.';
    }

    return true;
  }

  private horaSugerida(): string {
    const ahora = new Date();
    let totalMinutos = ahora.getHours() * 60 + ahora.getMinutes() + 30;
    if (totalMinutos < 1080) {
      totalMinutos = 1080;
    }
    if (totalMinutos > 1380) {
      totalMinutos = 1380;
    }
    const hora = Math.floor(totalMinutos / 60).toString().padStart(2, '0');
    const minuto = (totalMinutos % 60).toString().padStart(2, '0');
    return `${hora}:${minuto}`;
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

  private async buscarPedidoReciente(
    payload: {
      cliente: string;
      telefono: string;
      notas: string;
      hora_entrega: string;
      items: Array<{ producto_id: string; nombre: string; precio: number; cantidad: number; imagen_url: string }>;
    },
    intentos = 8,
    esperaMs = 1000,
  ): Promise<Pedido | null> {
    for (let intento = 0; intento < intentos; intento += 1) {
      try {
        const pedidos = await firstValueFrom(this.pedidos.getMisPedidos());
        const encontrado = pedidos.find((pedido) => this.coincidePedido(pedido, payload));
        if (encontrado) {
          return encontrado;
        }
      } catch {
        return null;
      }

      await new Promise((resolve) => window.setTimeout(resolve, esperaMs));
    }

    return null;
  }

  private coincidePedido(
    pedido: Pedido,
    payload: {
      cliente: string;
      telefono: string;
      hora_entrega: string;
      items: Array<{ producto_id: string; nombre: string; cantidad: number }>;
    },
  ): boolean {
    if (pedido.hora_entrega !== payload.hora_entrega) {
      return false;
    }

    if ((pedido.items || []).length !== payload.items.length) {
      return false;
    }

    return payload.items.every((item) =>
      pedido.items.some(
        (pedidoItem) =>
          pedidoItem.producto_id === item.producto_id &&
          pedidoItem.cantidad === item.cantidad,
      ),
    );
  }

}
