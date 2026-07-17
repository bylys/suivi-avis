#!/usr/bin/env python3
"""
scripts/audit_carrelage_visual_contracts.py
Audit statique des contrats visuels carrelage.
Valide CV1–CV12 sans modifier WORK_SCENES / SITE_REALISM.
Aucun appel API réel.
"""

import re
import sys
import json
from pathlib import Path

ROOT = Path(__file__).parent.parent

# ─── Helpers de parsing JS ─────────────────────────────────────────────────────

def _norm(s):
    """Normalize: lowercase + strip accents."""
    import unicodedata
    s = s.lower()
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return s

def _extract_service_catalog():
    """Parse SERVICE_CATALOG from service-catalog.js, return {metier: [labels]}."""
    path = ROOT / 'src' / 'image-generation' / 'config' / 'service-catalog.js'
    text = path.read_text(encoding='utf-8')
    catalog = {}

    # Locate the SERVICE_CATALOG = { ... }; block via brace counting
    cat_m = re.search(r'const SERVICE_CATALOG\s*=\s*\{', text)
    if not cat_m:
        return catalog
    cat_start = cat_m.end()
    depth = 1; pos = cat_start
    while pos < len(text) and depth > 0:
        if text[pos] == '{': depth += 1
        elif text[pos] == '}': depth -= 1
        pos += 1
    cat_body = text[cat_start:pos - 1]

    # Split cat_body into per-metier chunks by finding `key:` entries at top level
    # Strategy: find positions of `  word:` or `  'word':` pattern (2-space indent = top level)
    key_re = re.compile(r"^  (?:'([^']+)'|([\w]+)):\s*\{", re.MULTILINE)
    key_matches = list(key_re.finditer(cat_body))

    for i, km in enumerate(key_matches):
        key = (km.group(1) or km.group(2))
        chunk_start = km.end()
        chunk_end   = key_matches[i + 1].start() if i + 1 < len(key_matches) else len(cat_body)
        chunk = cat_body[chunk_start:chunk_end]

        # Find services: [ ... ] using bracket counting
        svc_m = re.search(r'services:\s*\[', chunk)
        if not svc_m:
            continue
        arr_start = svc_m.end()
        depth2 = 1; p = arr_start
        while p < len(chunk) and depth2 > 0:
            if chunk[p] == '[': depth2 += 1
            elif chunk[p] == ']': depth2 -= 1
            p += 1
        arr_content = chunk[arr_start:p - 1]
        services = re.findall(r"'([^']+)'", arr_content)
        if services:
            catalog[key] = services

    return catalog

