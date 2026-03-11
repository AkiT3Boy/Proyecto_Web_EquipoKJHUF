import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, shareReplay, tap } from 'rxjs';
import { Auth } from './auth';

export type Producto = {
  _id?: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  imagen_url: string;
  imagen?: string;
  ingredientes: string[];
  detalles: string[];
  destacado?: boolean;
  activo?: boolean;
};

@Injectable({
  providedIn: 'root',
})
export class ProductosService {
  private readonly api = 'http://localhost:3000/api/productos';
  private readonly imagenProxyApi = 'http://localhost:3000/api/imagen-proxy';
  private productos$?: Observable<Producto[]>;

  constructor(
    private readonly http: HttpClient,
    private readonly auth: Auth,
  ) {}

  getProductos(forceRefresh = false): Observable<Producto[]> {
    if (forceRefresh || !this.productos$) {
      this.productos$ = this.http
        .get<Producto[]>(this.api)
        .pipe(map((productos) => productos.map((producto) => this.normalizeProducto(producto))), shareReplay(1));
    }

    return this.productos$;
  }

  getProducto(id: string): Observable<Producto> {
    return this.http
      .get<Producto>(`${this.api}/${id}`)
      .pipe(map((producto) => this.normalizeProducto(producto)));
  }

  crearProducto(data: Producto): Observable<{ msg: string; _id: string }> {
    return this.http.post<{ msg: string; _id: string }>(this.api, data, {
      headers: this.auth.getAuthHeaders(),
    }).pipe(tap(() => this.invalidateCache()));
  }

  eliminarProducto(id: string): Observable<{ msg: string }> {
    return this.http.delete<{ msg: string }>(`${this.api}/${id}`, {
      headers: this.auth.getAuthHeaders(),
    }).pipe(tap(() => this.invalidateCache()));
  }

  actualizarProducto(id: string, data: Producto): Observable<{ msg: string }> {
    return this.http.put<{ msg: string }>(`${this.api}/${id}`, data, {
      headers: this.auth.getAuthHeaders(),
    }).pipe(tap(() => this.invalidateCache()));
  }

  private normalizeProducto(producto: Producto): Producto {
    const imagen = this.normalizarImagenUrl(producto.imagen_url || producto.imagen || '');
    const categoriaRaw = (producto.categoria || this.inferCategoria(producto.nombre, producto.descripcion)).toLowerCase();
    const categoria =
      categoriaRaw === 'quesos' || categoriaRaw === 'carnes frias'
        ? 'carnes frias y quesos'
        : categoriaRaw;

    return {
      ...producto,
      categoria,
      imagen_url: imagen,
      imagen,
      ingredientes: producto.ingredientes || [],
      detalles: producto.detalles || [],
    };
  }

  private normalizarImagenUrl(valor: string): string {
    const imagen = (valor || '').trim().replace(/^['"]+|['"]+$/g, '');

    if (!imagen) {
      return '';
    }

    if (imagen.startsWith('//')) {
      return this.toProxyUrl(`https:${imagen}`);
    }

    if (/^https?:\/\//i.test(imagen)) {
      return this.toProxyUrl(imagen);
    }

    if (imagen.startsWith('data:') || imagen.startsWith('/')) {
      return imagen;
    }

    if (imagen.startsWith('www.')) {
      return this.toProxyUrl(`https://${imagen}`);
    }

    if (imagen.startsWith('images/')) {
      return `/${imagen}`;
    }

    return imagen;
  }

  private toProxyUrl(url: string): string {
    return `${this.imagenProxyApi}?url=${encodeURIComponent(url)}`;
  }

  private invalidateCache(): void {
    this.productos$ = undefined;
  }

  private inferCategoria(nombre: string, descripcion: string): string {
    const contenido = `${nombre || ''} ${descripcion || ''}`.toLowerCase();

    if (contenido.includes('raspado') || contenido.includes('granizado') || contenido.includes('nieve')) {
      return 'raspados';
    }

    if (
      contenido.includes('nacho') ||
      contenido.includes('nachos') ||
      contenido.includes('tosti') ||
      contenido.includes('papas') ||
      contenido.includes('maruchan') ||
      contenido.includes('botana')
    ) {
      return 'snacks';
    }

    if (
      contenido.includes('elote') ||
      contenido.includes('esquite') ||
      contenido.includes('esquites') ||
      contenido.includes('maiz')
    ) {
      return 'elotes';
    }

    if (
      contenido.includes('queso') ||
      contenido.includes('quesadilla') ||
      contenido.includes('cheese') ||
      contenido.includes('requeson') ||
      contenido.includes('crema') ||
      contenido.includes('jamon') ||
      contenido.includes('salami') ||
      contenido.includes('peperoni') ||
      contenido.includes('pepperoni') ||
      contenido.includes('chorizo') ||
      contenido.includes('enchilada') ||
      contenido.includes('carne enchilada') ||
      contenido.includes('carnes frias')
    ) {
      return 'carnes frias y quesos';
    }

    return 'snacks';
  }
}
