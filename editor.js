// Import Firebase services
import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { doc, onSnapshot, getDoc, updateDoc, Timestamp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// Get document ID from URL
const urlParams = new URLSearchParams(window.location.search);
const docId = urlParams.get('docId');

if (!docId) {
  window.location.href = 'dashboard.html';
}

// DOM elements
const docTitle = document.getElementById('docTitle');
const saveStatus = document.getElementById('saveStatus');
const backBtn = document.getElementById('backBtn');
const fileBtn = document.getElementById('fileBtn');
const fileDropdown = document.getElementById('fileDropdown');
const saveBtn = document.getElementById('saveBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const exportDocxBtn = document.getElementById('exportDocxBtn');
const printBtn = document.getElementById('printBtn');
const shareBtn = document.getElementById('shareBtn');
const shareModal = document.getElementById('shareModal');
const shareForm = document.getElementById('shareForm');
const collaboratorEmail = document.getElementById('collaboratorEmail');
const collaboratorRole = document.getElementById('collaboratorRole');
const loadingModal = document.getElementById('loadingModal');
const shareError = document.getElementById('shareError');
const commentsList = document.getElementById('commentsList');
const commentText = document.getElementById('commentText');
const addCommentBtn = document.getElementById('addCommentBtn');
const profileBtn = document.getElementById('profileBtn');
const profileDropdown = document.getElementById('profileDropdown');
const accountSettingsBtn = document.getElementById('accountSettingsBtn');
const logoutBtn = document.getElementById('logoutBtn');

// Quill editor
let quill;
let currentUser;
let docRef;
let isOwner = false;
let isLoaded = false;
let ignoreNextUpdate = false;
let currentComments = [];
let editingIndex = -1;

function initEditor() {
  // Initialize
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      docRef = doc(db, 'documents', docId);
      loadingModal.classList.remove('hidden');
      loadingModal.classList.add('flex');
      initializeEditor();
      loadDocument();
    } else {
      window.location.href = 'index.html';
    }
  });
}

function initializeEditor() {
  // Initialize Quill
  quill = new Quill('#editor', {
    theme: 'snow',
    placeholder: 'Start writing...',
    modules: {
    toolbar: [
      [{ 'font': [] }],
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': '' }],       // Left align
        [{ 'align': 'center' }], // Center align
        [{ 'align': 'right' }],  // Right align
    ]
  }

  });

  // Auto-save on content change
  quill.on('text-change', () => {
    saveStatus.textContent = 'Saving...';
    debouncedSave();
  });

  // Save title on change
  docTitle.addEventListener('input', () => {
    saveStatus.textContent = 'Saving...';
    debouncedSave();
  });
}

// Save document function
async function saveDocument() {
  try {
    const content = quill.root.innerHTML;
    const title = docTitle.value || 'Untitled Document';

    await updateDoc(docRef, {
      title: title,
      content: content,
      updatedAt: Timestamp.now()
    });

    saveStatus.textContent = 'Saved';
    ignoreNextUpdate = true;
  } catch (error) {
    console.error('Error saving:', error);
    saveStatus.textContent = 'Error saving';
  }
}

// Debounced save function
let saveTimeout;
function debouncedSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveDocument();
  }, 1000);
}

// Load document
function loadDocument() {
  onSnapshot(docRef, (docSnap) => {
    if (ignoreNextUpdate) {
      ignoreNextUpdate = false;
      return;
    }
    if (docSnap.exists()) {
      const data = docSnap.data();

      // Check permissions
      if (data.owner !== currentUser.uid && !data.collaborators.includes(currentUser.email)) {
        loadingModal.classList.add('hidden');
        loadingModal.classList.remove('flex');
        alert('You do not have permission to view this document.');
        window.location.href = 'dashboard.html';
        return;
      }

      isOwner = data.owner === currentUser.uid;

      // Set title and content
      docTitle.value = data.title;
      quill.root.innerHTML = data.content;
      if (!isLoaded) {
        // Set cursor to end on initial load
        quill.setSelection(quill.getLength(), 0);
        isLoaded = true;
        loadingModal.classList.add('hidden');
        loadingModal.classList.remove('flex');
      }

      // Load comments
      loadComments(data.comments || []);
    } else {
      loadingModal.classList.add('hidden');
      loadingModal.classList.remove('flex');
      alert('Document not found.');
      window.location.href = 'dashboard.html';
    }
  });
}

// Load comments
function loadComments(comments) {
  currentComments = comments;
  commentsList.innerHTML = '';
  comments.forEach((comment, index) => {
    const isEditing = editingIndex === index;
    const commentEl = document.createElement('div');
    commentEl.className = 'bg-white border border-gray-200 p-3 rounded-md shadow-md';
    let buttons = '';
    if (comment.author === currentUser.email) {
      if (isEditing) {
        buttons = `<div class="flex space-x-1">
          <span class="save-btn cursor-pointer text-green-500" data-index="${index}" title="Save">✅</span>
          <span class="cancel-btn cursor-pointer text-gray-500" data-index="${index}" title="Cancel">❌</span>
        </div>`;
      } else {
        buttons = `<div class="flex space-x-1">
          <span class="edit-btn cursor-pointer text-blue-500" data-index="${index}" title="Edit">✏️</span>
          <span class="delete-btn cursor-pointer text-red-500" data-index="${index}" title="Delete">🗑️</span>
        </div>`;
      }
    }
    commentEl.innerHTML = `
      <div class="flex justify-between items-center mb-1">
        <div class="font-semibold text-sm text-gray-800">${comment.author}</div>
        ${buttons}
      </div>
      <div class="text-xs text-gray-400 mb-2">${comment.timestamp.toDate().toLocaleString()}</div>
      <div class="text-sm text-gray-700 comment-text ${isEditing ? 'border border-gray-300 p-1' : ''}" data-index="${index}" ${isEditing ? 'contenteditable="true"' : ''}>${comment.text}</div>
    `;
    commentsList.appendChild(commentEl);
  });
}



