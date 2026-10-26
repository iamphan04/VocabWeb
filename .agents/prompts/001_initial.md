# Prompt #001 – Khởi Tạo Dự Án VocabMaster

**Date:** 2026-10-25
**Version:** 1.0.0
**Status:** ✅ Completed

---

## 📝 Prompt gốc (nguyên văn)

> "hãy tạo cho tôi 1 web học từ vựng tiếng anh, bao gồm 2 phần là thêm từ vựng và kiểm tra từ vựng. Kiểm tra từ vựng cho ngẫu nhiên từ tiếng anh hoặc tiếng việt. phần từ vựng cho phép thêm từ, chỉnh sửa, xóa. Tạo cho tôi 1 folder ghi nhận các prompt và các thay đổi sử dụng cho lần sau"

---

## 🎯 Yêu cầu đã phân tích

### Phần 1 – Quản lý từ vựng
- [x] Thêm từ mới (tiếng Anh + tiếng Việt + phiên âm + ví dụ)
- [x] Chỉnh sửa từ (qua Modal dialog)
- [x] Xóa từ (có xác nhận)
- [x] Xóa hết (có xác nhận)
- [x] Tìm kiếm và lọc

### Phần 2 – Kiểm tra từ vựng
- [x] Hỏi ngẫu nhiên từ tiếng Anh → đoán tiếng Việt
- [x] Hỏi ngẫu nhiên từ tiếng Việt → đoán tiếng Anh
- [x] Chế độ ngẫu nhiên kết hợp cả hai chiều
- [x] Trắc nghiệm 4 lựa chọn
- [x] Hiển thị kết quả và từ sai

### Folder ghi nhận
- [x] `.agents/README.md` – Hướng dẫn
- [x] `.agents/prompts/001_initial.md` – File này
- [x] `.agents/changelog/CHANGELOG.md` – Lịch sử thay đổi

---

## 🛠️ Quyết định kỹ thuật

| Quyết định | Lý do |
|---|---|
| Vanilla HTML/CSS/JS | Không cần framework, dễ mở và chạy ngay |
| LocalStorage | Lưu dữ liệu không cần backend |
| Dark mode design | Hiện đại, dễ nhìn khi học lâu |
| Modal cho Edit | UX tốt hơn inline edit |
| Confirm dialog cho Delete | Tránh xóa nhầm |
| 4 lựa chọn quiz | Cân bằng độ khó, đủ nhiễu |
| Auto mark mastered | Gamification – tự động cập nhật sau quiz |

---

## 📁 Files được tạo

```
d:\Project\WebVocab\
├── index.html          – Cấu trúc HTML (header, tabs, forms, modals)
├── style.css           – CSS dark theme (650+ dòng)
├── app.js              – JavaScript logic (400+ dòng)
└── .agents\
    ├── README.md
    ├── prompts\
    │   └── 001_initial.md
    └── changelog\
        └── CHANGELOG.md
```

---

## 💡 Gợi ý prompt cho lần tới

Để mở rộng dự án, bạn có thể dùng các prompt như:

```
"Thêm tính năng export từ vựng ra file JSON"
"Thêm chế độ flashcard cho tab kiểm tra"
"Thêm tính năng phát âm từ bằng Web Speech API"
"Thêm phân loại từ theo chủ đề (tag: Food, Travel, Business...)"
"Thêm biểu đồ thống kê tiến độ học theo ngày"
"Thêm chế độ điền từ vào chỗ trống thay vì trắc nghiệm"
```
