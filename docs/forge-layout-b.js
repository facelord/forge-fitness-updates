/* FORGE Layout B · Phase 1: Fundament.
 * - Blau-Schwarz-Palette (#0b1018 / #171e2a / #293346, Akzent #a9f267)
 * - Pill-Navigation Plan · Workout · Essen · Erfolge
 * - Seitliches Wischen zwischen den vier Bereichen
 * - Schalter in den Einstellungen zurück zum bisherigen Layout
 * Presentation only: no state writes, no storage migration, no handler replacement.
 * The palette is applied by remapping colours in existing stylesheets/inline
 * styles, so the ~50 older layout layers keep working unchanged.
 */
(function(){
'use strict';
const PREF_KEY='forge_layout_b';
const PAGES=Object.freeze(['plan','workout','nutrition','progress']);
const LABELS=Object.freeze({plan:'Plan',workout:'Workout',nutrition:'Essen',progress:'Erfolge'});
const B=Object.freeze({bg:'#0b1018',panel:'#171e2a',raised:'#202a38',line:'#293346',muted:'#95a3b7',text:'#f3f7fc',accent:'#a9f267',onAccent:'#142016'});
const $=id=>document.getElementById(id);
const SWIPE=Object.freeze({minDx:70,ratio:1.6,maxMs:700,edge:24});
/* Decides whether a finished gesture switches pages. Pure (tested). */
function swipeTarget(current,dx,dy,ms){
 const i=PAGES.indexOf(current);
 if(i<0)return null;
 if(Math.abs(dx)<SWIPE.minDx||Math.abs(dx)<Math.abs(dy)*SWIPE.ratio||ms>SWIPE.maxMs)return null;
 const j=dx<0?i+1:i-1;
 return j>=0&&j<PAGES.length?PAGES[j]:null;
}

function enabled(){
 // ?forge-layout=legacy shows the previous layout for this page load only
 // (used by the legacy layout regression audits; nothing is stored).
 try{if(/[?&]forge-layout=legacy\b/.test(location.search))return false;}catch(e){}
 try{return localStorage.getItem(PREF_KEY)!=='off';}catch(e){return true;}
}
function setEnabled(on){
 try{localStorage.setItem(PREF_KEY,on?'on':'off');}catch(e){}
}

/* ---------- colour remapping ---------- */
function clamp(v,a,b){return Math.min(b,Math.max(a,v));}
function rgbToHsl(r,g,b){
 r/=255;g/=255;b/=255;
 const max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2;
 if(max===min)return [0,0,l];
 const d=max-min,s=l>.5?d/(2-max-min):d/(max+min);
 let h=max===r?(g-b)/d+(g<b?6:0):max===g?(b-r)/d+2:(r-g)/d+4;
 return [h*60,s,l];
}
function hslToRgb(h,s,l){
 h=((h%360)+360)%360/360;
 if(s===0){const v=Math.round(l*255);return [v,v,v];}
 const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;
 const f=t=>{t=(t+1)%1;return t<1/6?p+(q-p)*6*t:t<1/2?q:t<2/3?p+(q-p)*(2/3-t)*6:p;};
 return [f(h+1/3),f(h),f(h-1/3)].map(v=>Math.round(clamp(v,0,1)*255));
}
/* Returns the Layout-B equivalent of an rgb colour. Pure function (tested). */
function mapRgb(r,g,b){
 const [h,s,l]=rgbToHsl(r,g,b);
 // 1) Lime accents (#9eff00, #a8f55d, ...) -> #a9f267 family.
 if(s>=.55&&h>=60&&h<=115&&l>=.35){
  if(l>=.8)return hslToRgb(92,.84,l);           // pale lime tints keep their lightness
  return [169,242,103];                         // #a9f267
 }
 // 2) Whites and near-whites stay as they are.
 if(l>=.93)return [r,g,b];
 // 3) Saturated non-green colours (warnings, reds, gold, success-green) stay.
 if(s>=.45&&!(h>=60&&h<=230))return [r,g,b];
 if(s>=.45&&h>115&&h<170&&l>=.3)return [r,g,b];
 // 4) Dark green accent tints (active states, "done" cards) keep a green hint like the design.
 if(h>=80&&h<=165&&s>=.28&&l<.35)return hslToRgb(hue(h),clamp(s,.2,.3),l);
 // 5) Everything else neutral / teal / green-grey / black -> B blue-grey.
 if(l<.4){
  const sat=l<.03?0:l<.1?.37:l<.18?.29:.24;
  return hslToRgb(218,sat,Math.max(l,.035));
 }
 return hslToRgb(216,clamp(s,.12,.22),l);      // light greys / muted text
}
function hue(h){return h<110?108:137;}
function hex2(n){return n.toString(16).padStart(2,'0');}
function mapHex(token){
 let h=token.slice(1);
 if(h.length===3||h.length===4)h=h.split('').map(c=>c+c).join('');
 if(h.length!==6&&h.length!==8)return token;
 const [r,g,b]=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16));
 const out=mapRgb(r,g,b);
 return '#'+out.map(hex2).join('')+(h.length===8?h.slice(6):'');
}
const COLOR_RE=/#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(,\s*[\d.]+\s*)?\)/g;
const cache=new Map();
function remapCss(text){
 if(!text||typeof text!=='string')return text;
 const hit=cache.get(text);if(hit!==undefined)return hit;
 const out=text.replace(COLOR_RE,(m,r,g,b,a)=>{
  if(m[0]==='#')return mapHex(m);
  const c=mapRgb(+r,+g,+b);
  return a?'rgba('+c.join(',')+a+')':'rgb('+c.join(',')+')';
 });
 if(cache.size>4000)cache.clear();
 cache.set(text,out);
 return out;
}
window.ForgeLayoutB=Object.freeze({PAGES,LABELS,B,mapHex,remapCss,enabled,swipeTarget});

