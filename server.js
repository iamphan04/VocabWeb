/* ========================================================
   VocabMaster – Node.js Backend Server & Database
   Zero external dependencies (uses built-in http, fs, crypto)
   Supports Multi-User & Multi-Device Synchronous Access
   ======================================================== */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const PORT = process.env.PORT || 5000;
const DB_FILE = path.join(__dirname, 'database.json');

// Initialize JSON database
function getDb() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = { users: [], userWords: {}, tokens: {} };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (!data.users) data.users = [];
    if (!data.userWords) data.userWords = {};
    if (!data.tokens) data.tokens = {};
    return data;
  } catch {
    return { users: [], userWords: {}, tokens: {} };
  }
}

function saveDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return '127.0.0.1';
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon'
};

const server = http.createServer((req, res) => {
  // CORS for cross-device access (phones, laptops on same Wi-Fi)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  const sendJson = (status, data) => {
    const payload = Buffer.from(JSON.stringify(data));
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': payload.length
    });
    res.end(payload);
  };

  const readJson = (callback) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const json = body ? JSON.parse(body) : {};
        callback(null, json);
      } catch (err) {
        callback(err);
      }
    });
  };

  const getToken = () => {
    const authHeader = req.headers['authorization'] || '';
    if (authHeader.startsWith('Bearer ')) return authHeader.slice(7).trim();
    return null;
  };

  const getUserByToken = () => {
    const token = getToken();
    if (!token) return null;
    const db = getDb();

    // Check multi-device tokens map
    if (db.tokens && db.tokens[token]) {
      const userId = db.tokens[token].userId;
      const user = db.users.find(u => String(u.id) === String(userId));
      if (user) return user;
    }

    // Fallback to legacy single token
    return db.users.find(u => u.token === token) || null;
  };

  // ── GET /api/info (Network IP and Registered Accounts) ──
  if (pathname === '/api/info' && req.method === 'GET') {
    const localIp = getLocalIp();
    const db = getDb();
    const accounts = db.users.map(u => ({ email: u.email, name: u.name }));
    return sendJson(200, {
      local_ip: localIp,
      port: PORT,
      server_url: `http://${localIp}:${PORT}`,
      accounts
    });
  }

  // ── POST /api/auth/register ──
  if (pathname === '/api/auth/register' && req.method === 'POST') {
    return readJson((err, data) => {
      if (err) return sendJson(400, { error: 'Dữ liệu JSON không hợp lệ!' });
      const email = (data.email || '').trim().toLowerCase();
      const password = data.password || '';
      const name = (data.name || '').trim();

      if (!email || !password) return sendJson(400, { error: 'Vui lòng nhập email và mật khẩu!' });
      if (password.length < 6) return sendJson(400, { error: 'Mật khẩu phải có ít nhất 6 ký tự!' });

      const db = getDb();
      if (db.users.some(u => (u.email || '').toLowerCase() === email)) {
        return sendJson(400, { error: `Email "${email}" đã được đăng ký! Vui lòng chọn Đăng Nhập.` });
      }

      const salt = crypto.randomBytes(16).toString('hex');
      const token = crypto.randomBytes(32).toString('hex');
      const pwHash = hashPassword(password, salt);
      const userId = 'u_' + Date.now();
      const displayName = name || email.split('@')[0];

      db.users.push({
        id: userId,
        email,
        name: displayName,
        password_hash: pwHash,
        passwordHash: pwHash,
        salt,
        token,
        createdAt: new Date().toISOString()
      });

      if (!db.tokens) db.tokens = {};
      db.tokens[token] = {
        userId,
        createdAt: new Date().toISOString()
      };

      db.userWords[userId] = {
        words: data.initialWords || [],
        updatedAt: new Date().toISOString()
      };

      saveDb(db);
      sendJson(200, {
        token,
        user: { id: userId, email, name: displayName }
      });
    });
  }

  // ── POST /api/auth/login ──
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    return readJson((err, data) => {
      if (err) return sendJson(400, { error: 'Dữ liệu JSON không hợp lệ!' });
      const email = (data.email || '').trim().toLowerCase();
      const password = data.password || '';

      if (!email || !password) return sendJson(400, { error: 'Vui lòng nhập email và mật khẩu!' });

      const db = getDb();
      const user = db.users.find(u => (u.email || '').toLowerCase() === email);
      if (!user) {
        return sendJson(400, {
          error: `Không tìm thấy tài khoản với email "${email}"! Vui lòng kiểm tra lại chính tả hoặc xem danh sách tài khoản hiển thị trên màn hình server.`
        });
      }

      const userHash = user.password_hash || user.passwordHash;
      const expectedHash = hashPassword(password, user.salt);
      if (expectedHash !== userHash) {
        return sendJson(400, { error: 'Mật khẩu không chính xác! Vui lòng thử lại.' });
      }

      // Generate a new multi-device session token
      const token = crypto.randomBytes(32).toString('hex');
      user.token = token;
      if (!db.tokens) db.tokens = {};
      db.tokens[token] = {
        userId: user.id,
        createdAt: new Date().toISOString()
      };

      saveDb(db);

      sendJson(200, {
        token,
        user: { id: user.id, email: user.email, name: user.name }
      });
    });
  }

  // ── POST /api/auth/qr-token ──
  if (pathname === '/api/auth/qr-token' && req.method === 'POST') {
    const user = getUserByToken();
    if (!user) return sendJson(401, { error: 'Vui lòng đăng nhập để tạo mã kết nối!' });

    const mobileToken = crypto.randomBytes(32).toString('hex');
    const db = getDb();
    if (!db.tokens) db.tokens = {};
    db.tokens[mobileToken] = {
      userId: user.id,
      createdAt: new Date().toISOString()
    };
    saveDb(db);

    const localIp = getLocalIp();
    return sendJson(200, {
      connect_url: `http://${localIp}:${PORT}?autoLoginToken=${mobileToken}`,
      token: mobileToken,
      user: { id: user.id, email: user.email, name: user.name }
    });
  }

  // ── GET /api/auth/me ──
  if (pathname === '/api/auth/me' && req.method === 'GET') {
    const user = getUserByToken();
    if (!user) return sendJson(401, { error: 'Chưa đăng nhập hoặc phiên làm việc hết hạn!' });
    return sendJson(200, { user: { id: user.id, email: user.email, name: user.name } });
  }

  // ── GET /api/words ──
  if (pathname === '/api/words' && req.method === 'GET') {
    const user = getUserByToken();
    if (!user) return sendJson(401, { error: 'Vui lòng đăng nhập để xem danh sách từ vựng!' });

    const db = getDb();
    const entry = db.userWords[user.id];
    let words = [];
    let updatedAt = null;

    if (entry) {
      if (Array.isArray(entry)) words = entry;
      else if (Array.isArray(entry.words)) words = entry.words;
      else if (typeof entry === 'string') {
        try { words = JSON.parse(entry); } catch { words = []; }
      }
      updatedAt = entry.updatedAt || null;
    }

    return sendJson(200, { words, updated_at: updatedAt });
  }

  // ── POST /api/words ──
  if (pathname === '/api/words' && req.method === 'POST') {
    const user = getUserByToken();
    if (!user) return sendJson(401, { error: 'Vui lòng đăng nhập để lưu từ vựng!' });

    return readJson((err, data) => {
      if (err || !Array.isArray(data.words)) return sendJson(400, { error: 'Dữ liệu từ vựng không hợp lệ!' });

      const db = getDb();
      db.userWords[user.id] = {
        words: data.words,
        updatedAt: new Date().toISOString()
      };
      saveDb(db);

      sendJson(200, {
        success: true,
        count: data.words.length,
        message: 'Đã lưu từ vựng thành công!'
      });
    });
  }

  // ── POST /api/auth/logout ──
  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    const token = getToken();
    if (token) {
      const db = getDb();
      if (db.tokens && db.tokens[token]) {
        delete db.tokens[token];
        saveDb(db);
      }
    }
    return sendJson(200, { success: true });
  }

  // ── Static Files ──
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(__dirname, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('500 Lỗi máy chủ khi đọc file.');
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  const db = getDb();
  console.log('='.repeat(64));
  console.log('  📚 VocabMaster Backend Server & Database Đã Khởi Động!');
  console.log('='.repeat(64));
  console.log(`  ➜ Mở trên máy tính này:      http://localhost:${PORT}`);
  console.log(`  ➜ Mở trên điện thoại/tablet:  http://${localIp}:${PORT}`);
  console.log(`  ➜ Database lưu trữ:          database.json`);
  console.log('-'.repeat(64));
  console.log('  📋 Danh Sách Tài Khoản Đã Đăng Ký Sẵn:');
  if (db.users && db.users.length > 0) {
    db.users.forEach(u => {
      console.log(`     • Email: ${u.email.padEnd(24)} (Tên: ${u.name})`);
    });
  } else {
    console.log('     (Chưa có tài khoản nào. Hãy tạo tài khoản đầu tiên!)');
  }
  console.log('='.repeat(64));
  console.log('  💡 HƯỚNG DẪN MỞ TRÊN ĐIỆN THOẠI / THIẾT BỊ KHÁC:');
  console.log('     1. Kết nối điện thoại chung mạng Wi-Fi với máy tính này.');
  console.log(`     2. Mở trình duyệt (Safari/Chrome), truy cập: http://${localIp}:${PORT}`);
  console.log('     3. Hoặc bấm "📱 Điện Thoại" trên thanh công cụ web để quét mã QR.');
  console.log('     4. Đăng nhập đúng email ở trên (mật khẩu bạn đã đặt).');
  console.log('='.repeat(64));
  console.log('  Nhấn Ctrl + C để dừng server.\n');
});
