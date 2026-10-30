/* FORGE exercise catalog: choose strength or mobility without changing stored plans.
 * Both category cards stay inside the existing catalog (no second app or data store).
 */
(function () {
 'use strict';
 var previousRender=window.forge131RenderCatalog;
 var category=null, mobility=null, loading=false;
 var $=id=>document.getElementById(id);
 function element(tag,cls,text){
   var el=document.createElement(tag);
   if(cls)el.className=cls;
   if(text!==undefined)el.textContent=text;
   return el;
 }
 function normalize(text){
   return String(text||'').toLocaleLowerCase('de').normalize('NFD')
     .replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss').trim();
 }
 function filterMobility(exercises,query){
   var term=normalize(query);
   return exercises.filter(x=>!term||normalize([x.name,x.region].concat(x.steps||[]).join(' ')).includes(term));
 }
 // A pure read-only helper for regression tests; there is no second exercise store.
 window.ForgeCatalogCategories={filterMobility:filterMobility,normalize:normalize};
 function refreshMixButtons(){
   var names=typeof window.forgePlusMobilityMixNames==='function'
     ?window.forgePlusMobilityMixNames():[];
   document.querySelectorAll('#forgeCatalogResults button[data-forge-mix-name]').forEach(button=>{
     var on=names.includes(button.dataset.forgeMixName);
     button.textContent=on?'✓ Im Mobilitätsmix':'＋ Zum Mobilitätstraining hinzufügen';
     button.setAttribute('aria-pressed',String(on));
     button.disabled=typeof window.forgePlusToggleMobilityMix!=='function';
   });
 }
 function openExercise(exercise){
   if(typeof window.forgePlusOpenMobility!=='function')return;
   if(typeof window.go==='function')window.go('workout');
   var timer=$('forgePlusTimer');
   var section=timer?.closest('details.forge149-workout-section');
   if(section)section.open=true;
   var panel=$('forgePlusWorkout');
   if(panel)panel.open=true;
   window.forgePlusOpenMobility(exercise.name);
 }
 function populateMobility(details,exercise){
   var host=details.querySelector('.forge-catalog-loaded');
   if(!host||host.dataset.ready)return;
   host.dataset.ready='1';
   host.classList.add('forge165-mob-content');
   var picture=element('div','forge165-visual');
   if(typeof window.forgeExerciseIllustrations==='function'){
     var html=window.forgeExerciseIllustrations(exercise.name);
     if(html)picture.innerHTML=html;
   }
   host.append(picture);
   var instructions=element('div','forge165-instructions');
   instructions.append(element('strong','', 'So geht die Übung:'));
   var steps=element('ol');
   (exercise.steps||[]).forEach(step=>steps.append(element('li','',step)));
   instructions.append(steps);
   if(exercise.tip)instructions.append(element('p','forge-ex-tip','💡 '+exercise.tip));
   host.append(instructions);
   var actions=element('div','forge165-actions');
   var mix=element('button','btn small alt');
   mix.type='button';
   mix.dataset.forgeMixName=exercise.name;
   mix.addEventListener('click',()=>{
     if(typeof window.forgePlusToggleMobilityMix!=='function')return;
     window.forgePlusToggleMobilityMix(exercise.name);
     refreshMixButtons();
   });
   actions.append(mix);
   var start=element('button','btn small','▶ Übung starten');
   start.type='button';
   start.disabled=typeof window.forgePlusOpenMobility!=='function';
   start.addEventListener('click',()=>openExercise(exercise));
   actions.append(start);
   host.append(actions);
   refreshMixButtons();
 }
 function drawMobility(search,root,count){
   if(!mobility){
     root.replaceChildren(element('p','muted','Mobilitätsübungen werden geladen …'));
     count.textContent='Mobilitätstraining';
     if(!loading){
       loading=true;
       fetch('./exercise-plus-data.json',{cache:'force-cache'})
       .then(r=>{if(!r.ok)throw Error('Mobilitätskatalog nicht erreichbar');return r.json();})
       .then(data=>{
         if(!Array.isArray(data.mobility)||data.mobility.length!==20)throw Error('Unvollständiger Mobilitätskatalog');
         mobility=data.mobility;
         if(category==='mobility')render();
       })
       .catch(err=>{
         if(category==='mobility')root.replaceChildren(element('p','muted','Mobilitätsübungen konnten nicht geladen werden. Bitte Katalog erneut öffnen.'));
         console.warn('FORGE category catalog',err);
       })
       .finally(()=>{loading=false;});
     }
     return;
   }
   var matches=filterMobility(mobility,search.value);
   root.replaceChildren();
   count.textContent=matches.length+' von '+mobility.length+' Mobilitätsübungen';
   if(!matches.length){
     root.append(element('p','muted','Keine passenden Mobilitätsübungen gefunden.'));
     return;
   }
   matches.forEach(exercise=>{
     var details=element('details','forge-catalog-item forge165-mobility-item');
     var summary=element('summary');
     summary.append(element('span','',exercise.name));
     summary.append(element('small','forge165-region',exercise.region||'Mobilität'));
     details.append(summary,element('div','forge-catalog-loaded'));
     details.addEventListener('toggle',()=>{if(details.open)populateMobility(details,exercise);});
     root.append(details);
   });
 }
 function addStyles(){
   if($('forge165CategoryStyle'))return;
   var style=element('style');
   style.id='forge165CategoryStyle';
   style.textContent=[
     '#forgeCatalogCategoryChoices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:3px 0 14px}',
     '#forgeCatalogCategoryChoices .forge165-category-card{display:flex;min-width:0;min-height:128px;flex-direction:column;align-items:flex-start;',
     'justify-content:center;gap:7px;text-align:left;background:#172a31;color:#eff6f2;border:1px solid #3f5558;',
     'border-radius:15px;padding:13px 12px;cursor:pointer;font:inherit;transition:border-color .15s,background-color .15s}',
     '#forgeCatalogCategoryChoices .forge165-category-card[aria-pressed="true"]{border:2px solid #a8f55d;background:#234236;padding:12px 11px}',
     '#forgeCatalogCategoryChoices .forge165-category-card:focus-visible{outline:2px solid #a8f55d;outline-offset:2px}',
     '#forgeCatalogCategoryChoices .forge165-category-icon{font-size:24px;line-height:1}',
     '#forgeCatalogCategoryChoices .forge165-category-card strong{font-size:14px;line-height:1.22;overflow-wrap:anywhere}',
     '#forgeCatalogCategoryChoices .forge165-category-card small{font-size:11px;line-height:1.35;color:#bfd1ca}',
     '#forgeCatalog .forge165-hint{margin:3px 0 13px;color:#bac9c5;font-size:12px;line-height:1.5}',
     '#forgeCatalog .forge165-region{font-size:11px;font-weight:600;color:#acd6bd;text-align:right}',
     '#forgeCatalog .forge165-instructions{padding:6px 0 10px;font-size:13px;line-height:1.55}',
     '#forgeCatalog .forge165-instructions ol{padding-left:22px;margin:10px 0}',
     '#forgeCatalog .forge165-instructions li{margin:6px 0}',
     '#forgeCatalog .forge165-visual{max-width:100%;min-width:0;overflow:hidden;margin:7px 0 11px}',
     '#forgeCatalog .forge165-actions{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}',
     '#forgeCatalog .forge165-actions button{min-height:44px;flex:1 1 170px;max-width:100%;white-space:normal}',
     '#forgeCatalog .forge165-actions button:disabled{opacity:.5}',
     '#forgeCatalog [hidden]{display:none!important}',
     '@media(max-width:370px){#forgeCatalogCategoryChoices{gap:7px}',
     '#forgeCatalogCategoryChoices .forge165-category-card{padding:10px 9px;min-height:125px}',
     '#forgeCatalogCategoryChoices .forge165-category-card[aria-pressed="true"]{padding:9px 8px}',
     '#forgeCatalogCategoryChoices .forge165-category-card strong{font-size:12px}',
     '#forgeCatalogCategoryChoices .forge165-category-card small{font-size:10px}}',
     '@media(prefers-reduced-motion:reduce){#forgeCatalogCategoryChoices .forge165-category-card{transition:none}}'
   ].join('');
   document.head.append(style);
 }
 function prepare(){
   var catalog=$('forgeCatalog'),input=$('forgeCatalogSearch'),
       results=$('forgeCatalogResults'),count=$('forgeCatalogCount');
   var inner=catalog?.querySelector('.forge-catalog-inner');
   if(!catalog||!inner||!input||!results||!count)return null;
   var choices=$('forgeCatalogCategoryChoices');
   if(!choices){
     choices=element('div','forge165-category-grid');
     choices.id='forgeCatalogCategoryChoices';
     choices.setAttribute('role','group');
     choices.setAttribute('aria-label','Übungskategorie');
     [['strength','🏋️','Kraftübungen','Zum Trainingsplan hinzufügen'],
      ['mobility','🧘','Mobilitätstraining','Zum Mobilitätsmix hinzufügen']].forEach(entry=>{
       var button=element('button','forge165-category-card');
       button.type='button';
       button.dataset.forgeCategory=entry[0];
       button.setAttribute('aria-pressed','false');
       var icon=element('span','forge165-category-icon',entry[1]);
       icon.setAttribute('aria-hidden','true');
       button.append(icon,element('strong','',entry[2]),element('small','',entry[3]));
       button.addEventListener('click',()=>{
         if(category!==entry[0]){
           category=entry[0];
           input.value='';
           render();
         }
       });
       choices.append(button);
     });
     inner.insertBefore(choices,inner.firstChild);
     var hint=element('p','forge165-hint','Wähle zuerst Kraftübungen oder Mobilitätstraining.');
     hint.id='forgeCatalogCategoryHint';
     choices.after(hint);
   }
   return {catalog,input,results,count,choices,label:inner.querySelector('label[for="forgeCatalogSearch"]'),hint:$('forgeCatalogCategoryHint')};
 }
 function render(){
   var ui=prepare();
   if(!ui)return;
   ui.choices.querySelectorAll('button[data-forge-category]').forEach(button=>{
     var active=button.dataset.forgeCategory===category;
     button.setAttribute('aria-pressed',String(active));
   });
   var active=category!==null;
   ui.input.hidden=!active;ui.results.hidden=!active;ui.count.hidden=!active;
   if(ui.label)ui.label.hidden=!active;
   if(ui.hint){
     ui.hint.textContent=category==='strength'?'Wähle eine Kraftübung und übernimm sie in deinen Trainingsplan.':
       category==='mobility'?'Übungen ansehen, einzeln starten oder zum Mobilitätstraining hinzufügen.':
       'Wähle zuerst Kraftübungen oder Mobilitätstraining.';
   }
   if(!active){ui.results.replaceChildren();return;}
   if(category==='strength'){
     ui.input.placeholder='Kraftübung oder Muskelgruppe suchen …';
     if(ui.label)ui.label.textContent='Kraftübungen durchsuchen';
     if(typeof previousRender==='function'){
       previousRender();
       ui.count.textContent=(window.forge131Results?.length||0)+' Kraftübungen gefunden';
     }
   }else{
     ui.input.placeholder='Mobilitätsübung oder Körperregion suchen …';
     if(ui.label)ui.label.textContent='Mobilitätstraining durchsuchen';
     drawMobility(ui.input,ui.results,ui.count);
   }
 }
 function boot(){
   addStyles();
   if(typeof previousRender!=='function'||!prepare())return;
   window.forge131RenderCatalog=render;
   document.addEventListener('forge:mobility-ready',refreshMixButtons);
   render();
   // The library and its renderer load asynchronously, but the catalog controls stay put.
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
 else boot();
})();