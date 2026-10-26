/* ========================================================
   VocabMaster – theme.js
   Dynamic Theme Engine & Custom Color Customizer
   ======================================================== */

const THEME_STORAGE_KEY = 'vocab_theme_setting';

// Preset color palettes
const THEME_PRESETS = {
  sakura: {
    id: 'sakura',
    name: 'Cyberpunk Sakura',
    icon: '🌸',
    bg: '#110812',
    surface: '#1a0f1e',
    surface2: '#231429',
    border: '#3a1f40',
    primary: '#f472b6',
    primaryH: '#f9a8d4',
    primaryDk: '#db2777',
    accent: '#e879f9',
    accent2: '#fb7185',
    text: '#fce7f3',
    textMuted: '#9d6b9a',
    orbs: ['#f472b6', '#e879f9', '#fb7185']
  },
  ocean: {
    id: 'ocean',
    name: 'Deep Ocean Neon',
    icon: '🌊',
    bg: '#070d18',
    surface: '#0f172a',
    surface2: '#1e293b',
    border: '#1e3a5f',
    primary: '#38bdf8',
    primaryH: '#7dd3fc',
    primaryDk: '#0284c7',
    accent: '#2dd4bf',
    accent2: '#3b82f6',
    text: '#f0f9ff',
    textMuted: '#64748b',
    orbs: ['#38bdf8', '#2dd4bf', '#3b82f6']
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Matrix',
    icon: '🌿',
    bg: '#06120c',
    surface: '#0b1e14',
    surface2: '#122b1d',
    border: '#1c452f',
    primary: '#34d399',
    primaryH: '#6ee7b7',
    primaryDk: '#059669',
    accent: '#a7f3d0',
    accent2: '#10b981',
    text: '#ecfdf5',
    textMuted: '#6ee7b7',
    orbs: ['#34d399', '#a7f3d0', '#10b981']
  },
  purple: {
    id: 'purple',
    name: 'Mystic Amethyst',
    icon: '🔮',
    bg: '#0e071a',
    surface: '#170e28',
    surface2: '#22163b',
    border: '#392461',
    primary: '#a855f7',
    primaryH: '#c084fc',
    primaryDk: '#7e22ce',
    accent: '#f43f5e',
    accent2: '#8b5cf6',
    text: '#f5f3ff',
    textMuted: '#9f8db8',
    orbs: ['#a855f7', '#f43f5e', '#8b5cf6']
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset Amber',
    icon: '🌅',
    bg: '#140905',
    surface: '#20100a',
    surface2: '#2c170f',
    border: '#4e2418',
    primary: '#fb923c',
    primaryH: '#fdba74',
    primaryDk: '#ea580c',
    accent: '#f43f5e',
    accent2: '#f59e0b',
    text: '#fff7ed',
    textMuted: '#ab8173',
    orbs: ['#fb923c', '#f43f5e', '#f59e0b']
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Slate',
    icon: '🖤',
    bg: '#09090b',
    surface: '#121217',
    surface2: '#1b1b22',
    border: '#2e2e38',
    primary: '#60a5fa',
    primaryH: '#93c5fd',
    primaryDk: '#2563eb',
    accent: '#a855f7',
    accent2: '#38bdf8',
    text: '#f8fafc',
    textMuted: '#8b8b99',
    orbs: ['#60a5fa', '#a855f7', '#38bdf8']
  },
  mocha: {
    id: 'mocha',
    name: 'Vintage Mocha',
    icon: '☕',
    bg: '#130d0a',
    surface: '#1f1612',
    surface2: '#2b1f1a',
    border: '#453229',
    primary: '#d97706',
    primaryH: '#f59e0b',
    primaryDk: '#b45309',
    accent: '#eab308',
    accent2: '#ca8a04',
    text: '#fef3c7',
    textMuted: '#a89182',
    orbs: ['#d97706', '#eab308', '#ca8a04']
  }
};

let currentThemeSetting = {
  type: 'preset',      // 'preset' | 'custom'
  presetId: 'sakura',  // preset id
  customColors: {
    primary: '#f472b6',
    bg: '#110812'
  }
};

