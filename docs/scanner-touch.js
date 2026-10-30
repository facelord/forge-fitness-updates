/* FORGE scanner 14.8: mobile touch crop, offline OCR and direct field mapping.
 * Complements existing legacy HTML / scanner.js / nutrition-plus.js; no data migrations.
 * No external server receives images: native ML Kit processes cropped photos offline.
 */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const fields = ['Cal','Fat','Sat','Mono','Poly','Carbs','Sugar','Fiber','Protein','Salt','Starch','Trans','Omega3','Polyols'];
  const ids = fields.map(k => 'ingredient'+k);
  const state = {installed:false, zoom:1, crop:{l:5,t:5,w:90,h:90}, pointers:new Map(), gesture:null, active:false, scanPending:false, panMode:false};
  const norm = t => String(t || '').normalize('NFKC').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
  const decimals = t => {
    const match = String(t||'').match(/(?<![\d])\d{1,5}(?:[.,]\d{1,3})?(?!\d)/);
    return match ? Number(match[0].replace(',','.')) : null;
  };
  const safe = v => Number.isFinite(v) && v>=0 && v<=100000;
  const clamp = (n,a,b) => Math.min(b,Math.max(a,n));
  const note = message => {const el=$('scanStatus');if(el)el.textContent=message;};

  // Do not assign numbers in %DV reference columns, or 8400kJ/2000kcal RIs.
  // Prefer an explicit kcal token, then a labelled kJ amount; leave unknown blank.
  function parseLabel(text) {
    const raw = String(text || '').replace(/\r/g,'');
    const lines = raw.split(/\n/).map(norm).filter(Boolean);
    const parsed = {};
    const labels = [
      ['Sat',/^(?:davon\s+)?(?:ges[aä]ttigte\s+(?:fett\s*)?s[aä]uren|ges[aä]ttigt|saturated\s+(?:fat(?:ty\s+acids?)?)?)\b[\s:;\-]*/i],
      ['Mono',/^(?:davon\s+)?(?:einfach\s+unges[aä]ttigte\s+(?:fett\s*)?s[aä]uren|monounsaturated\s+fat)\b[\s:;\-]*/i],
      ['Poly',/^(?:davon\s+)?(?:mehrfach\s+unges[aä]ttigte\s+(?:fett\s*)?s[aä]uren|polyunsaturated\s+fat)\b[\s:;\-]*/i],
      ['Fat',/^(?:fett|fettgehalt|fat|total\s+fat)\b[\s:;\-]*/i],
      ['Sugar',/^(?:davon\s+)?(?:zucker|davon\s+zucker|of\s+which\s+sugars|sugars)\b[\s:;\-]*/i],
      ['Carbs',/^(?:kohlenhydrate|carbohydrates?|total\s+carbohydrates?)\b[\s:;\-]*/i],
      ['Fiber',/^(?:ballaststoffe|ballaststoff|dietary\s+fibre|dietary\s+fiber|fibre|fiber)\b[\s:;\-]*/i],
      ['Protein',/^(?:eiwei(?:ß|ss)|protein|proteine?)(?=\s|$|[:;\-])[\s:;\-]*/i],
      ['Salt',/^(?:salz|salt)\b[\s:;\-]*/i],
      ['Starch',/^(?:st[aä]rke|starch)\b[\s:;\-]*/i],
      ['Trans',/^(?:transfett(?:s[aä]uren)?|trans\s+fat(?:ty\s+acids?)?)\b[\s:;\-]*/i],
      ['Omega3',/^(?:omega[\s-]?3(?:-?fetts[aä]uren)?|omega[\s-]?3\s+fat(?:ty\s+acids?)?)\b[\s:;\-]*/i],
      ['Polyols',/^(?:mehrwertige\s+alkohole|polyole|polyols)\b[\s:;\-]*/i],
    ];
    const energy = /^(?:energie|brennwert|energy|energetischer\s+wert)\b[\s:;\-]*/i;
    const reference = /referenzmenge|reference\s+intake|durchschnittlich(?:en|er)?\s+erwachsenen|\b8400\s*k\s*j\b|\b2000\s*kcal\b/i;
    const grams = /([\d]{1,5}(?:[.,]\d{1,3})?)\s*(g|gramm|mg)\b/i;
    const valueFrom = (tail, next) => {
      // Prefer explicitly denominated g; don't infer from isolated percentages.
      const first=String(tail||'').match(grams);
      const candidate=first || (String(tail||'').trim()?null:String(next||'').match(grams));
      if(candidate){const value=Number(candidate[1].replace(',','.'))*(candidate[2].toLowerCase()==='mg'?0.001:1);return value<=100?value:null;}
      // If the OCR drops the unit, accept an isolated number only (not a %).
      const plain=String(tail||'').trim();
      if(/^\d{1,3}(?:[.,]\d{1,3})?$/.test(plain)){const x=Number(plain.replace(',','.'));return x<=100?x:null;}
      return null;
    };
    for(let i=0;i<lines.length;i++){
      const line=lines[i];
      if(reference.test(line) || /^(?:pro|per)\s+(?:100\s*(?:g|ml)|portion|serving)/i.test(line))continue;
      const e=line.match(energy);
      if(e){
        const value=line.slice(e[0].length)+' '+(lines[i+1]||'');
        const kcals=[...value.matchAll(/(\d{1,5}(?:[.,]\d{1,2})?)\s*k\s*cal\b/ig)]
          .map(x=>Number(x[1].replace(',','.'))).filter(v=>v>=0&&v<2000&&v!==2000);
        if(kcals.length) parsed.Cal=kcals[0];
        else {const kJ=value.match(/(\d{1,5}(?:[.,]\d{1,2})?)\s*k\s*j\b/i);
          if(kJ){const kcal=Math.round(Number(kJ[1].replace(',','.'))/4.184);if(kcal>0&&kcal<2000)parsed.Cal=kcal;}}
        continue;
      }
      for(const [key,re] of labels){
        const m=line.match(re);if(!m)continue;
        const rest=line.slice(m[0].length).trim();
        const val=valueFrom(rest, lines[i+1]||'');
        if(val!==null&&safe(val)) parsed[key]=val;
        break;
      }
    }
    // Cross-check known nutrient subcategories. Do not overwrite the scan with guessed numbers.
    if(safe(parsed.Fat)&&safe(parsed.Sat)&&parsed.Sat>parsed.Fat+0.2)delete parsed.Sat;
    if(safe(parsed.Carbs)&&safe(parsed.Sugar)&&parsed.Sugar>parsed.Carbs+0.2)delete parsed.Sugar;
    return parsed;
  }

  // This is the ONLY operation that writes OCR numbers to the ingredient form.
  function applyRecognized(text, source) {
    const found=parseLabel(text);
    const keys=Object.keys(found).filter(k=>safe(found[k]) && $('ingredient'+k));
    if(keys.length<2){
      note('Keine vollständige Nährwerttabelle erkannt. Bitte den Rahmen auf die Zeilen pro 100 g setzen und erneut scannen.');
      return false;
    }
    // Clear all previous nutrient numbers before importing a different product.
    // Keep the user's ingredient name and portion intact.
    for(const id of ids){const input=$(id);if(input)input.value='';}
    for(const key of keys){const input=$('ingredient'+key);input.value=String(found[key]);input.classList.add('forge-scan-updated');}
    setTimeout(()=>document.querySelectorAll('.forge-scan-updated').forEach(x=>x.classList.remove('forge-scan-updated')),4500);
    const complete=['Cal','Fat','Carbs','Protein'].every(k=>keys.includes(k));
    const message=keys.length+' Nährwerte direkt übernommen'+(complete?'.':' · einige Pflichtwerte fehlen.')+' Bitte Verpackungsangaben pro 100 g prüfen.';
    note(message);
    const compose=document.querySelector('#nutrition details[data-food-section="compose"]');if(compose)compose.open=true;
    const ingredient=document.querySelector('#nutrition details[data-food-section="ingredient"]');if(ingredient)ingredient.open=true;
    const saveHint=$('forge-ocr-result-hint');if(saveHint){saveHint.textContent=message;saveHint.hidden=false;}
    const group = $('ingredientName');
    if(group){const dest=group.closest('details[data-food-section="ingredient"]') || group;
      setTimeout(()=>dest.scrollIntoView({behavior:'smooth',block:'start'}),120);}
    if(typeof window.forgePortionPreview==='function')try{window.forgePortionPreview();}catch(_){}
    return true;
  }

  function updateCropFromSliders(){
    state.crop.l=Number($('cropL')?.value||0);
    state.crop.t=Number($('cropT')?.value||0);
    state.crop.w=clamp(Number($('cropW')?.value||80),7,100-state.crop.l);
    state.crop.h=clamp(Number($('cropH')?.value||80),7,100-state.crop.t);
    paintCrop();
  }
  function setCrop(r) {
    const c=state.crop;
    c.w=clamp(r.w,7,100);c.h=clamp(r.h,7,100);
    c.l=clamp(r.l,0,100-c.w);c.t=clamp(r.t,0,100-c.h);
    [['cropL','l'],['cropT','t'],['cropW','w'],['cropH','h']].forEach(([id,key])=>{if($(id))$(id).value=Math.round(c[key]*10)/10;});
    paintCrop();
  }
  function paintCrop() {
    const box=$('cropBox');if(!box)return;
    const c=state.crop;
    box.style.left=c.l+'%';box.style.top=c.t+'%';box.style.width=c.w+'%';box.style.height=c.h+'%';
    const badge=$('forge-crop-badge');if(badge)badge.textContent=Math.round(c.w)+' × '+Math.round(c.h)+' %';
  }
  function zoom(next, clientX, clientY) {
    const viewer=$('forge-crop-viewer'), wrap=$('cropWrap'),canvas=$('cropCanvas');if(!viewer||!wrap||!canvas||!canvas.width)return;
    const rect=viewer.getBoundingClientRect();
    const x=(Number.isFinite(clientX)?clientX:rect.left+rect.width/2)-rect.left;
    const y=(Number.isFinite(clientY)?clientY:rect.top+rect.height/2)-rect.top;
    const oldW=wrap.getBoundingClientRect().width;
    const oldScale=(viewer.scrollLeft+x)/Math.max(1,oldW);
    const oldScaleY=(viewer.scrollTop+y)/Math.max(1,wrap.getBoundingClientRect().height);
    state.zoom=clamp(next,1,4.5);
    const width=viewer.clientWidth*state.zoom;
    canvas.style.width=width+'px';canvas.style.height='auto';
    wrap.style.width=width+'px';wrap.style.height=(width*canvas.height/canvas.width)+'px';
    viewer.scrollLeft=oldScale*width-x;
    viewer.scrollTop=oldScaleY*(width*canvas.height/canvas.width)-y;
    const z=$('forge-crop-zoom');if(z)z.textContent=Math.round(state.zoom*100)+' %';
  }
  function enableCrop(frame, viewer){
    if(frame.dataset.forgeTouchCrop)return;
    frame.dataset.forgeTouchCrop='1';
    frame.replaceChildren();
    const badge=document.createElement('span');badge.id='forge-crop-badge';badge.className='forge-crop-badge';
    badge.textContent='Rahmen ziehen';frame.appendChild(badge);
    const handles=['nw','ne','sw','se','n','s','e','w'];
    for(const handle of handles){const el=document.createElement('span');el.className='forge-crop-handle forge-crop-'+handle;
      el.dataset.handle=handle;el.setAttribute('aria-label','Ausschnitt '+handle+' ändern');frame.appendChild(el);}
    let selection=null, frameGesture=null;
    const framePointers=new Map();
    frame.addEventListener('pointerdown',e=>{
      if(e.button!==0&&e.pointerType==='mouse')return;
      framePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      const hit=e.target.closest('[data-handle]');
      selection={id:e.pointerId,mode:state.panMode?'pan':hit?hit.dataset.handle:'move',x:e.clientX,y:e.clientY,
        scrollLeft:viewer.scrollLeft,scrollTop:viewer.scrollTop,orig:{...state.crop}};
      if(framePointers.size===2){const p=[...framePointers.values()];
        frameGesture={distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),zoom:state.zoom};
        selection=null;
      }
      frame.setPointerCapture(e.pointerId);e.stopPropagation();e.preventDefault();
    });
    frame.addEventListener('pointermove',e=>{
      if(framePointers.has(e.pointerId))framePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(framePointers.size===2 && frameGesture){const p=[...framePointers.values()];
        const distance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
        zoom(frameGesture.zoom*distance/Math.max(1,frameGesture.distance),
          (p[0].x+p[1].x)/2,(p[0].y+p[1].y)/2);
        e.preventDefault();return;
      }
      if(!selection||selection.id!==e.pointerId||state.pointers.size>1)return;
      if(selection.mode==='pan'){
        viewer.scrollLeft=selection.scrollLeft+(selection.x-e.clientX);
        viewer.scrollTop=selection.scrollTop+(selection.y-e.clientY);
        e.preventDefault();return;
      }
      const wrap=$('cropWrap');const rect=wrap.getBoundingClientRect();
      const dx=(e.clientX-selection.x)/Math.max(1,rect.width)*100;
      const dy=(e.clientY-selection.y)/Math.max(1,rect.height)*100;
      const r={...selection.orig},m=selection.mode;
      if(m==='move'){r.l+=dx;r.t+=dy;}
      else{
        if(m.includes('w')){const end=r.l+r.w;r.l=clamp(r.l+dx,0,end-7);r.w=end-r.l;}
        if(m.includes('e'))r.w=clamp(r.w+dx,7,100-r.l);
        if(m.includes('n')){const end=r.t+r.h;r.t=clamp(r.t+dy,0,end-7);r.h=end-r.t;}
        if(m.includes('s'))r.h=clamp(r.h+dy,7,100-r.t);
      }
      setCrop(r);e.preventDefault();
    });
    const end=e=>{
      framePointers.delete(e.pointerId);
      if(framePointers.size<2)frameGesture=null;
      if(selection&&selection.id===e.pointerId)selection=null;
      e.stopPropagation();
    };
    frame.addEventListener('pointerup',end);frame.addEventListener('pointercancel',end);
    // Outside the crop frame, one finger pans image both horizontally and vertically;
    // two fingers zoom around their midpoint without zooming the full application.
    viewer.addEventListener('pointerdown',e=>{
      state.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(state.pointers.size===1)state.gesture={x:e.clientX,y:e.clientY,left:viewer.scrollLeft,top:viewer.scrollTop};
      if(state.pointers.size===2){const p=[...state.pointers.values()];state.gesture={distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),zoom:state.zoom};}
      if(e.target!==frame && !e.target.closest('#cropBox')){viewer.setPointerCapture(e.pointerId);e.preventDefault();}
    });
    viewer.addEventListener('pointermove',e=>{
      if(!state.pointers.has(e.pointerId))return;
      state.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(state.pointers.size===2){const p=[...state.pointers.values()];
        if(!state.gesture||!state.gesture.distance){state.gesture={distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),zoom:state.zoom};}
        const dist=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
        zoom(state.gesture.zoom*dist/Math.max(1,state.gesture.distance),(p[0].x+p[1].x)/2,(p[0].y+p[1].y)/2);
      }else if(state.pointers.size===1 && state.gesture && !e.target.closest('#cropBox')){
        viewer.scrollLeft=state.gesture.left+(state.gesture.x-e.clientX);
        viewer.scrollTop=state.gesture.top+(state.gesture.y-e.clientY);
      }
    });
    const finish=e=>{state.pointers.delete(e.pointerId);state.gesture=null;};
    viewer.addEventListener('pointerup',finish);viewer.addEventListener('pointercancel',finish);
  }

  function makeCropControls() {
    const panel=$('cropPanel'),wrap=$('cropWrap'),box=$('cropBox'),canvas=$('cropCanvas');
    if(!panel||!wrap||!box||!canvas||$('forge-crop-viewer'))return;
    const viewer=document.createElement('div');viewer.id='forge-crop-viewer';viewer.setAttribute('aria-label','Foto verschieben und vergrößern');
    wrap.before(viewer);viewer.append(wrap);
    const toolbar=document.createElement('div');toolbar.className='forge-crop-toolbar';
    const help=document.createElement('p');help.className='forge-crop-help';
    help.textContent='Grünen Rahmen ziehen · an den Ecken Größe ändern · außerhalb mit einem Finger verschieben · mit zwei Fingern zoomen.';
    const actions=document.createElement('div');actions.className='forge-crop-buttons';
    const button=(text,callback)=>{const b=document.createElement('button');b.type='button';b.className='btn alt small';b.textContent=text;b.addEventListener('click',callback);return b;};
    const modeButton=button('🖐 Bild bewegen',()=>{
      state.panMode=!state.panMode;
      modeButton.textContent=state.panMode?'▣ Rahmen bearbeiten':'🖐 Bild bewegen';
      modeButton.setAttribute('aria-pressed',String(state.panMode));
      note(state.panMode?'Bild mit einem Finger in alle Richtungen bewegen; zwei Finger zoomen.'
        :'Ausschnitt am Rahmen verschieben oder an den acht Punkten verändern.');
    });
    modeButton.setAttribute('aria-pressed','false');
    actions.append(modeButton,button('−',()=>zoom(state.zoom/1.35)),button('＋',()=>zoom(state.zoom*1.35)));
    const label=document.createElement('span');label.id='forge-crop-zoom';label.textContent='100 %';actions.appendChild(label);
    actions.appendChild(button('Zurücksetzen',()=>{setCrop({l:5,t:5,w:90,h:90});zoom(1);}));
    toolbar.append(help,actions);viewer.before(toolbar);
    const slider=$('cropL')?.closest('.formgrid');
    if(slider){const fold=document.createElement('details');fold.className='forge-crop-advanced';
      const sum=document.createElement('summary');sum.textContent='Feineinstellung (Regler)';fold.append(sum,slider);viewer.after(fold);
      ['cropL','cropT','cropW','cropH'].forEach(id=>$(id)?.addEventListener('input',updateCropFromSliders));}
    enableCrop(box,viewer);
    setCrop({l:5,t:5,w:90,h:90});
  }
  function prepareView() {
    const canvas=$('cropCanvas'),panel=$('cropPanel'),viewer=$('forge-crop-viewer');
    if(!canvas||!panel||!viewer || panel.style.display==='none'||!canvas.width)return;
    state.zoom=1;
    const wrap=$('cropWrap');const width=viewer.clientWidth;
    canvas.style.width=width+'px';canvas.style.height='auto';
    wrap.style.width=width+'px';wrap.style.height=(width*canvas.height/canvas.width)+'px';
    viewer.scrollLeft=0;viewer.scrollTop=0;state.pointers.clear();
    setCrop({l:5,t:5,w:90,h:90});
    const z=$('forge-crop-zoom');if(z)z.textContent='100 %';
    note('Rahmen auf die Nährwerttabelle pro 100 g ziehen; dann scannen.');
    viewer.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function buildScanData() {
    const canvas=$('cropCanvas');if(!canvas||!canvas.width)return null;
    const {l,t,w,h}=state.crop;
    const out=document.createElement('canvas');
    const sw=Math.max(1,Math.round(canvas.width*w/100));const sh=Math.max(1,Math.round(canvas.height*h/100));
    const ratio=Math.min(3,1800/Math.max(sw,sh));
    out.width=Math.max(1,Math.round(sw*ratio));out.height=Math.max(1,Math.round(sh*ratio));
    const ctx=out.getContext('2d');if(!ctx)return null;
    ctx.filter='grayscale(1) contrast(1.25)';
    ctx.drawImage(canvas,Math.round(canvas.width*l/100),Math.round(canvas.height*t/100),sw,sh,0,0,out.width,out.height);
    return out.toDataURL('image/jpeg',0.91);
  }
  function scanNow(previous) {
    if(state.scanPending)return;
    const data=buildScanData();if(!data){note('Bitte zuerst ein Foto aufnehmen.');return;}
    state.scanPending=true;note('Lese die Nährwerttabelle direkt auf dem Gerät …');
    const button=$('forge-scan-now');if(button)button.disabled=true;
    try{
      if(window.ForgeAndroid && typeof window.ForgeAndroid.scanNutritionImage==='function')window.ForgeAndroid.scanNutritionImage(data);
      else if(typeof previous==='function') {state.scanPending=false; if(button)button.disabled=false;previous();}
      else throw Error('Keine Texterkennung vorhanden');
    }catch(e){state.scanPending=false;if(button)button.disabled=false;note('Scan konnte nicht gestartet werden. Bitte erneut versuchen.');}
  }
  function resetPending(){state.scanPending=false;const b=$('forge-scan-now');if(b)b.disabled=false;}
  function install() {
    if(state.installed)return;
    if(!$('cropPanel')||!$('cropCanvas')||!$('ocrText')||!$('ingredientCal'))return;
    state.installed=true;
    const styles=document.createElement('style');styles.id='forge-touch-scan-style';
    styles.textContent=`
      #forge-crop-viewer{width:100%;height:min(53vh,470px);min-height:260px;overflow:auto;overscroll-behavior:contain;touch-action:none;border-radius:15px;border:1px solid #48605a;background:#09121b;position:relative;scrollbar-width:thin}
      #cropWrap{position:relative!important;max-width:none!important;overflow:visible!important;border-radius:0!important;touch-action:none!important}
      #cropCanvas{max-width:none!important;display:block;pointer-events:none}
      #cropBox{border:3px solid #a9f267!important;box-shadow:0 0 0 2000px #0008;touch-action:none;cursor:move;box-sizing:border-box;min-height:25px;min-width:25px}
      .forge-crop-handle{position:absolute;width:28px;height:28px;display:block;background:#c4ff8c;border:2px solid #18301c;border-radius:7px;touch-action:none}
      .forge-crop-nw{top:-14px;left:-14px}.forge-crop-ne{top:-14px;right:-14px}.forge-crop-sw{bottom:-14px;left:-14px}.forge-crop-se{bottom:-14px;right:-14px}
      .forge-crop-n{top:-14px;left:calc(50% - 14px)}.forge-crop-s{bottom:-14px;left:calc(50% - 14px)}
      .forge-crop-w{top:calc(50% - 14px);left:-14px}.forge-crop-e{top:calc(50% - 14px);right:-14px}
      .forge-crop-badge{background:#a9f267;color:#102017;font-size:11px;font-weight:bold;border-radius:0 0 6px 0;padding:3px 6px;position:absolute;top:0;left:0;pointer-events:none}
      .forge-crop-toolbar{margin:12px 0}.forge-crop-help{font-size:12px;line-height:1.55;color:#bad0c7;margin:0 0 9px}
      .forge-crop-buttons{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.forge-crop-buttons .btn{min-height:42px;min-width:42px;padding:7px 10px}
      #forge-crop-zoom{font-weight:700;font-size:13px;color:#c3eab6;min-width:51px;text-align:center}
      .forge-crop-advanced{padding:10px 2px;border:0;background:transparent}.forge-crop-advanced>summary{font-size:12px;color:#aabec3;cursor:pointer}
      .forge-crop-advanced .formgrid{margin:12px 0!important}.forge-scan-updated{outline:2px solid #a9f267!important;background:#213b33!important}
      #forge-ocr-result-hint{font-size:13px;line-height:1.5;color:#cdf1bf;background:#193629;border-radius:10px;padding:12px;margin:10px 0}
      #nutrition #cropPanel .forge-crop-advanced input[type=range]{width:100%}
    `;
    document.head.appendChild(styles);
    makeCropControls();
    const hint=document.createElement('div');hint.id='forge-ocr-result-hint';hint.hidden=true;
    const input=$('ingredientName');if(input)input.closest('div')?.before(hint);
    const card=$('ocrText')?.closest('details');if(card){card.open=false;const sum=card.querySelector('summary');if(sum)sum.textContent='Optional: Scan-Rohtext ansehen und manuell korrigieren';}
    const oldPrepare=window.prepareLabelCrop;
    if(typeof oldPrepare==='function')window.prepareLabelCrop=async function(ev){
      await oldPrepare(ev);prepareView();
    };
    const previousScan=window.scanCroppedLabel;
    window.scanCroppedLabel=function(){scanNow(previousScan);};
    const scanButton=$('cropPanel')?.querySelector('button[onclick="scanCroppedLabel()"]');
    if(scanButton){scanButton.id='forge-scan-now';scanButton.textContent='Nährwerte erkennen und übernehmen';}
    window.forgeNutritionOcrResult=function(text,error){
      resetPending();
      if(error){note('Texterkennung fehlgeschlagen: '+String(error).slice(0,150));return;}
      const raw=String(text||'');const input=$('ocrText');if(input)input.value=raw;
      applyRecognized(raw,'native');
    };
    window.parseLabelText=function(){applyRecognized($('ocrText')?.value||'','manual');};
    // Keep old slider handlers functional as optional accessibility controls.
    window.updateCropBox=updateCropFromSliders;
    // Helpful generic cocoa search shortcuts in the existing comprehensive library.
    const search=$('forgeNutritionQuery');
    if(search){
      const row=document.createElement('div');row.className='forge-cocoa-suggestions';
      row.style.cssText='display:flex;gap:7px;flex-wrap:wrap;margin:9px 0 12px';
      ['Kakaopulver','Backkakao','Trinkkakao'].forEach(term=>{const b=document.createElement('button');b.type='button';b.className='btn alt small';b.textContent=term;b.addEventListener('click',()=>{search.value=term;search.dispatchEvent(new Event('input',{bubbles:true}));search.focus();});row.appendChild(b);});
      search.after(row);
    }
  }
  function start(){let count=0;const tick=()=>{install();if(!state.installed&&++count<40)setTimeout(tick,100);};tick();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  // Test seam: pure parsers can be validated without a live Android camera.
  window.forgeNutritionScanTest={parseLabel};
})();