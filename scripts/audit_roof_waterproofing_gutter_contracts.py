#!/usr/bin/env python3
"""
audit_roof_waterproofing_gutter_contracts.py
Automated validation of roof/waterproofing/gutter visual contracts (RTG-C1 to RTG-C12).

Usage:
    python3 scripts/audit_roof_waterproofing_gutter_contracts.py
"""

import json
import os
import re
import sys
import unicodedata

REPO_ROOT = os.path.join(os.path.dirname(__file__), '..')
CONTRACTS_FILE = os.path.join(REPO_ROOT, 'src/image-generation/services/roof-waterproofing-gutter-contracts.js')
AUDIT_JSON = os.path.join(REPO_ROOT, 'docs/service-coverage-audit.json')
SRC_DIR = os.path.join(REPO_ROOT, 'src')

CLUSTER_METIERS = {'toiture', 'nettoyage_toiture', 'nettoyage_gouttieres', 'etancheite'}

# Canonical composition values allowed by RTG-C10
ALLOWED_COMPOSITIONS = {'wide_establishing', 'medium_intervention', 'close_work_detail', 'detail_only'}

# Known field aliases: the contracts use some field names that differ from the spec names.
# The audit maps spec → actual field (or accepts either).
FIELD_ALIASES = {
    'contract_key':    ['service_key', 'contract_key'],
    'visual_signature': ['visual_goal', 'visual_signature'],
    'location_must_have': ['location_types', 'location_must_have'],
    'location_forbidden': ['location_forbidden', 'forbidden_confusions'],
    'worker_rules':    ['worker_rules'],
    'safety_rules':    ['safety', 'safety_rules'],
    'composition':     ['composition_preferences', 'composition'],
    'status':          ['status'],
    'for_regex':       ['for_regex'],
}

VALID_STATUSES = {'READY_FOR_IMPLEMENTATION', 'NEEDS_REVIEW', 'GENERIC_FALLBACK', 'IN_PROGRESS'}

results = []
total_assertions = 0


def normalize(s):
    """Lowercase, strip accents, normalize spaces."""
    s = s.lower().strip()
    nfkd = unicodedata.normalize('NFKD', s)
    s = ''.join(c for c in nfkd if not unicodedata.combining(c))
    s = re.sub(r'\s+', ' ', s)
    return s


def report(check_id, ok, message, detail=''):
    tag = 'PASS' if ok else 'FAIL'
    line = f'[{check_id}] {tag} — {message}'
    if detail:
        line += f'\n         {detail}'
    print(line)
    results.append((check_id, ok, message))


# ─── Parse contracts JS naively ───────────────────────────────────────────────

