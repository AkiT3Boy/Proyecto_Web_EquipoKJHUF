import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProductosService {

  private API = 'http://localhost:3000/api/productos';

  constructor(private http: HttpClient) {}

  getProductos(): Observable<any[]> {
    return this.http.get<any[]>(this.API);
  }

  getProducto(id: string): Observable<any> {
    return this.http.get<any>(`${this.API}/${id}`);
  }

  crearProducto(data: any): Observable<any> {
    return this.http.post(this.API, data);
  }

  eliminarProducto(id: string): Observable<any> {
    return this.http.delete(`${this.API}/${id}`);
  }

  actualizarProducto(id: string, data: any): Observable<any> {
    return this.http.put(`${this.API}/${id}`, data);
  }
}