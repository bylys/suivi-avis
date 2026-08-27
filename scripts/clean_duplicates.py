#!/usr/bin/env python3
"""
Script de nettoyage des fiches GMB en double dans Supabase.
1. Regroupe les fiches ayant le même lien Google Maps normalisé (ou même identifiant Google).
2. Conserve la fiche principale (celle avec le plus d'avis rattachés ou la date la plus ancienne).
3. Réattribue les avis (table 'avis') de la fiche doublon vers la fiche principale.
4. Supprime la fiche doublon de Supabase.
"""

import os, sys, json, re, urllib.request, urllib.parse
from collections import defaultdict

SB_URL = os.environ.get("SUPABASE_URL", "https://rrbvghxmnimusfyqixau.supabase.co")
SB_KEY = os.environ.get("SUPABASE_KEY", "sb_publishable_k0nVhKHWUT5kBW9xBNpLkA_AKam7uBa")

HEADERS = {
    "apikey": SB_KEY,
    "Authorization": f"Bearer {SB_KEY}",
    "Content-Type": "application/json"
}

def sb_get(table, query="select=*"):
    url = f"{SB_URL}/rest/v1/{table}?{query}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode())

def sb_patch(table, id_, payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(f"{SB_URL}/rest/v1/{table}?id=eq.{id_}", data=data, method="PATCH", headers={**HEADERS, "Prefer": "return=minimal"})
    with urllib.request.urlopen(req) as r:
        return r.status

def sb_delete(table, id_):
    req = urllib.request.Request(f"{SB_URL}/rest/v1/{table}?id=eq.{id_}", method="DELETE", headers=HEADERS)
    with urllib.request.urlopen(req) as r:
        return r.status

def extract_google_signature(url):
    """Extrait un identifiant unique depuis une URL Google Maps (feature_id 0x...:0x... ou place_id ChIJ... ou CID)."""
    if not url:
        return None
    url = urllib.parse.unquote(url)
    
    # 1. Feature ID !1s0x...:0x...
    m = re.search(r'(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)', url)
    if m:
        return m.group(1).lower()
        
    # 2. Place ID ChIJ...
    m = re.search(r'(ChIJ[a-zA-Z0-9_-]+)', url)
    if m:
        return m.group(1)
        
    # 3. CID
    m = re.search(r'[?&]cid=(\d+)', url)
    if m:
        return f"cid_{m.group(1)}"
        
    # Fallback: URL nettoyée sans paramètres
    clean = url.split('?')[0].split('#')[0].rstrip('/').lower()
    if len(clean) > 20:
        return clean
        
    return None

def main():
    dry_run = "--apply" not in sys.argv
    if dry_run:
        print("🔍 Mode SIMULATION (Dry Run). Utilisez '--apply' pour exécuter le nettoyage réel.\n")
    else:
        print("⚡ Mode EXÉCUTION RÉELLE (--apply) activé.\n")

    fiches = sb_get("fiches", "select=id,nom,lien,date_ouverture,nb_avis_google,created_at")
    avis = sb_get("avis", "select=id,fiche_nom")
    
    print(f"Nombre total de fiches : {len(fiches)}")
    print(f"Nombre total d'avis : {len(avis)}\n")

    # Compter les avis par fiche_nom
    avis_par_fiche = defaultdict(int)
    for a in avis:
        if a.get('fiche_nom'):
            avis_par_fiche[a['fiche_nom']] += 1

    # Regrouper par signature Google ou nom normalisé
    groups = defaultdict(list)
    for f in fiches:
        sig = extract_google_signature(f.get('lien'))
        if sig:
            groups[f"sig:{sig}"].append(f)
        else:
            norm_name = re.sub(r'[^a-z0-9]', '', (f.get('nom') or '').lower())
            if norm_name:
                groups[f"name:{norm_name}"].append(f)

    # Filtrer uniquement les groupes avec > 1 fiche (doublons)
    duplicates_groups = {k: v for k, v in groups.items() if len(v) > 1}
    print(f"Groupes de doublons identifiés : {len(duplicates_groups)}\n")

    fiches_to_delete = []
    avis_to_update = [] # list of (avis_id, new_fiche_nom)

    for key, group in duplicates_groups.items():
        # Score chaque fiche pour choisir la fiche principale (garder celle avec le plus d'avis rattachés, de données, ou la plus ancienne)
        def score_fiche(f):
            attached_avis = avis_par_fiche.get(f['nom'], 0)
            has_lien = 10 if f.get('lien') else 0
            has_date = 5 if f.get('date_ouverture') else 0
            has_google_avis = 5 if f.get('nb_avis_google') is not None else 0
            return (attached_avis * 100) + has_lien + has_date + has_google_avis

        # Trier par score décroissant
        sorted_group = sorted(group, key=score_fiche, reverse=True)
        primary = sorted_group[0]
        duplicates = sorted_group[1:]

        print(f"📌 Groupe '{primary['nom']}' ({len(group)} fiches) :")
        print(f"   ► Conserver Principale: ID {primary['id']} | Nom: '{primary['nom']}' | Avis rattachés: {avis_par_fiche.get(primary['nom'], 0)}")

        for dup in duplicates:
            dup_avis_count = avis_par_fiche.get(dup['nom'], 0)
            print(f"   🗑️ Doublon à supprimer: ID {dup['id']} | Nom: '{dup['nom']}' | Avis rattachés: {dup_avis_count}")
            
            # Si le nom de la fiche doublon différait du nom de la fiche principale, réattacher les avis de dup vers primary['nom']
            if dup['nom'] != primary['nom'] and dup_avis_count > 0:
                dup_avis_items = [a for a in avis if a.get('fiche_nom') == dup['nom']]
                for a in dup_avis_items:
                    avis_to_update.append((a['id'], primary['nom']))
                    
            fiches_to_delete.append(dup['id'])

    print(f"\nRésumé : {len(fiches_to_delete)} fiches doublons à supprimer, {len(avis_to_update)} avis à réattacher.")

    if not dry_run:
        print("\nExécution des modifications Supabase...")
        
        # 1. Réattacher les avis
        for a_id, new_nom in avis_to_update:
            sb_patch("avis", a_id, {"fiche_nom": new_nom})
        print(f"✓ {len(avis_to_update)} avis réattachés.")

        # 2. Supprimer les fiches doublons
        deleted_count = 0
        for f_id in fiches_to_delete:
            try:
                sb_delete("fiches", f_id)
                deleted_count += 1
            except Exception as e:
                print(f"❌ Erreur suppression fiche {f_id}: {e}")
        print(f"✓ {deleted_count} fiches doublons supprimées de Supabase.")
        print("\n🎉 Nettoyage terminé avec succès !")

if __name__ == "__main__":
    main()
