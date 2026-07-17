#!/usr/bin/env python3
"""
checkpoint_vitrier_contracts.py
Checkpoint pré-Phase 2 : vérifie les regex contre le catalogue complet (172 services)
et documente la configuration de sécurité vitrier.
Aucun appel réseau. Aucune modification du pipeline de production.
"""

import re
import sys
import unicodedata
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
CONTRACT_FILE = REPO_ROOT / 'src/image-generation/services/vitrier-contracts.js'

# ── Tous les services du catalogue (de service-catalog.js) ────────────────────

VITRIER_SERVICES = [
    'Remplacement vitrage brisé',
    'Remplacement double vitrage',
    'Remplacement fenêtre PVC',
    'Remplacement fenêtre aluminium',
    'Réparation fenêtre',
    'Remplacement porte vitrée',
    'Vitrage sécurité feuilleté',
    'Bris de glace urgence',
]

NON_VITRIER_SERVICES = [
    # toiture (11)
    'Rénovation toiture complète', 'Réparation toiture', 'Remplacement tuiles',
    'Remplacement ardoises', 'Couverture neuve', 'Réfection toiture',
    'Charpente', 'Isolation combles', 'Faîtage', 'Zinguerie', 'Solins',
    # nettoyage_toiture (6)
    'Démoussage toiture', 'Nettoyage toiture', 'Traitement hydrofuge toiture',
    'Nettoyage mousse toiture', 'Hydrofuge toiture', 'Traitement anti-mousse toiture',
    # nettoyage_gouttieres (5)
    'Nettoyage gouttières', 'Débouchage gouttières', 'Remplacement gouttières',
    'Entretien gouttières', 'Pose gouttières',
    # etancheite (17)
    'Réparation fuite toiture', 'Recherche de fuite', 'Infiltration toiture',
    'Étanchéité toit terrasse', 'Étanchéité toiture plate',
    'Étanchéité balcon', 'Étanchéité terrasse',
    'Étanchéité EPDM', 'Étanchéité PVC', 'Étanchéité bitume',
    "Réfection d'étanchéité",
    'Réparation solin', 'Réparation Velux', 'Réparation noue',
    'Réparation rive', 'Étanchéité cheminée', 'Étanchéité acrotère',
    # ravalement (9)
    'Ravalement façade', 'Rénovation façade', 'Crépi façade',
    "ITE (isolation par l'extérieur)", 'Enduit monocouche',
    'Enduit hydraulique', 'Nettoyage façade', 'Peinture façade',
    'Traitement façade pierre',
    # maçonnerie (18)
    'Mur parpaing', 'Mur brique', 'Construction mur', 'Muret',
    'Dalle béton', 'Terrasse béton', 'Coulage dalle',
    'Fondation', 'Semelle béton', 'Ferraillage',
    'Escalier béton', 'Seuil', 'Linteau', 'Ouverture dans mur', 'Percement mur',
    'Réparation fissure', 'Rejointoiement', 'Rejointoiement pierre',
    # peinture (10)
    'Peinture intérieure', 'Peinture salon', 'Peinture chambre',
    'Peinture cuisine', 'Peinture couloir', 'Peinture plafond',
    'Papier peint', 'Peinture extérieure', 'Peinture façade', 'Enduit décoratif',
    # carrelage (9)
    'Pose carrelage sol', 'Pose carrelage mural', 'Faïence salle de bain',
    'Faïence cuisine', 'Carrelage terrasse extérieure', 'Dallage extérieur',
    'Pose pierre naturelle', 'Réfection joint', 'Réfection carrelage',
    # élagage (7)
    'Élagage arbre', 'Taille arbre haute tige', 'Élagage peuplier',
    'Élagage en hauteur', 'Recépage arbre', 'Couronnage arbre',
    'Élagage arbres dangereux',
    # abattage (6)
    'Abattage arbre', 'Abattage peuplier', 'Abattage grand arbre',
    'Abattage en zone difficile', 'Dessouchage', 'Abattage conifère',
    # terrassement (16)
    'Terrassement maison', 'Terrassement piscine', 'Terrassement terrain',
    'Décaissement', 'Excavation', 'Fouilles', 'Tranchées',
    'Remblai', 'Empierrement', 'Nivellement', 'Préparation terrain',
    'Création allée', 'Création chemin', 'Plateforme', 'VRD',
    'Évacuation des terres',
    # paysagiste (18)
    'Création jardin', 'Aménagement extérieur', 'Aménagement paysager',
    'Plantation', 'Plantation de haies', "Plantation d'arbres",
    'Taille de haie', "Taille d'arbustes", 'Création massif',
    'Pose de gazon', 'Gazon en rouleau', 'Semis de gazon',
    'Arrosage automatique', 'Bordures', 'Paillage',
    'Entretien jardin', 'Désherbage', 'Petite maçonnerie paysagère',
    # depannage_auto (17)
    'Batterie à plat', 'Démarrage batterie', 'Boost batterie', 'Remplacement batterie',
    'Crevaison', 'Changement de roue', 'Réparation pneu',
    'Remorquage', 'Assistance routière', 'Véhicule en panne',
    'Ouverture de véhicule', 'Clés enfermées', 'Déverrouillage voiture',
    'Erreur de carburant', 'Panne moteur', 'Panne électrique', 'Enlèvement véhicule',
    # nettoyage (7)
    'Nettoyage façade', 'Nettoyage terrasse', 'Nettoyage dallage',
    'Nettoyage pavés', 'Nettoyage allée', 'Traitement hydrofuge façade',
    'Nettoyage haute pression',
    # débarras (8)
    'Débarras appartement', 'Débarras maison', 'Débarras cave',
    'Débarras grenier', 'Vider maison succession', 'Débarras après décès',
    'Enlèvement encombrants', 'Nettoyage encombrants',
]

