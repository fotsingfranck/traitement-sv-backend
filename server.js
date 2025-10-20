// =========================================================================
// === FICHIER SERVEUR FINAL (server.js) - ALIGNÉ AVEC INTERFACE.PHP ===
// =========================================================================

const express = require('express');
const { runTreatment } = require('./treatment.js'); // Importation correcte

const app = express();
const port = process.env.PORT || 10000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send('Service TraitementSV Backend est en ligne et prêt.');
});

// Le point d'entrée principal de l'API
app.post('/api/execute-treatment', async (req, res) => {
    const logCallback = (message) => {
        console.log(message);
    };

    logCallback("\n///////////////////////////////////////////////////////////");
    logCallback("Requête reçue sur /api/execute-treatment");

    // ====================================================================
    // === LA CORRECTION EST ICI : On récupère les bons noms de paramètres ===
    // On attend 'usermra' et 'mdpmra', exactement ce que le PHP envoie.
    const { id_saisi, code_saisi, usermra, mdpmra } = req.body;
    // ====================================================================

    // Validation des paramètres
    if (!id_saisi || !code_saisi || !usermra || !mdpmra) {
        logCallback("ERREUR : Paramètres manquants dans la requête.");
        return res.status(400).json({
            success: false,
            message: 'Paramètres manquants. Les champs id_saisi, code_saisi, usermra, et mdpmra sont requis.'
        });
    }

    try {
        logCallback(`Lancement du robot pour ID : ${id_saisi}`);

        // On appelle le robot en lui passant les bons paramètres.
        // runTreatment attend 'userMRA' et 'mdpMRA', donc on fait correspondre.
        const result = await runTreatment(id_saisi, code_saisi, usermra, mdpmra, logCallback);
        
        logCallback(`Le robot a terminé. Statut: ${result.success ? 'SUCCÈS' : 'ÉCHEC'}.`);
        res.status(result.success ? 200 : 500).json(result);

    } catch (error) {
        logCallback(`ERREUR CRITIQUE dans l'API : ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Une erreur critique est survenue dans le service principal.',
            details: error.message
        });
    }
});

app.listen(port, () => {
    console.log(`==> Serveur démarré et à l'écoute sur le port ${port}`);
    console.log(`==> Disponible à votre URL principale https://traitement-sv-backend.onrender.com`);
});
