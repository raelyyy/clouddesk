// Import Firebase services
import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, Timestamp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// DOM elements
const trashList = document.getElementById('trashList');
const trashLoading = document.getElementById('trashLoading');
const emptyTrashMessage = document.getElementById('emptyTrashMessage');
const emptyTrashBtn = document.getElementById('emptyTrashBtn');
const restoreModal = document.getElementById('restoreModal');
const closeRestoreModal = document.querySelector('.close-restore-modal');
const confirmRestoreBtn = document.getElementById('confirmRestoreBtn');
const cancelRestoreBtn = document.getElementById('cancelRestoreBtn');
const emptyTrashModal = document.getElementById('emptyTrashModal');
const closeEmptyModal = document.querySelector('.close-empty-modal');
const confirmEmptyBtn = document.getElementById('confirmEmptyBtn');
const cancelEmptyBtn = document.getElementById('cancelEmptyBtn');

let trashDocs = [];
let currentRestoreDocId = null;

// Loading modal functions
function showLoading() {
  const loadingModal = document.getElementById('loadingModal');
  if (loadingModal) {
    loadingModal.classList.remove('hidden');
    loadingModal.classList.add('flex');
  }
}

function hideLoading() {
  const loadingModal = document.getElementById('loadingModal');
  if (loadingModal) {
    loadingModal.classList.add('hidden');
    loadingModal.classList.remove('flex');
  }
}

function initTrash() {
  // Check authentication state
  onAuthStateChanged(auth, (user) => {
    if (user) {
      loadTrashDocuments(user.uid);
    } else {
      // User is signed out, redirect to login
      window.location.href = 'index.html';
    }
  });

  // Empty trash button
  emptyTrashBtn.addEventListener('click', () => {
    if (trashDocs.length > 0) {
      emptyTrashModal.classList.remove('hidden');
      emptyTrashModal.classList.add('flex');
    }
  });

  // Restore modal
  closeRestoreModal.addEventListener('click', () => {
    restoreModal.classList.add('hidden');
    restoreModal.classList.remove('flex');
    currentRestoreDocId = null;
  });

  cancelRestoreBtn.addEventListener('click', () => {
    restoreModal.classList.add('hidden');
    restoreModal.classList.remove('flex');
    currentRestoreDocId = null;
  });

  confirmRestoreBtn.addEventListener('click', async () => {
    if (currentRestoreDocId) {
      showLoading();
      await restoreDocument(currentRestoreDocId);
      hideLoading();
      restoreModal.classList.add('hidden');
      restoreModal.classList.remove('flex');
      currentRestoreDocId = null;
    }
  });

  // Empty trash modal
  closeEmptyModal.addEventListener('click', () => {
    emptyTrashModal.classList.add('hidden');
    emptyTrashModal.classList.remove('flex');
  });

  cancelEmptyBtn.addEventListener('click', () => {
    emptyTrashModal.classList.add('hidden');
    emptyTrashModal.classList.remove('flex');
  });

  confirmEmptyBtn.addEventListener('click', async () => {
    showLoading();
    await emptyTrash();
    hideLoading();
    emptyTrashModal.classList.add('hidden');
    emptyTrashModal.classList.remove('flex');
  });

  // Event delegation for dynamically created buttons
  trashList.addEventListener('click', async (e) => {
    const target = e.target;

    if (target.classList.contains('restore-btn')) {
      const docId = target.dataset.docid;
      if (docId) {
        currentRestoreDocId = docId;
        restoreModal.classList.remove('hidden');
        restoreModal.classList.add('flex');
      } else {
        console.error('No document ID found for restore button');
      }
    }

    if (target.classList.contains('delete-btn')) {
      const docId = target.dataset.docid;
      if (docId) {
        if (confirm('This action cannot be undone. Delete this document permanently?')) {
          showLoading();
          await permanentlyDeleteDocument(docId);
          hideLoading();
        }
      } else {
        console.error('No document ID found for delete button');
      }
    }
  });
}

