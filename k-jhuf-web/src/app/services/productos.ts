import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../environment';

@Injectable({
  providedIn: 'root'
})
export class ProductosService {

  private API = `${environment.apiUrl}/api/productos`;

  private cacheProductos$!: Observable<any[]>;

  constructor(private http: HttpClient) {}

  // OBTENER PRODUCTOS (CON CACHE)
  getProductos(): Observable<any[]> {

    if (!this.cacheProductos$) {

      this.cacheProductos$ = this.http
        .get<any[]>(this.API)
        .pipe(
          shareReplay(1)
        );

    }

    return this.cacheProductos$;
  }

  // OBTENER UN PRODUCTO
  getProducto(id: string): Observable<any> {
    return this.http.get<any>(`${this.API}/${id}`);
  }

  // CREAR PRODUCTO
  crearProducto(data: any): Observable<any> {

    // limpiar cache para recargar
    this.cacheProductos$ = undefined as any;

    return this.http.post(this.API, data);
  }

  // ELIMINAR
  eliminarProducto(id: string): Observable<any> {

    this.cacheProductos$ = undefined as any;

    return this.http.delete(`${this.API}/${id}`);
  }

  // ACTUALIZAR
  actualizarProducto(id: string, data: any): Observable<any> {

    this.cacheProductos$ = undefined as any;

    return this.http.put(`${this.API}/${id}`, data);
  }

}