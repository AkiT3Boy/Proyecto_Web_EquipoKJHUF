import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, shareReplay, tap } from 'rxjs';
import { environment } from '../../environment';
import { Auth } from './auth';

export type HomeConfig = {
  home_banner_url: string;
  store_address: string;
  store_phone: string;
  store_hours: string;
  store_maps_url: string;
};

@Injectable({
  providedIn: 'root',
})
export class HomeConfigService {
  private readonly publicApi = `${environment.apiUrl}/api/home-config`;
  private readonly adminApi = `${environment.apiUrl}/api/admin/home-config`;
  private readonly imageProxyApi = `${environment.apiUrl}/api/imagen-proxy`;
  private config$?: Observable<HomeConfig>;

  constructor(
    private readonly http: HttpClient,
    private readonly auth: Auth,
  ) {}

  getConfig(forceRefresh = false): Observable<HomeConfig> {
    if (forceRefresh || !this.config$) {
      this.config$ = this.http.get<HomeConfig>(this.publicApi).pipe(shareReplay(1));
    }

    return this.config$;
  }

  updateConfig(payload: Partial<HomeConfig>): Observable<HomeConfig & { msg: string }> {
    return this.http.patch<HomeConfig & { msg: string }>(
      this.adminApi,
      payload,
      { headers: this.auth.getAuthHeaders() },
    ).pipe(tap(() => this.invalidateCache()));
  }

  updateBannerUrl(home_banner_url: string): Observable<HomeConfig & { msg: string }> {
    return this.updateConfig({ home_banner_url });
  }

  normalizarImagenBanner(valor: string): string {
    const imagen = (valor || '').trim().replace(/^['"]+|['"]+$/g, '');

    if (!imagen) {
      return '';
    }

    if (imagen.startsWith('//')) {
      return this.toProxyUrl(`https:${imagen}`);
    }

    if (/^https?:\/\//i.test(imagen)) {
      return this.toProxyUrl(imagen);
    }

    if (imagen.startsWith('www.')) {
      return this.toProxyUrl(`https://${imagen}`);
    }

    return imagen;
  }

  private toProxyUrl(url: string): string {
    return `${this.imageProxyApi}?url=${encodeURIComponent(url)}`;
  }

  private invalidateCache(): void {
    this.config$ = undefined;
  }
}
