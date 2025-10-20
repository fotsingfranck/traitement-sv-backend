// ==================================================================================================
// === SCRIPT DE TRAITEMENT FINAL (PUPPETEER) - v9 "TABULATION D'URGENCE"                         ===
// === Ajoute un Plan C à l'étape 3 : simulation de 28 pressions sur la touche 'Tab' pour        ===
// === atteindre et activer le bouton "Confirmer".                                              ===
// ==================================================================================================

const puppeteer = require('puppeteer');

async function runTreatment(idSaisi, codeSaisi, userMRA, mdpMRA, logCallback) {
    let browser;
    let page;

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
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });
        page.setDefaultTimeout(90000);

        // =================================================================
        // === SÉQUENCE 1/4 : CONNEXION                                  ===
        // =================================================================
        log("\n--- SÉQUENCE 1 : CONNEXION ---");
        log(`[1.1] DÉBUT : Navigation vers la page de login.`);
        await page.goto('https://smartmeteringbom.eneoapps.com/#/login', { waitUntil: 'networkidle2' });
        log(`[1.1] SUCCÈS : Page de login chargée.`);
        log(`[1.2] ACTION : Saisie des identifiants (Utilisateur: ${userMRA}).`);
        await page.waitForSelector('#username', { visible: true });
        await page.type('#username', userMRA);
        await page.type('#password', mdpMRA);
        log(`[1.3] ACTION : Clic sur le bouton 'Sign in'.`);
        await page.click('button[type="submit"]');
        log(`[1.4] VÉRIFICATION : Attente de la redirection vers le tableau de bord.`);
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        if (!page.url().endsWith('/#/')) {
             throw new Error("La connexion a échoué. Redirection vers le tableau de bord non détectée.");
        }
        log(`[1.4] SUCCÈS : Redirection vers le tableau de bord confirmée.`);
        log("--- FIN SÉQUENCE 1 : Connexion réussie. ---\n");


        // =================================================================
        // === SÉQUENCE 2/4 : ACCÈS À L'ID ET FILTRAGE (AVEC 2 PLANS B)  ===
        // =================================================================
        log("--- SÉQUENCE 2 : FILTRAGE DE L'APPAREIL ---");
        log("[2.1] DÉBUT : La page actuelle est le tableau de bord.");

        // --- Plan B n°1 pour la page Appareils ---
        const appareilsUrl = 'https://smartmeteringbom.eneoapps.com/#/device';
        try {
            log(`[2.2] PLAN A : Attente (15s max) de la visibilité du bouton 'Appareils'.`);
            await page.waitForSelector('a[href="#/device"]', { visible: true, timeout: 15000 });
            log("[2.2] SUCCÈS (PLAN A) : Bouton visible. Clic en cours.");
            await page.click('a[href="#/device"]');
            await page.waitForNavigation({ waitUntil: 'networkidle2' });
        } catch (e) {
            log(`[2.2] ÉCHEC (PLAN A) : Le bouton n'est pas apparu. Passage au PLAN B.`);
            log(`[2.2] PLAN B : Navigation directe vers l'URL des appareils.`);
            await page.goto(appareilsUrl, { waitUntil: 'networkidle2' });
        }
        log("[2.3] SUCCÈS : Page des appareils atteinte.");

        // --- Plan B n°2 pour le filtrage de l'ID ---
        const urlPart1_final = 'https://smartmeteringbom.eneoapps.com/#/device?filter=%7B%22device_identifier%22%3A%22';
        const urlPart2_final = idSaisi;
        const urlPart3_final = '%22%7D&order=DESC&page=1&perPage=25&sort=onb_status';
        const finalFilteredUrl = `${urlPart1_final}${urlPart2_final}${urlPart3_final}`;

        try {
            log("[2.4] PLAN A : Tentative de filtrage via l'interface graphique.");
            await page.waitForSelector('button ::-p-text(Ajouter un filtre)', { visible: true });
            await page.click('button ::-p-text(Ajouter un filtre)');
            log("       ...clic sur 'Appareil N°'.");
            await page.click('li ::-p-text(Appareil N°)');
            log(`       ...saisie de l'ID "${idSaisi}".`);
            await page.type('input[placeholder="Valeur"]', idSaisi);
            await page.keyboard.press('Enter');
            log("       ...attente de la fin de la recherche (spinner).");
            await page.waitForSelector('.MuiCircularProgress-root', { hidden: true, timeout: 30000 });
            log("[2.4] SUCCÈS (PLAN A) : Filtrage par l'interface réussi.");
        } catch (e) {
            log(`[2.4] ÉCHEC (PLAN A) : Le filtrage via l'interface a échoué. Passage au PLAN B.`);
            log(`[2.4] PLAN B : Navigation directe vers l'URL finale filtrée: ${finalFilteredUrl}`);
            await page.goto(finalFilteredUrl, { waitUntil: 'networkidle2' });
        }
        
        log("[2.5] VÉRIFICATION FINALE : L'URL doit contenir le filtre de l'ID.");
        const verificationUrlPart = `filter=%7B%22device_identifier%22%3A%22${idSaisi}%22%7D`;
        if (!page.url().includes(verificationUrlPart)) {
            throw new Error(`Le filtrage a échoué (Plan A et B). L'URL actuelle (${page.url()}) ne contient pas le bon filtre.`);
        }
        log("[2.5] SUCCÈS : L'URL de la page filtrée est correcte.");
        log(`--- FIN SÉQUENCE 2 : Appareil ${idSaisi} trouvé et URL vérifiée. ---\n`);


        // =================================================================
        // === SÉQUENCE 3/4 : SAISIE DU CODE (RENFORCÉE AVEC PLAN C)     ===
        // =================================================================
        log("--- SÉQUENCE 3 : CONFIRMATION DU TRAITEMENT (RENFORCÉE + PLAN C) ---");
        log("[3.1] DÉBUT : La page affiche l'appareil filtré.");
        
        const confirmIconSelectorSimple = `tr:has-text("${idSaisi}") a[aria-label="Confirmer"]`;
        const confirmIconSelectorComplexe = `//tr[.//td[contains(.,'${idSaisi}')]]//a[@aria-label='Confirmer' or @role='button']`;

        try {
            log(`[3.2] PLAN A : Tentative de clic avec le sélecteur simple.`);
            await page.waitForSelector(confirmIconSelectorSimple, { visible: true, timeout: 5000 });
            await page.click(confirmIconSelectorSimple);
            log("[3.2] SUCCÈS (PLAN A) : Clic réussi.");
        } catch (e) {
            log("[3.2] ÉCHEC (PLAN A) : Sélecteur simple non trouvé. Passage au PLAN B.");
            try {
                log(`[3.2] PLAN B : Tentative de clic avec le sélecteur XPath complexe.`);
                const [button] = await page.$x(confirmIconSelectorComplexe);
                if (button) {
                    await button.click();
                    log("[3.2] SUCCÈS (PLAN B) : Clic réussi.");
                } else {
                    // Si le sélecteur XPath échoue aussi, on passe au Plan C
                    throw new Error("Le sélecteur XPath n'a pas trouvé de bouton.");
                }
            } catch (e2) {
                log(`[3.2] ÉCHEC (PLAN B) : ${e2.message}. Passage au PLAN C.`);
                try {
                    log("[3.2] PLAN C : Lancement de la séquence de tabulation d'urgence (28 x TAB).");
                    for (let i = 0; i < 28; i++) {
                        await page.keyboard.press('Tab');
                        // Petite pause pour que le focus se mette à jour visuellement
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                    log("       ...Séquence de tabulation terminée. Pression sur 'Entrée'.");
                    await page.keyboard.press('Enter');
                    log("[3.2] SUCCÈS (PLAN C) : Activation par 'Entrée' effectuée.");
                } catch (e3) {
                    throw new Error(`ÉCHEC TOTAL : Le clic a échoué avec les 3 méthodes (CSS, XPath, Tabulation). Erreur: ${e3.message}`);
                }
            }
        }
        
        // --- Vérification de l'URL intermédiaire ---
        log("[3.3] VÉRIFICATION : Attente du changement d'URL vers la page de confirmation.");
        await page.waitForFunction(
            () => window.location.href.includes('/#/device/') && window.location.href.includes('/confirm'),
            { timeout: 15000 }
        );
        log(`[3.3] SUCCÈS : URL de confirmation atteinte : ${page.url()}`);
        
        // --- Suite de la séquence ---
        await page.waitForSelector('h2 ::-p-text(Confirmer l\'appareil)', { visible: true });
        log(`[3.4] ACTION : Saisie du code : "${codeSaisi}".`);
        await page.type('main input[type="text"]', codeSaisi);
        log("[3.5] ACTION : Clic sur le bouton final 'Confirmer'.");
        await page.click('button ::-p-text(Confirmer)');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        if (!page.url().endsWith('/#/device')) {
            throw new Error("La confirmation finale a échoué. Pas de retour à la liste des appareils.");
        }
        log("[3.6] SUCCÈS : Traitement confirmé.");
        log("--- FIN SÉQUENCE 3 : Traitement réussi. ---\n");


        // =================================================================
        // === SÉQUENCE 4/4 : DÉCONNEXION                                ===
        // =================================================================
        log("--- SÉQUENCE 4 : DÉCONNEXION ---");
        await page.click('li ::-p-text(Déconnexion)');
        log("[4.1] VÉRIFICATION : Attente du retour à la page de login.");
        await page.waitForSelector('#username', { visible: true });
        if (!page.url().includes('/login')) {
             throw new Error("La déconnexion a échoué.");
        }
        log("[4.2] SUCCÈS : Déconnexion confirmée.");
        log("--- FIN SÉQUENCE 4 : Session terminée. ---\n");

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

module.exports = { runTreatment };
