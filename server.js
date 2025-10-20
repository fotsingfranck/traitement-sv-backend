// =================================================================
// === FICHIER SERVEUR COMPLET ET FINAL (server.js)              ===
// === Corrige l'erreur "runTreatment n’est pas une fonction"    ===
// =================================================================

const express = require('express');

// ====================================================================
// === LA CORRECTION EST ICI : L'IMPORT DE LA FONCTION              ===
// On utilise des accolades {} pour extraire DIRECTEMENT la fonction
// 'runTreatment' de l'objet qui est exporté par 'treatment.js'.
const { runTreatment } = require('./treatment.js');
// ====================================================================

const app = express();
const port = process.env.PORT || 10000; // Port fourni par Render

// Middleware pour permettre à express de lire le JSON des requêtes POST
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Message de bienvenue pour tester si le serveur est en ligne
app.get('/', (req, res) => {
    res.send('Service TraitementSV Backend est en ligne et prêt.');
});

// Le point d'entrée principal de l'API
app.post('/api/execute-treatment', async (req, res) => {
    // Une fonction pour que le robot puisse afficher ses logs dans la console de Render
    const logCallback = (message) => {
        console.log(message);
    };

    logCallback("\n///////////////////////////////////////////////////////////");
    logCallback("Requête reçue sur /api/execute-treatment");

    // On récupère les données du corps de la requête
    // Note: j'ai changé 'usermra' et 'mdpmra' pour correspondre à votre script PHP ('login', 'mdp')
    const { id_saisi, code_saisi, login, mdp } = req.body;

    // Validation des paramètres
    if (!id_saisi || !code_saisi || !login || !mdp) {
        logCallback("ERREUR : Paramètres manquants dans la requête.");
        return res.status(400).json({
            success: false, // Utiliser 'success' pour être cohérent
            message: 'Paramètres manquants. Les champs id_saisi, code_saisi, login, et mdp sont requis.'
        });
    }

    try {
        logCallback(`Lancement du robot pour ID : ${id_saisi}`);

        // On appelle la fonction runTreatment, qui est maintenant correctement importée.
        // On lui passe les 4 paramètres + la fonction de log.
        const result = await runTreatment(id_saisi, code_saisi, login, mdp, logCallback);
        
        // Le robot a fini son travail, on renvoie sa réponse (succès ou échec).
        logCallback(`Le robot a terminé. Statut: ${result.success ? 'SUCCÈS' : 'ÉCHEC'}.`);
        res.status(result.success ? 200 : 500).json(result);

    } catch (error) {
        // Cette erreur est une sécurité si 'runTreatment' lui-même plante de manière inattendue
        logCallback(`ERREUR NON GÉRÉE dans l'API : ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Une erreur critique est survenue dans le service principal.',
            details: error.message
        });
    }
});

// Démarrage du serveur
app.listen(port, () => {
    console.log(`==> Serveur démarré et à l'écoute sur le port ${port}`);
    console.log(`==> Disponible à votre URL principale https://traitement-sv-backend.onrender.com`);
});
