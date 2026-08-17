import urllib.request, json

URL = "https://rrbvghxmnimusfyqixau.supabase.co"
KEY = "sb_publishable_k0nVhKHWUT5kBW9xBNpLkA_AKam7uBa"

def fetch_all(stable=True):
    all_data = []
    offset = 0
    order = "date.desc,id.desc" if stable else "date.desc"
    while True:
        req = urllib.request.Request(f"{URL}/rest/v1/avis?select=id,date,operateur&order={order}&limit=1000&offset={offset}")
        req.add_header("apikey", KEY)
        req.add_header("Authorization", f"Bearer {KEY}")
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
        if not data:
            break
        all_data.extend(data)
        if len(data) < 1000:
            break
        offset += 1000
    return all_data

def count_direct(operateur):
    req = urllib.request.Request(f"{URL}/rest/v1/avis?select=id&date=gte.2026-08-01&date=lte.2026-08-31&operateur=eq.{operateur}")
    req.add_header("apikey", KEY)
    req.add_header("Authorization", f"Bearer {KEY}")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
    return len(data)

unstable = fetch_all(stable=False)
stable = fetch_all(stable=True)

mois_unstable = [a for a in unstable if a["date"].startswith("2026-08")]
mois_stable = [a for a in stable if a["date"].startswith("2026-08")]

operators = ["Kevin", "Fifaliana", "Korail", "Aina", "Kintana", "Anjara"]
print(f"{'Operateur':<15} | {'DB reel':>8} | {'App (bug)':>10} | {'Fix':>8} | {'Ecart':>6}")
print("-" * 60)
for op in operators:
    db = count_direct(op)
    buggy = len([a for a in mois_unstable if a.get("operateur","").lower() == op.lower()])
    fixed = len([a for a in mois_stable if a.get("operateur","").lower() == op.lower()])
    ecart = db - buggy
    print(f"{op:<15} | {db:>8} | {buggy:>10} | {fixed:>8} | {ecart:>6}")
