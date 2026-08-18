require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');
const fs = require('fs');
const { buildRulesBlock } = require('./rules');

// --- Configuration ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;
const CHATGPT_CONVERSATION_URL = process.env.CHATGPT_CONVERSATION_URL || 'https://chatgpt.com/';
const CHATGPT_IMAGE_PROMPT = process.env.CHATGPT_IMAGE_PROMPT || 'Génère une photo ultra-réaliste pour illustrer un avis client sur une fiche Google My Business. Ne mets aucun texte sur l\'image.';

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Fonctions utilitaires retirées (Google Drive n'est plus utilisé) ---
async function generateImageWithChatGPT(prompt, cookies) {
    console.log("Connexion à Browserless avec le mode Stealth activé...");
    // Le forfait gratuit limite à 60 secondes max.
    const browser = await chromium.connectOverCDP(`wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}&stealth`);
    const context = await browser.newContext();
    
    // Inject saved cookies to bypass login
    await context.addCookies(cookies);
    
    const page = await context.newPage();
    console.log("Ouverture de la conversation ChatGPT globale...");
    await page.goto(CHATGPT_CONVERSATION_URL, { waitUntil: 'domcontentloaded' });
    
    console.log("URL de la page :", page.url());
    console.log("Titre de la page :", await page.title());
    
    // Wait for the chat input box
    console.log("Recherche du champ de texte...");
    try {
        await page.waitForSelector('#prompt-textarea', { timeout: 30000 });
    } catch (e) {
        console.log("Le champ de texte (#prompt-textarea) n'a pas été trouvé.");
        console.log("Aperçu de ce que le robot voit (code HTML de la page) :");
        const html = await page.content();
        console.log(html.substring(0, 1500)); // Afficher les premiers caractères pour comprendre où il est bloqué
        throw e;
    }
    await page.fill('#prompt-textarea', prompt);
    await page.type('#prompt-textarea', ' '); // Simule une frappe clavier pour forcer React à détecter le texte
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
        console.log("Analyse de ce qui bloque...");
        try {
            const assistantMessages = await page.$$('div[data-message-author-role="assistant"]');
            if (assistantMessages.length > 0) {
                const lastMessage = assistantMessages[assistantMessages.length - 1];
                const text = await lastMessage.innerText();
                console.log("========================================================");
                console.log("RÉPONSE TEXTUELLE DE CHATGPT (au lieu d'une image) :");
                console.log(text);
                console.log("========================================================");
            } else {
                console.log("========================================================");
                console.log("Aucune réponse de ChatGPT trouvée.");
                console.log("Voici tout le texte visible sur la page (pour voir s'il y a un popup bloquant) :");
                const bodyText = await page.locator('body').innerText();
                console.log(bodyText.substring(0, 1500));
                console.log("========================================================");
            }
        } catch (textError) {
            console.log("Impossible de récupérer le texte :", textError);
        }
        
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

        // Configuration des cookies

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

        // Formatage de la date pour le nom du fichier Supabase
        const dateFormat = `${tomorrow.getDate().toString().padStart(2, '0')}-${(tomorrow.getMonth()+1).toString().padStart(2, '0')}-${tomorrow.getFullYear()}`;

        for (const task of tasksToGenerate) {
            console.log(`Traitement de l'avis ID ${task.id} pour le VA : ${task.operateur}`);
            
            // Valeurs aléatoires pour varier les photos
            const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
            
            const etatChantier   = pick(['début de chantier', 'travaux en cours', 'travaux quasi-terminés']);
            const nbOuvriers     = pick(['1 ouvrier', '2 ouvriers']);
            const lumiere        = pick([
                'ciel légèrement voilé, lumière diffuse de milieu de matinée',
                'ciel couvert, lumière douce et uniforme',
                'soleil de milieu de journée, légères ombres portées',
                'lumière rasante de fin d\'après-midi, teintes chaudes'
            ]);
            
            // Contexte de la fiche (maison, immeuble, commerce...)
            const contexteMap = {
                maison:         'maison individuelle',
                appartement:    'appartement',
                immeuble:       'immeuble résidentiel',
                commerce:       'local commercial',
                professionnel:  'local professionnel',
                entrepot:       'entrepôt',
                agricole:       'bâtiment agricole',
            };
            const contexteLabel = contexteMap[task.contexte] || 'maison individuelle';
            
            // Point de vue selon le contexte
            const pointDeVue = (task.contexte === 'commerce' || task.contexte === 'professionnel')
                ? pick(['depuis le trottoir', 'depuis la rue en angle oblique'])
                : pick(['depuis le jardin', 'depuis l\'allée du jardin', 'depuis la rue en face']);
            
            // Travaux = sous-métier (task.travaux) ou métier principal
            const travauxLabel = task.travaux || task.metier || 'travaux de rénovation';
            
            // Construction du prompt final
            const paysLabel = task.pays || 'France';
            const prompt = CHATGPT_IMAGE_PROMPT
                // Placeholders de localisation — format [placeholder] ou "placeholder"
                .replace(/\[pays\]/gi,                                task.pays || 'France')
                .replace(/\[ville\]/gi,                               task.ville || '')
                .replace(/\[?[""]?department[""]?\]?/gi,              task.departement || task.ville || 'France')
                .replace(/\[?[""]?region[""]?\]?/gi,                  task.region || task.ville || 'France')
                .replace(/\[?[""]?country[""]?\]?/gi,                 paysLabel)
                .replace(/\[?[""]?Fiche GMB[""]?\]?/gi,               task.fiche_nom || '')
                .replace(/\[?[""]?regional[""]?\]?/gi,                task.region || 'local')
                // Remplacement du "en France" hardcodé dans le template de base
                .replace(/\ben France\b/gi, `en ${paysLabel}`)
                // Placeholders du nouveau template
                .replace(/\[type de travaux\]/gi,         travauxLabel)
                .replace(/\[maison individuelle \/ immeuble \/ commerce\]/gi, contexteLabel)
                .replace(/\[début \/ en cours \/ quasi-fini\]/gi,             etatChantier)
                .replace(/\[1 ou 2 ouvriers?\]/gi,        nbOuvriers)
                .replace(/\[depuis le jardin \/ depuis la rue \/ légèrement en hauteur\]/gi, pointDeVue)
                .replace(/\[ciel couvert \/ soleil de milieu de journée \/ lumière rasante d'après-midi\]/gi, lumiere);
            
            // Injection des règles de sécurité et visuelles selon le métier et le service
            const rulesBlock = buildRulesBlock(task.metier, task.travaux, etatChantier);
            const finalPrompt = prompt + rulesBlock;
            
            console.log(`Prompt généré (${travauxLabel} / ${contexteLabel}) : ${finalPrompt.substring(0, 120)}...`);
            
            try {
                // Generate Image
                const imageBuffer = await generateImageWithChatGPT(finalPrompt, cookies);
                
                // Construction du nom de fichier
                const safeOpName = (task.operateur || 'VA_Inconnu').replace(/[^a-zA-Z0-9]/g, '_');
                const fileName = `${safeOpName}_${dateFormat}_${task.id}.png`;
                
                // Upload to Supabase Storage
                const { data: storageData, error: storageError } = await supabase.storage
                    .from('images')
                    .upload(fileName, imageBuffer, {
                        contentType: 'image/png',
                        upsert: true
                    });
                    
                if (storageError) {
                    console.error("Erreur lors de l'upload sur Supabase Storage :", storageError);
                    throw storageError;
                }
                
                // Récupération de l'URL publique
                const { data: publicUrlData } = supabase.storage
                    .from('images')
                    .getPublicUrl(fileName);
                    
                const publicUrl = publicUrlData.publicUrl;
                console.log(`Image uploadée avec succès sur Supabase : ${publicUrl}`);
                
                // Mettre à jour la base de données Supabase
                await supabase
                    .from('planning')
                    .update({ 
                        statut: 'image_generated',
                        url_image: publicUrl // Stockage du lien de l'image
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