if(typeof document==='undefined')return;

const original=new WeakMap();
function remapStyleEl(el){
 if(!el||(el.id&&el.id.indexOf('forgeLayoutB')===0))return;   // own B styles use the design colours verbatim
 const text=el.textContent;
 if(original.get(el)===text)return;            // unchanged since our own write
 const out=remapCss(text);
 if(out!==text){el.textContent=out;}
 original.set(el,el.textContent);
}
function remapInline(el){
 const v=el.getAttribute&&el.getAttribute('style');
 if(!v)return;
 const out=remapCss(v);
 if(out!==v)el.setAttribute('style',out);
}
function sweep(root){
 if(!root||root.nodeType!==1)return;
 if(root.tagName==='STYLE'){remapStyleEl(root);return;}
 if(root.hasAttribute('style'))remapInline(root);
 root.querySelectorAll('style').forEach(remapStyleEl);
 root.querySelectorAll('[style]').forEach(remapInline);
}

/* ---------- own styles ---------- */
const CSS=`
@font-face{font-family:'Inter';src:url('./fonts/InterVariable.woff2') format('woff2');font-weight:100 900;font-style:normal;font-display:swap}
:root{--bg:${B.bg};--panel:${B.panel};--muted:${B.muted};--line:${B.line};--accent:${B.accent};--text:${B.text};--forge-b-accent:${B.accent}}
html,body.forge-layout-b{background:${B.bg}!important}
body.forge-layout-b,body.forge-layout-b button,body.forge-layout-b input,body.forge-layout-b select,body.forge-layout-b textarea{font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif!important}
body.forge-layout-b #nav.forge-simple-nav{position:fixed;left:12px!important;right:12px!important;bottom:calc(10px + env(safe-area-inset-bottom))!important;width:auto!important;height:58px!important;min-height:0!important;padding:5px!important;gap:4px!important;border-radius:29px!important;background:${B.panel}!important;border:1px solid ${B.line}!important;box-shadow:0 10px 28px #0009!important;box-sizing:border-box}
body.forge-layout-b #nav.forge-simple-nav button{min-height:0!important;height:100%!important;padding:0 2px!important;border-radius:24px!important;background:transparent!important;color:${B.muted}!important;font-size:13px!important;font-weight:600!important;flex-direction:row!important;gap:0!important;box-shadow:none!important;border:0!important;transition:background .18s,color .18s}
body.forge-layout-b #nav.forge-simple-nav button .ico{display:none!important}
body.forge-layout-b #nav.forge-simple-nav button:before{display:none!important}
body.forge-layout-b #nav.forge-simple-nav button.active{background:${B.accent}!important;color:${B.onAccent}!important;font-weight:800!important}
body.forge-layout-b #nav.forge-simple-nav button:focus-visible{outline:2px solid ${B.accent}!important;outline-offset:2px!important}
body.forge-layout-b .page.forge-b-swipe-in-left{animation:forgeBInLeft .22s ease-out}
body.forge-layout-b .page.forge-b-swipe-in-right{animation:forgeBInRight .22s ease-out}
@keyframes forgeBInLeft{from{transform:translateX(28px);opacity:.4}to{transform:none;opacity:1}}
@keyframes forgeBInRight{from{transform:translateX(-28px);opacity:.4}to{transform:none;opacity:1}}
@media (prefers-reduced-motion:reduce){body.forge-layout-b .page{animation:none!important}}
.forge-b-swipe-hint{position:fixed;left:50%;bottom:calc(78px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:60;padding:8px 14px;border-radius:16px;background:${B.raised};border:1px solid ${B.line};color:${B.text};font-size:12px;white-space:nowrap;box-shadow:0 8px 20px #0008;pointer-events:none;transition:opacity .4s}
.forge-b-setting{display:flex;align-items:center;justify-content:space-between;gap:12px}
.forge-b-setting small{display:block;color:${B.muted};font-size:12px;margin-top:2px}
`;
function installStyles(){
 if($('forgeLayoutBStyle'))return;
 const s=document.createElement('style');s.id='forgeLayoutBStyle';s.textContent=CSS;
 document.head.append(s);
}

