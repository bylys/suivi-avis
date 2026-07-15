#!/bin/bash
URL="https://rrbvghxmnimusfyqixau.supabase.co/rest/v1/avis"
KEY="sb_publishable_k0nVhKHWUT5kBW9xBNpLkA_AKam7uBa"
H1="apikey: $KEY"
H2="Authorization: Bearer $KEY"
H3="Content-Type: application/json"
H4="Prefer: return=minimal"

ins() {
  curl -s -o /dev/null -w "%{http_code}" -X POST "$URL" \
    -H "$H1" -H "$H2" -H "$H3" -H "$H4" \
    --data-binary "$1"
  echo " ← $2"
}

echo "=== TAB D (Nice/Bordeaux - Mai 2026) ==="

ins '{"fiche_nom":"Élagage Saint Laurent Du Var","auteur":"alphonsinetrip01@gmail.com","note":5,"date":"2026-05-15","statut":"supprime","lien":"https://maps.app.goo.gl/Xm545Zyv6qZMjfPS6"}' "alphonsinetrip01 → Élagage Saint Laurent Du Var"
ins '{"fiche_nom":"Élagage Cannes","auteur":"alphonsinetrip01@gmail.com","note":5,"date":"2026-05-15","statut":"supprime","lien":"https://maps.app.goo.gl/p1p8na9BZd7ZRXdr9"}' "alphonsinetrip01 → Élagage Cannes"

ins '{"fiche_nom":"Élagage Cannes","auteur":"ameliedunord002@gmail.com","note":5,"date":"2026-05-15","statut":"supprime","lien":"https://maps.app.goo.gl/xmc5wPAQMGSrhEy48"}' "ameliedunord002 → Élagage Cannes (1)"
ins '{"fiche_nom":"Élagage Cannes","auteur":"ameliedunord002@gmail.com","note":5,"date":"2026-05-15","statut":"supprime"}' "ameliedunord002 → Élagage Cannes (2)"

ins '{"fiche_nom":"Élagage Nice","auteur":"adrienlegrand578@gmail.com","note":5,"date":"2026-05-15","statut":"supprime","lien":"https://maps.app.goo.gl/NxcPpLWi8LnfFyfY6"}' "adrienlegrand578 → Élagage Nice"
ins '{"fiche_nom":"Élagage Le Cannet","auteur":"adrienlegrand578@gmail.com","note":5,"date":"2026-05-15","statut":"j7","lien":"https://maps.app.goo.gl/ZkzReoJAtE9jrrtD6"}' "adrienlegrand578 → Élagage Le Cannet"

ins '{"fiche_nom":"Élagage Le Cannet","auteur":"bernardaube380@gmail.com","note":5,"date":"2026-05-18","statut":"j7","lien":"https://maps.app.goo.gl/4yGDYKwxJy3NHFTi6"}' "bernardaube380 → Élagage Le Cannet"
ins '{"fiche_nom":"Élagage Cagnes Sur Mer","auteur":"bernardaube380@gmail.com","note":5,"date":"2026-05-18","statut":"j7","lien":"https://maps.app.goo.gl/CnB5DFkdADB6q7MWA"}' "bernardaube380 → Élagage Cagnes Sur Mer"

ins '{"fiche_nom":"Élagage Cagnes Sur Mer","auteur":"charlestrio051@gmail.com","note":5,"date":"2026-05-18","statut":"j7","lien":"https://maps.app.goo.gl/7dHkW8L8bp1jEBdU8"}' "charlestrio051 → Élagage Cagnes Sur Mer"
ins '{"fiche_nom":"Débarras Nice","auteur":"charlestrio051@gmail.com","note":5,"date":"2026-05-18","statut":"j7","lien":"https://maps.app.goo.gl/oVJYj32ujSP6XzgL9"}' "charlestrio051 → Débarras Nice"

