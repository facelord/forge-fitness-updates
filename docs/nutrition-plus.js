/* FORGE Nutrition Plus: BLS 4.0 offline + Open Food Facts online.
 * Data stays in existing FORGE state/backup, not an external account.
 * Missing nutrients remain null, never silently replaced with zero.
 */
(function () {
  'use strict';
  var nutrientKeys = ['cal','protein','carbs','fat','sugar','fiber','sat','mono','poly','polyols','addedSugar','fructose','salt','starch','trans','omega3'];
  var bls = [], blsLoaded = false, currentResults = [], request = null, lastSearch = 0, once = false;
  var norm = function (s) { return String(s || '').toLocaleLowerCase('de-DE').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim(); };
  var el = function (id) { return document.getElementById(id); };

  function getDb() {
    if (!state.forgeNutritionDb || typeof state.forgeNutritionDb !== 'object') {
      state.forgeNutritionDb = {favorites: [], recent: [], products: []};
    }
    var d = state.forgeNutritionDb;
    ['favorites','recent','products'].forEach(function (key) {
      if (!Array.isArray(d[key])) d[key] = [];
    });
    return d;
  }
  function persist() { try { save(); } catch (_) {} }
  function idFor(food) { return food.id || food.source + ':' + (food.code || norm(food.name)); }
  function num(value) {
    if (value === null || value === undefined || value === '') return null;
    var n = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }
  function basicFood(name, source, index, fields) {
    var food = {name:String(name || '').trim(),source:source,code:index || ''};
    nutrientKeys.forEach(function (key) { food[key] = num(fields[key]); });
    food.id = idFor(food);
    return food;
  }
  function validFood(food) { return food && food.name && food.name.length <= 180; }
  function shortSource(food) {
    return food.source === 'bls' ? 'BLS 4.0 · Durchschnitt' :
      food.source === 'off' ? 'Open Food Facts · Markenprodukt' :
      food.source === 'custom' ? 'Eigener Eintrag' :
      food.source === 'base' ? 'FORGE · Basisdaten' : 'Gespeichert';
  }

  function parseBls(item) {
    if (!Array.isArray(item) || item.length < 6) return null;
    var vals = {};
    // code, German description, kcal, protein, carbs, fat, sugar, fiber,
    // saturated, monounsaturated, polyunsaturated, polyols.
    ['cal','protein','carbs','fat','sugar','fiber','sat','mono','poly','polyols']
      .forEach(function(k,i) { vals[k] = item[i + 2]; });
    return basicFood(item[1], 'bls', item[0], vals);
  }
  function localFoodBase() {
    var entries = [];
    try {
      customFoods().forEach(function(f,i) {
        var x = basicFood(f.name,'custom',String(i),f);
        x.id = 'custom:' + norm(f.name); entries.push(x);
      });
      FOOD_DB.forEach(function(f,i) { entries.push(basicFood(f.name,'base',String(i),f)); });
    } catch (e) { console.warn('FORGE local database',e); }
    return entries;
  }
  function allSearchCandidates() {
    var db = getDb();
    return [].concat(db.favorites, db.recent, db.products, localFoodBase(), bls);
  }
  function quality(food) {
    var missing = ['cal','protein','carbs','fat'].filter(function(k) { return num(food[k]) === null; });
    return missing.length ? 'Fehlen: ' + missing.join(', ') : Math.round(food.cal) + ' kcal · ' +
      Number(food.protein).toLocaleString('de-DE',{maximumFractionDigits:1}) + ' g Protein / 100 g';
  }
  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function button(text, fn, css) {
    var b = make('button','btn ' + (css || 'alt'),text);
    b.type = 'button';
    b.addEventListener('click',fn);
    return b;
  }
  function notice(text) {
    var box = el('forgeNutritionNotice');
    if (box) box.textContent = text;
  }
  function favorites() { return getDb().favorites; }
  function isFavorite(food) { return favorites().some(function(f) { return idFor(f) === idFor(food); }); }
  function toggleFavorite(food) {
    var db = getDb(), id = idFor(food);
    var exists = db.favorites.some(function(f){return idFor(f)===id;});
    db.favorites = exists ? db.favorites.filter(function(f){return idFor(f)!==id;}) : [food].concat(db.favorites).slice(0,40);
    persist(); renderCollections(); renderResults(currentResults);
  }
  function remember(food) {
    var db = getDb(), id = idFor(food);
    db.recent = [food].concat(db.recent.filter(function(f){return idFor(f)!==id;})).slice(0,20);
    if (food.source === 'off') {
      db.products = [food].concat(db.products.filter(function(f){return idFor(f)!==id;})).slice(0,60);
    }
    persist(); renderCollections();
  }
  function openSection(name) {
    var compose = document.querySelector('#nutrition details[data-food-section="compose"]');
    if (compose) compose.open = true;
    var field = document.querySelector('#nutrition details[data-food-section="' + name + '"]');
    if (field) { field.open = true; field.scrollIntoView({behavior:'smooth',block:'start'}); }
  }
  function choose(food) {
    if (!validFood(food)) return;
    remember(food);
    var name = el('ingredientName');
    if (!name) { notice('Zutatenformular nicht gefunden.'); return; }
    name.value = food.name;
    nutrientKeys.forEach(function (key) {
      var id = 'ingredient' + key.charAt(0).toUpperCase() + key.slice(1);
      var input = el(id);
      if (input) input.value = num(food[key]) === null ? '' : String(food[key]);
    });
    var sweetener = el('ingredientSweetener');
    if (sweetener) sweetener.value = food.sweetener || '';
    var grams = el('ingredientGrams');
    if (grams) grams.value = '';
    try { forgePortionDetect(true); } catch (_) {}
    openSection('ingredient');
    notice(food.name + ' übernommen. Menge eingeben und Nährwerte prüfen.');
    if (['cal','protein','carbs','fat'].some(function(k){return num(food[k])===null;})) {
      notice('Bei ' + food.name + ' fehlen Pflichtwerte. Bitte fehlende Werte vom Etikett ergänzen.');
    }
    if (grams) grams.focus();
  }
  function score(food,q) {
    var n = norm(food.name), words = q.split(/\s+/).filter(Boolean);
    if (!words.every(function(w){return n.includes(w);})) return -1;
    var s = n === q ? 100 : n.startsWith(q) ? 70 : n.includes(q) ? 42 : 15;
    if (food.source === 'custom') s += 14;
    if (isFavorite(food)) s += 13;
    if (food.source === 'bls') s += 4;
    return s;
  }
  function search(q) {
    q = norm(q);
    if (!q || q.length < 2) {
      currentResults = []; renderResults([]); return;
    }
    var seen = new Set();
    currentResults = allSearchCandidates()
      .map(function(f){return {f:f,score:score(f,q)};})
      .filter(function(x){return x.score >= 0;})
      .sort(function(a,b){return b.score-a.score || a.f.name.length-b.f.name.length;})
      .filter(function(x) {
        var key = idFor(x.f);
        if (seen.has(key)) return false;
        seen.add(key); return true;
      }).slice(0,24).map(function(x){return x.f;});
    renderResults(currentResults);
  }
  function renderResults(results) {
    var wrap = el('forgeNutritionResults'); if (!wrap) return;
    wrap.replaceChildren();
    if (!results.length) return;
    var label = make('p','forge-nutri-search-count', results.length + ' Treffer (bis zu 24 angezeigt)');
    wrap.appendChild(label);
    results.forEach(function (food) {
      var row = make('div','forge-nutri-result');
      var info = make('div','forge-nutri-info');
      info.appendChild(make('strong','',food.name));
      info.appendChild(make('small','',shortSource(food) + ' · ' + quality(food)));
      var controls = make('div','forge-nutri-controls');
      var star = button(isFavorite(food)?'★':'☆',function(){toggleFavorite(food);},'alt');
      star.setAttribute('aria-label',isFavorite(food)?'Favorit entfernen':'Als Favorit speichern');
      controls.appendChild(star);
      controls.appendChild(button('Übernehmen',function(){choose(food);},''));
      row.append(info,controls); wrap.appendChild(row);
    });
  }
  function renderCollections() {
    [['forgeNutritionFavorites',favorites()],['forgeNutritionRecent',getDb().recent]].forEach(function(set) {
      var wrap = el(set[0]); if (!wrap) return;
      wrap.replaceChildren();
      if (!set[1].length) { wrap.appendChild(make('p','forge-nutri-empty','Noch keine Einträge.')); return; }
      set[1].slice(0,10).forEach(function(food){
        var b = button(food.name, function(){choose(food);}, 'alt');
        wrap.appendChild(b);
      });
    });
  }
  function productFromOff(o) {
    if (!o || !o.nutriments) return null;
    var n = o.nutriments;
    var kcal = num(n['energy-kcal_100g']);
    // If only kJ is present, conversion is explicitly marked as derived.
    var derived = false;
    if (kcal === null && num(n.energy_100g) !== null) {
      kcal = Math.round(num(n.energy_100g) / 4.184);
      derived = true;
    }
    var fields = {
      cal:kcal, protein:n.proteins_100g, carbs:n.carbohydrates_100g,
      fat:n.fat_100g, sugar:n.sugars_100g, fiber:n.fiber_100g,
      sat:n['saturated-fat_100g'], mono:n['monounsaturated-fat_100g'],
      poly:n['polyunsaturated-fat_100g'], polyols:n.polyols_100g,
      salt:n.salt_100g, starch:n.starch_100g, trans:n['trans-fat_100g'],
      omega3:n['omega-3-fat_100g'], fructose:n.fructose_100g
    };
    var name = (o.product_name_de || o.product_name || '').trim(), brand = (o.brands || '').trim();
    if (!name) return null;
    var food = basicFood((brand && !norm(name).includes(norm(brand)) ? brand+' · ':'')+name,'off',String(o.code||''),fields);
    food.brand = brand; food.serving = o.serving_size || ''; food.derivedEnergy = derived;
    return food;
  }
  function showOnlineFood(data, byBarcode) {
    var raw = byBarcode ? (data && data.status === 1 ? [data.product] : []) :
      (data && Array.isArray(data.products) ? data.products : []);
    var foods = raw.map(productFromOff).filter(validFood);
    if (!foods.length) {
      notice(byBarcode ? 'Produkt nicht gefunden oder ohne Nährwertangaben. Du kannst das Etikett fotografieren.' :
        'Keine passenden Markenprodukte gefunden. Versuche einen anderen Suchbegriff.');
      return;
    }
    currentResults = foods;
    renderResults(foods);
    if (byBarcode && foods.length === 1) {
      choose(foods[0]);
      notice('Barcode gefunden: ' + foods[0].name + '. Angaben und Menge bitte überprüfen.');
    } else notice(foods.length + ' Markenprodukte von Open Food Facts. Angaben vor dem Speichern prüfen.');
  }
  function callOff(arg, byBarcode) {
    if (!arg) return;
    if (byBarcode) {
      var locallySaved = getDb().products.find(function(p){ return String(p.code) === String(arg).trim(); });
      if (locallySaved) {
        choose(locallySaved);
        notice('Bereits gespeicherter Markenartikel (offline): ' + locallySaved.name + '. Nährwertangaben prüfen.');
        return;
      }
    }
    if (!byBarcode && norm(arg).length < 3) { notice('Für die Onlinesuche mindestens 3 Zeichen eingeben.'); return; }
    if (request) { notice('Eine Anfrage läuft bereits.'); return; }
    if (!byBarcode && Date.now() - lastSearch < 6500) {
      notice('Bitte kurz zwischen zwei Online-Suchen warten (API-Limit).'); return;
    }
    if (!window.ForgeAndroid || typeof window.ForgeAndroid.queryFoodFacts !== 'function') {
      notice('Die Online-Datenbank benötigt die neue Android-App-Version und Internet.');
      return;
    }
    lastSearch = Date.now();
    request = {id:'f' + lastSearch, byBarcode:byBarcode};
    notice('Suche bei Open Food Facts …');
    try { window.ForgeAndroid.queryFoodFacts(String(arg),request.id,byBarcode); }
    catch(e) { request = null; notice('Online-Abfrage konnte nicht gestartet werden.'); }
  }
  window.forgeOffApiResponse = function(id, result) {
    if (!request || request.id !== id) return;
    var byBarcode = request.byBarcode; request = null;
    try {
      if (typeof result === 'string') result = JSON.parse(result);
      if (result && result.error) { notice('Open Food Facts: ' + String(result.error).slice(0,130)); return; }
      showOnlineFood(result,byBarcode);
    } catch(e) { notice('Online-Produktdaten konnten nicht verarbeitet werden.'); }
  };
  window.forgeBarcodeDetected = function(value) {
    var code = String(value || '').trim();
    var input = el('forgeNutritionBarcode');
    if (input) input.value = code;
    if (!/^\d{8,14}$/.test(code)) {
      notice('Nur numerische EAN-/GTIN-Barcodes von Lebensmitteln werden unterstützt.'); return;
    }
    callOff(code,true);
  };
  window.forgeBarcodeScanError = function(error) {
    notice('Barcodekamera nicht verfügbar. EAN unten eintippen. ' + String(error||'').slice(0,100));
  };
  window.forgeNutritionOcrResult = function(result, error) {
    var s = el('scanStatus');
    if (error) { if (s) s.textContent = 'Texterkennung fehlgeschlagen: ' + String(error).slice(0,100); return; }
    var text = el('ocrText');
    if (text) text.value = String(result || '');
    if (!String(result || '').trim()) { if (s) s.textContent = 'Kein Text erkannt. Bitte schärfer fotografieren.'; return; }
    try { parseLabelText(); }
    catch (e) { if (s) s.textContent = 'Text erkannt. Bitte Nährwerte manuell prüfen.'; }
  };
  function installOfflineOcr() {
    if (!window.ForgeAndroid || typeof window.ForgeAndroid.scanNutritionImage !== 'function') return;
    window.scanCroppedLabel = function () {
      var base = el('cropCanvas'), s = el('scanStatus');
      if (!base || !base.width) { if (s) s.textContent = 'Bitte zuerst ein Foto auswählen.'; return; }
      var l = Number(el('cropL').value)/100, t=Number(el('cropT').value)/100;
      var w = Math.min(Number(el('cropW').value)/100,1-l);
      var h = Math.min(Number(el('cropH').value)/100,1-t);
      if(w<=0||h<=0)return;
      var canvas=document.createElement('canvas');
      canvas.width=Math.min(1600,Math.max(1,Math.round(base.width*w*2)));
      canvas.height=Math.min(1600,Math.max(1,Math.round(base.height*h*2)));
      var ctx=canvas.getContext('2d');
      ctx.filter='grayscale(1) contrast(1.5)';
      ctx.drawImage(base,base.width*l,base.height*t,base.width*w,base.height*h,0,0,canvas.width,canvas.height);
      if (s) s.textContent = 'Nährwerttabelle wird offline gelesen …';
      try { window.ForgeAndroid.scanNutritionImage(canvas.toDataURL('image/jpeg',0.82)); }
      catch(e) { if(s)s.textContent = 'Foto konnte nicht gelesen werden.'; }
    };
  }

  function buildUI() {
    if (once) return;
    var master = el('forge-nutrition-master');
    if (!master) return;
    once = true;
    var panel = make('div','forge-nutri-panel');
    panel.id = 'forgeNutritionSearchPanel';
    panel.appendChild(make('h3','', 'Lebensmittel finden'));
    var field = make('input','forge-nutri-query');
    field.id = 'forgeNutritionQuery'; field.placeholder='Lebensmittel, Marke oder Zutat suchen';
    field.setAttribute('aria-label','Lebensmittel suchen');
    field.autocomplete = 'off';
    field.addEventListener('input',function(){search(field.value);});
    panel.appendChild(field);

    var buttons = make('div','forge-nutri-actions');
    buttons.appendChild(button('▥ Barcode scannen',function(){
      if (window.ForgeAndroid && typeof window.ForgeAndroid.scanBarcode === 'function') window.ForgeAndroid.scanBarcode();
      else notice('Barcodekamera benötigt die aktuelle FORGE-Android-App.');
    },''));
    buttons.appendChild(button('📷 Foto',function(){
      openSection('scan');
      var camera = el('labelPhoto'); if (camera) camera.click();
    },'alt'));
    buttons.appendChild(button('⌕ Online suchen',function(){callOff(field.value,false);},'alt'));
    panel.appendChild(buttons);

    var codeRow = make('div','forge-nutri-barcode-line');
    var code = make('input','');
    code.id = 'forgeNutritionBarcode'; code.placeholder='EAN/GTIN alternativ eingeben';
    code.setAttribute('inputmode','numeric'); code.setAttribute('aria-label','Barcode eingeben');
    code.maxLength = 14;
    codeRow.appendChild(code);
    codeRow.appendChild(button('Suchen',function(){
      if (!/^\d{8,14}$/.test(code.value.trim())) {
        notice('EAN/GTIN muss 8 bis 14 Ziffern enthalten.'); return;
      }
      callOff(code.value.trim(),true);
    },'alt'));
    panel.appendChild(codeRow);

    var status = make('p','forge-nutri-notice','BLS-Daten werden geladen …');
    status.id='forgeNutritionNotice';status.setAttribute('role','status');
    panel.appendChild(status);
    var results = make('div','forge-nutri-results'); results.id='forgeNutritionResults';panel.appendChild(results);
    [['forgeNutritionFavorites','★ Favoriten'],['forgeNutritionRecent','⏱ Zuletzt verwendet']].forEach(function(tuple){
      var details = make('details','forge-nutri-fold');
      var summary = make('summary','',tuple[1]);
      var content = make('div','forge-nutri-chips');content.id=tuple[0];
      details.append(summary,content);panel.appendChild(details);
    });
    var credit=make('p','forge-nutri-credit');
    credit.appendChild(document.createTextNode('Basis: Max Rubner-Institut (2025), BLS 4.0, CC BY 4.0 · DOI 10.25826/Data20251217-134202-0. Markenartikel: Open Food Facts (ODbL), Community-Daten. Fehlende Angaben sind keine Nullwerte.'));
    panel.appendChild(credit);
    var header = master.querySelector('.forge-nutrition-master-head');
    if (header) header.after(panel); else master.prepend(panel);
    renderCollections();

    var css = document.createElement('style');
    css.id = 'forge-nutrition-plus-css';
    css.textContent = [
      '#nutrition .forge-nutri-panel{padding:14px 0 18px;border-top:1px solid #30464a}',
      '#nutrition .forge-nutri-panel h3{font-size:16px;margin:0 0 12px}',
      '#nutrition .forge-nutri-query{width:100%;min-height:50px}',
      '.forge-nutri-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:10px 0}',
      '.forge-nutri-actions .btn{min-height:53px;padding:10px 5px;font-size:12px;white-space:normal}',
      '.forge-nutri-barcode-line{display:flex;gap:8px;margin:10px 0}',
      '.forge-nutri-barcode-line input{flex:1;min-width:0;min-height:44px}',
      '.forge-nutri-notice{font-size:12px;color:#b7c9c4;line-height:1.5;min-height:19px;margin:8px 0}',
      '.forge-nutri-result{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 0;border-top:1px solid #344850}',
      '.forge-nutri-info{min-width:0;flex:1;line-height:1.3}',
      '.forge-nutri-info strong{display:block;font-size:13px;color:#f0f6f3;overflow-wrap:anywhere}',
      '.forge-nutri-info small{display:block;color:#aabfbb;line-height:1.5;margin-top:5px;font-size:11px}',
      '.forge-nutri-controls{display:flex;gap:6px;align-items:center;flex-shrink:0}',
      '.forge-nutri-controls .btn{min-height:43px;font-size:12px;padding:8px}',
      '.forge-nutri-search-count{font-size:12px;color:#aebdbb}',
      '.forge-nutri-fold{background:transparent;border:0;border-top:1px solid #30434b;margin:0;box-shadow:none}',
      '.forge-nutri-fold summary{cursor:pointer;min-height:48px;padding:13px 3px;color:#ecf5f1;font-weight:700;list-style:none}',
      '.forge-nutri-fold summary::-webkit-details-marker{display:none}',
      '.forge-nutri-fold summary::after{content:"⌄";float:right;color:#a8f55d;font-size:20px}',
      '.forge-nutri-fold[open] summary::after{transform:rotate(180deg)}',
      '.forge-nutri-chips{padding:7px 0 12px;display:flex;flex-wrap:wrap;gap:7px}',
      '.forge-nutri-chips .btn{font-size:12px;white-space:normal;line-height:1.4}',
      '.forge-nutri-empty,.forge-nutri-credit{color:#9fb3b5;font-size:11px;line-height:1.6}',
      '#nutrition details[data-food-section="search"]{display:none}',
      '@media(max-width:385px){.forge-nutri-actions{grid-template-columns:1fr 1fr}.forge-nutri-actions>.btn:last-child{grid-column:1/-1}}'
    ].join('');
    document.head.appendChild(css);
  }

  function loadBls() {
    fetch('./bls-foods.json',{cache:'force-cache'}).then(function(r){
      if (!r.ok) throw Error('BLS unavailable');return r.json();
    }).then(function(data){
      if (!data || !Array.isArray(data.foods) || data.foods.length < 7000) throw Error('Invalid BLS');
      bls = data.foods.map(parseBls).filter(validFood);
      blsLoaded = true;
      notice(bls.length.toLocaleString('de-DE') + ' BLS-Lebensmittel offline bereit · Markensuche online.');
      var q=el('forgeNutritionQuery'); if(q && q.value.trim()) search(q.value);
    }).catch(function(){
      notice('BLS-Daten derzeit nicht geladen. Basislebensmittel und eigene Einträge bleiben verfügbar.');
    });
  }

  function start() {
    try { getDb(); } catch(e) { console.warn('FORGE nutrition state',e); }
    installOfflineOcr();
    var count=0;
    function boot() {
      buildUI();
      if (once) { loadBls(); return; }
      if (++count < 30) setTimeout(boot,100);
    }
    boot();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();