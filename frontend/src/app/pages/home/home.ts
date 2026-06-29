import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TurnService } from '../../services/turn.service';
import { WebsocketService } from '../../services/websocket.service';
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
  showTurnModal = false;

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

    this.ws.messages$.subscribe({
      next: (msg) => {
        if (Array.isArray(msg) && this.userTurn) {
          this.updatePositionFromTurns(msg);
        }
      }
    });

    if (!this.ws.isConnected()) {
      this.ws.connect();
    }
    this.ws.send({ action: 'get_all' });
  }

  ngOnDestroy(): void {
  }

  startPositionTracking(): void {
    if (!this.ws.isConnected()) {
      this.ws.connect();
    }
    this.ws.send({ action: 'get_all' });
  }

  updatePositionFromTurns(turns: any[]): void {
    if (!this.userTurn) return;
    
    const userTurnObj = turns.find((t: any) => t.number === this.userTurn);
    if (!userTurnObj) return;

    if (userTurnObj.status === 'finished') {
      this.completed = true;
      this.positionNum = 0;
      this.turnsAhead = 0;
      this.positionDetail = '✅ Turno completado';
      this.statusText = 'Finalizado';
      return;
    }

    this.completed = false;
    const waitingTurns = turns
      .filter((t: any) => t.status === 'waiting' || t.status === 'called')
      .sort((a, b) => a.created_at?.localeCompare(b.created_at) || 0);
    
    const position = waitingTurns.findIndex((t: any) => t.number === this.userTurn) + 1;
    this.positionNum = position > 0 ? position : 0;
    this.turnsAhead = Math.max(0, this.positionNum - 1);

    if (this.turnsAhead === 0) {
      this.positionDetail = '🎯 ¡ES TU TURNO AHORA!';
      this.statusText = 'Atendiendo';
      this.playAlertSound();
    } else if (this.turnsAhead === 1) {
      this.positionDetail = '⚠️ Siguiente turno (falta 1)';
      this.statusText = `Posición: #${this.positionNum} | Turnos adelante: 1`;
    } else if (this.turnsAhead === 2) {
      this.positionDetail = `Faltan ${this.turnsAhead} turnos`;
      this.statusText = `Posición: #${this.positionNum} | Turnos adelante: ${this.turnsAhead}`;
      if (!this.alertShown) {
        this.alertShown = true;
        this.playAlertSound();
      }
    } else {
      this.positionDetail = `Faltan ${this.turnsAhead} turnos para ti`;
      this.statusText = `Posición: #${this.positionNum} | Turnos adelante: ${this.turnsAhead}`;
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
    this.auth.clearSession();
    this.auth.logout().subscribe({
      next: () => {},
      error: () => {}
    });
    this.router.navigate(['/login']);
  }
}