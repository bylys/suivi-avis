import urllib.request, json, csv

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

missing = []

for p in p_data:
    if not p.get("gmail") or not p.get("date"): continue
    gmail = p["gmail"].strip().lower()
    
    if gmail not in avis_gmails:
        op = p.get("operateur", "")
        if op in ["Kevin", "Fifaliana"]:
            missing.append({
                "Operateur": op,
                "Date Prevue": p["date"],
                "Fiche GMB": p.get("fiche_nom", "Inconnue"),
                "Gmail": gmail
            })

missing.sort(key=lambda x: (x["Operateur"], x["Date Prevue"]))

with open("/Users/mailyspayot/gmb-tracker/avis_manquants_kevin_fifaliana.csv", "w", newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=["Operateur", "Date Prevue", "Fiche GMB", "Gmail"])
    writer.writeheader()
    writer.writerows(missing)
