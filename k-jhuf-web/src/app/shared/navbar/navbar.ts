import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Auth } from '../../services/auth';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css'],
})
export class Navbar implements OnInit, OnDestroy {
  mobileMenuOpen = false;
  navbarCollapsed = false; // collapse sidebar on desktop
  isLoading = false;
  isAdminAuthenticated = false;
  adminMenuOpen = false;
  isScrolled = false;
  showAdminMenu = false;
  private authSubscription?: Subscription;

  constructor(private authService: Auth) {}

  ngOnInit(): void {
    // Check initial authentication state
    this.checkAdminAuthentication();

    // Subscribe to authentication changes
    this.authSubscription = this.authService.authenticated$.subscribe(() => {
      this.checkAdminAuthentication();
    });
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  private checkAdminAuthentication(): void {
    // Check if user is authenticated (assuming admin role)
    this.isAdminAuthenticated = this.authService.isAuthenticated();
  }

  toggleMobileMenu(): void {
    // mobile menu only on small screens
    this.mobileMenuOpen = !this.mobileMenuOpen;
    if (this.mobileMenuOpen) {
      this.adminMenuOpen = false; // Close admin menu when mobile menu opens
    }
  }

  toggleNavbar(): void {
    if (window.innerWidth >= 768) {
      // collapse/expand sidebar on desktop
      this.navbarCollapsed = !this.navbarCollapsed;
      // ensure menus hide when collapsing
      if (this.navbarCollapsed) {
        this.mobileMenuOpen = false;
        this.adminMenuOpen = false;
        this.showAdminMenu = false;
      }
    } else {
      this.toggleMobileMenu();
    }
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  toggleAdminMenu(): void {
    this.adminMenuOpen = !this.adminMenuOpen;
    this.showAdminMenu = this.adminMenuOpen;
    if (this.adminMenuOpen) {
      this.mobileMenuOpen = false; // Close mobile menu when admin menu opens
    }
  }

  closeAdminMenu(): void {
    this.adminMenuOpen = false;
    this.showAdminMenu = false;
  }

  logout(): void {
    this.isLoading = true;
    this.authService.logout();
    this.isLoading = false;
    this.closeAdminMenu();
    this.closeMobileMenu();
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    this.isScrolled = window.pageYOffset > 50;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    if (event.target.innerWidth > 768) {
      this.mobileMenuOpen = false;
      this.adminMenuOpen = false;
      this.showAdminMenu = false;
    }
    // if resizing to desktop and sidebar collapsed, keep collapse
    if (event.target.innerWidth < 768) {
      this.navbarCollapsed = false;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const navbar = target.closest('.navbar');
    const toggle = target.closest('.navbar-toggle');
    const adminBtn = target.closest('.admin-btn');

    if (!navbar) {
      this.mobileMenuOpen = false;
      this.adminMenuOpen = false;
      this.showAdminMenu = false;
    } else if (!toggle && !adminBtn && this.mobileMenuOpen) {
      this.mobileMenuOpen = false;
    } else if (!adminBtn && (this.adminMenuOpen || this.showAdminMenu)) {
      this.adminMenuOpen = false;
      this.showAdminMenu = false;
    }
  }
}