def parse_contracts(path):
    """
    Naively extract contract objects from the JS file.
    Returns a list of dicts with the fields we can extract as strings/lists.
    Uses a line-by-line heuristic for key fields.
    """
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    contracts = []

    # Find RTG_FOR_PATTERNS block to get regexes
    rtg_patterns = {}
    patterns_match = re.search(
        r'export const RTG_FOR_PATTERNS\s*=\s*\{([^}]+)\}', content, re.DOTALL)
    if patterns_match:
        for m in re.finditer(r'(\w+)\s*:\s*/(.+?)/i', patterns_match.group(1)):
            rtg_patterns[m.group(1)] = m.group(2)

    # Find each contract block by looking for top-level keys inside ROOF_VISUAL_CONTRACTS
    contracts_match = re.search(
        r'export const ROOF_VISUAL_CONTRACTS\s*=\s*\{(.+)\};',
        content, re.DOTALL)
    if not contracts_match:
        return contracts, rtg_patterns

    body = contracts_match.group(1)

    # Split into individual contract blocks by top-level keys
    # Each contract starts with:  key: {
    contract_starts = list(re.finditer(r'\n  (\w+)\s*:\s*\{', body))

    for i, m in enumerate(contract_starts):
        key = m.group(1)
        start = m.start()
        end = contract_starts[i + 1].start() if i + 1 < len(contract_starts) else len(body)
        block = body[start:end]

        contract = {'_key': key, '_raw': block}

        # Extract service_key
        sk = re.search(r"service_key\s*:\s*'([^']+)'", block)
        contract['service_key'] = sk.group(1) if sk else key

        # Extract for_regex
        fr = re.search(r"for_regex\s*:\s*'([^']+)'", block)
        contract['for_regex'] = fr.group(1) if fr else None

        # Extract status
        st = re.search(r"status\s*:\s*'([^']+)'", block)
        contract['status'] = st.group(1) if st else None

        # Extract visual_goal
        vg = re.search(r"visual_goal\s*:\s*'([^']+)'", block)
        contract['visual_goal'] = vg.group(1) if vg else None

        # Extract covers_services list
        cs_match = re.search(r"covers_services\s*:\s*\[([^\]]+)\]", block, re.DOTALL)
        if cs_match:
            contract['covers_services'] = re.findall(r"'([^']+)'", cs_match.group(1))
        else:
            contract['covers_services'] = []

        # Extract composition_preferences list
        cp_match = re.search(r"composition_preferences\s*:\s*\[([^\]]+)\]", block)
        if cp_match:
            contract['composition_preferences'] = re.findall(r"'([^']+)'", cp_match.group(1))
        else:
            contract['composition_preferences'] = []

        # Check presence of key fields (any alias)
        contract['_has_worker_rules'] = bool(re.search(r'worker_rules\s*:', block))
        contract['_has_safety'] = bool(re.search(r'safety\s*:', block) or re.search(r'safety_rules\s*:', block))
        contract['_has_location'] = bool(re.search(r'location_types\s*:|location_must_have\s*:', block))
        contract['_has_location_forbidden'] = bool(
            re.search(r'location_forbidden\s*:', block) or re.search(r'forbidden_confusions\s*:', block))

        # Extract allowed_tools list
        at_match = re.search(r"(?:allowed_tools|tools_required)\s*:\s*\[([^\]]+)\]", block, re.DOTALL)
        if at_match:
            contract['allowed_tools'] = re.findall(r"'([^']+)'", at_match.group(1))
        else:
            contract['allowed_tools'] = []

        # worker_rules min/max
        wr_min = re.search(r'min\s*:\s*(\d+)', block)
        wr_max = re.search(r'max\s*:\s*(\d+)', block)
        contract['worker_rules_min'] = int(wr_min.group(1)) if wr_min else None
        contract['worker_rules_max'] = int(wr_max.group(1)) if wr_max else None

        # safety required items
        safety_match = re.search(r'required\s*:\s*\[([^\]]+)\]', block, re.DOTALL)
        if safety_match:
            contract['safety_required'] = re.findall(r"'([^']+)'", safety_match.group(1))
        else:
            contract['safety_required'] = []

        contracts.append(contract)

    return contracts, rtg_patterns


# ─── Load service catalog ─────────────────────────────────────────────────────

def load_services(path):
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    cluster = [s for s in data['services'] if s['metier'] in CLUSTER_METIERS]
    out_cluster = [s for s in data['services'] if s['metier'] not in CLUSTER_METIERS]
    return cluster, out_cluster


# ─── RTG-C1 ───────────────────────────────────────────────────────────────────

def check_c1(cluster_services):
    global total_assertions
    total_assertions += 1
    count = len(cluster_services)
    ok = (count == 39)
    if ok:
        report('RTG-C1', True, f'39/39 services dans les 4 métiers cluster')
    else:
        metier_counts = {}
        for s in cluster_services:
            metier_counts[s['metier']] = metier_counts.get(s['metier'], 0) + 1
        report('RTG-C1', False, f'{count}/39 services — attendu 39',
               f'Par métier: {metier_counts}')


# ─── RTG-C2 ───────────────────────────────────────────────────────────────────

