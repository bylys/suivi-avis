/**
 * rules.js — Règles visuelles et de sécurité par métier
 */

const SAFETY_RULES = {
  toiture: `SAFETY RULES — Roofing & Roof Renovation (Couvreur / Rénovation de toiture):
MANDATORY PROFESSIONAL PROTOCOL IN FRANCE:
Minimum 2 workers visible.
POSITION A (SCAFFOLDING): Roofers working safely from a certified facade scaffolding platform (échafaudage de couvreur avec garde-corps) along the roof edge/eaves.
POSITION B (GROUND LEVEL): Both roofers working at GROUND LEVEL in the driveway or garden, preparing new terracotta tiles, cutting zinc flashing on a portable workbench, or inspecting the roof from below.
ABSOLUTE PROHIBITION & SAFETY BAN:
❌ NO giant tall extension ladders leaning against the house reaching up to the roof slope!
❌ NO lone worker standing unsupported on steep roof slope!
❌ NO unsafe balancing on wet or steep tiles!`,

  nettoyage_toiture: `SAFETY RULES — Roof Cleaning & Moss Removal (Nettoyage Toiture & Démoussage):
MANDATORY PROFESSIONAL PROTOCOL IN FRANCE:
OPTION 1 (GROUND LEVEL TELESCOPIC LANCE - STANDARD): The cleaner stands safely on the GROUND (in the courtyard, driveway, or garden) holding a long black TELESCOPIC CARBON SPRAY LANCE (perche télescopique de pulvérisation) spraying the roof tiles from below.
OPTION 2 (AERIAL BASKET LIFT / NACELLE): Cleaner working safely inside an aerial cherry picker basket (nacelle élévatrice) parked beside the house.
ABSOLUTE PROHIBITION & SAFETY BAN:
❌ NEVER place a worker standing freely on steep sloped roof tiles while spraying water!
❌ NO single extension ladders leaning against the gutter or roof slope!
❌ NO worker balancing on wet slippery roof tiles!
Worker MUST be standing safely on the GROUND with a telescopic lance OR inside an aerial basket lift.`,
  nettoyage_terrasse: `SAFETY RULES — Terrace / Deck cleaning: Ground level work on outdoor patio/deck/driveway. NO HARD HAT / NO HELMET on head (bare head or casual cap). High-pressure washer or patio cleaner attachment in use. Waterproof boots, work trousers. NEVER: bare feet, jet aimed at people.`,
  nettoyage_facade: `SAFETY RULES — Facade cleaning: High-pressure washer or softwash lance aimed at exterior wall. Scaffold or ground level. Hard hat MANDATORY if under scaffold. Safety goggles/visor + work boots.`,
  nettoyage_gouttieres: `SAFETY RULES — Gutter Cleaning & Gutter Installation (Nettoyage et Travaux de Gouttières):
MANDATORY SAFETY PROTOCOL IN FRANCE:
OPTION 1 (GROUND LEVEL): Cleaner operating from the ground using a long telescopic curved lance or inspecting drain collector at ground level.
OPTION 2 (SECURED STEPLADDER): Worker on a stable stepladder with wall standoff bracket, wearing sturdy work gloves and protective glasses.
OPTION 3 (SCAFFOLDING / MEWP): For high gutters or chéneaux on buildings, intervention from certified rolling scaffold or cherry picker basket.
ABSOLUTE PROHIBITION & BAN:
❌ NEVER stand directly inside the gutter channel or walk unsupported on wet roof slope!
❌ NO dangerous leaning sideways off a ladder!
❌ NO bare hands when handling sharp zinc, aluminium or copper gutter profiles.`,
  etancheite: `SAFETY RULES — Waterproofing & Leak Detection (Étanchéité toiture-terrasse, toit plat & recherche de fuite):
MANDATORY SAFETY & PROFESSIONAL PROTOCOL IN FRANCE:
OPTION 1 (FLAT ROOF / TOITURE TERRASSE): 1 or 2 workers on 100% FLAT surface unrolling EPDM membrane, welding PVC sheets with hot-air gun, or torching bitumen rolls with propane blowtorch. Relevés d'étanchéité on low parapet walls (acrotères).
OPTION 2 (OUTDOOR PATIO / BALCONY UNDER TILING): Artisan applying liquid waterproofing resin (Système d'Étanchéité Liquide SEL) with paint roller and reinforcing mesh tape in corners.
OPTION 3 (LEAK DETECTION): Technician with smoke generator (fumigène), tracer gas or thermal inspection camera locating infiltration on flat roof or wall.
ABSOLUTE PROHIBITION & BAN:
❌ ABSOLUTE FORBIDDEN: NO sloped roofs! NO terracotta roof tiles! The roof MUST be 100% FLAT!
❌ NEVER stand on the very edge of an unprotected parapet!
❌ NO blowtorch aimed towards another worker or flammable materials.`,
  ravalement: `SAFETY RULES — Facade rendering: Scaffold above 2m: mandatory guardrail on void side. NEVER: worker leaning beyond guardrail.`,
  maconnerie: `SAFETY RULES — Masonry: NEVER: worker above unfinished wall at more than 1.5m without scaffold. All workers ground level beside wall (max 1.0-1.2m during block construction).`,
  elagage: `SAFETY RULES — Tree Pruning & Trimming: MANDATORY PROPORTION & EQUIPMENT LOGIC BASED ON TREE HEIGHT:
(A) FOR TALL HIGH-CANOPY TREES (Arbre haute tige / Grand arbre > 6-8m): Minimum 2 workers (1 climber high in upper crotch, 1 ground assistant holding rope). Climber: arborist helmet + climbing harness + ropes anchored high in main tree fork.
(B) FOR SMALL/MEDIUM GARDEN TREES & FRUIT TREES (Petit/moyen arbre de jardin < 5m): NO HEAVY CLIMBING HARNESS! NO ROPES IN TREE! The gardener/pruner MUST use a double A-frame garden step-ladder (escabeau double de jardin) or stand at ground level using a pole pruner or hand saw/secateurs. MANDATORY SAFETY GLASSES / PROTECTIVE GOGGLES on all workers' faces.
NEVER: Put heavy climbing harnesses, ropes or climbing spurs on a small garden tree reachable with a stepladder! NEVER: person in fall zone of branch being cut.`,
  abattage: `SAFETY RULES — Tree felling & Chainsaw work: MANDATORY SAFETY GLASSES / PROTECTIVE VISOR on operator's face (eye protection against flying sawdust). Chainsaw operator beside trunk wearing logger helmet with visor/glasses + chainsaw protection trousers + boots. Assistant at safe distance. NEVER: chainsaw held above shoulder level, person in frontal fall direction of tree.`,
  terrassement: `SAFETY RULES — Earthworks & Excavation: MANDATORY SAFETY GLASSES / PROTECTIVE GOGGLES on all workers' faces. MANDATORY NOISE-CANCELING EAR PROTECTION / EARMUFFS on workers operating noisy machinery (mini-excavator, hydraulic breaker, trencher, compactor). Minimum 2 workers. NEVER: person in open trench under bucket, person between rotating cab and trench edge.`,
  dessouchage: `SAFETY RULES — Tree Stump Removal & Root Grinding: MANDATORY SAFETY GLASSES / PROTECTIVE GOGGLES on all workers' faces (eye protection mandatory against flying wood chips and root debris). MANDATORY NOISE-CANCELING EAR PROTECTION / EARMUFFS on operator when operating stump grinder or heavy digging equipment. Minimum 2 workers (1 operator, 1 ground assistant). NEVER: worker standing in direct path of flying wood chips.`,
  debroussaillage: `SAFETY RULES — Brush Clearing & Weed Mowing: MANDATORY SAFETY GLASSES / PROTECTIVE GOGGLES plus FULL-FACE MESH VISOR on operator's face against flying gravel/stones. MANDATORY NOISE-CANCELING EAR PROTECTION / EARMUFFS on operator. Operator wearing sturdy work boots with protective gaiters/chaps, reinforced work trousers, and operating clearing saw/brushcutter with ergonomic shoulder harness and safety debris guard. Assistant at safe distance (>10m). NEVER: clearing without protective blade shield, bystander in direct projection path.`,
  paysagiste: `SAFETY RULES — Landscaping, Woodwork & Hedge Trimming: MANDATORY SAFETY GLASSES / PROTECTIVE GOGGLES on all workers' faces (eye protection mandatory for cutting hedges and wood). NO HARD HAT / NO HELMET on head for ground hedge trimming (bare head or casual cap/ear defenders). Hedge trimmer or lawnmower in use. Work trousers and gloves. NEVER: lawnmower on steep unstable slope, chainsaw operated without leg protection.`,
  nettoyage: `SAFETY RULES — Exterior cleaning: Ground level work. NO HARD HAT on head. NEVER: high-pressure jet aimed at person, bare feet during cleaning.`,
  vitrier: `SAFETY RULES — Glazier: Cut-resistant safety gloves and protective safety glasses/goggles MANDATORY when handling glass panes. Glass suction cup lifters MUST be firmly attached to the flat central surface of the glass pane (held by glazier hands), NEVER floating mid-air or overlapping window frames. NO HARD HAT / NO HELMET on head (bare head or casual cap). Outdoor height intervention (scaffolding/basket): hard hat mandatory. NEVER: bare hands touching glass edge, glass pane resting unsupported on wall.`,
  depannage_auto: `SAFETY RULES — Auto breakdown: Off-road mandatory, warning triangle visible. NEVER: person between vehicle and traffic, cables crossing road, vehicle raised without axle stands.`,
  charpente: `SAFETY RULES — Carpentry & Woodwork: MANDATORY SAFETY GLASSES / PROTECTIVE GOGGLES on all workers' faces (eye protection against wood dust). Wooden roof trusses or rafters visible, minimum 2 carpenters working with circular saw or nail gun, safety harness connected, hard hats mandatory. NEVER: roof ladder as structural platform, worker balancing on rafters without platform, lone worker carrying heavy piece.`,
};

