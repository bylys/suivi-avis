#!/usr/bin/env python3
"""
Met à jour nb_avis_google sur chaque fiche via Google Places API.
Gère les URLs longues (google.com/maps/place/) et courtes (maps.app.goo.gl/).
"""

import os, re, json, sys, time, urllib.request, urllib.parse, urllib.error
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
        req = urllib.request.Request(lien, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=2) as r:
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
    """Extrait le nom du business et les coordonnées exactes depuis l'URL Maps."""
    name = None
    m = re.search(r'/maps/place/([^/@?]+)', url)
    if m:
        name = urllib.parse.unquote_plus(m.group(1))

    # Coordonnées exactes de la fiche (!3d lat !4d lng) — plus précis que le viewport /@
    coords = None
    m = re.search(r'!3d(-?\d+\.\d+).*?!4d(-?\d+\.\d+)', url)
    if m:
        coords = (m.group(1), m.group(2))
    else:
        m = re.search(r'/@(-?\d+\.\d+),(-?\d+\.\d+)', url)
        if m:
            coords = (m.group(1), m.group(2))
    return name, coords


def get_place_details(place_id):
    """Retourne userRatingCount pour un place_id connu (Places API New)."""
    url = f"https://places.googleapis.com/v1/places/{urllib.parse.quote(place_id)}"
    req = urllib.request.Request(url)
    req.add_header("X-Goog-Api-Key", PLACES_KEY)
    req.add_header("X-Goog-FieldMask", "userRatingCount")
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read())
    return data.get("userRatingCount")


def _name_matches(expected, returned):
    """Vérifie que les deux noms partagent assez de mots pour éviter les faux positifs."""
    def tokens(s):
        return set(re.sub(r'[^\w]', ' ', s.lower()).split())
    a, b = tokens(expected), tokens(returned)
    if not a or not b:
        return False
    overlap = len(a & b)
    return overlap >= max(1, min(len(a), len(b)) // 2)


def search_by_text(name, coords=None):
    """
    Places API (New) — Text Search.
    Retourne (userRatingCount, displayName) ou (None, None).
    Vérifie que le résultat correspond bien au nom attendu.
    """
    body = {"textQuery": name}
    if coords:
        body["locationBias"] = {
            "circle": {
                "center": {"latitude": float(coords[0]), "longitude": float(coords[1])},
                "radius": 500.0
            }
        }
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        "https://places.googleapis.com/v1/places:searchText",
        data=data, method="POST"
    )
    req.add_header("Content-Type", "application/json")
    req.add_header("X-Goog-Api-Key", PLACES_KEY)
    req.add_header("X-Goog-FieldMask", "places.userRatingCount,places.displayName")
    with urllib.request.urlopen(req) as r:
        result = json.loads(r.read())
    places = result.get("places", [])
    if not places:
        return None, None
    p = places[0]
    returned_name = (p.get("displayName") or {}).get("text", "")
    if returned_name and not _name_matches(name, returned_name):
        print(f"    ↳ rejeté : trouvé '{returned_name}' ≠ '{name}'")
        return None, returned_name
    return p.get("userRatingCount"), returned_name


def main():
    # En mode cron : toutes les fiches. En mode force : seulement celles sans nb_avis_google
    force = len(sys.argv) > 1 and sys.argv[1] == "force"
    if force:
        fiches = sb_get("fiches?select=id,nom,lien&lien=not.is.null")
        print(f"{len(fiches)} fiches avec lien (mode force)")
    else:
        fiches = sb_get("fiches?select=id,nom,lien&lien=not.is.null&nb_avis_google=is.null")
        print(f"{len(fiches)} fiches sans nb_avis_google")

    ok, skip, errors = 0, 0, 0
    for i, f in enumerate(fiches):
        nom  = f["nom"]
        lien = f["lien"]
        if (i + 1) % 20 == 0:
            print(f"[{i+1}/{len(fiches)}] ok={ok} skip={skip} err={errors}")
        try:
            resolved = resolve_url(lien)
            place_id = extract_place_id_from_url(resolved)
            name_from_url, coords = extract_name_and_coords(resolved)

            for attempt in range(4):
                try:
                    if place_id:
                        # Place ID extrait directement → appel direct, 100% précis
                        nb = get_place_details(place_id)
                    else:
                        # Fallback : text search avec nom GMB de l'URL (plus précis) ou nom fiche
                        search_name = name_from_url or nom
                        nb, _ = search_by_text(search_name, coords)
                    break
                except urllib.error.HTTPError as he:
                    if he.code == 429 and attempt < 3:
                        wait = 30 * (attempt + 1)
                        print(f"  429 rate limit, attente {wait}s...")
                        time.sleep(wait)
                    else:
                        raise
            time.sleep(0.5)

            if nb is None:
                print(f"  ⚠ non trouvé : {nom}")
                skip += 1
                continue

            sb_patch("fiches", f["id"], {
                "nb_avis_google": nb,
                "nb_avis_updated_at": TODAY
            })
            print(f"  ✓ {nom} → {nb} avis Google")
            ok += 1

        except Exception as e:
            print(f"  ✗ {nom} : {type(e).__name__}: {e}")
            errors += 1

    print(f"\nTerminé — {ok} mis à jour | {skip} non trouvés | {errors} erreurs")


if __name__ == "__main__":
    main()
