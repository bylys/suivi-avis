import urllib.request, json

SB_URL = "https://rrbvghxmnimusfyqixau.supabase.co"
SB_KEY = "sb_publishable_k0nVhKHWUT5kBW9xBNpLkA_AKam7uBa"

req = urllib.request.Request(f"{SB_URL}/rest/v1/fiches?limit=1")
req.add_header("apikey", SB_KEY)
req.add_header("Authorization", f"Bearer {SB_KEY}")

with urllib.request.urlopen(req) as r:
    fiche = json.loads(r.read().decode())
    if fiche:
        print("Colonnes de la table 'fiches' :")
        for k, v in fiche[0].items():
            print(f"  - {k}: {type(v).__name__} (ex: {repr(v)[:40]})")
