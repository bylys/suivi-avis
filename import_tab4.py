import urllib.request, json

URL = "https://rrbvghxmnimusfyqixau.supabase.co/rest/v1/avis"
KEY = "sb_publishable_k0nVhKHWUT5kBW9xBNpLkA_AKam7uBa"
HEADERS = {
    "apikey": KEY,
    "Authorization": "Bearer " + KEY,
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

J7  = "2026-04-27"
J8  = "2026-04-28"
J9  = "2026-04-29"
J10 = "2026-04-30"

avis = [
    # === JOUR 7 ===
    {"fiche_nom":"Reparation Toiture Nantes","auteur":"gerardmathieu0234@gmail.com","note":5,"date":J7,"statut":"supprime","lien":"https://maps.app.goo.gl/pNk7hesBqUimJZ3S8"},
    {"fiche_nom":"Nettoyage Nantes","auteur":"gerardmathieu0234@gmail.com","note":5,"date":J7,"statut":"supprime","lien":"https://maps.app.goo.gl/aCL7xy36r6pUQXid6"},

    {"fiche_nom":"Nettoyage Nantes","auteur":"adrienvincent438@gmail.com","note":5,"date":J7,"statut":"supprime","lien":"https://maps.app.goo.gl/js6kEwNc8Cys9WaW8"},
    {"fiche_nom":"Couvreur Rezé","auteur":"adrienvincent438@gmail.com","note":5,"date":J7,"statut":"supprime"},

    {"fiche_nom":"Couvreur Rezé","auteur":"marieanne2992@gmail.com","note":5,"date":J7,"statut":"supprime"},
    {"fiche_nom":"Couvreur Vertou","auteur":"marieanne2992@gmail.com","note":5,"date":J7,"statut":"supprime","lien":"https://maps.app.goo.gl/3cGTf7zQQiY8mPAd7"},

    {"fiche_nom":"Couvreur Vertou","auteur":"ericcharles410@gmail.com","note":5,"date":J7,"statut":"supprime","lien":"https://maps.app.goo.gl/JNccno8HcYQf6gqp6"},
    {"fiche_nom":"Couvreur Saint Herblain","auteur":"ericcharles410@gmail.com","note":5,"date":J7,"statut":"supprime","lien":"https://maps.app.goo.gl/dFJGqz7VtVwaqLAn8"},

    {"fiche_nom":"Couvreur Saint Herblain","auteur":"jacquesrichard113@gmail.com","note":5,"date":J7,"statut":"supprime","lien":"https://maps.app.goo.gl/8BuWa3V3WrjAWajf9"},
    {"fiche_nom":"Élagage Saint Herblain","auteur":"jacquesrichard113@gmail.com","note":5,"date":J7,"statut":"supprime","lien":"https://maps.app.goo.gl/aJRThbm2w8C2rv8A8"},

    {"fiche_nom":"Élagage Saint Herblain","auteur":"gregoireremi301@gmail.com","note":5,"date":J7,"statut":"supprime","lien":"https://maps.app.goo.gl/22BJLEVD9edYXQoe8"},
    {"fiche_nom":"Ravalement De Façade Pornichet","auteur":"gregoireremi301@gmail.com","note":5,"date":J7,"statut":"supprime","lien":"https://maps.app.goo.gl/L8gFpWA7rnkWQhET9"},

    {"fiche_nom":"Ravalement De Façade Pornichet","auteur":"lucasmartin3741@gmail.com","note":5,"date":J7,"statut":"supprime","lien":"https://maps.app.goo.gl/XL5WmWRrB4yQUgNJ8"},
    {"fiche_nom":"Ravalement De Façade Orvault","auteur":"lucasmartin3741@gmail.com","note":5,"date":J7,"statut":"supprime","lien":"https://maps.app.goo.gl/VPoi8Fqaf6qZTFc98"},

    {"fiche_nom":"Ravalement De Façade Orvault","auteur":"emmabenali619@gmail.com","note":5,"date":J7,"statut":"supprime","lien":"https://maps.app.goo.gl/Ah3qXiykQssqYVodA"},
    {"fiche_nom":"Élagage Pornic","auteur":"emmabenali619@gmail.com","note":5,"date":J7,"statut":"supprime","lien":"https://maps.app.goo.gl/DikCPEyPnZGtCNwZ8"},

    {"fiche_nom":"Élagage Pornic","auteur":"franckmartinez5190@gmail.com","note":5,"date":J7,"statut":"supprime","lien":"https://maps.app.goo.gl/6BWSeTuqwgMVGQjb7"},
    {"fiche_nom":"Ravalement De Façade Rezé","auteur":"franckmartinez5190@gmail.com","note":5,"date":J7,"statut":"supprime","lien":"https://maps.app.goo.gl/nQyNxzbv1NbTRpQb6"},

    {"fiche_nom":"Ravalement De Façade Rezé","auteur":"clarapetit5489@gmail.com","note":5,"date":J7,"statut":"supprime","lien":"https://maps.app.goo.gl/AW1TTvgXLEKTx98z8"},
    {"fiche_nom":"Ravalement De Façade Saint Herblain","auteur":"clarapetit5489@gmail.com","note":5,"date":J7,"statut":"supprime","lien":"https://maps.app.goo.gl/76Gpi9kPkc2ga7fJ9"},

    {"fiche_nom":"Ravalement De Façade Saint Herblain","auteur":"tiffanyduval320@gmail.com","note":5,"date":J7,"statut":"supprime","lien":"https://maps.app.goo.gl/reicCCRRkA7SJC8F9"},
    {"fiche_nom":"Élagage Rezé","auteur":"tiffanyduval320@gmail.com","note":5,"date":J7,"statut":"supprime"},

    {"fiche_nom":"Élagage Rezé","auteur":"lisacollet78@gmail.com","note":5,"date":J7,"statut":"supprime"},
    {"fiche_nom":"Ravalement De Façade Saint Sébastien Sur Loire","auteur":"lisacollet78@gmail.com","note":5,"date":J7,"statut":"supprime","lien":"https://maps.app.goo.gl/ATgUuwW2ZGarrZrw8"},

    # === JOUR 8 ===
    {"fiche_nom":"Ravalement De Façade Saint Sébastien Sur Loire","auteur":"franciagomez439@gmail.com","note":5,"date":J8,"statut":"supprime","lien":"https://maps.app.goo.gl/xVq99HakoeKTPiFN7"},
    {"fiche_nom":"Ravalement Façade Nantes","auteur":"franciagomez439@gmail.com","note":5,"date":J8,"statut":"supprime","lien":"https://maps.app.goo.gl/e39gXPTnMgW3jWsT6"},

    {"fiche_nom":"Ravalement Façade Nantes","auteur":"paulineboucher414@gmail.com","note":5,"date":J8,"statut":"supprime","lien":"https://maps.app.goo.gl/qWRy8P4g8YrtX6Yh6"},
    {"fiche_nom":"Élagage Nantes","auteur":"paulineboucher414@gmail.com","note":5,"date":J8,"statut":"supprime","lien":"https://maps.app.goo.gl/vi9gz4TcVijVna6Q6"},

    {"fiche_nom":"Élagage Nantes","auteur":"thierryconstance121@gmail.com","note":5,"date":J8,"statut":"supprime","lien":"https://maps.app.goo.gl/co5FZzG7zDnTGLXY9"},
    {"fiche_nom":"Élagage Saint Nazaire","auteur":"thierryconstance121@gmail.com","note":5,"date":J8,"statut":"supprime","lien":"https://maps.app.goo.gl/Q8SUeVyC3rdTujAb7"},

    {"fiche_nom":"Élagage Saint Nazaire","auteur":"jeanluc7831@gmail.com","note":5,"date":J8,"statut":"supprime","lien":"https://maps.app.goo.gl/bv6ED9wjaxRniME36"},
    {"fiche_nom":"Reparation Toiture Nantes","auteur":"jeanluc7831@gmail.com","note":5,"date":J8,"statut":"supprime","lien":"https://maps.app.goo.gl/1EwxZz1sRAsoNAqj6"},

    {"fiche_nom":"Élagage Abattage Jardinage Le Mans - Paysagiste 72","auteur":"nadiablanc870@gmail.com","note":5,"date":J8,"statut":"supprime","lien":"https://maps.app.goo.gl/HpUr2wQZUQSaPGCi6"},
    {"fiche_nom":"Ravalement Façade Le Mans","auteur":"nadiablanc870@gmail.com","note":5,"date":J8,"statut":"supprime","lien":"https://maps.app.goo.gl/MQkkyet6X26Zmcny5"},

    {"fiche_nom":"Ravalement Façade Le Mans","auteur":"barbaraschmitt145@gmail.com","note":5,"date":J8,"statut":"supprime","lien":"https://maps.app.goo.gl/VGTWFGKVWvQ4u7SU7"},
    {"fiche_nom":"Élagage Abattage Jardinage Le Mans - Paysagiste 72","auteur":"barbaraschmitt145@gmail.com","note":5,"date":J8,"statut":"supprime","lien":"https://maps.app.goo.gl/Ddyee5pjMyj33MT98"},

    # === JOUR 9 ===
    {"fiche_nom":"Ravalement, peintre La-Roche-sur-Yon - Nettoyage, Façade & Toiture 85","auteur":"alicialenoir319@gmail.com","note":5,"date":J9,"statut":"supprime","lien":"https://maps.app.goo.gl/ZFPsN3VsDTp6iJM76"},
    {"fiche_nom":"Ravalement, peintre La-Roche-sur-Yon - Nettoyage, Façade & Toiture 85","auteur":"rolandgilbert944@gmail.com","note":5,"date":J9,"statut":"supprime","lien":"https://maps.app.goo.gl/FH4UCmRg32cr7pgXA"},

    {"fiche_nom":"Élagage Cergy Pontoise","auteur":"philibertrichard59@gmail.com","note":5,"date":J9,"statut":"supprime"},
    {"fiche_nom":"Val d'Oise Ravalement / Peinture / Isolation","auteur":"philibertrichard59@gmail.com","note":5,"date":J9,"statut":"supprime","lien":"https://maps.app.goo.gl/kQbgxpVovf65DsPM7"},

    {"fiche_nom":"Val d'Oise Ravalement / Peinture / Isolation","auteur":"francisfrederic32@gmail.com","note":5,"date":J9,"statut":"supprime","lien":"https://maps.app.goo.gl/QczcpBAd2SJ3UR4m7"},
    {"fiche_nom":"Élagage Cergy Pontoise","auteur":"francisfrederic32@gmail.com","note":5,"date":J9,"statut":"supprime"},

    {"fiche_nom":"Élagage Villeurbanne","auteur":"roxanedidier46@gmail.com","note":5,"date":J9,"statut":"supprime","lien":"https://maps.app.goo.gl/qJMn2sKZfsxNf3Yv5"},
    {"fiche_nom":"Terrassement Lyon","auteur":"roxanedidier46@gmail.com","note":5,"date":J9,"statut":"supprime","lien":"https://maps.app.goo.gl/516MVttwnf1WubQ17"},

    {"fiche_nom":"Terrassement Lyon","auteur":"jessicamillet459@gmail.com","note":5,"date":J9,"statut":"j0","lien":"https://maps.app.goo.gl/Az2NsPAGGjzuSMM28"},
    {"fiche_nom":"Élagage Villeurbanne","auteur":"jessicamillet459@gmail.com","note":5,"date":J9,"statut":"j0","lien":"https://maps.app.goo.gl/VTQuT4AacmjYygJp9"},

    # === JOUR 10 ===
    {"fiche_nom":"Élagage Var","auteur":"victoriacolin345@gmail.com","note":5,"date":J10,"statut":"j0","lien":"https://maps.app.goo.gl/Q7Z87bnWWhm9P77p8"},
    {"fiche_nom":"Élagage Abattage Dessouchage Toulon - Paysagiste 83","auteur":"victoriacolin345@gmail.com","note":5,"date":J10,"statut":"j0","lien":"https://maps.app.goo.gl/JqBLmmWf6ESzdpkYA"},

    {"fiche_nom":"Élagage Abattage Dessouchage Toulon - Paysagiste 83","auteur":"trinahrodrigez@gmail.com","note":5,"date":J10,"statut":"j0","lien":"https://maps.app.goo.gl/B5WsZoweAsp6HMrs9"},
    {"fiche_nom":"Élagage Var","auteur":"trinahrodrigez@gmail.com","note":5,"date":J10,"statut":"j0","lien":"https://maps.app.goo.gl/mJTXca7kSn8YG2KU8"},

    {"fiche_nom":"Élagage Aulnay Sous Bois","auteur":"marieantoine6190@gmail.com","note":5,"date":J10,"statut":"j0","lien":"https://maps.app.goo.gl/aWEzPybNgETaRD2HA"},
    {"fiche_nom":"Terrassement Saint Denis","auteur":"marieantoine6190@gmail.com","note":5,"date":J10,"statut":"supprime","lien":"https://maps.app.goo.gl/fyRT8gooW3ugdjkN9"},

    {"fiche_nom":"Terrassement Saint Denis","auteur":"muriellemarie542@gmail.com","note":5,"date":J10,"statut":"j0","lien":"https://maps.app.goo.gl/C4SUGQe8HU1MMkby9"},
    {"fiche_nom":"Élagage Aulnay Sous Bois","auteur":"muriellemarie542@gmail.com","note":5,"date":J10,"statut":"j0","lien":"https://maps.app.goo.gl/smidBZ5o8cQvxCFd6"},
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
