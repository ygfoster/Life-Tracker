:root {
  --bg-color: #000000;
  --surface-color: #121214;
  --input-bg: rgba(255, 255, 255, 0.06);
  --text-primary: #fafafa;
  --text-secondary: #a1a1aa;
  --border-color: #27272a;
  --danger-color: #FF453A;
  
  --color-life: url(#grad-life);
  --color-born: url(#grad-born);
  --color-custom: url(#grad-custom);
  
  --nav-height: 90px;
}

* { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
body { font-family: 'Inter', -apple-system, sans-serif; background-color: var(--bg-color); color: var(--text-primary); line-height: 1.5; -webkit-font-smoothing: antialiased; overflow: hidden; touch-action: none; }
.app-container { position: relative; width: 100vw; height: 100vh; }
.viewport { width: 100vw; height: calc(100vh - var(--nav-height)); overflow: hidden; }
.swipe-wrapper { display: flex; width: 100%; height: 100%; transition: transform 0.45s cubic-bezier(0.25, 1, 0.4, 1); will-change: transform; }
.view-section { flex: 0 0 100vw; width: 100vw; height: 100%; display: flex; flex-direction: column; align-items: center; padding: 60px 20px 20px; }
.view-section.scrollable { overflow-y: auto; align-items: stretch; padding-bottom: 80px; touch-action: pan-y; }
.view-title { font-size: 1.6rem; font-weight: 400; letter-spacing: 0.1em; color: var(--text-secondary); margin-bottom: 40px; text-align: center; }

/* タイマー描画 */
.timer-display { display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; }
.circle-wrapper { position: relative; width: 280px; height: 280px; margin-bottom: 40px; }
.circle-svg { transform: rotate(-90deg); width: 100%; height: 100%; }
.circle-bg { fill: none; stroke: var(--surface-color); stroke-width: 6; }
.circle-progress { fill: none; stroke-width: 6; stroke-linecap: round; transition: stroke-dashoffset 0.8s ease-out; }
.circle-content { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; }
.circle-value { font-size: 5.5rem; font-weight: 200; line-height: 1; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.circle-unit { font-size: 1rem; font-weight: 400; color: var(--text-secondary); margin-top: 4px; }
.sub-timer-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; width: 100%; max-width: 320px; }
.sub-timer-item { display: flex; flex-direction: column; align-items: center; }
.sub-value { font-size: 2rem; font-weight: 300; font-variant-numeric: tabular-nums; }
.sub-unit { font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px; }
.custom-indicators { position: absolute; bottom: calc(var(--nav-height) + 20px); left: 0; right: 0; display: flex; gap: 8px; justify-content: center; pointer-events: none; z-index: 50; opacity: 0; transition: opacity 0.3s; }
.custom-indicators.show { opacity: 1; }
.indicator-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--border-color); transition: 0.3s; }
.indicator-dot.active { background: var(--text-primary); transform: scale(1.2); }

/* ナビゲーション */
.floating-tab-bar { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); width: calc(100% - 40px); max-width: 400px; height: 64px; background: rgba(18, 18, 20, 0.85); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 32px; display: flex; justify-content: space-around; align-items: center; z-index: 100; box-shadow: 0 10px 30px rgba(0,0,0,0.6); }
.tab-item { background: none; border: none; color: #636366; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; width: 60px; height: 100%; cursor: pointer; transition: all 0.2s ease; }
.tab-item svg { width: 22px; height: 22px; stroke-width: 1.8; }
.tab-item span { font-size: 0.65rem; font-weight: 600; }
.tab-item.active { color: var(--text-primary); }
.tab-item.active svg { stroke-width: 2.5; }

/* フォーム */
.settings-form { max-width: 400px; margin: 0 auto; width: 100%; }
.form-group { margin-bottom: 24px; }
.form-group label, .form-header-row label { display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 10px; font-weight: 500; }
.input-field { width: 100%; background: var(--input-bg); border: 1px solid transparent; color: var(--text-primary); padding: 16px; border-radius: 16px; font-size: 1rem; outline: none; transition: all 0.2s; font-family: 'Inter', sans-serif; appearance: none; -webkit-appearance: none; }
.input-field:focus { background: var(--surface-color); border-color: #555; }
.input-suffix-wrap { position: relative; display: flex; align-items: center; }
.suffix { position: absolute; right: 16px; color: var(--text-secondary); font-weight: 500; pointer-events: none; }

input[type="number"]::-webkit-outer-spin-button, input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
input[type="number"] { -moz-appearance: textfield; }

/* 新規：寿命設定の分離型UI */
.life-setting-group { display: flex; align-items: center; gap: 12px; }
.life-setting-group .input-suffix-wrap { flex: 1; }
.stepper-controls { display: flex; gap: 8px; }
.stepper-btn { background: var(--surface-color); border: 1px solid var(--border-color); color: var(--text-primary); width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
.stepper-btn:active { background: #333; transform: scale(0.92); border-color: var(--text-secondary); }
.stepper-btn svg { width: 20px; height: 20px; }

/* ピッカー等 */
.date-picker-group { display: flex; gap: 10px; width: 100%; }
.apple-select-wrap { position: relative; flex: 1; }
.apple-select { appearance: none; -webkit-appearance: none; width: 100%; background: var(--input-bg); border: 1px solid transparent; color: var(--text-primary); padding: 16px 12px; border-radius: 16px; font-size: 1rem; text-align: center; font-weight: 500; outline: none; transition: all 0.2s; font-family: 'Inter', sans-serif; }
.apple-select:focus { background: var(--surface-color); border-color: #555; }
.apple-select-wrap::after { content: '▼'; position: absolute; right: 12px; top: 50%; transform: translateY(-50%) scale(0.6); color: var(--text-secondary); pointer-events: none; opacity: 0.5; }
.unit-label { position: absolute; right: 28px; top: 50%; transform: translateY(-50%); font-size: 0.8rem; color: var(--text-secondary); pointer-events: none; }

.has-error .apple-select, .has-error .input-field { border-color: var(--danger-color); background: rgba(255, 69, 58, 0.05); }
.error-msg { color: var(--danger-color); font-size: 0.8rem; margin-top: 8px; display: none; font-weight: 500; }
.has-error ~ .error-msg { display: block; animation: shake 0.3s ease-in-out; }

.custom-settings-list { display: flex; flex-direction: column; gap: 16px; }
.custom-item-card { background: var(--surface-color); padding: 20px; border-radius: 20px; border: 1px solid var(--border-color); }
.custom-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.btn-icon-danger { background: none; border: none; color: var(--danger-color); cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; transition: transform 0.2s, opacity 0.2s; opacity: 0.8; }
.btn-icon-danger:active { transform: scale(0.85); opacity: 1; }
.btn-icon-danger svg { width: 20px; height: 20px; stroke-width: 2; }
.divider { border: none; border-top: 1px solid var(--border-color); margin: 32px 0; }
.form-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }

.btn-primary { appearance: none; -webkit-appearance: none; display: block; width: 100%; background: var(--text-primary); color: var(--bg-color); border: none; padding: 18px; border-radius: 16px; font-size: 1.05rem; font-weight: 600; cursor: pointer; transition: transform 0.1s; text-align: center; text-decoration: none; }
.btn-primary:active { transform: scale(0.96); }
.btn-text { appearance: none; -webkit-appearance: none; background: none; border: none; color: #0A84FF; font-size: 0.95rem; font-weight: 500; cursor: pointer; }

/* Empty & Overlay */
.empty-custom-msg { text-align: center; color: var(--text-secondary); margin-top: 40px; display: flex; flex-direction: column; align-items: center; gap: 16px; }
.empty-custom-msg svg { width: 48px; height: 48px; stroke-width: 1; opacity: 0.5; }
.setup-overlay { position: fixed; inset: 0; background: var(--bg-color); z-index: 9999; display: flex; align-items: center; justify-content: center; }
.setup-card { text-align: center; padding: 32px; width: 100%; }
.setup-card h2 { font-size: 2rem; font-weight: 300; margin-bottom: 12px; }
.setup-card p { color: var(--text-secondary); margin-bottom: 32px; }

/* 保存アニメーション（ダークテーマ・洗練版） */
.saving-overlay { position: fixed; inset: 0; background-color: rgba(0, 0, 0, 0.75); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); z-index: 10000; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; }
.saving-overlay.active { opacity: 1; pointer-events: auto; }
.saving-box { background-color: #1c1c1e; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; padding: 32px 40px; display: flex; flex-direction: column; align-items: center; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8); transform: scale(0.95); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.saving-overlay.active .saving-box { transform: scale(1); }
.saving-spinner { width: 44px; height: 44px; border: 3px solid rgba(255, 255, 255, 0.1); border-top-color: #fafafa; border-radius: 50%; animation: spin 0.8s linear infinite; }
.saving-check { width: 44px; height: 44px; border-radius: 50%; display: none; align-items: center; justify-content: center; color: #fafafa; animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.saving-check svg { width: 28px; height: 28px; stroke-width: 2.5; }
.saving-text { margin-top: 20px; font-size: 1rem; font-weight: 600; color: #fafafa; letter-spacing: 0.05em; }

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes popIn { 0% { transform: scale(0.5); opacity: 0; } 80% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
