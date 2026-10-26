/* ========================================================
   VocabMaster – app.js
   English Vocabulary Learning App
   Features:
   - Add / Edit / Delete vocabulary words
   - Quiz mode: EN→VI, VI→EN, Random
   - Type-to-answer quiz (fuzzy / accent-insensitive)
   - LocalStorage persistence
   - Mastered / Learning status toggle
   ======================================================== */

// ── State ────────────────────────────────────────────────
let words = [];
let editingId = null;
let currentMode = 'en-to-vi';
let quizCount = 5;
let quizQueue = [];
let quizIndex = 0;
let quizCorrect = 0;
let quizWrong = 0;
let wrongWords = [];
let quizCurrentDirection = 'en-to-vi';

// ── Word Type Config ──────────────────────────────────────
const WORD_TYPES = {
  '':        { label: '',               color: '' },
  'n':       { label: 'Danh từ',        color: 'wt-n' },
  'v':       { label: 'Động từ',        color: 'wt-v' },
  'adj':     { label: 'Tính từ',        color: 'wt-adj' },
  'adv':     { label: 'Trạng từ',       color: 'wt-adv' },
  'phrasal': { label: 'Phrasal Verb',   color: 'wt-phrasal' },
  'np':      { label: 'Cụm Danh Từ',    color: 'wt-np' },
  'idiom':   { label: 'Thành Ngữ',      color: 'wt-idiom' },
};

// ── LocalStorage ─────────────────────────────────────────
const STORAGE_KEY = 'vocabmaster_words';

function loadWords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    words = raw ? JSON.parse(raw) : getDefaultWords();
  } catch {
    words = getDefaultWords();
  }
}

function saveWords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
}

function getDefaultWords() {
  return [
    { id: uid(), en: 'ephemeral',   vi: 'phù du, tạm thời',      pronoun: '/ɪˈfem.ər.əl/',       example: 'Fame is ephemeral.',                  status: 'learning', wordType: 'adj' },
    { id: uid(), en: 'serendipity', vi: 'may mắn bất ngờ',        pronoun: '/ˌser.ənˈdɪp.ɪ.ti/', example: 'Finding that book was serendipity.',  status: 'learning', wordType: 'n' },
    { id: uid(), en: 'ubiquitous',  vi: 'phổ biến khắp nơi',      pronoun: '/juːˈbɪk.wɪ.təs/',    example: 'Smartphones are ubiquitous today.', status: 'learning', wordType: 'adj' },
    { id: uid(), en: 'resilient',   vi: 'kiên cường, dẻo dai',     pronoun: '/rɪˈzɪl.i.ənt/',      example: 'She is a resilient person.',        status: 'mastered', wordType: 'adj' },
    { id: uid(), en: 'give up',     vi: 'từ bỏ, bỏ cuộc',         pronoun: '/ɡɪv ʌp/',            example: "Don't give up on your dreams.",    status: 'learning', wordType: 'phrasal' },
    { id: uid(), en: 'ambiguous',   vi: 'mơ hồ, không rõ ràng',   pronoun: '/æmˈbɪɡ.ju.əs/',       example: 'The message was ambiguous.',       status: 'learning', wordType: 'adj' },
    { id: uid(), en: 'break a leg', vi: 'chúc may mắn',            pronoun: '',                      example: 'Break a leg at your interview!',   status: 'learning', wordType: 'idiom' },
  ];
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── Tab Switching ─────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  document.getElementById(`nav-${tab}`).classList.add('active');

  if (tab === 'quiz') {
    showQuizStart();
  }
}

