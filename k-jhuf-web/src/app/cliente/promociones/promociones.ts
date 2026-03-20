import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { mapearProductosConPromociones, ProductoVista } from '../../services/catalogo';
import { Carrito } from '../../services/carrito';
import { Producto, ProductosService } from '../../services/productos';
import { Promocion, Promociones as PromocionesService } from '../../services/promociones';

type PromocionVista = Promocion & {
  productosRelacionados: ProductoVista[];
  etiquetaValor: string;
  accionLabel: string;
  agregaDirecto: boolean;
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
  modalSeleccionAbierto = false;
  promocionSeleccionada: PromocionVista | null = null;

  constructor(
    private readonly productosService: ProductosService,
    private readonly promocionesService: PromocionesService,
    private readonly carrito: Carrito,
  ) {}

  ngOnInit(): void {
    forkJoin({
      productos: this.productosService.getProductos().pipe(catchError(() => of([]))),
      promociones: this.promocionesService.getPromociones().pipe(catchError(() => of([]))),
    }).subscribe(({ productos, promociones }) => {
      const productosVista = mapearProductosConPromociones(productos, promociones);
      this.promociones = promociones.map((promocion) => ({
        ...promocion,
        productosRelacionados: productosVista.filter((producto) =>
          (promocion.producto_ids || []).includes(producto._id || ''),
        ),
        etiquetaValor: this.formatearValor(promocion),
        agregaDirecto: promocion.tipo === 'combo' || (promocion.producto_ids || []).length <= 1,
        accionLabel:
          promocion.tipo === 'combo'
            ? 'Agregar combo'
            : (promocion.producto_ids || []).length <= 1
              ? 'Agregar promo'
              : 'Elegir producto',
      }));
    });
  }

  usarPromocion(promocion: PromocionVista): void {
    if (!promocion.productosRelacionados.length) {
      return;
    }

    if (promocion.agregaDirecto) {
      promocion.productosRelacionados.forEach((producto) => {
        const cantidad = promocion.tipo === '2x1' ? 2 : 1;
        this.carrito.addMany({
          ...producto,
          resumenPromo: `${producto.resumenPromo} | ${promocion.titulo}`,
        }, cantidad);
      });
      return;
    }

    this.promocionSeleccionada = promocion;
    this.modalSeleccionAbierto = true;
  }

  elegirProductoPromocion(producto: ProductoVista): void {
    if (!this.promocionSeleccionada) {
      return;
    }

    const cantidad = this.promocionSeleccionada.tipo === '2x1' ? 2 : 1;
    this.carrito.addMany({
      ...producto,
      resumenPromo: `${producto.resumenPromo} | ${this.promocionSeleccionada.titulo}`,
    }, cantidad);
    this.cerrarSeleccionPromocion();
  }

  cerrarSeleccionPromocion(): void {
    this.modalSeleccionAbierto = false;
    this.promocionSeleccionada = null;
  }

  nombresRelacionados(promocion: PromocionVista): string {
    return promocion.productosRelacionados.map((producto) => producto.nombre).join(', ');
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