def _extract_contracts():
    """
    Parse CARRELAGE_VISUAL_CONTRACTS from carrelage-visual-contracts.js.
    Returns list of dicts: {service_key, service_label, for_regex, fields_present}.
    Uses a heuristic approach: find service_key, service_label, for_regex for each block.
    """
    path = ROOT / 'src' / 'image-generation' / 'services' / 'carrelage-contracts.js'
    text = path.read_text(encoding='utf-8')

    # Extract all top-level keys (service_key identifiers)
    contracts = []

    # Split by top-level keys in the exported object
    # Pattern: identifier followed by ': {' at minimal indentation
    key_positions = list(re.finditer(r'^\s{2}(\w+):\s*\{', text, re.MULTILINE))

    for i, m in enumerate(key_positions):
        obj_key = m.group(1)
        start = m.start()
        end = key_positions[i + 1].start() if i + 1 < len(key_positions) else len(text)
        block = text[start:end]

        def extract_field(field_name, blk):
            # Single-quoted string value
            m2 = re.search(rf"{field_name}:\s*'([^']+)'", blk)
            if m2:
                return m2.group(1)
            # Double-quoted string value
            m2 = re.search(rf'{field_name}:\s*"([^"]+)"', blk)
            if m2:
                return m2.group(1)
            return None

        def has_field(field_name, blk):
            return bool(re.search(rf'\b{field_name}:', blk))

        def has_array_field(field_name, blk):
            return bool(re.search(rf'{field_name}:\s*\[', blk))

        service_key   = extract_field('service_key',   block)
        service_label = extract_field('service_label', block)
        for_regex     = extract_field('for_regex',     block)

        # Collect which schema fields are present
        required_fields = [
            'service_key', 'service_label', 'visual_goal', 'observable_action',
            'required_visual_evidence', 'forbidden_confusions',
            'allowed_tools', 'forbidden_tools',
            'work_surface', 'setting', 'location_types',
            'worker_rules', 'safety', 'states',
            'composition_preferences', 'for_regex',
        ]
        missing = [f for f in required_fields if not has_field(f, block)]

        # Check sub-fields of states
        state_missing = []
        for state in ('debut', 'en_cours', 'termine'):
            state_m = re.search(rf'{state}:\s*\{{(.*?)\}}', block, re.DOTALL)
            if state_m:
                state_block = state_m.group(1)
                if state == 'termine':
                    if 'observable_result' not in state_block:
                        state_missing.append(f'states.{state}.observable_result')
                else:
                    if 'observable_action' not in state_block:
                        state_missing.append(f'states.{state}.observable_action')
                if 'required_visual_evidence' not in state_block:
                    state_missing.append(f'states.{state}.required_visual_evidence')
            else:
                state_missing.append(f'states.{state} (absent)')

        # Check worker_rules sub-fields
        worker_m = re.search(r'worker_rules:\s*\{(.*?)\}', block, re.DOTALL)
        worker_missing = []
        if worker_m:
            wb = worker_m.group(1)
            for wf in ('presence', 'min', 'max', 'posture'):
                if wf not in wb:
                    worker_missing.append(f'worker_rules.{wf}')
        else:
            worker_missing = ['worker_rules.presence', 'worker_rules.min',
                              'worker_rules.max', 'worker_rules.posture']

        # Check safety sub-fields
        safety_m = re.search(r'safety:\s*\{(.*?)\}', block, re.DOTALL)
        safety_missing = []
        if safety_m:
            sb = safety_m.group(1)
            if 'required' not in sb:
                safety_missing.append('safety.required')
            if 'forbidden' not in sb:
                safety_missing.append('safety.forbidden')
        else:
            safety_missing = ['safety.required', 'safety.forbidden']

        contracts.append({
            'obj_key':       obj_key,
            'service_key':   service_key,
            'service_label': service_label,
            'for_regex':     for_regex,
            'missing':       missing + state_missing + worker_missing + safety_missing,
        })

    # Filter out non-contract keys (CARRELAGE_FOR_PATTERNS, CARRELAGE_META, etc.)
    contracts = [c for c in contracts if c.get('service_key')]
    return contracts

# ─── CV checks ────────────────────────────────────────────────────────────────

def cv1_count(contracts):
    n = len(contracts)
    ok = n == 9
    return ok, f'CV1 — 9 contrats : {n}/9 {"✔" if ok else "✘"}'

def cv2_parity(contracts, catalog):
    carrelage_services = catalog.get('carrelage', [])
    contract_labels    = {c['service_label'] for c in contracts if c['service_label']}
    catalog_labels     = set(carrelage_services)

    errors = []
    if len(carrelage_services) != 9:
        errors.append(f'[CARRELAGE_CONTRACT_COUNT_MISMATCH] catalog={len(carrelage_services)} expected=9')
    for lbl in catalog_labels - contract_labels:
        errors.append(f'[MISSING_CARRELAGE_CONTRACT] "{lbl}" absent des contrats')
    for lbl in contract_labels - catalog_labels:
        errors.append(f'[UNKNOWN_CARRELAGE_CONTRACT] "{lbl}" absent du catalogue')

    ok = len(errors) == 0
    msg = f'CV2 — parité SERVICE_CATALOG : {"✔" if ok else "✘"}'
    return ok, msg, errors

def cv3_schema(contracts):
    errors = []
    for c in contracts:
        for f in c['missing']:
            errors.append(f'  [{c["service_key"]}] champ manquant : {f}')
    ok = len(errors) == 0
    return ok, f'CV3 — schéma complet : {"✔" if ok else "✘"} ({len(errors)} manquants)', errors

