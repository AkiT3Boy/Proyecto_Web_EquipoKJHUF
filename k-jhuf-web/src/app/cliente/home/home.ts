import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ProductosService } from '../../services/productos';
import { PromocionesService } from '../../services/promociones';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class Home implements OnInit {

  productos:any[]=[]
  promociones:any[]=[]
  populares:any[]=[]

  loading=true

  banner="https://images.unsplash.com/photo-1593640408182-31c70c8268f5"

  constructor(
    private productosService:ProductosService,
    private promocionesService:PromocionesService
  ){}

  ngOnInit(){

    this.productosService.getProductos().subscribe(prods=>{

      this.productos=prods

      this.promocionesService.getPromociones().subscribe(promos=>{

        promos.forEach((promo:any)=>{

          let prod=this.productos.find(
            (p:any)=>p._id==promo.producto_id
          )

          if(prod){
            prod.promocion=promo
          }

        })

        this.promociones=this.productos.filter(
          (p:any)=>p.promocion
        )

        this.populares=this.productos.slice(0,4)

        this.loading=false

      })

    })

  }

  precioFinal(p:any){

    if(!p.promocion) return p.precio

    if(p.promocion.tipo==="porcentaje"){
      return p.precio-(p.precio*p.promocion.valor/100)
    }

    if(p.promocion.tipo==="precio"){
      return p.promocion.valor
    }

    return p.precio

  }

  trackById(i:number,item:any){
    return item._id
  }

}