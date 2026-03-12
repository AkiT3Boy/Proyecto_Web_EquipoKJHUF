import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { Producto, ProductosService } from '../../services/productos';
import { Promocion, Promociones as PromocionesService } from '../../services/promociones';

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

  constructor(
    private readonly productosService: ProductosService,
    private readonly promocionesService: PromocionesService,
  ) {}

  ngOnInit(): void {
    forkJoin({
      productos: this.productosService.getProductos().pipe(catchError(() => of([]))),
      promociones: this.promocionesService.getPromociones().pipe(catchError(() => of([]))),
    }).subscribe(({ productos, promociones }) => {
      this.promociones = promociones.map((promocion) => ({
        ...promocion,
        productosRelacionados: productos
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
