import urllib.request, json, base64

auth_str = "marvin@allo-chantiers.fr:8807fb3ec88351e5"
b64_auth = base64.b64encode(auth_str.encode()).decode()

def resolve_url(lien):
    if not lien: return None
    if 'goo.gl' not in lien: return lien
    try:
        req = urllib.request.Request(lien, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=3) as r:
            return r.url
    except Exception:
        return lien

def query_by_target(target):
    url = "https://api.dataforseo.com/v3/serp/google/maps/live/advanced"
    payload = [{"keyword": target, "location_code": 2250, "language_code": "fr"}]
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Authorization", f"Basic {b64_auth}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as r:
            res = json.loads(r.read().decode())
            tasks = res.get("tasks", [])
            if tasks and tasks[0].get("result"):
                items = tasks[0]["result"][0].get("items", [])
                maps_items = [i for i in items if i.get("type") == "maps_search"]
                print(f"Target: '{target[:60]}...' => {len(maps_items)} fiches trouvées")
                for i in maps_items[:2]:
                    r_info = i.get("rating", {})
                    print(f"   ✓ Title: '{i.get('title')}' | Rating: {r_info.get('value')}⭐ ({r_info.get('votes_count')} avis)")
    except Exception as e:
        print("Err:", e)

# Test avec une URL courtemaps.app.goo.gl résolue
short_url = "https://maps.app.goo.gl/yeUmUSZdksftEGFB9"
resolved = resolve_url(short_url)
print("URL courte:", short_url)
print("URL résolue:", resolved)
query_by_target(resolved)
