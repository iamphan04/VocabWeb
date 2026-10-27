# 🚀 Hướng Dẫn Sử Dụng Server & Đăng Nhập Đa Thiết Bị Cho VocabMaster

Hệ thống VocabMaster đã được trang bị **Backend Server & Database SQLite** đa thiết bị, giải quyết triệt để vấn đề đăng nhập và đồng bộ từ vựng:

- ✅ **Lưu tài khoản vĩnh viễn**: Người dùng đăng ký một lần, đăng nhập mọi thiết bị.
- ✅ **Hỗ trợ đa thiết bị cùng lúc**: Máy tính và điện thoại có thể đăng nhập cùng một tài khoản cùng lúc mà không bị văng ra (`user_tokens`).
- ✅ **Đăng nhập bằng mã QR 1-Click**: Trên máy tính, bấm **"📱 Điện Thoại"**, lấy điện thoại quét mã QR là tự động đăng nhập luôn mà không cần gõ mật khẩu.
- ✅ **Hiển thị tài khoản sẵn có**: Khi bật server hoặc mở trang đăng nhập, hệ thống hiển thị danh sách tài khoản đã có sẵn trên máy chủ để tránh gõ nhầm email.

---

## 💻 Cách 1: Chạy Server Trên Mạng Wi-Fi (Máy Tính + Điện Thoại)

### Bước 1: Khởi động Server trên máy tính
- Trong thư mục dự án `d:\Project\WebVocab`, bạn chỉ cần **nhấp đúp chuột vào file `start_server.bat`**.
- Màn hình đen sẽ hiện lên thông tin rõ ràng:
  ```text
  ================================================================
    📚 VocabMaster Backend Server & Database Đã Khởi Động!
  ================================================================
    ➜ Mở trên máy tính này:      http://localhost:5000
    ➜ Mở trên điện thoại/tablet:  http://192.168.0.43:5000
    ➜ Database lưu trữ:          vocab.db (SQLite)
  ----------------------------------------------------------------
    📋 Danh Sách Tài Khoản Đã Đăng Ký Sẵn:
       • Email: phan@gmail.com           (Tên: hong phan)
       • Email: test@example.com         (Tên: Tester)
  ================================================================
  ```

### Bước 2: Đăng nhập trên điện thoại (2 cách siêu dễ)

#### ⚡ Cách A: Quét mã QR (Khuyên dùng - Nhanh nhất)
1. Trên máy tính, bạn mở `http://localhost:5000` và đăng nhập tài khoản của mình.
2. Bấm vào nút **"📱 Điện Thoại"** trên thanh menu (hoặc bấm vào hình Avatar góc phải ➜ chọn **"📱 Kết Nối Điện Thoại"**).
3. Một bảng hiện lên có **Mã QR**.
4. Bạn lấy điện thoại mở **Camera** (hoặc Zalo) quét mã QR ➜ Bấm vào link.
5. **Điện thoại sẽ tự động đăng nhập và tải ngay toàn bộ từ vựng** của bạn! Không cần gõ lại email hay mật khẩu!

#### 📝 Cách B: Gõ địa chỉ IP thủ công
1. Đảm bảo điện thoại đang kết nối **chung mạng Wi-Fi** với máy tính.
2. Mở trình duyệt Safari hoặc Chrome trên điện thoại, gõ địa chỉ IP hiện trên màn hình server (ví dụ: `http://192.168.0.43:5000`).
3. Nhập đúng email đã đăng ký (ví dụ: `phan@gmail.com`) và mật khẩu.
4. Bấm **Đăng Nhập**.

---

## 🌐 Cách 2: Đưa Lên Mạng Miễn Phí (Dùng 4G / Mọi Nơi Không Cần Mở Máy Tính)

Nếu bạn muốn có một đường link công khai (ví dụ: `https://my-vocab.onrender.com`) để học ở trường, trên xe bus bằng 4G:

1. **Đẩy mã nguồn lên GitHub**:
   ```bash
   git add .
   git commit -m "Update multi-device server and QR login"
   git push origin master
   ```
2. **Triển khai miễn phí lên Render.com (hoặc Railway)**:
   - Đăng nhập [Render.com](https://render.com/) bằng GitHub.
   - Chọn **New** ➜ **Web Service** ➜ Chọn repository `VocabWeb`.
   - Phần **Build Command**: để trống.
   - Phần **Start Command**: nhập `python server.py`.
   - Bấm **Create Web Service**.
3. Render sẽ cung cấp cho bạn một đường link HTTPS miễn phí. Bạn có thể mở link đó trên bất kỳ thiết bị nào 24/7!
