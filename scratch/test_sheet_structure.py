import urllib.request, json, csv, io

sheet_id = "1AFawMjlZBCMj6Rq9q6cm9dqmzqNIz5vwtL181Cw3xpg"
csv_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv"

print(f"Fetching Sheet CSV from {csv_url}...")
req = urllib.request.Request(csv_url, headers={"User-Agent": "Mozilla/5.0"})
try:
    with urllib.request.urlopen(req) as r:
        content = r.read().decode('utf-8', errors='ignore')
        reader = csv.reader(io.StringIO(content))
        rows = list(reader)
        print(f"Nombre de lignes : {len(rows)}")
        if rows:
            print("\nEn-têtes trouvés (Ligne 1) :")
            for idx, h in enumerate(rows[0]):
                print(f"  Col {idx} ({chr(65+idx) if idx<26 else 'A'+chr(65+idx-26)}): '{h}'")
            print("\nExemple Ligne 2 :")
            for idx, val in enumerate(rows[1]):
                print(f"  Col {idx}: '{val}'")
except Exception as e:
    print("Erreur d'accès CSV public :", e)
