// Import Firebase services
import { auth } from './firebase.js';
import { onAuthStateChanged, updateProfile, EmailAuthProvider, reauthenticateWithCredential } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

// DOM elements
const accountForm = document.getElementById('accountForm');
const displayName = document.getElementById('displayName');
const email = document.getElementById('email');
const password = document.getElementById('password');
const passwordDiv = document.getElementById('passwordDiv');
const accountError = document.getElementById('accountError');
const accountSuccess = document.getElementById('accountSuccess');
const userGreeting = document.getElementById('userGreeting');
const loadingModal = document.getElementById('loadingModal');

// Loading modal functions
function showLoading() {
  loadingModal.classList.remove('hidden');
  loadingModal.classList.add('flex');
}

function hideLoading() {
  loadingModal.classList.add('hidden');
  loadingModal.classList.remove('flex');
}

function initAccount() {
  // Check authentication state
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // User is signed in
      displayName.value = user.displayName || '';
      email.value = user.email;
      if (userGreeting) {
        userGreeting.textContent = `Hello, ${user.displayName || 'User'}!`;
      }
    } else {
      // User is signed out, redirect to login
      window.location.href = 'index.html';
    }
  });


  // Form submission
  accountForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) return;

    const newDisplayName = displayName.value.trim();
    const userPassword = password.value.trim();

    showLoading();

    // If password is provided, re-authenticate first
    if (userPassword) {
      try {
        const credential = EmailAuthProvider.credential(user.email, userPassword);
        await reauthenticateWithCredential(user, credential);
      } catch (error) {
        console.error('Error re-authenticating:', error);
        accountError.textContent = 'Invalid password. Please try again.';
        accountSuccess.textContent = '';
        hideLoading();
        return;
      }
    }

    try {
      await updateProfile(user, {
        displayName: newDisplayName
      });

      accountSuccess.textContent = 'Profile updated successfully!';
      accountError.textContent = '';
      passwordDiv.classList.add('hidden');
      password.value = '';
      // Update greeting in real-time
      if (userGreeting) {
        userGreeting.textContent = `Hello, ${newDisplayName || 'User'}!`;
      }
      hideLoading();
    } catch (error) {
      console.error('Error updating profile:', error);
      if (error.code === 'auth/requires-recent-login') {
        accountError.textContent = 'For security reasons, please enter your password to update your profile.';
        passwordDiv.classList.remove('hidden');
        password.focus();
      } else {
        accountError.textContent = error.message;
      }
      accountSuccess.textContent = '';
      hideLoading();
    }
  });
}

// Initialize account when DOM is loaded
document.addEventListener('DOMContentLoaded', initAccount);