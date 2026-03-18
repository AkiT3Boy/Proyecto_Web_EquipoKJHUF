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
    const sendBeaconDisponible =
      typeof navigator !== 'undefined' &&
      typeof navigator.sendBeacon === 'function' &&
      typeof Blob !== 'undefined';

    if (sendBeaconDisponible) {
      return new Observable<{ msg: string; _id: string }>((subscriber) => {
        try {
          const blob = new Blob([JSON.stringify(payload)], {
            type: 'text/plain;charset=UTF-8',
          });
          const enviado = navigator.sendBeacon(this.api, blob);

          if (!enviado) {
            subscriber.error(new Error('No se pudo poner en cola el pedido.'));
            return;
          }

          subscriber.next({
            msg: 'Pedido recibido',
            _id: '',
          });
          subscriber.complete();
        } catch (error) {
          subscriber.error(
            error instanceof Error ? error : new Error('No se pudo enviar el pedido.'),
          );
        }
      });
    }

    return new Observable<{ msg: string; _id: string }>((subscriber) => {
      const request = new XMLHttpRequest();
      request.open('POST', this.api, true);
      request.setRequestHeader('Content-Type', 'application/json');
      request.timeout = 10000;

      request.onload = () => {
        const data = this.parseJsonResponse(request.responseText);

        if (request.status >= 200 && request.status < 300) {
          subscriber.next({
            msg: data.msg || 'Pedido recibido',
            _id: data._id || '',
          });
          subscriber.complete();
          return;
        }

        subscriber.error(
          new Error(data.msg || `No se pudo enviar el pedido. Codigo ${request.status || 0}.`),
        );
      };

      request.onerror = () => {
        subscriber.error(new Error('No se pudo conectar con el servidor de pedidos.'));
      };

      request.ontimeout = () => {
        subscriber.error(new Error('El servidor tardo demasiado en responder. Intenta otra vez.'));
      };

      request.onabort = () => {
        subscriber.error(new Error('El envio del pedido fue cancelado.'));
      };

      request.send(JSON.stringify(payload));

      return () => {
        if (request.readyState !== XMLHttpRequest.DONE) {
          request.abort();
        }
      };
    });
  }

  private parseJsonResponse(responseText: string): Partial<{ msg: string; _id: string }> {
    try {
      return JSON.parse(responseText || '{}') as Partial<{ msg: string; _id: string }>;
    } catch {
      return {};
    }
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
