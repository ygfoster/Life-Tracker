document.addEventListener('DOMContentLoaded', () => {
  // --- 状態管理 ---
  let config = JSON.parse(localStorage.getItem('lifeTrackerConfig')) || null;
  let currentTab = 'view-life';
  let currentCustomIndex = 0;
  let animationFrameId = null;

  // DOM Elements
  const tabs = document.querySelectorAll('.tab-item');
  const sections = document.querySelectorAll('.view-section');
  const setupOverlay = document.getElementById('setup-overlay');
  
  // セマンティックカラー（SVGグラデーション定義用）
  const colors = {
    life: ['#FF453A', '#FF9F0A'],   // 赤〜オレンジ（焦燥感）
    born: ['#30D158', '#34C759'],   // 緑系（成長）
    custom: ['#BF5AF2', '#FF375F']  // 紫〜ピンク（個性）
  };

  // --- 初期化 ---
  function init() {
    injectSVGDefs();
    if (!config || !config.birth) {
      setupOverlay.style.display = 'flex';
    } else {
      setupOverlay.style.display = 'none';
      populateSettings();
      startRenderLoop();
    }
  }

  // グラデーションの定義をDOMに注入
  function injectSVGDefs() {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.style.width = '0'; svg.style.height = '0'; svg.style.position = 'absolute';
    let defs = document.createElementNS(svgNS, "defs");
    
    Object.keys(colors).forEach(key => {
      let grad = document.createElementNS(svgNS, "linearGradient");
      grad.setAttribute("id", `grad-${key}`);
      grad.setAttribute("x1", "0%"); grad.setAttribute("y1", "0%");
      grad.setAttribute("x2", "100%"); grad.setAttribute("y2", "100%");
      
      let stop1 = document.createElementNS(svgNS, "stop");
      stop1.setAttribute("offset", "0%"); stop1.setAttribute("stop-color", colors[key][0]);
      let stop2 = document.createElementNS(svgNS, "stop");
      stop2.setAttribute("offset", "100%"); stop2.setAttribute("stop-color", colors[key][1]);
      
      grad.appendChild(stop1); grad.appendChild(stop2); defs.appendChild(grad);
    });
    svg.appendChild(defs); document.body.appendChild(svg);
  }

  // --- タブ切り替えロジック ---
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));
      
      tab.classList.add('active');
      currentTab = tab.getAttribute('data-target');
      document.getElementById(currentTab).classList.add('active');
    });
  });

  // --- 描画ループ (60fpsでスムーズな更新) ---
  function startRenderLoop() {
    if(animationFrameId) cancelAnimationFrame(animationFrameId);
    
    function render() {
      const now = new Date();
      if (currentTab === 'view-life') renderTimer('timer-life', calculateLife(now), 'life');
      else if (currentTab === 'view-born') renderTimer('timer-born', calculateBorn(now), 'born');
      else if (currentTab === 'view-custom') renderCustom(now);
      
      animationFrameId = requestAnimationFrame(render);
    }
    render();
  }

  // --- 時間計算ロジック ---
  function calculateDiff(start, end, isCountdown) {
    let from = isCountdown ? new Date(start) : new Date(start);
    let to = isCountdown ? new Date(end) : new Date(end);
    if (from > to) return { years: 0, days: 0, hours: 0, minutes: 0, seconds: 0, progress: 1 };

    let years = to.getFullYear() - from.getFullYear();
    let tempDate = new Date(from);
    tempDate.setFullYear(from.getFullYear() + years);

    if (to < tempDate) {
      years--;
      tempDate.setFullYear(from.getFullYear() + years);
    }

    let remMs = to - tempDate;
    let days = Math.floor(remMs / (1000 * 60 * 60 * 24));
    let hours = Math.floor((remMs / (1000 * 60 * 60)) % 24);
    let minutes = Math.floor((remMs / (1000 * 60)) % 60);
    let seconds = Math.floor((remMs / 1000) % 60);

    // プログレス計算: 今年1年間の中でどれくらい経過したかの割合 (0.0 ~ 1.0)
    let yearStart = new Date(to.getFullYear(), from.getMonth(), from.getDate());
    if (to < yearStart) yearStart.setFullYear(yearStart.getFullYear() - 1);
    let yearEnd = new Date(yearStart); yearEnd.setFullYear(yearEnd.getFullYear() + 1);
    let progress = (to - yearStart) / (yearEnd - yearStart);
    if(isCountdown) progress = 1 - progress;

    return { years, days, hours, minutes, seconds, progress };
  }

  function calculateLife(now) {
    const birth = new Date(config.birth);
    const end = new Date(birth);
    end.setFullYear(birth.getFullYear() + Number(config.lifeAge));
    return calculateDiff(now, end, true);
  }

  function calculateBorn(now) {
    return calculateDiff(config.birth, now, false);
  }

  function calculateCustom(now, startDateStr) {
    return calculateDiff(startDateStr, now, false);
  }

  // --- UI描画 (DOMの再生成を防ぎ軽くする) ---
  function renderTimer(containerId, data, colorType) {
    const container = document.getElementById(containerId);
    if (!container.innerHTML) {
      container.innerHTML = `
        <div class="circle-wrapper">
          <svg class="circle-svg" viewBox="0 0 100 100">
            <circle class="circle-bg" cx="50" cy="50" r="45"></circle>
            <circle class="circle-progress" cx="50" cy="50" r="45" stroke="url(#grad-${colorType})"></circle>
          </svg>
          <div class="circle-content">
            <div class="circle-value" id="${containerId}-years">0</div>
            <div class="circle-unit">年</div>
          </div>
        </div>
        <div class="sub-timer-grid">
          <div class="sub-timer-item"><span class="sub-value" id="${containerId}-days">0</span><span class="sub-unit">日</span></div>
          <div class="sub-timer-item"><span class="sub-value" id="${containerId}-hours">0</span><span class="sub-unit">時間</span></div>
          <div class="sub-timer-item"><span class="sub-value" id="${containerId}-mins">0</span><span class="sub-unit">分</span></div>
          <div class="sub-timer-item"><span class="sub-value" id="${containerId}-secs">0</span><span class="sub-unit">秒</span></div>
        </div>
      `;
    }
    
    // 値の更新
    document.getElementById(`${containerId}-years`).textContent = data.years;
    document.getElementById(`${containerId}-days`).textContent = data.days;
    document.getElementById(`${containerId}-hours`).textContent = String(data.hours).padStart(2, '0');
    document.getElementById(`${containerId}-mins`).textContent = String(data.minutes).padStart(2, '0');
    document.getElementById(`${containerId}-secs`).textContent = String(data.seconds).padStart(2, '0');

    // SVGプログレスバーの更新
    const circle = container.querySelector('.circle-progress');
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = circumference - (data.progress * circumference);
  }

  // --- カスタムタブのスワイプと描画 ---
  function renderCustom(now) {
    if (!config.customs || config.customs.length === 0) {
      document.getElementById('custom-title').textContent = "未設定";
      document.getElementById('timer-custom').innerHTML = "<p style='color:#a1a1aa; margin-top:40px;'>設定画面から追加してください</p>";
      document.getElementById('custom-indicators').innerHTML = '';
      return;
    }
    
    // スワイプによるインデックスの制限
    if(currentCustomIndex >= config.customs.length) currentCustomIndex = 0;
    
    const target = config.customs[currentCustomIndex];
    document.getElementById('custom-title').textContent = target.title || "名称未設定";
    renderTimer('timer-custom', calculateCustom(now, target.start), 'custom');

    // インジケーター生成
    const indContainer = document.getElementById('custom-indicators');
    if(indContainer.children.length !== config.customs.length) {
      indContainer.innerHTML = '';
      config.customs.forEach((_, i) => {
        let dot = document.createElement('div');
        dot.className = `indicator-dot ${i === currentCustomIndex ? 'active' : ''}`;
        indContainer.appendChild(dot);
      });
    } else {
      Array.from(indContainer.children).forEach((dot, i) => {
        dot.className = `indicator-dot ${i === currentCustomIndex ? 'active' : ''}`;
      });
    }
  }

  // スワイプ操作の実装
  let touchStartX = 0;
  let touchEndX = 0;
  document.getElementById('custom-swipe-area').addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, {passive: true});
  document.getElementById('custom-swipe-area').addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, {passive: true});

  function handleSwipe() {
    if(config.customs.length <= 1) return;
    const threshold = 50;
    if (touchEndX < touchStartX - threshold) {
      currentCustomIndex = (currentCustomIndex + 1) % config.customs.length; // 左スワイプ (次へ)
    }
    if (touchEndX > touchStartX + threshold) {
      currentCustomIndex = (currentCustomIndex - 1 + config.customs.length) % config.customs.length; // 右スワイプ (前へ)
    }
  }

  // --- 設定画面のロジック ---
  document.getElementById('btn-start-setup').addEventListener('click', () => {
    setupOverlay.style.display = 'none';
    tabs[3].click(); // 設定タブを開く
  });

  function populateSettings() {
    document.getElementById('input-birth').value = config.birth || '';
    document.getElementById('input-life').value = config.lifeAge || 30;
    renderCustomSettings();
  }

  function renderCustomSettings() {
    const list = document.getElementById('custom-settings-list');
    list.innerHTML = '';
    const customs = config?.customs || [];
    customs.forEach((c, index) => {
      const card = document.createElement('div');
      card.className = 'custom-item-card';
      card.innerHTML = `
        <input type="text" class="input-field" placeholder="タイトル (例: 禁煙を始めて)" value="${c.title}" data-index="${index}" style="margin-bottom:12px;">
        <input type="date" class="input-field" value="${c.start}" data-index="${index}">
        <div style="text-align:right;"><button class="btn-remove" onclick="removeCustom(${index})">削除</button></div>
      `;
      list.appendChild(card);
    });
    document.getElementById('btn-add-custom').style.display = customs.length >= 3 ? 'none' : 'block';
  }

  document.getElementById('btn-add-custom').addEventListener('click', () => {
    if(!config) config = { customs: [] };
    if(!config.customs) config.customs = [];
    if(config.customs.length < 3) {
      config.customs.push({ title: '', start: '' });
      renderCustomSettings();
    }
  });

  window.removeCustom = function(index) {
    config.customs.splice(index, 1);
    renderCustomSettings();
  };

  document.getElementById('btn-save-settings').addEventListener('click', () => {
    const birth = document.getElementById('input-birth').value;
    const lifeAge = document.getElementById('input-life').value;
    
    if(!birth || !lifeAge) {
      alert('生年月日と目標年齢は必須です。'); return;
    }

    const customCards = document.querySelectorAll('.custom-item-card');
    const newCustoms = [];
    customCards.forEach(card => {
      const inputs = card.querySelectorAll('input');
      if(inputs[0].value && inputs[1].value) {
        newCustoms.push({ title: inputs[0].value, start: inputs[1].value });
      }
    });

    config = { birth, lifeAge, customs: newCustoms };
    localStorage.setItem('lifeTrackerConfig', JSON.stringify(config));
    
    // ホーム(Life)に戻して描画再開
    tabs[0].click();
    startRenderLoop();
  });

  // 起動
  init();
});
