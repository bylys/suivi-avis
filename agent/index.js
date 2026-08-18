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
    
    let title = await page.title();
    console.log("URL de la page :", page.url());
    console.log("Titre de la page :", title);
    
    // Gestion du challenge Cloudflare Turnstile ("Just a moment...")
    if (title.includes('Just a moment')) {
        console.log("⚠️ Challenge Cloudflare Turnstile détecté ! Tentative de contournement automatique...");
        await page.waitForTimeout(5000);
        
        try {
            // Tenter de cliquer sur la case Turnstile si elle est dans un iframe
            const turnstileFrame = page.frames().find(f => f.url().includes('challenges.cloudflare.com'));
            if (turnstileFrame) {
                console.log("Iframe Turnstile trouvé. Tentative de clic sur la vérification...");
                const checkbox = await turnstileFrame.waitForSelector('input[type="checkbox"], .mark', { timeout: 5000 });
                if (checkbox) await checkbox.click();
            }
        } catch (cfErr) {
            console.log("Attente de la résolution automatique par le mode Stealth Browserless...");
        }
        
        // Attente jusqu'à 15 secondes que Cloudflare laisse passer
        try {
            await page.waitForFunction(() => !document.title.includes('Just a moment'), { timeout: 15000 });
            console.log("✅ Cloudflare dépassé ! Titre actuel :", await page.title());
        } catch (e) {
            console.log("❌ Bloqué par le challenge Cloudflare Turnstile.");
            console.log("💡 CONSEIL : Tes cookies ChatGPT (notamment cf_clearance) ont probablement expiré. Re-exporte tes cookies depuis ton navigateur et mets à jour le secret CHATGPT_COOKIES dans GitHub.");
        }
    }
    
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
    
    console.log("Attente de la génération de l'image DALL-E (délai étendu à 5 minutes)...");
    
    // Selecteur élargi pour intercepter l'image même si elle a changé de nom
    const imageSelector = 'img[alt*="DALL"], img[src*="files.oaiusercontent.com"]';
    
    try {
        // Timeout de 5 minutes (300 000 ms) grâce au plan Browserless 15 minutes
        await page.waitForSelector(imageSelector, { timeout: 300000 });
    } catch (e) {
        console.log("Le sélecteur d'image n'a pas été trouvé après 5 minutes (300 secondes).");
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
        let { data: tasks, error } = await supabase
            .from('planning')
            .select('*')
            .eq('date', tomorrowStr)
            .order('id', { ascending: true });
            
        if (error) throw error;
        
        console.log(`${tasks.length} avis trouvés pour demain (${tomorrowStr}).`);
        
        let isTestFallback = false;
        
        // Mode test sécurisé : si aucun avis pour demain, on tire au sort un scénario de test réaliste
        if (tasks.length === 0) {
            console.log("Aucun avis planifié pour demain. Mode test : création d'un FAUX avis de démonstration...");
            
            const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
            const testScenarios = [
                { fiche_nom: 'Élagage & Abattage Quimper', metier: 'élagage', travaux: 'Taille arbre haute tige', ville: 'Quimper', pays: 'France', contexte: 'maison' },
                { fiche_nom: 'Nettoyage & Démoussage Toiture Valence', metier: 'nettoyage_toiture', travaux: 'Démoussage toiture', ville: 'Valence', pays: 'France', contexte: 'maison' },
                { fiche_nom: 'Ravalement & Nettoyage Façade Nantes', metier: 'ravalement', travaux: 'Ravalement façade', ville: 'Nantes', pays: 'France', contexte: 'maison' },
                { fiche_nom: 'Augusta Tree Service - Tree Removal', metier: 'abattage', travaux: 'Abattage arbre', ville: 'Augusta', pays: 'USA', contexte: 'maison' },
                { fiche_nom: 'Sandy Springs Concrete Atlanta', metier: 'maçonnerie', travaux: 'Coulage dalle', ville: 'Atlanta', pays: 'USA', contexte: 'maison' },
                { fiche_nom: 'Miami Roof Cleaning & Pressure Wash', metier: 'nettoyage_toiture', travaux: 'Nettoyage toiture', ville: 'Miami', pays: 'USA', contexte: 'maison' },
                { fiche_nom: 'Dallas Facade & Wall Masonry', metier: 'maçonnerie', travaux: 'Mur parpaing', ville: 'Dallas', pays: 'USA', contexte: 'commerce' },
            ];
            
            const selectedScenario = pick(testScenarios);
            tasks = [{
                id: 999999,
                ...selectedScenario,
                operateur: 'TEST_ROBOT',
                date: tomorrowStr,
                statut: 'pending_test'
            }];
            isTestFallback = true;
            console.log(`🎯 Faux avis de test (${selectedScenario.fiche_nom} - ${selectedScenario.ville}, ${selectedScenario.pays}) créé EN MÉMOIRE !`);
        }
        
        // Filter: 1 out of 2 reviews gets an image (en mode test ou prod)
        const tasksToGenerate = tasks.filter((_, index) => index % 2 === 0);
        console.log(`${tasksToGenerate.length} avis sélectionné(s) pour la génération d'image.`);
        
        if (tasksToGenerate.length === 0) {
            console.log("Aucune tâche trouvée dans la base de données.");
            return;
        }

        // Configuration des cookies

        let cookies = JSON.parse(process.env.CHATGPT_COOKIES);
        
        // Sanitisation stricte des cookies pour Playwright (retrait de partitionKey, storeId, hostOnly, etc.)
        cookies = cookies.map(c => {
            const clean = {
                name: c.name,
                value: c.value,
                domain: c.domain,
                path: c.path || '/',
                secure: Boolean(c.secure),
                httpOnly: Boolean(c.httpOnly),
            };
            if (typeof c.expires === 'number') {
                clean.expires = c.expires;
            }
            if (c.sameSite && typeof c.sameSite === 'string') {
                const s = c.sameSite.toLowerCase();
                if (s === 'strict') clean.sameSite = 'Strict';
                else if (s === 'lax') clean.sameSite = 'Lax';
                else if (s === 'none' || s === 'no_restriction') clean.sameSite = 'None';
            }
            return clean;
        });

        // Formatage de la date pour le nom du fichier Supabase
        const dateFormat = `${tomorrow.getDate().toString().padStart(2, '0')}-${(tomorrow.getMonth()+1).toString().padStart(2, '0')}-${tomorrow.getFullYear()}`;

        for (const task of tasksToGenerate) {
            console.log(`Traitement de l'avis ID ${task.id} pour le VA : ${task.operateur}`);
            
            // Valeurs aléatoires pour varier les photos
            const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
            
            const etatChantier   = pick(['début de chantier', 'travaux en cours', 'travaux quasi-terminés']);
            
            // Règle du nombre d'ouvriers : Métiers dangereux (élagage, toiture, ravalement, terrassement, maçonnerie, vitrier, débarras, travaux extérieurs) = 2 ouvriers minimum.
            const metierText = ((task.metier || '') + ' ' + (task.travaux || '')).toLowerCase();
            const isDangerousTrade = ['elagage', 'élagage', 'abattage', 'toiture', 'ravalement', 'terrassement', 'maçonnerie', 'maconnerie', 'vitrier', 'débarras', 'debarras', 'extérieu', 'exterieu', 'façade', 'facade']
                .some(k => metierText.includes(k));
                
            const nbOuvriers = isDangerousTrade ? pick(['2 ouvriers', '2 ouvriers', '3 ouvriers']) : pick(['1 ouvrier', '1 ouvrier', '2 ouvriers']);
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
            
            // Format / Orientation (tirage aléatoire : 60% paysage, 40% portrait)
            const orientation    = pick(['3:2 paysage', '4:3 paysage', '3:4 portrait', '9:16 portrait']);

            // Travaux = sous-métier (task.travaux) ou métier principal
            const travauxLabel = task.travaux || task.metier || 'travaux de rénovation';
            
            // Construction du prompt final
            const paysLabel = task.pays || 'France';
            const villeLabel = task.ville || '';
            const locationStr = task.ville ? `${task.ville} (${paysLabel})` : paysLabel;

            let prompt = CHATGPT_IMAGE_PROMPT
                // Placeholders de localisation — format [placeholder] ou "placeholder"
                .replace(/\[ville\]/gi,                               villeLabel)
                .replace(/\[pays\]/gi,                                paysLabel)
                .replace(/\[?[""]?department[""]?\]?/gi,              task.departement || villeLabel || 'France')
                .replace(/\[?[""]?region[""]?\]?/gi,                  task.region || villeLabel || 'France')
                .replace(/\[?[""]?country[""]?\]?/gi,                 paysLabel)
                .replace(/\[?[""]?Fiche GMB[""]?\]?/gi,               task.fiche_nom || '')
                .replace(/\[?[""]?regional[""]?\]?/gi,                task.region || 'local')
                // Remplacement du "en France" hardcodé dans le template de base par la localisation précise
                .replace(/\ben France\b/gi, task.ville ? `à ${task.ville} (${paysLabel})` : `en ${paysLabel}`)
                // Placeholders du nouveau template
                .replace(/\[type de travaux\]/gi,         travauxLabel)
                .replace(/\[maison individuelle \/ immeuble \/ commerce\]/gi, contexteLabel)
                .replace(/\[début \/ en cours \/ quasi-fini\]/gi,             etatChantier)
                .replace(/\[1 ou 2 ouvriers?\]/gi,        nbOuvriers)
                .replace(/\[depuis le jardin \/ depuis la rue \/ légèrement en hauteur\]/gi, pointDeVue)
                .replace(/\[ciel couvert \/ soleil de milieu de journée \/ lumière rasante d'après-midi\]/gi, lumiere)
                .replace(/\[paysage \/ portrait\]/gi,     orientation)
                .replace(/3:2 paysage/gi,                orientation);

            // Si la ville n'était pas dans le template via [ville], on s'assure qu'elle est bien spécifiée dans le contexte
            if (task.ville && !CHATGPT_IMAGE_PROMPT.includes('[ville]')) {
                prompt += ` Localisation du chantier : ${locationStr}.`;
            }
            
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
                
                // Mettre à jour la base de données Supabase (uniquement en mode prod)
                if (isTestFallback) {
                    console.log(`========================================================`);
                    console.log(`🎉 TEST RÉUSSI AU MAXIMUM ! 🎉`);
                    console.log(`Lien de l'image de test sur Supabase Storage : ${publicUrl}`);
                    console.log(`(Aucune ligne de la base de données n'a été modifiée)`);
                    console.log(`========================================================`);
                } else {
                    await supabase
                        .from('planning')
                        .update({
                            statut: 'image_generated',
                            url_image: publicUrl
                        })
                        .eq('id', task.id);
                    console.log(`Supabase mis à jour pour l'avis ID ${task.id}`);
                }
                    
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
