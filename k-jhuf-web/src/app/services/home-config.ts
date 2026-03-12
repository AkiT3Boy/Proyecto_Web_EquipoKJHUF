import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Auth } from './auth';

export type HomeConfig = {
  home_banner_url: string;
};

@Injectable({
  providedIn: 'root',
})
export class HomeConfigService {
  private readonly publicApi = 'http://localhost:3000/api/home-config';
  private readonly adminApi = 'http://localhost:3000/api/admin/home-config';
  private readonly imageProxyApi = 'http://localhost:3000/api/imagen-proxy';

  constructor(
    private readonly http: HttpClient,
    private readonly auth: Auth,
  ) {}

  getConfig(): Observable<HomeConfig> {
    return this.http.get<HomeConfig>(this.publicApi);
  }

  updateBannerUrl(home_banner_url: string): Observable<HomeConfig & { msg: string }> {
    return this.http.patch<HomeConfig & { msg: string }>(
      this.adminApi,
      { home_banner_url },
      { headers: this.auth.getAuthHeaders() },
    );
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
}
