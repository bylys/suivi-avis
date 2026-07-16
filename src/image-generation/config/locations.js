/**
 * config/locations.js — Phase 1 shadow copy (source active : app.js)
 * Copie stricte de LOCATION_RULES, TRIANGLE_RULES, PHOTO_COMPOSITIONS (non),
 * _CONTEXTE_TO_LOCATION, _CONTEXTE_OPTIONS_TO_LOCATION, LOCATION_ALIASES,
 * DEFAULT_LOCATION_BY_METIER, LOCATION_SUBTYPE_COMPATIBILITY,
 * WORK_SURFACE_BY_SUBTYPE, WORK_SURFACE_SERVICE_OVERRIDES
 * (app.js lignes 10910–11643).
 * Ne pas modifier avant le cutover validé.
 */

const LOCATION_RULES = {
  parking: {
    subtypes: [
      'open-air car park with marked spaces and lampposts',
      'underground car park — concrete pillars, low ceiling, fluorescent lighting',
      'shopping centre car park with cart return bays in background',
      'residential car park with apartment building facade behind',
      'station or airport car park with directional signage',
      'company car park with controlled entry barrier',
    ],
    must_have: ['marked parking bays or painted bay lines on the ground', 'asphalt or concrete surface'],
    may_have: ['barrier gate', 'parking metre or ticket machine', 'lampposts', 'directional signage', 'building facade matching the subtype'],
    forbidden: ['village square or market place', 'residential street kerbside without bay markings', 'motorway hard shoulder', 'countryside without road markings', 'petrol station forecourt'],
    safety_overrides: { triangle: 'forbidden_if_safely_parked' },
    compatible_jobs: ['depannage_auto'],
  },
  station_service: {
    subtypes: [
      'rural petrol station beside a main road',
      'peri-urban fuel station near a retail park',
      'hypermarket fuel station at a large retail site',
      'motorway service station forecourt',
    ],
    must_have: ['fuel pump dispensers visible', 'forecourt canopy overhead', 'asphalt forecourt surface'],
    may_have: ['small shop or cashier kiosk', 'road or retail zone visible in background', 'air and water station', 'directional road signs'],
    forbidden: ['legible brand names or logos in large text', 'residential houses directly alongside the forecourt', 'rural fields with no road infrastructure'],
    safety_overrides: { triangle: 'forbidden_if_safely_parked' },
    compatible_jobs: ['depannage_auto'],
  },
  garage_atelier: {
    subtypes: ['garage_client', 'atelier_depannage', 'depot_vehicules', 'cour_professionnelle'],
    must_have: ['concrete or tiled workshop floor', 'sectional or roller-shutter door — open or partially open'],
    may_have: ['vehicle lift hoist', 'workbench with tools', 'oil stains on floor', 'tyre rack', 'vehicles in service bays', 'professional van or tow truck outside'],
    forbidden: ['emergency warning triangle', 'motorway hard shoulder markings', 'public road lane markings'],
    safety_overrides: { triangle: 'forbidden' },
    compatible_jobs: ['depannage_auto'],
  },
  rue_centre_ville: {
    subtypes: [
      'narrow urban street with terraced buildings on both sides',
      'wide urban boulevard with a planted median',
      'paved urban square with surrounding buildings',
      'mixed residential and commercial urban street',
    ],
    must_have: ['pavement and kerbstone visible', 'urban building facades on at least one side'],
    may_have: ['parking metres', 'shop windows at ground level', 'street furniture', 'slow-moving or parked vehicles'],
    forbidden: ['motorway infrastructure', 'open countryside fields', 'heavy industrial warehouse zone'],
    safety_overrides: { triangle: 'required_if_blocking' },
    compatible_jobs: ['depannage_auto', 'vitrier', 'ravalement', 'nettoyage'],
  },
  route_departementale: {
    subtypes: [
      'narrow rural departmental road with hedgerows and ditches',
      'country road through open farmland with a grassed verge',
      'departmental road passing through a small village outskirts',
    ],
    must_have: ['single lane in each direction', 'road verge or grassy shoulder visible', 'rural or semi-rural environment'],
    may_have: ['hedgerows', 'fields or pasture', 'forest edge', 'scattered rural houses', 'kilometre marker post'],
    forbidden: ['motorway infrastructure', 'multiple traffic lanes', 'motorway overhead gantry signs', 'central reservation barrier'],
    safety_overrides: { triangle: 'required_if_on_road' },
    compatible_jobs: ['depannage_auto'],
  },
  route_nationale: {
    subtypes: [
      'peri-urban national road with retail zone or commercial strip in background',
      'inter-urban national road between two towns — moderate traffic',
      'national road entering a town with speed reduction signage',
    ],
    must_have: ['at least one lane in each direction', 'road lane markings visible'],
    may_have: ['central reservation or hatched median', 'roundabout visible in background', 'commercial signage at distance', 'slip road or turn lane'],
    forbidden: ['motorway-style crash barriers along the full length', 'purely rural single-track road', 'village centre square or market'],
    safety_overrides: { triangle: 'required_if_on_road' },
    compatible_jobs: ['depannage_auto'],
  },
  autoroute: {
    subtypes: [
      'three-lane motorway with hard shoulder and Armco barrier',
      'two-lane motorway with hard shoulder and central reservation',
      'motorway junction area with slip roads',
    ],
    must_have: ['hard shoulder clearly visible', 'crash barrier or Armco on at least one side', 'multiple traffic lanes'],
    may_have: ['overhead gantry signs', 'motorway service or exit sign', 'heavy goods vehicles in far lanes', 'distance marker posts'],
    forbidden: ['residential houses directly at the roadside', 'village or town infrastructure alongside the carriageway', 'single-track country road', 'pedestrian crossing on the carriageway'],
    safety_overrides: { triangle: 'required_if_safe' },
    compatible_jobs: ['depannage_auto'],
  },
  aire_repos: {
    subtypes: [
      'motorway rest area with picnic tables and sanitary block',
      'motorway service area with fuel station and shop',
      'roadside lay-by with picnic benches and waste bins',
    ],
    must_have: ['marked parking spaces for private vehicles', 'dedicated internal access lanes — separate from the motorway carriageway', 'visible rest area infrastructure — picnic tables or sanitary block or fuel pumps'],
    may_have: ['landscaped grass areas', 'directional signage', 'HGV parking zone', 'waste bins', 'tourist information board'],
    forbidden: ['village square', 'residential street or kerbside', 'town centre or historic buildings', 'municipal building fronting a road presented as the rest area'],
    safety_overrides: { triangle: 'forbidden_if_safely_parked' },
    compatible_jobs: ['depannage_auto'],
  },
  domicile: {
    subtypes: [
      'residential driveway with gate and house facade in the background',
      'enclosed private courtyard — gravel or paving, low wall or fence visible',
      'private garage forecourt with roller-shutter door',
      'private property entrance with letterbox and garden hedge',
    ],
    must_have: ['private property element clearly visible — gate, wall, garage door, or house facade'],
    may_have: ['private driveway', 'hedges or low wall', 'letterbox', 'privately parked car', 'garden edge'],
    forbidden: ['road lane markings', 'public pavement kerb indicating public road', 'carriageway with traffic', 'emergency warning triangle', 'yellow road lines', 'road verge in place of private garden'],
    safety_overrides: { triangle: 'forbidden' },
    compatible_jobs: ['depannage_auto'],
  },
  maison_individuelle: {
    subtypes: [
      'modern detached house with tiled roof and small front garden',
      'older individual house with rendered facade',
      'semi-detached house in a suburban street',
      'rural farmhouse with outbuildings',
    ],
    must_have: ['house building clearly visible — facade or roof or exterior'],
    may_have: ['garden', 'driveway', 'garage', 'fence or hedge', 'regional architectural style'],
    forbidden: ['motorway infrastructure', 'heavy industrial zone', 'underground setting'],
    safety_overrides: {},
    compatible_jobs: ['toiture', 'ravalement', 'nettoyage_toiture', 'nettoyage_gouttieres', 'etancheite', 'peinture', 'maçonnerie', 'vitrier', 'paysagiste'],
  },
  appartement: {
    subtypes: ['living room', 'kitchen', 'bedroom', 'bathroom or wet room', 'hallway or entrance', 'open-plan living space'],
    must_have: ['interior residential room — walls, ceiling, and floor of an apartment'],
    may_have: ['window showing outside view — sky trees facades or balcony are normal and allowed', 'apartment furniture', 'storage'],
    forbidden: ['exterior road as primary setting', 'building rooftop as setting', 'garage or workshop as setting'],
    safety_overrides: {},
    compatible_jobs: ['peinture', 'carrelage', 'vitrier', 'nettoyage', 'débarras'],
  },
  immeuble: {
    subtypes: ['immeuble_facade', 'immeuble_toit_terrasse', 'immeuble_toiture_inclinee', 'immeuble_parties_communes', 'immeuble_cour'],
    must_have: ['multi-storey collective residential building — repeated windows and multiple floors clearly visible'],
    may_have: ['balconies', 'communal courtyard', 'collective car park', 'urban street alongside the building'],
    forbidden: ['isolated rural farmhouse', 'industrial warehouse', 'single-storey detached pavilion'],
    safety_overrides: {},
    compatible_jobs: ['toiture', 'etancheite', 'ravalement', 'nettoyage_toiture', 'nettoyage_gouttieres', 'vitrier', 'nettoyage'],
  },
  commerce: {
    subtypes: ['retail shop with street frontage', 'restaurant or café with terrace', 'small independent pharmacy generic', 'hair or beauty salon', 'small service shop'],
    must_have: ['commercial premises — shop window or sales counter visible'],
    may_have: ['street frontage', 'storage area', 'commercial signage without dominant legible text'],
    forbidden: ['large identifiable brand signage with fully legible brand name text', 'purely residential room'],
    safety_overrides: {},
    compatible_jobs: ['vitrier', 'ravalement', 'nettoyage', 'peinture', 'carrelage'],
  },
  local_professionnel: {
    subtypes: ['professional office space', 'medical or legal practice', 'small agency or design studio', 'light workshop or atelier'],
    must_have: ['professional interior or exterior — neutral functional decor or professional facade'],
    may_have: ['reception desk', 'professional work offices', 'corridor', 'discreet facade signage', 'small car park'],
    forbidden: ['heavy industrial machinery', 'overtly residential furniture', 'large-scale warehouse'],
    safety_overrides: {},
    compatible_jobs: ['peinture', 'carrelage', 'vitrier', 'nettoyage'],
  },
  entrepot: {
    subtypes: ['industrial warehouse with racking and forklift access', 'logistics depot with loading bay and dock levellers', 'storage facility with large sectional doors', 'agricultural storage warehouse'],
    must_have: ['large internal volume — high ceiling, concrete or metal structure visible'],
    may_have: ['racking systems', 'pallets on the floor or on racks', 'forklift truck', 'loading dock', 'HGV yard'],
    forbidden: ['pallets placed directly on a pitched roof slope', 'residential interior', 'retail shop front'],
    safety_overrides: {},
    compatible_jobs: ['toiture', 'etancheite', 'nettoyage', 'débarras'],
  },
  batiment_agricole: {
    subtypes: ['metal-frame agricultural barn — bac acier cladding', 'traditional stone or timber barn', 'livestock building', 'grain or hay storage building'],
    must_have: ['agricultural building structure — large roof and rural setting'],
    may_have: ['farm machinery or tractor', 'bales of hay or straw', 'agricultural land in background', 'silo visible', 'wide access gates'],
    forbidden: ['urban street furniture', 'residential house facade', 'industrial loading bay'],
    safety_overrides: {},
    compatible_jobs: ['toiture', 'etancheite', 'nettoyage', 'maçonnerie'],
  },
  jardin_prive: {
    subtypes: ['suburban residential garden with lawn and planted beds', 'mature garden with established trees', 'garden with vegetable plot and garden shed'],
    must_have: ['private garden — lawn, planted beds, or terracing visible'],
    may_have: ['trees', 'hedges', 'garden shed', 'fences or walls', 'garden furniture at a distance'],
    forbidden: ['public park or municipal green space', 'motorway verge', 'industrial site'],
    safety_overrides: {},
    compatible_jobs: ['élagage', 'abattage', 'paysagiste'],
  },
  chantier_urbain: {
    subtypes: ['urban street construction with site fencing and hoarding', 'pavement or utilities trench in a town', 'building renovation site with scaffold and hoarding'],
    must_have: ['visible construction fencing or hoarding', 'urban context — streets or buildings immediately nearby'],
    may_have: ['safety fencing', 'skip or spoil container', 'construction vehicle', 'scaffolding'],
    forbidden: ['rural fields with no nearby buildings or streets', 'motorway-only infrastructure with no urban element'],
    safety_overrides: {},
    compatible_jobs: ['terrassement', 'maçonnerie', 'ravalement', 'nettoyage'],
  },
};

