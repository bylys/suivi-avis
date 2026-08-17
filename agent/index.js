require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');
const { google } = require('googleapis');
const fs = require('fs');
const { Readable } = require('stream');

// --- Configuration ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;
const GOOGLE_DRIVE_CREDENTIALS = process.env.GOOGLE_DRIVE_CREDENTIALS; // Service account JSON string
const DRIVE_PARENT_FOLDER_ID = process.env.DRIVE_PARENT_FOLDER_ID; // The root folder for VAs

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getDriveAuth() {
    const credentials = JSON.parse(GOOGLE_DRIVE_CREDENTIALS);
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.file']
    });
    return google.drive({ version: 'v3', auth });
}

async function uploadToDrive(drive, fileName, folderId, buffer) {
    const fileMetadata = {
        name: fileName,
        parents: [folderId]
    };
    const media = {
        mimeType: 'image/png',
        body: Readable.from(buffer)
    };
    const res = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, webViewLink'
    });
    return res.data;
}

async function getOrCreateFolder(drive, parentId, folderName) {
    const res = await drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentId}' in parents and trashed=false`,
        fields: 'files(id, name)',
    });
    if (res.data.files.length > 0) {
        return res.data.files[0].id;
    } else {
        const fileMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId]
        };
        const folder = await drive.files.create({
            resource: fileMetadata,
            fields: 'id'
        });
        return folder.data.id;
    }
}

async function generateImageWithChatGPT(prompt, cookies) {
    console.log("Connexion à Browserless avec le mode Stealth activé...");
    // Le forfait gratuit limite à 60 secondes max.
    const browser = await chromium.connectOverCDP(`wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}&stealth`);
    const context = await browser.newContext();
    
    // Inject saved cookies to bypass login
    await context.addCookies(cookies);
    
    const page = await context.newPage();
    console.log("Ouverture de ChatGPT...");
    await page.goto('https://chatgpt.com', { waitUntil: 'domcontentloaded' });
    console.log("URL de la page :", page.url());
    console.log("Titre de la page :", await page.title());
    
    // Wait for the chat input box
    console.log("Recherche du champ de texte...");
    try {
        await page.waitForSelector('#prompt-textarea', { timeout: 15000 });
    } catch (e) {
        console.log("Le champ de texte (#prompt-textarea) n'a pas été trouvé.");
        console.log("Aperçu de ce que le robot voit (code HTML de la page) :");
        const html = await page.content();
        console.log(html.substring(0, 1500)); // Afficher les premiers caractères pour comprendre où il est bloqué
        throw e;
    }
    await page.fill('#prompt-textarea', prompt);
    // Le simple bouton "Entrée" ne suffit parfois plus sur ChatGPT. On clique sur le vrai bouton.
    await page.waitForTimeout(1000); 
    try {
        await page.click('button[data-testid="send-button"]', { timeout: 5000 });
    } catch(e) {
        console.log("Bouton d'envoi non trouvé, tentative avec la touche Entrée...");
        await page.press('#prompt-textarea', 'Enter');
    }
    
    console.log("Attente de la génération de l'image (peut prendre ~1 min)...");
    
    // Selecteur élargi pour intercepter l'image même si elle a changé de nom
    const imageSelector = 'img[alt*="DALL"], img[src*="files.oaiusercontent.com"]';
    
    try {
        // Timeout de 40 secondes pour être sûr d'attraper l'erreur avant que Browserless (60s) ne coupe le fil
        await page.waitForSelector(imageSelector, { timeout: 40000 });
    } catch (e) {
        console.log("Le sélecteur d'image n'a pas été trouvé après 40 secondes.");
        console.log("Voici le HTML du dernier message de ChatGPT pour qu'on puisse l'analyser :");
        // Récupérer le HTML de la zone de chat
        const chatHtml = await page.evaluate(() => {
            const elements = document.querySelectorAll('div[data-message-author-role="assistant"]');
            if (elements.length > 0) {
                return elements[elements.length - 1].innerHTML;
            }
            return document.body.innerHTML.substring(0, 2000);
        });
        console.log(chatHtml);
        throw e;
    }
    
    const imageUrl = await page.getAttribute(imageSelector, 'src');
    console.log("Image générée :", imageUrl);
    
    // Download the image buffer
    const response = await page.goto(imageUrl);
    const imageBuffer = await response.body();
    
    await browser.close();
    return imageBuffer;
}

