import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Cart } from './shared/cart/cart';
import { Navbar } from './shared/navbar/navbar';
import { Footer } from './shared/footer/footer';
import { PreloadService } from './services/preload';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    Navbar,
    Footer,
    Cart,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent {
  constructor(private readonly preload: PreloadService) {
    this.preload.preloadBase();
    this.preload.preloadUser();
  }
}
