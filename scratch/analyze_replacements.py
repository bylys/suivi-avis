import urllib.request, json
from collections import defaultdict

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

# Fetch data since August 5th (when they started using the planning)
p_data = fetch_table("planning", "id,date,fiche_nom,gmail,operateur", "&date=gte.2026-08-05&date=lte.2026-08-31")
a_data = fetch_table("avis", "id,date,fiche_nom,auteur,operateur", "&date=gte.2026-08-05&date=lte.2026-08-31")

avis_gmails = set(a["auteur"].strip().lower() for a in a_data if a.get("auteur"))

# Build an index of avis by fiche_nom (simplified string matching)
def simplify_name(name):
    if not name: return ""
    return "".join(c.lower() for c in name if c.isalnum())

avis_by_fiche = defaultdict(list)
for a in a_data:
    sim = simplify_name(a.get("fiche_nom"))
    avis_by_fiche[sim].append(a)

truly_missing_kevin = []
replaced_kevin = []
truly_missing_fifa = []
replaced_fifa = []

for p in p_data:
    if not p.get("gmail") or not p.get("date"): continue
    gmail = p.get("gmail").strip().lower()
    op = p.get("operateur", "")
    
    if op not in ["Kevin", "Fifaliana"]: continue
    
    if gmail not in avis_gmails:
        # Not found by exact email. Did they replace it?
        sim_p = simplify_name(p.get("fiche_nom"))
        found_replacement = False
        
        if sim_p in avis_by_fiche:
            # Check if any review for this fiche was done on the exact same date by this operator
            for a in avis_by_fiche[sim_p]:
                if a["date"] == p["date"] and a.get("operateur") == op:
                    found_replacement = True
                    break
                    
        if found_replacement:
            if op == "Kevin": replaced_kevin.append(p)
            else: replaced_fifa.append(p)
        else:
            if op == "Kevin": truly_missing_kevin.append(p)
            else: truly_missing_fifa.append(p)

print(f"KEVIN:")
print(f"- Mails remplacés (fiche ok, date ok) : {len(replaced_kevin)}")
print(f"- Totalement oubliés (ni le mail ni la fiche ne sont dans la base à cette date) : {len(truly_missing_kevin)}")
print()
print(f"FIFALIANA:")
print(f"- Mails remplacés (fiche ok, date ok) : {len(replaced_fifa)}")
print(f"- Totalement oubliés (ni le mail ni la fiche ne sont dans la base à cette date) : {len(truly_missing_fifa)}")

print("\n--- EXEMPLES TOTALEMENT OUBLIÉS (KEVIN) ---")
for m in truly_missing_kevin[:10]:
    print(f"{m['date']} - {m['fiche_nom']} - {m['gmail']}")
    
print("\n--- EXEMPLES TOTALEMENT OUBLIÉS (FIFALIANA) ---")
for m in truly_missing_fifa[:10]:
    print(f"{m['date']} - {m['fiche_nom']} - {m['gmail']}")
