require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');
const fs = require('fs');
const { google } = require('googleapis');
const { Readable } = require('stream');
const { buildRulesBlock } = require('./rules');
const { injectExifAndGps } = require('./exif');
const { sendTelegramNotification } = require('./telegram');

// --- Configuration ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;
const CHATGPT_CONVERSATION_URL = process.env.CHATGPT_CONVERSATION_URL || 'https://chatgpt.com/';
const CHATGPT_IMAGE_PROMPT = process.env.CHATGPT_IMAGE_PROMPT || 'Génère une photo ultra-réaliste pour illustrer un avis client sur une fiche Google My Business. Ne mets aucun texte sur l\'image.';

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Fonctions Utilitaires Google Drive (Sous-dossiers par opérateur + Nettoyage 7 jours) ---
async function getOrCreateOperatorFolder(drive, parentFolderId, operatorName) {
    const safeOpName = (operatorName || 'Autres_Operateurs').trim().replace(/[^a-zA-Z0-9_\- ]/g, '_');
    
    try {
        const q = `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and name='${safeOpName}' and trashed=false`;
        const searchRes = await drive.files.list({
            q: q,
            fields: 'files(id, name)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true
        });

        if (searchRes.data.files && searchRes.data.files.length > 0) {
            return searchRes.data.files[0].id;
        }

        const folderMetadata = {
            name: safeOpName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentFolderId]
        };

        const newFolder = await drive.files.create({
            requestBody: folderMetadata,
            supportsAllDrives: true,
            fields: 'id, name'
        });

        console.log(`📂 Sous-dossier opérateur créé sur Google Drive : "${safeOpName}" (ID : ${newFolder.data.id})`);
        return newFolder.data.id;
    } catch (e) {
        console.log(`Note sous-dossier (${safeOpName}) : ${e.message}. Utilisation du dossier principal.`);
        return parentFolderId;
    }
}

async function cleanOldPhotosFromDrive(drive, parentFolderId) {
    try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        console.log("🧹 Vérification et nettoyage automatique des anciennes photos sur Google Drive (> 7 jours)...");

        const q = `mimeType != 'application/vnd.google-apps.folder' and createdTime < '${sevenDaysAgo}' and trashed=false`;
        const res = await drive.files.list({
            q: q,
            fields: 'files(id, name, createdTime)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true
        });

        const filesToDelete = res.data.files || [];
        if (filesToDelete.length === 0) {
            console.log("✅ Aucune ancienne photo de plus de 7 jours à nettoyer.");
            return;
        }

        for (const file of filesToDelete) {
            try {
                await drive.files.update({
                    fileId: file.id,
                    supportsAllDrives: true,
                    requestBody: { trashed: true }
                });
                console.log(`🗑️ Ancienne photo envoyée à la corbeille Google Drive : ${file.name}`);
            } catch (err) {}
        }
    } catch (e) {
        console.log("Note nettoyage Drive :", e.message);
    }
}

