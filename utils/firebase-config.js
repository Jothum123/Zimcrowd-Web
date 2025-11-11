// Firebase Configuration
const { initializeApp } = require('firebase/app');
const { getAuth } = require('firebase/auth');

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB9R6S33EGtQA7XXNZqtJAsj6LV7Zw8W_Q",
  authDomain: "zimcrowd-web.firebaseapp.com",
  projectId: "zimcrowd-web",
  storageBucket: "zimcrowd-web.firebasestorage.app",
  messagingSenderId: "307238757133",
  appId: "1:307238757133:web:65be1baa69ae8fb9904644",
  measurementId: "G-64YV15R6SF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

module.exports = { auth };
