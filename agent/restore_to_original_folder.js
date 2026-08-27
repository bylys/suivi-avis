require('dotenv').config();
const { google } = require('googleapis');

async function main() {
    const credentialsRaw = process.env.GOOGLE_DRIVE_CREDENTIALS;
    if (!credentialsRaw) process.exit(1);

    const credentials = JSON.parse(credentialsRaw);
    const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/drive'] });
    const drive = google.drive({ version: 'v3', auth });

    const targetFolderId = '1lk4hEew3BnGPGAEOd86E8HRmidG6NTDj'; // Le dossier d'origine

    const fileIds = [
        '1SvRR_oep7juLPzjfne04jDjAXHSEMRRb',
        '1AOu-6dMAa4dK-XmQsbVEvNpL6Hdgt_MA',
        '1Rs73ZIf3XGeoIxW3tndaBjb1n6x2Rgyt',
        '1wqiEfimc75DH-94EckHGMNLgExSoc6td'
    ];

    console.log(`Remise en place immédiate dans le dossier d'origine ${targetFolderId}...`);

    for (const id of fileIds) {
        try {
            const file = await drive.files.get({ fileId: id, fields: 'id, name, parents', supportsAllDrives: true });
            const currentParents = file.data.parents || [];
            
            await drive.files.update({
                fileId: id,
                addParents: targetFolderId,
                removeParents: currentParents.filter(p => p !== targetFolderId).join(','),
                supportsAllDrives: true
            });
            console.log(`✅ Fichier remis dans ${targetFolderId} : ${file.data.name}`);
        } catch (e) {
            console.error(`Erreur sur ${id}: ${e.message}`);
        }
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
