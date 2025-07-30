import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,//Quand tu fais standalone: true, ça veut dire que ton composant n'a pas besoin d'être déclaré dans un NgModule (comme AppModule).
  imports: [FormsModule, CommonModule, HttpClientModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  message: string = '';
  isError: boolean = false;
  isConnecting: boolean = false;
  loggedIn: boolean = false;

  // INJECTION DU ROUTER DANS LE CONSTRUCTEUR
  constructor(private http: HttpClient, private router: Router) {} // <-- ASSUREZ-VOUS QUE CELA EST BIEN LÀ

  connecter(): void {
    this.message = '';
    this.isError = false;
    this.isConnecting = true;
    this.loggedIn = false;

    if (!this.username || !this.password) {
      this.message = 'Veuillez entrer votre nom d\'utilisateur et votre mot de passe.';
      this.isError = true;
      this.isConnecting = false;
      return;
    }

    const loginApiUrl = 'http://localhost/api/login1.php';

    const credentials = {
      username: this.username,
      password: this.password
    };

    this.http.post<any>(loginApiUrl, credentials)
      .pipe(
        tap(response => {
          if (response.success) {
            this.message = response.message || 'Connexion réussie ! Redirection en cours...';
            this.isError = false;
            // this.loggedIn = true; // Cette ligne n'est plus nécessaire pour la redirection réelle
            // DÉCLENCHEMENT DE LA NAVIGATION APRÈS SUCCÈS
            this.router.navigate(['/dashboard']); // <-- C'EST LA LIGNE CLÉ POUR LA REDIRECTION
          } else {
            this.message = response.message || 'Nom d\'utilisateur ou mot de passe incorrect.';
            this.isError = true;
          }
        }),
        catchError((error: HttpErrorResponse) => {
          this.isError = true;
          this.loggedIn = false;

          if (error.error instanceof ErrorEvent) {
            this.message = `Erreur réseau ou client : ${error.error.message}`;
          } else {
            if (error.status === 401) {
              this.message = error.error.message || 'Nom d\'utilisateur ou mot de passe incorrect.';
            } else {
              this.message = `Erreur serveur (${error.status}) : ${error.message || 'Une erreur inattendue est survenue.'}`;
            }
          }
          return of(null);
        })
      )
      .subscribe({
        complete: () => {
          this.isConnecting = false;
        }
      });
  }
}
