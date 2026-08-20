/**
 * exif.js — Génération et injection des métadonnées EXIF Smartphone & GPS
 */

const piexif = require('piexifjs');
const { getCoordinatesForCity } = require('./geocoding');

const SMARTPHONE_MODELS = [
  { make: 'Samsung', model: 'Galaxy S22', software: 'S901BXXU2BVJA', focalLength: [54, 10] },
  { make: 'Samsung', model: 'Galaxy S23', software: 'S911BXXU1AWA6', focalLength: [54, 10] },
  { make: 'Apple', model: 'iPhone 13', software: '16.5', focalLength: [51, 10] },
  { make: 'Apple', model: 'iPhone 14 Pro', software: '16.6', focalLength: [68, 10] },
  { make: 'Xiaomi', model: 'Redmi Note 11', software: 'MIUI 13.0.5', focalLength: [43, 10] },
  { make: 'Google', model: 'Pixel 7', software: 'TQ2A.230505.002', focalLength: [68, 10] },
];

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

async function injectExifAndGps(imageBuffer, cityName, country = 'France') {
  try {
    const coords = await getCoordinatesForCity(cityName, country);
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const phone = pick(SMARTPHONE_MODELS);

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}:${pad(now.getMonth() + 1)}:${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

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
