document.addEventListener('DOMContentLoaded', function() {
  // ★修正: 壊れたデータでも絶対にアプリを殺さない安全なロード処理
  let config = null;
  try {
    const rawData = localStorage.getItem('lifeTrackerConfig');
    if (rawData) {
      config = JSON.parse(rawData);
    }
  } catch (e) {
    console.warn("Save data corrupted. Resetting...");
    config = null;
  }
  if (!config) config = { birth: '', lifeAge: 30, customs: [] };
  if (!config.customs) config.customs = [];

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

  function init() {
    injectSVGDefs();
    injectSavingOverlay();
    
    if (!config.birth || config.birth === '') {
      setupOverlay.style.display = 'flex';
      initDatePicker('picker-birth', null);
      initLifeStepper();
    } else {
      setupOverlay.style.display = 'none';
      startMainUI();
    }
  }

  function startMainUI() {
    buildDOMFlow();
    populateSettings();
    updateCarousel();
    startRenderLoop();
  }

  function injectSVGDefs() {
    if(document.getElementById('svg-defs-container')) return;
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.id = 'svg-defs-container';
    svg.style.width = '0'; svg.style.height = '0'; svg.style.position = 'absolute';
    let defs = document.createElementNS(svgNS, "defs");
    Object.keys(colors).forEach(function(key) {
      let grad = document.createElementNS(svgNS, "linearGradient");
      grad.setAttribute("id", 'grad-' + key);
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

  function injectSavingOverlay() {
    if(document.getElementById('saving-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'saving-overlay';
    overlay.className = 'saving-overlay';
    overlay.innerHTML = '<div class="saving-box"><div class="saving-spinner" id="saving-spinner"></div><div class="saving-check" id="saving-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div class="saving-text" id="saving-text">保存中...</div></div>';
    document.body.appendChild(overlay);
  }

  function buildDOMFlow() {
    if(!swipeWrapper) return;
    const viewLife = document.getElementById('view-life');
    const viewBorn = document.getElementById('view-born');
    const viewSettings = document.getElementById('view-settings');
    const viewCustomEmpty = document.getElementById('view-custom-empty');
    
    document.querySelectorAll('.custom-dynamic-view').forEach(function(el) { el.remove(); });
    flow = [];
    if(viewLife) { swipeWrapper.appendChild(viewLife); flow.push({ id: 'view-life', tab: 'view-life' }); }
    if(viewBorn) { swipeWrapper.appendChild(viewBorn); flow.push({ id: 'view-born', tab: 'view-born' }); }

    const customs = config.customs ? config.customs : [];
    if (customs.length === 0 && viewCustomEmpty) {
      swipeWrapper.appendChild(viewCustomEmpty);
      viewCustomEmpty.style.display = 'flex';
      flow.push({ id: 'view-custom-empty', tab: 'view-custom' });
    } else if (customs.length > 0) {
      if(viewCustomEmpty) viewCustomEmpty.style.display = 'none';
      customs.forEach(function(c, i) {
        const customId = 'view-custom-' + i;
        const section = document.createElement('section');
        section.className = 'view-section custom-dynamic-view';
        section.id = customId;
        section.innerHTML = '<h1 class="view-title">' + (c.title ? c.title : '名称未設定') + '</h1><div class="timer-display" id="timer-' + customId + '"></div>';
        swipeWrapper.appendChild(section);
        flow.push({ id: customId, tab: 'view-custom', data: c, index: i });
      });
    }

    if(viewSettings) { swipeWrapper.appendChild(viewSettings); flow.push({ id: 'view-settings', tab: 'view-settings' }); }
    updateIndicators();
  }

  function updateCarousel() {
    if(flow.length === 0 || !swipeWrapper) return;
    
    document.querySelectorAll('.swipe-content').forEach(function(el) {
      el.style.transform = 'translateX(0)';
    });

    if(currentIndex < 0) currentIndex = 0;
    if(currentIndex >= flow.length) currentIndex = flow.length - 1;
    swipeWrapper.style.transform = 'translateX(-' + (currentIndex * 100) + 'vw)';
    
    const activeTabTarget = flow[currentIndex].tab;
    tabs.forEach(function(t) {
      t.classList.toggle('active', t.getAttribute('data-tab') === activeTabTarget);
    });

    const indContainer = document.getElementById('custom-indicators');
    if(indContainer) {
      if (activeTabTarget === 'view-custom' && config.customs && config.customs.length > 1) {
        indContainer.classList.add('show');
        Array.from(indContainer.children).forEach(function(dot, i) {
          dot.className = 'indicator-dot ' + (i === flow[currentIndex].index ? 'active' : '');
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
      config.customs.forEach(function() {
        let dot = document.createElement('div');
        dot.className = 'indicator-dot';
        indContainer.appendChild(dot);
      });
    }
  }

  let touchStartX = 0, touchStartY = 0;
  const mainContent = document.getElementById('main-content');

  document.addEventListener('touchstart', function(e) {
    if (!e.target.closest('.swipe-item-container')) {
      document.querySelectorAll('.swipe-content').forEach(function(el) {
        el.style.transform = 'translateX(0)';
      });
    }
  }, {passive: true});

  if(mainContent) {
    mainContent.addEventListener('touchstart', function(e) {
      if (e.target.closest('.swipe-content') || e.target.closest('button') || e.target.closest('.custom-date-options')) return;
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, {passive: true});
    mainContent.addEventListener('touchend', function(e) {
      if (e.target.closest('.swipe-content') || e.target.closest('button') || e.target.closest('.custom-date-options')) return;
      let dx = e.changedTouches[0].screenX - touchStartX;
      let dy = e.changedTouches[0].screenY - touchStartY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
        if (dx < 0 && currentIndex < flow.length - 1) currentIndex++; 
        else if (dx > 0 && currentIndex > 0) currentIndex--; 
        updateCarousel();
      }
    }, {passive: true});
  }

  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      const targetIndex = flow.findIndex(function(f) { return f.tab === tab.getAttribute('data-tab'); });
      if (targetIndex !== -1) { currentIndex = targetIndex; updateCarousel(); }
    });
  });

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
    const birth = new Date(config.birth); const end = new Date(birth);
    end.setFullYear(birth.getFullYear() + Number(config.lifeAge ? config.lifeAge : 30));
    return calculateDiff(now, end, true);
  }

  function startRenderLoop() {
    if(animationFrameId) cancelAnimationFrame(animationFrameId);
    function render() {
      const now = new Date();
      [currentIndex - 1, currentIndex, currentIndex + 1].forEach(function(idx) {
        if(idx >= 0 && idx < flow.length) {
          const view = flow[idx];
          if (view.id === 'view-life') renderTimer('timer-life', calculateLife(now), 'life');
          else if (view.id === 'view-born') renderTimer('timer-born', calculateDiff(config.birth, now, false), 'born');
          else if (view.id.startsWith('view-custom-') && view.id !== 'view-custom-empty') renderTimer('timer-' + view.id, calculateDiff(view.data.start, now, false), 'custom');
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
      container.innerHTML = '<div class="circle-wrapper"><svg class="circle-svg" viewBox="0 0 100 100"><circle class="circle-bg" cx="50" cy="50" r="45"></circle><circle class="circle-progress" cx="50" cy="50" r="45" stroke="url(#grad-' + colorType + ')"></circle></svg><div class="circle-content"><div class="circle-value" id="' + containerId + '-years">-</div><div class="circle-unit">年</div></div></div><div class="sub-timer-grid"><div class="sub-timer-item"><span class="sub-value" id="' + containerId + '-days">-</span><span class="sub-unit">日</span></div><div class="sub-timer-item"><span class="sub-value" id="' + containerId + '-hours">-</span><span class="sub-unit">時間</span></div><div class="sub-timer-item"><span class="sub-value" id="' + containerId + '-mins">-</span><span class="sub-unit">分</span></div><div class="sub-timer-item"><span class="sub-value" id="' + containerId + '-secs">-</span><span class="sub-unit">秒</span></div></div>';
    }
    document.getElementById(containerId + '-years').textContent = data.years;
    document.getElementById(containerId + '-days').textContent = data.days;
    document.getElementById(containerId + '-hours').textContent = data.hours !== '-' ? String(data.hours).padStart(2, '0') : '-';
    document.getElementById(containerId + '-mins').textContent = data.minutes !== '-' ? String(data.minutes).padStart(2, '0') : '-';
    document.getElementById(containerId + '-secs').textContent = data.seconds !== '-' ? String(data.seconds).padStart(2, '0') : '-';
    const circle = container.querySelector('.circle-progress');
    const circumference = 2 * Math.PI * 45;
    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = data.years === '-' ? circumference : circumference - (data.progress * circumference);
  }

  function initDatePicker(containerId, initialDateStr) {
    const container = document.getElementById(containerId);
    if(!container) return;
    
    let initY = '', initM = '', initD = '';
    if (initialDateStr) {
      const d = new Date(initialDateStr);
      if(!isNaN(d.getTime())){ initY = d.getFullYear(); initM = d.getMonth() + 1; initD = d.getDate(); }
    }
    const currentYear = new Date().getFullYear();

    function createDropdown(type, min, max, initVal, unit) {
      let optionsHtml = '<div class="custom-date-option ' + (!initVal ? 'selected' : '') + '" data-value="">--</div>';
      if(type === 'y') {
        for(let y = max; y >= min; y--) optionsHtml += '<div class="custom-date-option ' + (y === parseInt(initVal) ? 'selected' : '') + '" data-value="' + y + '">' + y + '</div>';
      } else {
        for(let i = min; i <= max; i++) optionsHtml += '<div class="custom-date-option ' + (i === parseInt(initVal) ? 'selected' : '') + '" data-value="' + i + '">' + i + '</div>';
      }
      return '<div class="custom-date-picker-wrap" id="' + containerId + '-' + type + '-wrap"><div class="custom-date-display" id="' + containerId + '-' + type + '-display">' + (initVal ? initVal : '--') + '</div><span class="custom-date-unit">' + unit + '</span><div class="custom-date-options" id="' + containerId + '-' + type + '-options">' + optionsHtml + '</div><input type="hidden" id="' + containerId + '-' + type + '" value="' + (initVal ? initVal : '') + '"></div>';
    }

    container.innerHTML = createDropdown('y', currentYear - 100, currentYear, initY, '年') + createDropdown('m', 1, 12, initM, '月') + createDropdown('d', 1, 31, initD, '日');

    ['y', 'm', 'd'].forEach(function(type) {
      const wrap = document.getElementById(containerId + '-' + type + '-wrap');
      const display = document.getElementById(containerId + '-' + type + '-display');
      const optionsBox = document.getElementById(containerId + '-' + type + '-options');
      const hiddenInput = document.getElementById(containerId + '-' + type);

      display.addEventListener('click', function(e) {
        e.stopPropagation();
        document.querySelectorAll('.custom-date-options.show').forEach(function(el) {
          if(el !== optionsBox) {
            el.classList.remove('show');
            if(el.previousElementSibling && el.previousElementSibling.previousElementSibling) {
              el.previousElementSibling.previousElementSibling.classList.remove('active');
            }
            if(el.parentElement) el.parentElement.style.zIndex = '1';
          }
        });
        const isOpen = optionsBox.classList.contains('show');
        if(isOpen) {
          optionsBox.classList.remove('show');
          display.classList.remove('active');
          wrap.style.zIndex = '1';
        } else {
          optionsBox.classList.add('show');
          display.classList.add('active');
          wrap.style.zIndex = '100'; 
          const selected = optionsBox.querySelector('.selected');
          if(selected) optionsBox.scrollTop = selected.offsetTop - optionsBox.clientHeight / 2;
        }
      });

      optionsBox.addEventListener('click', function(e) {
        e.stopPropagation();
        if(e.target.classList.contains('custom-date-option')) {
          const val = e.target.getAttribute('data-value');
          display.textContent = val ? val : '--';
          hiddenInput.value = val;
          optionsBox.querySelectorAll('.custom-date-option').forEach(function(opt) { opt.classList.remove('selected'); });
          e.target.classList.add('selected');
          optionsBox.classList.remove('show');
          display.classList.remove('active');
          wrap.style.zIndex = '1';
          if(type === 'y' || type === 'm') adjustDays();
          container.classList.remove('has-error');
        }
      });
    });

    function adjustDays() {
      const yVal = document.getElementById(containerId + '-y').value;
      const mVal = document.getElementById(containerId + '-m').value;
      const dHidden = document.getElementById(containerId + '-d');
      const dDisplay = document.getElementById(containerId + '-d-display');
      const dOptions = document.getElementById(containerId + '-d-options');

      if(!yVal || !mVal) return;
      const daysInMonth = new Date(parseInt(yVal), parseInt(mVal), 0).getDate();
      let currentDay = parseInt(dHidden.value);
      if(currentDay > daysInMonth) { currentDay = ''; dHidden.value = ''; dDisplay.textContent = '--'; }

      let optionsHtml = '<div class="custom-date-option ' + (!currentDay ? 'selected' : '') + '" data-value="">--</div>';
      for(let d = 1; d <= daysInMonth; d++) optionsHtml += '<div class="custom-date-option ' + (d === currentDay ? 'selected' : '') + '" data-value="' + d + '">' + d + '</div>';
      dOptions.innerHTML = optionsHtml;
    }
  }

  document.addEventListener('click', function() {
    document.querySelectorAll('.custom-date-options.show').forEach(function(el) {
      el.classList.remove('show');
      if(el.previousElementSibling && el.previousElementSibling.previousElementSibling) {
        el.previousElementSibling.previousElementSibling.classList.remove('active');
      }
      if(el.parentElement) el.parentElement.style.zIndex = '1';
    });
  });

  // ★修正: パースエラーを招く ?. を完全に排除し、安全に値を取得
  function getPickerDate(containerId) {
    const yEl = document.getElementById(containerId + '-y');
    const mEl = document.getElementById(containerId + '-m');
    const dEl = document.getElementById(containerId + '-d');
    if(!yEl || !mEl || !dEl) return null;
    const y = yEl.value; const m = mEl.value; const d = dEl.value;
    if(!y || !m || !d) return null;
    return y + '-' + String(m).padStart(2,'0') + '-' + String(d).padStart(2,'0');
  }

  function initLifeStepper() {
    const wrap = document.getElementById('input-life-wrap');
    if(!wrap) return;
    wrap.innerHTML = '<div class="life-setting-group"><div class="input-suffix-wrap"><input type="number" id="input-life" class="input-field" value="' + (config.lifeAge ? config.lifeAge : 30) + '" readonly><span class="suffix">歳まで</span></div><div class="stepper-controls"><button type="button" class="stepper-btn" id="btn-life-minus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="5" y1="12" x2="19" y2="12" stroke-width="2" stroke-linecap="round"/></svg></button><button type="button" class="stepper-btn" id="btn-life-plus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="19" stroke-width="2" stroke-linecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke-width="2" stroke-linecap="round"/></svg></button></div></div>';
    
    const inputLife = document.getElementById('input-life');
    document.getElementById('btn-life-minus').addEventListener('click', function() {
      let val = parseInt(inputLife.value);
      if(isNaN(val)) val = 30;
      if(val > 1) inputLife.value = val - 1;
    });
    document.getElementById('btn-life-plus').addEventListener('click', function() {
      let val = parseInt(inputLife.value);
      if(isNaN(val)) val = 30;
      if(val < 150) inputLife.value = val + 1;
    });
  }

  function populateSettings() {
    initDatePicker('picker-birth', config.birth);
    initLifeStepper();
    renderCustomSettings();
  }

  function renderCustomSettings() {
    const list = document.getElementById('custom-settings-list');
    if(!list) return;
    list.innerHTML = '';
    const customs = config.customs ? config.customs : [];
    customs.forEach(function(c, index) {
      const pId = 'picker-custom-' + index;
      const container = document.createElement('div');
      container.className = 'swipe-item-container';
      container.id = 'swipe-item-' + index; 
      
      container.innerHTML = '<div class="swipe-actions-bg"><button class="swipe-delete-btn" onclick="removeCustom(' + index + ')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>削除</button></div><div class="swipe-content" id="swipe-content-' + index + '" style="transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);"><div class="custom-item-header" style="margin-bottom: 20px;"><div style="flex: 1;"><label class="custom-input-label">タイトル</label><input type="text" class="input-field" placeholder="例: 禁煙" value="' + (c.title ? c.title : '') + '" id="custom-title-' + index + '" style="width: 100%;"></div></div><div><label class="custom-input-label">開始した日付を設定</label><div class="date-picker-group" id="' + pId + '"></div></div><div class="error-msg" id="error-custom-' + index + '">未来の日付は選択できません</div></div>';
      
      list.appendChild(container);
      initDatePicker(pId, c.start);

      const swipeContent = container.querySelector('.swipe-content');
      let startX = 0, currentX = 0;
      
      swipeContent.addEventListener('touchstart', function(e) {
        if(e.target.closest('.custom-date-options')) return;
        document.querySelectorAll('.swipe-content').forEach(function(el) {
          if (el !== swipeContent) el.style.transform = 'translateX(0)';
        });
        if(document.activeElement === container.querySelector('#custom-title-' + index)) return;
        swipeContent.style.transition = 'none'; 
        startX = e.touches[0].clientX;
      }, {passive: true});

      swipeContent.addEventListener('touchmove', function(e) {
        if(document.activeElement === container.querySelector('#custom-title-' + index)) return;
        if(e.target.closest('.custom-date-options')) return;
        currentX = e.touches[0].clientX - startX;
        if(currentX > 0) currentX = 0; 
        if(currentX < -100) currentX = -100; 
        swipeContent.style.transform = 'translateX(' + currentX + 'px)';
      }, {passive: true});

      swipeContent.addEventListener('touchend', function() {
        if(document.activeElement === container.querySelector('#custom-title-' + index)) return;
        if(currentX === 0) return; 

        swipeContent.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
        if(currentX < -25) {
          swipeContent.style.transform = 'translateX(-80px)';
        } else {
          swipeContent.style.transform = 'translateX(0)'; 
        }
        currentX = 0; 
      }, {passive: true});
    });
    
    const addBtn = document.getElementById('btn-add-custom');
    if(addBtn) addBtn.style.display = customs.length >= 3 ? 'none' : 'block';
  }

  if(document.getElementById('btn-add-custom')) {
    document.getElementById('btn-add-custom').addEventListener('click', function() {
      if(!config.customs) config.customs = [];
      if(config.customs.length < 3) { config.customs.push({ title: '', start: null }); renderCustomSettings(); }
    });
  }

  window.removeCustom = function(index) {
    const itemContainer = document.getElementById('swipe-item-' + index);
    if (itemContainer) {
      itemContainer.style.transition = 'opacity 0.55s ease, transform 0.55s cubic-bezier(0.32, 0.72, 0, 1)';
      itemContainer.style.opacity = '0';
      itemContainer.style.transform = 'scale(0.98) translateX(-100%)';
      
      setTimeout(function() {
        const h = itemContainer.offsetHeight;
        const mb = window.getComputedStyle(itemContainer).marginBottom;
        
        itemContainer.style.transition = 'none';
        itemContainer.style.height = h + 'px';
        itemContainer.style.marginBottom = mb;
        itemContainer.style.padding = '0px';
        itemContainer.style.border = 'none';
        itemContainer.style.overflow = 'hidden';
        itemContainer.innerHTML = ''; 
        
        itemContainer.style.willChange = 'height, margin-bottom';
        
        requestAnimationFrame(function() {
          itemContainer.style.transition = 'height 0.4s cubic-bezier(0.32, 0.72, 0, 1), margin-bottom 0.4s cubic-bezier(0.32, 0.72, 0, 1)';
          itemContainer.style.height = '0px';
          itemContainer.style.marginBottom = '0px';
        });
      }, 400);

      setTimeout(function() {
        executeRemoveCustom(index);
      }, 800);
    } else {
      executeRemoveCustom(index);
    }
  };

  // ★修正: パースエラーを招く ?. を完全に排除
  function executeRemoveCustom(index) {
    const customsCount = (config.customs && config.customs.length) ? config.customs.length : 0;
    for(let i=0; i<customsCount; i++) {
      const tInput = document.getElementById('custom-title-' + i);
      if(tInput) config.customs[i].title = tInput.value;
      const cStr = getPickerDate('picker-custom-' + i);
      if(cStr) config.customs[i].start = cStr;
    }
    config.customs.splice(index, 1);
    localStorage.setItem('lifeTrackerConfig', JSON.stringify(config));
    renderCustomSettings();
  }

  function isFutureDate(dateStr) {
    if(!dateStr) return false;
    const selected = new Date(dateStr);
    const now = new Date(); now.setHours(23, 59, 59, 999);
    return selected > now;
  }

  // ★修正: どんなスマホでも確実にボタンが押せる強固なイベントリスナー
  if (btnStartSetup) {
    btnStartSetup.addEventListener('click', function(e) {
      e.preventDefault();
      setupOverlay.style.opacity = '0';
      setTimeout(function() {
        setupOverlay.style.display = 'none';
        startMainUI();
        const targetIndex = flow.findIndex(function(f) { return f.tab === 'view-settings'; });
        if(targetIndex !== -1) { currentIndex = targetIndex; updateCarousel(); }
      }, 300);
    });
  }

  if (document.getElementById('btn-save-settings')) {
    document.getElementById('btn-save-settings').addEventListener('click', function(e) {
      e.preventDefault();
      let hasError = false;
      const birthStr = getPickerDate('picker-birth');
      if(birthStr && isFutureDate(birthStr)) { document.getElementById('picker-birth').classList.add('has-error'); hasError = true; }
      if(!birthStr) { alert('生まれた日付を選択してください。'); return; }
      const inputLife = document.getElementById('input-life');
      const lifeAge = inputLife ? inputLife.value : 30;

      const newCustoms = [];
      const customsCount = (config.customs && config.customs.length) ? config.customs.length : 0;
      for(let i=0; i<customsCount; i++) {
        const tInput = document.getElementById('custom-title-' + i);
        const tVal = tInput ? tInput.value : '';
        const cStr = getPickerDate('picker-custom-' + i);
        if(cStr && isFutureDate(cStr)) { document.getElementById('picker-custom-' + i).classList.add('has-error'); hasError = true; }
        else if (cStr) { newCustoms.push({ title: tVal, start: cStr }); }
      }
      if (hasError) return; 

      config = { birth: birthStr, lifeAge: lifeAge, customs: newCustoms };
      localStorage.setItem('lifeTrackerConfig', JSON.stringify(config));
      
      const overlay = document.getElementById('saving-overlay');
      const spinner = document.getElementById('saving-spinner');
      const check = document.getElementById('saving-check');
      const text = document.getElementById('saving-text');
      
      overlay.classList.add('active');
      spinner.style.display = 'block';
      check.style.display = 'none';
      text.textContent = '保存中...';

      setTimeout(function() {
        spinner.style.display = 'none';
        check.style.display = 'flex';
        text.textContent = '保存完了';
        
        setTimeout(function() {
          overlay.classList.remove('active');
          buildDOMFlow();
          const targetIndex = flow.findIndex(function(f) { return f.tab === 'view-custom'; });
          currentIndex = targetIndex !== -1 ? targetIndex : 0; 
          updateCarousel();
          startRenderLoop();
        }, 1000);
      }, 800);
    });
  }
  
  init();
});