/* ---------- navigation ---------- */
function activePage(){return document.querySelector('.page.active')?.id||'plan';}
function relabelNav(){
 const bar=$('nav');if(!bar)return;
 for(const id of PAGES){
  const b=bar.querySelector('button[data-page="'+id+'"]');if(!b)continue;
  const label=LABELS[id];
  if(b.getAttribute('aria-label')!==label)b.setAttribute('aria-label',label);
  let t=b.querySelector('.forge-b-label');
  if(!t){
   Array.from(b.childNodes).forEach(n=>{if(n.nodeType===3)n.remove();});
   t=document.createElement('span');t.className='forge-b-label';b.append(t);
  }
  if(t.textContent!==label)t.textContent=label;
 }
}
/* Older modules (UX 1.49, Mobile-Polish) also navigate on touchend. In Layout B
 * this module owns the gesture: during a touchend dispatch only our own go() runs. */
let gestureGate=false,ownNavigation=false;
const HEADINGS=Object.freeze({nutrition:['Ernährung','Essen'],progress:['Fortschritt','Erfolge']});
function relabelHeadings(){
 for(const [id,[from,to]] of Object.entries(HEADINGS)){
  const h=document.querySelector('#'+id+' > h1');
  if(h&&h.textContent.trim()===from)h.textContent=to;
 }
}
function wrapGo(){
 const prior=window.go;
 if(typeof prior!=='function'||prior.forgeLayoutB)return false;
 const wrapped=function(p){
  if(gestureGate&&!ownNavigation)return undefined;
  const r=prior.apply(this,arguments);
  try{relabelNav();relabelHeadings();}catch(e){}
  return r;
 };
 wrapped.forgeLayoutB=true;
 window.go=wrapped;
 try{go=wrapped;}catch(e){}                       // inline onclick handlers use the global binding
 return true;
}

