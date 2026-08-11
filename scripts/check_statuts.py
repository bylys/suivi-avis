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
        rows = sb_get(f"avis?select=id,auteur,statut,date,lien,texte,fiche_nom&statut_date=eq.{today_str}&lien=not.is.null&limit=2000")
        print(f"Mode re-vérification activé (avis modifiés aujourd'hui) : {len(rows)} trouvés")
        if limit and limit > 0:
            return rows[:limit]
        return rows

    rows = sb_get("avis?select=id,auteur,statut,date,lien,texte,fiche_nom&statut=not.in.(supprime,j30)&lien=not.is.null&limit=2000")
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

def is_review_deleted(page, url, texte_avis=None, fiche_nom=None):
    """
    Retourne (True, raison) si supprimé, (False, raison) si en ligne.
    Vérification basée sur la présence d'expressions exactes du texte de l'avis,
    en ignorant dynamiquement le titre de la fiche GMB.
    """
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=15000)
        page.wait_for_timeout(3500)

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
                return True, f"Signal de suppression détecté: '{signal}'"

        # 2. Vérification par SÉQUENCES EXACTES (3 mots consécutifs du texte)
        if texte_avis and len(texte_avis.strip()) > 10:
            import re
            # Nettoyer le texte et extraire les mots significatifs (hors ponctuation)
            clean_words = re.findall(r'\b[a-zàâäéèêëîïôöùûüç]{3,}\b', texte_avis.lower())

            # Mots parasites et vocabulaire générique BTP/GMB très fréquents sur les fiches à exclure
            STOP_WORDS = {
                'plus', 'sans', 'tout', 'très', 'avec', 'pour', 'dans', 'cette', 'fait', 'sont', 'bien',
                'aussi', 'sent', 'client', 'travail', 'equipe', 'équipe', 'entreprise', 'artisan', 'recommande',
                'recommandons', 'soigne', 'soigné', 'professionnel', 'professionnels', 'societe', 'société',
                'chantier', 'chantiers', 'service', 'services', 'prestation', 'prestations', 'intervention',
                'rapide', 'efficace', 'reactif', 'réactif', 'impeccable', 'parfait', 'qualite', 'qualité'
            }
            # Éliminer automatiquement tous les mots du nom de la fiche GMB
            if fiche_nom:
                mots_fiche = re.findall(r'\b[a-zàâäéèêëîïôöùûüç]{3,}\b', fiche_nom.lower())
                STOP_WORDS.update(mots_fiche)

            filtered_words = [w for w in clean_words if w not in STOP_WORDS]

            # Construire des n-grammes de 3 mots consécutifs du texte de l'avis
            phrases = []
            for i in range(len(filtered_words) - 2):
                phrase = f"{filtered_words[i]} {filtered_words[i+1]} {filtered_words[i+2]}"
                phrases.append(phrase)

            if phrases:
                phrases_trouvees = [p for p in phrases if p in page_content]
                if phrases_trouvees:
                    return False, f"Expression trouvée sur la page: '{phrases_trouvees[0]}'"
                else:
                    return True, f"Expression introuvable (cherche ex: '{phrases[0]}')"

            # Si le texte est très court (moins de 3 mots filtrés), fallback sur 2 mots uniques
            if len(filtered_words) >= 2:
                phrase = f"{filtered_words[0]} {filtered_words[1]}"
                if phrase in page_content:
                    return False, f"Expression courte trouvée: '{phrase}'"
                return True, f"Expression courte introuvable: '{phrase}'"

        # 3. Si l'avis n'avait pas de texte : présence de l'élément d'avis Google
        has_review_element = page.query_selector('[data-review-id]') is not None
        if has_review_element:
            return False, "Élément data-review-id trouvé"

        return True, "Texte d'avis introuvable sur la page"

    except Exception as e:
        return None, f"Erreur chargement page: {e}"


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
                deleted, raison = is_review_deleted(page, lien, texte_avis=avis.get('texte'), fiche_nom=avis.get('fiche_nom'))
            except Exception as e:
                print(f"  Erreur context/page : {e}")
                deleted, raison = None, str(e)
            finally:
                try:
                    page.close()
                except Exception:
                    pass

            if deleted is None:
                print(f"  → Indéterminé, skip ({raison})")
                results["skip"] += 1
                results["errors"].append({"id": avis_id, "lien": lien, "raison": raison})
                continue

            if deleted:
                new_statut = "supprime"
                results["supprime"] += 1
            else:
                new_statut = NEXT_STATUT.get(statut, "j30")
                results["avance"] += 1

            print(f"  → {statut} → {new_statut} [{raison}]")
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
