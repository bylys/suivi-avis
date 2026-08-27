import urllib.request, json, base64

auth_str = "marvin@allo-chantiers.fr:8807fb3ec88351e5"
b64_auth = base64.b64encode(auth_str.encode()).decode()

def test_query(kw):
    url = "https://api.dataforseo.com/v3/serp/google/maps/live/advanced"
    payload = [{"keyword": kw, "location_code": 2250, "language_code": "fr"}]
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
                print(f"Keyword: '{kw}' => {len(items)} items retournés")
                for i in items[:3]:
                    r_info = i.get("rating", {})
                    print(f"   - [{i.get('type')}] Title: '{i.get('title')}' | Rating: {r_info.get('value')}⭐ ({r_info.get('votes_count')} avis) | Place ID: {i.get('place_id')}")
    except Exception as e:
        print("Err:", e)

print("--- Test 1 : Recherche par Nom générique ---")
test_query("Ravalement Belfort 90")

print("\n--- Test 2 : Recherche par URL Google Maps directe ---")
test_query("https://www.google.com/maps/place/Ravalement+Belfort+90/@47.638,-6.863,17z")
