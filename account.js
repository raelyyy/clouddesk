// Import Firebase services
import { auth } from './firebase.js';
import { onAuthStateChanged, updateProfile } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

// DOM elements
const backBtn = document.getElementById('backBtn');
const accountForm = document.getElementById('accountForm');
const displayName = document.getElementById('displayName');
const email = document.getElementById('email');
const accountError = document.getElementById('accountError');
const accountSuccess = document.getElementById('accountSuccess');

function initAccount() {
  // Check authentication state
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // User is signed in
      displayName.value = user.displayName || '';
      email.value = user.email;
    } else {
      // User is signed out, redirect to login
      window.location.href = 'index.html';
    }
  });

  // Back button
  backBtn.addEventListener('click', () => {
    window.location.href = 'dashboard.html';
  });

  // Form submission
  accountForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) return;

    const newDisplayName = displayName.value.trim();

    try {
      await updateProfile(user, {
        displayName: newDisplayName
      });

      accountSuccess.textContent = 'Profile updated successfully!';
      accountError.textContent = '';
    } catch (error) {
      console.error('Error updating profile:', error);
      accountError.textContent = error.message;
      accountSuccess.textContent = '';
    }
  });
}

// Initialize account when DOM is loaded
document.addEventListener('DOMContentLoaded', initAccount);