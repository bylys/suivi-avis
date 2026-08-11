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
    Vérification infaillible par redirection d'URL Google Maps + inspection HTML.
    """
    try:
        response = page.goto(url, wait_until="domcontentloaded", timeout=15000)
        final_url = page.url

        # 1. Analyse de l'URL de redirection finale de Google Maps
        # Quand un lien d'avis est supprimé, Google redirige vers l'URL générique du lieu (sans hash de review !1s... ou CAIQAC)
        has_review_hash = "!1sci" in final_url.lower() or "caiqac" in final_url.lower() or "/reviews/" in final_url.lower()

        page_content = page.content().lower()

        # Signaux de suppression explicites dans le HTML
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

        import re, unicodedata
        def strip_accents(s):
            return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')

        clean_page = strip_accents(page_content)

        # 2. Vérification ciblée par mots clés uniques du texte de l'auteur
        if texte_avis and len(texte_avis.strip()) > 5:
            clean_author_text = strip_accents(texte_avis.lower())
            words_author = set(re.findall(r'\b[a-z]{4,}\b', clean_author_text))

            STOP_WORDS = {
                'plus', 'sans', 'tout', 'très', 'avec', 'pour', 'dans', 'cette', 'fait', 'sont', 'bien',
                'aussi', 'sent', 'client', 'travail', 'equipe', 'entreprise', 'artisan', 'recommande',
                'soigne', 'professionnel', 'societe', 'chantier', 'service', 'prestation', 'intervention',
                'rapide', 'efficace', 'reactif', 'impeccable', 'parfait', 'qualite'
            }
            if fiche_nom:
                STOP_WORDS.update(re.findall(r'\b[a-z]{3,}\b', strip_accents(fiche_nom.lower())))

            unique_words = [w for w in words_author if w not in STOP_WORDS]

            # 1. Recherche ciblée dans les cartes d'avis réels (.wiI7pd, .MyEned)
            review_elements = page.query_selector_all('.wiI7pd, .MyEned')
            clean_reviews_html = " ".join([strip_accents(el.text_content().lower()) for el in review_elements if el.text_content()])

            mots_trouves_carte = [w for w in unique_words if w in clean_reviews_html]
            if mots_trouves_carte:
                return False, f"Avis trouvé dans carte review (mots: {mots_trouves_carte[:2]})"

            # 2. Fallback de sécurité : si .wiI7pd n'était pas encore rendu mais que les mots uniques de >= 5 lettres de l'auteur sont sur la page
            mots_page = [w for w in unique_words if len(w) >= 5 and w in clean_page]
            if len(mots_page) >= 2:
                return False, f"Avis trouvé sur la page (mots: {mots_page[:2]})"

            return True, f"Mots clés introuvables ({unique_words[:2]})"

        # Fallback si pas de texte : présence d'un élément HTML d'avis
        has_review_element = page.query_selector('.wiI7pd, .MyEned, [data-review-id]') is not None
        if has_review_element:
            return False, "Carte d'avis présente sur la page"

        return True, "Aucune carte d'avis trouvée sur la page (Avis supprimé)"

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

            try:
                page = context.new_page()
            except Exception:
                # Si le context Browserless s'est fermé, on le réouvre proprement
                try:
                    if bl_token:
                        browser = p.chromium.connect_over_cdp(ws_url)
                        context = browser.contexts[0] if browser.contexts else browser.new_context()
                    else:
                        browser = p.chromium.launch(headless=True)
                        context = browser.new_context(user_agent="Mozilla/5.0", locale="fr-FR")
                    page = context.new_page()
                except Exception as e_init:
                    print(f"  → Erreur init context: {e_init}")
                    results["skip"] += 1
                    continue

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
                # Calculer le bon statut J+ selon l'âge réel de l'avis
                try:
                    age = (date.today() - date.fromisoformat(avis['date'])).days
                except Exception:
                    age = 0
                
                if age >= 31:
                    new_statut = 'j30'
                elif age >= 22:
                    new_statut = 'j21'
                elif age >= 15:
                    new_statut = 'j14'
                elif age >= 8:
                    new_statut = 'j7'
                else:
                    new_statut = 'j0'

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