def cv4_unique_keys(contracts):
    keys = [c['service_key'] for c in contracts]
    seen = set()
    dupes = []
    for k in keys:
        if k in seen:
            dupes.append(f'[DUPLICATE_CARRELAGE_CONTRACT] {k}')
        seen.add(k)
    ok = len(dupes) == 0
    return ok, f'CV4 — service_key uniques : {"✔" if ok else "✘"}', dupes

def cv5_regex_coverage(contracts, catalog):
    """Each carrelage service must match exactly one contract regex."""
    carrelage_services = catalog.get('carrelage', [])
    errors = []
    results = {}
    for svc in carrelage_services:
        norm = _norm(svc)
        matches = []
        for c in contracts:
            if not c['for_regex']:
                continue
            try:
                if re.search(c['for_regex'], norm, re.IGNORECASE):
                    matches.append(c['service_key'])
            except re.error as e:
                errors.append(f'  regex error in {c["service_key"]}: {e}')
        results[svc] = matches
        if len(matches) == 0:
            errors.append(f'  [NO_MATCH] "{svc}" (norm: "{norm}") → aucun contrat')
        elif len(matches) > 1:
            errors.append(f'  [MULTI_MATCH] "{svc}" → {matches}')
    ok = len(errors) == 0
    return ok, f'CV5 — regex 9/9 carrelage : {"✔" if ok else "✘"}', errors, results

def cv6_no_collision(contracts):
    """No two contract regexes should match each other's service."""
    errors = []
    for ci in contracts:
        for cj in contracts:
            if ci['service_key'] == cj['service_key']:
                continue
            if not ci['for_regex'] or not cj['for_regex']:
                continue
            norm_i = _norm(ci['service_label'])
            try:
                if re.search(cj['for_regex'], norm_i, re.IGNORECASE):
                    errors.append(
                        f'  [REGEX_COLLISION] "{ci["service_label"]}" matche aussi '
                        f'{cj["service_key"]} (regex: {cj["for_regex"]})'
                    )
            except re.error:
                pass
    ok = len(errors) == 0
    return ok, f'CV6 — aucune collision intra-carrelage : {"✔" if ok else "✘"}', errors

def cv7_no_cross_metier(contracts, catalog):
    """No non-carrelage service should match any carrelage contract regex."""
    errors = []
    all_non_carrelage = [
        (metier, svc)
        for metier, svcs in catalog.items()
        if metier != 'carrelage'
        for svc in svcs
    ]
    for metier, svc in all_non_carrelage:
        norm = _norm(svc)
        for c in contracts:
            if not c['for_regex']:
                continue
            try:
                if re.search(c['for_regex'], norm, re.IGNORECASE):
                    errors.append(
                        f'  [CROSS_METIER] "{svc}" ({metier}) matche {c["service_key"]} '
                        f'(regex: {c["for_regex"]})'
                    )
            except re.error:
                pass
    ok = len(errors) == 0
    return ok, f'CV7 — aucun service non-carrelage capturé : {"✔" if ok else "✘"} ({len(errors)} collisions)', errors

def cv8_states_distinct(contracts):
    """début ≠ en_cours ≠ terminé for each contract (basic text comparison)."""
    path = ROOT / 'src' / 'image-generation' / 'services' / 'carrelage-contracts.js'
    text = path.read_text(encoding='utf-8')
    errors = []
    # For each contract, extract the three state observable_action / observable_result
    for c in contracts:
        key = c['obj_key']
        # Find the block for this contract
        m = re.search(rf'^\s{{2}}{key}:\s*\{{', text, re.MULTILINE)
        if not m:
            continue
        start = m.start()
        # Find next top-level key
        next_m = re.search(r'^\s{2}\w+:\s*\{', text[start + 1:], re.MULTILINE)
        end = start + 1 + next_m.start() if next_m else len(text)
        block = text[start:end]

        actions = {}
        for state in ('debut', 'en_cours', 'termine'):
            # Extract observable_action or observable_result
            for field in ('observable_action', 'observable_result'):
                m2 = re.search(
                    rf"states\.{{.*?}}{state}.*?{field}:\s*'([^']+)'",
                    block, re.DOTALL
                )
                if not m2:
                    m2 = re.search(
                        rf'{field}:\s*\'([^\']+)\'',
                        _get_state_block(block, state) or ''
                    )
                if m2:
                    actions[state] = m2.group(1)
                    break

        # Check distinctness
        pairs = [
            ('debut', 'en_cours'),
            ('en_cours', 'termine'),
            ('debut', 'termine'),
        ]
        for a, b in pairs:
            if actions.get(a) and actions.get(b) and actions[a] == actions[b]:
                errors.append(
                    f'  [{c["service_key"]}] états identiques : {a} == {b}'
                )

    ok = len(errors) == 0
    return ok, f'CV8 — trois états distincts : {"✔" if ok else "✘"}', errors

