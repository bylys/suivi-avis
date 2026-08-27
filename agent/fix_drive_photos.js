require('dotenv').config();
const { google } = require('googleapis');

async function processSourceId(drive, targetId, defaultParentFolderId) {
    console.log(`\n📂 Traitement de l'ID Google Drive : ${targetId}...`);

    let itemMeta;
    try {
        const res = await drive.files.get({
            fileId: targetId,
            fields: 'id, name, mimeType, parents',
            supportsAllDrives: true
        });
        itemMeta = res.data;
    } catch (e) {
        console.error(`❌ Impossible de lire l'élément ${targetId} : ${e.message}`);
        return;
    }

    let folderIdToProcess = targetId;
    let realParentId = defaultParentFolderId;

    if (itemMeta.mimeType !== 'application/vnd.google-apps.folder') {
        console.log(`📄 L'ID ${targetId} est un fichier ("${itemMeta.name}").`);
        if (itemMeta.parents && itemMeta.parents.length > 0) {
            folderIdToProcess = itemMeta.parents[0];
            console.log(`📁 Dossier parent du fichier identifié : ${folderIdToProcess}`);
        }
    } else {
        console.log(`📁 L'ID ${targetId} est un dossier ("${itemMeta.name}").`);
    }

    // Récupérer le parent du dossier pour y créer le dossier 27-08-2026
    try {
        const folderMeta = await drive.files.get({
            fileId: folderIdToProcess,
            fields: 'id, name, parents',
            supportsAllDrives: true
        });
        if (folderMeta.data.parents && folderMeta.data.parents.length > 0) {
            realParentId = folderMeta.data.parents[0];
        }
    } catch (e) {}

    console.log(`📂 Dossier parent cible : ${realParentId}`);

    // Lister les fichiers à traiter
    const listRes = await drive.files.list({
        q: `'${folderIdToProcess}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name, createdTime, parents)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
    });

    let files = listRes.data.files || [];
    if (files.length === 0 && itemMeta.mimeType !== 'application/vnd.google-apps.folder') {
        files = [itemMeta];
    }

    console.log(`📸 ${files.length} fichier(s) trouvé(s) à traiter.`);
    if (files.length === 0) return;

    // Créer ou récupérer le dossier 27-08-2026
    const targetFolderName = "27-08-2026";
    let targetFolderId;

    const searchTarget = await drive.files.list({
        q: `'${realParentId}' in parents and mimeType='application/vnd.google-apps.folder' and (name='27-08-2026' or name='2026-08-27' or name='27-08-26') and trashed=false`,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
    });

    if (searchTarget.data.files && searchTarget.data.files.length > 0) {
        targetFolderId = searchTarget.data.files[0].id;
        console.log(`📂 Dossier cible existant : "${searchTarget.data.files[0].name}" (ID: ${targetFolderId})`);
    } else {
        const createTarget = await drive.files.create({
            requestBody: {
                name: targetFolderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [realParentId]
            },
            supportsAllDrives: true,
            fields: 'id, name'
        });
        targetFolderId = createTarget.data.id;
        console.log(`📂 Dossier cible créé : "${targetFolderName}" (ID: ${targetFolderId})`);
    }

    for (const file of files) {
        let newName = file.name
            .replace(/26-08-26/g, '27-08-2026')
            .replace(/2026-08-26/g, '27-08-2026')
            .replace(/26-08-2026/g, '27-08-2026');

        if (newName === file.name && !newName.includes('27-08-2026')) {
            newName = `27-08-2026_${file.name}`;
        }

        console.log(`🔄 Renommage et déplacement : "${file.name}" ➡️ "${newName}"...`);

        try {
            await drive.files.update({
                fileId: file.id,
                addParents: targetFolderId,
                removeParents: folderIdToProcess,
                requestBody: { name: newName },
                supportsAllDrives: true
            });
            console.log(`✅ Fichier déplacé avec succès : "${newName}"`);
        } catch (err) {
            console.error(`Note mise à jour fichier ${file.name} :`, err.message);
        }
    }
}

async function main() {
    const credentialsRaw = process.env.GOOGLE_DRIVE_CREDENTIALS;
    if (!credentialsRaw) {
        console.error("❌ GOOGLE_DRIVE_CREDENTIALS manquant !");
        process.exit(1);
    }

    const targetIds = [
        '1lk4hEew3BnGPGAEOd86E8HRmidG6NTDj',
        '1SvRR_oep7juLPzjfne04jDjAXHSEMRRb',
        '1AOu-6dMAa4dK-XmQsbVEvNpL6Hdgt_MA'
    ];

    const credentials = JSON.parse(credentialsRaw);
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive']
    });

    const drive = google.drive({ version: 'v3', auth });

    // Recherche automatique globale de tous les dossiers/fichiers 26-08-26 sur le Drive
    try {
        const autoFind = await drive.files.list({
            q: `(name contains '26-08-26' or name contains '2026-08-26') and trashed=false`,
            fields: 'files(id, name, mimeType)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true
        });
        if (autoFind.data.files && autoFind.data.files.length > 0) {
            for (const f of autoFind.data.files) {
                if (!targetIds.includes(f.id)) {
                    targetIds.push(f.id);
                }
            }
        }
    } catch (e) {
        console.log("Note auto-find Drive :", e.message);
    }

    console.log(`🎯 Total d'éléments/dossiers identifiés à traiter : ${targetIds.length}`);

    for (const targetId of targetIds) {
        await processSourceId(drive, targetId, defaultParentFolderId);
    }

    console.log(`\n🎉 Opération globale terminée avec succès sur tous les dossiers/fichiers !`);
}

main().catch(err => {
    console.error("❌ Erreur :", err.message);
    process.exit(1);
});
