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
        const candidates = [
            `CHATGPT_PRO_CONVERSATION_URL_${alias}`,
            `CHATGPT_WORK_CONVERSATION_URL_${alias}`,
            `CHATGPT_URL_PRO_${alias}`,
            `CHATGPT_URL_WORK_${alias}`,
            `CHATGPT_CONVERSATION_URL_PRO_${alias}`,
            `CHATGPT_CONVERSATION_URL_WORK_${alias}`,
            `CHATGPT_CONVERSATION_URL_${alias}_PRO`,
            `CHATGPT_CONVERSATION_URL_${alias}_WORK`,
            `CHATGPT_PERSO_CONVERSATION_URL_${alias}`,
            `CHATGPT_URL_PERSO_${alias}`,
            `CHATGPT_CONVERSATION_URL_PERSO_${alias}`,
            `CHATGPT_CONVERSATION_URL_${alias}_PERSO`,
            `CHATGPT_CONVERSATION_URL_${alias}`,
            `CHATGPT_URL_${alias}`
        ];
        for (const c of candidates) {
            if (process.env[c] && process.env[c].trim().length > 5) return process.env[c].trim();
        }
    }
    return process.env.CHATGPT_PRO_CONVERSATION_URL || process.env.CHATGPT_WORK_CONVERSATION_URL || process.env.CHATGPT_PERSO_CONVERSATION_URL || process.env.CHATGPT_CONVERSATION_URL || 'https://chatgpt.com/';
}

async function dismissModalsAndBanners(page) {
    try {
        await page.evaluate(() => {
            // 1. Fermeture et suppression directe de modal-no-auth-login et ses backdrops
            const noAuthModals = document.querySelectorAll('#modal-no-auth-login, [data-testid="modal-no-auth-login"], [id*="no-auth"]');
            noAuthModals.forEach(el => {
                const btn = el.querySelector('button[aria-label="Close"], button[aria-label="Fermer"], .btn-secondary, button');
                if (btn) {
                    try { btn.click(); } catch(e) {}
                }
                el.remove();
            });

            // 2. Suppression de tous les overlays/backdrops bloquants
            document.querySelectorAll('[data-state="open"], .fixed.inset-0, .absolute.inset-0').forEach(el => {
                const txt = (el.innerText || '').toLowerCase();
                if (txt.includes('log in') || txt.includes('connexion') || txt.includes('stay logged out') || txt.includes('rester déconnecté') || txt.includes('sign up') || txt.includes("s'inscrire")) {
                    el.remove();
                }
            });

            // 3. Clic sur les boutons de validation / consentement / fermer
            const buttons = Array.from(document.querySelectorAll('button, [role="button"], a'));
            for (const b of buttons) {
                const txt = (b.innerText || b.textContent || '').trim().toLowerCase();
                if (
                    txt === "okay, let's go" ||
                    txt === "ok, c'est parti" ||
                    txt === 'got it' ||
                    txt === "j'ai compris" ||
                    txt === 'continuer' ||
                    txt === 'continue' ||
                    txt === 'accepter' ||
                    txt === 'accept all' ||
                    txt === 'tout accepter' ||
                    txt === 'stay logged out' ||
                    txt.includes('rester déconnecté') ||
                    txt === 'fermer' ||
                    txt === 'close' ||
                    txt === 'dismiss'
                ) {
                    try { b.click(); } catch(e) {}
                }
            }
        });
    } catch (e) {}
}