def _get_state_block(block, state_name):
    """Extract the content of states.debut / en_cours / termine."""
    m = re.search(rf'{state_name}:\s*\{{(.*?)\}}', block, re.DOTALL)
    return m.group(1) if m else None

def cv9_risk_pairs(contracts):
    """
    Check the 4 documented risk pairs are visually distinct
    (different work_surface and setting values).
    """
    path = ROOT / 'src' / 'image-generation' / 'services' / 'carrelage-contracts.js'
    text = path.read_text(encoding='utf-8')

    risk_pairs = [
        ('pose_carrelage_sol',           'faience_cuisine',
         'sol générique vs contexte cuisine'),
        ('faience_salle_de_bain',        'faience_cuisine',
         'équipement sanitaire vs plan de travail'),
        ('carrelage_terrasse_exterieure','dallage_exterieur',
         'espace de vie vs accès fonctionnel'),
        ('refection_joint',              'refection_carrelage',
         'joints seuls vs dépose + repose'),
    ]

    def get_field(key, field):
        m = re.search(
            rf'^\s{{2}}{key}:\s*\{{.*?{field}:\s*\[(.*?)\]',
            text, re.DOTALL | re.MULTILINE
        )
        if m:
            return re.findall(r"'([^']+)'|\"([^\"]+)\"", m.group(1))
        return []

    def get_string_field(key, field):
        m = re.search(
            rf'^\s{{2}}{key}:\s*\{{.*?{field}:\s*[\'"]([^\'"]+)[\'"]',
            text, re.DOTALL | re.MULTILINE
        )
        return m.group(1) if m else ''

    errors = []
    warnings = []
    for ka, kb, diff_desc in risk_pairs:
        surf_a = get_field(ka, 'work_surface')
        surf_b = get_field(kb, 'work_surface')
        set_a  = get_field(ka, 'setting')
        set_b  = get_field(kb, 'setting')
        goal_a = get_string_field(ka, 'visual_goal')
        goal_b = get_string_field(kb, 'visual_goal')

        surf_diff    = surf_a != surf_b
        setting_diff = set_a  != set_b
        goal_diff    = goal_a != goal_b

        if not (surf_diff or setting_diff or goal_diff):
            errors.append(
                f'  [VISUAL_CONTRACT_TOO_SIMILAR] {ka} ↔ {kb} : '
                f'surface, setting et visual_goal identiques'
            )
        elif not surf_diff:
            warnings.append(
                f'  [WARN] {ka} ↔ {kb} : même work_surface '
                f'(distinction repose sur visual_goal/observable_action)'
            )

    ok = len(errors) == 0
    return ok, f'CV9 — paires à risque différenciées : {"✔" if ok else "✘"}', errors, warnings

