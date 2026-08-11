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

def get_orange_avis(limit=None):
    today = date.today()
    recheck = os.environ.get("RECHECK_TODAY") == "true"
    if recheck:
        today_str = today.isoformat()
        rows = sb_get(f"avis?select=id,auteur,statut,date,lien,texte&statut_date=eq.{today_str}&lien=not.is.null&limit=2000")
        print(f"Mode re-vérification activé (avis modifiés aujourd'hui) : {len(rows)} trouvés")
        if limit and limit > 0:
            return rows[:limit]
        return rows

    rows = sb_get("avis?select=id,auteur,statut,date,lien,texte&statut=not.in.(supprime,j30)&lien=not.is.null&limit=2000")
    orange = []
    for a in rows:
        seuil = SEUILS.get(a['statut'])
        if not seuil:
            continue
        age = (today - date.fromisoformat(a['date'])).days
        if age >= seuil:
            orange.append(a)
    if limit and limit > 0:
        return orange[:limit]
    return orange

def is_review_deleted(page, url, texte_avis=None):
    """
    Retourne True si l'avis est supprimé, False s'il est toujours en ligne.
    Vérification stricte basée UNIQUEMENT sur la présence réelle du texte de l'avis sur la page.
    """
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=15000)
        page.wait_for_timeout(3000)

        page_content = page.content().lower()

        # 1. Signaux de suppression explicites dans le HTML
        supprime_signals = [
            "cet avis a été supprimé",
            "this review has been deleted",
            "review has been removed",
            "avis supprimé",
            "impossible de trouver",
        ]
        for signal in supprime_signals:
            if signal in page_content:
                return True

        # 2. Vérification par les MOTS CLES du texte de l'avis
        if texte_avis and len(texte_avis.strip()) > 5:
            import re
            mots = [m.lower() for m in re.findall(r'\w{4,}', texte_avis) if len(m) >= 4]
            if mots:
                mots_trouves = [m for m in mots if m in page_content]
                ratio = len(mots_trouves) / len(mots)
                # Si au moins 2 mots significatifs OU 30% des mots sont sur la page -> EN LIGNE
                if len(mots_trouves) >= 2 or ratio >= 0.30:
                    return False  # L'avis est BIEN EN LIGNE
                else:
                    return True   # Texte introuvable sur la page -> SUPPRIMÉ

        # 3. Si l'avis n'avait pas de texte (juste une note) : présence de l'élément d'avis Google
        has_review_element = page.query_selector('[data-review-id]') is not None
        if has_review_element:
            return False

        return True

    except Exception as e:
        print(f"  Erreur chargement page : {e}")
        return None  # indéterminé, on skip


def main():
    from playwright.sync_api import sync_playwright

    max_check = int(os.environ.get("MAX_CHECK", "10"))
    orange = get_orange_avis(limit=max_check)
    print(f"Avis orange à vérifier (limite de test : {max_check}) : {len(orange)}")

    if not orange:
        print("Rien à faire.")
        return

    today_str = date.today().isoformat()
    results = {"supprime": 0, "avance": 0, "skip": 0, "errors": []}

    with sync_playwright() as p:
        bl_token = os.environ.get("BROWSERLESS_TOKEN")
        if bl_token:
            print("Connexion à Browserless.io (mode stealth)...")
            ws_url = f"wss://chrome.browserless.io?token={bl_token}&stealth=true"
            browser = p.chromium.connect_over_cdp(ws_url)
            context = browser.contexts[0] if browser.contexts else browser.new_context()
        else:
            print("Pas de BROWSERLESS_TOKEN détecté, lancement local de Chromium...")
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                locale="fr-FR"
            )
        for i, avis in enumerate(orange):
            avis_id  = avis['id']
            statut   = avis['statut']
            lien     = avis['lien']
            auteur   = avis['auteur']

            print(f"[{i+1}/{len(orange)}] {auteur} | {statut} | {lien}")

            page = context.new_page()
            try:
                deleted = is_review_deleted(page, lien, texte_avis=avis.get('texte'))
            except Exception as e:
                print(f"  Erreur context/page : {e}")
                deleted = None
            finally:
                try:
                    page.close()
                except Exception:
                    pass

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
