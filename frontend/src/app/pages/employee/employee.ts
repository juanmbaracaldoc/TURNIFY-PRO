import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TurnService } from '../../services/turn.service';
import { WebsocketService } from '../../services/websocket.service';
import { NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-employee',
  standalone: true,
  imports: [NgIf, NgFor, FormsModule],
  templateUrl: './employee.html',
  styleUrl: './employee.css'
})
export class Employee implements OnInit, OnDestroy {
  turns: any[] = [];
  waitingTurns: any[] = [];
  currentTurn: any = null;
  stats = { waiting: 0, totalToday: 0, processed: 0 };
  showActionModal = false;
  filterSede = '';
  sedes = ['MOSQUERA', 'MADRID', 'FACATATIVA', 'FUNZA'];

  private clockInterval: any;
  currentUser: any = null;

  constructor(
    private auth: AuthService,
    private turn: TurnService,
    private ws: WebsocketService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.auth.getCurrentUser();
    
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

    this.ws.messages$.subscribe({
      next: (msg) => {
        if (Array.isArray(msg)) {
          this.turns = msg;
          this.waitingTurns = this.turns.filter((t: any) => {
            if (this.filterSede && t.sede !== this.filterSede) return false;
            return t.status === 'waiting';
          }).slice(0, 10);
          this.currentTurn = this.turns.find((t: any) => t.status === 'called') || null;
          
          this.stats = {
            waiting: this.turns.filter((t: any) => t.status === 'waiting').length,
            totalToday: this.turns.length,
            processed: this.turns.filter((t: any) => t.status === 'finished').length
          };
        }
      }
    });

    if (!this.ws.isConnected()) {
      this.ws.connect();
    }
    this.ws.send({ action: 'get_all' });
  }

  ngOnDestroy(): void {
    if (this.clockInterval) clearInterval(this.clockInterval);
  }

  onSedeFilterChange(): void {
    this.ws.send({ action: 'get_all' });
  }

  callNext(): void {
    this.turn.callNext().subscribe({
      next: (data: any) => {
        if (data.number) {
          this.ws.send({ action: 'get_all' });
          this.showActionModal = true;
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
          this.ws.send({ action: 'get_all' });
          this.showActionModal = true;
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
        this.ws.send({ action: 'get_all' });
        this.showActionModal = false;
      },
      error: () => alert('No hay turno activo')
    });
  }

  rescheduleCurrent(): void {
    this.turn.rescheduleCurrent().subscribe({
      next: (data: any) => {
        this.ws.send({ action: 'get_all' });
        this.showActionModal = false;
      },
      error: () => alert('Error al reagendar turno')
    });
  }

  cancelCurrent(): void {
    if (confirm('¿Estás seguro de cancelar este turno?')) {
      this.turn.cancelCurrent().subscribe({
        next: (data: any) => {
          this.ws.send({ action: 'get_all' });
          this.showActionModal = false;
        },
        error: () => alert('Error al cancelar turno')
      });
    }
  }

  logout(): void {
    this.auth.clearSession();
    this.auth.logout().subscribe({
      next: () => {},
      error: () => {}
    });
    this.router.navigate(['/login']);
  }

  getEmployeeName(): string {
    const user = this.auth.getCurrentUser();
    return user?.full_name || user?.username || 'Empleado';
  }

  getEmployeeSede(): string {
    const user = this.auth.getCurrentUser();
    return user?.sede || 'N/A';
  }
}