async function main() {
    try {
        console.log("Démarrage du job de génération d'images GMB...");
        
        // 1. Récupération des tâches depuis Supabase (Planning J+1)
        // Adjust the date logic based on your Supabase timezone
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
        console.log(`Recherche des avis planifiés pour le : ${tomorrowStr}`);
        
        // IMPORTANT: Adjust table name and columns based on your screenshot!
        const { data: tasks, error } = await supabase
            .from('planning')
            .select('*')
            .eq('date', tomorrowStr)
            .order('id', { ascending: true }); // Order to reliably pick 1 out of 2
            
        if (error) throw error;
        
        console.log(`${tasks.length} avis trouvés pour demain.`);
        
        // Filter: 1 out of 2 reviews gets an image
        const tasksToGenerate = tasks.filter((_, index) => index % 2 === 0);
        console.log(`${tasksToGenerate.length} avis sélectionnés pour la génération d'image.`);
        
        if (tasksToGenerate.length === 0) {
            console.log("Aucune image à générer aujourd'hui.");
            return;
        }

        // Setup Drive and ChatGPT
        const drive = await getDriveAuth();
        let cookies = JSON.parse(process.env.CHATGPT_COOKIES);
        
        // Normalisation du format sameSite pour Playwright
        cookies = cookies.map(c => {
            if (c.sameSite) {
                const s = c.sameSite.toLowerCase();
                if (s === 'strict') c.sameSite = 'Strict';
                else if (s === 'lax') c.sameSite = 'Lax';
                else if (s === 'none' || s === 'no_restriction' || s === 'unspecified') c.sameSite = 'None';
                else delete c.sameSite;
            }
            return c;
        });

        // Date calculations for Drive folders
        const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
        const currentMonth = monthNames[tomorrow.getMonth()];
        // Approximative week of month
        const weekOfMonth = Math.ceil(tomorrow.getDate() / 7);
        const weekName = `Semaine ${weekOfMonth}`;

        for (const task of tasksToGenerate) {
            console.log(`Traitement de l'avis ID ${task.id} pour le VA : ${task.operateur}`);
            
            // Generate prompt based on task data (Adapt to your needs)
            const prompt = `Génère une photo ultra-réaliste pour illustrer un avis client sur une fiche Google My Business. Le contexte est le suivant : ${task.fiche_nom}, type d'intervention : ${task.metier || 'général'}, ville : ${task.ville || 'non précisée'}. Ne mets aucun texte sur l'image.`;
            
            try {
                // Generate Image
                const imageBuffer = await generateImageWithChatGPT(prompt, cookies);
                
                // Drive Folders setup (Root -> VA -> Mois -> Semaine)
                const vaFolderId = await getOrCreateFolder(drive, DRIVE_PARENT_FOLDER_ID, task.operateur || 'VA_Inconnu');
                const monthFolderId = await getOrCreateFolder(drive, vaFolderId, currentMonth);
                const weekFolderId = await getOrCreateFolder(drive, monthFolderId, weekName);
                
                // Upload to Drive
                const fileName = `GMB_${task.id}_${Date.now()}.png`;
                const uploadedFile = await uploadToDrive(drive, fileName, weekFolderId, imageBuffer);
                console.log(`Image uploadée avec succès sur Drive: ${uploadedFile.webViewLink}`);
                
                // Mettre à jour Supabase
                await supabase
                    .from('planning')
                    .update({ 
                        statut: 'image_generated', // Optionnel : à adapter selon tes statuts réels
                        // drive_link: uploadedFile.webViewLink // Ajoute la colonne drive_link si tu veux sauvegarder le lien
                    })
                    .eq('id', task.id);
                    
                console.log(`Supabase mis à jour pour l'avis ID ${task.id}`);
                
            } catch (err) {
                console.error(`Erreur lors de la génération pour la tâche ID ${task.id} :`, err);
                // Optionnel: Mettre à jour le statut en 'error' dans Supabase
            }
        }
        
        console.log("Terminé avec succès !");
        
    } catch (err) {
        console.error("Erreur critique:", err);
        process.exit(1);
    }
}

main();
