// ══════════════════════════════════════════════════════════════════
// ⭐ PREIS-KONFIGURATION – HIER ALLE PREISE ÄNDERN ⭐
// Diese Werte werden automatisch sowohl für die Berechnung im
// Hintergrund als auch für die Anzeige der Preise auf der
// Preisrechner-Seite verwendet. Du musst NUR HIER etwas ändern.
// Alle Beträge in Euro. Dezimalzahlen mit Punkt schreiben (z.B. 1.5).
// ══════════════════════════════════════════════════════════════════
const PK_MIN_PRICE = 30; // Mindestpreis pro Auftrag

// Grundpreis pro Fenster (beidseitige Reinigung, nur Glas)
const PK_PRICES = {
  klein:  { ein: 2, label: "Kleine Fenster" },
  mittel: { ein: 4, label: "Mittelgroße Fenster" },
  gross:  { ein: 6, label: "Große Fenster" }
};

// Zuschläge pro Fenster, je nach Größenkategorie
const PK_SURCHARGES = {
  klein:  { dach: 1, sprossen: 0.5,   falz: 0.5 },
  mittel: { dach: 2, sprossen: 1, falz: 1 },
  gross:  { dach: 3,   sprossen: 1.5,   falz: 1.5  }
};

// Preise für große zusammenhängende Glasflächen (Wintergarten, Schaufenster etc.), pro m²
const PK_GLASS = { ein: 2, sprossenFix: 1 };
// Hinweis: aktuell gibt es hier keinen Falz/Rahmen/Bank-Zuschlag pro m²,
// nur einen Sprossen-Zuschlag. Falls du auch einen Falz-Zuschlag für
// große Flächen berechnen willst, sag Bescheid – das müsste als neues
// Eingabefeld in preisrechner.html ergänzt werden.

const PK_SURCHARGE_LABELS = {
  dach: "Dachfenster-Zuschlag",
  sprossen: "Sprossen-Zuschlag",
  falz: "Falz/Rahmen/Fensterbank-Zuschlag"
};

function pkFormatEuroPlain(v){
  return v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

// Überträgt die Werte oben automatisch in die sichtbaren Texte auf
// preisrechner.html (Grundpreis-Anzeige, Zuschlag-Badges, Mindestpreis-Hinweis),
// damit Anzeige und Berechnung nie auseinanderlaufen.
function pkSyncDisplayFromConfig(){
  const mindest = document.getElementById('pkp-note-mindestpreis');
  if (mindest) mindest.textContent = pkFormatEuroPlain(PK_MIN_PRICE);

  ["klein", "mittel", "gross"].forEach(cat => {
    const priceLabel = document.getElementById(`pkp-price-${cat}`);
    if (priceLabel) priceLabel.textContent = pkFormatEuroPlain(PK_PRICES[cat].ein) + " beidseitig pro Fenster";
    Object.keys(PK_SURCHARGE_LABELS).forEach(key => {
      const badge = document.getElementById(`pkp-${cat}-${key}-badge`);
      if (badge) badge.textContent = "+" + pkFormatEuroPlain(PK_SURCHARGES[cat][key]);
    });
  });

  const glassLabel = document.getElementById('pkp-glass-price-label');
  if (glassLabel) glassLabel.textContent = "Preis: " + pkFormatEuroPlain(PK_GLASS.ein) + "/m² (beidseitig)";
  const glassSprossenBadge = document.getElementById('pkp-glass-sprossen-fix');
  if (glassSprossenBadge) glassSprossenBadge.textContent = "+" + pkFormatEuroPlain(PK_GLASS.sprossenFix) + "/m²";
}

let mapInitialized = false;

function initRadiusMap() {
  if (mapInitialized) return;
  if (typeof L === 'undefined') return;

  const geocoderCss = document.createElement('link');
  geocoderCss.rel = 'stylesheet';
  geocoderCss.href = 'https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.css';
  document.head.appendChild(geocoderCss);

  const geocoderJs = document.createElement('script');
  geocoderJs.src = 'https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.js';
  geocoderJs.onload = function() {
    buildMap();
  };
  document.head.appendChild(geocoderJs);
}

function buildMap() {
  const tonwerkstrasseCoords = [52.2045, 8.7011];
  const map = L.map('radius-map').setView(tonwerkstrasseCoords, 12);

  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBL, and the GIS User Community'
  }).addTo(map);

  L.circle(tonwerkstrasseCoords, {
    color: '#1E72AF',
    fillColor: '#88C2EC',
    fillOpacity: 0.35,
    radius: 5000
  }).addTo(map);

  const geocoder = L.Control.geocoder({
    defaultMarkGeocode: false,
    placeholder: "Adresse eingeben...",
    errorMessage: "Adresse nicht gefunden."
  })
  .on('markgeocode', function(e) {
    const latlng = e.geocode.center;

    if (window.currentSearchMarker) {
      map.removeLayer(window.currentSearchMarker);
    }

    window.currentSearchMarker = L.marker(latlng, {
      icon: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      })
    })
    .addTo(map)
    .bindPopup('<b>Gesuchte Adresse:</b><br>' + e.geocode.name)
    .openPopup();

    map.panTo(latlng);
  })
  .addTo(map);

  mapInitialized = true;
}

