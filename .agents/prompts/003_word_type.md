# Prompt #003 – Thêm Loại Từ (Word Type)

**Date:** 2026-10-25
**Version:** 1.2.0
**Status:** ✅ Completed

---

## 📝 Prompts trong session này

> "sửa web cho t thêm loại từ, tính - danh - động - trạng - phrasal - cụm danh từ - thành ngữ"
> "xem folder cập nhật chỉnh sửa, chỉnh sửa danh sách chọn loại từ, sửa lại thành ô dropdown"

---

## 🎯 Yêu cầu

- [x] Thêm trường **Loại Từ** vào form thêm từ
- [x] Thêm trường **Loại Từ** vào modal chỉnh sửa
- [x] Hiển thị badge loại từ trên mỗi từ trong danh sách
- [x] Thêm bộ lọc theo loại từ trong toolbar
- [x] Đổi từ chip buttons → **dropdown select** (gọn hơn)

### Loại từ hỗ trợ:
| Key | Tên | Màu badge |
|---|---|---|
| `n` | Danh từ | Xanh lam |
| `v` | Động từ | Xanh lá |
| `adj` | Tính từ | Hồng |
| `adv` | Trạng từ | Vàng |
| `phrasal` | Phrasal Verb | Tím |
| `np` | Cụm Danh Từ | Cam |
| `idiom` | Thành Ngữ | Tím hồng |

---

## 🛠️ Thay đổi kỹ thuật

### `app.js`
- Thêm `WORD_TYPES` constant map (key → label + CSS class)
- Cập nhật `getDefaultWords()` với trường `wordType` (+ thêm 2 từ mẫu: `give up`, `break a leg`)
- Cập nhật `saveWord()` đọc `input-type` (select value)
- Cập nhật `clearForm()` và `resetFormTitle()` reset select về `""`
- Cập nhật `openEditModal()` set `modal-type` select = `w.wordType`
- Cập nhật `saveModalEdit()` đọc `modal-type`
- Cập nhật `filterWords()` thêm filter theo `wordType`
- Cập nhật `renderWords()` hiển thị badge loại từ bên cạnh tên từ
- Xóa `selectTypeChip()` và `setActiveTypeChip()` (không còn dùng)

### `index.html`
- Thêm `<select id="input-type">` trong form thêm (thay chip buttons)
- Thêm `<select id="modal-type">` trong modal chỉnh sửa (thay chip buttons)
- Thêm `<select id="filter-type">` trong toolbar
- Thêm `.word-en-row` wrapper cho từ EN + badge

### `style.css`
- Thêm `.word-en-row` flexbox
- Thêm `.word-type-badge` base style
- Thêm 7 class màu: `.wt-n`, `.wt-v`, `.wt-adj`, `.wt-adv`, `.wt-phrasal`, `.wt-np`, `.wt-idiom`
- Thêm `.form-select-type` styled select

---

## 💡 Gợi ý prompt lần tới

```
"Thêm tính năng export/import từ vựng ra file JSON"
"Thêm chế độ flashcard (lật thẻ)"
"Thêm Text-to-Speech phát âm từ bằng Web Speech API"
"Phân nhóm danh sách theo loại từ"
"Thêm gợi ý chữ cái đầu khi quiz"
```
