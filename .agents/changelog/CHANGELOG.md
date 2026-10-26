# Changelog – VocabMaster

Định dạng: [Semantic Versioning](https://semver.org/lang/vi/)

---

## [1.3.0] – 2026-10-26

### 🔄 Changed
- **Danh sách Từ Vựng (Vocabulary Tab)**
  - Đảo ngược thứ tự hiển thị danh sách từ: các từ thêm sau sẽ xuất hiện ở trên cùng (#1) để tiện theo dõi từ mới học.

---

## [1.2.0] – 2026-10-25

### ✨ Added
- **Phân loại từ (Word Type)**
  - Hỗ trợ các loại từ: Danh từ, Động từ, Tính từ, Trạng từ, Phrasal Verb, Cụm Danh Từ, Thành Ngữ, Collocation
  - Dropdown chọn loại từ trong form thêm từ và modal chỉnh sửa
  - Hiển thị badge màu tương ứng cạnh từ vựng
  - Bộ lọc danh sách từ theo loại từ trong toolbar

---

## [1.1.0] – 2026-10-25

### 🎨 Changed
- Đổi giao diện quiz từ trắc nghiệm sang chế độ gõ từ (type-to-answer)
- Đổi chủ đề màu sang tone hồng (pink theme)

---

## [1.0.0] – 2026-10-25

### ✨ Added
- **Trang chủ Từ Vựng (Vocabulary Tab)**
  - Form thêm từ mới: Từ tiếng Anh, Nghĩa tiếng Việt, Phiên âm IPA, Câu ví dụ
  - Danh sách từ với số thứ tự, nút Chỉnh sửa (Modal), nút Xóa (Confirm Dialog)
  - Toggle trạng thái: "Đang học" ↔ "Đã thuộc"
  - Bộ lọc: Tìm kiếm text + lọc theo trạng thái
  - Nút Xóa hết toàn bộ danh sách
  - Stats bar: Tổng từ / Đã thuộc / Đang học
- **Trang Kiểm Tra (Quiz Tab)**
  - 3 chế độ: Anh → Việt / Việt → Anh / Ngẫu nhiên
  - Chọn số câu: 5 / 10 / 20 / Tất cả
  - Giao diện câu hỏi trắc nghiệm 4 lựa chọn
  - Feedback ngay sau mỗi câu (đúng/sai + ví dụ)
  - Thanh tiến trình và điểm số trực tiếp
  - Màn hình kết quả: vòng tròn điểm % + danh sách từ sai
  - Tự động đánh dấu từ đúng → "Đã thuộc", từ sai → "Đang học"
- **LocalStorage**: Lưu dữ liệu từ vựng trên trình duyệt
- **5 từ mẫu** được tải khi chưa có dữ liệu
- **Design**: Dark mode, glassmorphism, gradient, animations
- **UX**: Toast notifications, confirm dialogs, keyboard shortcuts (Esc, Enter)

### 🗃️ Files Created
- `index.html` – Cấu trúc HTML chính
- `style.css` – Toàn bộ CSS (dark theme, responsive)
- `app.js` – Logic ứng dụng (Vanilla JS)

---

## Kế hoạch tương lai (Backlog)
- [ ] Export / Import từ vựng (JSON, CSV)
- [ ] Phân loại từ theo chủ đề (Tags)
- [ ] Chế độ flashcard (lật thẻ)
- [ ] Text-to-Speech phát âm từ
- [ ] Thống kê tiến độ học theo ngày
- [ ] Chế độ điền từ vào chỗ trống (fill-in-the-blank)
- [ ] Đồng bộ dữ liệu qua Firebase / Supabase
