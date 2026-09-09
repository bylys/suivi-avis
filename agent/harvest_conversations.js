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
const TARGET_OPERATOR = process.env.OPERATOR_NAME ? process.env.OPERATOR_NAME.trim() : 'Kevin';
const TARGET_DATE = process.env.TARGET_DATE 
    ? process.env.TARGET_DATE.trim() 
    : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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
    const op = (opName || 'Kevin').toUpperCase();
    const envCandidates = [
        `CHATGPT_PRO_COOKIES_${op}`,
        `CHATGPT_WORK_COOKIES_${op}`,
        `CHATGPT_COOKIES_${op}`,
        `COOKIES_PRO_${op}`,
        `CHATGPT_PRO_COOKIES`,
        `CHATGPT_WORK_COOKIES`,
        `CHATGPT_COOKIES`
    ];
    for (const key of envCandidates) {
        const val = (process.env[key] || '').trim();
        if (val.length > 20) {
            console.log(`🍪 Utilisation des cookies depuis GitHub Secrets (${key})`);
            return val;
        }
    }

    console.log(`🔍 Recherche des cookies pour ${op} dans Supabase fiches...`);
    const { data } = await supabase.from('fiches').select('nom, lien').ilike('nom', '%COOKIE%');
    if (data && data.length > 0) {
        for (const item of data) {
            const nom = (item.nom || '').toUpperCase();
            if (nom.includes(op) && item.lien && item.lien.length > 20) {
                console.log(`🍪 Utilisation des cookies depuis Supabase fiches (${item.nom})`);
                return item.lien;
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

async function harvest() {
    console.log(`\n=============================================================`);
    console.log(`🌾 DÉMARRAGE DU MOISSONNEUR D'IMAGES CHATGPT PRO (${TARGET_OPERATOR})`);
    console.log(`📅 Date cible : ${TARGET_DATE}`);
    console.log(`=============================================================\n`);

    const { data: planningTasks, error: pErr } = await supabase
        .from('planning')
        .select('*')
        .eq('date', TARGET_DATE)
        .ilike('operateur', `%${TARGET_OPERATOR}%`);

    if (pErr || !planningTasks || planningTasks.length === 0) {
        console.log(`⚠️ Aucune tâche trouvée dans planning pour ${TARGET_OPERATOR} le ${TARGET_DATE}.`);
    } else {
        console.log(`📋 ${planningTasks.length} tâche(s) trouvée(s) dans le planning pour ${TARGET_OPERATOR} le ${TARGET_DATE}.`);
    }

    const rawCookies = await getCookiesForOperator(TARGET_OPERATOR);
    if (!rawCookies) {
        throw new Error(`❌ Aucun cookie trouvé pour ${TARGET_OPERATOR} !`);
    }
    const parsedCookies = sanitizeCookiesList(rawCookies);

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

    console.log(`🚀 Navigation vers ChatGPT pour récupérer l'historique des conversations...`);
    await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(4000);

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

            if (!res.ok) {
                return { error: `HTTP ${res.status}` };
            }
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
        console.log(`⚠️ API non disponible (${convData?.error || 'inconnu'}), recherche dans la barre latérale...`);
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

    if (conversations.length === 0) {
        console.log("❌ Aucune conversation trouvée sur ce compte ChatGPT.");
        await browser.close();
        return;
    }

    const cutoffTime = Date.now() - (36 * 60 * 60 * 1000);
    const recentConvs = conversations.filter(c => {
        if (!c.update_time && !c.create_time) return true;
        const t = new Date(c.update_time || c.create_time).getTime();
        return t >= cutoffTime;
    });

    console.log(`🔍 ${recentConvs.length} conversation(s) récente(s) (< 36h) à analyser.`);

    let harvestedCount = 0;
    const harvestedTasks = new Set();

    for (let i = 0; i < recentConvs.length; i++) {
        const conv = recentConvs[i];
        console.log(`\n-------------------------------------------------------------`);
        console.log(`🔎 [${i + 1}/${recentConvs.length}] Examen de la conversation : "${conv.title}" (ID: ${conv.id})`);
        
        const convUrl = `https://chatgpt.com/c/${conv.id}`;
        
        let capturedImageBuffers = [];
        const onResponse = async (resp) => {
            const url = resp.url();
            if ((url.includes('files.oaiusercontent.com') || url.includes('/backend-api/files/')) && resp.ok()) {
                try {
                    const buf = await resp.body();
                    if (buf && buf.length > 20000) {
                        capturedImageBuffers.push(buf);
                    }
                } catch (e) {}
            }
        };

        page.on('response', onResponse);

        try {
            await page.goto(convUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
            await page.waitForTimeout(4000);

            try {
                await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            } catch (e) {}
            await page.waitForTimeout(2000);

            const convText = await page.evaluate(() => {
                const userTurns = Array.from(document.querySelectorAll('[data-message-author-role="user"]'));
                const lastUser = userTurns.length > 0 ? (userTurns[0].innerText || '') : '';
                return {
                    fullUserText: userTurns.map(u => u.innerText || '').join('\n'),
                    firstUserText: lastUser,
                    title: document.title
                };
            });

            let matchedTask = null;
            let matchedTaskIndex = -1;

            if (planningTasks && planningTasks.length > 0) {
                const searchCorpus = (convText.fullUserText + ' ' + (conv.title || '') + ' ' + convText.title).toLowerCase();
                
                for (let tIdx = 0; tIdx < planningTasks.length; tIdx++) {
                    const t = planningTasks[tIdx];
                    if (harvestedTasks.has(t.id)) continue;

                    const safeFiche = normalizeStr(t.fiche_nom);
                    const safeVille = normalizeStr(t.ville);

                    if (safeFiche.length > 3 && normalizeStr(searchCorpus).includes(safeFiche)) {
                        matchedTask = t;
                        matchedTaskIndex = tIdx;
                        break;
                    }
                    if (safeVille.length > 3 && searchCorpus.includes((t.ville || '').toLowerCase()) && searchCorpus.includes((t.fiche_nom || '').split(' ')[0].toLowerCase())) {
                        matchedTask = t;
                        matchedTaskIndex = tIdx;
                        break;
                    }
                }

                if (!matchedTask) {
                    for (let tIdx = 0; tIdx < planningTasks.length; tIdx++) {
                        const t = planningTasks[tIdx];
                        if (!harvestedTasks.has(t.id)) {
                            matchedTask = t;
                            matchedTaskIndex = tIdx;
                            break;
                        }
                    }
                }
            }

            let rawBuffer = null;
            if (capturedImageBuffers.length > 0) {
                rawBuffer = capturedImageBuffers[capturedImageBuffers.length - 1];
                console.log(`⚡ Image capturée directement depuis le flux réseau (${rawBuffer.length} octets) !`);
            }

            if (!rawBuffer) {
                console.log(`🖼️ Tentative d'extraction in-page via canvas/fetch...`);
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

                if (base64Img && base64Img.length > 5000) {
                    rawBuffer = Buffer.from(base64Img, 'base64');
                    console.log(`✅ Image extraite via canvas (${rawBuffer.length} octets) !`);
                }
            }

            if (!rawBuffer) {
                console.log(`⚠️ Aucune image DALL-E trouvée dans cette conversation.`);
                continue;
            }

            const taskData = matchedTask || {
                id: `fallback_${conv.id.substring(0, 8)}`,
                fiche_nom: conv.title || 'Chantier',
                ville: 'Paris',
                pays: 'France',
                date: TARGET_DATE,
                operateur: TARGET_OPERATOR
            };

            console.log(`🎯 Tâche associée : "${taskData.fiche_nom}" à ${taskData.ville} (${taskData.date})`);

            const reviewTextContent = (taskData.commentaire || '') + ' ' + (taskData.travaux || '') + ' ' + conv.title;
            const geoBuffer = await injectExifAndGps(
                rawBuffer,
                taskData.ville || 'Paris',
                taskData.pays || 'France',
                taskData.date || TARGET_DATE,
                reviewTextContent
            );

            const safeOpName = (taskData.operateur || TARGET_OPERATOR).trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, '');
            const safeGmbName = (taskData.fiche_nom || 'GMB').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
            const taskDate = taskData.date || TARGET_DATE;
            const dateParts = taskDate.split('-');
            const dateFormatShort = dateParts.length === 3 
                ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0].slice(-2)}` 
                : taskDate.replace(/[^0-9]/g, '');
            const imgIdx = matchedTaskIndex >= 0 ? matchedTaskIndex + 1 : harvestedCount + 1;
            const fileName = `${safeOpName}_${dateFormatShort}_${safeGmbName}_img${imgIdx}.jpg`;

            console.log(`☁️ Téléversement sur Google Drive : [${TARGET_OPERATOR}/${taskDate}/${fileName}]...`);
            const driveUrl = await uploadToGoogleDrive(fileName, geoBuffer, TARGET_OPERATOR, taskDate);
            console.log(`✅ PHOTO UPLOADÉE AVEC SUCCÈS SUR GOOGLE DRIVE !`);
            console.log(`🔗 Lien : ${driveUrl}`);

            harvestedCount++;
            if (matchedTask) {
                harvestedTasks.add(matchedTask.id);
            }

        } catch (cErr) {
            console.error(`Erreur sur la conversation ${conv.id} :`, cErr.message);
        } finally {
            page.off('response', onResponse);
        }
    }

    await browser.close();

    console.log(`\n=============================================================`);
    console.log(`🎉 MOISSON TERMINÉE AVEC SUCCÈS !`);
    console.log(`📸 ${harvestedCount} photo(s) récupérée(s), géolocalisée(s) et uploadée(s) sur Google Drive !`);
    console.log(`=============================================================\n`);

    const summaryMsg = `<b>🌾 MOISSONNEUR D'IMAGES CHATGPT (${TARGET_OPERATOR})</b>\n\n` +
        `✅ <b>Récupération terminée avec succès !</b>\n` +
        `📸 Photos moissonnées : <b>${harvestedCount} photo(s)</b>\n` +
        `📅 Date de planification : <b>${TARGET_DATE}</b>\n` +
        `📍 Métadonnées EXIF & GPS intégrées\n` +
        `📂 Dossier : Google Drive / ${TARGET_OPERATOR} / ${TARGET_DATE}`;
        
    try {
        await sendTelegramNotification(summaryMsg);
    } catch (tErr) {}
}

harvest().catch(err => {
    console.error("Erreur critique du moissonneur :", err);
    process.exit(1);
});
