// services/firebaseService.js

const admin = require('firebase-admin');

// Read the service account JSON from the environment variable and parse it
const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64, 'base64').toString('utf8'));

// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'lengolf-booking-system-436804'
});

const db = admin.firestore();

module.exports = { admin, db };
