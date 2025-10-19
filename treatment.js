const puppeteer = require('puppeteer');

async function runTreatment(idSaisi, codeSaisi, userMRA, mdpMRA) {
    let browser = null;
    let page;

    // Le codeSaisi n'est plus utilisé avec cette nouvelle logique, mais on ne le supprime pas.
    console.log("Le robot démarre, mode de capture du bouton 'coche' activé.");

    try {
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        console.log("LOG: Navigateur lancé.");
        page = await browser.newPage();
        page.setDefaultTimeout(90000); // Timeout général augmenté à 90s

        // --- ÉTAT : Connexion ---
        console.log("LOG: Accès à la page de login.");
        await page.goto('https://smartmeteringbom.eneoapps.com/#/login', { waitUntil: 'networkidle2' });
        await page.waitForSelector('#username', { visible: true });
        console.log("LOG: Saisie des identifiants.");
        await page.type('#username', userMRA);
        await page.type('#password', mdpMRA);
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        console.log("LOG: Connexion réussie.");

        // --- ÉTAT : Navigation vers la page de recherche ---
        const searchUrl = `https://smartmeteringbom.eneoapps.com/#/device?filter=%7B%22device_identifier%22%3A%22${idSaisi}%22%7D`;
        console.log(`LOG: Navigation vers la page de l'ID ${idSaisi}.`);
        await page.goto(searchUrl, { waitUntil: 'networkidle2' });
        console.log("LOG: Page de recherche de l'ID chargée.");

        // --- ACTION PRINCIPALE : Clic sur l'icône de validation "coche" ---
        console.log("LOG: Recherche du bouton de validation (icône coche)...");

        // Ce sélecteur est la traduction directe de vos captures.
        // Il cherche un lien <a> qui contient un chemin SVG <path> avec le dessin de la coche.
        const checkmarkButtonSelector = 'a:has(> span > svg > path[d*="M12 2C6.48"])';
        
        await page.waitForSelector(checkmarkButtonSelector, { visible: true, timeout: 20000 });
        console.log("LOG: Bouton de validation (coche) trouvé !");

        await page.click(checkmarkButtonSelector);
        console.log("LOG: Clic sur le bouton de validation effectué.");

        // On attend une confirmation. Souvent, un message "toast" de succès apparaît.
        try {
            // Sélecteur générique pour les messages de succès
            const toastSelector = '[class*="Toastify__toast--success"], [class*="MuiAlert-filledSuccess"]';
            await page.waitForSelector(toastSelector, { visible: true, timeout: 15000 });
            const successMessage = await page.$eval(toastSelector, el => el.textContent);
            console.log(`LOG: Message de succès capturé : "${successMessage}"`);
        } catch(e) {
            console.log("LOG: Pas de message de succès détecté, mais l'action a probablement réussi. On continue.");
        }
        
        // --- ÉTAT : Déconnexion ---
        console.log("LOG: Recherche du bouton de déconnexion.");
        const logoutSelector = '[role="menuitem"] ::-p-text(Déconnexion)';
        await page.waitForSelector(logoutSelector, { visible: true });
        await page.click(logoutSelector);
        await page.waitForSelector('#username', { visible: true, timeout: 15000 });
        console.log("LOG: Déconnexion confirmée.");

        return { success: true, message: `Opération pour l'ID ${idSaisi} lancée avec succès.` };

    } catch (error) {
        if (page) {
            console.error(`ERREUR à l'URL: ${page.url()}`);
        }
        console.error(error.message);
        throw new Error(error.message);
    } finally {
        if (browser) {
            console.log("LOG: Fermeture du navigateur.");
            await browser.close();
        }
    }
}

module.exports = runTreatment;
