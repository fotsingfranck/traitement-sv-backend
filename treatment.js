// ==================================================================================================
// === SCRIPT DE TRAITEMENT FINAL (PUPPETEER) - v11 "NTH D'ASSAUT"                                ===
// === Ajoute un Plan D à l'étape 3, inspiré de l'enregistreur Playwright (`nth(4)`), pour      ===
// === cibler le 5ème lien dans la ligne du tableau correspondant à l'ID.                      ===
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

        // ... Séquences 1 et 2 (inchangées et robustes) ...
        log("\n--- SÉQUENCE 1 : CONNEXION ---");
        await page.goto('https://smartmeteringbom.eneoapps.com/#/login', { waitUntil: 'networkidle2' });
        log(`[1.2] ACTION : Saisie des identifiants (Utilisateur: ${userMRA}).`);
        await page.waitForSelector('#username', { visible: true });
        await page.type('#username', userMRA);
        await page.type('#password', mdpMRA);
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        if (!page.url().endsWith('/#/')) { throw new Error("La connexion a échoué."); }
        log("--- FIN SÉQUENCE 1 : Connexion réussie. ---\n");

        log("--- SÉQUENCE 2 : FILTRAGE DE L'APPAREIL ---");
        const appareilsUrl = 'https://smartmeteringbom.eneoapps.com/#/device';
        try {
            await page.waitForSelector('a[href="#/device"]', { visible: true, timeout: 10000 });
            await page.click('a[href="#/device"]');
            await page.waitForNavigation({ waitUntil: 'networkidle2' });
        } catch (e) {
            log(`[2.2] ÉCHEC (PLAN A). Passage au PLAN B : Navigation directe.`);
            await page.goto(appareilsUrl, { waitUntil: 'networkidle2' });
        }

        const urlPart1_final = 'https://smartmeteringbom.eneoapps.com/#/device?filter=%7B%22device_identifier%22%3A%22';
        const urlPart2_final = idSaisi;
        const urlPart3_final = '%22%7D&order=DESC&page=1&perPage=25&sort=onb_status';
        const finalFilteredUrl = `${urlPart1_final}${urlPart2_final}${urlPart3_final}`;

        try {
            await page.waitForSelector('button ::-p-text(Ajouter un filtre)', { visible: true });
            await page.click('button ::-p-text(Ajouter un filtre)');
            await page.click('li ::-p-text(Appareil N°)');
            await page.type('input[placeholder="Valeur"]', idSaisi);
            await page.keyboard.press('Enter');
            await page.waitForSelector('.MuiCircularProgress-root', { hidden: true, timeout: 30000 });
        } catch (e) {
            log(`[2.4] ÉCHEC (PLAN A). Passage au PLAN B : Navigation directe filtrée.`);
            await page.goto(finalFilteredUrl, { waitUntil: 'networkidle2' });
        }
        
        const verificationUrlPart = `filter=%7B%22device_identifier%22%3A%22${idSaisi}%22%7D`;
        if (!page.url().includes(verificationUrlPart)) {
            throw new Error(`Le filtrage a échoué (Plan A et B).`);
        }
        log(`--- FIN SÉQUENCE 2 : Appareil ${idSaisi} trouvé. ---\n`);

        // ================================================================================
        // === SÉQUENCE 3/4 : SAISIE DU CODE (RENFORCÉE AVEC PLAN D - NTH(4))           ===
        // ================================================================================
        log("--- SÉQUENCE 3 : CONFIRMATION DU TRAITEMENT (RENFORCÉE + PLAN D) ---");
        log("[3.1] DÉBUT : La page affiche l'appareil filtré.");
        
        let clickSuccess = false;

        // PLAN A: Sélecteur CSS simple
        try {
            log(`[3.2] PLAN A : Tentative de clic avec le sélecteur simple.`);
            const selectorA = `tr:has-text("${idSaisi}") a[aria-label="Confirmer"]`;
            await page.waitForSelector(selectorA, { visible: true, timeout: 5000 });
            await page.click(selectorA);
            clickSuccess = true;
            log("[3.2] SUCCÈS (PLAN A) : Clic réussi.");
        } catch (e) {
            log("[3.2] ÉCHEC (PLAN A). Passage au PLAN B.");
        }

        // PLAN B: Sélecteur XPath complexe (corrigé)
        if (!clickSuccess) {
            try {
                log(`[3.2] PLAN B : Tentative de clic avec le sélecteur XPath complexe.`);
                const selectorB = `//tr[.//td[contains(.,'${idSaisi}')]]//a[@aria-label='Confirmer' or @role='button']`;
                const [button] = await page.$x(selectorB);
                if (button) {
                    await button.click();
                    clickSuccess = true;
                    log("[3.2] SUCCÈS (PLAN B) : Clic réussi.");
                } else { throw new Error("Le sélecteur XPath n'a pas trouvé de bouton."); }
            } catch (e2) {
                log(`[3.2] ÉCHEC (PLAN B): ${e2.message}. Passage au PLAN C.`);
            }
        }
        
        // PLAN C: Exécution JS pour forcer le clic
        if (!clickSuccess) {
            try {
                log("[3.2] PLAN C : Exécution de JS pour forcer le clic.");
                const clicked = await page.evaluate((id) => {
                    const rows = Array.from(document.querySelectorAll('tr'));
                    const targetRow = rows.find(row => row.innerText.includes(id));
                    if (targetRow) {
                        const button = targetRow.querySelector('a[aria-label="Confirmer"], a[role="button"]');
                        if (button) { button.click(); return true; }
                    }
                    return false;
                }, idSaisi);
                if (!clicked) { throw new Error("Le script d'exécution forcée n'a pas trouvé de bouton."); }
                clickSuccess = true;
                log("[3.2] SUCCÈS (PLAN C) : Le script a trouvé et cliqué sur le bouton.");
            } catch (e3) {
                log(`[3.2] ÉCHEC (PLAN C): ${e3.message}. Passage au PLAN D.`);
            }
        }

        // PLAN D: Stratégie NTH(4)
        if (!clickSuccess) {
            try {
                log("[3.2] PLAN D : Tentative de clic avec la stratégie NTH(4).");
                const clicked = await page.evaluate((id) => {
                    const rows = Array.from(document.querySelectorAll('tr'));
                    const targetRow = rows.find(row => row.innerText.includes(id));
                    if (targetRow) {
                        // On trouve TOUS les liens dans la ligne et on prend le 5ème (index 4)
                        const links = targetRow.querySelectorAll('a');
                        if (links.length > 4) {
                            links[4].click();
                            return true;
                        }
                    }
                    return false;
                }, idSaisi);
                if (!clicked) { throw new Error("La stratégie NTH(4) n'a pas trouvé assez de liens dans la ligne."); }
                 clickSuccess = true;
                log("[3.2] SUCCÈS (PLAN D) : Clic sur le 5ème lien de la ligne réussi.");
            } catch (e4) {
                 throw new Error(`ÉCHEC TOTAL : Le clic a échoué avec les 4 méthodes. Erreur finale: ${e4.message}`);
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
            throw new Error("La confirmation finale a échoué.");
        }
        log("[3.6] SUCCÈS : Traitement confirmé.");
        log("--- FIN SÉQUENCE 3 : Traitement réussi. ---\n");

        // ... Séquence 4 (inchangée) ...
        log("--- SÉQUENCE 4 : DÉCONNEXION ---");
        await page.click('li ::-p-text(Déconnexion)');
        await page.waitForSelector('#username', { visible: true });
        if (!page.url().includes('/login')) { throw new Error("La déconnexion a échoué."); }
        log("--- FIN SÉQUENCE 4 : Session terminée. ---\n");

        log("<<<<< SÉQUENCE COMPLÈTE RÉUSSIE >>>>>");
        return { success: true, message: `Séquence complète pour l'ID ${idSaisi} réussie.` };

    } catch (error) {
        let currentUrl = 'inconnue';
        if (page) { currentUrl = page.url(); }
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