// ── Color Utilities ──────────────────────────────────────
function hexToRgb(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function rgbToHex(r, g, b) {
  const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [clamp(r), clamp(g), clamp(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}

function adjustColorBrightness(hex, percent) {
  const { r, g, b } = hexToRgb(hex);
  const factor = 1 + percent / 100;
  return rgbToHex(r * factor, g * factor, b * factor);
}

// ── Apply Theme ──────────────────────────────────────────
function applyTheme(themeData) {
  const root = document.documentElement;
  let palette;

  if (themeData.type === 'custom') {
    const primaryHex = themeData.customColors?.primary || '#f472b6';
    const bgHex      = themeData.customColors?.bg || '#110812';

    // Calculate harmonious palette from primary & background
    const surfaceHex  = adjustColorBrightness(bgHex, 20);
    const surface2Hex = adjustColorBrightness(bgHex, 40);
    const borderHex   = adjustColorBrightness(bgHex, 70);

    const primaryH  = adjustColorBrightness(primaryHex, 25);
    const primaryDk = adjustColorBrightness(primaryHex, -25);
    const accent    = adjustColorBrightness(primaryHex, 15);
    const accent2   = adjustColorBrightness(primaryHex, -15);

    palette = {
      bg: bgHex,
      surface: surfaceHex,
      surface2: surface2Hex,
      border: borderHex,
      primary: primaryHex,
      primaryH: primaryH,
      primaryDk: primaryDk,
      accent: accent,
      accent2: accent2,
      text: '#f8fafc',
      textMuted: '#94a3b8',
      orbs: [primaryHex, accent, primaryDk]
    };
  } else {
    palette = THEME_PRESETS[themeData.presetId] || THEME_PRESETS.sakura;
  }

  // Set CSS Variables
  root.style.setProperty('--clr-bg', palette.bg);
  root.style.setProperty('--clr-surface', palette.surface);
  root.style.setProperty('--clr-surface2', palette.surface2);
  root.style.setProperty('--clr-border', palette.border);
  root.style.setProperty('--clr-primary', palette.primary);
  root.style.setProperty('--clr-primary-h', palette.primaryH);
  root.style.setProperty('--clr-primary-dk', palette.primaryDk);
  root.style.setProperty('--clr-accent', palette.accent);
  root.style.setProperty('--clr-accent2', palette.accent2);
  root.style.setProperty('--clr-text', palette.text);
  root.style.setProperty('--clr-text-muted', palette.textMuted);

  // Set glow & shadow
  const rgbPrimary = hexToRgb(palette.primary);
  root.style.setProperty('--shadow-glow', `0 0 40px rgba(${rgbPrimary.r}, ${rgbPrimary.g}, ${rgbPrimary.b}, 0.25)`);

  // Update floating background orbs
  const orb1 = document.querySelector('.orb-1');
  const orb2 = document.querySelector('.orb-2');
  const orb3 = document.querySelector('.orb-3');
  if (orb1 && palette.orbs?.[0]) orb1.style.background = `radial-gradient(circle, ${palette.orbs[0]}, transparent)`;
  if (orb2 && palette.orbs?.[1]) orb2.style.background = `radial-gradient(circle, ${palette.orbs[1]}, transparent)`;
  if (orb3 && palette.orbs?.[2]) orb3.style.background = `radial-gradient(circle, ${palette.orbs[2]}, transparent)`;

  currentThemeSetting = themeData;
  localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(themeData));

  // Update active UI card in settings modal if open
  updateThemeModalUI();
}

// ── Select Preset ────────────────────────────────────────
function selectPresetTheme(presetId) {
  const preset = THEME_PRESETS[presetId];
  if (!preset) return;

  const themeData = {
    type: 'preset',
    presetId: presetId,
    customColors: {
      primary: preset.primary,
      bg: preset.bg
    }
  };

  applyTheme(themeData);
  if (typeof showToast === 'function') {
    showToast(`Đã áp dụng theme: ${preset.name}`, 'success');
  }
}

// ── Custom Color Handlers ────────────────────────────────
function handleCustomPrimaryChange(hex) {
  const themeData = {
    type: 'custom',
    presetId: 'custom',
    customColors: {
      primary: hex,
      bg: currentThemeSetting.customColors?.bg || '#110812'
    }
  };
  applyTheme(themeData);
}

function handleCustomBgChange(hex) {
  const themeData = {
    type: 'custom',
    presetId: 'custom',
    customColors: {
      primary: currentThemeSetting.customColors?.primary || '#f472b6',
      bg: hex
    }
  };
  applyTheme(themeData);
}

function resetThemeDefault() {
  selectPresetTheme('sakura');
}

// ── Theme Modal UI ───────────────────────────────────────
function openThemeModal() {
  const modal = document.getElementById('theme-modal');
  if (!modal) return;
  renderThemePresetsList();
  updateThemeModalUI();
  modal.style.display = 'flex';
}

function closeThemeModal() {
  const modal = document.getElementById('theme-modal');
  if (modal) modal.style.display = 'none';
}

function renderThemePresetsList() {
  const container = document.getElementById('theme-presets-container');
  if (!container) return;

  container.innerHTML = Object.values(THEME_PRESETS).map(preset => {
    const isSelected = currentThemeSetting.type === 'preset' && currentThemeSetting.presetId === preset.id;
    return `
      <div class="theme-preset-card ${isSelected ? 'active' : ''}" onclick="selectPresetTheme('${preset.id}')">
        <div class="theme-card-preview" style="background: ${preset.bg}; border-color: ${preset.border};">
          <div class="theme-card-dot" style="background: ${preset.primary}"></div>
          <div class="theme-card-dot" style="background: ${preset.accent}"></div>
          <div class="theme-card-dot" style="background: ${preset.accent2}"></div>
        </div>
        <div class="theme-card-info">
          <span class="theme-card-name">${preset.icon} ${preset.name}</span>
          ${isSelected ? '<span class="theme-card-check">✓ Đang dùng</span>' : ''}
        </div>
      </div>
    `;
  }).join('');
}

function updateThemeModalUI() {
  // Update presets cards
  renderThemePresetsList();

  // Update color picker inputs
  const primaryInput = document.getElementById('custom-primary-color');
  const bgInput      = document.getElementById('custom-bg-color');
  const primaryHex   = document.getElementById('custom-primary-hex');
  const bgHex        = document.getElementById('custom-bg-hex');

  const curPrimary = currentThemeSetting.customColors?.primary || (THEME_PRESETS[currentThemeSetting.presetId]?.primary) || '#f472b6';
  const curBg      = currentThemeSetting.customColors?.bg || (THEME_PRESETS[currentThemeSetting.presetId]?.bg) || '#110812';

  if (primaryInput) primaryInput.value = curPrimary;
  if (bgInput)      bgInput.value = curBg;
  if (primaryHex)   primaryHex.textContent = curPrimary.toUpperCase();
  if (bgHex)        bgHex.textContent = curBg.toUpperCase();
}

// ── Initialize on Script Load (Zero Flicker) ─────────────
(function initTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      applyTheme(data);
    } else {
      applyTheme(currentThemeSetting);
    }
  } catch (e) {
    applyTheme(currentThemeSetting);
  }
})();
