import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductosService } from '../../services/productos';

@Component({
  selector: 'app-productos-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './productos.html'
})
export class Productos {

  producto = {
    nombre: '',
    descripcion: '',
    precio: 0
  };

  constructor(private productosService: ProductosService) {}

  guardar() {
    this.productosService.crearProducto(this.producto).subscribe({
      next: () => {
        alert('Producto guardado correctamente');
        this.producto = { nombre: '', descripcion: '', precio: 0 };
      },
      error: err => console.error(err)
    });
  }
}