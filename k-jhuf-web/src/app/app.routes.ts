import { Routes } from '@angular/router';
import { AdminProductos } from './admin/productos/productos';
import { Contacto } from './cliente/contacto/contacto';
import { Home } from './cliente/home/home';
import { Productos } from './cliente/productos/productos';
import { Promociones } from './cliente/promociones/promociones';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'productos', component: Productos },
  { path: 'promociones', component: Promociones },
  { path: 'contacto', component: Contacto },
  { path: 'admin', component: AdminProductos },
  { path: '**', redirectTo: '' },
];
