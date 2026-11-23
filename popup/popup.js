// popup.js v1.2.0 — init, tab switching, help overlay, master toggle, status, paused-state fix
// v1.2.0: disabled-overlay toont nu alleen nog op de Live tab (andere tabs blijven altijd
//         bruikbaar bij gepauzeerde tracking), en verbergt het Live-paneel volledig i.p.v.
//         het alleen af te dekken, zodat scrollen niet meer onder de overlay uitkomt.

// ─── TOAST (gedeeld door alle popup-scripts) ───────────────────────────────

let toastTimer = null;
function showSaved(label = 'Saved') {
  const toast = document.getElementById('savedToast');
  if (!toast) return;
  toast.textContent = `✓ ${label}`;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 1800);
}

// ─── TAB SWITCHING ─────────────────────────────────────────────────────────

let currentTab = 'alerts';

function activateTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));

  const tab   = document.querySelector(`.tab[data-tab="${tabName}"]`);
  const panel = document.getElementById(`tab-${tabName}`);
  if (!tab || !panel) return;

  tab.classList.add('active');
  panel.classList.add('active');
  currentTab = tabName;

  // Stop auto-refresh als we de Live tab verlaten
  if (tabName !== 'live') stopAutoRefresh();

  if (tabName === 'live')    loadLive();
  if (tabName === 'history') loadHistory();

  updateDisabledOverlay();
}

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', async () => {
    const tabName = tab.dataset.tab;
    activateTab(tabName);

    // Sla actieve tab op als startupTab 'last' is
    const { startupTab = 'last' } = await chrome.storage.local.get('startupTab');
    if (startupTab === 'last') {
      await chrome.storage.local.set({ lastTab: tabName });
    }
  });
});

// ─── HELP OVERLAY ──────────────────────────────────────────────────────────

document.getElementById('btnHelp').addEventListener('click', () => {
  document.getElementById('helpOverlay').classList.add('visible');
});

document.getElementById('helpClose').addEventListener('click', () => {
  document.getElementById('helpOverlay').classList.remove('visible');
});

document.getElementById('helpOverlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove('visible');
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('helpOverlay').classList.remove('visible');
  }
});

// ─── MASTER TOGGLE ─────────────────────────────────────────────────────────

function applyEnabledUI(enabled) {
  const pill  = document.getElementById('masterToggle');
  const label = document.getElementById('masterLabel');

  pill.classList.toggle('on', enabled);
  label.textContent = enabled ? 'on' : 'off';
  label.classList.toggle('on', enabled);

  updateDisabledOverlay(enabled);
}

// Toont de "paused" overlay alleen op de Live tab, en verbergt daarbij het
// volledige Live-paneel (i.p.v. het alleen af te dekken), zodat er niets
// meer is om onderdoor te scrollen.
function updateDisabledOverlay(enabled) {
  if (enabled === undefined) {
    enabled = document.getElementById('masterToggle').classList.contains('on');
  }
  const shouldShow = !enabled && currentTab === 'live';

  const overlay = document.getElementById('disabledOverlay');
  overlay.classList.toggle('visible', shouldShow);

  const livePanel = document.getElementById('tab-live');
  if (livePanel) livePanel.classList.toggle('paused-hidden', shouldShow);
}

document.getElementById('masterToggle').addEventListener('click', async () => {
  const { enabled = true } = await chrome.storage.local.get('enabled');
  const newValue = !enabled;
  await chrome.storage.local.set({ enabled: newValue });
  applyEnabledUI(newValue);
  chrome.runtime.sendMessage({ type: 'setEnabled', enabled: newValue }).catch(() => {});
  updateStatus();
});

// ─── STATUS ────────────────────────────────────────────────────────────────

async function updateStatus() {
  const { lat, lastPoll, enabled = true } = await chrome.storage.local.get(['lat', 'lastPoll', 'enabled']);
  const dot        = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  if (!enabled) {
    dot.className          = 'dot';
    statusText.textContent = 'paused';
    return;
  }
  if (!lat) {
    dot.className          = 'dot';
    statusText.textContent = 'no location';
    return;
  }
  if (lastPoll) {
    const secAgo = Math.round((Date.now() - lastPoll) / 1000);
    dot.className          = 'dot active';
    statusText.textContent = `${secAgo}s ago`;
  } else {
    dot.className          = 'dot active';
    statusText.textContent = 'active';
  }
}

// ─── INIT ──────────────────────────────────────────────────────────────────

async function init() {
  // Injecteer tab HTML (synchroon, vóór data laden)
  initAlertsTab();
  initHistoryTab();
  initLiveTab();
  initSettingsTab();

  // Laad opgeslagen data
  const { lat, lon, radius = 50, alerts = [], enabled = true, startupTab = 'last', lastTab = 'alerts', units = 'metric' } =
    await chrome.storage.local.get(['lat', 'lon', 'radius', 'alerts', 'enabled', 'startupTab', 'lastTab', 'units']);

  if (lat && lon) updateCoordDisplay(lat, lon);

  applyEnabledUI(enabled);
  initRadiusButtons(radius, units);
  await initSettings();
  renderAlerts(alerts);
  updateStatus();
  setInterval(updateStatus, 5000);

  // Activeer de juiste tab
  const tabToOpen = startupTab === 'last' ? lastTab : startupTab;
  activateTab(tabToOpen);
}

init();