import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Carrito } from '../../services/carrito';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css'],
})
export class Navbar {
  menuAbierto = false;
  totalItems = 0;
  private readonly destroyRef = inject(DestroyRef);

  readonly enlaces = [
    { label: 'Inicio', ruta: '/' },
    { label: 'Productos', ruta: '/productos' },
    { label: 'Promociones', ruta: '/promociones' },
    { label: 'Contacto', ruta: '/contacto' },
  ];

  constructor(private readonly carrito: Carrito) {
    this.carrito.items.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.totalItems = this.carrito.getCount();
    });
  }

  toggleMenu(): void {
    this.menuAbierto = !this.menuAbierto;
  }

  cerrarMenu(): void {
    this.menuAbierto = false;
  }

  abrirCarrito(): void {
    this.carrito.open();
    this.cerrarMenu();
  }
}
