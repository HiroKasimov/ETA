const admin = require('firebase-admin');
require('dotenv').config();

// MUHIM: Life OS bilan bitta Firebase PROJECT ishlatiladi,
// lekin butunlay alohida collection ('eta_trips') orqali —
// Life OS'ning 'tasks', 'habits' va h.k. collectionlariga tegilmaydi.

const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const tripsCollection = db.collection('eta_trips');

module.exports = { db, tripsCollection };
