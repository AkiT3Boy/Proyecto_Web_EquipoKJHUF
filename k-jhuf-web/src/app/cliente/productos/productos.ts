import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { ProductoVista, mapearProductosConPromociones } from '../../services/catalogo';
import { Carrito } from '../../services/carrito';
import { ProductosService } from '../../services/productos';
import { Promociones as PromocionesService } from '../../services/promociones';

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
      this.productos = mapearProductosConPromociones(productos, promociones);
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

  scrollToCategoria(nombre: string): void {
    if (typeof document === 'undefined') {
      return;
    }

    const destino = document.getElementById(this.categoryId(nombre));
    if (!destino) {
      return;
    }

    destino.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  categoryId(nombre: string): string {
    return `categoria-${(nombre || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')}`;
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
