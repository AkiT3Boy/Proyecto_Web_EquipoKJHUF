import { Injectable } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HomeConfigService } from './home-config';
import { Pedidos } from './pedidos';
import { ProductosService } from './productos';
import { Promociones } from './promociones';
import { UsuariosService } from './usuarios';

@Injectable({
  providedIn: 'root',
})
export class PreloadService {
  private basePreloaded = false;
  private userPreloadedForToken = '';

  constructor(
    private readonly productos: ProductosService,
    private readonly promociones: Promociones,
    private readonly homeConfig: HomeConfigService,
    private readonly usuarios: UsuariosService,
    private readonly pedidos: Pedidos,
  ) {}

  preloadBase(): void {
    if (this.basePreloaded) {
      return;
    }

    this.basePreloaded = true;
    forkJoin({
      productos: this.productos.getProductos().pipe(catchError(() => of([]))),
      promociones: this.promociones.getPromociones().pipe(catchError(() => of([]))),
      home: this.homeConfig.getConfig().pipe(catchError(() => of({ home_banner_url: '' }))),
    }).subscribe();
  }

  preloadUser(): void {
    const token = this.usuarios.getToken() || '';
    if (!token || this.userPreloadedForToken === token) {
      return;
    }

    this.userPreloadedForToken = token;

    if (!this.usuarios.getUsuarioActual()) {
      this.usuarios.me().pipe(catchError(() => of({ usuario: null }))).subscribe();
    }

    this.pedidos.getMisPedidos().pipe(catchError(() => of([]))).subscribe();
  }

  resetUserPreload(): void {
    this.userPreloadedForToken = '';
  }
}