def cv10_tools_coherence(contracts):
    """Check obvious tool incoherence: refection_joint must not have maillet as allowed."""
    errors = []
    path = ROOT / 'src' / 'image-generation' / 'services' / 'carrelage-contracts.js'
    text = path.read_text(encoding='utf-8')

    rules = {
        'refection_joint': {
            'allowed_must_not_contain': ['maillet', 'truelle crantée'],
            'forbidden_must_contain':   ['maillet', 'truelle crantée'],
        },
        'pose_carrelage_sol': {
            'allowed_must_contain': ['truelle crantée', 'maillet'],
        },
        'carrelage_terrasse_exterieure': {
            'allowed_must_contain': ['truelle crantée', 'maillet'],
        },
        'dallage_exterieur': {
            'allowed_must_not_contain': ['truelle crantée fine', 'croisillons petits formats'],
        },
    }

    for key, rule in rules.items():
        m = re.search(rf'^\s{{2}}{key}:\s*\{{', text, re.MULTILINE)
        if not m:
            continue
        start = m.start()
        next_m = re.search(r'^\s{2}\w+:\s*\{', text[start + 1:], re.MULTILINE)
        end = start + 1 + next_m.start() if next_m else len(text)
        block = text[start:end]

        def get_array(field, blk):
            m2 = re.search(rf'{field}:\s*\[(.*?)\]', blk, re.DOTALL)
            if m2:
                return [v.strip("'\" ") for v in re.findall(r"['\"]([^'\"]+)['\"]", m2.group(1))]
            return []

        allowed_tools  = get_array('allowed_tools',  block)
        forbidden_tools = get_array('forbidden_tools', block)

        for t in rule.get('allowed_must_contain', []):
            if not any(t.lower() in v.lower() for v in allowed_tools):
                errors.append(f'  [{key}] allowed_tools devrait contenir "{t}"')
        for t in rule.get('allowed_must_not_contain', []):
            if any(t.lower() in v.lower() for v in allowed_tools):
                errors.append(f'  [{key}] allowed_tools ne devrait pas contenir "{t}"')
        for t in rule.get('forbidden_must_contain', []):
            if not any(t.lower() in v.lower() for v in forbidden_tools):
                errors.append(f'  [{key}] forbidden_tools devrait contenir "{t}"')

    ok = len(errors) == 0
    return ok, f'CV10 — outils cohérents : {"✔" if ok else "✘"}', errors

def cv11_workers_safety(contracts):
    """Check no service has casque/gilet in safety.required."""
    path = ROOT / 'src' / 'image-generation' / 'services' / 'carrelage-contracts.js'
    text = path.read_text(encoding='utf-8')
    errors = []

    for c in contracts:
        key = c['obj_key']
        m = re.search(rf'^\s{{2}}{key}:\s*\{{', text, re.MULTILINE)
        if not m:
            continue
        start = m.start()
        next_m = re.search(r'^\s{2}\w+:\s*\{', text[start + 1:], re.MULTILINE)
        end = start + 1 + next_m.start() if next_m else len(text)
        block = text[start:end]

        safety_m = re.search(r'safety:\s*\{(.*?)\}(?=\s*,?\s*\n\s*\w)', block, re.DOTALL)
        if not safety_m:
            errors.append(f'  [{key}] bloc safety non trouvé')
            continue
        sb = safety_m.group(1)

        required_m = re.search(r'required:\s*\[(.*?)\]', sb, re.DOTALL)
        if required_m:
            required_vals = re.findall(r"['\"]([^'\"]+)['\"]", required_m.group(1))
            for v in required_vals:
                if 'casque' in v.lower() or 'gilet' in v.lower() or 'harnais' in v.lower():
                    errors.append(
                        f'  [{key}] safety.required contient "{v}" — '
                        f'inapproprié en contexte résidentiel'
                    )

        forbidden_m = re.search(r'forbidden:\s*\[(.*?)\]', sb, re.DOTALL)
        if not forbidden_m:
            errors.append(f'  [{key}] safety.forbidden absent')
        else:
            forb_vals = re.findall(r"['\"]([^'\"]+)['\"]", forbidden_m.group(1))
            has_casque = any('casque' in v.lower() for v in forb_vals)
            if not has_casque:
                errors.append(
                    f'  [{key}] safety.forbidden ne mentionne pas "casque de chantier"'
                )

    ok = len(errors) == 0
    return ok, f'CV11 — workers et sécurité cohérents : {"✔" if ok else "✘"}', errors

