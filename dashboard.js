// Import Firebase services
import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, updateDoc, getDocs, Timestamp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// DOM elements
const userGreeting = document.getElementById('userGreeting');
const profileBtn = document.getElementById('profileBtn');
const profileDropdown = document.getElementById('profileDropdown');
const accountSettingsBtn = document.getElementById('accountSettingsBtn');
const logoutBtn = document.getElementById('logoutBtn');
const searchInput = document.getElementById('searchInput');
const documentsList = document.getElementById('documentsList');
const documentsLoading = document.getElementById('documentsLoading');
const sortSelect = document.getElementById('sortSelect');
const searchResults = document.getElementById('searchResults');
const blankDoc = document.getElementById('blankDoc');
const letterTemplate = document.getElementById('letterTemplate');
const openFromComputer = document.getElementById('openFromComputer');
const fileInput = document.getElementById('fileInput');
const newDocModal = document.getElementById('newDocModal');
const newDocForm = document.getElementById('newDocForm');
const docTitle = document.getElementById('docTitle');
const docDescription = document.getElementById('docDescription');
const newDocError = document.getElementById('newDocError');
const closeModal = document.querySelector('.close-modal');
const createBtn = document.getElementById('createBtn');
const loadingModal = document.getElementById('loadingModal');
const saveAsModal = document.getElementById('saveAsModal');
const confirmSaveBtn = document.getElementById('confirmSaveBtn');
const closeSaveModal = document.querySelector('.close-save-modal');
const editTitleModal = document.getElementById('editTitleModal');
const editTitleForm = document.getElementById('editTitleForm');
const editDocTitle = document.getElementById('editDocTitle');
const saveTitleBtn = document.getElementById('saveTitleBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const closeEditModal = document.querySelector('.close-edit-modal');
const editTitleError = document.getElementById('editTitleError');

let allDocs = [];
let searchTerm = '';
let currentSaveDoc = null;
let currentEditDocId = null;

// Loading modal functions
function showLoading() {
  loadingModal.classList.remove('hidden');
  loadingModal.classList.add('flex');
}

function hideLoading() {
  loadingModal.classList.add('hidden');
  loadingModal.classList.remove('flex');
}

// Generate unique document title
function generateUniqueTitle(baseTitle) {
  const existingTitles = allDocs.map(doc => doc.title);
  if (!existingTitles.includes(baseTitle)) {
    return baseTitle;
  }

  let counter = 1;
  let newTitle = `${baseTitle} (${counter})`;
  while (existingTitles.includes(newTitle)) {
    counter++;
    newTitle = `${baseTitle} (${counter})`;
  }
  return newTitle;
}

// Generate unique document title for templates (also checks trash to avoid conflicts)
async function generateUniqueTitleForTemplate(baseTitle, userId) {
  // Get all non-deleted documents
  const existingTitles = allDocs.map(doc => doc.title);

  // Also check trash for potential conflicts when restoring
  const trashQuery = query(collection(db, 'documents'), where('owner', '==', userId));
  const trashSnapshot = await getDocs(trashQuery);
  const trashTitles = [];
  trashSnapshot.forEach(doc => {
    const data = doc.data();
    if (data.deletedAt) {
      trashTitles.push(data.title);
    }
  });

  const allExistingTitles = [...existingTitles, ...trashTitles];

  if (!allExistingTitles.includes(baseTitle)) {
    return baseTitle;
  }

  let counter = 1;
  let newTitle = `${baseTitle} (${counter})`;
  while (allExistingTitles.includes(newTitle)) {
    counter++;
    newTitle = `${baseTitle} (${counter})`;
  }
  return newTitle;
}

function initDashboard() {
  // Profile button - go to account page
  if (profileBtn) {
    profileBtn.addEventListener('click', () => {
      window.location.href = 'account.html';
    });
  }

  // Check authentication state
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // User is signed in
      userGreeting.textContent = `Hello, ${user.displayName || 'User'}!`;
      // Update profile button with first letter of name
      const firstLetter = (user.displayName || 'U').charAt(0).toUpperCase();
      if (profileBtn) {
        profileBtn.className = 'flex items-center justify-center w-10 h-10 bg-blue-600 rounded-full hover:bg-blue-700 transition duration-200';
        profileBtn.innerHTML = `<span class="text-xl font-bold text-white">${firstLetter}</span>`;
      }
      loadDocuments(user.uid);
    } else {
      // User is signed out, redirect to login
      window.location.href = 'index.html';
    }
  });

  // Logout functionality
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await signOut(auth);
        window.location.href = 'index.html';
      } catch (error) {
        console.error('Error signing out:', error);
      }
    });
  }

  // Search
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value.toLowerCase();
      displayDocuments();
    });
  }

  // Dismiss search dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#searchContainer')) {
      if (searchResults) searchResults.classList.add('hidden');
    }
  });

  // Sort
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      displayDocuments();
    });
  }

  // Template event listeners
  if (blankDoc) {
    blankDoc.addEventListener('click', () => {
      if (newDocModal) {
        newDocModal.classList.remove('hidden');
        newDocModal.classList.add('flex');
        if (docTitle) docTitle.focus();
      }
    });
  }
  if (letterTemplate) {
    letterTemplate.addEventListener('click', () => createDocumentFromTemplate(getLetterContent(), 'Letter'));
  }
  if (openFromComputer && fileInput) {
    openFromComputer.addEventListener('click', () => fileInput.click());
  }

  // Modal event listeners
  if (closeModal && newDocModal && newDocForm && newDocError) {
    closeModal.addEventListener('click', () => {
      newDocModal.classList.add('hidden');
      newDocModal.classList.remove('flex');
      newDocForm.reset();
      newDocError.textContent = '';
    });
  }

  // Save As modal
  if (closeSaveModal && saveAsModal) {
    closeSaveModal.addEventListener('click', () => {
      saveAsModal.classList.add('hidden');
      saveAsModal.classList.remove('flex');
      currentSaveDoc = null;
    });
  }

  if (confirmSaveBtn) {
    confirmSaveBtn.addEventListener('click', () => {
      if (currentSaveDoc) {
        const format = document.querySelector('input[name="format"]:checked').value;
        downloadDocument(currentSaveDoc, format);
        if (saveAsModal) {
          saveAsModal.classList.add('hidden');
          saveAsModal.classList.remove('flex');
        }
        currentSaveDoc = null;
      }
    });
  }

  // Edit title modal
  if (closeEditModal && editTitleModal && editTitleForm && editTitleError) {
    closeEditModal.addEventListener('click', () => {
      editTitleModal.classList.add('hidden');
      editTitleModal.classList.remove('flex');
      currentEditDocId = null;
      editTitleForm.reset();
      editTitleError.textContent = '';
    });
  }

  if (cancelEditBtn && editTitleModal && editTitleForm && editTitleError) {
    cancelEditBtn.addEventListener('click', () => {
      editTitleModal.classList.add('hidden');
      editTitleModal.classList.remove('flex');
      currentEditDocId = null;
      editTitleForm.reset();
      editTitleError.textContent = '';
    });
  }

  if (editTitleForm) {
    editTitleForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!currentEditDocId) return;

      const newTitle = editDocTitle.value.trim() || 'Untitled Document';
      const success = await updateDocTitle(currentEditDocId, newTitle);

      if (success) {
        if (editTitleModal) {
          editTitleModal.classList.add('hidden');
          editTitleModal.classList.remove('flex');
        }
        currentEditDocId = null;
        if (editTitleForm) editTitleForm.reset();
        if (editTitleError) editTitleError.textContent = '';
      }
    });
  }

  if (newDocForm) {
    newDocForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const user = auth.currentUser;
      if (!user) return;

      const baseTitle = (docTitle ? docTitle.value.trim() : '') || 'Untitled Document';
      const uniqueTitle = generateUniqueTitle(baseTitle);
      const description = docDescription ? docDescription.value.trim() : '';

      showLoading();
      if (newDocModal) {
        newDocModal.classList.add('hidden');
        newDocModal.classList.remove('flex');
      }
      if (newDocError) newDocError.textContent = '';

      const docId = Date.now().toString();
      const docRef = doc(db, 'documents', docId);

      try {
        await setDoc(docRef, {
          title: uniqueTitle,
          description: description,
          content: '',
          owner: user.uid,
          collaborators: [],
          updatedAt: Timestamp.now()
        });

        window.location.href = `editor.html?docId=${docId}`;
      } catch (error) {
        console.error('Error creating document:', error);
        if (newDocError) newDocError.textContent = error.message;
        hideLoading();
        if (newDocModal) {
          newDocModal.classList.remove('hidden');
          newDocModal.classList.add('flex');
        }
      }
    });
  }

  // File input handler
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        showLoading();
        const baseTitle = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
        if (file.name.toLowerCase().endsWith('.docx')) {
          try {
            const zip = await JSZip.loadAsync(file);
            const xml = await zip.file('word/document.xml').async('text');
            const plainText = xml.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, "'");
            await createDocumentFromTemplate(plainText, baseTitle);
          } catch (error) {
            hideLoading();
            alert('Error reading DOCX file');
          }
        } else {
          const reader = new FileReader();
          reader.onload = async (event) => {
            const content = event.target.result;
            await createDocumentFromTemplate(content, baseTitle);
          };
          reader.onerror = () => {
            hideLoading();
            alert('Error reading file');
          };
          reader.readAsText(file);
        }
      }
    });
  }
}

