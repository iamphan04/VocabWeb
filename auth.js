/* ========================================================
   VocabMaster – auth.js
   Hybrid Authentication & Multi-User Vocabulary Sync
   ──────────────────────────────────────────────────────────
   Supports:
   1. Local Account Manager (Works immediately without any setup:
      multiple users can create accounts & log in, each has their
      own independent vocabulary).
   2. Firebase Cloud Auth & Cloud Firestore Sync (Activates
      automatically when firebase-config.js is configured).
   3. Password Visibility Toggle.
   ======================================================== */

// Storage keys
const LOCAL_ACCOUNTS_KEY = 'vocab_local_accounts';
const CURRENT_USER_SESSION_KEY = 'vocab_current_user_session';

// ── Firebase App References ──────────────────────────────
let firebaseApp = null;
let auth = null;
let db = null;
let currentUser = null;
let firestoreUnsubscribe = null;
let isGuestMode = false;

// Check if Firebase is actually configured with real keys
function isFirebaseConfigured() {
  return typeof firebaseConfig !== 'undefined' &&
         firebaseConfig &&
         firebaseConfig.apiKey &&
         firebaseConfig.apiKey !== 'YOUR_API_KEY';
}

// Initialize Firebase if configured
function initFirebase() {
  if (!isFirebaseConfigured()) return false;
  try {
    if (!firebase.apps.length) {
      firebaseApp = firebase.initializeApp(firebaseConfig);
    } else {
      firebaseApp = firebase.app();
    }
    auth = firebase.auth();
    db   = firebase.firestore();

    // Enable offline persistence for Firestore
    db.enablePersistence({ synchronizeTabs: true }).catch(err => {
      console.warn('Firestore persistence warning:', err.code);
    });

    // Listen for auth state changes
    auth.onAuthStateChanged(handleFirebaseAuthStateChanged);
    return true;
  } catch (err) {
    console.error('Firebase init error:', err);
    return false;
  }
}

// ── Auth State Handlers ───────────────────────────────────
function handleFirebaseAuthStateChanged(user) {
  if (user) {
    isGuestMode = false;
    currentUser = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email.split('@')[0],
      photoURL: user.photoURL,
      isLocal: false
    };
    saveUserSession(currentUser);
    showApp();
    startFirestoreSync();
  } else {
    // If not in guest mode and not in local account mode, show login
    if (!currentUser?.isLocal && !isGuestMode) {
      clearUserSession();
      currentUser = null;
      stopFirestoreSync();
      showLoginScreen();
    }
  }
}

// ── Local Accounts Engine ────────────────────────────────
function getLocalAccounts() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_ACCOUNTS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveLocalAccounts(accounts) {
  localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
}

function saveUserSession(user) {
  localStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(user));
}

function clearUserSession() {
  localStorage.removeItem(CURRENT_USER_SESSION_KEY);
}

function restoreUserSession() {
  try {
    const raw = localStorage.getItem(CURRENT_USER_SESSION_KEY);
    if (raw) {
      const user = JSON.parse(raw);
      if (user && user.email) {
        currentUser = user;
        isGuestMode = false;
        showApp();
        if (currentUser.isLocal) {
          loadWords();
          updateStats();
          filterWords();
          updateUserDisplay();
          updateSyncBadge('local-user');
        }
        return true;
      }
    }
  } catch (e) {
    console.warn('Session restore error:', e);
  }
  return false;
}

// ── Screen Toggling ──────────────────────────────────────
function showLoginScreen() {
  isGuestMode = false;
  const loginScr = document.getElementById('login-screen');
  const appCont = document.getElementById('app-container');
  if (loginScr) loginScr.style.display = 'flex';
  if (appCont) appCont.style.display = 'none';
  clearAuthForms();
}

function showApp() {
  const loginScr = document.getElementById('login-screen');
  const appCont = document.getElementById('app-container');
  if (loginScr) loginScr.style.display = 'none';
  if (appCont) appCont.style.display = 'block';
  updateUserDisplay();

  // Initialize quiz mode selection UI
  if (typeof setMode === 'function') {
    setMode('en-to-vi');
    const modeEl = document.getElementById('mode-en');
    if (modeEl) modeEl.classList.add('selected');
  }
}

