import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TurnService } from '../../services/turn.service';
import { AuthService } from '../../services/auth.service';
import { NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-virtual-turns',
  standalone: true,
  imports: [NgIf, NgFor, FormsModule],
  templateUrl: './virtual-turns.html',
  styleUrl: './virtual-turns.css'
})
export class VirtualTurns implements OnInit {
  turns: any[] = [];
  filteredTurns: any[] = [];
  filterSede = '';
  filterStatus = '';
  sedes = ['MOSQUERA', 'MADRID', 'FACATATIVA', 'FUNZA'];
  statuses = ['waiting', 'called', 'finished', 'cancelled'];

  constructor(
    private turn: TurnService,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.auth.verifySession().subscribe({
      next: (data: any) => {
        if (!data.authenticated) {
          this.router.navigate(['/login']);
        }
      },
      error: () => this.router.navigate(['/login'])
    });
    
    this.loadData();
  }

  loadData(): void {
    this.turn.getAllTurns().subscribe({
      next: (data: any) => {
        this.turns = data.turns || [];
        this.applyFilters();
      }
    });
  }

  applyFilters(): void {
    this.filteredTurns = this.turns.filter((t: any) => {
      if (this.filterSede && t.sede !== this.filterSede) return false;
      if (this.filterStatus && t.status !== this.filterStatus) return false;
      return true;
    });
  }

  attendVirtual(turn_number: string): void {
    this.turn.callSpecific(turn_number).subscribe({
      next: (data: any) => {
        if (data.success) {
          this.loadData();
        } else {
          alert(data.message || 'Error al atender turno virtual');
        }
      },
      error: () => alert('Error al atender turno virtual')
    });
  }
}