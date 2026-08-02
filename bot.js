const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const { MODES, MODE_LABELS, estimateAllModes, estimateDepartureTimes, logTrip } = require('./calculator');

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Oddiy in-memory holat (har chat uchun qaysi bosqichda ekanini eslab turadi).
// MVP uchun yetarli; keyinroq xohlasang Firestore'ga ko'chirish mumkin.
const userState = {};

function modeKeyboard(prefix) {
  return {
    reply_markup: {
      inline_keyboard: [
        MODES.map((m) => ({ text: MODE_LABELS[m], callback_data: `${prefix}:${m}` })),
      ],
    },
  };
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "Salom! Men yo'l vaqtini taxmin qiluvchi botman.\n\n" +
      '/safar — yangi safarni yozib qo\'yish (statistikani boyitadi)\n' +
      '/hisobla — masofa asosida taxminiy yo\'l vaqtini ko\'rish\n' +
      '/chiqish — yetib borish vaqtidan kelib chiqib, chiqish vaqtini hisoblash'
  );
});

// ---------- /safar: yangi safar yozish ----------
bot.onText(/\/safar/, (msg) => {
  const chatId = msg.chat.id;
  userState[chatId] = { step: 'safar_distance' };
  bot.sendMessage(chatId, 'Masofani km da yubor (masalan: 10 yoki 1.7):');
});

// ---------- /hisobla: masofa -> taxminiy vaqt (barcha mode) ----------
bot.onText(/\/hisobla/, (msg) => {
  const chatId = msg.chat.id;
  userState[chatId] = { step: 'calc_distance' };
  bot.sendMessage(chatId, 'Masofani km da yubor:');
});

// ---------- /chiqish: teskari hisoblash ----------
bot.onText(/\/chiqish/, (msg) => {
  const chatId = msg.chat.id;
  userState[chatId] = { step: 'reverse_distance' };
  bot.sendMessage(chatId, 'Masofani km da yubor:');
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();
  const state = userState[chatId];
  if (!state || !text || text.startsWith('/')) return;

  // --- Safar yozish oqimi ---
  if (state.step === 'safar_distance') {
    const distance = parseFloat(text.replace(',', '.'));
    if (isNaN(distance) || distance <= 0) return bot.sendMessage(chatId, "Noto'g'ri raqam, qaytadan yubor:");
    state.distance = distance;
    state.step = 'safar_mode';
    return bot.sendMessage(chatId, 'Qaysi transport turi?', modeKeyboard('safar_mode'));
  }
  if (state.step === 'safar_duration') {
    const duration = parseFloat(text.replace(',', '.'));
    if (isNaN(duration) || duration <= 0) return bot.sendMessage(chatId, "Noto'g'ri raqam, qaytadan yubor (daqiqada):");
    await logTrip(String(chatId), state.distance, state.mode, duration);
    bot.sendMessage(chatId, `Saqlandi ✅ (${state.distance} km, ${MODE_LABELS[state.mode]}, ${duration} daq)`);
    delete userState[chatId];
    return;
  }

  // --- Kalkulyator oqimi ---
  if (state.step === 'calc_distance') {
    const distance = parseFloat(text.replace(',', '.'));
    if (isNaN(distance) || distance <= 0) return bot.sendMessage(chatId, "Noto'g'ri raqam, qaytadan yubor:");
    const results = await estimateAllModes(String(chatId), distance);
    const lines = results.map(
      (r) => `${r.label}: ~${r.minutes} daqiqa${r.sampleSize === 0 ? ' (hali tarix yo\'q, taxminiy)' : ''}`
    );
    bot.sendMessage(chatId, `${distance} km uchun taxminiy vaqt:\n\n${lines.join('\n')}`);
    delete userState[chatId];
    return;
  }

  // --- Teskari hisoblash oqimi ---
  if (state.step === 'reverse_distance') {
    const distance = parseFloat(text.replace(',', '.'));
    if (isNaN(distance) || distance <= 0) return bot.sendMessage(chatId, "Noto'g'ri raqam, qaytadan yubor:");
    state.distance = distance;
    state.step = 'reverse_time';
    return bot.sendMessage(chatId, 'Nechida yetib borishing kerak? (masalan: 21:30)');
  }
  if (state.step === 'reverse_time') {
    const match = text.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return bot.sendMessage(chatId, "Format noto'g'ri, HH:MM ko'rinishida yubor (masalan 21:30):");
    const [, h, m] = match;
    const arrival = new Date();
    arrival.setHours(parseInt(h), parseInt(m), 0, 0);
    if (arrival.getTime() < Date.now()) arrival.setDate(arrival.getDate() + 1); // ertaga hisoblanadi agar vaqt o'tib ketgan bo'lsa

    const results = await estimateDepartureTimes(String(chatId), state.distance, arrival);
    const fmt = (d) => d.toTimeString().slice(0, 5);
    const lines = results.map((r) => `${r.label}: ${fmt(r.departureDate)} da chiq (~${r.minutes} daq yo'l)`);
    bot.sendMessage(chatId, `${fmt(arrival)} da yetib borish uchun:\n\n${lines.join('\n')}`);
    delete userState[chatId];
    return;
  }
});

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const [action, mode] = query.data.split(':');
  const state = userState[chatId];
  if (!state) return;

  if (action === 'safar_mode') {
    state.mode = mode;
    state.step = 'safar_duration';
    bot.answerCallbackQuery(query.id);
    return bot.sendMessage(chatId, "Necha daqiqada yetib bording? (masalan: 45)");
  }
});

console.log('ETA bot ishga tushdi...');