// ─── Triangle Rules ───────────────────────────────────────────────────────────
// Per location-type rule for warning triangle placement.
// Values: 'required_if_on_road' | 'required_if_safe' | 'required_if_blocking'
//       | 'forbidden' | 'forbidden_if_safely_parked'
const TRIANGLE_RULES = {
  autoroute:            { default: 'required_if_safe',            note: 'Hard shoulder breakdown — triangle visible if safe to deploy. Complement with hazard lights and high-vis vest.' },
  route_nationale:      { default: 'required_if_on_road',         note: 'Triangle placed at credible safety distance behind the vehicle.' },
  route_departementale: { default: 'required_if_on_road',         note: 'Triangle placed at credible safety distance behind the vehicle.' },
  rue_centre_ville:     { default: 'required_if_blocking',        note: 'Triangle only if the vehicle is actively blocking a traffic lane.' },
  parking:              { default: 'forbidden_if_safely_parked',  note: 'Triangle only if the vehicle is blocking an active internal lane.' },
  station_service:      { default: 'forbidden_if_safely_parked',  note: 'Triangle only if blocking a forecourt lane.' },
  aire_repos:           { default: 'forbidden_if_safely_parked',  note: 'No triangle for a safely parked vehicle — only if blocking an internal lane.' },
  domicile:             { default: 'forbidden',                   note: 'Private property — no triangle.' },
  garage_atelier:       { default: 'forbidden',                   note: 'Workshop — no triangle.' },
};

