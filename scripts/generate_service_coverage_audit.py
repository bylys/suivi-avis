#!/usr/bin/env python3
"""
generate_service_coverage_audit.py — Phase fix/service-routing-audit
Generates docs/service-coverage-audit.json and docs/service-coverage-audit.md.

Analyses the 172 catalog sub-services and classifies each one according to:
  ROUTED_TO_SPECIFIC_SCENE  — sub-service matches a targeted SITE_REALISM scenario via _for
  PARTIAL_CONTEXTE          — scene found, but only generic fallback (no _for match)
  TOOLS_ONLY                — scene found, SITE_REALISM is flat (tools/details, no scenarios)
  GENERIC_FALLBACK          — no WORK_SCENE found for this service (theoretical)
  UNMATCHED                 — other unhandled case

ROUTED_TO_SPECIFIC_SCENE does NOT mean the service has complete visual quality.
It means only that a targeted SITE_REALISM scenario is selected for this sub-service.

Run: python3 scripts/generate_service_coverage_audit.py
"""

import re
import sys
import json
import unicodedata
import subprocess
from pathlib import Path
from datetime import date

ROOT      = Path(__file__).resolve().parent.parent
SERVICES  = ROOT / 'src' / 'image-generation' / 'services'
CATALOG   = ROOT / 'src' / 'image-generation' / 'config' / 'service-catalog.js'
DOCS_OUT  = ROOT / 'docs'

CATEGORIES = ['ROUTED_TO_SPECIFIC_SCENE', 'PARTIAL_CONTEXTE', 'TOOLS_ONLY', 'GENERIC_FALLBACK', 'UNMATCHED']

CATEGORY_DEFS = {
    'ROUTED_TO_SPECIFIC_SCENE': 'Sub-service matches a targeted SITE_REALISM scenario via a _for regex pattern. Does NOT guarantee visual quality or completeness.',
    'PARTIAL_CONTEXTE':         'WORK_SCENE found, but no _for pattern in SITE_REALISM matches this sub-service. Only the generic fallback scenario (if any) is applied.',
    'TOOLS_ONLY':               'WORK_SCENE found, but SITE_REALISM entry is flat (tools/protections/details only, no scenario-level differentiation).',
    'GENERIC_FALLBACK':         'No WORK_SCENE entry found for this catalog metier key.',
    'UNMATCHED':                'Service could not be classified.',
}

# ─── Known routing fixes — state before this branch ─────────────────────────
# Used to build the "Avant/Après" change table in the report.
BEFORE_FIX = {
    ('depannage_auto', 'Clés enfermées'):          'default_group',
    ('depannage_auto', 'Déverrouillage voiture'):  'default_group',
    ('depannage_auto', 'Enlèvement véhicule'):     'default_group',
    ('élagage',        'Élagage arbre'):           'PARTIAL_CONTEXTE',
    ('élagage',        'Élagage peuplier'):        'PARTIAL_CONTEXTE',
    ('peinture',       'Peinture façade'):         'PARTIAL_CONTEXTE',
}
AFTER_FIX = {
    ('depannage_auto', 'Clés enfermées'):          'ouverture_group',
    ('depannage_auto', 'Déverrouillage voiture'):  'ouverture_group',
    ('depannage_auto', 'Enlèvement véhicule'):     'remorquage_group',
    ('élagage',        'Élagage arbre'):           'ROUTED_TO_SPECIFIC_SCENE',
    ('élagage',        'Élagage peuplier'):        'ROUTED_TO_SPECIFIC_SCENE',
    ('peinture',       'Peinture façade'):         'ROUTED_TO_SPECIFIC_SCENE',
}

# ─── Normalisation (mirrors JS _normalizeStr) ────────────────────────────────

def normalize(s):
    nfd = unicodedata.normalize('NFD', (s or '').lower())
    return ''.join(c for c in nfd if unicodedata.category(c) != 'Mn')


# ─── Parse service-catalog.js ────────────────────────────────────────────────

