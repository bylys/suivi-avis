#!/usr/bin/env python3
"""
audit_roof_waterproofing_gutter_contracts.py
Automated validation of roof/waterproofing/gutter visual contracts (RTG-C1 to RTG-C12 + RTG-AM1 to RTG-AM7).

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
COMPOSITIONS_FILE = os.path.join(REPO_ROOT, 'src/image-generation/config/compositions.js')
AUDIT_JSON = os.path.join(REPO_ROOT, 'docs/service-coverage-audit.json')
SRC_DIR = os.path.join(REPO_ROOT, 'src')

CLUSTER_METIERS = {'toiture', 'nettoyage_toiture', 'nettoyage_gouttieres', 'etancheite'}

# Documentary alias → runtime key (mirrors ROOF_CONTRACT_COMPOSITION_MAP in the JS file)
ROOF_CONTRACT_COMPOSITION_MAP = {
    'close_work_detail':   'close_detail',
    'wide_establishing':   'wide_worksite',
    'medium_intervention': 'medium_intervention',
    'detail_only':         'close_detail',
}

VALID_STATUSES = {'READY_FOR_IMPLEMENTATION', 'NEEDS_REVIEW', 'GENERIC_FALLBACK', 'IN_PROGRESS'}
VISUAL_STATES = ('debut', 'encours', 'semifinal', 'final')

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


# ─── Parse runtime compositions registry ──────────────────────────────────────

def parse_runtime_compositions(path):
    """
    Extract the PHOTO_COMPOSITIONS keys from compositions.js.
    Returns a set of runtime key names.
    """
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find PHOTO_COMPOSITIONS block
    match = re.search(r'const PHOTO_COMPOSITIONS\s*=\s*\{([^;]+?)\};', content, re.DOTALL)
    if not match:
        return set()

    body = match.group(1)
    keys = re.findall(r'^\s{2}(\w+)\s*:', body, re.MULTILINE)
    return set(keys)


# ─── Parse contracts JS naively ───────────────────────────────────────────────

def _extract_states_block(block):
    """
    Extract the contents of the states: { ... } block from a contract block.
    Uses bracket counting to handle nested structures.
    Returns the raw string inside { ... } or None.
    """
    m = re.search(r'\bstates\s*:\s*\{', block)
    if not m:
        return None
    start = m.end()  # position just after the opening {
    depth = 1
    i = start
    while i < len(block) and depth > 0:
        if block[i] == '{':
            depth += 1
        elif block[i] == '}':
            depth -= 1
        i += 1
    if depth != 0:
        return None
    return block[start:i - 1]  # contents between the outer { ... }


def _extract_state(state_name, states_block):
    """
    Extract a single state dict (observable_action + required_visual_evidence)
    from the states block.
    """
    pattern = rf'\b{state_name}\s*:\s*\{{'
    m = re.search(pattern, states_block)
    if not m:
        return None
    start = m.end()
    depth = 1
    i = start
    while i < len(states_block) and depth > 0:
        if states_block[i] == '{':
            depth += 1
        elif states_block[i] == '}':
            depth -= 1
        i += 1
    if depth != 0:
        return None
    state_block = states_block[start:i - 1]

    # The `final` state may use `observable_result` instead of `observable_action`
    oa_m = re.search(r"observable_action\s*:\s*'([^']*)'", state_block)
    or_m = re.search(r"observable_result\s*:\s*'([^']*)'", state_block)
    observable_action = (
        oa_m.group(1).strip() if oa_m
        else or_m.group(1).strip() if or_m
        else ''
    )

    rve_m = re.search(r'required_visual_evidence\s*:\s*\[([^\]]*)\]', state_block, re.DOTALL)
    if rve_m:
        required_visual_evidence = re.findall(r"'([^']+)'", rve_m.group(1))
    else:
        required_visual_evidence = []

    return {
        'observable_action': observable_action,
        'required_visual_evidence': required_visual_evidence,
    }


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

        # Parse visual states
        states_block = _extract_states_block(block)
        if states_block is not None:
            states = {}
            for state_name in VISUAL_STATES:
                state_data = _extract_state(state_name, states_block)
                if state_data is not None:
                    states[state_name] = state_data
            contract['states'] = states
        else:
            contract['states'] = {}

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


# ─── RTG-C6 — Visual states (debut / encours / semifinal / final) ─────────────

def check_c6(contracts):
    """
    Verify that every contract has all 4 visual states, that each state is
    non-empty, and that no two states within the same contract are identical
    on observable_action + required_visual_evidence.

    Error tags: [MISSING_VISUAL_STATE]  [EMPTY_VISUAL_STATE]  [DUPLICATE_VISUAL_STATE]
    """
    global total_assertions

    expected_states = list(VISUAL_STATES)
    n_contracts = len(contracts)
    n_pairs = len(expected_states) * (len(expected_states) - 1) // 2  # C(4,2) = 6

    # presence: 20×4, non-empty: 20×4, distinct pairs: 20×6
    assertion_count = n_contracts * len(expected_states) * 2 + n_contracts * n_pairs

    issues_missing  = []
    issues_empty    = []
    issues_dupe     = []

    for c in contracts:
        key = c['service_key']
        states = c.get('states', {})

        # 1. All 4 states present
        for sname in expected_states:
            total_assertions += 1
            if sname not in states:
                issues_missing.append(f'[MISSING_VISUAL_STATE] {key}: état manquant "{sname}"')

        # 2. Each present state is non-empty
        for sname in expected_states:
            total_assertions += 1
            if sname in states:
                s = states[sname]
                if not s.get('observable_action'):
                    issues_empty.append(f'[EMPTY_VISUAL_STATE] {key}.{sname}: observable_action vide')
                if not s.get('required_visual_evidence'):
                    issues_empty.append(f'[EMPTY_VISUAL_STATE] {key}.{sname}: required_visual_evidence vide')

        # 3. No two states are identical (observable_action + required_visual_evidence)
        state_names = [sn for sn in expected_states if sn in states]
        for idx_a in range(len(state_names)):
            for idx_b in range(idx_a + 1, len(state_names)):
                total_assertions += 1
                sn_a = state_names[idx_a]
                sn_b = state_names[idx_b]
                sa = states[sn_a]
                sb = states[sn_b]
                if (sa.get('observable_action') == sb.get('observable_action') and
                        sa.get('required_visual_evidence') == sb.get('required_visual_evidence')):
                    issues_dupe.append(
                        f'[DUPLICATE_VISUAL_STATE] {key}: états "{sn_a}" et "{sn_b}" identiques')

    all_issues = issues_missing + issues_empty + issues_dupe
    ok = len(all_issues) == 0

    if ok:
        contracts_ok = sum(
            1 for c in contracts
            if set(c.get('states', {}).keys()) == set(expected_states)
        )
        report('RTG-C6', True,
               f'{contracts_ok}/{n_contracts} contrats — 4 états visuels distincts et non vides '
               f'({total_assertions} assertions)')
    else:
        report('RTG-C6', False,
               f'{len(all_issues)} problème(s) d\'états visuels',
               '\n         '.join(all_issues[:15]))


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


# ─── RTG-C10 — Canonical compositions via real registry ──────────────────────

def check_c10(contracts, runtime_keys):
    """
    Each composition_preferences entry must:
    1. Be a known documentary alias in ROOF_CONTRACT_COMPOSITION_MAP, OR a direct runtime key.
    2. Resolve (via the map) to a runtime key that exists in PHOTO_COMPOSITIONS.

    Error tags: [UNKNOWN_COMPOSITION_ALIAS]  [UNRESOLVABLE_COMPOSITION]
    """
    global total_assertions
    issues = []
    assertion_count = 0

    for c in contracts:
        for alias in c.get('composition_preferences', []):
            assertion_count += 1
            total_assertions += 1

            # Step 1: resolve alias → runtime key
            if alias in ROOF_CONTRACT_COMPOSITION_MAP:
                runtime_key = ROOF_CONTRACT_COMPOSITION_MAP[alias]
            elif alias in runtime_keys:
                # Direct use of runtime key is also acceptable
                runtime_key = alias
            else:
                issues.append(
                    f'[UNKNOWN_COMPOSITION_ALIAS] {c["service_key"]}: '
                    f'alias "{alias}" absent de ROOF_CONTRACT_COMPOSITION_MAP')
                continue

            # Step 2: verify resolved runtime key exists in registry
            if runtime_key not in runtime_keys:
                issues.append(
                    f'[UNRESOLVABLE_COMPOSITION] {c["service_key"]}: '
                    f'alias "{alias}" → "{runtime_key}" absent de PHOTO_COMPOSITIONS')

    if not issues:
        report('RTG-C10', True,
               f'{assertion_count} composition_preferences validées via ROOF_CONTRACT_COMPOSITION_MAP '
               f'→ PHOTO_COMPOSITIONS ({len(runtime_keys)} clés runtime: {sorted(runtime_keys)})')
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


# ─── RTG-AM1 to RTG-AM7 — Anti-mousse specific checks ────────────────────────

# Labels used for regex isolation tests
HYDROFUGE_LABELS = ['Hydrofuge toiture', 'Traitement hydrofuge toiture']
DEMOSSAGE_LABELS = ['Démoussage toiture', 'Nettoyage toiture', 'Nettoyage mousse toiture']
ANTIMOUSSE_PATTERN = re.compile(r'anti.mousse', re.IGNORECASE)


def check_am1(contracts):
    """RTG-AM1: 'Traitement anti-mousse toiture' matches exactly 1 contract: antimousse_toiture."""
    global total_assertions
    total_assertions += 1
    label = 'Traitement anti-mousse toiture'
    label_norm = normalize(label)
    matched = []
    for c in contracts:
        if not c.get('for_regex'):
            continue
        try:
            if re.search(c['for_regex'], label_norm, re.IGNORECASE):
                matched.append(c['service_key'])
        except re.error:
            pass

    ok = (matched == ['antimousse_toiture'])
    if ok:
        report('RTG-AM1', True, f'"{label}" → exactement 1 correspondance: antimousse_toiture')
    else:
        report('RTG-AM1', False,
               f'"{label}" → correspondances inattendues: {matched} (attendu: [antimousse_toiture])')


def check_am2():
    """RTG-AM2: anti-mousse regex does NOT match hydrofuge service labels."""
    global total_assertions
    issues = []
    for label in HYDROFUGE_LABELS:
        total_assertions += 1
        label_norm = normalize(label)
        if ANTIMOUSSE_PATTERN.search(label_norm):
            issues.append(f'[AM2] anti.mousse matche le label hydrofuge "{label}"')

    ok = len(issues) == 0
    if ok:
        report('RTG-AM2', True,
               f'Regex /anti.mousse/ ne capture aucun des {len(HYDROFUGE_LABELS)} labels hydrofuge')
    else:
        report('RTG-AM2', False, f'{len(issues)} collision(s) avec hydrofuge',
               '\n         '.join(issues))


def check_am3():
    """RTG-AM3: anti-mousse regex does NOT match nettoyage/démoussage labels."""
    global total_assertions
    issues = []
    for label in DEMOSSAGE_LABELS:
        total_assertions += 1
        label_norm = normalize(label)
        if ANTIMOUSSE_PATTERN.search(label_norm):
            issues.append(f'[AM3] anti.mousse matche le label démoussage/nettoyage "{label}"')

    ok = len(issues) == 0
    if ok:
        report('RTG-AM3', True,
               f'Regex /anti.mousse/ ne capture aucun des {len(DEMOSSAGE_LABELS)} labels nettoyage/démoussage')
    else:
        report('RTG-AM3', False, f'{len(issues)} collision(s) avec nettoyage/démoussage',
               '\n         '.join(issues))


def check_am4(contracts):
    """
    RTG-AM4: R20 required_visual_evidence (top-level) has no strings identical to
    those in R09 (hydrofuge_toiture) or R08 (demossage_toiture).
    """
    global total_assertions
    contract_map = {c['service_key']: c for c in contracts}

    am = contract_map.get('antimousse_toiture')
    hydrofuge = contract_map.get('hydrofuge_toiture')
    demossage = contract_map.get('demossage_toiture')

    if not am:
        total_assertions += 1
        report('RTG-AM4', False, 'Contrat antimousse_toiture introuvable')
        return
    if not hydrofuge:
        total_assertions += 1
        report('RTG-AM4', False, 'Contrat hydrofuge_toiture introuvable')
        return
    if not demossage:
        total_assertions += 1
        report('RTG-AM4', False, 'Contrat demossage_toiture introuvable')
        return

    # Extract top-level required_visual_evidence from each contract block
    def get_top_rve(c):
        """Extract top-level required_visual_evidence (before the states block)."""
        block = c.get('_raw', '')
        # Find position of states: to limit search to top-level section
        states_pos = block.find('states:')
        top_section = block[:states_pos] if states_pos >= 0 else block
        rve_m = re.search(r'required_visual_evidence\s*:\s*\[([^\]]*)\]', top_section, re.DOTALL)
        if rve_m:
            return set(re.findall(r"'([^']+)'", rve_m.group(1)))
        return set()

    rve_am = get_top_rve(am)
    rve_hydrofuge = get_top_rve(hydrofuge)
    rve_demossage = get_top_rve(demossage)

    total_assertions += 2
    overlaps = []
    inter_h = rve_am & rve_hydrofuge
    inter_d = rve_am & rve_demossage
    if inter_h:
        overlaps.append(f'Intersection avec hydrofuge_toiture: {inter_h}')
    if inter_d:
        overlaps.append(f'Intersection avec demossage_toiture: {inter_d}')

    ok = len(overlaps) == 0
    if ok:
        report('RTG-AM4', True,
               f'R20 required_visual_evidence distinct de R09 hydrofuge et R08 démoussage '
               f'({len(rve_am)} preuves, {len(rve_hydrofuge)} hydrofuge, {len(rve_demossage)} démoussage)')
    else:
        report('RTG-AM4', False, f'{len(overlaps)} chevauchement(s) détecté(s)',
               '\n         '.join(overlaps))


def check_am5(contracts):
    """RTG-AM5: R20 has all 4 visual states and they are distinct."""
    global total_assertions
    contract_map = {c['service_key']: c for c in contracts}
    am = contract_map.get('antimousse_toiture')
    if not am:
        total_assertions += 1
        report('RTG-AM5', False, 'Contrat antimousse_toiture introuvable')
        return

    states = am.get('states', {})
    expected = list(VISUAL_STATES)
    issues = []

    # Check all 4 states present
    for sname in expected:
        total_assertions += 1
        if sname not in states:
            issues.append(f'[MISSING_VISUAL_STATE] antimousse_toiture: état "{sname}" manquant')

    # Check all present states are distinct
    present = [sn for sn in expected if sn in states]
    for idx_a in range(len(present)):
        for idx_b in range(idx_a + 1, len(present)):
            total_assertions += 1
            sa = states[present[idx_a]]
            sb = states[present[idx_b]]
            if (sa.get('observable_action') == sb.get('observable_action') and
                    sa.get('required_visual_evidence') == sb.get('required_visual_evidence')):
                issues.append(
                    f'[DUPLICATE_VISUAL_STATE] antimousse_toiture: "{present[idx_a]}" == "{present[idx_b]}"')

    ok = len(issues) == 0
    if ok:
        report('RTG-AM5', True,
               f'R20 antimousse_toiture: 4/4 états visuels présents et distincts')
    else:
        report('RTG-AM5', False, f'{len(issues)} problème(s) d\'états visuels R20',
               '\n         '.join(issues))


def check_am6(contracts):
    """RTG-AM6: R20 allowed_tools is non-empty."""
    global total_assertions
    total_assertions += 1
    contract_map = {c['service_key']: c for c in contracts}
    am = contract_map.get('antimousse_toiture')
    if not am:
        report('RTG-AM6', False, 'Contrat antimousse_toiture introuvable')
        return

    tools = am.get('allowed_tools', [])
    ok = len(tools) > 0
    if ok:
        report('RTG-AM6', True, f'R20 allowed_tools non vide: {len(tools)} outil(s)')
    else:
        report('RTG-AM6', False, 'R20 antimousse_toiture: allowed_tools vide')


def check_am7(contracts):
    """RTG-AM7: R20 safety.required is non-empty."""
    global total_assertions
    total_assertions += 1
    contract_map = {c['service_key']: c for c in contracts}
    am = contract_map.get('antimousse_toiture')
    if not am:
        report('RTG-AM7', False, 'Contrat antimousse_toiture introuvable')
        return

    ppe = am.get('safety_required', [])
    ok = len(ppe) > 0
    if ok:
        report('RTG-AM7', True, f'R20 safety.required non vide: {len(ppe)} équipement(s)')
    else:
        report('RTG-AM7', False, 'R20 antimousse_toiture: safety.required vide')


# ─── RTG-C13 — Enforce 20/20 READY_FOR_IMPLEMENTATION ────────────────────────

def check_c13(contracts):
    """
    All 20 contracts must have status: 'READY_FOR_IMPLEMENTATION'.
    Fails with [CONTRACT_NOT_READY_FOR_IMPLEMENTATION] if any contract has a different status.
    """
    global total_assertions
    issues = []
    for c in contracts:
        total_assertions += 1
        if c.get('status') != 'READY_FOR_IMPLEMENTATION':
            issues.append(
                f'[CONTRACT_NOT_READY_FOR_IMPLEMENTATION] {c["service_key"]}: '
                f'status="{c.get("status", "absent")}"')

    ok = len(issues) == 0
    n = len(contracts)
    if ok:
        report('RTG-C13', True, f'{n}/{n} contrats READY_FOR_IMPLEMENTATION')
    else:
        ready = n - len(issues)
        report('RTG-C13', False,
               f'{ready}/{n} contrats READY_FOR_IMPLEMENTATION ({len(issues)} non prêt(s))',
               '\n         '.join(issues))


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    print('=' * 70)
    print('Audit RTG — Contrats visuels toiture/étanchéité/gouttières')
    print('=' * 70)

    # Load data
    contracts, rtg_patterns = parse_contracts(CONTRACTS_FILE)
    cluster_services, out_cluster_services = load_services(AUDIT_JSON)
    runtime_keys = parse_runtime_compositions(COMPOSITIONS_FILE)

    print(f'\nContrats chargés : {len(contracts)}')
    print(f'Services cluster : {len(cluster_services)} (attendu 39)')
    print(f'Services hors-cluster : {len(out_cluster_services)}')
    print(f'Clés runtime compositions : {len(runtime_keys)} ({sorted(runtime_keys)})')
    print()

    # Run checks RTG-C1 to RTG-C12
    check_c1(cluster_services)
    check_c2(contracts)
    check_c3(contracts)
    check_c4(contracts, cluster_services)
    check_c5(contracts, out_cluster_services)
    check_c6(contracts)
    check_c7(contracts)
    check_c8(contracts)
    check_c9(contracts)
    check_c10(contracts, runtime_keys)
    check_c11()
    check_c12()

    print()
    print('─── RTG-AM (anti-mousse) ───────────────────────────────────────────')
    print()

    # Run anti-mousse specific checks RTG-AM1 to RTG-AM7
    check_am1(contracts)
    check_am2()
    check_am3()
    check_am4(contracts)
    check_am5(contracts)
    check_am6(contracts)
    check_am7(contracts)

    print()
    print('─── Statut de déploiement ──────────────────────────────────────────')
    print()

    # Enforce 20/20 READY_FOR_IMPLEMENTATION
    check_c13(contracts)

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
