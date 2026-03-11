import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environment';

@Injectable({
  providedIn: 'root',
})
export class Auth {

  // API URL from environment configuration
  private apiUrl = `${environment.apiUrl}/api/admin`;
  private authenticatedSubject = new BehaviorSubject<boolean>(false);
  public authenticated$ = this.authenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Solo verificar autenticación en el navegador
    if (isPlatformBrowser(this.platformId)) {
      this.checkAuthStatus();
    }
  }

  // Verificar si ya existe una contraseña configurada
  checkPasswordConfigured(): Observable<any> {
    return this.http.get(`${this.apiUrl}/check-password`);
  }

  // Configurar contraseña por primera vez
  setupPassword(password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/setup-password`, { password });
  }

  // Login con contraseña
  login(password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { password });
  }

  // Cambiar contraseña
  changePassword(oldPassword: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/change-password`, {
      oldPassword,
      newPassword
    });
  }

  // Obtener estado de autenticación
  isAuthenticated(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      const authenticated = localStorage.getItem('adminAuthenticated') === 'true';
      this.authenticatedSubject.next(authenticated);
      return authenticated;
    }
    return this.authenticatedSubject.value;
  }

  // Establecer autenticación
  setAuthenticated(value: boolean): void {
    this.authenticatedSubject.next(value);
    if (isPlatformBrowser(this.platformId)) {
      if (value) {
        localStorage.setItem('adminAuthenticated', 'true');
        localStorage.setItem('adminAuthTime', Date.now().toString());
      } else {
        localStorage.removeItem('adminAuthenticated');
        localStorage.removeItem('adminAuthTime');
      }
    }
  }

  // Verificar autenticación al cargar
  private checkAuthStatus(): void {
    if (isPlatformBrowser(this.platformId)) {
      const authenticated = localStorage.getItem('adminAuthenticated') === 'true';
      this.authenticatedSubject.next(authenticated);
    }
  }

  // Logout
  logout(): void {
    this.setAuthenticated(false);
    if (isPlatformBrowser(this.platformId)) {
      // Clear all auth-related storage
      localStorage.clear();
    }
  }
}