// Load and display documents
function loadDocuments(userId) {
  if (!documentsList) return;
  const q = query(collection(db, 'documents'), where('owner', '==', userId));

  onSnapshot(q, (querySnapshot) => {
    allDocs = [];
    querySnapshot.forEach((docSnap) => {
      const docData = docSnap.data();
      // Only include documents that haven't been soft deleted
      if (!docData.deletedAt) {
        docData.id = docSnap.id;
        allDocs.push(docData);
      }
    });
    // Hide loading indicator on first data load
    if (documentsLoading) {
      documentsLoading.style.display = 'none';
    }
    displayDocuments();
  });
}

// Update document title
async function updateDocTitle(docId, newTitle) {
  const existingTitles = allDocs.filter(doc => doc.id !== docId).map(doc => doc.title);
  if (existingTitles.includes(newTitle)) {
    editTitleError.textContent = 'A document with this name already exists. Please choose a different name.';
    return false;
  }

  showLoading();
  try {
    const docRef = doc(db, 'documents', docId);
    await updateDoc(docRef, {
      title: newTitle,
      updatedAt: Timestamp.now()
    });
    editTitleError.textContent = '';
    return true;
  } catch (error) {
    console.error('Error updating document title:', error);
    editTitleError.textContent = error.message;
    return false;
  } finally {
    hideLoading();
  }
}

