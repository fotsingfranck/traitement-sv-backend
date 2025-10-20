// ================================================================================
// === SCRIPT DE TRAITEMENT FINAL (PUPPETEER) - VERSION "ULTRA BAVARDE & PARANOÏAQUE" ===
// === Fusionne les 4 séquences avec des logs détaillés et des vérifications d'URL. ===
// ================================================================================

const puppeteer = require('puppeteer');

/**
 * Fonction principale du robot qui exécute la séquence complète.
 * @param {string} idSaisi - L'ID de l'appareil à traiter.
 * @param {string} codeSaisi - Le code de confirmation.
 * @param {string} userMRA - Le nom d'utilisateur.
 * @param {string} mdpMRA - Le mot de passe.
 * @param {function} logCallback - Fonction pour envoyer des logs en temps réel.
 */
async function runTreatment(idSaisi, codeSaisi, userMRA, mdpMRA, logCallback) {
    let browser;
    let page;

    // Fonction interne pour logger, pour ne pas répéter 'if (logCallback)' partout.
    const log = (message) => {
        if (logCallback) {
            logCallback(message);
        } else {
            console.log(message);
        }
    };

    try {
        log("<<<<< DÉMARRAGE DU ROBOT TRAITEMENT-SV >>>>>");
        browser = await puppeteer.launch({
            headless: true, // `true` est essentiel pour le serveur.
            args: ['--no-sandbox', '--disable-setuid-sandbox'] // Indispensable pour Render/Linux
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });
        // Un timeout long (90s) pour les actions, pour ne pas échouer sur un serveur lent.
        page.setDefaultTimeout(90000); 

        // =================================================================
        // === SÉQUENCE 1/4 : CONNEXION                                  ===
        // =================================================================
        log("\n--- SÉQUENCE 1 : CONNEXION ---");
        log(`[1.1] DÉBUT : Navigation vers la page de login.`);
        log(`      URL ATTENDUE : https://smartmeteringbom.eneoapps.com/#/login`);
        await page.goto('https://smartmeteringbom.eneoapps.com/#/login', { waitUntil: 'networkidle2' });
        
        if (!page.url().includes('/login')) {
            throw new Error("Échec de la navigation initiale. La page de login n'a pas été atteinte.");
        }
        log(`[1.1] SUCCÈS : Page de login chargée.`);

        log(`[1.2] ACTION : Saisie des identifiants (Utilisateur: ${userMRA}).`);
        await page.waitForSelector('#username', { visible: true });
        await page.type('#username', userMRA);
        await page.type('#password', mdpMRA);
        
        log(`[1.3] ACTION : Clic sur le bouton 'Sign in'.`);
        await page.click('button[type="submit"]');

        log(`[1.4] VÉRIFICATION : Attente de la redirection et du chargement du tableau de bord.`);
        log(`      URL ATTENDUE : https://smartmeteringbom.eneoapps.com/#/`);
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        
        if (!page.url().endsWith('/#/')) {
             throw new Error("La connexion a échoué. Redirection vers le tableau de bord non détectée.");
        }
        log(`[1.4] SUCCÈS : Redirection vers le tableau de bord confirmée.`);
        log("--- FIN SÉQUENCE 1 : Connexion réussie. ---\n");


        // =================================================================
        // === SÉQUENCE 2/4 : ACCÈS À L'ID ET FILTRAGE                   ===
        // =================================================================
        log("--- SÉQUENCE 2 : FILTRAGE DE L'APPAREIL ---");
        log("[2.1] DÉBUT : La page actuelle est le tableau de bord.");

        log("[2.2] ACTION : Clic sur le bouton du menu 'Appareils'.");
        await page.click('a[href="#/device"]');
        log("       ...attente du chargement de la page des appareils...");
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        log("[2.3] ACTION : Clic sur 'Ajouter un filtre'.");
        await page.waitForSelector('button ::-p-text(Ajouter un filtre)', { visible: true });
        await page.click('button ::-p-text(Ajouter un filtre)');

        log("[2.4] ACTION : Sélection du type de filtre 'Appareil N°'.");
        await page.click('li ::-p-text(Appareil N°)');

        log(`[2.5] ACTION : Saisie de l'ID à rechercher : "${idSaisi}".`);
        await page.type('input[placeholder="Valeur"]', idSaisi);
        await page.keyboard.press('Enter');

        log("[2.6] VÉRIFICATION : Attente de la fin de la recherche (disparition du spinner).");
        await page.waitForSelector('.MuiCircularProgress-root', { hidden: true, timeout: 30000 });
        
        log("[2.7] VÉRIFICATION FINALE : Contrôle de l'URL après filtrage.");
        const encodedFilter = encodeURIComponent(JSON.stringify({ "device_identifier": idSaisi }));
        const expectedUrlPart = `#/device?filter=${encodedFilter}`;
        log(`      ...doit contenir : "${expectedUrlPart}"`);
        const currentUrl = page.url();
        if (!currentUrl.includes(expectedUrlPart)) {
            throw new Error(`Le filtrage semble avoir échoué. L'URL actuelle (${currentUrl}) ne correspond pas à l'attente.`);
        }
        log("[2.7] SUCCÈS : L'URL de la page filtrée est correcte.");
        log(`--- FIN SÉQUENCE 2 : Appareil ${idSaisi} trouvé et URL vérifiée. ---\n`);


        // =================================================================
        // === SÉQUENCE 3/4 : SAISIE DU CODE ET VALIDATION               ===
        // =================================================================
        log("--- SÉQUENCE 3 : CONFIRMATION DU TRAITEMENT ---");
        log("[3.1] DÉBUT : La page affiche l'appareil filtré.");
        
        log("[3.2] ACTION : Clic sur l'icône 'Confirmer' de la bonne ligne.");
        const confirmIconSelector = `tr:has-text("${idSaisi}") a[aria-label="Confirmer"]`;
        await page.waitForSelector(confirmIconSelector, { visible: true });
        await page.click(confirmIconSelector);

        log("[3.3] VÉRIFICATION : Attente du chargement de la page de saisie du code.");
        await page.waitForSelector('h2 ::-p-text(Confirmer l\'appareil)', { visible: true });
        
        log(`[3.4] ACTION : Saisie du code de confirmation : "${codeSaisi}".`);
        await page.type('main input[type="text"]', codeSaisi);
        
        log("[3.5] ACTION : Clic sur le bouton final 'Confirmer'.");
        await page.click('button ::-p-text(Confirmer)');

        log("[3.6] VÉRIFICATION : Attente du retour à la liste des appareils.");
        log(`      URL FINALE ATTENDUE : https://smartmeteringbom.eneoapps.com/#/device`);
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        
        if (!page.url().endsWith('/#/device')) {
            throw new Error("La confirmation a échoué. Pas de retour à la liste des appareils.");
        }
        log("[3.6] SUCCÈS : Traitement confirmé, retour à la liste des appareils.");
        log("--- FIN SÉQUENCE 3 : Traitement réussi. ---\n");


        // =================================================================
        // === SÉQUENCE 4/4 : DÉCONNEXION                                ===
        // =================================================================
        log("--- SÉQUENCE 4 : DÉCONNEXION ---");
        log("[4.1] DÉBUT : La page actuelle est la liste des appareils.");
        
        log("[4.2] ACTION : Clic sur le bouton du menu 'Déconnexion'.");
        await page.click('li ::-p-text(Déconnexion)');

        log("[4.3] VÉRIFICATION : Attente du retour à la page de login.");
        log(`      URL FINALE ATTENDUE : https://smartmeteringbom.eneoapps.com/#/login`);
        await page.waitForSelector('#username', { visible: true });
        
        if (!page.url().includes('/login')) {
             throw new Error("La déconnexion a échoué. La page de login n'a pas été atteinte.");
        }
        log("[4.3] SUCCÈS : Déconnexion confirmée.");
        log("--- FIN SÉQUENCE 4 : Session terminée proprement. ---\n");
        
        log("<<<<< SÉQUENCE COMPLÈTE RÉUSSIE >>>>>");
        return { success: true, message: `Séquence complète pour l'ID ${idSaisi} réussie.` };

    } catch (error) {
        let currentUrl = 'inconnue';
        if (page) {
            currentUrl = page.url();
        }
        log(`!!!!!!!!!! ERREUR FATALE !!!!!!!!!!`);
        log(`       URL au moment de l'erreur : ${currentUrl}`);
        log(`       DÉTAIL DE L'ERREUR : ${error.message}`);
        return { success: false, message: `Le robot a échoué : ${error.message}` };
    } finally {
        if (browser) {
            await browser.close();
            log("<<<<< FERMETURE DU NAVIGATEUR >>>>>");
        }
    }
}

// On exporte la fonction pour que le script principal du serveur puisse l'appeler.
module.exports = { runTreatment };
