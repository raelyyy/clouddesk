// Import Firebase auth
import { auth } from './firebase.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

// DOM elements
const loginForm = document.getElementById('loginForm');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginError = document.getElementById('loginError');
const registerForm = document.getElementById('registerForm');
const registerName = document.getElementById('registerName');
const registerEmail = document.getElementById('registerEmail');
const registerPassword = document.getElementById('registerPassword');
const registerError = document.getElementById('registerError');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');
const loginFormDiv = document.getElementById('login-form');
const registerFormDiv = document.getElementById('register-form');

function initAuth() {
  // Check if user is already logged in
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // User is signed in, redirect to dashboard
      window.location.href = 'dashboard.html';
    }
  });

  // Toggle between login and register forms
  showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginFormDiv.classList.add('hidden');
    registerFormDiv.classList.remove('hidden');
  });

  showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    registerFormDiv.classList.add('hidden');
    loginFormDiv.classList.remove('hidden');
  });

  // Handle login form submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = loginEmail.value;
    const password = loginPassword.value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = 'dashboard.html';
    } catch (error) {
      loginError.textContent = error.message;
    }
  });

  // Handle register form submission
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = registerName.value;
    const email = registerEmail.value;
    const password = registerPassword.value;

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(auth.currentUser, { displayName: name });
      window.location.href = 'dashboard.html';
    } catch (error) {
      registerError.textContent = error.message;
    }
  });
}

// Initialize auth when DOM is loaded
document.addEventListener('DOMContentLoaded', initAuth);