def check_c2(contracts):
    global total_assertions
    total_assertions += 1
    missing = []
    for c in contracts:
        key = c['service_key']
        # contract_key / service_key
        if not c.get('service_key'):
            missing.append(f'{key}: missing service_key')
        # for_regex
        if not c.get('for_regex'):
            missing.append(f'{key}: missing for_regex')
        # visual_signature / visual_goal
        if not c.get('visual_goal'):
            missing.append(f'{key}: missing visual_goal (visual_signature)')
        # location_must_have / location_types
        if not c.get('_has_location'):
            missing.append(f'{key}: missing location_types (location_must_have)')
        # location_forbidden / forbidden_confusions
        if not c.get('_has_location_forbidden'):
            missing.append(f'{key}: missing location_forbidden / forbidden_confusions')
        # worker_rules
        if not c.get('_has_worker_rules'):
            missing.append(f'{key}: missing worker_rules')
        # safety_rules / safety
        if not c.get('_has_safety'):
            missing.append(f'{key}: missing safety (safety_rules)')
        # composition
        if not c.get('composition_preferences'):
            missing.append(f'{key}: missing composition_preferences (composition)')
        # status
        if not c.get('status'):
            missing.append(f'{key}: missing status')

    n = len(contracts)
    if not missing:
        report('RTG-C2', True, f'{n}/{n} contrats schéma complet')
    else:
        report('RTG-C2', False, f'{n - len(missing)}/{n} contrats schéma complet',
               '\n         '.join(missing[:10]))


# ─── RTG-C3 ───────────────────────────────────────────────────────────────────

def check_c3(contracts):
    global total_assertions
    total_assertions += 1
    keys = [c['service_key'] for c in contracts]
    dupes = [k for k in keys if keys.count(k) > 1]
    if not dupes:
        report('RTG-C3', True, f'{len(keys)} clés contract_key uniques')
    else:
        report('RTG-C3', False, f'Doublons de clés détectés: {set(dupes)}')


# ─── RTG-C4 ───────────────────────────────────────────────────────────────────

def check_c4(contracts, cluster_services):
    global total_assertions
    total_assertions += 1
    issues = []
    matched_count = 0
    for svc in cluster_services:
        label_norm = normalize(svc['service_label'])
        matched = []
        for c in contracts:
            if not c.get('for_regex'):
                continue
            pattern = c['for_regex']
            try:
                if re.search(pattern, label_norm, re.IGNORECASE):
                    matched.append(c['service_key'])
            except re.error as e:
                issues.append(f"Regex error in {c['service_key']}: {e}")
        if len(matched) == 0:
            issues.append(f"Service '{svc['service_label']}' ({svc['metier']}) — aucun contrat ne le couvre")
        elif len(matched) > 1:
            issues.append(f"Service '{svc['service_label']}' — collision: {matched}")
        else:
            matched_count += 1

    if not issues:
        report('RTG-C4', True, f'{matched_count}/{len(cluster_services)} services couverts exactement par 1 contrat')
    else:
        report('RTG-C4', False, f'{matched_count}/{len(cluster_services)} services OK',
               '\n         '.join(issues[:15]))


# ─── RTG-C5 ───────────────────────────────────────────────────────────────────

def check_c5(contracts, out_cluster_services):
    global total_assertions
    total_assertions += 1
    contaminations = []
    for svc in out_cluster_services:
        label_norm = normalize(svc['service_label'])
        for c in contracts:
            if not c.get('for_regex'):
                continue
            try:
                if re.search(c['for_regex'], label_norm, re.IGNORECASE):
                    contaminations.append(
                        f"'{svc['service_label']}' ({svc['metier']}) capturé par {c['service_key']}: /{c['for_regex']}/")
            except re.error:
                pass

    if not contaminations:
        report('RTG-C5', True, f'0 collision hors-cluster sur {len(out_cluster_services)} services')
    else:
        report('RTG-C5', False, f'{len(contaminations)} collision(s) hors-cluster',
               '\n         '.join(contaminations[:10]))


# ─── RTG-C6 ───────────────────────────────────────────────────────────────────

