/**
 * services/index.js — Phase 2 shadow copy (source active : app.js)
 * Assemblage des registres partiels avec détection de collision.
 * Ne pas modifier avant le cutover validé.
 */

import { WORK_SCENES_ARBORISTE,      SITE_REALISM_ARBORISTE      } from './arboriste.js';
import { WORK_SCENES_ROOF,           SITE_REALISM_ROOF           } from './roof.js';
import { WORK_SCENES_ETANCHEITE,     SITE_REALISM_ETANCHEITE     } from './etancheite.js';
import { WORK_SCENES_FACADE,         SITE_REALISM_FACADE         } from './facade.js';
import { WORK_SCENES_PAYSAGISTE,     SITE_REALISM_PAYSAGISTE     } from './paysagiste.js';
import { WORK_SCENES_GROS_OEUVRE,    SITE_REALISM_GROS_OEUVRE    } from './gros-oeuvre.js';
import { WORK_SCENES_CARRELAGE,      SITE_REALISM_CARRELAGE      } from './carrelage.js';
import { WORK_SCENES_FINISHING,      SITE_REALISM_FINISHING      } from './finishing.js';
import { WORK_SCENES_TECHNICAL_TRADES, SITE_REALISM_TECHNICAL_TRADES } from './technical-trades.js';
import { WORK_SCENES_DEPANNAGE_AUTO, SITE_REALISM_DEPANNAGE_AUTO } from './depannage-auto.js';

function mergeRegistriesStrict(registryName, entries) {
  const output = {};
  for (const [moduleName, registry] of entries) {
    for (const [key, value] of Object.entries(registry)) {
      if (Object.prototype.hasOwnProperty.call(output, key)) {
        throw new Error(
          `[DUPLICATE_SERVICE_REGISTRY_KEY] ` +
          `registry=${registryName} key=${key} module=${moduleName}`
        );
      }
      output[key] = value;
    }
  }
  return output;
}

export const WORK_SCENES = mergeRegistriesStrict('WORK_SCENES', [
  ['arboriste',        WORK_SCENES_ARBORISTE],
  ['roof',             WORK_SCENES_ROOF],
  ['etancheite',       WORK_SCENES_ETANCHEITE],
  ['facade',           WORK_SCENES_FACADE],
  ['paysagiste',       WORK_SCENES_PAYSAGISTE],
  ['gros-oeuvre',      WORK_SCENES_GROS_OEUVRE],
  ['carrelage',        WORK_SCENES_CARRELAGE],
  ['finishing',        WORK_SCENES_FINISHING],
  ['technical-trades', WORK_SCENES_TECHNICAL_TRADES],
  ['depannage-auto',   WORK_SCENES_DEPANNAGE_AUTO],
]);

export const SITE_REALISM = mergeRegistriesStrict('SITE_REALISM', [
  ['arboriste',        SITE_REALISM_ARBORISTE],
  ['roof',             SITE_REALISM_ROOF],
  ['etancheite',       SITE_REALISM_ETANCHEITE],
  ['facade',           SITE_REALISM_FACADE],
  ['paysagiste',       SITE_REALISM_PAYSAGISTE],
  ['gros-oeuvre',      SITE_REALISM_GROS_OEUVRE],
  ['carrelage',        SITE_REALISM_CARRELAGE],
  ['finishing',        SITE_REALISM_FINISHING],
  ['technical-trades', SITE_REALISM_TECHNICAL_TRADES],
  ['depannage-auto',   SITE_REALISM_DEPANNAGE_AUTO],
]);

export function assertServiceRegistriesIntegrity() {
  const wsKeys = Object.keys(WORK_SCENES);
  const srKeys = Object.keys(SITE_REALISM);
  const errors = [];

  // Each module must export both a WS and SR partial
  for (const k of wsKeys) {
    if (typeof WORK_SCENES[k] !== 'object' || WORK_SCENES[k] === null)
      errors.push(`WORK_SCENES.${k} is not an object`);
  }
  for (const k of srKeys) {
    if (typeof SITE_REALISM[k] !== 'object' || SITE_REALISM[k] === null)
      errors.push(`SITE_REALISM.${k} is not an object`);
  }

  // Both registries must have the same key count
  if (wsKeys.length !== srKeys.length)
    errors.push(`Key count mismatch: WORK_SCENES=${wsKeys.length} SITE_REALISM=${srKeys.length}`);

  if (errors.length) throw new Error(`[SERVICE_REGISTRY_INTEGRITY] ${errors.join('; ')}`);
  return { ok: true, wsKeys: wsKeys.length, srKeys: srKeys.length };
}