def parse_catalog():
    """Returns { metier_key: [service_label, ...] } from SERVICE_CATALOG."""
    code   = CATALOG.read_text(encoding='utf-8')
    result = {}
    lines  = code.split('\n')

    current_metier   = None
    in_services      = False

    for line in lines:
        # Detect metier key: starts with 2 spaces, key (possibly quoted), colon, brace
        m = re.match(r"  '?([\wéàèùâêîôûëïüçœæÉÀÈÙÂÊÎÔÛËÏÜÇŒÆ_]+)'?\s*:\s*\{", line)
        if m:
            candidate = m.group(1)
            # Only track keys inside SERVICE_CATALOG (after `const SERVICE_CATALOG = {`)
            # Simple heuristic: label: and services: must follow
            current_metier = candidate

        if current_metier and 'services: [' in line:
            in_services = True
            if current_metier not in result:
                result[current_metier] = []

        elif in_services:
            if re.match(r'\s*\],', line) or re.match(r'\s*\]$', line):
                in_services = False
            else:
                # Extract quoted strings from this line
                for entry in re.findall(r"'([^']+)'|\"([^\"]+)\"", line):
                    name = entry[0] or entry[1]
                    # Filter out very short strings or strings with JS syntax chars
                    if len(name) >= 3 and not any(c in name for c in ['{', '}', ':', '/']):
                        result[current_metier].append(name)

    return result


# ─── Parse WORK_SCENES keys from all service files ───────────────────────────

def parse_work_scenes_keys():
    """Returns set of all WORK_SCENES top-level keys across all service files."""
    keys = set()
    for f in SERVICES.glob('*.js'):
        if f.name == 'index.js':
            continue
        code  = f.read_text(encoding='utf-8')
        lines = code.split('\n')
        in_ws = False
        depth = 0
        for line in lines:
            if re.search(r'export const WORK_SCENES_\w+\s*=\s*\{', line):
                in_ws = True
                depth = 1
                continue
            if in_ws:
                # Check BEFORE updating depth: depth==1 means we are at top-level WORK_SCENES entries
                if depth == 1:
                    m = re.match(r"  '?([\wéàèùâêîôûëïüçœæÉÀÈÙÂÊÎÔÛËÏÜÇŒÆ_]+)'?\s*:\s*\{", line)
                    if m:
                        keys.add(m.group(1))
                depth += line.count('{') - line.count('}')
                if depth <= 0:
                    in_ws = False
    return keys


# ─── Parse SITE_REALISM structure from all service files ────────────────────

def _extract_sr_block(code):
    """
    Extract the SITE_REALISM export block as raw text.
    Returns the substring from 'export const SITE_REALISM_...' to the matching closing '};'.
    """
    m = re.search(r'export const SITE_REALISM_\w+\s*=\s*\{', code)
    if not m:
        return ''
    start = m.end() - 1  # position of the opening '{'
    depth = 0
    for i in range(start, len(code)):
        if code[i] == '{':
            depth += 1
        elif code[i] == '}':
            depth -= 1
            if depth == 0:
                return code[start:i+1]
    return code[start:]


def _extract_scene_blocks(sr_block):
    """
    Given the SITE_REALISM block text, yield (scene_key, scene_text) pairs.
    Each scene_key is the top-level object key. scene_text is the value block.
    """
    # Find all top-level keys: 2 spaces + key (possibly quoted) + colon + space + {
    key_re = re.compile(r"  '?([\wéàèùâêîôûëïüçœæÉÀÈÙÂÊÎÔÛËÏÜÇŒÆ_]+)'?\s*:\s*\{")
    pos = 0
    matches = list(key_re.finditer(sr_block))
    for idx, m in enumerate(matches):
        key      = m.group(1)
        brace_start = m.end() - 1  # the opening {
        depth    = 0
        end      = brace_start
        for i in range(brace_start, len(sr_block)):
            if sr_block[i] == '{':
                depth += 1
            elif sr_block[i] == '}':
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
        scene_text = sr_block[brace_start:end]
        yield key, scene_text


def _analyze_scene_block(scene_text):
    """
    Analyse the raw text of a SITE_REALISM scene entry.
    Returns the entry dict.
    """
    entry = {'dispatch': None, 'scenarios': [], 'flat': False, 'has_fallback': False}

    # Dispatch type
    dm = re.search(r"_dispatch:\s*'(\w+)'", scene_text)
    if dm:
        entry['dispatch'] = dm.group(1)

    # Does it have a 'scenarios: [' ?
    has_scenarios_array = bool(re.search(r'\bscenarios\s*:\s*\[', scene_text))

    # Does it have a top-level 'tools: [' without scenarios? → flat
    if not has_scenarios_array and re.search(r'\btools\s*:\s*\[', scene_text):
        entry['flat'] = True

    if has_scenarios_array:
        # Extract all _for patterns (could be in nested dispatch too)
        for_patterns = re.findall(r"_for\s*:\s*'([^']+)'", scene_text)
        for pat in for_patterns:
            entry['scenarios'].append({'_for': pat})

        # Detect fallback: a scenario-like object that has no _for key
        # Heuristic: count opening '{ ' within scenarios blocks vs _for occurrences
        # Simpler: look for a pattern that matches a scenario without _for
        # A fallback scenario is one that opens with `{` but has no '_for' key before next `}`.
        # We'll scan the scenarios array for this.
        scenarios_m = re.search(r'\bscenarios\s*:\s*\[(.*?)\]', scene_text, re.DOTALL)
        if scenarios_m:
            scenarios_block = scenarios_m.group(1)
            # Find each sub-object and check for _for
            scen_re  = re.compile(r'\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}', re.DOTALL)
            for sm in scen_re.finditer(scenarios_block):
                inner = sm.group(1)
                if '_for' not in inner:
                    entry['has_fallback'] = True
                    break

    return entry