async function typeAndSendPrompt(page, text) {
    try { await dismissModalsAndBanners(page); } catch(e) {}
    console.log("Saisie du prompt dans le champ de texte...");

    // 1. Délai intérieur généreux pour laisser React Router terminer toute transition
    await page.waitForTimeout(2500);

    // 2. Détection robuste du champ de saisie par sélecteurs directs (sans locator strict)
    const candidateSelectors = [
        '#prompt-textarea',
        'div[id="prompt-textarea"]',
        'div[contenteditable="true"]',
        'textarea[data-id="root"]',
        'textarea'
    ];

    let activeSelector = null;
    for (const sel of candidateSelectors) {
        try {
            const el = await page.waitForSelector(sel, { state: 'attached', timeout: 7000 });
            if (el) {
                activeSelector = sel;
                break;
            }
        } catch (e) {}
    }
    activeSelector = activeSelector || '#prompt-textarea';

    // Nettoyage de sécurité du DOM pour éliminer tout overlay no-auth (protégé)
    try {
        await page.evaluate(() => {
            document.querySelectorAll('#modal-no-auth-login, [data-testid="modal-no-auth-login"]').forEach(el => el.remove());
        });
    } catch(e) {}

    // Screenshot AVANT pour voir l'état initial
    try {
        await page.screenshot({ path: `debug-step-before-typing-${Date.now()}.png`, fullPage: false });
    } catch(e) {}

    // 3. Clic / focus robuste sur le champ
    let focusOk = false;
    try {
        const el = await page.$(activeSelector);
        if (el) {
            await el.scrollIntoViewIfNeeded().catch(() => {});
            await page.waitForTimeout(300);
            await el.click({ force: true, timeout: 5000 });
            console.log(`🖱️ Clic direct sur "${activeSelector}" réussi.`);
            focusOk = true;
        }
    } catch (e) {
        console.log(`⚠️ Clic direct échoué, essai focus direct...`);
    }

    if (!focusOk) {
        try {
            await page.focus(activeSelector, { timeout: 4000 });
            console.log(`🖱️ page.focus("${activeSelector}") réussi.`);
            focusOk = true;
        } catch (e) {}
    }

    if (!focusOk) {
        try {
            await page.evaluate((sel) => {
                const el = document.querySelector(sel);
                if (el) {
                    el.focus();
                    if (el.click) el.click();
                }
            }, activeSelector);
            console.log(`🖱️ Focus JS sur "${activeSelector}" appliqué.`);
            focusOk = true;
        } catch (e) {}
    }

    await page.waitForTimeout(500);


    // 1. Insertion du prompt dans le champ (fill direct Playwright)
    let insertOk = false;
    try {
        await page.locator(activeSelector).fill(text, { timeout: 6000 });
        insertOk = true;
        console.log("📝 Texte inséré via locator.fill().");
    } catch (fillErr) {
        console.log("Note fill direct :", fillErr.message);
    }

    // 2. Si fill direct n'a pas fonctionné (ex: contenteditable strict), injection DOM + InputEvent
    const currentLen = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        return el ? (el.value || el.innerText || el.textContent || '').trim().length : 0;
    }, activeSelector);

    if (currentLen < 10) {
        console.log("🔄 Injection DOM + InputEvent pour forcer la prise en compte par React...");
        await page.evaluate(({ sel, val }) => {
            const el = document.querySelector(sel);
            if (!el) return;
            el.focus();
            if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') {
                document.execCommand('selectAll', false, null);
                document.execCommand('insertText', false, val);
                el.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: val }));
            } else {
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
                if (nativeSetter) {
                    nativeSetter.call(el, val);
                } else {
                    el.value = val;
                }
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }, { sel: activeSelector, val: text });
    }

    // 3. Forcer React à ré-évaluer l'état du champ pour activer le bouton d'envoi
    try {
        await page.focus(activeSelector);
        await page.keyboard.press('End');
        await page.keyboard.press('Space');
        await page.keyboard.press('Backspace');
    } catch (e) {}

    await page.waitForTimeout(800);

    // Vérification du contenu présent
    const textareaContent = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        return el ? (el.value || el.innerText || el.textContent || '').trim() : '';
    }, activeSelector);
    console.log(`📝 Contenu du champ textarea (${textareaContent.length} car.) : "${textareaContent.substring(0, 80)}..."`);

    // Screenshot APRÈS écriture pour voir si le texte est dans le champ
    try {
        await page.screenshot({ path: `debug-step-after-typing-${Date.now()}.png`, fullPage: false });
    } catch(e) {}

    // 4. Déclenchement de l'envoi (Bouton ou Entrée)
    let sendTriggered = false;
    const sendButtonSelectors = [
        'button[data-testid="send-button"]',
        'button[data-testid="fruitjuice-send-button"]',
        'button[aria-label*="Send"]',
        'button[aria-label*="Envoyer"]',
        'form button[type="submit"]'
    ];

    for (const sel of sendButtonSelectors) {
        try {
            const btn = await page.$(sel);
            if (btn) {
                const disabled = await btn.evaluate(b => b.disabled || b.getAttribute('aria-disabled') === 'true');
                if (!disabled) {
                    await btn.click({ force: true, timeout: 4000 });
                    console.log(`✅ Bouton d'envoi cliqué avec succès (${sel}) !`);
                    sendTriggered = true;
                    break;
                }
            }
        } catch (e) {}
    }

    // Touche Entrée systématique en complément pour garantir la soumission
    try {
        await page.focus(activeSelector);
        await page.keyboard.press('Enter');
        console.log("⌨️ Touche Entrée pressée sur le champ.");
    } catch (e) {}

    // 5. VÉRIFICATION STRICTE QUE LE MESSAGE EST BIEN PARTI DANS CHATGPT
    console.log("⏳ Vérification que le message a bien été envoyé dans ChatGPT...");
    let sentConfirmed = false;
    for (let checkAttempt = 1; checkAttempt <= 10; checkAttempt++) {
        await page.waitForTimeout(1000);
        const sendStatus = await page.evaluate(() => {
            const el = document.querySelector('#prompt-textarea, div[contenteditable="true"], textarea');
            const remaining = el ? (el.value || el.innerText || el.textContent || '').trim() : '';
            const stopBtn = document.querySelector('button[data-testid="stop-button"], button[aria-label*="Stop"], button[aria-label*="Arrêter"]');
            return { remainingLen: remaining.length, isGenerating: !!stopBtn };
        });

        if (sendStatus.isGenerating || sendStatus.remainingLen === 0) {
            console.log(`🚀 Message confirmé envoyé ! (Génération en cours: ${sendStatus.isGenerating}, Champ vidé: ${sendStatus.remainingLen === 0})`);
            sentConfirmed = true;
            break;
        }

        console.log(`⚠️ Tentative ${checkAttempt}/10 : Le texte est encore présent dans le champ (${sendStatus.remainingLen} car.). Relance d'envoi...`);
        try {
            const btn = await page.$('button[data-testid="send-button"], button[aria-label*="Send"], button[aria-label*="Envoyer"]');
            if (btn) await btn.click({ force: true }).catch(() => {});
            await page.focus(activeSelector);
            await page.keyboard.press('Enter').catch(() => {});
        } catch (e) {}
    }

    // Screenshot APRÈS envoi pour confirmer
    try {
        await page.screenshot({ path: `debug-step-after-send-${Date.now()}.png`, fullPage: false });
    } catch(e) {}
}