// Mapping: CONTEXTE_BY_METIER values (per-métier) → LOCATION_RULES key
const _CONTEXTE_TO_LOCATION = {
  depannage_auto: {
    autoroute:       'autoroute',
    route_nationale: 'route_nationale',
    route_dept:      'route_departementale',
    rue_ville:       'rue_centre_ville',
    parking:         'parking',
    domicile:        'domicile',
    garage:          'garage_atelier',
    station_service: 'station_service',
    aire_repos:      'aire_repos',
  },
};

// Mapping: CONTEXTE_OPTIONS values (all other métiers) → LOCATION_RULES key
const _CONTEXTE_OPTIONS_TO_LOCATION = {
  maison:        'maison_individuelle',
  appartement:   'appartement',
  immeuble:      'immeuble',
  commerce:      'commerce',
  professionnel: 'local_professionnel',
  entrepot:      'entrepot',
  agricole:      'batiment_agricole',
};

// Aliases and normalized synonyms — covers any value not in the specific maps above.
// Key: normalized string (lowercase, no accents, underscores). Value: LOCATION_RULES key.
const LOCATION_ALIASES = {
  // Outdoor / garden
  jardin:              'jardin_prive',
  jardin_prive:        'jardin_prive',
  parc:                'jardin_prive',
  espace_vert:         'jardin_prive',
  // Worksite
  chantier:            'chantier_urbain',
  chantier_urbain:     'chantier_urbain',
  voirie:              'chantier_urbain',
  // Residential
  maison:              'maison_individuelle',
  maison_individuelle: 'maison_individuelle',
  pavillon:            'maison_individuelle',
  domicile:            'domicile',
  appartement:         'appartement',
  immeuble:            'immeuble',
  copropriete:         'immeuble',
  // Commercial / pro
  commerce:            'commerce',
  professionnel:       'local_professionnel',
  local_pro:           'local_professionnel',
  local_professionnel: 'local_professionnel',
  // Industrial / agricultural
  entrepot:            'entrepot',
  hangar:              'batiment_agricole',
  batiment_agricole:   'batiment_agricole',
  agricole:            'batiment_agricole',
  // Auto / road
  parking:             'parking',
  station_service:     'station_service',
  aire_repos:          'aire_repos',
  garage:              'garage_atelier',
  garage_atelier:      'garage_atelier',
  atelier:             'garage_atelier',
  autoroute:           'autoroute',
  route_nationale:     'route_nationale',
  route_dept:          'route_departementale',
  route_departementale: 'route_departementale',
  rue_ville:           'rue_centre_ville',
  rue_centre_ville:    'rue_centre_ville',
};

