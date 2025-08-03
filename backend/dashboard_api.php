<?php
// --- Configuration des en-têtes CORS ---
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); 
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS'); 
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Gérer les requêtes OPTIONS (preflight requests)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// --- Configuration de la Base de Données ---
$dbHost = 'localhost';
$dbName = 'gestion_stock'; // Nom de votre base de données
$dbUser = 'root'; // Votre nom d'utilisateur MySQL
$dbPass = ''; // Votre mot de passe MySQL (vide par défaut pour WAMP)

try {
    $pdo = new PDO("mysql:host=$dbHost;dbname=$dbName;charset=utf8", $dbUser, $dbPass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erreur de connexion à la base de données : ' . $e->getMessage()]);
    exit();
}

// --- Logique de routage des actions ---
$action = $_GET['action'] ?? ''; // Récupérer l'action de l'URL pour GET
$method = $_SERVER['REQUEST_METHOD']; // Méthode HTTP (GET, POST, PUT, DELETE)

// Pour POST, PUT, DELETE, les données sont dans le corps de la requête
$input = json_decode(file_get_contents('php://input'), true);

switch ($action) {
    case 'get_stats':
        getDashboardStats($pdo);
        break;
    case 'get_products_for_dropdown':
        getProductsForDropdown($pdo);
        break;
    case 'get_suppliers_for_dropdown':
        getSuppliersForDropdown($pdo);
        break;
    case 'get_all_products_details':
        getAllProductsDetails($pdo);
        break;
    case 'get_all_suppliers_details':
        getAllSuppliersDetails($pdo);
        break;
    case 'add_quick_product':
        addQuickProduct($pdo, $input);
        break;
    case 'record_quick_purchase':
        recordQuickPurchase($pdo, $input);
        break;
    case 'record_quick_sale':
        recordQuickSale($pdo, $input);
        break;
    case 'get_recent_movements':
        getRecentMovements($pdo);
        break;
    case 'get_most_purchased_products': // Nouvelle action pour les produits les plus achetés
        getMostPurchasedProducts($pdo);
        break;
    case 'add_supplier':
        if ($method === 'POST') {
            addSupplier($pdo, $input);
        } else {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Méthode non autorisée pour cette action.']);
        }
        break;
    case 'update_supplier':
        if ($method === 'PUT') {
            updateSupplier($pdo, $input);
        } else {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Méthode non autorisée pour cette action.']);
        }
        break;
    case 'delete_supplier':
        if ($method === 'DELETE') {
            deleteSupplier($pdo, $input);
        } else {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Méthode non autorisée pour cette action.']);
        }
        break;
    case 'update_product':
        if ($method === 'PUT') {
            updateProduct($pdo, $input);
        } else {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Méthode non autorisée pour cette action.']);
        }
        break;
    case 'delete_product':
        if ($method === 'DELETE') {
            deleteProduct($pdo, $input);
        } else {
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Méthode non autorisée pour cette action.']);
        }
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Action non spécifiée ou invalide.']);
        break;
}

// --- Fonctions d'API (Mises à jour ou Nouvelles) ---

/**
 * Récupère les statistiques du tableau de bord.
 * @param PDO $pdo
 */
function getDashboardStats(PDO $pdo) {
    $stats = [
        'totalProducts' => 0,
        'totalQuantity' => 0,
        'lowStockProducts' => 0
    ];

    $stmt = $pdo->query("SELECT COUNT(id_produit) AS count FROM produits");
    $stats['totalProducts'] = $stmt->fetchColumn();

    $stmt = $pdo->query("SELECT SUM(quantite) AS sum FROM produits");
    $stats['totalQuantity'] = $stmt->fetchColumn();

    $stmt = $pdo->query("SELECT COUNT(id_produit) AS count FROM produits WHERE quantite < 10");
    $stats['lowStockProducts'] = $stmt->fetchColumn();

    echo json_encode(['success' => true, 'data' => $stats]);
}

/**
 * Récupère la liste des produits pour les listes déroulantes (ID et Nom).
 * @param PDO $pdo
 */
function getProductsForDropdown(PDO $pdo) {
    try {
        $stmt = $pdo->query("SELECT id_produit, nom FROM produits ORDER BY nom ASC");
        $products = $stmt->fetchAll();
        echo json_encode(['success' => true, 'data' => $products]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur lors de la récupération des produits pour la liste: ' . $e->getMessage()]);
    }
}

/**
 * Récupère la liste des fournisseurs pour les listes déroulantes (ID et Nom).
 * @param PDO $pdo
 */
function getSuppliersForDropdown(PDO $pdo) {
    try {
        $stmt = $pdo->query("SELECT id_fournisseur, nom FROM fournisseurs ORDER BY nom ASC");
        $suppliers = $stmt->fetchAll();
        echo json_encode(['success' => true, 'data' => $suppliers]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur lors de la récupération des fournisseurs pour la liste: ' . $e->getMessage()]);
    }
}

/**
 * Récupère tous les détails des produits pour le tableau, incluant le nom du fournisseur.
 * @param PDO $pdo
 */
function getAllProductsDetails(PDO $pdo) {
    try {
        $stmt = $pdo->query("
            SELECT
                p.id_produit,
                p.nom,
                p.description,
                p.quantite,
                p.prix_unitaire,
                f.nom AS nom_fournisseur,
                f.id_fournisseur AS id_fournisseur_produit
            FROM
                produits p
            LEFT JOIN
                fournisseurs f ON p.id_fournisseur = f.id_fournisseur
            ORDER BY
                p.nom ASC
        ");
        $products = $stmt->fetchAll();
        echo json_encode(['success' => true, 'data' => $products]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur lors de la récupération des détails des produits: ' . $e->getMessage()]);
    }
}

/**
 * Récupère tous les détails des fournisseurs pour le tableau de gestion.
 * @param PDO $pdo
 */
function getAllSuppliersDetails(PDO $pdo) {
    try {
        $stmt = $pdo->query("SELECT id_fournisseur, nom, adresse, telephone, email FROM fournisseurs ORDER BY nom ASC");
        $suppliers = $stmt->fetchAll();
        echo json_encode(['success' => true, 'data' => $suppliers]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur lors de la récupération des détails des fournisseurs: ' . $e->getMessage()]);
    }
}

/**
 * Ajoute rapidement un nouveau produit.
 * @param PDO $pdo
 * @param array $input
 */
function addQuickProduct(PDO $pdo, array $input) {
    $nom = $input['name'] ?? '';
    $quantite = $input['quantity'] ?? 0;
    $prix_unitaire = $input['price'] ?? 0.00;
    $id_fournisseur = $input['supplierId'] ?? null;

    if (empty($nom) || $quantite <= 0 || $prix_unitaire < 0 || $id_fournisseur === null) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Nom, quantité, prix unitaire et fournisseur valide requis.']);
        return;
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO produits (nom, quantite, prix_unitaire, id_fournisseur, date_ajout) VALUES (:nom, :quantite, :prix_unitaire, :id_fournisseur, NOW())");
        $stmt->execute([
            'nom' => $nom,
            'quantite' => $quantite,
            'prix_unitaire' => $prix_unitaire,
            'id_fournisseur' => $id_fournisseur
        ]);
        echo json_encode(['success' => true, 'message' => 'Produit ajouté avec succès.', 'id' => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur lors de l\'ajout du produit : ' . $e->getMessage()]);
    }
}

/**
 * Enregistre rapidement un achat et met à jour le stock du produit.
 * @param PDO $pdo
 * @param array $input
 */
function recordQuickPurchase(PDO $pdo, array $input) {
    $id_produit = $input['productId'] ?? null;
    $quantite = $input['quantity'] ?? 0;
    $id_fournisseur = $input['supplierId'] ?? null;

    if (empty($id_produit) || $quantite <= 0 || $id_fournisseur === null) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID Produit, quantité et fournisseur valide requis pour l\'achat.']);
        return;
    }

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("INSERT INTO achats (id_produit, id_fournisseur, quantite, date_achat) VALUES (:id_produit, :id_fournisseur, :quantite, NOW())");
        $stmt->execute([
            'id_produit' => $id_produit,
            'id_fournisseur' => $id_fournisseur,
            'quantite' => $quantite
        ]);

        $stmt = $pdo->prepare("UPDATE produits SET quantite = quantite + :quantite WHERE id_produit = :id_produit");
        $stmt->execute(['quantite' => $quantite, 'id_produit' => $id_produit]);

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Achat enregistré et stock mis à jour.']);
    } catch (PDOException $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur lors de l\'enregistrement de l\'achat : ' . $e->getMessage()]);
    }
}

