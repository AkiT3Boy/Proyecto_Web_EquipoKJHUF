import { Producto } from './productos';
import { Promocion } from './promociones';

export const PRODUCTOS_SEED: Producto[] = [
  {
    _id: 'seed-esquites-chico',
    nombre: 'Esquites Chico',
    descripcion: 'Esquites chicos cremosos con maiz tierno, limon y toque de chile.',
    precio: 40,
    categoria: 'elotes',
    imagen_url: '',
    ingredientes: ['Maiz desgranado', 'Mayonesa', 'Queso', 'Chile', 'Limon'],
    detalles: ['Preparado al momento', 'Picante ajustable'],
    destacado: true,
    activo: true,
  },
  {
    _id: 'seed-esquites-mediano',
    nombre: 'Esquites Mediano',
    descripcion: 'Porcion mediana de esquites con mas queso y mas limon.',
    precio: 45,
    categoria: 'elotes',
    imagen_url: '',
    ingredientes: ['Maiz desgranado', 'Mayonesa', 'Queso extra', 'Chile', 'Limon'],
    detalles: ['Ideal para antojo personal', 'Salsa al gusto'],
    destacado: false,
    activo: true,
  },
  {
    _id: 'seed-maruchan-loca',
    nombre: 'Maruchan Loca',
    descripcion: 'Maruchan preparada con cueritos, queso, salsa y limon.',
    precio: 80,
    categoria: 'snacks',
    imagen_url: '',
    ingredientes: ['Maruchan', 'Queso', 'Cueritos', 'Salsa', 'Limon'],
    detalles: ['Calientita al servir', 'Botana completa'],
    destacado: true,
    activo: true,
  },
  {
    _id: 'seed-nachos-especiales',
    nombre: 'Nachos Especiales',
    descripcion: 'Totopos crujientes con queso, jalapeno y aderezo.',
    precio: 65,
    categoria: 'snacks',
    imagen_url: '',
    ingredientes: ['Totopos', 'Queso', 'Jalapeno', 'Aderezo'],
    detalles: ['Queso extra opcional', 'Para botanear'],
    destacado: true,
    activo: true,
  },
  {
    _id: 'seed-queso-fundido',
    nombre: 'Queso Fundido',
    descripcion: 'Queso fundido caliente con acompanamiento para compartir.',
    precio: 95,
    categoria: 'carnes frias y quesos',
    imagen_url: '',
    ingredientes: ['Queso fundido', 'Totopos', 'Chile'],
    detalles: ['Sale caliente', 'Ideal para compartir'],
    destacado: false,
    activo: true,
  },
  {
    _id: 'seed-queso-fresco',
    nombre: 'Queso Fresco',
    descripcion: 'Queso fresco para acompanar esquites, antojitos o botanear.',
    precio: 55,
    categoria: 'carnes frias y quesos',
    imagen_url: '',
    ingredientes: ['Queso fresco', 'Sal ligera'],
    detalles: ['Listo para servir', 'Sabor suave'],
    destacado: false,
    activo: true,
  },
  {
    _id: 'seed-requeson-casero',
    nombre: 'Requeson Casero',
    descripcion: 'Requeson suave y fresco para antojitos, tostadas o acompanamientos.',
    precio: 48,
    categoria: 'carnes frias y quesos',
    imagen_url: '',
    ingredientes: ['Requeson', 'Sal ligera'],
    detalles: ['Textura cremosa', 'Hecho para acompanar'],
    destacado: false,
    activo: true,
  },
  {
    _id: 'seed-crema-natural',
    nombre: 'Crema Natural',
    descripcion: 'Crema natural espesa para esquites, tostadas y botanas preparadas.',
    precio: 35,
    categoria: 'carnes frias y quesos',
    imagen_url: '',
    ingredientes: ['Crema natural'],
    detalles: ['Sabor casero', 'Ideal como topping'],
    destacado: false,
    activo: true,
  },
  {
    _id: 'seed-jamon-pavo',
    nombre: 'Jamon de Pavo',
    descripcion: 'Carne fria lista para complementar charolas, sandwiches y antojos.',
    precio: 62,
    categoria: 'carnes frias y quesos',
    imagen_url: '',
    ingredientes: ['Jamon de pavo'],
    detalles: ['Listo para servir', 'Ideal para combos'],
    destacado: false,
    activo: true,
  },
  {
    _id: 'seed-tostilocos',
    nombre: 'Tostilocos Clasicos',
    descripcion: 'Tostitos preparados con cueritos, cacahuates, pepino y salsa.',
    precio: 65,
    categoria: 'snacks',
    imagen_url: '',
    ingredientes: ['Tostitos', 'Cueritos', 'Cacahuates', 'Pepino', 'Salsa'],
    detalles: ['Crujiente y picosito', 'Preparado al momento'],
    destacado: true,
    activo: true,
  },
  {
    _id: 'seed-raspado-fresa',
    nombre: 'Raspado Fresa',
    descripcion: 'Raspado frio de fresa con lechera y chamoy opcional.',
    precio: 35,
    categoria: 'raspados',
    imagen_url: '',
    ingredientes: ['Hielo raspado', 'Jarabe de fresa', 'Lechera'],
    detalles: ['Muy fresco', 'Chamoy opcional'],
    destacado: false,
    activo: true,
  },
  {
    _id: 'seed-raspado-mango',
    nombre: 'Raspado Mango',
    descripcion: 'Raspado de mango dulce con tamarindo y chile si lo quieres.',
    precio: 38,
    categoria: 'raspados',
    imagen_url: '',
    ingredientes: ['Hielo raspado', 'Jarabe de mango', 'Tamarindo'],
    detalles: ['Dulce y acidito', 'Muy frio'],
    destacado: false,
    activo: true,
  },
];

