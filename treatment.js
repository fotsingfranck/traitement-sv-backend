const puppeteer = require('puppeteer');

// Fonction principale pour utiliser await
async function runTreatment() {
    let browser = null;
    console.log("Démarrage du processus de traitement Eneo.");

    try {
        // --- Récupération des arguments depuis l'appel PHP ---
        const idSaisi = process.argv[2];
        const codeSaisi = process.argv[3];
        const idMra = process.argv[4];   // Correspond à userMRA
        const codeMra = process.argv[5]; // Correspond à mdpMRA

        if (!idSaisi || !codeSaisi || !idMra || !codeMra) {
            throw new Error("Arguments manquants. Le script a besoin de: idSaisi, codeSaisi, userMRA, mdpMRA.");
        }

        console.log("Lancement du navigateur pour l'automatisation...");
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process'
            ],
            // Utilise le chemin du navigateur fourni par l'environnement Render
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        });

        const page = await browser.newPage();
        page.setDefaultTimeout(60000); // Timeout de 60 secondes pour les opérations

        // ===== 1. Connexion =====
        console.log("Étape 1: Navigation vers la page de login Eneo...");
        await page.goto('https://smartmeteringbom.eneoapps.com/#/login', { waitUntil: 'networkidle2' });

        console.log("Remplissage des identifiants de connexion Eneo...");
        await page.waitForSelector('#username', { visible: true });
        await page.type('#username', idMra); // Utilise idMra
        await page.type('#password', codeMra); // Utilise codeMra

        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        console.log("Connexion au portail Eneo réussie.");

        // ===== 2. Aller à la page de recherche =====
        const searchUrl = `https://smartmeteringbom.eneoapps.com/#/device?filter=%7B%22device_identifier%22%3A%22${idSaisi}%22%7D`;
        console.log(`Étape 2: Navigation vers la recherche pour l'ID: ${idSaisi}`);
        await page.goto(searchUrl, { waitUntil: 'networkidle2' });

        // ===== 3. Lancer la validation =====
        console.log("Étape 3: Clic sur le bouton de commande de l'appareil...");
        const validationButtonSelector = 'a[title="Device Command"]';
        await page.waitForSelector(validationButtonSelector, { visible: true });
        await page.click(validationButtonSelector);

        // Attendre que le formulaire de validation (pop-up) apparaisse
        const codeInputSelector = 'input[name="parameters.command_code"]';
        await page.waitForSelector(codeInputSelector, { visible: true });

        console.log(`Saisie du code de traitement: ${codeSaisi}`);
        await page.type(codeInputSelector, codeSaisi);
        await page.click('button[aria-label="Save"]');

        // Attendre la fin de l'opération
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        console.log("Formulaire de validation soumis.");

        // ===== 4. Déconnexion (Recommandée) =====
        console.log("Étape 4: Déconnexion du portail Eneo...");
        const logoutButtonSelector = 'a[href="#/logout"]';
        // Il se peut que le bouton ne soit pas immédiatement visible après la redirection
        await page.waitForSelector(logoutButtonSelector, { visible: true, timeout: 15000 });
        await page.click(logoutButtonSelector);
        await page.waitForSelector('#username', { visible: true }); // Attendre le retour à la page de login
        console.log("Déconnexion réussie.");

        // --- Sortie JSON pour le script PHP ---
        console.log(JSON.stringify({
            status: 'ok',
            message: `Traitement pour ${idSaisi} terminé avec succès.`
        }));

    } catch (error) {
        // --- Sortie JSON d'erreur pour le script PHP ---
        console.error(JSON.stringify({
            status: 'error',
            message: "Le service d'automatisation a échoué",
            details: error.message || "Une erreur inconnue est survenue dans Puppeteer."
        }));

    } finally {
        if (browser) {
            console.log("Fermeture du navigateur.");
            await browser.close();
        }
        // Termine le processus Node.js pour que PHP sache que c'est fini
        process.exit();
    }
}

// Lancement de la fonction principale
runTreatment();
