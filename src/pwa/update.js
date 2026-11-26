(() => {
  'use strict';
  const version = document.querySelector('meta[name="snackdash-version"]').content;
  const i18n = window.GameI18n;
  const t = (key,params) => i18n ? i18n.t(key,params) : key;
  const menu = document.getElementById('menuScreen');
  const app = document.getElementById('app');
  const footer = document.createElement('p');
  footer.className = 'save-hint';
  footer.textContent = t('pwa.version',{version:version.slice(0,8)});
  menu.appendChild(footer);

  if (!('serviceWorker' in navigator)) return;
  const sw = navigator.serviceWorker;
  let registration, waiting = null, ready = false, applying = false;
  let activated = false, dismissed = false, checking = false;
  let previousController = sw.controller;
  const safe = () => !app.classList.contains('in-game') && !menu.classList.contains('hidden');

  const panel = document.createElement('aside');
  panel.id = 'pwaUpdatePanel';
  panel.hidden = true;
  panel.setAttribute('aria-label',t('pwa.updateAria'));
  panel.setAttribute('data-i18n-aria-label','pwa.updateAria');
  panel.innerHTML = '<strong data-i18n="pwa.ready">A new update is ready!</strong><p data-i18n="pwa.progress">Your race progress will be kept.</p><div><button type="button" id="pwaApply" class="btn btn-primary" data-i18n="pwa.apply">UPDATE &amp; PLAY</button><button type="button" id="pwaLater" class="btn btn-outline" data-i18n="pwa.later">Later</button></div><p id="pwaUpdateStatus" role="status"></p>';
  document.body.appendChild(panel);
  const apply = panel.querySelector('#pwaApply');
  const later = panel.querySelector('#pwaLater');
  const status = panel.querySelector('#pwaUpdateStatus');
  let statusKey = null;
  function setStatus(key){
    statusKey=key;
    status.textContent=key?t(key):'';
  }
  function refreshLanguage(){
    i18n?.apply(panel);
    footer.textContent=t('pwa.version',{version:version.slice(0,8)});
    if(statusKey)status.textContent=t(statusKey);
  }
  refreshLanguage();
  i18n?.subscribe(refreshLanguage);

  function render() {
    panel.hidden = !safe() || !ready || dismissed;
    apply.disabled = applying;
    later.disabled = applying;
    if (!applying && !activated) setStatus(null);
  }
  function showUpdate(worker) {
    if (worker && worker !== waiting) {
      waiting = worker;
      dismissed = false;
    }
    ready = true;
    render();
  }
  function reloadIfSafe() {
    if (activated && applying && safe()) location.reload();
  }
  function inspect() {
    if (registration && registration.waiting && sw.controller)
      showUpdate(registration.waiting);
  }
  async function check() {
    if (!registration || checking || !navigator.onLine) return;
    checking = true;
    try {
      inspect();
      await registration.update();
      inspect();
    } catch (_) {
      // Keep playing the cached version when connectivity is unavailable.
    } finally { checking = false; }
  }

  // An activation in another open tab never reloads an ongoing race.
  // The active controller reports its build ID so a fresh page already
  // running that build does not display a redundant update notice.
  function inspectController() {
    const controller = sw.controller;
    if (!controller) return;
    const channel = new MessageChannel();
    const timeout = setTimeout(() => channel.port1.close(), 3000);
    channel.port1.onmessage = e => {
      clearTimeout(timeout);
      channel.port1.close();
      if (controller !== sw.controller) return;
      if (e.data && e.data.version && e.data.version !== version) {
        activated = true;
        dismissed = false;
        showUpdate(null);
        reloadIfSafe();
      }
    };
    controller.postMessage({type:'GET_VERSION'}, [channel.port2]);
  }
  sw.addEventListener('controllerchange', () => {
    const old = previousController;
    previousController = sw.controller;
    if (!old && !applying) return; // Initial installation, not an upgrade.
    if (applying) {
      activated = true;
      setStatus('pwa.status.ready');
      reloadIfSafe();
    } else {
      waiting = null;
      inspectController();
    }
  });

  apply.addEventListener('click', () => {
    if (!safe() || applying) return;
    applying = true;
    setStatus('pwa.status.opening');
    render();
    if (activated) {
      reloadIfSafe();
      return;
    }
    const worker = registration && registration.waiting;
    if (!worker) {
      applying = false;
      inspectController();
      render();
      return;
    }
    worker.postMessage({type:'ACTIVATE_UPDATE'});
    setTimeout(() => {
      if (!activated && applying) {
        applying = false;
        render();
        setStatus('pwa.status.failed');
      }
    }, 10000);
  });
  later.addEventListener('click', () => {
    dismissed = true;
    render();
  });

  let wasSafe = safe();
  new MutationObserver(() => {
    const now = safe();
    if (now && !wasSafe) {
      dismissed = false;
      reloadIfSafe();
      check();
    }
    wasSafe = now;
    render();
  }).observe(app, {attributes:true, attributeFilter:['class']});
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) check();
  });
  window.addEventListener('online', check);

  async function start() {
    try {
      registration = await sw.register('./sw.js', {updateViaCache:'none'});
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        const onState = () => {
          if (worker.state === 'installed' && sw.controller) showUpdate(worker);
          if (worker.state === 'redundant' && waiting === worker && !activated) {
            ready = false;
            waiting = null;
            applying = false;
            render();
          }
        };
        worker.addEventListener('statechange', onState);
        onState();
      });
      inspect();
      inspectController();
      check();
    } catch (_) { /* The standalone HTML remains playable. */ }
  }
  start();
})();
