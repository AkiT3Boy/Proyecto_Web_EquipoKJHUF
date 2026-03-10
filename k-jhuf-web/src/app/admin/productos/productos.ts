import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductosService } from '../../services/productos';
import { Auth } from '../../services/auth';
import { ChangePasswordComponent } from '../change-password/change-password';

@Component({
  selector: 'app-admin-productos',
  standalone: true,
  imports: [CommonModule, FormsModule, ChangePasswordComponent],
  templateUrl: './productos.html',
  styleUrls: ['./productos.css']
})
export class AdminProductos implements OnInit {

  @ViewChild(ChangePasswordComponent) changePasswordModal!: ChangePasswordComponent;

  lista: any[] = [];
  mostrarForm = false;
  editando = false;

  producto: any = {
    nombre: '',
    descripcion: '',
    precio: 0,
    imagen: ''
  };

  constructor(
    private productosService: ProductosService,
    private authService: Auth,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarProductos();
  }

  cargarProductos() {
    this.productosService.getProductos().subscribe({
      next: data => this.lista = data,
      error: err => console.error(err)
    });
  }

  openChangePasswordModal(): void {
    this.changePasswordModal.open();
  }

  logout(): void {
    if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
      this.authService.logout();
      this.router.navigate(['/admin/login']);
    }
  }

 guardar(){

  if(this.editando){

    const id = this.producto._id;

    const datos = {
      nombre: this.producto.nombre,
      descripcion: this.producto.descripcion,
      precio: this.producto.precio,
      imagen: this.producto.imagen
    };

    this.productosService.actualizarProducto(id, datos).subscribe({

      next:()=>{

        alert("Producto actualizado");

        this.producto={
          nombre:'',
          descripcion:'',
          precio:0,
          imagen:''
        };

        this.editando=false;
        this.mostrarForm=false;

        this.cargarProductos();

      },

      error:err=>console.error(err)

    });

  }else{

    this.productosService.crearProducto(this.producto).subscribe({

      next:()=>{

        alert("Producto agregado");

        this.producto={
          nombre:'',
          descripcion:'',
          precio:0,
          imagen:''
        };

        this.mostrarForm=false;

        this.cargarProductos();

      },

      error:err=>console.error(err)

    });

  }

}

  editar(p:any){

    this.producto = {...p};

    this.mostrarForm = true;

    this.editando = true;

  }

  eliminar(id: string) {

    if (confirm('¿Eliminar producto?')) {

      this.productosService.eliminarProducto(id).subscribe({
        next: () => this.cargarProductos(),
        error: err => console.error(err)
      });

    }

  }

  trackById(index: number, item: any): any {
    return item._id;
  }

}