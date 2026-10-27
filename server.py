#!/usr/bin/env python3
"""
============================================================
 VocabMaster – Backend Server & Database
 Multi-User Account & Multi-Device Cloud Vocabulary Sync
 Built-in Python Standard Library (Zero dependencies required)
============================================================
"""

import http.server
import socketserver
import json
import sqlite3
import hashlib
import secrets
import os
import mimetypes
import socket
import sys

# Ensure UTF-8 output on Windows console
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

PORT = 5000
DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vocab.db')
JSON_DB_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'database.json')

# ── Database Initialization ───────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                name TEXT,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                token TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Table to store multiple active session tokens per user (multi-device support)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_tokens (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                device_info TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_words (
                user_id INTEGER PRIMARY KEY,
                words_json TEXT NOT NULL DEFAULT '[]',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        # Migrate existing users.token to user_tokens if any
        conn.execute("""
            INSERT OR IGNORE INTO user_tokens (token, user_id, device_info)
            SELECT token, id, 'migrated_session' FROM users WHERE token IS NOT NULL AND token != ''
        """)
        conn.commit()

def sync_to_json_db():
    """Keeps database.json in sync with vocab.db for Node.js fallback compatibility."""
    try:
        with get_db() as conn:
            conn.row_factory = sqlite3.Row
            users = [dict(u) for u in conn.execute('SELECT * FROM users').fetchall()]
            user_words = {
                str(r['user_id']): json.loads(r['words_json']) 
                for r in conn.execute('SELECT user_id, words_json FROM user_words').fetchall()
            }
            data = {'users': users, 'userWords': user_words}
            with open(JSON_DB_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Warning: sync to database.json failed: {e}")

# ── Password & Token Helpers ──────────────────────────────
def hash_password(password, salt):
    return hashlib.sha256((password + salt).encode('utf-8')).hexdigest()

def get_user_by_token(token):
    if not token:
        return None
    with get_db() as conn:
        cursor = conn.cursor()
        # Check active session tokens first (multi-device)
        cursor.execute("""
            SELECT u.id, u.email, u.name 
            FROM users u
            JOIN user_tokens t ON u.id = t.user_id
            WHERE t.token = ?
        """, (token,))
        row = cursor.fetchone()
        if row:
            return dict(row)

        # Fallback to legacy single-token column
        cursor.execute("SELECT id, email, name FROM users WHERE token = ?", (token,))
        row = cursor.fetchone()
        if row:
            return dict(row)
    return None

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

# ── HTTP Request Handler ──────────────────────────────────
class VocabServerHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS for cross-origin requests & local network access (phones, tablets, PCs)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def send_json(self, status_code, data):
        payload = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def read_json_body(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length <= 0:
                return {}
            body = self.rfile.read(content_length)
            return json.loads(body.decode('utf-8'))
        except Exception:
            return None

    def get_token_from_header(self):
        auth_header = self.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            return auth_header[7:].strip()
        return None

    # ── API Routing ───────────────────────────────────────
    def do_GET(self):
        path = self.path.split('?')[0]

        # ── Server & Network Info ──
        if path == '/api/info':
            local_ip = get_local_ip()
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT email, name FROM users ORDER BY id ASC")
                accounts = [{'email': row['email'], 'name': row['name']} for row in cursor.fetchall()]
            return self.send_json(200, {
                'local_ip': local_ip,
                'port': PORT,
                'server_url': f'http://{local_ip}:{PORT}',
                'accounts': accounts
            })

        # ── Current Authenticated User ──
        elif path == '/api/auth/me':
            token = self.get_token_from_header()
            user = get_user_by_token(token)
            if not user:
                return self.send_json(401, {'error': 'Chưa đăng nhập hoặc phiên làm việc hết hạn!'})
            return self.send_json(200, {'user': user})

        # ── Get Vocabulary Words ──
        elif path == '/api/words':
            token = self.get_token_from_header()
            user = get_user_by_token(token)
            if not user:
                return self.send_json(401, {'error': 'Vui lòng đăng nhập để xem danh sách từ vựng!'})

            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT words_json, updated_at FROM user_words WHERE user_id = ?", (user['id'],))
                row = cursor.fetchone()
                if row:
                    try:
                        words = json.loads(row['words_json'])
                    except Exception:
                        words = []
                    return self.send_json(200, {
                        'words': words,
                        'updated_at': row['updated_at']
                    })
                else:
                    return self.send_json(200, {'words': [], 'updated_at': None})

        # Static file fallback
        return super().do_GET()

    def do_POST(self):
        path = self.path.split('?')[0]
        data = self.read_json_body()

        if data is None:
            return self.send_json(400, {'error': 'Dữ liệu JSON không hợp lệ!'})

        # ── Register Account ──
        if path == '/api/auth/register':
            email = (data.get('email') or '').strip().lower()
            password = data.get('password') or ''
            name = (data.get('name') or '').strip()

            if not email or not password:
                return self.send_json(400, {'error': 'Vui lòng nhập email và mật khẩu!'})
            if len(password) < 6:
                return self.send_json(400, {'error': 'Mật khẩu phải có ít nhất 6 ký tự!'})

            salt = secrets.token_hex(16)
            pw_hash = hash_password(password, salt)
            token = secrets.token_hex(32)
            display_name = name or email.split('@')[0]
            device_info = (self.headers.get('User-Agent') or 'unknown')[:100]

            # Initial words (if client sent initial words from template)
            initial_words = json.dumps(data.get('initialWords') or [], ensure_ascii=False)

            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", (email,))
                if cursor.fetchone():
                    return self.send_json(400, {
                        'error': f'Email "{email}" đã được đăng ký! Vui lòng chọn Đăng Nhập.'
                    })

                cursor.execute(
                    "INSERT INTO users (email, name, password_hash, salt, token) VALUES (?, ?, ?, ?, ?)",
                    (email, display_name, pw_hash, salt, token)
                )
                user_id = cursor.lastrowid

                # Save session in user_tokens
                cursor.execute(
                    "INSERT INTO user_tokens (token, user_id, device_info) VALUES (?, ?, ?)",
                    (token, user_id, device_info)
                )

                cursor.execute(
                    "INSERT INTO user_words (user_id, words_json) VALUES (?, ?)",
                    (user_id, initial_words)
                )
                conn.commit()

            sync_to_json_db()

            return self.send_json(200, {
                'token': token,
                'user': {'id': user_id, 'email': email, 'name': display_name}
            })

        # ── Login Account ──
        elif path == '/api/auth/login':
            email = (data.get('email') or '').strip().lower()
            password = data.get('password') or ''

            if not email or not password:
                return self.send_json(400, {'error': 'Vui lòng nhập email và mật khẩu!'})

            with get_db() as conn:
                cursor = conn.cursor()
                # Case-insensitive search
                cursor.execute("""
                    SELECT id, email, name, password_hash, salt 
                    FROM users 
                    WHERE LOWER(email) = LOWER(?)
                """, (email,))
                row = cursor.fetchone()
                if not row:
                    return self.send_json(400, {
                        'error': f'Không tìm thấy tài khoản với email "{email}"! Vui lòng kiểm tra lại chính tả hoặc xem danh sách tài khoản hiển thị trên màn hình server.'
                    })

                expected_hash = hash_password(password, row['salt'])
                if expected_hash != row['password_hash']:
                    return self.send_json(400, {'error': 'Mật khẩu không chính xác! Vui lòng thử lại.'})

                # Create a fresh token for this device session (multi-device support)
                token = secrets.token_hex(32)
                device_info = (self.headers.get('User-Agent') or 'unknown')[:100]

                cursor.execute(
                    "INSERT OR REPLACE INTO user_tokens (token, user_id, device_info) VALUES (?, ?, ?)",
                    (token, row['id'], device_info)
                )
                # Keep users.token updated for backward compatibility
                cursor.execute("UPDATE users SET token = ? WHERE id = ?", (token, row['id']))
                conn.commit()

                user_info = {'id': row['id'], 'email': row['email'], 'name': row['name']}

            sync_to_json_db()

            return self.send_json(200, {
                'token': token,
                'user': user_info
            })

        # ── Create Mobile Quick-Connect Token (QR Login) ──
        elif path == '/api/auth/qr-token':
            token = self.get_token_from_header()
            user = get_user_by_token(token)
            if not user:
                return self.send_json(401, {'error': 'Vui lòng đăng nhập để tạo mã kết nối!'})

            mobile_token = secrets.token_hex(32)
            with get_db() as conn:
                conn.execute(
                    "INSERT INTO user_tokens (token, user_id, device_info) VALUES (?, ?, ?)",
                    (mobile_token, user['id'], 'mobile_qr_quick_login')
                )
                conn.commit()

            local_ip = get_local_ip()
            connect_url = f"http://{local_ip}:{PORT}?autoLoginToken={mobile_token}"
            return self.send_json(200, {
                'connect_url': connect_url,
                'token': mobile_token,
                'user': user
            })

        # ── Save Vocabulary Words ──
        elif path == '/api/words':
            token = self.get_token_from_header()
            user = get_user_by_token(token)
            if not user:
                return self.send_json(401, {'error': 'Vui lòng đăng nhập để lưu từ vựng!'})

            words_data = data.get('words')
            if words_data is None or not isinstance(words_data, list):
                return self.send_json(400, {'error': 'Danh sách từ vựng không hợp lệ!'})

            words_json = json.dumps(words_data, ensure_ascii=False)
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO user_words (user_id, words_json, updated_at)
                    VALUES (?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(user_id) DO UPDATE SET
                        words_json = excluded.words_json,
                        updated_at = CURRENT_TIMESTAMP
                """, (user['id'], words_json))
                conn.commit()

            sync_to_json_db()

            return self.send_json(200, {
                'success': True,
                'count': len(words_data),
                'message': 'Đã lưu từ vựng thành công vào tài khoản!'
            })

        # ── Logout (current device only) ──
        elif path == '/api/auth/logout':
            token = self.get_token_from_header()
            if token:
                with get_db() as conn:
                    # Remove only this device's token so other devices remain logged in
                    conn.execute("DELETE FROM user_tokens WHERE token = ?", (token,))
                    conn.commit()
            return self.send_json(200, {'success': True})

        return self.send_json(404, {'error': 'Endpoint không tồn tại!'})

# ── Main Entry ────────────────────────────────────────────
def run_server():
    init_db()
    sync_to_json_db()
    local_ip = get_local_ip()

    # Change working dir to project directory
    project_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(project_dir)

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, name FROM users ORDER BY id ASC")
        users = cursor.fetchall()

    server_address = ('0.0.0.0', PORT)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(server_address, VocabServerHandler) as httpd:
        print("=" * 64)
        print("  📚 VocabMaster Backend Server & Database Đã Khởi Động!")
        print("=" * 64)
        print(f"  ➜ Mở trên máy tính này:      http://localhost:{PORT}")
        print(f"  ➜ Mở trên điện thoại/tablet:  http://{local_ip}:{PORT}")
        print(f"  ➜ Database lưu trữ:          vocab.db (SQLite)")
        print("-" * 64)
        print("  📋 Danh Sách Tài Khoản Đã Đăng Ký Sẵn:")
        if users:
            for u in users:
                print(f"     • Email: {u['email']:<24} (Tên: {u['name']})")
        else:
            print("     (Chưa có tài khoản nào. Hãy tạo tài khoản đầu tiên!)")
        print("=" * 64)
        print("  💡 HƯỚNG DẪN MỞ TRÊN ĐIỆN THOẠI / THIẾT BỊ KHÁC:")
        print(f"     1. Kết nối điện thoại chung mạng Wi-Fi với máy tính này.")
        print(f"     2. Mở trình duyệt (Safari/Chrome), truy cập: http://{local_ip}:{PORT}")
        print(f"     3. Hoặc bấm '📱 Điện Thoại' trên thanh công cụ web để quét mã QR.")
        print(f"     4. Đăng nhập đúng email ở trên (mật khẩu bạn đã đặt).")
        print("=" * 64)
        print("  Nhấn Ctrl + C để dừng server.\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  Server đã dừng.")

if __name__ == '__main__':
    run_server()
