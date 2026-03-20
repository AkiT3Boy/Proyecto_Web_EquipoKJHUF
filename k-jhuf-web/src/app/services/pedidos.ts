import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { Auth } from './auth';
import { UsuariosService } from './usuarios';

export type PedidoItem = {
  producto_id: string;
  nombre: string;
  precio: number;
  precio_original?: number;
  cantidad: number;
  imagen_url: string;
  subtotal?: number;
};

export type PedidoDescuento = {
  titulo: string;
  tipo: string;
  monto: number;
};

export type Pedido = {
  _id?: string;
  cliente: string;
  telefono: string;
  notas: string;
  hora_entrega?: string;
  fecha_pedido_local?: string;
  estado: 'pendiente' | 'en_proceso' | 'entregado' | 'cancelado';
  items: PedidoItem[];
  subtotal?: number;
  descuentos_aplicados?: PedidoDescuento[];
  total: number;
  creado_en?: string;
};

export type PedidoPendiente = Omit<Pedido, 'estado'> & {
  estado: 'pendiente';
  pendiente_local?: boolean;
};

export type DashboardAdmin = {
  metrics: {
    productos_activos: number;
    promociones_activas: number;
    pedidos_pendientes: number;
    total_pedidos: number;
    ingresos_estimados: number;
  };
  top_productos: Array<{
    producto_id?: string;
    nombre: string;
    cantidad: number;
  }>;
};

@Injectable({
  providedIn: 'root',
})
export class Pedidos {
  private readonly api = 'http://localhost:3000/api/pedidos';
  private readonly adminApi = 'http://localhost:3000/api/admin/dashboard';

  constructor(
    private readonly http: HttpClient,
    private readonly auth: Auth,
    private readonly usuarios: UsuariosService,
  ) {}

  crearPedido(payload: Omit<Pedido, '_id' | 'estado' | 'total'>): Observable<{ msg: string; _id: string }> {
    return this.http
      .post<{ msg: string; _id: string }>(this.api, payload, {
        headers: {
          'X-User-Token': this.usuarios.getToken() || '',
        },
      })
      .pipe(timeout(10000));
  }

  getMisPedidos(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>('http://localhost:3000/api/usuarios/pedidos', {
      headers: this.usuarios.getAuthHeaders(),
    });
  }

  cancelarMiPedido(id: string): Observable<{ msg: string }> {
    return this.http.patch<{ msg: string }>(
      `http://localhost:3000/api/usuarios/pedidos/${id}/cancelar`,
      {},
      { headers: this.usuarios.getAuthHeaders() },
    );
  }

  getPedidos(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(this.api, {
      headers: this.auth.getAuthHeaders(),
    });
  }

  actualizarEstado(id: string, estado: Pedido['estado']): Observable<{ msg: string }> {
    return this.http.patch<{ msg: string }>(
      `${this.api}/${id}/estado`,
      { estado },
      { headers: this.auth.getAuthHeaders() },
    );
  }

  getDashboard(): Observable<DashboardAdmin> {
    return this.http.get<DashboardAdmin>(this.adminApi, {
      headers: this.auth.getAuthHeaders(),
    });
  }

  setPedidoPendiente(payload: {
    cliente: string;
    telefono: string;
    notas: string;
    hora_entrega?: string;
    items: Array<{ producto_id: string; nombre: string; precio: number; cantidad: number; imagen_url: string }>;
  }): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }

    const total = payload.items.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
    const ahora = new Date();
    const preview: PedidoPendiente = {
      _id: 'pendiente-local',
      cliente: payload.cliente,
      telefono: payload.telefono,
      notas: payload.notas,
      hora_entrega: payload.hora_entrega,
      fecha_pedido_local: ahora.toISOString().slice(0, 10),
      estado: 'pendiente',
      items: payload.items.map((item) => ({
        producto_id: item.producto_id,
        nombre: item.nombre,
        precio: item.precio,
        cantidad: item.cantidad,
        imagen_url: item.imagen_url,
      })),
      total,
      creado_en: ahora.toISOString(),
      pendiente_local: true,
    };

    sessionStorage.setItem(this.getPendingOrderKey(), JSON.stringify(preview));
  }

  getPedidoPendiente(): PedidoPendiente | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }

    const raw = sessionStorage.getItem(this.getPendingOrderKey());
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as PedidoPendiente;
    } catch {
      return null;
    }
  }

  clearPedidoPendiente(): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    sessionStorage.removeItem(this.getPendingOrderKey());
  }

  coincideConPendiente(pedido: Pedido, pendiente: PedidoPendiente): boolean {
    if ((pedido.items || []).length !== (pendiente.items || []).length) {
      return false;
    }

    if ((pedido.hora_entrega || '') !== (pendiente.hora_entrega || '')) {
      return false;
    }

    return pendiente.items.every((item) =>
      pedido.items.some(
        (pedidoItem) =>
          pedidoItem.producto_id === item.producto_id &&
          pedidoItem.cantidad === item.cantidad,
      ),
    );
  }

  private getPendingOrderKey(): string {
    const usuario = this.usuarios.getUsuarioActual();
    const base = this.usuarios.getToken() || usuario?.telefono?.trim() || 'anon';
    const safeBase = base.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `kjhuf_pending_order_${safeBase}`;
  }
}