function continueAsGuest() {
  isGuestMode = true;
  currentUser = null;
  clearUserSession();
  showApp();
  if (typeof initApp === 'function') {
    initApp();
  }
  updateUserDisplay();
  updateSyncBadge('local');
  if (typeof showToast === 'function') {
    showToast('Đang dùng chế độ Khách (Lưu trên thiết bị này)', 'info');
  }
}

function updateUserDisplay() {
  const nameEl = document.getElementById('user-display-name');
  const emailEl = document.getElementById('user-display-email');
  const avatarEl = document.getElementById('user-avatar');
  const actionsEl = document.getElementById('user-dropdown-actions');

  if (currentUser) {
    const displayName = currentUser.displayName || currentUser.email.split('@')[0];
    if (nameEl) nameEl.textContent = displayName;
    if (emailEl) emailEl.textContent = currentUser.email || '';

    if (avatarEl) {
      if (currentUser.photoURL) {
        avatarEl.innerHTML = `<img src="${currentUser.photoURL}" alt="Avatar" class="user-avatar-img" referrerpolicy="no-referrer" />`;
      } else {
        const initial = displayName.charAt(0).toUpperCase();
        avatarEl.innerHTML = `<span class="user-avatar-initial">${initial}</span>`;
      }
    }

    if (actionsEl) {
      actionsEl.innerHTML = `
        <button class="user-dropdown-item" onclick="openThemeModal(); toggleUserDropdown();">
          🎨 Tùy Chỉnh Màu Theme
        </button>
        <button class="user-dropdown-item danger" onclick="handleLogout()">
          🚪 Đăng Xuất (${displayName})
        </button>
      `;
    }

    if (currentUser.isLocal) {
      updateSyncBadge('local-user');
    } else {
      updateSyncBadge('synced');
    }
  } else {
    // Guest mode
    if (nameEl) nameEl.textContent = 'Khách (Chưa đăng nhập)';
    if (emailEl) emailEl.textContent = 'Dữ liệu lưu trên máy này';
    if (avatarEl) {
      avatarEl.innerHTML = `<span class="user-avatar-initial">👤</span>`;
    }
    if (actionsEl) {
      actionsEl.innerHTML = `
        <button class="user-dropdown-item" onclick="openThemeModal(); toggleUserDropdown();">
          🎨 Tùy Chỉnh Màu Theme
        </button>
        <button class="user-dropdown-item" onclick="showLoginScreen(); toggleUserDropdown();">
          🔐 Đăng Nhập / Tạo Tài Khoản
        </button>
      `;
    }
    updateSyncBadge('local');
  }
}

function updateSyncBadge(status) {
  const badge = document.getElementById('sync-status-badge');
  const icon = document.getElementById('sync-icon');
  const text = document.getElementById('sync-text');
  if (!badge || !icon || !text) return;

  badge.style.display = 'inline-flex';
  badge.className = 'sync-badge';

  if (status === 'syncing') {
    badge.classList.add('syncing');
    icon.textContent = '🔄';
    text.textContent = 'Đang lưu...';
  } else if (status === 'synced') {
    badge.classList.add('synced');
    icon.textContent = '☁️';
    text.textContent = 'Đã lưu Cloud';
  } else if (status === 'local-user') {
    badge.classList.add('synced');
    icon.textContent = '💾';
    text.textContent = 'Đã lưu máy';
  } else if (status === 'local') {
    icon.textContent = '💾';
    text.textContent = 'Offline';
  } else if (status === 'error') {
    icon.textContent = '⚠️';
    text.textContent = 'Lỗi lưu';
  }
}

// ── Password Visibility Toggle ───────────────────────────
function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
    btn.title = 'Ẩn mật khẩu';
    btn.setAttribute('aria-label', 'Ẩn mật khẩu');
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
    btn.title = 'Hiện mật khẩu';
    btn.setAttribute('aria-label', 'Hiện mật khẩu');
  }
}