def parse_site_realism():
    """
    Returns a dict keyed by scene_key, each value is:
    {
      'dispatch':    'service' | 'contexte' | None,
      'scenarios':   [{'_for': pattern_str}, ...],
      'flat':        bool,
      'has_fallback': bool,
    }
    """
    result = {}
    for f in SERVICES.glob('*.js'):
        if f.name == 'index.js':
            continue
        code     = f.read_text(encoding='utf-8')
        sr_block = _extract_sr_block(code)
        if not sr_block:
            continue
        for scene_key, scene_text in _extract_scene_blocks(sr_block):
            result[scene_key] = _analyze_scene_block(scene_text)
    return result


# ─── Classify one service ────────────────────────────────────────────────────

def classify_service(metier_key, service_label, work_scene_keys, site_realism):
    """
    Returns (category, detail_str)
    """
    svc = normalize(service_label)

    # Step 1: Is the catalog metier key in WORK_SCENES?
    if metier_key not in work_scene_keys:
        return 'GENERIC_FALLBACK', f'WORK_SCENES key "{metier_key}" not found'

    # Step 2: Find SITE_REALISM entry
    if metier_key not in site_realism:
        return 'PARTIAL_CONTEXTE', 'No SITE_REALISM entry for this scene key'

    entry = site_realism[metier_key]

    # Step 3: Handle _dispatch: 'service' (depannage_auto)
    if entry['dispatch'] == 'service':
        # _serviceGroup always returns a valid bucket — treated as ROUTED_TO_SPECIFIC_SCENE
        return 'ROUTED_TO_SPECIFIC_SCENE', '_dispatch=service (bucket always found)'

    # Step 4: Handle _dispatch: 'contexte' (etancheite)
    if entry['dispatch'] == 'contexte':
        # Check if any inner _for patterns match
        for scen in entry['scenarios']:
            if scen.get('_for') and re.search(scen['_for'], svc, re.IGNORECASE):
                return 'ROUTED_TO_SPECIFIC_SCENE', f'_dispatch=contexte, matched _for: {scen["_for"]}'
        # Fallback scenario or not
        if entry['has_fallback']:
            return 'PARTIAL_CONTEXTE', '_dispatch=contexte, no _for match, fallback scenario applied'
        return 'PARTIAL_CONTEXTE', '_dispatch=contexte, no _for match, no fallback'

    # Step 5: Flat entry (tools/protections/details, no scenarios)
    if entry['flat'] and not entry['scenarios']:
        return 'TOOLS_ONLY', 'SITE_REALISM is flat (tools/protections/details only)'

    # Step 6: Scenarios-based entry — check _for patterns
    if entry['scenarios']:
        # Check targeted scenarios (_for present)
        for scen in entry['scenarios']:
            if scen.get('_for') and re.search(scen['_for'], svc, re.IGNORECASE):
                return 'ROUTED_TO_SPECIFIC_SCENE', f'matched _for: {scen["_for"]}'
        # No targeted match — check for fallback
        if entry['has_fallback']:
            return 'PARTIAL_CONTEXTE', 'no _for match, fallback scenario applied'
        return 'PARTIAL_CONTEXTE', 'no _for match, no fallback scenario'

    # No scenarios and not flat
    return 'PARTIAL_CONTEXTE', 'SITE_REALISM entry exists but has no scenarios or tools'


# ─── Integrity assertions ────────────────────────────────────────────────────

