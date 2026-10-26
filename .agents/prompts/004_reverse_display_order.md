# Prompt #004 – Đảo Ngược Thứ Tự Hiển Thị Từ Vựng

**Date:** 2026-10-26
**Version:** 1.3.0
**Status:** ✅ Completed

---

## 📝 Prompt gốc

> "đảo ngược thứ tự hiển thị cho những từ thêm sau lên trước"

---

## 🎯 Yêu cầu

- [x] Đảo ngược thứ tự hiển thị danh sách từ vựng trong tab Vocabulary
- [x] Các từ được thêm sau (mới hơn) sẽ hiển thị ở trên cùng danh sách (vị trí số 1)
- [x] Giữ nguyên thứ tự mới-lên-trước khi kết hợp với các bộ lọc (tìm kiếm, loại từ, trạng thái học)

---

## 🛠️ Thay đổi kỹ thuật

### `app.js`
- Cập nhật hàm `filterWords()`: thay `let list = [...words];` bằng `let list = [...words].reverse();`
- Đảm bảo từ mới được thêm vào cuối mảng `words` sẽ được đảo ngược lên đầu danh sách hiển thị với số thứ tự `#1`.