// Per-métier fallback when the context does not resolve through any mapping.
// Keys are normalized (no accents, underscores). Used as last resort before null.
const DEFAULT_LOCATION_BY_METIER = {
  elagage:              'jardin_prive',
  abattage:             'jardin_prive',
  paysagiste:           'jardin_prive',
  terrassement:         'chantier_urbain',
  amenagement_exterieur:'chantier_urbain',
  maconnerie:           'maison_individuelle',
  toiture:              'maison_individuelle',
  charpente:            'maison_individuelle',
  etancheite:           'immeuble',
};

const LOCATION_SUBTYPE_COMPATIBILITY = {
  immeuble: {
    // Flat-roof waterproofing — must never be immeuble_toiture_inclinee
    toit_terrasse:          ['immeuble_toit_terrasse'],
    toiture_terrasse:       ['immeuble_toit_terrasse'],
    membrane:               ['immeuble_toit_terrasse'],
    etancheite:             ['immeuble_toit_terrasse'],
    // Pitched-roof coverage — must never be immeuble_toit_terrasse or parties_communes
    tuile:                  ['immeuble_toiture_inclinee'],
    ardoise:                ['immeuble_toiture_inclinee'],
    couverture:             ['immeuble_toiture_inclinee'],
    faitage:                ['immeuble_toiture_inclinee'],
    nettoyage_gouttieres:   ['immeuble_toiture_inclinee'],
    gouttiere:              ['immeuble_toiture_inclinee'],
    // Generic roof — both pitched and flat acceptable
    nettoyage_toiture:      ['immeuble_toiture_inclinee', 'immeuble_toit_terrasse'],
    toiture:                ['immeuble_toiture_inclinee', 'immeuble_toit_terrasse'],
    // Façade
    ravalement:             ['immeuble_facade'],
    facade:                 ['immeuble_facade'],
    // Glazing — facade or common areas
    vitrier:                ['immeuble_facade', 'immeuble_parties_communes'],
    vitre:                  ['immeuble_facade', 'immeuble_parties_communes'],
    fenetre:                ['immeuble_facade', 'immeuble_parties_communes'],
    // Interior / common areas
    peinture:               ['immeuble_parties_communes'],
    carrelage:              ['immeuble_parties_communes'],
    nettoyage:              ['immeuble_parties_communes', 'immeuble_cour', 'immeuble_facade'],
  },
  chantier_urbain: {
    // Excavation / trenching — NOT scaffold/facade renovation
    fondation:              ['urban street construction with site fencing and hoarding'],
    tranchee:               ['pavement or utilities trench in a town'],
    reseau:                 ['pavement or utilities trench in a town'],
    terrassement:           ['urban street construction with site fencing and hoarding', 'pavement or utilities trench in a town'],
    // Structural / masonry
    maconnerie:             ['building renovation site with scaffold and hoarding', 'urban street construction with site fencing and hoarding'],
    // Façade-focused
    ravalement:             ['building renovation site with scaffold and hoarding'],
  },
  jardin_prive: {
    // Tree work — prefer mature garden when service is abattage
    abattage:               ['mature garden with established trees'],
    elagage:                ['suburban residential garden with lawn and planted beds', 'mature garden with established trees'],
    haie:                   ['suburban residential garden with lawn and planted beds', 'garden with vegetable plot and garden shed'],
    taille:                 ['suburban residential garden with lawn and planted beds', 'mature garden with established trees'],
    // Ground work
    tonte:                  ['suburban residential garden with lawn and planted beds'],
    gazon:                  ['suburban residential garden with lawn and planted beds'],
    paysagiste:             ['suburban residential garden with lawn and planted beds', 'garden with vegetable plot and garden shed'],
  },
};