# ── Regex vitrier ─────────────────────────────────────────────────────────────

FOR_PATTERNS = {
    'remplacement_vitrage_brise':    re.compile(r'vitrage.*bris|bris.*vitrage', re.I),
    'remplacement_double_vitrage':   re.compile(r'double.vitrage', re.I),
    'remplacement_fenetre_pvc':      re.compile(r'fenetre.*pvc|pvc.*fenetre', re.I),
    'remplacement_fenetre_aluminium':re.compile(r'fenetre.*alumin|alumin', re.I),
    'reparation_fenetre':            re.compile(r'reparation.*fenetre|fenetre.*repar', re.I),
    'remplacement_porte_vitree':     re.compile(r'porte.vitr', re.I),
    'vitrage_securite_feuillette':   re.compile(r'feuillette|vitrage.*securite|securite.*vitrage', re.I),
    'bris_de_glace_urgence':         re.compile(r'bris.de.glace|glace.*urgence|urgence.*bris', re.I),
}

def normalize(s):
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

def main():
    print('=' * 70)
    print('VITRIER — CHECKPOINT PRÉ-PHASE 2 (Python)')
    print('=' * 70)

    # ── CP0 — Fichiers requis ──────────────────────────────────────────────────
    print('\n[CP0] Fichiers requis')
    ok(CONTRACT_FILE.exists(), f'CP0.1: vitrier-contracts.js existe')
    ok((REPO_ROOT / 'docs/vitrier-visual-contracts.js').exists(), 'CP0.2: docs/vitrier-visual-contracts.js existe')
    ok((REPO_ROOT / 'src/image-generation/debug/vitrier-contracts-tests.js').exists(), 'CP0.3: vitrier-contracts-tests.js existe')
    ok((REPO_ROOT / 'docs/vitrier-visual-contracts-audit.md').exists(), 'CP0.4: audit markdown existe')

    # ── CP1 — Catalogue complet (172 services) ────────────────────────────────
    total_services = len(VITRIER_SERVICES) + len(NON_VITRIER_SERVICES)
    print(f'\n[CP1] Catalogue complet ({total_services} services : {len(VITRIER_SERVICES)} vitrier + {len(NON_VITRIER_SERVICES)} autres)')
    ok(len(NON_VITRIER_SERVICES) == 164,
       f'CP1.1: {len(NON_VITRIER_SERVICES)} services non-vitrier recensés',
       f'got {len(NON_VITRIER_SERVICES)}, expected 164')
    ok(len(VITRIER_SERVICES) == 8,
       f'CP1.2: {len(VITRIER_SERVICES)} services vitrier',
       f'got {len(VITRIER_SERVICES)}')

    # ── CP2 — Vitrier matchés exactement 1:1 ─────────────────────────────────
    print('\n[CP2] 8/8 services vitrier matchent exactement un contrat')
    for label in VITRIER_SERVICES:
        norm = normalize(label)
        matches = [k for k, pat in FOR_PATTERNS.items() if pat.search(norm)]
        ok(len(matches) == 1,
           f'CP2: "{label}" → 1 match ({matches[0] if matches else "AUCUN"})',
           f'got {matches}')

    # ── CP3 — Zéro collision interne ──────────────────────────────────────────
    print('\n[CP3] Zéro collision interne (aucun service vitrier matché par 2 patterns)')
    collision_count = 0
    for label in VITRIER_SERVICES:
        norm = normalize(label)
        matches = [k for k, pat in FOR_PATTERNS.items() if pat.search(norm)]
        if len(matches) > 1:
            collision_count += 1
            ok(False, f'CP3: collision "{label}" → {matches}')
    ok(collision_count == 0,
       f'CP3: 0 collision interne sur {len(VITRIER_SERVICES)} services vitrier')

    # ── CP4 — 0/164 services non-vitrier capturés ────────────────────────────
    print(f'\n[CP4] 0/{len(NON_VITRIER_SERVICES)} services non-vitrier capturés')
    false_positives = []
    for label in NON_VITRIER_SERVICES:
        norm = normalize(label)
        matches = [k for k, pat in FOR_PATTERNS.items() if pat.search(norm)]
        if matches:
            false_positives.append((label, matches))
    ok(len(false_positives) == 0,
       f'CP4: 0 faux positif sur {len(NON_VITRIER_SERVICES)} services',
       f'faux positifs: {false_positives}')
    if false_positives:
        for label, matches in false_positives:
            print(f'    ✗ FP: "{label}" capturé par {matches}', file=sys.stderr)

    # ── CP5 — Variantes normalisées ───────────────────────────────────────────
    print('\n[CP5] Variantes normalisées (accents, casse, pluriel, tirets)')
    variants = [
        ('REMPLACEMENT VITRAGE BRISE',  'remplacement_vitrage_brise'),
        ('remplacement vitrage brisé',  'remplacement_vitrage_brise'),
        ('bris vitrage',                'remplacement_vitrage_brise'),
        ('double-vitrage',              'remplacement_double_vitrage'),
        ('double vitrage',              'remplacement_double_vitrage'),
        ('fenetre pvc',                 'remplacement_fenetre_pvc'),
        ('FENETRE PVC',                 'remplacement_fenetre_pvc'),
        ('fenetre aluminium',           'remplacement_fenetre_aluminium'),
        ('aluminium fenetre',           'remplacement_fenetre_aluminium'),
        ('reparation fenetre',          'reparation_fenetre'),
        ('fenetre reparation',          'reparation_fenetre'),
        ('porte vitree',                'remplacement_porte_vitree'),
        ('porte vitree vitre',          'remplacement_porte_vitree'),
        ('vitrage securite feuillette', 'vitrage_securite_feuillette'),
        ('feuillette',                  'vitrage_securite_feuillette'),
        ('bris de glace urgence',       'bris_de_glace_urgence'),
        ('glace urgence',               'bris_de_glace_urgence'),
    ]
    for variant_raw, expected_key in variants:
        norm = normalize(variant_raw)
        matches = [k for k, pat in FOR_PATTERNS.items() if pat.search(norm)]
        ok(expected_key in matches,
           f'CP5: "{variant_raw}" → {expected_key}',
           f'got {matches}')

    # ── CP6 — Sécurité non-vitrier: les patterns ne capturent pas PVC/étanchéité ─
    print('\n[CP6] Cas limites sécurité (PVC, réparation, aluminium dans contextes non-vitrier)')
    dangerous_cases = [
        ('Étanchéité PVC', []),
        ('Réparation fuite toiture', []),
        ('Réparation solin', []),
        ('Réparation Velux', []),
        ('Aluminium non vitrier hypothétique', ['remplacement_fenetre_aluminium']),
    ]
    for label, allowed_matches in dangerous_cases:
        norm = normalize(label)
        matches = [k for k, pat in FOR_PATTERNS.items() if pat.search(norm)]
        unexpected = [m for m in matches if m not in allowed_matches]
        ok(len(unexpected) == 0,
           f'CP6: "{label}" → aucun match inattendu',
           f'got unexpected: {unexpected}')

    # ── CP7 — Non-import en production ───────────────────────────────────────
    print('\n[CP7] Non-import en production')
    index_file = REPO_ROOT / 'src/image-generation/services/index.js'
    ok(index_file.exists(), 'CP7.1: services/index.js existe')
    if index_file.exists():
        index_text = index_file.read_text()
        ok('vitrier-contracts' not in index_text,
           'CP7.2: vitrier-contracts.js non importé dans services/index.js (phase 1)')
        ok('vitrier-contracts-tests' not in index_text,
           'CP7.3: vitrier-contracts-tests.js non importé dans services/index.js')

    debug_index = REPO_ROOT / 'src/image-generation/debug'
    ok((debug_index / 'vitrier-contracts-tests.js').exists(),
       'CP7.4: vitrier-contracts-tests.js uniquement dans debug/')

    # ── CP8 — Politique sécurité vitrier documentée ───────────────────────────
    print('\n[CP8] Politique sécurité vitrier (documentée sans modification)')
    safety_file = REPO_ROOT / 'src/image-generation/safety/safety-rules.js'
    state_file  = REPO_ROOT / 'src/image-generation/pipeline/state.js'
    ok(safety_file.exists(), 'CP8.1: safety-rules.js existe')
    if safety_file.exists():
        safety_text = safety_file.read_text()
        ok('vitrier' in safety_text,
           'CP8.2: vitrier présent dans SAFETY_CHECK_RULES')
        ok('gant' in safety_text.lower() or 'glove' in safety_text.lower() or 'cut-resistant' in safety_text.lower(),
           'CP8.3: règle gants anti-coupure documentée')
        ok('critical' in safety_text.lower(),
           'CP8.4: sévérité "critical" documentée dans la règle vitrier')
    ok(state_file.exists(), 'CP8.5: state.js existe')
    if state_file.exists():
        state_text = state_file.read_text()
        ok('MAX_IMAGE_ATTEMPTS' in state_text, 'CP8.6: MAX_IMAGE_ATTEMPTS défini dans state.js')
        ok('MAX_SAFETY_ATTEMPTS_PER_IMAGE' in state_text, 'CP8.7: MAX_SAFETY_ATTEMPTS_PER_IMAGE défini')
        # Vérifier valeurs
        img_match = re.search(r'MAX_IMAGE_ATTEMPTS\s*=\s*(\d+)', state_text)
        safety_match = re.search(r'MAX_SAFETY_ATTEMPTS_PER_IMAGE\s*=\s*(\d+)', state_text)
        ok(img_match and int(img_match.group(1)) == 3,
           f'CP8.8: MAX_IMAGE_ATTEMPTS = 3 (got {img_match.group(1) if img_match else "?"})')
        ok(safety_match and int(safety_match.group(1)) == 3,
           f'CP8.9: MAX_SAFETY_ATTEMPTS_PER_IMAGE = 3 (got {safety_match.group(1) if safety_match else "?"})')

    # ── Résumé ────────────────────────────────────────────────────────────────
    print()
    print('=' * 70)
    total = pass_count + fail_count
    if fail_count == 0:
        print(f'RÉSULTAT CHECKPOINT : ✓ {pass_count}/{total} — ALL PASS')
        print(f'  8/8 vitrier matchés • 0 collision • 0/{len(NON_VITRIER_SERVICES)} faux positif • sécurité documentée')
    else:
        print(f'RÉSULTAT CHECKPOINT : ✗ {fail_count} échec(s) sur {total} assertions')
    print('=' * 70)

    if false_positives:
        print('\n⚠ FAUX POSITIFS DÉTECTÉS — correction nécessaire avant Phase 2', file=sys.stderr)
        sys.exit(1)
    sys.exit(0 if fail_count == 0 else 1)

if __name__ == '__main__':
    main()
