require('dotenv').config();
const { google } = require('googleapis');

async function main() {
    const credentialsRaw = process.env.GOOGLE_DRIVE_CREDENTIALS;
    if (!credentialsRaw) {
        console.error("❌ GOOGLE_DRIVE_CREDENTIALS manquant !");
        process.exit(1);
    }

    const parentFolderId = (process.env.DRIVE_PARENT_FOLDER_ID || '').trim();
    const sourceFolderId = '1lk4hEew3BnGPGAEOd86E8HRmidG6NTDj'; // Dossier 2026-08-26 fourni par l'utilisateur

    let credentials;
    try {
        credentials = JSON.parse(credentialsRaw);
    } catch (e) {
        console.error("❌ Erreur de parsing JSON pour GOOGLE_DRIVE_CREDENTIALS :", e.message);
        process.exit(1);
    }

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive']
    });

    const drive = google.drive({ version: 'v3', auth });

    console.log(`📂 Inspection du dossier source ID : ${sourceFolderId}...`);

    // 1. Lister les fichiers dans le dossier source
    const listRes = await drive.files.list({
        q: `'${sourceFolderId}' in parents and trashed=false`,
        fields: 'files(id, name, createdTime, parents)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
    });

    const files = listRes.data.files || [];
    console.log(`📸 ${files.length} fichier(s) trouvé(s) dans le dossier source.`);

    if (files.length === 0) {
        console.log("Aucun fichier à déplacer.");
        return;
    }

    // 2. Récupérer le dossier parent du dossier source pour créer le dossier du 27 au même endroit
    let realParentId = parentFolderId;
    try {
        const sourceFolderMeta = await drive.files.get({
            fileId: sourceFolderId,
            fields: 'id, name, parents',
            supportsAllDrives: true
        });
        if (sourceFolderMeta.data.parents && sourceFolderMeta.data.parents.length > 0) {
            realParentId = sourceFolderMeta.data.parents[0];
        }
    } catch (e) {}
    
    console.log(`📂 Dossier parent cible : ${realParentId}`);

    // 3. Créer ou récupérer le dossier cible du 27-08-2026
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
        console.log(`📂 Dossier cible existant trouvé : "${searchTarget.data.files[0].name}" (ID: ${targetFolderId})`);
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
        console.log(`📂 Nouveau dossier cible créé : "${targetFolderName}" (ID: ${targetFolderId})`);
    }

    // 4. Renommer et déplacer chaque photo vers le dossier du 27-08-2026
    for (const file of files) {
        let newName = file.name
            .replace(/26-08-26/g, '27-08-2026')
            .replace(/2026-08-26/g, '27-08-2026')
            .replace(/26-08-2026/g, '27-08-2026');

        if (newName === file.name && !newName.includes('27-08-2026')) {
            newName = `27-08-2026_${file.name}`;
        }

        console.log(`🔄 Déplacement et renommage : "${file.name}" ➡️ "${newName}"...`);

        await drive.files.update({
            fileId: file.id,
            addParents: targetFolderId,
            removeParents: sourceFolderId,
            requestBody: {
                name: newName
            },
            supportsAllDrives: true
        });

        console.log(`✅ Fichier déplacé avec succès : "${newName}"`);
    }

    console.log(`🎉 Opération terminée avec succès ! Toutes les photos ont été renommées et déplacées dans le dossier 27-08-2026.`);
}

main().catch(err => {
    console.error("❌ Erreur :", err.message);
    process.exit(1);
});
