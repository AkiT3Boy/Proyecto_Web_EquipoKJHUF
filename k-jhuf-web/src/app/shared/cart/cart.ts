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

  enviarPedido(): void {
    this.mensaje = '';

    if (!this.items.length) {
      return;
    }

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
        next: () => {
          this.enviando = false;
          this.mensaje = 'Pedido enviado al admin.';
          this.carrito.clear();
          this.cliente = '';
          this.telefono = '';
          this.notas = '';
        },
        error: (error) => {
          this.enviando = false;
          this.mensaje = error.error?.msg || 'No se pudo enviar el pedido.';
        },
      });
  }
}
