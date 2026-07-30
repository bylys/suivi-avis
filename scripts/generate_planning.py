#!/usr/bin/env python3
"""
Génère le planning quotidien des avis GMB.
- Sélectionne les paires gmail × fiche éligibles selon les règles métier
- Répartit entre opérateurs
- Insère dans la table planning de Supabase
- (Optionnel) Crée les profils GoLogin
- Envoie le planning sur Slack par opérateur
"""

import os, sys, json, urllib.request, urllib.error
from datetime import date
from collections import defaultdict, Counter
import random

SB_URL        = os.environ["SUPABASE_URL"]
SB_KEY        = os.environ["SUPABASE_KEY"]
SLACK_WEBHOOK = os.environ.get("SLACK_WEBHOOK_URL", "")
GOLOGIN_TOKEN = os.environ.get("GOLOGIN_TOKEN", "")
OXYLABS_USER  = os.environ.get("OXYLABS_USER", "")   # ex: customer-AssistantGMB_3svai-cc-fr
OXYLABS_PASS  = os.environ.get("OXYLABS_PASS", "")

# Slack webhooks par opérateur (optionnel — ajouter comme secrets GitHub)
SLACK_OPERATEURS = {
    "Kevin":     os.environ.get("SLACK_WEBHOOK_KEVIN", SLACK_WEBHOOK),
    "Fifaliana": os.environ.get("SLACK_WEBHOOK_FIFALIANA", SLACK_WEBHOOK),
}

DELAI_GMAIL_JOURS  = 3   # délai min entre deux utilisations du même gmail
DELAI_FICHE_JOURS  = 2   # délai min entre deux posts sur la même fiche
QUOTA_PAR_OPERATEUR = int(os.environ.get("QUOTA_PAR_OPERATEUR", "50"))
OPERATEURS = ["Kevin", "Fifaliana"]

# ── Supabase helpers ──────────────────────────────────────────────────────────

def sb_get(path):
    req = urllib.request.Request(f"{SB_URL}/rest/v1/{path}")
    req.add_header("apikey", SB_KEY)
    req.add_header("Authorization", f"Bearer {SB_KEY}")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def sb_get_all(table, query=""):
    rows, offset = [], 0
    while True:
        sep = "&" if query else "?"
        page = sb_get(f"{table}?{query}{sep}limit=1000&offset={offset}")
        rows += page
        if len(page) < 1000:
            break
        offset += 1000
    return rows

