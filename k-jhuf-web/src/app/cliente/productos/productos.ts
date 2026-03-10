import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductosService } from '../../services/productos';
import { PromocionesService } from '../../services/promociones';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './productos.html',
  styleUrls: ['./productos.css']
})
export class Productos implements OnInit {

  productos: any[] = [];
  promociones: any[] = [];

  constructor(
    private productosService: ProductosService,
    private promocionesService: PromocionesService
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos() {

    this.productosService.getProductos().subscribe({

      next: (prods:any) => {

        this.promocionesService.getPromociones().subscribe({

          next: (promos:any) => {

            this.productos = prods;
            this.promociones = promos;

            this.aplicarPromociones();

          }

        });

      }

    });

  }

  aplicarPromociones() {

    this.productos.forEach(p => {

      const promo = this.promociones.find(
        pr => pr.producto_id == p._id
      );

      if(promo){
        p.promocion = promo;
      }

    });

  }

  precioFinal(p:any){

    if(!p.promocion){
      return p.precio;
    }

    if(p.promocion.tipo === 'porcentaje'){
      return p.precio - (p.precio * p.promocion.valor / 100);
    }

    if(p.promocion.tipo === 'precio'){
      return p.promocion.valor;
    }

    return p.precio;

  }

  trackById(index: number, item: any): any {
    return item._id;
  }

}