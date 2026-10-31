/* FORGE UX step 4: Progress first, details on demand.
 * Pure DOM reorganisation of legacy Progress. Never change state,
 * calculations, charts, challenges, weight records, IDs or save handlers.
 * The live original renderProgress() continues updating all moved nodes.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const node=(tag,cls,label)=>{
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(label!==undefined)el.textContent=label;
 return el;
};
let installed=false;
function panelFor(id,root){
 const element=$(id);
 const panel=element?.closest?.('details.forge-stats-fold');
 return panel&&root?.contains?.(panel)?panel:null;
}
function feature(panel,type){
 if(!panel)return false;
 panel.dataset.forgeSlimFeature=type;
 panel.open=true;
 return true;
}
function reveal(id){
 const field=$(id);if(!field)return false;
 const panel=field.closest?.('details.forge-stats-fold');
 if(!panel)return false;
 panel.open=true;
 panel.scrollIntoView?.({behavior:'smooth',block:'start'});
 return true;
}
window.ForgeProgressSlim=Object.freeze({panelFor,reveal,simplifyChallenges,isInstalled:()=>installed});
function style(){
 if($('forgeProgressSlimPhase4Style'))return;
 const css=node('style');
 css.id='forgeProgressSlimPhase4Style';
 css.textContent=[
  '#progress.forge-slim-phase4>.tag,#progress.forge-slim-phase4>.forge-intro{display:none!important}',
  '#progress.forge-slim-phase4>h1{font-size:24px;margin:5px 0 13px}',
  '#progress.forge-slim-phase4 .forge-stats-fold-controls{display:none!important}',
  '#progress.forge-slim-phase4 .forge-progress-tabs{display:grid!important;grid-template-columns:1fr 1fr;gap:7px;margin:0 0 12px;padding:3px;border:1px solid #42564c;border-radius:13px;background:#17282b}',
  '#progress.forge-slim-phase4 .forge-progress-tabs button{min-height:45px;min-width:0;border:0!important;border-radius:9px!important;background:transparent!important;color:#c1d2c9!important;font-size:13px!important;font-weight:750!important}',
  '#progress.forge-slim-phase4 .forge-progress-tabs button.active{background:#2a4536!important;color:#b9f990!important}',
  '#progress.forge-slim-phase4 .forge-progress-tabs button:focus-visible{outline:2px solid #a8f55d;outline-offset:1px}',
  '#progress.forge-slim-phase4 #forgeProgressStats{display:flex;flex-direction:column;gap:0}',
  '#progress.forge-slim-phase4 #forgeProgressStats[hidden],#progress.forge-slim-phase4 #forgeProgressChallenges[hidden]{display:none!important}',
  '#progress.forge-slim-phase4 #forgeSlimProgressIntro{order:-5;margin:9px 0 11px}',
  '#progress.forge-slim-phase4 #forgeSlimProgressIntro h2{font-size:18px;color:#edf8ef;margin:0 0 3px}',
  '#progress.forge-slim-phase4 #forgeSlimProgressIntro p{font-size:12px;color:#a9beb4;margin:0;line-height:1.45}',
  '#progress.forge-slim-phase4 #forgeProgressStats>details[data-forge-slim-feature="summary"]{order:-4}',
  '#progress.forge-slim-phase4 #forgeProgressStats>details[data-forge-slim-feature="activity"]{order:-2}',
  '#progress.forge-slim-phase4 #forgeSlimProgressActivityTitle{order:-3;font-size:17px;color:#edf8ef;margin:20px 0 9px}',
  '#progress.forge-slim-phase4 #forgeSlimProgressMoreTitle{order:-1;font-size:17px;color:#edf8ef;margin:21px 0 6px}',
  '#progress.forge-slim-phase4 #forgeProgressStats>details[data-forge-slim-feature]{border:0!important;background:transparent!important;box-shadow:none!important;border-radius:0!important;margin:0!important;padding:0!important}',
  '#progress.forge-slim-phase4 #forgeProgressStats>details[data-forge-slim-feature]>summary{display:none!important}',
  '#progress.forge-slim-phase4 #forgeProgressStats>details[data-forge-slim-feature]>.disclosure-body{padding:0!important;background:transparent!important;border:0!important}',
  '#progress.forge-slim-phase4 .forge-stats-hero{border:0!important;box-shadow:none!important;padding:0!important;background:transparent!important}',
  '#progress.forge-slim-phase4 #forgeProgressSummary{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px!important;margin:0!important}',
  '#progress.forge-slim-phase4 #forgeProgressSummary>.forge-stats-tile{border:1px solid #395b4a!important;border-radius:13px!important;background:#182f2b!important;padding:13px 10px!important;min-width:0!important;box-shadow:none!important}',
  '#progress.forge-slim-phase4 #forgeProgressSummary>.forge-stats-tile strong{font-size:23px!important;color:#b9f77f!important;display:block;line-height:1.25;overflow-wrap:anywhere}',
  '#progress.forge-slim-phase4 #forgeProgressSummary>.forge-stats-tile small{font-size:12px;color:#c2d3c5;line-height:1.4;display:block;margin-top:5px}',
  '#progress.forge-slim-phase4 #forgeProgressStats>details[data-forge-slim-feature="activity"] .card{border:0!important;box-shadow:none!important;background:transparent!important;padding:0!important;margin:0!important}',
  '#progress.forge-slim-phase4 #forgeProgressStats>details[data-forge-slim-feature="activity"] .forge-stats-head{display:none!important}',
  '#progress.forge-slim-phase4 #forgeActivityChart{border:1px solid #3a594c;border-radius:14px;background:#18292e;padding:13px 9px;min-height:120px}',
  '#progress.forge-slim-phase4 #forgeProgressStats>details[data-forge-slim-feature="activity"] .forge-stats-footnote{font-size:11px;color:#a9bcb5;margin:9px 0 0}',
  '#progress.forge-slim-phase4 #forgeProgressStats>details.forge-stats-fold:not([data-forge-slim-feature]){order:5;margin:0!important;border:0!important;border-top:1px solid #375043!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;overflow:visible}',
  '#progress.forge-slim-phase4 #forgeProgressStats>details.forge-stats-fold:not([data-forge-slim-feature])>summary{min-height:53px!important;padding:13px 3px!important;font-size:14px!important;color:#e2f0e6!important;font-weight:700!important;background:transparent!important}',
  '#progress.forge-slim-phase4 #forgeProgressStats>details.forge-stats-fold:not([data-forge-slim-feature])>.disclosure-body{padding:4px 0 17px!important;border:0!important;background:transparent!important}',
  '#progress.forge-slim-phase4 #forgeProgressStats>details.forge-stats-fold:not([data-forge-slim-feature]) .card{border:0!important;background:transparent!important;padding:0!important;margin:0!important;box-shadow:none!important}',
  '#progress.forge-slim-phase4 #forgeProgressStats .forge-stats-wellness{order:5;margin:0!important;border:0!important;border-top:1px solid #375043!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}',
  '#progress.forge-slim-phase4 #forgeProgressStats .forge-stats-wellness>summary{min-height:53px!important;padding:13px 3px!important;font-size:14px!important}',
  '#progress.forge-slim-phase4 #forgeProgressStats .forge-stats-wellness>.disclosure-body{padding:5px 0 16px!important}',
  '#progress.forge-slim-phase4 #forgeProgressChallenges>details.forge-stats-fold{border:0!important;border-bottom:1px solid #375043!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;margin:0!important}',
  '#progress.forge-slim-phase4 #forgeProgressChallenges>details.forge-stats-fold>summary{min-height:53px;padding:13px 3px;font-size:14px}',
  '#progress.forge-slim-phase4 #forgeProgressChallenges>details.forge-stats-fold>.disclosure-body{padding:5px 0 16px!important}',
  '#progress.forge-slim-phase4 #forgeProgressChallenges .card{box-shadow:none!important;border:0!important;background:transparent!important;padding:0!important;margin:0!important}',
  '#progress.forge-slim-phase4 #forgeProgressChallenges>details[data-forge-slim-challenges="primary"]{border:0!important;margin:0!important;padding:0!important}',
  '#progress.forge-slim-phase4 #forgeProgressChallenges>details[data-forge-slim-challenges="primary"]>summary{display:none!important}',
  '#progress.forge-slim-phase4 #forgeProgressChallenges>details[data-forge-slim-challenges="primary"]>.disclosure-body{padding:0!important}',
  '#progress.forge-slim-phase4 #forgeChallengeCards{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px!important;margin:4px 0 17px!important}',
  '#progress.forge-slim-phase4 #forgeChallengeCards>.forge-challenge{min-width:0;margin:0!important;padding:13px 11px!important;border:1px solid #395448!important;border-radius:14px!important;background:#182d30!important;box-shadow:none!important}',
  '#progress.forge-slim-phase4 #forgeChallengeCards>.forge-challenge:first-child{grid-column:1/-1;background:linear-gradient(120deg,#203e33,#192f2c)!important;border-color:#5a8456!important;padding:16px!important}',
  '#progress.forge-slim-phase4 #forgeChallengeCards>.forge-challenge:first-child .head b{font-size:17px!important;color:#f0f8e9!important}',
  '#progress.forge-slim-phase4 #forgeChallengeCards>.forge-challenge:first-child .detail{font-size:12px!important;color:#b7cdbb!important;line-height:1.4;margin:8px 0 10px}',
  '#progress.forge-slim-phase4 #forgeChallengeCards>.forge-challenge:first-child .track{height:9px!important;border-radius:9px!important;margin:11px 0!important}',
  '#progress.forge-slim-phase4 #forgeChallengeCards>.forge-challenge:not(:first-child) .track{display:none!important}',
  '#progress.forge-slim-phase4 #forgeChallengeCards>.forge-challenge:not(:first-child) .head .pill{display:none!important}',
  '#progress.forge-slim-phase4 #forgeChallengeCards>.forge-challenge:not(:first-child) .detail{display:none!important}',
  '#progress.forge-slim-phase4 #forgeChallengeCards>.forge-challenge:not(:first-child) .head b{font-size:13px!important;line-height:1.4;color:#e7f2eb!important}',
  '#progress.forge-slim-phase4 #forgeChallengeCards>.forge-challenge:not(:first-child) .foot{margin-top:11px!important;font-size:12px;color:#b9e69d!important}',
  '#progress.forge-slim-phase4 #forgeChallengeCards>.forge-challenge:not(:first-child) .foot span:last-child{display:none!important}',
  '#progress.forge-slim-phase4 #forgeProgressChallenges [role="progressbar"]{display:none!important}',
  '#progress.forge-slim-phase4 #forgeChallengeCards>.forge-challenge:first-child .track[role="progressbar"]{display:block!important}',
  '#progress.forge-slim-phase4 #forgeProgressChallenges .forge-stats-footnote{font-size:11px!important;line-height:1.45!important;color:#8da49c!important;margin:16px 2px 8px!important}',
  '#progress.forge-slim-phase4 #forgeProgressChallenges>details.forge-stats-fold:not([data-forge-slim-challenges="primary"])>summary{font-size:13px!important;min-height:50px!important;padding:12px 3px!important}',
  '@media(max-width:365px){#progress.forge-slim-phase4 #forgeProgressSummary>.forge-stats-tile strong{font-size:21px!important}#progress.forge-slim-phase4 .forge-progress-tabs button{font-size:12px!important}}'
 ].join('\n');
 document.head.append(css);
}
function simplifyChallenges(root){
 // The first legacy disclosure is just a static motivational introduction,
 // with no saved data, inputs, progress calculations or actionable controls.
 const panels=Array.from(root.children).filter(x=>x.matches?.('details.forge-stats-fold'));
 const intro=panels.find(p=>{
  const summary=p.querySelector(':scope > summary');
  return /Deine Challenges\s*[–-]\s*Übersicht/i.test(summary?.textContent||'');
 });
 if(intro&&!intro.querySelector('input,select,button,[id]'))intro.remove();
 const cards=panelFor('forgeChallengeCards',root);
 const weekly=panelFor('forgeWeeklyGoal',root);
 if(cards){
  cards.open=true;
  cards.dataset.forgeSlimChallenges='primary';
  // Only the weekly-goal card has a target progress bar. Other metrics remain
  // numeric. The existing renderForgeChallenges() still owns the values.
  root.prepend(cards);
 }
 if(weekly){
  weekly.open=false;
  const summary=weekly.querySelector(':scope > summary');
  if(summary)summary.textContent='Wochenziel anpassen';
  if(cards)cards.after(weekly);
 }
 for(const p of panels){
  if(p===cards||p===weekly||p===intro)continue;
  p.open=false;
 }
 return !!cards;
}

function install(){
 if(installed)return true;
 const page=$('progress'),stats=$('forgeProgressStats'),challenges=$('forgeProgressChallenges');
 const summary=panelFor('forgeProgressSummary',stats);
 const activity=panelFor('forgeActivityChart',stats);
 if(!page||!stats||!challenges||!summary||!activity||summary===activity)return false;
 style();page.classList.add('forge-slim-phase4');
 // Keep the existing official statistics and their live render targets.
 feature(summary,'summary');feature(activity,'activity');
 const intro=node('div');intro.id='forgeSlimProgressIntro';
 intro.append(node('h2','','Deine Trainingsbilanz'),node('p','','Deine protokollierten Einheiten, Zeit und Bestleistungen im Überblick.'));
 stats.prepend(intro);
 const activityTitle=node('h2','','Trainingsaktivität · letzte 7 Tage');
 activityTitle.id='forgeSlimProgressActivityTitle';stats.append(activityTitle);
 const more=node('h2','','Weitere Auswertungen');more.id='forgeSlimProgressMoreTitle';
 stats.append(more);
 // This originally sat above both tabs, creating a distracting first screen.
 // Move the existing control under Statistics, without replacing its inputs.
 const wellness=page.querySelector(':scope > details.forge-stats-wellness');
 if(wellness){wellness.open=false;stats.append(wellness);}
 // Prioritize one weekly-goal bar; turn the other challenges into quiet KPIs.
 simplifyChallenges(challenges);
 // Preserve the old progress/challenge switch: do not wrap or override it.
 const heading=page.querySelector(':scope > h1');
 if(heading)heading.textContent='Fortschritt';
 installed=true;return true;
}
function boot(){
 let attempts=0;
 const tryInstall=()=>{
  if(install())return;
  if(++attempts<70)setTimeout(tryInstall,100);
 };
 tryInstall();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
