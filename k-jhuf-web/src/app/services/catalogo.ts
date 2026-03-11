import { Producto } from './productos';
import { Promocion } from './promociones';

export type ProductoVista = Producto & {
  imagenMostrada: string;
  promocionesAplicadas: Promocion[];
  precioFinal: number;
  resumenPromo: string;
};

export function mapearProductosConPromociones(
  productos: Producto[],
  promociones: Promocion[],
): ProductoVista[] {
  return productos.map((producto) => {
    const promocionesAplicadas = promociones.filter((promocion) => {
      const ids = promocion.producto_ids || [];
      return promocion.activo !== false && ids.includes(producto._id || '');
    });

    return {
      ...producto,
      ingredientes: producto.ingredientes || [],
      detalles: producto.detalles || [],
      destacado: !!producto.destacado,
      imagenMostrada: (producto.imagen_url || producto.imagen || '').trim(),
      promocionesAplicadas,
      precioFinal: calcularPrecioPromocional(producto.precio, promocionesAplicadas),
      resumenPromo: obtenerResumenPromo(promocionesAplicadas),
    };
  });
}

export function calcularPrecioPromocional(precio: number, promociones: Promocion[]): number {
  return promociones.reduce((acumulado, promocion) => {
    if (promocion.tipo === 'porcentaje') {
      return acumulado - acumulado * (promocion.valor / 100);
    }

    if (promocion.tipo === 'precio' || promocion.tipo === 'combo') {
      return Math.min(acumulado, promocion.valor);
    }

    return acumulado;
  }, precio);
}

export function obtenerResumenPromo(promociones: Promocion[]): string {
  if (!promociones.length) {
    return 'Disponible todo el dia';
  }

  return promociones
    .map((promocion) => {
      if (promocion.tipo === 'porcentaje') {
        return `${promocion.valor}% off`;
      }

      if (promocion.tipo === 'precio') {
        return `Ahora $${promocion.valor}`;
      }

      if (promocion.tipo === '2x1') {
        return 'Promo 2x1';
      }

      return 'Combo especial';
    })
    .join(' | ');
}