/**
 * Enregistre rapidement une vente et met à jour le stock du produit.
 * @param PDO $pdo
 * @param array $input
 */
function recordQuickSale(PDO $pdo, array $input) {
    $id_produit = $input['productId'] ?? null;
    $quantite = $input['quantity'] ?? 0;
    $prix_vente = $input['salePrice'] ?? 0.00;

    if (empty($id_produit) || $quantite <= 0 || $prix_vente < 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID Produit, quantité et prix de vente valide requis.']);
        return;
    }

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("SELECT quantite FROM produits WHERE id_produit = :id_produit");
        $stmt->execute(['id_produit' => $id_produit]);
        $current_stock = $stmt->fetchColumn();

        if ($current_stock === false || $current_stock < $quantite) {
            $pdo->rollBack();
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Stock insuffisant pour ce produit.']);
            return;
        }

        $stmt = $pdo->prepare("INSERT INTO ventes (id_produit, quantite, date_vente, prix_vente) VALUES (:id_produit, :quantite, NOW(), :prix_vente)");
        $stmt->execute([
            'id_produit' => $id_produit,
            'quantite' => $quantite,
            'prix_vente' => $prix_vente
        ]);

        $stmt = $pdo->prepare("UPDATE produits SET quantite = quantite - :quantite WHERE id_produit = :id_produit");
        $stmt->execute(['quantite' => $quantite, 'id_produit' => $id_produit]);

        $pdo->commit();
        echo json_encode(['success' => true, 'message' => 'Vente enregistrée et stock mis à jour.']);
    } catch (PDOException $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur lors de l\'enregistrement de la vente : ' . $e->getMessage()]);
    }
}

