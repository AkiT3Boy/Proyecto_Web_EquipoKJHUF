import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PromocionesService } from '../../services/promociones';
import { ProductosService } from '../../services/productos';

@Component({
  selector: 'app-admin-promociones',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './promociones.html',
  styleUrls: ['./promociones.css']
})
export class AdminPromociones implements OnInit {

  lista:any[] = [];
  productos:any[] = [];

  tipos = [
    "porcentaje",
    "precio",
    "2x1",
    "combo"
  ];

  promo:any = {
    titulo:'',
    descripcion:'',
    producto_id:'',
    tipo:'porcentaje',
    valor:0
  };

  constructor(
    private promoService:PromocionesService,
    private productosService:ProductosService
  ){}

  ngOnInit(){
    this.cargarPromos();
    this.cargarProductos();
  }

  cargarProductos(){
    this.productosService.getProductos().subscribe({
      next:data => this.productos = data,
      error:err => console.error(err)
    });
  }

  cargarPromos(){
    this.promoService.getPromociones().subscribe({
      next:data => this.lista = data,
      error:err => console.error(err)
    });
  }

  guardar(){

    this.promoService.crearPromocion(this.promo).subscribe({

      next:()=>{

        alert("Promoción creada");

        this.promo = {
          titulo:'',
          descripcion:'',
          producto_id:'',
          tipo:'porcentaje',
          valor:0
        };

        this.cargarPromos();

      },

      error:err=>console.error(err)

    });

  }

  eliminar(id:string){

    if(confirm("¿Eliminar promoción?")){

      this.promoService.eliminarPromocion(id).subscribe({

        next:()=> this.cargarPromos(),

        error:err=>console.error(err)

      });

    }

  }

}