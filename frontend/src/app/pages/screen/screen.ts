import { Component, OnInit, OnDestroy } from '@angular/core';
import { TurnService } from '../../services/turn.service';
import { NgIf, NgFor } from '@angular/common';

@Component({
  selector: 'app-screen',
  standalone: true,
  imports: [NgIf, NgFor],
  templateUrl: './screen.html',
  styleUrl: './screen.css'
})
export class Screen implements OnInit, OnDestroy {
  turns: any[] = [];
  currentTurn: any = null;
  nextTurns: any[] = [];
  waitingCount = 0;
  timer = '--:--:--';
  
  private intervalId: any;
  private clockInterval: any;

  constructor(private turn: TurnService) {}

  ngOnInit(): void {
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
    
    this.intervalId = setInterval(() => this.loadData(), 2000);
    this.loadData();
  }

  ngOnDestroy(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.clockInterval) clearInterval(this.clockInterval);
  }

  updateClock(): void {
    const now = new Date();
    this.timer = now.toLocaleTimeString('es-ES');
  }

  loadData(): void {
    this.turn.getAllTurns().subscribe({
      next: (data: any) => {
        this.turns = data.turns || [];
        this.currentTurn = this.turns.find((t: any) => t.status === 'called');
        this.nextTurns = this.turns.filter((t: any) => t.status === 'waiting').slice(0, 5);
        this.waitingCount = this.turns.filter((t: any) => t.status === 'waiting').length;
      }
    });
  }
}