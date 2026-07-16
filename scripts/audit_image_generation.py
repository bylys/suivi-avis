#!/usr/bin/env python3
"""
audit_image_generation.py — Phase 7C
Static architecture audit for T87, T88, T95.

T87: No legacy image definitions in app.js
T88: Single modular source in src/image-generation/
T95: Final architecture audit (no cross-domain violations)

Run: python3 scripts/audit_image_generation.py
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# ─── T87: Legacy symbols must not be defined in app.js ───────────────────────
LEGACY_DEFS = [
    'WORK_SCENES',
    'SITE_REALISM',
    'WORKER_SCENE_RULES',
    'PromptBuilder',
    'buildDallePromptV2',
    '_generateImageOnly',
    '_runImageBatch',
    '_generateAllImagesImpl',
    '_generationRunActive',
    '_generatedImages',
    '_imgApiCallCount',
    '_imgVisionCallCount',
    '_fetchWithTimeout',
    '_readResponseOnce',
    '_runLocalTests',
    '_runPipelineParityTests',
]

# Patterns that indicate a *definition* (not a call/reference in a string/comment)
# Match: `function NAME`, `let NAME`, `const NAME`, `var NAME`, `async function NAME`
def _is_definition(line, name):
    stripped = line.split('//')[0].strip()  # remove inline comments
    patterns = [
        rf'\bfunction\s+{re.escape(name)}\b',
        rf'\blet\s+{re.escape(name)}\b',
        rf'\bconst\s+{re.escape(name)}\b',
        rf'\bvar\s+{re.escape(name)}\b',
        rf'\basync\s+function\s+{re.escape(name)}\b',
        rf'^{re.escape(name)}\s*=',
        rf'\b{re.escape(name)}\s*=\s*\[',
        rf'\b{re.escape(name)}\s*=\s*\{{',
    ]
    return any(re.search(p, stripped) for p in patterns)


def audit_t87():
    path = ROOT / 'app.js'
    lines = path.read_text(encoding='utf-8').splitlines()
    violations = []
    for sym in LEGACY_DEFS:
        for i, line in enumerate(lines, 1):
            if sym in line and _is_definition(line, sym):
                violations.append(f'  app.js:{i}: definition of {sym!r}: {line.strip()[:80]}')
    return violations


# ─── T88: Single modular source in src/image-generation/ ─────────────────────
MODULAR_SYMBOLS = [
    'buildDallePromptV2',
    '_buildPresencePlan',
    '_planGlobalBatch',
    '_rebalanceGlobalBatchPlan',
    '_validateCompleteBatchPlan',
    'createImagePipeline',
    'retryFailedImages',
    'createGenerationState',
    'IMAGE_TASK_STATUS',
    'TERMINAL_STATUSES',
]

# Count files that *export* the symbol
EXPORT_RE = re.compile(r'\bexport\b')
IMPORT_RE = re.compile(r'\bimport\b')


def _classify_line(line, sym):
    stripped = line.split('//')[0].strip()
    if not sym in stripped:
        return None
    if re.search(r'\bexport\b.*\b' + re.escape(sym) + r'\b', stripped):
        return 'export'
    if re.search(r'\bimport\b.*\b' + re.escape(sym) + r'\b', stripped):
        return 'import'
    if _is_definition(stripped, sym):
        return 'definition'
    return 'reference'


def audit_t88():
    src = ROOT / 'src' / 'image-generation'
    js_files = [f for f in src.rglob('*.js') if 'debug/' not in str(f).replace('\\', '/')]
    violations = []
    for sym in MODULAR_SYMBOLS:
        definitions = []
        for f in js_files:
            lines = f.read_text(encoding='utf-8').splitlines()
            for i, line in enumerate(lines, 1):
                kind = _classify_line(line, sym)
                if kind == 'definition':
                    definitions.append(f'{f.relative_to(ROOT)}:{i}')
        if len(definitions) > 1:
            violations.append(f'  {sym!r}: {len(definitions)} définitions — {", ".join(definitions)}')
    return violations


# ─── T95: Architecture constraints ───────────────────────────────────────────
def audit_t95():
    violations = []
    src = ROOT / 'src' / 'image-generation'

    # 1. No import of app.js from src/image-generation/
    for f in src.rglob('*.js'):
        text = f.read_text(encoding='utf-8')
        if re.search(r'import.*["\'].*app\.js', text):
            violations.append(f'  {f.relative_to(ROOT)}: imports app.js')

    # Strip string literals and comment content from a line before checking for JS code
    def _strip_strings(line):
        stripped = line.strip()
        # Skip block comment lines
        if stripped.startswith('*') or stripped.startswith('/*') or stripped.startswith('//'):
            return ''
        line = re.sub(r'"[^"\\]*(?:\\.[^"\\]*)*"', '""', line)
        line = re.sub(r"'[^'\\]*(?:\\.[^'\\]*)*'", "''", line)
        return line.split('//')[0]

    # 2. No document.xxx or window.xxx access outside ui/ (index.js allowed for orchestration)
    allowed_dom = src / 'ui'
    for f in src.rglob('*.js'):
        if f.is_relative_to(allowed_dom):
            continue
        if 'debug/' in str(f).replace('\\', '/'):
            continue
        if f.name == 'index.js':
            continue  # index.js is the orchestrator — allowed to touch DOM and window
        text = f.read_text(encoding='utf-8')
        for i, line in enumerate(text.splitlines(), 1):
            stripped = _strip_strings(line)
            if re.search(r'\bdocument\s*[\.\[]', stripped):
                violations.append(f'  {f.relative_to(ROOT)}:{i}: accès document hors ui/')
            if re.search(r'\bwindow\s*[\.\[]', stripped):
                violations.append(f'  {f.relative_to(ROOT)}:{i}: accès window hors index.js et ui/')

    # 3. No direct fetch (global) outside pipeline/http.js
    allowed_http = src / 'pipeline' / 'http.js'
    for f in src.rglob('*.js'):
        if f == allowed_http:
            continue
        if 'debug/' in str(f).replace('\\', '/'):
            continue
        text = f.read_text(encoding='utf-8')
        for i, line in enumerate(text.splitlines(), 1):
            stripped = _strip_strings(line)
            if re.search(r'\bfetch\s*\(', stripped) and 'fetchImpl' not in stripped:
                violations.append(f'  {f.relative_to(ROOT)}:{i}: appel fetch direct hors http.js')

    # 4. buildDallePromptV2 must not appear in publicApi (index.js)
    idx = ROOT / 'src' / 'image-generation' / 'index.js'
    text = idx.read_text(encoding='utf-8')
    lines = text.splitlines()
    in_public_api = False
    for i, line in enumerate(lines, 1):
        if 'publicApi' in line and 'Object.freeze' in line:
            in_public_api = True
        if in_public_api and 'buildDallePromptV2' in line:
            violations.append(f'  index.js:{i}: buildDallePromptV2 dans publicApi')
        if in_public_api and '});' in line:
            in_public_api = False

    # 5. No __IMAGE_MODULAR_API__ assignment in index.js
    for i, line in enumerate(lines, 1):
        if '__IMAGE_MODULAR_API__' in line and ('defineProperty' in line or '=' in line.split('//')[0]):
            violations.append(f'  index.js:{i}: __IMAGE_MODULAR_API__ assigné')

    # 6. No static debug imports in production (non-debug) modules
    for f in src.rglob('*.js'):
        if 'debug/' in str(f).replace('\\', '/'):
            continue
        if f.name == 'index.js':
            continue
        text = f.read_text(encoding='utf-8')
        if re.search(r'import.*debug/', text):
            violations.append(f'  {f.relative_to(ROOT)}: import statique de debug/')

    return violations


# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    all_ok = True

    v87 = audit_t87()
    if v87:
        print(f'T87 FAIL — legacy image definitions in app.js ({len(v87)} violation(s)):')
        for v in v87: print(v)
        all_ok = False
    else:
        print('T87 PASS — no legacy image definitions in app.js')

    v88 = audit_t88()
    if v88:
        print(f'T88 FAIL — duplicate modular definitions ({len(v88)} violation(s)):')
        for v in v88: print(v)
        all_ok = False
    else:
        print('T88 PASS — modular single-source definitions')

    v95 = audit_t95()
    if v95:
        print(f'T95 FAIL — architecture violations ({len(v95)} violation(s)):')
        for v in v95: print(v)
        all_ok = False
    else:
        print('T95 PASS — final architecture audit')

    if all_ok:
        print('\nAudit complet : T87 T88 T95 — 3/3 PASS')
        sys.exit(0)
    else:
        print('\nAudit complet : ÉCHEC — voir violations ci-dessus')
        sys.exit(1)


if __name__ == '__main__':
    main()