def sb_insert(table, payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{SB_URL}/rest/v1/{table}",
        data=data, method="POST",
        headers={
            "apikey": SB_KEY,
            "Authorization": f"Bearer {SB_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }
    )
    with urllib.request.urlopen(req) as r:
        return r.status

def sb_delete(table, filter_):
    req = urllib.request.Request(
        f"{SB_URL}/rest/v1/{table}?{filter_}",
        method="DELETE",
        headers={
            "apikey": SB_KEY,
            "Authorization": f"Bearer {SB_KEY}",
            "Prefer": "return=minimal"
        }
    )
    with urllib.request.urlopen(req) as r:
        return r.status

# ── GoLogin helper ────────────────────────────────────────────────────────────

GOLOGIN_FOLDER_NAME = "VA TEAM"
_gologin_folder_id = None

def get_gologin_folder_id():
    global _gologin_folder_id
    if _gologin_folder_id:
        return _gologin_folder_id
    try:
        req = urllib.request.Request(
            "https://api.gologin.com/folders",
            headers={"Authorization": f"Bearer {GOLOGIN_TOKEN}"}
        )
        with urllib.request.urlopen(req) as r:
            folders = json.loads(r.read())
        # folders peut être une liste ou un dict avec une clé
        if isinstance(folders, dict):
            folders = folders.get("folders", folders.get("data", []))
        for f in folders:
            if f.get("name", "").strip().lower() == GOLOGIN_FOLDER_NAME.lower():
                _gologin_folder_id = f.get("id") or f.get("_id")
                print(f"Dossier GoLogin '{GOLOGIN_FOLDER_NAME}' trouvé : {_gologin_folder_id}")
                return _gologin_folder_id
        print(f"Dossier '{GOLOGIN_FOLDER_NAME}' non trouvé — profils créés sans dossier")
    except Exception as e:
        print(f"GoLogin folders erreur : {e}")
    return None

def normalize_city_for_proxy(ville):
    """Normalise le nom de ville pour l'URL Oxylabs (minuscules, sans accents, tirets)."""
    import unicodedata
    ville = unicodedata.normalize('NFD', ville)
    ville = ''.join(c for c in ville if unicodedata.category(c) != 'Mn')
    ville = ville.lower().strip()
    ville = ville.replace(' ', '-').replace("'", '-').replace('_', '-')
    # Supprimer les doubles tirets
    while '--' in ville:
        ville = ville.replace('--', '-')
    return ville

def build_oxylabs_username(ville):
    """Construit le username Oxylabs avec ville et session ID aléatoire."""
    city_slug = normalize_city_for_proxy(ville)
    sessid = ''.join([str(random.randint(0, 9)) for _ in range(12)])
    return f"{OXYLABS_USER}-city-{city_slug}-sessid-{sessid}-sesstime-1440"

def extract_metier(fiche_nom):
    """Extrait le métier depuis le nom de fiche."""
    nom = fiche_nom.lower()
    if 'elagage' in nom or 'élagage' in nom or 'abattage' in nom:
        return 'elagage'
    if 'couvreur' in nom or 'toiture' in nom or 'couverture' in nom:
        return 'couvreur'
    if 'carreleur' in nom or 'carrelage' in nom:
        return 'carreleur'
    if 'paysagiste' in nom or 'jardinage' in nom:
        return 'paysagiste'
    if 'etancheite' in nom or 'étanchéité' in nom:
        return 'etancheite'
    if 'ravalement' in nom or 'facade' in nom or 'façade' in nom:
        return 'ravalement'
    if 'nettoyage' in nom:
        return 'nettoyage'
    if 'vitrier' in nom or 'vitrerie' in nom:
        return 'vitrier'
    if 'maçon' in nom or 'macon' in nom or 'terrassement' in nom:
        return 'macon'
    if 'peintre' in nom or 'peinture' in nom:
        return 'peintre'
    if 'plombier' in nom or 'plomberie' in nom:
        return 'plombier'
    if 'electricien' in nom or 'électricien' in nom:
        return 'electricien'
    return 'autre'

def create_gologin_profile(gmail, ville, fiche_nom=''):
    if not GOLOGIN_TOKEN:
        return None
    folder_id = get_gologin_folder_id()

    metier = extract_metier(fiche_nom)
    ville_slug = normalize_city_for_proxy(ville)
    profile_name = f"GMB_{metier}_{ville_slug}"

    proxy_config = {"mode": "none"}
    if OXYLABS_USER and OXYLABS_PASS:
        proxy_config = {
            "mode": "any",
            "host": "pr.oxylabs.io",
            "port": 7777,
            "username": build_oxylabs_username(ville),
            "password": OXYLABS_PASS,
        }

    payload = {
        "name": profile_name,
        "os": "win",
        "navigator": {"language": "fr-FR", "userAgent": "auto"},
        "proxy": proxy_config,
        "notes": {"notes": f"Ville: {ville} | Gmail: {gmail}"},
        "googleServices": True,
    }
    if folder_id:
        payload["folderId"] = folder_id

    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        "https://api.gologin.com/browser",
        data=data, method="POST",
        headers={
            "Authorization": f"Bearer {GOLOGIN_TOKEN}",
            "Content-Type": "application/json"
        }
    )
    try:
        with urllib.request.urlopen(req) as r:
            resp = json.loads(r.read())
            profile_id = resp.get("id")
            print(f"  GoLogin profil créé : {profile_id} | proxy ville={normalize_city_for_proxy(ville)}")
            return profile_id
    except Exception as e:
        print(f"  GoLogin erreur pour {gmail}: {e}")
        return None

# ── Slack helper ──────────────────────────────────────────────────────────────

