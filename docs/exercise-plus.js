/* FORGE exercise expansion: one original UI design, no changes to existing workout data. */
(function(){
'use strict';
var S=[],M=[],byName={},selected=[],timer=null;
var $=id=>document.getElementById(id);
var E=(tag,cls,txt)=>{var n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
var btn=(txt,fn,alt)=>{var n=E('button','btn small'+(alt?' alt':''),txt);n.type='button';n.addEventListener('click',fn);return n;};
var searchKey=x=>String(x||'').toLocaleLowerCase('de').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
var clock=n=>{n=Math.max(0,Math.ceil(n));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');};
function store(){try{save();}catch(ex){console.warn('FORGE: library save failed',ex);}}
function routine(){
 MOB_ROUTINES['forge-custom']={name:'Mein Mobilitätsmix',items:selected.map(n=>M.find(x=>x.name===n)).filter(Boolean).map(x=>[x.name,x.seconds,x.region+' · '+(x.sides?'Seite wechseln':'beidseitig')])};
 state.forgeMobCustom=selected.slice();
 var select=$('mobRoutine');
 if(select){var option=select.querySelector('option[value="forge-custom"]');
  if(!option){option=E('option');option.value='forge-custom';select.appendChild(option);}
  option.textContent='Mein Mobilitätsmix ('+selected.length+')';
 }
}
function addToMix(name){
 selected=selected.includes(name)?selected.filter(n=>n!==name):selected.concat(name);
 routine();store();
 document.querySelectorAll('[data-mix-name]').forEach(n=>{if(n.dataset.mixName===name)n.textContent=selected.includes(name)?'✓ Im Mix':'＋ Mein Mix';});
 if($('mobRoutine')?.value==='forge-custom')try{renderMobilityPreview();}catch(ex){}
}
function originalGuides(){
 var base=window.forgeStrengthGuide, muscle=window.forgeMuscleMap;
 window.forgeStrengthGuide=function(name){
  var x=byName[name];if(!x)return base(name);
  var pill=[x.group,x.place==='gym'?'Fitnessstudio':'Zuhause / Studio',x.equipment,x.difficulty].map(t=>'<span>'+esc(t)+'</span>').join('');
  return '<div class="forge-plus-meta">'+pill+'</div>'+base(name);
 };
 window.forgeMuscleMap=function(name){
  var zones=FORGE_MUSCLE_ZONES[name];
  if(!zones||FORGE_ANATOMICAL_IMAGES[zones.slice().sort().join('|')])return muscle(name);
  return '<details class="forge-muscle-map"><summary>🎯 Beanspruchte Muskelgruppen anzeigen</summary><div class="forge-muscle-content"><div class="forge-muscle-meta"><b>Betroffene Muskelgruppen</b><div class="forge-muscle-tags">'+
    zones.map(z=>'<span>'+esc(FORGE_ZONE_NAMES[z]||z)+'</span>').join('')+
    '</div><small>Für diese Muskelkombination wird die anatomische Markierung noch ergänzt.</small></div></div></details>';
 };
}
function install(data){
 if(!data||data.strength?.length!==20||data.mobility?.length!==20)throw Error('Incomplete FORGE library');
 S=data.strength;M=data.mobility;
 // Reuse the existing routine guide format so detailed instructions also show
 // inside a custom mobility week, not only in the exercise discovery library.
 M.forEach(x=>{FORGE_EX_GUIDES[x.name]=[x.steps,x.tip];});
 const originalMobGuide=window.forgeMobExerciseGuide;
 if(typeof originalMobGuide==='function')window.forgeMobExerciseGuide=function(item){
   const x=M.find(v=>v.name===item[0]);
   if(!x)return originalMobGuide(item);
   const id=encodeURIComponent(x.name);
   return '<details><summary><span class="forge-ex-label"><b>'+esc(x.name)+'</b><small>'+
     (x.mode==='hold'?x.seconds+' Sek. halten':x.amount+' Wiederholungen')+
     (x.sides?' je Seite':'')+' · Anleitung & Timer</small></span></summary><div class="forge-ex-body">'+
     '<div class="forge162-extra">'+(window.forgeExerciseIllustrations?.(x.name)||'')+'</div><b>So geht die Übung:</b><ol>'+x.steps.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ol>'+
     '<div class="forge-ex-tip">💡 '+esc(x.tip)+'</div>'+
     '<button type="button" class="btn alt small" data-forge-mob-exercise="'+id+'">⏱ Timer öffnen</button>'+
     '</div></details>';
 };
 window.forgePlusOpenMobility=function(name){const x=M.find(t=>t.name===name);if(x)openTimer(x);};
 document.addEventListener('click',function(event){
   const button=event.target.closest('[data-forge-mob-exercise]');
   if(button)window.forgePlusOpenMobility(decodeURIComponent(button.getAttribute('data-forge-mob-exercise')));
 });
 originalGuides();
 var names=new Set(forge131AllNames());
 S.forEach(x=>{
  byName[x.name]=x;
  if(!names.has(x.name))FORGE_131_EXERCISES.push({name:x.name,type:x.place,sets:x.sets,reps:x.reps,group:x.group});
  FORGE_MUSCLE_ZONES[x.name]=x.zones;
  FORGE_STRENGTH_GUIDES[x.name]=[x.group,...x.steps,x.tip];
 });
 // Existing catalog chooser defaults all "new" movements to the gym; restore
 // correct home/studio setting and time-based units for this expansion.
 var originalChoose=window.forge131ChooseExercise;
 if(typeof originalChoose==='function')window.forge131ChooseExercise=function(index){
   originalChoose(index);
   var chosen=window.forge131Results?.[index],x=byName[chosen];
   if(x){
     if($('manualLocation'))$('manualLocation').value=x.place;
     if($('manualUnit'))$('manualUnit').value=x.unit||'reps';
   }
 };
 if($('manualExercise'))manualInit();
 if($('forgeCatalog')?.open)forge131RenderCatalog();
 selected=(Array.isArray(state.forgeMobCustom)?state.forgeMobCustom:[]).filter(n=>M.some(x=>x.name===n));
 routine();
 // Reuse the original mobile training-mix workflow from the separated catalog.
 window.forgePlusMobilityMixNames=function(){return selected.slice();};
 window.forgePlusToggleMobilityMix=function(name){
  if(!M.some(x=>x.name===name))return false;
  addToMix(name);return selected.includes(name);
 };
 document.dispatchEvent(new Event('forge:mobility-ready'));
 var beforeRender=window.renderMobility;
 window.renderMobility=function(){routine();return beforeRender.apply(this,arguments);};
 style();
 panel($('mobPreview'),'🧘 20 weitere Mobilitätsübungen','Bewegungen ansehen, einzeln üben und in deinen eigenen Mix aufnehmen.');
 panel($('mobWorkout'),'🧘 Mobilitätsübungen einzeln starten','Ausführung, Wiederholungen und Timer für beide Seiten.');
 var workout=$('forgePlusWorkout');
 if(workout&&!$('forgePlusTimer')){var host=E('section');host.id='forgePlusTimer';host.hidden=true;workout.before(host);}
 recover();renderTimer();window.setInterval(tick,250);
}
function panel(anchor,title,subtitle){
 if(!anchor)return;
 var root=E('details','forge-plus-panel'),summary=E('summary','',title),body=E('div','forge-plus-panel-body');
 root.id=anchor.id==='mobWorkout'?'forgePlusWorkout':'forgePlusPlan';
 body.append(E('p','muted',subtitle));
 var row=E('div','forge-plus-filters'),input=E('input');input.type='search';input.placeholder='Übung oder Körperregion suchen';
 var region=E('select');region.setAttribute('aria-label','Mobilitätsbereich');
 ['Alle','Hüfte','Knie','Sprunggelenk','Fuß','Wade','Oberschenkel','Becken','Rücken','LWS','Brustwirbelsäule','Schulter','Handgelenk','Gesäß'].forEach(t=>{
  var opt=E('option','',t);opt.value=t;region.appendChild(opt);
 });
 row.append(input,region);
 var count=E('p','forge-plus-count',''),list=E('div','forge-plus-list');
 body.append(row,count,list);
 function update(){
  var t=searchKey(input.value),r=searchKey(region.value);list.replaceChildren();
  var found=M.filter(x=>(!t||searchKey(x.name+' '+x.region).includes(t))&&(r==='alle'||searchKey(x.region).includes(r)));
  count.textContent=found.length+' von 20 Mobilitätsübungen';
  found.forEach(x=>{
   var d=E('details','forge-plus-item'),s=E('summary'),info=E('div','forge-plus-item-body');
   s.append(E('strong','',x.name),E('small','',x.region+' · '+(x.mode==='hold'?x.seconds+' Sek. halten':x.amount+' Wiederholungen')+(x.sides?' je Seite':'')));
   info.append(E('p','forge-plus-detail',x.mode==='hold'?'Statische Dehnung':'Kontrollierte dynamische Mobilität'));
   if(window.forgeExerciseIllustrations){const html=window.forgeExerciseIllustrations(x.name);if(html)info.insertAdjacentHTML('beforeend',html);}
   var label=E('strong','','So geht die Übung:'),list=E('ol');
   x.steps.forEach(step=>list.append(E('li','',step)));
   info.append(label,list,E('p','forge-ex-tip','💡 '+x.tip));
   var actions=E('div','forge-plus-actions'),mix=btn(selected.includes(x.name)?'✓ Im Mix':'＋ Mein Mix',()=>addToMix(x.name),true);
   mix.dataset.mixName=x.name;
   actions.append(mix,btn('⏱ Starten',()=>openTimer(x),false));
   info.append(actions);d.append(s,info);listRoot().append(d);
  });
  if(!found.length)listRoot().append(E('p','muted','Keine passenden Übungen.'));
  function listRoot(){return body.querySelector('.forge-plus-list');}
 }
 input.addEventListener('input',update);region.addEventListener('change',update);
 root.addEventListener('toggle',()=>{if(root.open&&!root.dataset.rendered){root.dataset.rendered='1';update();}});
 root.append(summary,body);anchor.after(root);
}
function recover(){
 var t=state.forgeMobIndividualTimer;
 if(t&&M.some(x=>x.name===t.name))timer={
  name:t.name,remaining:Math.max(0,Number(t.remaining)||0),start:t.running?(Number(t.startedAt)||Date.now()):0,
  side:t.side==='left'?'left':'right',done:Number(t.done)||0,running:!!t.running
 };
}
function left(){
 if(!timer)return 0;
 return Math.max(0,timer.remaining-(timer.running?Math.floor((Date.now()-timer.start)/1000):0));
}
function freeze(){if(timer){timer.remaining=left();timer.running=false;timer.start=0;}}
function saveTimer(){
 if(!timer){state.forgeMobIndividualTimer=null;store();return;}
 state.forgeMobIndividualTimer={
  name:timer.name,remaining:left(),running:timer.running,startedAt:timer.running?Date.now():0,side:timer.side,done:timer.done
 };
 store();
}
function openTimer(x){
 if(timer?.running)freeze();
 timer={name:x.name,remaining:x.seconds,running:false,start:0,side:'right',done:0};
 saveTimer();renderTimer();$('forgePlusTimer')?.scrollIntoView({behavior:'smooth',block:'center'});
}
function act(op){
 if(!timer)return;var x=M.find(t=>t.name===timer.name);if(!x)return;
 if(op==='play'){if(left()===0)timer.remaining=x.seconds;if(!timer.running){timer.running=true;timer.start=Date.now();}}
 if(op==='pause')freeze();
 if(op==='reset'){timer={name:x.name,remaining:x.seconds,running:false,start:0,side:'right',done:0};}
 if(op==='side'){freeze();timer.side=timer.side==='right'?'left':'right';timer.done=0;timer.remaining=x.seconds;}
 if(op==='rep'){timer.done=Math.min(999,timer.done+1);if(timer.done>=x.amount&&!x.sides)freeze();}
 if(op==='close'){freeze();timer=null;}
 saveTimer();renderTimer();
}
function renderTimer(){
 var root=$('forgePlusTimer');if(!root)return;root.replaceChildren();
 if(!timer){root.hidden=true;return;}root.hidden=false;
 var x=M.find(t=>t.name===timer.name);if(!x)return;
 var head=E('div','forge-plus-timer-head');head.append(E('strong','',x.name),btn('✕',()=>act('close'),true));root.append(head);
 root.append(E('div','forge-plus-clock',clock(left())));
 root.append(E('div','forge-plus-detail',x.mode==='hold'?'Haltedauer: '+x.seconds+' Sekunden':'Ziel: '+x.amount+' Wiederholungen'+(x.sides?' je Seite':'')));
 if(x.sides)root.append(E('div','forge-plus-focus','Seite: '+(timer.side==='right'?'Rechts':'Links')));
 if(x.mode==='dynamic')root.append(E('div','forge-plus-focus','Erledigt: '+timer.done+' / '+x.amount));
 var controls=E('div','forge-plus-actions');
 controls.append(btn(timer.running?'⏸ Pause':'▶ Start',()=>act(timer.running?'pause':'play'),false));
 if(x.mode==='dynamic')controls.append(btn('＋ 1 Wdh.',()=>act('rep'),true));
 if(x.sides)controls.append(btn('⇄ Seite wechseln',()=>act('side'),true));
 controls.append(btn('↺ Zurücksetzen',()=>act('reset'),true));root.append(controls);
 root.append(E('p','forge-plus-detail','Der Timer läuft unabhängig von deiner Krafttraining-Stoppuhr. Schmerzfrei bewegen.'));
}
function tick(){
 if(!timer?.running)return;
 var seconds=left(),digits=document.querySelector('#forgePlusTimer .forge-plus-clock');
 if(digits)digits.textContent=clock(seconds);
 if(seconds===0){freeze();saveTimer();renderTimer();}
}
function style(){
 if($('forgePlusCss'))return;
 var css=E('style');css.id='forgePlusCss';
 css.textContent=[
 '.forge-plus-meta{display:flex;flex-wrap:wrap;gap:6px;margin:9px 0 13px}',
 '.forge-plus-meta span{font-size:11px;border-radius:999px;border:1px solid #446e53;background:#233a37;color:#e7f6e7;padding:5px 9px}',
 '.forge-plus-panel{border-top:1px solid #3c5458;background:transparent;margin:10px 0;color:#ecf8ef}',
 '.forge-plus-panel>summary{list-style:none;padding:15px 2px;cursor:pointer;font-weight:750}',
 '.forge-plus-panel>summary::-webkit-details-marker{display:none}',
 '.forge-plus-panel>summary:after{content:"⌄";float:right;color:#a8f55d;font-size:20px}',
 '.forge-plus-panel[open]>summary:after{transform:rotate(180deg)}',
 '.forge-plus-panel-body{padding:4px 2px 16px}',
 '.forge-plus-filters{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}',
 '.forge-plus-filters input{flex:2;min-width:150px}.forge-plus-filters select{flex:1;min-width:125px}',
 '.forge-plus-count,.forge-plus-detail{font-size:12px;color:#b6c9bd;line-height:1.6}',
 '.forge-plus-item{border:0;border-top:1px solid #3b4b50;padding:0;background:transparent}',
 '.forge-plus-item>summary{cursor:pointer;list-style:none;padding:12px 1px;display:flex;flex-direction:column;gap:4px}',
 '.forge-plus-item>summary::-webkit-details-marker{display:none}',
 '.forge-plus-item>summary strong{font-size:14px;color:#f4f8f5}',
 '.forge-plus-item>summary small{font-size:11px;color:#b6c8ba}',
 '.forge-plus-item-body{padding:5px 4px 14px;font-size:13px;line-height:1.5}',
 '.forge-plus-item-body li{margin:7px 0}',
 '.forge-plus-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}',
 '.forge-plus-actions button{min-height:44px;white-space:normal}',
 '#forgePlusTimer{background:#192f35;border:1px solid #799a62;border-radius:16px;padding:15px;margin:12px 0}',
 '#forgePlusTimer[hidden]{display:none!important}',
 '.forge-plus-timer-head{display:flex;align-items:center;justify-content:space-between;gap:12px}',
 '.forge-plus-clock{text-align:center;font-size:44px;font-weight:800;color:#a8f55d;font-variant-numeric:tabular-nums;margin:8px 0}',
 '.forge-plus-focus{text-align:center;font-weight:750;margin:7px 0}'
 ].join('');document.head.append(css);
}
function init(){fetch('./exercise-plus-data.json',{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('Missing exercise-plus-data.json');return r.json();}).then(install).catch(err=>console.error('FORGE exercise-plus',err));}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
