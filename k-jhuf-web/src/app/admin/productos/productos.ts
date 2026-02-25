import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductosService } from '../../services/productos';

@Component({
  selector: 'app-admin-productos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './productos.html'
})
export class AdminProductos implements OnInit {

  lista: any[] = [];
  mostrarForm = false;

  producto = {
    nombre: '',
    descripcion: '',
    precio: 0
  };

  constructor(private productosService: ProductosService) {}

  ngOnInit(): void {
    this.cargarProductos();
  }

  cargarProductos() {
    this.productosService.getProductos().subscribe({
      next: data => this.lista = data,
      error: err => console.error(err)
    });
  }

  guardar() {
    this.productosService.crearProducto(this.producto).subscribe({
      next: () => {
        alert('Producto agregado');
        this.producto = { nombre: '', descripcion: '', precio: 0 };
        this.mostrarForm = false;
        this.cargarProductos();
      },
      error: err => console.error(err)
    });
  }

  eliminar(id: string) {
    if (confirm('¿Eliminar producto?')) {
      this.productosService.eliminarProducto(id).subscribe({
        next: () => this.cargarProductos(),
        error: err => console.error(err)
      });
    }
  }
}