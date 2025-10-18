const express = require('express');
const runTreatment = require('./treatment.js'); // On importe notre script puppeteer

const app = express();
// Le port est soit fourni par l'hébergeur (Render), soit 3000 par défaut en local
const port = process.env.PORT || 3000;

// Middleware pour pouvoir lire le JSON envoyé par notre PHP
app.use(express.json());

// On définit une "route" (URL) que notre PHP pourra appeler.
// Exemple : une requête POST sur https://VOTRE-SERVICE.onrender.com/api/execute-treatment
app.post('/api/execute-treatment', async (req, res) => {
    // On récupère les données envoyées par le PHP dans le corps de la requête
    const { id_saisi, code_saisi, usermra, mdpmra } = req.body;

    // Validation simple des paramètres
    if (!id_saisi || !code_saisi || !usermra || !mdpmra) {
        console.log("Erreur: Paramètres manquants reçus.", req.body);
        return res.status(400).json({ status: 'error', message: 'Paramètres manquants (id_saisi, code_saisi, usermra, ou mdpmra).' });
    }

    console.log(`Lancement du traitement pour ID: ${id_saisi}`);

    try {
        // On lance la fonction puppeteer et on attend son résultat (elle peut prendre du temps)
        const result = await runTreatment(id_saisi, code_saisi, usermra, mdpmra);
        
        console.log("Traitement Puppeteer terminé avec succès.");
        // On renvoie une réponse de succès au PHP
        return res.status(200).json({ status: 'ok', message: 'Traitement automatisé terminé avec succès.', details: result });

    } catch (error) {
        // Si une erreur se produit dans le script Puppeteer, on la capture ici
        console.error("ERREUR durant le traitement Puppeteer:", error.message);
        // On renvoie une réponse d'erreur au PHP avec les détails
        return res.status(500).json({ status: 'error', message: 'Le script d\'automatisation a échoué.', details: error.message });
    }
});

// Route "test" pour vérifier que le serveur est bien en ligne
app.get('/', (req, res) => {
    res.send('Le serveur d\'automatisation TraitementSV est en ligne !');
});


// Démarrage du serveur
app.listen(port, () => {
    console.log(`Le serveur d'audit écoute sur le port ${port}`);
});
