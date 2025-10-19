const express = require('express');
const runTreatment = require('./treatment.js'); // On importe la logique du robot

const app = express();
const port = process.env.PORT || 10000; // Port fourni par Render

// Middleware pour permettre à express de lire le JSON des requêtes POST
app.use(express.json());

// Message de bienvenue simple pour tester si le serveur est en ligne
app.get('/', (req, res) => {
    res.send('Service TraitementSV Backend est en ligne.');
});

// Le point d'entrée pour votre API, celui appelé par interface.php
app.post('/api/execute-treatment', async (req, res) => {
    console.log("Requête reçue sur /api/execute-treatment");

    // On récupère les données du corps de la requête JSON
    const { id_saisi, code_saisi, usermra, mdpmra } = req.body;

    // Validation simple
    if (!id_saisi || !code_saisi || !usermra || !mdpmra) {
        console.log("Erreur: Données manquantes dans la requête.");
        return res.status(400).json({
            status: 'error',
            message: 'Données manquantes',
            details: 'Les paramètres id_saisi, code_saisi, usermra, et mdpmra sont requis.'
        });
    }

    try {
        console.log(`Lancement du robot pour ID: ${id_saisi}`);
        // On appelle la fonction du robot avec les bons paramètres
        const result = await runTreatment(id_saisi, code_saisi, usermra, mdpmra);
        
        console.log("Le robot a terminé avec succès.");
        // Le robot a réussi, on renvoie une réponse 200 OK
        res.status(200).json({
            status: 'ok',
            message: result.message || 'Traitement terminé avec succès.'
        });

    } catch (error) {
        console.error("Le robot a échoué:", error.message);
        // Le robot a échoué, on renvoie une réponse 500 Erreur Serveur
        res.status(500).json({
            status: 'error',
            message: 'Le service d\'automatisation a échoué',
            details: error.message
        });
    }
});

// Démarrage du serveur
app.listen(port, () => {
    console.log(`Serveur démarré et à l'écoute sur le port ${port}`);
});
