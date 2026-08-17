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

csv_path = "/Users/mailyspayot/.gemini/antigravity/brain/6edaab1d-8ce8-43ff-8242-9464ce06f814/.user_uploaded/media_1786954384021.csv"

missing_from_csv = []
current_date = None

with open(csv_path, "r", encoding="utf-8") as f:
    reader = csv.reader(f)
    for row in reader:
        if not row: continue
        if "août 2026" in row[0].lower() or "aout 2026" in row[0].lower():
            # parse date string to YYYY-MM-DD roughly, e.g. "lundi 3 août 2026" -> "2026-08-03"
            parts = row[0].split()
            day = parts[1]
            if len(day) == 1: day = "0" + day
            current_date = f"2026-08-{day}"
            continue
            
        if current_date:
            is_fait = False
            for cell in row:
                if cell.strip().lower() == "fait":
                    is_fait = True
                    break
            
            if is_fait:
                fiche_nom = row[0] if len(row) > 0 else ""
                fiche_nom_2 = row[1] if len(row) > 1 else ""
                
                # Check if this fiche is in DB
                sim1 = simplify_name(fiche_nom)
                sim2 = simplify_name(fiche_nom_2)
                
                found = False
                if sim1 in avis_by_fiche:
                    for a in avis_by_fiche[sim1]:
                        if a.get("operateur") == "Kevin":
                            found = True
                            break
                if not found and sim2 in avis_by_fiche:
                    for a in avis_by_fiche[sim2]:
                        if a.get("operateur") == "Kevin":
                            found = True
                            break
                            
                if not found:
                    gmail = row[2] if len(row) > 2 else ""
                    missing_from_csv.append({
                        "Date CSV": current_date,
                        "Fiche CSV (col 1)": fiche_nom,
                        "Fiche CSV (col 2)": fiche_nom_2,
                        "Gmail CSV": gmail
                    })

with open("/Users/mailyspayot/gmb-tracker/oublis_reels_depuis_le_sheet_kevin.csv", "w", newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=["Date CSV", "Fiche CSV (col 1)", "Fiche CSV (col 2)", "Gmail CSV"])
    writer.writeheader()
    writer.writerows(missing_from_csv)

print(f"Found {len(missing_from_csv)} rows marked 'Fait' in Kevin's CSV that are MISSING from Supabase.")
