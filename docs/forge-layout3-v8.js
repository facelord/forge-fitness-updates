/* FORGE V8 · Layout 3: instrument cockpit for the existing LIVE workout.
 * Presentation only. The native #forge130QuickKg/#forge130QuickReps inputs and
 * their existing input/save handlers remain the single source of truth.
 * No synthetic workout state, no duplicate save logic, no fixed-position docks.
 */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const SVG_NS='http://www.w3.org/2000/svg';
 const css=String.raw`
#workout.forge-compact-live.forge-premium-layout #forgePremiumShell.forge-v8-instruments{
 display:grid!important;
 grid-template-rows:36px 57px 37px auto minmax(145px,1fr) auto 47px!important;
 grid-template-columns:minmax(0,1fr)!important;
 row-gap:5px!important;
 box-sizing:border-box!important;
 min-width:0!important;
 overflow-x:hidden!important;
 overflow-y:auto!important;
 overscroll-behavior-y:contain!important;
 padding:5px 10px calc(9px + env(safe-area-inset-bottom,0px))!important;
 scrollbar-width:thin;
 scrollbar-color:#344932 transparent;
}
#workout.forge-compact-live.forge-premium-layout .forge-b-media{
 min-height:145px!important;
 border:0!important;border-radius:0!important;
 background:transparent!important;box-shadow:none!important;
}
#workout.forge-compact-live.forge-premium-layout .forge-b-set-panel{
 position:relative!important;min-width:0!important;max-height:none!important;
 overflow:visible!important;padding:8px!important;margin:0!important;
 border:1px solid rgba(166,231,139,.13)!important;
 border-radius:17px!important;background:linear-gradient(160deg,#151b17,#0c100d)!important;
 box-shadow:none!important;
}
#workout.forge-compact-live.forge-premium-layout #forgeQuickWorkout,
#workout.forge-compact-live.forge-premium-layout #forgeQuickWorkout>.forge130-focus-card{
 position:static!important;width:100%!important;min-width:0!important;
 max-height:none!important;height:auto!important;overflow:visible!important;
 padding:0!important;margin:0!important;border:0!important;box-shadow:none!important;
 background:transparent!important;
}
#workout.forge-compact-live.forge-premium-layout #forgeQuickWorkout>.forge130-focus-card{
 display:grid!important;grid-template-columns:44px minmax(0,1fr) 44px!important;
 grid-template-rows:auto auto 48px!important;
 align-items:stretch!important;gap:6px!important;
}
#workout.forge-compact-live.forge-premium-layout #forgeQuickWorkout .forge130-focus-card-grid{
 grid-column:1/-1!important;grid-row:1!important;display:grid!important;
 grid-template-columns:repeat(2,minmax(0,1fr))!important;
 gap:7px!important;margin:0!important;padding:0!important;
}
#workout.forge-compact-live.forge-premium-layout #forgeQuickWorkout .forge130-focus-card-grid>label.forge-v8-dial{
 position:relative!important;display:block!important;
 box-sizing:border-box!important;width:100%!important;min-width:0!important;
 height:131px!important;min-height:131px!important;max-height:none!important;
 padding:6px 4px 4px!important;margin:0!important;
 border:1px solid rgba(169,231,137,.17)!important;
 border-radius:14px!important;overflow:hidden!important;
 background:radial-gradient(ellipse at 50% 98%,#1e321b 0%,#111915 53%,#101411 100%)!important;
 box-shadow:none!important;
 font-size:0!important;text-align:center!important;
}
#workout.forge-compact-live.forge-premium-layout #forgeQuickWorkout .forge-v8-dial>.forge-v8-label{
 display:block!important;position:absolute!important;top:8px!important;left:0!important;
 width:100%!important;font-size:10px!important;line-height:1.2!important;
 text-transform:uppercase!important;letter-spacing:.065em!important;
 color:#c5d4c1!important;font-weight:750!important;white-space:nowrap!important;
}
#workout.forge-compact-live.forge-premium-layout #forgeQuickWorkout .forge-v8-arc{
 display:block!important;position:absolute!important;
 top:11px!important;left:50%!important;transform:translateX(-50%)!important;
 width:min(94%,180px)!important;height:88px!important;
 pointer-events:none!important;overflow:visible!important;
}
#workout.forge-compact-live.forge-premium-layout #forgeQuickWorkout .forge-v8-dial input{
 display:block!important;position:absolute!important;
 top:43px!important;left:50%!important;transform:translateX(-50%)!important;
 width:calc(100% - 70px)!important;min-width:48px!important;
 height:43px!important;min-height:43px!important;max-height:43px!important;
 box-sizing:border-box!important;margin:0!important;padding:0!important;
 border:0!important;border-radius:0!important;background:transparent!important;
 text-align:center!important;font:800 clamp(23px,7.5vw,34px)/1.12 system-ui,sans-serif!important;
 color:#f5ffed!important;box-shadow:none!important;
 -moz-appearance:textfield!important;
}
#workout.forge-compact-live.forge-premium-layout #forgeQuickWorkout .forge-v8-dial input::-webkit-inner-spin-button,
#workout.forge-compact-live.forge-premium-layout #forgeQuickWorkout .forge-v8-dial input::-webkit-outer-spin-button{
 -webkit-appearance:none!important;margin:0!important;
}
#workout.forge-compact-live.forge-premium-layout #forgeQuickWorkout .forge-v8-dial input:focus{
 outline:2px solid #9eff00!important;outline-offset:2px!important;
 border-radius:4px!important;
}
#workout.forge-compact-live.forge-premium-layout #forgeQuickWorkout .forge-v8-unit{
 position:absolute!important;left:50%!important;top:88px!important;
 transform:translateX(-50%)!important;display:block!important;
 white-space:nowrap!important;color:#b4c4ad!important;font-size:10px!important;font-weight:700!important;
}
#workout.forge-compact-live.forge-premium-layout #forgeQuickWorkout .forge-v8-minus,
#workout.forge-compact-live.forge-premium-layout #forgeQuickWorkout .forge-v8-plus{
 position:absolute!important;top:53px!important;
 width:34px!important;height:41px!important;min-height:41px!important;min-width:34px!important;
 display:grid!important;place-items:center!important;
 background:rgba(32,41,34,.91)!important;border:1px solid #506148!important;
 border-radius:11px!important;font:700 23px/1 sans-serif!important;
 color:#ecf9df!important;padding:0!important;margin:0!important;
 box-shadow:none!important;z-index:1!important;
}
#workout.forge-compact-live.forge-premium-layout #forgeQuickWorkout .forge-v8-minus{left:5px!important}
#workout.forge-compact-live.forge-premium-layout #forgeQuickWorkout .forge-v8-plus{right:5px!important}
#workout.forge-compact-live.forge-premium-layout #forgeQuickWorkout .forge-v8-dial button:focus-visible{
 outline:2px solid #9eff00!important;outline-offset:2px!important;
}
#workout.forge-compact-live.forge-premium-layout #forgeQuickWorkout .forge-v3-progression{
 display:flex!important;grid-column:1/-1!important;grid-row:2!important;
 width:100%!important;min-height:0!important;
 align-items:center!important;justify-content:space-between!important;
 padding:2px 2px 0!important;margin:0!important;
}
#workout.forge-compact-live.forge-premium-layout #forgeQuickWorkout>.forge130-focus-card>.forge-primary-action{
 display:flex!important;grid-row:3!important;grid-column:2!important;
 position:static!important;inset:auto!important;transform:none!important;
 width:100%!important;height:48px!important;min-height:48px!important;
 padding:5px!important;margin:0!important;
 border-radius:13px!important;box-shadow:0 5px 16px #9eff001c!important;
 font-size:clamp(12px,3.3vw,15px)!important;
}
#workout.forge-compact-live.forge-premium-layout #forgeQuickWorkout .forge130-actions{
 display:contents!important;position:static!important;transform:none!important;
}
#workout.forge-compact-live.forge-premium-layout #forgeQuickWorkout .forge130-actions button{
 position:static!important;inset:auto!important;transform:none!important;
 display:grid!important;place-items:center!important;grid-row:3!important;
 width:44px!important;min-width:44px!important;height:48px!important;min-height:48px!important;
 padding:0!important;margin:0!important;font-size:0!important;line-height:1!important;
 border:1px solid #3b493e!important;border-radius:13px!important;
 background:#1b241e!important;color:#e6f6dd!important;
}
#workout.forge-compact-live.forge-premium-layout #forgeQuickWorkout .forge130-actions button:first-child{grid-column:1!important}
#workout.forge-compact-live.forge-premium-layout #forgeQuickWorkout .forge130-actions button:last-child{grid-column:3!important}
#workout.forge-compact-live.forge-premium-layout #forgeQuickWorkout .forge130-actions button:first-child::after{content:"‹";font-size:29px}
#workout.forge-compact-live.forge-premium-layout #forgeQuickWorkout .forge130-actions button:last-child::after{content:"›";font-size:29px}
/* Native timer stays above the main set action in a separate full-width row. */
#workout.forge-compact-live.forge-premium-layout #forgePremiumShell.forge-b-timed #forgeQuickWorkout>.forge130-focus-card{
 grid-template-rows:auto auto auto 48px!important;
}
#workout.forge-compact-live.forge-premium-layout #forgePremiumShell.forge-b-timed #forgeTimeTimerArea{
 grid-column:1/-1!important;grid-row:3!important;display:block!important;
}
#workout.forge-compact-live.forge-premium-layout #forgePremiumShell.forge-b-timed #forgeQuickWorkout>.forge130-focus-card>.forge-primary-action,
#workout.forge-compact-live.forge-premium-layout #forgePremiumShell.forge-b-timed #forgeQuickWorkout .forge130-actions button{
 grid-row:4!important;
}
#workout.forge-compact-live.forge-premium-layout #forgePremiumShell.forge-b-timed{
 grid-template-rows:36px 57px 37px auto minmax(180px,1fr) auto 47px!important;
}
#workout.forge-compact-live.forge-premium-layout .forge-b-footer{
 grid-row:7!important;position:relative!important;z-index:4!important;
 display:grid!important;grid-template-columns:94px minmax(0,1fr)!important;
 grid-template-rows:46px!important;height:46px!important;min-height:46px!important;
 gap:7px!important;margin:0!important;padding:0!important;
 align-items:stretch!important;
}
#workout.forge-compact-live.forge-premium-layout .forge-b-footer>#forgeCompactDock{
 position:static!important;inset:auto!important;transform:none!important;
 display:grid!important;grid-template-columns:44px 44px!important;gap:6px!important;
 grid-row:1!important;grid-column:1!important;
 width:94px!important;height:46px!important;
 min-height:0!important;padding:0!important;margin:0!important;
}
#workout.forge-compact-live.forge-premium-layout .forge-b-footer #forgeCompactDock>button{
 display:grid!important;place-items:center!important;position:static!important;
 width:44px!important;min-width:44px!important;height:46px!important;min-height:46px!important;
 padding:0!important;margin:0!important;font-size:0!important;
 background:#1b2a20!important;color:#e9f7df!important;
 border:1px solid #425941!important;border-radius:12px!important;
}
#workout.forge-compact-live.forge-premium-layout .forge-b-footer #forgeCompactExercises::after{content:"☰";font-size:20px}
#workout.forge-compact-live.forge-premium-layout .forge-b-footer #forgeCompactMore::after{content:"⚙";font-size:20px}
#workout.forge-compact-live.forge-premium-layout .forge-b-footer>#saveWorkout{
 display:flex!important;align-items:center!important;justify-content:center!important;
 position:static!important;inset:auto!important;transform:none!important;
 box-sizing:border-box!important;grid-row:1!important;grid-column:2!important;
 width:100%!important;min-width:0!important;height:46px!important;min-height:46px!important;
 margin:0!important;padding:3px 8px!important;
 font-size:0!important;color:#edf6e8!important;
 border:1px solid #54714a!important;border-radius:12px!important;
 background:#203426!important;box-shadow:none!important;
}
#workout.forge-compact-live.forge-premium-layout .forge-b-footer>#saveWorkout::before{content:none!important;display:none!important}
#workout.forge-compact-live.forge-premium-layout .forge-b-footer>#saveWorkout::after{
 content:"Training beenden & speichern"!important;display:block!important;
 font-size:clamp(10px,2.9vw,12px)!important;
 line-height:1.2!important;text-align:center!important;white-space:normal!important;
}
#workout.forge-compact-live.forge-premium-layout .forge-b-footer #forgeSaveSessionHint{display:none!important}
@media(max-height:760px){
 #workout.forge-compact-live.forge-premium-layout #forgePremiumShell.forge-v8-instruments{
  grid-template-rows:34px 53px 35px auto minmax(118px,1fr) auto 46px!important;
  gap:4px!important;padding:3px 8px 5px!important;
 }
 #workout.forge-compact-live.forge-premium-layout #forgeQuickWorkout .forge130-focus-card-grid>label.forge-v8-dial{
  height:122px!important;min-height:122px!important;
 }
 #workout.forge-compact-live.forge-premium-layout #forgePremiumShell.forge-b-timed{
  grid-template-rows:34px 53px 35px auto minmax(180px,1fr) auto 46px!important;
 }
}
@media(max-width:355px){
 #workout.forge-compact-live.forge-premium-layout #forgeQuickWorkout .forge-v8-minus,
 #workout.forge-compact-live.forge-premium-layout #forgeQuickWorkout .forge-v8-plus{
  width:30px!important;min-width:30px!important;
 }
 #workout.forge-compact-live.forge-premium-layout #forgeQuickWorkout .forge-v8-dial input{
  width:calc(100% - 60px)!important;font-size:24px!important;
 }
}
body.forge-compact-typing #workout.forge-compact-live.forge-premium-layout #forgePremiumShell{
 padding-bottom:calc(6px + env(safe-area-inset-bottom,0px))!important;
}
`;
 const id='forgeLayout3V8Style';
 function install(){
  if($(id))return;
  const style=document.createElement('style');style.id=id;style.textContent=css;
  document.head.append(style);
 }
 function arc(){
  const svg=document.createElementNS(SVG_NS,'svg');
  svg.setAttribute('viewBox','0 0 200 112');
  svg.setAttribute('class','forge-v8-arc');
  svg.setAttribute('aria-hidden','true');
  for(const [stroke,width] of [['#374638',11],['#9eff00',8]]){
   const path=document.createElementNS(SVG_NS,'path');
   path.setAttribute('d','M 18 100 A 82 82 0 0 1 182 100');
   path.setAttribute('fill','none');
   path.setAttribute('stroke',stroke);
   path.setAttribute('stroke-width',String(width));
   path.setAttribute('stroke-linecap','round');
   if(stroke==='#9eff00'){
    path.setAttribute('stroke-dasharray','188 260');
    path.style.filter='drop-shadow(0 0 4px rgba(158,255,0,.26))';
   }
   svg.append(path);
  }
  return svg;
 }
 function decimal(n){return Math.round(n*100)/100;}
 function stepValue(input,type){
  const attr=Number(input.getAttribute('step'));
  if(Number.isFinite(attr)&&attr>0&&input.getAttribute('step')!=='any')return attr;
  return type==='kg'?2.5:1;
 }
 function changeBy(input,delta,type){
  if(!input||input.disabled||input.readOnly)return;
  const n=Number(String(input.value).replace(',','.'));
  const minAttr=input.getAttribute('min'),maxAttr=input.getAttribute('max');
  const lower=minAttr===null?0:Number(minAttr),upper=maxAttr===null?Infinity:Number(maxAttr);
  const step=stepValue(input,type);
  const cur=Number.isFinite(n)?n:0;
  const next=decimal(Math.min(Number.isFinite(upper)?upper:Infinity,
        Math.max(Number.isFinite(lower)?lower:0,cur+delta*step)));
  if(!Number.isFinite(next)||cur===next)return;
  // Native core input listeners persist the value and synchronize set drafts.
  input.value=String(next);
  input.dispatchEvent(new Event('input',{bubbles:true}));
  input.dispatchEvent(new Event('change',{bubbles:true}));
 }
 function decorate(input,type){
  if(!input)return;
  const label=input.closest('.forge130-focus-card-grid label');
  if(!label)return;
  if(label.dataset.forgeV8For===input.id&&label.querySelector('.forge-v8-arc'))return;
  label.querySelectorAll('.forge-v8-arc,.forge-v8-label,.forge-v8-unit,.forge-v8-minus,.forge-v8-plus').forEach(n=>n.remove());
  label.classList.add('forge-v8-dial');
  label.dataset.forgeV8For=input.id;
  label.prepend(arc());
  const title=document.createElement('span');
  title.className='forge-v8-label';
  title.textContent=type==='kg'?'Gewicht':'Wiederholungen / Sek.';
  const unit=document.createElement('span');
  unit.className='forge-v8-unit';
  unit.textContent=type==='kg'?'kg':'Wdh. / Sek.';
  label.append(title,unit);
  for(const [dir,cls,glyph,word] of [[-1,'forge-v8-minus','−','Verringern'],[1,'forge-v8-plus','+','Erhöhen']]){
   const btn=document.createElement('button');btn.type='button';
   btn.className=cls;btn.textContent=glyph;
   btn.setAttribute('aria-label',word+' '+(type==='kg'?'Gewicht':'Wiederholungen oder Sekunden'));
   btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();changeBy(input,dir,type);});
   btn.addEventListener('pointerdown',e=>e.stopPropagation());
   label.append(btn);
  }
 }
 function sync(){
  const page=$('workout'),shell=$('forgePremiumShell');
  if(!page?.classList.contains('forge-premium-layout')||!shell)return;
  shell.classList.add('forge-v8-instruments');
  const weight=$('forge130QuickKg'),reps=$('forge130QuickReps');
  if(weight)decorate(weight,'kg');
  if(reps)decorate(reps,'reps');
  // Accessibility: native actions remain, even when icon-only on screen.
  $('forgeCompactExercises')?.setAttribute('aria-label','Alle Übungen');
  $('forgeCompactMore')?.setAttribute('aria-label','Aufwärmen, Tipps und Trainingsoptionen');
  $('saveWorkout')?.setAttribute('aria-label','Training beenden und speichern');
 }
 function boot(){
  install();sync();
  const page=$('workout');
  if(page){
   const observer=new MutationObserver(()=>{if(page.classList.contains('forge-premium-layout'))sync();});
   observer.observe(page,{childList:true,subtree:true});
  }
  setInterval(sync,950);
 }
 window.ForgeLayout3V8=Object.freeze({sync,stepValue,changeBy});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
 else boot();
})();