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
from datetime import date, datetime
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
}

DELAI_GMAIL_JOURS  = int(os.environ.get("DELAI_GMAIL_JOURS", "8"))   # cooldown 8 j entre deux posts du même gmail
DELAI_FICHE_JOURS  = int(os.environ.get("DELAI_FICHE_JOURS", "2"))   # délai min entre deux posts sur la même fiche
QUOTA_KEVIN_FIF    = int(os.environ.get("QUOTA_PAR_OPERATEUR", os.environ.get("QUOTA_KEVIN_FIF", "68")))      # Kevin & Fifaliana : 65-70/jour (défaut 68)
OPERATEURS = ["Kevin", "Fifaliana"]
OPERATEURS_ANCIENS_GMAILS = ["Kevin", "Fifaliana"]
QUOTAS = {op: QUOTA_KEVIN_FIF for op in OPERATEURS}

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

DECODO_CITY_MAP_PYTHON = {
    'bayeux': 'caen', 'calvados': 'caen', '14': 'caen',
    'reze': 'nantes', 'saint_herblain': 'nantes', 'orvault': 'nantes', 'vertou': 'nantes',
    'villeurbanne': 'lyon', 'venissieux': 'lyon', 'pessac': 'bordeaux', 'merignac': 'bordeaux',
    'boulogne_billancourt': 'paris', 'nanterre': 'paris', 'courbevoie': 'paris',
    'aix_en_provence': 'marseille', 'aubagne': 'marseille'
}

def normalize_city_for_proxy(ville):
    """Normalise le nom de ville pour Decodo (minuscules, sans accents, sans mots métiers ni parenthèses)."""
    if not ville:
        return "paris"
    import unicodedata, re

    # Nettoyer les parenthèses
    v = re.sub(r'\(.*?\)', '', ville)
    v = unicodedata.normalize('NFD', v)
    v = ''.join(c for c in v if unicodedata.category(c) != 'Mn')
    v = v.lower().strip()
    v = re.sub(r'[^a-z0-9\s_-]', '', v)
    v = re.sub(r'[\s\'-]+', '_', v)
    v = re.sub(r'_+', '_', v).strip('_')

    trade_words = {
        'entreprise', 'elagueur', 'societe', 'artisan', 'eurl', 'sarl', 'sas',
        'elagage', 'abattage', 'taille', 'haie', 'arboriste', 'grimpeur', 'paysagiste',
        'ravalement', 'facade', 'nettoyage', 'demoussage', 'peintre', 'peinture',
        'couvreur', 'toiture', 'toit', 'zinguerie', 'charpente', 'carreleur', 'carrelage',
        'maconnerie', 'macon', 'beton', 'dalle', 'terrassement', 'terrasse', 'enduit',
        'facadier', 'isolation', 'debarras', 'etancheite', 'plomberie', 'plombier',
        'electricite', 'reparation', 'renovation', 'depannage', 'remorquage', 'auto',
        'voiture', 'garage', 'jardinage', 'jardin', 'batiment', 'couverture'
    }

    parts = [p for p in v.split('_') if p and p not in trade_words]
    res = '_'.join(parts)
    if not res or len(res) < 2:
        res = 'paris'

    return res

VALID_DECODO_CITIES_PYTHON = {
    'paris', 'marseille', 'lyon', 'toulouse', 'nice', 'nantes', 'montpellier', 'strasbourg',
    'bordeaux', 'lille', 'rennes', 'reims', 'toulon', 'saint_etienne', 'le_mans', 'grenoble',
    'dijon', 'angers', 'nimes', 'villeurbanne', 'caen', 'clermont_ferrand', 'le_havre', 'brest',
    'tours', 'amiens', 'limoges', 'annecy', 'perpignan', 'boulogne_billancourt', 'metz', 'besancon',
    'orleans', 'rouen', 'mulhouse', 'nancy', 'argenteuil', 'montreuil', 'saint_denis', 'versailles',
    'avignon', 'poitiers', 'courbevoie', 'dunkerque', 'valence', 'pau', 'la_rochelle', 'tarbes',
    'troyes', 'evreux', 'beauvais', 'cergy', 'melun', 'evry', 'bobigny', 'creteil', 'nanterre',
    'bayeux', 'lisieux', 'chalon_sur_saone', 'macon', 'nevers', 'bourges', 'blois', 'chartres',
    'chateauroux', 'niort', 'la_roche_sur_yon', 'cholet', 'saumur', 'laval', 'flers', 'argentan',
    'alencon', 'saint_lo', 'cherbourg', 'granville', 'dieppe', 'saint_quentin', 'soissons', 'laon',
    'charleville_mezieres', 'sedan', 'verdun', 'bar_le_duc', 'epinal', 'chaumont', 'belfort',
    'vesoul', 'lure', 'dole', 'lons_le_saunier', 'chambery', 'albertville', 'gap', 'digne_les_bains',
    'manosque', 'privas', 'aubenas', 'roanne', 'aurillac', 'moulins', 'montlucon', 'vichy', 'rodez',
    'millau', 'cahors', 'figeac', 'agen', 'marmande', 'mont_de_marsan', 'dax', 'lourdes', 'foix',
    'carcassonne', 'narbonne', 'albi', 'castres', 'montauban', 'beziers', 'sete', 'agde', 'ales',
    'arles', 'aubagne', 'martigues', 'salon_de_provence', 'hyeres', 'frejus', 'draguignan', 'grasse',
    'cannes', 'antibes', 'menton', 'bastia', 'ajaccio'
}