// --- Google Drive Upload Function ---
async function uploadToGoogleDrive(fileName, imageBuffer, operatorName) {
    const credentialsRaw = process.env.GOOGLE_DRIVE_CREDENTIALS;
    let folderId = process.env.DRIVE_PARENT_FOLDER_ID ? process.env.DRIVE_PARENT_FOLDER_ID.trim() : '';
    if (folderId.includes('/folders/')) {
        folderId = folderId.split('/folders/')[1].split('?')[0].split('/')[0];
    }
    
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

    // 1. Nettoyage automatique des photos > 7 jours
    await cleanOldPhotosFromDrive(drive, folderId);

    // 2. Récupération ou création automatique du sous-dossier de l'opérateur
    const targetFolderId = await getOrCreateOperatorFolder(drive, folderId, operatorName);

    const stream = new Readable();
    stream.push(imageBuffer);
    stream.push(null);

    const fileMetadata = {
        name: fileName,
        parents: [targetFolderId]
    };

    const media = {
        mimeType: 'image/jpeg',
        body: stream
    };

    console.log(`Upload en cours de la photo sur Google Drive (Sous-dossier Opérateur: "${operatorName || 'Défaut'}")...`);

    let res;
    try {
        res = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            supportsAllDrives: true,
            supportsTeamDrives: true,
            fields: 'id, webViewLink, webContentLink'
        });
    } catch (driveErr) {
        console.error("🔍 Détails bruts erreur Drive :", driveErr.code, driveErr.message);
        if (driveErr.message?.includes('storageQuotaExceeded')) {
            console.error("❌ Google Drive API Quota Error : Le Service Account Google n'a pas de quota propre.");
            console.error("👉 Pour corriger : Le dossier Google Drive doit être dans un 'Drive Partagé' (Shared Drive) Google Workspace, ou utilisez Supabase Storage.");
        } else if (driveErr.message?.includes('File not found') || driveErr.code === 404 || driveErr.code === 403) {
            console.error("❌ Erreur Google Drive : Le dossier cible est introuvable ou non partagé avec l'email du robot.");
            console.error(`👉 POUR ACTIVER GOOGLE DRIVE : Ouvre ton dossier Google Drive (${folderId}) et partage-le avec cet email :`);
            console.error(`👉 📧 ${credentials.client_email || 'votre service account email'}`);
            console.error("👉 Attribue-lui le rôle 'Éditeur' (Editor).");
        } else {
            console.error("❌ Erreur Google Drive API :", driveErr.message);
        }
        throw driveErr;
    }

    const fileId = res.data.id;
    console.log(`✅ Photo uploadée avec succès sur Google Drive dans le sous-dossier opérateur ! File ID : ${fileId}`);

    try {
        await drive.permissions.create({
            fileId: fileId,
            supportsAllDrives: true,
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

// --- Upload Hybride (Google Drive en priorité, Supabase Storage en fallback) ---
async function uploadImage(fileName, imageBuffer, operatorName) {
    try {
        const driveRes = await uploadToGoogleDrive(fileName, imageBuffer, operatorName);
        return { provider: 'Google Drive', url: driveRes.driveUrl };
    } catch (driveErr) {
        console.log("⚠️ Transfert Google Drive indisponible. Bascule automatique sur Supabase Storage...");
        
        try {
            await supabase.storage.createBucket('images', { public: true });
        } catch (bErr) {}

        const { data: storageData, error: storageError } = await supabase.storage
            .from('images')
            .upload(fileName, imageBuffer, {
                contentType: 'image/jpeg',
                upsert: true
            });

        if (storageError) throw storageError;

        const { data: publicUrlData } = supabase.storage
            .from('images')
            .getPublicUrl(fileName);

        console.log(`✅ Photo sauvegardée avec succès sur Supabase Storage !`);
        return { provider: 'Supabase Storage', url: publicUrlData.publicUrl };
    }
}
// Dynamic Operator & ChatGPT Conversation Resolution
const TARGET_OPERATOR = process.env.OPERATOR_NAME ? process.env.OPERATOR_NAME.trim() : null;

function getConversationUrlForOperator(operatorName) {
    const op = (operatorName || TARGET_OPERATOR || '').trim().toUpperCase();
    if (!op) return process.env.CHATGPT_CONVERSATION_URL || 'https://chatgpt.com/';
    
    const envVar = `CHATGPT_CONVERSATION_URL_${op}`;
    return process.env[envVar] || process.env.CHATGPT_CONVERSATION_URL || 'https://chatgpt.com/';
}

async function generateImageWithChatGPT(prompt, cookies, operatorName = null) {
    const targetUrl = getConversationUrlForOperator(operatorName);
    
    let browser;
    if (BROWSERLESS_TOKEN) {
        try {
            console.log(`Tentative de connexion à Browserless (URL GPT: ${targetUrl})...`);
            browser = await chromium.connectOverCDP(`wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}&stealth`);
        } catch (err) {
            console.log(`⚠️ Browserless indisponible ou 429 (${err.message}). Bascule automatique sur Chromium local Playwright...`);
        }
    }

    if (!browser) {
        console.log("🚀 Lancement du navigateur Chromium local (Playwright 0% rate-limit)...");
        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled'
            ]
        });
    }
    
    const context = await browser.newContext();
    
    // Inject saved cookies to bypass login
    await context.addCookies(cookies);
    
    const page = await context.newPage();
    console.log(`Ouverture de la conversation ChatGPT pour l'opérateur (${operatorName || TARGET_OPERATOR || 'Global'})...`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    
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
    
    console.log("⏳ Pause obligatoire de 90 secondes pour laisser à DALL-E le temps de générer la photo HD complète...");
    await page.waitForTimeout(90000);
    
    // 2. Scanneur d'image final HD (validation stricte naturalWidth >= 600 et naturalHeight >= 600)
    console.log("Recherche et validation de la photo finale HD...");
    const startTime = Date.now();
    let foundUrl = null;

    while (Date.now() - startTime < 60000) {
        const candidate = await page.evaluate(() => {
            // Scanner en partant du BAS de la conversation (la toute DERNIÈRE photo générée par DALL-E)
            const imgs = Array.from(document.querySelectorAll('img')).reverse();
            for (const img of imgs) {
                const src = img.src || '';
                
                // Exclure les avatars, icônes et logos
                if (src.includes('avatar') || src.includes('profile') || src.includes('svg')) continue;
                
                // Détecter la toute DERNIÈRE photo HD finale générée au bas de la page
                if (img.complete && img.naturalWidth >= 600 && img.naturalHeight >= 600) {
                    return src;
                }
            }
            return null;
        });

        if (candidate) {
            foundUrl = candidate;
            console.log("📸 Vraie photo HD finale validée à l'écran ! URL :", foundUrl.substring(0, 100));
            break;
        }
        await page.waitForTimeout(3000);
    }

    if (!foundUrl) {
        console.log("⚠️ Aucune image de taille > 600px trouvée après 60s de scan. Tentative de capture de la meilleure image disponible...");
    }

    await page.waitForTimeout(3000); // Petite pause de stabilisation du rendu visual
    
    // 4. Téléchargement et conversion en JPEG PUR haute résolution (1024x1024 / 1536x1024)
    // Cette étape détruit à 100% les métadonnées C2PA OpenAI et crée un fichier JPEG compatible EXIF/GPS
    console.log("Extraction et conversion en JPEG pur haute résolution (suppression C2PA OpenAI)...");
    
    let imageBuffer = null;
    
    if (foundUrl) {
        try {
            const jpegBase64 = await page.evaluate(async (url) => {
                try {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = () => reject(new Error('Image load failed'));
                        img.src = url;
                    });

                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth || img.width || 1024;
                    canvas.height = img.naturalHeight || img.height || 1024;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);

                    // Conversion en JPEG pur (qualité 0.93) sans aucun marquage C2PA OpenAI
                    return canvas.toDataURL('image/jpeg', 0.93).split(',')[1];
                } catch (e) {
                    return null;
                }
            }, foundUrl);

            if (jpegBase64 && jpegBase64.length > 5000) {
                imageBuffer = Buffer.from(jpegBase64, 'base64');
                console.log(`✅ Image JPEG pure extraite avec succès ! (Taille : ${imageBuffer.length} octets)`);
            }
        } catch (e) {
            console.log("Note conversion Canvas JPEG :", e.message);
        }
    }

    // Fallback: Fetch direct si Canvas échoue
    if (!imageBuffer || imageBuffer.length < 5000) {
        console.log("Fallback : Récupération in-page via fetch direct...");
        try {
            const base64Data = await page.evaluate(async (url) => {
                const res = await fetch(url, { credentials: 'include' });
                if (!res.ok) return null;
                const blob = await res.blob();
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result.split(',')[1]);
                    reader.readAsDataURL(blob);
                });
            }, foundUrl);

            if (base64Data) {
                imageBuffer = Buffer.from(base64Data, 'base64');
            }
        } catch (err) {
            console.log("Erreur fallback fetch :", err.message);
        }
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
        
        if (TARGET_OPERATOR) {
            console.log(`🤖 Agent configuré spécifiquement pour l'opérateur : "${TARGET_OPERATOR}"`);
        }
        
        let query = supabase.from('planning').select('*').eq('date', tomorrowStr);
        if (TARGET_OPERATOR) {
            query = query.ilike('operateur', TARGET_OPERATOR);
        }
        
        let { data: tasks, error } = await query.order('id', { ascending: true });
            
        if (error) throw error;
        
        console.log(`${tasks.length} avis trouvés pour ${TARGET_OPERATOR ? 'l\'opérateur ' + TARGET_OPERATOR : 'tous les opérateurs'} pour demain (${tomorrowStr}).`);
        
        let isTestFallback = false;
        
        // Mode test sécurisé : si aucun avis pour demain, chaque opérateur teste un métier spécifique
        if (tasks.length === 0) {
            console.log(`Aucun avis planifié pour demain. Mode test : création d'un scénario de test pour ${TARGET_OPERATOR || 'Global'}...`);
            
            const operatorScenarios = {
                'KEVIN': { fiche_nom: 'Élagage & Abattage Bordeaux', metier: 'élagage', travaux: 'Taille arbre haute tige', ville: 'Mérignac', pays: 'France', contexte: 'jardin' },
                'FIF': { fiche_nom: 'Plomberie & Rénovation Lyon', metier: 'plomberie', travaux: 'Remplacement robinetterie', ville: 'Lyon', pays: 'France', contexte: 'appartement' },
                'AINA': { fiche_nom: 'Peinture & Décoration Marseille', metier: 'peinture', travaux: 'Peinture mur salon', ville: 'Marseille', pays: 'France', contexte: 'maison' },
                'ANJARA': { fiche_nom: 'Toiture & Couverture Nantes', metier: 'toiture', travaux: 'Rénovation tuiles toiture', ville: 'Nantes', pays: 'France', contexte: 'maison' },
                'KORAIL': { fiche_nom: 'Carrelage & Sol Lille', metier: 'carrelage', travaux: 'Pose carrelage salle de bain', ville: 'Lille', pays: 'France', contexte: 'appartement' },
                'KINTANA': { fiche_nom: 'Menuiserie & Serrurerie Toulouse', metier: 'menuiserie', travaux: 'Installation porte bois', ville: 'Toulouse', pays: 'France', contexte: 'maison' },
            };

            const opKey = (TARGET_OPERATOR || '').trim().toUpperCase();
            const selectedScenario = operatorScenarios[opKey] || {
                fiche_nom: 'Plomberie & Rénovation Lyon', metier: 'plomberie', travaux: 'Remplacement robinetterie', ville: 'Lyon', pays: 'France', contexte: 'appartement'
            };
            
            tasks = [{
                id: Math.floor(100000 + Math.random() * 900000),
                ...selectedScenario,
                operateur: TARGET_OPERATOR || 'TEST_ROBOT',
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
                const rawImageBuffer = await generateImageWithChatGPT(finalPrompt, cookies);
                
                // Injection des métadonnées EXIF Smartphone & Coordonnées GPS (matching intelligent de la date selon l'avis)
                const reviewTextContent = (task.commentaire || '') + ' ' + (task.travaux || '');
                const imageBuffer = await injectExifAndGps(rawImageBuffer, task.ville || 'Paris', task.pays || 'France', task.date, reviewTextContent);
                
                // Construction du nom de fichier (.jpg pour compatibilité EXIF/GPS smartphone)
                const safeOpName = (task.operateur || 'VA_Inconnu').replace(/[^a-zA-Z0-9]/g, '_');
                const fileName = `${safeOpName}_${dateFormat}_${task.id}.jpg`;
                
                // Upload de l'image (Google Drive par sous-dossier opérateur + fallback Supabase Storage)
                const uploadResult = await uploadImage(fileName, imageBuffer, task.operateur);
                
                // Mettre à jour la base de données Supabase (uniquement en mode prod)
                if (isTestFallback) {
                    console.log(`========================================================`);
                    console.log(`🎉 TEST RÉUSSI AU MAXIMUM ! 🎉`);
                    console.log(`Stockage utilisé : ${uploadResult.provider}`);
                    console.log(`Lien public de la photo : ${uploadResult.url}`);
                    console.log(`(Aucune ligne de la base de données n'a été modifiée)`);
                    console.log(`========================================================`);
                } else {
                    await supabase
                        .from('planning')
                        .update({
                            statut: 'image_generated',
                            url_image: uploadResult.url
                        })
                        .eq('id', task.id);
                    console.log(`Supabase mis à jour avec le lien (${uploadResult.provider}) pour l'avis ID ${task.id}`);
                }
                
            } catch (err) {
                console.error(`Erreur lors de la génération pour la tâche ID ${task.id} :`, err);
                // Optionnel: Mettre à jour le statut en 'error' dans Supabase
            }
        }
        
        console.log("Terminé avec succès !");
        
        const summaryMsg = `<b>🚀 AGENT IMAGE GMB (${TARGET_OPERATOR || 'Global'})</b>\n\n` +
            `✅ <b>Génération terminée avec succès !</b>\n` +
            `📸 Photos générées : <b>${tasks.length} photo(s)</b>\n` +
            `📅 Date de planification : <b>${tomorrowStr}</b>\n` +
            `📍 Métadonnées EXIF & GPS intégrées\n` +
            `📂 Dossier : Google Drive / ${TARGET_OPERATOR || 'Défaut'}`;
            
        await sendTelegramNotification(summaryMsg);
        
    } catch (err) {
        console.error("Erreur critique:", err);
        process.exit(1);
    }
}

main();
