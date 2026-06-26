import { Routes } from '@angular/router';

import { Login } from './pages/login/login';

import { Dashboard } from './pages/dashboard/dashboard/dashboard';
import { Employee } from './pages/employee/employee/employee';
import { Home } from './pages/home/home/home';
import { Screen } from './pages/screen/screen/screen';
import { Register } from './pages/register/register/register';


export const routes: Routes = [
  { path: 'login', component: Login },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'register', component: Register },
  { path: 'dashboard', component: Dashboard },
  { path: 'employee', component: Employee },
  { path: 'home', component: Home },
  { path: 'screen', component: Screen },
  { path: '**', redirectTo: '/login' },
];

