import urllib.request, json

URL = "https://rrbvghxmnimusfyqixau.supabase.co/rest/v1/avis"
KEY = "sb_publishable_k0nVhKHWUT5kBW9xBNpLkA_AKam7uBa"
HEADERS = {
    "apikey": KEY,
    "Authorization": "Bearer " + KEY,
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

DATE = "2026-04-06"

avis = [
    # Row 1 - jeannexa89
    {"fiche_nom":"Reparation Toiture Nantes","auteur":"jeannexa89@gmail.com","note":5,"date":DATE,"statut":"supprime","lien":"https://maps.app.goo.gl/iTZ9J5bqoRXWXG3z7"},
    # Row 2 - gerardnexa89
    {"fiche_nom":"Reparation Toiture Nantes","auteur":"gerardnexa89@gmail.com","note":5,"date":DATE,"statut":"supprime","lien":"https://www.google.com/maps/place/Reparation+Toiture+Nantes/@47.2131752,-1.5689121,17z"},
    # Row 3 - mathildenexa99
    {"fiche_nom":"Couvreur Vertou 44","auteur":"mathildenexa99@gmail.com","note":5,"date":DATE,"statut":"supprime","lien":"https://maps.app.goo.gl/tBgW1VKU1Lwj2T5R8"},
    {"fiche_nom":"Couvreur Saint Herblain","auteur":"mathildenexa99@gmail.com","note":5,"date":DATE,"statut":"supprime","lien":"https://maps.app.goo.gl/Du3gb1E1gJoAxHhq7"},
    # Row 4 - tomnexa98
    {"fiche_nom":"Couvreur Saint Herblain","auteur":"tomnexa98@gmail.com","note":5,"date":DATE,"statut":"supprime","lien":"https://www.google.com/maps/place/Couvreur+Saint-Herblain+44/@47.2239192,-1.6544244,15z"},
    {"fiche_nom":"Couvreur Vertou 44","auteur":"tomnexa98@gmail.com","note":5,"date":DATE,"statut":"supprime","lien":"https://www.google.com/maps/place/Couvreur+Vertou+44/@47.1682412,-1.4703065,17z"},
    # Row 5 - francoisnexa97
    {"fiche_nom":"Élagage Saint Herblain","auteur":"francoisnexa97@gmail.com","note":5,"date":DATE,"statut":"supprime","lien":"https://maps.app.goo.gl/N6iX9QQa9p3YiEzB8"},
    # Row 6 - roxannenexa95 (avis bloqué = supprimé)
    {"fiche_nom":"Élagage Saint Herblain","auteur":"roxannenexa95@gmail.com","note":5,"date":DATE,"statut":"supprime","lien":"https://maps.app.goo.gl/agWEw58fsgyBDjGp9"},
    # Row 7 - davidnexa96
    {"fiche_nom":"Ravalement De Façade Orvault","auteur":"davidnexa96@gmail.com","note":5,"date":DATE,"statut":"supprime","lien":"https://maps.app.goo.gl/pQgyz7wMFFUBCMiu6"},
    {"fiche_nom":"Élagage Pornic","auteur":"davidnexa96@gmail.com","note":5,"date":DATE,"statut":"supprime","lien":"https://maps.app.goo.gl/N7AzGEk6QHV2Y2UK9"},
    # Row 9 - lucasnexa92
    {"fiche_nom":"Ravalement De Façade Pornic","auteur":"lucasnexa92@gmail.com","note":5,"date":DATE,"statut":"supprime","lien":"https://maps.app.goo.gl/YMwy7yJy5J4yTtSq6"},
    {"fiche_nom":"Ravalement De Façade Rezé","auteur":"lucasnexa92@gmail.com","note":5,"date":DATE,"statut":"supprime","lien":"https://maps.app.goo.gl/R2gnjuuLzzjA43rd9"},
    # Row 10 - mickaelnexa91
    {"fiche_nom":"Ravalement De Façade Rezé","auteur":"mickaelnexa91@gmail.com","note":5,"date":DATE,"statut":"supprime","lien":"https://maps.app.goo.gl/6mdoMtJBEiejRwEH6"},
    {"fiche_nom":"Ravalement De Façade Saint Herblain","auteur":"mickaelnexa91@gmail.com","note":5,"date":DATE,"statut":"supprime","lien":"https://maps.app.goo.gl/UG7smyi85x2aqUC77"},
    # Row 11 - darennexa90
    {"fiche_nom":"Ravalement De Façade Saint Herblain","auteur":"darennexa90@gmail.com","note":5,"date":DATE,"statut":"supprime","lien":"https://maps.app.goo.gl/SMGyxhdMuLXCdgYj9"},
    {"fiche_nom":"Ravalement De Façade Pornic","auteur":"darennexa90@gmail.com","note":5,"date":DATE,"statut":"supprime","lien":"https://maps.app.goo.gl/6MRVE2MQptR5Lzhm6"},
    # Row 12 - simonenexa68 (Belgique)
    {"fiche_nom":"Elagage Charleroi","auteur":"simonenexa68@gmail.com","note":5,"date":DATE,"statut":"supprime","lien":"https://maps.app.goo.gl/6ZX6DsVF13LaNQ7Z8"},
    {"fiche_nom":"Élagage Namur","auteur":"simonenexa68@gmail.com","note":5,"date":DATE,"statut":"supprime","lien":"https://maps.app.goo.gl/bDkiE8FiLV6L2hqG8"},
    # Row 13 - claranexa67
    {"fiche_nom":"Élagage Namur","auteur":"claranexa67@gmail.com","note":5,"date":DATE,"statut":"supprime","lien":"https://maps.app.goo.gl/RCh1A8v6eLNHfyHy5"},
    {"fiche_nom":"Elagage Charleroi","auteur":"claranexa67@gmail.com","note":5,"date":DATE,"statut":"supprime","lien":"https://maps.app.goo.gl/qe1djhXwW9eUkZwZ6"},
    # Row 14 - malvinnexa66
    {"fiche_nom":"Élagage Liège","auteur":"malvinnexa66@gmail.com","note":5,"date":DATE,"statut":"supprime","lien":"https://maps.app.goo.gl/2b8P3Z4KAhPeYGWR6"},
    {"fiche_nom":"Élagage Bruxelles","auteur":"malvinnexa66@gmail.com","note":5,"date":DATE,"statut":"supprime","lien":"https://maps.app.goo.gl/8h63gHQDPTMFj8RE6"},
    # Row 15 - hermannexa65
    {"fiche_nom":"Élagage Bruxelles","auteur":"hermannexa65@gmail.com","note":5,"date":DATE,"statut":"supprime","lien":"https://maps.app.goo.gl/UkaQ5ixtehACmLUQA"},
    {"fiche_nom":"Élagage Liège","auteur":"hermannexa65@gmail.com","note":5,"date":DATE,"statut":"supprime","lien":"https://maps.app.goo.gl/MvwX992dXqV9UJvW7"},
    # Row 16 - Bordeaux (2 emails)
    {"fiche_nom":"Nettoyage toiture Bordeaux - express et expert","auteur":"gilbertnexa89@gmail.com","note":5,"date":DATE,"statut":"supprime"},
    {"fiche_nom":"Nettoyage toiture Bordeaux - express et expert","auteur":"marienexa88@gmail.com","note":5,"date":DATE,"statut":"supprime"},
    # Row 17 - Rouen (2 emails)
    {"fiche_nom":"Rouen Nettoyage","auteur":"marcnexa87@gmail.com","note":5,"date":DATE,"statut":"supprime","lien":"https://maps.app.goo.gl/mTbS9svingqctvPE8"},
    {"fiche_nom":"Rouen Nettoyage","auteur":"claudenexa86@gmail.com","note":5,"date":DATE,"statut":"supprime","lien":"https://maps.app.goo.gl/oU1A3Qottgym4MVZ9"},
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
