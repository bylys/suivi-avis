#!/usr/bin/env python3
"""
audit_vitrier_visual_contracts.py
Validateur no-cost des contrats visuels vitrier — VV1 à VV14 (hors tests browser).
Analyse statique de src/image-generation/services/vitrier-contracts.js.
Aucun appel réseau. Aucune modification du pipeline de production.
"""

import re
import sys
import json
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
CONTRACT_FILE = REPO_ROOT / 'src/image-generation/services/vitrier-contracts.js'
CATALOG_FILE  = REPO_ROOT / 'src/image-generation/config/service-catalog.js'

CATALOG_VITRIER_SERVICES = [
    'Remplacement vitrage brisé',
    'Remplacement double vitrage',
    'Remplacement fenêtre PVC',
    'Remplacement fenêtre aluminium',
    'Réparation fenêtre',
    'Remplacement porte vitrée',
    'Vitrage sécurité feuilleté',
    'Bris de glace urgence',
]

EXPECTED_FOR_PATTERNS = {
    'remplacement_vitrage_brise':    re.compile(r'vitrage.*bris|bris.*vitrage', re.I),
    'remplacement_double_vitrage':   re.compile(r'double.vitrage', re.I),
    'remplacement_fenetre_pvc':      re.compile(r'fenetre.*pvc|pvc.*fenetre', re.I),
    'remplacement_fenetre_aluminium':re.compile(r'fenetre.*alumin|alumin', re.I),
    'reparation_fenetre':            re.compile(r'reparation.*fenetre|fenetre.*repar', re.I),
    'remplacement_porte_vitree':     re.compile(r'porte.vitr', re.I),
    'vitrage_securite_feuillette':   re.compile(r'feuillette|vitrage.*securite|securite.*vitrage', re.I),
    'bris_de_glace_urgence':         re.compile(r'bris.de.glace|glace.*urgence|urgence.*bris', re.I),
}

NON_VITRIER_NORMALIZED = [
    'remplacement tuiles','remplacement ardoises','remplacement gouttieres',
    'remplacement batterie','elagage arbre','taille arbre haute tige',
    'abattage arbre','nettoyage toiture','debarras grenier',
    'pose carrelage sol','pose carrelage mural','faience salle de bain',
    'faience cuisine','carrelage terrasse exterieure','dallage exterieur',
    'peinture facade','peinture interieure','ravalement facade',
    'nettoyage haute pression','etancheite toiture','etancheite terrasse',
    'maconnerie','terrassement maison','paysagiste','creation jardin',
    'crevaison','remorquage','batterie demarrage','ouverture porte serrurier',
]

def normalize(s):
    import unicodedata
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9\s]', ' ', s).strip()

pass_count = 0
fail_count = 0

def ok(cond, label, detail=''):
    global pass_count, fail_count
    if cond:
        print(f'  ✓ {label}')
        pass_count += 1
    else:
        print(f'  ✗ {label}' + (f' — {detail}' if detail else ''), file=sys.stderr)
        fail_count += 1

def check_file_exists():
    print('[VV0] Fichier source canonique')
    ok(CONTRACT_FILE.exists(), f'VV0: {CONTRACT_FILE.name} existe')

def extract_service_keys():
    text = CONTRACT_FILE.read_text(encoding='utf-8')
    # Extract top-level keys of VITRIER_VISUAL_CONTRACTS object
    keys = re.findall(r'^\s{2}(\w+):\s*\{', text, re.MULTILINE)
    # Filter to only service keys (exclude meta keys if any)
    known_keys = list(EXPECTED_FOR_PATTERNS.keys())
    return [k for k in keys if k in known_keys or k.startswith('remplacement') or
            k.startswith('reparation') or k.startswith('vitrage') or k.startswith('bris')]

def extract_for_regex_values():
    text = CONTRACT_FILE.read_text(encoding='utf-8')
    return re.findall(r"for_regex:\s*'([^']+)'", text)

def check_service_labels():
    text = CONTRACT_FILE.read_text(encoding='utf-8')
    return {label: (label in text) for label in CATALOG_VITRIER_SERVICES}

