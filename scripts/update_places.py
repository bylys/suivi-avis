#!/usr/bin/env python3
"""
Met à jour nb_avis_google sur chaque fiche via Google Places API.
Gère les URLs longues (google.com/maps/place/) et courtes (maps.app.goo.gl/).
"""

import os, re, json, urllib.request, urllib.parse, urllib.error
from datetime import date

SB_URL     = os.environ["SUPABASE_URL"]
SB_KEY     = os.environ["SUPABASE_KEY"]
PLACES_KEY = os.environ["GOOGLE_PLACES_KEY"]
TODAY      = date.today().isoformat()


def sb_get(path):
    table, qs_raw = (path.split('?', 1) + [''])[:2]
    params = [p for p in qs_raw.split('&') if p and not p.startswith('limit=') and not p.startswith('offset=')]
    base_qs = '&'.join(params)
    all_rows, offset, PAGE = [], 0, 1000
    while True:
        pagination = f"limit={PAGE}&offset={offset}"
        qs = f"{base_qs}&{pagination}" if base_qs else pagination
        url = f"{SB_URL}/rest/v1/{table}?{qs}"
        req = urllib.request.Request(url)
        req.add_header("apikey", SB_KEY)
        req.add_header("Authorization", f"Bearer {SB_KEY}")
        with urllib.request.urlopen(req) as r:
            page = json.loads(r.read())
        all_rows.extend(page)
        if len(page) < PAGE:
            break
        offset += PAGE
    return all_rows


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


def resolve_url(lien):
    """Suit les redirections pour obtenir l'URL finale (goo.gl → maps longue)."""
    if 'goo.gl' not in lien:
        return lien
    try:
        req = urllib.request.Request(
            lien,
            headers={"User-Agent": "Mozilla/5.0"}
        )
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.url
    except Exception:
        return lien


def extract_place_id_from_url(url):
    """Extrait le place_id depuis une URL Google Maps si présent dans data=."""
    m = re.search(r'!1s(ChIJ[^!&%]+)', url)
    if m:
        return urllib.parse.unquote(m.group(1))
    m = re.search(r'%211s(ChIJ[^!&%]+)', url)
    if m:
        return urllib.parse.unquote(m.group(1))
    m = re.search(r'[?&]place_id=([^&]+)', url)
    if m:
        return m.group(1)
    return None


def extract_name_and_coords(url):
    """Extrait le nom du business et les coordonnées depuis l'URL Maps."""
    name = None
    m = re.search(r'/maps/place/([^/@?]+)', url)
    if m:
        name = urllib.parse.unquote_plus(m.group(1))
    coords = None
    m = re.search(r'/@(-?\d+\.\d+),(-?\d+\.\d+)', url)
    if m:
        coords = (m.group(1), m.group(2))
    return name, coords


def find_place_by_name(name, coords=None):
    """Cherche un place_id via findplacefromtext, avec locationbias si coordonnées dispo."""
    params = (
        f"input={urllib.parse.quote(name)}&inputtype=textquery"
        f"&fields=place_id&key={PLACES_KEY}"
    )
    if coords:
        params += f"&locationbias=circle:2000@{coords[0]},{coords[1]}"
    url = f"https://maps.googleapis.com/maps/api/place/findplacefromtext/json?{params}"
    with urllib.request.urlopen(url) as r:
        data = json.loads(r.read())
    candidates = data.get("candidates", [])
    if not candidates:
        return None
    return candidates[0]["place_id"]


def get_ratings(place_id):
    """Retourne user_ratings_total pour un place_id."""
    url = (
        f"https://maps.googleapis.com/maps/api/place/details/json"
        f"?place_id={urllib.parse.quote(place_id)}"
        f"&fields=user_ratings_total&key={PLACES_KEY}"
    )
    with urllib.request.urlopen(url) as r:
        data = json.loads(r.read())
    status = data.get("status")
    if status != "OK":
        raise ValueError(f"Places API status: {status}")
    return data.get("result", {}).get("user_ratings_total")


def main():
    fiches = sb_get("fiches?select=id,nom,lien&lien=not.is.null")
    print(f"{len(fiches)} fiches avec lien")

    ok, skip, errors = 0, 0, 0
    for f in fiches:
        nom  = f["nom"]
        lien = f["lien"]
        try:
            # Résoudre les URLs courtes
            resolved = resolve_url(lien)

            place_id = extract_place_id_from_url(resolved)
            if not place_id:
                # Fallback : extraire nom + coordonnées depuis l'URL
                name_from_url, coords = extract_name_and_coords(resolved)
                if name_from_url:
                    place_id = find_place_by_name(name_from_url, coords)
            if not place_id:
                print(f"  ⚠ place_id introuvable : {nom}")
                skip += 1
                continue

            nb = get_ratings(place_id)
            if nb is None:
                print(f"  ⚠ nb_avis null : {nom}")
                skip += 1
                continue

            sb_patch("fiches", f["id"], {
                "nb_avis_google": nb,
                "nb_avis_updated_at": TODAY
            })
            print(f"  ✓ {nom} → {nb} avis Google")
            ok += 1

        except Exception as e:
            print(f"  ✗ {nom} : {e}")
            errors += 1

    print(f"\nTerminé — {ok} mis à jour | {skip} non trouvés | {errors} erreurs")


if __name__ == "__main__":
    main()
