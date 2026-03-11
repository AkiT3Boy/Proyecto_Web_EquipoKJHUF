import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Auth } from './auth';

export type PedidoItem = {
  producto_id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  imagen_url: string;
  subtotal?: number;
};

export type Pedido = {
  _id?: string;
  cliente: string;
  telefono: string;
  notas: string;
  estado: 'pendiente' | 'en_proceso' | 'entregado' | 'cancelado';
  items: PedidoItem[];
  total: number;
  creado_en?: string;
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
  ) {}

  crearPedido(payload: Omit<Pedido, '_id' | 'estado' | 'total'>): Observable<{ msg: string; _id: string }> {
    return this.http.post<{ msg: string; _id: string }>(this.api, payload);
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
}
