/* FORGE Nutrition UI + scanner v2. Works with legacy and v62 generated sections.
   Keeps existing OCR/crop handlers, nutrition state and file storage untouched. */
(function () {
  'use strict';
  var initializedScanner = false;
  var initializedLayout = false;

  function qs(selector, root) { return (root || document).querySelector(selector); }
  function showScanError(message) {
    var status = qs('#scanStatus');
    if (status) status.textContent = message;
  }

  function nativeFileInput(input) {
    // A visually hidden, but present input works with Android WebChromeClient.
    input.style.position = 'absolute';
    input.style.width = '1px';
    input.style.height = '1px';
    input.style.opacity = '0';
    input.style.overflow = 'hidden';
    input.style.pointerEvents = 'none';
    input.style.left = '-10000px';
    input.setAttribute('tabindex', '-1');
  }

  function openInput(input) {
    if (!input) return;
    try {
      input.value = '';
      input.click();
    } catch (err) {
      showScanError('Fotoauswahl konnte nicht geöffnet werden. Bitte erneut versuchen.');
    }
  }

  function expandToScan() {
    var compose = qs('#nutrition details[data-food-section="compose"]');
    if (compose) compose.open = true;
    var scan = qs('#nutrition details[data-food-section="scan"]');
    if (scan) {
      scan.open = true;
      scan.scrollIntoView({behavior: 'smooth', block: 'nearest'});
    } else {
      var input = qs('#labelPhoto');
      if (input) input.scrollIntoView({behavior: 'smooth', block: 'center'});
    }
  }

  function scannerControls() {
    if (initializedScanner) return true;
    var cameraInput = qs('#labelPhoto');
    if (!cameraInput) return false;
    var card = cameraInput.closest('.card') || cameraInput.parentElement;
    if (!card) return false;

    // The two actions must stay separate: capture opens the camera, no capture
    // opens the Android gallery/document picker. The built-in OCR gets the file.
    cameraInput.type = 'file';
    cameraInput.accept = 'image/*';
    cameraInput.setAttribute('capture', 'environment');
    nativeFileInput(cameraInput);

    var galleryInput = document.createElement('input');
    galleryInput.type = 'file';
    galleryInput.id = 'forgeScanGallery';
    galleryInput.accept = 'image/*';
    galleryInput.removeAttribute('capture');
    galleryInput.setAttribute('aria-label', 'Foto aus Galerie auswählen');
    nativeFileInput(galleryInput);
    galleryInput.addEventListener('change', function (event) {
      if (!galleryInput.files || !galleryInput.files.length) return;
      if (typeof window.prepareLabelCrop !== 'function') {
        showScanError('Die Bildverarbeitung ist noch nicht bereit. Bitte die App neu öffnen.');
        return;
      }
      try {
        Promise.resolve(window.prepareLabelCrop(event)).catch(function () {
          showScanError('Das Foto konnte nicht gelesen werden. Bitte ein anderes Bild auswählen.');
        });
      } catch (err) {
        showScanError('Bild konnte nicht verarbeitet werden.');
      }
    });

    var actions = qs('#forge-scan-actions');
    if (actions) actions.remove();
    actions = document.createElement('div');
    actions.id = 'forge-scan-actions';
    actions.className = 'forge-scan-actions';
    actions.setAttribute('role', 'group');
    actions.setAttribute('aria-label', 'Nährwertfoto aufnehmen oder auswählen');

    function action(label, className, target) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn ' + className;
      button.textContent = label;
      button.addEventListener('click', function () { openInput(target); });
      return button;
    }
    actions.appendChild(action('📷 Kamera öffnen', '', cameraInput));
    actions.appendChild(action('🖼️ Foto hochladen', 'alt', galleryInput));
    cameraInput.parentNode.insertBefore(galleryInput, cameraInput);
    cameraInput.parentNode.insertBefore(actions, cameraInput);

    // Opening the scanner accordion is the camera shortcut. Closing it must
    // never launch another camera intent.
    var scanSection = cameraInput.closest('details[data-food-section="scan"]');
    if (scanSection) {
      var summary = qs(':scope > summary', scanSection);
      if (summary && !summary.dataset.forgeCameraOpen) {
        summary.dataset.forgeCameraOpen = '1';
        summary.addEventListener('click', function (event) {
          if (!scanSection.open && !event.defaultPrevented) openInput(cameraInput);
        });
      }
    }

    var note = document.createElement('p');
    note.className = 'forge-scan-tip';
    note.textContent = 'Nährwerttabelle fotografieren oder ein Bild auswählen, den Ausschnitt markieren und anschließend „Nur markierten Bereich scannen“ wählen. Für die Texterkennung ist Internet erforderlich.';
    cameraInput.parentNode.insertBefore(note, actions);

    initializedScanner = true;
    return true;
  }

  function makeSection(key, title, content, open) {
    var details = document.createElement('details');
    details.className = 'forge-food-section';
    details.dataset.foodSection = key;
    details.open = !!open;
    var summary = document.createElement('summary');
    summary.textContent = title;
    var body = document.createElement('div');
    body.className = 'forge-food-section-body';
    body.appendChild(content);
    details.appendChild(summary);
    details.appendChild(body);
    return details;
  }

  function compactLegacyCompose(compose) {
    // Only needed if the legacy fold initializer never created child accordions.
    if (!compose || qs('[data-food-section="scan"]', compose)) return;
    var panel = qs('#mealName', compose);
    var input = qs('#labelPhoto', compose);
    if (!panel || !input) return;
    var oldCard = panel.closest('.card');
    if (!oldCard) return;
    var groups = [
      ['search', '🔎 Lebensmittel suchen', '#foodSearch'],
      ['scan', '📷 Nährwerttabelle scannen', '#labelPhoto'],
      ['custom', '⭐ Eigene Lebensmittel', '#customFoodsList']
    ];
    groups.forEach(function (entry) {
      var child = qs(entry[2], oldCard);
      var card = child && child.closest('.card');
      if (card && card !== oldCard && !card.closest('details[data-food-section]')) {
        var section = makeSection(entry[0], entry[1], card, false);
        oldCard.appendChild(section);
      }
    });
  }

  function unifyNutrition() {
    if (initializedLayout) return true;
    var root = qs('#nutrition');
    if (!root) return false;
    var wraps = Array.from(root.children).filter(function (element) {
      return element.classList.contains('forge-fold');
    });
    var cards = Array.from(root.children).filter(function (element) {
      return element.classList.contains('card');
    });
    // Wait until the legacy fold code has had a chance to initialize.
    if (wraps.length < 3 && cards.length < 3) return false;

    var first = wraps[0] || cards[0];
    var master = document.createElement('div');
    master.className = 'card forge-nutrition-master';
    master.id = 'forge-nutrition-master';
    var header = document.createElement('div');
    header.className = 'forge-nutrition-master-head';
    var title = document.createElement('h2');
    title.textContent = '🍽️ Ernährung & Zutaten';
    var scan = document.createElement('button');
    scan.type = 'button';
    scan.className = 'btn forge-nutrition-scan';
    scan.textContent = '📷 Zutat scannen';
    scan.addEventListener('click', function () {
      expandToScan();
      openInput(qs('#labelPhoto'));
    });
    header.append(title, scan);
    master.appendChild(header);
    first.before(master);

    var sections = [];
    wraps.forEach(function (wrapper) {
      var details = qs(':scope > details', wrapper);
      if (details) {
        sections.push(details);
        master.appendChild(details);
        wrapper.remove();
      }
    });

    // Older builds may have not yet transformed plain cards into fold details.
    if (!sections.length) {
      var configs = [
        ['today', '📊 Tagesbilanz & Nährwerte', true],
        ['targets', '🎯 Meine Tagesziele', false],
        ['compose', '🥗 Mahlzeit erfassen', false],
        ['backup', '💾 Datensicherung', false]
      ];
      cards.slice(0, configs.length).forEach(function (card, i) {
        var conf = configs[i];
        var details = makeSection(conf[0], conf[1], card, conf[2]);
        master.appendChild(details);
        sections.push(details);
      });
    }

    var repeat = Array.from(root.children).find(function (element) {
      return element.matches('details[data-food-section="repeat"]');
    });
    if (repeat) master.appendChild(repeat);

    // Place common tasks in a predictable order without nesting another card.
    ['today', 'compose', 'repeat', 'targets', 'backup'].forEach(function (key) {
      var part = Array.from(master.children).find(function (element) {
        return element.matches && element.matches('details[data-food-section="' + key + '"]');
      });
      if (part) master.appendChild(part);
    });

    var compose = qs('#nutrition details[data-food-section="compose"]');
    compactLegacyCompose(compose);
    var tiles = qs('#nutrition .forge-food-actions');
    if (tiles) tiles.remove();
    root.dataset.forgeNutritionUnified = '1';
    initializedLayout = true;
    return true;
  }

  function addStyles() {
    if (qs('#forge-nutrition-simple-style')) return;
    var style = document.createElement('style');
    style.id = 'forge-nutrition-simple-style';
    style.textContent = [
      '#nutrition .forge-nutrition-master{border:1px solid #40505a;border-radius:20px;background:#17232d;padding:14px 16px;margin:16px 0;box-shadow:none}',
      '.forge-nutrition-master-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:3px 0 14px}',
      '.forge-nutrition-master-head h2{font-size:18px;margin:0;line-height:1.3}',
      '#nutrition .forge-nutrition-scan{min-height:44px;padding:9px 12px;white-space:normal;font-size:13px;flex-shrink:0}',
      '#nutrition .forge-nutrition-master>details{display:block;box-shadow:none!important;background:transparent!important;border:0!important;border-top:1px solid #34434c!important;border-radius:0!important;margin:0!important;padding:0!important;overflow:visible}',
      '#nutrition .forge-nutrition-master>details>summary{display:flex;align-items:center;min-height:57px;margin:0!important;padding:14px 5px!important;background:transparent!important;border:0!important;font-size:15px;list-style:none;cursor:pointer}',
      '#nutrition .forge-nutrition-master>details>summary::-webkit-details-marker{display:none}',
      '#nutrition .forge-nutrition-master .forge-fold-body{padding:6px 0 14px!important}',
      '#nutrition .forge-nutrition-master .forge-fold-body>.card{border:0!important;background:transparent!important;border-radius:0!important;margin:0!important;padding:0!important;box-shadow:none!important}',
      '#nutrition .forge-nutrition-master .forge-food-section{background:transparent!important;border:0!important;border-top:1px solid #31424a!important;border-radius:0!important;margin:0!important;box-shadow:none!important;overflow:visible}',
      '#nutrition .forge-nutrition-master .forge-food-section>summary{min-height:54px;padding:13px 4px!important;border:0!important;background:transparent!important;font-size:14px}',
      '#nutrition .forge-nutrition-master .forge-food-section-body{padding:8px 0 16px!important}',
      '#nutrition .forge-nutrition-master .forge-food-section-body>.card,#nutrition .forge-nutrition-master .forge-food-section-body .card{background:transparent!important;border:0!important;border-radius:0!important;padding:0!important;box-shadow:none!important}',
      '#nutrition .forge-nutrition-master .forge-food-section-body>.card>h3:first-child{display:none}',
      '#nutrition .forge-nutrition-master .forge-nutrition-shortcut{background:transparent!important}',
      '.forge-scan-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0}',
      '.forge-scan-actions .btn{min-height:52px;white-space:normal;padding:11px 9px;line-height:1.3}',
      '.forge-scan-actions .btn:focus-visible,.forge-nutrition-scan:focus-visible{outline:3px solid #a8f55d;outline-offset:2px}',
      '.forge-scan-tip{font-size:13px;line-height:1.5;color:#b9ccca;margin:10px 0}',
      '@media(max-width:390px){.forge-nutrition-master-head{align-items:stretch;flex-direction:column}.forge-scan-actions{grid-template-columns:1fr 1fr}}',
      '@media(max-width:325px){.forge-scan-actions{grid-template-columns:1fr}}'
    ].join('');
    document.head.appendChild(style);
  }

  function start() {
    addStyles();
    // The embedded HTML and older builds create their accordion asynchronously.
    // The scanner itself can always work, even if this transformation fails.
    var retries = 0;
    function tryMount() {
      var scanner = scannerControls();
      var layout = unifyNutrition();
      if (scanner && layout) return;
      if (++retries < 30) window.setTimeout(tryMount, 100);
    }
    tryMount();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, {once: true});
  } else {
    start();
  }
})();
