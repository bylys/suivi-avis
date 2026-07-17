/**
 * services/vitrier.js — scènes vitrier (8 sous-services, 4 états chacun).
 * WORK_SCENES clé unique 'vitrier' ; SITE_REALISM clé unique 'vitrier'
 * avec 8 scenarios _for (un par sous-service).
 * Remplace la clé vitrier de finishing.js.
 * Aucune modification des autres métiers.
 */

export const WORK_SCENES_VITRIER = {

  vitrier: {
    category:         'vitrier',
    priority:         3,
    service_keywords: [
      { phrase: 'remplacement vitrage brise',    score: 15 },
      { phrase: 'remplacement double vitrage',   score: 15 },
      { phrase: 'remplacement fenetre pvc',      score: 15 },
      { phrase: 'remplacement fenetre aluminium',score: 15 },
      { phrase: 'reparation fenetre',            score: 15 },
      { phrase: 'remplacement porte vitree',     score: 15 },
      { phrase: 'vitrage securite feuillette',   score: 15 },
      { phrase: 'bris de glace urgence',         score: 15 },
      { phrase: 'remplacement vitre',            score: 13 },
      { phrase: 'vitre cassee',                  score: 13 },
      { phrase: 'double vitrage',                score: 12 },
      { phrase: 'miroiterie',                    score: 11 },
      { phrase: 'vitrerie',                      score: 10 },
      { phrase: 'vitrier',                       score: 10 },
      { phrase: 'vitrine',                       score:  9 },
      { phrase: 'vitr',                          score:  5 },
    ],
    exclude_if: [],
    intro:      'window glazing work at a residential or commercial property — glass handling, frame installation or emergency glazing',
    setting:    'exterior',
    secteur:    'glazier',
    hasWorkers: true,
    camera:     'standing 2–3 m from the window or door, straight-on view at eye level showing the full frame and the work in progress',
    materials:  ['glass pane or IGU unit', 'glazing putty or silicone', 'window spacers', 'suction cup handle', 'protective corner pieces'],
    photo_defects: [
      'glass reflection causing an overexposed bright patch in the frame centre',
      'chromatic aberration on the sharp window frame edge',
    ],
    exclusions: ['safety helmets', 'high-vis vests', 'scaffolding', 'ladders unless explicitly in frame context'],

    states: {
      debut: {
        framing: {
          work_pct:   30,
          foreground: 'old frame or damaged glass still in place — measuring tape or marker visible, protective tarpaulin being rolled out at the window base',
          midground:  'window opening showing the existing frame or bare rough opening, preparation tools staged nearby',
          background: 'house facade or interior wall, natural light from the opening',
        },
        debris:      'dust and small glass chips at the window base if existing pane is cracked — contained within the drop protection',
        description: 'Work just starting. Zone protected. Old glass or frame still in place. Measurements taken. No active glass handling yet.',
      },
      encours: {
        framing: {
          work_pct:   55,
          foreground: 'glass pane or frame unit actively being handled — suction cup on the glass surface, glazier guiding the pane into the opening',
          midground:  'window opening with the new glass or frame in mid-insertion, spacers or shimming blocks visible at frame edges',
          background: 'house facade or interior wall',
        },
        debris:      'packaging removed from the new glass unit, spacer wrappers near the base — drop sheet still in place',
        description: 'Active glass or frame installation. New unit being positioned. Glazier using suction cup. Spacers being placed.',
      },
      semifinal: {
        framing: {
          work_pct:   65,
          foreground: 'glass or frame fully seated in opening — sealant gun being applied along the perimeter, protective tape still on the glass edges',
          midground:  'installed glass or frame, silicone or parclose bead being applied, level check in progress',
          background: 'house facade or interior wall, drop sheet visible at window base',
        },
        debris:      'silicone packaging, empty parclose box, or spacer wrappers near the window base — drop sheet still covering the floor zone',
        description: 'Glass or frame in place. Sealant or glazing bead being applied. Adjustments and final alignment underway.',
      },
      final: {
        framing: {
          work_pct:   70,
          foreground: 'clean finished result — transparent glass, neat sealant or parclose bead, clean frame perimeter',
          midground:  'full window or door view — glass reflecting surroundings cleanly, frame flush and sealed in the wall opening',
          background: 'house facade or interior wall, no construction material in sight',
        },
        debris:      'none — window or door installation complete, protective sheet removed, area clean',
        description: 'Installation complete. Clear transparent glass, neat frame, clean perimeter seal. The specific service type remains identifiable in the result.',
      },
    },
  },

};