ins '{"fiche_nom":"Débarras Nice","auteur":"dominiquefox411@gmail.com","note":5,"date":"2026-05-18","statut":"supprime","lien":"https://maps.app.goo.gl/jsW5uk7NyS41rfDbA"}' "dominiquefox411 → Débarras Nice"
ins '{"fiche_nom":"Élagage Mandelieu La Napoule","auteur":"dominiquefox411@gmail.com","note":5,"date":"2026-05-18","statut":"j7","lien":"https://maps.app.goo.gl/Da7LrKfPzVMMLLxE9"}' "dominiquefox411 → Élagage Mandelieu La Napoule"

ins '{"fiche_nom":"Élagage Mandelieu La Napoule","auteur":"edmondluthier298@gmail.com","note":5,"date":"2026-05-19","statut":"supprime","lien":"https://maps.app.goo.gl/FFu27YamMmtNAgGg9"}' "edmondluthier298 → Élagage Mandelieu La Napoule"
ins '{"fiche_nom":"Élagage Saint Laurent Du Var","auteur":"edmondluthier298@gmail.com","note":5,"date":"2026-05-19","statut":"j7","lien":"https://maps.app.goo.gl/FCu5uN1Yi2vZttBC9"}' "edmondluthier298 → Élagage Saint Laurent Du Var"

ins '{"fiche_nom":"Ravalement Bordeaux","auteur":"eugeneparlant601@gmail.com","note":5,"date":"2026-05-19","statut":"j7","lien":"https://maps.app.goo.gl/T4wYNiK6HWDNd1C2A"}' "eugeneparlant601 → Ravalement Bordeaux"
ins '{"fiche_nom":"Terrassement Bordeaux","auteur":"eugeneparlant601@gmail.com","note":5,"date":"2026-05-19","statut":"supprime","lien":"https://maps.app.goo.gl/aNYBqqpouGGjUiUU8"}' "eugeneparlant601 → Terrassement Bordeaux"

ins '{"fiche_nom":"Terrassement Bordeaux","auteur":"florianpetit531@gmail.com","note":5,"date":"2026-05-20","statut":"j7","lien":"https://maps.app.goo.gl/vmFFnddAHJa6Ku1p8"}' "florianpetit531 → Terrassement Bordeaux"
ins '{"fiche_nom":"Elagage Bordeaux","auteur":"florianpetit531@gmail.com","note":5,"date":"2026-05-20","statut":"supprime","lien":"https://maps.app.goo.gl/PR85HMNHmnk2RiZK6"}' "florianpetit531 → Elagage Bordeaux"

ins '{"fiche_nom":"Elagage Bordeaux","auteur":"fredericnexo710@gmail.com","note":5,"date":"2026-05-20","statut":"j7","lien":"https://maps.app.goo.gl/3XwuVWXfeFk8E2ef9"}' "fredericnexo710 → Elagage Bordeaux"
ins '{"fiche_nom":"Nettoyage Bordeaux","auteur":"fredericnexo710@gmail.com","note":5,"date":"2026-05-20","statut":"supprime"}' "fredericnexo710 → Nettoyage Bordeaux"

ins '{"fiche_nom":"Nettoyage Bordeaux","auteur":"guillaumefox320@gmail.com","note":5,"date":"2026-05-21","statut":"supprime"}' "guillaumefox320 → Nettoyage Bordeaux"
ins '{"fiche_nom":"Étanchéité Bordeaux","auteur":"guillaumefox320@gmail.com","note":5,"date":"2026-05-21","statut":"supprime","lien":"https://maps.app.goo.gl/GyQVmn3v4uUcoBY79"}' "guillaumefox320 → Étanchéité Bordeaux"

ins '{"fiche_nom":"Étanchéité Bordeaux","auteur":"jeromedusud900@gmail.com","note":5,"date":"2026-05-21","statut":"supprime","lien":"https://maps.app.goo.gl/JoxBWcGnFEwwgrLW9"}' "jeromedusud900 → Étanchéité Bordeaux"
ins '{"fiche_nom":"Ravalement Bordeaux","auteur":"jeromedusud900@gmail.com","note":5,"date":"2026-05-21","statut":"j7","lien":"https://maps.app.goo.gl/VRCMD691jQMoxwy57"}' "jeromedusud900 → Ravalement Bordeaux"

echo ""
echo "=== TAB D2 (Nantes/Quimper/Cherbourg - Mai 2026) ==="

