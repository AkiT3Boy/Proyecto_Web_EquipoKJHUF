import { Routes } from '@angular/router';

import { Home } from './cliente/home/home';
import { Productos } from './cliente/productos/productos';
import { Promociones } from './cliente/promociones/promociones';
import { Contacto } from './cliente/contacto/contacto';

import { AdminLogin } from './admin/login/login';
import { AdminProductos } from './admin/productos/productos';
import { AdminPromociones } from './admin/promociones/promociones';

import { AdminGuard } from './services/admin.guard';

export const routes: Routes = [

  // CLIENTE
  { path: '', component: Home },

  { path: 'productos', component: Productos },

  { path: 'promociones', component: Promociones },

  { path: 'contacto', component: Contacto },

  // ADMIN
  { path: 'admin/login', component: AdminLogin },

  { path: 'admin', component: AdminProductos, canActivate: [AdminGuard] },

  { path: 'admin/promociones', component: AdminPromociones, canActivate: [AdminGuard] },

  // fallback
  { path: '**', redirectTo: '' }

];