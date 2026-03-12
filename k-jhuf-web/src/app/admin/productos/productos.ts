import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, forkJoin, interval, of, startWith, switchMap } from 'rxjs';
import { Auth } from '../../services/auth';
import { HomeConfigService } from '../../services/home-config';
import { DashboardAdmin, Pedido, Pedidos } from '../../services/pedidos';
import { Producto, ProductosService } from '../../services/productos';
import { Promocion, Promociones as PromocionesService } from '../../services/promociones';

type ProductoForm = {
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  imagen_url: string;
  ingredientesTexto: string;
  detallesTexto: string;
  destacado: boolean;
};

type PromocionForm = {
  titulo: string;
  descripcion: string;
  tipo: 'porcentaje' | 'precio' | '2x1' | 'combo';
  valor: number;
  producto_ids: string[];
};

@Component({
  selector: 'app-admin-productos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './productos.html',
  styleUrls: ['./productos.css'],
})
export class AdminProductos implements OnInit {
  adminListo = false;
  configurado = false;
  autenticado = false;
  authError = '';
  authPassword = '';
  authConfirm = '';
  notificacionPedido = '';
  homeBannerUrl = '';

  lista: Producto[] = [];
  promociones: Promocion[] = [];
  pedidos: Pedido[] = [];
  dashboard?: DashboardAdmin;

  editandoProductoId: string | null = null;
  editandoPromocionId: string | null = null;
  productoForm: ProductoForm = this.crearProductoForm();
  promocionForm: PromocionForm = this.crearPromocionForm();
  readonly categoriasDisponibles = ['raspados', 'elotes', 'snacks', 'carnes frias y quesos'];
  readonly tiposPromocion: PromocionForm['tipo'][] = ['porcentaje', 'precio', '2x1', 'combo'];

  private readonly destroyRef = inject(DestroyRef);
  private pendingSnapshot = 0;
  private pollingIniciado = false;

  constructor(
    private readonly auth: Auth,
    private readonly homeConfigService: HomeConfigService,
    private readonly productosService: ProductosService,
    private readonly promocionesService: PromocionesService,
    private readonly pedidosService: Pedidos,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.autenticado = this.auth.isAuthenticated();

    this.auth.status().subscribe({
      next: ({ configured }) => {
        this.configurado = configured;
        this.adminListo = true;

        if (this.autenticado) {
          this.iniciarPolling();
        }
      },
      error: () => {
        this.adminListo = true;
      },
    });
  }

  get modoAuth(): 'setup' | 'login' {
    return this.configurado ? 'login' : 'setup';
  }

  get tipoPromocionLabel(): string {
    if (this.promocionForm.tipo === 'porcentaje') {
      return 'Porcentaje de descuento';
    }
    if (this.promocionForm.tipo === 'precio') {
      return 'Precio final promocional';
    }
    if (this.promocionForm.tipo === '2x1') {
      return 'Valor de referencia';
    }
    return 'Precio del combo';
  }

  iniciarSesion(): void {
    this.authError = '';

    if (this.modoAuth === 'setup') {
      if (!this.authPassword || this.authPassword !== this.authConfirm) {
        this.authError = 'Las contrasenas no coinciden.';
        return;
      }

      this.auth.setup(this.authPassword).subscribe({
        next: () => {
          this.configurado = true;
          this.autenticado = true;
          this.authPassword = '';
          this.authConfirm = '';
          this.iniciarPolling();
        },
        error: (error) => {
          this.authError = error.error?.msg || 'No se pudo crear la contrasena.';
        },
      });
      return;
    }

    this.auth.login(this.authPassword).subscribe({
      next: () => {
        this.autenticado = true;
        this.authPassword = '';
        this.iniciarPolling();
      },
      error: (error) => {
        this.authError = error.error?.msg || 'Contrasena incorrecta.';
      },
    });
  }

  cerrarSesion(): void {
    this.auth.logout().subscribe({
      next: () => {
        this.auth.clearToken();
        this.autenticado = false;
        this.pedidos = [];
        this.dashboard = undefined;
      },
      error: () => {
        this.auth.clearToken();
        this.autenticado = false;
      },
    });
  }

  cerrarModalAuth(): void {
    this.authError = '';
    this.authPassword = '';
    this.authConfirm = '';
    this.router.navigateByUrl('/');
  }

