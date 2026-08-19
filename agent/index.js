require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');
const fs = require('fs');
const { google } = require('googleapis');
const { Readable } = require('stream');
const { buildRulesBlock } = require('./rules');

// --- Configuration ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;
const CHATGPT_CONVERSATION_URL = process.env.CHATGPT_CONVERSATION_URL || 'https://chatgpt.com/';
const CHATGPT_IMAGE_PROMPT = process.env.CHATGPT_IMAGE_PROMPT || 'Génère une photo ultra-réaliste pour illustrer un avis client sur une fiche Google My Business. Ne mets aucun texte sur l\'image.';

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Google Drive Upload Function ---
async function uploadToGoogleDrive(fileName, imageBuffer) {
    const credentialsRaw = process.env.GOOGLE_DRIVE_CREDENTIALS;
    const folderId = process.env.DRIVE_PARENT_FOLDER_ID;
    
    if (!credentialsRaw || !folderId) {
        throw new Error("❌ Secret GOOGLE_DRIVE_CREDENTIALS ou DRIVE_PARENT_FOLDER_ID manquant.");
    }
    
    let credentials;
    try {
        credentials = JSON.parse(credentialsRaw.trim().startsWith('{') 
            ? credentialsRaw 
            : Buffer.from(credentialsRaw, 'base64').toString('utf-8'));
    } catch (e) {
        throw new Error("❌ Impossible de décoder GOOGLE_DRIVE_CREDENTIALS : " + e.message);
    }
    
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive']
    });

    const drive = google.drive({ version: 'v3', auth });

    const stream = new Readable();
    stream.push(imageBuffer);
    stream.push(null);

    const fileMetadata = {
        name: fileName,
        parents: [folderId]
    };

    const media = {
        mimeType: 'image/png',
        body: stream
    };

    console.log(`Upload en cours de la photo sur Google Drive (Dossier ID : ${folderId})...`);

    const res = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink'
    });

    const fileId = res.data.id;
    console.log(`✅ Photo uploadée avec succès sur Google Drive ! File ID : ${fileId}`);

    // Donner accès en lecture publique au fichier pour qu'il soit ouvert en 1 clic
    try {
        await drive.permissions.create({
            fileId: fileId,
            requestBody: {
                role: 'reader',
                type: 'anyone'
            }
        });
    } catch (permErr) {
        console.log("Note permission Google Drive :", permErr.message);
    }

    const driveUrl = res.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
    return { fileId, driveUrl };
}
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
    // 1. Saisie robuste du texte (support contenteditable / Lexical & textarea)
    console.log("Saisie du prompt dans le champ de texte...");
    const promptInput = page.locator('#prompt-textarea');
    await promptInput.focus();

    await page.evaluate((text) => {
        const el = document.querySelector('#prompt-textarea');
        if (!el) return;
        el.focus();
        // ChatGPT utilise un div/p contenteditable
        if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') {
            document.execCommand('selectAll', false, null);
            document.execCommand('insertText', false, text);
            el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
        } else {
            el.value = text;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }, prompt);

    await page.waitForTimeout(500);
    // Simulation d'une touche pour forcer l'activation du bouton d'envoi React
    await promptInput.pressSequentially(' ');
    await page.waitForTimeout(1000);

    // 2. Clic sur le bouton d'envoi
    try {
        const sendBtn = await page.waitForSelector('button[data-testid="send-button"]:not([disabled])', { timeout: 5000 });
        await sendBtn.click();
        console.log("✅ Bouton d'envoi cliqué avec succès !");
    } catch(e) {
        console.log("Bouton d'envoi non actif, tentative avec la touche Entrée...");
        await page.keyboard.press('Enter');
    }
    
    console.log("Attente de la fin de la génération DALL-E sur ChatGPT...");

    // 1. Attendre que le bouton "Stop generating" disparaisse (signe que DALL-E a fini de travailler)
    try {
        await page.waitForSelector('button[aria-label*="Stop"], button[data-testid="stop-button"], .btn-neutral', { timeout: 10000 });
        console.log("Génération DALL-E en cours... attente du rendu final...");
        await page.waitForSelector('button[aria-label*="Stop"], button[data-testid="stop-button"], .btn-neutral', { state: 'detached', timeout: 120000 });
        console.log("✅ DALL-E a terminé la création de l'image !");
    } catch(e) {
        console.log("Bouton de chargement non détecté ou déjà terminé, vérification directe des images...");
    }

    await page.waitForTimeout(3000); // Pause pour le rendu HD final
    
    // 2. Scanneur d'image complet (validation strict: complete + naturalWidth > 300)
    const startTime = Date.now();
    let foundUrl = null;

    while (Date.now() - startTime < 60000) {
        const candidate = await page.evaluate(() => {
            const imgs = Array.from(document.querySelectorAll('img'));
            for (const img of imgs) {
                const src = img.src || '';
                const alt = img.alt || '';
                
                // Exclure les avatars et petites icônes
                if (src.includes('avatar') || src.includes('profile') || src.includes('svg')) continue;
                
                // Détecter uniquement l'image FINALE (chargée à 100% et de grande taille)
                if (img.complete && (img.naturalWidth >= 300 || img.width >= 300)) {
                    return src;
                }
            }
            return null;
        });

        if (candidate) {
            foundUrl = candidate;
            console.log("📸 Image finale HD validée à l'écran ! URL :", foundUrl.substring(0, 100));
            break;
        }
        await page.waitForTimeout(2000);
    }

    if (!foundUrl) {
        console.log("❌ Aucune image trouvée après 2 minutes de scan.");
        throw new Error("Timeout: Image not found after active scan");
    }

    await page.waitForTimeout(3000); // Petite pause pour s'assurer que les pixels HD sont chargés
    
    // 4. Extraction sécurisée du buffer de l'image (Canvas + Element Screenshot)
    console.log("Extraction des pixels de l'image (Canvas / Element Screenshot)...");
    
    let imageBuffer;
    
    // Rendu Canvas in-page (qualité originale sans passer par des requêtes HTTP backend)
    const canvasBase64 = await page.evaluate((url) => {
        const imgs = Array.from(document.querySelectorAll('img'));
        const img = imgs.find(i => i.src === url || i.src.includes('estuary') || i.src.includes('oaiusercontent')) || 
                    imgs.find(i => (i.naturalWidth > 150 || i.width > 150) && !i.src.includes('avatar'));
                    
        if (!img) return null;
        try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width || 1024;
            canvas.height = img.naturalHeight || img.height || 1024;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            return canvas.toDataURL('image/png').split(',')[1];
        } catch (e) {
            return null;
        }
    }, foundUrl);

    if (canvasBase64 && canvasBase64.length > 2000) {
        console.log("✅ Buffer PNG extrait avec succès via Canvas !");
        imageBuffer = Buffer.from(canvasBase64, 'base64');
    } else {
        console.log("📸 Fallback : Capture d'écran Playwright haute définition de l'élément image...");
        const imgLocator = page.locator('div[data-message-author-role="assistant"] img, img[src*="estuary"], img[src*="oaiusercontent"]').first();
        imageBuffer = await imgLocator.screenshot({ type: 'png' });
    }
    
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
                
                // Upload sur Google Drive
                const { fileId, driveUrl } = await uploadToGoogleDrive(fileName, imageBuffer);
                
                // Mettre à jour la base de données Supabase (uniquement en mode prod)
                if (isTestFallback) {
                    console.log(`========================================================`);
                    console.log(`🎉 TEST RÉUSSI AU MAXIMUM ! 🎉`);
                    console.log(`Lien de la photo générée sur Google Drive : ${driveUrl}`);
                    console.log(`ID du fichier Google Drive : ${fileId}`);
                    console.log(`(Aucune ligne de la base de données n'a été modifiée)`);
                    console.log(`========================================================`);
                } else {
                    await supabase
                        .from('planning')
                        .update({
                            statut: 'image_generated',
                            url_image: driveUrl
                        })
                        .eq('id', task.id);
                    console.log(`Supabase mis à jour avec le lien Google Drive pour l'avis ID ${task.id}`);
                }
                
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
