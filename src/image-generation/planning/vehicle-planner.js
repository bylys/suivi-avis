/**
 * planning/vehicle-planner.js — Phase 4 shadow copy (source active : app.js)
 * Sélection déterministe de la présence du véhicule professionnel.
 * Extrait de la logique inline de _planGlobalBatch.
 * Ne pas modifier avant le cutover validé.
 */

import { PROFESSIONAL_VEHICLE_RULES } from '../config/vehicles.js';

function _selectVehiclePresence(comp, metier, pvRoll) {
  const pvR = PROFESSIONAL_VEHICLE_RULES[metier] || {};
  const d   = pvR.dist || { clearly_visible: 35, partially_visible: 25, absent: 40 };
  if      (comp === 'vehicle_arrival')        return 'clearly_visible';
  else if (comp === 'equipment_from_vehicle') return pvRoll < 70 ? 'clearly_visible' : 'partially_visible';
  else if (comp === 'close_detail')           return pvRoll < 85 ? 'absent' : 'partially_visible';
  else return pvRoll < d.clearly_visible                          ? 'clearly_visible'
            : pvRoll < (d.clearly_visible + d.partially_visible) ? 'partially_visible'
            : 'absent';
}

export { _selectVehiclePresence };
