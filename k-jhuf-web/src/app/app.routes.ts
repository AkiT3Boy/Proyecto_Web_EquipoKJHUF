import { Routes } from '@angular/router';
import { Productos } from './cliente/productos/productos';
import { AdminProductos } from './admin/productos/productos';

export const routes: Routes = [

  // CLIENTE - catálogo
  { path: '', redirectTo: 'productos', pathMatch: 'full' },
  { path: 'productos', component: Productos },

  // ADMIN
  { path: 'admin', component: AdminProductos },
  { path: 'admin/nuevo', component: Productos },

  // fallback
  { path: '**', redirectTo: 'productos' }
];