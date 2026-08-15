#!/usr/bin/env python3
"""
Génère le planning quotidien des avis GMB.
- Sélectionne les paires gmail × fiche éligibles selon les règles métier
- Répartit entre opérateurs
- Insère dans la table planning de Supabase
- (Optionnel) Crée les profils GoLogin
- Envoie le planning sur Slack par opérateur
"""

import os, sys, json, urllib.request, urllib.error, urllib.parse
from datetime import date
from collections import defaultdict, Counter
import random

SB_URL        = os.environ["SUPABASE_URL"]
SB_KEY        = os.environ["SUPABASE_KEY"]
SLACK_WEBHOOK = os.environ.get("SLACK_WEBHOOK_URL", "")
GOLOGIN_TOKEN = os.environ.get("GOLOGIN_TOKEN", "")
DECODO_PASS        = os.environ.get("DECODO_PASS", "")         # résidentiel
DECODO_PASS_MOBILE = os.environ.get("DECODO_PASS_MOBILE", "")  # mobile

# Config proxy par pays : (host, port, username_résidentiel, username_mobile)
DECODO_PROXY_CONFIG = {
    "FR": ("gate.decodo.com", 10001,
           "user-VAteamR-country-fr-city-{city}-sessionduration-1440",
           "user-VATeam-country-fr-city-{city}-sessionduration-1440"),
    "BE": ("be.decodo.com",   40001,
           "user-VAteamR-sessionduration-1440",
           "user-VATeam-sessionduration-1440"),
    "LU": ("lu.decodo.com",   25001,
           "user-VAteamR-sessionduration-1440",
           "user-VATeam-sessionduration-1440"),
    "CA": ("ca.decodo.com",   20001,
           "user-VAteamR-sessionduration-1440",
           "user-VATeam-sessionduration-1440"),
    "US": ("us.decodo.com",   10001,
           "user-VAteamR-sessionduration-1440",
           "user-VATeam-sessionduration-1440"),
}
DONUT_TOKEN   = os.environ.get("DONUT_TOKEN", "")    # remplace GOLOGIN_TOKEN

# Slack webhooks par opérateur (optionnel — ajouter comme secrets GitHub)
SLACK_OPERATEURS = {
    "Kevin":     os.environ.get("SLACK_WEBHOOK_KEVIN", SLACK_WEBHOOK),
    "Fifaliana": os.environ.get("SLACK_WEBHOOK_FIFALIANA", SLACK_WEBHOOK),
    "Aina":      os.environ.get("SLACK_WEBHOOK_AINA", SLACK_WEBHOOK),
    "Kintana":   os.environ.get("SLACK_WEBHOOK_KINTANA", SLACK_WEBHOOK),
    "Korail":    os.environ.get("SLACK_WEBHOOK_KORAIL", SLACK_WEBHOOK),
    "Anjara":    os.environ.get("SLACK_WEBHOOK_ANJARA", SLACK_WEBHOOK),
}

DELAI_GMAIL_JOURS  = 3   # cooldown 3 j entre deux posts du même gmail (≥ minimum 1 j de repos exigé — stratégie Kevin)
DELAI_FICHE_JOURS  = 2   # délai min entre deux posts sur la même fiche
QUOTA_NOUVEAUX   = int(os.environ.get("QUOTA_PAR_OPERATEUR", "40"))  # Aina/Kintana/Korail/Anjara : max 40/jour
QUOTA_KEVIN_FIF  = int(os.environ.get("QUOTA_KEVIN_FIF", "50"))      # Kevin & Fifaliana : max 50/jour
OPERATEURS = ["Kevin", "Fifaliana", "Aina", "Kintana", "Korail", "Anjara"]
OPERATEURS_ANCIENS_GMAILS = ["Kevin", "Fifaliana"]  # accès aux anciens gmails + fiches sans mail
QUOTAS = {op: (QUOTA_KEVIN_FIF if op in OPERATEURS_ANCIENS_GMAILS else QUOTA_NOUVEAUX)
          for op in OPERATEURS}

