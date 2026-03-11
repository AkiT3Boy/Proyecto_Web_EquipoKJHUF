import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { ProductoVista, mapearProductosConPromociones } from '../../services/catalogo';
import { Carrito } from '../../services/carrito';
import { Producto, ProductosService } from '../../services/productos';
import { Promocion, Promociones as PromocionesService } from '../../services/promociones';
import { mezclarProductos, mezclarPromociones, PRODUCTOS_SEED, PROMOCIONES_SEED } from '../../services/seed-data';

type CategoriaGrupo = {
  nombre: string;
  productos: ProductoVista[];
};

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './productos.html',
  styleUrls: ['./productos.css'],
})
export class Productos implements OnInit {
  productos: ProductoVista[] = [];
  categorias: CategoriaGrupo[] = [];
  cargando = true;

  private readonly respaldo: Producto[] = PRODUCTOS_SEED;
  private readonly promocionesRespaldo: Promocion[] = PROMOCIONES_SEED;

  constructor(
    private readonly productosService: ProductosService,
    private readonly promocionesService: PromocionesService,
    private readonly carrito: Carrito,
  ) {}

  ngOnInit(): void {
    forkJoin({
      productos: this.productosService.getProductos().pipe(catchError(() => of(this.respaldo))),
      promociones: this.promocionesService
        .getPromociones()
        .pipe(catchError(() => of(this.promocionesRespaldo))),
    }).subscribe(({ productos, promociones }) => {
      const base = mezclarProductos(productos.length ? productos : this.respaldo);
      const promos = mezclarPromociones(promociones.length ? promociones : this.promocionesRespaldo);
      this.productos = mapearProductosConPromociones(base, promos);
      this.categorias = this.agruparPorCategoria(this.productos);
      this.cargando = false;
    });
  }

  trackById(_: number, producto: ProductoVista): string {
    return producto._id || producto.nombre;
  }

  agregarAlCarrito(producto: ProductoVista): void {
    this.carrito.add(producto);
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement | null;
    if (!target) {
      return;
    }

    target.style.display = 'none';
  }

  private agruparPorCategoria(productos: ProductoVista[]): CategoriaGrupo[] {
    const grupos = new Map<string, ProductoVista[]>();

    for (const producto of productos) {
      const categoria = producto.categoria || 'General';
      const existentes = grupos.get(categoria) || [];
      existentes.push(producto);
      grupos.set(categoria, existentes);
    }

    return Array.from(grupos.entries()).map(([nombre, items]) => ({
      nombre,
      productos: items,
    }));
  }
}
