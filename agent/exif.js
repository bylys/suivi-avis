/**
 * exif.js — Génération et injection des métadonnées EXIF Smartphone & GPS
 */

const piexif = require('piexifjs');
const { getCoordinatesForCity } = require('./geocoding');

const IPHONE_MODELS = [
  { make: 'Apple', model: 'iPhone 13', software: '16.5', focalLength: [51, 10] },
  { make: 'Apple', model: 'iPhone 14', software: '16.6', focalLength: [57, 10] },
  { make: 'Apple', model: 'iPhone 14 Pro', software: '17.0', focalLength: [68, 10] },
  { make: 'Apple', model: 'iPhone 15', software: '17.2', focalLength: [60, 10] },
  { make: 'Apple', model: 'iPhone 15 Pro', software: '17.5', focalLength: [68, 10] },
  { make: 'Apple', model: 'iPhone 16', software: '18.0', focalLength: [60, 10] },
  { make: 'Apple', model: 'iPhone 16 Pro', software: '18.0', focalLength: [68, 10] },
];

const SAMSUNG_MODELS = [
  { make: 'Samsung', model: 'Galaxy S22', software: 'S901BXXU2BVJA', focalLength: [54, 10] },
  { make: 'Samsung', model: 'Galaxy S23', software: 'S911BXXU1AWA6', focalLength: [54, 10] },
  { make: 'Samsung', model: 'Galaxy S24', software: 'S921BXXU1AXB5', focalLength: [54, 10] },
  { make: 'Samsung', model: 'Galaxy A54 5G', software: 'A546BXXU2AWB3', focalLength: [52, 10] },
  { make: 'Samsung', model: 'Galaxy A55 5G', software: 'A556BXXU1AXB8', focalLength: [52, 10] },
];

const XIAOMI_MODELS = [
  { make: 'Xiaomi', model: 'Redmi Note 12 Pro', software: 'MIUI 14.0.6', focalLength: [56, 10] },
  { make: 'Xiaomi', model: 'Redmi Note 13 Pro', software: 'HyperOS 1.0.2', focalLength: [54, 10] },
  { make: 'Xiaomi', model: 'Xiaomi 13T', software: 'MIUI 14.0.11', focalLength: [50, 10] },
  { make: 'Xiaomi', model: 'Xiaomi 14', software: 'HyperOS 1.0.8', focalLength: [50, 10] },
];

const PIXEL_MODELS = [
  { make: 'Google', model: 'Pixel 7', software: 'TQ2A.230505.002', focalLength: [68, 10] },
  { make: 'Google', model: 'Pixel 7 Pro', software: 'TQ3A.230805.001', focalLength: [68, 10] },
  { make: 'Google', model: 'Pixel 8', software: 'UD1A.230803.041', focalLength: [68, 10] },
  { make: 'Google', model: 'Pixel 8 Pro', software: 'UD1A.231105.004', focalLength: [68, 10] },
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

async function injectExifAndGps(imageBuffer, cityName, country = 'France', taskDateStr = null, reviewText = '') {
  try {
    const coords = await getCoordinatesForCity(cityName, country);
    const phone = pickSmartphone();
    const dateStr = generatePhotoDate3To21DaysBefore(taskDateStr, reviewText);

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    // Construction du bloc GPS EXIF
    const gpsIfd = {};
    gpsIfd[piexif.GPSIFD.GPSLatitudeRef] = coords.lat >= 0 ? 'N' : 'S';
    gpsIfd[piexif.GPSIFD.GPSLatitude] = degToDmsRational(coords.lat);
    gpsIfd[piexif.GPSIFD.GPSLongitudeRef] = coords.lng >= 0 ? 'E' : 'W';
    gpsIfd[piexif.GPSIFD.GPSLongitude] = degToDmsRational(coords.lng);
    gpsIfd[piexif.GPSIFD.GPSDateStamp] = `${now.getFullYear()}:${pad(now.getMonth() + 1)}:${pad(now.getDate())}`;

    // Construction du bloc 0th IFD
    const zerothIfd = {};
    zerothIfd[piexif.ImageIFD.Make] = phone.make;
    zerothIfd[piexif.ImageIFD.Model] = phone.model;
    zerothIfd[piexif.ImageIFD.Software] = phone.software;
    zerothIfd[piexif.ImageIFD.DateTime] = dateStr;

    // Construction du bloc Exif IFD
    const exifIfd = {};
    exifIfd[piexif.ExifIFD.DateTimeOriginal] = dateStr;
    exifIfd[piexif.ExifIFD.DateTimeDigitized] = dateStr;
    exifIfd[piexif.ExifIFD.FocalLength] = phone.focalLength;
    exifIfd[piexif.ExifIFD.FNumber] = [18, 10]; // f/1.8
    exifIfd[piexif.ExifIFD.ISOSpeedRatings] = pick([100, 125, 160, 200, 250, 320]);

    const exifObj = {
      '0th': zerothIfd,
      'Exif': exifIfd,
      'GPS': gpsIfd,
    };

    const exifBytes = piexif.dump(exifObj);

    // Convertir l'image Buffer en DataURL pour piexifjs
    let imageDataDataUrl = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
    
    // Injecter les données EXIF binaire
    const newImageDataUrl = piexif.insert(exifBytes, imageDataDataUrl);

    // Extraire le nouveau buffer binaire nettoyé et géolocalisé
    const base64Clean = newImageDataUrl.split(',')[1];
    const cleanBuffer = Buffer.from(base64Clean, 'base64');

    console.log(`📍 Métadonnées EXIF & GPS injectées avec succès !`);
    console.log(`📱 Smartphone simulé : ${phone.make} ${phone.model} | Ville : ${cityName} (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);

    return cleanBuffer;
  } catch (err) {
    console.log("Note injection EXIF :", err.message, "- Conservation du buffer d'origine.");
    return imageBuffer;
  }
}

module.exports = { injectExifAndGps };
