/**
 * exif.js — Génération et injection des métadonnées EXIF Smartphone & GPS
 * Conforme aux standards Google Maps / Google My Business (émulation photo mobile réelle)
 */

const piexif = require('piexifjs');
const { getCoordinatesForCity } = require('./geocoding');
const { processAndNormalizeImage, detectImageFormat } = require('./image_processor');

const IPHONE_MODELS = [
  { make: 'Apple', model: 'iPhone 13', software: '16.5', focalLength: [51, 10], fNumber: [16, 10], focal35: 26 },
  { make: 'Apple', model: 'iPhone 14', software: '16.6', focalLength: [57, 10], fNumber: [15, 10], focal35: 26 },
  { make: 'Apple', model: 'iPhone 14 Pro', software: '17.0', focalLength: [68, 10], fNumber: [178, 100], focal35: 24 },
  { make: 'Apple', model: 'iPhone 15', software: '17.2', focalLength: [60, 10], fNumber: [16, 10], focal35: 26 },
  { make: 'Apple', model: 'iPhone 15 Pro', software: '17.5', focalLength: [68, 10], fNumber: [178, 100], focal35: 24 },
  { make: 'Apple', model: 'iPhone 16', software: '18.0', focalLength: [60, 10], fNumber: [16, 10], focal35: 26 },
  { make: 'Apple', model: 'iPhone 16 Pro', software: '18.0', focalLength: [68, 10], fNumber: [178, 100], focal35: 24 },
];

const SAMSUNG_MODELS = [
  { make: 'Samsung', model: 'Galaxy S22', software: 'S901BXXU2BVJA', focalLength: [54, 10], fNumber: [18, 10], focal35: 23 },
  { make: 'Samsung', model: 'Galaxy S23', software: 'S911BXXU1AWA6', focalLength: [54, 10], fNumber: [18, 10], focal35: 23 },
  { make: 'Samsung', model: 'Galaxy S24', software: 'S921BXXU1AXB5', focalLength: [54, 10], fNumber: [18, 10], focal35: 23 },
  { make: 'Samsung', model: 'Galaxy A54 5G', software: 'A546BXXU2AWB3', focalLength: [52, 10], fNumber: [18, 10], focal35: 24 },
  { make: 'Samsung', model: 'Galaxy A55 5G', software: 'A556BXXU1AXB8', focalLength: [52, 10], fNumber: [18, 10], focal35: 24 },
];

const XIAOMI_MODELS = [
  { make: 'Xiaomi', model: 'Redmi Note 12 Pro', software: 'MIUI 14.0.6', focalLength: [56, 10], fNumber: [188, 100], focal35: 24 },
  { make: 'Xiaomi', model: 'Redmi Note 13 Pro', software: 'HyperOS 1.0.2', focalLength: [54, 10], fNumber: [165, 100], focal35: 23 },
  { make: 'Xiaomi', model: 'Xiaomi 13T', software: 'MIUI 14.0.11', focalLength: [50, 10], fNumber: [19, 10], focal35: 24 },
  { make: 'Xiaomi', model: 'Xiaomi 14', software: 'HyperOS 1.0.8', focalLength: [50, 10], fNumber: [16, 10], focal35: 23 },
];

const PIXEL_MODELS = [
  { make: 'Google', model: 'Pixel 7', software: 'TQ2A.230505.002', focalLength: [68, 10], fNumber: [185, 100], focal35: 25 },
  { make: 'Google', model: 'Pixel 7 Pro', software: 'TQ3A.230805.001', focalLength: [68, 10], fNumber: [185, 100], focal35: 25 },
  { make: 'Google', model: 'Pixel 8', software: 'UD1A.230803.041', focalLength: [68, 10], fNumber: [168, 100], focal35: 25 },
  { make: 'Google', model: 'Pixel 8 Pro', software: 'UD1A.231105.004', focalLength: [68, 10], fNumber: [168, 100], focal35: 25 },
];

function pickSmartphone() {
  const rand = Math.random();
  if (rand < 0.40) {
    // 40% iPhone (Leader France)
    return IPHONE_MODELS[Math.floor(Math.random() * IPHONE_MODELS.length)];
  } else if (rand < 0.75) {
    // 35% Samsung Galaxy (Leader Android France)
    return SAMSUNG_MODELS[Math.floor(Math.random() * SAMSUNG_MODELS.length)];
  } else if (rand < 0.90) {
    // 15% Xiaomi / Redmi
    return XIAOMI_MODELS[Math.floor(Math.random() * XIAOMI_MODELS.length)];
  } else {
    // 10% Google Pixel
    return PIXEL_MODELS[Math.floor(Math.random() * PIXEL_MODELS.length)];
  }
}

