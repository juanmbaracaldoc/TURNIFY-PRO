import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';

@Component({
  selector: 'app-virtual-turns',
  standalone: true,
  imports: [CommonModule, Navbar, Footer],
  templateUrl: './virtual-turns.html',
  styleUrl: './virtual-turns.css'
})
export class VirtualTurns {}