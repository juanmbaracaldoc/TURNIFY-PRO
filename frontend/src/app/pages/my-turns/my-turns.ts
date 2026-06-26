import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';

@Component({
  selector: 'app-my-turns',
  standalone: true,
  imports: [CommonModule, Navbar, Footer],
  templateUrl: './my-turns.html',
  styleUrl: './my-turns.css'
})
export class MyTurns implements OnInit {
  turns: any[] = [];
  loading = false;

  ngOnInit(): void {
    this.loadMyTurns();
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

  cancelTurn(turnId: string): void {
    if (confirm('¿Cancelar este turno?')) {
      fetch('/api/cancel-turn/' + turnId + '/', {
        method: 'DELETE',
        credentials: 'same-origin'
      })
      .then(() => this.loadMyTurns())
      .catch(() => alert('Error al cancelar'));
    }
  }
}