/* FORGE – image zoom viewer (formerly also 19 atlas SVGs, now on the V12 boards). 
 * Red = primary, orange = supporting; replaces only the third image.
 * First two position photos, mobility cards, approved shoulder rotation untouched.
 */
(function(){
'use strict';
// The 19 separate atlas SVGs were superseded by the V12 boards and removed;
// this module keeps the shared zoom viewer for boards and photos.
const images={};
const gridQuery='.forge165-photo-grid,.forge166-photo-grid,.forge167-photo-grid,.forge169-photo-grid';
const zoomQuery='.forge165-photo-grid img,.forge166-photo-grid img,.forge167-photo-grid img,.forge169-photo-grid img,#forgeCatalog .forge-mob-card-scroll img,#forgeCatalog .forge-mob-photos img,.forge-media-v8-mobility-anatomy img,.forge-v101-chest-grid img,.forge-strength-board img,#forgePremiumHero .forge-b-main-photo.forge-strength-board-hero img';
const originalExercise=window.forgeExerciseIllustrations;
const originalCatalog=window.forgePublicExercisePictures;
function assetFor(name){return Object.prototype.hasOwnProperty.call(images,name)?'./muscle-atlas-v2/'+images[name]:null;}
function patch(name,render){
 const html=typeof render==='function'?render(name):'';
 const file=assetFor(name);
 if(!file||!html)return html;
 const tmp=document.createElement('div');tmp.innerHTML=html;
 const figs=tmp.querySelector(gridQuery)?.querySelectorAll(':scope > figure');
 if(!figs||figs.length!==3)return html;
 const img=figs[2].querySelector('img');
 if(!img)return html;
 img.setAttribute('src',file);
 img.alt=name+' – anatomische Vorder- und Rückansicht: Hauptmuskeln rot, unterstützende Muskeln orange';
 img.classList.add('forge-anatomy-v2-image');
 img.tabIndex=0;img.setAttribute('role','button');
 img.setAttribute('aria-label',img.alt+'; zum Vergrößern tippen');
 figs[2].classList.add('forge-anatomy-v2-figure');
 const legend=document.createElement('p');legend.className='forge-anatomy-v2-legend';
 legend.textContent='Rot: Hauptmuskeln · Orange: unterstützend · Zum Vergrößern tippen';
 figs[2].append(legend);
 return tmp.innerHTML;
}
window.forgeExerciseIllustrations=name=>patch(name,originalExercise);
window.forgePublicExercisePictures=name=>patch(name,originalCatalog);
window.ForgeMuscleUpgradeQA=Object.freeze({names:Object.keys(images),files:images,assetFor,patch});
function styles(){
 if(document.getElementById('forge-anatomy-v2-style'))return;
 const el=document.createElement('style');el.id='forge-anatomy-v2-style';
 el.textContent=`
 .forge165-photo-grid img,.forge166-photo-grid img,.forge167-photo-grid img,.forge169-photo-grid img,#forgeCatalog .forge-mob-card-scroll img,#forgeCatalog .forge-mob-photos img,.forge-media-v8-mobility-anatomy img,.forge-v101-chest-grid img,.forge-strength-board img,#forgePremiumHero .forge-b-main-photo.forge-strength-board-hero img{cursor:zoom-in}
 .forge-anatomy-v2-figure img.forge-anatomy-v2-image{display:block;width:100%!important;height:auto!important;max-height:none!important;aspect-ratio:1420/1240!important;object-fit:contain!important;background:#061720!important}
 .forge-anatomy-v2-legend{font-size:11px!important;color:#cedbd2!important;line-height:1.5!important;text-align:center;padding:6px 8px 9px!important;margin:0!important}
 .forge-anatomy-v2-image:focus-visible{outline:3px solid #a8f55d;outline-offset:2px}
 .forge-anatomy-v2-modal{position:fixed;inset:0;z-index:2147483640;background:rgba(3,10,15,.72);color:#f5fff7;display:flex;align-items:center;justify-content:center;padding:clamp(14px,4vw,32px);box-sizing:border-box;touch-action:manipulation}
 .forge-anatomy-v2-panel{width:min(640px,100%);height:min(78dvh,720px);max-height:calc(100dvh - 28px);min-height:0;display:flex;flex-direction:column;overflow:hidden;border:1px solid #3c5f50;border-radius:16px;background:#091a1c;box-shadow:0 18px 65px rgba(0,0,0,.65);touch-action:auto}
 .forge-anatomy-v2-bar{display:flex;flex:none;align-items:center;gap:6px;background:#102630;padding:5px 8px}
 .forge-anatomy-v2-bar strong{flex:1;min-width:0;font-size:12px;line-height:1.2;max-height:3.6em;overflow:hidden}
 .forge-anatomy-v2-bar button{min-width:44px;min-height:44px;border-radius:9px;border:1px solid #4b746f;background:#1b3641;color:white;font-size:22px}
 .forge-anatomy-v2-stage{flex:1;min-width:0;min-height:0;box-sizing:border-box;display:flex;justify-content:center;align-items:center;overflow:hidden;padding:8px 10px;touch-action:none;cursor:grab}
 .forge-anatomy-v2-stage img{display:block;flex:none;min-width:0;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;object-position:center center;pointer-events:none;user-select:none;-webkit-user-drag:none;transform-origin:center center;will-change:transform}
 .forge-anatomy-v2-stage{position:relative}
 .forge-ai-badge-zoom{position:absolute;right:10px;bottom:8px;z-index:3;font:600 11px/1.1 Inter,system-ui,sans-serif;color:#d8dfdb;background:rgba(5,9,10,.78);border:1px solid rgba(255,255,255,.18);border-radius:7px;padding:3px 7px;pointer-events:none}
 .forge-anatomy-v2-help{flex:none;text-align:center;padding:4px 8px 6px;font-size:11px;color:#b9d0ca}
 /* Board: fit its complete 4:3 landscape composition without blank vertical space. */
 .forge-anatomy-v2-board-panel{width:min(640px,100%);height:auto;max-height:calc(100dvh - 28px)}
 .forge-anatomy-v2-board-panel .forge-anatomy-v2-stage{flex:0 0 auto;width:100%;height:auto;min-height:0;aspect-ratio:1448/1086;padding:0}
 .forge-anatomy-v2-board-panel .forge-anatomy-v2-stage img{width:100%;height:auto;max-width:100%;max-height:100%;object-fit:contain;object-position:center center}
 `;
 document.head.append(el);
}
let current=null;
function zoomOpen(source){
 if(current)current();
 const box=document.createElement('div');box.className='forge-anatomy-v2-modal';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','Übungsbild vergrößern');
 const bar=document.createElement('div');bar.className='forge-anatomy-v2-bar';
 const boardImage=!!(source.classList?.contains?.('forge-strength-board-image')||
  source.closest?.('.forge-strength-board-hero')?.classList?.contains?.('forge-strength-board-hero'));
 const title=document.createElement('strong');title.textContent=boardImage?'FORGE-Übungstafel':source.alt||'Übungsbild';
 const make=(text,label)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-label',label);return b;};
 const minus=make('−','Verkleinern'),plus=make('+','Vergrößern'),reset=make('↺','Zoom zurücksetzen'),exit=make('✕','Schließen');
 bar.append(title,minus,plus,reset,exit);
 const stage=document.createElement('div');stage.className='forge-anatomy-v2-stage';
 const img=document.createElement('img');img.src=source.currentSrc||source.src;img.alt=source.alt||'';img.draggable=false;
 // V10.2: every opening starts at 1x fit-to-contain, never at a test zoom.
 img.style.transform='translate(0px, 0px) scale(1)';stage.append(img);
 // Transparenz: KI-generierte Übungstafeln (Kraft + Band-Mobilität) bleiben auch im Zoom gekennzeichnet.
 if((boardImage||/(strength|mobility)-boards\//.test(img.src||''))&&!window.ForgeMobilityCatalog?.boardLabeled?.(source.getAttribute('src'))){const ai=document.createElement('span');ai.className='forge-ai-badge forge-ai-badge-zoom';ai.setAttribute('role','note');ai.textContent='KI-generiert';stage.append(ai);}
 const help=document.createElement('div');help.className='forge-anatomy-v2-help';help.textContent='Zwei Finger: Zoom · Tippe daneben zum Schließen';
 const panel=document.createElement('div');panel.className='forge-anatomy-v2-panel'+(boardImage?' forge-anatomy-v2-board-panel':'');panel.append(bar,stage,help);box.append(panel);
 let z=1,x=0,y=0,prior=0;const pointers=new Map(),oldOverflow=document.body.style.overflow,oldFocus=document.activeElement;
 function draw(){img.style.transform='translate('+x+'px,'+y+'px) scale('+z+')';}
 function setZoom(next){z=Math.min(6,Math.max(1,next));if(z===1){x=0;y=0;}draw();}
 function close(){box.remove();document.body.style.overflow=oldOverflow;document.removeEventListener('keydown',key,true);if(oldFocus?.focus)oldFocus.focus();if(current===close)current=null;}
 current=close;
 function key(e){if(e.key==='Escape'){e.preventDefault();close();}else if(e.key==='+'||e.key==='='){e.preventDefault();setZoom(z*1.3);}else if(e.key==='-'){e.preventDefault();setZoom(z/1.3);}}
 minus.addEventListener('click',()=>setZoom(z/1.35));
 plus.addEventListener('click',()=>setZoom(z*1.35));
 reset.addEventListener('click',()=>setZoom(1));
 exit.addEventListener('click',close);
 // Click or tap the dimmed page, never the image/panel, to dismiss.
 box.addEventListener('click',event=>{if(event.target===box)close();});
 stage.addEventListener('dblclick',()=>setZoom(z>1?1:2.3));
 stage.addEventListener('wheel',e=>{e.preventDefault();setZoom(z*(e.deltaY<0?1.16:1/1.16));},{passive:false});
 const span=()=>{const a=[...pointers.values()];return a.length===2?Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y):0;};
 stage.addEventListener('pointerdown',e=>{e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});stage.setPointerCapture?.(e.pointerId);if(pointers.size===2)prior=span();});
 stage.addEventListener('pointermove',e=>{let p=pointers.get(e.pointerId);if(!p)return;e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const now=span();if(prior>0)setZoom(z*now/prior);prior=now;}else if(z>1){x+=e.clientX-p.x;y+=e.clientY-p.y;draw();}});
 const release=e=>{pointers.delete(e.pointerId);prior=pointers.size===2?span():0;};
 stage.addEventListener('pointerup',release);stage.addEventListener('pointercancel',release);
 document.body.append(box);document.body.style.overflow='hidden';document.addEventListener('keydown',key,true);exit.focus();
}
function init(){
 styles();
 if(document.documentElement.dataset.forgeAnatomyV2ZoomInit)return;
 document.documentElement.dataset.forgeAnatomyV2ZoomInit='1';
 document.addEventListener('click',event=>{
  const img=event.target?.closest?.(zoomQuery);if(!img)return;
  event.preventDefault();zoomOpen(img);
 },true);
 document.addEventListener('keydown',event=>{
  const img=event.target?.matches?.(zoomQuery)?event.target:null;
  if(!img||(event.key!=='Enter'&&event.key!==' '))return;
  event.preventDefault();zoomOpen(img);
 },true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
