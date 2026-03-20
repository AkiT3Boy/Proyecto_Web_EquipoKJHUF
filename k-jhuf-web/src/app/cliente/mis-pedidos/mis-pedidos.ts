import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, interval, of, startWith, switchMap } from 'rxjs';
import { Pedidos, Pedido, PedidoPendiente } from '../../services/pedidos';
import { UsuariosService } from '../../services/usuarios';

@Component({
  selector: 'app-mis-pedidos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mis-pedidos.html',
  styleUrls: ['./mis-pedidos.css'],
})
export class MisPedidos {
  pedidos: Pedido[] = [];
  cargando = true;
  error = '';
  mensaje = '';
  confirmacionAbierta = false;
  pedidoCancelar?: Pedido;
  pedidoPendiente: PedidoPendiente | null = null;
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly pedidosService: Pedidos,
    private readonly usuarios: UsuariosService,
    private readonly router: Router,
  ) {
    if (!this.usuarios.isAuthenticated()) {
      this.router.navigateByUrl('/');
      return;
    }

    this.pedidoPendiente = this.pedidosService.getPedidoPendiente();
    if (this.pedidoPendiente) {
      this.pedidos = [this.pedidoPendiente];
      this.cargando = false;
    }

    interval(2000)
      .pipe(
        startWith(0),
        switchMap(() =>
          this.pedidosService.getMisPedidos().pipe(
            catchError((error) => {
              this.error = error?.error?.msg || 'No se pudo cargar tu historial de pedidos.';
              return of([]);
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((pedidos) => {
        this.pedidos = this.mezclarConPendiente(pedidos);
        this.cargando = false;
      });
  }

  abrirConfirmacionCancelacion(pedido: Pedido): void {
    this.pedidoCancelar = pedido;
    this.confirmacionAbierta = true;
  }

  cerrarConfirmacion(): void {
    this.confirmacionAbierta = false;
    this.pedidoCancelar = undefined;
  }

  cancelarPedido(): void {
    if (!this.pedidoCancelar?._id) {
      return;
    }

    const pedidoId = this.pedidoCancelar._id;

    this.pedidosService.cancelarMiPedido(pedidoId).subscribe({
      next: ({ msg }) => {
        this.mensaje = msg;
        this.pedidos = this.pedidos.filter((pedido) => pedido._id !== pedidoId);
        this.cerrarConfirmacion();
      },
      error: (error) => {
        this.error = error?.error?.msg || 'No se pudo cancelar el pedido.';
        this.cerrarConfirmacion();
      },
    });
  }

  estadoLabel(estado: Pedido['estado']): string {
    if (estado === 'entregado') {
      return 'terminado';
    }
    if (estado === 'en_proceso') {
      return 'en proceso';
    }
    return estado;
  }

  puedeCancelar(pedido: Pedido): boolean {
    return pedido.estado === 'pendiente' || pedido.estado === 'en_proceso';
  }

  private mezclarConPendiente(pedidos: Pedido[]): Pedido[] {
    if (!this.pedidoPendiente) {
      return pedidos;
    }

    const existe = pedidos.some((pedido) => this.pedidosService.coincideConPendiente(pedido, this.pedidoPendiente as PedidoPendiente));
    if (existe) {
      this.pedidosService.clearPedidoPendiente();
      this.pedidoPendiente = null;
      return pedidos;
    }

    return [this.pedidoPendiente, ...pedidos];
  }
}
