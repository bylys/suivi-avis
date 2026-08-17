import urllib.request
import json

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

# Revert 4 reviews from Fifaliana -> Kevin on Aug 13
f_to_k = fetch_table("avis", "id", "&date=eq.2026-08-13&operateur=eq.Fifaliana")
for i in range(min(4, len(f_to_k))):
    update_avis(f_to_k[i]["id"], "Kevin")
    print(f"Reverted {f_to_k[i]['id']} to Kevin")

# Revert 1 review from Kevin -> Fifaliana on Aug 12
k_to_f = fetch_table("avis", "id", "&date=eq.2026-08-12&operateur=eq.Kevin")
for i in range(min(1, len(k_to_f))):
    update_avis(k_to_f[i]["id"], "Fifaliana")
    print(f"Reverted {k_to_f[i]['id']} to Fifaliana")

print("Done reverting manual edits.")
