import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TurnService } from '../../services/turn.service';
import { NgIf, NgFor } from '@angular/common';

@Component({
  selector: 'app-employee',
  standalone: true,
  imports: [NgIf, NgFor],
  templateUrl: './employee.html',
  styleUrl: './employee.css'
})
export class Employee implements OnInit, OnDestroy {
  turns: any[] = [];
  waitingTurns: any[] = [];
  currentTurn: any = null;
  stats = { waiting: 0, totalToday: 0, processed: 0 };
  
  private intervalId: any;

  constructor(
    private auth: AuthService,
    private turn: TurnService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.auth.verifySession().subscribe({
      next: (data: any) => {
        if (!data.authenticated || data.role !== 'employee') {
          localStorage.clear();
          this.router.navigate(['/login']);
        }
      },
      error: () => {
        localStorage.clear();
        this.router.navigate(['/login']);
      }
    });
    
    this.loadData();
    this.intervalId = setInterval(() => this.loadData(), 2000);
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  loadData(): void {
    this.turn.getAllTurns().subscribe({
      next: (data: any) => {
        this.turns = data.turns || [];
        this.waitingTurns = this.turns.filter((t: any) => t.status === 'waiting').slice(0, 10);
        this.currentTurn = this.turns.find((t: any) => t.status === 'called') || null;
        
        this.stats = {
          waiting: this.turns.filter((t: any) => t.status === 'waiting').length,
          totalToday: this.turns.length,
          processed: this.turns.filter((t: any) => t.status === 'finished').length
        };
      }
    });
  }

  callNext(): void {
    this.turn.callNext().subscribe({
      next: (data: any) => {
        if (data.number) {
          this.loadData();
        } else {
          alert('No hay turnos en espera');
        }
      },
      error: () => alert('Error al llamar turno')
    });
  }

  callSpecific(turn_number: string): void {
    this.turn.callSpecific(turn_number).subscribe({
      next: (data: any) => {
        if (data.success) {
          this.loadData();
        } else {
          alert(data.message || 'Error al llamar turno');
        }
      },
      error: () => alert('Error al llamar turno')
    });
  }

  finishCurrent(): void {
    this.turn.finishCurrent().subscribe({
      next: (data: any) => {
        this.loadData();
      },
      error: () => alert('No hay turno activo')
    });
  }

  logout(): void {
    this.auth.clearSession();
    this.auth.logout().subscribe({
      next: () => {},
      error: () => {}
    });
    this.router.navigate(['/login']);
  }
}