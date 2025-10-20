const puppeteer = require('puppeteer');

async function runTreatment(idSaisi, codeSaisi, userMRA, mdpMRA) {
    let browser = null;
    let page;

    console.log("Le robot démarre, mode 'Séquence Playwright Stricte & Bavarde' activé.");

    try {
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        console.log("LOG RETOUR: Navigateur lancé.");

        page = await browser.newPage();
        console.log("LOG RETOUR: Nouvelle page ouverte.");

        page.setDefaultTimeout(90000); // Timeout général de 90s

        // --- ÉTAPE 1: Connexion ---
        console.log("LOG ACTION: 1. Navigation vers la page de login.");
        await page.goto('https://smartmeteringbom.eneoapps.com/#/login', { waitUntil: 'networkidle2' });
        console.log("LOG RETOUR: 1. Page de login atteinte.");

        await page.waitForSelector('#username', { visible: true });
        console.log("LOG RETOUR: 1. Champ 'username' visible.");

        console.log("LOG ACTION: 1. Saisie des identifiants et clic.");
        await page.type('#username', userMRA);
        await page.type('#password', mdpMRA);
        await page.click('button[type="submit"]');
        console.log("LOG RETOUR: 1. Clic de connexion effectué.");

        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        console.log("LOG RETOUR: 1. Connexion réussie.");

        // --- ÉTAPE 2: Clic sur 'Appareils' ---
        console.log("LOG ACTION: 2. Recherche et clic sur 'Appareils'.");
        const appareilsButtonSelector = 'button ::-p-text(Appareils)';
        await page.waitForSelector(appareilsButtonSelector, { visible: true });
        await page.click(appareilsButtonSelector);
        console.log("LOG RETOUR: 2. Clic sur 'Appareils' effectué.");

        // --- ÉTAPE 3: Clic sur 'Ajouter un filtre' ---
        console.log("LOG ACTION: 3. Recherche et clic sur 'Ajouter un filtre'.");
        const addFilterButtonSelector = 'button ::-p-text(Ajouter un filtre)';
        await page.waitForSelector(addFilterButtonSelector, { visible: true });
        await page.click(addFilterButtonSelector);
        console.log("LOG RETOUR: 3. Clic sur 'Ajouter un filtre' effectué.");

        // --- ÉTAPE 4: Sélection du type de filtre 'Appareil N°' ---
        console.log("LOG ACTION: 4. Sélection du filtre 'Appareil N°'.");
        const filterTypeSelector = '::-p-text(Appareil N°)';
        await page.waitForSelector(filterTypeSelector, { visible: true });
        await page.click(filterTypeSelector);
        console.log("LOG RETOUR: 4. Clic sur l'option 'Appareil N°' effectué.");

        // --- ÉTAPE 5: Saisie de l'ID ---
        console.log(`LOG ACTION: 5. Saisie de l'ID '${idSaisi}' et validation.`);
        const filterInputSelector = 'input[placeholder="Valeur"]';
        await page.waitForSelector(filterInputSelector, { visible: true });
        await page.type(filterInputSelector, idSaisi);
        await page.keyboard.press('Enter');
        await page.waitForSelector('.MuiCircularProgress-root', { hidden: true, timeout: 20000 });
        console.log("LOG RETOUR: 5. Filtre pour l'ID appliqué.");

        // --- ÉTAPE 6: Clic sur le 5ème lien ---
        console.log("LOG ACTION: 6. Recherche et clic sur le 5ème lien.");
        await page.waitForFunction(() => document.querySelectorAll('a').length > 4, { timeout: 15000 });
        const allLinks = await page.$$('a');
        await allLinks[4].click();
        console.log("LOG RETOUR: 6. Clic sur le 5ème lien effectué.");

        // --- ÉTAPE 7: Saisie du Code ---
        console.log(`LOG ACTION: 7. Saisie du code '${codeSaisi}'.`);
        const codeInputSelector = 'input[type="text"]:not([disabled])';
        await page.waitForSelector(codeInputSelector, { visible: true, timeout: 15000 });
        await page.type(codeInputSelector, codeSaisi);
        console.log("LOG RETOUR: 7. Saisie du code effectuée.");

        // --- ÉTAPE 8: Clic sur 'Confirmer' ---
        console.log("LOG ACTION: 8. Recherche et clic sur 'Confirmer'.");
        const confirmButtonSelector = 'button ::-p-text(Confirmer)';
        await page.waitForSelector(confirmButtonSelector, { visible: true });
        await page.click(confirmButtonSelector);
        console.log("LOG RETOUR: 8. Clic sur 'Confirmer' effectué.");
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        console.log("LOG RETOUR: 8. Navigation après confirmation terminée.");

        // --- ÉTAPE 9: Déconnexion ---
        console.log("LOG ACTION: 9. Recherche et clic sur 'Déconnexion'.");
        const logoutSelector = '[role="menuitem"] ::-p-text(Déconnexion)';
        await page.waitForSelector(logoutSelector, { visible: true });
        await page.click(logoutSelector);
        console.log("LOG RETOUR: 9. Clic sur 'Déconnexion' effectué.");
        await page.waitForSelector('#username', { visible: true, timeout: 15000 });
        console.log("LOG RETOUR: 9. Déconnexion confirmée.");

        return { success: true, message: `Séquence complète pour l'ID ${idSaisi} réussie.` };

    } catch (error) {
        if (page) {
            console.error(`ERREUR à l'URL: ${page.url()}`);
        }
        console.error(error.message);
        throw new Error(error.message);
    } finally {
        if (browser) {
            console.log("LOG FINAL: Fermeture du navigateur.");
            await browser.close();
        }
    }
}

module.exports = runTreatment;
