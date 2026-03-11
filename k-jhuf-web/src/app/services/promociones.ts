import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, shareReplay, tap } from 'rxjs';
import { Auth } from './auth';

export type Promocion = {
  _id?: string;
  titulo: string;
  descripcion: string;
  tipo: 'porcentaje' | 'precio' | '2x1' | 'combo';
  valor: number;
  producto_ids: string[];
  activo?: boolean;
};

@Injectable({
  providedIn: 'root',
})
export class Promociones {
  private readonly api = 'http://localhost:3000/api/promociones';
  private promociones$?: Observable<Promocion[]>;

  constructor(
    private readonly http: HttpClient,
    private readonly auth: Auth,
  ) {}

  getPromociones(forceRefresh = false): Observable<Promocion[]> {
    if (forceRefresh || !this.promociones$) {
      this.promociones$ = this.http.get<Promocion[]>(this.api).pipe(shareReplay(1));
    }

    return this.promociones$;
  }

  crearPromocion(data: Promocion): Observable<{ msg: string; _id: string }> {
    return this.http.post<{ msg: string; _id: string }>(this.api, data, {
      headers: this.auth.getAuthHeaders(),
    }).pipe(tap(() => this.invalidateCache()));
  }

  actualizarPromocion(id: string, data: Promocion): Observable<{ msg: string }> {
    return this.http.put<{ msg: string }>(`${this.api}/${id}`, data, {
      headers: this.auth.getAuthHeaders(),
    }).pipe(tap(() => this.invalidateCache()));
  }

  eliminarPromocion(id: string): Observable<{ msg: string }> {
    return this.http.delete<{ msg: string }>(`${this.api}/${id}`, {
      headers: this.auth.getAuthHeaders(),
    }).pipe(tap(() => this.invalidateCache()));
  }

  private invalidateCache(): void {
    this.promociones$ = undefined;
  }
}
