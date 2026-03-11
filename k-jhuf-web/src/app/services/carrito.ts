import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ProductoVista } from './catalogo';

export type CartItem = {
  producto_id: string;
  nombre: string;
  precio: number;
  precioOriginal: number;
  cantidad: number;
  imagen_url: string;
  promoResumen: string;
};

@Injectable({
  providedIn: 'root',
})
export class Carrito {
  private readonly storageKey = 'kjhuf_cart';
  private readonly abierto$ = new BehaviorSubject<boolean>(false);
  private readonly items$ = new BehaviorSubject<CartItem[]>(this.readItems());

  readonly abierto = this.abierto$.asObservable();
  readonly items = this.items$.asObservable();

  open(): void {
    this.abierto$.next(true);
  }

  close(): void {
    this.abierto$.next(false);
  }

  toggle(): void {
    this.abierto$.next(!this.abierto$.value);
  }

  add(producto: ProductoVista): void {
    const items = [...this.items$.value];
    const productoId = producto._id || producto.nombre;
    const existente = items.find((item) => item.producto_id === productoId);

    if (existente) {
      existente.cantidad += 1;
    } else {
      items.push({
        producto_id: productoId,
        nombre: producto.nombre,
        precio: producto.precioFinal,
        precioOriginal: producto.precio,
        cantidad: 1,
        imagen_url: producto.imagenMostrada,
        promoResumen: producto.resumenPromo,
      });
    }

    this.setItems(items);
    this.open();
  }

  updateQuantity(productoId: string, cantidad: number): void {
    if (cantidad <= 0) {
      this.remove(productoId);
      return;
    }

    const items = this.items$.value.map((item) =>
      item.producto_id === productoId ? { ...item, cantidad } : item,
    );
    this.setItems(items);
  }

  remove(productoId: string): void {
    const items = this.items$.value.filter((item) => item.producto_id !== productoId);
    this.setItems(items);
  }

  clear(): void {
    this.setItems([]);
  }

  getCount(): number {
    return this.items$.value.reduce((acc, item) => acc + item.cantidad, 0);
  }

  getSubtotal(): number {
    return this.items$.value.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
  }

  private setItems(items: CartItem[]): void {
    this.items$.next(items);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(items));
    }
  }

  private readItems(): CartItem[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    const saved = localStorage.getItem(this.storageKey);
    if (!saved) {
      return [];
    }

    try {
      return JSON.parse(saved) as CartItem[];
    } catch {
      return [];
    }
  }
}
