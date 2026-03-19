import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export type UsuarioSesion = {
  _id?: string;
  nombre: string;
  telefono: string;
  creado_en?: string;
};

type UsuarioAuthResponse = {
  msg: string;
  token: string;
  usuario: UsuarioSesion;
};

@Injectable({
  providedIn: 'root',
})
export class UsuariosService {
  private readonly api = 'http://localhost:3000/api/usuarios';
  private readonly tokenKey = 'kjhuf_user_token';
  private readonly usuarioSubject = new BehaviorSubject<UsuarioSesion | null>(this.readStoredUser());

  readonly usuario$ = this.usuarioSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  register(payload: { nombre: string; telefono: string; password: string }): Observable<UsuarioAuthResponse> {
    return this.http.post<UsuarioAuthResponse>(`${this.api}/register`, payload).pipe(
      tap((response) => this.saveSession(response.token, response.usuario)),
    );
  }

  login(payload: { telefono: string; password: string }): Observable<UsuarioAuthResponse> {
    return this.http.post<UsuarioAuthResponse>(`${this.api}/login`, payload).pipe(
      tap((response) => this.saveSession(response.token, response.usuario)),
    );
  }

  me(): Observable<{ usuario: UsuarioSesion }> {
    return this.http.get<{ usuario: UsuarioSesion }>(`${this.api}/me`, {
      headers: this.getAuthHeaders(),
    }).pipe(
      tap((response) => this.setStoredUser(response.usuario)),
    );
  }

  logout(): Observable<{ msg: string }> {
    return this.http.post<{ msg: string }>(`${this.api}/logout`, {}, {
      headers: this.getAuthHeaders(),
    }).pipe(
      tap(() => this.clearSession()),
    );
  }

  getToken(): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    return localStorage.getItem(this.tokenKey);
  }

  getUsuarioActual(): UsuarioSesion | null {
    return this.usuarioSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      'X-User-Token': this.getToken() || '',
    });
  }

  clearSession(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(`${this.tokenKey}_user`);
    }
    this.usuarioSubject.next(null);
  }

  private saveSession(token: string, usuario: UsuarioSesion): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.tokenKey, token);
    }
    this.setStoredUser(usuario);
  }

  private setStoredUser(usuario: UsuarioSesion): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${this.tokenKey}_user`, JSON.stringify(usuario));
    }
    this.usuarioSubject.next(usuario);
  }

  private readStoredUser(): UsuarioSesion | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const raw = localStorage.getItem(`${this.tokenKey}_user`);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as UsuarioSesion;
    } catch {
      return null;
    }
  }
}
