import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router'; // Importez RouterOutlet pour le routage
// Les imports de LoginComponent et DashboardComponent ne sont pas strictement nécessaires ici
// si ces composants sont chargés via le routeur (lazy loading ou non).
// Cependant, les garder ne causera pas d'erreur si vous les avez déjà.
import { LoginComponent } from './login/login';
import { DashboardComponent } from './dashboard/dashboard';

@Component({
  selector: 'app-root', // Le sélecteur de votre composant racine
  standalone: true,
  imports: [
    RouterOutlet, // Permet d'afficher les composants routés
    // Incluez LoginComponent et DashboardComponent ici si vous ne faites pas de lazy loading
    // et que vous les avez déclarés comme standalone.

  ],
  // Le template du composant racine doit contenir le <router-outlet>
  // C'est là que Angular affichera le composant correspondant à la route active.
  template: `
    <router-outlet></router-outlet>
  `,
  styleUrl: './app.css' // Le fichier de style global de l'application
})
export class App { // Assurez-vous que la classe est bien exportée sous le nom 'App'
  title = 'Gestion-Stock';
}
