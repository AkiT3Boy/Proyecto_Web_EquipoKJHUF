import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../environment';

@Injectable({
  providedIn: 'root'
})
export class PromocionesService {

  private API = `${environment.apiUrl}/api/promociones`;

  private cachePromos$!: Observable<any[]>;

  constructor(private http: HttpClient) {}

  // OBTENER PROMOCIONES (CACHE)
  getPromociones(): Observable<any[]> {

    if(!this.cachePromos$){

      this.cachePromos$ = this.http
        .get<any[]>(this.API)
        .pipe(
          shareReplay(1)
        );

    }

    return this.cachePromos$;
  }

  // CREAR PROMOCION
  crearPromocion(data:any): Observable<any>{

    this.cachePromos$ = undefined as any;

    return this.http.post(this.API, data);
  }

  // ELIMINAR PROMOCION
  eliminarPromocion(id:string): Observable<any>{

    this.cachePromos$ = undefined as any;

    return this.http.delete(`${this.API}/${id}`);
  }

}