function degToDmsRational(degFloat) {
  const absolute = Math.abs(degFloat);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = Math.floor((minutesNotTruncated - minutes) * 60 * 100);

  return [
    [degrees, 1],
    [minutes, 1],
    [seconds, 100],
  ];
}

function generatePhotoDate3To21DaysBefore(taskDateStr, reviewText = '') {
  let baseDate = new Date();
  if (taskDateStr && /^\d{4}-\d{2}-\d{2}$/.test(taskDateStr)) {
    const [y, m, d] = taskDateStr.split('-').map(Number);
    baseDate = new Date(y, m - 1, d);
  }

  let daysBefore;
  const textNorm = (reviewText || '').toLowerCase()
    .replace(/[éèê]/g, 'e').replace(/[àâ]/g, 'a');

  // Détection intelligente de la période mentionnée dans le texte de l'avis
  if (textNorm.includes('3 jours') || textNorm.includes('trois jours') || textNorm.includes('quelques jours')) {
    daysBefore = Math.floor(Math.random() * 3) + 3; // 3 à 5 jours avant
  } else if (textNorm.includes('semaine derniere') || textNorm.includes('1 semaine') || textNorm.includes('une semaine') || textNorm.includes('semaine passee')) {
    daysBefore = Math.floor(Math.random() * 3) + 7; // 7 à 9 jours avant
  } else if (textNorm.includes('2 semaines') || textNorm.includes('deux semaines') || textNorm.includes('15 jours') || textNorm.includes('quinze jours')) {
    daysBefore = Math.floor(Math.random() * 3) + 14; // 14 à 16 jours avant
  } else if (textNorm.includes('3 semaines') || textNorm.includes('trois semaines') || textNorm.includes('mois dernier')) {
    daysBefore = Math.floor(Math.random() * 4) + 18; // 18 à 21 jours avant
  } else {
    // Tirage au sort naturel si aucune durée n'est explicitement mentionnée dans le texte
    const minDays = 3;
    const maxDays = 21;
    daysBefore = Math.floor(Math.random() * (maxDays - minDays + 1)) + minDays;
  }

  const photoDate = new Date(baseDate.getTime() - daysBefore * 24 * 60 * 60 * 1000);

  // Heure de prise de vue en journée de chantier (entre 08h30 et 18h30)
  const hour = Math.floor(Math.random() * (18 - 8 + 1)) + 8;
  const minute = Math.floor(Math.random() * 60);
  const second = Math.floor(Math.random() * 60);

  photoDate.setHours(hour, minute, second);

  const pad = (n) => String(n).padStart(2, '0');
  return `${photoDate.getFullYear()}:${pad(photoDate.getMonth() + 1)}:${pad(photoDate.getDate())} ${pad(photoDate.getHours())}:${pad(photoDate.getMinutes())}:${pad(photoDate.getSeconds())}`;
}

/**
 * Injecte des métadonnées EXIF complètes et coordonnées GPS réalistes dans une image.
 * Auto-convertit en véritable JPEG si le buffer est WebP ou PNG.
 */