const VISUAL_RULES_BY_SERVICE = {
  // ── SITES COUVERTURE (8 services officiels) ──
  'Couverture & Pose de toiture': `VISUAL: Roof installation and new roofing (Couverture & Pose de toiture). Artisans roofers laying fresh terracotta roof tiles or slates over roof battens (liteaux) from certified roofer scaffolding with guardrails along the eaves, tile cutter and spirit level visible.`,
  'Couverture et Pose de toiture': `VISUAL: Roof installation and new roofing (Couverture & Pose de toiture). Artisans roofers laying fresh terracotta roof tiles or slates over roof battens from certified roofer scaffolding with guardrails along the eaves.`,
  'Remplacement & Réparation de tuiles': `VISUAL: Tile replacement & repair (Remplacement & Réparation de tuiles). Roofers replacing broken, cracked or displaced terracotta tiles on house roof from scaffolding, or preparing replacement tiles on ground workbench.`,
  'Remplacement et Réparation de tuiles': `VISUAL: Tile replacement & repair. Roofers replacing broken terracotta tiles on house roof from scaffolding.`,
  'Nettoyage & Démoussage de toiture': `VISUAL: Roof cleaning & moss removal (Nettoyage & Démoussage de toiture). Specialist standing safely at GROUND LEVEL in driveway or garden using a long black telescopic carbon spray lance (perche télescopique) spraying eco-friendly anti-moss foam treatment on roof tiles, OR from a cherry picker aerial basket lift. ABSOLUTE PROHIBITION: NO tall straight extension ladders on roof!`,
  'Nettoyage et Démoussage de toiture': `VISUAL: Roof cleaning & moss removal. Specialist standing safely at ground level using telescopic carbon spray lance on roof tiles.`,
  'Traitement hydrofuge & imperméabilisant': `VISUAL: Water-repellent hydrofuge treatment (Traitement hydrofuge & imperméabilisant toiture). Specialist standing at ground level spraying invisible water-beading hydrofuge sealant coating across terracotta roof tiles with high-reach telescopic lance.`,
  'Traitement hydrofuge et imperméabilisant': `VISUAL: Water-repellent hydrofuge treatment for roof. Specialist spraying hydrofuge sealant across roof tiles with telescopic lance.`,
  'Étanchéité toiture-terrasse': `VISUAL: Flat roof waterproofing (Étanchéité toiture-terrasse). Waterproofing artisan unrolling dark bitumen membrane or grey EPDM synthetic sheet on 100% FLAT rooftop with low parapet wall (acrotère), welding seams with propane blowtorch or hot-air welder.`,
  'Etancheite toiture terrasse': `VISUAL: Flat roof waterproofing. EPDM membrane or torch-on bitumen on 100% flat rooftop with low parapet.`,
  'Zinguerie & Gouttières': `VISUAL: Zinc work & gutters (Zinguerie & Gouttières). Roofer/zinc craftsman fitting half-round zinc gutter sections or custom zinc roof valleys/flashings (solins et noues en zinc) along roof eaves from scaffold.`,
  'Zinguerie et Gouttières': `VISUAL: Zinc work & gutters. Fitting zinc gutter sections and roof flashings along eaves from scaffold.`,
  'Faîtage & Rive': `VISUAL: Ridge capping & verge tiles (Faîtage & Rive). Roofers bedding ridge tiles (faîtières) with mortar or installing dry-fix ventilated ridge roll system (closoir ventilé) and zinc verge edging from scaffolding with safety harness.`,
  'Faitage & Rive': `VISUAL: Ridge capping & verge tiles. Roofers working on ridge capping or verge edging from scaffolding with safety harness.`,
  'Faitage et Rive': `VISUAL: Ridge capping & verge tiles. Roofers working on ridge capping or verge edging from scaffolding with safety harness.`,
  'Charpente & Ossature bois': `VISUAL: Timber roof structure & framing (Charpente & Ossature bois). Carpenters assembling wooden rafters or prefabricated timber truss frame with cordless nailer and circular saw, safety harness attached.`,
  'Charpente et Ossature bois': `VISUAL: Timber roof structure & framing. Carpenters assembling wooden rafters or timber truss frame with nailer and circular saw.`,

  // ── SITES NETTOYAGE (7 services officiels) ──
  'Nettoyage & Démoussage de Toiture': `VISUAL: Roof cleaning & moss removal (Nettoyage & Démoussage de toiture). Operator at GROUND LEVEL holding a long telescopic carbon spray lance applying anti-moss foam onto roof tiles, or inside cherry picker basket. NO ladders on roof!`,
  'Nettoyage et Démoussage de Toiture': `VISUAL: Roof cleaning & moss removal. Operator at ground level with long telescopic lance applying anti-moss foam.`,
  'Traitement Hydrofuge Toiture': `VISUAL: Water-repellent roof treatment (Traitement hydrofuge toiture). Operator at ground level with telescopic lance spraying water-repellent sealer on clean roof tiles.`,
  'Nettoyage de Façade': `VISUAL: Facade cleaning (Nettoyage de façade). Exterior house wall being washed with softwash or medium-pressure lance, clear contrast between clean rendered wall and unwashed section. Operator in work boots and safety glasses.`,
  'Nettoyage de Facade': `VISUAL: Facade cleaning. Exterior wall being washed with pressure lance, clear contrast between clean rendered wall and unwashed section.`,
  'Ravalement de Façade': `VISUAL: Facade renovation & rendering (Ravalement de façade). Artisans on facade scaffolding applying fresh exterior render coating (crépi, enduit de façade taloché) with float and trowel.`,
  'Ravalement de Facade': `VISUAL: Facade renovation & rendering. Applying fresh render coating from scaffolding with float and trowel.`,
  'Nettoyage Panneaux Solaires': `VISUAL: Solar panel cleaning (Nettoyage panneaux solaires). Cleaner at ground level or scaffold using a long telescopic pole with soft water-fed cleaning brush (brosse rotative télescopique à eau pure déminéralisée) gently washing rooftop photovoltaic solar panels without high pressure.`,
  'Nettoyage Terrasses, Allées & Dallages': `VISUAL: Patio, driveway & paving cleaning (Nettoyage terrasses, allées & dallages). Cleaner operating a high-pressure rotary surface cleaner (cloche de lavage de sol) or turbo nozzle lance over patio paving stones, interlocking pavers or concrete driveway.`,
  'Nettoyage Terrasses, Allées et Dallages': `VISUAL: Patio, driveway & paving cleaning. Cleaner operating a rotary surface cleaner over patio pavers and driveway.`,
  'Nettoyage Gouttières & Chéneaux': `VISUAL: Gutter & parapet cleaning (Nettoyage gouttières & chéneaux). Artisan wearing work gloves removing wet leaves and silt from zinc/PVC gutters into a bucket, checking downpipe water evacuation.`,
  'Nettoyage Gouttières et Chéneaux': `VISUAL: Gutter & parapet cleaning. Removing wet leaves and debris from gutter channel into bucket.`,

  // ── SITES VITRIER (6 services officiels) ──
  'Dépannage vitrerie d\'urgence': `VISUAL: Emergency glazier callout (Dépannage vitrerie d'urgence). Glazier in cut-resistant gloves and safety glasses securing a cracked window, installing temporary security boarding or replacing shattered pane using suction lifters held firmly in hands. NO hard hat indoors.`,
  'Depannage vitrerie d\'urgence': `VISUAL: Emergency glazier callout. Glazier in cut-resistant gloves and safety glasses securing broken pane with suction lifter.`,
  'Remplacement de vitre cassée': `VISUAL: Broken glass replacement (Remplacement de vitre cassée). Glazier wearing protective safety glasses and cut-resistant gloves carefully removing damaged pane and fitting a new clear glass pane into window frame using heavy-duty suction cup handles. NO hard hat.`,
  'Remplacement de vitre cassee': `VISUAL: Broken glass replacement. Glazier in safety glasses and cut-resistant gloves fitting new glass pane with suction lifters.`,
  'Double vitrage et isolation': `VISUAL: Double glazing installation & thermal insulation (Double vitrage et isolation). Two glaziers in workwear and cut-resistant gloves carrying and slotting a thick insulating double glazed unit (double vitrage ITR argon) into PVC or aluminum window frame with heavy-duty suction handles. NO hard hat.`,
  'Réparation de fenêtre': `VISUAL: Window repair & hardware adjustment (Réparation de fenêtre). Glazier/joiner adjusting window sash hinges, replacing broken cremone bolt mechanism or resealing rubber gasket seals on residential casement window.`,
  'Reparation de fenetre': `VISUAL: Window repair & hardware adjustment. Adjusting window hinges, cremone bolt and seals.`,
  'Vitrine et vitrage de sécurité': `VISUAL: Commercial shopfront & laminated security glass (Vitrine et vitrage de sécurité). Glaziers using triple suction cup lifters to maneuver heavy laminated anti-burglary security glass into commercial aluminium shopfront frame.`,
  'Vitrine et vitrage de securite': `VISUAL: Commercial shopfront & laminated security glass. Maneuvering heavy laminated security glass into commercial storefront with suction lifters.`,
  'Miroiterie et verre sur mesure': `VISUAL: Custom mirrors & interior bespoke glass (Miroiterie et verre sur mesure). Glaziers installing a large polished wall mirror or custom glass shower partition with suction lifters, silicone sealant gun and spirit level.`,

  // ── SITES CHARPENTE (14 services officiels) ──
  'Traitement de Charpente': `VISUAL: Timber pest & wood rot treatment (Traitement de charpente). Specialist wearing protective coverall, mask and safety glasses injecting insecticide/fungicide treatment into wooden roof beams via injector nipples (traitement de charpente par injection).`,
  'Réparation de Charpente': `VISUAL: Timber roof frame repair (Réparation de charpente). Carpenters replacing damaged rafter section (chevron, panne) with timber splice and metal reinforcement plates, temporary props in place.`,
  'Reparation de Charpente': `VISUAL: Timber roof frame repair. Carpenters replacing damaged rafter section with timber splice.`,
  'Renforcement & Consolidation': `VISUAL: Structural beam reinforcement (Renforcement & Consolidation). Carpenters bolting steel flitch plates (moisement) or heavy solid timber sister beams alongside sagging rafters in attic space.`,
  'Renforcement et Consolidation': `VISUAL: Structural beam reinforcement. Bolting steel plates or sister beams alongside rafters.`,
  'Modification de Fermette': `VISUAL: W-truss attic modification (Modification de fermette). Carpenters installing heavy timber tie beams (entraits porteurs), posts and steel gusset plates before cutting W-diagonals to create open living space in attic.`,
  'Aménagement de Combles': `VISUAL: Attic space conversion (Aménagement de combles). Insulated roof under-slope with wood fiber/glass wool between rafters, wooden floor joists being leveled, roof window providing daylight, carpenters in workwear.`,
  'Amenagement de Combles': `VISUAL: Attic space conversion. Insulated roof under-slope, floor joists being leveled, roof window.`,
  'Surélévation de Toiture': `VISUAL: Vertical roof elevation (Surélévation de toiture en ossature bois). Prefabricated timber frame wall panels (murs ossature bois) being hoisted and bolted on top of existing house structure, carpenters with safety harnesses.`,
  'Surelevation de Toiture': `VISUAL: Vertical roof elevation. Timber frame wall panels being assembled on top of house structure.`,
  'Extension & Ossature Bois': `VISUAL: Timber frame home extension (Extension & Ossature bois). Wood stud walls with OSB sheathing and breathable membrane (pare-pluie) being erected on concrete slab by carpenters with framing nailers.`,
  'Extension et Ossature Bois': `VISUAL: Timber frame home extension. Wood stud walls with OSB sheathing being erected on slab.`,
  'Charpente Traditionnelle': `VISUAL: Traditional heavy timber roof framing (Charpente traditionnelle). Solid oak or Douglas fir heavy truss (ferme traditionnelle avec arbalétrier, poinçon, entraits et pannes) being assembled with mortise-and-tenon joints and wooden pegs.`,
  'Charpente Neuve & Levage': `VISUAL: New roof frame construction & timber hoisting (Charpente neuve & levage). Crane or telehandler lifting prefabricated roof truss onto new house walls, carpenters in hard hats and harnesses guiding and fastening rafters into place.`,
  'Charpente Neuve et Levage': `VISUAL: New roof frame construction & timber hoisting. Crane lifting prefabricated roof truss onto walls.`,
  'Plancher, Solivage & Mezzanine': `VISUAL: Floor joists & timber mezzanine (Plancher, Solivage & Mezzanine). Carpenters laying heavy timber joists (solives bois massif ou lamellé-collé) spaced evenly with joist hangers, fitting tongue-and-groove flooring panels.`,
  'Plancher, Solivage et Mezzanine': `VISUAL: Floor joists & timber mezzanine. Laying timber joists and fitting tongue-and-groove flooring.`,
  'Bardage Bois & Isolation Extérieure': `VISUAL: Timber cladding & external insulation (Bardage bois & isolation extérieure). Carpenters mounting horizontal/vertical timber cladding battens (bardage mélèze, douglas ou red cedar) over insulation boards and black rainscreen membrane on exterior facade.`,
  'Bardage Bois et Isolation Extérieure': `VISUAL: Timber cladding & external insulation. Mounting timber cladding battens over insulation boards.`,
  'Terrasse Bois': `VISUAL: Outdoor timber decking (Terrasse bois). Carpenters assembling wooden substructure joists (lambourdes sur plots réglables) and screwing exotic wood or composite deck boards with stainless steel deck screws.`,
  'Carport, Pergola & Abris': `VISUAL: Custom timber carport & pergola shelter (Carport, Pergola & Abris). Carpenters assembling heavy timber posts, rafters and open slatted timber roof canopy in garden or driveway.`,
  'Carport, Pergola et Abris': `VISUAL: Custom timber carport & pergola shelter. Assembling timber posts and rafters for outdoor pergola.`,
  'Lucarne & Fenêtre de Toit': `VISUAL: Roof dormer & skylight installation (Lucarne & Fenêtre de toit). Carpenters creating opening in roof timber frame (chevêtre de toiture), installing timber dormer structure (lucarne capucine ou jacobine) or fitting a VELUX roof window with flashing kit.`,
  'Lucarne et Fenêtre de Toit': `VISUAL: Roof dormer & skylight installation. Installing timber dormer structure or roof window.`,

  // ── SITES ÉTANCHÉITÉ (5 services officiels) ──
  'Étanchéité de toit-terrasse & toit plat': `VISUAL: Flat roof & roof terrace waterproofing (Étanchéité de toit-terrasse & toit plat). Waterproofing artisan unrolling dark bitumen membrane or grey EPDM synthetic sheet on 100% FLAT rooftop with low parapet wall (acrotère), welding seams with propane blowtorch or hot-air welder.`,
  'Étanchéité de toit-terrasse et toit plat': `VISUAL: Flat roof waterproofing. Unrolling EPDM membrane or bitumen sheet on 100% flat rooftop.`,
  'Recherche de fuite & réparation d\'infiltration': `VISUAL: Leak detection & infiltration repair (Recherche de fuite & réparation d'infiltration). Technician using non-destructive inspection equipment (smoke generator machine, tracer gas probe or thermal camera) on flat roof terrace to pinpoint water leak, targeted sealant patch applied.`,
  'Recherche de fuite et réparation d\'infiltration': `VISUAL: Leak detection & infiltration repair. Using inspection equipment on flat roof terrace, targeted patch applied.`,
  'Étanchéité sous carrelage & terrasse carrelée': `VISUAL: Under-tile waterproofing for outdoor terrace/balcony (Étanchéité sous carrelage & terrasse carrelée). Artisan using roller or notched trowel to apply waterproof elastomeric liquid resin (SEL) with reinforcing fiberglass mesh tape in wall-to-floor corners before tiling.`,
  'Étanchéité sous carrelage et terrasse carrelée': `VISUAL: Under-tile waterproofing. Applying liquid resin membrane (SEL) with roller and corner sealing strips.`,
  'Réfection complète d\'étanchéité': `VISUAL: Complete flat roof waterproofing refurbishment (Réfection complète d'étanchéité). Complete tear-off of old degraded roofing and installation of a new multi-ply bituminous waterproofing system with new aluminum perimeter flashing (couvertine d'acrotère) on 100% flat rooftop.`,
  'Refection complete d\'etancheite': `VISUAL: Complete flat roof waterproofing refurbishment on 100% flat rooftop.`,
  'Étanchéité & isolation de toiture-terrasse': `VISUAL: Flat roof thermal insulation & waterproofing (Étanchéité & isolation de toiture-terrasse). Rigid insulation foam boards (panneaux isolants PIR/polyuréthane) neatly laid across flat rooftop concrete slab, covered by two-layer bituminous waterproofing membrane welded with torch.`,
  'Étanchéité et isolation de toiture-terrasse': `VISUAL: Flat roof insulation boards and waterproofing membrane installation on concrete flat roof deck.`,

  // ── SITES ÉLAGAGE & PAYSAGISTE (6 services officiels) ──
  'Élagage d\'arbre': `VISUAL: Tree pruning & trimming (Élagage d'arbre). FOR GARDEN TREES (<5m): Gardener standing on a double A-frame garden stepladder or ground level using hand pruning saw or pole pruner, MANDATORY safety glasses, NO climbing ropes or heavy harnesses. FOR TALL TREES (>8m): Certified arborist high in upper canopy crotch with climbing harness and rope anchor, ground assistant holding guideline.`,
  'Elagage d\'arbre': `VISUAL: Tree pruning & trimming (Élagage d'arbre). Gardener standing on double A-frame garden stepladder with hand saw, or climber in tall tree.`,
  'Élagage arbre': `VISUAL: Tree pruning & trimming. Small/medium garden tree pruned with hand saw on stepladder.`,
  'Elagage arbre': `VISUAL: Tree pruning & trimming. Small/medium garden tree pruned with hand saw on stepladder.`,
  'Abattage d\'arbre': `VISUAL: Tree felling & removal (Abattage d'arbre). Certified tree surgeon standing at trunk base operating professional chainsaw with chainsaw protection trousers, helmet with face shield and ear defenders. Assistant at safe perimeter distance, clean directional felling notch or sectioned timber logs neatly stacked on ground.`,
  'Abattage d\'arbre ': `VISUAL: Tree felling & removal. Chainsaw operator beside trunk, protective gear, clean timber logs on ground.`,
  'Abattage arbre': `VISUAL: Tree felling & removal. Chainsaw operator beside trunk, protective gear, clean timber logs on ground.`,
  'Taille d\'haies': `VISUAL: Hedge trimming & shaping (Taille d'haies). Exactly 2 gardeners working along a tall manicured garden hedge (thuja, laurel or privet). One gardener operating a professional gas/battery hedge trimmer while standing on a sturdy double A-frame garden stepladder with safety goggles, second gardener at ground level raking trimmed clippings into large garden waste bags. NEVER: dangerous extension ladder on hedge.`,
  'Taille d\'haie': `VISUAL: Hedge trimming & shaping. Exactly 2 gardeners working in duo on hedge trimming with stepladder and garden bags.`,
  'Taille de haies': `VISUAL: Hedge trimming & shaping. Exactly 2 gardeners working in duo on hedge trimming with stepladder and garden bags.`,
  'Taille de haie': `VISUAL: Hedge trimming & shaping. Exactly 2 gardeners working in duo on hedge trimming with stepladder and garden bags.`,
  'Dessouchage': `VISUAL: Tree stump grinding & removal (Dessouchage). Professional stump grinder machine with spinning tungsten cutting wheel digging into exposed tree stump, operator wearing MANDATORY eye protection goggles and noise-canceling earmuffs, ground assistant with rake, wood chips mulch visible around excavation.`,
  'Rognage de souche': `VISUAL: Tree stump grinding & root extraction. Stump grinder operating on tree stump with flying wood chips and protective goggles.`,
  'Débroussaillage': `VISUAL: Brush clearing & weed mowing (Débroussaillage). Gardener operating heavy-duty brushcutter / clearing saw with metal blade or heavy string trimmer head, full face protective mesh shield, safety goggles, ear defenders, harness and protective gaiters/chaps clearing overgrown brambles, tall wild grass and scrub from garden or field perimeter.`,
  'Debroussaillage': `VISUAL: Brush clearing & weed mowing. Gardener operating heavy-duty brushcutter with full protective gear clearing overgrown weeds and brambles.`,
  'Paysagisme': `VISUAL: Landscaping & garden design (Paysagisme). Landscape gardeners creating fresh ornamental flower beds, planting decorative shrubs and perennial flowers, spreading dark mulch bark, laying natural stone garden pathway edging or rolling fresh green lawn turf on prepared soil.`,
  'Aménagement paysager': `VISUAL: Landscaping & garden design. Creating garden flower beds, planting shrubs and stone pathway edging.`,
  'Amenagement paysager': `VISUAL: Landscaping & garden design. Creating garden flower beds, planting shrubs and stone pathway edging.`,
  'Paysagiste': `VISUAL: Landscaping & garden design. Landscapers planting shrubs, spreading mulch and laying lawn turf.`,

  // Autres métiers
  'Reparation toiture': `VISUAL: Roof repair on house. Roofers working safely from scaffolding along roof edge OR at ground level handling terracotta tiles. ABSOLUTE PROHIBITION: NO worker climbing tall straight extension ladders leaning against roof slope!`,
  'Renovation tuiles toiture': `VISUAL: Roofers with scaffolding or at ground level handling terracotta tiles for roof maintenance. ABSOLUTE PROHIBITION: NO worker standing freely on steep sloped roof without scaffold!`,
  'Changement tuiles': `VISUAL: Targeted tile replacement. Roofers at ground level preparing new terracotta tiles or working from roofer scaffold.`,
  'Reparation tuiles': `VISUAL: Targeted tile repair. Roofers at ground level handling terracotta tiles or on roofer scaffold.`,
  'Remplacement tuiles': `VISUAL: Targeted tile replacement. Roofers at ground level handling tiles or on roofer scaffold.`,
  'Charpente': `VISUAL: Wooden roof trusses or rafters visible, minimum 2 carpenters working with circular saw or nail gun, safety harness connected, hard hats mandatory.`,
  'Taille arbre haute tige': `VISUAL: TALL TREE (Arbre haute tige > 8m): MANDATORY SAFETY GLASSES on climber and assistant. Arborist climbing harness + ropes anchored high in main crotch.`,
  'Elalgage en hauteur': `VISUAL: TALL TREE (High-canopy > 8m): Climbing harness + ropes anchored high in main crotch. Minimum 2 workers.`,
  'Mur parpaing': `VISUAL: Grey concrete blocks, worker at ground level, trowel and mortar visible.`,
  'Mur brique': `VISUAL: Red or orange bricks, mortar between joints, worker laying bricks at ground level.`,
  'Rejointoiement': `VISUAL: Joints between elements visible, grouting gun or trowel in use, no paint on facade.`,
  'Rejointoiement pierre': `VISUAL: Natural stone wall, targeted joints, mortar tool visible.`,
  'Coulage dalle': `VISUAL: Liquid concrete being poured, wooden formwork, rebar mesh visible, minimum 2 workers, worker NEVER in fresh concrete.`,
  'Dalle beton': `VISUAL: Concrete slab, formwork, rebar or mesh preparation, worker at ground level.`,
  'Terrassement': `VISUAL: Earthworks with yellow compact mini-excavator (mini-pelle) digging or moving soil, laser level tripod standing on side, ground worker with shovel or grade rod.`,
  'Nivellement de Terrain': `VISUAL: Land leveling and grading. Mini-excavator with tilt grading bucket smoothing topsoil, ground worker using laser level receiver staff.`,
  'VRD': `VISUAL: VRD utility trenches (Voirie et Réseaux Divers). Open trench with color-coded utility sheaths laid neatly on sand bed by ground workers.`,
  'Viabilisation de terrain': `VISUAL: Plot serviced with utilities (viabilisation). Deep utility trench connecting property boundary to street, PVC pipes and utility conduit sheaths visible.`,
  'Assainissement Individuel': `VISUAL: Individual sanitation installation. Large excavation pit with all-water septic tank or compact micro-station being positioned.`,
  'Raccordement': `VISUAL: Utility connection trench. Workers connecting PVC sewer pipes or municipal water supply line into street utility pit.`,
  'Fondations': `VISUAL: Strip foundation trenches. Clean trench excavated into solid ground with steel rebar cages placed inside.`,
  'Drainage': `VISUAL: Foundation perimeter drainage. Trench dug around house foundation wall, yellow perforated drainage pipe laid at bottom over geotextile fabric.`,
  'Voie d\'accès, allées et Parking': `VISUAL: Driveway and parking sub-base preparation. Decaissement, white geotextile membrane, heavy layer of crushed gravel being compacted.`,
  'Murs de soutènement': `VISUAL: Retaining wall construction for soil slope. Heavy precast interlocking concrete blocks or gabion wire cages filled with quarry stones.`,
  'Enrochement': `VISUAL: Heavy rock armour / riprap retaining embankment. Tracked excavator placing large quarry boulders along steep slope.`,
  'Terrassement pour piscine': `VISUAL: Swimming pool excavation. Precise rectangular or custom-shaped deep excavation hole dug in residential garden by mini-excavator.`,
  'Peinture salle de bain': `VISUAL: Painter painting bathroom wall or ceiling, moisture-resistant paint, roller, stepladder, drop cloth protecting bathroom tiles and sink.`,
  'Peinture cuisine': `VISUAL: Painter painting kitchen wall, paint roller, masking tape around splashback, drop cloths protecting countertops.`,
  'Peinture chambre': `VISUAL: Painter painting bedroom or living room wall, paint roller, stepladder, paint tray, drop cloth protecting floor.`,
  'Faience': `VISUAL: Wall tiling / ceramic faience splashback being installed in kitchen or bathroom, tile spacers, adhesive trowel.`,
  'Carrelage sol': `VISUAL: Floor tiling installation, tile spacers, spirit level, adhesive mortar, tiler laying floor tile on ground.`,
  'Carrelage salle de bain': `VISUAL: Tiler installing floor or wall ceramic tiles in bathroom, tile spacers, trowel.`,
  'Carrelage cuisine': `VISUAL: Tiler installing kitchen floor tiles or wall splashback, tile spacers, trowel.`,
  'Dessouchage': `VISUAL: MANDATORY SAFETY GLASSES / PROTECTIVE GOGGLES on all workers' eyes against flying wood debris. MANDATORY NOISE-CANCELING EAR PROTECTION on operator. Stump and roots visible.`,
  'Abattage arbre': `VISUAL: Operator beside trunk, chainsaw visible, protective clothing, felled sections on ground.`,
  'Depannage auto': `VISUAL: Flatbed tow truck or recovery vehicle with orange flashing beacons, breakdown car safely positioned on roadside or flatbed ramp.`,
  'Remorquage': `VISUAL: Car being secured onto flatbed tow truck with winch or wheel straps, operator in high-vis vest.`,
  'Changement batterie': `VISUAL: Open car bonnet/hood, portable booster pack or jumper cables, technician in workwear.`,
  'Changement roue': `VISUAL: Car safely parked on roadside, trolley jack under sills, wheel brace or impact wrench in use.`,
  'Debarras maison': `VISUAL: Utility van with open rear doors or skip container, neat stacks of cardboard boxes and old furniture being loaded by mover in work gloves.`,
  'Enlevement encombrants': `VISUAL: Utility truck or van, movers in workwear loading bulky items or boxes from driveway or garage.`,
  'Debarras cave': `VISUAL: Basement or garage clearance in progress, boxes, shelving or old items stacked neatly for loading.`,
  'Remplacement vitrage': `VISUAL: Glazier wearing cut-resistant gloves and safety glasses holding 2 heavy-duty suction cup lifter handles firmly attached to the flat central glass pane surface to position double glazing into frame.`,
  'Reparation vitre': `VISUAL: Glazier wearing protective glasses and cut-resistant gloves holding suction lifter handle attached on central glass surface, applying silicone sealant to frame.`,
  'Pose miroir': `VISUAL: Large mirror being mounted on wall, glazier holding dual suction cup lifters attached flat on mirror surface, wearing safety glasses and gloves.`,
  'Nettoyage terrasse': `VISUAL: Ground level patio/deck cleaning, pressure washer lance or patio cleaner attachment in use, clean wet tiles contrast with uncleaned area.`,
  'Nettoyage facade': `VISUAL: Exterior house wall being washed with pressure lance, visible contrast between clean rendered wall and unwashed section.`,
  'Nettoyage': `VISUAL: High-pressure washer spray lance in use cleaning exterior ground surface or wall, water spray visible.`
};

