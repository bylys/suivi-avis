/**
 * geocoding.js — Obtenir la latitude/longitude exacte d'une ville (France ou International)
 */

const KNOWN_CITIES = {
  'nantes': { lat: 47.218371, lng: -1.553621 },
  'quimper': { lat: 48.000000, lng: -4.100000 },
  'valence': { lat: 44.933333, lng: 4.891667 },
  'lyon': { lat: 45.764043, lng: 4.835659 },
  'bordeaux': { lat: 44.837789, lng: -0.579180 },
  'merignac': { lat: 44.838500, lng: -0.644100 },
  'mérignac': { lat: 44.838500, lng: -0.644100 },
  'pessac': { lat: 44.806700, lng: -0.631100 },
  'talence': { lat: 44.807800, lng: -0.590800 },
  'begles': { lat: 44.808600, lng: -0.548900 },
  'bègles': { lat: 44.808600, lng: -0.548900 },
  'villenave-d\'ornon': { lat: 44.773100, lng: -0.556400 },
  'lille': { lat: 50.629250, lng: 3.057256 },
  'paris': { lat: 48.856614, lng: 2.352222 },
  'marseille': { lat: 43.296482, lng: 5.369780 },
  'toulouse': { lat: 43.604652, lng: 1.444209 },
  'nice': { lat: 43.710173, lng: 7.261953 },
  'strasbourg': { lat: 48.573405, lng: 7.752111 },
  'montpellier': { lat: 43.610769, lng: 3.876716 },
  'rennes': { lat: 48.117266, lng: -1.677793 },
  'grenoble': { lat: 45.188529, lng: 5.724524 },
  'rouen': { lat: 49.443232, lng: 1.099971 },
  'toulon': { lat: 43.124228, lng: 5.928000 },
  'angers': { lat: 47.478419, lng: -0.563166 },
  'dijon': { lat: 47.322047, lng: 5.041480 },
  'brest': { lat: 48.390394, lng: -4.486076 },
  'augusta': { lat: 33.473498, lng: -82.010515 },
  'atlanta': { lat: 33.748995, lng: -84.387982 },
  'dallas': { lat: 32.776664, lng: -96.796988 },
  'miami': { lat: 25.761680, lng: -80.191790 },
};

async function getCoordinatesForCity(cityName, country = 'France') {
  if (!cityName) return { lat: 48.856614, lng: 2.352222 };

  const normCity = cityName.toLowerCase().trim()
    .replace(/[éèê]/g, 'e').replace(/[àâ]/g, 'a')
    .replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o')
    .replace(/[ùûü]/g, 'u').replace(/[ç]/g, 'c');

  if (KNOWN_CITIES[normCity]) {
    // Ajouter un tout petit décalage aléatoire (100-300m) pour simuler la rue du chantier
    const jitterLat = (Math.random() - 0.5) * 0.005;
    const jitterLng = (Math.random() - 0.5) * 0.005;
    return {
      lat: KNOWN_CITIES[normCity].lat + jitterLat,
      lng: KNOWN_CITIES[normCity].lng + jitterLng,
    };
  }

  // Si la ville n'est pas dans la liste pré-enregistrée, géocodage OpenStreetMap Nominatim
  try {
    const query = encodeURIComponent(`${cityName}, ${country}`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`, {
      headers: { 'User-Agent': 'GMBImageAgent/1.0' }
    });
    const data = await res.json();
    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      return { lat, lng };
    }
  } catch (e) {
    console.log("Note geocoding API :", e.message);
  }

  // Fallback Paris par défaut si introuvable
  return { lat: 48.856614, lng: 2.352222 };
}

module.exports = { getCoordinatesForCity };
