document.addEventListener('DOMContentLoaded', function() {
  function padZero(num) { var s = String(num); return s.length < 2 ? '0' + s : s; }
  function getClosest(elem, selector) {
    while (elem && elem !== document) {
      if (elem.matches && elem.matches(selector)) return elem;
      if (elem.webkitMatchesSelector && elem.webkitMatchesSelector(selector)) return elem;
      elem = elem.parentNode;
    }
    return null;
  }
  function removeEl(el) { if (el && el.parentNode) { el.parentNode.removeChild(el); } }

  var config = null;
  try {
    var rawData = localStorage.getItem('lifeTrackerConfig');
    if (rawData) config = JSON.parse(rawData);
  } catch (e) {
    config = null;
  }
  if (!config) config = { birth: '', lifeAge: 30, customs: [] };
  if (!config.customs) config.customs = [];

  var flow = [];
  var currentIndex = 0;
  var animationFrameId = null;

  var swipeWrapper = document.getElementById('swipe-wrapper');
  var tabs = document.querySelectorAll('.tab-item');
  var setupOverlay = document.getElementById('setup-overlay');
  var btnStartSetup = document.getElementById('btn-start-setup');

  var colors = { life: ['#FF453A', '#FF9F0A'], born: ['#30D158', '#34C759'], custom: ['#BF5AF2', '#FF375F'] };

  function init() {
    injectSVGDefs();
    injectSavingOverlay();
    if (!config.birth || config.birth === '') {
      if(setupOverlay) setupOverlay.style.display = 'flex';
      initDatePicker('picker-birth', null);
      initLifeStepper();
    } else {
      if(setupOverlay) setupOverlay.style.display = 'none';
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
    var svgNS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgNS, "svg");
    svg.id = 'svg-defs-container';
    svg.style.width = '0'; svg.style.height = '0'; svg.style.position = 'absolute';
    var defs = document.createElementNS(svgNS, "defs");
    var keys = Object.keys(colors);
    for(var k=0; k<keys.length; k++) {
      var key = keys[k];
      var grad = document.createElementNS(svgNS, "linearGradient");
      grad.setAttribute("id", 'grad-' + key);
      grad.setAttribute("x1", "0%"); grad.setAttribute("y1", "0%");
      grad.setAttribute("x2", "100%"); grad.setAttribute("y2", "100%");
      var stop1 = document.createElementNS(svgNS, "stop");
      stop1.setAttribute("offset", "0%"); stop1.setAttribute("stop-color", colors[key][0]);
      var stop2 = document.createElementNS(svgNS, "stop");
      stop2.setAttribute("offset", "100%"); stop2.setAttribute("stop-color", colors[key][1]);
      grad.appendChild(stop1); grad.appendChild(stop2); defs.appendChild(grad);
    }
    svg.appendChild(defs); document.body.appendChild(svg);
  }

  function injectSavingOverlay() {
    if(document.getElementById('saving-overlay')) return;
    var overlay = document.createElement('div');
    overlay.id = 'saving-overlay';
    overlay.className = 'saving-overlay';
    overlay.innerHTML = '<div class="saving-box"><div class="saving-spinner" id="saving-spinner"></div><div class="saving-check" id="saving-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div><div class="saving-text" id="saving-text">保存中...</div></div>';
    document.body.appendChild(overlay);
  }

  function buildDOMFlow() {
    if(!swipeWrapper) return;
    var viewLife = document.getElementById('view-life');
    var viewBorn = document.getElementById('view-born');
    var viewSettings = document.getElementById('view-settings');
    var viewCustomEmpty = document.getElementById('view-custom-empty');
    
    var dynViews = document.querySelectorAll('.custom-dynamic-view');
    for (var d = 0; d < dynViews.length; d++) { removeEl(dynViews[d]); }
    
    flow = [];
    if(viewLife) { swipeWrapper.appendChild(viewLife); flow.push({ id: 'view-life', tab: 'view-life' }); }
    if(viewBorn) { swipeWrapper.appendChild(viewBorn); flow.push({ id: 'view-born', tab: 'view-born' }); }

    var customs = config.customs ? config.customs : [];
    if (customs.length === 0 && viewCustomEmpty) {
      swipeWrapper.appendChild(viewCustomEmpty);
      viewCustomEmpty.style.display = 'flex';
      flow.push({ id: 'view-custom-empty', tab: 'view-custom' });
    } else if (customs.length > 0) {
      if(viewCustomEmpty) viewCustomEmpty.style.display = 'none';
      for (var i = 0; i < customs.length; i++) {
        var c = customs[i];
        var customId = 'view-custom-' + i;
        var section = document.createElement('section');
        section.className = 'view-section custom-dynamic-view';
        section.id = customId;
        section.innerHTML = '<h1 class="view-title">' + (c.title ? c.title : '名称未設定') + '</h1><div class="timer-display" id="timer-' + customId + '"></div>';
        swipeWrapper.appendChild(section);
        flow.push({ id: customId, tab: 'view-custom', data: c, index: i });
      }
    }

    if(viewSettings) { swipeWrapper.appendChild(viewSettings); flow.push({ id: 'view-settings', tab: 'view-settings' }); }
    updateIndicators();
  }

  function updateCarousel() {
    if(flow.length === 0 || !swipeWrapper) return;
    
    var swipeContents = document.querySelectorAll('.swipe-content');
    for(var s=0; s<swipeContents.length; s++) { swipeContents[s].style.transform = 'translateX(0)'; }

    if(currentIndex < 0) currentIndex = 0;
    if(currentIndex >= flow.length) currentIndex = flow.length - 1;
    swipeWrapper.style.transform = 'translateX(-' + (currentIndex * 100) + 'vw)';
    
    var activeTabTarget = flow[currentIndex].tab;
    for(var t=0; t<tabs.length; t++) {
      if (tabs[t].getAttribute('data-tab') === activeTabTarget) {
        tabs[t].classList.add('active');
      } else {
        tabs[t].classList.remove('active');
      }
    }

    var indContainer = document.getElementById('custom-indicators');
    if(indContainer) {
      if (activeTabTarget === 'view-custom' && config.customs && config.customs.length > 1) {
        indContainer.classList.add('show');
        var dots = indContainer.children;
        for(var d=0; d<dots.length; d++) {
          dots[d].className = 'indicator-dot ' + (d === flow[currentIndex].index ? 'active' : '');
        }
      } else {
        indContainer.classList.remove('show');
      }
    }
  }

  function updateIndicators() {
    var indContainer = document.getElementById('custom-indicators');
    if(!indContainer) return;
    indContainer.innerHTML = '';
    if (config.customs && config.customs.length > 1) {
      for(var i=0; i<config.customs.length; i++) {
        var dot = document.createElement('div');
        dot.className = 'indicator-dot';
        indContainer.appendChild(dot);
      }
    }
  }

  var touchStartX = 0, touchStartY = 0;
  var mainContent = document.getElementById('main-content');

  document.addEventListener('touchstart', function(e) {
    if (!getClosest(e.target, '.swipe-item-container')) {
      var swipeContents = document.querySelectorAll('.swipe-content');
      for(var s=0; s<swipeContents.length; s++) { swipeContents[s].style.transform = 'translateX(0)'; }
    }
  }, {passive: true});

  if(mainContent) {
    mainContent.addEventListener('touchstart', function(e) {
      if (getClosest(e.target, '.swipe-content') || getClosest(e.target, 'button') || getClosest(e.target, '.custom-date-options')) return;
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, {passive: true});
    mainContent.addEventListener('touchend', function(e) {
      if (getClosest(e.target, '.swipe-content') || getClosest(e.target, 'button') || getClosest(e.target, '.custom-date-options')) return;
      var dx = e.changedTouches[0].screenX - touchStartX;
      var dy = e.changedTouches[0].screenY - touchStartY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
        if (dx < 0 && currentIndex < flow.length - 1) currentIndex++; 
        else if (dx > 0 && currentIndex > 0) currentIndex--; 
        updateCarousel();
      }
    }, {passive: true});
  }

  for(var t=0; t<tabs.length; t++) {
    (function(tab) {
      tab.addEventListener('click', function() {
        var targetIndex = -1;
        var targetTab = tab.getAttribute('data-tab');
        for(var f=0; f<flow.length; f++) {
          if (flow[f].tab === targetTab) { targetIndex = f; break; }
        }
        if (targetIndex !== -1) { currentIndex = targetIndex; updateCarousel(); }
      });
    })(tabs[t]);
  }

  function calculateDiff(startStr, endStr, isCountdown) {
    if (!startStr || !endStr) return { years: '-', days: '-', hours: '-', minutes: '-', seconds: '-', progress: 0 };
    var from = new Date(startStr); var to = new Date(endStr);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) return { years: '-', days: '-', hours: '-', minutes: '-', seconds: '-', progress: 0 };
    if (isCountdown ? (from > to) : (from > to)) return { years: 0, days: 0, hours: 0, minutes: 0, seconds: 0, progress: 1 };
    var years = to.getFullYear() - from.getFullYear();
    var tempDate = new Date(from); tempDate.setFullYear(from.getFullYear() + years);
    if (to < tempDate) { years--; tempDate.setFullYear(from.getFullYear() + years); }
    var remMs = to - tempDate;
    var days = Math.floor(remMs / (1000 * 60 * 60 * 24));
    var hours = Math.floor((remMs / (1000 * 60 * 60)) % 24);
    var minutes = Math.floor((remMs / (1000 * 60)) % 60);
    var seconds = Math.floor((remMs / 1000) % 60);
    var yearStart = new Date(to.getFullYear(), from.getMonth(), from.getDate());
    if (to < yearStart) yearStart.setFullYear(yearStart.getFullYear() - 1);
    var yearEnd = new Date(yearStart); yearEnd.setFullYear(yearEnd.getFullYear() + 1);
    var progress = (to - yearStart) / (yearEnd - yearStart);
    if(isCountdown) progress = 1 - progress;
    return { years: years, days: days, hours: hours, minutes: minutes, seconds: seconds, progress: progress };
  }

  function calculateLife(now) {
    if(!config.birth) return calculateDiff(null, null, true);
    var birth = new Date(config.birth); var end = new Date(birth);
    end.setFullYear(birth.getFullYear() + Number(config.lifeAge ? config.lifeAge : 30));
    return calculateDiff(now, end, true);
  }

  function startRenderLoop() {
    if(animationFrameId) cancelAnimationFrame(animationFrameId);
    function render() {
      var now = new Date();
      var indices = [currentIndex - 1, currentIndex, currentIndex + 1];
      for(var i=0; i<indices.length; i++) {
        var idx = indices[i];
        if(idx >= 0 && idx < flow.length) {
          var view = flow[idx];
          if (view.id === 'view-life') renderTimer('timer-life', calculateLife(now), 'life');
          else if (view.id === 'view-born') renderTimer('timer-born', calculateDiff(config.birth, now, false), 'born');
          else if (view.id.indexOf('view-custom-') === 0 && view.id !== 'view-custom-empty') renderTimer('timer-' + view.id, calculateDiff(view.data.start, now, false), 'custom');
        }
      }
      animationFrameId = requestAnimationFrame(render);
    }
    render();
  }

  function renderTimer(containerId, data, colorType) {
    var container = document.getElementById(containerId);
    if(!container) return;
    if (!container.innerHTML) {
      container.innerHTML = '<div class="circle-wrapper"><svg class="circle-svg" viewBox="0 0 100 100"><circle class="circle-bg" cx="50" cy="50" r="45"></circle><circle class="circle-progress" cx="50" cy="50" r="45" stroke="url(#grad-' + colorType + ')"></circle></svg><div class="circle-content"><div class="circle-value" id="' + containerId + '-years">-</div><div class="circle-unit">年</div></div></div><div class="sub-timer-grid"><div class="sub-timer-item"><span class="sub-value" id="' + containerId + '-days">-</span><span class="sub-unit">日</span></div><div class="sub-timer-item"><span class="sub-value" id="' + containerId + '-hours">-</span><span class="sub-unit">時間</span></div><div class="sub-timer-item"><span class="sub-value" id="' + containerId + '-mins">-</span><span class="sub-unit">分</span></div><div class="sub-timer-item"><span class="sub-value" id="' + containerId + '-secs">-</span><span class="sub-unit">秒</span></div></div>';
    }
    document.getElementById(containerId + '-years').textContent = data.years;
    document.getElementById(containerId + '-days').textContent = data.days;
    document.getElementById(containerId + '-hours').textContent = data.hours !== '-' ? padZero(data.hours) : '-';
    document.getElementById(containerId + '-mins').textContent = data.minutes !== '-' ? padZero(data.minutes) : '-';
    document.getElementById(containerId + '-secs').textContent = data.seconds !== '-' ? padZero(data.seconds) : '-';
    var circle = container.querySelector('.circle-progress');
    var circumference = 2 * Math.PI * 45;
    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = data.years === '-' ? circumference : circumference - (data.progress * circumference);
  }

  function initDatePicker(containerId, initialDateStr) {
    var container = document.getElementById(containerId);
    if(!container) return;
    
    var initY = '', initM = '', initD = '';
    if (initialDateStr) {
      var d = new Date(initialDateStr);
      if(!isNaN(d.getTime())){ initY = d.getFullYear(); initM = d.getMonth() + 1; initD = d.getDate(); }
    }
    var currentYear = new Date().getFullYear();

    function createDropdown(type, min, max, initVal, unit) {
      var optionsHtml = '<div class="custom-date-option ' + (!initVal ? 'selected' : '') + '" data-value="">--</div>';
      if(type === 'y') {
        for(var y = max; y >= min; y--) optionsHtml += '<div class="custom-date-option ' + (y === parseInt(initVal) ? 'selected' : '') + '" data-value="' + y + '">' + y + '</div>';
      } else {
        for(var i = min; i <= max; i++) optionsHtml += '<div class="custom-date-option ' + (i === parseInt(initVal) ? 'selected' : '') + '" data-value="' + i + '">' + i + '</div>';
      }
      return '<div class="custom-date-picker-wrap" id="' + containerId + '-' + type + '-wrap"><div class="custom-date-display" id="' + containerId + '-' + type + '-display">' + (initVal ? initVal : '--') + '</div><span class="custom-date-unit">' + unit + '</span><div class="custom-date-options" id="' + containerId + '-' + type + '-options">' + optionsHtml + '</div><input type="hidden" id="' + containerId + '-' + type + '" value="' + (initVal ? initVal : '') + '"></div>';
    }

    container.innerHTML = createDropdown('y', currentYear - 100, currentYear, initY, '年') + createDropdown('m', 1, 12, initM, '月') + createDropdown('d', 1, 31, initD, '日');

    var types = ['y', 'm', 'd'];
    for(var t=0; t<types.length; t++) {
      (function(type) {
        var wrap = document.getElementById(containerId + '-' + type + '-wrap');
        var display = document.getElementById(containerId + '-' + type + '-display');
        var optionsBox = document.getElementById(containerId + '-' + type + '-options');
        var hiddenInput = document.getElementById(containerId + '-' + type);

        display.addEventListener('click', function(e) {
          e.stopPropagation();
          var opts = document.querySelectorAll('.custom-date-options.show');
          for(var o=0; o<opts.length; o++) {
            var el = opts[o];
            if(el !== optionsBox) {
              el.classList.remove('show');
              if(el.previousElementSibling && el.previousElementSibling.previousElementSibling) {
                el.previousElementSibling.previousElementSibling.classList.remove('active');
              }
              if(el.parentElement) el.parentElement.style.zIndex = '1';
            }
          }
          var isOpen = optionsBox.classList.contains('show');
          if(isOpen) {
            optionsBox.classList.remove('show');
            display.classList.remove('active');
            wrap.style.zIndex = '1';
          } else {
            optionsBox.classList.add('show');
            display.classList.add('active');
            wrap.style.zIndex = '100'; 
            var selected = optionsBox.querySelector('.selected');
            if(selected) optionsBox.scrollTop = selected.offsetTop - optionsBox.clientHeight / 2;
          }
        });

        optionsBox.addEventListener('click', function(e) {
          e.stopPropagation();
          if(e.target.classList.contains('custom-date-option')) {
            var val = e.target.getAttribute('data-value');
            display.textContent = val ? val : '--';
            hiddenInput.value = val;
            var optItems = optionsBox.querySelectorAll('.custom-date-option');
            for(var o=0; o<optItems.length; o++) { optItems[o].classList.remove('selected'); }
            e.target.classList.add('selected');
            optionsBox.classList.remove('show');
            display.classList.remove('active');
            wrap.style.zIndex = '1';
            if(type === 'y' || type === 'm') adjustDays();
            container.classList.remove('has-error');
          }
        });
      })(types[t]);
    }

    function adjustDays() {
      var yVal = document.getElementById(containerId + '-y').value;
      var mVal = document.getElementById(containerId + '-m').value;
      var dHidden = document.getElementById(containerId + '-d');
      var dDisplay = document.getElementById(containerId + '-d-display');
      var dOptions = document.getElementById(containerId + '-d-options');

      if(!yVal || !mVal) return;
      var daysInMonth = new Date(parseInt(yVal), parseInt(mVal), 0).getDate();
      var currentDay = parseInt(dHidden.value);
      if(currentDay > daysInMonth) { currentDay = ''; dHidden.value = ''; dDisplay.textContent = '--'; }

      var optionsHtml = '<div class="custom-date-option ' + (!currentDay ? 'selected' : '') + '" data-value="">--</div>';
      for(var d = 1; d <= daysInMonth; d++) {
        optionsHtml += '<div class="custom-date-option ' + (d === currentDay ? 'selected' : '') + '" data-value="' + d + '">' + d + '</div>';
      }
      dOptions.innerHTML = optionsHtml;
    }
  }

  document.addEventListener('click', function() {
    var opts = document.querySelectorAll('.custom-date-options.show');
    for(var o=0; o<opts.length; o++) {
      var el = opts[o];
      el.classList.remove('show');
      if(el.previousElementSibling && el.previousElementSibling.previousElementSibling) {
        el.previousElementSibling.previousElementSibling.classList.remove('active');
      }
      if(el.parentElement) el.parentElement.style.zIndex = '1';
    }
  });

  function getPickerDate(containerId) {
    var yEl = document.getElementById(containerId + '-y');
    var mEl = document.getElementById(containerId + '-m');
    var dEl = document.getElementById(containerId + '-d');
    if(!yEl || !mEl || !dEl) return null;
    var y = yEl.value; var m = mEl.value; var d = dEl.value;
    if(!y || !m || !d) return null;
    return y + '-' + padZero(m) + '-' + padZero(d);
  }

  function initLifeStepper() {
    var wrap = document.getElementById('input-life-wrap');
    if(!wrap) return;
    wrap.innerHTML = '<div class="life-setting-group"><div class="input-suffix-wrap"><input type="number" id="input-life" class="input-field" value="' + (config.lifeAge ? config.lifeAge : 30) + '" readonly><span class="suffix">歳まで</span></div><div class="stepper-controls"><button type="button" class="stepper-btn" id="btn-life-minus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="5" y1="12" x2="19" y2="12" stroke-width="2" stroke-linecap="round"/></svg></button><button type="button" class="stepper-btn" id="btn-life-plus"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="5" x2="12" y2="1