  guardarProducto(): void {
    const payload = this.mapearProductoDesdeForm();

    const request = this.editandoProductoId
      ? this.productosService.actualizarProducto(this.editandoProductoId, payload)
      : this.productosService.crearProducto(payload);

    request.subscribe({
      next: () => {
        this.resetProductoForm();
        this.cargarDatosUnaVez();
      },
      error: (error) => this.manejarErrorAdmin(error),
    });
  }

  guardarBannerHome(): void {
    this.authError = '';
    this.homeConfigService.updateBannerUrl(this.homeBannerUrl).subscribe({
      next: ({ home_banner_url }) => {
        this.homeBannerUrl = home_banner_url;
      },
      error: (error) => this.manejarErrorAdmin(error),
    });
  }

  editarProducto(producto: Producto): void {
    this.editandoProductoId = producto._id || null;
    this.productoForm = {
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      precio: producto.precio,
      categoria: producto.categoria,
      imagen_url: producto.imagen_url || producto.imagen || '',
      ingredientesTexto: (producto.ingredientes || []).join('\n'),
      detallesTexto: (producto.detalles || []).join('\n'),
      destacado: !!producto.destacado,
    };
  }

  eliminarProducto(id: string | undefined): void {
    if (!id) {
      return;
    }

    this.productosService.eliminarProducto(id).subscribe({
      next: () => {
        if (this.editandoProductoId === id) {
          this.resetProductoForm();
        }
        this.cargarDatosUnaVez();
      },
      error: (error) => this.manejarErrorAdmin(error),
    });
  }

  guardarPromocion(): void {
    const payload: Promocion = {
      _id: this.editandoPromocionId || undefined,
      titulo: this.promocionForm.titulo,
      descripcion: this.promocionForm.descripcion,
      tipo: this.promocionForm.tipo,
      valor: Number(this.promocionForm.valor),
      producto_ids: this.promocionForm.producto_ids,
      activo: true,
    };

    const request = this.editandoPromocionId
      ? this.promocionesService.actualizarPromocion(this.editandoPromocionId, payload)
      : this.promocionesService.crearPromocion(payload);

    request.subscribe({
      next: () => {
        this.resetPromocionForm();
        this.cargarDatosUnaVez();
      },
      error: (error) => this.manejarErrorAdmin(error),
    });
  }

  editarPromocion(promocion: Promocion): void {
    this.editandoPromocionId = promocion._id || null;
    this.promocionForm = {
      titulo: promocion.titulo,
      descripcion: promocion.descripcion,
      tipo: promocion.tipo,
      valor: promocion.valor,
      producto_ids: [...(promocion.producto_ids || [])],
    };
  }

  eliminarPromocion(id: string | undefined): void {
    if (!id) {
      return;
    }

    this.promocionesService.eliminarPromocion(id).subscribe({
      next: () => {
        if (this.editandoPromocionId === id) {
          this.resetPromocionForm();
        }
        this.cargarDatosUnaVez();
      },
      error: (error) => this.manejarErrorAdmin(error),
    });
  }

  toggleProductoEnPromocion(productoId: string, checked: boolean): void {
    const seleccionados = new Set(this.promocionForm.producto_ids);

    if (checked) {
      seleccionados.add(productoId);
    } else {
      seleccionados.delete(productoId);
    }

    this.promocionForm.producto_ids = Array.from(seleccionados);
  }

  productoSeleccionado(productoId: string | undefined): boolean {
    return !!productoId && this.promocionForm.producto_ids.includes(productoId);
  }

  nombreProductos(ids: string[] = []): string {
    const nombres = this.lista
      .filter((producto) => ids.includes(producto._id || ''))
      .map((producto) => producto.nombre);

    return nombres.length ? nombres.join(', ') : 'Sin productos ligados';
  }

  valorPromocion(promocion: Promocion): string {
    if (promocion.tipo === 'porcentaje') {
      return `${promocion.valor}%`;
    }
    if (promocion.tipo === '2x1') {
      return '2x1';
    }
    return `$${promocion.valor}`;
  }

  actualizarEstadoPedido(id: string | undefined, estado: Pedido['estado']): void {
    if (!id) {
      return;
    }

    this.pedidosService.actualizarEstado(id, estado).subscribe({
      next: () => this.cargarDatosUnaVez(),
      error: (error) => this.manejarErrorAdmin(error),
    });
  }