// Imperfections physiques d'appareil photo smartphone (doigt, verre gras, poussière...)
const CAMERA_IMPERFECTIONS = [
  'slight blur on extreme corner as if a fingertip is partially blocking the lens edge',
  'slightly smudged or greasy lens causing soft light bloom around highlights',
  'subtle dust speck or water droplet mark on the camera lens',
  'minor lens flare and slight overexposure from natural sunlight',
  'slightly crooked horizon and candid hand-held tilt',
];

function getCompositionRules(metier, travaux, etatChantier) {
  const normalize = (s) => (s || '').toLowerCase()
    .replace(/[éèê]/g, 'e').replace(/[àâ]/g, 'a')
    .replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o');
  
  const combined = normalize(metier) + ' ' + normalize(travaux);
  const isDebarras = combined.includes('debarras') || combined.includes('encombrant');
  const isIndoor = ['plomberie', 'electricite', 'peinture', 'carrelage', 'placo', 'parquet', 'serrurerie', 'menuiserie', 'salle de bain', 'cuisine', 'escalier', 'vitrier'].some(t => combined.includes(t));

  let framingRule;
  if (isDebarras) {
    framingRule = 'CLEARANCE FRAMING (Débarras & Encombrants): Photo can be shot EITHER (A) inside an indoor room, apartment or attic/grenier showing cardboard boxes and movers clearing the space (NO truck visible in indoor shot), OR (B) outdoors in front of the property showing a white utility van with OPEN REAR DOORS being loaded with boxes and furniture.';
  } else if (isIndoor) {
    framingRule = 'INDOOR FRAMING: Photo MUST be shot from inside the room itself OR from an adjoining doorway/hallway looking directly into the active work space.';
  } else {
    const rand = Math.random();
    if (rand < 0.80) {
      framingRule = '"client" viewpoint: taken from garden path, driveway or sidewalk, smartphone at chest height, candid framing.';
    } else if (rand < 0.95) {
      framingRule = '"tradesman" viewpoint: normal worksite photo taken by worker or colleague.';
    } else {
      framingRule = `"neighbour" viewpoint: slightly from the side, as if taken discreetly from behind a fence.`;
    }
  }

  // 1 chance sur 3 (33%) d'ajouter une imperfection physique marquée
  const hasDefect = Math.random() < 0.33;
  const cameraDefect = hasDefect
    ? CAMERA_IMPERFECTIONS[Math.floor(Math.random() * CAMERA_IMPERFECTIONS.length)]
    : 'standard realistic smartphone camera quality with natural lighting';

  return {
    showWorker: true, // 100% OBLIGATOIRE : toujours des ouvriers visibles !
    compositionRule: `COMPOSITION & REALISM: ${framingRule} Camera detail: ${cameraDefect}, motion blur on active hands, subtle digital noise in shadows. NEVER too clean, HDR, sharp or perfectly framed.`,
  };
}

