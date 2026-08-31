require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');
const fs = require('fs');
const crypto = require('crypto');
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

// --- Fonctions Utilitaires Google Drive (Dossiers Opérateur + Sous-dossiers par Date du jour + Nettoyage 7 jours) ---
async function getOrCreateDriveFolder(drive, parentFolderId, folderName) {
    const safeName = (folderName || 'Nouveau_Dossier').trim().replace(/[^a-zA-Z0-9_\- ]/g, '_');
    
    try {
        const q = `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and name='${safeName}' and trashed=false`;
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
            name: safeName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentFolderId]
        };

        const newFolder = await drive.files.create({
            requestBody: folderMetadata,
            supportsAllDrives: true,
            fields: 'id, name'
        });

        console.log(`📂 Dossier créé sur Google Drive : "${safeName}" (ID : ${newFolder.data.id})`);
        return newFolder.data.id;
    } catch (e) {
        console.log(`Note dossier (${safeName}) : ${e.message}. Utilisation du dossier parent.`);
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

    // 2. Dossier opérateur (ex: "Kevin")
    const opFolderId = await getOrCreateDriveFolder(drive, folderId, operatorName);

    // 3. Sous-dossier avec la date du jour (ex: "2026-08-25")
    const todayDate = new Date().toISOString().split('T')[0];
    const targetFolderId = await getOrCreateDriveFolder(drive, opFolderId, todayDate);

    // Anti-doublon Google Drive : vérifier si un fichier portant le même nom existe déjà dans le dossier opérateur
    const checkQuery = `'${targetFolderId}' in parents and name='${fileName}' and trashed=false`;
    let existingFiles = [];
    try {
        const checkRes = await drive.files.list({
            q: checkQuery,
            fields: 'files(id, webViewLink)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true
        });
        existingFiles = checkRes.data.files || [];
    } catch (cErr) {}

    const fileMetadata = {
        name: fileName,
        parents: [targetFolderId]
    };

    console.log(`Upload en cours de la photo sur Google Drive (Sous-dossier Opérateur: "${operatorName || 'Défaut'}")...`);

    let res;
    try {
        if (existingFiles.length > 0) {
            const existingId = existingFiles[0].id;
            console.log(`ℹ️ Photo existante détectée sur Google Drive (${fileName}). Remplacement sans doublon...`);
            res = await drive.files.update({
                fileId: existingId,
                media: { mimeType: 'image/jpeg', body: Readable.from(imageBuffer) },
                supportsAllDrives: true,
                fields: 'id, webViewLink, webContentLink'
            });
        } else {
            res = await drive.files.create({
                requestBody: fileMetadata,
                media: { mimeType: 'image/jpeg', body: Readable.from(imageBuffer) },
                supportsAllDrives: true,
                supportsTeamDrives: true,
                fields: 'id, webViewLink, webContentLink'
            });
        }
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
function getOperatorAliases(opName) {
    const raw = (opName || '').trim().toUpperCase();
    if (!raw) return [];
    const aliases = [raw];
    if (raw.includes('FIF')) {
        if (!aliases.includes('FIF')) aliases.push('FIF');
        if (!aliases.includes('FIFALIANA')) aliases.push('FIFALIANA');
        if (!aliases.includes('FIFIANA')) aliases.push('FIFIANA');
        if (!aliases.includes('FIFA')) aliases.push('FIFA');
    }
    if (raw.includes('KEV')) {
        if (!aliases.includes('KEVIN')) aliases.push('KEVIN');
        if (!aliases.includes('KEV')) aliases.push('KEV');
    }
    return aliases;
}

// Dynamic Operator & ChatGPT Conversation Resolution
const TARGET_OPERATOR = process.env.OPERATOR_NAME ? process.env.OPERATOR_NAME.trim() : null;

function getConversationUrlForOperator(operatorName) {
    const aliases = getOperatorAliases(operatorName || TARGET_OPERATOR);
    for (const alias of aliases) {
        const workVar = `CHATGPT_WORK_CONVERSATION_URL_${alias}`;
        const persoVar = `CHATGPT_PERSO_CONVERSATION_URL_${alias}`;
        const stdVar = `CHATGPT_CONVERSATION_URL_${alias}`;
        const match = process.env[workVar] || process.env[persoVar] || process.env[stdVar];
        if (match) return match;
    }
    return process.env.CHATGPT_WORK_CONVERSATION_URL || process.env.CHATGPT_PERSO_CONVERSATION_URL || process.env.CHATGPT_CONVERSATION_URL || 'https://chatgpt.com/';
}

async function generateImageWithChatGPT(prompt, cookies, operatorName = null, customUrl = null) {
    const targetUrl = customUrl || getConversationUrlForOperator(operatorName);
    
    let browser;
    if (BROWSERLESS_TOKEN) {
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                console.log(`Tentative de connexion à Browserless (${attempt}/3, URL GPT: ${targetUrl})...`);
                browser = await chromium.connectOverCDP(`wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}&stealth`);
                if (browser) break;
            } catch (err) {
                console.log(`Note connexion Browserless (tentative ${attempt}/3: ${err.message})...`);
                if (attempt < 3) await new Promise(r => setTimeout(r, 10000));
            }
        }
    }

    let isLocalBrowser = false;
    if (!browser) {
        console.log("🚀 Lancement du navigateur Chromium local (Stealth Playwright)...");
        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled'
            ]
        });
        isLocalBrowser = true;
    }
    
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 },
        locale: 'fr-FR',
        timezoneId: 'Europe/Paris'
    });

    try {
        if (isLocalBrowser) {
            await context.addInitScript(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            });
        }
        
        // Inject saved cookies to bypass login
        await context.addCookies(cookies);
        
        const page = await context.newPage();
        console.log(`Ouverture de la conversation ChatGPT pour l'opérateur (${operatorName || TARGET_OPERATOR || 'Global'})...`);
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
        
        let title = await page.title();
        console.log("URL de la page :", page.url());
        console.log("Titre de la page :", title);
        
        // Gestion du challenge Cloudflare Turnstile ("Just a moment..." / "Un instant...")
        if (!title || title.trim() === '' || title.includes('Just a moment') || title.includes('Un instant') || title.includes('Checking') || title.includes('Attention')) {
            console.log(`⚠️ Challenge Cloudflare Turnstile ("${title || 'Chargement...'}") détecté ! Tentative de contournement...`);
            await page.waitForTimeout(6000);
            title = await page.title();
            
            try {
                // Tenter de cliquer sur la case Turnstile si elle est dans un iframe
                const turnstileFrame = page.frames().find(f => f.url().includes('challenges.cloudflare.com') || f.url().includes('turnstile'));
                if (turnstileFrame) {
                    console.log("Iframe Turnstile trouvé. Clic sur la vérification Cloudflare...");
                    const checkbox = await turnstileFrame.waitForSelector('input[type="checkbox"], .mark, label, #challenge-stage', { timeout: 6000 });
                    if (checkbox) {
                        await checkbox.click({ force: true });
                        await page.waitForTimeout(5000);
                    }
                }
            } catch (cfErr) {
                console.log("Attente de la résolution Cloudflare...");
            }
            
            // Attente que Cloudflare laisse passer (titre passe à ChatGPT)
            try {
                await page.waitForFunction(() => !document.title.includes('Just a moment') && !document.title.includes('Un instant'), { timeout: 25000 });
                console.log("✅ Cloudflare dépassé ! Titre actuel :", await page.title());
            } catch (e) {
                console.log("❌ Bloqué par le challenge Cloudflare Turnstile.");
                console.log("💡 CONSEIL : Mettez à jour les cookies CHATGPT_COOKIES (cf_clearance) dans GitHub Secrets.");
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
            console.log(html.substring(0, 1500));
            
            // Envoi immédiat de l'alerte Telegram
            const alertMsg = `🚨 <b>ALERTE COOKIES CHATGPT EXPIRÉS</b> 🚨\n\nL'agent n'a pas pu accéder à ChatGPT pour l'opérateur <b>${operatorName || TARGET_OPERATOR || 'Global'}</b> (Redirection login ou sécurité Cloudflare).\n\n👉 <b>Action requise :</b> Re-connectez-vous à ChatGPT dans votre navigateur, ré-exportez vos cookies JSON et mettez à jour le secret <code>CHATGPT_COOKIES</code> sur GitHub Secrets !`;
            await sendTelegramNotification(alertMsg);

            // Enregistrement de l'alerte dans Supabase pour affichage sur l'outil web
            try {
                await supabase.from('alerts').insert([{
                    type: 'cookie_expired',
                    operator: operatorName || TARGET_OPERATOR || 'Global',
                    message: 'Cookies ChatGPT expirés - Mise à jour requise dans GitHub Secrets',
                    created_at: new Date().toISOString()
                }]);
            } catch (sErr) {}

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

        // Capture de TOUTES les URLs de photos déjà présentes avant d'envoyer le prompt (sans filtre de taille)
        // → Garantit à 100% qu'aucune image existante ne pourra être capturée par erreur
        const existingImageUrls = await page.evaluate(() => {
            const imgs = Array.from(document.querySelectorAll('img'));
            const urls = new Set();
            for (const img of imgs) {
                const src = img.src || '';
                if (src && !src.includes('avatar') && !src.includes('profile') && !src.includes('svg')) {
                    urls.add(src);
                }
            }
            return Array.from(urls);
        });
        console.log(`📋 ${existingImageUrls.length} image(s) déjà présente(s) sur la page avant l'envoi du prompt.`);

        // 2. Clic sur le bouton d'envoi
        try {
            const sendBtn = await page.waitForSelector('button[data-testid="send-button"]:not([disabled])', { timeout: 5000 });
            await sendBtn.click();
            console.log("✅ Bouton d'envoi cliqué avec succès !");
        } catch(e) {
            console.log("Bouton d'envoi non actif, tentative avec la touche Entrée...");
            await page.keyboard.press('Enter');
        }
        
        // Détection immédiate de message de limite/quota de génération d'images DALL-E 3 (ex: "You've hit the Business plan limit...")
        const limitDetected = await page.evaluate(() => {
            const bodyText = document.body.innerText || '';
            const lower = bodyText.toLowerCase();
            if (lower.includes("hit the") && lower.includes("limit")) return bodyText;
            if (lower.includes("reached your limit") || lower.includes("reached the limit")) return bodyText;
            if (lower.includes("limite de génération") || lower.includes("quota de génération") || lower.includes("business plan limit")) return bodyText;
            if (lower.includes("too many requests") || lower.includes("try again after") || lower.includes("resets in")) return bodyText;
            if (lower.includes("upgrade to plus") || lower.includes("free tier limit")) return bodyText;
            return null;
        });

        if (limitDetected) {
            console.error("❌ QUOTA CHATGPT ATTEINT SUR CE COMPTE :");
            throw new Error("LIMITE_QUOTA_ATTEINTE: La limite de génération d'images a été atteinte sur ce compte ChatGPT.");
        }

        console.log("⏳ Attente obligatoire de 90 secondes pour la création de la photo DALL-E 3...");
        await page.waitForTimeout(90000);
        
        // 3. Scanneur d'image dynamique : interdiction stricte de retourner une URL présente dans knownSet
        const checkNewImage = async () => {
            return await page.evaluate((knownUrls) => {
                const knownSet = new Set(knownUrls);
                const imgs = Array.from(document.querySelectorAll('img')).reverse();
                for (const img of imgs) {
                    const src = img.src || '';
                    if (!src || src.includes('avatar') || src.includes('profile') || src.includes('svg')) continue;
                    if (knownSet.has(src)) continue; // INTERDICTION STRICTE : ne jamais prendre une image déjà connue
                    if (img.complete && (img.naturalWidth >= 400 || img.width >= 400)) {
                        return src;
                    }
                }
                return null;
            }, existingImageUrls);
        };

        let foundUrl = null;
        const scanStart = Date.now();
        while (Date.now() - scanStart < 35000) {
            foundUrl = await checkNewImage();
            if (foundUrl) break;
            await page.waitForTimeout(3000);
        }

        if (foundUrl) {
            console.log("📸 NOUVELLE photo HD unique validée à l'écran ! URL :", foundUrl.substring(0, 100));
        } else {
            console.log("🔄 Aucune nouvelle photo aperçue au bout de 75s. Actualisation de la page ChatGPT (page.reload())...");
            try {
                await page.reload({ waitUntil: 'domcontentloaded' });
                const reloadWait = Math.floor(Math.random() * (20000 - 15000 + 1)) + 15000;
                console.log(`✅ Page ChatGPT actualisée ! Attente de ${Math.round(reloadWait/1000)}s (entre 15 et 20s) pour le chargement du fil...`);
                await page.waitForTimeout(reloadWait);
                
                const startTimeReload = Date.now();
                while (Date.now() - startTimeReload < 20000) {
                    foundUrl = await checkNewImage();
                    if (foundUrl) break;
                    await page.waitForTimeout(3000);
                }

                if (foundUrl) {
                    console.log("📸 Photo HD récupérée avec succès après actualisation de la page ! URL :", foundUrl.substring(0, 100));
                } else {
                    console.log("⚠️ Aucune nouvelle photo trouvée même après actualisation de la page.");
                }
            } catch (reloadErr) {
                console.log("Note lors de l'actualisation de la page :", reloadErr.message);
            }
        }

        if (!foundUrl) {
            console.log("⚠️ Aucune image de taille > 600px trouvée après 120s de scan.");
        }

        await page.waitForTimeout(2000); // Stabilisation du rendu visuel
        
        // 4. Téléchargement et conversion en JPEG PUR haute résolution (1024x1024 / 1536x1024)
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

        const finalUrl = page ? page.url() : null;
        return { imageBuffer, finalUrl };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

async function main() {
    try {
        console.log("Démarrage du job de génération d'images GMB...");
        
        // Recherche de la date (TARGET_DATE ou date du jour en heure locale Asia/Bangkok par défaut)
        const dateStr = process.env.TARGET_DATE || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        
        const rawOp = (TARGET_OPERATOR || '').trim();
        const opUpper = rawOp ? rawOp.toUpperCase() : '';
        let targetOp = rawOp;
        if (rawOp.toLowerCase() === 'fif' || rawOp.toLowerCase() === 'fifa') {
            targetOp = 'Fifaliana';
        }
        
        if (rawOp) {
            console.log(`🤖 Agent configuré spécifiquement pour l'opérateur : "${rawOp}" (Recherche DB: "${targetOp}")`);
        }
        
        let query = supabase.from('planning').select('*').eq('date', dateStr);
        if (rawOp) {
            query = query.or(`operateur.ilike.${targetOp},operateur.ilike.${rawOp},operateur.ilike.%${rawOp}%`);
        }
        
        let { data: tasks, error } = await query.order('id', { ascending: true });
            
        if (error) throw error;
        
        console.log(`${tasks.length} avis trouvés pour ${rawOp ? 'l\'opérateur ' + rawOp + ' (' + targetOp + ')' : 'tous les opérateurs'} pour le (${dateStr}).`);
        
        let isTestFallback = false;
        
        // Mode test sécurisé : si aucun avis pour la date, chaque opérateur teste un métier spécifique
        if (tasks.length === 0) {
            console.log(`Aucun avis planifié pour le ${dateStr}. Mode test : création d'un scénario de test pour ${rawOp || 'Global'}...`);
            
            const operatorScenarios = {
                'KEVIN': [
                    { fiche_nom: 'Élagage & Abattage Bordeaux', metier: 'élagage', travaux: 'Taille arbre haute tige', ville: 'Mérignac', pays: 'France', contexte: 'maison' },
                    { fiche_nom: 'Paysagiste & Espaces Verts Bordeaux', metier: 'paysagiste', travaux: 'Taille de haie', ville: 'Bordeaux', pays: 'France', contexte: 'maison' },
                    { fiche_nom: 'Bûcheronnage & Abattage Gironde', metier: 'abattage', travaux: 'Abattage arbre', ville: 'Pessac', pays: 'France', contexte: 'maison' },
                    { fiche_nom: 'Dessouchage & Terrassement Bordeaux', metier: 'dessouchage', travaux: 'Dessouchage', ville: 'Talence', pays: 'France', contexte: 'maison' },
                ],
                'FIF': [
                    { fiche_nom: 'Plomberie & Rénovation Lyon', metier: 'plomberie', travaux: 'Remplacement robinetterie', ville: 'Lyon', pays: 'France', contexte: 'appartement' },
                    { fiche_nom: 'Dépannage Auto & Remorquage Lyon', metier: 'dépannage auto', travaux: 'Depannage auto', ville: 'Villeurbanne', pays: 'France', contexte: 'route' },
                    { fiche_nom: 'Chauffage & Sanitaire Lyon', metier: 'plomberie', travaux: 'Changement chauffe-eau', ville: 'Lyon', pays: 'France', contexte: 'appartement' },
                ],
                'FIFALIANA': [
                    { fiche_nom: 'Plomberie & Rénovation Lyon', metier: 'plomberie', travaux: 'Remplacement robinetterie', ville: 'Lyon', pays: 'France', contexte: 'appartement' },
                    { fiche_nom: 'Dépannage Auto & Remorquage Lyon', metier: 'dépannage auto', travaux: 'Depannage auto', ville: 'Villeurbanne', pays: 'France', contexte: 'route' },
                    { fiche_nom: 'Chauffage & Sanitaire Lyon', metier: 'plomberie', travaux: 'Changement chauffe-eau', ville: 'Lyon', pays: 'France', contexte: 'appartement' },
                ],
                'AINA': [
                    { fiche_nom: 'Peinture & Décoration Marseille', metier: 'peinture', travaux: 'Peinture mur salon', ville: 'Marseille', pays: 'France', contexte: 'maison' },
                    { fiche_nom: 'Nettoyage Extérieur & Terrasse Marseille', metier: 'nettoyage', travaux: 'Nettoyage terrasse', ville: 'Aix-en-Provence', pays: 'France', contexte: 'maison' },
                    { fiche_nom: 'Ravalement & Nettoyage Façade Marseille', metier: 'ravalement', travaux: 'Nettoyage facade', ville: 'Marseille', pays: 'France', contexte: 'maison' },
                ],
                'ANJARA': [
                    { fiche_nom: 'Toiture & Couverture Nantes', metier: 'toiture', travaux: 'Rénovation tuiles toiture', ville: 'Nantes', pays: 'France', contexte: 'maison' },
                    { fiche_nom: 'Nettoyage Gouttières Nantes', metier: 'gouttières', travaux: 'Nettoyage gouttieres', ville: 'Saint-Nazaire', pays: 'France', contexte: 'maison' },
                    { fiche_nom: 'Étanchéité Toit Terrasse Nantes', metier: 'étanchéité', travaux: 'Etancheite toit terrasse', ville: 'Nantes', pays: 'France', contexte: 'immeuble' },
                    { fiche_nom: 'Charpente & Couverture Loire', metier: 'charpente', travaux: 'Charpente', ville: 'Rezé', pays: 'France', contexte: 'maison' },
                ],
                'KORAIL': [
                    { fiche_nom: 'Carrelage & Sol Lille', metier: 'carrelage', travaux: 'Pose carrelage salle de bain', ville: 'Lille', pays: 'France', contexte: 'appartement' },
                    { fiche_nom: 'Débarras & Encombrants Nord', metier: 'débarras', travaux: 'Debarras maison', ville: 'Roubaix', pays: 'France', contexte: 'maison' },
                    { fiche_nom: 'Maçonnerie & Pierre Lille', metier: 'maçonnerie', travaux: 'Rejointoiement pierre', ville: 'Tourcoing', pays: 'France', contexte: 'maison' },
                ],
                'KINTANA': [
                    { fiche_nom: 'Menuiserie & Serrurerie Toulouse', metier: 'menuiserie', travaux: 'Installation porte bois', ville: 'Toulouse', pays: 'France', contexte: 'maison' },
                    { fiche_nom: 'Miroiterie & Vitrier Toulouse', metier: 'vitrier', travaux: 'Remplacement vitrage', ville: 'Blagnac', pays: 'France', contexte: 'appartement' },
                ],
            };

            const opKey = (TARGET_OPERATOR || '').trim().toUpperCase();
            const scenarioList = operatorScenarios[opKey] || operatorScenarios['FIF'];
            
            // Mode test multi-images : on prend jusqu'à 3 scénarios métiers différents de l'opérateur
            tasks = scenarioList.slice(0, 3).map((sc) => ({
                id: Math.floor(100000 + Math.random() * 900000),
                ...sc,
                operateur: TARGET_OPERATOR || 'TEST_ROBOT',
                date: dateStr,
                statut: 'pending_test'
            }));
            isTestFallback = true;
            console.log(`🎯 Mode Test Multi-Images : ${tasks.length} avis de test créés pour l'opérateur ${TARGET_OPERATOR || 'Global'} !`);
        }
        
        // En mode test fallback : on génère TOUTES les images de test (3 images). En prod : 1 sur 2 (50%).
        const tasksToGenerate = isTestFallback ? tasks : tasks.filter((_, index) => index % 2 === 0);
        console.log(`${tasksToGenerate.length} avis sélectionné(s) pour la génération d'image.`);
        
        if (tasksToGenerate.length === 0) {
            console.log("Aucune tâche trouvée dans la base de données.");
            return;
        }

        // ── 2-TIER COOKIE MANAGEMENT : PLAN PRO / WORK ET PLAN PERSO / SECOURS ──
        const availableCookiesMap = {};

        // 1. Collecte depuis process.env (GitHub Secrets)
        for (const [envKey, envVal] of Object.entries(process.env)) {
            if (envVal && envVal.trim().length > 20 && envKey.toUpperCase().includes('COOKIE')) {
                availableCookiesMap[envKey.toUpperCase()] = envVal.trim();
            }
        }

        // 2. Collecte depuis Supabase (tables fiches et app_settings)
        try {
            const { data: fichesData } = await supabase.from('fiches').select('nom, lien').or('nom.ilike.%COOKIE%,nom.ilike.%URL%,nom.ilike.%CONVERSATION%');
            if (fichesData && fichesData.length > 0) {
                for (const item of fichesData) {
                    const k = (item.nom || '').toUpperCase();
                    const v = (item.lien || '').trim();
                    if (v.length > 5) {
                        availableCookiesMap[k] = v;
                    }
                }
            }
        } catch (e) {}

        try {
            const { data: settingData } = await supabase.from('app_settings').select('key, value');
            if (settingData) {
                for (const item of settingData) {
                    const k = (item.key || '').toUpperCase();
                    const v = (item.value || '').trim();
                    if (v.length > 5 && (k.includes('COOKIE') || k.includes('URL'))) {
                        if (!availableCookiesMap[k]) availableCookiesMap[k] = v;
                    }
                }
            }
        } catch (e) {}

        function resolveCookieSetsForOp(opName) {
            const aliases = getOperatorAliases(opName);
            
            let workUrl = null;
            let persoUrl = null;
            let fallbackUrl = null;
            for (const alias of aliases) {
                if (!workUrl) workUrl = availableCookiesMap[`CHATGPT_WORK_CONVERSATION_URL_${alias}`] || process.env[`CHATGPT_WORK_CONVERSATION_URL_${alias}`];
                if (!persoUrl) persoUrl = availableCookiesMap[`CHATGPT_PERSO_CONVERSATION_URL_${alias}`] || process.env[`CHATGPT_PERSO_CONVERSATION_URL_${alias}`];
                if (!fallbackUrl) fallbackUrl = availableCookiesMap[`CHATGPT_CONVERSATION_URL_${alias}`] || process.env[`CHATGPT_CONVERSATION_URL_${alias}`];
            }
            workUrl = workUrl || process.env.CHATGPT_WORK_CONVERSATION_URL;
            persoUrl = persoUrl || process.env.CHATGPT_PERSO_CONVERSATION_URL;
            fallbackUrl = fallbackUrl || process.env.CHATGPT_CONVERSATION_URL || 'https://chatgpt.com/';

            const workKeyCandidates = [];
            for (const alias of aliases) {
                workKeyCandidates.push(`CHATGPT_WORK_COOKIES_${alias}`);
                workKeyCandidates.push(`CHATGPT_WORK_COOKIE_${alias}`);
            }
            workKeyCandidates.push('CHATGPT_WORK_COOKIES', 'CHATGPT_WORK_COOKIE');

            const persoKeyCandidates = [];
            for (const alias of aliases) {
                persoKeyCandidates.push(`CHATGPT_PERSO_COOKIES_${alias}`);
                persoKeyCandidates.push(`CHATGPT_COOKIES_${alias}`);
                persoKeyCandidates.push(`CHATGPT_PERSO_COOKIE_${alias}`);
                persoKeyCandidates.push(`CHATGPT_COOKIE_${alias}`);
            }
            persoKeyCandidates.push('CHATGPT_PERSO_COOKIES', 'CHATGPT_COOKIES');

            let workEntry = null;
            for (const k of workKeyCandidates) {
                if (availableCookiesMap[k]) {
                    workEntry = { name: 'Plan PRO / Work', key: k, raw: availableCookiesMap[k], url: workUrl || fallbackUrl };
                    break;
                }
            }

            let persoEntry = null;
            for (const k of persoKeyCandidates) {
                if (availableCookiesMap[k] && (!workEntry || availableCookiesMap[k] !== workEntry.raw)) {
                    persoEntry = { name: 'Plan PERSO / Secours', key: k, raw: availableCookiesMap[k], url: persoUrl || fallbackUrl };
                    break;
                }
            }

            const sets = [];
            if (workEntry) sets.push(workEntry);
            if (persoEntry) sets.push(persoEntry);

            if (sets.length === 0) {
                for (const [k, v] of Object.entries(availableCookiesMap)) {
                    if (opUpper && k.includes(opUpper)) {
                        sets.push({ name: 'Plan ChatGPT', key: k, raw: v, url: fallbackUrl });
                        break;
                    }
                }
            }
            if (sets.length === 0 && Object.keys(availableCookiesMap).length > 0) {
                const k = Object.keys(availableCookiesMap)[0];
                sets.push({ name: 'Plan ChatGPT (Fallback)', key: k, raw: availableCookiesMap[k], url: fallbackUrl });
            }
            return sets;
        }

        const initialOpSets = resolveCookieSetsForOp(rawOp);
        console.log(`🔑 Jeux de cookies ChatGPT prêts pour l'opérateur principal (${initialOpSets.length} plan(s)) : ${initialOpSets.map(s => s.name + ' [' + s.key + ']').join(', ')}`);

        function parseCookiesHelper(raw) {
            if (!raw) return [];
            let str = raw.trim();
            if (str.startsWith('```')) {
                str = str.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
            }
            if (!str.startsWith('[') && !str.includes('\t') && str.length > 50) {
                try {
                    const decoded = Buffer.from(str, 'base64').toString('utf-8').trim();
                    if (decoded.startsWith('[')) str = decoded;
                } catch (e) {}
            }
            if (str.startsWith('[')) {
                try { return JSON.parse(str); } catch (e) {}
            }
            const lines = str.split('\n');
            const list = [];
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) continue;
                const parts = trimmed.split('\t');
                if (parts.length >= 7) {
                    const domain = parts[0];
                    const path = parts[2];
                    const secure = parts[3].toUpperCase() === 'TRUE';
                    const expires = parseInt(parts[4], 10);
                    const name = parts[5];
                    const value = parts[6];
                    if (name && value) {
                        list.push({
                            name, value,
                            domain: domain.startsWith('.') ? domain : `.${domain}`,
                            path: path || '/', secure, httpOnly: false,
                            expires: isNaN(expires) ? undefined : expires
                        });
                    }
                }
            }
            if (list.length > 0) return list;
            return JSON.parse(str);
        }

        function sanitizeCookiesList(raw) {
            const parsed = parseCookiesHelper(raw);
            return parsed.map(c => {
                let dom = c.domain || '.chatgpt.com';
                if (dom.includes('openai.com')) dom = '.chatgpt.com';
                const clean = {
                    name: c.name,
                    value: c.value,
                    domain: dom,
                    path: c.path || '/',
                    secure: c.secure !== undefined ? Boolean(c.secure) : true,
                    httpOnly: Boolean(c.httpOnly),
                };
                if (typeof c.expires === 'number') clean.expires = c.expires;
                if (c.sameSite && typeof c.sameSite === 'string') {
                    const s = c.sameSite.toLowerCase();
                    if (s === 'strict') clean.sameSite = 'Strict';
                    else if (s === 'lax') clean.sameSite = 'Lax';
                    else if (s === 'none' || s === 'no_restriction') clean.sameSite = 'None';
                }
                return clean;
            });
        }

        console.log(`✅ Session ChatGPT prête avec ${initialOpSets.length} plan(s) de cookies configuré(s) pour "${rawOp || 'Global'}".`);
        const activePlanUrls = {};

        // Formatage de la date courte pour le nom du fichier et du dossier Drive (ex: 27-08-26)
        const targetDateObj = dateStr ? new Date(dateStr + 'T12:00:00Z') : new Date();
        const dayStr = targetDateObj.getUTCDate().toString().padStart(2, '0');
        const monthStr = (targetDateObj.getUTCMonth() + 1).toString().padStart(2, '0');
        const yearStr = targetDateObj.getUTCFullYear().toString().slice(-2);
        const dateFormatShort = `${dayStr}-${monthStr}-${yearStr}`;

        const uploadedImageHashes = new Set();

        for (let taskIndex = 0; taskIndex < tasksToGenerate.length; taskIndex++) {
            const task = tasksToGenerate[taskIndex];
            console.log(`[${taskIndex + 1}/${tasksToGenerate.length}] Traitement de l'avis ID ${task.id} pour le VA : ${task.operateur}`);
            
            // Valeurs aléatoires pour varier les photos
            const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
            
            const etatChantier   = pick(['début de chantier', 'travaux en cours', 'travaux quasi-terminés']);
            
            // Extraction automatique du métier depuis le nom de la fiche si absent de la table (Support bilingue Français & Anglais)
            function detectMetierFromFiche(ficheNom) {
                const f = (ficheNom || '').toLowerCase();
                
                // Cas spécifique : Fiche GMB 'Domiciliation' = Ravalement de façade à Saint-Herblain
                if (f.includes('domiciliation')) {
                    const choices = [
                        'ravalement de façade de maison individuelle avec application d\'enduit ou crépi neuf',
                        'nettoyage haute pression et démoussage de façade de maison',
                        'travaux de peinture extérieure sur façade et volets'
                    ];
                    return pick(choices);
                }
                
                // Si la fiche mentionne plusieurs services de nettoyage (Toiture, Terrasse, Façade) — FR & EN
                const hasRoofCleaning = f.includes('demoussage') || f.includes('démoussage') || f.includes('hydrofuge') || f.includes('moss removal') || f.includes('roof cleaning') || (f.includes('nettoyage') && f.includes('toiture'));
                const hasFacade = f.includes('façade') || f.includes('facade') || f.includes('ravalement') || f.includes('siding') || f.includes('stucco') || f.includes('cladding');
                const hasTerrace = f.includes('terrasse') || f.includes('terrace') || f.includes('patio') || f.includes('driveway');

                if (hasRoofCleaning && (hasFacade || hasTerrace)) {
                    const cleaningChoices = [];
                    if (hasRoofCleaning) cleaningChoices.push('démoussage, traitement hydrofuge et nettoyage haute pression de toiture (nettoyage des tuiles au jet haute pression)');
                    if (hasFacade) cleaningChoices.push('nettoyage haute pression et ravalement de façade de maison (artisan nettoyant les murs au jet haute pression)');
                    if (hasTerrace) cleaningChoices.push('nettoyage haute pression de terrasse extérieure et dalles de jardin');
                    return pick(cleaningChoices);
                }

                // Multi-services Façade & Peinture (Ravalement, Peinture extérieure, Nettoyage façade) — FR & EN
                const hasRavalement = f.includes('ravalement') || f.includes('crépi') || f.includes('crepi') || f.includes('enduit') || f.includes('render') || f.includes('stucco');
                const hasPainting = f.includes('peinture') || f.includes('peintre') || f.includes('painting') || f.includes('painter');
                const hasFacadeCleaning = (f.includes('façade') || f.includes('facade') || f.includes('siding')) && (f.includes('nettoyage') || f.includes('lavage') || f.includes('cleaning') || f.includes('washing'));

                if ((hasRavalement || hasFacadeCleaning) && (hasPainting || hasFacadeCleaning)) {
                    const facadeChoices = [];
                    if (hasRavalement) facadeChoices.push('ravalement de façade de maison individuelle avec application d\'enduit ou crépi neuf');
                    if (hasPainting) facadeChoices.push('travaux de peinture extérieure sur façade de maison, boiseries et volets');
                    if (hasFacadeCleaning) facadeChoices.push('nettoyage haute pression et démoussage de façade extérieure');
                    return pick(facadeChoices);
                }
                
                // 1. Spécialités spécifiques Toiture & Extérieur (FR & EN)
                if (hasRoofCleaning || f.includes('pressure wash') || f.includes('power wash') || f.includes('soft wash') || f.includes('softwash')) {
                    return 'démoussage, traitement hydrofuge et nettoyage haute pression de toiture (nettoyage des tuiles au jet haute pression)';
                }
                if (f.includes('gouttière') || f.includes('gouttiere') || f.includes('cheneau') || f.includes('gutter')) {
                    return 'nettoyage et vidage de gouttières (artisan retirant les feuilles et résidus accumulés dans la gouttière depuis une échelle, nettoyage au jet d\'eau, sans pose ni réfection)';
                }
                if (f.includes('etancheite') || f.includes('étanchéité') || f.includes('toit plat') || f.includes('toiture terrasse') || f.includes('terrasse toit plat') || f.includes('waterproof') || f.includes('waterproofing')) {
                    const etancheiteChoices = [
                        'travaux d\'étanchéité de toit terrasse et toit plat (pose de membrane EPDM / PVC synthétique ou membrane bitumineuse au chalumeau sur toit terrasse plat, sans tuiles ni pente)',
                        'étanchéité de toit terrasse plat (artisan étancheur étalant la résine synthétique d\'étanchéité au rouleau sur surface plate)'
                    ];
                    return pick(etancheiteChoices);
                }
                if (f.includes('ravalement') || f.includes('façade') || f.includes('facade') || f.includes('crépi') || f.includes('crepi') || f.includes('siding')) {
                    return 'ravalement et nettoyage de façade';
                }
                
                // 2. Paysagiste & Aménagement Paysager (FR & EN)
                const isLandscape = f.includes('paysagiste') || f.includes('paysagisme') || f.includes('landscaping') || f.includes('landscape designer');
                if (isLandscape && !f.includes('elagage') && !f.includes('élagage') && !f.includes('abattage')) {
                    const landscapeChoices = [
                        'aménagement paysager de jardin (création et plantation de massifs de fleurs et arbustes décoratifs par un paysagiste)',
                        'création de pelouse et engazonnement de jardin paysagé par un artisan paysagiste',
                        'aménagement d\'allée paysagère en dalles de pierre et murets de jardin'
                    ];
                    return pick(landscapeChoices);
                }

                // 3. Élagage, Émondage, Abattage, Taille de Haies & Dessouchage (FR & EN)
                const hasTree = f.includes('elagage') || f.includes('élagage') || f.includes('emondage') || f.includes('émondage') || f.includes('emondeur') || f.includes('émondeur') || f.includes('abattage') || f.includes('haie') || f.includes('jardinage') || f.includes('elagueur') || f.includes('élagueur') || f.includes('tree') || f.includes('trees') || f.includes('arborist') || f.includes('pruning') || f.includes('gardener') || f.includes('gardening') || f.includes('dessouchage') || f.includes('stump') || f.includes('hedge');

                if (hasTree || isLandscape) {
                    const treeChoices = [
                        'élagage doux d\'arbre de jardin sur un escabeau double de jardin (artisan jardinier taillant les branches à la scie de jardin, sans harnais ni cordages)',
                        'élagage et entretien d\'arbre de jardin (branches taillées depuis un escabeau double de jardin ou à hauteur d\'homme par des jardiniers)',
                        'élagage en hauteur de grand arbre haute tige (élagueur arboriste qualifié avec harnais de sécurité et cordages ancrés dans les grandes branches en hauteur)',
                        'taille de haie haute sur escabeau double de jardin (artisan jardinier utilisant un taille-haie professionnel)',
                        'dessouchage et rognage de souche d\'arbre au sol dans un jardin (extraction de la souche)'
                    ];
                    return pick(treeChoices);
                }

                // 3. Couverture, Couvreur & Réfection de Toiture (FR & EN)
                if (f.includes('couvreur') || f.includes('toiture') || f.includes('couverture') || f.includes('charpente') || f.includes('faîtage') || f.includes('zinguerie') || f.includes('roof') || f.includes('roofer') || f.includes('roofing') || f.includes('shingle')) {
                    const roofingChoices = [
                        'travaux de couverture, pose et réfection de tuiles en terre cuite par un couvreur (artisan sur échelle de toit)',
                        'travaux de couverture et étanchéité de faîtage de toiture',
                        'travaux de zinguerie, étanchéité et finition de toiture par un artisan couvreur'
                    ];
                    return pick(roofingChoices);
                }

                // 4. Dépannage & Remorquage Automobile (FR & EN)
                if (f.includes('dépannage') || f.includes('depannage') || f.includes('remorquage') || f.includes('towing') || f.includes('tow truck') || f.includes('breakdown')) {
                    const towingChoices = [
                        'dépannage automobile et chargement de voiture en panne sur camion dépanneuse plateau',
                        'remorquage automobile sur le bord de la route avec véhicule d\'assistance routière et gyrophares',
                        'dépannage auto sur place (changement de roue ou démarrage batterie avec booster)'
                    ];
                    return pick(towingChoices);
                }

                // 5. Second œuvre & Intérieur (FR & EN)
                if (f.includes('carrelage') || f.includes('carreleur') || f.includes('faïence') || f.includes('tile') || f.includes('tiling') || f.includes('tiler')) {
                    const tileChoices = [
                        'pose de carrelage intérieur au sol (artisan carreleur appliquant le mortier-colle et les croisillons sur sol intérieur)',
                        'pose de faïence murale céramique dans une salle de bain ou cuisine intérieure'
                    ];
                    return pick(tileChoices);
                }
                if (f.includes('peintre') || f.includes('peinture') || f.includes('décoration') || f.includes('decoration') || f.includes('paint') || f.includes('painter') || f.includes('painting')) {
                    const paintChoices = [
                        'travaux de peinture intérieure et décoration (artisan peintre appliquant la peinture au rouleau sur mur intérieur de salon ou chambre)',
                        'peinture murale intérieure et finitions de plafond dans une pièce à vivre'
                    ];
                    return pick(paintChoices);
                }
                if (f.includes('nettoyage extérieur') || f.includes('nettoyage exterieur')) {
                    const extCleaningChoices = [
                        'nettoyage haute pression et démoussage de façade extérieure de maison',
                        'nettoyage haute pression de terrasse extérieure en dalles de pierre ou pavés'
                    ];
                    return pick(extCleaningChoices);
                }
                if (f.includes('plombier') || f.includes('plomberie') || f.includes('plumber') || f.includes('plumbing')) {
                    return 'travaux de plomberie';
                }
                if (f.includes('vitrier') || f.includes('miroiterie') || f.includes('vitrage') || f.includes('glass') || f.includes('glazier')) {
                    return 'remplacement de vitrage et vitrerie';
                }
                if (f.includes('débarras') || f.includes('debarras') || f.includes('clearance') || f.includes('junk') || f.includes('encombrant')) {
                    const debarrasChoices = [
                        'débarras et nettoyage d\'intérieur de maison, appartement ou grenier (cartons empilés, objets et meubles en cours de rangement par des déménageurs sans camion à l\'image)',
                        'débarras de locaux et maison individuelle avec camionnette utilitaire aux portes arrière ouvertes garée devant l\'allée'
                    ];
                    return pick(debarrasChoices);
                }
                if (f.includes('maçonnerie') || f.includes('maconnerie') || f.includes('pierre') || f.includes('masonry') || f.includes('mason') || f.includes('brickwork')) {
                    const maconnerieChoices = [
                        'travaux de maçonnerie générale, pose de parpaings et muret en béton avec mortier au sol',
                        'maçonnerie et rejointoiement de mur en pierre naturelle de maison',
                        'construction et coffrage d\'escalier intérieur ou extérieur en béton armé par un artisan maçon',
                        'ouverture dans mur porteur et pose de linteau par un artisan maçon'
                    ];
                    return pick(maconnerieChoices);
                }
                if (f.includes('terrassement') || f.includes('dessouchage') || f.includes('dallage') || f.includes('paving') || f.includes('driveway') || f.includes('excavation') || f.includes('concrete') || f.includes('cement')) {
                    const concreteChoices = [
                        'travaux de terrassement, nivellement du sol et coulage de dalle béton extérieure (coffrage en bois, treillis métallique et terrassement par un terrasseur)',
                        'travaux de terrassement et préparation du sol pour allée de jardin ou terrasse extérieure',
                        'aménagement de dalle béton extérieure avec mini-pelle de terrassement ou engin de chantier'
                    ];
                    return pick(concreteChoices);
                }
                return 'travaux de rénovation';
            }

            const detectedTrade = detectMetierFromFiche(task.fiche_nom);
            // Priorité absolue au métier réel de la Fiche GMB pour éviter que task.travaux/metier vague n'écrase la fiche
            let travauxLabel = detectedTrade;
            if (!travauxLabel || travauxLabel === 'travaux d\'artisanat et d\'entretien') {
                travauxLabel = task.travaux || task.metier || 'travaux d\'artisanat';
            }

            // Règle du nombre d'ouvriers :
            // Nettoyage terrasse : artisan solo (1 ouvrier)
            // Nettoyage façade : 1 à 2 ouvriers (50% solo / 50% duo)
            // Nettoyage toiture / démoussage : 1 à 2 ouvriers (50% solo / 50% duo)
            // Extérieurs lourds à risque (élagage, abattage, charpente, maçonnerie, terrassement) : 70% 2 ouvriers / 30% 3 ouvriers.
            // Chantiers d'intérieur : 60% 1 artisan solo / 40% 2 artisans.
            const metierText = ((task.metier || '') + ' ' + (task.travaux || '') + ' ' + (task.fiche_nom || '') + ' ' + travauxLabel).toLowerCase();
            const randWorker = Math.random();
            let nbOuvriers = '1 ou 2 artisans';

            if (metierText.includes('haie') || metierText.includes('taille de haie')) {
                nbOuvriers = 'exactement 2 ouvriers en duo';
            } else if (metierText.includes('terrasse') || metierText.includes('patio')) {
                nbOuvriers = randWorker < 0.85 ? '1 artisan solo' : '2 artisans';
            } else if (metierText.includes('facade') || metierText.includes('façade') || metierText.includes('ravalement')) {
                nbOuvriers = randWorker < 0.50 ? '1 artisan solo' : '2 artisans';
            } else if (metierText.includes('demoussage') || metierText.includes('démoussage') || (metierText.includes('nettoyage') && metierText.includes('toiture'))) {
                nbOuvriers = randWorker < 0.50 ? '1 artisan solo' : '2 artisans';
            } else if (['elagage', 'élagage', 'abattage', 'charpente', 'maconnerie', 'maçonnerie', 'terrassement'].some(k => metierText.includes(k))) {
                nbOuvriers = randWorker < 0.70 ? '2 ouvriers' : '3 ouvriers';
            } else {
                nbOuvriers = randWorker < 0.60 ? '1 artisan solo' : '2 artisans';
            }
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
            
            // Construction du prompt final
            if ((task.fiche_nom || '').toLowerCase().includes('domiciliation')) {
                if (!task.ville || task.ville === '—' || task.ville === 'France') {
                    task.ville = 'Saint-Herblain';
                    task.departement = '44';
                    task.region = 'Loire-Atlantique';
                }
            }

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
            
            // Exclusion stricte par métier pour empêcher la réutilisation de contextes DALL-E 3
            let negativeConstraint = "";
            const lowerLabel = travauxLabel.toLowerCase();
            
            // Header de reset de contexte — force DALL-E 3 à ignorer les images précédentes du fil
            let contextReset = "";
            if (lowerLabel.includes('démoussage') || lowerLabel.includes('nettoyage') || lowerLabel.includes('façade') || lowerLabel.includes('terrasse')) {
                contextReset = "🔴 NEW INDEPENDENT IMAGE REQUEST — IGNORE ALL PREVIOUS IMAGES IN THIS CONVERSATION.\nThis image must show: PRESSURE WASHING / SURFACE CLEANING workers only.\nDO NOT reproduce or reference any previous image style. Start completely fresh.\n\n";
                negativeConstraint = "\n\n❌ ABSOLUTE PROHIBITION: NO jackhammers, NO concrete demolition tools, NO jackhammering, NO heavy power tools breaking ground, NO trees being cut, NO arborists, NO chainsaws, NO towing trucks, NO cars. ONLY high-pressure washer or surface cleaning with water spray lance.";
            } else if (lowerLabel.includes('élagage') || lowerLabel.includes('abattage') || lowerLabel.includes('émondage') || lowerLabel.includes('haie') || lowerLabel.includes('jardin')) {
                contextReset = "🔴 NEW INDEPENDENT IMAGE REQUEST — IGNORE ALL PREVIOUS IMAGES IN THIS CONVERSATION.\nThis image must show: TREE TRIMMING / ARBORIST / HEDGE CUTTING workers only.\nDO NOT reproduce or reference any previous image style. Start completely fresh.\n\n";
                negativeConstraint = "\n\n❌ ABSOLUTE PROHIBITION: NO tall straight extension ladders leaning against hedges, NO workers climbing tall leaning ladders against bushes, NO roof tiles, NO pressure washing, NO tow trucks, NO cars, NO facade scaffolding. ONLY ground-level hedge trimming or low A-frame garden step-ladder.";
            } else if (lowerLabel.includes('dépannage') || lowerLabel.includes('remorquage') || lowerLabel.includes('auto') || lowerLabel.includes('voiture')) {
                contextReset = "🔴 NEW INDEPENDENT IMAGE REQUEST — IGNORE ALL PREVIOUS IMAGES IN THIS CONVERSATION.\nThis image must show: ROADSIDE BREAKDOWN / TOW TRUCK / AUTOMOTIVE REPAIR only.\nDO NOT reproduce or reference any previous image style. Start completely fresh.\n\n";
                negativeConstraint = "\n\n❌ ABSOLUTE PROHIBITION: NO roof workers, NO trees, NO scaffolding, NO pressure washers, NO garden tools. ONLY roadside vehicle towing or breakdown assistance with a tow truck.";
            } else if (lowerLabel.includes('étanchéité') || lowerLabel.includes('etancheite') || lowerLabel.includes('toit plat') || lowerLabel.includes('toiture terrasse') || lowerLabel.includes('terrasse toit plat') || lowerLabel.includes('pvc') || lowerLabel.includes('inondation') || lowerLabel.includes('infiltration')) {
                contextReset = "🔴 NEW INDEPENDENT IMAGE REQUEST — IGNORE ALL PREVIOUS IMAGES IN THIS CONVERSATION.\nThis image must show: FLAT ROOF WATERPROOFING MEMBRANE / EPDM / PVC / SYNTHETIC RESIN ON FLAT ROOFTOP ONLY.\nDO NOT reproduce or reference any previous image style. Start completely fresh.\n\n";
                negativeConstraint = "\n\n❌ ABSOLUTE PROHIBITION: NO sloped roofs! NO terracotta roof tiles! NO high-pressure jet washing of roof tiles! NO pitched house roofs! NO tree trimming! The building roof MUST be 100% FLAT (toit plat/terrasse). ONLY flat roof waterproofing membrane (EPDM, PVC, bitumen) applied with torch or resin roller on a flat rooftop surface.";
            } else if (lowerLabel.includes('couvreur') || lowerLabel.includes('toiture') || lowerLabel.includes('couverture') || lowerLabel.includes('tuile') || lowerLabel.includes('charpente') || lowerLabel.includes('faîtage') || lowerLabel.includes('faitage') || lowerLabel.includes('rive')) {
                contextReset = "🔴 NEW INDEPENDENT IMAGE REQUEST — IGNORE ALL PREVIOUS IMAGES IN THIS CONVERSATION.\nThis image must show: ROOFER / ROOF TILE REPLACEMENT / ROOFING WORK on a fully tiled finished roof only.\nDO NOT reproduce or reference any previous image style. Start completely fresh.\n\n";
                negativeConstraint = "\n\n❌ ABSOLUTE PROHIBITION: NO exposed bare wooden laths/battens, NO skeletal uncovered roof structure, NO giant tall extension ladders leaning against the front of the house reaching up the roof slope, NO single worker climbing a giant ladder in front of a house, NO hedge trimming, NO tree surgeons, NO pressure washing patio, NO tow trucks, NO arborists. ONLY roofing work on a fully tiled roof surface with a hooked roof ladder laid flat on tiles.";
            } else if (lowerLabel.includes('peinture')) {
                contextReset = "🔴 NEW INDEPENDENT IMAGE REQUEST — IGNORE ALL PREVIOUS IMAGES IN THIS CONVERSATION.\nThis image must show: INDOOR PAINTER / WALL PAINTING with roller and drop cloths only.\nDO NOT reproduce or reference any previous image style. Start completely fresh.\n\n";
                negativeConstraint = "\n\n❌ ABSOLUTE PROHIBITION: NO roof tiles, NO outdoor trees, NO tow trucks, NO pressure washers. ONLY indoor wall or ceiling painting in bathroom, kitchen, bedroom or living room.";
            } else if (lowerLabel.includes('carrelage') || lowerLabel.includes('faïence') || lowerLabel.includes('faience')) {
                contextReset = "🔴 NEW INDEPENDENT IMAGE REQUEST — IGNORE ALL PREVIOUS IMAGES IN THIS CONVERSATION.\nThis image must show: TILER / FLOOR OR WALL TILING with tile spacers and trowel only.\nDO NOT reproduce or reference any previous image style. Start completely fresh.\n\n";
                negativeConstraint = "\n\n❌ ABSOLUTE PROHIBITION: NO roof tiles, NO outdoor trees, NO tow trucks, NO painting rollers. ONLY indoor floor tiling or wall ceramic tile installation.";
            } else {
                contextReset = "🔴 NEW INDEPENDENT IMAGE REQUEST — IGNORE ALL PREVIOUS IMAGES IN THIS CONVERSATION.\nStart completely fresh with the following scene.\n\n";
            }

            const coreTradeBlock = `\n🎯 OBJET UNIQUE ET OBLIGATOIRE DU CHANTIER :\n- Métier & Travaux réels : ${travauxLabel.toUpperCase()}\n- Entreprise : ${task.fiche_nom || ''}\n- Bâtiment & Lieu : ${contexteLabel} (${locationStr})\n- Présence sur l'image : ${nbOuvriers}, ambiance ${lumiere}, vue ${pointDeVue}, format ${orientation}.\n`;

            // Injection des règles de sécurité et visuelles selon le métier et le service
            const rulesBlock = buildRulesBlock(task.metier || travauxLabel, task.travaux || travauxLabel, etatChantier);
            const finalPrompt = contextReset + coreTradeBlock + "\n" + prompt + "\n" + rulesBlock + "\n" + negativeConstraint;
            
            console.log(`Prompt généré (${travauxLabel} / ${contexteLabel}) : ${finalPrompt.substring(0, 150)}...`);
            
            try {
                // Resolution dynamique des cookies pour l'opérateur de cette tâche spécifique (ex: KEVIN puis FIFA...)
                const taskOpName = task.operateur || TARGET_OPERATOR || rawOp;
                const taskCookieSets = resolveCookieSetsForOp(taskOpName);

                for (let planIdx = 0; planIdx < taskCookieSets.length; planIdx++) {
                    const plan = taskCookieSets[planIdx];
                    console.log(`\n🤖 [Avis ID ${task.id}] Tentative avec le ${plan.name} (Secret: "${plan.key}")...`);
                    try {
                        const parsedCookies = sanitizeCookiesList(plan.raw);
                        if (!parsedCookies || parsedCookies.length === 0) {
                            throw new Error(`Cookies vides pour le secret ${plan.key}`);
                        }
                        // Fil de discussion vierge à chaque image pour éliminer à 100% les hallucinations entre métiers
                        let cleanChatUrl = plan.url || 'https://chatgpt.com/';
                        if (cleanChatUrl.includes('/g/')) {
                            const gptBase = cleanChatUrl.match(/(https:\/\/chatgpt\.com\/g\/[^\/]+)/);
                            if (gptBase) cleanChatUrl = gptBase[1];
                        } else {
                            cleanChatUrl = 'https://chatgpt.com/';
                        }

                        const res = await generateImageWithChatGPT(finalPrompt, parsedCookies, task.operateur, cleanChatUrl);
                        rawImageBuffer = res ? res.imageBuffer : null;

                        if (rawImageBuffer) {
                            usedPlanName = plan.name;
                            console.log(`✅ Succès de la génération d'image avec le ${plan.name} !`);
                            break;
                        }
                    } catch (planErr) {
                        console.warn(`⚠️ ÉCHEC avec le ${plan.name} ("${plan.key}") : ${planErr.message}`);
                        if (planIdx < taskCookieSets.length - 1) {
                            console.log(`🔄 BASCULE AUTOMATIQUE SUR LE PLAN DE SECOURS : "${taskCookieSets[planIdx + 1].name}" ("${taskCookieSets[planIdx + 1].key}")...`);
                            await new Promise(r => setTimeout(r, 4000));
                        } else {
                            if (taskCookieSets.length === 1) {
                                console.error(`🚨 ATTENTION : Seul 1 compte ("${taskCookieSets[0].key}") est enregistré pour ${taskOpName}. Aucun compte PERSO ("CHATGPT_PERSO_COOKIES_${taskOpName}") n'est enregistré dans Supabase.`);
                                console.error(`👉 POUR ACTIVER LA BASCULE AUTOMATIQUE : Connectez-vous à votre compte ChatGPT PERSO dans Chrome, ouvrez l'extension et cliquez sur "🏠 Enregistrer comme Compte PERSO" !`);
                            } else {
                                console.error(`❌ TOUS LES ${taskCookieSets.length} PLANS ONT ÉCHOUÉ pour la tâche ID ${task.id}.`);
                            }
                            throw planErr;
                        }
                    }
                }

                if (!rawImageBuffer) {
                    throw new Error("Impossible d'extraire l'image (tous les comptes ChatGPT ont échoué).");
                }
                
                // Contrôle anti-doublon binaire : bloquer l'upload si la photo est strictement identique à une tâche précédente du même run
                const imgHash = crypto.createHash('md5').update(rawImageBuffer).digest('hex');
                if (uploadedImageHashes.has(imgHash)) {
                    throw new Error(`⚠️ Photo binaire en double (${imgHash.substring(0, 8)}) détectée. Tâche ignorée pour éviter la répétition de la même photo sur Drive.`);
                }
                uploadedImageHashes.add(imgHash);
                
                // Injection des métadonnées EXIF Smartphone & Coordonnées GPS (matching intelligent de la date selon l'avis)
                const reviewTextContent = (task.commentaire || '') + ' ' + (task.travaux || '');
                const imageBuffer = await injectExifAndGps(rawImageBuffer, task.ville || 'Paris', task.pays || 'France', task.date, reviewTextContent);
                
                // Formatage exact demandé : [NOM OPERATEUR]_21-08-26_[GMB NAME]
                const safeOpName = (task.operateur || 'OPERATEUR').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
                const safeGmbName = (task.fiche_nom || 'GMB').replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
                const fileName = `${safeOpName}_${dateFormatShort}_${safeGmbName}_img${taskIndex + 1}.jpg`;
                
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
                    try {
                        await supabase
                            .from('planning')
                            .update({
                                url_image: uploadResult.url
                            })
                            .eq('id', task.id);
                    } catch (sErr) {}
                    console.log(`Photo sauvegardée sur Google Drive (${uploadResult.provider}) pour l'avis ID ${task.id} sans modifier le statut du planning.`);
                }

                // Pause de sécurité inter-tâches de 20 secondes avant le prochain avis
                if (taskIndex < tasksToGenerate.length - 1) {
                    console.log("⏳ Pause de 20 secondes avant le prochain avis...");
                    await new Promise(r => setTimeout(r, 20000));
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
            `📅 Date de planification : <b>${dateStr}</b>\n` +
            `📍 Métadonnées EXIF & GPS intégrées\n` +
            `📂 Dossier : Google Drive / ${TARGET_OPERATOR || 'Défaut'}`;
            
        await sendTelegramNotification(summaryMsg);
        process.exit(0);
        
    } catch (err) {
        console.error("Erreur critique:", err);
        process.exit(1);
    }
}

main();
