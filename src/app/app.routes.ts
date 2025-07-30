import { Routes } from '@angular/router';
import { LoginComponent } from './login/login';
import { DashboardComponent } from './dashboard/dashboard'; // Importez le DashboardComponent

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  // La route du tableau de bord pointe directement vers le DashboardComponent
  { path: 'dashboard', component: DashboardComponent },
  { path: '**', redirectTo: '/login' }
];