def check_c6(contracts):
    global total_assertions
    total_assertions += 1
    statuses = set()
    missing_status = []
    for c in contracts:
        s = c.get('status')
        if s:
            statuses.add(s)
        else:
            missing_status.append(c['service_key'])

    invalid = statuses - VALID_STATUSES
    ok = len(statuses) >= 2 and not invalid and not missing_status

    if ok:
        report('RTG-C6', True, f'{len(statuses)} statuts distincts: {statuses}')
    else:
        detail_parts = []
        if len(statuses) < 2:
            detail_parts.append(f'Seulement {len(statuses)} statut(s) distinct(s): {statuses}')
        if invalid:
            detail_parts.append(f'Statuts invalides: {invalid}')
        if missing_status:
            detail_parts.append(f'Contrats sans statut: {missing_status}')
        report('RTG-C6', False, 'Statuts insuffisants ou invalides', '; '.join(detail_parts))


# ─── RTG-C7 ───────────────────────────────────────────────────────────────────

def check_c7(contracts):
    global total_assertions
    total_assertions += 1
    issues = []
    for c in contracts:
        if c.get('status') == 'READY_FOR_IMPLEMENTATION':
            tools = c.get('allowed_tools', [])
            if not tools:
                issues.append(f"{c['service_key']}: allowed_tools vide (READY_FOR_IMPLEMENTATION)")

    if not issues:
        report('RTG-C7', True, f'Tous les contrats READY_FOR_IMPLEMENTATION ont allowed_tools non vide')
    else:
        report('RTG-C7', False, f'{len(issues)} contrat(s) sans outils',
               '\n         '.join(issues))


# ─── RTG-C8 ───────────────────────────────────────────────────────────────────

def check_c8(contracts):
    global total_assertions
    total_assertions += 1
    issues = []
    for c in contracts:
        if c.get('status') == 'READY_FOR_IMPLEMENTATION':
            if not c.get('_has_worker_rules'):
                issues.append(f"{c['service_key']}: worker_rules manquant")
                continue
            if c.get('worker_rules_min') is None:
                issues.append(f"{c['service_key']}: worker_rules.min (count) manquant")
            if not c.get('safety_required'):
                issues.append(f"{c['service_key']}: safety.required (ppe) vide")

    if not issues:
        report('RTG-C8', True, f'Tous les contrats READY_FOR_IMPLEMENTATION ont worker_rules + safety.required')
    else:
        report('RTG-C8', False, f'{len(issues)} problème(s) RTG-C8',
               '\n         '.join(issues))


# ─── RTG-C9 ───────────────────────────────────────────────────────────────────

RISK_PAIRS = [
    ('demossage_toiture', 'hydrofuge_toiture'),
    ('hydrofuge_toiture', 'antimousse_toiture'),
    ('reparation_fuite_toiture', 'etancheite_toit_terrasse'),
    ('nettoyage_gouttieres', 'debouchage_gouttieres'),
    ('nettoyage_gouttieres', 'remplacement_gouttieres'),
    ('faitage', 'remplacement_tuiles'),
    ('solins', 'reparation_solin_cheminee'),
    ('etancheite_toit_terrasse', 'etancheite_balcon'),
    ('reparation_noue', 'faitage'),
]


def check_c9(contracts):
    global total_assertions
    total_assertions += 1
    contract_map = {c['service_key']: c for c in contracts}
    issues = []
    checked = 0
    for a_key, b_key in RISK_PAIRS:
        a = contract_map.get(a_key)
        b = contract_map.get(b_key)
        if not a:
            issues.append(f"Contrat '{a_key}' introuvable")
            continue
        if not b:
            issues.append(f"Contrat '{b_key}' introuvable")
            continue
        # Check visual_goal differs
        vg_a = (a.get('visual_goal') or '').strip()
        vg_b = (b.get('visual_goal') or '').strip()
        if vg_a == vg_b and vg_a:
            issues.append(f"Paire {a_key}/{b_key}: visual_goal identique")
        checked += 1

    if not issues:
        report('RTG-C9', True, f'{checked} paires à risque différenciées')
    else:
        report('RTG-C9', False, f'{len(issues)} problème(s) de paires à risque',
               '\n         '.join(issues))


# ─── RTG-C10 ──────────────────────────────────────────────────────────────────

