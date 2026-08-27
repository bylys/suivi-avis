import urllib.request
import json
import base64

auth_str = "marvin@allo-chantiers.fr:8807fb3ec88351e5"
b64_auth = base64.b64encode(auth_str.encode()).decode()

endpoints = [
    ("https://api.dataforseo.com/v3/serp/google/maps/task_post", [{"keyword": "Allo Chantiers Paris", "location_code": 2250, "language_code": "fr"}]),
    ("https://api.dataforseo.com/v3/business_data/google/my_business_info/task_post", [{"keyword": "Allo Chantiers Paris", "location_code": 2250, "language_code": "fr"}]),
    ("https://api.dataforseo.com/v3/business_data/google/reviews/task_post", [{"keyword": "Allo Chantiers Paris", "location_code": 2250, "language_code": "fr"}])
]

for url, payload in endpoints:
    print(f"\n--- Testing {url} ---")
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Authorization", f"Basic {b64_auth}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as r:
            res = json.loads(r.read().decode())
            print("Status Code:", res.get("status_code"), res.get("status_message"))
            if res.get("tasks"):
                for t in res["tasks"]:
                    print("  Task ID:", t.get("id"), "Status:", t.get("status_code"), t.get("status_message"))
    except Exception as e:
        print("Error:", e)
