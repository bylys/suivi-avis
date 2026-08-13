#!/usr/bin/env python3
"""
Archive les avis de + de 3 mois :
1. Agrège les stats dans stats_mensuelles
2. Déplace les avis détaillés dans avis_archives
3. Supprime les originaux de la table avis

Exécuté en cron hebdomadaire via GitHub Actions.
"""

import os, json, urllib.request, urllib.error
from datetime import date, timedelta

SB_URL = os.environ["SUPABASE_URL"]
SB_KEY = os.environ["SUPABASE_KEY"]

HEADERS = {
    "apikey": SB_KEY,
    "Authorization": f"Bearer {SB_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def sb_get(path):
    req = urllib.request.Request(f"{SB_URL}/rest/v1/{path}")
    req.add_header("apikey", SB_KEY)
    req.add_header("Authorization", f"Bearer {SB_KEY}")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def sb_post(table, rows):
    if not rows:
        return
    data = json.dumps(rows).encode()
    req = urllib.request.Request(
        f"{SB_URL}/rest/v1/{table}",
        data=data, method="POST"
    )
    for k, v in HEADERS.items():
        req.add_header(k, v)
    req.add_header("Prefer", "return=minimal,resolution=merge-duplicates")
    with urllib.request.urlopen(req) as r:
        return r.status

def sb_delete(table, ids):
    if not ids:
        return
    id_filter = ",".join(ids)
    req = urllib.request.Request(
        f"{SB_URL}/rest/v1/{table}?id=in.({id_filter})",
        method="DELETE"
    )
    req.add_header("apikey", SB_KEY)
    req.add_header("Authorization", f"Bearer {SB_KEY}")
    with urllib.request.urlopen(req) as r:
        return r.status

def main():
    cutoff = date.today() - timedelta(days=90)
    cutoff_str = cutoff.isoformat()
    print(f"Archivage des avis avant {cutoff_str}")

    old_avis = sb_get(f"avis?select=*&date=lt.{cutoff_str}")
    if not old_avis:
        print("Aucun avis à archiver.")
        return

    print(f"{len(old_avis)} avis à archiver")

    # --- Étape 1 : agrégation stats_mensuelles ---
    stats = {}
    for a in old_avis:
        mois = a["date"][:7]  # "2026-03"
        op = (a.get("operateur") or "").lower() or "inconnu"
        fiche = a.get("fiche_nom") or "inconnue"
        key = (mois, op, fiche)
        if key not in stats:
            stats[key] = {"nb_avis": 0, "nb_j30": 0, "nb_supprimes": 0, "notes": []}
        stats[key]["nb_avis"] += 1
        if a.get("statut") == "j30":
            stats[key]["nb_j30"] += 1
        if a.get("statut") == "supprime":
            stats[key]["nb_supprimes"] += 1
        if a.get("note"):
            stats[key]["notes"].append(a["note"])

    stats_rows = []
    for (mois, op, fiche), s in stats.items():
        avg = round(sum(s["notes"]) / len(s["notes"]), 1) if s["notes"] else None
        stats_rows.append({
            "mois": mois,
            "operateur": op,
            "fiche_nom": fiche,
            "nb_avis": s["nb_avis"],
            "nb_j30": s["nb_j30"],
            "nb_supprimes": s["nb_supprimes"],
            "note_moyenne": avg
        })

    print(f"  → {len(stats_rows)} lignes stats_mensuelles")
    sb_post("stats_mensuelles", stats_rows)

    # --- Étape 2 : copie dans avis_archives ---
    print(f"  → Copie de {len(old_avis)} avis dans avis_archives")
    # Insérer par lots de 100
    for i in range(0, len(old_avis), 100):
        batch = old_avis[i:i+100]
        sb_post("avis_archives", batch)

    # --- Étape 3 : suppression des originaux ---
    ids = [str(a["id"]) for a in old_avis]
    print(f"  → Suppression de {len(ids)} avis de la table principale")
    # Supprimer par lots de 100
    for i in range(0, len(ids), 100):
        batch = ids[i:i+100]
        sb_delete("avis", batch)

    print("Archivage terminé.")

if __name__ == "__main__":
    main()
