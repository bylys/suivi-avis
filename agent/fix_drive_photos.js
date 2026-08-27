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

    console.log("🔍 Tri strict par Date de Création Réelle (createdTime)...");

    async function getFolder(name) {
        try {
            const res = await drive.files.list({
                q: `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and (name='${name}' or name='2026-08-26' or name='27-08-2026') and trashed=false`,
                fields: 'files(id, name)',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true
            });
            const match = (res.data.files || []).find(f => f.name === name);
            if (match) return match.id;
        } catch (e) {}

        const created = await drive.files.create({
            requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentFolderId] },
            supportsAllDrives: true,
            fields: 'id, name'
        });
        return created.data.id;
    }

    const folder26Id = await getFolder("2026-08-26");
    const folder27Id = await getFolder("27-08-2026");

    console.log(`📁 Dossier 26 Août ID: ${folder26Id}`);
    console.log(`📁 Dossier 27 Août ID: ${folder27Id}`);

    // Lister tous les fichiers images créés récemment
    const listRes = await drive.files.list({
        q: `mimeType != 'application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name, createdTime, parents)',
        pageSize: 300,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
    });

    const files = listRes.data.files || [];
    console.log(`📸 Total de ${files.length} fichiers analysés.`);

    // Date charnière : le 26 août 2026 à 17:00 UTC (soit le 27 août 00:00 en Asie / 20h en France le 26)
    const cutoff27 = new Date('2026-08-26T17:00:00Z').getTime();

    for (const f of files) {
        if (!f.createdTime) continue;
        const fileTime = new Date(f.createdTime).getTime();

        const isCreatedOn26 = fileTime < cutoff27;

        const targetFolder = isCreatedOn26 ? folder26Id : folder27Id;

        let newName = f.name;
        if (isCreatedOn26) {
            newName = newName.replace(/27-08-2026/g, '26-08-26').replace(/2026-08-27/g, '26-08-26').replace(/27-08-26/g, '26-08-26');
        } else {
            newName = newName.replace(/26-08-26/g, '27-08-2026').replace(/2026-08-26/g, '27-08-2026').replace(/26-08-2026/g, '27-08-2026');
        }

        const currentParent = f.parents ? f.parents[0] : null;
        if (currentParent !== targetFolder || newName !== f.name) {
            console.log(`🔄 [Fichier créé le ${f.createdTime}] => Déplacement vers ${isCreatedOn26 ? 'Dossier 26 Août' : 'Dossier 27 Août'} : "${f.name}" -> "${newName}"`);

            const updateParams = {
                fileId: f.id,
                requestBody: { name: newName },
                supportsAllDrives: true
            };

            if (currentParent && currentParent !== targetFolder) {
                updateParams.addParents = targetFolder;
                updateParams.removeParents = currentParent;
            }

            try {
                await drive.files.update(updateParams);
                console.log(`✅ Ok: ${newName}`);
            } catch (err) {
                console.error(`Note erreur sur ${f.name}:`, err.message);
            }
        }
    }

    console.log("🎉 Tri strict par date réelle de création terminé !");
}

main().catch(err => {
    console.error("❌ Erreur :", err.message);
    process.exit(1);
});
