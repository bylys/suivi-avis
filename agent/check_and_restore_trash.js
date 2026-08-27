require('dotenv').config();
const { google } = require('googleapis');

async function main() {
    const credentialsRaw = process.env.GOOGLE_DRIVE_CREDENTIALS;
    if (!credentialsRaw) process.exit(1);

    const credentials = JSON.parse(credentialsRaw);
    const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive'] });
    const drive = google.drive({ version: 'v3', auth });

    const operatorFolders = {
        'Fif': '1lk4hEew3BnGPGAEOd86E8HRmidG6NTDj',
        'Aina': '1SvRR_oep7juLPzjfne04jDjAXHSEMRRb',
        'Anjara': '1AOu-6dMAa4dK-XmQsbVEvNpL6Hdgt_MA',
        'Korail': '1Rs73ZIf3XGeoIxW3tndaBjb1n6x2Rgyt',
        'Kintana': '1wqiEfimc75DH-94EckHGMNLgExSoc6td'
    };

    console.log("🔍 RECHERCHE DE TOUS LES FICHIERS (Y COMPRIS CORBEILLE)...");

    // 1. Lister tous les fichiers même dans la corbeille
    const res = await drive.files.list({
        q: "mimeType != 'application/vnd.google-apps.folder'",
        fields: 'files(id, name, trashed, parents, createdTime)',
        pageSize: 500,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
    });

    const allFiles = res.data.files || [];
    console.log(`Total fichiers trouvés sur Drive : ${allFiles.length}`);

    for (const f of allFiles) {
        console.log(`- [${f.trashed ? 'CORBEILLE 🗑️' : 'ACTIF ✅'}] ${f.name} (ID: ${f.id}, Créé: ${f.createdTime})`);

        // Si le fichier est à la corbeille, le restaurer immédiatement
        if (f.trashed) {
            console.log(`  ♻️ RESTAURATION du fichier : ${f.name}`);
            await drive.files.update({
                fileId: f.id,
                requestBody: { trashed: false },
                supportsAllDrives: true
            });
        }

        // Remettre chaque fichier dans son dossier opérateur respectif
        for (const [op, folderId] of Object.entries(operatorFolders)) {
            if (f.name.toLowerCase().includes(op.toLowerCase()) || (op === 'Fif' && f.name.toLowerCase().includes('fifaliana'))) {
                console.log(`  ➡️ Placement dans le dossier de ${op} (${folderId})...`);
                await drive.files.update({
                    fileId: f.id,
                    addParents: folderId,
                    supportsAllDrives: true
                });
            }
        }
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
