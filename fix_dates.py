import urllib.request, json

URL = "https://rrbvghxmnimusfyqixau.supabase.co/rest/v1/avis"
KEY = "sb_publishable_k0nVhKHWUT5kBW9xBNpLkA_AKam7uBa"
HEADERS = {
    "apikey": KEY,
    "Authorization": "Bearer " + KEY,
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def update_date(auteur, new_date, old_date):
    endpoint = f"{URL}?auteur=eq.{urllib.parse.quote(auteur)}&date=eq.{old_date}"
    data = json.dumps({"date": new_date}).encode()
    req = urllib.request.Request(endpoint, data=data, headers=HEADERS, method="PATCH")
    try:
        with urllib.request.urlopen(req) as resp:
            print(f"✅ {auteur} → {new_date}")
    except Exception as e:
        print(f"❌ {auteur} : {e}")

import urllib.parse

# === gid=1366596286 : tous à April 6 → corriger vers April 21 ===
print("=== Correction gid=1366596286 (avril 6 → 21 avril) ===")
tab2_authors = [
    "alphonsinetrip01@gmail.com",
    "ameliedunord002@gmail.com",
    "adrienlegrand578@gmail.com",
    "bernardaube380@gmail.com",
    "charlestrio051@gmail.com",
    "dominiquefox411@gmail.com",
    "edmondluthier298@gmail.com",
    "eugeneparlant601@gmail.com",
    "florianpetit531@gmail.com",
    "fredericnexo710@gmail.com",
    "guillaumefox320@gmail.com",
    "jeromedusud900@gmail.com",
    "laurentlesavant677@gmail.com",
    "luciensaint330@gmail.com",
    "mathieudedieu885@gmail.com",
]
for a in tab2_authors:
    update_date(a, "2026-04-21", "2026-04-06")

# === gid=397618984 : Jour 1-10 échelonnés du 21 avril au 30 avril ===
print("\n=== Correction gid=397618984 (Jour 1-10 → 21-30 avril) ===")

jour_dates = {
    "2026-04-05": ("2026-04-21", ["ericantoine034@gmail.com","thierryquentin099@gmail.com","jeanfrancois4449@gmail.com","laurentxavier375@gmail.com","paullegrand978@gmail.com","angemarie5670@gmail.com"]),
    "2026-04-07": ("2026-04-22", ["damienedgard10@gmail.com","edouardperrot416@gmail.com","fredericdubois951@gmail.com","jacquesherbert169@gmail.com"]),
    "2026-04-09": ("2026-04-23", ["Ludovic2039@gmail.com","nathaliepaulette499@gmail.com","romainthibaut23@gmail.com"]),
    "2026-04-11": ("2026-04-24", ["vanessasylvie632@gmail.com","franckmuller4589@gmail.com"]),
    "2026-04-13": ("2026-04-25", ["noahlaurent3901@gmail.com","ismaelrey5392@gmail.com","linamorel6523@gmail.com"]),
    "2026-04-15": ("2026-04-26", ["myriamleger5012@gmail.com","elinamaillard4@gmail.com"]),
    "2026-04-17": ("2026-04-27", ["yasminabenoit567@gmail.com","justinepelletier319@gmail.com"]),
    "2026-04-19": ("2026-04-28", ["cedricleclerc345@gmail.com","elodielemoine4123@gmail.com"]),
    "2026-04-21": ("2026-04-29", ["didiergautier625@gmail.com","mathildepichon317@gmail.com"]),
    "2026-04-23": ("2026-04-30", ["pascalpichon935@gmail.com"]),
}

for old_date, (new_date, authors) in jour_dates.items():
    for a in authors:
        update_date(a, new_date, old_date)

print("\n=== DONE ===")