async function injectExifAndGps(imageBuffer, cityName, country = 'France', taskDateStr = null, reviewText = '', imageWidth = 2048, imageHeight = 1536) {
  try {
    let workingBuffer = imageBuffer;
    let finalWidth = imageWidth || 2048;
    let finalHeight = imageHeight || 1536;

    // Normalisation préventive si le buffer n'est pas un JPEG pur standard
    const format = detectImageFormat(workingBuffer);
    if (format !== 'jpeg') {
      console.log(`⚠️ Image au format "${format}" détectée dans exif.js. Conversion préalable en JPEG standard 4:3...`);
      const norm = await processAndNormalizeImage(workingBuffer);
      workingBuffer = norm.buffer;
      finalWidth = norm.width;
      finalHeight = norm.height;
    }

    const coords = await getCoordinatesForCity(cityName, country);
    const phone = pickSmartphone();
    const dateStr = generatePhotoDate3To21DaysBefore(taskDateStr, reviewText);
    const timeParts = dateStr.split(' ')[1].split(':').map(Number);
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    // Construction du bloc 0th IFD (Appareil photo & Système)
    const zerothIfd = {};
    zerothIfd[piexif.ImageIFD.Make] = phone.make;
    zerothIfd[piexif.ImageIFD.Model] = phone.model;
    zerothIfd[piexif.ImageIFD.Orientation] = 1; // Orientation normale
    zerothIfd[piexif.ImageIFD.XResolution] = [72, 1];
    zerothIfd[piexif.ImageIFD.YResolution] = [72, 1];
    zerothIfd[piexif.ImageIFD.ResolutionUnit] = 2; // Pouces (standard mobile)
    zerothIfd[piexif.ImageIFD.Software] = phone.software;
    zerothIfd[piexif.ImageIFD.DateTime] = dateStr;

    // Construction du bloc Exif IFD (Paramètres de prise de vue réels)
    const exifIfd = {};
    exifIfd[piexif.ExifIFD.DateTimeOriginal] = dateStr;
    exifIfd[piexif.ExifIFD.DateTimeDigitized] = dateStr;
    exifIfd[piexif.ExifIFD.ExposureTime] = [1, pick([250, 320, 400, 500, 640, 800, 1000, 1250])]; // Vitesse obturation réaliste jour
    exifIfd[piexif.ExifIFD.FNumber] = phone.fNumber || [18, 10]; // f/1.8 ou selon smartphone
    exifIfd[piexif.ExifIFD.ExposureProgram] = 2; // Normal
    exifIfd[piexif.ExifIFD.ISOSpeedRatings] = pick([50, 64, 80, 100, 125, 160, 200]);
    exifIfd[piexif.ExifIFD.ExifVersion] = "0232";
    exifIfd[piexif.ExifIFD.ComponentsConfiguration] = "\x01\x02\x03\x00";
    exifIfd[piexif.ExifIFD.MeteringMode] = 5; // Multi-segment / Pattern (défaut smartphone)
    exifIfd[piexif.ExifIFD.Flash] = 16; // Flash non déclenché en extérieur
    exifIfd[piexif.ExifIFD.FocalLength] = phone.focalLength;
    exifIfd[piexif.ExifIFD.FocalLengthIn35mmFilm] = phone.focal35 || 24;
    exifIfd[piexif.ExifIFD.SubsecTimeOriginal] = `${Math.floor(Math.random() * 900) + 100}`;
    exifIfd[piexif.ExifIFD.SubsecTimeDigitized] = exifIfd[piexif.ExifIFD.SubsecTimeOriginal];
    exifIfd[piexif.ExifIFD.ColorSpace] = 1; // sRGB (recommandé Google Maps)
    exifIfd[piexif.ExifIFD.PixelXDimension] = finalWidth;
    exifIfd[piexif.ExifIFD.PixelYDimension] = finalHeight;
    exifIfd[piexif.ExifIFD.WhiteBalance] = 0; // Auto
    exifIfd[piexif.ExifIFD.SceneCaptureType] = 0; // Standard

    // Construction du bloc GPS EXIF (Géolocalisation précise & cohérente)
    const gpsIfd = {};
    gpsIfd[piexif.GPSIFD.GPSVersionID] = [2, 3, 0, 0];
    gpsIfd[piexif.GPSIFD.GPSLatitudeRef] = coords.lat >= 0 ? 'N' : 'S';
    gpsIfd[piexif.GPSIFD.GPSLatitude] = degToDmsRational(coords.lat);
    gpsIfd[piexif.GPSIFD.GPSLongitudeRef] = coords.lng >= 0 ? 'E' : 'W';
    gpsIfd[piexif.GPSIFD.GPSLongitude] = degToDmsRational(coords.lng);
    gpsIfd[piexif.GPSIFD.GPSAltitudeRef] = 0; // Au-dessus du niveau de la mer
    gpsIfd[piexif.GPSIFD.GPSAltitude] = [Math.floor(Math.random() * 120) + 15, 1]; // 15 à 135 m
    gpsIfd[piexif.GPSIFD.GPSTimeStamp] = [
      [timeParts[0], 1],
      [timeParts[1], 1],
      [timeParts[2], 1],
    ];
    gpsIfd[piexif.GPSIFD.GPSStatus] = 'A'; // Mesure active
    gpsIfd[piexif.GPSIFD.GPSDateStamp] = dateStr.split(' ')[0];

    const exifObj = {
      '0th': zerothIfd,
      'Exif': exifIfd,
      'GPS': gpsIfd,
    };

    const exifBytes = piexif.dump(exifObj);

    // Convertir l'image Buffer en DataURL pour piexifjs
    let imageDataDataUrl = `data:image/jpeg;base64,${workingBuffer.toString('base64')}`;
    
    // Injecter les données EXIF binaire
    const newImageDataUrl = piexif.insert(exifBytes, imageDataDataUrl);

    // Extraire le nouveau buffer binaire nettoyé et géolocalisé
    const base64Clean = newImageDataUrl.split(',')[1];
    const cleanBuffer = Buffer.from(base64Clean, 'base64');

    console.log(`📍 Métadonnées EXIF & GPS injectées avec succès !`);
    console.log(`📱 Smartphone simulé : ${phone.make} ${phone.model} | Ville : ${cityName} (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}) | Format : ${finalWidth}x${finalHeight}`);

    return cleanBuffer;
  } catch (err) {
    console.warn("⚠️ Note injection EXIF :", err.message, "- Conservation du buffer.");
    return imageBuffer;
  }
}

module.exports = { injectExifAndGps };
