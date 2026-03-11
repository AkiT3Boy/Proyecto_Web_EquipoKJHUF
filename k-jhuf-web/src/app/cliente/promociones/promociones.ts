import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { Producto, ProductosService } from '../../services/productos';
import { Promocion, Promociones as PromocionesService } from '../../services/promociones';
import { mezclarProductos, mezclarPromociones, PRODUCTOS_SEED, PROMOCIONES_SEED } from '../../services/seed-data';

type PromocionVista = Promocion & {
  productosRelacionados: string[];
  etiquetaValor: string;
};

@Component({
  selector: 'app-promociones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './promociones.html',
  styleUrls: ['./promociones.css'],
})
export class Promociones implements OnInit {
  promociones: PromocionVista[] = [];

  private readonly productosRespaldo: Producto[] = PRODUCTOS_SEED;
  private readonly promocionesRespaldo: Promocion[] = PROMOCIONES_SEED;

  constructor(
    private readonly productosService: ProductosService,
    private readonly promocionesService: PromocionesService,
  ) {}

  ngOnInit(): void {
    forkJoin({
      productos: this.productosService.getProductos().pipe(catchError(() => of(this.productosRespaldo))),
      promociones: this.promocionesService
        .getPromociones()
        .pipe(catchError(() => of(this.promocionesRespaldo))),
    }).subscribe(({ productos, promociones }) => {
      const baseProductos = mezclarProductos(productos.length ? productos : this.productosRespaldo);
      const basePromos = mezclarPromociones(promociones.length ? promociones : this.promocionesRespaldo);

      this.promociones = basePromos.map((promocion) => ({
        ...promocion,
        productosRelacionados: baseProductos
          .filter((producto) => (promocion.producto_ids || []).includes(producto._id || ''))
          .map((producto) => producto.nombre),
        etiquetaValor: this.formatearValor(promocion),
      }));
    });
  }

  private formatearValor(promocion: Promocion): string {
    if (promocion.tipo === 'porcentaje') {
      return `${promocion.valor}% descuento`;
    }

    if (promocion.tipo === 'precio') {
      return `Precio final $${promocion.valor}`;
    }

    if (promocion.tipo === '2x1') {
      return 'Lleva 2 paga 1';
    }

    return `Combo por $${promocion.valor}`;
  }
}