def send_slack(webhook, blocks, fallback):
    if not webhook:
        return
    data = json.dumps({"text": fallback, "blocks": blocks}).encode()
    req = urllib.request.Request(
        webhook, data=data, method="POST",
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as r:
            pass
    except Exception as e:
        print(f"Slack erreur: {e}")

def build_slack_planning(operateur, taches, today_str):
    lines = [f"• *{t['ville']}* — `{t['gmail']}` → _{t['fiche_nom'][:50]}_" for t in taches[:30]]
    if len(taches) > 30:
        lines.append(f"_...et {len(taches)-30} autres_")
    blocks = [
        {"type": "header", "text": {"type": "plain_text", "text": f"📋 Planning GMB — {today_str}"}},
        {"type": "section", "text": {"type": "mrkdwn", "text": f"Bonjour *{operateur}* ! Voici tes *{len(taches)} assignations* du jour :"}},
        {"type": "section", "text": {"type": "mrkdwn", "text": "\n".join(lines)}},
        {"type": "context", "elements": [{"type": "mrkdwn", "text": "Ouvre l'outil GMB → section *Planning* pour générer les avis."}]}
    ]
    return blocks

# ── Algorithme principal ──────────────────────────────────────────────────────

def main():
    today = date.today()
    today_str = today.isoformat()

    # Supprimer le planning existant pour aujourd'hui (recalcul propre)
    sb_delete("planning", f"date=eq.{today_str}")

    print(f"Génération du planning pour {today_str}...")

    # Charger les données
    all_avis = sb_get_all("avis", "select=auteur,fiche_nom,date,operateur")
    gmails_data = sb_get_all("gmails", "select=email,ville")
    gmail_ville = {g['email'].lower(): g['ville'] for g in gmails_data if g['ville']}

    # Déduire la ville de chaque fiche depuis l'historique (vote majoritaire)
    fiche_villes_votes = defaultdict(list)
    for a in all_avis:
        g = (a['auteur'] or '').lower()
        fn = a['fiche_nom']
        if g in gmail_ville and fn:
            fiche_villes_votes[fn].append(gmail_ville[g])
    fiche_ville = {fn: Counter(v).most_common(1)[0][0]
                   for fn, v in fiche_villes_votes.items() if v}

    # Dates dernière utilisation gmail
    last_gmail_date = {}
    for a in all_avis:
        g = (a['auteur'] or '').lower()
        if g and a['date']:
            d = date.fromisoformat(a['date'])
            if g not in last_gmail_date or d > last_gmail_date[g]:
                last_gmail_date[g] = d

    # Dates dernière utilisation fiche
    last_fiche_date = {}
    for a in all_avis:
        fn = a['fiche_nom']
        if fn and a['date']:
            d = date.fromisoformat(a['date'])
            if fn not in last_fiche_date or d > last_fiche_date[fn]:
                last_fiche_date[fn] = d

    # Paires bloquées (gmail déjà posté sur cette fiche)
    used_pairs = set()
    for a in all_avis:
        if a['auteur'] and a['fiche_nom']:
            used_pairs.add((a['auteur'].lower(), a['fiche_nom']))

    # Fiches éligibles : pas postées depuis >= DELAI_FICHE_JOURS
    fiches_dispo = [
        fn for fn, d in last_fiche_date.items()
        if (today - d).days >= DELAI_FICHE_JOURS and fn in fiche_ville
    ]
    # Trier par ancienneté décroissante (priorité aux fiches les plus anciennes)
    fiches_dispo.sort(key=lambda fn: (today - last_fiche_date[fn]).days, reverse=True)

    # Gmails éligibles : pas utilisés depuis >= DELAI_GMAIL_JOURS
    gmails_dispo = {
        g for g, d in last_gmail_date.items()
        if (today - d).days >= DELAI_GMAIL_JOURS and g in gmail_ville
    }
    # Ajouter les gmails jamais utilisés
    for g in gmail_ville:
        if g not in last_gmail_date:
            gmails_dispo.add(g)

    print(f"Fiches dispo : {len(fiches_dispo)} | Gmails dispo : {len(gmails_dispo)}")

    # Générer les assignations
    gmails_utilises = set()
    assignations = []

    for fn in fiches_dispo:
        if len(assignations) >= len(OPERATEURS) * QUOTA_PAR_OPERATEUR:
            break

        ville = fiche_ville[fn]

        # Candidats : même ville, dispo, pas bloqués sur cette fiche
        candidats = [
            g for g in gmails_dispo
            if gmail_ville.get(g) == ville
            and g not in gmails_utilises
            and (g, fn) not in used_pairs
        ]

        if not candidats:
            continue

        # Choisir le gmail le moins récemment utilisé (ou jamais utilisé en priorité)
        candidats.sort(key=lambda g: last_gmail_date.get(g, date.min))
        gmail = candidats[0]

        assignations.append({
            'fiche_nom': fn,
            'ville': ville,
            'gmail': gmail,
        })
        gmails_utilises.add(gmail)

    print(f"Assignations générées : {len(assignations)}")

    # Répartir entre opérateurs (alternance)
    planning_rows = []
    for i, a in enumerate(assignations):
        operateur = OPERATEURS[i % len(OPERATEURS)]
        gologin_id = None  # GoLogin désactivé — générateur image pas encore prêt
        row = {
            'date': today_str,
            'fiche_nom': a['fiche_nom'],
            'ville': a['ville'],
            'gmail': a['gmail'],
            'operateur': operateur,
            'statut': 'pending',
        }
        if gologin_id:
            row['gologin_id'] = gologin_id
        planning_rows.append(row)

    # Insérer par batch
    batch_size = 50
    inserted = 0
    for i in range(0, len(planning_rows), batch_size):
        batch = planning_rows[i:i+batch_size]
        sb_insert("planning", batch)
        inserted += len(batch)

    print(f"Inséré dans planning : {inserted} lignes")

    # Envoyer Slack par opérateur
    for op in OPERATEURS:
        taches = [r for r in planning_rows if r['operateur'] == op]
        if not taches:
            continue
        webhook = SLACK_OPERATEURS.get(op, SLACK_WEBHOOK)
        if webhook:
            blocks = build_slack_planning(op, taches, today_str)
            send_slack(webhook, blocks, f"Planning GMB {today_str} — {len(taches)} tâches pour {op}")
            print(f"Slack envoyé à {op} ({len(taches)} tâches)")

    print("Done.")

if __name__ == "__main__":
    main()
