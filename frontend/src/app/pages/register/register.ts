import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [NgIf, FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  username = '';
  password = '';
  confirm_password = '';
  full_name = '';
  document_type = 'CC';
  cedula = '';
  email = '';
  phone = '';
  accept_terms = false;

  showSuccess = false;
  error = '';
  errorField = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit(): void {
    this.error = '';
    this.errorField = '';

    if (!this.username) {
      this.error = 'El nombre de usuario es requerido';
      this.errorField = 'username';
      return;
    }
    if (this.username.length < 3) {
      this.error = 'El usuario debe tener mínimo 3 caracteres';
      this.errorField = 'username';
      return;
    }

    if (!this.password) {
      this.error = 'La contraseña es requerida';
      this.errorField = 'password';
      return;
    }
    if (this.password.length < 4) {
      this.error = 'La contraseña debe tener mínimo 4 caracteres';
      this.errorField = 'password';
      return;
    }

    if (!this.confirm_password) {
      this.error = 'Confirme su contraseña';
      this.errorField = 'confirm_password';
      return;
    }
    if (this.password !== this.confirm_password) {
      this.error = 'Las contraseñas no coinciden';
      this.errorField = 'confirm_password';
      return;
    }

    if (!this.full_name) {
      this.error = 'El nombre completo es requerido';
      this.errorField = 'full_name';
      return;
    }

    if (!this.cedula) {
      this.error = 'El número de documento es requerido';
      this.errorField = 'cedula';
      return;
    }
    if (!this.cedula.match(/^\d+$/)) {
      this.error = 'El documento debe contener solo números';
      this.errorField = 'cedula';
      return;
    }
    if (this.cedula.length < 10) {
      this.error = 'El documento debe tener mínimo 10 dígitos';
      this.errorField = 'cedula';
      return;
    }

    if (!this.email) {
      this.error = 'El correo electrónico es requerido';
      this.errorField = 'email';
      return;
    }
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(this.email)) {
      this.error = 'Ingrese un correo electrónico válido';
      this.errorField = 'email';
      return;
    }

    if (!this.phone) {
      this.error = 'El teléfono es requerido';
      this.errorField = 'phone';
      return;
    }
    if (!this.phone.match(/^\d+$/)) {
      this.error = 'El teléfono debe contener solo números';
      this.errorField = 'phone';
      return;
    }
    if (this.phone.length < 10) {
      this.error = 'El teléfono debe tener mínimo 10 dígitos';
      this.errorField = 'phone';
      return;
    }

    if (!this.accept_terms) {
      this.error = 'Debe aceptar términos y condiciones';
      this.errorField = 'accept_terms';
      return;
    }

    this.loading = true;
    this.error = '';

    this.auth.register({
      username: this.username,
      password: this.password,
      confirm_password: this.confirm_password,
      full_name: this.full_name,
      document_type: this.document_type,
      cedula: this.cedula,
      email: this.email,
      phone: this.phone,
      accept_terms: this.accept_terms,
      role: 'client'
    }).subscribe({
      next: (data: any) => {
        this.loading = false;
        if (data.success) {
          this.showSuccess = true;
          setTimeout(() => this.router.navigate(['/login']), 2000);
        } else {
          this.error = data.message;
          this.errorField = data.field || '';
        }
      },
      error: (err: any) => {
        this.loading = false;
        const msg = err?.error?.message || 'Error de conexión. Intente nuevamente.';
        this.error = msg;
        this.errorField = err?.error?.field || '';
      }
    });
  }
}
