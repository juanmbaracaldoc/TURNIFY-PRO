import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';

@Component({
  selector: 'app-reschedule-turns',
  standalone: true,
  imports: [CommonModule, Navbar, Footer],
  templateUrl: './reschedule-turns.html',
  styleUrl: './reschedule-turns.css'
})
export class RescheduleTurns implements OnInit {
  turns: any[] = [];
  loading = false;

  ngOnInit(): void {
    this.loadTurns();
  }

  loadTurns(): void {
    this.loading = true;
    fetch('/api/get-all-turns/', {
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

  rescheduleTurn(turnId: string): void {
    const newDate = prompt('Ingrese la nueva fecha y hora (YYYY-MM-DD HH:MM):');
    if (newDate) {
      fetch('/api/reschedule-turn/' + turnId + '/', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': this.getCookie('csrftoken') || ''
        },
        body: JSON.stringify({ date: newDate })
      })
      .then(() => this.loadTurns())
      .catch(() => alert('Error al reagendar'));
    }
  }

  getCookie(name: string): string | null {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === (name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }
}