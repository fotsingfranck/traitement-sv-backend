const puppeteer = require('puppeteer');

// Fonction utilitaire pour une attente simple
const delay = ms => new Promise(res => setTimeout(res, ms));

async function runTreatment(idSaisi, codeSaisi, userMRA, mdpMRA, logCallback) {
    let browser;
    let page;

    const log = (message) => {
        if (logCallback) { logCallback(message); } 
        else { console.log(message); }
    };

    try {
        log("<<<<< DÉMARRAGE DU ROBOT TRAITEMENT-SV (v. Rapide) >>>>>");
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });
        
        // Timeout général de 90 secondes, largement suffisant
        page.setDefaultTimeout(90000); 

        // =============================================================
        // === SÉQUENCE 1 : CONNEXION (DIRECTE) ========================
        // =============================================================
        log("\n--- SÉQUENCE 1 : CONNEXION ---");
        await page.goto('https://smartmeteringbom.eneoapps.com/#/login', { waitUntil: 'networkidle2' });
        await page.waitForSelector('#username', { visible: true });
        await page.type('#username', userMRA);
        await page.type('#password', mdpMRA);
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        if (!page.url().endsWith('/#/')) { throw new Error("La connexion a échoué."); }
        log("--- FIN SÉQUENCE 1 : Connexion réussie. ---\n");

        // =============================================================
        // === SÉQUENCE 2 : FILTRAGE (DIRECT) ==========================
        // =============================================================
        log("--- SÉQUENCE 2 : FILTRAGE DE L'APPAREIL ---");
        // On va directement à l'URL filtrée, c'est la méthode la plus rapide et la plus fiable.
        const finalFilteredUrl = `https://smartmeteringbom.eneoapps.com/#/device?filter=%7B%22device_identifier%22%3A%22${idSaisi}%22%7D&order=DESC&page=1&perPage=25&sort=onb_status`;
        log(`[2.1] Accès direct à l'URL filtrée...`);
        await page.goto(finalFilteredUrl, { waitUntil: 'networkidle2' });
        
        // Attente d'un élément clé pour s'assurer que les données sont chargées
        await page.waitForSelector(`tr:has-text("${idSaisi}")`, { timeout: 20000 });
        log(`--- FIN SÉQUENCE 2 : Appareil ${idSaisi} trouvé. ---\n`);

        // =============================================================
        // === SÉQUENCE 3 : CONFIRMATION (PLAN C DIRECT) ===============
        // =============================================================
        log("--- SÉQUENCE 3 : CONFIRMATION DU TRAITEMENT ---");
        log("[3.1] Exécution du script pour forcer le clic sur le 2ème bouton 'Confirmer'...");
        const clicked = await page.evaluate((id) => {
            const rows = Array.from(document.querySelectorAll('tr'));
            const targetRow = rows.find(row => row.innerText.includes(id));
            if (targetRow) {
                const links = targetRow.querySelectorAll('a[href*="#/device/"]');
                if (links.length > 1) {
                    links[1].click(); // On clique sur le DEUXIÈME bouton (/confirm)
                    return true;
                }
            }
            return false;
        }, idSaisi);
        
        if (!clicked) { throw new Error("Le script n'a pas pu trouver et cliquer sur le bouton de confirmation."); }
        log("[3.2] SUCCÈS : Clic forcé réussi.");

        // --- Saisie du code et confirmation finale ---
        await page.waitForFunction(
            () => window.location.href.includes('/confirm'), { timeout: 15000 }
        );
        log(`[3.3] Page de confirmation atteinte. Saisie du code "${codeSaisi}"...`);
        await page.waitForSelector('main input[type="text"]', { visible: true });
        await page.type('main input[type="text"]', codeSaisi);

        log("[3.4] Clic sur le bouton final 'Confirmer'.");
        await page.click('button ::-p-text(Confirmer)');
        
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        if (!page.url().endsWith('/#/device')) { throw new Error("La confirmation finale a échoué."); }
        log("--- FIN SÉQUENCE 3 : Traitement réussi. ---\n");

        // =============================================================
        // === SÉQUENCE 4 : DÉCONNEXION (RAPIDE) =======================
        // =============================================================
        log("--- SÉQUENCE 4 : DÉCONNEXION ---");
        // Navigation directe vers l'URL de déconnexion si possible, sinon clic
        try {
           await page.click('li ::-p-text(Déconnexion)');
           await page.waitForSelector('#username', { visible: true });
        } catch(e) {
            log("Le clic a échoué, tentative de navigation directe vers le login.");
            await page.goto('https://smartmeteringbom.eneoapps.com/#/login', { waitUntil: 'networkidle2' });
        }
        log("--- FIN SÉQUENCE 4 : Session terminée. ---\n");

        log("<<<<< SÉQUENCE COMPLÈTE RÉUSSIE >>>>>");
        return { success: true, message: `Traitement pour l'ID ${idSaisi} réussi.` };

    } catch (error) {
        log(`!!!!!!!!!! ERREUR FATALE !!!!!!!!!!`);
        log(`       DÉTAIL : ${error.message}`);
        return { success: false, message: `Le robot a échoué : ${error.message}` };
    } finally {
        if (browser) {
            await browser.close();
            log("<<<<< FERMETURE DU NAVIGATEUR >>>>>");
        }
    }
}

module.exports = { runTreatment };
