// history.js v1.1.1 — injecteert History tab HTML en beheert notificatiegeschiedenis

// ─── HTML INJECTIE ──────────────────────────────────────────────────────────

function initHistoryTab() {
  document.getElementById('tab-history').innerHTML = `

    <!-- 📊 Statistieken -->
    <div class="stats-dropdown" id="statsDropdown">
      <button id="btnToggleStats" class="stats-toggle-btn">
        <span>📊 Statistics</span>
        <span id="statsChevron" class="stats-chevron">▼</span>
      </button>
      <div id="statsPanel" style="display:none">
        <div class="stats-panel-inner" id="statsPanelInner">
          <div class="empty-state" style="padding:12px 0">Loading…</div>
        </div>
        <button class="btn-clear-history" id="btnResetStats" style="width:100%">Reset statistics</button>
      </div>
    </div>

    <!-- Notificatiegeschiedenis -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div class="section-label" style="margin:0">Notification history</div>
      <button class="btn-clear-history" id="btnClearHistory">Clear</button>
    </div>
    <div class="history-list" id="historyList">
      <div class="empty-state">No notifications yet.</div>
    </div>

    <div class="caught-dropdown" id="caughtDropdown" style="margin-top:14px;border:1px solid #1a2a4a;border-radius:8px;overflow:hidden">
      <button id="btnToggleCaught" style="width:100%;display:flex;justify-content:space-between;align-items:center;padding:9px 12px;background:#0d1530;border:none;cursor:pointer;color:#c8d4f0;font-family:'Space Mono',monospace;font-size:11px">
        <span>🎯 Caught aircraft</span>
        <span id="caughtChevron" style="font-size:10px;transition:transform 0.2s">▼</span>
      </button>
      <div id="caughtPanel" style="display:none;padding:10px 12px;background:#080f25">
        <div id="caughtList"></div>
        <button class="btn-option" id="btnClearCaught" style="width:100%;padding:7px;margin-top:8px">Release all</button>
      </div>
    </div>
  `;
  setupHistoryEvents();
}

// ─── EVENTS ────────────────────────────────────────────────────────────────

function setupHistoryEvents() {
  document.getElementById('btnClearHistory').addEventListener('click', async () => {
    await chrome.storage.local.set({ notifHistory: [] });
    loadHistory();
  });

  document.getElementById('btnToggleCaught').addEventListener('click', () => {
    const panel   = document.getElementById('caughtPanel');
    const chevron = document.getElementById('caughtChevron');
    const isOpen  = panel.style.display !== 'none';
    panel.style.display     = isOpen ? 'none' : 'block';
    chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
    if (!isOpen) renderCaughtList();
  });

  document.getElementById('btnClearCaught').addEventListener('click', async () => {
    await chrome.storage.local.set({ caughtAircraft: [], caughtAircraftLabels: {} });
    renderCaughtList();
  });

  document.getElementById('btnToggleStats').addEventListener('click', () => {
    const panel   = document.getElementById('statsPanel');
    const chevron = document.getElementById('statsChevron');
    const isOpen  = panel.style.display !== 'none';
    panel.style.display     = isOpen ? 'none' : 'block';
    chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
    if (!isOpen) renderStats();
  });

  document.getElementById('btnResetStats').addEventListener('click', async () => {
    const btn = document.getElementById('btnResetStats');
    if (btn.dataset.confirm !== '1') {
      btn.dataset.confirm = '1';
      btn.textContent = 'Sure? Click again to confirm';
      btn.style.color = '#ef4444';
      btn.style.borderColor = '#ef4444';
      setTimeout(() => {
        btn.dataset.confirm = '';
        btn.textContent = 'Reset statistics';
        btn.style.color = '';
        btn.style.borderColor = '';
      }, 2500);
      return;
    }
    await chrome.storage.local.remove([
      'statsTotalCount', 'statsTypeCounts', 'statsAirlineCounts'
    ]);
    btn.dataset.confirm = '';
    btn.textContent = 'Reset statistics';
    btn.style.color = '';
    btn.style.borderColor = '';
    renderStats();
  });
}

// ─── STATISTIEKEN RENDEREN ─────────────────────────────────────────────────

