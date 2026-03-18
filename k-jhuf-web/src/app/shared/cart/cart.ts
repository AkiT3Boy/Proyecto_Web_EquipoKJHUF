import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Carrito, CartItem } from '../../services/carrito';
import { Pedidos } from '../../services/pedidos';

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

  cliente = '';
  telefono = '';
  notas = '';

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly carrito: Carrito,
    private readonly pedidos: Pedidos,
  ) {
    this.carrito.abierto.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((abierto) => {
      this.abierto = abierto;
    });

    this.carrito.items.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((items) => {
      this.items = items;
      this.total = this.carrito.getSubtotal();
    });
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

    if (!this.cliente.trim()) {
      this.mensaje = 'Agrega tu nombre antes de confirmar.';
      return;
    }

    if (!this.telefono.trim()) {
      this.mensaje = 'Agrega tu telefono antes de confirmar.';
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
          this.enviando = false;
          this.modalConfirmacionAbierto = false;
          this.mensaje = response.msg || 'Se agendo el pedido.';
          this.modalPedidoAbierto = true;
          this.carrito.clear();
          this.cliente = '';
          this.telefono = '';
          this.notas = '';
        },
        error: (error) => {
          this.enviando = false;
          this.modalConfirmacionAbierto = true;
          this.mensaje = error?.error?.msg || error?.message || 'No se pudo enviar el pedido. Intenta otra vez.';
        },
      });
  }

  cancelarConfirmacion(): void {
    this.modalConfirmacionAbierto = false;
  }

  cerrarModalPedido(): void {
    this.modalPedidoAbierto = false;
    this.mensaje = '';
    this.cerrar();
  }
}
