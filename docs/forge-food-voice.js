/* FORGE Essen: opt-in speech/text -> ingredient review -> one atomic meal save. */
(function(){
'use strict';
const NUMBERS={ein:1,eine:1,einen:1,eins:1,zwei:2,drei:3,vier:4,fünf:5,fuenf:5,sechs:6,sieben:7,acht:8,neun:9,zehn:10,elf:11,zwölf:12,zwoelf:12,dreizehn:13,vierzehn:14,fünfzehn:15,fuenfzehn:15,sechzehn:16,siebzehn:17,achtzehn:18,neunzehn:19,zwanzig:20,dreißig:30,dreissig:30,vierzig:40,fünfzig:50,fuenfzig:50,hundert:100};
const NUMBER='(?:ein\\s+halbes|eine\\s+halbe|\\d+(?:[.,]\\d+)?|'+Object.keys(NUMBERS).sort((a,b)=>b.length-a.length).join('|')+')';
const UNIT='(?:kilogramm|kilo|kg|gramm|gram|gr|g|milliliter|ml|liter|l|stück|stueck|stk)';
const QUANTITY=new RegExp('(?:^|\\s)('+NUMBER+')\\s*('+UNIT+')?\\s+(.+)$','i');
const CONNECT=new RegExp('\\s+(?:und|sowie)(?:\\s+dann)?(?:\\s+habe\\s+ich)?(?:\\s+auch)?(?:\\s+noch)?\\s+(?='+NUMBER+'\\b)','gi');
// Android speech output often omits commas: detect a new quantified ingredient.
const NEXT_QUANTITY=new RegExp('\\s+(?=(?:'+NUMBER+')\\s*(?:'+UNIT+')\\s+)','gi');
function numeric(value){
 const s=String(value||'').toLowerCase().trim();
 if(s==='ein halbes'||s==='eine halbe')return .5;
 if(Object.hasOwn(NUMBERS,s))return NUMBERS[s];
 const v=Number(s.replace(',','.'));return Number.isFinite(v)&&v>0&&v<=3000?v:null;
}
function cleanName(v){
 return String(v||'').trim().replace(/^(?:noch|etwa|ca\.?|circa|dazu|zusätzlich|auch)\s+/gi,'')
  .replace(/\s+(?:drin|darin|dazugegeben|gegessen|getrunken|reingemacht|genommen)$/gi,'')
  .replace(/\s+und\s+so\s+weiter.*$/gi,'').trim();
}
function parseSpeech(value){
 const text=String(value||'').slice(0,2500).replace(/\s+/g,' ').trim();
 const clauses=text.replace(/\s+und\s+(?=(?:etwas|ein\s+wenig|ein\s+bisschen)\b)/gi,' | ')
  .replace(CONNECT,' | ').replace(NEXT_QUANTITY,' | ')
  .replace(/[;.!?]+/g,' | ').replace(/,(?!\d)/g,' | ').split('|');
 const items=[],unmatched=[];
 for(const part of clauses){
  const chunk=part.trim();if(!chunk)continue;
  const m=chunk.match(QUANTITY);
  if(!m){
   if(/\b(milch|eier?|haferflocken|joghurt|reis|brot|banane|quark|käse)\b/i.test(chunk))unmatched.push(chunk);
   continue;
  }
  const amount=numeric(m[1]),unit=String(m[2]||'').toLowerCase(),name=cleanName(m[3]);
  if(!amount||!name||name.length>110)continue;
  let grams=null,kind='unspecified',count=null;
  if(['g','gr','gram','gramm'].includes(unit)){grams=amount;kind='gram';}
  else if(['kg','kilo','kilogramm'].includes(unit)){grams=amount*1000;kind='gram';}
  else if(['ml','milliliter','l','liter'].includes(unit))kind='volume';
  else if(['stück','stueck','stk'].includes(unit)||(!unit&&/^(?:bio\s+|frische?\s+)?(?:eier?|bananen?|äpfel|aepfel|tomaten?|kartoffeln?|kiwis?|orangen?)\b/i.test(name))){kind='piece';count=amount;}
  if(items.length>=30)break;
  items.push({name,amount,unit,kind,count,grams});
 }
 return {items,unmatched};
}
function norm(v){return String(v||'').toLocaleLowerCase('de-DE').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function alternatives(name){
 const n=norm(name),a=[name];
 if(['ei','eier','huhnerei','huhnereier'].includes(n))a.push('Hühnerei','Huhnerei','Ei');
 if(n==='chiasamen')a.push('Chia Samen');
 return a;
}
function matchFoods(name,api){
 if(!api||typeof api.search!=='function')return [];
 const found=[],seen=new Set(),foods=api.getCandidates();
 for(const query of alternatives(name))for(const food of api.search(foods,query,new Set(),15)){
  const key=String(api.foodId(food));if(seen.has(key))continue;seen.add(key);found.push(food);
 }
 const q=norm(name),rank=f=>{const x=norm(f.name);return x===q?100:x.startsWith(q+' ')?80:x.startsWith(q)?70:x.includes(q)?40:0;};
 return found.sort((a,b)=>rank(b)-rank(a)).slice(0,10);
}
window.ForgeFoodVoiceCore=Object.freeze({numeric,cleanName,parseSpeech,matchFoods});
if(typeof document==='undefined')return;
const element=(tag,cls,label)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(label!==undefined)n.textContent=label;return n;};
const api=()=>window.ForgeLayoutBFoodVoiceAPI;
const slots=[['breakfast','Frühstück'],['lunch','Mittagessen'],['dinner','Abendessen'],['snack','Snack']];
let ui=null;
function style(){
 if(document.getElementById('forgeFoodVoiceStyle'))return;
 const e=element('style');e.id='forgeFoodVoiceStyle';
 e.textContent=[
  '.forge-voice-cover{position:fixed;inset:0;z-index:2147481200;background:#05080ded;display:flex;align-items:flex-end;justify-content:center;color:#edf6eb;font-family:Inter,system-ui,sans-serif}',
  '.forge-voice-panel{max-height:94vh;overflow:auto;background:#0b1018;border:1px solid #395a42;border-radius:24px 24px 0 0;max-width:620px;width:100%;padding:16px 16px calc(18px + env(safe-area-inset-bottom));box-sizing:border-box}',
  '.forge-voice-panel *{box-sizing:border-box}.forge-voice-panel h2{margin:0 0 10px;font-size:23px}.forge-voice-panel p{font-size:13px;color:#b7c8b8;line-height:1.5}',
  '.forge-voice-panel button{border:1px solid #435a45;border-radius:11px;background:#233729;color:#eff8ed;min-height:44px;padding:8px 12px;font:inherit;font-weight:700}',
  '.forge-voice-panel .main{background:#9eff00;border:0;color:#12210d;width:100%;min-height:54px}.forge-voice-panel .main:disabled{background:#374638;color:#bbc9b5}',
  '.forge-voice-panel textarea,.forge-voice-panel input,.forge-voice-panel select{display:block;width:100%;background:#102016;border:1px solid #4b624c;border-radius:10px;color:#f0fff2;padding:10px;min-height:44px;font:inherit}',
  '.forge-voice-panel textarea{min-height:84px}.forge-voice-panel label{display:block;margin:9px 0 5px;font-size:13px;font-weight:700}',
  '.forge-voice-panel .item{background:#17251c;border:1px solid #3b503d;border-radius:14px;padding:12px;margin:10px 0}',
  '.forge-voice-panel .toolbar{display:flex;gap:8px;margin:10px 0}.forge-voice-panel .toolbar button{flex:1}.forge-voice-panel .warn{color:#ffcd98}',
  '.forge-voice-panel button:focus-visible,.forge-voice-panel input:focus-visible{outline:2px solid #9eff00;outline-offset:2px}'
 ].join('');
 document.head.append(e);
}
function close(){if(!ui)return;try{ui.recognition?.abort?.();}catch(e){}ui.cover.remove();ui=null;document.removeEventListener('keydown',key,true);}
function key(e){if(e.key==='Escape'){e.preventDefault();close();}}
function open(slot){
 if(!document.body?.classList.contains('forge-layout-b'))return false;
 close();style();const cover=element('div','forge-voice-cover'),panel=element('div','forge-voice-panel');cover.append(panel);
 cover.onclick=e=>{if(e.target===cover)close();};document.body.append(cover);document.addEventListener('keydown',key,true);
 ui={cover,panel,slot:slots.some(s=>s[0]===slot)?slot:'snack',transcript:'',items:[],unmatched:[],recording:false,busy:false,notice:'',recognition:null};draw();return true;
}
function identify(){
 if(!ui)return;
 const result=parseSpeech(ui.transcript);
 ui.items=result.items.map(item=>{
  const choices=matchFoods(item.name,api()),size=api()?.pieceSizes(item.name);
  return {...item,choices,selected:choices[0]||null,
   grams:item.kind==='piece'&&size?Number((item.count*size.M).toFixed(1)):item.grams,
   estimated:item.kind==='piece'&&!!size};
 });
 ui.unmatched=result.unmatched;
 ui.notice=ui.items.length?'Bitte erkannte Lebensmittel, Mengen und Nährwerte prüfen.':'Keine Mengen gefunden. Beispiel: 100 Gramm Haferflocken.';
 draw();
}
window.forgeFoodVoiceResult=function(result){
 if(!ui)return;ui.recording=false;ui.recognition=null;
 if(String(result||'').trim()){ui.transcript=String(result).slice(0,2500);identify();}
 else {ui.notice='Aufnahme abgebrochen oder nichts erkannt. Du kannst die Mahlzeit eintippen.';draw();}
};
function record(){
 if(!ui||ui.recording)return;
 if(typeof window.ForgeAndroid?.startFoodVoiceRecognition==='function'){
  ui.recording=true;ui.notice='Bitte in die Android-Spracherkennung sprechen …';draw();
  try{window.ForgeAndroid.startFoodVoiceRecognition();}catch(e){ui.recording=false;ui.notice='Spracherkennung nicht verfügbar.';draw();}return;
 }
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!Recognition){ui.notice='Auf diesem Gerät nicht verfügbar. Du kannst den Text eintippen.';draw();return;}
 const rec=new Recognition();rec.lang='de-DE';rec.interimResults=false;rec.maxAlternatives=1;
 rec.onresult=e=>window.forgeFoodVoiceResult(e.results?.[0]?.[0]?.transcript||'');
 rec.onerror=()=>window.forgeFoodVoiceResult('');rec.onend=()=>{if(ui){ui.recording=false;draw();}};
 ui.recognition=rec;ui.recording=true;ui.notice='Bitte sprechen …';draw();
 try{rec.start();}catch(e){ui.recording=false;ui.notice='Mikrofonstart fehlgeschlagen.';draw();}
}
function ready(){return !!ui?.items.length&&ui.items.every(r=>r.selected&&r.grams>0&&r.grams<=3000&&['cal','protein','carbs','fat'].every(k=>r.selected[k]!=null&&Number.isFinite(Number(r.selected[k]))));}
function save(){
 if(!ready()||ui.busy)return;ui.busy=true;
 const data=ui.items.map(r=>({food:r.selected,grams:Number(r.grams),portion:r.estimated?String(r.count)+' Stück (ca.)':''}));
 try{if(api()?.commitVoiceMeal(data,ui.slot)){close();return;}ui.notice='Speichern fehlgeschlagen.';}
 catch(e){ui.notice='Fehler beim Speichern – bitte Eingaben prüfen.';}
 ui.busy=false;draw();
}
function button(text,handler,cls){const n=element('button',cls||'',text);n.type='button';n.onclick=handler;return n;}
function field(parent,label,control){const l=element('label','',label);parent.append(l,control);}
function draw(){
 if(!ui)return;const p=ui.panel;p.replaceChildren();
 const head=element('div','toolbar');head.append(element('h2','','Essen per Sprache'),button('Schließen',close));p.append(head);
 p.append(element('p','','Erzähle, was du gegessen hast. FORGE erstellt eine bearbeitbare Vorschau, aber speichert nichts ohne Bestätigung.'));
 const mic=button(ui.recording?'Spracherkennung läuft …':'🎙 Essen einsprechen',record,'main');
 mic.disabled=ui.recording||ui.busy;p.append(mic);
 p.append(element('p','','Die Spracherkennung des Geräts kann Sprache online verarbeiten. FORGE selbst speichert keine Audioaufnahme. Alternativ kannst du den Text eintippen.'));
 const ta=element('textarea');ta.value=ui.transcript;ta.maxLength=2500;ta.placeholder='100 Gramm Haferflocken, 15 Gramm Leinsamen, 15 Gramm Chiasamen und drei Eier';
 ta.oninput=()=>{if(ui)ui.transcript=ta.value;};field(p,'Transkript bearbeiten',ta);
 p.append(button('Lebensmittel und Mengen erkennen',identify));
 if(ui.notice)p.append(element('p','warn',ui.notice));
 if(ui.unmatched.length)p.append(element('p','warn','Nicht eindeutig erkannt / ohne Menge: '+ui.unmatched.join('; ')));
 if(!ui.items.length)return;
 const slot=element('select');slots.forEach(([id,name])=>{const opt=element('option','',name);opt.value=id;slot.append(opt);});slot.value=ui.slot;slot.onchange=()=>{ui.slot=slot.value;};field(p,'Mahlzeit',slot);
 ui.items.forEach((r,i)=>{
  const card=element('div','item');card.append(element('strong','',r.name+' · '+r.amount+' '+(r.unit||'Stück / ohne Einheit')));
  const foodSearch=element('input');foodSearch.value=r.name;foodSearch.onchange=()=>{
   r.name=foodSearch.value.trim().slice(0,110);r.choices=matchFoods(r.name,api());r.selected=r.choices[0]||null;
   if(r.kind==='piece'){const size=api()?.pieceSizes(r.name);r.grams=size?Number((r.count*size.M).toFixed(1)):null;r.estimated=!!size;}
   draw();
  };field(card,'Lebensmittel suchen / Namen korrigieren',foodSearch);
  const sel=element('select');if(!r.choices.length){const opt=element('option','','Kein Lebensmittel gefunden');opt.value='';sel.append(opt);}
  r.choices.forEach((x,idx)=>{const opt=element('option','',x.name+' · '+(x.source||'FORGE'));opt.value=String(idx);sel.append(opt);});
  sel.value=r.selected?String(Math.max(0,r.choices.indexOf(r.selected))):'';
  sel.onchange=()=>{r.selected=r.choices[Number(sel.value)]||null;draw();};field(card,'Nährwertquelle auswählen',sel);
  const grams=element('input');grams.type='number';grams.inputMode='decimal';grams.min='0.1';grams.max='3000';grams.step='0.1';grams.value=r.grams==null?'':String(r.grams);grams.placeholder='Gewicht in g';
  grams.onchange=()=>{r.grams=grams.value?Number(grams.value):null;r.estimated=false;draw();};field(card,'Menge in Gramm',grams);
  if(r.kind==='piece'&&r.estimated)card.append(element('p','warn',r.count+' Stück ≈ '+r.grams+' g essbarer Anteil (Größe M, Schätzwert). Bitte prüfen.'));
  if(r.kind==='volume')card.append(element('p','warn',r.amount+' '+r.unit+' genannt: Bitte Gewicht in Gramm bestätigen. Milliliter sind nicht automatisch Gramm.'));
  if(r.kind==='unspecified')card.append(element('p','warn','Einheit unklar. Bitte Gramm ausdrücklich eintragen.'));
  card.append(button('Diese Zutat entfernen',()=>{ui.items.splice(i,1);draw();}));
  if(r.selected&&r.grams>0&&r.selected.cal!=null)card.append(element('p','',Math.round(Number(r.selected.cal)*Number(r.grams)/100)+' kcal · '+r.selected.name));
  p.append(card);
 });
 const items=ui.items.filter(r=>r.selected&&r.grams>0).map(r=>window.ForgeLayoutBFood?.itemFromFood(r.selected,Number(r.grams),'preview')).filter(Boolean);
 const summary=window.ForgeLayoutBFood?.sumItems(items);
 p.append(element('p','',summary?.cal!=null?'Vorschau: '+Math.round(summary.cal)+' kcal':'Nährwerte noch unvollständig'));
 if(summary?.protein!=null&&summary?.carbs!=null&&summary?.fat!=null)
  p.append(element('p','','Eiweiß '+summary.protein.toFixed(1)+' g · KH '+summary.carbs.toFixed(1)+' g · Fett '+summary.fat.toFixed(1)+' g'));
 const submit=button('Mahlzeit bestätigen & speichern',save,'main');submit.disabled=ui.busy||!ready();p.append(submit);
 p.append(element('p','','Bitte Mengen und Lebensmittel kontrollieren. Erst dieser Button schreibt den Eintrag in dein Ernährungstagebuch.'));
}
window.ForgeFoodVoiceOpen=open;
})();
