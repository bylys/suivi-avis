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

    console.log("🔍 RECHERCHE EXHAUSTIVE DE TOUTES LES PHOTOS DE FIF / FIFALIANA SUR GOOGLE DRIVE...");

    // 1. Recherche y compris dans la corbeille et tous les dossiers
    const res = await drive.files.list({
        q: "name contains 'Fif' or name contains 'fif' or name contains 'Fifaliana' or name contains 'fifaliana'",
        fields: 'files(id, name, createdTime, parents, trashed, webViewLink)',
        pageSize: 200,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
    });

    const files = res.data.files || [];
    console.log(`\n📸 ${files.length} FICHIER(S) TROUVÉ(S) POUR FIF / FIFALIANA EN RECHERCHE DIRECTE !\n`);

    for (const f of files) {
        console.log(`- NOM: ${f.name}`);
        console.log(`  CORBEILLE: ${f.trashed ? 'OUI 🗑️' : 'NON ✅'}`);
        console.log(`  PARENT ID: ${f.parents ? f.parents[0] : 'aucun'}`);
        console.log(`  CRÉÉ LE: ${f.createdTime}`);
        console.log(`  LIEN DIRECT: ${f.webViewLink}\n`);
    }
}

main().catch(err => console.error(err.message));
