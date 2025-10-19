const puppeteer = require('puppeteer');

async function runTreatment(idSaisi, codeSaisi, userMRA, mdpMRA) {
    let browser = null;
    console.log("Le robot démarre sa logique interne avec Chrome.");

    try {
        // On revient à la configuration standard pour Chrome
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

        console.log("Étape 1: Connexion au portail Eneo...");
        await page.goto('https://smartmeteringbom.eneoapps.com/#/login', { waitUntil: 'networkidle2' });
        
        await page.waitForSelector('#username', { visible: true });
        await page.type('#username', userMRA);
        await page.type('#password', mdpMRA);
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        console.log("Connexion réussie.");

        const searchUrl = `https://smartmeteringbom.eneoapps.com/#/device?filter=%7B%22device_identifier%22%3A%22${idSaisi}%22%7D`;
        console.log(`Étape 2: Navigation vers la page de recherche pour ID: ${idSaisi}`);
        await page.goto(searchUrl, { waitUntil: 'networkidle2' });

        console.log("Étape 3: Lancement de la commande...");
        const validationButtonSelector = 'a[title="Device Command"]';
        await page.waitForSelector(validationButtonSelector, { visible: true });
        await page.click(validationButtonSelector);

        const codeInputSelector = 'input[name="parameters.command_code"]';
        await page.waitForSelector(codeInputSelector, { visible: true });
        
        console.log(`Saisie du code: ${codeSaisi}`);
        await page.type(codeInputSelector, codeSaisi);
        await page.click('button[aria-label="Save"]');
        
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        console.log("Validation soumise.");

        console.log("Étape 4: Déconnexion...");
        const logoutButtonSelector = 'a[href="#/logout"]';
        await page.waitForSelector(logoutButtonSelector, { visible: true });
        await page.click(logoutButtonSelector);
        
        await page.waitForSelector('#username', { visible: true });
        console.log("Déconnexion réussie.");

        return { success: true, message: `Traitement pour ${idSaisi} effectué.` };

    } catch (error) {
        console.error("Erreur dans le robot Puppeteer (Chrome):", error.message);
        throw new Error(error.message);
    } finally {
        if (browser) {
            console.log("Fermeture du navigateur.");
            await browser.close();
        }
    }
}

module.exports = runTreatment;
