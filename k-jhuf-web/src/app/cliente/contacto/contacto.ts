import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-contacto',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contacto.html',
  styleUrls: ['./contacto.css'],
})
export class Contacto {
  readonly direccion = '616 Adolfo Lopez Mateos, Poza Rica, Veracruz';
  readonly mapaUrl: SafeResourceUrl;

  readonly datos = [
    { titulo: 'Direccion', valor: this.direccion },
    { titulo: 'Telefono', valor: '7822174525' },
    { titulo: 'Horario', valor: 'Lunes a domingo, 5:00 p. m. - 11:00 p. m.' },
  ];

  constructor(private readonly sanitizer: DomSanitizer) {
    this.mapaUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      'https://www.google.com/maps?q=616+Adolfo+Lopez+Mateos+Poza+Rica,+Veracruz&z=16&output=embed',
    );
  }
}
