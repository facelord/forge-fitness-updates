/* FORGE nutrition detail interface v14.7.
   Complements existing BLS / Open Food Facts library and scanner (nutrition-plus.js).
   Missing data are never interpreted as zero. Existing saved records are untouched.
*/
(function () {
  'use strict';
  const fields = {
    cal: ['Energie', 'kcal'], protein: ['Protein', 'g'], carbs: ['Kohlenhydrate', 'g'],
    fat: ['Fett', 'g'], sugar: ['davon Zucker', 'g'], fiber: ['Ballaststoffe', 'g'],
    sat: ['davon gesättigt', 'g'], mono: ['einfach ungesättigt', 'g'],
    poly: ['mehrfach ungesättigt', 'g'], salt: ['Salz', 'g'],
    starch: ['Stärke', 'g'], trans: ['Transfette', 'g'], omega3: ['Omega-3', 'g'],
    addedSugar: ['davon zugesetzter Zucker', 'g'], fructose: ['Fruktose', 'g'],
    polyols: ['mehrwertige Alkohole', 'g']
  };
  const extraKeys = ['salt', 'starch', 'trans', 'omega3'];
  const baseKeys = ['cal', 'protein', 'carbs', 'fat', 'sugar', 'fiber', 'sat', 'mono', 'poly',
    'addedSugar', 'fructose', 'polyols'];
  const allKeys = [...baseKeys, ...extraKeys];
  const fieldID = k => 'ingredient' + k.charAt(0).toUpperCase() + k.slice(1);
  const byId = id => document.getElementById(id);
  const valid = v => v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v)) && Number(v) >= 0;
  const num = v => valid(v) ? Number(v) : null;
  const fmt = (v,unit='g') => valid(v) ? (unit==='kcal' ? Math.round(Number(v)).toLocaleString('de-DE') : Number(v).toLocaleString('de-DE',{maximumFractionDigits:2})) + ' ' + unit : '—';
  const html = s => String(s??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let selectedSource = null;

  function detailFields() {
    const main=byId('ingredientCal'); if (!main) return;
    const form=main.closest('.formgrid'); if (!form || form.dataset.forgeNutriV2) return;
    form.dataset.forgeNutriV2='1';
    const names = {
      salt:'Salz / 100 g',starch:'Stärke / 100 g (optional)',
      trans:'Transfettsäuren / 100 g (optional)',omega3:'Omega-3-Fettsäuren / 100 g (optional)'
    };
    for (const key of extraKeys) {
      const wrap=document.createElement('div');
      const label=document.createElement('label');label.htmlFor=fieldID(key);label.textContent=names[key];
      const inp=document.createElement('input');inp.id=fieldID(key);inp.type='number';inp.min='0';inp.step='0.01';
      inp.inputMode='decimal';inp.placeholder='Keine Angabe';
      wrap.append(label,inp);form.append(wrap);
    }
    const tiles = Array.from(form.children);
    const getTile = id => tiles.find(n=>n.querySelector?.('#'+id)) || null;
    const groupData = [
      ['🍬 Kohlenhydrate & Zucker','Was steckt in den Kohlenhydraten?', ['Sugar','Starch','AddedSugar','Fructose','Polyols','Sweetener']],
      ['🥑 Fettarten','Details zu gesättigten und ungesättigten Fetten', ['Sat','Mono','Poly','Trans','Omega3']],
      ['🌾 Ballaststoffe & Salz','Weitere Angaben vom Etikett', ['Fiber','Salt']]
    ];
    let previousFold=form;
    for (const [title,hint,names] of groupData) {
      const fold=document.createElement('details');fold.className='forge-nutri-extra';
      const summary=document.createElement('summary');summary.textContent=title;
      const note=document.createElement('p');note.className='forge-nutri-hint';note.textContent=hint+' · Leere Felder bleiben unbekannt.';
      const grid=document.createElement('div');grid.className='forge-nutri-extra-grid';
      for (const n of names) { const tile=getTile('ingredient'+n); if (tile) grid.append(tile); }
      fold.append(summary,note,grid);previousFold.after(fold);previousFold=fold;
    }
    const mainLabel=document.createElement('div');mainLabel.className='forge-nutri-basic-label';
    mainLabel.textContent='Basiswerte · je 100 g (bei Getränken ggf. je 100 ml)';
    form.before(mainLabel);
    const explanation=document.createElement('p');explanation.className='forge-nutri-hint';
    explanation.textContent='Auf Verpackungen sind Kalorien, Fett, gesättigte Fettsäuren, Kohlenhydrate, Zucker, Eiweiß und Salz üblich. Ungesättigte Fettsäuren und Ballaststoffe sind nicht auf jedem Etikett angegeben.';
    form.parentNode.insertBefore(explanation,form.nextSibling);
  }

  function markupStyles() {
    if (byId('forge-nutri-v2-style')) return;
    const style=document.createElement('style');style.id='forge-nutri-v2-style';
    style.textContent=`
      #nutrition .forge-nutri-extra{margin:10px 0;background:#16242c;border:1px solid #344650;border-radius:13px;overflow:hidden}
      #nutrition .forge-nutri-extra>summary{list-style:none;padding:15px 17px;color:#e8f3e9;font-weight:750;cursor:pointer;display:flex;justify-content:space-between;gap:12px}
      #nutrition .forge-nutri-extra>summary::-webkit-details-marker{display:none}
      #nutrition .forge-nutri-extra>summary:after{content:'⌄';color:#a9f267;font-size:22px}
      #nutrition .forge-nutri-extra[open]>summary:after{transform:rotate(180deg)}
      #nutrition .forge-nutri-extra-grid{padding:0 13px 14px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
      #nutrition .forge-nutri-extra-grid>*{min-width:0}
      #nutrition .forge-nutri-extra-grid input{width:100%}
      #nutrition .forge-nutri-hint{font-size:12px;color:#a9bec5;padding:0 14px;line-height:1.55;margin:7px 0 12px}
      #nutrition .forge-nutri-basic-label{font-size:13px;color:#b5d69c;font-weight:800;margin:13px 0 10px}
      #nutrition .forge-nutri-macros{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:10px 0}
      #nutrition .forge-nutri-macros .nutrition-tile{padding:12px 11px;min-width:0}
      #nutrition .forge-nutri-macros .nutrition-tile:first-child{grid-column:1/-1;background:#25382a}
      #nutrition .forge-nutri-macros .nutrition-tile strong{font-size:17px}
      #nutrition .forge-nutri-macros .nutrition-tile:first-child strong{font-size:24px}
      #nutrition .forge-nutri-details{margin:8px 0;border:1px solid #34414c;border-radius:12px;overflow:hidden;background:#15212c}
      #nutrition .forge-nutri-details summary{padding:12px 14px;color:#dceadf;font-size:13px;font-weight:700;display:flex;justify-content:space-between;gap:8px;cursor:pointer;list-style:none}
      #nutrition .forge-nutri-details summary::-webkit-details-marker{display:none}
      #nutrition .forge-nutri-details summary:after{content:'⌄';color:#a9f267}
      #nutrition .forge-nutri-details[open] summary:after{transform:rotate(180deg)}
      #nutrition .forge-nutri-detail-row{display:flex;justify-content:space-between;gap:10px;padding:8px 14px;font-size:12px;border-top:1px solid #2a3944}
      #nutrition .forge-nutri-detail-row span{color:#b8c7d0}
      #nutrition .forge-nutri-detail-row b{color:#e7f4e3;white-space:nowrap}
      #nutrition .forge-nutri-unavailable{font-size:11px;color:#9bb3bd;margin:7px 0 0}
      #nutrition .forge-nutri-online{margin-top:12px;padding:12px;border:1px solid #415b4a;background:#17262a;border-radius:14px}
      #nutrition .forge-nutri-online h4{margin:0 0 9px;font-size:15px}
      #nutrition .forge-nutri-online-controls{display:grid;gap:8px;grid-template-columns:minmax(0,1fr) auto}
      #nutrition .forge-nutri-online-controls input{min-width:0;width:100%}
      #nutrition .forge-nutri-online button{min-height:40px}
      #nutrition .forge-nutri-item{border:1px solid #3a4b52;background:#203039;border-radius:11px;padding:11px;margin:8px 0}
      #nutrition .forge-nutri-item-name{font-weight:700;color:#edf7ee;font-size:13px}
      #nutrition .forge-nutri-item-meta{font-size:11px;color:#b6c8c7;margin:5px 0 10px;line-height:1.5}
      #nutrition .forge-nutri-suggestions .btn{width:100%;text-align:left;margin:3px 0}
      #nutrition .forge-nutri-source{font-size:11px;color:#b7e694;padding:6px 0}
      #nutrition .forge-nutri-status{font-size:12px;color:#bfd3cd;margin:8px 0;min-height:18px}
      @media(max-width:410px){#nutrition .forge-nutri-extra-grid{grid-template-columns:1fr}#nutrition .forge-nutri-online-controls{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function showNutrientCards(n) {
    const basic=[['cal','🔥 Energie'],['protein','Protein'],['carbs','Kohlenhydrate'],['fat','Fett'],['sugar','davon Zucker'],['fiber','Ballaststoffe']];
    const groups=[
      ['🥑 Fettarten', ['sat','mono','poly','trans','omega3']],
      ['🍬 Zucker & weitere Kohlenhydrate',['sugar','addedSugar','fructose','starch','polyols']],
      ['🧂 Sonstige Angaben',['fiber','salt']]
    ];
    const basicHtml=basic.map(([k,l])=>'<div class="nutrition-tile"><small>'+l+'</small><strong>'+fmt(n[k],k==='cal'?'kcal':'g')+'</strong></div>').join('');
    const groupsHtml=groups.map(([title,keys])=>'<details class="forge-nutri-details"><summary>'+title+'</summary>'+keys.map(k=>'<div class="forge-nutri-detail-row"><span>'+html(fields[k][0])+'</span><b>'+fmt(n[k])+'</b></div>').join('')+'</details>').join('');
    return '<div class="forge-nutri-macros">'+basicHtml+'</div>'+groupsHtml+'<p class="forge-nutri-unavailable">„—“ bedeutet: nicht angegeben, nicht automatisch 0 g. Alle Angaben beziehen sich auf die gewählte Menge.</p>';
  }

  function aggregateAdditional(result,items,mealMode) {
    for(const k of extraKeys) {
      if(!items.length || !items.every(i=>valid(i[k]))) {result[k]=null;continue;}
      result[k]=items.reduce((sum,i)=>sum+Number(i[k])*(mealMode?Number(i.grams)/100:1),0);
    }
    return result;
  }
  function attachNutrients() {
    if(typeof window.nutrientSum==='function') {
      const original=window.nutrientSum;
      window.nutrientSum=function(items){return aggregateAdditional(original(items),items,true);};
    }
    if(typeof window.dailyNutrients==='function') {
      const original=window.dailyNutrients;
      window.dailyNutrients=function(){const out=original();const meals=state.foods.filter(f=>f.date===today());return aggregateAdditional(out,meals,false);};
    }
    if(typeof window.nutrientCards==='function')window.nutrientCards=showNutrientCards;
    if(typeof window.selectFood==='function'){
      const original=window.selectFood;
      window.selectFood=function(index,custom){
        original(index,custom);
        const food=(custom?customFoods():FOOD_DB)[index];
        for(const k of extraKeys)if(byId(fieldID(k)))byId(fieldID(k)).value=food?.[k]??'';
        selectedSource=custom?'Eigene Lebensmittelbibliothek':'FORGE Offline-Grundwerte';
        announceSource(selectedSource);
      };
    }
    if(typeof window.addIngredient==='function'){
      const original=window.addIngredient;
      window.addIngredient=function(){
        const extra=Object.fromEntries(extraKeys.filter(k=>valid(byId(fieldID(k))?.value)).map(k=>[k,Number(byId(fieldID(k)).value)]));
        const before=mealDraft.length;
        original();
        if(mealDraft.length===before+1){Object.assign(mealDraft[mealDraft.length-1],extra);
          if(selectedSource)mealDraft[mealDraft.length-1].source=selectedSource;
          for(const k of extraKeys)if(byId(fieldID(k)))byId(fieldID(k)).value='';
          selectedSource=null;announceSource('');renderMealDraft();}
      };
    }
    if(typeof window.saveCustomFood==='function'){
      const original=window.saveCustomFood;
      window.saveCustomFood=function(){
        const name=byId('ingredientName')?.value.trim();
        const extra=Object.fromEntries(extraKeys.filter(k=>valid(byId(fieldID(k))?.value)).map(k=>[k,Number(byId(fieldID(k)).value)]));
        original();
        const f=customFoods().find(x=>x.name.toLocaleLowerCase('de-DE')===name?.toLocaleLowerCase('de-DE'));
        if(f){Object.assign(f,extra);if(selectedSource)f.source=selectedSource;save();renderCustomFoods();}
      };
    }
    if(typeof window.parseLabelText==='function'){
      const original=window.parseLabelText;
      window.parseLabelText=function(){
        original();
        const raw=byId('ocrText')?.value||'';
        const lines=raw.split(/\n/);
        const matchers={salt:/^(?:salz|salt)\s*[:\-]?\s*(.*)$/i,
          starch:/^(?:davon\s+)?(?:stärke|starch)\s*[:\-]?\s*(.*)$/i,
          trans:/^(?:transfettsäuren|trans fats?)\s*[:\-]?\s*(.*)$/i,
          omega3:/^(?:omega[\s-]?3(?:-fettsäuren)?|omega[\s-]?3 fatty acids)\s*[:\-]?\s*(.*)$/i};
        for(const line of lines){const clean=line.trim();
          for(const [k,re] of Object.entries(matchers)){const hit=clean.match(re);if(!hit)continue;
            const value=hit[1].match(/\d+(?:[.,]\d+)?/);
            if(value && byId(fieldID(k)))byId(fieldID(k)).value=Number(value[0].replace(',','.'));
          }
        }
      };
    }
  }

  function announceSource(name){const el=byId('forge-nutri-chosen-source');if(el)el.textContent=name?'Quelle: '+name+' · Angaben vor dem Speichern prüfen.':'';}
  function setup(){
    if(!byId('nutrition') || byId('forge-nutri-v2-style'))return;
    markupStyles();detailFields();attachNutrients();
    const source=document.createElement('p');source.id='forge-nutri-chosen-source';source.className='forge-nutri-source';
    byId('ingredientName')?.closest('div')?.after(source);
    const note=byId('foodSuggestions')?.nextElementSibling;
    if(note?.classList.contains('notice'))note.textContent='33 FORGE-Basislebensmittel mit Makros; Zucker und Fettarten können fehlen. Für exakte Produktangaben die Online-Bibliothek oder das Etikett verwenden.';
    if(typeof render==='function')render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();