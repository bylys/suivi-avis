/**
 * config/vehicles.js — Phase 1 shadow copy (source active : app.js)
 * Copie stricte de PROFESSIONAL_VEHICLE_RULES (app.js lignes 11370–11387).
 * Ne pas modifier avant le cutover validé.
 */

const PROFESSIONAL_VEHICLE_RULES = {
  toiture:            { types: ['white utility van', 'pickup with roof rack'],            dist: { clearly_visible: 35, partially_visible: 25, absent: 40 } },
  etancheite:         { types: ['flat-bed lorry with membrane rolls', 'utility van'],      dist: { clearly_visible: 30, partially_visible: 25, absent: 45 } },
  nettoyage_toiture:  { types: ['utility van with pressure washer'],                       dist: { clearly_visible: 30, partially_visible: 25, absent: 45 } },
  nettoyage_gouttieres:{ types: ['utility van with ladder rack'],                          dist: { clearly_visible: 25, partially_visible: 25, absent: 50 } },
  elagage:            { types: ['arborist van', 'chipper truck', 'trailer with branches'], dist: { clearly_visible: 40, partially_visible: 30, absent: 30 } },
  abattage:           { types: ['arborist van', 'log trailer', 'chipper truck'],           dist: { clearly_visible: 40, partially_visible: 30, absent: 30 } },
  paysagiste:         { types: ['landscape van', 'trailer with mower'],                    dist: { clearly_visible: 35, partially_visible: 25, absent: 40 } },
  peinture:           { types: ['painter decorator van'],                                  dist: { clearly_visible: 20, partially_visible: 25, absent: 55 } },
  terrassement:       { types: ['mini-excavator on trailer', 'tipper lorry'],              dist: { clearly_visible: 50, partially_visible: 20, absent: 30 } },
  maconnerie:         { types: ['builder utility van', 'pickup with material'],            dist: { clearly_visible: 30, partially_visible: 25, absent: 45 } },
  vitrier:            { types: ['glazier van with A-frame glass rack'],                    dist: { clearly_visible: 35, partially_visible: 30, absent: 35 } },
  nettoyage:          { types: ['cleaning company van'],                                   dist: { clearly_visible: 20, partially_visible: 20, absent: 60 } },
  ravalement:         { types: ['scaffold lorry', 'builder utility van'],                  dist: { clearly_visible: 30, partially_visible: 25, absent: 45 } },
  carrelage:          { types: ['tiler van', 'small utility van'],                         dist: { clearly_visible: 15, partially_visible: 20, absent: 65 } },
  debarras:           { types: ['removal van', 'skip lorry', 'tipper van'],                dist: { clearly_visible: 40, partially_visible: 20, absent: 40 } },
  depannage_auto:     { types: ['breakdown recovery van', 'flatbed tow truck'],            dist: { clearly_visible: 40, partially_visible: 25, absent: 35 } },
};

export { PROFESSIONAL_VEHICLE_RULES };
