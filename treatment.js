const puppeteer = require('puppeteer');

async function runTreatment(idSaisi, codeSaisi, userMRA, mdpMRA) {
    let browser = null;
    let page;

    console.log("Le robot démarre, mode 'bavard' activé.");

    try {
        // --- ÉTAT : Lancement du navigateur ---
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        console.log("LOG: Navigateur lancé.");
        page = await browser.newPage();
        console.log("LOG: Nouvelle page ouverte.");
        page.setDefaultTimeout(60000);

        // --- ÉTAT : Navigation vers la page de login ---
        await page.goto('https://smartmeteringbom.eneoapps.com/#/login', { waitUntil: 'networkidle2' });
        console.log("LOG: Page de login atteinte.");
        await page.waitForSelector('#username', { visible: true });
        console.log("LOG: Champ 'username' visible.");

        // --- ÉTAT : Saisie des identifiants ---
        await page.type('#username', userMRA);
        console.log("LOG: Username saisi.");
        await page.type('#password', mdpMRA);
        console.log("LOG: Password saisi.");
        await page.click('button[type="submit"]');
        console.log("LOG: Clic sur 'Sign in'.");
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        console.log("LOG: Connexion réussie, page dashboard chargée.");

        // --- ÉTAT : Navigation vers la page de recherche ---
        const searchUrl = `https://smartmeteringbom.eneoapps.com/#/device?filter=%7B%22device_identifier%22%3A%22${idSaisi}%22%7D`;
        console.log(`LOG: Navigation vers l'URL de recherche pour l'ID ${idSaisi}.`);
        await page.goto(searchUrl, { waitUntil: 'networkidle2' });
        console.log("LOG: Page de recherche chargée.");

        // --- ÉTAT : Clic sur le bouton de commande ---
        await page.waitForFunction(() => document.querySelectorAll('a').length > 4, { timeout: 15000 });
        console.log("LOG: Assez de liens trouvés sur la page.");
        const allLinks = await page.$$('a');
        await allLinks[4].click();
        console.log("LOG: Clic sur le 5ème lien effectué.");

        // --- ÉTAT : Saisie du code ---
        const codeInputSelector = 'input[type="text"]:not([disabled])';
        await page.waitForSelector(codeInputSelector, { visible: true, timeout: 15000 });
        console.log("LOG: Champ de saisie du code trouvé.");
        await page.type(codeInputSelector, codeSaisi);
        console.log(`LOG: Saisie du code '${codeSaisi}' effectuée.`);

        // --- ÉTAT : Validation ---
        const confirmButtonSelector = 'button ::-p-text(Confirmer)';
        await page.waitForSelector(confirmButtonSelector, { visible: true });
        console.log("LOG: Bouton 'Confirmer' trouvé.");
        await page.click(confirmButtonSelector);
        console.log("LOG: Clic sur 'Confirmer'.");
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        console.log("LOG: Navigation après validation terminée.");

        // --- ÉTAT : Déconnexion ---
        const logoutSelector = '[role="menuitem"] ::-p-text(Déconnexion)';
        await page.waitForSelector(logoutSelector, { visible: true });
        console.log("LOG: Bouton de déconnexion trouvé.");
        await page.click(logoutSelector);
        console.log("LOG: Clic sur 'Déconnexion'.");
        await page.waitForSelector('#username', { visible: true, timeout: 15000 });
        console.log("LOG: Déconnexion confirmée, retour au login.");

        return { success: true, message: `Traitement pour l'ID ${idSaisi} effectué avec succès.` };

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