  totalItemsPedido(pedido: Pedido): number {
    return pedido.items.reduce((acc, item) => acc + item.cantidad, 0);
  }

  resetProductoForm(): void {
    this.editandoProductoId = null;
    this.productoForm = this.crearProductoForm();
  }

  resetPromocionForm(): void {
    this.editandoPromocionId = null;
    this.promocionForm = this.crearPromocionForm();
  }

  private iniciarPolling(): void {
    if (this.pollingIniciado) {
      this.cargarDatosUnaVez();
      return;
    }

    this.pollingIniciado = true;
    interval(15000)
      .pipe(
        startWith(0),
        switchMap(() =>
          forkJoin({
            productos: this.productosService.getProductos(true).pipe(catchError(() => of([]))),
            promociones: this.promocionesService.getPromociones(true).pipe(catchError(() => of([]))),
            pedidos: this.pedidosService.getPedidos().pipe(catchError(() => of([]))),
            dashboard: this.pedidosService.getDashboard().pipe(catchError(() => of(undefined))),
            homeConfig: this.homeConfigService.getConfig().pipe(catchError(() => of({ home_banner_url: '' }))),
          }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ productos, promociones, pedidos, dashboard, homeConfig }) => {
        if (!this.autenticado) {
          return;
        }

        this.lista = productos;
        this.promociones = promociones;
        this.pedidos = pedidos;
        this.dashboard = dashboard;
        this.homeBannerUrl = homeConfig.home_banner_url || '';
        this.actualizarNotificacionPedidos(pedidos);
      });
  }

  private cargarDatosUnaVez(): void {
    forkJoin({
      productos: this.productosService.getProductos(true).pipe(catchError(() => of([]))),
      promociones: this.promocionesService.getPromociones(true).pipe(catchError(() => of([]))),
      pedidos: this.pedidosService.getPedidos().pipe(catchError(() => of([]))),
      dashboard: this.pedidosService.getDashboard().pipe(catchError(() => of(undefined))),
      homeConfig: this.homeConfigService.getConfig().pipe(catchError(() => of({ home_banner_url: '' }))),
    }).subscribe(({ productos, promociones, pedidos, dashboard, homeConfig }) => {
      this.lista = productos;
      this.promociones = promociones;
      this.pedidos = pedidos;
      this.dashboard = dashboard;
      this.homeBannerUrl = homeConfig.home_banner_url || '';
      this.actualizarNotificacionPedidos(pedidos);
    });
  }

  private actualizarNotificacionPedidos(pedidos: Pedido[]): void {
    const pendientes = pedidos.filter((pedido) => pedido.estado === 'pendiente').length;
    if (pendientes > this.pendingSnapshot && this.pendingSnapshot !== 0) {
      this.notificacionPedido = `Entraron ${pendientes - this.pendingSnapshot} pedido(s) nuevo(s).`;
    }
    this.pendingSnapshot = pendientes;
  }

  private crearProductoForm(): ProductoForm {
    return {
      nombre: '',
      descripcion: '',
      precio: 0,
      categoria: 'snacks',
      imagen_url: '',
      ingredientesTexto: '',
      detallesTexto: '',
      destacado: false,
    };
  }

  private crearPromocionForm(): PromocionForm {
    return {
      titulo: '',
      descripcion: '',
      tipo: 'porcentaje',
      valor: 0,
      producto_ids: [],
    };
  }

  private mapearProductoDesdeForm(): Producto {
    return {
      nombre: this.productoForm.nombre,
      descripcion: this.productoForm.descripcion,
      precio: Number(this.productoForm.precio),
      categoria: this.productoForm.categoria,
      imagen_url: this.productoForm.imagen_url,
      ingredientes: this.productoForm.ingredientesTexto
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
      detalles: this.productoForm.detallesTexto
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
      destacado: this.productoForm.destacado,
      activo: true,
    };
  }

  private manejarErrorAdmin(error: { status?: number; error?: { msg?: string } }): void {
    if (error.status === 401) {
      this.auth.clearToken();
      this.autenticado = false;
      this.authError = 'La sesion expiro. Vuelve a iniciar.';
      return;
    }

    this.authError = error.error?.msg || 'No se pudo completar la accion.';
  }
}
