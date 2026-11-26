(() => {
  'use strict';
  const version = document.querySelector('meta[name="snackdash-version"]').content;
  const menu = document.getElementById('menuScreen');
  const app = document.getElementById('app');
  const footer = document.createElement('p');
  footer.className = 'save-hint';
  footer.textContent = 'Version ' + version.slice(0, 8);
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
  panel.setAttribute('aria-label','Game update');
  panel.innerHTML = '<strong>A new update is ready!</strong><p>Your race progress will be kept.</p><div><button type="button" id="pwaApply" class="btn btn-primary">UPDATE &amp; PLAY</button><button type="button" id="pwaLater" class="btn btn-outline">Later</button></div><p id="pwaUpdateStatus" role="status"></p>';
  document.body.appendChild(panel);
  const apply = panel.querySelector('#pwaApply');
  const later = panel.querySelector('#pwaLater');
  const status = panel.querySelector('#pwaUpdateStatus');

  function render() {
    panel.hidden = !safe() || !ready || dismissed;
    apply.disabled = applying;
    later.disabled = applying;
    if (!applying && !activated) status.textContent = '';
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
      status.textContent = 'Update ready. Opening the new version…';
      reloadIfSafe();
    } else {
      waiting = null;
      inspectController();
    }
  });

  apply.addEventListener('click', () => {
    if (!safe() || applying) return;
    applying = true;
    status.textContent = 'Opening the new version…';
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
        status.textContent = 'Could not switch versions yet. Please try again.';
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