// ── Render Word List ──────────────────────────────────────
function renderWords(list) {
  const container = document.getElementById('word-list');
  const empty = document.getElementById('empty-state');

  if (!list || list.length === 0) {
    container.innerHTML = '';
    container.appendChild(empty);
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  const existing = container.querySelectorAll('.word-item');
  existing.forEach(el => el.remove());

  list.forEach((w, i) => {
    const div = document.createElement('div');
    div.className = 'word-item';
    div.setAttribute('data-id', w.id);
    const typeInfo = WORD_TYPES[w.wordType || ''] || WORD_TYPES[''];
    const typeBadge = typeInfo.label
      ? `<span class="word-type-badge ${typeInfo.color}">${typeInfo.label}</span>`
      : '';
    div.innerHTML = `
      <div class="word-num">${i + 1}</div>
      <div class="word-info">
        <div class="word-en-row">
          <span class="word-en">${escHtml(w.en)}</span>
          ${typeBadge}
        </div>
        ${w.pronoun ? `<div class="word-pronoun">${escHtml(w.pronoun)}</div>` : ''}
        <div class="word-vi">${escHtml(w.vi)}</div>
        ${w.example ? `<div class="word-example">${escHtml(w.example)}</div>` : ''}
      </div>
      <div class="word-actions">
        <span class="word-status ${w.status === 'mastered' ? 'status-mastered' : 'status-learning'}"
              onclick="toggleStatus('${w.id}')" title="Nhấn để đổi trạng thái">
          ${w.status === 'mastered' ? '✅ Đã thuộc' : '📚 Đang học'}
        </span>
        <button class="btn btn-ghost btn-icon" onclick="openEditModal('${w.id}')" title="Chỉnh sửa">✏️</button>
        <button class="btn btn-danger btn-icon" onclick="confirmDeleteWord('${w.id}')" title="Xóa">🗑️</button>
      </div>`;
    container.appendChild(div);
  });
}

function updateStats() {
  const total = words.length;
  const mastered = words.filter(w => w.status === 'mastered').length;
  const learning = total - mastered;
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-mastered').textContent = mastered;
  document.getElementById('stat-learning').textContent = learning;
}

function filterWords() {
  const q      = document.getElementById('search-input').value.toLowerCase().trim();
  const status = document.getElementById('filter-status').value;
  const type   = document.getElementById('filter-type').value;
  let list = [...words];
  if (status !== 'all') list = list.filter(w => w.status === status);
  if (type   !== 'all') list = list.filter(w => (w.wordType || '') === type);
  if (q) list = list.filter(w =>
    w.en.toLowerCase().includes(q) ||
    w.vi.toLowerCase().includes(q) ||
    (w.example || '').toLowerCase().includes(q)
  );
  renderWords(list);
}

// ── Add / Save Word ───────────────────────────────────────
function saveWord() {
  const en      = document.getElementById('input-en').value.trim();
  const vi      = document.getElementById('input-vi').value.trim();
  const pronoun = document.getElementById('input-pronoun').value.trim();
  const example = document.getElementById('input-example').value.trim();
  const wordType= document.getElementById('input-type').value;

  if (!en || !vi) {
    showError('form-error', '⚠️ Vui lòng nhập từ tiếng Anh và nghĩa tiếng Việt!');
    return;
  }

  const duplicate = words.find(w => w.en.toLowerCase() === en.toLowerCase() && w.id !== editingId);
  if (duplicate) {
    showError('form-error',
      `⚠️ Từ "<strong>${escHtml(en)}</strong>" đã tồn tại! <a href="#" onclick="highlightWord('${duplicate.id}');return false;">👁 Xem từ đó</a>`);
    document.getElementById('form-error').innerHTML =
      `⚠️ Từ "<strong>${escHtml(en)}</strong>" đã tồn tại! <a href="#" onclick="highlightWord('${duplicate.id}');return false;">👁 Xem từ đó</a>`;
    document.getElementById('form-error').style.display = 'block';
    return;
  }

  hideError('form-error');

  if (editingId) {
    const idx = words.findIndex(w => w.id === editingId);
    if (idx !== -1) {
      words[idx] = { ...words[idx], en, vi, pronoun, example, wordType };
    }
    editingId = null;
    resetFormTitle();
    showToast('✅ Đã cập nhật từ vựng!', 'success');
  } else {
    words.push({ id: uid(), en, vi, pronoun, example, status: 'learning', wordType, addedAt: Date.now() });
    showToast('✅ Đã thêm từ vựng mới!', 'success');
  }

  saveWords();
  clearForm();
  updateStats();
  filterWords();
}

function clearForm() {
  ['input-en', 'input-vi', 'input-pronoun', 'input-example'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('input-type').value = '';
  hideError('form-error');
}

function cancelEdit() {
  editingId = null;
  resetFormTitle();
  clearForm();
}

function resetFormTitle() {
  document.getElementById('form-title-icon').textContent = '✨';
  document.getElementById('form-title-text').textContent = 'Thêm Từ Vựng Mới';
  document.getElementById('btn-save-icon').textContent = '➕';
  document.getElementById('btn-save-text').textContent = 'Thêm Từ';
  document.getElementById('btn-cancel-edit').style.display = 'none';
  document.getElementById('input-type').value = '';
}

// ── Edit Modal ────────────────────────────────────────────
let editModalId = null;

function openEditModal(id) {
  const w = words.find(x => x.id === id);
  if (!w) return;
  editModalId = id;
  document.getElementById('modal-en').value      = w.en;
  document.getElementById('modal-vi').value      = w.vi;
  document.getElementById('modal-pronoun').value = w.pronoun || '';
  document.getElementById('modal-example').value = w.example || '';
  document.getElementById('modal-type').value    = w.wordType || '';
  setActiveTypeChip('type-chips-modal', w.wordType || '');
  document.getElementById('modal-overlay').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  editModalId = null;
}

function closeModalOnOverlay(event) {
  if (event.target === document.getElementById('modal-overlay')) closeModal();
}

function saveModalEdit() {
  const en       = document.getElementById('modal-en').value.trim();
  const vi       = document.getElementById('modal-vi').value.trim();
  const pronoun  = document.getElementById('modal-pronoun').value.trim();
  const example  = document.getElementById('modal-example').value.trim();
  const wordType = document.getElementById('modal-type').value;

  if (!en || !vi) { showToast('⚠️ Vui lòng nhập đầy đủ thông tin!', 'error'); return; }

  const duplicate = words.find(w => w.en.toLowerCase() === en.toLowerCase() && w.id !== editModalId);
  if (duplicate) { showToast(`⚠️ Từ "${en}" đã tồn tại!`, 'error'); return; }

  const idx = words.findIndex(w => w.id === editModalId);
  if (idx !== -1) words[idx] = { ...words[idx], en, vi, pronoun, example, wordType };

  saveWords();
  filterWords();
  updateStats();
  closeModal();
  showToast('✅ Đã lưu thay đổi!', 'success');
}

// ── Delete ────────────────────────────────────────────────
function confirmDeleteWord(id) {
  const w = words.find(x => x.id === id);
  if (!w) return;
  showConfirm(
    'Xóa Từ Vựng',
    `Bạn có chắc muốn xóa từ "<strong>${escHtml(w.en)}</strong>"?`,
    () => {
      words = words.filter(x => x.id !== id);
      saveWords();
      filterWords();
      updateStats();
      showToast('🗑️ Đã xóa từ vựng!', 'info');
    }
  );
}

function confirmClearAll() {
  if (words.length === 0) { showToast('Danh sách đang trống!', 'info'); return; }
  showConfirm(
    'Xóa Tất Cả Từ Vựng',
    `Bạn có chắc muốn xóa toàn bộ <strong>${words.length}</strong> từ vựng? Hành động này không thể hoàn tác!`,
    () => {
      words = [];
      saveWords();
      filterWords();
      updateStats();
      showToast('🗑️ Đã xóa tất cả từ vựng!', 'info');
    }
  );
}

// ── Toggle Status ─────────────────────────────────────────
function toggleStatus(id) {
  const idx = words.findIndex(w => w.id === id);
  if (idx === -1) return;
  words[idx].status = words[idx].status === 'mastered' ? 'learning' : 'mastered';
  saveWords();
  updateStats();
  filterWords();
  showToast(words[idx].status === 'mastered' ? '🌟 Đã đánh dấu thuộc!' : '📚 Đã chuyển sang đang học', 'success');
}

// ── Quiz ──────────────────────────────────────────────────
function setMode(mode) {
  currentMode = mode;
  ['en', 'vi', 'random'].forEach(m => {
    const el = document.getElementById(`mode-${m}`);
    if (el) el.classList.remove('selected');
  });
  const modeMap = { 'en-to-vi': 'en', 'vi-to-en': 'vi', 'random': 'random' };
  const el = document.getElementById(`mode-${modeMap[mode]}`);
  if (el) el.classList.add('selected');
  updateQuizInfo();
}

// ── Highlight duplicate word ──────────────────────────────
function highlightWord(id) {
  // Switch to vocab tab
  switchTab('vocab');
  // Reset filters to show all
  document.getElementById('search-input').value = '';
  document.getElementById('filter-type').value = 'all';
  document.getElementById('filter-status').value = 'all';
  filterWords();
  // Scroll & flash
  setTimeout(() => {
    const el = document.querySelector(`.word-item[data-id="${id}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('highlight-flash');
    setTimeout(() => el.classList.remove('highlight-flash'), 2000);
  }, 150);
}

// Helpers for quiz config
function setAllCount(btn) {
  document.getElementById('quiz-count-input').value = 9999;
  btn.classList.add('active');
  setTimeout(() => btn.classList.remove('active'), 600);
  updateQuizInfo();
}

function getScopeWords() {
  const scope = document.getElementById('quiz-scope').value;
  const today = new Date(); today.setHours(0,0,0,0);
  const todayTs = today.getTime();
  switch(scope) {
    case 'today':    return words.filter(w => (w.addedAt || 0) >= todayTs);
    case 'old':      return words.filter(w => (w.addedAt || 0) < todayTs);
    case 'learning': return words.filter(w => w.status === 'learning');
    case 'mastered': return words.filter(w => w.status === 'mastered');
    default:         return [...words];
  }
}

function updateQuizInfo() {
  const pool = getScopeWords();
  const isRandom = currentMode === 'random';
  const totalCards = isRandom ? pool.length * 2 : pool.length;
  const count = Math.min(parseInt(document.getElementById('quiz-count-input').value) || 10, totalCards);
  const el = document.getElementById('quiz-info-text');
  if (pool.length === 0) {
    el.textContent = '⚠️ Không có từ nào trong phạm vi này';
    el.style.color = 'var(--clr-warning)';
  } else {
    el.innerHTML = `📋 <strong>${pool.length}</strong> từ trong phạm vi · ${isRandom ? `<strong>${pool.length * 2}</strong> thẻ (cả 2 chiều)` : `<strong>${pool.length}</strong> thẻ`} · Sẽ kiểm tra <strong>${count}</strong> câu`;
    el.style.color = 'var(--clr-text-muted)';
  }
}

function showQuizStart() {
  document.getElementById('quiz-start').style.display = 'block';
  document.getElementById('quiz-game').style.display = 'none';
  document.getElementById('quiz-result').style.display = 'none';
  document.getElementById('quiz-warning').style.display = 'none';

  // reset mode selection
  document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
  const modeMap = { 'en-to-vi': 'en', 'vi-to-en': 'vi', 'random': 'random' };
  const el = document.getElementById(`mode-${modeMap[currentMode]}`);
  if (el) el.classList.add('selected');
  updateQuizInfo();
}

function startQuiz() {
  const pool = getScopeWords();
  if (pool.length === 0) {
    document.getElementById('quiz-warning').style.display = 'block';
    return;
  }
  document.getElementById('quiz-warning').style.display = 'none';

  const countInput = parseInt(document.getElementById('quiz-count-input').value) || 10;
  const isRandom = currentMode === 'random';

  let cards;
  if (isRandom) {
    // Each word appears twice: once EN→VI, once VI→EN
    const enCards = pool.map(w => ({ ...w, _dir: 'en-to-vi' }));
    const viCards = pool.map(w => ({ ...w, _dir: 'vi-to-en' }));
    cards = shuffle([...enCards, ...viCards]);
  } else {
    cards = shuffle(pool.map(w => ({ ...w, _dir: currentMode })));
  }

  quizQueue = cards.slice(0, Math.min(countInput, cards.length));
  quizIndex = 0; quizCorrect = 0; quizWrong = 0; wrongWords = [];

  document.getElementById('quiz-start').style.display = 'none';
  document.getElementById('quiz-game').style.display = 'block';
  document.getElementById('quiz-result').style.display = 'none';

  loadQuestion();
}

// ── Quiz answer normalizer (accent + case insensitive, trim) ──
function normalizeAnswer(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    // Remove common Vietnamese diacritics for lenient matching
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // collapse multiple spaces
    .replace(/\s+/g, ' ');
}

// Check if typed answer is acceptable
function isAnswerCorrect(typed, correct) {
  const t = normalizeAnswer(typed);
  const c = normalizeAnswer(correct);
  if (t === c) return true;
  // Accept if answer contains one of the comma-separated alternatives
  const alts = correct.split(',').map(s => normalizeAnswer(s.trim()));
  return alts.some(a => t === a || t === normalizeAnswer(a));
}

function loadQuestion() {
  if (quizIndex >= quizQueue.length) {
    showResult();
    return;
  }

  const total = quizQueue.length;
  const progress = (quizIndex / total) * 100;
  document.getElementById('quiz-progress-fill').style.width = progress + '%';
  document.getElementById('quiz-counter').textContent = `Câu ${quizIndex + 1} / ${total}`;
  document.getElementById('quiz-score-live').innerHTML = `✅ ${quizCorrect} &nbsp; ❌ ${quizWrong}`;

  const current = quizQueue[quizIndex];

  // Direction is pre-set per card (from startQuiz)
  quizCurrentDirection = current._dir || currentMode;

  const isEnToVi = quizCurrentDirection === 'en-to-vi';
  const question = isEnToVi ? current.en : current.vi;
  const answer   = isEnToVi ? current.vi : current.en;

  document.getElementById('quiz-direction-badge').textContent = isEnToVi ? '🇬🇧 → 🇻🇳' : '🇻🇳 → 🇬🇧';
  document.getElementById('quiz-question').textContent = question;
  document.getElementById('quiz-pronoun').textContent = (isEnToVi && current.pronoun) ? current.pronoun : '';

  // Store correct answer on the input for submitTypedAnswer to read
  const inp = document.getElementById('quiz-type-input');
  inp.value = '';
  inp.classList.remove('correct', 'wrong');
  inp.disabled = false;
  inp.dataset.answer = answer;
  inp.dataset.wordId = current.id;

  document.getElementById('btn-submit-answer').disabled = false;
  document.getElementById('quiz-feedback').style.display = 'none';

  // Auto-focus input
  setTimeout(() => inp.focus(), 80);
}

function submitTypedAnswer() {
  const inp = document.getElementById('quiz-type-input');
  if (inp.disabled) return; // already answered

  const typed   = inp.value.trim();
  const correct = inp.dataset.answer;
  const wordId  = inp.dataset.wordId;
  const word    = words.find(w => w.id === wordId) || quizQueue[quizIndex];

  if (!typed) {
    inp.focus();
    inp.style.animation = 'none';
    inp.offsetHeight; // reflow
    inp.style.animation = 'shake .3s ease';
    return;
  }

  const ok = isAnswerCorrect(typed, correct);

  // Style input
  inp.classList.add(ok ? 'correct' : 'wrong');
  inp.disabled = true;
  document.getElementById('btn-submit-answer').disabled = true;

  if (ok) { quizCorrect++; } else { quizWrong++; wrongWords.push(word); }

  // Show feedback
  const feedback = document.getElementById('quiz-feedback');
  feedback.style.display = 'flex';
  document.getElementById('feedback-icon').textContent = ok ? '🎉' : '😢';
  document.getElementById('feedback-msg').textContent  = ok
    ? 'Chính xác! Xuất sắc! ✨'
    : 'Chưa đúng rồi!';
  const correctEl = document.getElementById('feedback-correct');
  correctEl.textContent = ok ? '' : `Đáp án đúng: ${correct}`;
  document.getElementById('feedback-example').textContent = word && word.example ? `💬 ${word.example}` : '';
  document.getElementById('quiz-score-live').innerHTML = `✅ ${quizCorrect} &nbsp; ❌ ${quizWrong}`;

  // Focus next button
  setTimeout(() => document.getElementById('btn-next-question').focus(), 100);
}

function nextQuestion() {
  quizIndex++;
  document.getElementById('quiz-feedback').style.display = 'none';
  loadQuestion();
}

function showResult() {
  document.getElementById('quiz-game').style.display = 'none';
  document.getElementById('quiz-result').style.display = 'block';

  const total = quizQueue.length;
  const pct = Math.round((quizCorrect / total) * 100);

  document.getElementById('result-percent').textContent = pct + '%';
  document.getElementById('rs-correct').textContent = quizCorrect;
  document.getElementById('rs-wrong').textContent = quizWrong;
  document.getElementById('rs-total').textContent = total;

  // Animate ring
  const circumference = 314;
  const offset = circumference - (pct / 100) * circumference;
  setTimeout(() => {
    const ring = document.getElementById('ring-fill');
    ring.style.strokeDashoffset = offset;
    const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
    ring.style.stroke = color;
  }, 100);

  // Emoji
  const emoji = pct === 100 ? '🏆' : pct >= 80 ? '🌟' : pct >= 50 ? '👍' : '💪';
  document.getElementById('result-emoji').textContent = emoji;

  // Wrong words list
  if (wrongWords.length > 0) {
    const wrap = document.getElementById('wrong-list-wrap');
    wrap.style.display = 'block';
    const list = document.getElementById('wrong-list');
    list.innerHTML = wrongWords.map(w => `
      <div class="wrong-item">
        <span class="wrong-item-en">${escHtml(w.en)}</span>
        <span class="wrong-item-vi">${escHtml(w.vi)}</span>
      </div>`).join('');
  } else {
    document.getElementById('wrong-list-wrap').style.display = 'none';
  }

  // Mark wrong words as "learning"
  wrongWords.forEach(w => {
    const idx = words.findIndex(x => x.id === w.id);
    if (idx !== -1) words[idx].status = 'learning';
  });
  // Mark all-correct words as "mastered"
  if (quizCorrect > 0) {
    const wrongIds = new Set(wrongWords.map(w => w.id));
    quizQueue.forEach(w => {
      if (!wrongIds.has(w.id)) {
        const idx = words.findIndex(x => x.id === w.id);
        if (idx !== -1) words[idx].status = 'mastered';
      }
    });
  }
  saveWords();
  updateStats();
}

// ── Confirm Dialog ────────────────────────────────────────
let confirmCallback = null;
function showConfirm(title, msg, onConfirm) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-msg').innerHTML = msg;
  confirmCallback = onConfirm;
  document.getElementById('confirm-overlay').style.display = 'flex';
  document.getElementById('confirm-ok').onclick = () => { onConfirm(); closeConfirm(); };
}
function closeConfirm() {
  document.getElementById('confirm-overlay').style.display = 'none';
  confirmCallback = null;
}

// ── Toast ─────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  t.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.style.display = 'none'; }, 2800);
}

// ── Helpers ───────────────────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}
function hideError(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

// ── Keyboard shortcuts ────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    closeConfirm();
  }

  // Vocab tab: Enter to save word
  if (e.key === 'Enter' && document.getElementById('tab-vocab').classList.contains('active')) {
    const focused = document.activeElement;
    if (focused && focused.classList.contains('form-input')) saveWord();
  }

  // Quiz tab typing shortcuts
  if (document.getElementById('tab-quiz').classList.contains('active')) {
    if (document.getElementById('quiz-game').style.display !== 'none') {
      const inp = document.getElementById('quiz-type-input');
      // Enter = submit answer  OR  advance if already answered
      if (e.key === 'Enter') {
        e.preventDefault();
        if (inp && !inp.disabled) {
          submitTypedAnswer();
        } else if (document.getElementById('quiz-feedback').style.display !== 'none') {
          nextQuestion();
        }
      }
      // Tab = skip (mark wrong, move on)
      if (e.key === 'Tab') {
        e.preventDefault();
        if (inp && !inp.disabled) {
          inp.value = ''; // force empty → will trigger wrong path
          // Directly mark as wrong and skip
          const correct = inp.dataset.answer;
          const wordId  = inp.dataset.wordId;
          const word    = words.find(w => w.id === wordId) || quizQueue[quizIndex];
          inp.classList.add('wrong');
          inp.disabled = true;
          document.getElementById('btn-submit-answer').disabled = true;
          quizWrong++;
          wrongWords.push(word);
          const feedback = document.getElementById('quiz-feedback');
          feedback.style.display = 'flex';
          document.getElementById('feedback-icon').textContent = '⏭️';
          document.getElementById('feedback-msg').textContent  = 'Đã bỏ qua câu này';
          const correctEl = document.getElementById('feedback-correct');
          correctEl.textContent = `Đáp án đúng: ${correct}`;
          document.getElementById('feedback-example').textContent = word && word.example ? `💬 ${word.example}` : '';
          document.getElementById('quiz-score-live').innerHTML = `✅ ${quizCorrect} &nbsp; ❌ ${quizWrong}`;
          setTimeout(() => document.getElementById('btn-next-question').focus(), 100);
        }
      }
    }
  }
});

// Shake animation for empty submit
const styleSheet = document.createElement('style');
styleSheet.textContent = `
@keyframes shake {
  0%,100%{transform:translateX(0);}
  20%{transform:translateX(-6px);}
  40%{transform:translateX(6px);}
  60%{transform:translateX(-4px);}
  80%{transform:translateX(4px);}
}`;
document.head.appendChild(styleSheet);

// ── Init ──────────────────────────────────────────────────
loadWords();
updateStats();
filterWords();
setMode('en-to-vi');
document.getElementById('mode-en').classList.add('selected');
// updateQuizInfo is called by setMode above
