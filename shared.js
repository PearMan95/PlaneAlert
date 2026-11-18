// shared.js v1.1.0 — gedeelde logica tussen background.js en popup scripts
// v1.1.0: airline-matching valideert nu dat ac.flight eruitziet als een echte vluchtcode
//         (3 letters + cijfer), zodat registraties in het flight-veld (GA/militair) geen
//         valse airline-matches meer geven.

// ─── DB FLAGS ──────────────────────────────────────────────────────────────

const DB_FLAGS = {
  military:    1,
  interesting: 2,
  pia:         4,
  ladd:        8
};

// ─── MATCH LOGICA ──────────────────────────────────────────────────────────

/**
 * Controleert of een vliegtuig overeenkomt met een alert.
 * @param {object} ac    - Vliegtuigobject van de airplanes.live API
 * @param {object} alert - Alertobject met .type en .value
 * @returns {boolean}
 */
function matchesAlert(ac, alert) {
  const type  = alert.type;
  const value = (alert.value || '').toUpperCase().trim();
  if (!value) return false;

  switch (type) {
    case 'registration':
      return (ac.r      || '').toUpperCase().trim() === value;
    case 'icao':
      return (ac.hex    || '').toUpperCase().trim() === value;
    case 'flight':
      return (ac.flight || '').toUpperCase().trim().startsWith(value);
    case 'type':
      return (ac.t      || '').toUpperCase().trim() === value;
    case 'airline': {
      const flight = (ac.flight || '').toUpperCase().trim();
      // Alleen matchen als het flight-veld op een echte vluchtcode lijkt
      // (3 letters gevolgd door een cijfer). Sluit registraties uit die
      // toevallig in het flight-veld staan (GA/militair, geen vluchtcode).
      if (!/^[A-Z]{3}\d/.test(flight)) return false;
      return flight.startsWith(value.substring(0, 3));
    }
    case 'dbflag': {
      const bit = DB_FLAGS[value.toLowerCase()];
      if (!bit) return false;
      return ((ac.dbFlags || 0) & bit) !== 0;
    }
    default:
      return false;
  }
}