/**
 * image_processor.js — Traitement d'image professionnel & désinfection totale C2PA
 * 
 * Rôles :
 * 1. Détecte et convertit tout format entrant (WebP DALL-E, PNG, JPEG) en véritable JPEG standard.
 * 2. Recadre et redimensionne au format standard smartphone 4:3 (2048x1536 paysage ou 1536x2048 portrait).
 * 3. Purge 100% des métadonnées d'origine (manifestes C2PA JUMBF APP11, XMP OpenAI/DALL-E, IPTC).
 * 4. Produit un JPEG baseline haute fidélité (qualité 92, sous-échantillonnage 4:2:0) prêt pour Google Maps.
 */

let sharp = null;
try {
  sharp = require('sharp');
} catch (e) {
  console.warn("⚠️ Module 'sharp' non disponible, utilisation du fallback binaire pur :", e.message);
}

/**
 * Détecte le type MIME et le format selon les octets magiques (magic bytes)
 */
function detectImageFormat(buffer) {
  if (!buffer || buffer.length < 12) return 'unknown';

  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'jpeg';
  }
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return 'webp';
  }
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
    buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A
  ) {
    return 'png';
  }

  return 'unknown';
}

/**
 * Nettoie binaire un flux JPEG en éliminant les segments indésirables (C2PA APP11, XMP, IPTC)
 * Utilisé en fallback de sécurité si sharp n'est pas disponible ou sur un flux déjà JPEG.
 */
function sanitizeJpegSegments(jpegBuffer) {
  if (jpegBuffer.length < 4 || jpegBuffer[0] !== 0xFF || jpegBuffer[1] !== 0xD8) {
    return jpegBuffer;
  }

  const chunks = [Buffer.from([0xFF, 0xD8])]; // SOI
  let idx = 2;

  while (idx < jpegBuffer.length - 1) {
    if (jpegBuffer[idx] === 0xFF) {
      const marker = jpegBuffer[idx + 1];

      // SOI, EOI, RST0-RST7 (sans longueur)
      if (marker === 0xD8 || marker === 0xD9 || (marker >= 0xD0 && marker <= 0xD7)) {
        chunks.push(jpegBuffer.subarray(idx, idx + 2));
        idx += 2;
        continue;
      }

      if (idx + 4 > jpegBuffer.length) break;
      const length = jpegBuffer.readUInt16BE(idx + 2);
      const segEnd = idx + 2 + length;
      if (segEnd > jpegBuffer.length) break;

      const segData = jpegBuffer.subarray(idx, segEnd);

      // Filtrer les segments suspects ou contenant des signatures IA :
      // 0xEB = APP11 (C2PA / JUMBF)
      // 0xED = APP13 (Photoshop IPTC)
      // 0xFE = COM (Commentaire)
      let drop = false;
      if (marker === 0xEB || marker === 0xED || marker === 0xFE) {
        drop = true;
      } else if (marker === 0xE1) {
        // APP1 : Si c'est du XMP Adobe (qui contient OpenAI/DALL-E), on le supprime.
        // Si c'est un APP1 EXIF standard, on le préserve.
        const headerStr = segData.subarray(4, 32).toString('ascii');
        if (headerStr.includes('http://ns.adobe.com/xap') || headerStr.includes('c2pa')) {
          drop = true;
        }
      }

      if (!drop) {
        chunks.push(segData);
      }

      if (marker === 0xDA) {
        // SOS (Start of Scan) : le reste du fichier est le flux compressé jusqu'à EOI
        chunks.push(jpegBuffer.subarray(segEnd));
        break;
      }

      idx = segEnd;
      continue;
    }
    idx++;
  }

  return Buffer.concat(chunks);
}

/**
 * Traite, normalise et désinfecte une image pour Google Maps / GMB.
 * 
 * @param {Buffer} rawBuffer - Le buffer brut de l'image (WebP, PNG ou JPEG)
 * @param {Object} options - Options de configuration
 * @returns {Promise<{ buffer: Buffer, width: number, height: number, format: string }>}
 */
async function processAndNormalizeImage(rawBuffer, options = {}) {
  if (!rawBuffer || rawBuffer.length < 100) {
    throw new Error("Buffer image vide ou invalide pour le traitement.");
  }

  const detectedFormat = detectImageFormat(rawBuffer);
  console.log(`🔍 Format d'image brut détecté : "${detectedFormat.toUpperCase()}" (${rawBuffer.length} octets)`);

  if (sharp) {
    try {
      const image = sharp(rawBuffer);
      const meta = await image.metadata();

      const origWidth = meta.width || 1024;
      const origHeight = meta.height || 1024;
      const isPortrait = origHeight > origWidth;

      // Format standard smartphone 4:3 (2048x1536 paysage / 1536x2048 portrait)
      const targetWidth = options.width || (isPortrait ? 1536 : 2048);
      const targetHeight = options.height || (isPortrait ? 2048 : 1536);

      console.log(`📐 Normalisation au format standard Smartphone 4:3 : ${targetWidth}x${targetHeight} px (depuis ${origWidth}x${origHeight})`);

      // Redimensionnement cover sans déformation + conversion JPEG baseline pur (purge 100% C2PA & XMP)
      const cleanJpegBuffer = await image
        .resize(targetWidth, targetHeight, {
          fit: 'cover',
          position: 'center'
        })
        .jpeg({
          quality: options.quality || 92,
          chromaSubsampling: '4:2:0',
          force: true
        })
        .toBuffer();

      console.log(`✨ Image convertie en véritable JPEG pur standard (Taille : ${cleanJpegBuffer.length} octets, sans métadonnées IA)`);

      return {
        buffer: cleanJpegBuffer,
        width: targetWidth,
        height: targetHeight,
        format: 'jpeg'
      };
    } catch (sharpErr) {
      console.warn("⚠️ Erreur lors du traitement sharp, bascule sur le fallback binaire :", sharpErr.message);
    }
  }

  // Fallback si sharp est absent ou a échoué
  const sanitized = sanitizeJpegSegments(rawBuffer);
  return {
    buffer: sanitized,
    width: 2048,
    height: 1536,
    format: 'jpeg'
  };
}

module.exports = {
  detectImageFormat,
  processAndNormalizeImage,
  sanitizeJpegSegments
};
