import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-manage-users',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manage-users.html',
  styleUrl: './manage-users.css'
})
export class ManageUsers implements OnInit {
  users: any[] = [];
  loading = false;

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    fetch('/api/get-users/', {
      method: 'GET',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }
    })
    .then(res => res.json())
    .then(data => {
      this.loading = false;
      this.users = data.users || [];
    })
    .catch(() => {
      this.loading = false;
      this.users = [];
    });
  }

  deleteUser(username: string): void {
    if (confirm('¿Eliminar usuario ' + username + '?')) {
      fetch('/api/delete-user/' + username + '/', {
        method: 'DELETE',
        credentials: 'same-origin'
      })
      .then(() => this.loadUsers())
      .catch(() => alert('Error al eliminar'));
    }
  }
}