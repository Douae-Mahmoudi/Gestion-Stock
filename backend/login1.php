<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); 
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With'); // Ajout de X-Requested-With pour plus de compatibilité

/
// Le navigateur fait cette requête pour vérifier les permissions avant d'envoyer la vraie requête POST.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(); 
}

// Récupérer les données JSON envoyées par Angular
$input = json_decode(file_get_contents('php://input'), true);
$username = $input['username'] ?? '';
$password = $input['password'] ?? '';

// --- Début de la logique d'authentification ---
// Note: Cette partie ne nécessite PAS de base de données pour l'instant.
// Elle utilise des identifiants en dur pour le test.

if ($username === 'admin' && $password === 'stock2025') {
    // Si les identifiants sont corrects
    echo json_encode(['success' => true, 'message' => 'Connexion réussie', 'token' => 'votre_token_jwt_ici']);
} else {
    // Si les identifiants sont incorrects
    http_response_code(401); // Unauthorized (Non autorisé)
    echo json_encode(['success' => false, 'message' => 'Nom d\'utilisateur ou mot de passe incorrect']);
}
?>
