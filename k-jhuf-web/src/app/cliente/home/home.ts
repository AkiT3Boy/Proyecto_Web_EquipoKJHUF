import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductosService } from '../../services/productos';
import { PromocionesService } from '../../services/promociones';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class Home implements OnInit, OnDestroy {

  productos: any[] = [];
  promociones: any[] = [];
  populares: any[] = [];
  loading = true;

  // Imagen estática de lotería - precargada
  banner = "/assets/images/loteria-banner.svg";

  private subscriptions: Subscription[] = [];

  constructor(
    private productosService: ProductosService,
    private promocionesService: PromocionesService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    // Cancelar todas las suscripciones para evitar memory leaks
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadData() {
    this.loading = true;

    // Cargar productos
    const productosSub = this.productosService.getProductos().subscribe({
      next: (prods) => {
        this.productos = prods;
        this.loadPromociones();
      },
      error: (error) => {
        console.error('Error loading productos:', error);
        this.loading = false;
      }
    });

    this.subscriptions.push(productosSub);
  }

  private loadPromociones() {
    const promocionesSub = this.promocionesService.getPromociones().subscribe({
      next: (promos) => {
        // Aplicar promociones a productos
        promos.forEach((promo: any) => {
          const prod = this.productos.find((p: any) => p._id == promo.producto_id);
          if (prod) {
            prod.promocion = promo;
          }
        });

        // Filtrar productos con promociones
        this.promociones = this.productos.filter((p: any) => p.promocion);

        // Obtener TODOs los productos como populares (no solo 4)
        this.populares = this.productos;

        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading promociones:', error);
        // Aún así mostrar productos sin promociones
        this.populares = this.productos.slice(0, 4);
        this.loading = false;
      }
    });

    this.subscriptions.push(promocionesSub);
  }

  precioFinal(p: any) {
    if (!p.promocion) return p.precio;

    if (p.promocion.tipo === "porcentaje") {
      return p.precio - (p.precio * p.promocion.valor / 100);
    }

    if (p.promocion.tipo === "precio") {
      return p.promocion.valor;
    }

    return p.precio;
  }

  trackById(i: number, item: any) {
    return item._id;
  }
}