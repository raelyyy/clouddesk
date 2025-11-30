// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBZtHJPxI5dWo4khnnGHlQsi4L89zG7hwI",
  authDomain: "clouddesk-9643e.firebaseapp.com",
  projectId: "clouddesk-9643e",
  storageBucket: "clouddesk-9643e.firebasestorage.app",
  messagingSenderId: "638307491660",
  appId: "1:638307491660:web:4dc59fcec7486b3894f9e9",
  measurementId: "G-G2CQ11KQX2"
};

// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);