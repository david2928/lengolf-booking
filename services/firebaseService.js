// services/firebaseService.js

const admin = require('firebase-admin');
const serviceAccount = require('../config/serviceAccountKey.json'); // Ensure the path is correct

// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'lengolf-booking-system-436804'
  });

const db = admin.firestore();

module.exports = { admin, db };
