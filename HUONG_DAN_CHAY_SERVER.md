# 🚀 Hướng Dẫn Sử Dụng Server & Database Cho VocabMaster

Hệ thống VocabMaster đã được trang bị **Backend Server & Database riêng biệt** (sử dụng **SQLite** và **Node.js/Python**), giải quyết hoàn toàn vấn đề lưu trữ:

- ✅ **Lưu tài khoản vĩnh viễn**: Người dùng chỉ cần đăng ký 1 lần, sau đó chỉ cần đăng nhập.
- ✅ **Lưu từ vựng theo tài khoản**: Từ vựng được lưu trực tiếp vào cơ sở dữ liệu (`vocab.db`), **hoàn toàn không phụ thuộc vào máy hay trình duyệt**.
- ✅ **Mỗi người một kho từ vựng riêng**: Nhiều người dùng khác nhau có thể đăng ký tài khoản riêng, dữ liệu của ai chỉ người đó thấy.
- ✅ **Truy cập đa thiết bị**: Mở được cùng lúc trên điện thoại, máy tính bảng và máy tính.

---

## 💻 Cách 1: Chạy Server Trên Máy Tính Của Bạn (Dùng Trong Mạng Nội Bộ / Wi-Fi)

### Bước 1: Khởi động Server
- Trong thư mục dự án `d:\Project\WebVocab`, bạn chỉ cần **nhấp đúp chuột vào file `start_server.bat`**.
- Màn hình đen sẽ hiện lên thông báo:
  ```text
  ============================================================
    📚 VocabMaster Backend Server & Database Đã Khởi Động!
  ============================================================
    ➜ Mở trên máy tính này:  http://localhost:5000
    ➜ Mở trên điện thoại:    http://192.168.1.xxx:5000
    ➜ Database lưu trữ:      vocab.db (SQLite)
  ============================================================
  ```

### Bước 2: Truy cập và sử dụng
- **Trên máy tính**: Mở trình duyệt vào địa chỉ `http://localhost:5000`.
- **Trên điện thoại** (kết nối chung Wi-Fi với máy tính): Mở trình duyệt điện thoại vào địa chỉ `http://192.168.1.xxx:5000` (thay bằng địa chỉ IP hiện trên màn hình server).

---

## 🌐 Cách 2: Đưa Lên Mạng Miễn Phí (Truy Cập Mọi Nơi Bằng 4G/Internet)

Nếu bạn muốn có một đường link công khai (ví dụ: `https://my-vocab.onrender.com`) để bạn bè hoặc chính bạn có thể truy cập ở bất kỳ đâu mà không cần bật máy tính ở nhà:

1. **Đẩy mã nguồn lên GitHub**:
   ```bash
   git add .
   git commit -m "Add backend server and database"
   git push origin master
   ```
2. **Triển khai miễn phí lên Render.com (hoặc Railway)**:
   - Đăng nhập [Render.com](https://render.com/) bằng GitHub.
   - Chọn **New** ➜ **Web Service** ➜ Chọn repository `VocabWeb`.
   - Phần **Build Command**: để trống hoặc `npm install`.
   - Phần **Start Command**: nhập `node server.js` (hoặc `python server.py`).
   - Bấm **Create Web Service**.
3. Render sẽ cung cấp cho bạn một đường link HTTPS miễn phí. Bất kỳ ai mở link này đều có thể đăng ký tài khoản và lưu trữ từ vựng online!

---

## 🗄️ Cấu Trúc Database (`vocab.db`)

Dữ liệu được quản lý tự động bởi server:
- Bảng `users`: Lưu ID, Email, Tên hiển thị, Mật khẩu đã được mã hóa an toàn (SHA-256 + Salt) và Token đăng nhập.
- Bảng `user_words`: Lưu toàn bộ danh sách từ vựng theo `user_id`. Khi bạn thêm, sửa, xóa từ, server sẽ tự động cập nhật vào bản ghi của tài khoản đó.