/**
 * Récupère les derniers mouvements de stock (achats et ventes).
 * @param PDO $pdo
 */
function getRecentMovements(PDO $pdo) {
    try {
        $stmt = $pdo->query("
            SELECT 'Entrée' AS type, a.date_achat AS date, p.nom AS nom_produit, a.quantite, p.id_produit
            FROM achats a JOIN produits p ON a.id_produit = p.id_produit
            UNION ALL
            SELECT 'Sortie' AS type, v.date_vente AS date, p.nom AS nom_produit, v.quantite, p.id_produit
            FROM ventes v JOIN produits p ON v.id_produit = p.id_produit
            ORDER BY date DESC
            LIMIT 5
        ");
        $movements = $stmt->fetchAll();
        echo json_encode(['success' => true, 'data' => $movements]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur lors de la récupération des mouvements : ' . $e->getMessage()]);
    }
}

/**
 * Récupère les produits les plus achetés (top N).
 * @param PDO $pdo
 * @param int $limit Le nombre de produits à retourner.
 */
function getMostPurchasedProducts(PDO $pdo, int $limit = 5) {
    try {
        $stmt = $pdo->prepare("
            SELECT
                p.nom AS nom_produit,
                SUM(a.quantite) AS total_quantite_achetee
            FROM
                achats a
            JOIN
                produits p ON a.id_produit = p.id_produit
            GROUP BY
                p.nom
            ORDER BY
                total_quantite_achetee DESC
            LIMIT :limit
        ");
        $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        $mostPurchased = $stmt->fetchAll();
        echo json_encode(['success' => true, 'data' => $mostPurchased]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur lors de la récupération des produits les plus achetés : ' . $e->getMessage()]);
    }
}


/**
 * Met à jour un produit existant.
 * @param PDO $pdo
 * @param array $input
 */
function updateProduct(PDO $pdo, array $input) {
    $id_produit = $input['id_produit'] ?? null;
    $nom = $input['nom'] ?? '';
    $description = $input['description'] ?? null;
    $quantite = $input['quantite'] ?? null;
    $prix_unitaire = $input['prix_unitaire'] ?? null;
    $id_fournisseur = $input['id_fournisseur'] ?? null;

    if (empty($id_produit) || empty($nom) || $quantite === null || $quantite < 0 || $prix_unitaire === null || $prix_unitaire < 0 || $id_fournisseur === null) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Données de produit incomplètes ou invalides pour la mise à jour (Nom, Quantité, Prix, Fournisseur).']);
        return;
    }

    try {
        $stmt = $pdo->prepare("UPDATE produits SET nom = :nom, description = :description, quantite = :quantite, prix_unitaire = :prix_unitaire, id_fournisseur = :id_fournisseur WHERE id_produit = :id_produit");
        $stmt->execute([
            'nom' => $nom,
            'description' => $description,
            'quantite' => $quantite,
            'prix_unitaire' => $prix_unitaire,
            'id_fournisseur' => $id_fournisseur,
            'id_produit' => $id_produit
        ]);
        echo json_encode(['success' => true, 'message' => 'Produit mis à jour avec succès.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur lors de la mise à jour du produit : ' . $e->getMessage()]);
    }
}

/**
 * Supprime un produit.
 * @param PDO $pdo
 * @param array $input
 */
function deleteProduct(PDO $pdo, array $input) {
    $id_produit = $input['id_produit'] ?? null;

    if (empty($id_produit)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID Produit requis pour la suppression.']);
        return;
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM produits WHERE id_produit = :id_produit");
        $stmt->execute(['id_produit' => $id_produit]);

        if ($stmt->rowCount() > 0) {
            echo json_encode(['success' => true, 'message' => 'Produit supprimé avec succès.']);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Produit non trouvé.']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur lors de la suppression du produit : ' . $e->getMessage()]);
    }
}

/**
 * Ajoute un nouveau fournisseur.
 * @param PDO $pdo
 * @param array $input
 */
function addSupplier(PDO $pdo, array $input) {
    $nom = $input['nom'] ?? '';
    $adresse = $input['adresse'] ?? null;
    $telephone = $input['telephone'] ?? null;
    $email = $input['email'] ?? null;

    if (empty($nom)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Le nom du fournisseur est requis.']);
        return;
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO fournisseurs (nom, adresse, telephone, email) VALUES (:nom, :adresse, :telephone, :email)");
        $stmt->execute([
            'nom' => $nom,
            'adresse' => $adresse,
            'telephone' => $telephone,
            'email' => $email
        ]);
        echo json_encode(['success' => true, 'message' => 'Fournisseur ajouté avec succès.', 'id' => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur lors de l\'ajout du fournisseur : ' . $e->getMessage()]);
    }
}

/**
 * Met à jour un fournisseur existant.
 * @param PDO $pdo
 * @param array $input
 */
function updateSupplier(PDO $pdo, array $input) {
    $id_fournisseur = $input['id_fournisseur'] ?? null;
    $nom = $input['nom'] ?? '';
    $adresse = $input['adresse'] ?? null;
    $telephone = $input['telephone'] ?? null;
    $email = $input['email'] ?? null;

    if (empty($id_fournisseur) || empty($nom)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID et nom du fournisseur requis pour la mise à jour.']);
        return;
    }

    try {
        $stmt = $pdo->prepare("UPDATE fournisseurs SET nom = :nom, adresse = :adresse, telephone = :telephone, email = :email WHERE id_fournisseur = :id_fournisseur");
        $stmt->execute([
            'nom' => $nom,
            'adresse' => $adresse,
            'telephone' => $telephone,
            'email' => $email,
            'id_fournisseur' => $id_fournisseur
        ]);
        echo json_encode(['success' => true, 'message' => 'Fournisseur mis à jour avec succès.']);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur lors de la mise à jour du fournisseur : ' . $e->getMessage()]);
    }
}

/**
 * Supprime un fournisseur.
 * @param PDO $pdo
 * @param array $input
 */
function deleteSupplier(PDO $pdo, array $input) {
    $id_fournisseur = $input['id_fournisseur'] ?? null;

    if (empty($id_fournisseur)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID Fournisseur requis pour la suppression.']);
        return;
    }

    try {
        $stmt = $pdo->prepare("DELETE FROM fournisseurs WHERE id_fournisseur = :id_fournisseur");
        $stmt->execute(['id_fournisseur' => $id_fournisseur]);

        if ($stmt->rowCount() > 0) {
            echo json_encode(['success' => true, 'message' => 'Fournisseur supprimé avec succès.']);
        } else {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Fournisseur non trouvé.']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur lors de la suppression du fournisseur : ' . $e->getMessage()]);
    }
}
?>
