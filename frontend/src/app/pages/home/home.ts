import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TurnService } from '../../services/turn.service';
import { NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NgIf, NgFor, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit, OnDestroy {
  serviceType = 'general';
  selectedSede = 'MOSQUERA';
  userTurn: string | null = null;
  positionNum: number = 0;
  turnsAhead: number = 0;
  positionDetail: string = 'Cargando...';
  statusText: string = 'Cargando información...';
  alertShown = false;
  completed = false;
  documents: string[] = [];
  currentUser: any = null;
  
  private positionInterval: any;

  constructor(
    private auth: AuthService,
    private turn: TurnService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.auth.getCurrentUser();
    
    this.auth.verifySession().subscribe({
      next: (data: any) => {
        if (!data.authenticated || data.role !== 'client') {
          localStorage.clear();
          this.router.navigate(['/login']);
        }
      },
      error: () => {
        localStorage.clear();
        this.router.navigate(['/login']);
      }
    });

    this.documents = JSON.parse(localStorage.getItem('client_documents') || '[]');

    const stored = localStorage.getItem('userTurn');
    if (stored) {
      this.userTurn = stored;
      this.startPositionTracking();
    }
  }

  ngOnDestroy(): void {
    if (this.positionInterval) {
      clearInterval(this.positionInterval);
    }
  }

  startPositionTracking(): void {
    if (this.positionInterval) clearInterval(this.positionInterval);
    
    this.positionInterval = setInterval(() => {
      if (this.userTurn) {
        this.turn.getPosition(this.userTurn).subscribe({
          next: (data: any) => {
            this.updatePositionDisplay(data);
          }
        });
      }
    }, 2000);
  }

  updatePositionDisplay(d: any): void {
    if (!d || d.position === -1) return;

    this.positionNum = d.position;

    if (d.status === 'finished') {
      this.completed = true;
      this.positionNum = 0;
      if (this.positionInterval) clearInterval(this.positionInterval);
      return;
    }

    this.completed = false;
    
    if (d.turns_ahead === 0) {
      this.positionDetail = '🎯 ¡ES TU TURNO AHORA!';
      this.statusText = 'Atendiendo';
      this.playAlertSound();
    } else if (d.turns_ahead === 1) {
      this.positionDetail = '⚠️ Siguiente turno (falta 1)';
      this.statusText = `Posición: #${this.positionNum} | Turnos adelante: 1`;
    } else if (d.turns_ahead === 2) {
      this.positionDetail = `Faltan ${d.turns_ahead} turnos`;
      this.statusText = `Posición: #${this.positionNum} | Turnos adelante: ${d.turns_ahead}`;
      if (!this.alertShown) {
        this.alertShown = true;
        this.playAlertSound();
      }
    } else {
      this.positionDetail = `Faltan ${d.turns_ahead} turnos para ti`;
      this.statusText = `Posición: #${this.positionNum} | Turnos adelante: ${d.turns_ahead}`;
      this.alertShown = false;
    }
  }

  playAlertSound(): void {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.frequency.value = 800;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      osc.start(audioContext.currentTime);
      osc.stop(audioContext.currentTime + 0.5);
    } catch(e) {}
  }

  showTurnModal = false;

  closeModal(): void {
    this.showTurnModal = false;
  }

  getTurn(): void {
    if (!this.serviceType) return;

    this.turn.createTurn(this.serviceType, this.selectedSede).subscribe({
      next: (data: any) => {
        this.userTurn = data.number;
        if (this.userTurn) {
          localStorage.setItem('userTurn', this.userTurn);
        }
        this.showTurnModal = true;
        this.startPositionTracking();
      },
      error: () => {
        alert('❌ Error al solicitar turno. Intenta de nuevo.');
      }
    });
  }

  logout(): void {
    if (this.positionInterval) clearInterval(this.positionInterval);
    this.auth.clearSession();
    this.auth.logout().subscribe({
      next: () => {},
      error: () => {}
    });
    this.router.navigate(['/login']);
  }
}