async function renderStats() {
  const container = document.getElementById('statsPanelInner');
  if (!container) return;

  const { statsTotalCount = 0, statsFirstDetection, statsTypeCounts = {}, statsAirlineCounts = {} } =
    await chrome.storage.local.get(['statsTotalCount', 'statsFirstDetection', 'statsTypeCounts', 'statsAirlineCounts']);

  if (statsTotalCount === 0 && !statsFirstDetection) {
    container.innerHTML = '<div style="font-family:Space Mono,monospace;font-size:10px;color:#8b9cc8;padding:4px 0 10px">No data yet. Stats are recorded once notifications start firing.</div>';
    return;
  }

  function topN(obj, n) {
    return Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n);
  }

  const topTypes    = topN(statsTypeCounts, 5);
  const topAirlines = topN(statsAirlineCounts, 5);

  const firstDate = statsFirstDetection
    ? new Date(statsFirstDetection).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  function barRow(label, count, max) {
    const pct = max > 0 ? Math.round((count / max) * 100) : 0;
    return `
      <div class="stats-bar-row">
        <span class="stats-bar-label">${label}</span>
        <div class="stats-bar-track">
          <div class="stats-bar-fill" style="width:${pct}%"></div>
        </div>
        <span class="stats-bar-count">${count}</span>
      </div>
    `;
  }

  const maxType    = topTypes[0]?.[1]    || 1;
  const maxAirline = topAirlines[0]?.[1] || 1;

  container.innerHTML = `
    <div class="stats-meta-row">
      <div class="stats-meta-cell">
        <div class="stats-meta-label">Total notifications</div>
        <div class="stats-meta-value">${statsTotalCount}</div>
      </div>
      <div class="stats-meta-cell">
        <div class="stats-meta-label">First detection</div>
        <div class="stats-meta-value" style="font-size:11px">${firstDate}</div>
      </div>
    </div>

    ${topTypes.length > 0 ? `
      <div class="stats-section-label">Top aircraft types</div>
      ${topTypes.map(([t, c]) => barRow(t, c, maxType)).join('')}
    ` : ''}

    ${topAirlines.length > 0 ? `
      <div class="stats-section-label" style="margin-top:10px">Top airlines</div>
      ${topAirlines.map(([a, c]) => barRow(a, c, maxAirline)).join('')}
    ` : ''}
  `;
}

async function renderCaughtList() {
  const { caughtAircraft = [], caughtAircraftLabels = {} } =
    await chrome.storage.local.get(['caughtAircraft', 'caughtAircraftLabels']);
  const list = document.getElementById('caughtList');

  if (caughtAircraft.length === 0) {
    list.innerHTML = '<div style="font-family:Space Mono,monospace;font-size:10px;color:#4b5680;padding:4px 0">No caught aircraft.</div>';
    return;
  }

  list.innerHTML = '';
  caughtAircraft.forEach(hex => {
    const label = caughtAircraftLabels[hex] || hex;
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #1a2040;gap:8px';
    row.innerHTML = `
      <div style="min-width:0">
        <div style="font-family:'Space Mono',monospace;font-size:11px;color:#c8d4f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${label}</div>
        ${label !== hex ? `<div style="font-family:'Space Mono',monospace;font-size:9px;color:#3a4560">${hex}</div>` : ''}
      </div>
      <button style="flex-shrink:0;background:none;border:1px solid #2a3060;color:#4b5680;font-size:10px;padding:2px 8px;border-radius:5px;cursor:pointer" data-hex="${hex}">↩️ Release</button>
    `;
    row.querySelector('button').addEventListener('click', async () => {
      const { caughtAircraft: current = [], caughtAircraftLabels: labels = {} } =
        await chrome.storage.local.get(['caughtAircraft', 'caughtAircraftLabels']);
      delete labels[hex];
      await chrome.storage.local.set({
        caughtAircraft: current.filter(h => h !== hex),
        caughtAircraftLabels: labels
      });
      renderCaughtList();
    });
    list.appendChild(row);
  });
}

// ─── LADEN ─────────────────────────────────────────────────────────────────

async function loadHistory() {
  const { notifHistory = [] } = await chrome.storage.local.get('notifHistory');
  const list = document.getElementById('historyList');

  if (notifHistory.length === 0) {
    list.innerHTML = '<div class="empty-state">No notifications yet.</div>';
    return;
  }

  list.innerHTML = '';
  [...notifHistory].reverse().forEach(entry => {
    const item     = document.createElement('div');
    item.className = 'history-item';
    const time     = new Date(entry.ts);
    const timeStr  = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateStr  = time.toLocaleDateString([], { day: '2-digit', month: 'short' });
    item.innerHTML = `
      <div class="history-item-top">
        <span class="history-callsign">${entry.callsign}</span>
        <span class="history-time">${dateStr} ${timeStr}</span>
      </div>
      <div class="history-detail">${entry.detail}</div>
    `;
    if (entry.hex) {
      item.style.cursor = 'pointer';
      item.title = 'Open on map';
      item.addEventListener('click', () => {
        chrome.tabs.create({ url: `https://globe.airplanes.live/?icao=${entry.hex}` });
      });
    }
    list.appendChild(item);
  });
}