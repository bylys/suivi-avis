import urllib.request, json, os

URL = "https://rrbvghxmnimusfyqixau.supabase.co"
KEY = "sb_publishable_k0nVhKHWUT5kBW9xBNpLkA_AKam7uBa"

def fetch_table(table, select, extra_filters=""):
    all_data = []
    offset = 0
    limit = 1000
    while True:
        req = urllib.request.Request(f"{URL}/rest/v1/{table}?select={select}{extra_filters}&limit={limit}&offset={offset}")
        req.add_header("apikey", KEY)
        req.add_header("Authorization", f"Bearer {KEY}")
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
        all_data.extend(data)
        if len(data) < limit:
            break
        offset += limit
    return all_data

p_data = fetch_table("planning", "id,date,fiche_nom,gmail,operateur", "&date=gte.2026-08-01&date=lte.2026-08-31")
a_data = fetch_table("avis", "id,date,fiche_nom,auteur,operateur", "&date=gte.2026-08-01&date=lte.2026-08-31")

avis_gmails = set(a["auteur"].strip().lower() for a in a_data if a.get("auteur"))

missing_kevin = []
missing_fifa = []

for p in p_data:
    if not p.get("gmail") or not p.get("date"): continue
    gmail = p["gmail"].strip().lower()
    
    if gmail not in avis_gmails:
        op = p.get("operateur", "")
        entry = f"- **Date** : {p['date']} | **Fiche** : {p.get('fiche_nom', 'Inconnue')} | **Gmail** : `{gmail}`"
        if op == "Kevin":
            missing_kevin.append(entry)
        elif op == "Fifaliana":
            missing_fifa.append(entry)

missing_kevin.sort()
missing_fifa.sort()

artifact_path = "/Users/mailyspayot/.gemini/antigravity/brain/6edaab1d-8ce8-43ff-8242-9464ce06f814/avis_manquants_kevin_fifa.md"
os.makedirs(os.path.dirname(artifact_path), exist_ok=True)

with open(artifact_path, "w") as f:
    f.write("# Avis Oubliés (Non saisis dans l'outil)\n\n")
    f.write("Voici la liste des avis qui étaient assignés dans le planning pour le mois d'août, marqués probablement comme \"Fait\" dans les fichiers de suivi personnels, mais qui n'ont **JAMAIS** été intégrés dans l'outil (Supabase) par qui que ce soit.\n\n")
    
    f.write(f"## Kevin ({len(missing_kevin)} avis oubliés)\n")
    for m in missing_kevin:
        f.write(m + "\n")
        
    f.write(f"\n## Fifaliana ({len(missing_fifa)} avis oubliés)\n")
    for m in missing_fifa:
        f.write(m + "\n")

print(f"Artifact created with {len(missing_kevin)} for Kevin and {len(missing_fifa)} for Fifaliana.")
