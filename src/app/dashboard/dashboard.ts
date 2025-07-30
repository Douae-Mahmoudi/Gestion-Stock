import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

// Interface pour un produit (mise à jour pour inclure le fournisseur)
interface Product {
  id_produit: number;
  nom: string;
  description?: string;
  quantite: number;
  prix_unitaire: number;
  id_fournisseur?: number | null; // ID du fournisseur associé au produit
  nom_fournisseur?: string | null; // Nom du fournisseur pour l'affichage
}

// Interface pour un mouvement de stock
interface StockMovement {
  date: string;
  id_produit: number;
  nom_produit: string;
  type: 'Entrée' | 'Sortie' | 'Ajustement';
  quantite: number;
}

// Interface pour un fournisseur (mise à jour pour inclure tous les champs)
interface Supplier {
  id_fournisseur: number;
  nom: string;
  adresse: string;
  telephone: string;
  email: string;
}

// Nouvelle interface pour les produits les plus achetés
interface MostPurchasedProduct {
  nom_produit: string;
  total_quantite_achetee: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    DatePipe
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {

  // Variable pour contrôler la section active dans le HTML
  activeSection: 'stats' | 'forms' | 'movements' | 'product-management' | 'supplier-management' = 'stats'; // 'stats' par défaut

  // --- Propriétés pour les Statistiques ---
  totalProducts: number = 0;
  totalQuantity: number = 0;
  lowStockProducts: number = 0;

  // --- Propriétés pour les Formulaires Rapides (Achats/Ventes) ---
  productsForDropdown: { id_produit: number, nom: string }[] = [];//role pour liste deroulante
  suppliersForDropdown: Supplier[] = []; // Liste des fournisseurs pour les combobox
  selectedPurchaseProductId: number | null = null;
  selectedSaleProductId: number | null = null;
//pour ajouter un nouveau produit.
  newProduct = {
    name: '',
    quantity: null as number | null,
    price: null as number | null,
    supplierId: null as number | null // Ajout de l'ID du fournisseur pour l'ajout de produit
  };

  newPurchase = {
    productId: null as number | null,
    quantity: null as number | null,
    supplierId: null as number | null // Utilisation de l'ID du fournisseur sélectionné pour l'achat
  };

  newSale = {
    productId: null as number | null,
    quantity: null as number | null,
    salePrice: null as number | null
  };

  // --- Propriétés pour les Mouvements de Stock ---
  recentMovements: StockMovement[] = [];

  // --- Propriétés pour la Gestion des Produits (Tableau) ---
  allProducts: Product[] = [];
  selectedProductForEdit: Product | null = null;

  // --- Propriétés pour la Gestion des Fournisseurs (Tableau) ---
  allSuppliers: Supplier[] = []; // Liste de tous les fournisseurs pour le tableau
  newSupplier = { // Modèle pour le formulaire d'ajout de fournisseur
    nom: '',
    adresse: '',
    telephone: '',
    email: ''
  };
  selectedSupplierForEdit: Supplier | null = null; // Fournisseur actuellement en cours de modification

  // Propriété pour l'instance du graphique Chart.js (Mouvements)
  public movementChart: Chart | undefined;
  // Nouvelle propriété pour l'instance du graphique Chart.js (Produits les plus achetés)
  public mostPurchasedChart: Chart | undefined;

  // URL de base de votre API PHP
  private apiUrl = 'http://localhost/api/dashboard_api.php';

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    // Initialiser les graphiques une fois que les canvas sont disponibles dans le DOM
    this.createMovementChart();
    this.createMostPurchasedChart(); // Créer le nouveau graphique
    // Recharger les données pour les graphiques après leur création
    this.getRecentMovementsForChart();
    this.getMostPurchasedProductsData(); // Charger les données pour le nouveau graphique
  }

  ngOnDestroy(): void {
    // Détruire les graphiques lorsque le composant est détruit pour éviter les fuites de mémoire
    if (this.movementChart) {
      this.movementChart.destroy();
    }
    if (this.mostPurchasedChart) { // Détruire le nouveau graphique
      this.mostPurchasedChart.destroy();
    }
  }

