/* ========================================================
   VocabMaster – Node.js Backend Server & Database
   Zero external dependencies (uses built-in http, fs, crypto)
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
    const initial = { users: [], userWords: {} };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return { users: [], userWords: {} };
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
  // CORS
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
    return db.users.find(u => u.token === token) || null;
  };

  // ── API ROUTES ──
  if (pathname === '/api/auth/register' && req.method === 'POST') {
    return readJson((err, data) => {
      if (err) return sendJson(400, { error: 'Dữ liệu JSON không hợp lệ!' });
      const email = (data.email || '').trim().toLowerCase();
      const password = data.password || '';
      const name = (data.name || '').trim();

      if (!email || !password) return sendJson(400, { error: 'Vui lòng nhập email và mật khẩu!' });
      if (password.length < 6) return sendJson(400, { error: 'Mật khẩu phải có ít nhất 6 ký tự!' });

      const db = getDb();
      if (db.users.find(u => u.email === email)) {
        return sendJson(400, { error: 'Email này đã được đăng ký! Vui lòng đăng nhập.' });
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
        passwordHash: pwHash,
        salt,
        token,
        createdAt: new Date().toISOString()
      });

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

  if (pathname === '/api/auth/login' && req.method === 'POST') {
    return readJson((err, data) => {
      if (err) return sendJson(400, { error: 'Dữ liệu JSON không hợp lệ!' });
      const email = (data.email || '').trim().toLowerCase();
      const password = data.password || '';

      if (!email || !password) return sendJson(400, { error: 'Vui lòng nhập email và mật khẩu!' });

      const db = getDb();
      const user = db.users.find(u => u.email === email);
      if (!user) return sendJson(400, { error: 'Không tìm thấy tài khoản với email này! Bạn hãy bấm Đăng ký ngay.' });

      const expectedHash = hashPassword(password, user.salt);
      if (expectedHash !== user.passwordHash) {
        return sendJson(400, { error: 'Mật khẩu không chính xác! Vui lòng thử lại.' });
      }

      const token = crypto.randomBytes(32).toString('hex');
      user.token = token;
      saveDb(db);

      sendJson(200, {
        token,
        user: { id: user.id, email: user.email, name: user.name }
      });
    });
  }

  if (pathname === '/api/auth/me' && req.method === 'GET') {
    const user = getUserByToken();
    if (!user) return sendJson(401, { error: 'Chưa đăng nhập!' });
    return sendJson(200, { user: { id: user.id, email: user.email, name: user.name } });
  }

  if (pathname === '/api/words' && req.method === 'GET') {
    const user = getUserByToken();
    if (!user) return sendJson(401, { error: 'Vui lòng đăng nhập để xem từ vựng!' });

    const db = getDb();
    const userWordData = db.userWords[user.id] || { words: [], updatedAt: null };
    return sendJson(200, {
      words: userWordData.words || [],
      updated_at: userWordData.updatedAt
    });
  }

  if (pathname === '/api/words' && (req.method === 'POST' || req.method === 'PUT')) {
    const user = getUserByToken();
    if (!user) return sendJson(401, { error: 'Vui lòng đăng nhập để lưu từ vựng!' });

    return readJson((err, data) => {
      if (err || !Array.isArray(data.words)) return sendJson(400, { error: 'Danh sách từ vựng không hợp lệ!' });

      const db = getDb();
      db.userWords[user.id] = {
        words: data.words,
        updatedAt: new Date().toISOString()
      };
      saveDb(db);

      return sendJson(200, {
        success: true,
        count: data.words.length,
        message: 'Đã lưu từ vựng thành công vào tài khoản!'
      });
    });
  }

  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    const token = getToken();
    if (token) {
      const db = getDb();
      const user = db.users.find(u => u.token === token);
      if (user) {
        user.token = null;
        saveDb(db);
      }
    }
    return sendJson(200, { success: true });
  }

  // ── STATIC FILE SERVING ──
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') safePath = '/index.html';
  const filePath = path.join(__dirname, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log('='.repeat(60));
  console.log('  📚 VocabMaster Node.js Server Đã Sẵn Sàng!');
  console.log('='.repeat(60));
  console.log(`  ➜ Trên máy tính này:  http://localhost:${PORT}`);
  console.log(`  ➜ Trên điện thoại:    http://${localIp}:${PORT}`);
  console.log(`  ➜ Database file:      database.json`);
  console.log('='.repeat(60));
});
