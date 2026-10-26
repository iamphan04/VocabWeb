# 🚀 Hướng Dẫn Cấu Hình Firebase Cho VocabMaster

Tài liệu này hướng dẫn bạn từng bước thiết lập **Firebase (miễn phí)** để ứng dụng VocabMaster có thể:
- 🔐 Đăng nhập tài khoản bằng **Email / Mật khẩu** hoặc **Google (1 click)**.
- ☁️ Tự động lưu và đồng bộ danh sách từ vựng lên đám mây theo từng tài khoản.
- 📱 Truy cập và học trên **mọi thiết bị** (máy tính, điện thoại, máy tính bảng) cùng lúc mà không bị mất dữ liệu.
- 👥 Mỗi người dùng có một kho từ vựng riêng biệt, bảo mật hoàn toàn.

---

## 📋 Bước 1: Tạo Dự Án Firebase (Hoàn Toàn Miễn Phí)

1. Truy cập vào [Firebase Console](https://console.firebase.google.com/) và đăng nhập bằng tài khoản Google.
2. Bấm vào **"Add project"** (Thêm dự án).
3. Nhập tên dự án (ví dụ: `vocab-master`), bấm **Continue**.
4. Ở bước Google Analytics: Bạn có thể bật hoặc tắt (tùy ý), sau đó bấm **Create project**.
5. Đợi vài giây rồi bấm **Continue** khi dự án đã sẵn sàng.

---

## 🔑 Bước 2: Bật Phương Thức Đăng Nhập (Authentication)

1. Ở menu bên trái, chọn **Build** ➜ **Authentication**.
2. Bấm nút **Get started**.
3. Tại tab **Sign-in method**, bật 2 phương thức:
   - **Email/Password**: Bấm vào dòng *Email/Password*, gạt công tắc **Enable** đầu tiên sang màu xanh, bấm **Save**.
   - **Google**: Bấm vào dòng *Google*, gạt công tắc **Enable**, chọn *Support email for project* (email của bạn), bấm **Save**.

---

## 🗄️ Bước 3: Tạo Cơ Sở Dữ Liệu Firestore (Cloud Firestore)

1. Ở menu bên trái, chọn **Build** ➜ **Firestore Database**.
2. Bấm nút **Create database**.
3. Chọn vị trí lưu trữ (Location): Giữ mặc định hoặc chọn gần bạn nhất (ví dụ: `asia-southeast1` hoặc `asia-east1`). Bấm **Next**.
4. Chọn chế độ bảo mật:
   - Chọn **Start in test mode** để thử nghiệm ngay lập tức, bấm **Create**.
5. *(Quan trọng - Bảo mật tài khoản cá nhân)*: 
   - Sau khi tạo xong Firestore, chuyển sang tab **Rules** (Quy tắc).
   - Dán quy tắc sau để đảm bảo mỗi tài khoản chỉ có thể đọc/ghi từ vựng của chính mình:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
   - Bấm nút **Publish** (Xuất bản) để lưu quy tắc.

---

## ⚙️ Bước 4: Lấy Mã Cấu Hình Firebase (Config)

1. Bấm vào biểu tượng **Bánh răng cài đặt (⚙️)** ở góc trên bên trái menu ➜ Chọn **Project settings** (Cài đặt dự án).
2. Cuộn xuống phần **Your apps**, bấm vào biểu tượng web `</>` để thêm ứng dụng Web.
3. Đặt biệt danh cho ứng dụng (ví dụ: `vocab-web`), **không cần** tích chọn *Firebase Hosting*, bấm **Register app**.
4. Màn hình sẽ hiện ra đoạn mã có dạng:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "vocab-master-xxx.firebaseapp.com",
  projectId: "vocab-master-xxx",
  storageBucket: "vocab-master-xxx.firebasestorage.app",
  messagingSenderId: "123456789...",
  appId: "1:123456789:web:abcdef..."
};
```

---

## 📝 Bước 5: Điền Thông Tin Vào Dự Án

1. Mở file [firebase-config.js](file:///d:/Project/WebVocab/firebase-config.js) trong thư mục dự án của bạn.
2. Sao chép các thông số từ bước 4 và thay thế vào file [firebase-config.js](file:///d:/Project/WebVocab/firebase-config.js):

```javascript
const firebaseConfig = {
  apiKey:            "AIzaSy...",
  authDomain:        "vocab-master-xxx.firebaseapp.com",
  projectId:         "vocab-master-xxx",
  storageBucket:     "vocab-master-xxx.firebasestorage.app",
  messagingSenderId: "123456789...",
  appId:             "1:123456789:web:abcdef..."
};
```
3. Lưu file (`Ctrl + S`).

---

## ✨ Bước 6: Tận Hưởng Thành Quả!

1. Mở file [index.html](file:///d:/Project/WebVocab/index.html) bằng Live Server hoặc trình duyệt.
2. Bạn sẽ thấy màn hình đăng nhập sang trọng với các tính năng:
   - 🚀 **Đăng ký / Đăng nhập tài khoản** bằng Email + Mật khẩu.
   - ⚡ **Đăng nhập 1-click** bằng tài khoản Google.
   - 🔑 **Quên mật khẩu**: Gửi email khôi phục mật khẩu tự động.
   - 👤 **Chế độ Khách (Offline)**: Dành cho những ai muốn trải nghiệm thử ngay mà không cần tạo tài khoản.
   - 🔄 **Tự động chuyển đổi**: Khi bạn đăng nhập tài khoản lần đầu, toàn bộ từ vựng bạn đã thêm từ trước (nếu có trên máy) sẽ tự động được tải lên tài khoản Cloud của bạn!
   - ☁️ **Huy hiệu đồng bộ**: Trạng thái "Đã lưu Cloud" / "Đang lưu..." hiển thị trực tiếp trên thanh menu góc phải.

---

> [!TIP]
> **Mẹo**: Nếu bạn muốn mở trên điện thoại:
> 1. Đưa dự án lên GitHub Pages hoặc Vercel (chỉ 1 click là có link HTTPS dùng trên mọi điện thoại).
> 2. Hoặc chạy máy chủ local trên máy tính (ví dụ qua Live Server với `0.0.0.0`) và mở bằng địa chỉ IP của máy tính trên trình duyệt điện thoại.
