require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');
const fs = require('fs');
const crypto = require('crypto');
const { google } = require('googleapis');
const { Readable } = require('stream');
const { injectExifAndGps } = require('./exif');
const { sendTelegramNotification } = require('./telegram');

// --- Configuration ---
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rrbvghxmnimusfyqixau.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;
const TARGET_OPERATOR = process.env.OPERATOR_NAME ? process.env.OPERATOR_NAME.trim() : 'Fifaliana';
const TARGET_DATE = process.env.TARGET_DATE 
    ? process.env.TARGET_DATE.trim() 
    : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

const CONVERSATION_URL = process.env.CONVERSATION_URL 
    ? process.env.CONVERSATION_URL.trim() 
    : null;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function getOperatorAliases(opName) {
    const raw = (opName || '').trim().toUpperCase();
    if (!raw) return ['FIF', 'FIFALIANA', 'FIFA'];
    const aliases = [raw];
    if (raw.includes('FIF')) {
        ['FIF', 'FIFALIANA', 'FIFA', 'FIFIANA'].forEach(a => {
            if (!aliases.includes(a)) aliases.push(a);
        });
    }
    if (raw.includes('KEV')) {
        ['KEVIN', 'KEV'].forEach(a => {
            if (!aliases.includes(a)) aliases.push(a);
        });
    }
    return aliases;
}

// --- Google Drive Helpers ---
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

        const newFolder = await drive.files.create({
            requestBody: {
                name: safeName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentFolderId]
            },
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

async function uploadToGoogleDrive(fileName, imageBuffer, operatorName, targetDate) {
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

    const opFolderId = await getOrCreateDriveFolder(drive, folderId, operatorName);
    const dateFolderId = await getOrCreateDriveFolder(drive, opFolderId, targetDate);

    const checkQuery = `'${dateFolderId}' in parents and name='${fileName}' and trashed=false`;
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

    let res;
    if (existingFiles.length > 0) {
        const existingId = existingFiles[0].id;
        console.log(`ℹ️ Photo existante sur Drive (${fileName}), remplacement...`);
        res = await drive.files.update({
            fileId: existingId,
            media: { mimeType: 'image/jpeg', body: Readable.from(imageBuffer) },
            supportsAllDrives: true,
            fields: 'id, webViewLink, webContentLink'
        });
    } else {
        res = await drive.files.create({
            requestBody: { name: fileName, parents: [dateFolderId] },
            media: { mimeType: 'image/jpeg', body: Readable.from(imageBuffer) },
            supportsAllDrives: true,
            supportsTeamDrives: true,
            fields: 'id, webViewLink, webContentLink'
        });
    }

    const fileId = res.data.id;
    try {
        await drive.permissions.create({
            fileId: fileId,
            supportsAllDrives: true,
            requestBody: { role: 'reader', type: 'anyone' }
        });
    } catch (pErr) {}

    return res.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
}

// --- Cookie Parsing ---
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
            list.push({
                name: parts[5],
                value: parts[6],
                domain: parts[0].startsWith('.') ? parts[0] : `.${parts[0]}`,
                path: parts[2] || '/',
                secure: parts[3].toUpperCase() === 'TRUE',
                httpOnly: false
            });
        }
    }
    return list;
}

function sanitizeCookiesList(raw) {
    const parsed = parseCookiesHelper(raw);
    const result = [];
    for (const c of parsed) {
        if (!c.name || c.value === undefined) continue;
        let dom = c.domain || '.chatgpt.com';
        const clean = {
            name: c.name,
            value: String(c.value),
            domain: dom.startsWith('.') || dom.includes('chatgpt.com') || dom.includes('openai.com') ? dom : `.${dom}`,
            path: c.path || '/',
            secure: c.secure !== undefined ? Boolean(c.secure) : true,
            httpOnly: Boolean(c.httpOnly),
        };
        result.push(clean);
        if (clean.domain.includes('openai.com') && !clean.domain.includes('chatgpt.com')) {
            result.push({ ...clean, domain: '.chatgpt.com' });
        }
    }
    return result;
}