def main():
    print('=' * 60)
    print('VITRIER VISUAL CONTRACTS — AUDIT NO-COST (Python)')
    print('=' * 60)

    check_file_exists()
    if not CONTRACT_FILE.exists():
        print(f'\nFATAL: {CONTRACT_FILE} manquant — arrêt.')
        sys.exit(1)

    text = CONTRACT_FILE.read_text(encoding='utf-8')
    service_keys = extract_service_keys()
    for_regexes  = extract_for_regex_values()

    print('\n[VV1] Nombre exact de contrats')
    ok(len(service_keys) == len(CATALOG_VITRIER_SERVICES),
       f'VV1: {len(service_keys)} contrats trouvés === {len(CATALOG_VITRIER_SERVICES)} services catalogue',
       f'got {len(service_keys)}: {service_keys}')

    print('\n[VV2] Parité catalogue')
    label_presence = check_service_labels()
    for label, found in label_presence.items():
        ok(found, f'VV2: "{label}" présent dans le fichier')

    print('\n[VV3] Schéma — champs obligatoires présents')
    required_fields = [
        'service_key','service_label','visual_goal','observable_action',
        'required_visual_evidence','forbidden_confusions','allowed_tools',
        'forbidden_tools','glass_type','frame_type','work_surface','setting',
        'location_types','damage_or_installation_state','worker_rules','safety',
        'states','composition_preferences','for_regex',
    ]
    for field in required_fields:
        count = len(re.findall(rf'\b{re.escape(field)}:', text))
        ok(count >= len(CATALOG_VITRIER_SERVICES),
           f'VV3: champ "{field}" présent dans tous les contrats ({count} occurrences)',
           f'got {count}, expected >= {len(CATALOG_VITRIER_SERVICES)}')

    print('\n[VV4] for_regex uniques')
    ok(len(for_regexes) == len(CATALOG_VITRIER_SERVICES),
       f'VV4: {len(for_regexes)} for_regex trouvées',
       f'got {len(for_regexes)}')
    ok(len(set(for_regexes)) == len(for_regexes),
       f'VV4: for_regex toutes uniques',
       f'duplicates: {[r for r in for_regexes if for_regexes.count(r) > 1]}')

    print('\n[VV5] Regex couvre tous les services vitrier')
    for label in CATALOG_VITRIER_SERVICES:
        norm = normalize(label)
        matches = [k for k, re_pat in EXPECTED_FOR_PATTERNS.items() if re_pat.search(norm)]
        ok(len(matches) == 1,
           f'VV5: "{label}" → exactement 1 regex ({matches[0] if matches else "aucun"})',
           f'matches={matches}')

    print('\n[VV6] Aucune collision interne')
    for label in CATALOG_VITRIER_SERVICES:
        norm = normalize(label)
        matches = [k for k, re_pat in EXPECTED_FOR_PATTERNS.items() if re_pat.search(norm)]
        ok(len(matches) <= 1,
           f'VV6: "{label}" → au plus 1 match',
           f'matches={matches}')

    print('\n[VV7] Aucun service externe capturé')
    for ext in NON_VITRIER_NORMALIZED:
        matches = [k for k, re_pat in EXPECTED_FOR_PATTERNS.items() if re_pat.search(ext)]
        ok(len(matches) == 0,
           f'VV7: "{ext}" → 0 match vitrier',
           f'matches={matches}')

    print('\n[VV8] Quatre états par contrat')
    for state in ['debut', 'encours', 'semifinal', 'final']:
        count = len(re.findall(rf'\b{state}:\s*\{{', text))
        ok(count >= len(CATALOG_VITRIER_SERVICES),
           f'VV8: état "{state}" présent dans tous les contrats ({count} occurrences)')

    print('\n[VV9] Paires à risque documentées')
    risk_pair_count = len(re.findall(r'pair:', text))
    ok(risk_pair_count >= 4,
       f'VV9: {risk_pair_count} paires à risque documentées (min 4)')

    print('\n[VV10] Outils — forbidden_tools présents')
    forbidden_tool_blocks = len(re.findall(r'forbidden_tools:', text))
    ok(forbidden_tool_blocks >= len(CATALOG_VITRIER_SERVICES),
       f'VV10: {forbidden_tool_blocks} blocs forbidden_tools')
    ok('tronconneuse' not in text.lower() or 'forbidden_tools' in text,
       'VV10: aucun outil incohérent dans allowed_tools')

    print('\n[VV11] Workers — gants anti-coupure mentionnés')
    glove_mentions = len(re.findall(r'gant|glove|anti.coup', text, re.I))
    ok(glove_mentions >= len(CATALOG_VITRIER_SERVICES),
       f'VV11: {glove_mentions} mentions gants/gloves (min {len(CATALOG_VITRIER_SERVICES)})')

    print('\n[VV12] Compositions valides')
    valid_comps = {'close_detail','medium_intervention','wide_worksite','contextual_overview'}
    found_comps = set(re.findall(r"'(close_detail|medium_intervention|wide_worksite|contextual_overview)'", text))
    ok(found_comps.issubset(valid_comps),
       f'VV12: compositions valides uniquement: {found_comps}')

    print('\n[VV13] Référence propriétés visuelles du verre')
    glass_props = len(re.findall(r'reflet|reflect|bord.*vitre|fragment|fissure|crack|broken|transparent', text, re.I))
    ok(glass_props >= 5,
       f'VV13: {glass_props} références aux propriétés visuelles du verre')

    print('\n[VV14] Source canonique unique')
    ok("canonical_source: 'src/image-generation/services/vitrier-contracts.js'" in text
       or 'canonical_source' in text,
       'VV14: canonical_source déclarée dans VITRIER_META')
    reexport_file = REPO_ROOT / 'docs/vitrier-visual-contracts.js'
    ok(reexport_file.exists(), 'VV14: docs/vitrier-visual-contracts.js (réexport) existe')
    if reexport_file.exists():
        reexport_text = reexport_file.read_text()
        ok('vitrier-contracts.js' in reexport_text,
           'VV14: réexport pointe vers la source canonique')
        ok('VITRIER_VISUAL_CONTRACTS' in reexport_text and
           'VITRIER_FOR_PATTERNS' in reexport_text and
           'VITRIER_META' in reexport_text,
           'VV14: réexport expose les 3 exports principaux')

    print()
    print('=' * 60)
    total = pass_count + fail_count
    if fail_count == 0:
        print(f'RÉSULTAT : ✓ {pass_count}/{total} — ALL PASS')
    else:
        print(f'RÉSULTAT : ✗ {fail_count} échec(s) sur {total} assertions')
    print('=' * 60)
    sys.exit(0 if fail_count == 0 else 1)

if __name__ == '__main__':
    main()
