# Prompt #002 – Đổi Quiz Sang Gõ Từ + Theme Hồng

**Date:** 2026-10-25
**Version:** 1.1.0
**Status:** ✅ Completed

---

## 📝 Prompt gốc

> "sửa lại kiểm tra cho gõ từ chứ không chọn 4 đáp án, chỉnh sửa lại theme tone hồng"

---

## 🎯 Yêu cầu

- [x] Đổi quiz từ trắc nghiệm 4 lựa chọn → **gõ tay câu trả lời**
- [x] Đổi theme màu sang **tone hồng / rose / pink**

---

## 🛠️ Thay đổi kỹ thuật

### `style.css` (viết lại toàn bộ)
- Đổi palette sang hồng: `--clr-primary: #f472b6`, `--clr-accent: #e879f9`, `--clr-accent2: #fb7185`
- Background tối tím đậm: `#110812` → `#1a0f1e`
- Thêm CSS mới cho `.quiz-type-area`, `.type-input`, `.type-input.correct/wrong`, `.type-submit-btn`, `.type-skip-hint`
- Thêm `feedback-correct` style (hiển thị đáp án đúng khi sai)
- Cập nhật glow, shadow, border-color sang tone hồng

### `index.html`
- Xóa `<div id="quiz-choices">` (chọn 4 đáp án)
- Thêm `.quiz-type-area` với `<input id="quiz-type-input">` + nút "Kiểm tra ✓"
- Thêm `<p>` hướng dẫn phím tắt Enter / Tab
- Thêm `<div id="feedback-correct">` để hiển thị đáp án đúng khi sai

### `app.js`
- Thêm `normalizeAnswer()`: normalize accent + lowercase để so sánh linh hoạt
- Thêm `isAnswerCorrect()`: chấp nhận nhiều đáp án ngăn cách bởi dấu phẩy
- Viết lại `loadQuestion()`: set value input, autofocus sau 80ms
- Thêm `submitTypedAnswer()`: kiểm tra đáp án, style input, hiển thị feedback
- Xóa `handleAnswer()` (cho multiple choice)
- Viết lại keyboard shortcuts: `Enter` = submit/next, `Tab` = bỏ qua câu
- Thêm CSS animation `shake` động via JS cho input rỗng

---

## 💡 Gợi ý prompt lần tới

```
"Thêm nút gợi ý (hiện chữ cái đầu của đáp án)"
"Thêm timer đếm ngược cho mỗi câu"
"Cho phép nhập nhiều đáp án đúng khi thêm từ"
"Thêm chế độ tối/sáng toggle"
```
