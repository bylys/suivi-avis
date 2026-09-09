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
    let conversationJsonResponse = null;

    const onResponse = async (resp) => {
        const url = resp.url();
        const ct = (resp.headers()['content-type'] || '').toLowerCase();
        
        // Interception automatique du JSON complet de la conversation
        if (convId && url.includes(`/backend-api/conversation/${convId}`) && resp.ok()) {
            try {
                conversationJsonResponse = await resp.json();
                console.log(`🎉 Arbre JSON de la conversation intercepté en direct via le réseau !`);
            } catch (e) {}
        }

        // Interception de toutes les images chargées
        if ((url.includes('oaiusercontent') || url.includes('/backend-api/files/') || ct.startsWith('image/')) && resp.ok()) {
            try {
                const buf = await resp.body();
                if (buf && buf.length > 15000 && !url.includes('avatar') && !url.includes('profile') && !url.includes('icon')) {
                    console.log(`⚡ Image réseau interceptée (${buf.length} octets) : ${url.substring(0, 90)}...`);
                    capturedImagesByUrl.set(url, buf);
                }
            } catch (e) {}
        }
    };
    page.on('response', onResponse);

    await page.goto(convUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(6000);

    // Si le JSON n'a pas été intercepté lors du goto initial, appel explicite in-page
    if (!conversationJsonResponse && convId) {
        console.log(`🔍 Tentative de lecture in-page de /backend-api/conversation/${convId}...`);
        conversationJsonResponse = await page.evaluate(async (cId) => {
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
                if (!res.ok) return { errorStatus: res.status, errorText: await res.text() };
                return await res.json();
            } catch (err) {
                return { error: err.message };
            }
        }, convId);
    }

    if (conversationJsonResponse) {
        if (conversationJsonResponse.mapping) {
            const nodeCount = Object.keys(conversationJsonResponse.mapping).length;
            console.log(`✅ Arbre JSON chargé avec succès : ${nodeCount} nœuds détectés (Titre: "${conversationJsonResponse.title || ''}")`);
        } else if (conversationJsonResponse.errorStatus) {
            console.log(`⚠️ API conversation error : ${conversationJsonResponse.errorStatus} ${conversationJsonResponse.errorText?.substring(0, 100)}`);
        }
    }

    // Scroll progressif élément par élément pour forcer le rendu de chaque message
    console.log(`📜 Défilement progressif sur chaque message pour forcer le rendu Chromium...`);
    const assistantLocators = await page.$$('[data-message-author-role="assistant"], [data-message-author-role="user"]');
    console.log(`🔍 ${assistantLocators.length} blocs de message trouvés dans le DOM.`);
    for (let lIdx = 0; lIdx < assistantLocators.length; lIdx++) {
        await assistantLocators[lIdx].scrollIntoViewIfNeeded().catch(() => {});
        await page.waitForTimeout(600);
    }

    // Capture d'écran complète pour diagnostic visuel
    try {
        await page.screenshot({ path: 'debug-fifa-conversation.png', fullPage: true });
        console.log(`📸 Capture d'écran globale enregistrée (debug-fifa-conversation.png)`);
    } catch (e) {}

    // Sauvegarde du diagnostic brut
    try {
        if (conversationJsonResponse) {
            fs.writeFileSync('debug-fifa-conversation.json', JSON.stringify(conversationJsonResponse, null, 2));
            console.log(`💾 JSON complet de la conversation sauvegardé (debug-fifa-conversation.json)`);
        }
    } catch (e) {}

    // 1. EXTRACTION PUISSANTE DEPUIS L'ARBRE JSON OPENAI
    const jsonImages = [];
    if (conversationJsonResponse && conversationJsonResponse.mapping) {
        const mapping = conversationJsonResponse.mapping;
        const nodes = Object.values(mapping);
        console.log(`📡 Analyse de l'arbre JSON OpenAI : ${nodes.length} nœuds...`);

        const nodeById = new Map();
        for (const n of nodes) nodeById.set(n.id, n);

        function findUserPromptForNode(n) {
            let curr = n;
            while (curr && curr.parent) {
                const p = nodeById.get(curr.parent);
                if (!p) break;
                if (p.message && p.message.author && p.message.author.role === 'user') {
                    const parts = p.message.content?.parts || [];
                    return parts.map(pt => (typeof pt === 'string' ? pt : JSON.stringify(pt))).join('\n');
                }
                curr = p;
            }
            return '';
        }

        for (const n of nodes) {
            const msg = n.message;
            if (!msg || msg.author?.role !== 'assistant') continue;

            const userPrompt = findUserPromptForNode(n);
            const parts = msg.content?.parts || [];

            for (const p of parts) {
                if (typeof p === 'object' && p !== null) {
                    if (p.asset_pointer) {
                        const fileId = p.asset_pointer.replace('file-service://', '');
                        jsonImages.push({
                            fileId,
                            promptText: userPrompt,
                            width: p.width,
                            height: p.height
                        });
                    }
                } else if (typeof p === 'string') {
                    const mdMatch = p.match(/!\[.*?\]\((https:\/\/files\.oaiusercontent\.com\/[^\)]+)\)/);
                    if (mdMatch) {
                        jsonImages.push({
                            directUrl: mdMatch[1],
                            promptText: userPrompt
                        });
                    }
                }
            }

            // Recherche des file-id dans les métadonnées de DALL-E
            if (msg.metadata) {
                const metaStr = JSON.stringify(msg.metadata);
                const fileMatches = metaStr.match(/file-[a-zA-Z0-9_-]+/g);
                if (fileMatches) {
                    for (const fId of fileMatches) {
                        if (!jsonImages.some(im => im.fileId === fId)) {
                            jsonImages.push({
                                fileId: fId,
                                promptText: userPrompt
                            });
                        }
                    }
                }
            }
        }

        console.log(`🎯 ${jsonImages.length} image(s) DALL-E identifiée(s) dans l'arbre JSON complet !`);
    }

    // 2. DÉFILEMENT INCRÉMENTAL DU DOM POUR CAPTURER LES MESSAGES VIRTUELS REACT
    console.log(`📜 Défilement incrémental du haut vers le bas pour capturer tous les messages virtuels...`);
    const allSeenPairs = new Map();
    const allSeenImgs = new Set();

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(2000);

    let scrollStep = 0;
    let consecutiveNoScroll = 0;
    let previousScrollY = -1;

    while (scrollStep < 150) {
        scrollStep++;
        const visibleStepData = await page.evaluate(() => {
            const pairs = [];
            const users = Array.from(document.querySelectorAll('[data-message-author-role="user"]'));
            const assistants = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'));
            
            for (let i = 0; i < users.length; i++) {
                const uText = (users[i].innerText || users[i].textContent || '').trim();
                const asst = assistants[i] || null;
                const asstText = asst ? (asst.innerText || asst.textContent || '').trim() : '';
                
                let foundImgSrc = null;
                if (asst) {
                    const imgs = Array.from(asst.querySelectorAll('img'));
                    for (const im of imgs) {
                        const src = im.currentSrc || im.src || '';
                        if (src && !src.includes('avatar') && !src.includes('profile') && !src.includes('svg')) {
                            foundImgSrc = src;
                            break;
                        }
                    }
                }

                if (uText.length > 5) {
                    pairs.push({
                        prompt: uText,
                        reply: asstText,
                        imgSrc: foundImgSrc
                    });
                }
            }
            return pairs;
        });

        for (const item of visibleStepData) {
            const pKey = normalizeStr(item.prompt).substring(0, 80);
            if (!allSeenPairs.has(pKey) || (!allSeenPairs.get(pKey).imgSrc && item.imgSrc)) {
                allSeenPairs.set(pKey, item);
                if (item.imgSrc) allSeenImgs.add(item.imgSrc);
            }
        }

        const scrollInfo = await page.evaluate(() => {
            window.scrollBy(0, 700);
            return {
                scrollY: window.scrollY,
                scrollHeight: document.body.scrollHeight,
                innerHeight: window.innerHeight
            };
        });

        if (scrollInfo.scrollY === previousScrollY) {
            consecutiveNoScroll++;
            if (consecutiveNoScroll >= 4) {
                console.log(`🏁 Fin du fil de discussion atteinte au scroll #${scrollStep} !`);
                break;
            }
        } else {
            consecutiveNoScroll = 0;
            previousScrollY = scrollInfo.scrollY;
        }

        await page.waitForTimeout(600);
    }

    console.log(`📋 Total cumulé dans le DOM après scan incrémental : ${allSeenPairs.size} prompt(s) et ${allSeenImgs.size} image(s) capturée(s) !`);

    // Capture d'écran complète pour diagnostic visuel
    try {
        await page.screenshot({ path: 'debug-fifa-conversation.png', fullPage: true });
        console.log(`📸 Capture d'écran globale enregistrée (debug-fifa-conversation.png)`);
    } catch (e) {}

    // Sauvegarde du rapport incrémental DOM
    try {
        fs.writeFileSync('debug-fifa-turns.json', JSON.stringify({
            seenPromptsCount: allSeenPairs.size,
            seenImagesCount: allSeenImgs.size,
            pairs: Array.from(allSeenPairs.values())
        }, null, 2));
    } catch (e) {}

    // 3. CONSTRUCTION DES PAIRES FINALES À TRAITER
    let pairsToProcess = [];

    // Priorité 1 : Fichiers images trouvés dans le JSON OpenAI
    if (jsonImages.length > 0) {
        console.log(`🚀 Extraction prioritaire depuis les ${jsonImages.length} image(s) du JSON OpenAI...`);
        for (let j = 0; j < jsonImages.length; j++) {
            const jImg = jsonImages[j];
            if (jImg.directUrl) {
                pairsToProcess.push({
                    promptText: jImg.promptText,
                    imgUrl: jImg.directUrl
                });
            } else if (jImg.fileId) {
                console.log(`📡 [${j+1}/${jsonImages.length}] Récupération URL de téléchargement pour file_id : ${jImg.fileId}...`);
                const dlData = await page.evaluate(async (fId) => {
                    try {
                        let token = null;
                        try {
                            const sResp = await fetch('/api/auth/session');
                            if (sResp.ok) token = (await sResp.json()).accessToken;
                        } catch (e) {}
                        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                        const res = await fetch(`/backend-api/files/${fId}/download`, { headers, credentials: 'include' });
                        if (!res.ok) return null;
                        return await res.json();
                    } catch (e) { return null; }
                }, jImg.fileId);

                if (dlData && dlData.download_url) {
                    console.log(`   ✅ Lien de téléchargement haute résolution obtenu !`);
                    pairsToProcess.push({
                        promptText: jImg.promptText,
                        imgUrl: dlData.download_url
                    });
                }
            }
        }
    }

    // Priorité 2 : Paires issues du scan DOM incrémental
    if (pairsToProcess.length === 0 && allSeenPairs.size > 0) {
        console.log(`🔄 Utilisation des données du scan incrémental DOM...`);
        for (const p of allSeenPairs.values()) {
            if (p.imgSrc) {
                pairsToProcess.push({
                    promptText: p.prompt,
                    imgUrl: p.imgSrc
                });
            }
        }
    }

    // Priorité 3 : Paires avec les images réseau interceptées
    if (pairsToProcess.length === 0 && capturedImagesByUrl.size > 0) {
        console.log(`🔄 Utilisation des ${capturedImagesByUrl.size} image(s) interceptée(s) sur le réseau...`);
        const netUrls = Array.from(capturedImagesByUrl.keys());
        const domPrompts = Array.from(allSeenPairs.values()).map(p => p.prompt);
        for (let i = 0; i < netUrls.length; i++) {
            pairsToProcess.push({
                promptText: domPrompts[i] || `Chantier #${i + 1}`,
                imgUrl: netUrls[i]
            });
        }
    }

    console.log(`\n=============================================================`);
    console.log(`📸 TOTAL FINAL DE PHOTOS PRÊTES À MOISSONNER : ${pairsToProcess.length}`);
    console.log(`=============================================================\n`);

    let processedCount = 0;
    const harvestedTaskIds = new Set();
    const uploadedLinks = [];

    for (let idx = 0; idx < pairsToProcess.length; idx++) {
        const item = pairsToProcess[idx];
        console.log(`\n-------------------------------------------------------------`);
        console.log(`🎨 Traitement Photo #${idx + 1} / ${pairsToProcess.length}...`);

        // Matching de la tâche correspondante dans le planning
        let matchedTask = null;
        let matchedTaskIndex = -1;

        if (planningTasks && planningTasks.length > 0) {
            const cleanPrompt = normalizeStr(item.promptText);
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
        let rawBuffer = capturedImagesByUrl.get(item.imgUrl);
        if (!rawBuffer) {
            console.log(`📥 Téléchargement in-page de l'image : ${item.imgUrl.substring(0, 80)}...`);
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
                } catch (e) { return null; }
            }, item.imgUrl);

            if (b64 && b64.length > 5000) {
                rawBuffer = Buffer.from(b64, 'base64');
            }
        }

        if (!rawBuffer) {
            console.log(`❌ Impossible de récupérer les octets de la photo #${idx + 1}.`);
            continue;
        }

        // Injection des métadonnées EXIF Smartphone & GPS
        const reviewTextContent = (taskData.commentaire || '') + ' ' + (taskData.travaux || '') + ' ' + item.promptText;
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
