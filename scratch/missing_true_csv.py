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

# Fetch data since August 5th ONLY
p_data = fetch_table("planning", "id,date,fiche_nom,gmail,operateur", "&date=gte.2026-08-05&date=lte.2026-08-31")
a_data = fetch_table("avis", "id,date,fiche_nom,auteur,operateur", "&date=gte.2026-08-05&date=lte.2026-08-31")

avis_gmails = set(a["auteur"].strip().lower() for a in a_data if a.get("auteur"))

def simplify_name(name):
    if not name: return ""
    return "".join(c.lower() for c in name if c.isalnum())

avis_by_fiche = {}
for a in a_data:
    sim = simplify_name(a.get("fiche_nom"))
    if sim not in avis_by_fiche:
        avis_by_fiche[sim] = []
    avis_by_fiche[sim].append(a)

truly_missing = []

for p in p_data:
    if not p.get("gmail") or not p.get("date"): continue
    gmail = p.get("gmail").strip().lower()
    op = p.get("operateur", "")
    
    if op not in ["Kevin", "Fifaliana"]: continue
    
    if gmail not in avis_gmails:
        # Check for replacement
        sim_p = simplify_name(p.get("fiche_nom"))
        found_replacement = False
        
        if sim_p in avis_by_fiche:
            for a in avis_by_fiche[sim_p]:
                if a["date"] == p["date"] and a.get("operateur") == op:
                    found_replacement = True
                    break
                    
        if not found_replacement:
            truly_missing.append({
                "Operateur": op,
                "Date Prevue": p["date"],
                "Fiche GMB": p.get("fiche_nom", "Inconnue"),
                "Gmail (du planning)": p.get("gmail", "")
            })

truly_missing.sort(key=lambda x: (x["Operateur"], x["Date Prevue"]))

with open("/Users/mailyspayot/gmb-tracker/vrais_oublis_depuis_5_aout.csv", "w", newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=["Operateur", "Date Prevue", "Fiche GMB", "Gmail (du planning)"])
    writer.writeheader()
    writer.writerows(truly_missing)

print(f"Generated CSV with {len(truly_missing)} items.")
