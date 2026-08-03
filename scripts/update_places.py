#!/usr/bin/env python3
"""
Met à jour nb_avis_google sur chaque fiche via Google Places API.
Utilise "Find Place from Text" pour trouver le place_id depuis le nom,
puis "Place Details" pour récupérer user_ratings_total.
"""

import os, sys, json, urllib.request, urllib.parse
from datetime import date

SB_URL      = os.environ["SUPABASE_URL"]
SB_KEY      = os.environ["SUPABASE_KEY"]
PLACES_KEY  = os.environ["GOOGLE_PLACES_KEY"]
TODAY       = date.today().isoformat()

def sb_get(path):
    if '?' in path:
        table, qs_raw = path.split('?', 1)
    else:
        table, qs_raw = path, ''
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

def find_place(nom):
    """Retourne (place_id, user_ratings_total) ou (None, None) si non trouvé."""
    query = urllib.parse.quote(nom)
    url = (
        f"https://maps.googleapis.com/maps/api/place/findplacefromtext/json"
        f"?input={query}&inputtype=textquery"
        f"&fields=place_id&key={PLACES_KEY}"
    )
    with urllib.request.urlopen(url) as r:
        data = json.loads(r.read())
    candidates = data.get("candidates", [])
    if not candidates:
        return None, None
    place_id = candidates[0]["place_id"]

    # Détails pour récupérer user_ratings_total
    url2 = (
        f"https://maps.googleapis.com/maps/api/place/details/json"
        f"?place_id={place_id}&fields=user_ratings_total&key={PLACES_KEY}"
    )
    with urllib.request.urlopen(url2) as r:
        data2 = json.loads(r.read())
    nb = data2.get("result", {}).get("user_ratings_total")
    return place_id, nb

def main():
    fiches = sb_get("fiches?select=id,nom,lien&lien=not.is.null")
    print(f"{len(fiches)} fiches avec lien à traiter")

    ok, skip, errors = 0, 0, 0
    for f in fiches:
        nom = f["nom"]
        try:
            place_id, nb = find_place(nom)
            if nb is None:
                print(f"  ⚠ Non trouvé : {nom}")
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