function normalizeStr(str) {
    return (str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

async function getCookiesForOperator(opName) {
    const aliases = getOperatorAliases(opName);
    const envCandidates = [];
    for (const a of aliases) {
        envCandidates.push(
            `CHATGPT_WORK_COOKIES_${a}`,
            `CHATGPT_PRO_COOKIES_${a}`,
            `CHATGPT_COOKIES_${a}`,
            `COOKIES_WORK_${a}`,
            `COOKIES_PRO_${a}`
        );
    }
    envCandidates.push('CHATGPT_WORK_COOKIES', 'CHATGPT_PRO_COOKIES', 'CHATGPT_COOKIES');

    for (const key of envCandidates) {
        const val = (process.env[key] || '').trim();
        if (val.length > 20) {
            console.log(`🍪 Utilisation des cookies depuis GitHub Secrets (${key})`);
            return val;
        }
    }

    console.log(`🔍 Recherche des cookies pour ${opName} dans Supabase fiches...`);
    const { data } = await supabase.from('fiches').select('nom, lien').ilike('nom', '%COOKIE%');
    if (data && data.length > 0) {
        for (const a of aliases) {
            for (const item of data) {
                const nom = (item.nom || '').toUpperCase();
                if (nom.includes(a) && item.lien && item.lien.length > 20) {
                    console.log(`🍪 Utilisation des cookies depuis Supabase fiches (${item.nom})`);
                    return item.lien;
                }
            }
        }
        for (const item of data) {
            if (item.lien && item.lien.length > 20) {
                console.log(`🍪 Utilisation des cookies de repli depuis Supabase (${item.nom})`);
                return item.lien;
            }
        }
    }
    return null;
}

// Extraction avancée pour une conversation UNIQUE contenant plusieurs images (comme celle de Fifa)
async function harvestSingleConversation(page, convUrl, planningTasks) {
    console.log(`\n=============================================================`);
    console.log(`🧵 MOISSON D'UN FIL UNIQUE : ${convUrl}`);
    console.log(`=============================================================\n`);

    const convIdMatch = convUrl.match(/\/c\/([a-zA-Z0-9-]+)/);
    const convId = convIdMatch ? convIdMatch[1] : null;

    const capturedImagesByUrl = new Map();
    const onResponse = async (resp) => {
        const url = resp.url();
        if ((url.includes('files.oaiusercontent.com') || url.includes('/backend-api/files/')) && resp.ok()) {
            try {
                const buf = await resp.body();
                if (buf && buf.length > 20000) {
                    capturedImagesByUrl.set(url, buf);
                }
            } catch (e) {}
        }
    };
    page.on('response', onResponse);

    await page.goto(convUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(5000);

    // 1. Tenter d'extraire la structure complète via l'API interne /backend-api/conversation/<id>
    let apiConversation = null;
    if (convId) {
        console.log(`🔍 Tentative de lecture directe de l'arbre JSON de la conversation...`);
        apiConversation = await page.evaluate(async (cId) => {
            try {
                let token = null;
                try {
                    const sResp = await fetch('/api/auth/session');
                    if (sResp.ok) {
                        const sData = await sResp.json();
                        token = sData.accessToken;
                    }
                } catch (e) {}

                const headers = { 'accept': 'application/json' };
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const res = await fetch(`/backend-api/conversation/${cId}`, {
                    headers,
                    credentials: 'include'
                });
                if (!res.ok) return null;
                return await res.json();
            } catch (err) {
                return null;
            }
        }, convId);
    }

    // 2. Défilement progressif du fil de discussion du haut vers le bas pour forcer le rendu de toutes les images
    console.log(`📜 Défilement complet de la conversation pour charger toutes les photos...`);
    let previousHeight = 0;
    for (let scrollStep = 0; scrollStep < 40; scrollStep++) {
        const currentHeight = await page.evaluate(() => {
            window.scrollBy(0, 1000);
            return document.body.scrollHeight;
        });
        await page.waitForTimeout(1200);
        if (currentHeight === previousHeight && scrollStep > 10) {
            // Fin de page atteinte
            break;
        }
        previousHeight = currentHeight;
    }

    // Défiler vers le tout début puis re-descendre pour charger le lazy loading React
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1500);
    for (let scrollStep = 0; scrollStep < 20; scrollStep++) {
        await page.evaluate(() => window.scrollBy(0, 1500));
        await page.waitForTimeout(1000);
    }

    // 3. Extraction des paires (Prompt, Image) dans le DOM
    console.log(`🔎 Analyse des tours de parole (prompts et images générées)...`);
    const domPairs = await page.evaluate(() => {
        const pairs = [];
        const userElements = Array.from(document.querySelectorAll('[data-message-author-role="user"]'));
        
        for (let i = 0; i < userElements.length; i++) {
            const userEl = userElements[i];
            const promptText = (userEl.innerText || userEl.textContent || '').trim();

            // Trouver le message assistant qui suit directement
            let assistantEl = null;
            let curr = userEl.closest('article') || userEl.parentElement;
            
            while (curr && curr.nextElementSibling) {
                curr = curr.nextElementSibling;
                const asst = curr.querySelector('[data-message-author-role="assistant"]') || 
                    (curr.getAttribute('data-message-author-role') === 'assistant' ? curr : null);
                if (asst) {
                    assistantEl = asst;
                    break;
                }
                if (curr.querySelector('[data-message-author-role="user"]')) {
                    // Nouvel utilisateur sans image entretemps
                    break;
                }
            }

            let imgSrc = null;
            if (assistantEl) {
                const imgs = Array.from(assistantEl.querySelectorAll('img'));
                for (const im of imgs) {
                    const src = im.src || '';
                    if (src && !src.includes('avatar') && !src.includes('profile') && !src.includes('svg')) {
                        if (src.includes('oaiusercontent') || src.includes('blob:') || (im.naturalWidth >= 300 && im.naturalHeight >= 300)) {
                            imgSrc = src;
                            break;
                        }
                    }
                }
            }

            pairs.push({
                promptIndex: i + 1,
                promptText,
                imgSrc
            });
        }

        // Si aucun appairage strict, récupérer toutes les images de la page dans l'ordre
        if (pairs.every(p => !p.imgSrc)) {
            const allPageImgs = Array.from(document.querySelectorAll('img'))
                .map(im => im.src || '')
                .filter(src => src && !src.includes('avatar') && !src.includes('profile') && !src.includes('svg') && (src.includes('oaiusercontent') || src.includes('blob:')));
            
            for (let k = 0; k < pairs.length && k < allPageImgs.length; k++) {
                pairs[k].imgSrc = allPageImgs[k];
            }
        }

        return pairs;
    });

    console.log(`📋 ${domPairs.length} prompt(s) identifié(s) dans le fil.`);
    const validPairs = domPairs.filter(p => !!p.imgSrc);
    console.log(`📸 ${validPairs.length} photo(s) avec source image valide trouvée(s) !`);

    let processedCount = 0;
    const harvestedTaskIds = new Set();
    const uploadedLinks = [];

    for (let idx = 0; idx < domPairs.length; idx++) {
        const pair = domPairs[idx];
        if (!pair.imgSrc) {
            console.log(`⚠️ Prompt #${pair.promptIndex} : Aucune image associée trouvée.`);
            continue;
        }

        console.log(`\n-------------------------------------------------------------`);
        console.log(`🎨 Traitement Image #${pair.promptIndex} / ${domPairs.length}...`);

        // Matching de la tâche correspondante dans le planning
        let matchedTask = null;
        let matchedTaskIndex = -1;

        if (planningTasks && planningTasks.length > 0) {
            const cleanPrompt = normalizeStr(pair.promptText);
            for (let tIdx = 0; tIdx < planningTasks.length; tIdx++) {
                const t = planningTasks[tIdx];
                if (harvestedTaskIds.has(t.id)) continue;

                const safeFiche = normalizeStr(t.fiche_nom);
                const safeVille = normalizeStr(t.ville);

                if (safeFiche.length > 3 && cleanPrompt.includes(safeFiche)) {
                    matchedTask = t;
                    matchedTaskIndex = tIdx;
                    break;
                }
                if (safeVille.length > 3 && cleanPrompt.includes(safeVille) && cleanPrompt.includes(normalizeStr((t.fiche_nom || '').split(' ')[0]))) {
                    matchedTask = t;
                    matchedTaskIndex = tIdx;
                    break;
                }
            }

            // Fallback séquentiel
            if (!matchedTask) {
                for (let tIdx = 0; tIdx < planningTasks.length; tIdx++) {
                    const t = planningTasks[tIdx];
                    if (!harvestedTaskIds.has(t.id)) {
                        matchedTask = t;
                        matchedTaskIndex = tIdx;
                        break;
                    }
                }
            }
        }

        const taskData = matchedTask || {
            id: `fifa_${idx + 1}`,
            fiche_nom: `Chantier_${idx + 1}`,
            ville: 'Paris',
            pays: 'France',
            date: TARGET_DATE,
            operateur: TARGET_OPERATOR
        };

        console.log(`🎯 Tâche associée : "${taskData.fiche_nom}" (${taskData.ville})`);

        // Récupération du buffer binaire de l'image
        let rawBuffer = capturedImagesByUrl.get(pair.imgSrc);
        if (!rawBuffer) {
            console.log(`📥 Téléchargement in-page de l'image (${pair.imgSrc.substring(0, 80)}...)...`);
            const b64 = await page.evaluate(async (url) => {
                try {
                    const r = await fetch(url);
                    if (!r.ok) return null;
                    const b = await r.blob();
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result.split(',')[1]);
                        reader.readAsDataURL(b);
                    });
                } catch (e) {
                    return null;
                }
            }, pair.imgSrc);

            if (b64 && b64.length > 5000) {
                rawBuffer = Buffer.from(b64, 'base64');
            }
        }

        if (!rawBuffer) {
            console.log(`❌ Impossible de récupérer le fichier de l'image #${pair.promptIndex}.`);
            continue;
        }

        // Injection des métadonnées EXIF Smartphone & GPS
        const reviewTextContent = (taskData.commentaire || '') + ' ' + (taskData.travaux || '') + ' ' + pair.promptText;
        const geoBuffer = await injectExifAndGps(
            rawBuffer,
            taskData.ville || 'Paris',
            taskData.pays || 'France',
            taskData.date || TARGET_DATE,
            reviewTextContent
        );

        // Nommage standard : [OPERATEUR]_[DATE]_[FICHE]_img[N].jpg
        const safeOpName = (taskData.operateur || TARGET_OPERATOR).trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, '');
        const safeGmbName = (taskData.fiche_nom || 'GMB').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
        const taskDate = taskData.date || TARGET_DATE;
        const dateParts = taskDate.split('-');
        const dateFormatShort = dateParts.length === 3 
            ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0].slice(-2)}` 
            : taskDate.replace(/[^0-9]/g, '');
        const imgNum = matchedTaskIndex >= 0 ? matchedTaskIndex + 1 : idx + 1;
        const fileName = `${safeOpName}_${dateFormatShort}_${safeGmbName}_img${imgNum}.jpg`;

        // Upload Google Drive
        console.log(`☁️ Upload Google Drive : [${TARGET_OPERATOR}/${taskDate}/${fileName}]...`);
        const driveUrl = await uploadToGoogleDrive(fileName, geoBuffer, TARGET_OPERATOR, taskDate);
        console.log(`✅ PHOTO UPLOADÉE AVEC SUCCÈS SUR GOOGLE DRIVE ! Lien : ${driveUrl}`);

        uploadedLinks.push({ fiche: taskData.fiche_nom, ville: taskData.ville, url: driveUrl });
        processedCount++;
        if (matchedTask) {
            harvestedTaskIds.add(matchedTask.id);
            try {
                await supabase.from('planning').update({ url_image: driveUrl }).eq('id', matchedTask.id);
            } catch (e) {}
        }
    }

    page.off('response', onResponse);
    return { processedCount, uploadedLinks };
}

// Extraction multi-conversations (pour Kevin ou fil multiples)
async function harvestMultiConversations(page, planningTasks) {
    console.log(`📜 Récupération de la liste des conversations récentes...`);
    const convData = await page.evaluate(async () => {
        try {
            let token = null;
            try {
                const sResp = await fetch('/api/auth/session');
                if (sResp.ok) {
                    const sData = await sResp.json();
                    token = sData.accessToken;
                }
            } catch (e) {}

            const headers = { 'accept': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch('/backend-api/conversations?offset=0&limit=80&order=updated', {
                headers,
                credentials: 'include'
            });

            if (!res.ok) return { error: `HTTP ${res.status}` };
            return await res.json();
        } catch (err) {
            return { error: err.message };
        }
    });

    let conversations = [];
    if (convData && Array.isArray(convData.items)) {
        conversations = convData.items;
        console.log(`✅ ${conversations.length} conversation(s) trouvée(s) via l'API ChatGPT !`);
    } else {
        conversations = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('nav a[href*="/c/"]'));
            return links.map(a => {
                const href = a.getAttribute('href') || '';
                const match = href.match(/\/c\/([a-zA-Z0-9-]+)/);
                return {
                    id: match ? match[1] : null,
                    title: (a.innerText || a.textContent || '').trim()
                };
            }).filter(c => !!c.id);
        });
        console.log(`✅ ${conversations.length} conversation(s) trouvée(s) dans le DOM !`);
    }

    const cutoffTime = Date.now() - (36 * 60 * 60 * 1000);
    const recentConvs = conversations.filter(c => {
        if (!c.update_time && !c.create_time) return true;
        const t = new Date(c.update_time || c.create_time).getTime();
        return t >= cutoffTime;
    });

    let harvestedCount = 0;
    const harvestedTasks = new Set();
    const uploadedLinks = [];

    for (let i = 0; i < recentConvs.length; i++) {
        const conv = recentConvs[i];
        const convUrl = `https://chatgpt.com/c/${conv.id}`;
        
        let capturedImageBuffers = [];
        const onResponse = async (resp) => {
            const url = resp.url();
            if ((url.includes('files.oaiusercontent.com') || url.includes('/backend-api/files/')) && resp.ok()) {
                try {
                    const buf = await resp.body();
                    if (buf && buf.length > 20000) capturedImageBuffers.push(buf);
                } catch (e) {}
            }
        };

        page.on('response', onResponse);

        try {
            await page.goto(convUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
            await page.waitForTimeout(3000);
            try { await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); } catch (e) {}
            await page.waitForTimeout(2000);

            const convText = await page.evaluate(() => {
                const userTurns = Array.from(document.querySelectorAll('[data-message-author-role="user"]'));
                return {
                    fullUserText: userTurns.map(u => u.innerText || '').join('\n'),
                    title: document.title
                };
            });

            let matchedTask = null;
            let matchedTaskIndex = -1;

            if (planningTasks && planningTasks.length > 0) {
                const searchCorpus = (convText.fullUserText + ' ' + (conv.title || '')).toLowerCase();
                for (let tIdx = 0; tIdx < planningTasks.length; tIdx++) {
                    const t = planningTasks[tIdx];
                    if (harvestedTasks.has(t.id)) continue;
                    if (normalizeStr(t.fiche_nom).length > 3 && normalizeStr(searchCorpus).includes(normalizeStr(t.fiche_nom))) {
                        matchedTask = t;
                        matchedTaskIndex = tIdx;
                        break;
                    }
                }
                if (!matchedTask) {
                    for (let tIdx = 0; tIdx < planningTasks.length; tIdx++) {
                        if (!harvestedTasks.has(planningTasks[tIdx].id)) {
                            matchedTask = planningTasks[tIdx];
                            matchedTaskIndex = tIdx;
                            break;
                        }
                    }
                }
            }

            let rawBuffer = capturedImageBuffers.length > 0 ? capturedImageBuffers[capturedImageBuffers.length - 1] : null;
            if (!rawBuffer) {
                const base64Img = await page.evaluate(async () => {
                    const imgs = Array.from(document.querySelectorAll('img'));
                    for (const img of imgs) {
                        const src = img.src || '';
                        if (!src || src.includes('avatar') || src.includes('profile') || src.includes('svg')) continue;
                        if (src.includes('oaiusercontent') || src.includes('blob:') || (img.naturalWidth >= 300 && img.naturalHeight >= 300)) {
                            try {
                                const canvas = document.createElement('canvas');
                                canvas.width = img.naturalWidth || img.width || 1024;
                                canvas.height = img.naturalHeight || img.height || 1024;
                                const ctx = canvas.getContext('2d');
                                ctx.drawImage(img, 0, 0);
                                return canvas.toDataURL('image/jpeg', 0.93).split(',')[1];
                            } catch (e) {
                                try {
                                    const r = await fetch(src);
                                    const b = await r.blob();
                                    return new Promise((resolve) => {
                                        const reader = new FileReader();
                                        reader.onloadend = () => resolve(reader.result.split(',')[1]);
                                        reader.readAsDataURL(b);
                                    });
                                } catch (err2) {}
                            }
                        }
                    }
                    return null;
                });
                if (base64Img && base64Img.length > 5000) rawBuffer = Buffer.from(base64Img, 'base64');
            }

            if (!rawBuffer) continue;

            const taskData = matchedTask || {
                id: `fallback_${conv.id.substring(0, 8)}`,
                fiche_nom: conv.title || 'Chantier',
                ville: 'Paris',
                pays: 'France',
                date: TARGET_DATE,
                operateur: TARGET_OPERATOR
            };

            const reviewTextContent = (taskData.commentaire || '') + ' ' + (taskData.travaux || '') + ' ' + conv.title;
            const geoBuffer = await injectExifAndGps(rawBuffer, taskData.ville || 'Paris', taskData.pays || 'France', taskData.date || TARGET_DATE, reviewTextContent);

            const safeOpName = (taskData.operateur || TARGET_OPERATOR).trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, '');
            const safeGmbName = (taskData.fiche_nom || 'GMB').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
            const taskDate = taskData.date || TARGET_DATE;
            const dateParts = taskDate.split('-');
            const dateFormatShort = dateParts.length === 3 ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0].slice(-2)}` : taskDate.replace(/[^0-9]/g, '');
            const imgIdx = matchedTaskIndex >= 0 ? matchedTaskIndex + 1 : harvestedCount + 1;
            const fileName = `${safeOpName}_${dateFormatShort}_${safeGmbName}_img${imgIdx}.jpg`;

            const driveUrl = await uploadToGoogleDrive(fileName, geoBuffer, TARGET_OPERATOR, taskDate);
            console.log(`✅ Photo uploadée : ${fileName} -> ${driveUrl}`);

            uploadedLinks.push({ fiche: taskData.fiche_nom, ville: taskData.ville, url: driveUrl });
            harvestedCount++;
            if (matchedTask) {
                harvestedTasks.add(matchedTask.id);
                try {
                    await supabase.from('planning').update({ url_image: driveUrl }).eq('id', matchedTask.id);
                } catch (e) {}
            }
        } catch (cErr) {
            console.error(`Erreur sur conversation ${conv.id} :`, cErr.message);
        } finally {
            page.off('response', onResponse);
        }
    }
    return { processedCount: harvestedCount, uploadedLinks };
}

async function harvest() {
    console.log(`\n=============================================================`);
    console.log(`🌾 DÉMARRAGE DU MOISSONNEUR D'IMAGES CHATGPT (${TARGET_OPERATOR})`);
    console.log(`📅 Date cible : ${TARGET_DATE}`);
    if (CONVERSATION_URL) console.log(`🔗 URL Conversation cible : ${CONVERSATION_URL}`);
    console.log(`=============================================================\n`);

    // Récupération des tâches dans Supabase
    const { data: planningTasks } = await supabase
        .from('planning')
        .select('*')
        .eq('date', TARGET_DATE)
        .ilike('operateur', `%${TARGET_OPERATOR.includes('Fif') ? 'Fif' : TARGET_OPERATOR}%`);

    console.log(`📋 ${planningTasks ? planningTasks.length : 0} tâche(s) trouvée(s) pour ${TARGET_OPERATOR} le ${TARGET_DATE}.`);

    // Récupération des cookies
    const rawCookies = await getCookiesForOperator(TARGET_OPERATOR);
    if (!rawCookies) throw new Error(`❌ Aucun cookie trouvé pour ${TARGET_OPERATOR} !`);
    const parsedCookies = sanitizeCookiesList(rawCookies);

    // Connexion Playwright
    let browser;
    if (BROWSERLESS_TOKEN) {
        console.log(`🌐 Connexion à Browserless...`);
        browser = await chromium.connectOverCDP(`wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}&stealth`);
    } else {
        console.log(`💻 Lancement de Chromium local...`);
        browser = await chromium.launch({ headless: true });
    }

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        viewport: { width: 1440, height: 900 }
    });

    await context.addCookies(parsedCookies);
    const page = await context.newPage();

    let result;
    if (CONVERSATION_URL && CONVERSATION_URL.includes('/c/')) {
        result = await harvestSingleConversation(page, CONVERSATION_URL, planningTasks);
    } else {
        await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(4000);
        result = await harvestMultiConversations(page, planningTasks);
    }

    await browser.close();

    console.log(`\n=============================================================`);
    console.log(`🎉 MOISSON TERMINÉE !`);
    console.log(`📸 ${result.processedCount} photo(s) récupérée(s) et uploadée(s) sur Google Drive !`);
    console.log(`=============================================================\n`);

    const summaryMsg = `<b>🌾 MOISSONNEUR D'IMAGES CHATGPT (${TARGET_OPERATOR})</b>\n\n` +
        `✅ <b>Récupération terminée avec succès !</b>\n` +
        `📸 Photos moissonnées : <b>${result.processedCount} photo(s)</b>\n` +
        `📅 Date de planification : <b>${TARGET_DATE}</b>\n` +
        `📍 Métadonnées EXIF & GPS intégrées\n` +
        `📂 Dossier : Google Drive / ${TARGET_OPERATOR} / ${TARGET_DATE}`;
        
    try { await sendTelegramNotification(summaryMsg); } catch (tErr) {}
}

harvest().catch(err => {
    console.error("Erreur critique du moissonneur :", err);
    process.exit(1);
});
