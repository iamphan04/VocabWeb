/* ========================================================
   VocabMaster – auth.js
   Backend Database Authentication & Vocabulary Sync
   ──────────────────────────────────────────────────────────
   Dữ liệu tài khoản & từ vựng được lưu trữ trực tiếp trên
   Database của Server (SQLite/JSON), hỗ trợ đa thiết bị cùng lúc.
   Người dùng đăng nhập trên bất kỳ thiết bị nào (điện thoại, máy tính)
   đều sẽ nhận đúng bộ từ vựng thuộc về tài khoản đó.
   ======================================================== */

const AUTH_TOKEN_KEY = 'vocabmaster_auth_token';
const AUTH_USER_KEY  = 'vocabmaster_auth_user';
const CUSTOM_API_KEY = 'vocabmaster_custom_api_base';

// Determine Backend API Base URL
function getApiBase() {
  const custom = localStorage.getItem(CUSTOM_API_KEY);
  if (custom) return custom.replace(/\/+$/, '');

  if (window.location.protocol.startsWith('http')) {
    // If running directly on port 5000, or deployed to a standard cloud host (port 80/443)
    if (window.location.port === '5000' || !window.location.port) {
      return window.location.origin;
    }
    // If opened via VS Code Live Server (port 5500, 3000, etc.), connect to port 5000 on the same host/IP!
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }
  return 'http://localhost:5000';
}

let API_BASE = getApiBase();
let currentUser = null;
let isGuestMode = false;
let serverInfo = null;

// ── Token & Session Management ────────────────────────────
function getStoredToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function setStoredSession(token, user) {
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  if (user)  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  currentUser = user;
}

function clearStoredSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  currentUser = null;
}

// ── Screen Toggling ──────────────────────────────────────
function showLoginScreen() {
  isGuestMode = false;
  const loginScr = document.getElementById('login-screen');
  const appCont  = document.getElementById('app-container');
  if (loginScr) loginScr.style.display = 'flex';
  if (appCont)  appCont.style.display  = 'none';
  clearAuthForms();
  fetchServerInfo();
}

function showApp() {
  const loginScr = document.getElementById('login-screen');
  const appCont  = document.getElementById('app-container');
  if (loginScr) loginScr.style.display = 'none';
  if (appCont)  appCont.style.display  = 'block';
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
  clearStoredSession();
  showApp();
  if (typeof initApp === 'function') {
    initApp();
  }
  updateUserDisplay();
  updateSyncBadge('local');
  if (typeof showToast === 'function') {
    showToast('Đang dùng chế độ Khách (Lưu tạm trên thiết bị này)', 'info');
  }
}