// Maps each location subtype to its default visual surface description for the rewrite prompt.
const WORK_SURFACE_BY_SUBTYPE = {
  // immeuble
  immeuble_toit_terrasse:    'flat concrete or bitumen roof deck — parapet upstands and surface drainage visible',
  immeuble_toiture_inclinee: 'pitched tiled or slate roof slope — ridge line and fixing battens visible',
  immeuble_facade:           'multi-storey building facade — rendered or stone surface with weathering marks',
  immeuble_parties_communes: 'communal stairwell or corridor — walls, ceiling, and landing floor visible',
  immeuble_cour:             'communal courtyard — paving stones with surrounding building facades',
  // chantier_urbain
  'urban street construction with site fencing and hoarding': 'open excavation zone — raw soil, aggregate mounds, and site hoardings',
  'pavement or utilities trench in a town':                   'utility trench in pavement — pipes or conduits at the base, backfill area',
  'building renovation site with scaffold and hoarding':      'scaffold-clad facade or roof-level work platform on a renovation site',
  // jardin_prive
  'suburban residential garden with lawn and planted beds':   'garden surface — lawn, planted borders, and garden hedges',
  'mature garden with established trees':                     'established tree canopy — large trunk base with branches requiring work',
  'garden with vegetable plot and garden shed':               'garden ground — soil, vegetable beds, and established shrubs',
  // maison_individuelle
  'modern detached house with tiled roof and small front garden': 'modern clay or concrete tile roof pitch',
  'older individual house with rendered facade':              'rendered house facade or pitched roof surface',
  'semi-detached house in a suburban street':                 'suburban house roof or facade surface',
  'rural farmhouse with outbuildings':                        'farmhouse roof — stone, slate, or fibre-cement cladding',
  // appartement
  'living room':              'living room — walls and ceiling being treated',
  'kitchen':                  'kitchen — wall tiles or surfaces in progress',
  'bedroom':                  'bedroom interior — walls, ceiling, or floor surface',
  'bathroom or wet room':     'bathroom — tiled walls and floor, shower or bath area',
  'hallway or entrance':      'hallway walls and ceiling',
  'open-plan living space':   'large open-plan interior — expanse of wall and ceiling surface',
  // entrepot
  'industrial warehouse with racking and forklift access':    'warehouse interior — high ceiling, concrete floor, metal racking',
  'logistics depot with loading bay and dock levellers':      'loading bay zone — dock leveller and HGV access',
  'storage facility with large sectional doors':              'large-volume interior — concrete or metal walls and ceiling',
  'agricultural storage warehouse':                           'agricultural building interior — earth or concrete floor',
  // batiment_agricole
  'metal-frame agricultural barn — bac acier cladding':       'metal barn — bac acier cladding or roof panels',
  'traditional stone or timber barn':                         'stone or timber barn structure — walls and roof elements',
  'livestock building':                                       'livestock building floor and wall surfaces',
  'grain or hay storage building':                            'grain storage interior — bins or floor area',
  // commerce
  'retail shop with street frontage':                         'shop interior or storefront — glass façade and display window visible',
  'restaurant or café with terrace':                          'café or restaurant interior or terrace surface',
  'small independent pharmacy generic':                       'shop interior — counter, shelving, and service area',
  'hair or beauty salon':                                     'salon interior — treatment stations and mirrors',
  'small service shop':                                       'shop or workshop interior — service counter or workbench',
  // local_professionnel
  'professional office space':                                'office interior — desks, walls, and ceiling being treated',
  'medical or legal practice':                                'professional interior — neutral walls and floor surface',
  'small agency or design studio':                            'studio or office interior — open workspace',
  'light workshop or atelier':                                'workshop interior — benches, tools, and wall surfaces',
};