def assert_integrity(services_list):
    """Raises with an error code if any integrity check fails."""
    # Count total
    total = len(services_list)
    if total != 172:
        raise SystemExit(
            f'[SERVICE_COVERAGE_TOTAL_MISMATCH] Expected 172 services, got {total}'
        )

    # No duplicates on (metier_key, service_label)
    seen = set()
    for svc in services_list:
        key = (svc['metier'], svc['service_label'])
        if key in seen:
            raise SystemExit(
                f'[DUPLICATE_SERVICE_KEY] {key}'
            )
        seen.add(key)

    # Every service must have exactly one category
    for svc in services_list:
        if svc['routing_coverage'] not in CATEGORIES:
            raise SystemExit(
                f'[UNCATEGORIZED_SERVICE] {svc["metier"]} / {svc["service_label"]}: {svc["routing_coverage"]}'
            )

    # Sum of categories must equal 172
    total_check = sum(1 for svc in services_list if svc['routing_coverage'] in CATEGORIES)
    if total_check != 172:
        raise SystemExit(
            f'[MULTIPLE_PRIMARY_CATEGORIES] Sum mismatch: {total_check} != 172'
        )

    print(f'[INTEGRITY] OK — {total} services, no duplicates, all categorized')


# ─── Get git commit ──────────────────────────────────────────────────────────

