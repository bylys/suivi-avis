require('dotenv').config();
const { google } = require('googleapis');

async function main() {
    const credentialsRaw = process.env.GOOGLE_DRIVE_CREDENTIALS;
    if (!credentialsRaw) {
        console.error("❌ GOOGLE_DRIVE_CREDENTIALS manquant !");
        process.exit(1);
    }

    const credentials = JSON.parse(credentialsRaw);
    const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive'] });
    const drive = google.drive({ version: 'v3', auth });

    // 1. Obtenir la carte des noms de dossiers
    const folderRes = await drive.files.list({
        q: `mimeType = 'application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name, parents)',
        pageSize: 300,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
    });
    const folderMap = {};
    for (const f of (folderRes.data.files || [])) {
        folderMap[f.id] = f.name;
    }

    // 2. Lister tous les fichiers photos de Fif/Fifaliana et Kevin
    const fileRes = await drive.files.list({
        q: `mimeType != 'application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name, createdTime, parents, webViewLink)',
        pageSize: 500,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
    });

    const files = fileRes.data.files || [];

    const fifaFiles = [];
    const kevinFiles = [];

    for (const file of files) {
        const pName = file.parents ? (folderMap[file.parents[0]] || file.parents[0]) : '';
        const isFifa = file.name.toLowerCase().includes('fif') || pName.toLowerCase().includes('fif');
        const isKevin = file.name.toLowerCase().includes('kevin') || pName.toLowerCase().includes('kevin');

        const fileData = {
            nom: file.name,
            dossier: pName,
            creation: file.createdTime,
            lien: file.webViewLink
        };

        if (isFifa) fifaFiles.push(fileData);
        if (isKevin) kevinFiles.push(fileData);
    }

    console.log(`\n======================================================`);
    console.log(`📸 PHOTOS POUR FIF / FIFALIANA (${fifaFiles.length} PHOTOS TROUVÉES SUR DRIVE) :`);
    console.log(`======================================================`);
    fifaFiles.forEach((f, i) => {
        console.log(`${i + 1}. [${f.dossier}] ${f.nom}`);
        console.log(`   🔗 Lien: ${f.lien}`);
        console.log(`   🕒 Créé le: ${f.creation}\n`);
    });

    console.log(`======================================================`);
    console.log(`📸 PHOTOS POUR KEVIN (${kevinFiles.length} PHOTOS TROUVÉES SUR DRIVE) :`);
    console.log(`======================================================`);
    kevinFiles.forEach((f, i) => {
        console.log(`${i + 1}. [${f.dossier}] ${f.nom}`);
        console.log(`   🔗 Lien: ${f.lien}`);
        console.log(`   🕒 Créé le: ${f.creation}\n`);
    });
}

main().catch(err => console.error(err.message));
