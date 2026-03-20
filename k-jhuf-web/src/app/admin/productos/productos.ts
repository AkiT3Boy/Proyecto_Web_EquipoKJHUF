import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, catchError, forkJoin, interval, of, startWith, switchMap } from 'rxjs';
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
export class AdminProductos implements OnInit, OnDestroy {
  @ViewChild('authPasswordInput') authPasswordInput?: ElementRef<HTMLInputElement>;
  @ViewChild('authConfirmInput') authConfirmInput?: ElementRef<HTMLInputElement>;
  @ViewChild('confirmPrimaryButton') confirmPrimaryButton?: ElementRef<HTMLButtonElement>;

  adminListo = false;
  configurado = false;
  autenticado = false;
  authError = '';
  pageSuccess = '';
  authPassword = '';
  authConfirm = '';
  notificacionPedido = '';
  homeBannerUrl = '';
  confirmacionAbierta = false;
  confirmacionProcesando = false;
  confirmacionTitulo = '';
  confirmacionMensaje = '';

  lista: Producto[] = [];
  promociones: Promocion[] = [];
  pedidos: Pedido[] = [];
  dashboard?: DashboardAdmin;

  editandoProductoId: string | null = null;
  editandoPromocionId: string | null = null;
  productoForm: ProductoForm = this.crearProductoForm();
  promocionForm: PromocionForm = this.crearPromocionForm();
  authTouched = {
    password: false,
    confirm: false,
  };
  bannerTouched = false;
  productoTouched = {
    nombre: false,
    descripcion: false,
    precio: false,
    categoria: false,
    imagen_url: false,
    ingredientesTexto: false,
    detallesTexto: false,
  };
  promocionTouched = {
    titulo: false,
    descripcion: false,
    tipo: false,
    valor: false,
    producto_ids: false,
  };
  readonly categoriasDisponibles = ['raspados', 'elotes', 'snacks', 'carnes frias y quesos'];
  readonly tiposPromocion: PromocionForm['tipo'][] = ['porcentaje', 'precio', '2x1', 'combo'];