// ── Login / Register Form Handlers ───────────────────────
function toggleAuthMode() {
  const container = document.getElementById('auth-form-container');
  const isLogin = container.dataset.mode === 'login';

  if (isLogin) {
    container.dataset.mode = 'register';
    document.getElementById('auth-form-title').textContent = 'Tạo Tài Khoản Mới';
    document.getElementById('auth-submit-btn').textContent = '🚀 Đăng Ký Tài Khoản';
    document.getElementById('auth-toggle-text').innerHTML = 
      'Đã có tài khoản? <a href="#" onclick="toggleAuthMode(); return false;">Đăng nhập ngay</a>';
    document.getElementById('auth-name-group').style.display = 'block';
    document.getElementById('auth-confirm-group').style.display = 'block';
  } else {
    container.dataset.mode = 'login';
    document.getElementById('auth-form-title').textContent = 'Đăng Nhập';
    document.getElementById('auth-submit-btn').textContent = '🔐 Đăng Nhập';
    document.getElementById('auth-toggle-text').innerHTML = 
      'Chưa có tài khoản? <a href="#" onclick="toggleAuthMode(); return false;">Đăng ký ngay</a>';
    document.getElementById('auth-name-group').style.display = 'none';
    document.getElementById('auth-confirm-group').style.display = 'none';
  }
  hideAuthError();
}

async function handleAuthSubmit(e) {
  if (e) e.preventDefault();

  const container = document.getElementById('auth-form-container');
  const mode      = container.dataset.mode || 'login';
  const email     = document.getElementById('auth-email').value.trim();
  const password  = document.getElementById('auth-password').value;
  const name      = (document.getElementById('auth-name')?.value || '').trim();
  const confirmPw = document.getElementById('auth-confirm-password')?.value || '';

  if (!email || !password) {
    showAuthError('Vui lòng nhập đầy đủ Email và Mật khẩu!');
    return;
  }

  if (mode === 'register') {
    if (password.length < 6) {
      showAuthError('Mật khẩu phải có ít nhất 6 ký tự!');
      return;
    }
    if (password !== confirmPw) {
      showAuthError('Mật khẩu xác nhận không khớp!');
      return;
    }
  }

  setAuthLoading(true);
  hideAuthError();

  try {
    if (isFirebaseConfigured() && auth) {
      // ── Firebase Cloud Auth Mode ──
      if (mode === 'register') {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        if (name) {
          await cred.user.updateProfile({ displayName: name });
        }
      } else {
        await auth.signInWithEmailAndPassword(email, password);
      }
    } else {
      // ── Local Multi-User Account Mode ──
      await handleLocalAuth(mode, email, password, name);
    }
  } catch (err) {
    console.error('Auth submit error:', err);
    showAuthError(getFirebaseErrorMessage(err));
  } finally {
    setAuthLoading(false);
  }
}

// Local Account Registration & Login
async function handleLocalAuth(mode, email, password, name) {
  const accounts = getLocalAccounts();
  const emailKey = email.toLowerCase();

  if (mode === 'register') {
    if (accounts[emailKey]) {
      throw new Error('Email này đã được đăng ký! Vui lòng bấm Đăng Nhập.');
    }

    // Save account
    accounts[emailKey] = {
      email: email,
      name: name || email.split('@')[0],
      password: btoa(encodeURIComponent(password)), // Obfuscate password
      createdAt: Date.now()
    };
    saveLocalAccounts(accounts);

    // Set user session
    currentUser = {
      uid: 'local_' + emailKey,
      email: email,
      displayName: name || email.split('@')[0],
      isLocal: true
    };
    saveUserSession(currentUser);

    // Initialize user vocabulary list
    const userStorageKey = `vocab_words_${emailKey}`;
    const existingRaw = localStorage.getItem(STORAGE_KEY);
    if (existingRaw) {
      localStorage.setItem(userStorageKey, existingRaw);
    } else {
      localStorage.setItem(userStorageKey, JSON.stringify(getDefaultWords()));
    }

    showApp();
    loadWords();
    updateStats();
    filterWords();
    updateUserDisplay();
    updateSyncBadge('local-user');

    if (typeof showToast === 'function') {
      showToast('🎉 Đăng ký tài khoản thành công! Từ vựng được lưu riêng cho bạn.', 'success');
    }
  } else {
    // Mode login
    const acc = accounts[emailKey];
    if (!acc) {
      throw new Error('Không tìm thấy tài khoản với email này! Bạn hãy bấm "Đăng ký ngay".');
    }

    const decodedPassword = decodeURIComponent(atob(acc.password));
    if (decodedPassword !== password) {
      throw new Error('Mật khẩu không chính xác! Vui lòng thử lại.');
    }

    // Set user session
    currentUser = {
      uid: 'local_' + emailKey,
      email: acc.email,
      displayName: acc.name || acc.email.split('@')[0],
      isLocal: true
    };
    saveUserSession(currentUser);

    showApp();
    loadWords();
    updateStats();
    filterWords();
    updateUserDisplay();
    updateSyncBadge('local-user');

    if (typeof showToast === 'function') {
      showToast(`👋 Chào mừng trở lại, ${currentUser.displayName}!`, 'success');
    }
  }
}

