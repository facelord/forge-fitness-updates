/* FORGE · visual exercise swap selector.
 * Dedicated presentation layer using the existing exercise catalog, artwork,
 * core session substitute + undo and staged-plan commit. No new saved data.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const el=(tag,cls,label)=>{
 const x=document.createElement(tag);if(cls)x.className=cls;
 if(label!==undefined)x.textContent=label;return x;
};
const button=(label,click,cls)=>{
 const b=el('button',cls,label);b.type='button';b.addEventListener('click',click);return b;
};
const groups=[
 ['Plank','Side Plank','Seitstütz','Hollow Hold','Dead Bug','Bird Dog','Mountain Climbers','Superman Hold','Bauch Crunch','Crunches'],
 ['Latziehen','Klimmzüge','Klimmzüge (enger Griff)','Klimmzüge (breiter Griff)','Rudern am Kabel','Rudern Maschine','Einarmiges Kurzhantelrudern','Rudern mit Rucksack'],
 ['Bankdrücken','Schrägbank Kurzhantel','Brustpresse','Liegestütze','Dips','Butterfly'],
 ['Schulterdrücken','Arnold Press','Pike Push-ups','Seitheben','Frontheben'],
 ['Kniebeuge','Kniebeugen','Ausfallschritte','Beinpresse','Bulgarian Split Squat','Step-ups'],
 ['Rumänisches Kreuzheben','Kreuzheben','Beinbeuger','Hip Thrust','Glute Bridge'],
 ['Rudern am Kabel','Face Pulls','Reverse Flys','Reverse Snow Angels','Bird Dog'],
 ['Bizepscurls','Hammer Curls','Bizepscurls mit Rucksack'],
 ['Trizepsdrücken','Dips (Trizepsfokus)','Enge Liegestütze','Überkopf-Trizepsstrecken'],
 ['Wadenheben','Wadenheben stehend','Wadenheben sitzend']
];
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').trim();
function matchingNames(name,all,base=[]){
 const key=normalize(name),allowed=new Set(all);
 const suggested=[];
 const append=x=>{if(allowed.has(x)&&x!==name&&!suggested.includes(x))suggested.push(x);};
 for(const x of base)append(x);
 for(const group of groups)if(group.some(n=>normalize(n)===key)){
  for(const x of group)append(x);
 }
 return suggested;
}
function filterNames(names,search){
 const q=normalize(search);return q?names.filter(name=>normalize(name).includes(q)):names.slice();
}
function invokeNativeSubstitution(index,name){
 const old=window.forge130AlternativeOptions;
 if(typeof window.forge130Substitute!=='function')return false;
 try{
  // Leave the existing validation and rollback logic intact. The selected
  // catalog entry is allowed for this invocation, never as a permanent change.
  if(typeof old==='function')window.forge130AlternativeOptions=function(...args){
   return [...new Set([...old(...args),name])];
  };
  window.forge130Substitute(index,name);
  return true;
 }finally{
  if(typeof old==='function')window.forge130AlternativeOptions=old;
 }
}
window.ForgeExerciseSwap=Object.freeze({
 matchingNames,filterNames,normalize,invokeNativeSubstitution,
 isOpen:()=>!!current,
 openForSession,openForPlan,
 close:()=>close(false)
});
let current=null,lastFocused=null;
function catalog(){
 const f=window.forge138AvailableNames;
 if(typeof f!=='function')return [];
 return [...new Set(f().filter(x=>typeof x==='string'&&x.trim()))].sort((a,b)=>a.localeCompare(b,'de'));
}
function livePlan(){
 // The active session is authoritative. workoutSelect may temporarily show a
 // different value while core renderWorkout is rebuilding its options.
 const active=typeof state!=='undefined'?state.activeWorkout:null;
 return active&&Array.isArray(state.plan)?
  state.plan.find(p=>String(p.id)===String(active.planId))||null:null;
}
function availableFor(mode,plan,index){
 const all=catalog();
 const used=new Set(plan.ex.map((exercise,i)=>{
  if(i===index)return null;
  return mode==='session'&&String(state.workoutDraft?.planId)===String(plan.id)?
   state.workoutDraft.exercises?.[i]?.name||exercise.name:exercise.name;
 }).filter(Boolean));
 // Ensure the selector still opens when the optional catalog UI is not ready.
 if(!all.length){
  for(const e of plan.ex)if(e?.name)all.push(e.name);
  for(const name of (typeof window.forge130AlternativeOptions==='function'?
   window.forge130AlternativeOptions(plan.ex[index]?.name,plan.ex[index]?.name):[])){
   if(typeof name==='string'&&!all.includes(name))all.push(name);
  }
 }
 return all.filter(x=>!used.has(x));
}
function openForSession(index){
 const plan=livePlan(),i=Number(index);
 if(!plan||!Number.isInteger(i)||i<0||i>=plan.ex.length)return false;
 const currentName=String(state.workoutDraft?.planId)===String(plan.id)?
  state.workoutDraft.exercises?.[i]?.name||plan.ex[i].name:plan.ex[i].name;
 return open({
  mode:'session',planId:String(plan.id),index:i,original:currentName,
  planBase:plan.ex[i].name,expectedSession:state.activeWorkout?.startedAt,
  all:availableFor('session',plan,i)
 });
}
function openForPlan(draft,index,onChoose){
 const i=Number(index),p=draft;
 if(!p||state?.activeWorkout||!Array.isArray(p.ex)||!Number.isInteger(i)||
  i<0||i>=p.ex.length||typeof onChoose!=='function')return false;
 return open({
  mode:'plan',planId:String(p.id),index:i,original:p.ex[i].name,
  planBase:p.ex[i].name,all:availableFor('plan',p,i),draft:p,onChoose
 });
}
function candidateList(x){
 let base=[];
 try{
  if(typeof window.forge130AlternativeOptions==='function')
   base=window.forge130AlternativeOptions(x.original,x.planBase);
 }catch(error){console.warn('FORGE: Alternativen aus Kern nicht verfügbar',error);}
 return matchingNames(x.original,x.all,Array.isArray(base)?base:[]);
}
function open(settings){
 if(current&&!close(false))return false;
 const overlay=el('div','forge-swap-backdrop');
 overlay.id='forgeExerciseSwapOverlay';
 overlay.setAttribute('role','presentation');
 const panel=el('section','forge-swap-sheet');
 panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
 panel.setAttribute('aria-label','Alternative für '+settings.original+' auswählen');
 overlay.append(panel);
 overlay.addEventListener('click',e=>{if(e.target===overlay)close(false);});
 lastFocused=document.activeElement;
 current={...settings,overlay,panel,tab:'matching',query:'',selected:null,available:settings.all,
  matching:[],message:''};
 current.matching=candidateList(current);
 document.body.append(overlay);
 document.body.classList.add('forge-swap-open');
 injectCss();renderFrame();
 return true;
}
function close(force){
 if(!current)return true;
 const old=current;
 if(!force&&old.busy)return false;
 current=null;old.overlay.remove();
 document.body.classList.remove('forge-swap-open');
 if(lastFocused?.isConnected)lastFocused.focus?.({preventScroll:true});
 lastFocused=null;return true;
}
function imageFor(name,anatomy=false){
 const thumb=el('span',anatomy?'forge-swap-anatomy':'forge-swap-thumb');
 try{
  const fn=window.forgeExerciseIllustrations||window.forgePublicExercisePictures;
  const html=typeof fn==='function'?fn(name):'';
  if(typeof html==='string'&&html){
   const container=el('div');container.innerHTML=html;
   const photos=container.querySelectorAll('img');
   const pictures=container.querySelectorAll('svg');
   const candidate=anatomy?(photos[2]||pictures[pictures.length-1]):(photos[0]||pictures[0]);
   if(candidate){
    const cloned=candidate.cloneNode(true);
    cloned.removeAttribute('tabindex');cloned.removeAttribute('role');
    if(cloned.tagName.toLowerCase()==='img'){
     cloned.loading='lazy';cloned.decoding='async';
    }
    thumb.append(cloned);return thumb;
   }
  }
 }catch(err){console.warn('FORGE: Vorschaubild nicht verfügbar',name,err);}
 thumb.append(el('span','forge-swap-placeholder',anatomy?'◉':'🏋'));
 return thumb;
}
function renderFrame(){
 const x=current;if(!x)return;
 const box=x.panel;box.replaceChildren();
 const handle=el('div','forge-swap-handle');handle.setAttribute('aria-hidden','true');
 box.append(handle);
 const head=el('div','forge-swap-head');
 const brand=el('span','forge-swap-brand','𝙁  FORGE');
 head.append(brand,button('✕',()=>close(false),'forge-swap-close'));
 box.append(head);
 box.append(el('h2','forge-swap-title','Alternative für '+x.original+' wählen'));
 box.append(el('p','forge-swap-info',x.mode==='session'
  ?'Nur für dieses Training · bisherige Sätze bleiben beim Tausch rückgängig machbar'
  :'Für deinen aktiven Plan · erst nach „Speichern“ dauerhaft'));
 const tabs=el('div','forge-swap-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Übungsauswahl');
 for(const [value,label] of [['matching','✧ Passend'],['all','▱ Alle Alternativen']]){
  const b=button(label,()=>{
   if(!current||current.tab===value)return;
   current.tab=value;current.selected=null;current.message='';
   updateTabs();renderResults();
  },'forge-swap-tab');
  b.dataset.tab=value;b.setAttribute('role','tab');
  b.setAttribute('aria-selected',String(x.tab===value));
  tabs.append(b);
 }
 box.append(tabs);
 // Exactly ONE search control, independent of the active tab.
 const searchWrap=el('label','forge-swap-search');
 searchWrap.append(el('span','forge-swap-search-icon','⌕'));
 const search=el('input');search.type='search';search.placeholder='Übung suchen …';
 search.autocomplete='off';search.setAttribute('aria-label','Übung suchen');
 search.addEventListener('input',()=>{
  if(!current)return;
  current.query=search.value;current.selected=null;
  renderResults();
 });
 searchWrap.append(search);box.append(searchWrap);
 const results=el('div','forge-swap-results');results.id='forgeSwapResults';results.setAttribute('role','listbox');
 results.setAttribute('aria-label','Verfügbare Ersatzübungen');box.append(results);
 const feedback=el('p','forge-swap-feedback','');feedback.id='forgeSwapFeedback';
 feedback.setAttribute('role','status');box.append(feedback);
 const footer=el('div','forge-swap-footer');
 footer.append(button('Abbrechen',()=>close(false),'forge-swap-cancel'));
 const apply=button('⇄ Übung übernehmen',applySelection,'forge-swap-apply');
 apply.id='forgeSwapApply';apply.disabled=true;
 footer.append(apply);box.append(footer);
 renderResults();
}
function updateTabs(){
 if(!current)return;
 current.panel.querySelectorAll('[role="tab"]').forEach(b=>{
  b.setAttribute('aria-selected',String(b.dataset.tab===current.tab));
 });
}
function renderResults(){
 const x=current;if(!x)return;
 const results=$('forgeSwapResults');if(!results)return;
 const all=x.tab==='matching'?x.matching:x.available.filter(n=>n!==x.original);
 const found=filterNames(all,x.query);results.replaceChildren();
 const visible=found.slice(0,24);
 const banner=el('div','forge-swap-results-count',
  (x.tab==='matching'?'Passende Übungen':'Übungskatalog')+' · '+found.length+' Treffer');
 results.append(banner);
 for(const name of visible){
  const row=button('',()=>select(name),'forge-swap-item');
  row.setAttribute('role','option');
  row.setAttribute('aria-selected',String(x.selected===name));
  row.setAttribute('aria-label',name+' auswählen');
  row.append(imageFor(name));
  const description=el('span','forge-swap-item-details');
  description.append(el('strong','',name));
  description.append(el('span','forge-swap-item-note',x.tab==='matching'
   ?'Passende Alternative':'Übung aus deinem FORGE-Katalog'));
  row.append(description);
  row.append(imageFor(name,true));
  row.append(el('span','forge-swap-radio',x.selected===name?'✓':''));
  results.append(row);
 }
 if(!found.length){
  const empty=el('p','forge-swap-empty',x.tab==='matching'
   ?'Keine passenden Übungen gefunden. Unter „Alle Alternativen“ kannst du im gesamten Katalog suchen.'
   :'Keine Übung gefunden. Versuche einen anderen Suchbegriff.');
  results.append(empty);
 }
 if(found.length>visible.length)results.append(el('p','forge-swap-extra',
  'Weitere Treffer findest du über die Suche.'));
 const action=$('forgeSwapApply');if(action)action.disabled=!x.selected;
 const status=$('forgeSwapFeedback');if(status)status.textContent=x.message||'';
}
function select(name){
 const x=current;if(!x||!x.available.includes(name)||name===x.original)return;
 x.selected=name;x.message='';
 const nodes=x.panel.querySelectorAll('.forge-swap-item');
 nodes.forEach(node=>{
  const chosen=node.getAttribute('aria-label')===name+' auswählen';
  node.setAttribute('aria-selected',String(chosen));
  const mark=node.querySelector('.forge-swap-radio');if(mark)mark.textContent=chosen?'✓':'';
 });
 $('forgeSwapApply').disabled=false;
 $('forgeSwapFeedback').textContent='';
}
function applySelection(){
 const x=current;if(!x||x.busy||!x.selected||!x.available.includes(x.selected))return;
 if(x.mode==='plan'){
  if(state?.activeWorkout||String(x.draft.id)!==x.planId||
   x.draft.ex?.[x.index]?.name!==x.original){
   x.message='Der Plan wurde inzwischen verändert. Bitte erneut öffnen.';renderResults();return;
  }
  const previous=x.draft.ex[x.index];
  const defaults=typeof window.forge138Defaults==='function'?window.forge138Defaults(x.selected):null;
  // A different exercise gets its own recommended reps and unit, while preserving
  // the user's chosen number of sets. The saved plan remains staged until Save.
  if(defaults){
   const updated={...previous,...structuredClone(defaults),sets:previous.sets,name:x.selected};
   // Plank -> Dead Bug must not accidentally retain a "sec" unit.
   // Preserve the selected exercise's own unit, not the replaced one's.
   if(!Object.prototype.hasOwnProperty.call(defaults,'unit'))delete updated.unit;
   x.draft.ex[x.index]=updated;
  }else x.draft.ex[x.index]={...previous,name:x.selected};
  const done=x.onChoose;
  close(true);done();return;
 }
 const p=livePlan(),latest=String(state?.workoutDraft?.planId)===x.planId?
  state.workoutDraft?.exercises?.[x.index]?.name||p?.ex?.[x.index]?.name:p?.ex?.[x.index]?.name;
 if(!p||String(p.id)!==x.planId||p.ex[x.index]?.name!==x.planBase||
  state.activeWorkout?.startedAt!==x.expectedSession||latest!==x.original){
  x.message='Die laufende Einheit hat sich verändert. Bitte die Übungsauswahl neu öffnen.';
  renderResults();return;
 }
 if(typeof window.forge130Substitute!=='function'){
  x.message='Die Tauschfunktion ist gerade nicht verfügbar.';renderResults();return;
 }
 x.busy=true;
 try{
  // The core still owns all data mutations and confirmations. Synchronize
  // its selection only when a core-render race left it pointing elsewhere.
  const select=$('workoutSelect');
  if(select&&select.value!==String(p.id))select.value=String(p.id);
  invokeNativeSubstitution(x.index,x.selected);
 }catch(error){
  console.error('FORGE Ersatzübung fehlgeschlagen',error);
  x.message='Der Übungstausch konnte nicht abgeschlossen werden. Bitte Eingaben prüfen.';
 }finally{x.busy=false;}
 const final=state?.workoutDraft?.exercises?.[x.index]?.name;
 if(final===x.selected){close(true);return;}
 if(!x.message)x.message='Nicht übernommen. Die bestehende Übung bleibt erhalten.';
 renderResults();
}
function injectCss(){
 if($('forgeExerciseSwapStyle'))return;
 const s=el('style');s.id='forgeExerciseSwapStyle';
 s.textContent=[
 'body.forge-swap-open{overflow:hidden!important}',
 '.forge-swap-backdrop{position:fixed;z-index:99995;inset:0;background:#010809cc;display:flex;align-items:flex-end;justify-content:center;box-sizing:border-box}',
 '.forge-swap-sheet{box-sizing:border-box;display:flex;flex-direction:column;width:min(100%,640px);height:min(94dvh,940px);min-height:300px;background:linear-gradient(145deg,#112a2e,#0b181c 65%);border:1px solid #486456;border-bottom:0;border-radius:22px 22px 0 0;color:#f1f8ef;padding:9px 15px max(16px,env(safe-area-inset-bottom));box-shadow:0 -15px 60px #0009;overscroll-behavior:contain}',
 '.forge-swap-handle{height:5px;width:45px;background:#a9bcb9a6;border-radius:8px;align-self:center;flex:none;margin:0 0 8px}',
 '.forge-swap-head{display:flex;align-items:center;justify-content:space-between;gap:10px}',
 '.forge-swap-brand{font-size:15px;font-weight:950;letter-spacing:.07em;color:#a8f55d;font-style:italic}',
 '.forge-swap-close{min-height:39px;min-width:39px;background:transparent;border:0;color:#a8f55d;font-size:22px}',
 '.forge-swap-title{margin:4px 0 4px!important;font-size:clamp(18px,5vw,23px)!important;line-height:1.25!important;color:#f4fff0!important}',
 '.forge-swap-info{margin:0 0 12px!important;color:#b2c4ba;font-size:12px;line-height:1.4}',
 '.forge-swap-tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;background:#13262a;border:1px solid #3b584c;border-radius:12px;margin-bottom:10px;flex:none}',
 '.forge-swap-tab{border:0;min-height:42px!important;border-radius:9px;background:transparent;color:#d1ddd4;font-size:13px;font-weight:750;padding:5px!important}',
 '.forge-swap-tab[aria-selected="true"]{background:#a8f55d!important;color:#14271a!important}',
 '.forge-swap-search{display:flex;align-items:center;gap:8px;border:1px solid #456359;border-radius:11px;background:#10262b;min-height:47px;margin-bottom:11px;padding:0 11px;flex:none}',
 '.forge-swap-search-icon{font-size:22px;line-height:1;color:#a8f55d}',
 '.forge-swap-search input{flex:1;min-width:0;width:100%;min-height:43px!important;height:43px!important;padding:4px!important;color:#eef8ed!important;border:0!important;background:transparent!important;outline:0!important;font-size:14px!important}',
 '.forge-swap-search:focus-within{outline:2px solid #a8f55d;outline-offset:1px}',
 '.forge-swap-results{min-height:0;flex:1;overflow-y:auto;overscroll-behavior:contain;display:grid;align-content:start;gap:7px;padding:0 1px 8px}',
 '.forge-swap-results-count{font-size:11px;color:#aabcad;padding:2px 0 3px}',
 '.forge-swap-item{min-height:77px!important;display:flex;align-items:center;gap:10px;width:100%;min-width:0;padding:7px!important;background:#12242a!important;color:#f1f7ef!important;border:1px solid #365349!important;border-radius:12px!important;text-align:left!important;box-shadow:none!important}',
 '.forge-swap-item[aria-selected="true"]{border-color:#a8f55d!important;background:#1b3c2a!important}',
 '.forge-swap-thumb{display:flex;flex:none;width:77px;height:58px;overflow:hidden;background:#223431;border-radius:9px;align-items:center;justify-content:center}',
 '.forge-swap-thumb img,.forge-swap-thumb svg{display:block;width:100%;height:100%;object-fit:cover}',
 '.forge-swap-anatomy{display:flex;flex:none;align-items:center;justify-content:center;width:33px;height:45px;overflow:hidden;border-radius:7px;background:#172d2d}',
 '.forge-swap-anatomy img,.forge-swap-anatomy svg{width:100%;height:100%;object-fit:contain}',
 '.forge-swap-placeholder{font-size:19px;color:#a8f55d}',
 '.forge-swap-item-details{display:grid;gap:5px;min-width:0;flex:1}',
 '.forge-swap-item-details strong{font-size:13px;font-weight:790;overflow-wrap:anywhere;line-height:1.2}',
 '.forge-swap-item-note{font-size:11px;color:#aac9b0;line-height:1.25}',
 '.forge-swap-radio{display:grid;flex:none;place-items:center;width:21px;height:21px;border:2px solid #96aba0;border-radius:50%;color:#142318;font-size:12px}',
 '.forge-swap-item[aria-selected="true"] .forge-swap-radio{border-color:#a8f55d;background:#a8f55d}',
 '.forge-swap-empty,.forge-swap-extra{padding:15px 3px;color:#aebfae;font-size:13px;line-height:1.4}',
 '.forge-swap-feedback{font-size:11px;color:#ffcebf;margin:0!important;min-height:0;line-height:1.35}',
 '.forge-swap-footer{flex:none;display:grid;grid-template-columns:.85fr 1.4fr;gap:9px;padding:10px 0 3px;border-top:1px solid #3a5547}',
 '.forge-swap-footer button{min-height:47px!important;border-radius:10px;font-size:13px;font-weight:800;padding:7px!important}',
 '.forge-swap-cancel{background:transparent;color:#e2ece2;border:1px solid #698376}',
 '.forge-swap-apply{background:#a8f55d;color:#14231a;border:0}',
 '.forge-swap-apply:disabled{opacity:.35}',
 '.forge-swap-tab:focus-visible,.forge-swap-item:focus-visible,.forge-swap-footer button:focus-visible{outline:2px solid #a8f55d;outline-offset:2px}',
 '@media(max-width:360px){.forge-swap-sheet{padding-left:10px;padding-right:10px}.forge-swap-thumb{width:60px;height:51px}.forge-swap-anatomy{width:29px}.forge-swap-item{gap:6px}}',
 '@media(max-height:650px){.forge-swap-sheet{height:100dvh;border-radius:0}.forge-swap-thumb{height:48px}.forge-swap-item{min-height:61px!important}}',
 '#workout.forge-compact-live .forge-workout-all[open] .forge130-substitute,#workout.forge-compact-live .forge-workout-all[open] .forge130-substitute[open]{display:none!important}'
 ].join('\n');
 document.head.append(s);
}
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&current){
  event.preventDefault();event.stopImmediatePropagation();close(false);
 }
},true);
})();
