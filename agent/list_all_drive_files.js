require('dotenv').config();
const { google } = require('googleapis');

async function main() {
    const credentialsRaw = process.env.GOOGLE_DRIVE_CREDENTIALS;
    if (!credentialsRaw) {
        console.error("❌ GOOGLE_DRIVE_CREDENTIALS manquant !");
        process.exit(1);
    }

    const parentFolderId = (process.env.DRIVE_PARENT_FOLDER_ID || '114-1bHq0YedhFv63wUks3s3s09Jz55t9').trim();
    const credentials = JSON.parse(credentialsRaw);
    const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive'] });
    const drive = google.drive({ version: 'v3', auth });

    console.log("🔍 LISTAGE COMPLET DE TOUS LES FICHIERS ET DOSSIERS DU GOOGLE DRIVE...");

    // 1. Lister tous les sous-dossiers
    const folderRes = await drive.files.list({
        q: `mimeType = 'application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name, parents)',
        pageSize: 200,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
    });

    const folderMap = {};
    for (const f of (folderRes.data.files || [])) {
        folderMap[f.id] = f.name;
    }

    // 2. Lister tous les fichiers photos
    const fileRes = await drive.files.list({
        q: `mimeType != 'application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name, createdTime, parents, webViewLink)',
        pageSize: 500,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
    });

    const files = fileRes.data.files || [];
    console.log(`\n📸 TOTAL FICHIERS PHOTOS TROUVÉS SUR GOOGLE DRIVE : ${files.length}\n`);

    const summaryByOp = {};

    for (const file of files) {
        const parentId = file.parents ? file.parents[0] : 'racine';
        const parentName = folderMap[parentId] || parentId;

        console.log(`- NOM: ${file.name}`);
        console.log(`  DATE CRÉATION: ${file.createdTime}`);
        console.log(`  DOSSIER: ${parentName} (ID: ${parentId})`);
        console.log(`  LIEN: ${file.webViewLink}\n`);

        const opKey = file.name.split('_')[0] || parentName;
        summaryByOp[opKey] = (summaryByOp[opKey] || 0) + 1;
    }

    console.log("📊 RÉSUMÉ DES PHOTOS SUR GOOGLE DRIVE PAR OPÉRATEUR / MARQUEUR :");
    console.log(JSON.stringify(summaryByOp, null, 2));
}

main().catch(err => {
    console.error("❌ Erreur :", err.message);
    process.exit(1);
});
