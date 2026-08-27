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

    console.log("🔍 Rangement strict par Opérateur (Fif, Aina, Anjara, Korail, Kintana, Kevin) + Date...");

    // Helper pour créer/récupérer un dossier sous un parent donné
    async function getOrCreateFolder(parentId, name) {
        try {
            const res = await drive.files.list({
                q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed=false`,
                fields: 'files(id, name)',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true
            });
            if (res.data.files && res.data.files.length > 0) {
                return res.data.files[0].id;
            }
        } catch (e) {}

        const created = await drive.files.create({
            requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
            supportsAllDrives: true,
            fields: 'id, name'
        });
        return created.data.id;
    }

    // 1. Lister tous les fichiers images sur le Drive
    const listRes = await drive.files.list({
        q: `mimeType != 'application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name, createdTime, parents)',
        pageSize: 500,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
    });

    const files = listRes.data.files || [];
    console.log(`📸 ${files.length} fichiers trouvés à vérifier.`);

    const operators = ['Fif', 'Fifaliana', 'Aina', 'Anjara', 'Korail', 'Kintana', 'Kevin'];
    const cutoff27 = new Date('2026-08-26T17:00:00Z').getTime();

    for (const f of files) {
        if (!f.name) continue;

        // Déterminer l'opérateur concerné par le fichier
        let matchedOp = null;
        for (const op of operators) {
            if (f.name.toLowerCase().includes(op.toLowerCase())) {
                matchedOp = (op.toLowerCase() === 'fifaliana') ? 'Fif' : op;
                break;
            }
        }

        if (!matchedOp) {
            matchedOp = 'Global';
        }

        // Déterminer la date du fichier (26-08-26 ou 27-08-2026) selon createdTime
        const fileTime = f.createdTime ? new Date(f.createdTime).getTime() : Date.now();
        const isCreatedOn26 = fileTime < cutoff27;
        const dateFolderName = isCreatedOn26 ? '2026-08-26' : '2026-08-27';

        // 1. Dossier opérateur (ex: "Fif")
        const opFolderId = await getOrCreateFolder(parentFolderId, matchedOp);

        // 2. Dossier date sous le dossier opérateur (ex: "Fif / 2026-08-27")
        const targetFolderId = await getOrCreateFolder(opFolderId, dateFolderName);

        const currentParent = f.parents ? f.parents[0] : null;

        if (currentParent !== targetFolderId) {
            console.log(`📂 [${matchedOp}] Rangement dans ${matchedOp}/${dateFolderName} : "${f.name}"`);

            const updateParams = {
                fileId: f.id,
                supportsAllDrives: true,
                addParents: targetFolderId
            };
            if (currentParent) {
                updateParams.removeParents = currentParent;
            }

            try {
                await drive.files.update(updateParams);
                console.log(`✅ Fichier rangé avec succès pour ${matchedOp} : ${f.name}`);
            } catch (err) {
                console.error(`Note erreur sur ${f.name}:`, err.message);
            }
        }
    }

    console.log("🎉 Rangement terminé ! Chaque opérateur a désormais ses sous-dossiers par date propres !");
}

main().catch(err => {
    console.error("❌ Erreur :", err.message);
    process.exit(1);
});