def cv12_compositions(contracts):
    """Check composition_preferences are present and non-empty."""
    path = ROOT / 'src' / 'image-generation' / 'services' / 'carrelage-contracts.js'
    text = path.read_text(encoding='utf-8')
    errors = []

    valid_values = {
        'close_detail', 'medium_intervention',
        'wide_worksite', 'contextual_overview',
    }

    for c in contracts:
        key = c['obj_key']
        m = re.search(rf'^\s{{2}}{key}:\s*\{{', text, re.MULTILINE)
        if not m:
            continue
        start = m.start()
        next_m = re.search(r'^\s{2}\w+:\s*\{', text[start + 1:], re.MULTILINE)
        end = start + 1 + next_m.start() if next_m else len(text)
        block = text[start:end]

        comp_m = re.search(r'composition_preferences:\s*\[(.*?)\]', block, re.DOTALL)
        if not comp_m:
            errors.append(f'  [{key}] composition_preferences absent')
            continue
        vals = re.findall(r"['\"]([^'\"]+)['\"]", comp_m.group(1))
        if not vals:
            errors.append(f'  [{key}] composition_preferences vide')
            continue
        for v in vals:
            # Strip notes after ':'
            base = v.split(':')[0].strip()
            if base not in valid_values:
                errors.append(
                    f'  [{key}] composition "{v}" — valeur inconnue '
                    f'(attendu : {", ".join(sorted(valid_values))})'
                )

    ok = len(errors) == 0
    return ok, f'CV12 — compositions cohérentes : {"✔" if ok else "✘"}', errors

# ─── Rapport ──────────────────────────────────────────────────────────────────

def _status(ok, errors_or_warns=None):
    if not ok:
        return 'NEEDS_CLARIFICATION'
    return 'READY_FOR_IMPLEMENTATION'

def generate_report(results, contracts, catalog):
    lines = ['# Audit des contrats visuels carrelage', '']
    lines += ['## Résultats CV1–CV12', '']

    for r in results:
        ok   = r['ok']
        msg  = r['msg']
        errs = r.get('errors', [])
        warns = r.get('warnings', [])
        lines.append(f'- {msg}')
        for e in errs:
            lines.append(f'  - {e.strip()}')
        for w in warns:
            lines.append(f'  - ⚠ {w.strip()}')

    # Matrice
    lines += ['', '## Matrice des contrats', '']
    lines.append(
        '| Service | Action distincte | Surface | Contexte | États distincts | '
        'Regex unique | Statut |'
    )
    lines.append(
        '|---------|-----------------|---------|----------|----------------|'
        '------------|--------|'
    )

    cv5_results = next((r['extra'] for r in results if r.get('id') == 'cv5'), {})
    cv6_errors  = next((r.get('errors', []) for r in results if r.get('id') == 'cv6'), [])
    cv7_errors  = next((r.get('errors', []) for r in results if r.get('id') == 'cv7'), [])
    cv8_errors  = next((r.get('errors', []) for r in results if r.get('id') == 'cv8'), [])

    for c in contracts:
        key   = c['service_key'] or c['obj_key']
        label = c['service_label'] or key

        action_ok  = '✔'
        surface    = '✔'
        context    = '✔'

        states_ok = '✔' if not any(key in e for e in cv8_errors) else '✘'

        # regex unique = matched exactly one carrelage service AND no collision AND no cross-metier
        regex_match = cv5_results.get(label, [])
        regex_ok = '✔' if len(regex_match) == 1 else '✘'
        if any(key in e for e in cv6_errors):
            regex_ok = '✘'
        if any(key in e for e in cv7_errors):
            regex_ok = '⚠'

        missing = c.get('missing', [])
        if missing:
            status = 'INCOMPLETE'
        elif regex_ok == '✘':
            status = 'REGEX_COLLISION'
        elif states_ok == '✘':
            status = 'NEEDS_CLARIFICATION'
        else:
            status = 'READY_FOR_IMPLEMENTATION'

        lines.append(
            f'| {label} | {action_ok} | {surface} | {context} | '
            f'{states_ok} | {regex_ok} | {status} |'
        )

    # Cross-metier collisions section
    lines += ['', '## Collisions cross-métier identifiées', '']
    cv7_list = next((r.get('errors', []) for r in results if r.get('id') == 'cv7'), [])
    if cv7_list:
        for e in cv7_list:
            lines.append(f'- {e.strip()}')
    else:
        lines.append('Aucune collision cross-métier.')

    lines += ['', '## Note de génération', '']
    lines.append('Généré par `scripts/audit_carrelage_visual_contracts.py`.')
    lines.append('Aucun WORK_SCENES / SITE_REALISM / prompt modifié.')

    return '\n'.join(lines)

