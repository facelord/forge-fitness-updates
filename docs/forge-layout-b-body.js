/* FORGE Layout B · Körpermaße & Fortschrittsfotos (Erfolge).
 * - Maße in cm (Taille, Brust, Hüfte, Oberarm, Oberschenkel) und optional
 *   Körperfett in %: neue Messung mit den letzten Werten vorausgefüllt,
 *   Verlauf je Maß als Linie, Veränderung seit der ersten Messung.
 * - Fotos: werden auf dem Gerät verkleinert (max. 720 px, JPEG) und lokal
 *   gespeichert (höchstens 36). Vergleich erstes ↔ neuestes Foto.
 * Daten: state.bodyMeasures=[{id,date,waist,chest,hips,arm,thigh,fat}],
 *        state.bodyPhotos=[{id,date,data}] – Teil der Datensicherung.
 * Keine Systemdialoge; Löschen fragt im Fenster nach.
 */
(function(){
'use strict';
const FIELDS=Object.freeze([
 {key:'waist',label:'Taille',unit:'cm',min:30,max:250},
 {key:'chest',label:'Brust',unit:'cm',min:30,max:250},
 {key:'hips',label:'Hüfte',unit:'cm',min:30,max:250},
 {key:'arm',label:'Oberarm',unit:'cm',min:10,max:80},
 {key:'thigh',label:'Oberschenkel',unit:'cm',min:20,max:120},
 {key:'fat',label:'Körperfett',unit:'%',min:2,max:70}
]);
const MAX_PHOTOS=36,PHOTO_EDGE=720;
function num(v){const n=Number(String(v??'').trim().replace(',','.'));return Number.isFinite(n)?n:NaN;}
function fmt(v,d){if(!Number.isFinite(v))return '–';return v.toLocaleString('de-DE',{minimumFractionDigits:0,maximumFractionDigits:d==null?1:d});}
/* Clean a measurement from form values; returns {ok,entry}|{ok:false,reason} (pure, tested). */
function cleanEntry(values,id,date){
 const e={id,date};let any=false;
 for(const f of FIELDS){
  const raw=values&&values[f.key];
  if(raw===undefined||raw===null||String(raw).trim()==='')continue;
  const v=num(raw);
  if(!Number.isFinite(v)||v<f.min||v>f.max)return {ok:false,reason:f.label+': bitte '+f.min+'–'+f.max+' '+f.unit+' eingeben.'};
  e[f.key]=Math.round(v*10)/10;any=true;
 }
 return any?{ok:true,entry:e}:{ok:false,reason:'Trag mindestens ein Maß ein.'};
}
/* Latest value, first value and change per field (pure, tested). */
function summary(list){
 const sorted=(Array.isArray(list)?list:[]).filter(x=>x&&x.date).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 const out={};
 for(const f of FIELDS){
  const pts=sorted.filter(x=>Number.isFinite(Number(x[f.key]))).map(x=>({t:Date.parse(x.date),v:Number(x[f.key])}));
  if(!pts.length)continue;
  const first=pts[0],last=pts[pts.length-1];
  out[f.key]={last:last.v,lastT:last.t,first:first.v,change:Math.round((last.v-first.v)*10)/10,count:pts.length,points:pts};
 }
 return out;
}
/* Values used to prefill a new measurement. */
function prefill(list){const s=summary(list),o={};for(const f of FIELDS)if(s[f.key])o[f.key]=fmt(s[f.key].last,1);return o;}
/* Size of the scaled photo keeping the aspect ratio (pure, tested). */
function fitSize(w,h,edge){const e=edge||PHOTO_EDGE;const k=Math.min(1,e/Math.max(w,h));return {w:Math.max(1,Math.round(w*k)),h:Math.max(1,Math.round(h*k))};}
window.ForgeLayoutBBody=Object.freeze({FIELDS,cleanEntry,summary,prefill,fitSize,MAX_PHOTOS});
if(typeof document==='undefined')return;

const $=id=>document.getElementById(id);
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function btn(cls,text,fn){const b=el('button',cls,text);b.type='button';if(fn)b.addEventListener('click',fn);return b;}
function enabled(){return !!(document.body&&document.body.classList.contains('forge-layout-b'));}
const S=()=>typeof state!=='undefined'?state:null;
function newId(){try{if(typeof uid==='function')return uid();}catch(e){}return 'b'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function persist(){
 if(typeof KEY!=='undefined'){localStorage.setItem(KEY,JSON.stringify(S()));return;}
 if(typeof save==='function')save();
}
const ACC='#a9f267',TEAL='#5ee0c8',GOLD='#ffb547';
const CSS=`
.forge-lb-body{position:fixed;inset:0;z-index:2147480050;background:#0b1018;color:#f3f7fc;font-family:Inter,system-ui,sans-serif;display:flex;flex-direction:column;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom)}
.forge-lb-body *{box-sizing:border-box}
.forge-lb-body .bd-head{display:flex;align-items:center;gap:12px;padding:12px 14px 6px;max-width:560px;width:100%;margin:0 auto}
.forge-lb-body .bd-head small{display:block;font-size:12px;color:#95a3b7;text-transform:uppercase;letter-spacing:1.3px}
.forge-lb-body .bd-head h1{font-size:24px;font-weight:800;margin:0;letter-spacing:-.02em}
.forge-lb-body .bd-x{width:44px;height:44px;flex:0 0 44px;border-radius:22px;border:1px solid #293346;background:#171e2a;color:#f3f7fc;font:inherit;font-size:20px;padding:0}
.forge-lb-body .bd-body{flex:1;overflow:auto;padding:6px 14px 24px;max-width:560px;width:100%;margin:0 auto;display:flex;flex-direction:column;gap:12px;-webkit-overflow-scrolling:touch}
.forge-lb-body .bd-seg{display:flex;background:#171e2a;border:1px solid #293346;border-radius:22px;padding:4px;gap:4px}
.forge-lb-body .bd-seg button{flex:1;min-height:40px;border-radius:18px;border:0;background:transparent;color:#c3cddb;font:inherit;font-size:14px;font-weight:700}
.forge-lb-body .bd-seg button[aria-pressed="true"]{background:${ACC};color:#142016}
.forge-lb-body .bd-card{background:#171e2a;border:1px solid #293346;border-radius:22px;padding:14px;display:flex;flex-direction:column;gap:10px}
.forge-lb-body .bd-label{font-size:12px;color:#95a3b7;text-transform:uppercase;letter-spacing:1.3px}
.forge-lb-body .bd-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.forge-lb-body .bd-m{background:#0f1620;border:1px solid #293346;border-radius:16px;padding:10px 12px;text-align:left;color:#f3f7fc;font:inherit}
.forge-lb-body .bd-m[aria-pressed="true"]{border-color:${ACC};background:#16211a}
.forge-lb-body .bd-m small{display:block;font-size:12px;color:#95a3b7}
.forge-lb-body .bd-m b{font-size:20px;font-weight:800}
.forge-lb-body .bd-m b span{font-size:13px;font-weight:600;color:#c3cddb;margin-left:3px}
.forge-lb-body .bd-m em{display:block;font-style:normal;font-size:12px;font-weight:700;margin-top:2px}
.forge-lb-body .bd-chart{width:100%;height:120px;display:block}
.forge-lb-body .bd-axis{display:flex;justify-content:space-between;font-size:11px;color:#95a3b7}
.forge-lb-body .bd-empty{font-size:14px;color:#95a3b7;line-height:1.5}
.forge-lb-body .bd-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.forge-lb-body .bd-in{display:flex;flex-direction:column;gap:4px}
.forge-lb-body .bd-in span{font-size:12px;color:#95a3b7;padding-left:4px}
.forge-lb-body .bd-in div{display:flex;align-items:center;background:#0f1620;border:1px solid #3a4556;border-radius:14px;padding:0 12px}
.forge-lb-body .bd-in input{flex:1;min-width:0;height:46px;border:0;background:transparent;color:#f3f7fc;font:inherit;font-size:17px;font-weight:700;padding:0}
.forge-lb-body .bd-in input:focus{outline:none}
.forge-lb-body .bd-in div:focus-within{border-color:${ACC}}
.forge-lb-body .bd-in i{font-style:normal;font-size:13px;color:#95a3b7}
.forge-lb-body .bd-main{width:100%;height:54px;border-radius:27px;border:0;background:${ACC};color:#142016;font:inherit;font-size:16px;font-weight:800}
.forge-lb-body .bd-sec{width:100%;min-height:48px;border-radius:24px;border:1px solid #3a4556;background:transparent;color:#f3f7fc;font:inherit;font-size:15px;font-weight:700}
.forge-lb-body .bd-msg{font-size:13px;color:#ff8a7a;margin:0}.forge-lb-body .bd-msg:empty{display:none}
.forge-lb-body .bd-list>div{display:flex;justify-content:space-between;gap:10px;padding:10px 2px;border-top:1px solid #222b3a;font-size:14px}
.forge-lb-body .bd-list>div:first-child{border-top:0}
.forge-lb-body .bd-list b{font-weight:700;text-align:right}
.forge-lb-body .bd-photos{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.forge-lb-body .bd-ph{position:relative;aspect-ratio:3/4;border-radius:14px;overflow:hidden;border:0;padding:0;background:#0f1620}
.forge-lb-body .bd-ph img{width:100%;height:100%;object-fit:cover;display:block}
.forge-lb-body .bd-ph span{position:absolute;left:6px;bottom:6px;font-size:11px;font-weight:700;background:#0b1018cc;color:#f3f7fc;border-radius:8px;padding:2px 6px}
.forge-lb-body .bd-cmp{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.forge-lb-body .bd-cmp figure{margin:0;display:flex;flex-direction:column;gap:6px}
.forge-lb-body .bd-cmp img{width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:14px;display:block}
.forge-lb-body .bd-cmp figcaption{font-size:12px;color:#c3cddb;text-align:center}
.forge-lb-body .bd-view{position:fixed;inset:0;z-index:2147480060;background:#05080df2;display:flex;flex-direction:column;padding:env(safe-area-inset-top) 14px calc(14px + env(safe-area-inset-bottom))}
.forge-lb-body .bd-view img{flex:1;min-height:0;width:100%;object-fit:contain}
.forge-lb-body .bd-view .bd-vbar{display:flex;align-items:center;gap:10px;padding:10px 0}
.forge-lb-body .bd-view .bd-vbar b{flex:1;font-size:15px}
.forge-lb-body .bd-view .bd-acts{display:flex;gap:10px}
.forge-lb-body .bd-view .bd-acts button{flex:1}
.forge-lb-body .bd-del{width:100%;min-height:48px;border-radius:24px;border:1px solid #5a2b2b;background:transparent;color:#ff8a7a;font:inherit;font-size:15px;font-weight:700}
.forge-lb-body .bd-del.go{background:#ff8a7a;color:#2a0f0b;border-color:#ff8a7a}
.forge-lb-body .bd-note{font-size:12px;color:#95a3b7;line-height:1.45;margin:0}
.forge-lb-body button:focus-visible{outline:2px solid ${ACC};outline-offset:2px}
.forge-lb-body-toast{position:fixed;left:50%;bottom:calc(30px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:2147480070;background:#171e2a;border:1px solid #3a4f2f;color:#f3f7fc;border-radius:16px;padding:12px 16px;font:600 14px Inter,system-ui,sans-serif;max-width:calc(100vw - 32px)}
`;
function ensureCss(){if(!$('forgeLayoutBBodyStyle')){const st=el('style');st.id='forgeLayoutBBodyStyle';st.textContent=CSS;document.head.append(st);}}
let root=null,body=null,ui=null;
function close(){if(root){root.remove();root=null;body=null;ui=null;document.removeEventListener('keydown',onKey,true);}}
function onKey(e){if(e.key!=='Escape')return;e.preventDefault();e.stopPropagation();const v=root&&root.querySelector('.bd-view');if(v)v.remove();else close();}
function toast(t){const x=el('div','forge-lb-body-toast',t);x.setAttribute('role','status');document.body.append(x);setTimeout(()=>x.remove(),2600);}
function open(tab){
 if(!enabled()||!S())return false;
 ensureCss();close();
 ui={tab:tab==='photos'?'photos':'measures',metric:null,form:null,msg:''};
 root=el('div','forge-lb-body');root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Körpermaße & Fotos');
 const head=el('div','bd-head');const x=btn('bd-x','×',close);x.setAttribute('aria-label','Zurück');
 const t=el('div');t.append(el('small','','Erfolge'),el('h1','','Körpermaße & Fotos'));head.append(x,t);
 body=el('div','bd-body');root.append(head,body);document.body.append(root);
 document.addEventListener('keydown',onKey,true);
 draw();return true;
}
function draw(){
 if(!body)return;const top=body.scrollTop;body.textContent='';
 const seg=el('div','bd-seg');seg.setAttribute('role','group');seg.setAttribute('aria-label','Bereich');
 [['measures','Maße'],['photos','Fotos']].forEach(([k,l])=>{const b=btn('',l,()=>{ui.tab=k;draw();});b.setAttribute('aria-pressed',String(ui.tab===k));seg.append(b);});
 body.append(seg);
 if(ui.tab==='photos')drawPhotos();else drawMeasures();
 body.scrollTop=top;
}
function chart(points,color){
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('class','bd-chart');svg.setAttribute('viewBox','0 0 300 120');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('role','img');
 if(points.length<2)return svg;
 const xs=points.map(p=>p.t),ys=points.map(p=>p.v),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
 const X=t=>x1===x0?150:8+(t-x0)/(x1-x0)*284,Y=v=>y1===y0?60:110-(v-y0)/(y1-y0)*100;
 const path=document.createElementNS(ns,'path');path.setAttribute('d',points.map((p,i)=>(i?'L':'M')+X(p.t).toFixed(1)+' '+Y(p.v).toFixed(1)).join(' '));
 path.setAttribute('fill','none');path.setAttribute('stroke',color);path.setAttribute('stroke-width','2.5');path.setAttribute('vector-effect','non-scaling-stroke');path.setAttribute('stroke-linejoin','round');svg.append(path);
 const last=points[points.length-1];const c=document.createElementNS(ns,'circle');c.setAttribute('cx',X(last.t));c.setAttribute('cy',Y(last.v));c.setAttribute('r','4');c.setAttribute('fill',color);svg.append(c);
 return svg;
}
function drawMeasures(){
 const st=S(),list=Array.isArray(st.bodyMeasures)?st.bodyMeasures:[];const sm=summary(list);
 const have=FIELDS.filter(f=>sm[f.key]);
 if(have.length){
  if(!ui.metric||!sm[ui.metric])ui.metric=have[0].key;
  const card=el('div','bd-card');card.append(el('div','bd-label','Aktuell · seit der ersten Messung'));
  const grid=el('div','bd-grid');
  have.forEach(f=>{const s=sm[f.key];const b=btn('bd-m','',()=>{ui.metric=f.key;draw();});b.setAttribute('aria-pressed',String(ui.metric===f.key));
   const v=el('b','',fmt(s.last,1));v.append(el('span','',f.unit));b.append(el('small','',f.label),v);
   if(s.count>1){const d=s.change;const em=el('em','',(d>0?'+':d<0?'−':'±')+fmt(Math.abs(d),1)+' '+f.unit);em.style.color=d===0?'#c3cddb':(f.key==='arm'||f.key==='chest'||f.key==='thigh')?(d>0?ACC:GOLD):(d<0?TEAL:GOLD);b.append(em);}
   grid.append(b);});
  card.append(grid);
  const s=sm[ui.metric],f=FIELDS.find(x=>x.key===ui.metric);
  if(s&&s.points.length>1){card.append(el('div','bd-label',f.label+' · Verlauf'),chart(s.points,TEAL));const ax=el('div','bd-axis');const d=t=>new Date(t).toLocaleDateString('de-DE',{day:'numeric',month:'short'});ax.append(el('span','',d(s.points[0].t)),el('span','',d(s.points[s.points.length-1].t)));card.append(ax);}
  body.append(card);
 }else{const c=el('div','bd-card');c.append(el('p','bd-empty','Noch keine Maße eingetragen. Miss am besten morgens, immer an derselben Stelle – dann siehst du Veränderungen, die die Waage nicht zeigt.'));body.append(c);}
 // new measurement
 if(!ui.form)ui.form=prefill(list);
 const nc=el('div','bd-card');nc.append(el('div','bd-label','Neue Messung · heute'));
 const form=el('div','bd-form');
 FIELDS.forEach(f=>{const l=el('label','bd-in');l.append(el('span','',f.label));const d=el('div');const i=el('input');i.type='text';i.inputMode='decimal';i.placeholder='–';i.value=ui.form[f.key]||'';i.setAttribute('aria-label',f.label+' in '+f.unit);
  i.addEventListener('input',()=>{ui.form[f.key]=i.value;});d.append(i,el('i','',f.unit));l.append(d);form.append(l);});
 nc.append(form);
 const msg=el('p','bd-msg',ui.msg||'');msg.setAttribute('role','alert');nc.append(msg);
 nc.append(btn('bd-main','Messung speichern',saveMeasure));
 body.append(nc);
 if(list.length){
  const lc=el('div','bd-card');lc.append(el('div','bd-label','Letzte Messungen'));const l=el('div','bd-list');
  list.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,6).forEach(m=>{const r=el('div');const parts=FIELDS.filter(f=>Number.isFinite(Number(m[f.key]))).map(f=>f.label+' '+fmt(Number(m[f.key]),1));
   r.append(el('span','',new Date(m.date).toLocaleDateString('de-DE',{day:'numeric',month:'short',year:'2-digit'})),el('b','',parts.join(' · ')));l.append(r);});
  lc.append(l);body.append(lc);
 }
}
function saveMeasure(){
 const st=S();const res=cleanEntry(ui.form,newId(),new Date().toISOString());
 if(!res.ok){ui.msg=res.reason;draw();return;}
 if(!Array.isArray(st.bodyMeasures))st.bodyMeasures=[];
 st.bodyMeasures.push(res.entry);
 try{persist();}catch(e){st.bodyMeasures.pop();ui.msg='Speichern fehlgeschlagen. Bitte Speicher prüfen.';draw();return;}
 ui.msg='';ui.form=null;draw();toast('Messung gespeichert');
}
/* ---------- photos ---------- */
function photos(){const st=S();return Array.isArray(st.bodyPhotos)?st.bodyPhotos.filter(p=>p&&typeof p.data==='string'&&p.data.startsWith('data:image/')):[];}
function dateText(d){return new Date(d).toLocaleDateString('de-DE',{day:'numeric',month:'short',year:'numeric'});}
function drawPhotos(){
 const list=photos().slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 if(list.length>=2){
  const c=el('div','bd-card');c.append(el('div','bd-label','Vorher · Nachher'));
  const cmp=el('div','bd-cmp');[list[0],list[list.length-1]].forEach(p=>{const f=el('figure');const i=el('img');i.src=p.data;i.alt='Foto vom '+dateText(p.date);f.append(i,el('figcaption','',dateText(p.date)));cmp.append(f);});
  c.append(cmp);body.append(c);
 }
 const c=el('div','bd-card');c.append(el('div','bd-label','Deine Fotos · '+list.length+' von '+MAX_PHOTOS));
 if(list.length){const g=el('div','bd-photos');list.slice().reverse().forEach(p=>{const b=btn('bd-ph','',()=>viewPhoto(p));const i=el('img');i.src=p.data;i.alt='';i.loading='lazy';b.append(i,el('span','',new Date(p.date).toLocaleDateString('de-DE',{day:'numeric',month:'short'})));b.setAttribute('aria-label','Foto vom '+dateText(p.date)+' ansehen');g.append(b);});c.append(g);}
 else c.append(el('p','bd-empty','Noch keine Fotos. Am besten alle 2–4 Wochen: gleiches Licht, gleiche Pose, gleiche Uhrzeit.'));
 const file=el('input');file.type='file';file.accept='image/*';file.hidden=true;
 file.addEventListener('change',()=>{const f=file.files&&file.files[0];file.value='';if(f)addPhoto(f);});
 const add=btn('bd-main','Foto hinzufügen',()=>file.click());add.disabled=list.length>=MAX_PHOTOS;
 const msg=el('p','bd-msg',ui.msg||'');msg.setAttribute('role','alert');
 c.append(add,file,msg,el('p','bd-note','Fotos bleiben auf diesem Gerät und sind Teil deiner Datensicherung.'));
 body.append(c);
}
function addPhoto(file){
 if(!/^image\//.test(file.type||'')){ui.msg='Bitte ein Bild wählen.';draw();return;}
 const url=URL.createObjectURL(file);const img=new Image();
 img.onload=()=>{
  try{
   const sz=fitSize(img.naturalWidth||img.width,img.naturalHeight||img.height);
   const cv=document.createElement('canvas');cv.width=sz.w;cv.height=sz.h;cv.getContext('2d').drawImage(img,0,0,sz.w,sz.h);
   const data=cv.toDataURL('image/jpeg',0.72);URL.revokeObjectURL(url);
   const st=S();if(!Array.isArray(st.bodyPhotos))st.bodyPhotos=[];
   if(photos().length>=MAX_PHOTOS){ui.msg='Maximal '+MAX_PHOTOS+' Fotos. Lösch ein älteres Foto.';draw();return;}
   st.bodyPhotos.push({id:newId(),date:new Date().toISOString(),data});
   try{persist();}catch(e){st.bodyPhotos.pop();ui.msg='Kein Platz mehr im Gerätespeicher der App. Lösch ältere Fotos.';draw();return;}
   ui.msg='';draw();toast('Foto gespeichert');
  }catch(e){URL.revokeObjectURL(url);ui.msg='Das Foto konnte nicht verarbeitet werden.';draw();}
 };
 img.onerror=()=>{URL.revokeObjectURL(url);ui.msg='Das Foto konnte nicht gelesen werden.';draw();};
 img.src=url;
}
function viewPhoto(p){
 root.querySelector('.bd-view')?.remove();
 const v=el('div','bd-view');v.setAttribute('role','dialog');v.setAttribute('aria-label','Foto');
 const bar=el('div','bd-vbar');bar.append(el('b','',dateText(p.date)));const x=btn('bd-x','×',()=>v.remove());x.setAttribute('aria-label','Schließen');bar.append(x);
 const i=el('img');i.src=p.data;i.alt='Foto vom '+dateText(p.date);
 let armed=false;const del=btn('bd-del','Foto löschen',()=>{
  if(!armed){armed=true;del.textContent='Wirklich löschen?';del.classList.add('go');return;}
  const st=S();const before=st.bodyPhotos.slice();st.bodyPhotos=st.bodyPhotos.filter(x=>x.id!==p.id);
  try{persist();}catch(e){st.bodyPhotos=before;}
  v.remove();draw();toast('Foto gelöscht');
 });
 const acts=el('div','bd-acts');acts.append(del);
 v.append(bar,i,acts);root.append(v);x.focus({preventScroll:true});
}
function install(){if(!document.body||!enabled())return false;window.forgeOpenBody=open;return true;}
function boot(){if(install())return;let k=0;const t=setInterval(()=>{if(install()||++k>20)clearInterval(t);},250);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
