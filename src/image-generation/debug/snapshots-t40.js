/**
 * debug/snapshots-t40.js
 * Généré en Phase 0 — référence déterministe de buildDallePromptV2.
 * Ces hashes servent de baseline pour T40 : toute régression dans la
 * construction du prompt doit faire échouer T40 AVANT les tests réels.
 *
 * Méthode de hash : somme polynomiale 32 bits sur le JSON complet retourné
 * par buildDallePromptV2(row) avec les rows ci-dessous.
 *
 * NE PAS MODIFIER MANUELLEMENT — régénérer via _regenerateT40Snapshots()
 * si un changement intentionnel de prompt est validé.
 */

// Snapshots Phase 0 — générés le 2026-07-15
const T40_SNAPSHOTS = [
  { metier: 'toiture',        travaux: 'nettoyage gouttières',      contexte: 'maison',      etat: 'encours', ville: 'Paris', promptLen: 1552, promptHash: 43274611,   setting: 'exterior', matched_key: 'toiture'        },
  { metier: 'toiture',        travaux: 'Remplacement de tuiles',     contexte: 'maison',      etat: 'encours', ville: 'Paris', promptLen: 1554, promptHash: 3368667565,  setting: 'exterior', matched_key: 'toiture'        },
  { metier: 'plomberie',      travaux: 'Débouchage canalisation',    contexte: 'appartement', etat: 'encours', ville: 'Paris', promptLen: 1484, promptHash: 2256962858,  setting: 'interior', matched_key: 'plomberie'      },
  { metier: 'plomberie',      travaux: "Fuite d'eau",                contexte: 'maison',      etat: 'debut',   ville: 'Paris', promptLen: 1433, promptHash: 3041528330,  setting: 'interior', matched_key: 'plomberie'      },
  { metier: 'électricité',    travaux: 'Mise aux normes électrique', contexte: 'appartement', etat: 'encours', ville: 'Paris', promptLen: 1453, promptHash: 2218385127,  setting: 'interior', matched_key: 'électricité'    },
  { metier: 'depannage_auto', travaux: 'batterie à plat',            contexte: 'domicile',    etat: 'encours', ville: 'Paris', promptLen: 1693, promptHash: 1388930690,  setting: 'exterior', matched_key: 'depannage_auto' },
  { metier: 'peinture',       travaux: 'Peinture intérieure',        contexte: 'appartement', etat: 'encours', ville: 'Paris', promptLen: 1931, promptHash: 3906628003,  setting: 'interior', matched_key: 'peinture'       },
  { metier: 'maçonnerie',     travaux: 'Réfection enduit façade',    contexte: 'maison',      etat: 'encours', ville: 'Paris', promptLen: 1497, promptHash: 590334808,   setting: 'exterior', matched_key: 'maçonnerie'     },
];