def get_git_commit():
    try:
        result = subprocess.run(
            ['git', 'log', '-1', '--format=%H'],
            capture_output=True, text=True, cwd=ROOT
        )
        return result.stdout.strip() or 'unknown'
    except Exception:
        return 'unknown'


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    catalog_raw    = parse_catalog()
    work_scene_keys = parse_work_scenes_keys()
    site_realism   = parse_site_realism()

    # Build flat list of all 172 services
    services_list = []
    for metier_key, service_labels in catalog_raw.items():
        for label in service_labels:
            category, detail = classify_service(metier_key, label, work_scene_keys, site_realism)
            key_pair = (metier_key, label)
            services_list.append({
                'metier':              metier_key,
                'service_label':       label,
                'normalized_service':  normalize(label),
                'routing_coverage':    category,
                'routing_detail':      detail,
                'before_fix':          BEFORE_FIX.get(key_pair),
                'after_fix':           AFTER_FIX.get(key_pair),
            })

    # Integrity checks
    assert_integrity(services_list)

    # Summary
    summary = {cat: 0 for cat in CATEGORIES}
    for svc in services_list:
        summary[svc['routing_coverage']] += 1
    summary['TOTAL'] = 172

    git_commit = get_git_commit()
    generated_at = str(date.today())

    # ── JSON output ──────────────────────────────────────────────────────────
    DOCS_OUT.mkdir(exist_ok=True)
    json_path = DOCS_OUT / 'service-coverage-audit.json'
    json_data = {
        'generated_at':  generated_at,
        'git_commit':    git_commit,
        'methodology':   'Python static analysis — parses service-catalog.js, services/*.js (WORK_SCENES + SITE_REALISM _for patterns). Does not execute JS runtime.',
        'limitations':   'Cannot simulate full runtime dispatch for _dispatch:service buckets. Etancheite nested scenarios approximated via outer _for patterns only.',
        'category_definitions': CATEGORY_DEFS,
        'summary':       summary,
        'services':      services_list,
    }
    json_path.write_text(json.dumps(json_data, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'[JSON] Written: {json_path.relative_to(ROOT)}')

    # ── Markdown output ──────────────────────────────────────────────────────
    md_lines = []
    md_lines.append('# Service Coverage Audit')
    md_lines.append(f'\n_Generated: {generated_at} — Commit: `{git_commit[:12]}`_\n')
    md_lines.append('')
    md_lines.append('## Méthodologie')
    md_lines.append('')
    md_lines.append('Analyse statique Python des fichiers `service-catalog.js` et `services/*.js`.')
    md_lines.append('Pour chaque sous-service du catalogue, le script :')
    md_lines.append('1. Vérifie que la clé métier existe dans `WORK_SCENES` (routage de scène).')
    md_lines.append('2. Cherche dans `SITE_REALISM` si un pattern `_for` correspond au nom normalisé du service.')
    md_lines.append('3. Classe le service dans l\'une des 5 catégories.')
    md_lines.append('')
    md_lines.append('## Limites de l\'audit')
    md_lines.append('')
    md_lines.append('- Le routage `_dispatch:service` (dépannage auto) est marqué ROUTED_TO_SPECIFIC_SCENE')
    md_lines.append('  car un bucket est toujours trouvé — mais le bucket ERRONé avant correction n\'est pas détecté.')
    md_lines.append('- `_dispatch:contexte` (étanchéité) est approximé via les patterns `_for` directs.')
    md_lines.append('- L\'audit ne valide pas la qualité visuelle des scènes, seulement le routage.')
    md_lines.append('')
    md_lines.append('> **ROUTED_TO_SPECIFIC_SCENE** ne signifie pas encore qualité visuelle complète ou validée.')
    md_lines.append('')
    md_lines.append('## Définitions des catégories')
    md_lines.append('')
    for cat, defn in CATEGORY_DEFS.items():
        md_lines.append(f'- **{cat}**: {defn}')
    md_lines.append('')

    # Summary table
    md_lines.append('## Résumé global')
    md_lines.append('')
    md_lines.append('| Catégorie | Nombre |')
    md_lines.append('|-----------|--------|')
    for cat in CATEGORIES:
        md_lines.append(f'| {cat} | {summary[cat]} |')
    md_lines.append(f'| **TOTAL** | **{summary["TOTAL"]}** |')
    md_lines.append('')

    # Per-metier summary
    md_lines.append('## Résumé par métier')
    md_lines.append('')
    metier_order = list(dict.fromkeys(svc['metier'] for svc in services_list))
    for metier in metier_order:
        metier_svcs = [s for s in services_list if s['metier'] == metier]
        cat_counts  = {cat: sum(1 for s in metier_svcs if s['routing_coverage'] == cat) for cat in CATEGORIES}
        routed      = cat_counts.get('ROUTED_TO_SPECIFIC_SCENE', 0)
        total_m     = len(metier_svcs)
        cats_str    = ', '.join(f'{cat}: {n}' for cat, n in cat_counts.items() if n > 0)
        md_lines.append(f'### {metier} ({routed}/{total_m} ROUTED)')
        md_lines.append(f'{cats_str}')
        md_lines.append('')

    # Changes table
    changed = [s for s in services_list if s.get('before_fix')]
    if changed:
        md_lines.append('## Corrections effectuées')
        md_lines.append('')
        md_lines.append('| Métier | Sous-service | Avant | Après |')
        md_lines.append('|--------|--------------|-------|-------|')
        for s in changed:
            md_lines.append(f'| {s["metier"]} | {s["service_label"]} | {s["before_fix"]} | {s["after_fix"] or s["routing_coverage"]} |')
        md_lines.append('')

    # Full list by category
    for cat in CATEGORIES:
        cat_svcs = [s for s in services_list if s['routing_coverage'] == cat]
        if not cat_svcs:
            continue
        md_lines.append(f'## {cat} ({len(cat_svcs)} services)')
        md_lines.append('')
        for s in cat_svcs:
            md_lines.append(f'- **{s["metier"]}** / {s["service_label"]}')
        md_lines.append('')

    # Next priorities
    md_lines.append('## Prochaines priorités')
    md_lines.append('')
    md_lines.append('Les métiers sans scénarios ciblés (TOOLS_ONLY et PARTIAL_CONTEXTE) sont à traiter en priorité :')
    md_lines.append('')
    for cat in ['PARTIAL_CONTEXTE', 'TOOLS_ONLY']:
        cat_svcs = [s for s in services_list if s['routing_coverage'] == cat]
        if cat_svcs:
            by_metier = {}
            for s in cat_svcs:
                by_metier.setdefault(s['metier'], []).append(s['service_label'])
            for metier, svcs in by_metier.items():
                md_lines.append(f'- **{metier}** ({cat}): {", ".join(svcs)}')
    md_lines.append('')

    md_path = DOCS_OUT / 'service-coverage-audit.md'
    md_path.write_text('\n'.join(md_lines), encoding='utf-8')
    print(f'[MD]   Written: {md_path.relative_to(ROOT)}')

    # Console summary
    print(f'\n{"─"*60}')
    print(f'Audit — {generated_at} — commit {git_commit[:12]}')
    print(f'{"─"*60}')
    for cat in CATEGORIES:
        n = summary[cat]
        if n:
            print(f'  {cat:<30} {n:>3}')
    print(f'  {"TOTAL":<30} {summary["TOTAL"]:>3}')
    print(f'{"─"*60}')
    if changed:
        print(f'\nCorrections ({len(changed)} services):')
        for s in changed:
            print(f'  {s["metier"]:20} {s["service_label"]:35} {str(s["before_fix"]):25} → {s["after_fix"] or s["routing_coverage"]}')
    print()


if __name__ == '__main__':
    main()
