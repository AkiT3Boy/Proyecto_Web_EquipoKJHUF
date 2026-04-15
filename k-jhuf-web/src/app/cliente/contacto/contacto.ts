import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HomeConfigService } from '../../services/home-config';

@Component({
  selector: 'app-contacto',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contacto.html',
  styleUrls: ['./contacto.css'],
})
export class Contacto {
  direccion = '616 Adolfo Lopez Mateos, Poza Rica, Veracruz';
  mapaUrl: SafeResourceUrl;
  private readonly destroyRef = inject(DestroyRef);

  datos = [
    { titulo: 'Direccion', valor: this.direccion },
    { titulo: 'Telefono', valor: '7822174525' },
    { titulo: 'Horario', valor: 'Lunes a domingo, 5:00 p. m. - 11:00 p. m.' },
  ];

  constructor(
    private readonly sanitizer: DomSanitizer,
    private readonly homeConfig: HomeConfigService,
  ) {
    this.mapaUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      'https://www.google.com/maps?q=616+Adolfo+Lopez+Mateos+Poza+Rica,+Veracruz&z=16&output=embed',
    );

    this.homeConfig.getConfig().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((config) => {
      this.direccion = config.store_address || this.direccion;
      this.datos = [
        { titulo: 'Direccion', valor: config.store_address || this.direccion },
        { titulo: 'Telefono', valor: config.store_phone || '7822174525' },
        { titulo: 'Horario', valor: config.store_hours || 'Lunes a domingo, 5:00 p. m. - 11:00 p. m.' },
      ];
      this.mapaUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
        config.store_maps_url ||
          'https://www.google.com/maps?q=616+Adolfo+Lopez+Mateos+Poza+Rica,+Veracruz&z=16&output=embed',
      );
    });
  }
}
