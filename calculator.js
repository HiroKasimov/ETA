const { tripsCollection } = require('./firebase');

const MODES = ['walk', 'bus', 'scooter', 'car'];
const MODE_LABELS = {
  walk: 'Piyoda',
  bus: 'Bus',
  scooter: 'Skuter',
  car: 'Yengil mashina',
};

// Yandex Maps'dan olingan real Uy<->Ish safari asosida hisoblangan
// boshlang'ich tezliklar (km/soat) — foydalanuvchining shaxsiy tarixi
// to'planguncha shu qiymatlar ishlatiladi:
//   Piyoda:  12 km / 128 daq  = 5.6 km/soat
//   Bus:     15 km / 69 daq   = 13.0 km/soat
//   Skuter:  13 km / 72 daq   = 10.8 km/soat
//   Mashina: 15 km / 26 daq   = 34.6 km/soat
const DEFAULT_SPEED_KMH = {
  walk: 5.6,
  bus: 13.0,
  scooter: 10.8,
  car: 34.6,
};

const BUFFER_MINUTES = 10; // kutish/svetofor va h.k. uchun standart bufer
const TRIPS_WINDOW = 15; // oxirgi nechta yozuvga qarab o'rtacha olinadi

/**
 * Foydalanuvchining berilgan mode bo'yicha oxirgi safarlaridan
 * o'rtacha tezligini (km/soat) hisoblab qaytaradi.
 * Yozuv bo'lmasa, DEFAULT_SPEED_KMH qaytadi.
 */
async function getAverageSpeed(userId, mode) {
  const snapshot = await tripsCollection
    .where('userId', '==', userId)
    .where('mode', '==', mode)
    .orderBy('timestamp', 'desc')
    .limit(TRIPS_WINDOW)
    .get();

  if (snapshot.empty) {
    return { speedKmh: DEFAULT_SPEED_KMH[mode], sampleSize: 0 };
  }

  let totalDistance = 0;
  let totalMinutes = 0;
  snapshot.forEach((doc) => {
    const trip = doc.data();
    totalDistance += trip.distance_km;
    totalMinutes += trip.duration_min;
  });

  const speedKmh = totalDistance / (totalMinutes / 60);
  return { speedKmh, sampleSize: snapshot.size };
}

/**
 * Berilgan masofa uchun barcha mode'larda taxminiy vaqtni (daqiqa) hisoblaydi.
 * Natija: [{ mode, label, minutes, sampleSize }, ...]
 */
async function estimateAllModes(userId, distanceKm) {
  const results = [];
  for (const mode of MODES) {
    const { speedKmh, sampleSize } = await getAverageSpeed(userId, mode);
    const minutes = Math.round((distanceKm / speedKmh) * 60 + BUFFER_MINUTES);
    results.push({ mode, label: MODE_LABELS[mode], minutes, sampleSize });
  }
  return results;
}

/**
 * Teskari hisoblash: maqsad yetib borish vaqti (Date) va masofa asosida,
 * har mode uchun tavsiya etilgan chiqish vaqtini hisoblaydi.
 */
async function estimateDepartureTimes(userId, distanceKm, arrivalDate) {
  const estimates = await estimateAllModes(userId, distanceKm);
  return estimates.map(({ mode, label, minutes, sampleSize }) => {
    const departureDate = new Date(arrivalDate.getTime() - minutes * 60000);
    return { mode, label, minutes, sampleSize, departureDate };
  });
}

/**
 * Yangi safar yozuvini saqlaydi (statistikani boyitish uchun).
 */
async function logTrip(userId, distanceKm, mode, durationMin) {
  await tripsCollection.add({
    userId,
    distance_km: distanceKm,
    mode,
    duration_min: durationMin,
    timestamp: new Date(),
  });
}

module.exports = {
  MODES,
  MODE_LABELS,
  estimateAllModes,
  estimateDepartureTimes,
  logTrip,
};
