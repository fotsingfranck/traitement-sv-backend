const puppeteer = require('puppeteer');

async function runTreatment(idSaisi, codeSaisi, userMRA, mdpMRA) {
    let browser = null;
    console.log("Le robot démarre sa logique interne, style Playwright.");

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
        
        const page = await browser.newPage();
        page.setDefaultTimeout(60000);

        // --- ÉTAPE 1: CONNEXION (Style Playwright) ---
        console.log("Étape 1: Connexion au portail Eneo...");
        await page.goto('https://smartmeteringbom.eneoapps.com/#/login', { waitUntil: 'networkidle2' });
        
        await page.waitForSelector('#username', { visible: true });
        await page.type('#username', userMRA);
        await page.type('#password', mdpMRA);
        await page.click('button[type="submit"]');
        
        // Attente de la navigation post-connexion
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        console.log("Connexion réussie, navigation vers la page de recherche.");

        // --- ÉTAPE 2: RECHERCHE (Style Playwright) ---
        const searchUrl = `https://smartmeteringbom.eneoapps.com/#/device?filter=%7B%22device_identifier%22%3A%22${idSaisi}%22%7D`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2' });

        // --- ÉTAPE 3: CLIC SUR LE BOUTON DE COMMANDE (Logique Playwright directe) ---
        console.log("Étape 3: Clic sur le bouton de commande (5ème lien de la page)...");
        
        // On attend qu'il y ait au moins 5 liens sur la page pour éviter une erreur
        await page.waitForFunction(() => document.querySelectorAll('a').length > 4);
        
        // On récupère TOUS les liens et on clique sur le 5ème (index 4)
        const allLinks = await page.$$('a');
        if (allLinks.length > 4) {
            await allLinks[4].click();
        } else {
            throw new Error("Impossible de trouver le 5ème lien (bouton de commande) sur la page.");
        }

        // --- ÉTAPE 4: SAISIE DU CODE (Style Playwright) ---
        console.log("Étape 4: Saisie du code...");
        // On attend que le formulaire apparaisse en cherchant le champ de saisie par son 'name'
        const codeInputSelector = 'input[name="parameters.command_code"]';
        await page.waitForSelector(codeInputSelector, { visible: true });
        await page.type(codeInputSelector, codeSaisi);

        // --- ÉTAPE 5: VALIDATION (Style Playwright) ---
        console.log("Étape 5: Clic sur le bouton de confirmation...");
        // On cherche un bouton qui contient le texte "Confirmer"
        const confirmButtonSelector = 'button ::-p-text(Confirmer)';
        await page.waitForSelector(confirmButtonSelector, { visible: true });
        await page.click(confirmButtonSelector);
        
        // Attendre la navigation ou la confirmation qui suit la validation
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        console.log("Validation soumise avec succès.");

        // --- ÉTAPE 6: DÉCONNEXION (Style Playwright) ---
        console.log("Étape 6: Déconnexion...");
        // On attend que le bouton soit de nouveau visible après la redirection
        await page.waitForSelector('a[href="#/logout"]', { visible: true });
        await page.click('a[href="#/logout"]');
        
        // Vérification du retour à la page de login
        await page.waitForSelector('#username', { visible: true, timeout: 15000 });
        console.log("Déconnexion confirmée.");

        return { success: true, message: `Traitement pour l'ID ${idSaisi} effectué avec succès.` };

    } catch (error) {
        console.error("Erreur dans le robot (style Playwright):", error.message);
        throw new Error(error.message);
    } finally {
        if (browser) {
            console.log("Fermeture du navigateur.");
            await browser.close();
        }
    }
}

module.exports = runTreatment;
