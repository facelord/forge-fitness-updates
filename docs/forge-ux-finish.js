/* FORGE 14.9 · Abschluss der Entschlackung. Nur DOM/Optik; keine Datenmigration.
 * Bestehende IDs, Formulare, Event-Handler, Plandaten und X-Tage-Logik bleiben erhalten.
 */
(function () {
 'use strict';
 const $=(s,root=document)=>root.querySelector(s);
 const $$=(s,root=document)=>Array.from(root.querySelectorAll(s));
 const ROOT='forge149-finish';
 const PLAN_MODES=['auto','manual'];
 function validMode(mode){return PLAN_MODES.includes(mode)?mode:'auto';}
 function css(){
  if($('#'+ROOT+'-style'))return;
  const s=document.createElement('style');s.id=ROOT+'-style';s.textContent=`
    /* The same readiness check-in previously appeared on Dashboard and in Training.
       Keep the real entry form in Training; the dashboard gets one shortcut instead. */
    #dashboard .forge149-coach #forge144Motivation .forge144-shell > details:last-of-type{display:none!important}
    #dashboard .forge150-readiness-link{margin:8px 14px 14px;padding:10px 14px!important;
      background:#22353c!important;border:1px solid #405451!important;font-size:12px!important}
    /* One planning surface instead of two nearly identical large cards. */
    #plan .forge150-plan-hub{margin:14px 0 0;padding:17px 16px 12px;border:1px solid #40505a;
      background:#17232d;border-radius:17px 17px 0 0;border-bottom:0}
    #plan .forge150-plan-hub h2{margin:0 0 5px;font-size:17px;color:#f0f6ee}
    #plan .forge150-plan-hub p{margin:0 0 12px;font-size:12px;color:#b4c4c3;line-height:1.55}
    #plan .forge150-mode-choices{display:grid;grid-template-columns:1fr 1fr;gap:7px}
    #plan .forge150-mode-button{border:1px solid #405451;border-radius:11px;background:#24333b;color:#d8e6e1;
      min-height:48px;padding:10px 8px;font-weight:750;font-size:13px;line-height:1.3;text-align:center;cursor:pointer}
    #plan .forge150-mode-button[aria-selected="true"]{border-color:#a8f55d;background:#2c4632;color:#d7ffc2}
    #plan .forge150-mode-button:focus-visible{outline:2px solid #a8f55d;outline-offset:2px}
    #plan > details.forge150-plan-panel.forge-flat-panel{margin:0 0 14px!important;border-radius:0 0 17px 17px!important;
      border-top:0!important;padding:2px 16px 17px!important;background:#17232d!important;
      box-shadow:none!important;overflow:visible!important}
    #plan > .forge150-plan-panel[hidden]{display:none!important}
    #plan > .forge150-plan-panel > summary{display:none!important}
    #plan > .forge150-plan-panel > .disclosure-body{border:0!important;padding:0!important;background:transparent!important}
    #plan > .forge150-plan-panel .forge-plan-master > h2:first-child{display:none!important}
    #plan > .forge150-plan-panel .plan-dual,#plan > .forge150-plan-panel .forge-plan-master,
    #plan > .forge150-plan-panel .forge-plan-steps{background:transparent!important;border:0!important;box-shadow:none!important}
    #plan > .forge150-plan-panel .forge-plan-inline-step{border-radius:0!important;
      background:transparent!important;box-shadow:none!important;border-left:0!important;border-right:0!important}
    #plan > .forge150-plan-panel .forge-plan-inline-step > summary{padding-left:2px!important;padding-right:2px!important}
    #plan > .forge150-plan-panel .forge-plan-inline-body > .card,
    #plan > .forge150-plan-panel .forge149-step-body > .card,
    #plan > .forge150-plan-panel .forge-plan-master > .card,
    #plan > .forge150-plan-panel .forge-manual-plan-body .card{background:transparent!important;border:0!important;
      border-radius:0!important;padding-left:0!important;padding-right:0!important;box-shadow:none!important}
    #plan > .forge150-plan-panel input,#plan > .forge150-plan-panel select{max-width:100%;min-width:0}
    /* Week board is ONE card with simple day rows; no card-in-card-in-card. */
    #plan .forge150-calendar{background:#17232d!important;border:1px solid #40505a!important;box-shadow:none!important}
    #plan .forge150-calendar #combinedWeek > .card{box-shadow:none!important;
      border:0!important;border-bottom:1px solid #32444b!important;border-radius:0!important;
      background:transparent!important;margin:0!important;padding:12px 4px!important}
    #plan .forge150-calendar #combinedWeek > .card:last-child{border-bottom:0!important}
    #plan .forge150-week-help{background:transparent;border:0;margin:5px 0 10px;font-size:12px;color:#b4c6c2}
    #plan .forge150-week-help > summary{padding:8px 0;cursor:pointer;list-style:none;color:#bed4c5;font-weight:650}
    #plan .forge150-week-help > summary:after{content:'⌄';color:#a8f55d;margin-left:9px}
    #plan .forge150-week-help[open] > summary:after{content:'⌃'}
    #plan .forge150-week-help p{line-height:1.55;font-size:12px;margin:6px 0}
    /* Training: one clear primary session and calm secondary panels. */
    #workout .forge150-workout-lead{margin:10px 0 14px;border:1px solid #40505a!important;
      border-radius:16px!important;box-shadow:none!important;background:#17232d!important}
    #workout .forge150-workout-lead > details.forge-fold-details{background:transparent!important;border:0!important;
      box-shadow:none!important;padding:0!important;margin:0!important}
    #workout .forge150-workout-lead > details.forge-fold-details > summary{min-height:61px!important;
      padding:16px!important;font-size:16px!important;font-weight:750!important}
    #workout .forge150-workout-lead .forge-fold-body{padding:0 13px 17px!important}
    #workout .forge150-workout-lead .forge-fold-body > .card,
    #workout .forge150-workout-lead .forge-fold-body .card{background:transparent!important;
      border:0!important;border-radius:0!important;box-shadow:none!important;
      padding-left:0!important;padding-right:0!important;margin-left:0!important;margin-right:0!important}
    #workout .forge150-workout-lead .forge-fold-body > .card > h2:first-child{display:none!important}
    #workout .forge150-workout-lead #workoutExercises > .card{background:transparent!important}
    #workout .forge150-workout-lead .forge-exercise-heading{display:none!important}
    #workout #forgeQuickWorkout[hidden]{display:none!important}
    #workout .forge150-modes{display:flex;gap:7px;flex-wrap:wrap;padding:3px 0 8px}
    #workout .forge150-modes > button{font-size:12px;min-height:43px;flex:1 1 105px;
      border:1px solid #405451;background:#21313a;color:#e1ece6;border-radius:11px;padding:8px;
      font-weight:650;cursor:pointer}
    #workout .forge150-modes > button[aria-pressed="true"]{background:#2c4632;border-color:#a8f55d;color:#d7ffc2}
    #workout .forge150-modes > button:focus-visible{outline:2px solid #a8f55d;outline-offset:2px}
    #workout .forge149-workout-section > .card > p.notice:first-of-type{font-size:12px}
    #workout #forge144WorkoutEnergyPanel{border:1px solid #40505a!important;border-radius:16px!important;
      margin:11px 0!important;background:#17232d!important;box-shadow:none!important}
    #workout #forgeWorkoutHistoryPanel{border:1px solid #40505a!important;border-radius:16px!important}
    /* Existing expandable stats/nutrition keep content but shed redundant nested framing. */
    #progress .forge-stats-fold > .disclosure-body > .card,
    #progress .forge-stats-fold > .disclosure-body > div.card,
    #nutrition .forge-nutrition-master .forge-food-section-body > .card{
      box-shadow:none!important;border:0!important;border-radius:0!important;background:transparent!important;
      padding-left:0!important;padding-right:0!important}
    @media(max-width:360px){#plan .forge150-mode-button{font-size:12px;padding:8px 5px}
      #workout .forge150-modes > button{flex:1 1 88px;padding:8px 4px}}
   `;document.head.appendChild(s);
 }
 function setMode(mode,auto,manual,buttons){
  mode=validMode(mode);
  [[auto,'auto'],[manual,'manual']].forEach(([panel,id])=>{
   panel.hidden=id!==mode;
   panel.setAttribute('aria-hidden',String(id!==mode));
   if(id===mode)panel.open=true; // Preserve all form values and listeners.
  });
  buttons.forEach(b=>{const selected=b.dataset.mode===mode;
   b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;
  });
  return mode;
 }
 function dedupeDashboard(){
  const coach=$('#dashboard .forge149-coach'),root=$('#forge144Motivation');
  if(!coach||!root||$('#forge150ReadinessLink'))return;
  const btn=document.createElement('button');btn.id='forge150ReadinessLink';
  btn.className='btn alt small forge150-readiness-link';btn.type='button';
  btn.textContent='🧠 Tagesform einschätzen · zum Training';
  btn.addEventListener('click',()=>{
   if(typeof window.go==='function')window.go('workout');
   const panel=$('#forge144WorkoutEnergyPanel');if(panel)panel.open=true;
   panel?.scrollIntoView?.({behavior:'smooth',block:'nearest'});
  });
  root.after(btn);
 }
 function setupPlan(){
  const page=$('#plan'),auto=$('#plan > .forge-automatic-plan'),manual=$('#plan > .forge-manual-plan');
  if(!page||!auto||!manual||$('#forge150PlanHub'))return false;
  const hub=document.createElement('div');hub.id='forge150PlanHub';hub.className='forge150-plan-hub';
  const heading=document.createElement('h2');heading.textContent='🛠️ Trainingsplan gestalten';
  const note=document.createElement('p');note.textContent='Eine Planung, zwei Wege. Deine Eingaben bleiben beim Wechsel erhalten.';
  const bar=document.createElement('div');bar.className='forge150-mode-choices';bar.setAttribute('role','tablist');bar.setAttribute('aria-label','Art der Trainingsplanung');
  const configs=[['auto','✨ Automatisch'],['manual','✍️ Individuell']];
  const buttons=configs.map(([mode,label])=>{
   const btn=document.createElement('button');btn.type='button';btn.textContent=label;
   btn.className='forge150-mode-button';btn.dataset.mode=mode;btn.setAttribute('role','tab');
   btn.setAttribute('aria-controls',mode==='auto'?'forge150AutoPanel':'forge150ManualPanel');
   bar.appendChild(btn);return btn;
  });
  hub.append(heading,note,bar);
  auto.before(hub);
  auto.id='forge150AutoPanel';manual.id='forge150ManualPanel';
  auto.classList.add('forge150-plan-panel');manual.classList.add('forge150-plan-panel');
  let mode='auto';try{mode=validMode(localStorage.getItem('forge150-plan-mode'));}catch(_){/* no storage */}
  const switchTo=next=>{mode=setMode(next,auto,manual,buttons);
   try{localStorage.setItem('forge150-plan-mode',mode);}catch(_){/* no storage */}
  };
  buttons.forEach(b=>{
   b.addEventListener('click',()=>switchTo(b.dataset.mode));
   b.addEventListener('keydown',e=>{
    if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;
    e.preventDefault();const idx=PLAN_MODES.indexOf(mode);
    const next=PLAN_MODES[(idx+(e.key==='ArrowRight'?1:1))%2];switchTo(next);
    buttons[PLAN_MODES.indexOf(next)].focus();
   });
  });
  switchTo(mode);
  // Keep all planning inputs, including X-day intervals, mounted at original IDs.
  // Show one step at a time, keeping the user's inputs and previous choices.
  const steps=$$('.forge149-step',auto);
  for(const step of steps){
   if(step.dataset.forge150Exclusive)continue;
   step.dataset.forge150Exclusive='1';
   step.addEventListener('toggle',()=>{
    if(!step.open)return;
    for(const other of steps)if(other!==step&&other.open)other.open=false;
   });
  }
  return true;
 }
 function setupCalendar(){
  const board=$('#combinedWeek')?.closest('#plan > .card');
  if(!board||board.dataset.forge150Calendar)return;
  board.dataset.forge150Calendar='1';board.classList.add('forge150-calendar');
  const title=$(':scope > h2',board);
  if(title)title.textContent='📅 Dein Wochenplan';
  const explanatory=$$('p',board).filter(el=>!$('#combinedWeek',el)&&el.textContent.length>35&&el.parentElement===board);
  if(explanatory.length){
   const help=document.createElement('details');help.className='forge150-week-help';
   const summary=document.createElement('summary');summary.textContent='Wochenplan bearbeiten · Hinweise';help.appendChild(summary);
   for(const p of explanatory)help.appendChild(p);
   const week=$('#combinedWeek',board);if(week)week.before(help);else board.append(help);
  }
 }
 function setupWorkout(){
  const page=$('#workout');if(!page||$('#forge150WorkoutModes'))return false;
  const strength=$(':scope > .card.forge-fold',page);
  const mobility=$('#forge149MobilityCard',page)?.closest('.forge149-workout-section');
  const cardio=$('#forgeCardio',page)?.closest('.forge149-workout-section');
  if(!strength||!mobility||!cardio)return false;
  strength.classList.add('forge150-workout-lead');
  // Primary action first, optional day form and history after the workout modes.
  const first=$(':scope > #forge144WorkoutCoach',page);
  const intro=$(':scope > .forge-intro',page);
  if(first){(intro||first).after(strength);}
  const strip=document.createElement('div');strip.id='forge150WorkoutModes';strip.className='forge150-modes';
  strip.setAttribute('role','group');strip.setAttribute('aria-label','Trainingsart auswählen');
  const strengthFold=$(':scope > details.forge-fold-details',strength);
  const choices=[
   ['strength','🏋️ Kraft',strengthFold,strength],
   ['mobility','🧘 Mobilität',mobility,mobility],
   ['cardio','🏃 Cardio',cardio,cardio]
  ];
  let selected='strength';
  const buttons=choices.map(([id,label,details])=>{
   const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.mode=id;
   b.setAttribute('aria-pressed',String(id===selected));
   b.addEventListener('click',()=>{selected=id;for(const [name,,fold] of choices){
     if(fold&&fold.tagName==='DETAILS')fold.open=name===id;
   }refresh();
   const current=choices.find(c=>c[0]===id)?.[3];
   current?.scrollIntoView?.({block:'nearest',behavior:'smooth'});
   });strip.appendChild(b);return b;
  });
  function refresh(){for(const button of buttons)button.setAttribute('aria-pressed',String(button.dataset.mode===selected));}
  const header=$(':scope > .forge-intro',page);
  if(header)header.after(strip);else strength.before(strip);
  // Daily readiness is helpful, but not an obstacle before the first exercise.
  const readiness=$(':scope > #forge144WorkoutCoach',page);
  if(readiness)strength.after(readiness);
  // History remains accessible, but at the end of all training modes.
  const history=$('#forgeWorkoutHistoryPanel');if(history)cardio.after(history);
  // Do not close an existing active session when installing UI updates.
  if(strengthFold&& !mobility.open && !cardio.open)strengthFold.open=true;
  // Pre-session quick-start duplicates the primary button. Keep the focused
  // exercise view (with timer) when a session is running, hide ONLY the duplicate.
  const quick=$('#forgeQuickWorkout');
  if(quick){
   const sync=()=>{const duplicate=!!quick.querySelector('button[onclick="startWorkout()"]');
     if(quick.hidden!==duplicate)quick.hidden=duplicate;};
   new MutationObserver(sync).observe(quick,{childList:true,subtree:true});sync();
  }
  return true;
 }
 function start(){
  if(document.documentElement.dataset.forge150Ready)return;
  document.documentElement.dataset.forge150Ready='1';css();setupCalendar();dedupeDashboard();
  let attempts=0;
  const boot=()=>{const plan=setupPlan(),workout=setupWorkout();
    if((!plan||!workout)&&++attempts<25)setTimeout(boot,120);
  };boot();
 }
 window.ForgeUXFinish={validMode,setMode};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
})();