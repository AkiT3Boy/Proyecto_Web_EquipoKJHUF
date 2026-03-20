import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ProductoVista } from './catalogo';
import { Promocion } from './promociones';

export type CartItem = {
  producto_id: string;
  nombre: string;
  precio: number;
  precioOriginal: number;
  cantidad: number;
  imagen_url: string;
  promoResumen: string;
  promocionesAplicadas: Promocion[];
};

export type CartDiscount = {
  label: string;
  amount: number;
};

export type CartPricing = {
  subtotal: number;
  descuentos: CartDiscount[];
  total: number;
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
    this.addMany(producto, 1);
  }

  addMany(producto: ProductoVista, cantidad = 1): void {
    const items = [...this.items$.value];
    const productoId = producto._id || producto.nombre;
    const existente = items.find((item) => item.producto_id === productoId);
    const precioVisual = this.calcularPrecioVisual(producto);

    if (existente) {
      existente.cantidad += cantidad;
    } else {
      items.push({
        producto_id: productoId,
        nombre: producto.nombre,
        precio: precioVisual,
        precioOriginal: producto.precio,
        cantidad,
        imagen_url: producto.imagenMostrada,
        promoResumen: producto.resumenPromo,
        promocionesAplicadas: producto.promocionesAplicadas || [],
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
    return this.getPricing().total;
  }

  getPricing(): CartPricing {
    const subtotal = this.items$.value.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
    const descuentos = this.calcularDescuentos();
    const total = Math.max(subtotal - descuentos.reduce((acc, item) => acc + item.amount, 0), 0);

    return {
      subtotal: Number(subtotal.toFixed(2)),
      descuentos,
      total: Number(total.toFixed(2)),
    };
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
      return (JSON.parse(saved) as CartItem[]).map((item) => ({
        ...item,
        promocionesAplicadas: item.promocionesAplicadas || [],
      }));
    } catch {
      return [];
    }
  }

  private calcularPrecioVisual(producto: ProductoVista): number {
    return Number(
      (producto.promocionesAplicadas || []).reduce((acumulado, promocion) => {
        if (promocion.tipo === 'porcentaje') {
          return acumulado - acumulado * (promocion.valor / 100);
        }

        if (promocion.tipo === 'precio') {
          return Math.min(acumulado, promocion.valor);
        }

        return acumulado;
      }, producto.precio).toFixed(2),
    );
  }

  private calcularDescuentos(): CartDiscount[] {
    const descuentos: CartDiscount[] = [];
    const itemsMap = new Map(this.items$.value.map((item) => [item.producto_id, item]));
    const promos = new Map<string, Promocion>();

    for (const item of this.items$.value) {
      for (const promo of item.promocionesAplicadas || []) {
        if (!promo._id) {
          continue;
        }
        promos.set(promo._id, promo);
      }
    }

    for (const promo of promos.values()) {
      const ids = promo.producto_ids || [];
      if (promo.tipo === 'combo' && ids.length >= 2) {
        const bundleCount = Math.min(...ids.map((id) => itemsMap.get(id)?.cantidad || 0));
        if (bundleCount > 0) {
          const bundlePrice = ids.reduce((acc, id) => acc + (itemsMap.get(id)?.precio || 0), 0);
          const descuento = Math.max(bundlePrice - promo.valor, 0) * bundleCount;
          if (descuento > 0) {
            descuentos.push({ label: promo.titulo || 'Combo', amount: Number(descuento.toFixed(2)) });
          }
        }
      }

      if (promo.tipo === '2x1') {
        const preciosElegibles: number[] = [];
        for (const id of ids) {
          const item = itemsMap.get(id);
          if (!item) {
            continue;
          }
          preciosElegibles.push(...Array(item.cantidad).fill(item.precio));
        }
        if (preciosElegibles.length >= 2) {
          preciosElegibles.sort((a, b) => a - b);
          const gratis = Math.floor(preciosElegibles.length / 2);
          const descuento = preciosElegibles.slice(0, gratis).reduce((acc, value) => acc + value, 0);
          if (descuento > 0) {
            descuentos.push({ label: promo.titulo || 'Promo 2x1', amount: Number(descuento.toFixed(2)) });
          }
        }
      }
    }

    return descuentos;
  }
}
