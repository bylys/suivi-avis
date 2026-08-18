#!/usr/bin/env python3
"""
Met à jour le nombre d'avis Google (nb_avis_google) et la date de mise à jour (nb_avis_updated_at)
pour chaque fiche GMB dans Supabase en utilisant l'API DataForSEO.

Consignes DataForSEO API :
- Authorization: Basic bWFydmluQGFsbG8tY2hhbnRpZXJzLmZyOjg4MDdmYjNlYzg4MzUxZTU=
- Endpoint: https://api.dataforseo.com/v3/serp/google/maps/live/advanced
"""

import os, sys, json, time, re, urllib.request, urllib.parse, urllib.error
from datetime import date

SB_URL = os.environ.get("SUPABASE_URL", "https://rrbvghxmnimusfyqixau.supabase.co")
SB_KEY = os.environ.get("SUPABASE_KEY", "sb_publishable_k0nVhKHWUT5kBW9xBNpLkA_AKam7uBa")


DATAFORSEO_AUTH = os.environ.get("DATAFORSEO_AUTH", "bWFydmluQGFsbG8tY2hhbnRpZXJzLmZyOjg4MDdmYjNlYzg4MzUxZTU=")
TODAY = date.today().isoformat()

# Mapping des codes pays DataForSEO
LOCATION_CODES = {
    'FR': 2250, # France
    'BE': 2056, # Belgique
    'LU': 2442, # Luxembourg
    'CA': 2124, # Canada
    'US': 2840  # Etats-Unis
}

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
        if SB_KEY:
            req.add_header("apikey", SB_KEY)
            req.add_header("Authorization", f"Bearer {SB_KEY}")
        with urllib.request.urlopen(req) as r:
            page = json.loads(r.read().decode())
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
    if SB_KEY:
        req.add_header("apikey", SB_KEY)
        req.add_header("Authorization", f"Bearer {SB_KEY}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "return=minimal")
    with urllib.request.urlopen(req) as r:
        return r.status

def query_dataforseo_maps_live(keyword, country_code='FR'):
    url = "https://api.dataforseo.com/v3/serp/google/maps/live/advanced"
    location_code = LOCATION_CODES.get(country_code, 2250)
    
    payload = [{
        "keyword": keyword,
        "location_code": location_code,
        "language_code": "fr"
    }]
    
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Authorization", f"Basic {DATAFORSEO_AUTH}")
    req.add_header("Content-Type", "application/json")
    
    with urllib.request.urlopen(req, timeout=30) as r:
        res = json.loads(r.read().decode())
        
    tasks = res.get("tasks", [])
    if not tasks:
        return None
        
    result = tasks[0].get("result", [])
    if not result:
        return None
        
    items = result[0].get("items", [])
    return items

def extract_best_match(items, search_name):
    if not items:
        return None
        
    def normalize(s):
        return set(re.sub(r'[^\w]', ' ', (s or '').lower()).split())
        
    target_tokens = normalize(search_name)
    best_item = None
    best_score = -1
    
    for item in items:
        if item.get("type") != "maps_search":
            continue
        title = item.get("title", "")
        title_tokens = normalize(title)
        
        if not title_tokens:
            continue
            
        overlap = len(target_tokens & title_tokens)
        if overlap > best_score:
            best_score = overlap
            best_item = item
            
    # Si aucun titre partagé, prendre le 1er item maps_search par défaut si présent
    if not best_item:
        for item in items:
            if item.get("type") == "maps_search":
                return item
                
    return best_item

def main():
    force = len(sys.argv) > 1 and sys.argv[1] == "force"
    if force:
        fiches = sb_get("fiches?select=id,nom,lien,pays")
        print(f"📊 Mode FORCE : traitement de {len(fiches)} fiches...", flush=True)
    else:
        fiches = sb_get("fiches?select=id,nom,lien,pays&nb_avis_google=is.null")
        print(f"📊 Mode NORMAL : traitement de {len(fiches)} fiches sans nb_avis_google...", flush=True)

    ok, skip, errors = 0, 0, 0
    for i, f in enumerate(fiches):
        nom = f["nom"]
        pays = f.get("pays") or "FR"
        
        print(f"[{i+1}/{len(fiches)}] Recherche DataForSEO pour '{nom}' ({pays})...", flush=True)
        try:
            items = query_dataforseo_maps_live(nom, country_code=pays)
            match = extract_best_match(items, nom)
            
            if not match or "rating" not in match or match["rating"] is None:
                print(f"  ⚠️ Aucune fiche trouvée / pas d'avis pour '{nom}'", flush=True)
                skip += 1
                time.sleep(0.3)
                continue
                
            rating_info = match.get("rating", {})
            votes_count = rating_info.get("votes_count")
            rating_value = rating_info.get("value")
            matched_title = match.get("title", nom)
            
            if votes_count is not None:
                patch_payload = {
                    "nb_avis_google": votes_count,
                    "nb_avis_updated_at": TODAY
                }
                sb_patch("fiches", f["id"], patch_payload)
                print(f"  ✓ Trouvé '{matched_title}' -> {votes_count} avis ({rating_value}⭐)", flush=True)
                ok += 1
            else:
                print(f"  ⚠️ votes_count non disponible pour '{nom}'", flush=True)
                skip += 1
                
        except Exception as e:
            print(f"  ❌ Erreur DataForSEO pour '{nom}': {e}", flush=True)
            errors += 1
            
        time.sleep(0.3)

    print(f"\n🎉 Terminé ! Mis à jour: {ok} | Ignorés: {skip} | Erreurs: {errors}", flush=True)


if __name__ == "__main__":
    main()
