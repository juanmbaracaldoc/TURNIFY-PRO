import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TurnService } from '../../services/turn.service';

declare var websocketManager: any;

@Component({
  selector: 'app-my-turns',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-turns.html',
  styleUrl: './my-turns.css'
})
export class MyTurns implements OnInit {
  turns: any[] = [];
  loading = false;

  ngOnInit(): void {
    this.loadMyTurns();
    this.setupWebSocket();
  }

  setupWebSocket(): void {
    setTimeout(() => {
      if (websocketManager && websocketManager.init) {
        websocketManager.init();
      }
    }, 1000);
  }

  loadMyTurns(): void {
    this.loading = true;
    fetch('/api/my-turns/', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }
    })
    .then(res => res.json())
    .then(data => {
      this.loading = false;
      this.turns = data.turns || [];
    })
    .catch(() => {
      this.loading = false;
      this.turns = [];
    });
  }

  cancelTurn(turnNumber: string): void {
    if (confirm('¿Cancelar este turno?')) {
      fetch('/api/cancel-turn/' + turnNumber + '/', {
        method: 'DELETE',
        credentials: 'same-origin'
      })
      .then(() => this.loadMyTurns())
      .catch(() => alert('Error al cancelar'));
    }
  }
}