// Create document from template
async function createDocumentFromTemplate(content, title) {
  const user = auth.currentUser;
  if (!user) return;

  showLoading();

  const uniqueTitle = await generateUniqueTitleForTemplate(title, user.uid);
  const docId = Date.now().toString();
  const docRef = doc(db, 'documents', docId);

  try {
    await setDoc(docRef, {
      title: uniqueTitle,
      description: '',
      content: content,
      owner: user.uid,
      collaborators: [],
      updatedAt: Timestamp.now()
    });
    window.location.href = `editor.html?docId=${docId}`;
  } catch (error) {
    console.error('Error creating document:', error);
    hideLoading();
  }
}

// Template content functions
function getLetterContent() {
  return `<p>[Your Name]<br>
[Your Address]<br>
[City, State, ZIP Code]<br>
[Email Address]<br>
[Phone Number]<br>
[Date]</p>

<p>[Recipient's Name]<br>
[Recipient's Title]<br>
[Company Name]<br>
[Company Address]<br>
[City, State, ZIP Code]</p>

<p>Dear [Recipient's Name],</p>

<p>Introduction paragraph stating the purpose of the letter.</p>

<p>Body paragraphs providing details and supporting information.</p>

<p>Conclusion paragraph summarizing the main points and stating next steps.</p>

<p>Sincerely,<br>
[Your Name]</p>`;
}

