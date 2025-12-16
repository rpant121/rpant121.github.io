// Firebase Configuration
// Replace these values with your Firebase project credentials
// Get them from: https://console.firebase.google.com/ > Project Settings > General > Your apps

const firebaseConfig = {
  apiKey: "AIzaSyCv4tig8rLatkdhvfTU6eMvhQoYgRGzmL8",
  authDomain: "tcgpocket-605d7.firebaseapp.com",
  databaseURL: "https://tcgpocket-605d7-default-rtdb.firebaseio.com",
  projectId: "tcgpocket-605d7",
  storageBucket: "tcgpocket-605d7.firebasestorage.app",
  messagingSenderId: "564886602760",
  appId: "1:564886602760:web:364c30a18e70cd86817dbd",
  measurementId: "G-GYD1XYD1M5"
};

// Initialize Firebase
if (typeof firebase !== 'undefined') {
  firebase.initializeApp(firebaseConfig);
  
  // Initialize services
  const auth = firebase.auth();
  const database = firebase.database();
  
  // Export for use in other modules
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { auth, database, firebase };
  } else {
    window.firebaseAuth = auth;
    window.firebaseDatabase = database;
    window.firebaseApp = firebase;
  }
} else {
  console.error('Firebase SDK not loaded. Make sure to include Firebase scripts before this file.');
}

