document.addEventListener('DOMContentLoaded', () => {
  // ★修正: データが空(null)の場合でもクラッシュしないよう初期構造を持たせる
  let config = JSON.parse(localStorage.getItem('lifeTrackerConfig')) || { birth: '', lifeAge: 30, customs: [] };
  let flow = []; 
  let currentIndex = 0;
  let animationFrameId = null;

  const swipeWrapper = document.getElementById('swipe-wrapper');
  const tabs = document.querySelectorAll('.tab-item');
  const setupOverlay = document.getElementById('setup-overlay');

  const colors = {
    life: ['#FF453A', '#FF9F0A'],
    born: ['#30D158', '#34C759'],
    custom: ['#BF5AF2', '#FF375F']
  };

  // --- 初期化 ---
  function init() {
    injectSVGDefs();
    if (!config.birth) {
      setupOverlay.style.display = 'flex';
      initDatePicker('picker-birth', null);
    } else {
      setupOverlay.style.display = 'none';
      buildDOMFlow();
      populateSettings();
      startRenderLoop();
    }
  }

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

  // --- 画面構築（カルーセルロジック） ---
  function buildDOMFlow() {
    const viewLife = document.getElementById('view-life');
    const viewBorn = document.getElementById('view-born');
    const viewSettings = document.getElementById('view-settings');
    const viewCustomEmpty = document.getElementById('view-custom-empty');
    
    document.querySelectorAll('.custom-dynamic-view').forEach(el => el.remove());

    flow = [];
    swipeWrapper.appendChild(viewLife);
    flow.push({ id: 'view-life', tab: 'view-life' });

    swipeWrapper.appendChild(viewBorn);
    flow.push({ id: 'view-born', tab: 'view-born' });

    // ★ null チェックを強化
    const customs = config.customs || [];

    if (customs.length === 0) {
      swipeWrapper.appendChild(viewCustomEmpty);
      viewCustomEmpty.style.display = 'flex';
      flow.push({ id: 'view-custom-empty', tab: 'view-custom' });
    } else {
      viewCustomEmpty.style.display = 'none';
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

    swipeWrapper.appendChild(viewSettings);
    flow.push({ id: 'view-settings', tab: 'view-settings' });

    updateCarousel();
    updateIndicators();
  }

  function updateCarousel() {
    if(currentIndex < 0) currentIndex = 0;
    if(currentIndex >= flow.length) currentIndex = flow.length - 1;
    
    swipeWrapper.style.transform = `translateX(-${currentIndex * 100}vw)`;
    
    const activeTabTarget = flow[currentIndex].tab;
    tabs.forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-tab') === activeTabTarget);
    });

    const indContainer = document.getElementById('custom-indicators');
    if (activeTabTarget === 'view-custom' && config.customs && config.customs.length > 1) {
      indContainer.classList.add('show');
      Array.from(indContainer.children).forEach((dot, i) => {
        dot.className = `indicator-dot ${i === flow[currentIndex].index ? 'active' : ''}`;
      });
    } else {
      indContainer.classList.remove('show');
    }
  }

  function updateIndicators() {
    const indContainer = document.getElementById('custom-indicators');
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
  
  document.getElementById('main-content').addEventListener('touchstart', e => {
    if (e.target.closest('select') || e.target.closest('input') || e.target.closest('button')) return;
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, {passive: true});

  document.getElementById('main-content').addEventListener('touchend', e => {
    if (e.target.closest('select') || e.target.closest('input') || e.target.closest('button')) return;
    let touchEndX = e.changedTouches[0].screenX;
    let touchEndY = e.changedTouches[0].screenY;
    let dx = touchEndX - touchStartX;
    let dy = touchEndY - touchStartY;
    
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0 && currentIndex < flow.length - 1) {
        currentIndex++; 
      } else if (dx > 0 && currentIndex > 0) {
        currentIndex--; 
      }
      updateCarousel();
    }
  }, {passive: true});

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
    
    let from = new Date(startStr);
    let to = new Date(endStr);
    
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return { years: '-', days: '-', hours: '-', minutes: '-', seconds: '-', progress: 0 };
    }
    
    if (isCountdown ? (from > to) : (from > to)) {
      return { years: 0, days: 0, hours: 0, minutes: 0, seconds: 0, progress: 1 };
    }

    let years = to.getFullYear() - from.getFullYear();
    let tempDate = new Date(from);
    tempDate.setFullYear(from.getFullYear() + years);

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
          <svg class="circle-svg" viewBox="0 0 100 100">
            <circle class="circle-bg" cx="50" cy="50" r="45"></circle>
            <circle class="circle-progress" cx="50" cy="50" r="45" stroke="url(#grad-${colorType})"></circle
