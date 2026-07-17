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
    # alphonsinetrip01
    {"fiche_nom":"Débarras Nice","auteur":"alphonsinetrip01@gmail.com","note":5,"date":DATE,"statut":"j7","lien":"https://maps.app.goo.gl/RQkm4SBGmn599TPx8"},
    {"fiche_nom":"Élagage Mandelieu La Napoule","auteur":"alphonsinetrip01@gmail.com","note":5,"date":DATE,"statut":"j7","lien":"https://maps.app.goo.gl/RhvK2xDbogXyJks37"},
    # ameliedunord002
    {"fiche_nom":"Élagage Mandelieu La Napoule","auteur":"ameliedunord002@gmail.com","note":5,"date":DATE,"statut":"j7","lien":"https://maps.app.goo.gl/oioC7McTXgR8Fcui8"},
    {"fiche_nom":"Élagage Saint Laurent Du Var","auteur":"ameliedunord002@gmail.com","note":5,"date":DATE,"statut":"j7","lien":"https://maps.app.goo.gl/rpxsN3D98RjEHwbE8"},
    # adrienlegrand578
    {"fiche_nom":"Élagage Saint Laurent Du Var","auteur":"adrienlegrand578@gmail.com","note":5,"date":DATE,"statut":"j7","lien":"https://maps.app.goo.gl/7gq4jKtu4XtuUmry6"},
    {"fiche_nom":"Élagage Cannes","auteur":"adrienlegrand578@gmail.com","note":5,"date":DATE,"statut":"supprime","lien":"https://maps.app.goo.gl/n61ePJ2pnN9G23ib6"},
    # bernardaube380
    {"fiche_nom":"Élagage Cannes","auteur":"bernardaube380@gmail.com","note":5,"date":DATE,"statut":"supprime","lien":"https://maps.app.goo.gl/dwtVJhnBqib4yMTF6"},
    {"fiche_nom":"Élagage Nice","auteur":"bernardaube380@gmail.com","note":5,"date":DATE,"statut":"j7","lien":"https://maps.app.goo.gl/1Erk8eEM7LVaftcTA"},
    # charlestrio051
    {"fiche_nom":"Élagage Nice","auteur":"charlestrio051@gmail.com","note":5,"date":DATE,"statut":"j7","lien":"https://maps.app.goo.gl/mgWAS9ESUDzVa6Rw9"},
    {"fiche_nom":"Élagage Le Cannet","auteur":"charlestrio051@gmail.com","note":5,"date":DATE,"statut":"j7","lien":"https://maps.app.goo.gl/RE7cMCYPjWQThnvW6"},
    # dominiquefox411
    {"fiche_nom":"Élagage Le Cannet","auteur":"dominiquefox411@gmail.com","note":5,"date":DATE,"statut":"j7","lien":"https://maps.app.goo.gl/mQyLpB4CQF4vr2z66"},
    {"fiche_nom":"Élagage Cagnes Sur Mer","auteur":"dominiquefox411@gmail.com","note":5,"date":DATE,"statut":"j7","lien":"https://maps.app.goo.gl/L1B1uXeAoY553Htq9"},
    # edmondluthier298
    {"fiche_nom":"Élagage Cagnes Sur Mer","auteur":"edmondluthier298@gmail.com","note":5,"date":DATE,"statut":"j7","lien":"https://maps.app.goo.gl/ayWwCmdegruBicvh9"},
    {"fiche_nom":"Débarras Nice","auteur":"edmondluthier298@gmail.com","note":5,"date":DATE,"statut":"j7","lien":"https://maps.app.goo.gl/vS9f6RXd8PwqtgkT6"},
    # eugeneparlant601
    {"fiche_nom":"Nettoyage Bordeaux","auteur":"eugeneparlant601@gmail.com","note":5,"date":DATE,"statut":"supprime"},
    {"fiche_nom":"Étanchéité Bordeaux","auteur":"eugeneparlant601@gmail.com","note":5,"date":DATE,"statut":"j7","lien":"https://maps.app.goo.gl/i85ZKQVR32LNcifa6"},
    # florianpetit531
    {"fiche_nom":"Étanchéité Bordeaux","auteur":"florianpetit531@gmail.com","note":5,"date":DATE,"statut":"supprime","lien":"https://maps.app.goo.gl/QZ3zoKiA9gxY6Phn9"},
    {"fiche_nom":"Ravalement Bordeaux","auteur":"florianpetit531@gmail.com","note":5,"date":DATE,"statut":"j7","lien":"https://maps.app.goo.gl/gjjRkkXTjJcTqtbq8"},
    # fredericnexo710
    {"fiche_nom":"Ravalement Bordeaux","auteur":"fredericnexo710@gmail.com","note":5,"date":DATE,"statut":"supprime","lien":"https://maps.app.goo.gl/hnWfShuM4ZeA9dkZ6"},
    {"fiche_nom":"Terrassement Bordeaux","auteur":"fredericnexo710@gmail.com","note":5,"date":DATE,"statut":"j7","lien":"https://maps.app.goo.gl/u2vF8gQmv52Vodiv7"},
    # guillaumefox320
    {"fiche_nom":"Terrassement Bordeaux","auteur":"guillaumefox320@gmail.com","note":5,"date":DATE,"statut":"j7","lien":"https://maps.app.goo.gl/XQ1S9Fw8yz7rmVBe8"},
    {"fiche_nom":"Elagage Bordeaux","auteur":"guillaumefox320@gmail.com","note":5,"date":DATE,"statut":"j7","lien":"https://maps.app.goo.gl/dKyG2Cac6zAh8Fn69"},
    # jeromedusud900
    {"fiche_nom":"Elagage Bordeaux","auteur":"jeromedusud900@gmail.com","note":5,"date":DATE,"statut":"j7","lien":"https://maps.app.goo.gl/XfCjJ63AmpsBb8Qg8"},
    {"fiche_nom":"Nettoyage Bordeaux","auteur":"jeromedusud900@gmail.com","note":5,"date":DATE,"statut":"supprime"},
    # laurentlesavant677
    {"fiche_nom":"Rénovation Toiture Mulhouse","auteur":"laurentlesavant677@gmail.com","note":5,"date":DATE,"statut":"j7","lien":"https://maps.app.goo.gl/HLxnHo7HsBWipv3h6"},
    {"fiche_nom":"Elagage Colmar","auteur":"laurentlesavant677@gmail.com","note":5,"date":DATE,"statut":"supprime"},
    # luciensaint330
    {"fiche_nom":"Elagage Colmar","auteur":"luciensaint330@gmail.com","note":5,"date":DATE,"statut":"supprime"},
    {"fiche_nom":"Elagage Mulhouse","auteur":"luciensaint330@gmail.com","note":5,"date":DATE,"statut":"j7","lien":"https://maps.app.goo.gl/j6iMShnMjn9jRbXF7"},
    # mathieudedieu885
    {"fiche_nom":"Elagage Mulhouse","auteur":"mathieudedieu885@gmail.com","note":5,"date":DATE,"statut":"j7","lien":"https://maps.app.goo.gl/tT8xKehMskMfgASe9"},
    {"fiche_nom":"Rénovation Toiture Mulhouse","auteur":"mathieudedieu885@gmail.com","note":5,"date":DATE,"statut":"j7","lien":"https://maps.app.goo.gl/3Nq4nkgxnSp5hgv3A"},
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
