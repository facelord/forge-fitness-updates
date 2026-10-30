/* FORGE 14.9 · ruhige Oberflächen, weniger Doppelungen und mobile Navigation.
 * Präsentationsschicht: keine Änderungen an state, Plänen, Workouts oder Speichern.
 */
(function () {
  'use strict';
  const ID='forge149';
  const pages=['dashboard','plan','workout','progress','nutrition'];
  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>Array.from(root.querySelectorAll(selector));

  // Exported pure functions are also checked by the CI regression test.
  function swipeDirection(dx,dy,elapsed) {
    if (!Number.isFinite(dx)||!Number.isFinite(dy)||elapsed>1000||elapsed<0)return 0;
    return Math.abs(dx)>=82 && Math.abs(dx)>Math.abs(dy)*1.65 ? (dx<0?1:-1) : 0;
  }
  function nextPage(active,direction) {
    const index=pages.indexOf(active);
    return index<0||!direction?null:pages[index+direction]||null;
  }
  window.ForgeUX149={swipeDirection,nextPage,pages:pages.slice()};

  function addStyles() {
    if ($('#'+ID+'-style'))return;
    const style=document.createElement('style');style.id=ID+'-style';
    style.textContent=`
      /* Shared surface language; keep the existing dark FORGE palette. */
      #dashboard .forge149-coach,
      #workout .forge149-workout-section,
      #workout #forgeWorkoutHistoryPanel,
      #progress .forge-stats-wellness {
        display:block;background:#17232d!important;color:#e9f2ef!important;
        border:1px solid #40505a!important;border-radius:16px!important;
        box-shadow:none!important;margin:11px 0!important;overflow:hidden;
      }
      #dashboard .forge149-coach > summary,
      #workout .forge149-workout-section > summary,
      #workout #forgeWorkoutHistoryPanel > summary,
      #progress .forge-stats-wellness > summary {
        display:flex;align-items:center;gap:10px;list-style:none;cursor:pointer;
        color:#edf4f0!important;background:transparent!important;font-size:15px!important;
        font-weight:750!important;min-height:60px;padding:16px!important;
      }
      #dashboard .forge149-coach > summary::-webkit-details-marker,
      #workout .forge149-workout-section > summary::-webkit-details-marker,
      #workout #forgeWorkoutHistoryPanel > summary::-webkit-details-marker,
      #progress .forge-stats-wellness > summary::-webkit-details-marker {display:none}
      #dashboard .forge149-coach > summary::after,
      #workout .forge149-workout-section > summary::after,
      #workout #forgeWorkoutHistoryPanel > summary::after,
      #progress .forge-stats-wellness > summary::after {
        content:'⌄';margin-left:auto;color:#a8f55d;font-size:20px;line-height:1;
      }
      #dashboard .forge149-coach[open] > summary::after,
      #workout .forge149-workout-section[open] > summary::after,
      #workout #forgeWorkoutHistoryPanel[open] > summary::after,
      #progress .forge-stats-wellness[open] > summary::after {transform:rotate(180deg)}
      #workout #forgeWorkoutHistoryPanel > summary .forge-history-count{
        margin-left:auto;color:#aebfc4!important;background:none!important;
        border:0!important;font-size:12px!important;font-weight:500!important;
      }
      #workout #forgeWorkoutHistoryPanel > summary::after{margin-left:0}
      #workout #forgeWorkoutHistoryPanel > .disclosure-body,
      #progress .forge-stats-wellness > .disclosure-body{background:transparent!important;border:0!important;padding:0 15px 16px!important}
      #workout .forge149-workout-section > .card{background:transparent!important;
        border:0!important;border-radius:0!important;margin:0!important;padding:3px 15px 16px!important;box-shadow:none!important}
      #workout .forge149-workout-section > .card > h2:first-child,
      #workout .forge149-workout-section > .card > .forge-mob-head{display:none!important}
      #workout .forge149-workout-section .card{box-shadow:none!important}
      #workout .forge149-workout-section .forge-disclosure{background:transparent!important}
      #dashboard .forge149-coach > #forge144Motivation{padding:0 14px 14px}
      #dashboard .forge149-coach .forge144-shell{border:0!important;
        background:transparent!important;box-shadow:none!important;margin:0!important;padding:4px 0 8px!important}
      #dashboard .forge149-coach .forge144-overline{display:none}
      #dashboard .forge149-coach .forge144-row h2{font-size:17px!important}
      #dashboard .forge149-coach .forge144-action button[onclick*="startWorkoutFromDashboard"]{display:none!important}
      #dashboard .forge149-week-duplicate{display:none!important}
      #workout #forge144WorkoutEnergyPanel{background:#17232d!important;
        border:1px solid #40505a!important;border-radius:16px!important;box-shadow:none!important}
      #workout #forge144WorkoutEnergyPanel > summary{color:#edf4f0!important;font-size:15px!important;
        min-height:55px!important;padding:14px 16px!important}
      #progress .forge-stats-wellness .forge-wellness{background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important;margin:0!important}
      #plan > .card, #plan > details.card,
      #workout > .card, #workout > details.card{box-shadow:none!important}
      #plan > details.forge-flat-panel{background:#17232d!important;border:1px solid #40505a!important;border-radius:16px!important;margin:11px 0!important}
      #plan > details.forge-flat-panel > summary{font-size:15px!important;min-height:60px!important;padding:16px!important}
      #plan > .card > p.muted{font-size:12px;line-height:1.45;margin:6px 0}
      #plan .forge149-step{border-top:1px solid #34474e!important;
        padding:0!important;margin:0!important;background:transparent!important}
      #plan .forge149-step > summary{list-style:none;display:flex;align-items:center;
        min-height:62px;padding:14px 0!important;cursor:pointer}
      #plan .forge149-step > summary::-webkit-details-marker{display:none}
      #plan .forge149-step > summary .forge-plan-inline-heading{display:flex;align-items:center;
        gap:11px;margin:0!important;width:100%}
      #plan .forge149-step > summary .forge-plan-inline-heading::after{content:'⌄';margin-left:auto;
        color:#a8f55d;font-size:20px;line-height:1}
      #plan .forge149-step[open] > summary .forge-plan-inline-heading::after{transform:rotate(180deg)}
      #plan .forge149-step > .forge-plan-inline-body,
      #plan .forge149-step > .forge149-step-body{padding:0 0 18px 0!important}
      #plan .forge149-step .forge-plan-inline-words h3{margin:0!important;font-size:15px}
      #plan .forge149-step .forge-plan-inline-words p{font-size:12px}
      #plan .forge149-step input, #plan .forge149-step select,
      #workout input, #workout select{min-height:44px}
      #workout .forge149-workout-section .forge-mob-head{display:none!important}
      #workout .forge149-workout-section [id="mobWorkout"]{margin-top:4px}
      #dashboard .logo .sub,header .logo .sub{letter-spacing:.015em!important;text-transform:none!important}
      #plan .forge149-plan-tip{color:#aebfbc;font-size:12px;line-height:1.5;margin:8px 0 12px}
      @media(max-width:420px){
        #dashboard .forge149-coach > summary,#workout .forge149-workout-section > summary{min-height:56px}
        #plan .forge149-step .forge-plan-inline-words p{font-size:11px}
      }
      @media(prefers-reduced-motion:reduce){.forge149-coach *, .forge149-step *{scroll-behavior:auto!important}}
    `;
    document.head.appendChild(style);
  }

  function branding(){
    const sub=$('header .logo .sub');
    if(sub)sub.textContent='Forme, was in dir steckt.';
    document.title='FORGE · Forme, was in dir steckt.';
  }

  function dashboard(){
    const dash=$('#dashboard');if(!dash)return;
    // The renderer still needs these IDs. Keep them mounted but hide the duplicate card.
    const week=$('#dashboardWeek',dash)?.closest('.card');
    if(week){week.classList.add('forge149-week-duplicate');week.setAttribute('aria-hidden','true');}
    const root=$('#forge144Motivation',dash);
    if(root&&!root.closest('.forge149-coach')){
      const fold=document.createElement('details');fold.className='forge149-coach';
      const summary=document.createElement('summary');summary.textContent='🧠 Dein FORGE-Coach';
      fold.appendChild(summary);root.before(fold);fold.appendChild(root);
      try{fold.open=localStorage.getItem('forge149-coach-open')==='1';}catch(_){fold.open=false;}
      fold.addEventListener('toggle',()=>{try{localStorage.setItem('forge149-coach-open',fold.open?'1':'0');}catch(_){}});
    }
  }

  function wrapWorkoutCard(id,title){
    const card=$(id);if(!card||card.parentElement?.classList.contains('forge149-workout-section'))return;
    if(card.parentElement?.id!=='workout')return;
    const details=document.createElement('details');details.className='forge149-workout-section';
    const summary=document.createElement('summary');summary.textContent=title;
    details.appendChild(summary);card.before(details);details.appendChild(card);
  }
  function workout(){
    const root=$('#workout');if(!root)return;
    wrapWorkoutCard('#forgeCardio','🏃 Cardio & Sport');
    const mobility=$('#mobWorkout')?.closest('#workout > .card');
    if(mobility&&!mobility.parentElement.classList.contains('forge149-workout-section')){
      if(!mobility.id)mobility.id='forge149MobilityCard';
      wrapWorkoutCard('#'+mobility.id,'🧘 Mobilität & Yoga');
    }
    const history=$('#forgeWorkoutHistoryPanel');
    if(history){
      // The session is the primary action; history belongs after the other modes.
      const last=$('#workout .forge149-workout-section:last-of-type')||$('#forgeCardio')?.closest('.forge149-workout-section');
      if(last&&last.nextElementSibling!==history)last.after(history);
    }
  }

  function makeStep(existing,number){
    if(!existing||existing.tagName==='DETAILS'||existing.dataset.forge149Step)return;
    const title=$('.forge-plan-inline-heading',existing);
    const body=$('.forge-plan-inline-body',existing);
    if(!title||!body)return;
    const fold=document.createElement('details');fold.className='forge-plan-inline-step forge149-step';
    fold.dataset.forge149Step=String(number);fold.open=number===1;
    const summary=document.createElement('summary');summary.appendChild(title);
    fold.appendChild(summary);fold.appendChild(body);
    existing.replaceWith(fold);
  }
  function plan(){
    const root=$('#plan');if(!root)return;
    const intro=$(':scope > .forge-intro',root);
    if(intro)intro.textContent='Training ansehen oder einen Plan erstellen – die Details öffnest du bei Bedarf.';
    const auto=$('.forge-automatic-plan',root);
    const manual=$('.forge-manual-plan',root);
    const catalog=$('#forgeCatalog',root);
    const as=$(':scope > summary',auto||root);
    if(as)as.textContent='✨ Trainingsplan automatisch erstellen';
    const ms=$(':scope > summary',manual||root);
    if(ms)ms.textContent='✍️ Trainingsplan selbst gestalten';
    const cs=$(':scope > summary',catalog||root);
    if(cs)cs.textContent='🏋️ Übungskatalog';
    if(!auto)return;
    $$('.forge-plan-steps > .forge-plan-inline-step',auto).forEach((step,i)=>makeStep(step,i+1));
    const master=$('.forge-plan-master',auto);
    const title=$('.forge-plan-name-heading',master||auto);
    if(title&&!title.closest('.forge149-step')){
      const parent=title.parentNode;
      let node=title.nextSibling;
      const fold=document.createElement('details');fold.className='forge149-step';
      fold.dataset.forge149Step='4';
      const summary=document.createElement('summary');summary.appendChild(title);
      const body=document.createElement('div');body.className='forge149-step-body';
      while(node&&!(node.nodeType===1&&node.matches('details.forge-plan-flat-addon'))){
        const next=node.nextSibling;body.appendChild(node);node=next;
      }
      fold.append(summary,body);parent.insertBefore(fold,node);
    }
    const help=$('.forge-plan-help',auto);
    if(help)help.textContent='Vier Schritte – tippe auf eine Überschrift, um sie zu öffnen.';
    const description=auto.querySelector('.disclosure-body > .plan-dual .forge-plan-master > .muted');
    if(description)description.classList.add('forge149-plan-tip');
  }

  const ignoreTouchSelector=[
    'button','input','textarea','select','a','label','summary','canvas','video','iframe',
    '[contenteditable]','[role="slider"]','[draggable="true"]',
    '#cropWrap','#forgeCropViewport','.forge-crop-handle','.forge-crop-frame',
    '.forge-catalog-item','.forge142-order-row','.forge130-substitute',
    '[data-sortable]','.forge149-step > summary'
  ].join(',');
  function scrollsHorizontally(el){
    for(let node=el;node&&node!==document.body;node=node.parentElement){
      if(node.scrollWidth>node.clientWidth+12){
        const overflow=getComputedStyle(node).overflowX;
        if(overflow==='auto'||overflow==='scroll')return true;
      }
    }
    return false;
  }
  function gestures(){
    if(document.documentElement.dataset.forge149Gestures)return;
    document.documentElement.dataset.forge149Gestures='1';
    let start=null;
    document.addEventListener('touchstart',e=>{
      start=null;
      if(e.touches.length!==1||!$('.page.active'))return;
      const target=e.target;
      if(!target||typeof target.closest!=='function'||target.closest(ignoreTouchSelector))return;
      if(target.closest('dialog,[role="dialog"],.modal,.overlay'))return;
      if(scrollsHorizontally(target))return;
      const t=e.touches[0];
      if(t.clientX<27||t.clientX>window.innerWidth-27)return; // Android back gesture
      start={x:t.clientX,y:t.clientY,at:Date.now()};
    },{passive:true});
    document.addEventListener('touchmove',e=>{
      if(!start)return;
      if(e.touches.length!==1){start=null;return;}
      const dx=e.touches[0].clientX-start.x,dy=e.touches[0].clientY-start.y;
      if(Math.abs(dy)>42&&Math.abs(dy)>Math.abs(dx))start=null;
    },{passive:true});
    document.addEventListener('touchend',e=>{
      if(!start||e.changedTouches.length!==1){start=null;return;}
      const s=start;start=null;
      const t=e.changedTouches[0];
      const direction=swipeDirection(t.clientX-s.x,t.clientY-s.y,Date.now()-s.at);
      const current=$('.page.active')?.id;
      const destination=nextPage(current,direction);
      if(destination&&typeof window.go==='function')window.go(destination);
    },{passive:true});
    document.addEventListener('touchcancel',()=>{start=null;},{passive:true});
  }

  function setup(){
    if(document.documentElement.dataset.forge149Ready)return;
    document.documentElement.dataset.forge149Ready='1';
    addStyles();branding();dashboard();workout();plan();gestures();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
})();