// Load deleted documents
function loadTrashDocuments(userId) {
  const q = query(collection(db, 'documents'), where('owner', '==', userId));

  onSnapshot(q, (querySnapshot) => {
    trashDocs = [];
    querySnapshot.forEach((docSnap) => {
      const docData = docSnap.data();
      // Only include documents that have been soft deleted (have deletedAt field)
      if (docData.deletedAt) {
        docData.id = docSnap.id;
        trashDocs.push(docData);
      }
    });

    trashLoading.style.display = 'none';
    displayTrashDocuments();
  });
}

// Display trash documents
function displayTrashDocuments() {
  trashList.innerHTML = '';

  if (trashDocs.length === 0) {
    emptyTrashMessage.classList.remove('hidden');
    return;
  }

  emptyTrashMessage.classList.add('hidden');

  trashDocs.forEach((docData) => {
    const docId = docData.id;
    const deletedAt = docData.deletedAt.toDate().toLocaleString();
    const daysUntilDeletion = Math.max(0, Math.ceil((docData.deletedAt.toDate().getTime() + 30 * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000)));

    const docItem = document.createElement('div');
    docItem.className = 'bg-white p-6 rounded-lg shadow-sm border border-gray-200';
    docItem.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-gray-800">${docData.title}</h3>
          ${docData.description ? `<p class="text-gray-600 text-sm mt-1">${docData.description}</p>` : ''}
          <div class="flex items-center space-x-4 mt-2 text-sm text-gray-500">
            <span>Deleted: ${deletedAt}</span>
            <span class="text-red-600">${daysUntilDeletion} days until permanent deletion</span>
          </div>
        </div>
        <div class="flex space-x-2">
          <button class="restore-btn bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition duration-200" data-docid="${docId}">
            Restore
          </button>
          <button class="delete-btn bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition duration-200" data-docid="${docId}">
            Delete Forever
          </button>
        </div>
      </div>
    `;

    trashList.appendChild(docItem);
  });

  // Event listeners are now handled by event delegation in initTrash()
}

// Restore document
async function restoreDocument(docId) {
  if (!docId || typeof docId !== 'string' || docId.trim() === '') {
    console.error('Invalid document ID provided for restoration:', docId);
    alert('Error: Invalid document ID');
    return;
  }

  try {
    console.log('Attempting to restore document:', docId);
    const docRef = doc(db, 'documents', docId);
    // Remove the deletedAt field to restore the document
    const updateData = {
      updatedAt: Timestamp.now()
    };
    // Use Firestore's FieldValue.delete() to remove the field
    const { deleteField } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    updateData.deletedAt = deleteField();

    await updateDoc(docRef, updateData);
    console.log('Successfully restored document:', docId);
  } catch (error) {
    console.error('Error restoring document:', error);
    alert('Error restoring document: ' + error.message);
  }
}

// Permanently delete document
async function permanentlyDeleteDocument(docId) {
  if (!docId || typeof docId !== 'string' || docId.trim() === '') {
    console.error('Invalid document ID provided for deletion:', docId);
    alert('Error: Invalid document ID');
    return;
  }

  try {
    console.log('Attempting to permanently delete document:', docId);
    const docRef = doc(db, 'documents', docId);
    await deleteDoc(docRef);
    console.log('Successfully deleted document:', docId);
  } catch (error) {
    console.error('Error deleting document:', error);
    alert('Error deleting document: ' + error.message);
  }
}

// Empty trash
async function emptyTrash() {
  try {
    console.log('Attempting to empty trash with', trashDocs.length, 'documents');
    const deletePromises = trashDocs.map(docData => {
      console.log('Deleting document:', docData.id);
      return deleteDoc(doc(db, 'documents', docData.id));
    });
    await Promise.all(deletePromises);
    console.log('Successfully emptied trash');
  } catch (error) {
    console.error('Error emptying trash:', error);
    alert('Error emptying trash: ' + error.message);
  }
}

// Initialize trash when DOM is loaded
document.addEventListener('DOMContentLoaded', initTrash);