ins '{"fiche_nom":"Reparation Toiture Nantes","auteur":"carlamichaud00@gmail.com","note":5,"date":"2026-05-11","statut":"j7","lien":"https://maps.app.goo.gl/qHEryrULTv9CKAiEA"}' "carlamichaud00 → Reparation Toiture Nantes"
ins '{"fiche_nom":"Nettoyage Toiture Nantes","auteur":"carlamichaud00@gmail.com","note":5,"date":"2026-05-11","statut":"j7","lien":"https://maps.app.goo.gl/2zGi6F62wBdMLTu89"}' "carlamichaud00 → Nettoyage Toiture Nantes"

ins '{"fiche_nom":"Nettoyage Toiture Nantes","auteur":"hermantommy965@gmail.com","note":5,"date":"2026-05-11","statut":"j7","lien":"https://maps.app.goo.gl/cjNMmXV2gCV3hAYb6"}' "hermantommy965 → Nettoyage Toiture Nantes"
ins '{"fiche_nom":"Couvreur Vertou","auteur":"hermantommy965@gmail.com","note":5,"date":"2026-05-11","statut":"supprime","lien":"https://maps.app.goo.gl/eFgUk1yxnQCckcAbA"}' "hermantommy965 → Couvreur Vertou"

ins '{"fiche_nom":"Couvreur Vertou","auteur":"franckgabriel439@gmail.com","note":5,"date":"2026-05-12","statut":"supprime","lien":"https://maps.app.goo.gl/KTyhbNi6kzPKFmBb7"}' "franckgabriel439 → Couvreur Vertou"
ins '{"fiche_nom":"Élagage Saint-Herblain","auteur":"franckgabriel439@gmail.com","note":5,"date":"2026-05-12","statut":"j7","lien":"https://maps.app.goo.gl/4UsQ96JYm4ViJACQ7"}' "franckgabriel439 → Élagage Saint-Herblain"

ins '{"fiche_nom":"Élagage Saint-Herblain","auteur":"francoisjulien329@gmail.com","note":5,"date":"2026-05-13","statut":"j7","lien":"https://maps.app.goo.gl/pbU9jQQ3Yarr2ejt5"}' "francoisjulien329 → Élagage Saint-Herblain"
ins '{"fiche_nom":"Élagage Rezé","auteur":"francoisjulien329@gmail.com","note":5,"date":"2026-05-13","statut":"supprime"}' "francoisjulien329 → Élagage Rezé"

ins '{"fiche_nom":"Élagage Rezé","auteur":"augustingeorge418@gmail.com","note":5,"date":"2026-05-13","statut":"supprime"}' "augustingeorge418 → Élagage Rezé"
ins '{"fiche_nom":"Reparation Toiture Nantes","auteur":"augustingeorge418@gmail.com","note":5,"date":"2026-05-13","statut":"supprime","lien":"https://maps.app.goo.gl/3Zus7d91CXLPuy6z9"}' "augustingeorge418 → Reparation Toiture Nantes"

ins '{"fiche_nom":"Élagage Tarn-et-Garonne","auteur":"fernandezperez547@gmail.com","note":5,"date":"2026-05-14","statut":"j7","lien":"https://maps.app.goo.gl/428jsrJAvjaEEbtp9"}' "fernandezperez547 → Élagage Tarn-et-Garonne"
ins '{"fiche_nom":"Élagage Montauban","auteur":"fernandezperez547@gmail.com","note":5,"date":"2026-05-14","statut":"j7","lien":"https://maps.app.goo.gl/STRzBH3xzrPfKrwP6"}' "fernandezperez547 → Élagage Montauban"

ins '{"fiche_nom":"Élagage Montauban","auteur":"pierredusac435@gmail.com","note":5,"date":"2026-05-15","statut":"j7","lien":"https://maps.app.goo.gl/JTXTp4dZhdL55UDeA"}' "pierredusac435 → Élagage Montauban"
ins '{"fiche_nom":"Élagage Tarn-et-Garonne","auteur":"pierredusac435@gmail.com","note":5,"date":"2026-05-15","statut":"j7","lien":"https://maps.app.goo.gl/4FHe1WeKKc6R91V16"}' "pierredusac435 → Élagage Tarn-et-Garonne"

