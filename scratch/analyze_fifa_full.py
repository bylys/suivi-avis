import csv, urllib.request, json

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

# Fetch all avis for August
a_data = fetch_table("avis", "id,date,fiche_nom,auteur,operateur", "&date=gte.2026-08-01&date=lte.2026-08-31")

def simplify_name(name):
    if not name: return ""
    return "".join(c.lower() for c in name if c.isalnum())

avis_by_fiche = {}
for a in a_data:
    sim = simplify_name(a.get("fiche_nom"))
    if sim not in avis_by_fiche:
        avis_by_fiche[sim] = []
    avis_by_fiche[sim].append(a)

csv_path = "/Users/mailyspayot/gmb-tracker/scratch/fifa_sheet_full.csv"

missing_from_csv = []
current_date_block = None

with open(csv_path, "r", encoding="utf-8") as f:
    reader = csv.reader(f)
    for row in reader:
        if not row: continue
        # Detect date block
        if "/// au" in row[0]:
            current_date_block = row[0]
            continue
            
        if current_date_block:
            is_fait = False
            for cell in row:
                if cell.strip().lower() == "fait":
                    is_fait = True
                    break
            
            if is_fait:
                fiche_nom = row[0] if len(row) > 0 else ""
                
                # Check if this fiche is in DB under Fifaliana
                sim1 = simplify_name(fiche_nom)
                
                found = False
                if sim1 in avis_by_fiche:
                    for a in avis_by_fiche[sim1]:
                        if a.get("operateur") == "Fifaliana":
                            found = True
                            break
                            
                if not found:
                    gmail = row[2] if len(row) > 2 else ""
                    missing_from_csv.append({
                        "Bloc Date CSV": current_date_block,
                        "Fiche CSV": fiche_nom,
                        "Gmail CSV": gmail
                    })

unique_missing = []
seen = set()
for m in missing_from_csv:
    s = simplify_name(m["Fiche CSV"])
    if s not in seen and s != "":
        seen.add(s)
        unique_missing.append(m)

with open("/Users/mailyspayot/gmb-tracker/oublis_reels_depuis_le_sheet_fifa.csv", "w", newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=["Bloc Date CSV", "Fiche CSV", "Gmail CSV"])
    writer.writeheader()
    writer.writerows(unique_missing)

print(f"Found {len(unique_missing)} unique GMB Fiches marked 'Fait' in Fifa's CSV (in August) that are MISSING from Supabase.")