let revealObserver = null;

// Ordnet jeder Seite die Elemente zu, die die Scroll-Einblendung bekommen sollen.
// Startseite hat die Klasse "reveal" bereits direkt im HTML gesetzt,
// bei den anderen Seiten wird sie hier automatisch ergänzt.
const revealSelectorsByPage = {
  leistungen: ['.clean-grid > *', '.pricecalc-card', '.faq-list > *'],
  referenzen: ['.ba-slider-grid > *', '.social-proof-grid > *'],
  kontaktieren: ['.contact-card', '.map-frame', '.hours-box']
};

function ensureRevealClasses(pageId) {
  const selectors = revealSelectorsByPage[pageId];
  if (!selectors) return;
  const page = document.getElementById('page-' + pageId);
  if (!page) return;
  selectors.forEach(function(sel) {
    page.querySelectorAll(sel).forEach(function(el) {
      el.classList.add('reveal');
    });
  });
}

function initScrollReveal(pageId) {
  ensureRevealClasses(pageId);

  const elements = document.querySelectorAll('#page-' + pageId + ' .reveal');
  if (!elements.length) return;

  if (revealObserver) {
    revealObserver.disconnect();
  }
  elements.forEach(function(el) {
    el.classList.remove('is-visible');
  });

  revealObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  elements.forEach(function(el) {
    revealObserver.observe(el);
  });
}

function updateSlider(rangeEl, wrapId, handleId) {
  var v = rangeEl.value;
  var wrap = document.getElementById(wrapId);
  var handle = document.getElementById(handleId);
  if (wrap) wrap.style.clipPath = 'inset(0 0 0 ' + v + '%)';
  if (handle) handle.style.left = v + '%';
}

// ---------- Preisrechner-Status im Kontaktformular ----------
function updatePreisStatus(){
  const btn = document.getElementById('pk-status-btn');
  const title = document.getElementById('pk-status-title');
  const sub = document.getElementById('pk-status-sub');
  const icon = document.getElementById('pk-status-icon');
  const hidden = document.getElementById('preis-ergebnis');
  if (!btn || !hidden) return;
  if (hidden.value && hidden.value.trim() !== ''){
    btn.classList.remove('pending');
    btn.classList.add('done');
    title.textContent = 'Preis berechnet: ' + hidden.value;
    sub.textContent = 'Klicken, um den Preisrechner erneut zu öffnen und Angaben zu ändern';
    icon.textContent = '✓';
  } else {
    btn.classList.remove('done');
    btn.classList.add('pending');
    title.textContent = 'Preis noch nicht berechnet';
    sub.textContent = 'Klicken, um den Preisrechner zu öffnen';
    icon.textContent = '!';
  }
}

// Von der Kontaktseite aus zum Preisrechner wechseln (echte Unterseite)
function openPreisrechnerFromForm(){
  sessionStorage.setItem('pkReturnToKontakt', '1');
  window.location.href = 'preisrechner.html';
}