// ── Google Sign-In ───────────────────────────────────────
async function signInWithGoogle() {
  if (!isFirebaseConfigured() || !auth) {
    showAuthError('Chức năng Google Sign-In cần cấu hình Firebase. Bạn có thể đăng ký tài khoản bằng Email ở trên để dùng ngay!');
    return;
  }

  setAuthLoading(true);
  hideAuthError();
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
  } catch (err) {
    if (err.code !== 'auth/popup-closed-by-user') {
      showAuthError(getFirebaseErrorMessage(err));
    }
  } finally {
    setAuthLoading(false);
  }
}

// ── Password Reset ───────────────────────────────────────
async function handleForgotPassword() {
  const email = document.getElementById('auth-email').value.trim();
  if (!email) {
    showAuthError('Vui lòng nhập email để đặt lại mật khẩu!');
    return;
  }

  if (isFirebaseConfigured() && auth) {
    try {
      await auth.sendPasswordResetEmail(email);
      showAuthSuccess('📧 Email đặt lại mật khẩu đã gửi! Kiểm tra hộp thư của bạn.');
    } catch (err) {
      showAuthError(getFirebaseErrorMessage(err));
    }
  } else {
    const accounts = getLocalAccounts();
    const acc = accounts[email.toLowerCase()];
    if (acc) {
      const decodedPassword = decodeURIComponent(atob(acc.password));
      showAuthSuccess(`🔑 Mật khẩu tài khoản của bạn là: "${decodedPassword}" (Lưu ý: đổi mật khẩu nếu cần).`);
    } else {
      showAuthError('Không tìm thấy tài khoản nào với email này trong hệ thống!');
    }
  }
}

// ── Logout ───────────────────────────────────────────────
function handleLogout() {
  showConfirm(
    'Đăng Xuất',
    'Bạn có chắc muốn đăng xuất khỏi tài khoản?',
    async () => {
      try {
        if (isFirebaseConfigured() && auth) {
          await auth.signOut();
        }
        currentUser = null;
        isGuestMode = false;
        clearUserSession();
        stopFirestoreSync();
        showLoginScreen();
        if (typeof showToast === 'function') {
          showToast('Đã đăng xuất thành công!', 'info');
        }
      } catch (err) {
        showToast('❌ Lỗi đăng xuất: ' + (err.message || err), 'error');
      }
    }
  );
}

// ── Firestore Sync ───────────────────────────────────────
function getUserDocRef() {
  if (!currentUser || !db || currentUser.isLocal) return null;
  return db.collection('users').doc(currentUser.uid);
}

function startFirestoreSync() {
  if (!currentUser || !db || currentUser.isLocal) return;

  const docRef = getUserDocRef();
  if (!docRef) return;

  firestoreUnsubscribe = docRef.onSnapshot(
    (doc) => {
      if (doc.exists) {
        const data = doc.data();
        words = data.words || [];
        updateStats();
        filterWords();
        updateSyncBadge('synced');
      } else {
        migrateLocalStorageToFirestore();
      }
    },
    (error) => {
      console.error('Firestore sync error:', error);
      loadWordsFromLocalStorage();
      updateStats();
      filterWords();
      updateSyncBadge('error');
    }
  );
}

function stopFirestoreSync() {
  if (firestoreUnsubscribe) {
    firestoreUnsubscribe();
    firestoreUnsubscribe = null;
  }
}

async function saveWordsToFirestore() {
  const docRef = getUserDocRef();
  if (!docRef) {
    saveWordsLocally();
    return;
  }

  updateSyncBadge('syncing');
  try {
    await docRef.set({
      words: words,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      email: currentUser.email,
      displayName: currentUser.displayName || ''
    }, { merge: true });
    updateSyncBadge('synced');
  } catch (err) {
    console.error('Firestore save error:', err);
    saveWordsLocally();
    updateSyncBadge('error');
    if (typeof showToast === 'function') {
      showToast('⚠️ Lưu offline. Dữ liệu sẽ đồng bộ khi có mạng.', 'info');
    }
  }
}