export const SITE_REALISM_VITRIER = {

  vitrier: {
    scenarios: [

      // ── 1. Remplacement vitrage brisé ────────────────────────────────────────
      {
        _for:         'vitrage.*bris|bris.*vitrage',
        scene_note:   'single-pane glass replacement in an existing frame — cracked or broken pane being removed and replaced with a new clear single pane. The frame is retained. Residential window, exterior or interior. Broken glass visible in the debut state, new clear pane installed in final.',
        scene_camera: 'standing 2–3 m from the window, straight-on at eye level, showing the full frame and the state of the glass — cracks, missing shards, or the new pane depending on the state',
        setting:      'exterior',
        location_must_have: ['existing window frame retained in wall', 'single pane being replaced'],
        location_forbidden: ['new full frame installation', 'emergency boarding or film — no clean new pane in urgence'],
        tools: [
          'small suction cup handle resting on the windowsill beside the frame',
          'putty knife resting on the windowsill near the old putty line',
          'caulk gun resting on the drop sheet at the window base',
          'glazing bead strip on the floor near the frame base',
          'glass fragment catcher — shallow tray at the window base',
        ],
        protections: [
          'drop sheet on the floor directly below the window to catch glass debris',
          'protective rubber mat on the windowsill to prevent new glass scratching',
          'cut-resistant gloves worn by the glazier at all times',
        ],
        chantier_details: [
          'cracked or broken glass pane still partially in the frame — debut state',
          'old putty flakes and glass chips on the drop sheet at the window base',
          'new single glass pane leaning against the wall nearby, still wrapped or unwrapped',
          'small plastic glazing shim wedge near the base of the installed pane',
          'empty silicone tube beside the caulk gun on the floor',
        ],
      },

      // ── 2. Remplacement double vitrage ───────────────────────────────────────
      {
        _for:         'double.vitrage',
        scene_note:   'insulating glass unit (IGU) replacement — a thick double-pane unit with a visible metallic spacer bar is extracted and a new IGU is installed. The window frame is retained. The thick edge profile (24–28 mm) and the aluminium or warm-edge spacer bar are the key visual identifiers. No broken glass — this is a planned replacement.',
        scene_camera: 'standing 2–3 m from the window, straight-on view at eye level, slightly close to show the IGU thickness at the frame edge',
        setting:      'exterior',
        location_must_have: ['existing window frame retained', 'IGU unit — thick edge visible in frame or during handling'],
        location_forbidden: ['broken or cracked pane', 'single-pane handling', 'new full frame installation'],
        tools: [
          'large double-pane suction cup lifter resting against the wall near the window',
          'parclose removal tool resting on the windowsill beside the removed bead',
          'putty knife resting on the drop sheet near the frame base',
          'caulk gun on the floor near the frame base',
          'small crow bar or parclose pry tool resting on the windowsill',
        ],
        protections: [
          'drop sheet on the floor below the window opening',
          'protective rubber mat on the windowsill',
          'cut-resistant gloves worn by the glazier — essential for IGU edges',
        ],
        chantier_details: [
          'old IGU unit leaning against the wall nearby — thick profile and spacer bar visible',
          'new IGU unit still partially wrapped, leaning against the wall, spacer bar visible at edge',
          'removed glazing beads (parcloses) stacked on the drop sheet',
          'small pile of old glazing tape or rubber seal on the drop sheet',
          'spacer shims and setting blocks near the window base',
        ],
      },

      // ── 3. Remplacement fenêtre PVC ──────────────────────────────────────────
      {
        _for:         'fenetre.*pvc|pvc.*fenetre',
        scene_note:   'full PVC window unit installation — the complete frame (dormant + ouvrant) is installed in a rough masonry opening. The white plastic multi-chamber profile is the defining visual feature. The rough opening with masonry anchors and expanding foam is visible during installation. This is NOT a glass-only replacement.',
        scene_camera: 'standing 2–3 m from the wall opening, slightly oblique to show the rough opening depth and the white PVC frame being positioned or already inserted',
        setting:      'exterior',
        location_must_have: ['white PVC frame — plastic texture clearly visible', 'rough masonry opening partially or fully visible'],
        location_forbidden: ['grey or dark metal frame', 'glass-only handling', 'existing old frame still in place during final state'],
        tools: [
          'cordless drill with a masonry bit on the drop sheet near the window opening',
          'spirit level resting across the PVC frame top rail for alignment check',
          'expanding foam gun on the drop sheet near the frame base',
          'caulk gun with white silicone on the floor near the frame perimeter',
          'plastic shim wedge set on the windowsill beside the frame',
          'masonry anchor box open on the floor beside the frame',
        ],
        protections: [
          'cardboard sheet on the interior floor below the window opening',
          'protective film still partially on the white PVC frame',
          'cut-resistant gloves worn when handling the frame edges',
        ],
        chantier_details: [
          'new white PVC frame unit leaning against the wall near the opening — still partly wrapped',
          'rough masonry opening with exposed brickwork or concrete block perimeter — debut/encours',
          'masonry angle bracket visible at the frame side pinned to the wall',
          'expanding foam residue being trimmed at the frame-wall junction — semifinal',
          'white PVC frame fully installed and sealed — neat white perimeter — final',
        ],
      },

      // ── 4. Remplacement fenêtre aluminium ────────────────────────────────────
      {
        _for:         'fenetre.*alumin|alumin',
        scene_note:   'full aluminium window unit installation — the complete frame (dormant + ouvrant) is installed in a rough masonry opening. The grey, silver, or anthracite metal extruded profile is the defining visual feature. The frame is metal — not a plastic profile. The rough opening with masonry fixings is visible during installation.',
        scene_camera: 'standing 2–3 m from the wall opening, slightly oblique to show the rough opening depth and the grey/anthracite metal frame being positioned or inserted',
        setting:      'exterior',
        location_must_have: ['grey or anthracite aluminium frame — metallic finish clearly visible', 'rough masonry opening partially or fully visible'],
        location_forbidden: ['white plastic frame', 'glass-only handling', 'existing old frame still in place during final state'],
        tools: [
          'cordless drill on the drop sheet near the frame fixings',
          'spirit level resting on the frame top rail',
          'expanding foam gun on the drop sheet near the frame base',
          'caulk gun with grey or anthracite silicone on the floor near the frame perimeter',
          'aluminium shim wedge on the windowsill beside the frame',
          'masonry anchor bracket visible at the frame side',
        ],
        protections: [
          'cardboard sheet on the interior floor below the window opening',
          'protective film still partially on the aluminium frame profile',
          'cut-resistant gloves — aluminium frame edges are sharp',
        ],
        chantier_details: [
          'new grey or anthracite aluminium frame unit leaning against the wall near the opening — metal finish clearly visible',
          'rough masonry opening with exposed brickwork — debut/encours',
          'aluminium angle bracket or anchor fixed to the wall beside the frame',
          'silicone bead being applied at the aluminium frame-wall junction — semifinal',
          'grey or dark aluminium frame fully installed, clear glass pane transparent in the new frame, neat sealant bead — final',
        ],
      },

      // ── 5. Réparation fenêtre ─────────────────────────────────────────────────
      {
        _for:         'reparation.*fenetre|fenetre.*repar',
        scene_note:   'window repair on an existing frame that stays in place — the glass pane is intact and not being replaced. The intervention is on the mechanism: a broken handle, worn hinge, warped frame joint, or failed seal. The window remains mounted in the wall. No rough opening, no glass handling.',
        scene_camera: 'standing 1.5–2 m from the window, slightly off-centre showing the mechanism being worked on — handle, hinge, or joint area in foreground',
        setting:      'exterior',
        location_must_have: ['existing window frame mounted in wall — frame in place and intact', 'mechanism being repaired — handle, hinge, or seal area visible in foreground'],
        location_forbidden: ['bare rough opening', 'broken glass', 'new glass pane being inserted', 'new full frame being installed'],
        tools: [
          'screwdriver resting on the windowsill beside the handle or hinge being repaired',
          'allen key set on the windowsill near the hinge adjustment point',
          'small tube of window lubricant or silicone resting on the sill',
          'putty knife near the frame seal line if re-sealing',
          'replacement handle or hinge hardware visible on the windowsill',
        ],
        protections: [
          'drop cloth on the floor below the window if any sealant is being applied',
          'thin gloves for handling sharp mechanism parts if required',
        ],
        chantier_details: [
          'existing window in its wall opening — glass pane transparent and intact, untouched, no glass work performed',
          'old handle or hinge removed, visible on the windowsill beside the new replacement part',
          'screws or small fasteners in a small tray on the windowsill',
          'adjustment marks or pencil lines near the hinge area on the frame',
          'lubricant or silicone smear near the working mechanism — semifinal',
        ],
      },

      // ── 6. Remplacement porte vitrée ─────────────────────────────────────────
      {
        _for:         'porte.vitr',
        scene_note:   'full glazed door installation — the complete door assembly (frame + glazed panel, full height 200 cm+) is installed in a door-width rough opening. Door hardware is visible: handle, lock, threshold sill. The full-height proportions and door hardware clearly distinguish this from a window. Safety glass (tempered or laminated) in the door panel.',
        scene_camera: 'standing 2–3 m from the door opening, slightly back to show the full height — head-to-toe view of the door frame and panel, showing handle, threshold, and any visible glazed area',
        setting:      'exterior',
        location_must_have: ['full-height door frame — at least 180 cm visible', 'door hardware: handle, lock, or threshold sill visible', 'glazed panel in the door leaf'],
        location_forbidden: ['window proportions — frame narrower than door height', 'no door handle or threshold visible in the frame'],
        tools: [
          'cordless drill on the floor near the door frame fixings',
          'spirit level resting against the door frame side rail — full height visible',
          'expanding foam gun near the frame perimeter',
          'caulk gun on the floor near the door threshold',
          'door handle hardware in packaging on the floor nearby',
          'two glaziers present — one on each side — when handling large door panels',
        ],
        protections: [
          'cardboard sheet on the floor at the door threshold',
          'protective film still partially on the glazed door panel',
          'two workers wearing cut-resistant gloves when handling the glazed door panel',
        ],
        chantier_details: [
          'rough door opening with full-height masonry edges exposed — debut/encours',
          'new glazed door panel leaning against the wall nearby — full height visible',
          'door frame being shimmed and levelled — spirit level against the full frame height',
          'door threshold sill being set and sealed with silicone — semifinal',
          'glazed door fully installed — handle and lock fitted, threshold sealed, transparent glass panel — final',
        ],
      },

      // ── 7. Vitrage sécurité feuilleté ────────────────────────────────────────
      {
        _for:         'feuillette|vitrage.*securite|securite.*vitrage',
        scene_note:   'laminated safety glass installation — specialist heavy glass with a visible laminated edge profile (two glass layers + PVB interlayer visible as a thin line at the pane edge). Installed using suction cups or vacuum lifter. Structural silicone or aluminium edge trims are used. Commercial or high-performance residential context.',
        scene_camera: 'standing 2–3 m from the glazing work, slightly oblique to show the glass edge profile and the structural silicone or edge trim being applied',
        setting:      'exterior',
        location_must_have: ['laminated glass edge profile visible — two glass layers + interlayer', 'structural silicone or aluminium edge trim in use'],
        location_forbidden: ['single thin pane', 'standard residential window frame without structural fixing', 'emergency provisional boarding'],
        tools: [
          'large vacuum lifter or twin suction cup frame resting against the wall near the glass unit',
          'structural silicone gun on the floor near the glass perimeter',
          'aluminium edge trim strip on the floor near the installed panel',
          'alignment block set on the glass edge',
          'silicone smoothing tool on the floor near the sealant bead',
          'razor blade scraper on the floor near the trimmed silicone',
        ],
        protections: [
          'heavy-duty cut-resistant gloves — mandatory for laminated glass edge handling',
          'suction cup lifter fully engaged before any glass movement',
          'anti-slip rubber pads under the glass base during positioning',
        ],
        chantier_details: [
          'laminated glass panel leaning against the wall — two-layer edge profile visible at the pane edge',
          'structural silicone gun with cartridge on the floor near the applied bead',
          'aluminium edge trim strip cut to length on the floor near the panel perimeter',
          'silicone bead being smoothed along the glass perimeter — semifinal',
          'fully installed laminated glass panel with neat structural silicone perimeter and aluminium edge trim — final',
        ],
      },

      // ── 8. Bris de glace urgence ─────────────────────────────────────────────
      {
        _for:         'bris.de.glace|glace.*urgence|urgence.*bris',
        scene_note:   'EMERGENCY glazing: provisional boarding or protective film applied after a break-in or accident. The opening is secured with plywood, polycarbonate sheet, or heavy opaque protective film — NOT a finished glazing. Glass fragments visible on the floor. Urgency context: worker in PPE acting fast. The result is opaque and provisional, not a finished window.',
        scene_camera: 'standing 1.5–2 m from the broken window or door, showing the damage and the provisional protection being applied — urgency framing, not a clean finished result',
        setting:      'exterior',
        location_must_have: ['broken glass opening — frame with missing or cracked glass', 'provisional protection being applied or already in place — plywood, polycarbonate, or film', 'glass fragments visible on the drop sheet or floor'],
        location_forbidden: ['clean transparent new pane installed', 'neat finished appearance — this is provisional only', 'permanent silicone bead as a finished seal'],
        tools: [
          'cordless drill on the floor near the provisional board fixings',
          'staple gun or brad nailer on the floor near the protective sheet',
          'utility knife on the floor near the cut polycarbonate or film',
          'broom resting against the wall near the swept glass fragments',
          'dustpan beside the glass fragment pile on the drop sheet',
        ],
        protections: [
          'heavy-duty cut-resistant gloves — mandatory around broken glass',
          'safety glasses worn by the glazier — mandatory during glass clearance',
          'long sleeves — no bare arms near the broken glass area',
          'thick-soled boots visible — no bare feet near the glass fragment zone',
          'drop sheet spread below the opening to contain glass fragments',
        ],
        chantier_details: [
          'glass fragments and shards on the drop sheet at the window base — visible in all states',
          'broken window frame with missing glass — debris still in the frame edge in debut',
          'plywood, polycarbonate sheet, or protective film being held up against the opening',
          'provisional board screwed or nailed to the frame — semifinal',
          'opening fully boarded or filmed — opaque, not transparent — this is the intended final state',
        ],
      },

    ],
  },

};