async function generateImageWithChatGPT(prompt, cookies, operatorName = null, customUrl = null, shortPrompt = null) {
    const targetUrl = (customUrl || getConversationUrlForOperator(operatorName) || '').trim();
    
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
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
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
        console.log(`🔗 URL cible résolue : ${targetUrl} | Type: ${targetUrl.includes('/c/') ? 'Conversation /c/' : (targetUrl.includes('/g/') ? 'Projet /g/' : 'Accueil')}`);
        try {
            await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
            console.log(`✅ Navigation vers l'URL cible réussie.`);
        } catch (navErr) {
            console.log(`⚠️ Échec navigation vers "${targetUrl}" (${navErr.message}). Bascule sur https://chatgpt.com/ ...`);
            await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded' });
        }
        
        await page.waitForTimeout(3000); // Stabilisation des redirections éventuelles
        
        let currentUrl = page.url();
        console.log("URL de la page :", currentUrl);

        let title = '';
        try { title = await page.title(); } catch (e) {}
        console.log("Titre de la page :", title);

        // Si l'URL demandée est une conversation spécifique (/c/... ou /g/...) mais que le navigateur a atterri sur l'accueil
        if (targetUrl && (targetUrl.includes('/c/') || targetUrl.includes('/g/')) && !currentUrl.includes('/c/') && !currentUrl.includes('/g/') && !currentUrl.includes('/auth/login')) {
            console.log(`🔄 Session initialisée. Forçage de navigation directe vers l'URL du secret : ${targetUrl}...`);
            await page.waitForTimeout(2000);
            try {
                await page.evaluate((dest) => { window.location.href = dest; }, targetUrl);
                await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 35000 }).catch(() => {});
                await page.waitForTimeout(3000);
                currentUrl = page.url();
                console.log("URL après navigation forcée :", currentUrl);
                try { title = await page.title(); } catch (e) {}
            } catch (convNavErr) {
                console.log("Note navigation conversation :", convNavErr.message);
                try {
                    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
                } catch (e) {}
            }
        }

        // Si l'URL spécifique a redirigé vers le login, tenter d'abord https://chatgpt.com/
        if (currentUrl.includes('/auth/login') || currentUrl.includes('/login')) {
            console.log("⚠️ Redirection login sur l'URL spécifique. Tentative de secours sur l'accueil https://chatgpt.com/ ...");
            await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(3000);
            currentUrl = page.url();
            console.log("URL de la page après repli :", currentUrl);
            try { title = await page.title(); } catch (e) {}
            console.log("Titre de la page après repli :", title);

            if (currentUrl.includes('/auth/login') || currentUrl.includes('/login')) {
                throw new Error("COOKIES_EXPIRES: Redirection vers la page de login ChatGPT. Les cookies de ce compte sont expirés ou invalides.");
            }
        }

        // ✅ DÉTECTION RAPIDE : Redirection vers Google Sign-in = cookies expirés à 100%
        if (currentUrl.includes('accounts.google.com') || currentUrl.includes('google.com/signin') || currentUrl.includes('google.com/v3/signin')) {
            const cookieExpiredMsg = `🚨 <b>COOKIES EXPIRÉS (Google Auth détecté)</b> 🚨\n\nL'agent a été redirigé vers la page de connexion Google pour l'opérateur <b>${operatorName || TARGET_OPERATOR || 'Global'}</b>.\n\n👉 <b>Action requise :</b> Re-connectez-vous à ChatGPT dans votre navigateur, ré-exportez vos cookies JSON et mettez à jour le secret <code>CHATGPT_PERSO_COOKIES</code> / <code>CHATGPT_WORK_COOKIES</code> sur GitHub Secrets !`;
            console.error("❌ COOKIES EXPIRÉS : Redirection vers accounts.google.com détectée !");
            console.error("💡 ACTION REQUISE : Re-connectez-vous à ChatGPT et ré-exportez vos cookies.");
            await sendTelegramNotification(cookieExpiredMsg);
            throw new Error("COOKIES_EXPIRES_GOOGLE: Session ChatGPT expirée - redirection vers accounts.google.com. Veuillez renouveler vos cookies.");
        }

        
        // Gestion du challenge Cloudflare Turnstile ("Just a moment..." / "Un instant...")
        if (!title || title.trim() === '' || title.includes('Just a moment') || title.includes('Un instant') || title.includes('Checking') || title.includes('Attention')) {
            console.log(`⚠️ Challenge Cloudflare Turnstile ("${title || 'Chargement...'}") détecté ! Tentative de contournement...`);
            await page.waitForTimeout(6000);
            try { title = await page.title(); } catch (e) {}
            
            try {
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
            
            try {
                await page.waitForFunction(() => !document.title.includes('Just a moment') && !document.title.includes('Un instant'), { timeout: 25000 });
                console.log("✅ Cloudflare dépassé ! Titre actuel :", await page.title());
            } catch (e) {
                console.log("❌ Bloqué par le challenge Cloudflare Turnstile.");
                console.log("💡 CONSEIL : Mettez à jour les cookies CHATGPT_COOKIES (cf_clearance) dans GitHub Secrets.");
            }
        }

        // Fermeture automatique des bannières / dialogues de bienvenue ou cookies
        await dismissModalsAndBanners(page);

        // Vérification si l'URL de conversation est en 404 ou introuvable (sécurisée contre les destructions de contexte)
        let notFoundDetected = false;
        try {
            notFoundDetected = await page.evaluate(() => {
                const body = document.body.innerText || '';
                return body.includes('Cette discussion est introuvable') || 
                       body.includes('Conversation not found') || 
                       body.includes('Unable to load conversation');
            });
        } catch (e) {}

        if (notFoundDetected) {
            console.log("⚠️ Fil de conversation introuvable (404/supprimé). Bascule automatique sur https://chatgpt.com/ ...");
            await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded' });
            await dismissModalsAndBanners(page);
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

        // ⏳ Attente que l'URL soit stable (ChatGPT / React Router re-navigue après chargement)
        console.log("⏳ Attente de la stabilisation de l'URL (React Router)...");
        try {
            await page.waitForLoadState('networkidle', { timeout: 10000 });
        } catch(e) {}
        
        // Polling : on attend que l'URL ne change plus pendant 2 secondes consécutives
        let lastUrl = page.url();
        let stableCount = 0;
        for (let i = 0; i < 15; i++) {
            await page.waitForTimeout(500);
            const currentUrl = page.url();
            if (currentUrl === lastUrl) {
                stableCount++;
                if (stableCount >= 4) break; // URL stable pendant 2s (4 × 500ms)
            } else {
                console.log(`🔄 URL en train de changer : ${currentUrl.substring(0, 80)}`);
                stableCount = 0;
                lastUrl = currentUrl;
            }
        }
        const stableUrl = page.url();
        console.log(`✅ URL stabilisée : ${stableUrl}`);

        // Attendre que le textarea soit visible (React app montée)
        try {
            await page.waitForSelector('#prompt-textarea', { state: 'visible', timeout: 15000 });
            console.log("✅ Champ textarea visible — prêt à saisir.");
        } catch(e) {
            console.log("⚠️ Textarea pas encore visible, tentative quand même...");
        }
        await page.waitForTimeout(1000);

        // Saisie et envoi du prompt initial
        await typeAndSendPrompt(page, prompt);



        // Scanneur d'image dynamique : interdiction stricte de retourner une URL présente dans knownSet
        const checkNewImage = async () => {
            return await page.evaluate((knownUrls) => {
                const knownSet = new Set(knownUrls);
                const imgs = Array.from(document.querySelectorAll('img')).reverse();
                for (const img of imgs) {
                    const src = img.src || '';
                    if (!src || src.includes('avatar') || src.includes('profile') || src.includes('svg') || src.includes('icon')) continue;
                    if (knownSet.has(src)) continue; // INTERDICTION STRICTE : ne jamais prendre une image déjà connue
                    // Détection universelle DALL-E 3 : CDN OpenAI (oaiusercontent), blob, ou dimensions visuelles suffisantes
                    if (src.includes('oaiusercontent') || src.includes('blob:') || (img.complete && (img.naturalWidth >= 300 || img.width >= 300 || img.naturalWidth >= 400 || img.width >= 400))) {
                        return src;
                    }
                }
                return null;
            }, existingImageUrls);
        };

        console.log("⏳ Attente active de la création DALL-E 3 (jusqu'à 100s)...");
        let foundUrl = null;
        let referenceImagePromptSent = false;
        const scanStart = Date.now();
        const MAX_SCAN_MS = 100000;

        while (Date.now() - scanStart < MAX_SCAN_MS) {
            // Défilement automatique vers le bas pour forcer le rendu Chromium des images lazy-loaded
            try {
                await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            } catch (e) {}

            foundUrl = await checkNewImage();
            if (foundUrl) break;

            // Détection immédiate de message de limite/quota de génération d'images DALL-E 3
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

            // Détection si ChatGPT demande une image de référence ou refuse à cause de consignes négatives
            if (!referenceImagePromptSent && (Date.now() - scanStart > 8000)) {
                const needsReferenceImage = await page.evaluate(() => {
                    const assistantTurns = Array.from(document.querySelectorAll('[data-message-author-role="assistant"], .agent-turn, article'));
                    const lastTurn = assistantTurns.length > 0 ? assistantTurns[assistantTurns.length - 1] : null;
                    const text = lastTurn ? (lastTurn.innerText || '').toLowerCase() : (document.body.innerText || '').toLowerCase();
                    return (
                        text.includes("image cible") ||
                        text.includes("téléverse une image") ||
                        text.includes("televerse une image") ||
                        text.includes("image de référence") ||
                        text.includes("image de reference") ||
                        text.includes("déjà présente dans ce fil") ||
                        text.includes("deja presente dans ce fil") ||
                        text.includes("utiliser comme base") ||
                        text.includes("modification d'image") ||
                        text.includes("modification d’image") ||
                        text.includes("outil refuse") ||
                        text.includes("considérant à tort") ||
                        text.includes("envoie-moi simplement") ||
                        text.includes("envoie-moi seulement") ||
                        text.includes("sans les mentions")
                    );
                });

                if (needsReferenceImage) {
                    console.log("⚠️ ChatGPT demande une formulation directe sans consignes négatives !");
                    console.log("🔄 Envoi de la description directe de la scène demandée...");
                    referenceImagePromptSent = true;
                    const fallbackPrompt = shortPrompt || "Génère directement une photo de ce chantier artisanal en France.";
                    await typeAndSendPrompt(page, fallbackPrompt);
                    await page.waitForTimeout(5000);
                    continue;
                }
            }

            await page.waitForTimeout(3000);
        }

        if (foundUrl) {
            console.log("📸 NOUVELLE photo HD unique validée à l'écran ! URL :", foundUrl.substring(0, 100));
        } else {
            console.log("🔄 Aucune nouvelle photo aperçue au bout de 100s. Actualisation de la page ChatGPT (page.reload())...");
            try {
                await page.reload({ waitUntil: 'domcontentloaded' });
                const reloadWait = Math.floor(Math.random() * (20000 - 15000 + 1)) + 15000;
                console.log(`✅ Page ChatGPT actualisée ! Attente de ${Math.round(reloadWait/1000)}s (entre 15 et 20s) pour le chargement du fil...`);
                await page.waitForTimeout(reloadWait);
                
                try {
                    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                } catch (e) {}

                const startTimeReload = Date.now();
                while (Date.now() - startTimeReload < 25000) {
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
            console.log("⚠️ Aucune nouvelle photo trouvée après scan complet.");
            try {
                const debugInfo = await page.evaluate(() => {
                    const turns = Array.from(document.querySelectorAll('[data-message-author-role="assistant"], .agent-turn, article'));
                    const lastText = turns.length > 0 ? (turns[turns.length - 1].innerText || '') : '';
                    return {
                        title: document.title,
                        url: window.location.href,
                        lastReply: lastText.substring(0, 300).replace(/\n+/g, ' ')
                    };
                });
                console.log(`ℹ️ Contexte page : Titre="${debugInfo.title}", URL="${debugInfo.url}"`);
                if (debugInfo.lastReply) {
                    console.log(`💬 Dernier texte reçu de ChatGPT : "${debugInfo.lastReply}"`);
                }
            } catch (dErr) {}
            
            try {
                const ts = Date.now();
                const screenshotPath = `debug-error-${ts}.png`;
                await page.screenshot({ path: screenshotPath, fullPage: true });
                console.log(`📸 Capture d'écran enregistrée pour debug (${screenshotPath})`);
            } catch (e) {
                console.log("Erreur lors de la capture d'écran :", e.message);
            }
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
        if ((!imageBuffer || imageBuffer.length < 5000) && foundUrl) {
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
        if (!imageBuffer || imageBuffer.length < 5000) {
            throw new Error("ÉCHEC_EXTRACTION_IMAGE: Aucune photo DALL-E exploitable n'a été récupérée sur cette session ChatGPT.");
        }
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
        
        // Vérification du week-end (Samedi et Dimanche en heure locale Asie/Bangkok)
        const checkDateObj = new Date(dateStr + 'T12:00:00Z');
        const dayOfWeek = checkDateObj.getUTCDay(); // 0 = Dimanche, 6 = Samedi
        if ((dayOfWeek === 0 || dayOfWeek === 6) && process.env.FORCE_EXECUTION !== 'true') {
            console.log(`⏸️ Pas de génération d'images le week-end (${dateStr} est un ${dayOfWeek === 6 ? 'Samedi' : 'Dimanche'}). Fin de l'agent.`);
            return;
        }

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
            const isFifa = rawOp.toLowerCase().includes('fif');
            if (isFifa) {
                query = query.or('operateur.ilike.Fifaliana,operateur.ilike.FIFA,operateur.ilike.fifa,operateur.ilike.Fif,operateur.ilike.%FIF%');
            } else {
                query = query.or(`operateur.ilike.${targetOp},operateur.ilike.${rawOp},operateur.ilike.%${rawOp}%`);
            }
        }
        
        let { data: tasks, error } = await query.order('id', { ascending: true });
            
        if (error) throw error;
        
        console.log(`${tasks.length} avis trouvés pour ${rawOp ? 'l\'opérateur ' + rawOp + ' (' + targetOp + ')' : 'tous les opérateurs'} pour le (${dateStr}).`);
        
        let isTestFallback = false;
        
        // Si aucun avis pour la date : on s'arrête proprement (le mode test n'est activé que si explicitement demandé)
        if (tasks.length === 0) {
            if (process.env.FORCE_TEST_MODE !== 'true') {
                console.log(`ℹ️ Aucun avis planifié pour le ${dateStr} pour ${rawOp ? 'l\'opérateur ' + rawOp : 'tous les opérateurs'}. Fin de l'exécution.`);
                return;
            }
            console.log(`Mode test forcé (FORCE_TEST_MODE=true) pour ${rawOp || 'Global'}...`);
            
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
            const k = envKey.toUpperCase();
            const v = (envVal || '').trim();
            if (v.length > 5) {
                if (k.includes('COOKIE') || k.includes('URL') || k.includes('CONVERSATION')) {
                    availableCookiesMap[k] = v;
                }
            }
        }

        // 2. Collecte depuis Supabase (tables fiches et app_settings) - SANS JAMAIS ÉCRASER process.env (GitHub Secrets)
        try {
            const { data: fichesData } = await supabase.from('fiches').select('nom, lien').or('nom.ilike.%COOKIE%,nom.ilike.%URL%,nom.ilike.%CONVERSATION%');
            if (fichesData && fichesData.length > 0) {
                for (const item of fichesData) {
                    const k = (item.nom || '').toUpperCase();
                    const v = (item.lien || '').trim();
                    if (v.length > 5 && !availableCookiesMap[k]) {
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
                    if (v.length > 5 && (k.includes('COOKIE') || k.includes('URL') || k.includes('CONVERSATION'))) {
                        if (!availableCookiesMap[k]) availableCookiesMap[k] = v;
                    }
                }
            }
        } catch (e) {}

        function resolveCookieSetsForOp(opName) {
            const aliases = getOperatorAliases(opName);
            
            // 1. Recherche PRIORITAIRE de l'URL de conversation PRO / WORK dans process.env (GitHub Secrets)
            let workUrl = null;
            let workUrlKeyFound = null;
            const workUrlKeys = [];
            for (const a of aliases) {
                workUrlKeys.push(
                    `CHATGPT_PRO_CONVERSATION_URL_${a}`,
                    `CHATGPT_WORK_CONVERSATION_URL_${a}`,
                    `CHATGPT_URL_PRO_${a}`,
                    `CHATGPT_URL_WORK_${a}`,
                    `CHATGPT_CONVERSATION_URL_PRO_${a}`,
                    `CHATGPT_CONVERSATION_URL_WORK_${a}`,
                    `CHATGPT_CONVERSATION_URL_${a}_PRO`,
                    `CHATGPT_CONVERSATION_URL_${a}_WORK`,
                    `URL_PRO_${a}`,
                    `URL_WORK_${a}`
                );
            }
            workUrlKeys.push('CHATGPT_PRO_CONVERSATION_URL', 'CHATGPT_WORK_CONVERSATION_URL', 'CHATGPT_URL_PRO', 'CHATGPT_URL_WORK');
            
            // PRIORITÉ 1 ABSOLUE : process.env (Secret GitHub)
            for (const k of workUrlKeys) {
                const val = (process.env[k] || '').trim();
                if (val && val.length > 5 && val.startsWith('http')) {
                    workUrl = val;
                    workUrlKeyFound = `Secret GitHub [process.env.${k}]`;
                    break;
                }
            }
            // PRIORITÉ 2 : availableCookiesMap (Supabase) si absent du Secret GitHub
            if (!workUrl) {
                for (const k of workUrlKeys) {
                    const val = (availableCookiesMap[k] || '').trim();
                    if (val && val.length > 5 && val.startsWith('http')) {
                        workUrl = val;
                        workUrlKeyFound = `Supabase [availableCookiesMap.${k}]`;
                        break;
                    }
                }
            }
            if (workUrl) {
                console.log(`🎯 URL PRO/WORK trouvée (${workUrlKeyFound}) : ${workUrl.substring(0, 35)}... (est /c/: ${workUrl.includes('/c/')})`);
            }

            // 2. Recherche PRIORITAIRE de l'URL de conversation PERSO / SECOURS
            let persoUrl = null;
            let persoUrlKeyFound = null;
            const persoUrlKeys = [];
            for (const a of aliases) {
                persoUrlKeys.push(
                    `CHATGPT_PERSO_CONVERSATION_URL_${a}`,
                    `CHATGPT_URL_PERSO_${a}`,
                    `CHATGPT_CONVERSATION_URL_PERSO_${a}`,
                    `CHATGPT_CONVERSATION_URL_${a}_PERSO`,
                    `URL_PERSO_${a}`
                );
            }
            persoUrlKeys.push('CHATGPT_PERSO_CONVERSATION_URL', 'CHATGPT_URL_PERSO');

            // PRIORITÉ 1 ABSOLUE : process.env (Secret GitHub)
            for (const k of persoUrlKeys) {
                const val = (process.env[k] || '').trim();
                if (val && val.length > 5 && val.startsWith('http')) {
                    persoUrl = val;
                    persoUrlKeyFound = `Secret GitHub [process.env.${k}]`;
                    break;
                }
            }
            // PRIORITÉ 2 : availableCookiesMap (Supabase)
            if (!persoUrl) {
                for (const k of persoUrlKeys) {
                    const val = (availableCookiesMap[k] || '').trim();
                    if (val && val.length > 5 && val.startsWith('http')) {
                        persoUrl = val;
                        persoUrlKeyFound = `Supabase [availableCookiesMap.${k}]`;
                        break;
                    }
                }
            }
            if (persoUrl) {
                console.log(`🎯 URL PERSO trouvée (${persoUrlKeyFound}) : ${persoUrl.substring(0, 35)}... (est /c/: ${persoUrl.includes('/c/')})`);
            }

            // 3. URL Fallback
            let fallbackUrl = null;
            for (const a of aliases) {
                const k = `CHATGPT_CONVERSATION_URL_${a}`;
                const val = (process.env[k] || availableCookiesMap[k] || '').trim();
                if (val && val.startsWith('http')) {
                    fallbackUrl = val;
                    break;
                }
            }
            fallbackUrl = fallbackUrl || process.env.CHATGPT_CONVERSATION_URL || 'https://chatgpt.com/';

            // 4. Clés candidates Cookies PRO / WORK
            const workKeyCandidates = [];
            for (const a of aliases) {
                workKeyCandidates.push(
                    `CHATGPT_PRO_COOKIES_${a}`,
                    `CHATGPT_WORK_COOKIES_${a}`,
                    `CHATGPT_COOKIES_PRO_${a}`,
                    `CHATGPT_COOKIES_WORK_${a}`,
                    `CHATGPT_COOKIES_${a}_PRO`,
                    `CHATGPT_COOKIES_${a}_WORK`,
                    `COOKIES_PRO_${a}`,
                    `COOKIES_WORK_${a}`,
                    `CHATGPT_PRO_COOKIE_${a}`,
                    `CHATGPT_WORK_COOKIE_${a}`
                );
            }
            workKeyCandidates.push('CHATGPT_PRO_COOKIES', 'CHATGPT_WORK_COOKIES', 'CHATGPT_PRO_COOKIE', 'CHATGPT_WORK_COOKIE');

            // 5. Clés candidates Cookies PERSO / SECOURS
            const persoKeyCandidates = [];
            for (const a of aliases) {
                persoKeyCandidates.push(
                    `CHATGPT_PERSO_COOKIES_${a}`,
                    `CHATGPT_COOKIES_PERSO_${a}`,
                    `CHATGPT_COOKIES_${a}_PERSO`,
                    `COOKIES_PERSO_${a}`,
                    `CHATGPT_PERSO_COOKIE_${a}`,
                    `CHATGPT_COOKIES_${a}`,
                    `CHATGPT_COOKIE_${a}`
                );
            }
            persoKeyCandidates.push('CHATGPT_PERSO_COOKIES', 'CHATGPT_PERSO_COOKIE', 'CHATGPT_COOKIES');

            let workEntry = null;
            // ÉTAPE 1 : Recherche PRIORITAIRE dans process.env (GitHub Secrets)
            for (const k of workKeyCandidates) {
                const val = (process.env[k] || '').trim();
                if (val && val.length > 20) {
                    workEntry = { name: 'Plan PRO / Work', key: k, raw: val, url: workUrl || fallbackUrl, source: 'GitHub Secret' };
                    break;
                }
            }
            // ÉTAPE 2 : Recherche de repli dans availableCookiesMap (Supabase) UNIQUEMENT si non trouvé dans GitHub Secrets
            if (!workEntry) {
                for (const k of workKeyCandidates) {
                    const val = (availableCookiesMap[k] || '').trim();
                    if (val && val.length > 20) {
                        workEntry = { name: 'Plan PRO / Work', key: k, raw: val, url: workUrl || fallbackUrl, source: 'Supabase' };
                        break;
                    }
                }
            }

            let persoEntry = null;
            // ÉTAPE 1 : Recherche PRIORITAIRE dans process.env (GitHub Secrets)
            for (const k of persoKeyCandidates) {
                const val = (process.env[k] || '').trim();
                if (val && val.length > 20 && (!workEntry || val !== workEntry.raw)) {
                    persoEntry = { name: 'Plan PERSO / Secours', key: k, raw: val, url: persoUrl || fallbackUrl, source: 'GitHub Secret' };
                    break;
                }
            }
            // ÉTAPE 2 : Recherche de repli dans availableCookiesMap (Supabase)
            if (!persoEntry) {
                for (const k of persoKeyCandidates) {
                    const val = (availableCookiesMap[k] || '').trim();
                    if (val && val.length > 20 && (!workEntry || val !== workEntry.raw)) {
                        persoEntry = { name: 'Plan PERSO / Secours', key: k, raw: val, url: persoUrl || fallbackUrl, source: 'Supabase' };
                        break;
                    }
                }
            }

            const sets = [];
            if (workEntry) sets.push(workEntry);
            if (persoEntry) sets.push(persoEntry);

            if (sets.length === 0) {
                for (const [k, v] of Object.entries(availableCookiesMap)) {
                    if (opUpper && k.includes(opUpper) && (k.includes('COOKIE') || !k.includes('URL'))) {
                        sets.push({ name: 'Plan ChatGPT', key: k, raw: v, url: fallbackUrl });
                        break;
                    }
                }
            }
            if (sets.length === 0 && Object.keys(availableCookiesMap).length > 0) {
                for (const [k, v] of Object.entries(availableCookiesMap)) {
                    if (k.includes('COOKIE')) {
                        sets.push({ name: 'Plan ChatGPT (Fallback)', key: k, raw: v, url: fallbackUrl });
                        break;
                    }
                }
            }
            return sets;
        }

        const initialOpSets = resolveCookieSetsForOp(rawOp);
        console.log(`\n================== DIAGNOSTIC IDENTIFIANTS CHATGPT ==================`);
        console.log(`👤 Opérateur cible : "${rawOp}" (Recherche DB: "${targetOp}")`);
        for (const s of initialOpSets) {
            console.log(`   👉 ${s.name} : Secret "${s.key}" trouvé (${s.raw ? s.raw.length : 0} car.) | URL: ${s.url}`);
        }
        if (initialOpSets.length === 0) {
            console.log(`   ❌ ATTENTION : Aucun cookie trouvé pour ${rawOp} dans les secrets !`);
        }
        console.log(`=====================================================================\n`);

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
            const result = [];
            for (const c of parsed) {
                if (!c.name || c.value === undefined) continue;
                let dom = c.domain || '.chatgpt.com';
                
                let sameSite = undefined;
                if (c.sameSite && typeof c.sameSite === 'string') {
                    const s = c.sameSite.toLowerCase();
                    if (s === 'strict') sameSite = 'Strict';
                    else if (s === 'lax') sameSite = 'Lax';
                    else if (s === 'none' || s === 'no_restriction') sameSite = 'None';
                }

                let exp = undefined;
                if (typeof c.expirationDate === 'number') {
                    exp = Math.floor(c.expirationDate);
                } else if (typeof c.expires === 'number') {
                    exp = Math.floor(c.expires);
                }

                const clean = {
                    name: c.name,
                    value: String(c.value),
                    domain: dom.startsWith('.') || dom.includes('chatgpt.com') || dom.includes('openai.com') ? dom : `.${dom}`,
                    path: c.path || '/',
                    secure: c.secure !== undefined ? Boolean(c.secure) : true,
                    httpOnly: Boolean(c.httpOnly),
                };
                if (exp && exp > Date.now() / 1000) clean.expires = exp;
                if (sameSite) clean.sameSite = sameSite;

                result.push(clean);

                // Si le cookie est sur openai.com, créer aussi une copie sur .chatgpt.com pour assurer l'interopérabilité
                if (clean.domain.includes('openai.com') && !clean.domain.includes('chatgpt.com')) {
                    result.push({
                        ...clean,
                        domain: '.chatgpt.com'
                    });
                }
            }
            return result;
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

                // ── 2. DÉPANNAGE & REMORQUAGE AUTOMOBILE (4 services officiels) ──
                const isAutoTowing = f.includes('remorquage') || f.includes('towing') || f.includes('tow truck') || f.includes('breakdown') || f.includes('épaviste') || f.includes('epaviste') || 
                    ((f.includes('dépannage') || f.includes('depannage')) && (f.includes('auto') || f.includes('voiture') || f.includes('moto') || f.includes('véhicule') || f.includes('vehicule') || f.includes('batterie') || f.includes('pneu') || (!f.includes('couvr') && !f.includes('toit') && !f.includes('plomb') && !f.includes('vitr') && !f.includes('serrur') && !f.includes('volet') && !f.includes('facad') && !f.includes('façad') && !f.includes('charp') && !f.includes('peint') && !f.includes('renov') && !f.includes('rénov'))));
                if (isAutoTowing) {
                    const towingChoices = [
                        'remorquage de voiture en panne sur camion dépanneuse plateau avec treuil et gyrophare orange',
                        'remorquage de moto et fixation soignée avec sangles d\'arrimage et bloque-roue sur plateau',
                        'dépannage auto sur le bord de la route avec véhicule d\'assistance routière et technicien en gilet jaune',
                        'dépannage batterie avec booster de démarrage portable ou remplacement de batterie sous le capot ouvert'
                    ];
                    return pick(towingChoices);
                }

                // ── 3. DÉBARRAS & ENCOMBRANTS (Services officiels & Situations) ──
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

                // ── 4. CARRELAGE & REVÊTEMENTS DE SOL (4 services officiels) ──
                if (f.includes('carrelage') || f.includes('carreleur') || f.includes('faïence') || f.includes('faience') || f.includes('tile') || f.includes('tiling') || f.includes('tiler') || f.includes('revêtement de sol') || f.includes('revetement de sol')) {
                    const tileChoices = [
                        'revêtements de sols extérieur (pose de dalles en grès cérame 20mm antidérapant sur terrasse avec peigne à colle et croisillons autonivelants)',
                        'revêtements de sols intérieurs (pose de carrelage grand format au sol intérieur avec mortier-colle, peigne cranté et croisillons nivelants)',
                        'cuisine (pose de carrelage au sol et crédence murale en faïence ou carrelage métro au-dessus du plan de travail)',
                        'salle de bain (pose de carrelage mural, faïence et carrelage de douche à l\'italienne avec niveau laser)'
                    ];
                    return pick(tileChoices);
                }

                // ── 5. ÉLAGAGE, ABATTAGE & PAYSAGISME (Priorité sur les mots clés verts et arbres) ──
                const hasTreeOrGarden = f.includes('elagage') || f.includes('élagage') || f.includes('emondage') || f.includes('émondage') || f.includes('emondeur') || f.includes('émondeur') || f.includes('abattage') || f.includes('haie') || f.includes('jardinage') || f.includes('elagueur') || f.includes('élagueur') || f.includes('tree') || f.includes('trees') || f.includes('arborist') || f.includes('pruning') || f.includes('gardener') || f.includes('gardening') || f.includes('dessouchage') || f.includes('stump') || f.includes('hedge') || f.includes('debroussaillage') || f.includes('débroussaillage') || f.includes('paysagiste') || f.includes('paysagisme') || f.includes('landscaping') || f.includes('paysage');
                if (hasTreeOrGarden) {
                    if (f.includes('haie')) {
                        return 'taille d\'haies soignée en duo au taille-haie sur escabeau double de jardin avec ramassage des végétaux';
                    }
                    if (f.includes('abattage')) {
                        return 'abattage d\'arbre au sol avec tronçonneuse professionnelle, équipement de sécurité forestier et billes de bois débitées';
                    }
                    if (f.includes('dessouchage') || f.includes('stump')) {
                        return 'dessouchage et rognage de souche d\'arbre au sol avec rogneuse de souche et projection de copeaux de bois';
                    }
                    if (f.includes('debroussaill') || f.includes('débroussaill')) {
                        return 'débroussaillage de terrain et fauchage de broussailles denses à la débroussailleuse thermique avec visière intégrale';
                    }
                    if (f.includes('paysag')) {
                        return 'paysagisme et création de massifs paysagers avec plantations d\'arbustes, paillage végétal et allée en dalles';
                    }
                    return pick([
                        'élagage d\'arbre de jardin sur escabeau double ou au sol (taille douce de branches à la scie d\'élagage sans harnais, ou arboriste qualifié en hauteur pour grand arbre)',
                        'abattage d\'arbre au sol avec tronçonneuse professionnelle, équipement de sécurité forestier et billes de bois débitées',
                        'taille d\'haies soignée en duo au taille-haie sur escabeau double de jardin avec ramassage des végétaux',
                        'dessouchage et rognage de souche d\'arbre au sol avec rogneuse de souche et projection de copeaux de bois',
                        'débroussaillage de terrain et fauchage de broussailles denses à la débroussailleuse thermique avec visière intégrale',
                        'paysagisme et création de massifs paysagers avec plantations d\'arbustes, paillage végétal et allée en dalles'
                    ]);
                }

                // ── 6. FAÇADE & RAVALEMENT (y compris fiches mixtes ravalement/peintre/nettoyage façade) ──
                const isFacadeTrade = f.includes('façade') || f.includes('facade') || f.includes('ravalement') || f.includes('crépi') || f.includes('crepi') || f.includes('enduit') || f.includes('fissure') || f.includes('peintre en bâtiment') || f.includes('peinture extérieure');
                if (isFacadeTrade && !f.includes('couvreur')) {
                    return pick([
                        'ravalement & nettoyage de façade de maison au jet moyenne pression ou softwash depuis un échafaudage',
                        'rénovation de façade & traitement des fissures avec pose de bande armée et mortier de réparation souple',
                        'enduit de façade taloché ou monocouche à la chaux appliqué à la taloche sur mur extérieur',
                        'peinture de façade extérieure au rouleau professionnel microporeux siloxane/pliolite avec échafaudage',
                        'traitement façade & humidité avec pulvérisation de produit hydrofuge incolore et traitement anti-salpêtre'
                    ]);
                }

                // ── 7. PEINTURE INTÉRIEURE & DÉCORATION (5 services officiels) ──
                if ((f.includes('peintre') || f.includes('peinture') || f.includes('décoration') || f.includes('decoration') || f.includes('paint') || f.includes('painter') || f.includes('painting')) && !f.includes('façade') && !f.includes('facade') && !f.includes('ravalement') && !f.includes('extérieure') && !f.includes('exterieure')) {
                    const paintChoices = [
                        'peinture sols (application de peinture de sol époxy ou polyuréthane au rouleau avec perche télescopique)',
                        'peinture plafonds (mise en peinture de plafond au rouleau avec perche, peinture blanche mate et bâches au sol)',
                        'peinture murale (mise en peinture intérieure des murs au rouleau microfibres avec pinceau à rechampir et bac)',
                        'peinture de portes (peinture laque satinée de portes intérieures en bois au mini-rouleau et pinceau fin)',
                        'peinture décorative (application d\'enduit décoratif à la chaux ou stuc au platoir inox sur pan de mur)'
                    ];
                    return pick(paintChoices);
                }

                // ── 8. NETTOYAGE EXTÉRIEUR & DÉMOUSSAGE (Ciblage strict selon le nom de fiche) ──
                const isExplicitNettoyage = f.includes('nettoyage') || f.includes('demoussage') || f.includes('démoussage') || f.includes('hydrofuge') || f.includes('lavage') || f.includes('pressure wash') || f.includes('soft wash') || f.includes('softwash') || f.includes('power wash');
                if (isExplicitNettoyage && !f.includes('couvreur') && !f.includes('couverture')) {
                    const hasToiture = f.includes('toiture') || f.includes('toit');
                    const hasFacade = f.includes('façade') || f.includes('facade');
                    const hasTerrasse = f.includes('terrasse') || f.includes('dallage') || f.includes('allée') || f.includes('allee');
                    const hasPanneau = f.includes('panneau') || f.includes('solaire');
                    const hasGouttiere = f.includes('gouttière') || f.includes('gouttiere') || f.includes('cheneau') || f.includes('chéneau');

                    const availableCleanings = [];
                    if (hasToiture) {
                        availableCleanings.push('nettoyage & démoussage de toiture (artisan au sol avec perche télescopique de pulvérisation appliquant un traitement anti-mousse)');
                        availableCleanings.push('traitement hydrofuge toiture (pulvérisation au sol de produit hydrofuge protecteur sur tuiles)');
                    }
                    if (hasFacade) {
                        availableCleanings.push('nettoyage de façade (nettoyage moyenne pression ou softwash de façade de maison avec contraste propre)');
                    }
                    if (hasTerrasse) {
                        availableCleanings.push('nettoyage terrasses, allées & dallages (nettoyage haute pression avec cloche de lavage de sol ou rotabuse sur dalles et pavés)');
                    }
                    if (hasPanneau) {
                        availableCleanings.push('nettoyage panneaux solaires (nettoyage de panneaux solaires photovoltaïques avec perche télescopique à eau pure et brosse douce)');
                    }
                    if (hasGouttiere) {
                        availableCleanings.push('nettoyage et curage de gouttières et chéneaux depuis le sol');
                    }

                    if (availableCleanings.length > 0) {
                        return pick(availableCleanings);
                    }

                    return pick([
                        'nettoyage & démoussage de toiture (artisan au sol avec perche télescopique de pulvérisation appliquant un traitement anti-mousse)',
                        'traitement hydrofuge toiture (pulvérisation au sol de produit hydrofuge protecteur sur tuiles)',
                        'nettoyage de façade (nettoyage moyenne pression ou softwash de façade de maison avec contraste propre)',
                        'nettoyage terrasses, allées & dallages (nettoyage haute pression avec cloche de lavage de sol ou rotabuse sur dalles et pavés)'
                    ]);
                }

                // ── 9. ÉTANCHÉITÉ (5 services officiels) ──
                if (f.includes('etancheite') || f.includes('étanchéité') || (f.includes('toit plat') && !f.includes('couvreur')) || (f.includes('toiture terrasse') && (f.includes('etanch') || f.includes('étanch') || f.includes('fuite') || f.includes('plat'))) || f.includes('waterproof') || f.includes('waterproofing') || f.includes('infiltration') || f.includes('fuite')) {
                    const etancheiteChoices = [
                        'étanchéité de toit-terrasse & toit plat (pose de membrane EPDM, PVC ou bitumineuse au chalumeau sur toit plat avec acrotères)',
                        'recherche de fuite & réparation d\'infiltration (détection de fuite au fumigène/caméra thermique et pose de patch d\'étanchéité)',
                        'étanchéité sous carrelage & terrasse carrelée (application de résine d\'étanchéité liquide SEL et bandes d\'angle sur terrasse)',
                        'réfection complète d\'étanchéité (remplacement complet du complexe d\'étanchéité bicouche et couvertines sur toiture-terrasse)',
                        'étanchéité & isolation de toiture-terrasse (pose de panneaux isolants thermiques rigides et membrane d\'étanchéité bicouche)'
                    ];
                    return pick(etancheiteChoices);
                }

                // ── 10. GOUTTIÈRES SPÉCIFIQUES (8 services) ──
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

                // ── 11. CHARPENTE & OSSATURE BOIS (14 services officiels) ──
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

                // ── 12. COUVERTURE & TOITURE (sans match de faux-positif 'rive' dans Brive) ──
                const isCouvreur = f.includes('couvreur') || f.includes('toiture') || f.includes('couverture') || f.includes('tuile') || f.includes('zinguerie') || f.includes('faîtage') || f.includes('faitage') || /\brive\b|\brives\b/i.test(f) || f.includes('roof') || f.includes('roofer') || f.includes('roofing') || f.includes('shingle');
                if (isCouvreur) {
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

                // ── 13. MAÇONNERIE (4 services officiels) ──
                if (f.includes('maçonnerie') || f.includes('maconnerie') || f.includes('maçon') || f.includes('macon') || f.includes('pierre') || f.includes('masonry') || f.includes('mason') || f.includes('brickwork') || f.includes('bâtiment') || f.includes('batiment')) {
                    const maconnerieChoices = [
                        'démolition et reconstruction de mur maçonné par des artisans maçons avec outils pneumatiques et nouveau mur monté au cordeau',
                        'maçonnerie extérieur (construction de muret de clôture, piliers ou muret de terrasse en parpaings avec truelle et niveau à bulle)',
                        'rénovation second-oeuvre (ouverture de mur porteur, pose de poutre IPN, cloisons en béton cellulaire et chape de sol)',
                        'construction et maçonnerie de gros œuvre (élévation de murs porteurs en parpaings, coffrage bois et ferraillage de chaînage)'
                    ];
                    return pick(maconnerieChoices);
                }

                // ── 14. TERRASSEMENT & VRD (12 services) ──
                if (f.includes('terrassement') || f.includes('terrassier') || f.includes('excavation') || f.includes('dallage') || f.includes('vrd') || f.includes('assainissement') || f.includes('enrochement') || f.includes('nivellement') || f.includes('viabilisation') || f.includes('drainage') || f.includes('soutènement') || f.includes('soutenement') || f.includes('piscine') || f.includes('paving') || f.includes('driveway') || f.includes('concrete') || f.includes('cement')) {
                    const terrassementChoices = [
                        'travaux de terrassement général et excavation avec mini-pelle de chantier et ouvrier au sol',
                        'nivellement de terrain et régalage de terre avec godet de niveau sur mini-pelle',
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
            
            // Header de création d'image : description positive directe sans mention d'édition ni d'image de référence
            let contextReset = "Génère une photo de chantier professionnel ultra-réaliste.\n";

            const coreTradeBlock = `\n🎯 OBJET UNIQUE DU CHANTIER :\n- Métier & Travaux : ${travauxLabel.toUpperCase()}\n- Entreprise : ${task.fiche_nom || ''}\n- Bâtiment & Lieu : ${contexteLabel} (${locationStr})\n- Présence sur l'image : ${nbOuvriers}, ambiance ${lumiere}, vue ${pointDeVue}, format ${orientation}.\n`;

            // Injection des règles de sécurité et visuelles positives
            const rulesBlock = buildRulesBlock(task.metier || travauxLabel, task.travaux || travauxLabel, etatChantier);
            const finalPrompt = contextReset + coreTradeBlock + "\n" + prompt + "\n" + rulesBlock;
            const shortPrompt = `Génère une photo de ${travauxLabel} à ${villeLabel || 'France'} avec ${nbOuvriers}, format ${orientation}.`;
            
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
                        const targetUrlToUse = activePlanUrls[plan.key] || plan.url || 'https://chatgpt.com/';
                        const res = await generateImageWithChatGPT(finalPrompt, parsedCookies, task.operateur, targetUrlToUse, shortPrompt);
                        rawImageBuffer = res ? res.imageBuffer : null;

                        if (rawImageBuffer) {
                            usedPlanName = plan.name;
                            if (res.finalUrl && res.finalUrl.includes('/c/')) {
                                activePlanUrls[plan.key] = res.finalUrl;
                                console.log(`📌 Fil de conversation unique conservé pour l'opérateur (${plan.name}) : ${res.finalUrl}`);
                            }
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
