require('dotenv').config();
const { chromium } = require('playwright');
const fs = require('fs');

async function main() {
    console.log("Démarrage de l'extraction des cookies ChatGPT...");
    
    // Launch a local browser where you can log in
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('https://chatgpt.com');
    console.log("Veuillez vous connecter à votre compte ChatGPT dans la fenêtre qui vient de s'ouvrir.");
    console.log("Une fois connecté et sur la page principale de chat, appuyez sur ENTRÉE ici.");
    
    // Wait for user to log in and press Enter in the console
    process.stdin.once('data', async () => {
        const cookies = await context.cookies();
        fs.writeFileSync('chatgpt-cookies.json', JSON.stringify(cookies, null, 2));
        console.log("Cookies sauvegardés dans 'chatgpt-cookies.json'.");
        console.log("Vous devez définir le contenu de ce fichier dans vos GitHub Secrets sous le nom 'CHATGPT_COOKIES'.");
        await browser.close();
        process.exit(0);
    });
}

main();
