import urllib.request
import json
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

def update_avis(avis_id, new_op):
    req = urllib.request.Request(f"{URL}/rest/v1/avis?id=eq.{avis_id}", method="PATCH")
    req.add_header("apikey", KEY)
    req.add_header("Authorization", f"Bearer {KEY}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "return=minimal")
    data = json.dumps({"operateur": new_op}).encode()
    try:
        with urllib.request.urlopen(req, data=data) as resp:
            return True
    except Exception as e:
        print(f"Error updating {avis_id}: {e}")
        return False

print("Fetching data...")
p_data = fetch_table("planning", "id,date,fiche_nom,gmail,operateur", "&date=gte.2026-08-04")
a_data = fetch_table("avis", "id,date,fiche_nom,auteur,operateur,created_at", "&date=gte.2026-08-04")

planning_map = defaultdict(list)
for p in p_data:
    if p["gmail"]:
        key = (p["gmail"].strip().lower(), p["date"])
        planning_map[key].append(p)

fixes = 0
for a in a_data:
    if not a.get("auteur") or not a.get("date"):
        continue
    key = (a["auteur"].strip().lower(), a["date"])
    plans = planning_map.get(key)
    avis_op = a.get("operateur", "Inconnu")
    
    if not plans:
        continue
        
    planned_ops = list(set([p["operateur"] for p in plans]))
    if avis_op not in planned_ops:
        # We take the first planned operator (usually there is only 1 since double planning is rare)
        new_op = planned_ops[0]
        print(f"Fixing avis {a['id']} from {avis_op} -> {new_op}")
        if update_avis(a['id'], new_op):
            fixes += 1

print(f"Fixed {fixes} anomalies.")
