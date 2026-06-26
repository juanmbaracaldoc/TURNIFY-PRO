import { Routes } from '@angular/router';

import { Login } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';
import { Employee } from './pages/employee/employee';
import { Home } from './pages/home/home';
import { Screen } from './pages/screen/screen';
import { Register } from './pages/register/register';
import { authGuard } from './guards/jwt.guard';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'register', component: Register },
  { path: 'home', component: Home, canActivate: [authGuard] },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard], data: { roles: ['admin'] } },
  { path: 'employee', component: Employee, canActivate: [authGuard], data: { roles: ['employee'] } },
  { path: 'screen', component: Screen },
  { path: '**', redirectTo: '/login' },
];
