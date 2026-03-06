import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PromocionesService } from '../../services/promociones';

@Component({
  selector: 'app-promociones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './promociones.html',
  styleUrls: ['./promociones.css']
})
export class Promociones implements OnInit {

  promociones: any[] = [];

  constructor(private promocionesService: PromocionesService) {}

  ngOnInit(): void {
    this.cargarPromociones();
  }

  cargarPromociones(){
    this.promocionesService.getPromociones().subscribe({
      next: (data:any) => this.promociones = data,
      error: err => console.error(err)
    });
  }

}