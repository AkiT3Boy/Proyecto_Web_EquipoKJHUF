import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, interval, of, startWith } from 'rxjs';
import { ProductoVista, mapearProductosConPromociones } from '../../services/catalogo';
import { Carrito } from '../../services/carrito';
import { Producto, ProductosService } from '../../services/productos';
import { Promocion, Promociones as PromocionesService } from '../../services/promociones';
import { mezclarProductos, mezclarPromociones, PRODUCTOS_SEED, PROMOCIONES_SEED } from '../../services/seed-data';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css'],
})
export class Home implements OnInit {
  cargando = true;
  readonly imagenBanner = '/images/banner-home.svg';
  readonly frasesBanner = [
    'Esquites, tostilocos y antojos preparados al momento.',
    'Promos activas para pedir algo botanero sin pagar de mas.',
    'Snacks con ingredientes frescos, salsas al gusto y fotos reales.',
    'Raspados, elotes y botanas listas para compartir o pedir solo.',
  ];
  metricas = [
    { valor: '0', etiqueta: 'productos' },
    { valor: '0', etiqueta: 'ofertas' },
    { valor: '0', etiqueta: 'destacados' },
  ];
  fraseActual = this.frasesBanner[0];

  productoPrincipal?: ProductoVista;
  ofertas: ProductoVista[] = [];
  destacados: ProductoVista[] = [];
  recomendados: ProductoVista[] = [];
  private readonly destroyRef = inject(DestroyRef);
  private fraseIndex = 0;

  private readonly respaldoProductos: Producto[] = PRODUCTOS_SEED;
  private readonly respaldoPromociones: Promocion[] = PROMOCIONES_SEED;

  constructor(
    private readonly productosService: ProductosService,
    private readonly promocionesService: PromocionesService,
    private readonly carrito: Carrito,
  ) {}

  ngOnInit(): void {
    interval(5000)
      .pipe(startWith(0), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.fraseActual = this.frasesBanner[this.fraseIndex % this.frasesBanner.length];
        this.fraseIndex += 1;
      });

    forkJoin({
      productos: this.productosService.getProductos().pipe(catchError(() => of(this.respaldoProductos))),
      promociones: this.promocionesService
        .getPromociones()
        .pipe(catchError(() => of(this.respaldoPromociones))),
    }).subscribe(({ productos, promociones }) => {
      const catalogo = mapearProductosConPromociones(
        mezclarProductos(productos.length ? productos : this.respaldoProductos),
        mezclarPromociones(promociones.length ? promociones : this.respaldoPromociones),
      );

      this.ofertas = catalogo.filter((producto) => producto.promocionesAplicadas.length).slice(0, 4);
      this.destacados = catalogo.filter((producto) => producto.destacado).slice(0, 6);
      this.recomendados = catalogo.slice(0, 8);
      this.productoPrincipal = this.seleccionarHero(this.ofertas, this.destacados, this.recomendados, catalogo);
      this.metricas = [
        { valor: `${catalogo.length}`, etiqueta: 'productos' },
        { valor: `${this.ofertas.length}`, etiqueta: 'ofertas' },
        { valor: `${this.destacados.length}`, etiqueta: 'destacados' },
      ];
      this.cargando = false;
    });
  }

  agregarAlCarrito(producto: ProductoVista): void {
    this.carrito.add(producto);
  }

  resumenIngredientes(producto: ProductoVista, limite = 3): string {
    const ingredientes = (producto.ingredientes || []).filter(Boolean);
    return ingredientes.length
      ? ingredientes.slice(0, limite).join(', ')
      : 'Preparado al momento con toppings al gusto';
  }

  resumenDetalles(producto: ProductoVista, limite = 2): string {
    const detalles = (producto.detalles || []).filter(Boolean);
    return detalles.length ? detalles.slice(0, limite).join(', ') : 'Preparado al momento';
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement | null;
    if (!target) {
      return;
    }

    target.style.display = 'none';
  }

  private tieneImagen(producto: ProductoVista): boolean {
    return !!(producto.imagenMostrada || '').trim();
  }

  private seleccionarHero(...grupos: ProductoVista[][]): ProductoVista | undefined {
    for (const grupo of grupos) {
      const conImagen = grupo.find((producto) => this.tieneImagen(producto));
      if (conImagen) {
        return conImagen;
      }

      if (grupo.length) {
        return grupo[0];
      }
    }

    return undefined;
  }
}