ins '{"fiche_nom":"Élagage Colmar","auteur":"margueritemarie4390@gmail.com","note":5,"date":"2026-05-15","statut":"supprime"}' "margueritemarie4390 → Élagage Colmar"
ins '{"fiche_nom":"Élagage Mulhouse","auteur":"margueritemarie4390@gmail.com","note":5,"date":"2026-05-15","statut":"supprime","lien":"https://maps.app.goo.gl/jDdxGBLWjtNVa5v27"}' "margueritemarie4390 → Élagage Mulhouse"

ins '{"fiche_nom":"Élagage Mulhouse","auteur":"thierry9321@gmail.com","note":5,"date":"2026-05-18","statut":"supprime","lien":"https://maps.app.goo.gl/eYAdq1oEgW2vGuF98"}' "thierry9321 → Élagage Mulhouse"
ins '{"fiche_nom":"Élagage Colmar","auteur":"thierry9321@gmail.com","note":5,"date":"2026-05-18","statut":"supprime","lien":"https://maps.app.goo.gl/NRjaVecdSGxTb4CYA"}' "thierry9321 → Élagage Colmar"

ins '{"fiche_nom":"Carreleur Cherbourg","auteur":"mariejeanne9210@gmail.com","note":5,"date":"2026-05-19","statut":"supprime","lien":"https://maps.app.goo.gl/yPCuiso52W65x4UFA"}' "mariejeanne9210 → Carreleur Cherbourg"
ins '{"fiche_nom":"Peintre Cherbourg","auteur":"mariejeanne9210@gmail.com","note":5,"date":"2026-05-19","statut":"supprime","lien":"https://maps.app.goo.gl/Kq3ckLagoaV1pibz5"}' "mariejeanne9210 → Peintre Cherbourg"

ins '{"fiche_nom":"Peintre Cherbourg","auteur":"muriellemartinez829@gmail.com","note":5,"date":"2026-05-19","statut":"supprime","lien":"https://maps.app.goo.gl/DPLdLqh2qEGqGXR87"}' "muriellemartinez829 → Peintre Cherbourg"
ins '{"fiche_nom":"Carreleur Cherbourg","auteur":"muriellemartinez829@gmail.com","note":5,"date":"2026-05-19","statut":"supprime","lien":"https://maps.app.goo.gl/4j2rEPitbGnNaHmX7"}' "muriellemartinez829 → Carreleur Cherbourg"

ins '{"fiche_nom":"Elagage Quimper","auteur":"julienarthur420@gmail.com","note":5,"date":"2026-05-20","statut":"supprime","lien":"https://maps.app.goo.gl/qQBuuxK6Sq1rEQ6X6"}' "julienarthur420 → Elagage Quimper"
ins '{"fiche_nom":"Nettoyage Brest","auteur":"julienarthur420@gmail.com","note":5,"date":"2026-05-20","statut":"supprime","lien":"https://maps.app.goo.gl/nDvtBMvBYKW4Yyv69"}' "julienarthur420 → Nettoyage Brest"

ins '{"fiche_nom":"Nettoyage Brest","auteur":"sarahrodriguez3914@gmail.com","note":5,"date":"2026-05-21","statut":"supprime","lien":"https://maps.app.goo.gl/q1F4ngp2hhtfWoi98"}' "sarahrodriguez3914 → Nettoyage Brest"
ins '{"fiche_nom":"Elagage Quimper","auteur":"sarahrodriguez3914@gmail.com","note":5,"date":"2026-05-21","statut":"supprime","lien":"https://maps.app.goo.gl/pT9CcHQFPNnLZpVi9"}' "sarahrodriguez3914 → Elagage Quimper"

ins '{"fiche_nom":"Élagage Cholet","auteur":"jacqueslouis185@gmail.com","note":5,"date":"2026-05-21","statut":"supprime","lien":"https://maps.app.goo.gl/L9eyHb5RKz2Fz8zN9"}' "jacqueslouis185 → Élagage Cholet"

echo ""
echo "=== DONE ==="