def get_decodo_city_slug_python(ville, pays="FR"):
    p = (pays or "FR").upper()
    slug = normalize_city_for_proxy(ville)

    if p == "BE":
        map_be = {'bruxelles': 'bruxelles', 'brussels': 'bruxelles', 'anvers': 'anvers', 'liege': 'liege', 'gand': 'gand', 'charleroi': 'charleroi', 'namur': 'namur', 'mons': 'mons'}
        return map_be.get(slug, 'bruxelles')
    if p == "CA":
        map_ca = {'montreal': 'montreal', 'toronto': 'toronto', 'vancouver': 'vancouver', 'quebec': 'quebec', 'ottawa': 'ottawa'}
        return map_ca.get(slug, 'montreal')
    if p == "US":
        map_us = {'new_york': 'new_york', 'los_angeles': 'los_angeles', 'chicago': 'chicago', 'miami': 'miami', 'houston': 'houston'}
        return map_us.get(slug, 'new_york')
    if p == "LU":
        return 'luxembourg'

    if slug in DECODO_CITY_MAP_PYTHON:
        return DECODO_CITY_MAP_PYTHON[slug]

    if slug in VALID_DECODO_CITIES_PYTHON:
        return slug

    parts = slug.split('_')
    for part in parts:
        if part in VALID_DECODO_CITIES_PYTHON:
            return part

    for key, val in DECODO_CITY_MAP_PYTHON.items():
        if key in slug:
            return val

    return 'paris'

def build_proxy_config(pays, ville, mobile=False):
    """Retourne le dict proxy Decodo selon le pays, la ville et le type."""
    cfg = DECODO_PROXY_CONFIG.get(pays, DECODO_PROXY_CONFIG["FR"])
    host, port, user_res, user_mob = cfg
    city_slug = get_decodo_city_slug_python(ville, pays)
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
    try:
        import zoneinfo
        tz = zoneinfo.ZoneInfo("Asia/Bangkok")
        today = datetime.now(tz).date()
    except Exception:
        today = date.today()

    today_str = today.isoformat()
    is_sunday = today.weekday() == 6

    if is_sunday:
        # Dimanche normal : aucun planning pour personne
        print(f"{today_str} (dimanche) — aucun planning prévu.")
        sb_delete("planning", f"date=eq.{today_str}")
        return
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

    # Charger les statuts personnalisés (Fonctionnel, Chauffe en cours, Indisponible)
    gmail_statuses = {}
    try:
        st_rows = sb_get("fiches?nom=eq.GMAIL_STATUSES&select=lien")
        if st_rows and len(st_rows) > 0 and st_rows[0].get("lien"):
            gmail_statuses = json.loads(st_rows[0]["lien"])
    except Exception as e:
        print(f"Statuts gmails non chargés: {e}")

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

    # Gmails éligibles : statut 'Fonctionnel' + jamais utilisés OU cooldown passé
    # (les comptes 'Chauffe en cours' et 'Indisponible' sont exclus)
    gmails_dispo = {
        g for g in all_gmails
        if gmail_statuses.get(g, "Fonctionnel") == "Fonctionnel"
        and (g not in last_gmail_date or (today - last_gmail_date[g]).days >= DELAI_GMAIL_JOURS)
    }

    print(f"Fiches dispo : {len(fiches_dispo)} | Gmails dispo (Fonctionnels + Cooldown) : {len(gmails_dispo)}")

    # Générer les assignations en round-robin (répartition équitable des fiches)
    planning_rows = []
    villes_a_persister = {}          # gmails neufs → ville rattachée (à écrire en base)

    # Pool de gmails par opérateur — stratégie Kevin généralisée :
    # Pool de gmails par opérateur :
    # chaque VA pioche dans SES gmails perso + le pool commun des gmails sans opérateur
    # + les gmails disponibles des comptes partagés/autres opérateurs non actifs.
    pools = {}
    for operateur in operateurs_actifs:
        pools[operateur] = {
            g for g in gmails_dispo
            if gmail_operateur.get(g) == operateur   # ses gmails perso
            or not gmail_operateur.get(g)            # + pool commun (gmails sans opérateur)
            or gmail_operateur.get(g) not in operateurs_actifs # + gmails partagés
        }

    # Quotas du jour par opérateur (65-70 par défaut)
    quotas_jour = dict(QUOTAS)

    gmails_utilises = {op: set() for op in operateurs_actifs}
    gmails_used_today = set()   # garde-fou global : un gmail ne sert qu'une fois par jour, tous VA confondus
    assignations = {op: [] for op in operateurs_actifs}

    def pick_gmail(operateur, fn):
        """Trouve le meilleur gmail disponible de l'opérateur pour cette fiche (ou None)."""
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
        # 3. Fallback : gmails disponibles du pool pour assurer le quota de 65-70 sans fiche vide
        if not candidats:
            candidats = [
                g for g in pools[operateur]
                if g not in gmails_used_today
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

    # Lancement automatique de la génération d'images Agent IA
    print("\n🤖 Lancement automatique de la génération d'images Agent IA pour le planning...")
    try:
        import subprocess
        agent_script = os.path.join(os.path.dirname(__file__), "..", "agent", "index.js")
        env = os.environ.copy()
        env["TARGET_DATE"] = today_str
        subprocess.Popen(["node", agent_script], env=env)
        print("✅ Processus de génération d'images DALL-E 3 / Agent IA lancé en arrière-plan !")
    except Exception as e:
        print(f"⚠️ Impossible de lancer la génération automatique d'images: {e}")

    print("Done.")

if __name__ == "__main__":
    main()