function saveWordsLocally() {
  if (currentUser && currentUser.email) {
    localStorage.setItem(`vocab_words_${currentUser.email.toLowerCase()}`, JSON.stringify(words));
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
  updateSyncBadge('local-user');
}

async function migrateLocalStorageToFirestore() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const localWords = JSON.parse(raw);
      if (localWords.length > 0) {
        words = localWords;
        await saveWordsToFirestore();
        if (typeof showToast === 'function') {
          showToast('📦 Đã đồng bộ từ vựng lên tài khoản Cloud!', 'success');
        }
        updateStats();
        filterWords();
        return;
      }
    } catch (e) { /* ignore parse error */ }
  }

  words = getDefaultWords();
  await saveWordsToFirestore();
  updateStats();
  filterWords();
}

function loadWordsFromLocalStorage() {
  let userKey = STORAGE_KEY;
  if (currentUser && currentUser.email) {
    userKey = `vocab_words_${currentUser.email.toLowerCase()}`;
  }
  try {
    const raw = localStorage.getItem(userKey) || localStorage.getItem(STORAGE_KEY);
    if (raw) {
      words = JSON.parse(raw);
    } else {
      words = getDefaultWords();
    }
  } catch {
    words = getDefaultWords();
  }
}

// ── Auth UI Helpers ──────────────────────────────────────
function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
    el.className = 'auth-message auth-error';
  }
}

function showAuthSuccess(msg) {
  const el = document.getElementById('auth-error');
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
    el.className = 'auth-message auth-success';
  }
}

function hideAuthError() {
  const el = document.getElementById('auth-error');
  if (el) el.style.display = 'none';
}

function setAuthLoading(loading) {
  const btn = document.getElementById('auth-submit-btn');
  const gBtn = document.getElementById('google-signin-btn');
  if (btn) {
    btn.disabled = loading;
    if (loading) {
      btn.dataset.originalText = btn.textContent;
      btn.textContent = '⏳ Đang xử lý...';
    } else {
      btn.textContent = btn.dataset.originalText || '🔐 Đăng Nhập';
    }
  }
  if (gBtn) gBtn.disabled = loading;
}

function clearAuthForms() {
  ['auth-email', 'auth-password', 'auth-confirm-password', 'auth-name'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  hideAuthError();
}

function getFirebaseErrorMessage(err) {
  if (!err) return 'Có lỗi xảy ra, vui lòng thử lại!';
  if (typeof err === 'string') return err;
  const code = err.code;
  const messages = {
    'auth/email-already-in-use': 'Email này đã được đăng ký! Hãy đăng nhập.',
    'auth/invalid-email': 'Địa chỉ email không hợp lệ!',
    'auth/user-disabled': 'Tài khoản này đã bị vô hiệu hóa.',
    'auth/user-not-found': 'Không tìm thấy tài khoản với email này!',
    'auth/wrong-password': 'Mật khẩu không chính xác!',
    'auth/weak-password': 'Mật khẩu quá yếu! Cần ít nhất 6 ký tự.',
    'auth/too-many-requests': 'Quá nhiều lần thử! Vui lòng thử lại sau.',
    'auth/network-request-failed': 'Lỗi kết nối mạng! Kiểm tra internet.',
    'auth/popup-blocked': 'Popup bị chặn! Cho phép popup trong trình duyệt.',
    'auth/invalid-credential': 'Email hoặc mật khẩu không đúng!',
    'auth/operation-not-allowed': 'Phương thức đăng nhập chưa được kích hoạt.',
    'auth/requires-recent-login': 'Vui lòng đăng nhập lại để thực hiện thao tác này.'
  };
  if (code && messages[code]) return messages[code];
  if (err.message) return err.message;
  return 'Lỗi: ' + String(code || 'Không xác định');
}

// ── Init on DOM Ready ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // 1. Try to restore active user session
  const restored = restoreUserSession();
  if (restored) return;

  // 2. If Firebase is configured, initialize it
  if (isFirebaseConfigured()) {
    initFirebase();
  } else {
    // Multi-user local account mode ready
    showLoginScreen();
  }
});