// Service keyword overrides — checked first (normalize service, longest-match wins).
// If the normalized _matched_service contains the key, this surface description is used.
const WORK_SURFACE_SERVICE_OVERRIDES = {
  membrane:           'flat roof deck — bitumen or EPDM membrane being stripped or re-applied in sheets',
  etancheite:         'waterproofing surface — concrete or composite deck with upstands and drainage outlets',
  toit_terrasse:      'toit-terrasse — flat concrete deck, existing membrane partially removed',
  terrassement:       'excavated ground — raw soil, trench walls, spoil mounds, and earthmoving tracks',
  fondation:          'foundation pit — reinforced concrete footings or formwork being positioned',
  tranchee:           'open trench — cut through pavement, utility pipes at the base, sandy backfill',
  ravalement:         'building facade surface — render or stone being stripped, cleaned, or re-coated',
  elagage:            'tree canopy — branches being cut, chainsaw, cut sections accumulating below',
  abattage:           'felled or falling tree — stump base, sectioned logs, and wood chippings on ground',
  gouttiere:          'roof gutter line — debris and moss being cleared from the channel',
  vitrier:            'glazing frame — old pane removed, new glass unit being manoeuvred into position',
  carrelage:          'floor or wall substrate — adhesive bed drying or tiles being positioned',
  peinture:           'interior surface — fresh paint layer, roller marks, masking tape at edges',
  nettoyage:          'surface being high-pressure washed or scrubbed — dark staining being removed',
  vitre:              'glazing frame — old glass pane removed, new glass unit being positioned into the frame',
  vitrine:            'storefront glazing — shopfront glass panel or display-window unit being replaced or sealed',
  debarras:           'room or space being cleared — bulky items and debris stacked for removal',
  // depannage_auto — service-level surface (same regardless of road location)
  crevaison:          'deflated tyre against the tarmac — nail or screw visible in the tread, sidewall collapsed against the rim',
  demarrage:          'vehicle engine bay open — battery terminals exposed, jump cable clamps connected',
  batterie:           'vehicle engine bay open — battery exposed, charger or jump leads in place',
  panne:              'vehicle bonnet raised — engine visible, diagnostic tool or torch nearby',
  remorquage:         'vehicle being loaded onto a flatbed tow truck — rear wheels on the loading ramp',
};

export {
  LOCATION_RULES,
  TRIANGLE_RULES,
  _CONTEXTE_TO_LOCATION,
  _CONTEXTE_OPTIONS_TO_LOCATION,
  LOCATION_ALIASES,
  DEFAULT_LOCATION_BY_METIER,
  LOCATION_SUBTYPE_COMPATIBILITY,
  WORK_SURFACE_BY_SUBTYPE,
  WORK_SURFACE_SERVICE_OVERRIDES,
};