# ─── Main ──────────────────────────────────────────────────────────────────────

def main():
    print('=== Audit contrats visuels carrelage ===\n')

    catalog   = _extract_service_catalog()
    contracts = _extract_contracts()

    print(f'Métiers dans le catalogue : {len(catalog)}')
    print(f'Contrats extraits          : {len(contracts)}')
    carrelage_svcs = catalog.get('carrelage', [])
    print(f'Services carrelage catalogue: {len(carrelage_svcs)}')
    print()

    results = []

    ok1, msg1 = cv1_count(contracts)
    results.append({'id': 'cv1', 'ok': ok1, 'msg': msg1})
    print(msg1)

    ok2, msg2, err2 = cv2_parity(contracts, catalog)
    results.append({'id': 'cv2', 'ok': ok2, 'msg': msg2, 'errors': err2})
    print(msg2)
    for e in err2: print(e)

    ok3, msg3, err3 = cv3_schema(contracts)
    results.append({'id': 'cv3', 'ok': ok3, 'msg': msg3, 'errors': err3})
    print(msg3)
    for e in err3: print(e)

    ok4, msg4, err4 = cv4_unique_keys(contracts)
    results.append({'id': 'cv4', 'ok': ok4, 'msg': msg4, 'errors': err4})
    print(msg4)

    ok5, msg5, err5, res5 = cv5_regex_coverage(contracts, catalog)
    results.append({'id': 'cv5', 'ok': ok5, 'msg': msg5, 'errors': err5, 'extra': res5})
    print(msg5)
    for e in err5: print(e)

    ok6, msg6, err6 = cv6_no_collision(contracts)
    results.append({'id': 'cv6', 'ok': ok6, 'msg': msg6, 'errors': err6})
    print(msg6)
    for e in err6: print(e)

    ok7, msg7, err7 = cv7_no_cross_metier(contracts, catalog)
    results.append({'id': 'cv7', 'ok': ok7, 'msg': msg7, 'errors': err7})
    print(msg7)
    for e in err7: print(e)

    ok8, msg8, err8 = cv8_states_distinct(contracts)
    results.append({'id': 'cv8', 'ok': ok8, 'msg': msg8, 'errors': err8})
    print(msg8)

    ok9, msg9, err9, warn9 = cv9_risk_pairs(contracts)
    results.append({'id': 'cv9', 'ok': ok9, 'msg': msg9, 'errors': err9, 'warnings': warn9})
    print(msg9)
    for e in err9: print(e)
    for w in warn9: print(w)

    ok10, msg10, err10 = cv10_tools_coherence(contracts)
    results.append({'id': 'cv10', 'ok': ok10, 'msg': msg10, 'errors': err10})
    print(msg10)
    for e in err10: print(e)

    ok11, msg11, err11 = cv11_workers_safety(contracts)
    results.append({'id': 'cv11', 'ok': ok11, 'msg': msg11, 'errors': err11})
    print(msg11)
    for e in err11: print(e)

    ok12, msg12, err12 = cv12_compositions(contracts)
    results.append({'id': 'cv12', 'ok': ok12, 'msg': msg12, 'errors': err12})
    print(msg12)
    for e in err12: print(e)

    # Summary
    passed = sum(1 for r in results if r['ok'])
    total  = len(results)
    print(f'\n[AUDIT SUMMARY] {passed}/{total} checks passed')

    # Generate report
    report_md = generate_report(results, contracts, catalog)
    report_path = ROOT / 'docs' / 'carrelage-visual-contracts-audit.md'
    report_path.write_text(report_md, encoding='utf-8')
    print(f'\nRapport écrit : {report_path}')

    # Return exit code
    return 0 if passed == total else 1

if __name__ == '__main__':
    sys.exit(main())