export const PROMOCIONES_SEED: Promocion[] = [
  {
    _id: 'seed-promo-esquites',
    titulo: '20% off',
    descripcion: 'Descuento directo para Esquites Chico durante todo el dia.',
    tipo: 'porcentaje',
    valor: 20,
    producto_ids: ['seed-esquites-chico'],
    activo: true,
  },
  {
    _id: 'seed-promo-maruchan',
    titulo: 'Ahora $110',
    descripcion: 'Combo especial con Maruchan Loca y Nachos Especiales.',
    tipo: 'combo',
    valor: 110,
    producto_ids: ['seed-maruchan-loca', 'seed-nachos-especiales'],
    activo: true,
  },
  {
    _id: 'seed-promo-nachos',
    titulo: '15% off',
    descripcion: 'Promo especial para Nachos Especiales con queso.',
    tipo: 'porcentaje',
    valor: 15,
    producto_ids: ['seed-nachos-especiales'],
    activo: true,
  },
  {
    _id: 'seed-promo-raspado',
    titulo: 'Lleva 2 paga 1',
    descripcion: 'Promo 2x1 en raspados seleccionados por tiempo limitado.',
    tipo: '2x1',
    valor: 2,
    producto_ids: ['seed-raspado-fresa', 'seed-raspado-mango'],
    activo: true,
  },
];

export function mezclarProductos(productosApi: Producto[] = []): Producto[] {
  const mapa = new Map<string, Producto>();

  for (const producto of PRODUCTOS_SEED) {
    mapa.set(claveProducto(producto), producto);
  }

  for (const producto of productosApi) {
    mapa.set(claveProducto(producto), producto);
  }

  return Array.from(mapa.values());
}

export function mezclarPromociones(promocionesApi: Promocion[] = []): Promocion[] {
  const mapa = new Map<string, Promocion>();

  for (const promocion of PROMOCIONES_SEED) {
    mapa.set(clavePromocion(promocion), promocion);
  }

  for (const promocion of promocionesApi) {
    mapa.set(clavePromocion(promocion), promocion);
  }

  return Array.from(mapa.values());
}

function claveProducto(producto: Producto): string {
  return normalizarClave(producto.nombre || producto._id || '');
}

function clavePromocion(promocion: Promocion): string {
  return normalizarClave(promocion.titulo || promocion._id || '');
}

function normalizarClave(valor: string): string {
  return (valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
