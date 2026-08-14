// alerts.js v1.1.0 — injecteert Alerts tab HTML en beheert alert logica

// ─── HTML INJECTIE ──────────────────────────────────────────────────────────

function initAlertsTab() {
  document.getElementById('tab-alerts').innerHTML = `
    <div class="section-label">New alert</div>
    <div class="alert-form">
      <div class="form-row">
        <select id="alertType">
          <option value="registration">Registration</option>
          <option value="flight">Flight no.</option>
          <option value="type">Aircraft type</option>
          <option value="airline">Airline</option>
          <option value="icao">ICAO hex</option>
          <option value="dbflag">DB Flag</option>
        </select>
        <input type="text" id="alertValue" placeholder="e.g. PH-BXA" />
        <select id="alertFlagSelect" style="display:none;flex:1">
          <option value="military">🪖 Military</option>
          <option value="interesting">⭐ Interesting</option>
          <option value="pia">🔒 PIA (hidden)</option>
          <option value="ladd">📵 LADD (blocked)</option>
        </select>
      </div>
      <input type="text" id="alertNote" placeholder="Note (optional)" class="alert-note-input" />
      <button class="btn-add" id="btnAdd">+ Add alert</button>
    </div>
    <div class="section-label">Active alerts</div>
    <div class="alert-list" id="alertList">
      <div class="empty-state">No alerts set.<br>Add an aircraft above.</div>
    </div>
  `;
  setupAlertsEvents();
}

// ─── LABELS ────────────────────────────────────────────────────────────────

const typeLabels = {
  registration: 'Registration',
  flight:       'Flight no.',
  type:         'Type',
  airline:      'Airline',
  icao:         'ICAO hex',
  dbflag:       'DB Flag'
};

const flagLabels = {
  military:    '🪖 Military',
  interesting: '⭐ Interesting',
  pia:         '🔒 PIA',
  ladd:        '📵 LADD'
};

const placeholders = {
  registration: 'e.g. PH-BXA',
  flight:       'e.g. KL1234',
  type:         'e.g. B744, F16',
  airline:      'e.g. KLM, TRA',
  icao:         'e.g. 484506'
};

// ─── EVENTS ────────────────────────────────────────────────────────────────

function setNoteDisplay(el, noteText) {
  el.innerHTML = '';
  el.dataset.note = noteText || '';
  if (noteText) {
    el.textContent = noteText;
  } else {
    const emptySpan = document.createElement('span');
    emptySpan.className = 'alert-note-empty';
    emptySpan.textContent = '+ add note';
    el.appendChild(emptySpan);
  }
}

function setupAlertsEvents() {

  document.getElementById('alertType').addEventListener('change', (e) => {
    const isFlag = e.target.value === 'dbflag';
    document.getElementById('alertValue').style.display      = isFlag ? 'none' : '';
    document.getElementById('alertFlagSelect').style.display = isFlag ? '' : 'none';
    if (!isFlag) document.getElementById('alertValue').placeholder = placeholders[e.target.value] || '';
  });

  // Enter in waarde-veld of notitieveld triggert toevoegen
  ['alertValue', 'alertNote'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('btnAdd').click();
    });
  });

  document.getElementById('btnAdd').addEventListener('click', async () => {
    const type   = document.getElementById('alertType').value;
    const isFlag = type === 'dbflag';
    const value  = isFlag
      ? document.getElementById('alertFlagSelect').value
      : document.getElementById('alertValue').value.trim().toUpperCase();
    if (!value) return;

    const note      = document.getElementById('alertNote').value.trim();
    const labelText = isFlag ? flagLabels[value] || value : value;
    const { alerts = [] } = await chrome.storage.local.get('alerts');

    if (isFlag && alerts.some(a => a.type === 'dbflag' && a.value === value)) {
      document.getElementById('alertValue').placeholder = 'Already added!';
      return;
    }

    alerts.push({
      id: Date.now().toString(),
      type,
      value,
      label: `${typeLabels[type]}: ${labelText}`,
      note: note || '',
      active: true
    });

    await chrome.storage.local.set({ alerts });
    document.getElementById('alertValue').value = '';
    document.getElementById('alertNote').value  = '';
    renderAlerts(alerts);
    showSaved('Alert added');
  });
}