  setActiveSection(section: 'stats' | 'forms' | 'movements' | 'product-management' | 'supplier-management'): void {
    this.activeSection = section;
    switch (section) {
      case 'stats':
        this.getStats();
        this.getRecentMovementsForChart();
        this.getMostPurchasedProductsData(); // Mettre à jour les données du nouveau graphique
        break;
      case 'forms':
        this.getProductsForDropdown();
        this.getSuppliersForDropdown();
        break;
      case 'movements':
        this.getRecentMovements();
        break;
      case 'product-management':
        this.getAllProductsDetails();
        this.getSuppliersForDropdown();
        break;
      case 'supplier-management':
        this.getAllSuppliersDetails();
        this.resetNewSupplierForm();
        this.selectedSupplierForEdit = null;
        break;
    }
  }

  loadDashboardData(): void {
    this.getStats();
    this.getRecentMovements();
    this.getProductsForDropdown();
    this.getSuppliersForDropdown();
    this.getAllProductsDetails();
    this.getAllSuppliersDetails();
    this.getMostPurchasedProductsData();
  }

  // --- Méthodes pour les Statistiques ---
  getStats(): void {
    this.http.get<any>(`${this.apiUrl}?action=get_stats`)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Erreur lors du chargement des stats:', error);
          alert('Erreur lors du chargement des statistiques.');
          return of(null);
        })
      )
      .subscribe(response => {
        if (response && response.success) {
          this.totalProducts = response.data.totalProducts;//data se trouve dans json
          this.totalQuantity = response.data.totalQuantity;
          this.lowStockProducts = response.data.lowStockProducts;
        } else if (response) {
          console.error('Erreur API stats:', response.message);
        }
      });
  }

  // --- Méthodes pour les Formulaires Rapides (Achats/Ventes) ---
  getProductsForDropdown(): void {
    this.http.get<any>(`${this.apiUrl}?action=get_products_for_dropdown`)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Erreur lors du chargement des produits pour la liste déroulante:', error);
          alert('Erreur lors du chargement des produits.');
          return of(null);
        })
      )
      .subscribe(response => {
        if (response && response.success) {
          this.productsForDropdown = response.data;
        } else if (response) {
          console.error('Erreur API produits dropdown:', response.message);
        }
      });
  }

  getSuppliersForDropdown(): void {
    this.http.get<any>(`${this.apiUrl}?action=get_suppliers_for_dropdown`)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Erreur lors du chargement des fournisseurs pour la liste déroulante:', error);
          alert('Erreur lors du chargement des fournisseurs.');
          return of(null);
        })
      )
      .subscribe(response => {
        if (response && response.success) {
          this.suppliersForDropdown = response.data;
        } else if (response) {
          console.error('Erreur API fournisseurs dropdown:', response.message);
        }
      });
  }

  addQuickProduct(): void {
    if (this.newProduct.name && this.newProduct.quantity !== null && this.newProduct.quantity > 0 && this.newProduct.price !== null && this.newProduct.price >= 0 && this.newProduct.supplierId !== null) {
      this.http.post<any>(`${this.apiUrl}?action=add_quick_product`, this.newProduct)
        .pipe(
          catchError((error: HttpErrorResponse) => {
            console.error('Erreur lors de l\'ajout du produit:', error);
            alert('Erreur: ' + (error.error.message || 'Impossible d\'ajouter le produit.'));
            return of(null);
          })
        )
        .subscribe(response => {
          if (response && response.success) {
            alert(response.message);
            this.resetQuickForms();
            this.loadDashboardData(); // Recharger toutes les données après l'ajout
          } else if (response) {
            alert('Erreur: ' + response.message);
          }
        });
    } else {
      alert('Veuillez entrer un nom, une quantité, un prix et sélectionner un fournisseur valide pour le produit.');
    }
  }

  recordQuickPurchase(): void {
    if (!this.selectedPurchaseProductId) {
      alert('Veuillez sélectionner un produit pour l\'achat.');
      return;
    }
    if (this.newPurchase.quantity === null || this.newPurchase.quantity <= 0) {
      alert('Veuillez entrer une quantité valide pour l\'achat.');
      return;
    }
    if (this.newPurchase.supplierId === null) {
      alert('Veuillez sélectionner un fournisseur pour l\'achat.');
      return;
    }

    this.newPurchase.productId = this.selectedPurchaseProductId;

    this.http.post<any>(`${this.apiUrl}?action=record_quick_purchase`, this.newPurchase)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Erreur lors de l\'enregistrement de l\'achat:', error);
          alert('Erreur: ' + (error.error.message || 'Impossible d\'enregistrer l\'achat.'));
          return of(null);
        })
      )
      .subscribe(response => {
        if (response && response.success) {
          alert(response.message);
          this.resetQuickForms();
          this.loadDashboardData();
        } else if (response) {
          alert('Erreur: ' + response.message);
        }
      });
  }

  recordQuickSale(): void {
    if (!this.selectedSaleProductId) {
      alert('Veuillez sélectionner un produit pour la vente.');
      return;
    }
    if (this.newSale.quantity === null || this.newSale.quantity <= 0) {
      alert('Veuillez entrer une quantité valide pour la vente.');
      return;
    }
    if (this.newSale.salePrice === null || this.newSale.salePrice < 0) {
      alert('Veuillez entrer un prix de vente valide.');
      return;
    }

    this.newSale.productId = this.selectedSaleProductId;

    this.http.post<any>(`${this.apiUrl}?action=record_quick_sale`, this.newSale)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Erreur lors de l\'enregistrement de la vente:', error);
          alert('Erreur: ' + (error.error.message || 'Impossible d\'enregistrer la vente.'));
          return of(null);
        })
      )
      .subscribe(response => {
        if (response && response.success) {
          alert(response.message);
          this.resetQuickForms();
          this.loadDashboardData();
        } else if (response) {
          alert('Erreur: ' + response.message);
        }
      });
  }

  resetQuickForms(): void {
    this.newProduct = { name: '', quantity: null, price: null, supplierId: null };
    this.selectedPurchaseProductId = null;
    this.newPurchase = { productId: null, quantity: null, supplierId: null };
    this.selectedSaleProductId = null;
    this.newSale = { productId: null, quantity: null, salePrice: null };
  }

  // --- Méthodes pour les Mouvements de Stock ---
  getRecentMovements(): void {
    this.http.get<any>(`${this.apiUrl}?action=get_recent_movements`)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Erreur lors du chargement des mouvements:', error);
          alert('Erreur lors du chargement des mouvements récents.');
          return of(null);
        })
      )
      .subscribe(response => {
        if (response && response.success) {
          this.recentMovements = response.data;
        } else if (response) {
          console.error('Erreur API mouvements:', response.message);
        }
      });
  }

  // --- Méthodes pour la Gestion des Produits (Tableau) ---
  getAllProductsDetails(): void {
    this.http.get<any>(`${this.apiUrl}?action=get_all_products_details`)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Erreur lors du chargement des détails des produits:', error);
          alert('Erreur lors du chargement des produits pour le tableau.');
          return of(null);
        })
      )
      .subscribe(response => {
        if (response && response.success) {
          this.allProducts = response.data;
        } else if (response) {
          console.error('Erreur API produits détails:', response.message);
        }
      });
  }

  editProduct(product: Product): void {
    this.selectedProductForEdit = { ...product };
    this.setActiveSection('product-management');
  }

  cancelEdit(): void {
    this.selectedProductForEdit = null;
  }

  saveProductEdit(): void {
    if (this.selectedProductForEdit) {
      const productToUpdate = this.selectedProductForEdit;
      if (!productToUpdate.nom || productToUpdate.quantite < 0 || productToUpdate.prix_unitaire < 0 || productToUpdate.id_fournisseur === null) {
        alert('Veuillez remplir tous les champs obligatoires et valides pour la modification (Nom, Quantité, Prix, Fournisseur).');
        return;
      }

      const payload = {
        id_produit: productToUpdate.id_produit,
        nom: productToUpdate.nom,
        description: productToUpdate.description,
        quantite: productToUpdate.quantite,
        prix_unitaire: productToUpdate.prix_unitaire,
        id_fournisseur: productToUpdate.id_fournisseur
      };

      this.http.put<any>(`${this.apiUrl}?action=update_product`, payload)
        .pipe(
          catchError((error: HttpErrorResponse) => {
            console.error('Erreur lors de la mise à jour du produit:', error);
            alert('Erreur: ' + (error.error.message || 'Impossible de mettre à jour le produit.'));
            return of(null);
          })
        )
        .subscribe(response => {
          if (response && response.success) {
            alert(response.message);
            this.selectedProductForEdit = null;
            this.loadDashboardData();
          } else if (response) {
            alert('Erreur: ' + response.message);
          }
        });
    }
  }

  deleteProduct(productId: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.')) {
      this.http.delete<any>(`${this.apiUrl}?action=delete_product`, { body: { id_produit: productId } })
        .pipe(
          catchError((error: HttpErrorResponse) => {
            console.error('Erreur lors de la suppression du produit:', error);
            alert('Erreur: ' + (error.error.message || 'Impossible de supprimer le produit.'));
            return of(null);
          })
        )
        .subscribe(response => {
          if (response && response.success) {
            alert(response.message);
            this.loadDashboardData();
          } else if (response) {
            alert('Erreur: ' + response.message);
          }
        });
    }
  }

  // --- Méthodes pour la Gestion des Fournisseurs ---
  getAllSuppliersDetails(): void {
    this.http.get<any>(`${this.apiUrl}?action=get_all_suppliers_details`)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Erreur lors du chargement des détails des fournisseurs:', error);
          alert('Erreur lors du chargement des fournisseurs pour le tableau.');
          return of(null);
        })
      )
      .subscribe(response => {
        if (response && response.success) {
          this.allSuppliers = response.data;
        } else if (response) {
          alert('Erreur: ' + response.message);
        }
      });
  }

  addSupplier(): void {
    if (this.newSupplier.nom && this.newSupplier.adresse && this.newSupplier.telephone && this.newSupplier.email) {
      this.http.post<any>(`${this.apiUrl}?action=add_supplier`, this.newSupplier)
        .pipe(
          catchError((error: HttpErrorResponse) => {
            console.error('Erreur lors de l\'ajout du fournisseur:', error);
            alert('Erreur: ' + (error.error.message || 'Impossible d\'ajouter le fournisseur.'));
            return of(null);
          })
        )
        .subscribe(response => {
          if (response && response.success) {
            alert(response.message);
            this.resetNewSupplierForm();
            this.loadDashboardData();
          } else if (response) {
            alert('Erreur: ' + response.message);
          }
        });
    } else {
      alert('Veuillez remplir tous les champs du fournisseur.');
    }
  }

  editSupplier(supplier: Supplier): void {
    this.selectedSupplierForEdit = { ...supplier };
    this.setActiveSection('supplier-management');
  }

  cancelSupplierEdit(): void {
    this.selectedSupplierForEdit = null;
  }

  saveSupplierEdit(): void {
    if (this.selectedSupplierForEdit) {
      const supplierToUpdate = this.selectedSupplierForEdit;
      if (!supplierToUpdate.nom || !supplierToUpdate.adresse || !supplierToUpdate.telephone || !supplierToUpdate.email) {
        alert('Veuillez remplir tous les champs du fournisseur pour la modification.');
        return;
      }

      this.http.put<any>(`${this.apiUrl}?action=update_supplier`, supplierToUpdate)
        .pipe(
          catchError((error: HttpErrorResponse) => {
            console.error('Erreur lors de la mise à jour du fournisseur:', error);
            alert('Erreur: ' + (error.error.message || 'Impossible de mettre à jour le fournisseur.'));
            return of(null);
          })
        )
        .subscribe(response => {
          if (response && response.success) {
            alert(response.message);
            this.selectedSupplierForEdit = null;
            this.loadDashboardData();
          } else if (response) {
            alert('Erreur: ' + response.message);
          }
        });
    }
  }

  deleteSupplier(supplierId: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ? Cela peut affecter des produits liés.')) {
      this.http.delete<any>(`${this.apiUrl}?action=delete_supplier`, { body: { id_fournisseur: supplierId } })
        .pipe(
          catchError((error: HttpErrorResponse) => {
            console.error('Erreur lors de la suppression du fournisseur:', error);
            alert('Erreur: ' + (error.error.message || 'Impossible de supprimer le fournisseur.'));
            return of(null);
          })
        )
        .subscribe(response => {
          if (response && response.success) {
            alert(response.message);
            this.loadDashboardData();
          } else if (response) {
            alert('Erreur: ' + response.message);
          }
        });
    }
  }

  resetNewSupplierForm(): void {
    this.newSupplier = { nom: '', adresse: '', telephone: '', email: '' };
  }

  // --- Logique Chart.js (Mouvements Récents) ---

  /**
   * Crée le graphique des mouvements de stock.
   * Cette méthode est appelée une seule fois dans ngAfterViewInit.
   */
  createMovementChart(): void {
    const canvas = document.getElementById('movementChart') as HTMLCanvasElement;
    if (canvas) {
      //getContext('2d')	Permet de dessiner avec Chart.js
      const ctx = canvas.getContext('2d');//On obtient le contexte graphique 2D.
      if (ctx) {
        if (this.movementChart) {
          this.movementChart.destroy();
        }
        this.movementChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: [],
            datasets: [{
              label: 'Quantité',
              data: [],
              backgroundColor: 'rgba(75, 192, 192, 0.6)',
              borderColor: 'rgba(75, 192, 192, 1)',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Quantité'
                }
              },
              x: {
                title: {
                  display: true,
                  text: 'Produit / Mouvement'
                }
              }
            },
            plugins: {
              legend: {
                display: false
              },
              title: {
                display: true,
                text: 'Quantités des Derniers Mouvements'
              }
            }
          }
        });
      }
    }
  }

  /**
   * Récupère les données des mouvements spécifiquement pour le graphique.
   * Ces données sont ensuite formatées et utilisées pour mettre à jour le graphique.
   */
  getRecentMovementsForChart(): void {
    this.http.get<any>(`${this.apiUrl}?action=get_recent_movements`)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Erreur lors du chargement des données pour le graphique des mouvements:', error);
          return of(null);
        })
      )
      .subscribe(response => {
        if (response && response.success) {
          const movements: StockMovement[] = response.data;
          const labels = movements.map(m => `${m.nom_produit} (${m.type})`);
          const data = movements.map(m => m.quantite);

          if (this.movementChart) {
            this.movementChart.data.labels = labels;
            this.movementChart.data.datasets[0].data = data;
            this.movementChart.update();
          }
        }
      });
  }

  // --- Logique Chart.js (Produits les plus achetés) ---

  /**
   * Crée le graphique des produits les plus achetés.
   * Cette méthode est appelée une seule fois dans ngAfterViewInit.
   */
  createMostPurchasedChart(): void {
    const canvas = document.getElementById('mostPurchasedChart') as HTMLCanvasElement;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (this.mostPurchasedChart) {
          this.mostPurchasedChart.destroy();
        }
        this.mostPurchasedChart = new Chart(ctx, {
          type: 'line', // Type de graphique: ligne
          data: {
            labels: [], // Noms des produits
            datasets: [{
              label: 'Quantité Achetée',
              data: [], // Quantités totales achetées
              backgroundColor: 'rgba(255, 99, 132, 0.6)', // Couleur rouge/rose
              borderColor: 'rgba(255, 99, 132, 1)',
              borderWidth: 2,
              fill: false, // Pas de remplissage sous la ligne
              tension: 0.3 // Courbe douce
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Quantité Totale Achetée'
                }
              },
              x: {
                title: {
                  display: true,
                  text: 'Produit'
                }
              }
            },
            plugins: {
              legend: {
                display: true // Afficher la légende pour ce graphique
              },
              title: {
                display: true,
                text: 'Top 5 des Produits les Plus Achetés'
              }
            }
          }
        });
      }
    }
  }

  /**
   * Récupère les données des produits les plus achetés et met à jour le graphique.
   */
  getMostPurchasedProductsData(): void {
    this.http.get<any>(`${this.apiUrl}?action=get_most_purchased_products`)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Erreur lors du chargement des données pour le graphique des produits les plus achetés:', error);
          return of(null);
        })
      )
      .subscribe(response => {
        if (response && response.success) {
          const products: MostPurchasedProduct[] = response.data;
          const labels = products.map(p => p.nom_produit);
          const data = products.map(p => p.total_quantite_achetee);

          if (this.mostPurchasedChart) {
            this.mostPurchasedChart.data.labels = labels;
            this.mostPurchasedChart.data.datasets[0].data = data;
            this.mostPurchasedChart.update();
          }
        }
      });
  }
}