# ── Rattrapage Aina (absence semaine 17-21 août, rattrapée sur les week-ends) ──
# Jours de rattrapage : planning UNIQUEMENT pour Aina (le reste de l'équipe n'a rien ces jours-là)
AINA_SOLO_DATES  = {"2026-08-08", "2026-08-09", "2026-08-15", "2026-08-29", "2026-08-30"}
# Jours d'absence d'Aina : elle est exclue du planning ces jours-là (le reste de l'équipe travaille)
AINA_SKIP_DATES  = {"2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20", "2026-08-21"}
# Quota réduit les jours de rattrapage : 25/jour → 25 samedi + 25 dimanche (répartition équitable)
AINA_SOLO_QUOTA  = 40

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

def sb_update(table, filter_, payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{SB_URL}/rest/v1/{table}?{filter_}",
        data=data, method="PATCH",
        headers={
            "apikey": SB_KEY,
            "Authorization": f"Bearer {SB_KEY}",
            "Content-Type": "application/json",
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
    """Normalise le nom de ville pour Decodo (minuscules, sans accents, underscores)."""
    import unicodedata
    ville = unicodedata.normalize('NFD', ville)
    ville = ''.join(c for c in ville if unicodedata.category(c) != 'Mn')
    ville = ville.lower().strip()
    ville = ville.replace(' ', '_').replace("'", '_').replace('-', '_')
    while '__' in ville:
        ville = ville.replace('__', '_')
    return ville

def build_proxy_config(pays, ville, mobile=False):
    """Retourne le dict proxy Decodo selon le pays, la ville et le type."""
    cfg = DECODO_PROXY_CONFIG.get(pays, DECODO_PROXY_CONFIG["FR"])
    host, port, user_res, user_mob = cfg
    city_slug = normalize_city_for_proxy(ville)
    user_tpl = user_mob if mobile else user_res
    username = user_tpl.replace("{city}", city_slug)
    password = DECODO_PASS_MOBILE if mobile else DECODO_PASS
    return {"host": host, "port": port, "username": username, "password": password}

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
    if DECODO_USER and DECODO_PASS:
        proxy_config = {
            "mode": "https",
            "host": "gate.decodo.com",
            "port": 10001,
            "username": build_decodo_username(ville),
            "password": DECODO_PASS,
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
    is_sunday = today.weekday() == 6

    # Déterminer les opérateurs actifs ce jour-là
    if today_str in AINA_SOLO_DATES:
        # Jour de rattrapage : uniquement Aina
        operateurs_actifs = ["Aina"]
        print(f"{today_str} — jour de rattrapage : Aina uniquement.")
    elif is_sunday:
        # Dimanche normal : aucun planning pour personne
        print(f"{today_str} (dimanche) — aucun planning prévu.")
        sb_delete("planning", f"date=eq.{today_str}")
        return
    elif today_str in AINA_SKIP_DATES:
        # Absence d'Aina : le reste de l'équipe travaille
        operateurs_actifs = [op for op in OPERATEURS if op != "Aina"]
        print(f"{today_str} — Aina absente (rattrapage), exclue du planning.")
    else:
        operateurs_actifs = list(OPERATEURS)

    # Supprimer le planning existant pour aujourd'hui (recalcul propre)
    sb_delete("planning", f"date=eq.{today_str}")

    print(f"Génération du planning pour {today_str} — opérateurs : {', '.join(operateurs_actifs)}")

    # Charger les données
    all_avis = sb_get_all("avis", "select=auteur,fiche_nom,date,operateur")
    fiches_data = sb_get_all("fiches", "select=nom,pays")
    fiche_pays = {f['nom']: (f.get('pays') or 'FR') for f in fiches_data}
    gmails_data = sb_get_all("gmails", "select=email,ville,operateur")
    all_gmails      = [g['email'].lower() for g in gmails_data]
    gmail_ville    = {g['email'].lower(): g['ville']      for g in gmails_data if g['ville']}
    gmail_operateur = {g['email'].lower(): g['operateur'] for g in gmails_data if g.get('operateur')}

    # Déduire la ville de chaque fiche depuis l'historique (vote majoritaire)
    fiche_villes_votes = defaultdict(list)
    for a in all_avis:
        g = (a['auteur'] or '').lower()
        fn = a['fiche_nom']
        if g in gmail_ville and fn:
            fiche_villes_votes[fn].append(gmail_ville[g])
    fiche_ville = {fn: Counter(v).most_common(1)[0][0]
                   for fn, v in fiche_villes_votes.items() if v}

    # Dates dernière utilisation gmail (avis saisis)
    last_gmail_date = {}
    for a in all_avis:
        g = (a['auteur'] or '').lower()
        if g and a['date']:
            d = date.fromisoformat(a['date'])
            if g not in last_gmail_date or d > last_gmail_date[g]:
                last_gmail_date[g] = d

    # Compléter avec les assignations planning (cooldown même sans saisie)
    past_planning = sb_get_all("planning", "select=gmail,fiche_nom,date&statut=neq.skip")
    for p in past_planning:
        if p['gmail'] and p['date']:
            g = p['gmail'].lower()
            d = date.fromisoformat(p['date'])
            if g not in last_gmail_date or d > last_gmail_date[g]:
                last_gmail_date[g] = d

    # Dates dernière utilisation fiche (avis saisis + planning)
    last_fiche_date = {}
    for a in all_avis:
        fn = a['fiche_nom']
        if fn and a['date']:
            d = date.fromisoformat(a['date'])
            if fn not in last_fiche_date or d > last_fiche_date[fn]:
                last_fiche_date[fn] = d
    for p in past_planning:
        if p['fiche_nom'] and p['date']:
            fn = p['fiche_nom']
            d = date.fromisoformat(p['date'])
            if fn not in last_fiche_date or d > last_fiche_date[fn]:
                last_fiche_date[fn] = d

    # Paires bloquées (gmail déjà posté sur cette fiche)
    used_pairs = set()
    for a in all_avis:
        if a['auteur'] and a['fiche_nom']:
            used_pairs.add((a['auteur'].lower(), a['fiche_nom'].strip().lower()))

    # Fiches éligibles : pas postées depuis >= DELAI_FICHE_JOURS
    fiches_dispo = [
        fn for fn, d in last_fiche_date.items()
        if (today - d).days >= DELAI_FICHE_JOURS and fn in fiche_ville
    ]
    # Trier par ancienneté décroissante (priorité aux fiches les plus anciennes)
    fiches_dispo.sort(key=lambda fn: (today - last_fiche_date[fn]).days, reverse=True)

    # Gmails éligibles : jamais utilisés OU cooldown passé
    # (inclut les gmails SANS ville — rattachés à une ville lors de leur 1re utilisation)
    gmails_dispo = {
        g for g in all_gmails
        if g not in last_gmail_date
        or (today - last_gmail_date[g]).days >= DELAI_GMAIL_JOURS
    }

    print(f"Fiches dispo : {len(fiches_dispo)} | Gmails dispo : {len(gmails_dispo)}")

    # Générer les assignations en round-robin (répartition équitable des fiches)
    planning_rows = []
    villes_a_persister = {}          # gmails neufs → ville rattachée (à écrire en base)

    # Pool de gmails par opérateur — stratégie Kevin généralisée :
    # chaque VA pioche dans SES gmails perso + le pool commun des gmails "AUCUN"
    # (anciens comptes réutilisables, partagés par toute l'équipe).
    is_solo_aina = today_str in AINA_SOLO_DATES
    pools = {}
    for operateur in operateurs_actifs:
        pools[operateur] = {
            g for g in gmails_dispo
            if gmail_operateur.get(g) == operateur   # ses gmails perso
            or g not in gmail_operateur              # + pool commun (gmails sans opérateur)
        }

    # Quotas du jour (rattrapage Aina : 25 pour équilibrer samedi/dimanche)
    quotas_jour = dict(QUOTAS)
    if is_solo_aina:
        quotas_jour["Aina"] = AINA_SOLO_QUOTA

    gmails_utilises = {op: set() for op in operateurs_actifs}
    gmails_used_today = set()   # garde-fou global : un gmail ne sert qu'une fois par jour, tous VA confondus
    assignations = {op: [] for op in operateurs_actifs}

    def pick_gmail(operateur, fn):
        """Trouve le meilleur gmail de l'opérateur pour cette fiche (ou None)."""
        ville = fiche_ville[fn]
        fn_key = fn.strip().lower()
        # 1. Priorité : gmails déjà rattachés à cette ville
        candidats = [
            g for g in pools[operateur]
            if gmail_ville.get(g) == ville
            and g not in gmails_used_today
            and (g, fn_key) not in used_pairs
        ]
        # 2. Fallback : gmails neufs (sans ville) — 1re utilisation
        if not candidats:
            candidats = [
                g for g in pools[operateur]
                if g not in gmail_ville
                and g not in gmails_used_today
                and (g, fn_key) not in used_pairs
            ]
        if not candidats:
            return None
        candidats.sort(key=lambda g: last_gmail_date.get(g, date.min))
        return candidats[0]

    # Fiches encore disponibles (une fiche = un seul opérateur par jour)
    remaining = list(fiches_dispo)

    # Phase 1 — tour par tour avec gmail : chaque opérateur prend une fiche/ronde, jusqu'à son quota
    active = True
    while active:
        active = False
        for operateur in operateurs_actifs:
            if len(assignations[operateur]) >= quotas_jour[operateur]:
                continue
            picked_idx, picked_gmail = None, None
            for idx, fn in enumerate(remaining):
                g = pick_gmail(operateur, fn)
                if g:
                    picked_idx, picked_gmail = idx, g
                    break
            if picked_idx is None:
                continue
            fn = remaining.pop(picked_idx)
            ville = fiche_ville[fn]
            # Gmail neuf → rattachement définitif à cette ville
            if picked_gmail not in gmail_ville:
                gmail_ville[picked_gmail] = ville
                villes_a_persister[picked_gmail] = ville
            gmails_utilises[operateur].add(picked_gmail)
            gmails_used_today.add(picked_gmail)   # réserve le gmail pour toute la journée (tous VA confondus)
            assignations[operateur].append({'fiche_nom': fn, 'ville': ville, 'gmail': picked_gmail})
            active = True

    # Phase 2 — Kevin/Fifaliana complètent jusqu'à leur quota avec les fiches restantes SANS gmail
    # (ils choisiront eux-mêmes le mail à utiliser)
    active = True
    while active:
        active = False
        for operateur in OPERATEURS_ANCIENS_GMAILS:
            if operateur not in assignations:
                continue
            if len(assignations[operateur]) >= quotas_jour[operateur] or not remaining:
                continue
            fn = remaining.pop(0)
            ville = fiche_ville[fn]
            assignations[operateur].append({'fiche_nom': fn, 'ville': ville, 'gmail': ''})
            active = True

    for operateur in operateurs_actifs:
        print(f"  {operateur} : {len(assignations[operateur])} assignations")
        for a in assignations[operateur]:
            pays = fiche_pays.get(a['fiche_nom'], 'FR')
            planning_rows.append({
                'date': today_str,
                'fiche_nom': a['fiche_nom'],
                'ville': a['ville'],
                'gmail': a['gmail'],
                'operateur': operateur,
                'statut': 'pending',
                'pays': pays,
            })

    print(f"Total assignations : {len(planning_rows)}")

    # Insérer par batch
    batch_size = 50
    inserted = 0
    for i in range(0, len(planning_rows), batch_size):
        batch = planning_rows[i:i+batch_size]
        sb_insert("planning", batch)
        inserted += len(batch)

    print(f"Inséré dans planning : {inserted} lignes")

    # Persister la ville des gmails neufs utilisés pour la 1re fois (rattachement définitif)
    if villes_a_persister:
        ok = 0
        for gm, vl in villes_a_persister.items():
            try:
                sb_update("gmails", f"email=eq.{urllib.parse.quote(gm)}", {"ville": vl})
                ok += 1
            except Exception as e:
                print(f"  MAJ ville échouée pour {gm}: {e}")
        print(f"Villes rattachées : {ok}/{len(villes_a_persister)} gmails neufs")

    # Envoyer Slack par opérateur
    for op in operateurs_actifs:
        taches = [r for r in planning_rows if r['operateur'] == op]
        if not taches:
            continue
        print(f"Planning {op} : {len(taches)} tâches")

    print("Done.")

if __name__ == "__main__":
    main()
