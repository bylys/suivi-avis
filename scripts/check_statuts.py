#!/usr/bin/env python3
"""
Vérifie automatiquement le statut des avis GMB orange (palier atteint).
- Charge chaque lien Google Maps avec Playwright
- Si l'avis est supprimé → statut 'supprime'
- Si l'avis est toujours en ligne → statut suivant (j0→j7→j14→j21→j30)
"""

import os, sys, json, urllib.request, urllib.error
from datetime import date, datetime

SB_URL = os.environ["SUPABASE_URL"]
SB_KEY = os.environ["SUPABASE_KEY"]

NEXT_STATUT = {'j0': 'j7', 'j7': 'j14', 'j14': 'j21', 'j21': 'j30'}
SEUILS      = {'j0': 8,    'j7': 15,    'j14': 22,    'j21': 31}

def sb_get(path):
    req = urllib.request.Request(f"{SB_URL}/rest/v1/{path}")
    req.add_header("apikey", SB_KEY)
    req.add_header("Authorization", f"Bearer {SB_KEY}")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def sb_patch(table, id_, payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{SB_URL}/rest/v1/{table}?id=eq.{id_}",
        data=data, method="PATCH"
    )
    req.add_header("apikey", SB_KEY)
    req.add_header("Authorization", f"Bearer {SB_KEY}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "return=minimal")
    with urllib.request.urlopen(req) as r:
        return r.status

def get_orange_avis():
    today = date.today()
    rows = sb_get("avis?select=id,auteur,statut,date,lien&statut=not.in.(supprime,j30)&lien=not.is.null&limit=2000")
    orange = []
    for a in rows:
        seuil = SEUILS.get(a['statut'])
        if not seuil:
            continue
        age = (today - date.fromisoformat(a['date'])).days
        if age >= seuil:
            orange.append(a)
    return orange

def is_review_deleted(page, url):
    """
    Retourne True si l'avis est supprimé, False s'il est toujours en ligne.
    Logique :
    - Si la page redirige vers une URL sans fragment review → supprimé
    - Si la page contient des indicateurs de suppression → supprimé
    - Si la page charge normalement avec contenu d'avis → en ligne
    """
    try:
        response = page.goto(url, wait_until="networkidle", timeout=30000)
        final_url = page.url

        # URL finale — si le lien court redirige vers la fiche sans ancre review
        # les liens de review contiennent typiquement 'contrib' ou un hash d'avis
        if "contrib" not in final_url and "/reviews" not in final_url:
            # Vérifier quand même si la page contient un avis visible
            content = page.content()
            # Indicateurs de suppression sur Google Maps
            supprime_signals = [
                "cet avis a été supprimé",
                "this review has been deleted",
                "review has been removed",
                "avis supprimé",
            ]
            for signal in supprime_signals:
                if signal.lower() in content.lower():
                    return True

        # Vérifier le title — si c'est juste la fiche sans mention d'avis
        title = page.title()

        # Essayer de trouver un contenu d'avis sur la page
        # Les avis Google Maps ont des éléments avec data-review-id
        has_review_element = page.query_selector('[data-review-id]') is not None
        if has_review_element:
            return False  # avis toujours en ligne

        # Fallback : si la page ne charge pas de contenu d'avis visible
        # et que le lien ne contient pas d'ancre de review → supprimé
        if "contrib" not in final_url and "/reviews" not in final_url:
            return True

        return False

    except Exception as e:
        print(f"  Erreur chargement page : {e}")
        return None  # indéterminé, on skip


def main():
    from playwright.sync_api import sync_playwright

    orange = get_orange_avis()
    print(f"Avis orange à vérifier : {len(orange)}")

    if not orange:
        print("Rien à faire.")
        return

    today_str = date.today().isoformat()
    results = {"supprime": 0, "avance": 0, "skip": 0, "errors": []}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            locale="fr-FR"
        )
        page = context.new_page()

        for i, avis in enumerate(orange):
            avis_id  = avis['id']
            statut   = avis['statut']
            lien     = avis['lien']
            auteur   = avis['auteur']

            print(f"[{i+1}/{len(orange)}] {auteur} | {statut} | {lien}")

            deleted = is_review_deleted(page, lien)

            if deleted is None:
                print(f"  → Indéterminé, skip")
                results["skip"] += 1
                results["errors"].append({"id": avis_id, "lien": lien, "raison": "indéterminé"})
                continue

            if deleted:
                new_statut = "supprime"
                results["supprime"] += 1
            else:
                new_statut = NEXT_STATUT.get(statut, "j30")
                results["avance"] += 1

            print(f"  → {statut} → {new_statut}")
            try:
                sb_patch("avis", avis_id, {"statut": new_statut, "statut_date": today_str})
            except Exception as e:
                print(f"  Erreur Supabase : {e}")
                results["errors"].append({"id": avis_id, "raison": str(e)})

        context.close()
        browser.close()

    print(f"\nRésultat : {results['supprime']} supprimés | {results['avance']} avancés | {results['skip']} skippés")
    if results["errors"]:
        print(f"Erreurs : {json.dumps(results['errors'], indent=2)}")

if __name__ == "__main__":
    main()
