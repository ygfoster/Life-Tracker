document.addEventListener('DOMContentLoaded', () => {
  let config = JSON.parse(localStorage.getItem('lifeTrackerConfig'));
  if (!config) {
    config = { birth: '', lifeAge: 30, customs: [] };
  }
  if (!config.customs) {
    config.customs = [];
  }

  let flow = []; 
  let currentIndex = 0;
  let animationFrameId = null;

  const swipeWrapper = document.getElementById('swipe-wrapper');
  const tabs = document.querySelectorAll('.tab-item');
  const setupOverlay = document.getElementById('setup-overlay');
  const btnStartSetup = document.getElementById('btn-start-setup');

  const colors = {
    life: ['#FF453A', '#FF9F0A'],
    born: ['#30D158', '#34C759'],
    custom: ['#BF5AF2', '#FF375F']
  };

  // --- 初期化 ---
  function init() {
    injectSVGDefs();
    if (!config.birth) {
      // 未設定ならオーバーレイ表示
      setupOverlay.style.display = 'flex';
      initDatePicker('picker-birth', null);
    } else {
      // 設定済みなら即座にメインUIを描画
      setupOverlay.style.display = 'none';
      startMainUI();
    }
  }

  // --- メインUIの起動 ---
  function startMainUI() {
    buildDOMFlow();
    populateSettings();
    updateCarousel();
    startRenderLoop();
  }

  function injectSVGDefs() {
    if(document.getElementById('svg-defs-container')) return; // 二重生成防止
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.id = 'svg-defs-container';
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

  // --- 画面構築 ---
  function buildDOMFlow() {
    if(!swipeWrapper) return;
    
    const viewLife = document.getElementById('view-life');
    const viewBorn = document.getElementById('view-born');
    const viewSettings = document.getElementById('view-settings');
    const viewCustomEmpty = document.getElementById('view-custom-empty');
    
    document.querySelectorAll('.custom-dynamic-view').forEach(el => el.remove());

    flow = [];
    if(viewLife) { swipeWrapper.appendChild(viewLife); flow.push({ id: 'view-life', tab: 'view-life' }); }
    if(viewBorn) { swipeWrapper.appendChild(viewBorn); flow.push({ id: 'view-born', tab: 'view-born' }); }

    const customs = config.customs || [];
    if (customs.length === 0 && viewCustomEmpty) {
      swipeWrapper.appendChild(viewCustomEmpty);
      viewCustomEmpty.style.display = 'flex';
      flow.push({ id: 'view-custom-empty', tab: 'view-custom' });
    } else if (customs.length > 0) {
      if(viewCustomEmpty) viewCustomEmpty.style.display = 'none';
      customs.forEach((c, i) => {
        const customId = `view-custom-${i}`;
        const section = document.createElement('section');
        section.className = 'view-section custom-dynamic-view';
        section.id = customId;
        section.innerHTML = `
          <h1 class="view-title">${c.title || '名称未設定'}</h1>
          <div class="timer-display" id="timer-${customId}"></div>
        `;
        swipeWrapper.appendChild(section);
        flow.push({ id: customId, tab: 'view-custom', data: c, index: i });
      });
    }

    if(viewSettings) { swipeWrapper.appendChild(viewSettings); flow.push({ id: 'view-settings', tab: 'view-settings' }); }

    updateIndicators();
  }

  function updateCarousel() {
    if(flow.length === 0 || !swipeWrapper) return;
    if(currentIndex < 0) currentIndex = 0;
    if(currentIndex >= flow.length) currentIndex = flow.length - 1;
    
    swipeWrapper.style.transform = `translateX(-${currentIndex * 100}vw)`;
    
    const activeTabTarget = flow[currentIndex].tab;
    tabs.forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-tab') === activeTabTarget);
    });

    const indContainer = document.getElementById('custom-indicators');
    if(indContainer) {
      if (activeTabTarget === 'view-custom' && config.customs && config.customs.length > 1) {
        indContainer.classList.add('show');
        Array.from(indContainer.children).forEach((dot, i) => {
          dot.className = `indicator-dot ${i === flow[currentIndex].index ? 'active' : ''}`;
        });
      } else {
        indContainer.classList.remove('show');
      }
    }
  }

  function updateIndicators() {
    const indContainer = document.getElementById('custom-indicators');
    if(!indContainer) return;
    indContainer.innerHTML = '';
    if (config.customs && config.customs.length > 1) {
      config.customs.forEach(() => {
        let dot = document.createElement('div');
        dot.className = 'indicator-dot';
        indContainer.appendChild(dot);
      });
    }
  }

  // --- スワイプとタブ制御 ---
  let touchStartX = 0, touchStartY = 0;
  const mainContent = document.getElementById('main-content');
  
  if(mainContent) {
    mainContent.addEventListener('touchstart', e => {
      if (e.target.closest('select') || e.target.closest('input') || e.target.closest('button')) return;
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, {passive: true});

    mainContent.addEventListener('touchend', e => {
      if (e.target.closest('select') || e.target.closest('input') || e.target.closest('button')) return;
      let touchEndX = e.changedTouches[0].screenX;
      let touchEndY = e.changedTouches[0].screenY;
      let dx = touchEndX - touchStartX;
      let dy = touchEndY - touchStartY;
      
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
        if (dx < 0 && currentIndex < flow.length - 1) currentIndex++; 
        else if (dx > 0 && currentIndex > 0) currentIndex--; 
        updateCarousel();
      }
    }, {passive: true});
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');
      const targetIndex = flow.findIndex(f => f.tab === targetTab);
      if (targetIndex !== -1) {
        currentIndex = targetIndex;
        updateCarousel();
      }
    });
  });

  // --- 時間計算ロジック ---
  function calculateDiff(startStr, endStr, isCountdown) {
    if (!startStr || !endStr) return { years: '-', days: '-', hours: '-', minutes: '-', seconds: '-', progress: 0 };
    let from = new Date(startStr); let to = new Date(endStr);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) return { years: '-', days: '-', hours: '-', minutes: '-', seconds: '-', progress: 0 };
    if (isCountdown ? (from > to) : (from > to)) return { years: 0, days: 0, hours: 0, minutes: 0, seconds: 0, progress: 1 };

    let years = to.getFullYear() - from.getFullYear();
    let tempDate = new Date(from); tempDate.setFullYear(from.getFullYear() + years);
    if (to < tempDate) { years--; tempDate.setFullYear(from.getFullYear() + years); }

    let remMs = to - tempDate;
    let days = Math.floor(remMs / (1000 * 60 * 60 * 24));
    let hours = Math.floor((remMs / (1000 * 60 * 60)) % 24);
    let minutes = Math.floor((remMs / (1000 * 60)) % 60);
    let seconds = Math.floor((remMs / 1000) % 60);

    let yearStart = new Date(to.getFullYear(), from.getMonth(), from.getDate());
    if (to < yearStart) yearStart.setFullYear(yearStart.getFullYear() - 1);
    let yearEnd = new Date(yearStart); yearEnd.setFullYear(yearEnd.getFullYear() + 1);
    let progress = (to - yearStart) / (yearEnd - yearStart);
    if(isCountdown) progress = 1 - progress;

    return { years, days, hours, minutes, seconds, progress };
  }

  function calculateLife(now) {
    if(!config.birth) return calculateDiff(null, null, true);
    const birth = new Date(config.birth);
    const end = new Date(birth);
    end.setFullYear(birth.getFullYear() + Number(config.lifeAge || 30));
    return calculateDiff(now, end, true);
  }

  function startRenderLoop() {
    if(animationFrameId) cancelAnimationFrame(animationFrameId);
    function render() {
      const now = new Date();
      [currentIndex - 1, currentIndex, currentIndex + 1].forEach(idx => {
        if(idx >= 0 && idx < flow.length) {
          const view = flow[idx];
          if (view.id === 'view-life') renderTimer('timer-life', calculateLife(now), 'life');
          else if (view.id === 'view-born') renderTimer('timer-born', calculateDiff(config.birth, now, false), 'born');
          else if (view.id.startsWith('view-custom-') && view.id !== 'view-custom-empty') {
             renderTimer(`timer-${view.id}`, calculateDiff(view.data.start, now, false), 'custom');
          }
        }
      });
      animationFrameId = requestAnimationFrame(render);
    }
    render();
  }

  function renderTimer(containerId, data, colorType) {
    const container = document.getElementById(containerId);
    if(!container) return;
    
    if (!container.innerHTML) {
      container.innerHTML = `
        <div class="circle-wrapper">
          <svg class="circle-svg" viewBox="0 0 100 100"><circle class="circle-bg" cx="50" cy="50" r="45"></circle><circle class="circle-progress" cx="50" cy="50" r="45" stroke="url(#grad-${colorType})"></circle></svg>
          <div class="circle-content"><div class="circle-value" id="${containerId}-years">-</div><div class="circle-unit">年</div></div>
        </div>
        <div class="sub-timer-grid">
          <div class="sub-timer-item"><span class="sub-value" id="${containerId}-days">-</span><span class="sub-unit">日</span></div>
          <div class="sub-timer-item"><span class="sub-value" id="${containerId}-hours">-</span><span class="sub-unit">時間</span></div>
          <div class="sub-timer-item"><span class="sub-value" id="${containerId}-mins">-</span><span class="sub-unit">分</span></div>
          <div class="sub-timer-item"><span class="sub-value" id="${containerId}-secs">-</span><span class="sub-unit">秒</span></div>
        </div>
      `;
    }
    document.getElementById(`${containerId}-years`).textContent = data.years;
    document.getElementById(`${containerId}-days`).textContent = data.days;
    document.getElementById(`${containerId}-hours`).textContent = data.hours !== '-' ? String(data.hours).padStart(2, '0') : '-';
    document.getElementById(`${containerId}-mins`).textContent = data.minutes !== '-' ? String(data.minutes).padStart(2, '0') : '-';
    document.getElementById(`${containerId}-secs`).textContent = data.seconds !== '-' ? String(data.seconds).padStart(2, '0') : '-';

    const circle = container.querySelector('.circle-progress');
    const circumference = 2 * Math.PI * 45;
    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = data.years === '-' ? circumference : circumference - (data.progress * circumference);
  }

  // --- 設定画面コンポーネント ---
  function initDatePicker(containerId, initialDateStr) {
    const container = document.getElementById(containerId);
    if(!container) return;
    let initY = '', initM = '', initD = '';
    if (initialDateStr) {
      const d = new Date(initialDateStr);
      if(!isNaN(d.getTime())){ initY = d.getFullYear(); initM = d.getMonth() + 1; initD = d.getDate(); }
    }
    const currentYear = new Date().getFullYear();
    let html = `<div class="apple-select-wrap"><select class="apple-select" id="${containerId}-y"><option value="">--</option>`;
    for(let y = currentYear; y >= currentYear - 100; y--) html += `<option value="${y}" ${y === initY ? 'selected' : ''}>${y}</option>`;
    html += `</select><span class="unit-label">年</span></div><div class="apple-select-wrap"><select class="apple-select" id="${containerId}-m"><option value="">--</option>`;
    for(let m = 1; m <= 12; m++) html += `<option value="${m}" ${m === initM ? 'selected' : ''}>${m}</option>`;
    html += `</select><span class="unit-label">月</span></div><div class="apple-select-wrap"><select class="apple-select" id="${containerId}-d"><option value="">--</option>`;
    for(let d = 1; d <= 31; d++) html += `<option value="${d}" ${d === initD ? 'selected' : ''}>${d}</option>`;
    html += `</select><span class="unit-label">日</span></div>`;
    container.innerHTML = html;

    const ySel = document.getElementById(`${containerId}-y`);
    const mSel = document.getElementById(`${containerId}-m`);
    const dSel = document.getElementById(`${containerId}-d`);
    
    function adjustDays() {
      const y = parseInt(ySel.value), m = parseInt(mSel.value);
      if(!y || !m) return;
      const daysInMonth = new Date(y, m, 0).getDate();
      const currentDay = parseInt(dSel.value);
      let dHtml = `<option value="">--</option>`;
      for(let d = 1; d <= daysInMonth; d++) dHtml += `<option value="${d}" ${d === currentDay ? 'selected' : ''}>${d}</option>`;
      dSel.innerHTML = dHtml;
      document.getElementById(containerId).classList.remove('has-error');
    }
    ySel.addEventListener('change', adjustDays);
    mSel.addEventListener('change', adjustDays);
    dSel.addEventListener('change', () => document.getElementById(containerId).classList.remove('has-error'));
  }

  function getPickerDate(containerId) {
    const y = document.getElementById(`${containerId}-y`)?.value;
    const m = document.getElementById(`${containerId}-m`)?.value;
    const d = document.getElementById(`${containerId}-d`)?.value;
    if(!y || !m || !d) return null;
    return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }

  function populateSettings() {
    initDatePicker('picker-birth', config.birth);
    if(document.getElementById('input-life')) document.getElementById('input-life').value = config.lifeAge || 30;
    renderCustomSettings();
  }

  function renderCustomSettings() {
    const list = document.getElementById('custom-settings-list');
    if(!list) return;
    list.innerHTML = '';
    const customs = config.customs || [];
    customs.forEach((c, index) => {
      const pId = `picker-custom-${index}`;
      const card = document.createElement('div');
      card.className = 'custom-item-card';
      card.innerHTML = `
        <div class="custom-item-header">
          <input type="text" class="input-field" placeholder="タイトル (例: 禁煙)" value="${c.title}" id="custom-title-${index}" style="margin-right: 12px;">
          <button class="btn-icon-danger" onclick="removeCustom(${index})" title="削除">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>
        </div>
        <div class="date-picker-group" id="${pId}"></div>
        <div class="error-msg" id="error-custom-${index}">未来の日付は選択できません</div>
      `;
      list.appendChild(card);
      initDatePicker(pId, c.start);
    });
    const addBtn = document.getElementById('btn-add-custom');
    if(addBtn) addBtn.style.display = customs.length >= 3 ? 'none' : 'block';
  }

  const btnAddCustom = document.getElementById('btn-add-custom');
  if(btnAddCustom) {
    btnAddCustom.addEventListener('click', () => {
      if(!config.customs) config.customs = [];
      if(config.customs.length < 3) {
        config.customs.push({ title: '', start: null });
        renderCustomSettings();
      }
    });
  }

  window.removeCustom = function(index) {
    config.customs.splice(index, 1);
    renderCustomSettings();
  };

  function isFutureDate(dateStr) {
    if(!dateStr) return false;
    const selected = new Date(dateStr);
    const now = new Date(); now.setHours(23, 59, 59, 999);
    return selected > now;
  }

  // ★ 堅牢なイベントリスナー（設定をはじめるボタン）
  if (btnStartSetup) {
    btnStartSetup.addEventListener('click', () => {
      setupOverlay.style.opacity = '0';
      setTimeout(() => {
        setupOverlay.style.display = 'none';
        startMainUI();
        
        const targetIndex = flow.findIndex(f => f.tab === 'view-settings');
        if(targetIndex !== -1) {
          currentIndex = targetIndex;
          updateCarousel();
        }
      }, 300); // フェードアウトアニメーション待ち
    });
  }

  // ★ 堅牢なイベントリスナー（保存して反映ボタン）
  const btnSaveSettings = document.getElementById('btn-save-settings');
  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', () => {
      let hasError = false;
      const birthStr = getPickerDate('picker-birth');
      if(birthStr && isFutureDate(birthStr)) {
        document.getElementById('picker-birth').classList.add('has-error');
        hasError = true;
      }
      if(!birthStr) { alert('生まれた日付を選択してください。'); return; }

      const lifeAge = document.getElementById('input-life').value;
      if(!lifeAge) { alert('寿命を設定してください。'); return; }

      const newCustoms = [];
      const customsCount = config.customs?.length || 0;
      for(let i=0; i<customsCount; i++) {
        const tInput = document.getElementById(`custom-title-${i}`);
        const tVal = tInput ? tInput.value : '';
        const cStr = getPickerDate(`picker-custom-${i}`);
        
        if(cStr && isFutureDate(cStr)) {
          document.getElementById(`picker-custom-${i}`).classList.add('has-error');
          hasError = true;
        } else if (cStr) {
          newCustoms.push({ title: tVal, start: cStr });
        }
      }

      if (hasError) return; 

      config = { birth: birthStr, lifeAge: lifeAge, customs: newCustoms };
      localStorage.setItem('lifeTrackerConfig', JSON.stringify(config));
      
      buildDOMFlow();
      currentIndex = 0; // Lifeタブへ強制帰還
      updateCarousel();
      startRenderLoop();
    });
  }

  // 起動
  init();
});
