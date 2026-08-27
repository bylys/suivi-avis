require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');

async function main() {
    const credentialsRaw = process.env.GOOGLE_DRIVE_CREDENTIALS;
    if (!credentialsRaw) {
        console.error("❌ GOOGLE_DRIVE_CREDENTIALS manquant !");
        process.exit(1);
    }

    const credentials = JSON.parse(credentialsRaw);
    const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive'] });
    const drive = google.drive({ version: 'v3', auth });

    console.log("🔍 EXTRACTION DE L'INVENTAIRE COMPLET DE TOUTES LES PHOTOS SUR GOOGLE DRIVE...");

    const folderRes = await drive.files.list({
        q: "mimeType = 'application/vnd.google-apps.folder' and trashed=false",
        fields: 'files(id, name, parents)',
        pageSize: 500,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
    });
    const folderMap = {};
    for (const f of (folderRes.data.files || [])) {
        folderMap[f.id] = f.name;
    }

    const fileRes = await drive.files.list({
        q: "mimeType != 'application/vnd.google-apps.folder' and trashed=false",
        fields: 'files(id, name, createdTime, parents, webViewLink)',
        pageSize: 500,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
    });

    const files = fileRes.data.files || [];
    console.log(`\n======================================================`);
    console.log(`📸 INVENTAIRE TOTAL DE ${files.length} PHOTOS SUR GOOGLE DRIVE :`);
    console.log(`======================================================\n`);

    const ops = ['Kevin', 'Fif', 'Fifaliana', 'Aina', 'Anjara', 'Korail', 'Kintana'];
    const photosByOp = {};
    for (const op of ops) photosByOp[op] = [];
    photosByOp['Autres'] = [];

    for (const file of files) {
        const parentName = file.parents ? (folderMap[file.parents[0]] || 'Racine Drive') : 'Racine Drive';
        let matched = 'Autres';
        for (const op of ops) {
            if (file.name.toLowerCase().includes(op.toLowerCase()) || parentName.toLowerCase().includes(op.toLowerCase())) {
                matched = (op.toLowerCase() === 'fifaliana') ? 'Fif' : op;
                break;
            }
        }
        photosByOp[matched].push({
            name: file.name,
            folder: parentName,
            createdTime: file.createdTime,
            link: file.webViewLink
        });
    }

    for (const [op, list] of Object.entries(photosByOp)) {
        if (list.length === 0) continue;
        console.log(`\n------------------------------------------------------`);
        console.log(`👤 OPÉRATEUR : ${op} (${list.length} photos)`);
        console.log(`------------------------------------------------------`);
        list.forEach((item, idx) => {
            console.log(`${idx + 1}. [Dossier: ${item.folder}] ${item.name}`);
            console.log(`   🔗 Lien Google Drive: ${item.link}`);
            console.log(`   🕒 Créé le: ${item.createdTime}`);
        });
    }
}

main().catch(err => console.error(err.message));
