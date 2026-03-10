import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

import { Navbar } from './shared/navbar/navbar';
import { Footer } from './shared/footer/footer';

import { ProductosService } from './services/productos';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    HttpClientModule,
    Navbar,
    Footer
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent implements OnInit {

  constructor(private productosService: ProductosService){}

  ngOnInit(){
    // precargar productos para que la navegación sea rápida
    this.productosService.getProductos().subscribe();
  }

}