// Back button
backBtn.addEventListener('click', () => {
  window.location.href = 'dashboard.html';
});

// File dropdown toggle
fileBtn.addEventListener('click', () => {
  fileDropdown.classList.toggle('hidden');
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!fileBtn.contains(e.target) && !fileDropdown.contains(e.target)) {
    fileDropdown.classList.add('hidden');
  }
});

// Save button
saveBtn.addEventListener('click', async () => {
  saveStatus.textContent = 'Saving...';
  await saveDocument();
  fileDropdown.classList.add('hidden');
});

// Export PDF button
exportPdfBtn.addEventListener('click', () => {
  const title = docTitle.value || 'Untitled Document';
  const element = document.createElement('div');
  element.innerHTML = quill.root.innerHTML;
  element.style.padding = '1in';
  html2pdf(element, {
    filename: `${title}.pdf`,
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  });
  fileDropdown.classList.add('hidden');
});

// Export DOCX button
exportDocxBtn.addEventListener('click', () => {
  const title = docTitle.value || 'Untitled Document';
  const content = `<html><head><title>${title}</title><style>body { margin: 1in; }</style></head><body>${quill.root.innerHTML}</body></html>`;
  const converted = htmlDocx.asBlob(content);
  const url = URL.createObjectURL(converted);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}.docx`;
  a.click();
  URL.revokeObjectURL(url);
  fileDropdown.classList.add('hidden');
});

// Print button
printBtn.addEventListener('click', () => {
  window.print();
  fileDropdown.classList.add('hidden');
});

// Share modal
shareBtn.addEventListener('click', () => {
  if (!isOwner) {
    alert('Only the owner can share this document.');
    return;
  }
  shareModal.classList.remove('hidden');
  shareModal.classList.add('flex');
});

// Close modal
document.querySelector('.close').addEventListener('click', () => {
  shareModal.classList.add('hidden');
  shareModal.classList.remove('flex');
});

// Share form
shareForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = collaboratorEmail.value;
  const role = collaboratorRole.value;

  try {
    // In a real app, you'd check if the email exists, but for simplicity:
    const docSnap = await getDoc(docRef);
    const data = docSnap.data();
    await updateDoc(docRef, {
      collaborators: [...(data.collaborators || []), email]
    });

    shareModal.classList.add('hidden');
    shareModal.classList.remove('flex');
    collaboratorEmail.value = '';
  } catch (error) {
    shareError.textContent = error.message;
  }
});

// Profile dropdown
profileBtn.addEventListener('click', () => {
  profileDropdown.classList.toggle('hidden');
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!profileBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
    profileDropdown.classList.add('hidden');
  }
});

// Account settings
accountSettingsBtn.addEventListener('click', () => {
  window.location.href = 'account.html';
  profileDropdown.classList.add('hidden');
});

// Logout
logoutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Error signing out:', error);
  }
});

// Add comment
addCommentBtn.addEventListener('click', async () => {
  const text = commentText.value.trim();
  if (!text) return;

  try {
    const docSnap = await getDoc(docRef);
    const data = docSnap.data();
    const comments = data.comments || [];

    const newComment = {
      author: currentUser.email,
      text: text,
      timestamp: Timestamp.now().toDate()
    };

    comments.push(newComment);
    currentComments = [...comments];

    await updateDoc(docRef, { comments: comments });

    loadComments(currentComments);

    commentText.value = '';
  } catch (error) {
    console.error('Error adding comment:', error);
  }
});

// Comment event listeners
commentsList.addEventListener('click', async (e) => {
  if (e.target.classList.contains('delete-btn')) {
    const index = parseInt(e.target.dataset.index);
    try {
      const docSnap = await getDoc(docRef);
      const data = docSnap.data();
      const comments = data.comments || [];
      comments.splice(index, 1);
      currentComments = [...comments];
      await updateDoc(docRef, { comments });
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  }

  if (e.target.classList.contains('edit-btn')) {
    editingIndex = parseInt(e.target.dataset.index);
    loadComments(currentComments);
  }

  if (e.target.classList.contains('save-btn')) {
    const index = parseInt(e.target.dataset.index);
    const commentEl = e.target.closest('.bg-white');
    const textEl = commentEl.querySelector('.comment-text');
    const newText = textEl.textContent.trim();
    editingIndex = -1;
    try {
      const docSnap = await getDoc(docRef);
      const data = docSnap.data();
      const comments = data.comments || [];
      comments[index].text = newText;
      currentComments = [...comments];
      await updateDoc(docRef, { comments });
      loadComments(currentComments);
    } catch (error) {
      console.error('Error saving comment:', error);
      loadComments(currentComments); // re-render if error
    }
  }

  if (e.target.classList.contains('cancel-btn')) {
    editingIndex = -1;
    loadComments(currentComments);
  }
});

// Initialize editor when DOM is loaded
document.addEventListener('DOMContentLoaded', initEditor);