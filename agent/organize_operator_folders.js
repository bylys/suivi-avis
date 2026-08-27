require('dotenv').config();
const { google } = require('googleapis');

async function main() {
    const credentialsRaw = process.env.GOOGLE_DRIVE_CREDENTIALS;
    if (!credentialsRaw) {
        console.error("❌ GOOGLE_DRIVE_CREDENTIALS manquant");
        process.exit(1);
    }

    const credentials = JSON.parse(credentialsRaw);
    const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive'] });
    const drive = google.drive({ version: 'v3', auth });

    // Les 5 dossiers exacts des opérateurs fournis
    const operatorFolders = {
        'Fif': '1lk4hEew3BnGPGAEOd86E8HRmidG6NTDj',
        'Aina': '1SvRR_oep7juLPzjfne04jDjAXHSEMRRb',
        'Anjara': '1AOu-6dMAa4dK-XmQsbVEvNpL6Hdgt_MA',
        'Korail': '1Rs73ZIf3XGeoIxW3tndaBjb1n6x2Rgyt',
        'Kintana': '1wqiEfimc75DH-94EckHGMNLgExSoc6td'
    };

    console.log("🚀 Traitement des 5 dossiers opérateurs...");

    for (const [opName, folderId] of Object.entries(operatorFolders)) {
        console.log(`\n========================================`);
        console.log(`📂 Opérateur : ${opName} | Dossier ID : ${folderId}`);
        console.log(`========================================`);

        try {
            // 1. Renommer le dossier lui-même en 27-08-2026 (ou 2026-08-27)
            const folderMeta = await drive.files.get({ fileId: folderId, fields: 'id, name', supportsAllDrives: true });
            console.log(`Nom actuel du dossier : "${folderMeta.data.name}"`);

            await drive.files.update({
                fileId: folderId,
                requestBody: { name: '27-08-2026' },
                supportsAllDrives: true
            });
            console.log(`✅ Dossier renommé en "27-08-2026"`);

            // 2. Récupérer tous les fichiers qui appartiennent à ce dossier ou qui contiennent le nom de l'opérateur
            const fileRes = await drive.files.list({
                q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed=false`,
                fields: 'files(id, name, webViewLink)',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true
            });

            const files = fileRes.data.files || [];
            console.log(`📸 ${files.length} photo(s) trouvée(s) dans le dossier de ${opName}`);

            // 3. Renommer chaque photo avec la date du 27-08-2026
            for (const file of files) {
                let newName = file.name
                    .replace(/26-08-26/g, '27-08-2026')
                    .replace(/2026-08-26/g, '27-08-2026')
                    .replace(/26-08-2026/g, '27-08-2026');

                if (!newName.includes('27-08-2026') && !newName.includes('27-08-26')) {
                    newName = `${opName}_27-08-2026_${file.name}`;
                }

                if (newName !== file.name) {
                    await drive.files.update({
                        fileId: file.id,
                        requestBody: { name: newName },
                        supportsAllDrives: true
                    });
                    console.log(`  ✏️ Renommé : "${file.name}" ➡️ "${newName}"`);
                }
            }

        } catch (err) {
            console.error(`❌ Erreur sur ${opName} (${folderId}) :`, err.message);
        }
    }

    console.log(`\n🎉 Tout est terminé ! Les 5 dossiers et leurs photos sont renommés avec la date du 27-08-2026.`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