def check_c10(contracts):
    global total_assertions
    total_assertions += 1
    issues = []
    for c in contracts:
        for comp in c.get('composition_preferences', []):
            if comp not in ALLOWED_COMPOSITIONS:
                issues.append(f"{c['service_key']}: composition '{comp}' hors liste autorisée")

    if not issues:
        report('RTG-C10', True, f'Toutes les compositions dans {ALLOWED_COMPOSITIONS}')
    else:
        report('RTG-C10', False, f'{len(issues)} composition(s) invalide(s)',
               '\n         '.join(issues[:10]))


# ─── RTG-C11 ──────────────────────────────────────────────────────────────────

def check_c11():
    global total_assertions
    total_assertions += 1
    contracts_filename = 'roof-waterproofing-gutter-contracts.js'
    importing_files = []

    for root, dirs, files in os.walk(SRC_DIR):
        # Exclude debug subdirectories
        dirs[:] = [d for d in dirs if d != 'debug']
        for fname in files:
            if fname.endswith('.js') and fname != contracts_filename:
                fpath = os.path.join(root, fname)
                try:
                    with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    if contracts_filename in content and 'import' in content:
                        importing_files.append(os.path.relpath(fpath, REPO_ROOT))
                except Exception:
                    pass

    if not importing_files:
        report('RTG-C11', True, f'{contracts_filename} non importé dans les fichiers runtime (src/, hors debug/)')
    else:
        report('RTG-C11', False, f'{contracts_filename} importé par des fichiers runtime',
               '\n         '.join(importing_files))


# ─── RTG-C12 ──────────────────────────────────────────────────────────────────

def check_c12():
    global total_assertions
    total_assertions += 1
    target_name = 'roof-waterproofing-gutter-contracts.js'
    duplicates = []

    # Search for any other file defining toiture/gouttières contracts
    keywords = ['etancheite_toit_terrasse', 'nettoyage_gouttieres', 'renovation_toiture',
                'remplacement_gouttieres', 'debouchage_gouttieres']

    for root, dirs, files in os.walk(os.path.join(REPO_ROOT, 'src')):
        # Exclude debug directory — test/debug files are expected to reference contract names
        dirs[:] = [d for d in dirs if d != 'debug']
        for fname in files:
            if fname.endswith('.js') and fname != target_name:
                fpath = os.path.join(root, fname)
                try:
                    with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    matches = [kw for kw in keywords if kw in content]
                    if len(matches) >= 3:
                        duplicates.append(
                            f"{os.path.relpath(fpath, REPO_ROOT)} (contient: {matches})")
                except Exception:
                    pass

    if not duplicates:
        report('RTG-C12', True, f'Source canonique unique: {target_name}')
    else:
        report('RTG-C12', False, f'Définitions dupliquées détectées',
               '\n         '.join(duplicates))


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    print('=' * 70)
    print('Audit RTG — Contrats visuels toiture/étanchéité/gouttières')
    print('=' * 70)

    # Load data
    contracts, rtg_patterns = parse_contracts(CONTRACTS_FILE)
    cluster_services, out_cluster_services = load_services(AUDIT_JSON)

    print(f'\nContrats chargés : {len(contracts)}')
    print(f'Services cluster : {len(cluster_services)} (attendu 39)')
    print(f'Services hors-cluster : {len(out_cluster_services)}')
    print()

    # Run checks
    check_c1(cluster_services)
    check_c2(contracts)
    check_c3(contracts)
    check_c4(contracts, cluster_services)
    check_c5(contracts, out_cluster_services)
    check_c6(contracts)
    check_c7(contracts)
    check_c8(contracts)
    check_c9(contracts)
    check_c10(contracts)
    check_c11()
    check_c12()

    # Summary
    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    print()
    print('=' * 70)
    if passed == total:
        print(f'[RESULT] PASS — {passed}/{total} ({total_assertions} assertions)')
    else:
        failed = [(cid, msg) for cid, ok, msg in results if not ok]
        print(f'[RESULT] FAIL — {passed}/{total} ({total_assertions} assertions)')
        print('\nÉchecs :')
        for cid, msg in failed:
            print(f'  {cid}: {msg}')
    print('=' * 70)

    return 0 if passed == total else 1


if __name__ == '__main__':
    sys.exit(main())