function buildRulesBlock(metier, travaux, etatChantier) {
  const lines = [];

  const normalize = (s) => (s || '').toLowerCase()
    .replace(/[éèê]/g, 'e').replace(/[àâ]/g, 'a')
    .replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o')
    .replace(/[ùûü]/g, 'u').replace(/[ç]/g, 'c');

  const metierNorm = normalize(metier);
  const safetyKey = Object.keys(SAFETY_RULES).find(k => metierNorm.includes(normalize(k)));
  if (safetyKey) lines.push(SAFETY_RULES[safetyKey]);

  const travauxNorm = normalize(travaux);
  const visualKey = Object.keys(VISUAL_RULES_BY_SERVICE).find(k =>
    travauxNorm.includes(normalize(k))
  );
  if (visualKey) lines.push(VISUAL_RULES_BY_SERVICE[visualKey]);

  const { compositionRule } = getCompositionRules(metier, travaux, etatChantier);
  lines.push(compositionRule);

  // Distinguer métiers extérieurs dangereux (2+ ouvriers) vs travaux intérieurs (1 ouvrier solo)
  const DANGEROUS_OUTDOOR_TRADES = ['toiture', 'nettoyage_toiture', 'elagage', 'abattage', 'ravalement', 'maconnerie', 'terrassement', 'charpente'];
  const isOutdoorDangerous = DANGEROUS_OUTDOOR_TRADES.some(t => metierNorm.includes(t) || travauxNorm.includes(t));

  const INDOOR_TRADES = ['plomberie', 'electricite', 'peinture', 'carrelage', 'placo', 'parquet', 'serrurerie', 'menuiserie', 'salle de bain', 'cuisine', 'debarras', 'encombrants', 'demenagement', 'vitrier'];
  const isIndoor = INDOOR_TRADES.some(t => metierNorm.includes(t) || travauxNorm.includes(t));

  // Alternance aléatoire du couvre-chef quand le casque n'est pas obligatoire (tête nue / casquette / bonnet / chapeau)
  const headwearOptions = ['bare head (no hat)', 'casual work cap / baseball cap', 'work beanie', 'casual sun hat'];
  const randomHeadwear = headwearOptions[Math.floor(Math.random() * headwearOptions.length)];

  if (isOutdoorDangerous) {
    const isPublicRoad = metierNorm.includes('depannage') || metierNorm.includes('remorquage') || travauxNorm.includes('depannage') || travauxNorm.includes('remorquage') || travauxNorm.includes('voie publique') || travauxNorm.includes('trottoir');
    const vestRule = isPublicRoad 
      ? 'High-visibility safety vests (yellow/orange) MANDATORY for road breakdown / public highway work.' 
      : 'NO HIGH-VIS SAFETY VESTS! Workers wear normal professional workwear (polo, t-shirt, work jacket, work trousers). Do NOT put yellow/orange safety vests on private property workers.';
    lines.push(`WORKER MANDATE (Outdoor/High Risk): Minimum 2 active workers visible in realistic professional workwear. ${vestRule} One operating main tools, second assisting or securing. Both rendered in realistic working postures.`);
  } else if (isIndoor) {
    const isMasonry = metierNorm.includes('maconnerie') || travauxNorm.includes('maconnerie');
    const isGlazier = metierNorm.includes('vitrier') || travauxNorm.includes('vitrier');
    
    let helmetRule;
    if (isMasonry) {
      helmetRule = 'Hard hat / safety helmet MANDATORY for masonry.';
    } else if (isGlazier) {
      helmetRule = `NO HARD HAT on head! Headwear: ${randomHeadwear}. BUT safety glasses/goggles and cut-resistant gloves are MANDATORY for glazier.`;
    } else {
      helmetRule = `NO HARD HAT / NO SAFETY HELMET on head! Headwear: ${randomHeadwear}. Wearing neat normal professional workwear (t-shirt/polo/trousers). NEVER put a hard hat on an indoor plumber, painter, tiler, electrician, carpenter or mover.`;
    }
    
    lines.push(`WORKER MANDATE (Indoor Renovation & Clearance): 1 or 2 active professional artisans/movers visible inside the room, adjoining doorway, or near the van/truck outside. ${helmetRule} NO safety vests.`);
  } else {
    lines.push(`WORKER MANDATE: 1 or 2 active workers visible in realistic workwear. Headwear: ${randomHeadwear}. (NO safety vests unless on public road), operating equipment naturally.`);
  }

  return lines.length > 0 ? `\n\n---\n${lines.join('\n')}` : '';
}

module.exports = { buildRulesBlock };
