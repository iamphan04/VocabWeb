#!/usr/bin/env python3
"""
============================================================
 VocabMaster – Backend Server & Database
 Multi-User Account & Cloud Vocabulary Synchronization
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
        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_words (
                user_id INTEGER PRIMARY KEY,
                words_json TEXT NOT NULL DEFAULT '[]',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        conn.commit()

# ── Password Helpers ──────────────────────────────────────
def hash_password(password, salt):
    return hashlib.sha256((password + salt).encode('utf-8')).hexdigest()

def get_user_by_token(token):
    if not token:
        return None
    with get_db() as conn:
        cursor = conn.cursor()
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
        # Enable CORS for cross-origin requests & local network access
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
        except Exception as e:
            return None

    def get_token_from_header(self):
        auth_header = self.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            return auth_header[7:].strip()
        return None

    # ── API Routing ───────────────────────────────────────
    def do_GET(self):
        path = self.path.split('?')[0]

        if path == '/api/auth/me':
            token = self.get_token_from_header()
            user = get_user_by_token(token)
            if not user:
                return self.send_json(401, {'error': 'Chưa đăng nhập hoặc phiên làm việc hết hạn!'})
            return self.send_json(200, {'user': user})

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

            # Initial words (if client sent initial words from template)
            initial_words = json.dumps(data.get('initialWords') or [], ensure_ascii=False)

            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
                if cursor.fetchone():
                    return self.send_json(400, {'error': 'Email này đã được đăng ký! Vui lòng bấm Đăng Nhập.'})

                cursor.execute(
                    "INSERT INTO users (email, name, password_hash, salt, token) VALUES (?, ?, ?, ?, ?)",
                    (email, display_name, pw_hash, salt, token)
                )
                user_id = cursor.lastrowid
                cursor.execute(
                    "INSERT INTO user_words (user_id, words_json) VALUES (?, ?)",
                    (user_id, initial_words)
                )
                conn.commit()

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
                cursor.execute("SELECT id, email, name, password_hash, salt FROM users WHERE email = ?", (email,))
                row = cursor.fetchone()
                if not row:
                    return self.send_json(400, {'error': 'Không tìm thấy tài khoản với email này! Bạn hãy bấm Đăng ký ngay.'})

                expected_hash = hash_password(password, row['salt'])
                if expected_hash != row['password_hash']:
                    return self.send_json(400, {'error': 'Mật khẩu không chính xác! Vui lòng thử lại.'})

                token = secrets.token_hex(32)
                cursor.execute("UPDATE users SET token = ? WHERE id = ?", (token, row['id']))
                conn.commit()

                return self.send_json(200, {
                    'token': token,
                    'user': {'id': row['id'], 'email': row['email'], 'name': row['name']}
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

            return self.send_json(200, {
                'success': True,
                'count': len(words_data),
                'message': 'Đã lưu từ vựng thành công vào tài khoản!'
            })

        # ── Logout ──
        elif path == '/api/auth/logout':
            token = self.get_token_from_header()
            if token:
                with get_db() as conn:
                    conn.execute("UPDATE users SET token = NULL WHERE token = ?", (token,))
                    conn.commit()
            return self.send_json(200, {'success': True})

        return self.send_json(404, {'error': 'Endpoint không tồn tại!'})

# ── Main Entry ────────────────────────────────────────────
def run_server():
    init_db()
    local_ip = get_local_ip()

    # Change working dir to project directory
    project_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(project_dir)

    server_address = ('0.0.0.0', PORT)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(server_address, VocabServerHandler) as httpd:
        print("=" * 60)
        print("  📚 VocabMaster Backend Server & Database Đã Khởi Động!")
        print("=" * 60)
        print(f"  ➜ Mở trên máy tính này:  http://localhost:{PORT}")
        print(f"  ➜ Mở trên điện thoại:    http://{local_ip}:{PORT}")
        print(f"  ➜ Database lưu trữ:      vocab.db (SQLite)")
        print("=" * 60)
        print("  Nhấn Ctrl + C để dừng server.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  Server đã dừng.")

if __name__ == '__main__':
    run_server()