function updateUserDisplay() {
  const nameEl    = document.getElementById('user-display-name');
  const emailEl   = document.getElementById('user-display-email');
  const avatarEl  = document.getElementById('user-avatar');
  const actionsEl = document.getElementById('user-dropdown-actions');

  if (currentUser) {
    const displayName = currentUser.name || currentUser.email.split('@')[0];
    if (nameEl)  nameEl.textContent  = displayName;
    if (emailEl) emailEl.textContent = currentUser.email || '';

    if (avatarEl) {
      const initial = displayName.charAt(0).toUpperCase();
      avatarEl.innerHTML = `<span class="user-avatar-initial">${initial}</span>`;
    }

    if (actionsEl) {
      actionsEl.innerHTML = `
        <button class="user-dropdown-item primary-accent" onclick="openMobileConnectModal(); toggleUserDropdown();">
          📱 Kết Nối Điện Thoại (Mã QR)
        </button>
        <button class="user-dropdown-item" onclick="openThemeModal(); toggleUserDropdown();">
          🎨 Tùy Chỉnh Màu Theme
        </button>
        <button class="user-dropdown-item danger" onclick="handleLogout()">
          🚪 Đăng Xuất (${displayName})
        </button>
      `;
    }

    updateSyncBadge('synced');
  } else {
    // Guest mode
    if (nameEl)  nameEl.textContent  = 'Khách (Chưa đăng nhập)';
    if (emailEl) emailEl.textContent = 'Dữ liệu chỉ lưu tạm trên máy';
    if (avatarEl) {
      avatarEl.innerHTML = `<span class="user-avatar-initial">👤</span>`;
    }
    if (actionsEl) {
      actionsEl.innerHTML = `
        <button class="user-dropdown-item primary-accent" onclick="openMobileConnectModal(); toggleUserDropdown();">
          📱 Mở Trên Điện Thoại
        </button>
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
  const icon  = document.getElementById('sync-icon');
  const text  = document.getElementById('sync-text');
  if (!badge || !icon || !text) return;

  badge.style.display = 'inline-flex';
  badge.className = 'sync-badge';

  if (status === 'syncing') {
    badge.classList.add('syncing');
    icon.textContent = '🔄';
    text.textContent = 'Đang lưu tài khoản...';
  } else if (status === 'synced') {
    badge.classList.add('synced');
    icon.textContent = '☁️';
    text.textContent = 'Đã lưu tài khoản';
  } else if (status === 'local') {
    icon.textContent = '💾';
    text.textContent = 'Chế độ khách';
  } else if (status === 'error') {
    icon.textContent = '⚠️';
    text.textContent = 'Mất kết nối server';
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

// ── Form Switching ───────────────────────────────────────
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

// ── Server Info & Quick Email Fill ───────────────────────
async function fetchServerInfo() {
  const dotEl = document.getElementById('server-status-dot');
  const labelEl = document.getElementById('server-status-label');
  const accountsEl = document.getElementById('auth-known-accounts');

  try {
    const res = await fetch(`${API_BASE}/api/info`);
    if (res.ok) {
      serverInfo = await res.json();
      if (dotEl) {
        dotEl.className = 'server-dot online';
      }
      if (labelEl) {
        const displayHost = serverInfo.server_url || API_BASE;
        labelEl.textContent = `Máy chủ online: ${displayHost}`;
      }

      // If registered accounts exist, show them as helpful quick-click chips
      if (accountsEl && Array.isArray(serverInfo.accounts) && serverInfo.accounts.length > 0) {
        accountsEl.style.display = 'block';
        const chipsHtml = serverInfo.accounts.map(acc => {
          return `<span class="known-acc-chip" onclick="fillAuthEmail('${acc.email}')" title="Bấm để tự điền email này">👤 ${acc.email}</span>`;
        }).join('');
        accountsEl.innerHTML = `<span style="display:block; margin-bottom:4px">💡 Tài khoản đã có trên máy chủ:</span> ${chipsHtml}`;
      }
    } else {
      setServerOfflineStatus();
    }
  } catch (e) {
    setServerOfflineStatus();
  }
}

function setServerOfflineStatus() {
  const dotEl = document.getElementById('server-status-dot');
  const labelEl = document.getElementById('server-status-label');
  if (dotEl) dotEl.className = 'server-dot offline';
  if (labelEl) labelEl.textContent = `Chưa kết nối server (${API_BASE})`;
}

function fillAuthEmail(email) {
  const input = document.getElementById('auth-email');
  if (input) {
    input.value = email;
    input.focus();
    const pwInput = document.getElementById('auth-password');
    if (pwInput) pwInput.focus();
  }
}

// ── Submit Registration / Login ──────────────────────────
async function handleAuthSubmit(e) {
  if (e) e.preventDefault();

  const container = document.getElementById('auth-form-container');
  const mode      = container.dataset.mode || 'login';
  const email     = (document.getElementById('auth-email')?.value || '').trim().toLowerCase();
  const password  = document.getElementById('auth-password')?.value || '';
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
    const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
    const bodyData = {
      email: email,
      password: password
    };

    if (mode === 'register') {
      bodyData.name = name || email.split('@')[0];
      // Pass initial words template so user starts with vocabulary
      if (typeof getDefaultWords === 'function') {
        bodyData.initialWords = getDefaultWords();
      }
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyData)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Có lỗi xảy ra khi xác thực!');
    }

    // Save session
    setStoredSession(result.token, result.user);

    // Show App & Load user's words from database
    showApp();
    await loadWordsFromServer();

    if (typeof showToast === 'function') {
      const msg = mode === 'register' 
        ? '🎉 Đăng ký thành công! Dữ liệu từ vựng đã được tạo theo tài khoản của bạn.' 
        : `👋 Chào mừng trở lại, ${result.user.name}!`;
      showToast(msg, 'success');
    }
  } catch (err) {
    console.error('Auth error:', err);
    if (err.message && err.message.includes('Failed to fetch')) {
      showAuthError(`⚠️ Không thể kết nối tới Server Database (${API_BASE})! Vui lòng nhấp đúp file "start_server.bat" trên máy tính để khởi động server.`);
    } else {
      showAuthError(err.message || 'Lỗi đăng nhập, vui lòng thử lại!');
    }
  } finally {
    setAuthLoading(false);
  }
}

// ── Server Word Sync ─────────────────────────────────────
async function loadWordsFromServer() {
  const token = getStoredToken();
  if (!token) {
    // If guest or no token, fallback to localStorage
    loadWordsFromLocalStorage();
    updateStats();
    filterWords();
    return;
  }

  updateSyncBadge('syncing');
  try {
    const response = await fetch(`${API_BASE}/api/words`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      // Token expired
      clearStoredSession();
      showLoginScreen();
      showAuthError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
      return;
    }

    const data = await response.json();
    if (Array.isArray(data.words) && data.words.length > 0) {
      words = data.words;
    } else {
      // First time user with empty list: load defaults and save to server
      words = (typeof getDefaultWords === 'function') ? getDefaultWords() : [];
      await saveWordsToServer(words);
    }

    updateStats();
    filterWords();
    updateSyncBadge('synced');
  } catch (err) {
    console.error('Load words error:', err);
    updateSyncBadge('error');
    loadWordsFromLocalStorage();
    updateStats();
    filterWords();
  }
}

async function saveWordsToServer(wordsList) {
  const token = getStoredToken();
  if (!token) {
    // Guest mode: save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wordsList));
    updateSyncBadge('local');
    return;
  }

  updateSyncBadge('syncing');
  try {
    const response = await fetch(`${API_BASE}/api/words`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ words: wordsList })
    });

    if (!response.ok) {
      throw new Error('Lỗi lưu từ vựng lên máy chủ!');
    }

    updateSyncBadge('synced');
  } catch (err) {
    console.error('Save words error:', err);
    updateSyncBadge('error');
    if (typeof showToast === 'function') {
      showToast('⚠️ Không thể lưu lên Server. Kiểm tra server đang chạy!', 'error');
    }
  }
}

function loadWordsFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      words = JSON.parse(raw);
    } else if (typeof getDefaultWords === 'function') {
      words = getDefaultWords();
    }
  } catch {
    if (typeof getDefaultWords === 'function') words = getDefaultWords();
  }
}

// ── Mobile Connect Modal & QR Code ────────────────────────
async function openMobileConnectModal() {
  const modal = document.getElementById('mobile-connect-modal');
  if (!modal) return;
  modal.style.display = 'flex';

  const loadingEl = document.getElementById('qr-loading');
  const qrImg = document.getElementById('qr-code-img');
  const badgeEl = document.getElementById('qr-auto-login-badge');
  const urlInput = document.getElementById('mobile-connect-url-input');
  const hintEl = document.getElementById('mobile-account-hint');

  if (loadingEl) loadingEl.style.display = 'block';
  if (qrImg) qrImg.style.display = 'none';

  let targetUrl = API_BASE;
  let hasAutoLogin = false;

  // If user is currently logged in, generate quick-connect token with auto-login!
  const token = getStoredToken();
  if (token && currentUser) {
    try {
      const res = await fetch(`${API_BASE}/api/auth/qr-token`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        targetUrl = data.connect_url;
        hasAutoLogin = true;
      }
    } catch (e) {
      console.warn('Could not generate mobile qr token:', e);
    }
  }

  // Fallback to server info if targetUrl is localhost
  if (!hasAutoLogin) {
    if (serverInfo && serverInfo.server_url) {
      targetUrl = serverInfo.server_url;
    } else {
      try {
        const res = await fetch(`${API_BASE}/api/info`);
        if (res.ok) {
          const info = await res.json();
          targetUrl = info.server_url;
        }
      } catch (e) {}
    }
  }

  if (urlInput) urlInput.value = targetUrl;

  if (badgeEl) {
    badgeEl.style.display = hasAutoLogin ? 'block' : 'none';
  }

  if (hintEl) {
    if (currentUser) {
      hintEl.innerHTML = `✅ Điện thoại sẽ đồng bộ toàn bộ từ vựng với tài khoản: <b>${currentUser.email}</b>`;
    } else {
      hintEl.innerHTML = `💡 Chưa đăng nhập tài khoản. Bạn có thể đăng ký tài khoản trên máy tính để từ vựng tự đồng bộ sang điện thoại!`;
    }
  }

  // Generate QR Code via reliable high-speed QR API
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(targetUrl)}`;
  
  if (qrImg) {
    qrImg.onload = () => {
      if (loadingEl) loadingEl.style.display = 'none';
      qrImg.style.display = 'block';
    };
    qrImg.onerror = () => {
      if (loadingEl) loadingEl.style.display = 'none';
      qrImg.style.display = 'block';
      // Fallback: render text link inside container
    };
    qrImg.src = qrUrl;
  }
}

function closeMobileConnectModal() {
  const modal = document.getElementById('mobile-connect-modal');
  if (modal) modal.style.display = 'none';
}

function copyConnectUrl() {
  const input = document.getElementById('mobile-connect-url-input');
  if (!input) return;
  input.select();
  navigator.clipboard.writeText(input.value).then(() => {
    if (typeof showToast === 'function') {
      showToast('📋 Đã sao chép link truy cập điện thoại!', 'success');
    }
  }).catch(() => {
    document.execCommand('copy');
    if (typeof showToast === 'function') {
      showToast('📋 Đã sao chép link!', 'success');
    }
  });
}

// ── Server Config Modal ──────────────────────────────────
function openServerConfigModal() {
  const modal = document.getElementById('server-config-modal');
  const input = document.getElementById('custom-server-input');
  if (modal) modal.style.display = 'flex';
  if (input) input.value = API_BASE;
}

function closeServerConfigModal() {
  const modal = document.getElementById('server-config-modal');
  if (modal) modal.style.display = 'none';
}

function saveServerConfig() {
  const input = document.getElementById('custom-server-input');
  const val = (input?.value || '').trim().replace(/\/+$/, '');
  if (!val) {
    resetServerConfig();
    return;
  }

  localStorage.setItem(CUSTOM_API_KEY, val);
  API_BASE = val;
  closeServerConfigModal();
  if (typeof showToast === 'function') {
    showToast(`Đã lưu Server: ${API_BASE}`, 'info');
  }
  fetchServerInfo();
}

function resetServerConfig() {
  localStorage.removeItem(CUSTOM_API_KEY);
  API_BASE = getApiBase();
  closeServerConfigModal();
  if (typeof showToast === 'function') {
    showToast('Đã đặt lại Server mặc định!', 'info');
  }
  fetchServerInfo();
}

// ── Logout ───────────────────────────────────────────────
function handleLogout() {
  showConfirm(
    'Đăng Xuất',
    'Bạn có chắc muốn đăng xuất khỏi tài khoản?',
    async () => {
      const token = getStoredToken();
      if (token) {
        try {
          await fetch(`${API_BASE}/api/auth/logout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
        } catch (e) { /* ignore network error on logout */ }
      }
      clearStoredSession();
      isGuestMode = false;
      showLoginScreen();
      if (typeof showToast === 'function') {
        showToast('Đã đăng xuất thành công!', 'info');
      }
    }
  );
}

// ── Helpers ──────────────────────────────────────────────
function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
    el.className = 'auth-message auth-error';
  }
}

function hideAuthError() {
  const el = document.getElementById('auth-error');
  if (el) el.style.display = 'none';
}

function setAuthLoading(loading) {
  const btn = document.getElementById('auth-submit-btn');
  if (btn) {
    btn.disabled = loading;
    if (loading) {
      btn.dataset.originalText = btn.textContent;
      btn.textContent = '⏳ Đang xử lý...';
    } else {
      btn.textContent = btn.dataset.originalText || '🔐 Đăng Nhập';
    }
  }
}

function clearAuthForms() {
  ['auth-email', 'auth-password', 'auth-confirm-password', 'auth-name'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  hideAuthError();
}

// ── Check Active Session on Start ────────────────────────
async function checkAuthOnStart() {
  // Check if phone accessed via QR code autoLoginToken
  const urlParams = new URLSearchParams(window.location.search);
  const autoToken = urlParams.get('autoLoginToken');
  if (autoToken) {
    localStorage.setItem(AUTH_TOKEN_KEY, autoToken);
    // Remove autoLoginToken from URL bar cleanly
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  }

  const token = getStoredToken();
  if (!token) {
    showLoginScreen();
    fetchServerInfo();
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/auth/me`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const data = await response.json();
      currentUser = data.user;
      showApp();
      await loadWordsFromServer();
      if (autoToken && typeof showToast === 'function') {
        showToast(`🎉 Tự động đăng nhập thành công với tài khoản ${currentUser.name}!`, 'success');
      }
    } else {
      clearStoredSession();
      showLoginScreen();
      fetchServerInfo();
    }
  } catch (err) {
    console.warn('Backend server check error:', err);
    // If saved user session exists locally, show app and warn about server
    const rawUser = localStorage.getItem(AUTH_USER_KEY);
    if (rawUser) {
      try {
        currentUser = JSON.parse(rawUser);
        showApp();
        loadWordsFromLocalStorage();
        updateStats();
        filterWords();
        updateSyncBadge('error');
        return;
      } catch (e) {}
    }
    showLoginScreen();
    showAuthError(`⚠️ Không thể kết nối tới Server Database (${API_BASE}). Hãy nhấp đúp file "start_server.bat" trên máy tính để khởi động server!`);
    fetchServerInfo();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  checkAuthOnStart();
});
