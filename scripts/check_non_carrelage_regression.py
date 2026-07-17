#!/usr/bin/env python3
"""
check_non_carrelage_regression.py

Compares non-carrelage service routing between:
  - Baseline: git show 5378893:docs/service-coverage-audit.json
  - Current:  docs/service-coverage-audit.json

Expected: 163/163 services identical, 0 diffs.
Fields compared: routing_coverage, matched_regex, fallback_used, service_group.
"""

import json
import subprocess
import sys
from pathlib import Path

ROOT      = Path(__file__).resolve().parent.parent
AUDIT_JSON = ROOT / 'docs' / 'service-coverage-audit.json'
BASELINE_COMMIT = '5378893'
COMPARED_FIELDS = ['routing_coverage', 'matched_regex', 'fallback_used', 'service_group']

def load_baseline():
    result = subprocess.run(
        ['git', 'show', f'{BASELINE_COMMIT}:docs/service-coverage-audit.json'],
        capture_output=True, text=True, cwd=ROOT,
    )
    if result.returncode != 0:
        print(f'ERROR: cannot read baseline from {BASELINE_COMMIT}: {result.stderr.strip()}')
        sys.exit(1)
    return json.loads(result.stdout)

def load_current():
    if not AUDIT_JSON.exists():
        print(f'ERROR: {AUDIT_JSON} not found. Run regenerate-audit first.')
        sys.exit(1)
    return json.loads(AUDIT_JSON.read_text())

def index_services(data, exclude_metier='carrelage'):
    """Return {metier|service_label: entry} for all non-excluded metiers."""
    return {
        f"{s['metier']}|{s.get('service_label', s.get('service', ''))}": s
        for s in data.get('services', [])
        if s.get('metier') != exclude_metier
    }

def main():
    print(f'[check_non_carrelage_regression] baseline={BASELINE_COMMIT}')
    baseline = load_baseline()
    current  = load_current()

    base_map = index_services(baseline)
    curr_map = index_services(current)

    print(f'  Baseline non-carrelage: {len(base_map)}')
    print(f'  Current  non-carrelage: {len(curr_map)}')

    if len(base_map) != 163 or len(curr_map) != 163:
        print(f'WARNING: expected 163 in each, got {len(base_map)} / {len(curr_map)}')

    diffs   = []
    missing = []

    for key, bentry in base_map.items():
        centry = curr_map.get(key)
        if centry is None:
            missing.append(key)
            continue
        for field in COMPARED_FIELDS:
            bv = bentry.get(field)
            cv = centry.get(field)
            if bv != cv:
                diffs.append({
                    'service': key,
                    'field':   field,
                    'baseline': bv,
                    'current':  cv,
                })

    extra = [k for k in curr_map if k not in base_map]

    if missing:
        print(f'\n  MISSING in current ({len(missing)}):')
        for k in missing[:10]:
            print(f'    - {k}')

    if extra:
        print(f'\n  NEW in current ({len(extra)}):')
        for k in extra[:10]:
            print(f'    + {k}')

    if diffs:
        print(f'\n  DIFFS ({len(diffs)}):')
        for d in diffs:
            print(f'    {d["service"]} | {d["field"]}:')
            print(f'      baseline = {d["baseline"]}')
            print(f'      current  = {d["current"]}')
    else:
        print(f'\n  ✔ 0 diffs — {len(base_map)}/{len(base_map)} non-carrelage services unchanged')

    total_issues = len(diffs) + len(missing)
    if total_issues == 0:
        print(f'\n[RESULT] PASS — non-carrelage routing is stable (163/163 identical)')
        return 0
    else:
        print(f'\n[RESULT] FAIL — {total_issues} issue(s) found')
        return 1

if __name__ == '__main__':
    sys.exit(main())
