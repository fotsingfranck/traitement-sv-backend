const puppeteer = require('puppeteer');

// On transforme le script en une fonction exportable qui peut être appelée par server.js
async function runTreatment(idSaisi, codeSaisi, userMRA, mdpMRA) {
    let browser = null;
    console.log("Démarrage de la fonction runTreatment.");

    try {
        // Options de lancement pour la compatibilité avec Render.com
        browser = await puppeteer.launch({
            headless: true, // "true" pour le serveur, "false" pour tester en local et voir le navigateur
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process'
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, // Important pour Render
        });
        
        const page = await browser.newPage();
        // Augmenter le timeout général pour les sites qui peuvent être lents
        page.setDefaultTimeout(60000); // 60 secondes

        // ===== 1. Connexion =====
        console.log("Étape 1: Navigation vers la page de login...");
        await page.goto('https://smartmeteringbom.eneoapps.com/#/login', { waitUntil: 'networkidle2' });
        
        console.log("Remplissage des identifiants...");
        await page.waitForSelector('#username');
        await page.type('#username', userMRA);
        await page.type('#password', mdpMRA);

        await page.click('button[type="submit"]');
        
        // Attendre que la navigation après connexion soit terminée
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        console.log("Connexion réussie.");

        // ===== 2. Aller à la page de recherche =====
        const searchUrl = `https://smartmeteringbom.eneoapps.com/#/device?filter=%7B%22device_identifier%22%3A%22${idSaisi}%22%7D`;
        console.log(`Étape 2: Navigation vers la page de recherche pour ID: ${idSaisi}`);
        await page.goto(searchUrl, { waitUntil: 'networkidle2' });

        // ===== 3. Lancer la validation =====
        console.log("Étape 3: Clic sur le bouton de validation...");
        // Utiliser un sélecteur plus robuste qui attend que l'élément soit visible
        const validationButtonSelector = 'a[title="Device Command"]';
        await page.waitForSelector(validationButtonSelector, { visible: true });
        await page.click(validationButtonSelector);

        // Attendre que le formulaire de validation (pop-up) apparaisse
        const codeInputSelector = 'input[name="parameters.command_code"]';
        await page.waitForSelector(codeInputSelector, { visible: true });
        
        console.log(`Saisie du code: ${codeSaisi}`);
        await page.type(codeInputSelector, codeSaisi);

        await page.click('button[aria-label="Save"]');
        
        // Attendre une confirmation ou la redirection. 'networkidle0' est encore plus patient.
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        console.log("Validation soumise.");

        // ===== 4. Déconnexion (Optionnelle mais recommandée) =====
        console.log("Étape 4: Déconnexion...");
        const logoutButtonSelector = 'a[href="#/logout"]';
        await page.waitForSelector(logoutButtonSelector, { visible: true });
        await page.click(logoutButtonSelector);
        
        await page.waitForSelector('#username', { visible: true }); // Attendre de revoir le champ username de la page de login
        console.log("Déconnexion réussie.");

        return { success: true, message: `Traitement pour ${idSaisi} effectué.` };

    } catch (error) {
        console.error("Une erreur est survenue dans le script Puppeteer:", error);
        // On "relance" l'erreur pour que le bloc try/catch dans server.js puisse la récupérer
        // et la renvoyer proprement au PHP.
        throw new Error(error.message || "Une erreur inconnue est survenue dans Puppeteer.");
    } finally {
        // Très important : toujours s'assurer que le navigateur est fermé, même en cas d'erreur.
        if (browser) {
            console.log("Fermeture du navigateur.");
            await browser.close();
        }
    }
}

// On exporte la fonction pour que server.js puisse l'utiliser
module.exports = runTreatment;