/* ---------- swipe ---------- */
function blocked(target){
 if(!target||!target.closest)return true;
 if(target.closest('input,textarea,select,[contenteditable="true"],[role="slider"],canvas,.forge-no-swipe'))return true;
 if(document.querySelector('.forge-settings-overlay,[aria-modal="true"],.forge-upd-overlay,dialog[open]'))return true;
 if(document.body.classList.contains('forge-compact-typing'))return true;
 // Active workout: horizontal gestures are reserved for the exercise view (Phase 2).
 if(activePage()==='workout'&&typeof state!=='undefined'&&state&&state.activeWorkout)return true;
 // Horizontally scrollable containers keep their own scrolling.
 for(let n=target;n&&n!==document.body;n=n.parentElement){
  if(n.scrollWidth>n.clientWidth+4){
   const ox=getComputedStyle(n).overflowX;
   if(ox==='auto'||ox==='scroll')return true;
  }
 }
 return false;
}
let touch=null;
function onStart(e){
 if(e.touches.length!==1){touch=null;return;}
 const t=e.touches[0],w=window.innerWidth||390;
 if(t.clientX<SWIPE.edge||t.clientX>w-SWIPE.edge||blocked(e.target)){touch=null;return;}
 touch={x:t.clientX,y:t.clientY,at:Date.now()};
}
function onEnd(e){
 gestureGate=true;setTimeout(()=>{gestureGate=false;},0);
 if(!touch)return;
 const t=e.changedTouches[0],start=touch;touch=null;
 if(!t)return;
 const next=swipeTarget(activePage(),t.clientX-start.x,t.clientY-start.y,Date.now()-start.at);
 if(!next||typeof window.go!=='function')return;
 const from=PAGES.indexOf(activePage());
 ownNavigation=true;
 try{window.go(next);}finally{ownNavigation=false;}
 const page=$(next);
 if(page){
  const cls=PAGES.indexOf(next)>from?'forge-b-swipe-in-left':'forge-b-swipe-in-right';
  page.classList.remove('forge-b-swipe-in-left','forge-b-swipe-in-right');
  void page.offsetWidth;page.classList.add(cls);
  setTimeout(()=>page.classList.remove(cls),260);
 }
 try{localStorage.setItem('forge_layout_b_swiped','1');}catch(e){}
}
function swipeHint(){
 try{if(localStorage.getItem('forge_layout_b_swiped')==='1')return;
  const n=+(localStorage.getItem('forge_layout_b_hint')||0);if(n>=3)return;
  localStorage.setItem('forge_layout_b_hint',String(n+1));}catch(e){return;}
 const h=document.createElement('div');h.className='forge-b-swipe-hint';h.setAttribute('role','status');
 h.textContent='Tipp: Zur Seite wischen für den nächsten Bereich';
 document.body.append(h);
 setTimeout(()=>{h.style.opacity='0';},3600);setTimeout(()=>h.remove(),4100);
}

/* ---------- settings switch ---------- */
function settingsRow(){
 const sheet=document.querySelector('.forge-settings-overlay .forge-settings-sheet');
 if(!sheet||sheet.querySelector('#forgeLayoutBToggle'))return;
 const section=sheet.querySelector('.forge-settings-section')||sheet;
 const label=document.createElement('label');label.className='forge-settings-row forge-b-setting';
 const text=document.createElement('span');text.textContent='Neues Design (Layout B)';
 const sub=document.createElement('small');sub.textContent='Aus = bisheriges Aussehen. Deine Daten bleiben unverändert.';
 text.append(sub);
 const input=document.createElement('input');input.type='checkbox';input.id='forgeLayoutBToggle';input.checked=enabled();
 input.addEventListener('change',()=>{setEnabled(input.checked);setTimeout(()=>location.reload(),150);});
 label.append(text,input);
 const heading=section.querySelector('h3');
 if(heading)heading.after(label);else section.append(label);
}

/* ---------- install ---------- */
let installed=false;
function install(){
 if(installed||!document.body)return;
 installed=true;
 // The settings switch is offered in both modes so B can be turned back on.
 new MutationObserver(()=>settingsRow()).observe(document.body,{childList:true});
 if(!enabled())return;
 document.body.classList.add('forge-layout-b');
 installStyles();
 sweep(document.documentElement);
 new MutationObserver(list=>{
  for(const m of list){
   if(m.type==='attributes'){if(m.attributeName==='style')remapInline(m.target);continue;}
   if(m.type==='characterData'){const p=m.target.parentNode;if(p&&p.tagName==='STYLE')remapStyleEl(p);continue;}
   if(m.target&&m.target.tagName==='STYLE')remapStyleEl(m.target);
   m.addedNodes.forEach(sweep);
  }
 }).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['style'],characterData:true});
 wrapGo();relabelNav();relabelHeadings();
 setTimeout(()=>{wrapGo();relabelNav();relabelHeadings();},800);   // after later modules re-wrap go()
 window.addEventListener('touchstart',onStart,{passive:true,capture:true});
 window.addEventListener('touchend',onEnd,{passive:true,capture:true});
 window.addEventListener('touchend',()=>{gestureGate=false;},{passive:true});
 window.addEventListener('touchcancel',()=>{touch=null;gestureGate=false;},{passive:true,capture:true});
 setTimeout(swipeHint,1800);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();
