const puppeteer = require('puppeteer');

async function runTreatment(idSaisi, codeSaisi, userMRA, mdpMRA) {
    let browser = null;
    let page; // Déclarer page ici pour l'utiliser dans le bloc catch

    console.log("Le robot démarre, mode de confiance totale à Playwright.");

    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process'
            ]
        });
        
        page = await browser.newPage();
        page.setDefaultTimeout(60000);

        // --- ÉTAPE 1: CONNEXION ---
        console.log("Étape 1: Connexion au portail...");
        await page.goto('https://smartmeteringbom.eneoapps.com/#/login', { waitUntil: 'networkidle2' });
        await page.waitForSelector('#username', { visible: true });
        await page.type('#username', userMRA);
        await page.type('#password', mdpMRA);
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        console.log("Connexion réussie.");

        // --- ÉTAPE 2: RECHERCHE ---
        const searchUrl = `https://smartmeteringbom.eneoapps.com/#/device?filter=%7B%22device_identifier%22%3A%22${idSaisi}%22%7D`;
        console.log(`Étape 2: Navigation vers la page de l'ID ${idSaisi}`);
        await page.goto(searchUrl, { waitUntil: 'networkidle2' });

        // --- ÉTAPE 3: CLIC SUR LE BOUTON DE COMMANDE ---
        console.log("Étape 3: Clic sur le 5ème lien de la page...");
        await page.waitForFunction(() => document.querySelectorAll('a').length > 4, { timeout: 15000 });
        
        const allLinks = await page.$$('a');
        if (allLinks.length > 4) {
            await allLinks[4].click();
        } else {
            throw new Error("Impossible de trouver le 5ème lien (bouton de commande) sur la page.");
        }
        console.log("Clic effectué. Attente du formulaire.");

        // --- ÉTAPE 4: SAISIE DU CODE ---
        console.log("Étape 4: Recherche du premier champ de texte disponible...");
        const codeInputSelector = 'input[type="text"]:not([disabled])';
        await page.waitForSelector(codeInputSelector, { visible: true, timeout: 15000 });
        console.log(`Saisie du code '${codeSaisi}' dans le champ trouvé.`);
        await page.type(codeInputSelector, codeSaisi);

        // --- ÉTAPE 5: VALIDATION ---
        console.log("Étape 5: Clic sur le bouton de confirmation...");
        const confirmButtonSelector = 'button ::-p-text(Confirmer)';
        await page.waitForSelector(confirmButtonSelector, { visible: true });
        await page.click(confirmButtonSelector);
        
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        console.log("Validation soumise avec succès.");

        // --- ÉTAPE 6: DÉCONNEXION (Logique Playwright : "l'élément de menu Déconnexion") ---
        console.log("Étape 6: Déconnexion...");
        // C'est la traduction fidèle de getByRole('menuitem', { name: 'Déconnexion' })
        const logoutSelector = 'a[role="menuitem"] ::-p-text(Déconnexion)';
        await page.waitForSelector(logoutSelector, { visible: true });
        await page.click(logoutSelector);
        
        await page.waitForSelector('#username', { visible: true, timeout: 15000 });
        console.log("Déconnexion confirmée.");

        return { success: true, message: `Traitement pour l'ID ${idSaisi} effectué avec succès.` };

    } catch (error) {
        // Log d'erreur amélioré pour savoir où le robot s'est arrêté
        if (page) {
            console.error(`Erreur dans le robot (style Playwright) à l'URL: ${page.url()}`);
        }
        console.error(error.message);
        throw new Error(error.message);
    } finally {
        if (browser) {
            console.log("Fermeture du navigateur.");
            await browser.close();
        }
    }
}

module.exports = runTreatment;
