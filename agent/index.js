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
async function uploadToGoogleDrive(fileName, imageBuffer, operatorName, targetDate = null) {
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

    // 2. Dossier opérateur (ex: "Kevin", "Fifaliana")
    const opFolderId = await getOrCreateDriveFolder(drive, folderId, operatorName);

    // 3. Sous-dossier avec la date exacte du planning (priorité: targetDate -> date locale Bangkok -> date du jour)
    const effectiveDate = (targetDate || '').trim() 
        || (process.env.TARGET_DATE ? process.env.TARGET_DATE.trim() : null)
        || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

    const targetFolderId = await getOrCreateDriveFolder(drive, opFolderId, effectiveDate);

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

    console.log(`Upload en cours de la photo sur Google Drive (Sous-dossier Opérateur: "${operatorName || 'Défaut'}" / Date: "${effectiveDate}")...`);

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
    console.log(`✅ Photo uploadée avec succès sur Google Drive dans le sous-dossier [${operatorName || 'Défaut'}/${effectiveDate}] ! File ID : ${fileId}`);

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
async function uploadImage(fileName, imageBuffer, operatorName, targetDate = null) {
    try {
        const driveRes = await uploadToGoogleDrive(fileName, imageBuffer, operatorName, targetDate);
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

                // ── 1. VITRIER & MIROITERIE (6 services officiels) ──
                if (f.includes('vitrier') || f.includes('vitrerie') || f.includes('miroiterie') || f.includes('miroir') || f.includes('vitrage') || f.includes('glazier') || f.includes('glass')) {
                    const vitrierChoices = [
                        'dépannage vitrerie d\'urgence (sécurisation de vitre brisée ou mise en sécurité provisoire par un vitrier avec ventouses)',
                        'remplacement de vitre cassée (artisan vitrier retirant la vitre endommagée et posant un vitrage neuf avec poignées ventouses)',
                        'double vitrage et isolation (pose et remplacement de double vitrage thermique isolant dans châssis fenêtre)',
                        'réparation de fenêtre (réglage des ouvrants, remplacement de crémone et réfection de joints d\'étanchéité)',
                        'vitrine et vitrage de sécurité (pose de vitrage feuilleté anti-effraction et vitrine de commerce par des vitriers avec ventouses triples)',
                        'miroiterie et verre sur mesure (installation de grand miroir mural ou paroi de verre avec ventouses et niveau)'
                    ];
                    return pick(vitrierChoices);
                }

                // ── 2. CHARPENTE & OSSATURE BOIS (14 services officiels) ──
                // Détecter si la fiche est spécifiquement dédiée à la charpente / ossature bois
                const isExplicitCharpente = f.includes('charpente') || f.includes('charpentier') || f.includes('fermette') || f.includes('ossature bois') || f.includes('solivage') || f.includes('combles') || f.includes('surélévation') || f.includes('surelevation') || f.includes('carpenter') || f.includes('framing');
                if (isExplicitCharpente && !f.includes('couvreur') && !f.includes('toiture')) {
                    const charpenteChoices = [
                        'traitement de charpente (traitement curatif et préventif du bois par injection sous pression avec équipement de protection)',
                        'réparation de charpente (remplacement de chevrons ou pannes abîmées avec renforts métalliques)',
                        'renforcement & consolidation de charpente (pose de moises en bois massif ou plaques d\'acier sur poutres de toiture)',
                        'modification de fermette (transformation de combles perdus en combles habitables avec pose d\'entraits porteurs)',
                        'aménagement de combles (isolation sous rampants et pose de plancher porteur sous toiture par des charpentiers)',
                        'surélévation de toiture (création d\'étage supérieur en structure ossature bois avec panneaux préfabriqués)',
                        'extension & ossature bois (montage de murs à ossature bois avec contreventement OSB et pare-pluie sur dalle)',
                        'charpente traditionnelle (assemblage de ferme traditionnelle en chêne ou douglas avec arbalétriers et pannes)',
                        'charpente neuve & levage (levage et pose de charpente neuve à la grue avec charpentiers équipés de harnais)',
                        'plancher, solivage & mezzanine (pose de solives en bois massif et plancher rainuré pour création de mezzanine)',
                        'bardage bois & isolation extérieure (pose de lames de bardage bois extérieur sur liteaux et isolant de façade)',
                        'terrasse bois (pose de lambourdes sur plots réglables et vissage de lames de terrasse bois par des artisans)',
                        'carport, pergola & abris (construction d\'un carport ou pergola en bois massif sur poteaux dans le jardin)',
                        'lucarne & fenêtre de toit (création de chevêtre de toiture et installation de lucarne ou fenêtre de toit)'
                    ];
                    return pick(charpenteChoices);
                }

                // ── 3. ÉTANCHÉITÉ (5 services officiels) ──
                if (f.includes('etancheite') || f.includes('étanchéité') || f.includes('toit plat') || f.includes('toiture terrasse') || f.includes('terrasse toit plat') || f.includes('waterproof') || f.includes('waterproofing') || f.includes('infiltration') || f.includes('fuite')) {
                    const etancheiteChoices = [
                        'étanchéité de toit-terrasse & toit plat (pose de membrane EPDM, PVC ou bitumineuse au chalumeau sur toit plat avec acrotères)',
                        'recherche de fuite & réparation d\'infiltration (détection de fuite au fumigène/caméra thermique et pose de patch d\'étanchéité)',
                        'étanchéité sous carrelage & terrasse carrelée (application de résine d\'étanchéité liquide SEL et bandes d\'angle sur terrasse)',
                        'réfection complète d\'étanchéité (remplacement complet du complexe d\'étanchéité bicouche et couvertines sur toiture-terrasse)',
                        'étanchéité & isolation de toiture-terrasse (pose de panneaux isolants thermiques rigides et membrane d\'étanchéité bicouche)'
                    ];
                    return pick(etancheiteChoices);
                }

                // ── 4. NETTOYAGE EXTÉRIEUR (7 services officiels) ──
                const isExplicitNettoyage = f.includes('nettoyage') || f.includes('demoussage') || f.includes('démoussage') || f.includes('hydrofuge') || f.includes('lavage') || f.includes('pressure wash') || f.includes('soft wash') || f.includes('softwash') || f.includes('power wash');
                if (isExplicitNettoyage && !f.includes('couvreur') && !f.includes('couverture')) {
                    const nettoyageChoices = [
                        'nettoyage & démoussage de toiture (artisan au sol avec perche télescopique de pulvérisation appliquant un traitement anti-mousse)',
                        'traitement hydrofuge toiture (pulvérisation au sol de produit hydrofuge protecteur sur tuiles)',
                        'nettoyage de façade (nettoyage moyenne pression ou softwash de façade de maison avec contraste propre)',
                        'ravalement de façade (application d\'enduit neuf ou crépi taloché sur façade depuis un échafaudage)',
                        'nettoyage panneaux solaires (nettoyage de panneaux solaires photovoltaïques avec perche télescopique à eau pure et brosse douce)',
                        'nettoyage terrasses, allées & dallages (nettoyage haute pression avec cloche de lavage de sol ou rotabuse sur dalles et pavés)',
                        'nettoyage gouttières & chéneaux (curage manuel et retrait des feuilles mortes dans gouttières en zinc ou PVC)'
                    ];
                    return pick(nettoyageChoices);
                }

                // ── 5. GOUTTIÈRES SPÉCIFIQUES ──
                if (f.includes('gouttière') || f.includes('gouttiere') || f.includes('cheneau') || f.includes('chéneau') || f.includes('gutter')) {
                    const gutterChoices = [
                        'nettoyage et curage de gouttières (artisan retirant manuellement les feuilles et mousses de la gouttière et rinçage)',
                        'débouchage de gouttières et descentes d\'eaux pluviales (furet de débouchage ou nettoyage de regard)',
                        'nettoyage et curage complet de chéneaux encastrés sur toiture de maison ou immeuble',
                        'réparation de gouttières et traitement des fuites de joints par un artisan',
                        'pose de protège-gouttières, grilles et filets anti-feuilles avec crapaudines sur gouttières',
                        'pose et remplacement de gouttières neuves en zinc ou PVC avec réglage des pentes',
                        'pose haut de gamme de gouttières en cuivre avec soudures soignées sur maison de caractère',
                        'pose de tuyaux de descentes d\'eaux pluviales et dauphins en fonte le long de la façade'
                    ];
                    return pick(gutterChoices);
                }

                // ── 6. COUVERTURE & TOITURE (8 services officiels) ──
                if (f.includes('couvreur') || f.includes('toiture') || f.includes('couverture') || f.includes('tuile') || f.includes('zinguerie') || f.includes('faîtage') || f.includes('faitage') || f.includes('rive') || f.includes('roof') || f.includes('roofer') || f.includes('roofing') || f.includes('shingle')) {
                    const couvertureChoices = [
                        'couverture & pose de toiture (pose de tuiles en terre cuite neuves ou ardoises sur liteaux avec échafaudage de couvreur)',
                        'remplacement & réparation de tuiles cassées ou déplacées sur toiture de maison avec échafaudage de sécurité',
                        'nettoyage & démoussage de toiture (artisan au sol avec perche télescopique de pulvérisation appliquant un traitement anti-mousse)',
                        'traitement hydrofuge & imperméabilisant de toiture (pulvérisation de produit hydrofuge incolore sur tuiles propres)',
                        'étanchéité toiture-terrasse (pose de membrane d\'étanchéité EPDM ou bitume sur toit 100% plat avec acrotères)',
                        'zinguerie & gouttières (pose de gouttières en zinc et solins de rives d\'étanchéité)',
                        'faîtage & rive (scellement ou pose à sec de faîtières ventilées et rives de toiture avec harnais)',
                        'charpente & ossature bois (assemblage de fermettes ou chevrons de toiture par des charpentiers)'
                    ];
                    return pick(couvertureChoices);
                }

                // ── 7. ÉLAGAGE, ABATTAGE & PAYSAGISME (6 services officiels) ──
                const hasTreeOrGarden = f.includes('elagage') || f.includes('élagage') || f.includes('emondage') || f.includes('émondage') || f.includes('emondeur') || f.includes('émondeur') || f.includes('abattage') || f.includes('haie') || f.includes('jardinage') || f.includes('elagueur') || f.includes('élagueur') || f.includes('tree') || f.includes('trees') || f.includes('arborist') || f.includes('pruning') || f.includes('gardener') || f.includes('gardening') || f.includes('dessouchage') || f.includes('stump') || f.includes('hedge') || f.includes('debroussaillage') || f.includes('débroussaillage') || f.includes('paysagiste') || f.includes('paysagisme') || f.includes('landscaping') || f.includes('paysage');

                if (hasTreeOrGarden) {
                    const elagageChoices = [
                        'élagage d\'arbre de jardin sur escabeau double ou au sol (taille douce de branches à la scie d\'élagage sans harnais, ou arboriste qualifié en hauteur pour grand arbre)',
                        'abattage d\'arbre au sol avec tronçonneuse professionnelle, équipement de sécurité forestier et billes de bois débitées',
                        'taille d\'haies soignée en duo au taille-haie sur escabeau double de jardin avec ramassage des végétaux',
                        'dessouchage et rognage de souche d\'arbre au sol avec rogneuse de souche et projection de copeaux de bois',
                        'débroussaillage de terrain et fauchage de broussailles denses à la débroussailleuse thermique avec visière intégrale',
                        'paysagisme et création de massifs paysagers avec plantations d\'arbustes, paillage végétal et allée en dalles'
                    ];
                    return pick(elagageChoices);
                }

                // ── 8. FAÇADE & RAVALEMENT (5 services officiels) ──
                const isFacadeTrade = f.includes('façade') || f.includes('facade') || f.includes('ravalement') || f.includes('crépi') || f.includes('crepi') || f.includes('enduit') || f.includes('fissure') || f.includes('peintre en bâtiment') || f.includes('peinture extérieure') || f.includes('peintre');
                if (isFacadeTrade && !f.includes('couvreur') && !f.includes('toiture')) {
                    const facadeChoices = [
                        'ravalement & nettoyage de façade de maison au jet moyenne pression ou softwash depuis un échafaudage',
                        'rénovation de façade & traitement des fissures avec pose de bande armée et mortier de réparation souple',
                        'enduit de façade taloché ou monocouche à la chaux appliqué à la taloche sur mur extérieur',
                        'peinture de façade extérieure au rouleau professionnel microporeux siloxane/pliolite avec échafaudage',
                        'traitement façade & humidité avec pulvérisation de produit hydrofuge incolore et traitement anti-salpêtre'
                    ];
                    return pick(facadeChoices);
                }

                // ── 9. DÉPANNAGE & REMORQUAGE AUTOMOBILE (4 services officiels) ──
                if (f.includes('dépannage') || f.includes('depannage') || f.includes('remorquage') || f.includes('towing') || f.includes('tow truck') || f.includes('breakdown') || f.includes('batterie') || f.includes('moto')) {
                    const towingChoices = [
                        'remorquage de voiture en panne sur camion dépanneuse plateau avec treuil et gyrophare orange',
                        'remorquage de moto et fixation soignée avec sangles d\'arrimage et bloque-roue sur plateau',
                        'dépannage auto sur le bord de la route avec véhicule d\'assistance routière et technicien en gilet jaune',
                        'dépannage batterie avec booster de démarrage portable ou remplacement de batterie sous le capot ouvert'
                    ];
                    return pick(towingChoices);
                }

                // ── 12. CARRELAGE & REVÊTEMENTS DE SOL (4 services officiels) ──
                if (f.includes('carrelage') || f.includes('carreleur') || f.includes('faïence') || f.includes('faience') || f.includes('tile') || f.includes('tiling') || f.includes('tiler') || f.includes('revêtement de sol') || f.includes('revetement de sol')) {
                    const tileChoices = [
                        'revêtements de sols extérieur (pose de dalles en grès cérame 20mm antidérapant sur terrasse avec peigne à colle et croisillons autonivelants)',
                        'revêtements de sols intérieurs (pose de carrelage grand format au sol intérieur avec mortier-colle, peigne cranté et croisillons nivelants)',
                        'cuisine (pose de carrelage au sol et crédence murale en faïence ou carrelage métro au-dessus du plan de travail)',
                        'salle de bain (pose de carrelage mural, faïence et carrelage de douche à l\'italienne avec niveau laser)'
                    ];
                    return pick(tileChoices);
                }
                // ── 13. PEINTURE INTÉRIEURE & DÉCORATION (5 services officiels) ──
                if (f.includes('peintre') || f.includes('peinture') || f.includes('décoration') || f.includes('decoration') || f.includes('paint') || f.includes('painter') || f.includes('painting')) {
                    const paintChoices = [
                        'peinture sols (application de peinture de sol époxy ou polyuréthane au rouleau avec perche télescopique)',
                        'peinture plafonds (mise en peinture de plafond au rouleau avec perche, peinture blanche mate et bâches au sol)',
                        'peinture murale (mise en peinture intérieure des murs au rouleau microfibres avec pinceau à rechampir et bac)',
                        'peinture de portes (peinture laque satinée de portes intérieures en bois au mini-rouleau et pinceau fin)',
                        'peinture décorative (application d\'enduit décoratif à la chaux ou stuc au platoir inox sur pan de mur)'
                    ];
                    return pick(paintChoices);
                }
                if (f.includes('plombier') || f.includes('plomberie') || f.includes('plumber') || f.includes('plumbing')) {
                    return 'travaux de plomberie';
                }
                // ── 11. DÉBARRAS & ENCOMBRANTS (Services officiels & Situations) ──
                if (f.includes('débarras') || f.includes('debarras') || f.includes('clearance') || f.includes('junk') || f.includes('encombrant') || f.includes('vide maison') || f.includes('vide grenier') || f.includes('diogène') || f.includes('diogene')) {
                    const debarrasChoices = [
                        'débarras de bureaux (déménagement de mobilier de bureau, bureaux démontés et cartons d\'archives sur diable)',
                        'débarras appartement et maison (tri et évacuation de meubles, cartons et objets encombrants avec diables de manutention)',
                        'débarras syndrome de Diogène (techniciens d\'hygiène en combinaison blanche intégrale, masque FFP3 et sacs renforcés)',
                        'débarras de garage ou box (tri d\'outils, étagères métalliques et cartons stockés avec porte de garage ouverte)',
                        'débarras d\'entrepôt (évacuation de palettes bois et rayonnages métalliques avec transpalette manuel)',
                        'débarras d\'archives (tri et manutention de cartons d\'archives professionnels numérotés)',
                        'débarras de combles et grenier (évacuation de malles anciennes, objets stockés sous charpente bois)',
                        'débarras de local commercial (démontage d\'étagères de magasin et mobilier de vente)'
                    ];
                    return pick(debarrasChoices);
                }
                // ── 10. MAÇONNERIE (4 services officiels) ──
                if (f.includes('maçonnerie') || f.includes('maconnerie') || f.includes('maçon') || f.includes('macon') || f.includes('pierre') || f.includes('masonry') || f.includes('mason') || f.includes('brickwork') || f.includes('bâtiment') || f.includes('batiment')) {
                    const maconnerieChoices = [
                        'démolition et reconstruction de mur maçonné par des artisans maçons avec outils pneumatiques et nouveau mur monté au cordeau',
                        'maçonnerie extérieur (construction de muret de clôture, piliers ou muret de terrasse en parpaings avec truelle et niveau à bulle)',
                        'rénovation second-oeuvre (ouverture de mur porteur, pose de poutre IPN, cloisons en béton cellulaire et chape de sol)',
                        'construction et maçonnerie de gros œuvre (élévation de murs porteurs en parpaings, coffrage bois et ferraillage de chaînage)'
                    ];
                    return pick(maconnerieChoices);
                }
                if (f.includes('terrassement') || f.includes('terrassier') || f.includes('excavation') || f.includes('dallage') || f.includes('vrd') || f.includes('assainissement') || f.includes('enrochement') || f.includes('nivellement') || f.includes('viabilisation') || f.includes('drainage') || f.includes('soutènement') || f.includes('soutenement') || f.includes('piscine') || f.includes('paving') || f.includes('driveway') || f.includes('concrete') || f.includes('cement')) {
                    const terrassementChoices = [
                        'travaux de terrassement général et excavation avec mini-pelle de chantier et ouvrier au sol',
                        'nivellement de terrain et régalage de terre avec godet de nivellement sur mini-pelle',
                        'travaux de VRD (Voirie et Réseaux Divers) et pose de gaines techniques dans tranchée ouverte',
                        'viabilisation de terrain avec tranchée technique pour réseaux eau, électricité et tout-à-l\'égout',
                        'assainissement individuel et installation de fosse septique ou micro-station dans excavation',
                        'raccordement aux réseaux publics et pose de canalisations d\'eaux usées dans tranchée',
                        'fouilles en rigole pour fondations de maison avec armatures métalliques de semelles',
                        'drainage de fondations avec pose de tuyau drain perforé, géotextile et gravier concassé',
                        'création de voie d\'accès, allée et parking avec décaissement, géotextile et grave concassée',
                        'construction de mur de soutènement de talus avec blocs de béton ou gabions',
                        'enrochement de talus et pose de gros blocs de roches massives à la pelle mécanique',
                        'terrassement et creusement précis de terrain pour piscine enterrée avec mini-pelle'
                    ];
                    return pick(terrassementChoices);
                }
                return 'travaux de rénovation';
            }

            const detectedTrade = detectMetierFromFiche(task.fiche_nom);
            // Mapping direct des services précis s'ils sont renseignés dans task.travaux
            const exactServiceMap = {
                // ── SITES ÉLAGAGE & PAYSAGISTE (6 services officiels) ──
                'élagage d\'arbre': 'élagage d\'arbre de jardin sur escabeau double ou au sol avec scie d\'élagage',
                'elagage d\'arbre': 'élagage d\'arbre de jardin sur escabeau double ou au sol avec scie d\'élagage',
                'élagage arbre': 'élagage d\'arbre de jardin sur escabeau double de jardin avec scie d\'élagage',
                'elagage arbre': 'élagage d\'arbre de jardin sur escabeau double de jardin avec scie d\'élagage',
                'abattage d\'arbre': 'abattage d\'arbre au sol avec tronçonneuse professionnelle et équipement forestier',
                'abattage arbre': 'abattage d\'arbre au sol avec tronçonneuse professionnelle et équipement forestier',
                'abattage': 'abattage d\'arbre au sol avec tronçonneuse professionnelle et équipement forestier',
                'taille d\'haies': 'taille d\'haies soignée en duo au taille-haie sur escabeau double de jardin',
                'taille d\'haie': 'taille d\'haies soignée en duo au taille-haie sur escabeau double de jardin',
                'taille de haies': 'taille d\'haies soignée en duo au taille-haie sur escabeau double de jardin',
                'taille de haie': 'taille d\'haies soignée en duo au taille-haie sur escabeau double de jardin',
                'dessouchage': 'dessouchage et rognage de souche d\'arbre au sol avec rogneuse de souche',
                'rognage de souche': 'dessouchage et rognage de souche d\'arbre au sol avec rogneuse de souche',
                'débroussaillage': 'débroussaillage de terrain et fauchage de broussailles à la débroussailleuse avec visière intégrale',
                'debroussaillage': 'débroussaillage de terrain et fauchage de broussailles à la débroussailleuse avec visière intégrale',
                'paysagisme': 'paysagisme, création de massifs et aménagement de jardin avec plantations et paillage',
                'aménagement paysager': 'paysagisme, création de massifs et aménagement de jardin avec plantations et paillage',
                'amenagement paysager': 'paysagisme, création de massifs et aménagement de jardin avec plantations et paillage',
                'paysagiste': 'paysagisme, création de massifs et aménagement de jardin avec plantations et paillage',

                // ── SITES COUVERTURE (8 services officiels) ──
                'couverture & pose de toiture': 'travaux de couverture et pose de toiture neuve sur liteaux avec échafaudage de sécurité',
                'couverture et pose de toiture': 'travaux de couverture et pose de toiture neuve sur liteaux avec échafaudage de sécurité',
                'pose de toiture': 'travaux de couverture et pose de toiture neuve sur liteaux',
                'remplacement & réparation de tuiles': 'remplacement et réparation de tuiles en terre cuite sur toiture de maison avec échafaudage',
                'remplacement et réparation de tuiles': 'remplacement et réparation de tuiles en terre cuite sur toiture de maison avec échafaudage',
                'remplacement de tuiles': 'remplacement et réparation de tuiles en terre cuite sur toiture de maison',
                'réparation de tuiles': 'remplacement et réparation de tuiles en terre cuite sur toiture de maison',
                'reparation de tuiles': 'remplacement et réparation de tuiles en terre cuite sur toiture de maison',
                'nettoyage & démoussage de toiture': 'démoussage et nettoyage de toiture au sol avec perche télescopique de pulvérisation',
                'nettoyage et démoussage de toiture': 'démoussage et nettoyage de toiture au sol avec perche télescopique de pulvérisation',
                'traitement hydrofuge & imperméabilisant': 'traitement hydrofuge et imperméabilisant toiture au sol avec perche télescopique',
                'traitement hydrofuge et imperméabilisant': 'traitement hydrofuge et imperméabilisant toiture au sol avec perche télescopique',
                'étanchéité toiture-terrasse': 'étanchéité de toiture-terrasse et toit plat avec membrane EPDM ou bitumineuse',
                'etancheite toiture-terrasse': 'étanchéité de toiture-terrasse et toit plat avec membrane EPDM ou bitumineuse',
                'etancheite toiture terrasse': 'étanchéité de toiture-terrasse et toit plat avec membrane EPDM ou bitumineuse',
                'zinguerie & gouttières': 'travaux de zinguerie, pose de gouttières zinc et solins d\'étanchéité sur toiture',
                'zinguerie et gouttières': 'travaux de zinguerie, pose de gouttières zinc et solins d\'étanchéité sur toiture',
                'zinguerie': 'travaux de zinguerie, pose de gouttières zinc et solins d\'étanchéité',
                'faîtage & rive': 'rénovation et fixation de faîtage et rives de toiture avec mortier ou closoir ventilé',
                'faîtage et rive': 'rénovation et fixation de faîtage et rives de toiture avec mortier ou closoir ventilé',
                'faitage & rive': 'rénovation et fixation de faîtage et rives de toiture avec mortier ou closoir ventilé',
                'faitage et rive': 'rénovation et fixation de faîtage et rives de toiture avec mortier ou closoir ventilé',
                'charpente & ossature bois': 'travaux de charpente et ossature bois de toiture par des charpentiers',
                'charpente et ossature bois': 'travaux de charpente et ossature bois de toiture par des charpentiers',

                // ── SITES FAÇADE & RAVALEMENT (5 services officiels) ──
                'ravalement & nettoyage de façade': 'ravalement et nettoyage de façade de maison au jet moyenne pression ou softwash depuis un échafaudage',
                'ravalement et nettoyage de façade': 'ravalement et nettoyage de façade de maison au jet moyenne pression ou softwash depuis un échafaudage',
                'ravalement & nettoyage de facade': 'ravalement et nettoyage de façade de maison au jet moyenne pression ou softwash depuis un échafaudage',
                'ravalement et nettoyage de facade': 'ravalement et nettoyage de façade de maison au jet moyenne pression ou softwash depuis un échafaudage',
                'ravalement de façade': 'ravalement de façade et application d\'enduit ou crépi neuf depuis un échafaudage',
                'ravalement de facade': 'ravalement de façade et application d\'enduit ou crépi neuf depuis un échafaudage',
                'ravalement': 'ravalement de façade et rénovation de mur extérieur avec échafaudage',
                'rénovation de façade & traitement des fissures': 'rénovation de façade et traitement des fissures avec mortier souple et bande armée',
                'rénovation de façade et traitement des fissures': 'rénovation de façade et traitement des fissures avec mortier souple et bande armée',
                'renovation de facade & traitement des fissures': 'rénovation de façade et traitement des fissures avec mortier souple et bande armée',
                'renovation de facade et traitement des fissures': 'rénovation de façade et traitement des fissures avec mortier souple et bande armée',
                'traitement des fissures': 'traitement des fissures de façade avec pose de bande armée et enduit de rebouchage',
                'traitement fissures': 'traitement des fissures de façade avec pose de bande armée et enduit de rebouchage',
                'enduit de façade': 'application d\'enduit de façade taloché ou monocouche à la chaux sur mur extérieur',
                'enduit de facade': 'application d\'enduit de façade taloché ou monocouche à la chaux sur mur extérieur',
                'enduit': 'application d\'enduit de façade extérieur sur échafaudage',
                'enduit projeté': 'application d\'enduit de façade projeté avec machine à projeter et talochage',
                'enduit taloché': 'application d\'enduit de façade taloché avec taloche éponge sur mur extérieur',
                'peinture de façade': 'peinture de façade extérieure au rouleau spécial maçonnerie avec échafaudage',
                'peinture de facade': 'peinture de façade extérieure au rouleau spécial maçonnerie avec échafaudage',
                'peinture façade': 'peinture de façade extérieure au rouleau sur mur de maison',
                'peinture facade': 'peinture de façade extérieure au rouleau sur mur de maison',
                'traitement façade & humidité': 'traitement hydrofuge et imperméabilisant de façade contre l\'humidité et le salpêtre',
                'traitement façade et humidité': 'traitement hydrofuge et imperméabilisant de façade contre l\'humidité et le salpêtre',
                'traitement facade & humidite': 'traitement hydrofuge et imperméabilisant de façade contre l\'humidité et le salpêtre',
                'traitement facade et humidite': 'traitement hydrofuge et imperméabilisant de façade contre l\'humidité et le salpêtre',
                'traitement humidité': 'traitement de l\'humidité de façade et injection de résine hydrofuge en bas de mur',
                'hydrofuge façade': 'application de traitement hydrofuge incolore et imperméabilisant sur façade de maison',

                // ── SITES NETTOYAGE (7 services officiels) ──
                'nettoyage & démoussage de toiture': 'démoussage et nettoyage de toiture au sol avec perche télescopique de pulvérisation',
                'nettoyage et démoussage de toiture': 'démoussage et nettoyage de toiture au sol avec perche télescopique de pulvérisation',
                'traitement hydrofuge toiture': 'traitement hydrofuge toiture au sol avec perche télescopique',
                'traitement hydrofuge': 'traitement hydrofuge toiture au sol avec perche télescopique',
                'nettoyage de façade': 'nettoyage de façade au jet moyenne pression avec contraste de propreté',
                'nettoyage de facade': 'nettoyage de façade au jet moyenne pression avec contraste de propreté',
                'ravalement de façade': 'ravalement de façade et application d\'enduit ou crépi neuf depuis un échafaudage',
                'ravalement de facade': 'ravalement de façade et application d\'enduit ou crépi neuf depuis un échafaudage',
                'nettoyage panneaux solaires': 'nettoyage de panneaux solaires photovoltaïques à la perche télescopique à eau pure',
                'nettoyage terrasses, allées & dallages': 'nettoyage haute pression de terrasses, allées et dallages avec cloche de lavage de sol',
                'nettoyage terrasses, allées et dallages': 'nettoyage haute pression de terrasses, allées et dallages avec cloche de lavage de sol',
                'nettoyage terrasse': 'nettoyage haute pression de terrasse extérieure en dalles',
                'nettoyage gouttières & chéneaux': 'nettoyage et curage de gouttières et chéneaux avec retrait des débris',
                'nettoyage gouttières et chéneaux': 'nettoyage et curage de gouttières et chéneaux avec retrait des débris',

                // ── SITES VITRIER (6 services officiels) ──
                'dépannage vitrerie d\'urgence': 'dépannage de vitrerie d\'urgence et mise en sécurité avec ventouses de vitrier',
                'depannage vitrerie d\'urgence': 'dépannage de vitrerie d\'urgence et mise en sécurité avec ventouses de vitrier',
                'remplacement de vitre cassée': 'remplacement de vitre cassée et pose de nouveau vitrage dans châssis avec ventouses',
                'remplacement de vitre cassee': 'remplacement de vitre cassée et pose de nouveau vitrage dans châssis avec ventouses',
                'double vitrage et isolation': 'pose et remplacement de double vitrage isolant thermique argon dans fenêtre',
                'double vitrage': 'pose et remplacement de double vitrage isolant thermique argon dans fenêtre',
                'réparation de fenêtre': 'réparation de fenêtre, réglage des charnières, crémone et joints d\'étanchéité',
                'reparation de fenetre': 'réparation de fenêtre, réglage des charnières, crémone et joints d\'étanchéité',
                'vitrine et vitrage de sécurité': 'pose de vitrine de magasin et vitrage feuilleté de sécurité anti-effraction avec ventouses',
                'vitrine et vitrage de securite': 'pose de vitrine de magasin et vitrage feuilleté de sécurité anti-effraction avec ventouses',
                'miroiterie et verre sur mesure': 'travaux de miroiterie et pose de grand miroir mural ou paroi de verre sur mesure',
                'miroiterie': 'travaux de miroiterie et pose de grand miroir mural ou paroi de verre sur mesure',

                // ── SITES CHARPENTE (14 services officiels) ──
                'traitement de charpente': 'traitement curatif et préventif de charpente par injection sous pression contre les insectes xylophages',
                'réparation de charpente': 'réparation de charpente bois, renforts métalliques et remplacement de chevrons abîmés',
                'reparation de charpente': 'réparation de charpente bois, renforts métalliques et remplacement de chevrons abîmés',
                'renforcement & consolidation': 'renforcement et consolidation de charpente avec moises en bois et ferrures acier',
                'renforcement et consolidation': 'renforcement et consolidation de charpente avec moises en bois et ferrures acier',
                'modification de fermette': 'modification de fermette industrielle pour aménagement de combles avec pose d\'entraits porteurs',
                'aménagement de combles': 'aménagement de combles, isolation sous toiture et pose de plancher porteur',
                'amenagement de combles': 'aménagement de combles, isolation sous toiture et pose de plancher porteur',
                'surélévation de toiture': 'surélévation de toiture en ossature bois pour création d\'étage supérieur',
                'surelevation de toiture': 'surélévation de toiture en ossature bois pour création d\'étage supérieur',
                'extension & ossature bois': 'construction d\'extension de maison en ossature bois avec panneaux OSB et pare-pluie',
                'extension et ossature bois': 'construction d\'extension de maison en ossature bois avec panneaux OSB et pare-pluie',
                'charpente traditionnelle': 'fabrication et assemblage de charpente traditionnelle en bois massif avec tenons et mortaises',
                'charpente neuve & levage': 'pose de charpente neuve et levage de fermes à la grue avec charpentiers équipés de harnais',
                'charpente neuve et levage': 'pose de charpente neuve et levage de fermes à la grue avec charpentiers équipés de harnais',
                'plancher, solivage & mezzanine': 'création de plancher, solivage en bois massif et mezzanine par des charpentiers',
                'plancher, solivage et mezzanine': 'création de plancher, solivage en bois massif et mezzanine par des charpentiers',
                'bardage bois & isolation extérieure': 'pose de bardage bois extérieur sur liteaux avec isolation thermique par l\'extérieur',
                'bardage bois et isolation extérieure': 'pose de bardage bois extérieur sur liteaux avec isolation thermique par l\'extérieur',
                'terrasse bois': 'construction de terrasse bois sur lambourdes et plots avec vissage inox',
                'carport, pergola & abris': 'construction de carport, pergola et abri en bois massif dans le jardin',
                'carport, pergola et abris': 'construction de carport, pergola et abri en bois massif dans le jardin',
                'lucarne & fenêtre de toit': 'création de chevêtre et pose de lucarne de toit ou fenêtre de toit Velux',
                'lucarne et fenêtre de toit': 'création de chevêtre et pose de lucarne de toit ou fenêtre de toit Velux',

                // ── SITES ÉTANCHÉITÉ (5 services officiels) ──
                'étanchéité de toit-terrasse & toit plat': 'étanchéité de toit-terrasse et toit plat avec membrane EPDM ou bitumineuse sur toit 100% plat',
                'étanchéité de toit-terrasse et toit plat': 'étanchéité de toit-terrasse et toit plat avec membrane EPDM ou bitumineuse sur toit 100% plat',
                'étanchéité de toit-terrasse': 'étanchéité de toit-terrasse et toit plat avec membrane synthétique EPDM',
                'étanchéité de toit terrasse': 'étanchéité de toit-terrasse et toit plat avec membrane synthétique EPDM',
                'étanchéité toit plat': 'étanchéité de toit plat et toiture-terrasse',
                'etancheite toit terrasse': 'étanchéité de toiture-terrasse et toit plat',
                'recherche de fuite & réparation d\'infiltration': 'recherche de fuite non destructive et réparation d\'infiltration d\'eau sur toiture-terrasse',
                'recherche de fuite et réparation d\'infiltration': 'recherche de fuite non destructive et réparation d\'infiltration d\'eau sur toiture-terrasse',
                'recherche de fuite': 'recherche de fuite et localisation d\'infiltration sur toiture-terrasse',
                'réparation d\'infiltration': 'réparation d\'infiltration d\'eau et patch d\'étanchéité sur toiture-terrasse',
                'reparation d\'infiltration': 'réparation d\'infiltration d\'eau et patch d\'étanchéité sur toiture-terrasse',
                'étanchéité sous carrelage & terrasse carrelée': 'application de résine d\'étanchéité liquide SEL et bandes d\'armature sous carrelage de terrasse',
                'étanchéité sous carrelage et terrasse carrelée': 'application de résine d\'étanchéité liquide SEL et bandes d\'armature sous carrelage de terrasse',
                'étanchéité sous carrelage': 'étanchéité sous carrelage avec résine d\'étanchéité liquide SEL',
                'etancheite sous carrelage': 'étanchéité sous carrelage avec résine d\'étanchéité liquide SEL',
                'réfection complète d\'étanchéité': 'réfection complète d\'étanchéité de toiture-terrasse avec complexe multicouche neuf et couvertines',
                'refection complete d\'etancheite': 'réfection complète d\'étanchéité de toiture-terrasse avec complexe multicouche neuf et couvertines',
                'étanchéité & isolation de toiture-terrasse': 'étanchéité et isolation thermique de toiture-terrasse avec panneaux isolants et membrane bicouche',
                'étanchéité et isolation de toiture-terrasse': 'étanchéité et isolation thermique de toiture-terrasse avec panneaux isolants et membrane bicouche',
                // ── SITES MAÇONNERIE (4 services officiels) ──
                'démolition et reconstruction': 'démolition et reconstruction de mur maçonné avec marteau-piqueur/burineur et nouveau mur au mortier',
                'demolition et reconstruction': 'démolition et reconstruction de mur maçonné avec marteau-piqueur/burineur et nouveau mur au mortier',
                'démolition & reconstruction': 'démolition et reconstruction de mur maçonné avec marteau-piqueur/burineur et nouveau mur au mortier',
                'demolition & reconstruction': 'démolition et reconstruction de mur maçonné avec marteau-piqueur/burineur et nouveau mur au mortier',
                'maçonnerie extérieur': 'maçonnerie extérieure, pose de parpaings et construction de muret avec truelle et niveau',
                'maçonnerie extérieure': 'maçonnerie extérieure, pose de parpaings et construction de muret avec truelle et niveau',
                'maconnerie exterieur': 'maçonnerie extérieure, pose de parpaings et construction de muret avec truelle et niveau',
                'maconnerie exterieure': 'maçonnerie extérieure, pose de parpaings et construction de muret avec truelle et niveau',
                'maçonnerie': 'maçonnerie extérieure, pose de parpaings et construction de muret avec truelle et niveau',
                'maconnerie': 'maçonnerie extérieure, pose de parpaings et construction de muret avec truelle et niveau',
                'rénovation second-oeuvre': 'rénovation second-œuvre, ouverture de mur porteur, pose de poutre IPN et cloisons intérieures',
                'renovation second-oeuvre': 'rénovation second-œuvre, ouverture de mur porteur, pose de poutre IPN et cloisons intérieures',
                'rénovation second-œuvre': 'rénovation second-œuvre, ouverture de mur porteur, pose de poutre IPN et cloisons intérieures',
                'renovation second oeuvre': 'rénovation second-œuvre, ouverture de mur porteur, pose de poutre IPN et cloisons intérieures',
                'rénovation second oeuvre': 'rénovation second-œuvre, ouverture de mur porteur, pose de poutre IPN et cloisons intérieures',
                'construction': 'travaux de construction et maçonnerie générale de gros œuvre avec coffrage et ferraillage',
                'construction neuve': 'travaux de construction neuve et maçonnerie générale de gros œuvre',
                'construction maçonnerie': 'travaux de construction et maçonnerie générale de gros œuvre',

                // ── SITES DÉPANNAGE & REMORQUAGE AUTO (4 services officiels) ──
                'remorquage de voiture': 'remorquage de voiture en panne et chargement sur dépanneuse plateau avec treuil',
                'remorquage voiture': 'remorquage de voiture en panne et chargement sur dépanneuse plateau avec treuil',
                'remorquage auto': 'remorquage automobile sur camion plateau avec gyrophare orange',
                'remorquage': 'remorquage de véhicule sur camion dépanneuse plateau',
                'remorquage de moto': 'remorquage de moto avec sangles d\'arrimage et bloque-roue sur plateau de dépanneuse',
                'remorquage moto': 'remorquage de moto avec sangles d\'arrimage et bloque-roue sur plateau de dépanneuse',
                'dépannage moto': 'dépannage et transport de moto sur camion d\'assistance',
                'depannage moto': 'dépannage et transport de moto sur camion d\'assistance',
                'transport moto': 'transport et remorquage de moto sur remorque plateau',
                'dépannage auto': 'dépannage automobile sur le bord de la route avec véhicule d\'assistance et technicien en gilet jaune',
                'depannage auto': 'dépannage automobile sur le bord de la route avec véhicule d\'assistance et technicien en gilet jaune',
                'dépannage automobile': 'dépannage automobile sur le bord de la route avec véhicule d\'assistance et technicien en gilet jaune',
                'assistance routière': 'assistance routière et dépannage auto sur le bord de la route',
                'dépannage batterie': 'dépannage de batterie de voiture avec booster de démarrage portable ou remplacement sous le capot',
                'depannage batterie': 'dépannage de batterie de voiture avec booster de démarrage portable ou remplacement sous le capot',
                'démarrage batterie': 'démarrage de batterie avec câbles de démarrage ou booster portable',
                'demarrage batterie': 'démarrage de batterie avec câbles de démarrage ou booster portable',
                'changement de batterie': 'remplacement et installation de batterie neuve sous le capot de voiture',

                // ── SITES DÉBARRAS (Services officiels & Situations) ──
                'débarras bureaux': 'débarras de mobilier de bureau, bureaux démontés et cartons avec diables de manutention',
                'debarras bureaux': 'débarras de mobilier de bureau, bureaux démontés et cartons avec diables de manutention',
                'débarras bureau': 'débarras de bureau, mobilier et équipement de travail',
                'debarras bureau': 'débarras de bureau, mobilier et équipement de travail',
                'débarras de bureaux': 'débarras de locaux professionnels et bureaux avec manutention de cartons',
                'debarras de bureaux': 'débarras de locaux professionnels et bureaux avec manutention de cartons',
                'débarras appartement': 'débarras complet d\'appartement, meubles anciens et cartons transportés par des déménageurs',
                'debarras appartement': 'débarras complet d\'appartement, meubles anciens et cartons transportés par des déménageurs',
                'débarras d\'appartement': 'débarras d\'appartement avec tri de meubles et cartons sur diable',
                'debarras d\'appartement': 'débarras d\'appartement avec tri de meubles et cartons sur diable',
                'débarras maison': 'débarras complet de maison, tri d\'objets encombrants et cartons de déménagement',
                'debarras maison': 'débarras complet de maison, tri d\'objets encombrants et cartons de déménagement',
                'débarras logement': 'débarras et désencombrement de logement d\'habitation',
                'debarras logement': 'débarras et désencombrement de logement d\'habitation',
                'autres débarras': 'débarras général, tri d\'encombrants et évacuation d\'objets volumineux',
                'autres debarras': 'débarras général, tri d\'encombrants et évacuation d\'objets volumineux',
                'débarras syndrome de diogène': 'débarras extrême syndrome de Diogène avec techniciens en combinaison blanche et masques FFP3',
                'debarras syndrome de diogene': 'débarras extrême syndrome de Diogène avec techniciens en combinaison blanche et masques FFP3',
                'débarras diogène': 'débarras et nettoyage Diogène avec techniciens en combinaison de protection intégrale',
                'debarras diogene': 'débarras et nettoyage Diogène avec techniciens en combinaison de protection intégrale',
                'débarras de garage ou box': 'débarras de garage et box de stockage avec tri d\'outils, rayonnages et cartons',
                'debarras de garage ou box': 'débarras de garage et box de stockage avec tri d\'outils, rayonnages et cartons',
                'débarras de garage': 'débarras de garage avec tri d\'outils, rayonnages et cartons',
                'debarras de garage': 'débarras de garage avec tri d\'outils, rayonnages et cartons',
                'débarras garage': 'débarras de garage avec tri d\'outils, rayonnages et cartons',
                'debarras garage': 'débarras de garage avec tri d\'outils, rayonnages et cartons',
                'débarras box': 'débarras de box de stockage et cave',
                'debarras box': 'débarras de box de stockage et cave',
                'débarras d\'entrepôt': 'débarras d\'entrepôt et local industriel avec palettes et transpalette manuel',
                'debarras d\'entrepot': 'débarras d\'entrepôt et local industriel avec palettes et transpalette manuel',
                'débarras entrepôt': 'débarras d\'entrepôt avec palettes bois et étagères industrielles',
                'debarras entrepot': 'débarras d\'entrepôt avec palettes bois et étagères industrielles',
                'débarras d\'archives': 'débarras et manutention de boîtes d\'archives professionnelles numérotées',
                'debarras d\'archives': 'débarras et manutention de boîtes d\'archives professionnelles numérotées',
                'débarras archives': 'débarras et tri d\'archives d\'entreprise avec cartons d\'archives',
                'debarras archives': 'débarras et tri d\'archives d\'entreprise avec cartons d\'archives',
                'débarras de chantier': 'débarras de chantier et évacuation de gravats, plaques de plâtre et chutes de bois',
                'debarras de chantier': 'débarras de chantier et évacuation de gravats, plaques de plâtre et chutes de bois',
                'débarras chantier': 'débarras de chantier avec évacuation de gravats en sacs renforcés',
                'debarras chantier': 'débarras de chantier avec évacuation de gravats en sacs renforcés',
                'débarras de matériel informatique': 'débarras et recyclage de matériel informatique, écrans et unités centrales',
                'debarras de materiel informatique': 'débarras et recyclage de matériel informatique, écrans et unités centrales',
                'débarras informatique': 'débarras de matériel informatique et serveurs',
                'debarras informatique': 'débarras de matériel informatique et serveurs',
                'débarras de jardin': 'débarras de jardin et évacuation de déchets verts, vieux mobilier et abris démontés',
                'debarras de jardin': 'débarras de jardin et évacuation de déchets verts, vieux mobilier et abris démontés',
                'débarras jardin': 'débarras de jardin et évacuation d\'encombrants extérieurs',
                'debarras jardin': 'débarras de jardin et évacuation d\'encombrants extérieurs',
                'débarras de local commercial': 'débarras de local commercial, démontage de présentoirs et rayonnages de magasin',
                'debarras de local commercial': 'débarras de local commercial, démontage de présentoirs et rayonnages de magasin',
                'débarras local commercial': 'débarras de local commercial et mobilier de boutique',
                'debarras local commercial': 'débarras de local commercial et mobilier de boutique',
                'débarras de combles': 'débarras de combles et grenier sous charpente bois avec cartons et malles anciennes',
                'debarras de combles': 'débarras de combles et grenier sous charpente bois avec cartons et malles anciennes',
                'débarras combles': 'débarras de combles sous toiture avec malles et cartons anciens',
                'debarras combles': 'débarras de combles sous toiture avec malles et cartons anciens',
                'débarras grenier': 'débarras de grenier sous charpente avec cartons et objets anciens',
                'debarras grenier': 'débarras de grenier sous charpente avec cartons et objets anciens',
                'débarras industriel': 'débarras industriel avec tri de ferrailles et pièces d\'atelier',
                'debarras industriel': 'débarras industriel avec tri de ferrailles et pièces d\'atelier',
                'débarras de véhicule': 'débarras et évacuation de véhicule hors d\'usage avec dépanneuse',
                'debarras de vehicule': 'débarras et évacuation de véhicule hors d\'usage avec dépanneuse',
                'débarras de matériaux dangereux': 'débarras de matériaux dangereux avec techniciens en équipement spécialisé',
                'debarras de materiaux dangereux': 'débarras de matériaux dangereux avec techniciens en équipement spécialisé',

                // ── SITES CARRELAGE (4 services officiels) ──
                'revêtements de sols extérieur': 'pose de carrelage et revêtements de sol extérieur antidérapant en grès cérame sur terrasse',
                'revetements de sols exterieur': 'pose de carrelage et revêtements de sol extérieur antidérapant en grès cérame sur terrasse',
                'revêtements de sols extérieurs': 'pose de carrelage et revêtements de sol extérieur antidérapant sur terrasse',
                'revetements de sols exterieurs': 'pose de carrelage et revêtements de sol extérieur antidérapant sur terrasse',
                'revêtement de sol extérieur': 'pose de carrelage et revêtement de sol extérieur sur terrasse',
                'revetement de sol exterieur': 'pose de carrelage et revêtement de sol extérieur sur terrasse',
                'carrelage extérieur': 'pose de carrelage extérieur antidérapant sur terrasse',
                'carrelage exterieur': 'pose de carrelage extérieur antidérapant sur terrasse',
                'revêtements de sols intérieurs': 'pose de carrelage grand format et revêtements de sol intérieur avec peigne cranté et croisillons nivelants',
                'revetements de sols interieurs': 'pose de carrelage grand format et revêtements de sol intérieur avec peigne cranté et croisillons nivelants',
                'revêtements de sols intérieur': 'pose de carrelage grand format au sol intérieur avec croisillons autonivelants',
                'revetements de sols interieur': 'pose de carrelage grand format au sol intérieur avec croisillons autonivelants',
                'revêtement de sol intérieur': 'pose de carrelage grand format au sol intérieur avec croisillons autonivelants',
                'revetement de sol interieur': 'pose de carrelage grand format au sol intérieur avec croisillons autonivelants',
                'carrelage intérieur': 'pose de carrelage de sol intérieur avec mortier-colle et croisillons nivelants',
                'carrelage interieur': 'pose de carrelage de sol intérieur avec mortier-colle et croisillons nivelants',
                'carrelage sol': 'pose de carrelage au sol intérieur avec mortier-colle',
                'cuisine': 'pose de carrelage au sol de cuisine et crédence murale en faïence au-dessus du plan de travail',
                'carrelage cuisine': 'pose de carrelage au sol et crédence de cuisine au-dessus du plan de travail',
                'crédence cuisine': 'pose de crédence de cuisine en faïence ou carrelage métro avec peigne à colle',
                'credence cuisine': 'pose de crédence de cuisine en faïence ou carrelage métro avec peigne à colle',
                'faïence cuisine': 'pose de faïence murale de cuisine au-dessus du plan de travail',
                'faience cuisine': 'pose de faïence murale de cuisine au-dessus du plan de travail',
                'salle de bain': 'pose de carrelage mural, faïence et carrelage de douche à l\'italienne avec niveau laser',
                'carrelage salle de bain': 'pose de carrelage et faïence dans salle de bain et douche à l\'italienne',
                'faïence salle de bain': 'pose de faïence murale et carrelage de salle de bain avec croisillons',
                'faience salle de bain': 'pose de faïence murale et carrelage de salle de bain avec croisillons',
                'douche à l\'italienne': 'pose de carrelage et étanchéité de douche à l\'italienne avec receveur carrelé',
                'douche a l\'italienne': 'pose de carrelage et étanchéité de douche à l\'italienne avec receveur carrelé',

                // ── SITES PEINTURE (5 services officiels) ──
                'peinture sols': 'application de peinture de sol époxy ou polyuréthane au rouleau avec perche télescopique',
                'peinture sol': 'application de peinture de sol époxy ou polyuréthane au rouleau avec perche télescopique',
                'peinture de sols': 'application de peinture de sol résistante au rouleau',
                'peinture de sol': 'application de peinture de sol résistante au rouleau',
                'peinture plafonds': 'mise en peinture de plafond au rouleau avec perche, peinture blanche mate et bâches de protection',
                'peinture plafond': 'mise en peinture de plafond au rouleau avec perche et peinture blanche mate',
                'peinture de plafonds': 'mise en peinture de plafond au rouleau avec peinture blanche mate',
                'peinture de plafond': 'mise en peinture de plafond au rouleau avec peinture blanche mate',
                'peinture murale': 'mise en peinture intérieure des murs au rouleau microfibres avec pinceau à rechampir et bac à peinture',
                'peinture mur': 'mise en peinture intérieure de mur avec rouleau et pinceau à rechampir',
                'peinture murs': 'mise en peinture intérieure des murs au rouleau avec protections',
                'peinture de murs': 'mise en peinture intérieure des murs au rouleau avec protections',
                'peinture intérieure': 'mise en peinture intérieure des murs et plafonds avec finitions soignées',
                'peinture interieure': 'mise en peinture intérieure des murs et plafonds avec finitions soignées',
                'peinture de portes': 'peinture laque satinée de portes intérieures en bois au mini-rouleau et pinceau de précision',
                'peinture portes': 'peinture laque satinée de portes intérieures au mini-rouleau',
                'peinture porte': 'peinture laque satinée de porte intérieure au mini-rouleau',
                'peinture boiseries': 'peinture soignée de portes et plinthes intérieures',
                'peinture décorative': 'application d\'enduit décoratif stuc ou effet chaux au platoir inox sur pan de mur intérieur',
                'peinture decorative': 'application d\'enduit décoratif stuc ou effet chaux au platoir inox sur pan de mur intérieur',
                'peinture décoration': 'application de peinture décorative à effet de matière avec platoir ou spalter',
                'peinture decoration': 'application de peinture décorative à effet de matière avec platoir ou spalter',

                // ── AUTRES MÉTIERS (Terrassement, Gouttières, etc.) ──
                'terrassement': 'travaux de terrassement général et excavation avec mini-pelle de chantier',
                'nivellement de terrain': 'nivellement de terrain et régalage de terre avec godet de nivellement sur mini-pelle',
                'vrd': 'travaux de VRD (Voirie et Réseaux Divers) et pose de gaines techniques dans tranchée ouverte',
                'viabilisation de terrain': 'viabilisation de terrain avec tranchée technique pour réseaux eau, électricité et tout-à-l\'égout',
                'assainissement individuel': 'assainissement individuel et installation de fosse septique ou micro-station dans excavation',
                'raccordement': 'raccordement aux réseaux publics et pose de canalisations dans tranchée technique',
                'fondations': 'fouilles en rigole pour fondations de maison avec armatures de ferraillage',
                'drainage': 'drainage de fondations avec pose de tuyau drain perforé, géotextile et gravier concassé',
                'voie d\'accès, allées et parking': 'création de voie d\'accès, allée et parking avec décaissement, géotextile et empierrement',
                'voie d\'accès': 'création de voie d\'accès et allée avec décaissement et empierrement concassé',
                'murs de soutènement': 'construction de mur de soutènement de talus en blocs béton ou gabions',
                'enrochement': 'enrochement de talus et pose de gros blocs de roches massives à la pelle mécanique',
                'terrassement pour piscine': 'terrassement et creusement précis de terrain pour piscine enterrée avec mini-pelle',
                'nettoyage & curage de gouttières': 'nettoyage et curage de gouttières avec retrait des feuilles et rinçage',
                'nettoyage et curage de gouttières': 'nettoyage et curage de gouttières avec retrait des feuilles et rinçage',
                'nettoyage gouttières': 'nettoyage et curage de gouttières avec retrait manuel des feuilles',
                'nettoyage gouttieres': 'nettoyage et curage de gouttières avec retrait manuel des feuilles',
                'débouchage de gouttières & descentes d\'eaux pluviales': 'débouchage de gouttières et descentes d\'eaux pluviales avec furet et vérification d\'écoulement',
                'débouchage de gouttières': 'débouchage de gouttières et descentes d\'eaux pluviales',
                'nettoyage de chéneaux': 'nettoyage et curage complet de chéneaux encastrés sur toiture de maison ou immeuble',
                'nettoyage de chenaux': 'nettoyage et curage complet de chéneaux encastrés sur toiture de maison ou immeuble',
                'réparation de gouttières & fuites': 'réparation de gouttières, reprise de fuites de joints et refixation de crochets',
                'reparation de gouttieres': 'réparation de gouttières et reprise d\'étanchéité de joints',
                'pose de protège-gouttières & filets anti-feuilles': 'pose de protège-gouttières, grilles pare-feuilles et crapaudines anti-débris',
                'pose de protège-gouttières': 'pose de protège-gouttières et grilles anti-feuilles',
                'pose de protege gouttieres': 'pose de protège-gouttières et grilles anti-feuilles',
                'pose & remplacement de gouttières': 'pose et remplacement de gouttières neuves en zinc ou PVC avec réglage des pentes',
                'pose et remplacement de gouttières': 'pose et remplacement de gouttières neuves en zinc ou PVC avec réglage des pentes',
                'pose de gouttières': 'pose et remplacement de gouttières neuves avec réglage des pentes',
                'gouttières cuivre': 'pose haut de gamme de gouttières en cuivre avec soudures soignées',
                'gouttieres cuivre': 'pose haut de gamme de gouttières en cuivre avec soudures soignées',
                'pose de descentes d\'eaux pluviales': 'pose de tuyaux de descentes d\'eaux pluviales avec colliers muraux et dauphin fonte',
                'pose de descentes': 'pose de descentes d\'eaux pluviales le long de la façade'
            };

            const tNorm = (task.travaux || '').toLowerCase().trim();
            let matchedExactService = null;
            for (const [sKey, sLabel] of Object.entries(exactServiceMap)) {
                if (tNorm.includes(sKey)) {
                    matchedExactService = sLabel;
                    break;
                }
            }

            // Priorité absolue au service précis de la tâche s'il existe, sinon au métier réel de la Fiche GMB
            let travauxLabel = matchedExactService || detectedTrade;
            if (!travauxLabel || travauxLabel === 'travaux d\'artisanat et d\'entretien') {
                travauxLabel = task.travaux || task.metier || 'travaux d\'artisanat';
            }

            // Règle du nombre d'ouvriers :
            // Taille de haies : exactement 2 ouvriers en duo
            // Débroussaillage / Dessouchage : 2 ouvriers (1 opérateur et 1 assistant)
            // Nettoyage terrasse / vitrerie simple : 1 artisan solo (ou 2 pour double vitrage/vitrine)
            // Nettoyage façade / toiture : 1 à 2 ouvriers (50% solo / 50% duo)
            // Extérieurs lourds à risque (couverture, charpente, élagage, abattage, maçonnerie, terrassement) : 70% 2 ouvriers / 30% 3 ouvriers.
            // Chantiers d'intérieur : 60% 1 artisan solo / 40% 2 artisans.
            const metierText = ((task.metier || '') + ' ' + (task.travaux || '') + ' ' + (task.fiche_nom || '') + ' ' + travauxLabel).toLowerCase();
            const randWorker = Math.random();
            let nbOuvriers = '1 ou 2 artisans';

            if (metierText.includes('haie') || metierText.includes('taille')) {
                nbOuvriers = 'exactement 2 ouvriers en duo';
            } else if (metierText.includes('debroussaillage') || metierText.includes('débroussaillage') || metierText.includes('dessouchage')) {
                nbOuvriers = '2 ouvriers (1 opérateur et 1 assistant au sol)';
            } else if (metierText.includes('double vitrage') || metierText.includes('vitrine')) {
                nbOuvriers = '2 artisans vitriers';
            } else if (metierText.includes('terrasse') || metierText.includes('patio')) {
                nbOuvriers = randWorker < 0.85 ? '1 artisan solo' : '2 artisans';
            } else if (metierText.includes('facade') || metierText.includes('façade') || metierText.includes('ravalement')) {
                nbOuvriers = randWorker < 0.50 ? '1 artisan solo' : '2 artisans';
            } else if (metierText.includes('demoussage') || metierText.includes('démoussage') || (metierText.includes('nettoyage') && metierText.includes('toiture'))) {
                nbOuvriers = randWorker < 0.50 ? '1 artisan solo' : '2 artisans';
            } else if (['couvreur', 'couverture', 'elagage', 'élagage', 'abattage', 'charpente', 'maconnerie', 'maçonnerie', 'terrassement'].some(k => metierText.includes(k))) {
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
            
            // Header de reset de contexte ultra-strict — force DALL-E 3 à ignorer les images précédentes du fil unique
            let contextReset = "🔴 NOUVELLE DEMANDE INDÉPENDANTE — IGNORE TOTALEMENT TOUTES LES IMAGES PRÉCÉDENTES DE CE FIL DE DISCUSSION.\nTHIS IS A COMPLETELY NEW AND INDEPENDENT PHOTO. DO NOT REUSE ANY PREVIOUS SCENE OR TRADE.\n\n";
            if (lowerLabel.includes('vitrier') || lowerLabel.includes('vitrerie') || lowerLabel.includes('vitre') || lowerLabel.includes('vitrage') || lowerLabel.includes('fenêtre') || lowerLabel.includes('fenetre') || lowerLabel.includes('miroir') || lowerLabel.includes('miroiterie')) {
                contextReset += "THIS IMAGE MUST SHOW EXCLUSIVELY: GLAZIER & GLASS WORK (VITRERIE, REMPLACEMENT DE VITRAGE, DOUBLE VITRAGE, RÉPARATION DE FENÊTRE, VITRINE DE SÉCURITÉ OU MIROITERIE).\n";
                negativeConstraint = "\n\n❌ INTERDICTION ABSOLUE : AUCUN toit, AUCUN couvreur, AUCUN arbre, AUCUN jardinier, AUCUN casque de chantier lourd pour les travaux intérieurs. Les ventouses de vitrier DOIVENT être fermement tenues par les mains de l'artisan sur le verre.";
            } else if (lowerLabel.includes('charpente') || lowerLabel.includes('fermette') || lowerLabel.includes('comble') || lowerLabel.includes('surélévation') || lowerLabel.includes('surelevation') || lowerLabel.includes('ossature bois') || lowerLabel.includes('solivage') || lowerLabel.includes('mezzanine') || lowerLabel.includes('bardage') || lowerLabel.includes('pergola') || lowerLabel.includes('carport') || lowerLabel.includes('lucarne')) {
                contextReset += "THIS IMAGE MUST SHOW EXCLUSIVELY: CARPENTRY & TIMBER STRUCTURE (CHARPENTE BOIS, OSSATURE BOIS, FERMETTE, COMBLES, SURÉLÉVATION, BARDAGE, MEZZANINE, TERRASSE BOIS OU CARPORT).\n";
                negativeConstraint = "\n\n❌ INTERDICTION ABSOLUE : AUCUN jardinier, AUCUN sécateur, AUCUN taille-haie, AUCUNE dépanneuse. UNIQUEMENT des travaux de charpente, menuiserie et structures bois par des charpentiers qualifiés avec harnais et échafaudages sécurisés.";
            } else if (lowerLabel.includes('démoussage') || lowerLabel.includes('nettoyage toiture') || (lowerLabel.includes('nettoyage') && lowerLabel.includes('toiture')) || lowerLabel.includes('panneau') || lowerLabel.includes('solaire') || lowerLabel.includes('allée') || lowerLabel.includes('allee') || lowerLabel.includes('dallage')) {
                contextReset += "THIS IMAGE MUST SHOW EXCLUSIVELY: EXTERIOR CLEANING (NETTOYAGE TOITURE, FAÇADE, TERRASSE, PANNEAUX SOLAIRES OU GOUTTIÈRES).\n";
                negativeConstraint = "\n\n❌ INTERDICTION ABSOLUE : AUCUN arbre coupé, AUCUN élagage, AUCUN marteau-piqueur, AUCUNE démolition. Nettoyage basse/haute pression, perche télescopique au sol ou cloche de lavage de sol.";
            } else if (lowerLabel.includes('étanchéité') || lowerLabel.includes('etancheite') || lowerLabel.includes('toit plat') || lowerLabel.includes('toiture terrasse') || lowerLabel.includes('terrasse toit plat') || lowerLabel.includes('pvc') || lowerLabel.includes('infiltration') || lowerLabel.includes('fuite') || lowerLabel.includes('sel') || lowerLabel.includes('carrelée') || lowerLabel.includes('carrelee') || lowerLabel.includes('réfection') || lowerLabel.includes('refection')) {
                contextReset += "THIS IMAGE MUST SHOW EXCLUSIVELY: FLAT ROOF WATERPROOFING, LEAK REPAIR OR UNDER-TILE SEALING (ÉTANCHÉITÉ TOIT PLAT / TOITURE-TERRASSE, ISOLATION THERMIQUE, RECHERCHE DE FUITE OU RÉSINE SOUS CARRELAGE).\n";
                negativeConstraint = "\n\n❌ INTERDICTION ABSOLUE : PAS d'arbre, AUCUN jardinier, AUCUN sécateur, AUCUN escabeau dans le jardin, AUCUNE débroussailleuse, AUCUN toit en pente avec tuiles, AUCUNE dépanneuse ! Le toit ou la terrasse DOIT ÊTRE 100% PLAT (toiture terrasse ou terrasse avec membrane bitumineuse noire/grise soudée au chalumeau, EPDM, PVC ou résine liquide).";
            } else if (lowerLabel.includes('façade') || lowerLabel.includes('facade') || lowerLabel.includes('ravalement') || lowerLabel.includes('crépi') || lowerLabel.includes('crepi') || lowerLabel.includes('enduit') || lowerLabel.includes('fissure') || (lowerLabel.includes('peinture') && lowerLabel.includes('extérieure')) || (lowerLabel.includes('traitement') && lowerLabel.includes('humidité'))) {
                contextReset += "THIS IMAGE MUST SHOW EXCLUSIVELY: FACADE RENOVATION, CRACK REPAIR, RENDERING, EXTERIOR PAINTING OR ANTI-HUMIDITY TREATMENT (RAVALEMENT, RÉNOVATION DE FAÇADE, TRAITEMENT DES FISSURES, ENDUIT DE FAÇADE, PEINTURE DE FAÇADE OU TRAITEMENT HUMIDITÉ).\n";
                negativeConstraint = "\n\n❌ INTERDICTION ABSOLUE : AUCUN jardinier, AUCUNE débroussailleuse, AUCUNE tondeuse, AUCUN élagage d'arbre, AUCUN sécateur, AUCUN toit en tuiles, AUCUNE dépanneuse. UNIQUEMENT des façadiers/peintres travaillant sur les murs extérieurs de la maison avec échafaudage sécurisé, taloche, rouleau de peinture ou nettoyeur façade au sol.";
            } else if (lowerLabel.includes('couvreur') || lowerLabel.includes('toiture') || lowerLabel.includes('couverture') || lowerLabel.includes('tuile') || lowerLabel.includes('faîtage') || lowerLabel.includes('faitage') || lowerLabel.includes('rive') || lowerLabel.includes('zinguerie')) {
                contextReset += "THIS IMAGE MUST SHOW EXCLUSIVELY: ROOFER WORKING ON ROOF TILES (ARTISAN COUVREUR SUR TOITURE EN TUILES).\n";
                negativeConstraint = "\n\n❌ INTERDICTION ABSOLUE : AUCUN arbre, AUCUN sécateur, AUCUN jardinier, AUCUN élagage, AUCUNE grande échelle instable posée sur la pente du toit. Artisans couvreurs sur échafaudage de sécurité ou au sol.";
            } else if (lowerLabel.includes('élagage') || lowerLabel.includes('elagage') || lowerLabel.includes('abattage') || lowerLabel.includes('émondage') || lowerLabel.includes('haie') || lowerLabel.includes('jardin') || lowerLabel.includes('paysag') || lowerLabel.includes('dessouch') || lowerLabel.includes('débroussaill') || lowerLabel.includes('debroussaill')) {
                contextReset += "THIS IMAGE MUST SHOW EXCLUSIVELY: TREE PRUNING, FELLING, HEDGE TRIMMING, BRUSH CLEARING OR LANDSCAPING IN GARDEN (ÉLAGAGE D'ARBRE, ABATTAGE D'ARBRE, TAILLE D'HAIES, DESSOUCHAGE, DÉBROUSSAILLAGE OU PAYSAGISME).\n";
                negativeConstraint = "\n\n❌ INTERDICTION ABSOLUE : AUCUN toit, AUCUNE toiture, AUCUN couvreur, AUCUN nettoyeur haute pression sur tuiles, AUCUNE dépanneuse. UNIQUEMENT des jardiniers/élagueurs travaillant au sol ou sur escabeau dans un jardin avec pelouse et végétation.";
            } else if (lowerLabel.includes('maçonnerie') || lowerLabel.includes('maconnerie') || lowerLabel.includes('maçon') || lowerLabel.includes('macon') || lowerLabel.includes('démolition') || lowerLabel.includes('demolition') || lowerLabel.includes('parpaing') || lowerLabel.includes('second-oeuvre') || lowerLabel.includes('second oeuvre') || (lowerLabel.includes('construction') && !lowerLabel.includes('bois'))) {
                contextReset += "THIS IMAGE MUST SHOW EXCLUSIVELY: MASONRY & BUILDING CONSTRUCTION (DÉMOLITION ET RECONSTRUCTION, MAÇONNERIE EXTÉRIEURE, RÉNOVATION SECOND-OEUVRE OU CONSTRUCTION GROS OEUVRE).\n";
                negativeConstraint = "\n\n❌ INTERDICTION ABSOLUE : AUCUN toit, AUCUN couvreur posant des tuiles, AUCUN élagage d'arbre, AUCUNE dépanneuse. UNIQUEMENT des maçons professionnels travaillant avec parpaings, béton, mortier, truelles, niveau à bulle, échafaudage de maçonnerie sécurisé ou au sol.";
            } else if (lowerLabel.includes('dépannage') || lowerLabel.includes('depannage') || lowerLabel.includes('remorquage') || lowerLabel.includes('auto') || lowerLabel.includes('voiture') || lowerLabel.includes('moto') || lowerLabel.includes('batterie') || lowerLabel.includes('towing') || lowerLabel.includes('breakdown')) {
                contextReset += "THIS IMAGE MUST SHOW EXCLUSIVELY: ROADSIDE BREAKDOWN ASSISTANCE & VEHICLE TOWING (REMORQUAGE DE VOITURE, REMORQUAGE DE MOTO, DÉPANNAGE AUTO SUR PLACE OU DÉPANNAGE BATTERIE).\n";
                negativeConstraint = "\n\n❌ INTERDICTION ABSOLUE : AUCUN toit, AUCUNE toiture, AUCUN élagage d'arbre, AUCUN couvreur, AUCUN maçon. UNIQUEMENT dépanneuse à plateau, technicien avec gilet haute visibilité jaune fluo, véhicule d'assistance routière ou dépannage de batterie sur bord de route sécurisé.";
            } else if (lowerLabel.includes('débarras') || lowerLabel.includes('debarras') || lowerLabel.includes('diogène') || lowerLabel.includes('diogene') || lowerLabel.includes('encombrant') || lowerLabel.includes('vide maison') || lowerLabel.includes('vide grenier') || lowerLabel.includes('clearance')) {
                contextReset += "THIS IMAGE MUST SHOW EXCLUSIVELY: PROPERTY & WASTE CLEARANCE / DECLUTTERING (DÉBARRAS BUREAUX, APPARTEMENT, MAISON, GARAGE, ENTREPÔT, ARCHIVES, COMBLES, OU SYNDROME DE DIOGÈNE).\n";
                negativeConstraint = "\n\n❌ INTERDICTION ABSOLUE : AUCUN toit, AUCUN couvreur posant des tuiles, AUCUN élagage d'arbre, AUCUN engin de terrassement lourd. UNIQUEMENT des professionnels du débarras/déménagement avec diables de manutention, cartons empilés, meubles protégés ou techniciens en tenue de protection blanche pour le syndrome de Diogène.";
            } else if (lowerLabel.includes('carrelage') || lowerLabel.includes('carreleur') || lowerLabel.includes('faïence') || lowerLabel.includes('faience') || lowerLabel.includes('revêtement de sol') || lowerLabel.includes('revetement de sol') || lowerLabel.includes('crédence') || lowerLabel.includes('credence') || (lowerLabel.includes('douche') && lowerLabel.includes('italienne'))) {
                contextReset += "THIS IMAGE MUST SHOW EXCLUSIVELY: TILING & FLOOR/WALL COVERINGS (REVÊTEMENTS DE SOLS EXTÉRIEUR, REVÊTEMENTS DE SOLS INTÉRIEURS, CARRELAGE CUISINE OU SALLE DE BAIN).\n";
                negativeConstraint = "\n\n❌ INTERDICTION ABSOLUE : AUCUN toit, AUCUN couvreur, AUCUN élagage d'arbre, AUCUNE dépanneuse, AUCUN casque de chantier lourd pour la pose intérieure. UNIQUEMENT artisan carreleur à genoux avec genouillères, mortier-colle, peigne cranté, croisillons autonivelants, carreaux céramiques/grès cérame posés au cordeau et niveau à bulle.";
            } else if ((lowerLabel.includes('peintre') || lowerLabel.includes('peinture') || lowerLabel.includes('plafond') || lowerLabel.includes('porte') || lowerLabel.includes('décorative') || lowerLabel.includes('decorative')) && !lowerLabel.includes('façade') && !lowerLabel.includes('facade') && !lowerLabel.includes('extérieure') && !lowerLabel.includes('exterieure')) {
                contextReset += "THIS IMAGE MUST SHOW EXCLUSIVELY: INTERIOR PAINTING & DECORATION (PEINTURE SOLS, PEINTURE PLAFONDS, PEINTURE MURALE, PEINTURE DE PORTES OU PEINTURE DÉCORATIVE).\n";
                negativeConstraint = "\n\n❌ INTERDICTION ABSOLUE : AUCUN toit, AUCUN couvreur, AUCUN élagage d'arbre, AUCUNE dépanneuse, AUCUN échafaudage extérieur lourd, AUCUN casque de chantier lourd pour les pièces intérieures. UNIQUEMENT artisan peintre en salopette blanche avec rouleau microfibres, pinceau à rechampir, bac à peinture et bâches de protection au sol.";
            } else if (lowerLabel.includes('terrassement') || lowerLabel.includes('nivellement') || lowerLabel.includes('vrd') || lowerLabel.includes('viabilisation') || lowerLabel.includes('assainissement') || lowerLabel.includes('raccordement') || lowerLabel.includes('fondation') || lowerLabel.includes('drainage') || lowerLabel.includes('accès') || lowerLabel.includes('acces') || lowerLabel.includes('soutènement') || lowerLabel.includes('soutenement') || lowerLabel.includes('enrochement') || lowerLabel.includes('piscine') || lowerLabel.includes('excavation')) {
                contextReset += "THIS IMAGE MUST SHOW EXCLUSIVELY: EARTHWORKS & EXCAVATION (TERRASSEMENT, ENGINS DE CHANTIER, MINI-PELLE, TRANCHÉES VRD, ENROCHEMENT OU AMÉNAGEMENT DU SOL).\n";
                negativeConstraint = "\n\n❌ INTERDICTION ABSOLUE : AUCUN toit, AUCUNE toiture, AUCUN élagage d'arbre, AUCUN nettoyeur haute pression sur toiture, AUCUNE dépanneuse. UNIQUEMENT des travaux de terrassement au sol, excavation, nivellement, tranchées VRD, assainissement, enrochement ou terrassement piscine.";
            } else if (lowerLabel.includes('gouttière') || lowerLabel.includes('gouttiere') || lowerLabel.includes('chéneau') || lowerLabel.includes('cheneau') || lowerLabel.includes('descente')) {
                contextReset += "THIS IMAGE MUST SHOW EXCLUSIVELY: GUTTER WORK & MAINTENANCE (NETTOYAGE, CURAGE, DÉBOUCHAGE, RÉPARATION OU POSE DE GOUTTIÈRES ET CHÉNEAUX).\n";
                negativeConstraint = "\n\n❌ INTERDICTION ABSOLUE : AUCUN élagage d'arbre, AUCUN abattage, AUCUNE dépanneuse, AUCUN terrassement lourd, AUCUN travailleur debout sans protection sur tuiles glissantes. UNIQUEMENT intervention ciblée sur gouttière de rive, chéneau encastré ou tuyau de descente pluviale.";
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
                        const targetUrlToUse = plan.url || 'https://chatgpt.com/';
                        const res = await generateImageWithChatGPT(finalPrompt, parsedCookies, task.operateur, targetUrlToUse);
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
                
                // Formatage exact demandé : [NOM OPERATEUR]_21-08-26_[GMB NAME] avec normalisation des accents français
                const safeOpName = (task.operateur || 'OPERATEUR').trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, '');
                const safeGmbName = (task.fiche_nom || 'GMB').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
                const taskDate = task.date || dateStr;
                const dateParts = taskDate.split('-');
                const dateFormatShort = dateParts.length === 3 
                    ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0].slice(-2)}` 
                    : taskDate.replace(/[^0-9]/g, '');
                const fileName = `${safeOpName}_${dateFormatShort}_${safeGmbName}_img${taskIndex + 1}.jpg`;
                
                // Upload de l'image (Google Drive par sous-dossier opérateur + sous-dossier date exacte + fallback Supabase Storage)
                const uploadResult = await uploadImage(fileName, imageBuffer, task.operateur, taskDate);
                
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
