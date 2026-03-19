import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

type AuthResponse = {
  msg: string;
  token: string;
};

type AdminStatusResponse = {
  configured: boolean;
};

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly api = 'http://localhost:3000/api/admin';
  private readonly tokenKey = 'kjhuf_admin_token';

  constructor(private readonly http: HttpClient) {}

  status(): Observable<AdminStatusResponse> {
    return this.http.get<AdminStatusResponse>(`${this.api}/status`);
  }

  setup(password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.api}/setup`, { password }).pipe(
      tap((response) => this.saveToken(response.token)),
    );
  }

  login(password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.api}/login`, { password }).pipe(
      tap((response) => this.saveToken(response.token)),
    );
  }

  logout(): Observable<{ msg: string }> {
    return this.http
      .post<{ msg: string }>(`${this.api}/logout`, {}, { headers: this.getAuthHeaders() })
      .pipe(tap(() => this.clearToken()));
  }

  getToken(): string | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }

    return sessionStorage.getItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.getToken() || '';
    return new HttpHeaders({
      'X-Admin-Token': token,
    });
  }

  clearToken(): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(this.tokenKey);
    }
  }

  private saveToken(token: string): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(this.tokenKey, token);
    }
  }
}
