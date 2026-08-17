import urllib.request
import json
from collections import defaultdict
import datetime

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

# Fetch planning >= 2026-08-04
planning_data = fetch_table("planning", "id,date,fiche_nom,gmail,operateur", "&date=gte.2026-08-04")
# Fetch avis >= 2026-08-04
avis_data = fetch_table("avis", "id,date,fiche_nom,auteur,operateur,created_at", "&date=gte.2026-08-04")

# Group planning by (gmail, date)
planning_map = defaultdict(list)
for p in planning_data:
    if p["gmail"]:
        key = (p["gmail"].strip().lower(), p["date"])
        planning_map[key].append(p)

report = ["# Analyse détaillée des doublons (Basée sur le Gmail et la Date)\n"]
report.append("Cette analyse vérifie pour chaque Gmail utilisé s'il était prévu pour quelqu'un d'autre ce jour-là.\n")

anomalies = []

for a in avis_data:
    if not a.get("auteur") or not a.get("date"):
        continue
    
    key = (a["auteur"].strip().lower(), a["date"])
    plans = planning_map.get(key)
    
    avis_op = a.get("operateur", "Inconnu")
    
    if not plans:
        continue
        
    planned_ops = list(set([p["operateur"] for p in plans]))
    if avis_op not in planned_ops:
        anomalies.append({
            "date": a["date"],
            "fiche_nom": a["fiche_nom"],
            "gmail": a["auteur"],
            "avis_op": avis_op,
            "planned_ops": planned_ops
        })

grouped = defaultdict(list)
for anom in anomalies:
    grouped[anom["avis_op"]].append(anom)

if not grouped:
    report.append("✅ **Aucune anomalie détectée.**")
else:
    for op in sorted(grouped.keys()):
        report.append(f"## Avis saisis par {op} mais assignés à quelqu'un d'autre ({len(grouped[op])} anomalies)")
        report.append("| Date | Fiche Saisie | Gmail | Prévu pour |")
        report.append("| --- | --- | --- | --- |")
        for anom in sorted(grouped[op], key=lambda x: x["date"]):
            planned_str = ", ".join(anom["planned_ops"])
            report.append(f"| {anom['date']} | {anom['fiche_nom']} | `{anom['gmail']}` | **{planned_str}** |")
        report.append("")

with open("/Users/mailyspayot/.gemini/antigravity/brain/6edaab1d-8ce8-43ff-8242-9464ce06f814/analyse_doublons_planning.md", "w") as f:
    f.write("\n".join(report))

print(f"Trouvé {len(anomalies)} anomalies. Rapport mis à jour.")
