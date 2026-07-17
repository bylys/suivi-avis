import urllib.request, json

URL = "https://rrbvghxmnimusfyqixau.supabase.co/rest/v1/avis"
KEY = "sb_publishable_k0nVhKHWUT5kBW9xBNpLkA_AKam7uBa"
HEADERS = {
    "apikey": KEY,
    "Authorization": "Bearer " + KEY,
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

# Dates approximatives basées sur les "Jour" de posting (avril 2026)
J1 = "2026-04-05"  # Jour 1 - Caen/Normandie
J2 = "2026-04-07"  # Jour 2 - Tours
J3 = "2026-04-09"  # Jour 3 - Saint-Etienne
J4 = "2026-04-11"  # Jour 4 - Montauban
J5 = "2026-04-13"  # Jour 5 - Toulouse
J6 = "2026-04-15"  # Jour 6 - Rennes
J7 = "2026-04-17"  # Jour 7 - Strasbourg
J8 = "2026-04-19"  # Jour 8 - Cholet
J9 = "2026-04-21"  # Jour 9 - Liévin/Carvin
J10 = "2026-04-23" # Jour 10 - Dijon

avis = [
    # === C1 - JOUR 1 (Caen/Normandie) ===
    {"fiche_nom":"Carreleur Caen","auteur":"ericantoine034@gmail.com","note":5,"date":J1,"statut":"j7","lien":"https://maps.app.goo.gl/t4psZwccjeVGvqbg8"},
    {"fiche_nom":"Élagage Paysagiste Honfleur","auteur":"ericantoine034@gmail.com","note":5,"date":J1,"statut":"j7","lien":"https://maps.app.goo.gl/i63FeRcor4guU3Xv6"},

    {"fiche_nom":"Élagage Paysagiste Honfleur","auteur":"thierryquentin099@gmail.com","note":5,"date":J1,"statut":"j7","lien":"https://maps.app.goo.gl/WEfmaUso3icQB6j56"},
    {"fiche_nom":"Ravalement Bayeux","auteur":"thierryquentin099@gmail.com","note":5,"date":J1,"statut":"supprime","lien":"https://maps.app.goo.gl/AHDAaF6RfSsNCfQE6"},

    {"fiche_nom":"Ravalement Bayeux","auteur":"jeanfrancois4449@gmail.com","note":5,"date":J1,"statut":"supprime","lien":"https://maps.app.goo.gl/V6KTPx9YbSVGRJBC9"},
    {"fiche_nom":"Élagage Lisieux","auteur":"jeanfrancois4449@gmail.com","note":5,"date":J1,"statut":"j7","lien":"https://maps.app.goo.gl/nAzmZTDTm4U4Gy5w6"},

    {"fiche_nom":"Élagage Lisieux","auteur":"laurentxavier375@gmail.com","note":5,"date":J1,"statut":"j7","lien":"https://maps.app.goo.gl/6DuV9YMsi9hyP5Wa9"},
    {"fiche_nom":"Élagage Caen","auteur":"laurentxavier375@gmail.com","note":5,"date":J1,"statut":"j7","lien":"https://maps.app.goo.gl/TJkLKfrafMmtNCxt9"},

    {"fiche_nom":"Élagage Caen","auteur":"paullegrand978@gmail.com","note":5,"date":J1,"statut":"j7","lien":"https://maps.app.goo.gl/jChQTTyycjADF1Bg7"},
    {"fiche_nom":"Ravalement Caen","auteur":"paullegrand978@gmail.com","note":5,"date":J1,"statut":"supprime"},

    {"fiche_nom":"Ravalement Caen","auteur":"angemarie5670@gmail.com","note":5,"date":J1,"statut":"supprime"},
    {"fiche_nom":"Carreleur Caen","auteur":"angemarie5670@gmail.com","note":5,"date":J1,"statut":"supprime","lien":"https://maps.app.goo.gl/9S86HA2NDjg8gzhP9"},

    # === C1 - JOUR 2 (Tours) ===
    {"fiche_nom":"Débarras Tours","auteur":"damienedgard10@gmail.com","note":5,"date":J2,"statut":"supprime","lien":"https://maps.app.goo.gl/Ti97edvqJLxHBgWFA"},
    {"fiche_nom":"Élagage Abattage Jardinage Tours - Paysagiste 37","auteur":"damienedgard10@gmail.com","note":5,"date":J2,"statut":"supprime","lien":"https://maps.app.goo.gl/MCw3kvsJDN8Tyz9Z6"},

    {"fiche_nom":"Élagage Abattage Jardinage Tours - Paysagiste 37","auteur":"edouardperrot416@gmail.com","note":5,"date":J2,"statut":"supprime","lien":"https://maps.app.goo.gl/NenztLzFNxDHEwXP6"},
    {"fiche_nom":"Façade Ravalement Isolation Tours","auteur":"edouardperrot416@gmail.com","note":5,"date":J2,"statut":"supprime","lien":"https://maps.app.goo.gl/Ju5nkK1YJTUFkFe78"},

    {"fiche_nom":"Façade Ravalement Isolation Tours","auteur":"fredericdubois951@gmail.com","note":5,"date":J2,"statut":"supprime","lien":"https://maps.app.goo.gl/7uDb4EqUqTVy1nJJ7"},
    {"fiche_nom":"Paysagiste Tours","auteur":"fredericdubois951@gmail.com","note":5,"date":J2,"statut":"supprime","lien":"https://maps.app.goo.gl/6P8kpJ35c4taD8hQA"},

    {"fiche_nom":"Paysagiste Tours","auteur":"jacquesherbert169@gmail.com","note":5,"date":J2,"statut":"supprime","lien":"https://maps.app.goo.gl/euqGMn4fa5HKuYcf7"},
    {"fiche_nom":"Débarras Tours","auteur":"jacquesherbert169@gmail.com","note":5,"date":J2,"statut":"supprime","lien":"https://maps.app.goo.gl/kXpXC5TVGhP539Cy8"},

    # === C1 - JOUR 3 (Saint-Etienne) ===
    {"fiche_nom":"Maçonnerie Saint-Étienne","auteur":"Ludovic2039@gmail.com","note":5,"date":J3,"statut":"supprime","lien":"https://maps.app.goo.gl/kCwN7ev7BdFjZpPw8"},
    {"fiche_nom":"Élagage Saint-Etienne","auteur":"Ludovic2039@gmail.com","note":5,"date":J3,"statut":"supprime","lien":"https://maps.app.goo.gl/NScNiXmnMB2rEeux6"},

    {"fiche_nom":"Élagage Saint-Etienne","auteur":"nathaliepaulette499@gmail.com","note":5,"date":J3,"statut":"supprime","lien":"https://maps.app.goo.gl/jcSRZ3Qj7cJ4bcV59"},
    {"fiche_nom":"Loire (Saint Etienne)","auteur":"nathaliepaulette499@gmail.com","note":5,"date":J3,"statut":"supprime","lien":"https://maps.app.goo.gl/VaqVjUGKJ5BqgNFj6"},

    {"fiche_nom":"Loire (Saint Etienne)","auteur":"romainthibaut23@gmail.com","note":5,"date":J3,"statut":"supprime","lien":"https://maps.app.goo.gl/zdzLwrKExpErzeMB9"},
    {"fiche_nom":"Maçonnerie Saint-Étienne","auteur":"romainthibaut23@gmail.com","note":5,"date":J3,"statut":"supprime","lien":"https://maps.app.goo.gl/dkfiv1eagc1EcNNG8"},

    # === C1 - JOUR 4 (Montauban) ===
    {"fiche_nom":"Élagage & Abattage Tarn et Garonne","auteur":"vanessasylvie632@gmail.com","note":5,"date":J4,"statut":"supprime","lien":"https://maps.app.goo.gl/WeLv71YzBG7Hv7mGA"},
    {"fiche_nom":"Elagage & Abattage Montauban","auteur":"vanessasylvie632@gmail.com","note":5,"date":J4,"statut":"supprime","lien":"https://maps.app.goo.gl/1aFRDA4ZbQNzYX4q6"},

    {"fiche_nom":"Elagage & Abattage Montauban","auteur":"franckmuller4589@gmail.com","note":5,"date":J4,"statut":"supprime","lien":"https://maps.app.goo.gl/XUPh5zyBtNFkusFD8"},
    {"fiche_nom":"Élagage & Abattage Tarn et Garonne","auteur":"franckmuller4589@gmail.com","note":5,"date":J4,"statut":"supprime","lien":"https://maps.app.goo.gl/zEZ2C9mPQUs5MHnd8"},

    # === C2 - JOUR 5 (Toulouse) ===
    {"fiche_nom":"Élagage Toulouse","auteur":"noahlaurent3901@gmail.com","note":5,"date":J5,"statut":"supprime","lien":"https://maps.app.goo.gl/1UAsHDbKXSbbk9sK8"},
    {"fiche_nom":"Terrassement Toulouse","auteur":"noahlaurent3901@gmail.com","note":5,"date":J5,"statut":"supprime","lien":"https://maps.app.goo.gl/CJSPzLvNrakZhUCR9"},

    {"fiche_nom":"Terrassement Toulouse","auteur":"ismaelrey5392@gmail.com","note":5,"date":J5,"statut":"supprime","lien":"https://maps.app.goo.gl/uFnPPUgsYsGbKra36"},
    {"fiche_nom":"Nettoyage Toiture, Terrasse & Façade Toulouse - Démoussage 31","auteur":"ismaelrey5392@gmail.com","note":5,"date":J5,"statut":"supprime","lien":"https://maps.app.goo.gl/itRe2DzFuAb1oMfQ8"},

    {"fiche_nom":"Nettoyage Toiture, Terrasse & Façade Toulouse - Démoussage 31","auteur":"linamorel6523@gmail.com","note":5,"date":J5,"statut":"supprime","lien":"https://maps.app.goo.gl/2ucCrJEF1xR8wDgE7"},
    {"fiche_nom":"Élagage Toulouse","auteur":"linamorel6523@gmail.com","note":5,"date":J5,"statut":"supprime","lien":"https://maps.app.goo.gl/21tEWPsS7qzZUwTZ9"},

    # === C2 - JOUR 6 (Rennes) ===
    {"fiche_nom":"Élagage Abattage Dessouchage Rennes - Paysagiste Bretagne","auteur":"myriamleger5012@gmail.com","note":5,"date":J6,"statut":"supprime","lien":"https://maps.app.goo.gl/b4yYyTPb31mS5uGz9"},
    {"fiche_nom":"Élagage Abattage Dessouchage Rennes - Paysagiste Bretagne","auteur":"elinamaillard4@gmail.com","note":5,"date":J6,"statut":"supprime","lien":"https://maps.app.goo.gl/qB6Pf91JHVBfdvYZ8"},

    # === C2 - JOUR 7 (Strasbourg) ===
    {"fiche_nom":"Elagage Strasbourg","auteur":"yasminabenoit567@gmail.com","note":5,"date":J7,"statut":"supprime","lien":"https://maps.app.goo.gl/sHVgV68G814bMwp99"},
    {"fiche_nom":"Nettoyage Toiture, Terrasse & Façade Strasbourg - Démoussage Alsace","auteur":"yasminabenoit567@gmail.com","note":5,"date":J7,"statut":"supprime","lien":"https://maps.app.goo.gl/zR1rSBQ9PEhMMe2q7"},

    {"fiche_nom":"Nettoyage Toiture, Terrasse & Façade Strasbourg - Démoussage Alsace","auteur":"justinepelletier319@gmail.com","note":5,"date":J7,"statut":"supprime","lien":"https://maps.app.goo.gl/1HocRccRinKNn3bEA"},
    {"fiche_nom":"Elagage Strasbourg","auteur":"justinepelletier319@gmail.com","note":5,"date":J7,"statut":"supprime","lien":"https://maps.app.goo.gl/56vjo5eKwKq4z4T28"},

    # === C2 - JOUR 8 (Cholet) ===
    {"fiche_nom":"Ravalement De Façade Cholet","auteur":"cedricleclerc345@gmail.com","note":5,"date":J8,"statut":"supprime"},
    {"fiche_nom":"Élagage Cholet","auteur":"cedricleclerc345@gmail.com","note":5,"date":J8,"statut":"supprime","lien":"https://maps.app.goo.gl/TqGn5Xvt7HxBbChv5"},

    {"fiche_nom":"Élagage Cholet","auteur":"elodielemoine4123@gmail.com","note":5,"date":J8,"statut":"supprime","lien":"https://maps.app.goo.gl/xSNXHrPKqmRwAMHN6"},
    {"fiche_nom":"Ravalement De Façade Cholet","auteur":"elodielemoine4123@gmail.com","note":5,"date":J8,"statut":"supprime"},

    # === C2 - JOUR 9 (Liévin/Carvin) ===
    {"fiche_nom":"Élagage Liévin","auteur":"didiergautier625@gmail.com","note":5,"date":J9,"statut":"supprime","lien":"https://maps.app.goo.gl/Y8Z3M5Cs6UZqfyzRA"},
    {"fiche_nom":"Élagage, Abattage & Taille de Haie en Hauts-de-France - Elagueur Carvin","auteur":"didiergautier625@gmail.com","note":5,"date":J9,"statut":"supprime","lien":"https://maps.app.goo.gl/QwkXQqJx1UuPnx6m7"},

    {"fiche_nom":"Élagage, Abattage & Taille de Haie en Hauts-de-France - Elagueur Carvin","auteur":"mathildepichon317@gmail.com","note":5,"date":J9,"statut":"supprime","lien":"https://maps.app.goo.gl/saS7XmkPHs4SgwLS7"},
    {"fiche_nom":"Élagage Liévin","auteur":"mathildepichon317@gmail.com","note":5,"date":J9,"statut":"supprime","lien":"https://maps.app.goo.gl/s8q7pSfi2eWLLvuE6"},

    # === C2 - JOUR 10 (Dijon) ===
    {"fiche_nom":"Élagage Dijon","auteur":"pascalpichon935@gmail.com","note":5,"date":J10,"statut":"supprime","lien":"https://maps.app.goo.gl/EmB2D8nptNPPr5aS9"},
]

ok = 0
errors = 0
for a in avis:
    data = json.dumps(a).encode()
    req = urllib.request.Request(URL, data=data, headers=HEADERS, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            print(f"✅ {a['auteur']} → {a['fiche_nom']}")
            ok += 1
    except Exception as e:
        print(f"❌ {a['auteur']} → {a['fiche_nom']} : {e}")
        errors += 1

print(f"\n=== {ok} insérés, {errors} erreurs ===")