// ---------- Seiten-Setup beim Laden ----------
document.addEventListener('DOMContentLoaded', function(){
  pkSyncDisplayFromConfig();

  const currentPageEl = document.querySelector('.web-page');
  const currentPageId = currentPageEl ? currentPageEl.id.replace('page-', '') : null;

  if (currentPageId === 'kontaktieren') {
    initRadiusMap();
  }
  if (currentPageId) {
    initScrollReveal(currentPageId);
  }

  // Vom Preisrechner übernommenes Ergebnis in das Kontaktformular einsetzen
  if (currentPageId === 'kontaktieren') {
    const pending = sessionStorage.getItem('pkPendingResult');
    if (pending) {
      try {
        const data = JSON.parse(pending);
        const hiddenTotal = document.getElementById('preis-ergebnis');
        const hiddenDetails = document.getElementById('preis-details');
        if (hiddenTotal) hiddenTotal.value = data.total;
        if (hiddenDetails) hiddenDetails.value = data.details;
      } catch (e) {}
      sessionStorage.removeItem('pkPendingResult');
    }
  }

  updatePreisStatus();
});


// ---------- Standalone Preisrechner (eigene Seite) ----------
(function(){
  const embed = document.getElementById('pkp-embed');
  if (!embed) return;

  // Preise kommen jetzt zentral von oben (PK_PRICES, PK_SURCHARGES, PK_GLASS, PK_MIN_PRICE, PK_SURCHARGE_LABELS)

  function pkFormatEuro(v){
    return v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  }

  const pkCategories = ["klein", "mittel", "gross"];
  pkCategories.forEach(cat => {
    const inputAnzahl = document.getElementById(`pkp-${cat}-anzahl`);
    if (!inputAnzahl) return;
    inputAnzahl.addEventListener("input", () => {
      const val = Math.max(0, parseInt(inputAnzahl.value || 0));
      Object.keys(PK_SURCHARGE_LABELS).forEach(key => {
        const extraInput = document.getElementById(`pkp-${cat}-${key}`);
        extraInput.max = val;
        if (parseInt(extraInput.value) > val) extraInput.value = val;
      });
    });
    Object.keys(PK_SURCHARGE_LABELS).forEach(key => {
      const extraInput = document.getElementById(`pkp-${cat}-${key}`);
      extraInput.addEventListener("input", () => {
        const currentMax = parseInt(extraInput.max || 0);
        let currentVal = parseInt(extraInput.value || 0);
        if (currentVal > currentMax) extraInput.value = currentMax;
      });
    });
  });

  const pkWgM2Input = document.getElementById("pkp-wg-m2-input");
  const pkWgSprossenInput = document.getElementById("pkp-wg-sprossen-slider");
  pkWgM2Input.addEventListener("input", () => {
    const totalM2 = Math.max(0, parseInt(pkWgM2Input.value || 0));
    pkWgSprossenInput.max = totalM2;
    if (parseInt(pkWgSprossenInput.value) > totalM2) pkWgSprossenInput.value = totalM2;
  });
  pkWgSprossenInput.addEventListener("input", () => {
    const maxVal = parseInt(pkWgSprossenInput.max || 0);
    if (parseInt(pkWgSprossenInput.value) > maxVal) pkWgSprossenInput.value = maxVal;
  });

  let pkpLastResult = null;

  function pkpHideToForm(){
    const toBtn = document.getElementById('pkp-to-form-btn');
    if (toBtn) toBtn.classList.remove('visible');
    pkpLastResult = null;
  }

  // Reset bei jeder Änderung
  embed.addEventListener('input', function(e){
    if (e.target.id === 'pkp-calc-btn' || e.target.id === 'pkp-to-form-btn') return;
    pkpHideToForm();
  });

  function pkCalculatePrice(){
    let total = 0;
    let hasWindows = false;
    const breakdown = [];
    const detailsLines = [];

    pkCategories.forEach(cat => {
      const anzahl = Math.max(0, parseInt(document.getElementById(`pkp-${cat}-anzahl`).value || 0));
      if (anzahl <= 0) return;
      hasWindows = true;
      const basePrice = PK_PRICES[cat].ein;
      const sumBase = anzahl * basePrice;
      total += sumBase;
      breakdown.push(`<div class="result-row"><span>${PK_PRICES[cat].label} · ${anzahl}× Grundpreis (beidseitig)</span><span>${pkFormatEuro(sumBase)}</span></div>`);
      detailsLines.push(`${PK_PRICES[cat].label}: ${anzahl}x (${pkFormatEuro(sumBase)})`);
      Object.keys(PK_SURCHARGE_LABELS).forEach(key => {
        let extra = parseInt(document.getElementById(`pkp-${cat}-${key}`).value || 0);
        if (extra > anzahl) extra = anzahl;
        if (extra > 0){
          const add = extra * PK_SURCHARGES[cat][key];
          total += add;
          breakdown.push(`<div class="result-row"><span>${PK_PRICES[cat].label} · ${PK_SURCHARGE_LABELS[key]} (${extra}×)</span><span>+${pkFormatEuro(add)}</span></div>`);
          detailsLines.push(`${PK_PRICES[cat].label} ${PK_SURCHARGE_LABELS[key]}: ${extra}x (+${pkFormatEuro(add)})`);
        }
      });
    });

    const wgM2 = parseFloat(pkWgM2Input.value || 0);
    let wgSprossenM2 = parseFloat(pkWgSprossenInput.value || 0);
    if (wgM2 > 0){
      if (wgSprossenM2 > wgM2) wgSprossenM2 = wgM2;
      const glassBase = wgM2 * PK_GLASS.ein;
      total += glassBase;
      breakdown.push(`<div class="result-row"><span>Glasflächen · ${wgM2} m² Grundpreis (beidseitig)</span><span>${pkFormatEuro(glassBase)}</span></div>`);
      detailsLines.push(`Glasflächen: ${wgM2} m² (${pkFormatEuro(glassBase)})`);
      if (wgSprossenM2 > 0){
        const sprossenAufpreis = wgSprossenM2 * PK_GLASS.sprossenFix;
        total += sprossenAufpreis;
        breakdown.push(`<div class="result-row"><span>Glasflächen · Sprossen-Zuschlag (${wgSprossenM2} m²)</span><span>+${pkFormatEuro(sprossenAufpreis)}</span></div>`);
        detailsLines.push(`Glasflächen Sprossen-Zuschlag: ${wgSprossenM2} m² (+${pkFormatEuro(sprossenAufpreis)})`);
      }
    }

    if (total < PK_MIN_PRICE && (hasWindows || wgM2 > 0)) total = PK_MIN_PRICE;

    const card = document.getElementById("pkp-result-card");
    const outTotal = document.getElementById("pkp-result-total");
    const outBreak = document.getElementById("pkp-result-breakdown");
    const empty = document.getElementById("pkp-result-empty");
    const toBtn = document.getElementById("pkp-to-form-btn");

    card.classList.add("visible");

    if (!hasWindows && wgM2 <= 0){
      outTotal.textContent = pkFormatEuro(0);
      outBreak.innerHTML = "";
      empty.style.display = "block";
      if (toBtn) toBtn.classList.remove('visible');
      pkpLastResult = null;
      return;
    }

    outTotal.textContent = pkFormatEuro(total);
    outBreak.innerHTML = breakdown.join("");
    empty.style.display = "none";

    pkpLastResult = { total: pkFormatEuro(total), details: detailsLines.join(" | ") };
    if (toBtn) toBtn.classList.add('visible');

    card.scrollIntoView({behavior:"smooth", block:"center"});
  }

  document.getElementById("pkp-calc-btn").addEventListener("click", pkCalculatePrice);

  const toFormBtn = document.getElementById("pkp-to-form-btn");
  if (toFormBtn){
    toFormBtn.addEventListener("click", function(){
      if (!pkpLastResult) return;
      sessionStorage.setItem('pkPendingResult', JSON.stringify(pkpLastResult));
      sessionStorage.removeItem('pkReturnToKontakt');
      window.location.href = 'kontakt.html';
    });
  }
})();