// ─── RENDER ────────────────────────────────────────────────────────────────

async function renderAlerts(alerts) {
  if (!alerts) {
    const result = await chrome.storage.local.get('alerts');
    alerts = result.alerts || [];
  }

  const list = document.getElementById('alertList');
  if (alerts.length === 0) {
    list.innerHTML = '<div class="empty-state">No alerts set.<br>Add an aircraft above.</div>';
    return;
  }

  list.innerHTML = '';
  for (const alert of alerts) {
    const item = document.createElement('div');
    item.className = 'alert-item';

    const toggleBtn = document.createElement('button');
    toggleBtn.className = `alert-toggle ${alert.active ? 'on' : ''}`;
    toggleBtn.dataset.id = alert.id;

    const info = document.createElement('div');
    info.className = 'alert-info';

    const valueDiv = document.createElement('div');
    valueDiv.className = 'alert-value';
    valueDiv.textContent = alert.type === 'dbflag' ? (flagLabels[alert.value] || alert.value) : alert.value;

    const typeDiv = document.createElement('div');
    typeDiv.className = 'alert-type-label';
    typeDiv.textContent = typeLabels[alert.type] || alert.type;

    const noteDiv = document.createElement('div');
    noteDiv.className = 'alert-note';
    noteDiv.dataset.id = alert.id;
    noteDiv.title = 'Click to edit note';
    setNoteDisplay(noteDiv, alert.note);

    info.appendChild(valueDiv);
    info.appendChild(typeDiv);
    info.appendChild(noteDiv);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn-remove';
    removeBtn.dataset.id = alert.id;
    removeBtn.textContent = 'X';

    item.appendChild(toggleBtn);
    item.appendChild(info);
    item.appendChild(removeBtn);
    list.appendChild(item);
  }

  // Inline note bewerken
  list.querySelectorAll('.alert-note').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (el.querySelector('input')) return;

      const id          = el.dataset.id;
      const currentNote = el.dataset.note || '';

      const input = document.createElement('input');
      input.type        = 'text';
      input.value       = currentNote;
      input.placeholder = 'Add a note...';
      input.className   = 'alert-note-field';
      input.maxLength   = 60;

      el.innerHTML = '';
      el.appendChild(input);
      input.focus();

      async function saveNote() {
        const newNote = input.value.trim();
        const { alerts = [] } = await chrome.storage.local.get('alerts');
        const alert = alerts.find(a => a.id === id);
        if (alert) {
          alert.note = newNote;
          await chrome.storage.local.set({ alerts });
        }
        setNoteDisplay(el, newNote);
      }

      input.addEventListener('blur', saveNote);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter')  { input.blur(); }
        if (e.key === 'Escape') { setNoteDisplay(el, currentNote); }
      });
    });
  });

  list.querySelectorAll('.alert-toggle').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { alerts = [] } = await chrome.storage.local.get('alerts');
      const alert = alerts.find(a => a.id === btn.dataset.id);
      if (alert) {
        alert.active = !alert.active;
        await chrome.storage.local.set({ alerts });
        renderAlerts(alerts);
      }
    });
  });

  list.querySelectorAll('.btn-remove').forEach(btn => {
    let confirmTimer = null;
    let pending = false;

    btn.addEventListener('click', async () => {
      if (!pending) {
        pending = true;
        btn.textContent = '✗';
        btn.style.color = '#ef4444';
        btn.title = 'Click again to remove';
        confirmTimer = setTimeout(() => {
          pending = false;
          btn.textContent = 'X';
          btn.style.color = '';
          btn.title = '';
        }, 2000);
      } else {
        clearTimeout(confirmTimer);
        let { alerts = [] } = await chrome.storage.local.get('alerts');
        alerts = alerts.filter(a => a.id !== btn.dataset.id);
        await chrome.storage.local.set({ alerts });
        renderAlerts(alerts);
      }
    });
  });
}