#!/usr/bin/env python3
"""
Corrige les noms des fiches GMB en les récupérant via SerpAPI.
Usage: python fix_names_serpapi.py --input fiches.csv --output fiches_corrigees.csv
"""

import csv
import time
import argparse
import requests

SERPAPI_KEY = "79aa0ffddca1616be0bf0fbb35acf2439dc73647da84ea2d50550fbd096c7d98"


def resolve_short_url(url: str) -> str:
    """Résout un lien court maps.app.goo.gl vers l'URL complète Google Maps."""
    try:
        r = requests.head(url, allow_redirects=True, timeout=10)
        return r.url
    except Exception as e:
        print(f"  [WARN] Impossible de résoudre {url}: {e}")
        return url


def extract_name_from_maps_url(maps_url: str):
    """Extrait le nom de la fiche directement depuis l'URL Google Maps résolue."""
    from urllib.parse import urlparse, unquote
    try:
        path = urlparse(maps_url).path
        parts = path.split('/')
        if 'place' in parts:
            idx = parts.index('place')
            if idx + 1 < len(parts):
                name = unquote(parts[idx + 1]).replace('+', ' ')
                return name if name and not name.startswith('@') else None
        return None
    except Exception as e:
        print(f"  [ERROR] Extraction nom: {e}")
        return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="CSV source (export du Google Sheet)")
    parser.add_argument("--output", required=True, help="CSV de sortie corrigé")
    parser.add_argument("--delay", type=float, default=0.5, help="Délai entre requêtes (secondes)")
    args = parser.parse_args()

    rows = []
    with open(args.input, newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader)
        rows = list(reader)

    print(f"{len(rows)} fiches à traiter...\n")

    updated = 0
    errors = 0

    for i, row in enumerate(rows):
        if len(row) < 2 or not row[1].strip():
            print(f"[{i+1}/{len(rows)}] Pas d'URL, ignoré.")
            continue

        original_name = row[0].strip()
        url = row[1].strip()

        print(f"[{i+1}/{len(rows)}] {original_name[:50]}")

        # Résoudre le lien court si nécessaire
        if "maps.app.goo.gl" in url:
            full_url = resolve_short_url(url)
        else:
            full_url = url

        # Extraction du nom depuis l'URL
        new_name = extract_name_from_maps_url(full_url)

        if new_name and new_name != original_name:
            print(f"  ✓ Ancien: {original_name}")
            print(f"  ✓ Nouveau: {new_name}")
            row[0] = new_name
            updated += 1
        elif new_name:
            print(f"  = Identique, pas de changement")
        else:
            print(f"  ✗ Nom non trouvé, conservé tel quel")
            errors += 1

        time.sleep(args.delay)

    # Écriture du CSV corrigé
    with open(args.output, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(rows)

    print(f"\nTerminé. {updated} noms mis à jour, {errors} erreurs.")
    print(f"Fichier exporté : {args.output}")


if __name__ == "__main__":
    main()
