import urllib.request, json, re
from collections import defaultdict

SB_URL = "https://rrbvghxmnimusfyqixau.supabase.co"
SB_KEY = "sb_publishable_k0nVhKHWUT5kBW9xBNpLkA_AKam7uBa"

req = urllib.request.Request(f"{SB_URL}/rest/v1/fiches?select=id,nom,lien,date_ouverture,nb_avis_google")
req.add_header("apikey", SB_KEY)
req.add_header("Authorization", f"Bearer {SB_KEY}")

with urllib.request.urlopen(req) as r:
    fiches = json.loads(r.read().decode())

print(f"Total fiches en base : {len(fiches)}")

def norm_str(s):
    if not s: return ""
    return re.sub(r'[^a-z0-9]', '', s.lower())

def clean_link(url):
    if not url: return ""
    url = url.split('?')[0].split('#')[0].rstrip('/')
    return url.lower()

# Check duplicates by normalized name
by_name = defaultdict(list)
by_link = defaultdict(list)

for f in fiches:
    name_key = norm_str(f['nom'])
    if name_key:
        by_name[name_key].append(f)
    link_key = clean_link(f.get('lien'))
    if link_key and len(link_key) > 15:
        by_link[link_key].append(f)

dup_names = {k: v for k, v in by_name.items() if len(v) > 1}
dup_links = {k: v for k, v in by_link.items() if len(v) > 1}

print(f"\n--- Doublons par Nom ({len(dup_names)}) ---")
for k, list_f in list(dup_names.items())[:10]:
    print(f"Clé '{k}':")
    for f in list_f:
        print(f"  - ID: {f['id']} | Nom: '{f['nom']}' | Lien: {f.get('lien')}")

print(f"\n--- Doublons par Lien ({len(dup_links)}) ---")
for k, list_f in list(dup_links.items())[:10]:
    print(f"Lien '{k}':")
    for f in list_f:
        print(f"  - ID: {f['id']} | Nom: '{f['nom']}'")