  private readonly destroyRef = inject(DestroyRef);
  private pendingSnapshot = 0;
  private pollingIniciado = false;
  private accionConfirmada: (() => void) | null = null;
  private modalActionCooldownUntil = 0;

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
        } else {
          this.focusAuthInput();
        }
      },
      error: () => {
        this.adminListo = true;
        this.focusAuthInput();
      },
    });
  }

  ngOnDestroy(): void {
    if (!this.autenticado) {
      this.auth.clearToken();
      return;
    }

    this.auth.logout().subscribe({
      next: () => {
        this.auth.clearToken();
        this.autenticado = false;
      },
      error: () => {
        this.auth.clearToken();
        this.autenticado = false;
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

  get authPasswordError(): string {
    if (!this.authTouched.password) {
      return '';
    }
    return this.authPassword.trim().length >= 4 ? '' : 'La contrasena debe tener al menos 4 caracteres.';
  }

  get authConfirmError(): string {
    if (this.modoAuth !== 'setup' || !this.authTouched.confirm) {
      return '';
    }
    return this.authPassword === this.authConfirm ? '' : 'Las contrasenas no coinciden.';
  }

  get bannerError(): string {
    if (!this.bannerTouched) {
      return '';
    }
    return !this.homeBannerUrl || this.urlValida(this.homeBannerUrl)
      ? ''
      : 'Ingresa una URL valida que empiece con http o https.';
  }

  get productoNombreError(): string {
    if (!this.productoTouched.nombre) {
      return '';
    }
    return this.textoMinimo(this.productoForm.nombre, 3) ? '' : 'El nombre debe tener al menos 3 caracteres.';
  }

  get productoDescripcionError(): string {
    if (!this.productoTouched.descripcion) {
      return '';
    }
    return this.textoMinimo(this.productoForm.descripcion, 10)
      ? ''
      : 'La descripcion debe tener al menos 10 caracteres.';
  }

  get productoPrecioError(): string {
    if (!this.productoTouched.precio) {
      return '';
    }
    return Number(this.productoForm.precio) > 0 ? '' : 'El precio debe ser mayor a 0.';
  }

  get productoCategoriaError(): string {
    if (!this.productoTouched.categoria) {
      return '';
    }
    return this.categoriasDisponibles.includes(this.productoForm.categoria) ? '' : 'Selecciona una categoria valida.';
  }

  get productoImagenError(): string {
    if (!this.productoTouched.imagen_url) {
      return '';
    }
    return !this.productoForm.imagen_url || this.urlValida(this.productoForm.imagen_url)
      ? ''
      : 'La imagen debe ser una URL valida.';
  }

  get productoIngredientesError(): string {
    if (!this.productoTouched.ingredientesTexto) {
      return '';
    }
    return this.listaTextoValida(this.productoForm.ingredientesTexto)
      ? ''
      : 'Agrega al menos un ingrediente o lo que lleva.';
  }

  get productoDetallesError(): string {
    if (!this.productoTouched.detallesTexto) {
      return '';
    }
    return this.listaTextoValida(this.productoForm.detallesTexto)
      ? ''
      : 'Agrega al menos un detalle del producto.';
  }

  get promocionTituloError(): string {
    if (!this.promocionTouched.titulo) {
      return '';
    }
    return this.textoMinimo(this.promocionForm.titulo, 3) ? '' : 'El titulo debe tener al menos 3 caracteres.';
  }

  get promocionDescripcionError(): string {
    if (!this.promocionTouched.descripcion) {
      return '';
    }
    return this.textoMinimo(this.promocionForm.descripcion, 8)
      ? ''
      : 'La descripcion debe tener al menos 8 caracteres.';
  }

  get promocionTipoError(): string {
    if (!this.promocionTouched.tipo) {
      return '';
    }
    return this.tiposPromocion.includes(this.promocionForm.tipo) ? '' : 'Selecciona un tipo valido.';
  }

  get promocionValorError(): string {
    if (!this.promocionTouched.valor) {
      return '';
    }
    return Number(this.promocionForm.valor) > 0 ? '' : 'El valor debe ser mayor a 0.';
  }

  get promocionProductosError(): string {
    if (!this.promocionTouched.producto_ids) {
      return '';
    }
    return this.promocionForm.producto_ids.length ? '' : 'Selecciona al menos un producto.';
  }

  iniciarSesion(): void {
    this.authError = '';
    this.pageSuccess = '';
    this.authTouched.password = true;
    if (this.modoAuth === 'setup') {
      this.authTouched.confirm = true;
    }

    if (this.authPasswordError || this.authConfirmError) {
      this.focusAuthInput();
      return;
    }

    if (this.modoAuth === 'setup') {
      this.auth.setup(this.authPassword).subscribe({
        next: () => {
          this.configurado = true;
          this.autenticado = true;
          this.authPassword = '';
          this.authConfirm = '';
          this.authTouched = { password: false, confirm: false };
          this.pageSuccess = 'Contrasena de admin creada correctamente.';
          this.iniciarPolling();
        },
        error: (error) => {
          this.authError = error.error?.msg || 'No se pudo crear la contrasena.';
          this.focusAuthInput();
        },
      });
      return;
    }

    this.auth.login(this.authPassword).subscribe({
      next: () => {
        this.autenticado = true;
        this.authPassword = '';
        this.authTouched = { password: false, confirm: false };
        this.pageSuccess = 'Sesion de admin iniciada.';
        this.iniciarPolling();
      },
      error: (error) => {
        this.authError = error.error?.msg || 'Contrasena incorrecta.';
        this.focusAuthInput();
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
        this.pageSuccess = '';
        this.focusAuthInput();
      },
      error: () => {
        this.auth.clearToken();
        this.autenticado = false;
        this.focusAuthInput();
      },
    });
  }

  cerrarModalAuth(): void {
    this.authError = '';
    this.authPassword = '';
    this.authConfirm = '';
    this.authTouched = { password: false, confirm: false };
    this.router.navigateByUrl('/');
  }

  cerrarModalAuthDesdeEvento(event?: Event): void {
    if (!this.consumirAccionModal(event)) {
      return;
    }
    this.cerrarModalAuth();
  }

  iniciarSesionDesdeEvento(event?: Event): void {
    if (!this.consumirAccionModal(event)) {
      return;
    }
    this.iniciarSesion();
  }

  guardarProducto(): void {
    this.authError = '';
    this.pageSuccess = '';
    this.marcarProductoTouched();
    if (this.productoInvalido()) {
      return;
    }

    const payload = this.mapearProductoDesdeForm();
    const editando = !!this.editandoProductoId;
    this.abrirConfirmacion(
      editando ? 'Guardar cambios del producto' : 'Agregar producto',
      editando
        ? `Se actualizaran los datos de ${payload.nombre}.`
        : `Se agregara ${payload.nombre} al catalogo.`,
      () => {
        const request = this.editandoProductoId
          ? this.productosService.actualizarProducto(this.editandoProductoId, payload)
          : this.productosService.crearProducto(payload);

        request.subscribe({
          next: () => {
            this.pageSuccess = editando ? 'Producto actualizado.' : 'Producto agregado.';
            this.resetProductoForm();
            this.cargarDatosUnaVez();
          },
          error: (error) => this.manejarErrorAdmin(error),
        });
      },
    );
  }

  guardarBannerHome(): void {
    this.authError = '';
    this.pageSuccess = '';
    this.bannerTouched = true;
    if (this.bannerError) {
      return;
    }
    this.abrirConfirmacion(
      'Guardar banner del home',
      this.homeBannerUrl
        ? 'Se actualizara la imagen principal del home.'
        : 'Se quitara la imagen del banner del home.',
      () => {
        this.homeConfigService.updateBannerUrl(this.homeBannerUrl).subscribe({
          next: ({ home_banner_url }) => {
            this.homeBannerUrl = home_banner_url;
            this.pageSuccess = 'Banner del home actualizado.';
          },
          error: (error) => this.manejarErrorAdmin(error),
        });
      },
    );
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
    const producto = this.lista.find((item) => item._id === id);
    this.abrirConfirmacion(
      'Eliminar producto',
      `Se eliminara ${producto?.nombre || 'este producto'} del catalogo.`,
      () => {
        this.productosService.eliminarProducto(id).subscribe({
          next: () => {
            this.pageSuccess = 'Producto eliminado.';
            this.lista = this.lista.filter((item) => item._id !== id);
            if (this.editandoProductoId === id) {
              this.resetProductoForm();
            }
            this.cargarDatosUnaVez();
          },
          error: (error) => this.manejarErrorAdmin(error),
        });
      },
    );
  }

  guardarPromocion(): void {
    this.authError = '';
    this.pageSuccess = '';
    this.marcarPromocionTouched();
    if (this.promocionInvalida()) {
      return;
    }

    const payload: Promocion = {
      _id: this.editandoPromocionId || undefined,
      titulo: this.promocionForm.titulo,
      descripcion: this.promocionForm.descripcion,
      tipo: this.promocionForm.tipo,
      valor: Number(this.promocionForm.valor),
      producto_ids: this.promocionForm.producto_ids,
      activo: true,
    };
    const editando = !!this.editandoPromocionId;
    this.abrirConfirmacion(
      editando ? 'Guardar promocion' : 'Agregar promocion',
      editando
        ? `Se actualizara la promocion ${payload.titulo}.`
        : `Se agregara la promocion ${payload.titulo}.`,
      () => {
        const request = this.editandoPromocionId
          ? this.promocionesService.actualizarPromocion(this.editandoPromocionId, payload)
          : this.promocionesService.crearPromocion(payload);

        request.subscribe({
          next: () => {
            this.pageSuccess = editando ? 'Promocion actualizada.' : 'Promocion agregada.';
            this.resetPromocionForm();
            this.cargarDatosUnaVez();
          },
          error: (error) => this.manejarErrorAdmin(error),
        });
      },
    );
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
    const promocion = this.promociones.find((item) => item._id === id);
    this.abrirConfirmacion(
      'Eliminar promocion',
      `Se eliminara ${promocion?.titulo || 'esta promocion'}.`,
      () => {
        this.promocionesService.eliminarPromocion(id).subscribe({
          next: () => {
            this.pageSuccess = 'Promocion eliminada.';
            this.promociones = this.promociones.filter((item) => item._id !== id);
            if (this.editandoPromocionId === id) {
              this.resetPromocionForm();
            }
            this.cargarDatosUnaVez();
          },
          error: (error) => this.manejarErrorAdmin(error),
        });
      },
    );
  }

  toggleProductoEnPromocion(productoId: string, checked: boolean): void {
    this.promocionTouched.producto_ids = true;
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

  estadoPedidoLabel(estado: Pedido['estado']): string {
    if (estado === 'entregado') {
      return 'terminado';
    }
    return estado;
  }

  actualizarEstadoPedido(id: string | undefined, estado: Pedido['estado']): void {
    if (!id) {
      return;
    }
    const pedido = this.pedidos.find((item) => item._id === id);
    const estadoLabel = estado === 'entregado' ? 'terminado' : estado;
    this.authError = '';
    this.pageSuccess = '';
    this.pedidosService.actualizarEstado(id, estado).subscribe({
      next: () => {
        this.pageSuccess = `Pedido de ${pedido?.cliente || 'cliente'} cambiado a ${estadoLabel}.`;
        if (estado === 'cancelado') {
          this.pedidos = this.pedidos.filter((item) => item._id !== id);
        } else {
          this.pedidos = this.pedidos.map((item) =>
            item._id === id ? { ...item, estado } : item,
          );
        }
        this.cargarDatosUnaVez();
      },
      error: (error) => this.manejarErrorAdmin(error),
    });
  }

  totalItemsPedido(pedido: Pedido): number {
    return pedido.items.reduce((acc, item) => acc + item.cantidad, 0);
  }

  resetProductoForm(): void {
    this.editandoProductoId = null;
    this.productoForm = this.crearProductoForm();
    this.productoTouched = this.crearProductoTouched();
  }

  resetPromocionForm(): void {
    this.editandoPromocionId = null;
    this.promocionForm = this.crearPromocionForm();
    this.promocionTouched = this.crearPromocionTouched();
  }

  onAuthPasswordChange(valor: string): void {
    this.authPassword = valor;
    this.authTouched.password = true;
  }

  onAuthConfirmChange(valor: string): void {
    this.authConfirm = valor;
    this.authTouched.confirm = true;
  }

  marcarAuthTouched(field: 'password' | 'confirm'): void {
    this.authTouched[field] = true;
  }

  onBannerChange(valor: string): void {
    this.homeBannerUrl = valor;
    this.bannerTouched = true;
  }

  marcarBannerTouched(): void {
    this.bannerTouched = true;
  }

  onProductoFieldChange(field: keyof ProductoForm, valor: string | number | boolean): void {
    this.productoForm = {
      ...this.productoForm,
      [field]: valor,
    };
    this.productoTouched[field as keyof typeof this.productoTouched] = true;
  }

  marcarProductoTouchedField(field: keyof typeof this.productoTouched): void {
    this.productoTouched[field] = true;
  }

  onPromocionFieldChange(field: keyof PromocionForm, valor: string | number | string[]): void {
    this.promocionForm = {
      ...this.promocionForm,
      [field]: valor,
    };
    this.promocionTouched[field as keyof typeof this.promocionTouched] = true;
  }

  marcarPromocionTouchedField(field: keyof typeof this.promocionTouched): void {
    this.promocionTouched[field] = true;
  }

  cerrarConfirmacion(): void {
    this.confirmacionAbierta = false;
    this.confirmacionProcesando = false;
    this.confirmacionTitulo = '';
    this.confirmacionMensaje = '';
    this.accionConfirmada = null;
  }

  cerrarConfirmacionDesdeEvento(event?: Event): void {
    if (!this.consumirAccionModal(event)) {
      return;
    }
    this.cerrarConfirmacion();
  }

  ejecutarConfirmacionDesdeEvento(event?: Event): void {
    if (!this.consumirAccionModal(event)) {
      return;
    }
    this.ejecutarConfirmacion();
  }

  ejecutarConfirmacion(): void {
    if (this.confirmacionProcesando) {
      return;
    }

    const accion = this.accionConfirmada;
    this.confirmacionProcesando = true;
    this.confirmacionAbierta = false;
    this.confirmacionTitulo = '';
    this.confirmacionMensaje = '';
    this.accionConfirmada = null;
    accion?.();
    this.confirmacionProcesando = false;
  }

  private iniciarPolling(): void {
    if (this.pollingIniciado) {
      this.cargarDatosUnaVez();
      return;
    }

    this.pollingIniciado = true;
    interval(5000)
      .pipe(
        startWith(0),
        switchMap(() =>
          forkJoin({
            productos: this.productosService.getProductos(true).pipe(this.adminFallback<Producto[]>([])),
            promociones: this.promocionesService.getPromociones(true).pipe(this.adminFallback<Promocion[]>([])),
            pedidos: this.pedidosService.getPedidos().pipe(this.adminFallback<Pedido[]>([])),
            dashboard: this.pedidosService.getDashboard().pipe(this.adminFallback<DashboardAdmin | undefined>(undefined)),
            homeConfig: this.homeConfigService
              .getConfig()
              .pipe(this.adminFallback<{ home_banner_url: string }>({ home_banner_url: '' })),
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
      productos: this.productosService.getProductos(true).pipe(this.adminFallback<Producto[]>([])),
      promociones: this.promocionesService.getPromociones(true).pipe(this.adminFallback<Promocion[]>([])),
      pedidos: this.pedidosService.getPedidos().pipe(this.adminFallback<Pedido[]>([])),
      dashboard: this.pedidosService.getDashboard().pipe(this.adminFallback<DashboardAdmin | undefined>(undefined)),
      homeConfig: this.homeConfigService
        .getConfig()
        .pipe(this.adminFallback<{ home_banner_url: string }>({ home_banner_url: '' })),
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
    this.pageSuccess = '';
    if (error.status === 401) {
      this.auth.clearToken();
      this.autenticado = false;
      this.authError = 'La sesion expiro. Vuelve a iniciar.';
      return;
    }

    this.authError = error.error?.msg || 'No se pudo completar la accion.';
  }

  private crearProductoTouched() {
    return {
      nombre: false,
      descripcion: false,
      precio: false,
      categoria: false,
      imagen_url: false,
      ingredientesTexto: false,
      detallesTexto: false,
    };
  }

  private crearPromocionTouched() {
    return {
      titulo: false,
      descripcion: false,
      tipo: false,
      valor: false,
      producto_ids: false,
    };
  }

  private marcarProductoTouched(): void {
    this.productoTouched = {
      nombre: true,
      descripcion: true,
      precio: true,
      categoria: true,
      imagen_url: true,
      ingredientesTexto: true,
      detallesTexto: true,
    };
  }

  private marcarPromocionTouched(): void {
    this.promocionTouched = {
      titulo: true,
      descripcion: true,
      tipo: true,
      valor: true,
      producto_ids: true,
    };
  }

  private productoInvalido(): boolean {
    return !!(
      this.productoNombreError ||
      this.productoDescripcionError ||
      this.productoPrecioError ||
      this.productoCategoriaError ||
      this.productoImagenError ||
      this.productoIngredientesError ||
      this.productoDetallesError
    );
  }

  private promocionInvalida(): boolean {
    return !!(
      this.promocionTituloError ||
      this.promocionDescripcionError ||
      this.promocionTipoError ||
      this.promocionValorError ||
      this.promocionProductosError
    );
  }

  private abrirConfirmacion(titulo: string, mensaje: string, accion: () => void): void {
    this.blurActiveElement();
    this.confirmacionTitulo = titulo;
    this.confirmacionMensaje = mensaje;
    this.accionConfirmada = accion;
    this.confirmacionAbierta = true;
    this.focusConfirmButton();
  }

  private focusAuthInput(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.setTimeout(() => {
      if (this.modoAuth === 'setup' && this.authConfirmError) {
        this.authConfirmInput?.nativeElement.focus();
        this.authConfirmInput?.nativeElement.select();
        return;
      }

      this.authPasswordInput?.nativeElement.focus();
      this.authPasswordInput?.nativeElement.select();
    }, 0);
  }

  private focusConfirmButton(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.setTimeout(() => {
      this.confirmPrimaryButton?.nativeElement.focus();
    }, 0);
  }

  private blurActiveElement(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  }

  private consumirAccionModal(event?: Event): boolean {
    event?.preventDefault();
    event?.stopPropagation();

    const now = Date.now();
    if (now < this.modalActionCooldownUntil) {
      return false;
    }

    this.modalActionCooldownUntil = now + 250;
    return true;
  }

  private textoMinimo(valor: string, minimo: number): boolean {
    return (valor || '').trim().length >= minimo;
  }

  private listaTextoValida(valor: string): boolean {
    return (valor || '')
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean).length > 0;
  }

  private urlValida(valor: string): boolean {
    return /^https?:\/\/.+/i.test((valor || '').trim());
  }

  private adminFallback<T>(fallback: T) {
    return (source: Observable<T>) =>
      source.pipe(
        catchError((error) => {
          this.manejarErrorAdmin(error);
          return of(fallback);
        }),
      );
  }
}