// Download document in specified format
function downloadDocument(docData, format = 'html') {
  const htmlContent = docData.content || '';
  const filename = `${docData.title}`;

  if (format === 'pdf') {
    // Use html2pdf for PDF generation
    const element = document.createElement('div');
    element.innerHTML = htmlContent;
    element.style.padding = '20px';
    element.style.fontFamily = 'Arial, sans-serif';

    const opt = {
      margin: 1,
      filename: `${filename}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  } else if (format === 'docx') {
    // Create proper DOCX file using JSZip
    const zip = new JSZip();

    // Extract plain text from HTML
    const plainText = htmlContent.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, "'");

    // [Content_Types].xml
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

    // _rels/.rels
    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

    // word/_rels/document.xml.rels
    zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`);

    // word/document.xml
    zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>${plainText}</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`);

    // word/styles.xml (basic styles)
    zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/>
        <w:sz w:val="24"/>
        <w:szCs w:val="24"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`);

    // Generate the ZIP file
    zip.generateAsync({ type: 'blob' }).then(function(content) {
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  } else if (format === 'txt') {
    // Plain text
    const content = htmlContent.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, "'");
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  } else {
    // HTML format
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }
}

// Display documents with filter and sort
function displayDocuments() {
  // Make it global for HTML access
  window.displayDocuments = displayDocuments;
  if (!documentsList) return;
  documentsList.innerHTML = '';

  // Filter documents for search results
  let filteredDocs = allDocs.filter((docData) => {
    if (searchTerm && !docData.title.toLowerCase().includes(searchTerm) && !(docData.description && docData.description.toLowerCase().includes(searchTerm))) return false;
    return true;
  });

  // Sort documents for display
  const sortBy = sortSelect.value;
  let displayDocs = [...allDocs]; // Always show all for recent files
  displayDocs.sort((a, b) => {
    switch (sortBy) {
      case 'name-asc':
        return a.title.localeCompare(b.title);
      case 'name-desc':
        return b.title.localeCompare(a.title);
      case 'modified-asc':
        return a.updatedAt.toDate() - b.updatedAt.toDate();
      case 'modified-desc':
      default:
        return b.updatedAt.toDate() - a.updatedAt.toDate();
    }
  });

  displayDocs.forEach((docData) => {
    const docId = docData.id;
    const updatedAt = docData.updatedAt.toDate().toLocaleString();

    const isGridView = documentsList.classList.contains('grid');

    const docItem = document.createElement('div');
    if (isGridView) {
      docItem.className = 'bg-white p-4 rounded-lg shadow-sm hover:shadow-md hover:scale-105 transition duration-300 border border-gray-200 cursor-pointer flex flex-col';
      docItem.dataset.docid = docId;
      // Extract plain text preview from content
      const plainContent = docData.content ? docData.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"').replace(/'/g, "'").trim() : '';
      const contentPreview = plainContent.length > 150 ? plainContent.substring(0, 150) + '...' : plainContent;

      docItem.innerHTML = `
        <div class="flex flex-col">
          <!-- Document preview box -->
          <div class="bg-gray-50 border-2 border-gray-200 rounded-md p-3 mb-3 h-80 relative">
            <!-- More options button -->
            <button class="absolute top-2 right-2 text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-100 more-btn" data-docid="${docId}" title="More options">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
            </button>

            <!-- Dropdown menu (hidden by default) -->
            <div class="absolute top-8 right-2 bg-white border border-gray-300 rounded-md shadow-lg w-40 z-10 hidden dropdown-menu" data-docid="${docId}">
              <button class="w-full text-left px-3 py-2 text-sm text-indigo-600 hover:bg-gray-100 edit-btn" data-docid="${docId}">
                <svg class="w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
                Edit title
              </button>
              <button class="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-gray-100 open-btn" data-docid="${docId}">
                <svg class="w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                Open
              </button>
              <button class="w-full text-left px-3 py-2 text-sm text-purple-600 hover:bg-gray-100 share-btn" data-docid="${docId}">
                <svg class="w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"/>
                </svg>
                Share
              </button>
              <button class="w-full text-left px-3 py-2 text-sm text-green-600 hover:bg-gray-100 save-as-btn" data-docid="${docId}">
                <svg class="w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                </svg>
                Download
              </button>
              <button class="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 copy-btn" data-docid="${docId}">
                <svg class="w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
                Duplicate
              </button>
              <button class="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100 delete-btn" data-docid="${docId}">
                <svg class="w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                Delete
              </button>
            </div>

            <div class="text-xs text-gray-700 leading-tight overflow-hidden pr-8">
              ${contentPreview || 'No content preview available'}
            </div>
          </div>

          <!-- File info -->
          <div>
            <h3 class="text-sm font-semibold mb-1 line-clamp-2" id="title-${docId}" contenteditable="false">${docData.title}</h3>
            <span class="text-gray-500 text-xs">Last modified: ${updatedAt}</span>
          </div>
        </div>
      `;
    } else {
      docItem.className = 'bg-white p-4 rounded-lg shadow-sm hover:shadow-md hover:scale-105 transition duration-300 border border-gray-200 cursor-pointer';
      docItem.dataset.docid = docId;
      const description = docData.description ? `<span class="text-gray-600 text-sm"> - ${docData.description}</span>` : '';
      docItem.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <h3 class="text-lg font-semibold inline" id="title-${docId}" contenteditable="false">${docData.title}</h3>
            ${description}
            <span class="text-gray-500 text-sm ml-4">Last modified: ${updatedAt}</span>
          </div>
          <div class="flex space-x-2">
            <button class="text-indigo-600 hover:text-indigo-500 p-2 rounded hover:bg-gray-100 edit-btn" data-docid="${docId}" title="Edit document title"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
            <button class="text-blue-600 hover:text-blue-700 p-2 rounded hover:bg-gray-100 open-btn" data-docid="${docId}" title="Open document"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
            <button class="text-purple-600 hover:text-purple-500 p-2 rounded hover:bg-gray-100 share-btn" data-docid="${docId}" title="Share document"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"/></svg></button>
            <button class="text-green-600 hover:text-green-500 p-2 rounded hover:bg-gray-100 save-as-btn" data-docid="${docId}" title="Download document"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg></button>
            <button class="text-gray-600 hover:text-gray-500 p-2 rounded hover:bg-gray-100 copy-btn" data-docid="${docId}" title="Duplicate document"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg></button>
            <button class="text-red-600 hover:text-red-500 p-2 rounded hover:bg-gray-100 delete-btn" data-docid="${docId}" title="Delete document"><svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
          </div>
        </div>
      `;
    }

    documentsList.appendChild(docItem);
  });

  // Add click event listeners for document items
  document.querySelectorAll('[data-docid]').forEach(item => {
    if (item.classList.contains('bg-white')) { // Only for document list items
      item.addEventListener('click', (e) => {
        // Don't trigger if clicking on buttons
        if (!e.target.closest('button')) {
          const docId = item.dataset.docid;
          window.location.href = `editor.html?docId=${docId}`;
        }
      });
    }
  });

  // Event delegation for dynamically created buttons
  documentsList.addEventListener('click', async (e) => {
    const target = e.target;
    const button = target.closest('button');

    if (!button) return;

    const docId = button.dataset.docid;
    if (!docId) return;

    // Handle more options dropdown
    if (button.classList.contains('more-btn')) {
      e.stopPropagation();
      const dropdown = button.parentElement.querySelector('.dropdown-menu');
      // Close all other dropdowns first
      document.querySelectorAll('.dropdown-menu').forEach(menu => {
        if (menu !== dropdown) menu.classList.add('hidden');
      });
      dropdown.classList.toggle('hidden');
      return;
    }

    // Close dropdowns when clicking other buttons
    document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.add('hidden'));

    if (button.classList.contains('edit-btn')) {
      const docData = allDocs.find(d => d.id === docId);
      if (docData) {
        currentEditDocId = docId;
        editDocTitle.value = docData.title;
        editTitleModal.classList.remove('hidden');
        editTitleModal.classList.add('flex');
        editDocTitle.focus();
      }
    }

    if (button.classList.contains('open-btn')) {
      window.location.href = `editor.html?docId=${docId}`;
    }

    if (button.classList.contains('share-btn')) {
      const shareUrl = `${window.location.origin}/editor.html?docId=${docId}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert('Share link copied to clipboard!');
      }).catch(err => {
        console.error('Failed to copy: ', err);
        prompt('Copy this link:', shareUrl);
      });
    }

    if (button.classList.contains('save-as-btn')) {
      const docData = allDocs.find(d => d.id === docId);
      if (docData) {
        currentSaveDoc = docData;
        saveAsModal.classList.remove('hidden');
        saveAsModal.classList.add('flex');
      }
    }

    if (button.classList.contains('copy-btn')) {
      const docData = allDocs.find(d => d.id === docId);
      if (docData) {
        try {
          await createDocumentFromTemplate(docData.content, `Copy of ${docData.title}`);
        } catch (error) {
          console.error('Error duplicating document:', error);
        }
      }
    }

    if (button.classList.contains('delete-btn')) {
      if (!docId || typeof docId !== 'string' || docId.trim() === '') {
        console.error('Invalid document ID for deletion:', docId);
        alert('Error: Invalid document ID');
        return;
      }

      if (confirm('Are you sure you want to delete this document? It will be moved to trash.')) {
        try {
          console.log('Attempting to soft delete document:', docId);
          const docRef = doc(db, 'documents', docId);
          await updateDoc(docRef, {
            deletedAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });
          console.log('Successfully moved document to trash:', docId);
        } catch (error) {
          console.error('Error deleting document:', error);
          alert('Error deleting document: ' + error.message);
        }
      }
    }
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.more-btn') && !e.target.closest('.dropdown-menu')) {
      document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.add('hidden'));
    }
  });

  // Show search results below search bar if searching
  if (searchTerm) {
    searchResults.innerHTML = '';
    filteredDocs.forEach((docData) => {
      const docId = docData.id;
      const updatedAt = docData.updatedAt.toDate().toLocaleString();

      const resultItem = document.createElement('div');
      resultItem.className = 'p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0';
      resultItem.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <h3 class="text-sm font-semibold">${docData.title}</h3>
            ${docData.description ? `<span class="text-gray-600 text-xs"> - ${docData.description}</span>` : ''}
            <span class="text-gray-500 text-xs ml-2">Last modified: ${updatedAt}</span>
          </div>
        </div>
      `;

      resultItem.addEventListener('click', () => {
        window.location.href = `editor.html?docId=${docId}`;
        searchResults.classList.add('hidden');
        searchInput.value = '';
        searchTerm = '';
      });

      searchResults.appendChild(resultItem);
    });
    searchResults.classList.remove('hidden');
  } else {
    searchResults.classList.add('hidden');
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', initDashboard);