import urllib.request, json, urllib.parse

URL = "https://rrbvghxmnimusfyqixau.supabase.co/rest/v1/avis"
KEY = "sb_publishable_k0nVhKHWUT5kBW9xBNpLkA_AKam7uBa"
HEADERS = {
    "apikey": KEY,
    "Authorization": "Bearer " + KEY,
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def update_date(auteur, old_date, new_date):
    endpoint = f"{URL}?auteur=eq.{urllib.parse.quote(auteur)}&date=eq.{old_date}"
    data = json.dumps({"date": new_date}).encode()
    req = urllib.request.Request(endpoint, data=data, headers=HEADERS, method="PATCH")
    try:
        with urllib.request.urlopen(req) as resp:
            print(f"✅ {auteur} → {old_date} → {new_date}")
    except Exception as e:
        print(f"❌ {auteur} : {e}")

# === gid=397618984 : Jour 6-10 → mai ===
# Jour 6 : 2026-04-26 → 2026-05-01
# Jour 7 : 2026-04-27 → 2026-05-03
# Jour 8 : 2026-04-28 → 2026-05-05
# Jour 9 : 2026-04-29 → 2026-05-07
# Jour 10: 2026-04-30 → 2026-05-09

print("=== Correction gid=397618984 Jour 6-10 ===")
corrections_tab3 = [
    ("myriamleger5012@gmail.com",    "2026-04-26", "2026-05-01"),
    ("elinamaillard4@gmail.com",     "2026-04-26", "2026-05-01"),
    ("yasminabenoit567@gmail.com",   "2026-04-27", "2026-05-03"),
    ("justinepelletier319@gmail.com","2026-04-27", "2026-05-03"),
    ("cedricleclerc345@gmail.com",   "2026-04-28", "2026-05-05"),
    ("elodielemoine4123@gmail.com",  "2026-04-28", "2026-05-05"),
    ("didiergautier625@gmail.com",   "2026-04-29", "2026-05-07"),
    ("mathildepichon317@gmail.com",  "2026-04-29", "2026-05-07"),
    ("pascalpichon935@gmail.com",    "2026-04-30", "2026-05-09"),
]
for auteur, old, new in corrections_tab3:
    update_date(auteur, old, new)

# === gid=1957700361 : Jour 7-10 → mai ===
# Jour 7 : 2026-04-27 → 2026-05-03
# Jour 8 : 2026-04-28 → 2026-05-05
# Jour 9 : 2026-04-29 → 2026-05-07
# Jour 10: 2026-04-30 → 2026-05-09

print("\n=== Correction gid=1957700361 Jour 7-10 ===")
corrections_tab4 = [
    ("gerardmathieu0234@gmail.com",  "2026-04-27", "2026-05-03"),
    ("adrienvincent438@gmail.com",   "2026-04-27", "2026-05-03"),
    ("marieanne2992@gmail.com",      "2026-04-27", "2026-05-03"),
    ("ericcharles410@gmail.com",     "2026-04-27", "2026-05-03"),
    ("jacquesrichard113@gmail.com",  "2026-04-27", "2026-05-03"),
    ("gregoireremi301@gmail.com",    "2026-04-27", "2026-05-03"),
    ("lucasmartin3741@gmail.com",    "2026-04-27", "2026-05-03"),
    ("emmabenali619@gmail.com",      "2026-04-27", "2026-05-03"),
    ("franckmartinez5190@gmail.com", "2026-04-27", "2026-05-03"),
    ("clarapetit5489@gmail.com",     "2026-04-27", "2026-05-03"),
    ("tiffanyduval320@gmail.com",    "2026-04-27", "2026-05-03"),
    ("lisacollet78@gmail.com",       "2026-04-27", "2026-05-03"),
    ("franciagomez439@gmail.com",    "2026-04-28", "2026-05-05"),
    ("paulineboucher414@gmail.com",  "2026-04-28", "2026-05-05"),
    ("thierryconstance121@gmail.com","2026-04-28", "2026-05-05"),
    ("jeanluc7831@gmail.com",        "2026-04-28", "2026-05-05"),
    ("nadiablanc870@gmail.com",      "2026-04-28", "2026-05-05"),
    ("barbaraschmitt145@gmail.com",  "2026-04-28", "2026-05-05"),
    ("alicialenoir319@gmail.com",    "2026-04-29", "2026-05-07"),
    ("rolandgilbert944@gmail.com",   "2026-04-29", "2026-05-07"),
    ("philibertrichard59@gmail.com", "2026-04-29", "2026-05-07"),
    ("francisfrederic32@gmail.com",  "2026-04-29", "2026-05-07"),
    ("roxanedidier46@gmail.com",     "2026-04-29", "2026-05-07"),
    ("jessicamillet459@gmail.com",   "2026-04-29", "2026-05-07"),
    ("victoriacolin345@gmail.com",   "2026-04-30", "2026-05-09"),
    ("trinahrodrigez@gmail.com",     "2026-04-30", "2026-05-09"),
    ("marieantoine6190@gmail.com",   "2026-04-30", "2026-05-09"),
    ("muriellemarie542@gmail.com",   "2026-04-30", "2026-05-09"),
]
for auteur, old, new in corrections_tab4:
    update_date(auteur, old, new)

# === gid=1366596286 : tous à 2026-04-21 → étaler sur la période ===
# 15 comptes, on les étale Jour 1-10 (2 par jour environ)
print("\n=== Correction gid=1366596286 (étalement avril-mai) ===")
corrections_tab2 = [
    # Jour 1 - 21 avril
    ("alphonsinetrip01@gmail.com",  "2026-04-21", "2026-04-21"),  # déjà bon
    ("ameliedunord002@gmail.com",   "2026-04-21", "2026-04-21"),  # déjà bon
    # Jour 2 - 23 avril
    ("adrienlegrand578@gmail.com",  "2026-04-21", "2026-04-23"),
    ("bernardaube380@gmail.com",    "2026-04-21", "2026-04-23"),
    # Jour 3 - 25 avril
    ("charlestrio051@gmail.com",    "2026-04-21", "2026-04-25"),
    ("dominiquefox411@gmail.com",   "2026-04-21", "2026-04-25"),
    # Jour 4 - 27 avril
    ("edmondluthier298@gmail.com",  "2026-04-21", "2026-04-27"),
    ("eugeneparlant601@gmail.com",  "2026-04-21", "2026-04-27"),
    # Jour 5 - 29 avril
    ("florianpetit531@gmail.com",   "2026-04-21", "2026-04-29"),
    ("fredericnexo710@gmail.com",   "2026-04-21", "2026-04-29"),
    # Jour 6 - 1er mai
    ("guillaumefox320@gmail.com",   "2026-04-21", "2026-05-01"),
    ("jeromedusud900@gmail.com",    "2026-04-21", "2026-05-01"),
    # Jour 7 - 3 mai
    ("laurentlesavant677@gmail.com","2026-04-21", "2026-05-03"),
    ("luciensaint330@gmail.com",    "2026-04-21", "2026-05-03"),
    # Jour 8 - 5 mai
    ("mathieudedieu885@gmail.com",  "2026-04-21", "2026-05-05"),
]
for auteur, old, new in corrections_tab2:
    if old != new:
        update_date(auteur, old, new)
    else:
        print(f"⏭  {auteur} → déjà {new}")

print("\n=== DONE ===")
