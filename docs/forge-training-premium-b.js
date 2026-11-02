/* FORGE · Variante B Modern & Premium — integrated live workout UI.
 * Existing core owns workout state, inputs, save, pause and set navigation.
 * Visual structure is built from original DOM nodes so their handlers survive.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const create=(tag,cls,txt)=>{
 const el=document.createElement(tag);if(cls)el.className=cls;
 if(txt!==undefined)el.textContent=txt;return el;
};
const CSS="\n#workout.forge-compact-live.forge-premium-layout.active{padding:0!important;background:#0d0d0d!important;overflow:hidden!important}\n#workout.forge-premium-layout #forgePremiumShell{box-sizing:border-box!important;justify-content:flex-start!important;align-content:flex-start!important;align-items:stretch!important;width:100%!important;max-width:620px!important;height:100%!important;min-height:0!important;margin:0 auto!important;padding:10px 14px 18px!important;display:flex!important;flex-direction:column!important;gap:10px!important;overflow-y:auto!important;overscroll-behavior:contain!important;scrollbar-width:thin;background:radial-gradient(circle at 12% 18%,rgba(158,255,0,.055),transparent 32%),linear-gradient(180deg,#0d0d0d 0%,#141414 55%,#0d0d0d 100%)!important;color:#fff!important}\n#workout.forge-premium-layout #forgePremiumShell *{box-sizing:border-box}\n#workout.forge-premium-layout .forge-b-header{display:grid!important;position:static!important;inset:auto!important;min-height:44px!important;height:44px!important;max-height:44px!important;flex:none!important;padding:0!important;margin:0!important;background:transparent!important;border:0!important;box-shadow:none!important;transform:none!important;grid-template-columns:42px minmax(0,1fr) 42px;align-items:center;gap:8px;flex:none;min-height:46px}\n#workout.forge-premium-layout .forge-b-header button{height:40px;width:40px;min-width:40px;padding:0;display:grid;place-items:center;border:1px solid rgba(255,255,255,.09);border-radius:50%;background:#202020;color:#f6f6f6;font-size:24px;line-height:1}\n#workout.forge-premium-layout .forge-b-logo{text-align:center;min-width:0;font-size:18px;line-height:1.05;font-weight:950;font-style:italic;letter-spacing:.13em;color:#9eff00;text-shadow:0 0 16px #9eff0038}\n#workout.forge-premium-layout .forge-b-page-title{font-size:13px;line-height:1.1;text-align:center;font-weight:700;color:#fff;margin:4px 0 0}\n#workout.forge-premium-layout .forge-b-status{margin:0!important;flex:none;min-width:0;position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px 10px;align-items:center;padding:12px 13px 10px;background:linear-gradient(140deg,#222,#161616);border:1px solid #ffffff1c;border-radius:19px;box-shadow:0 9px 26px #0005}\n#workout.forge-premium-layout .forge-b-status-left{display:flex;align-items:center;gap:10px;min-width:0}\n#workout.forge-premium-layout .forge-b-status-icon{flex:none;display:grid;place-items:center;width:36px;height:36px;border-radius:12px;background:#9eff0018;border:1px solid #9eff0041;color:#9eff00;font-size:20px}\n#workout.forge-premium-layout .forge-b-status-title{font-size:14px;font-weight:800;line-height:1.2;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n#workout.forge-premium-layout .forge-b-running{font-size:11px;color:#dedede;margin-top:4px}\n#workout.forge-premium-layout .forge-b-running:before{content:\"\";width:7px;height:7px;border-radius:50%;display:inline-block;background:#9eff00;box-shadow:0 0 8px #9eff0066;margin-right:7px}\n#workout.forge-premium-layout .forge-b-count{text-align:right;white-space:nowrap;color:#fff;font-weight:800;font-size:13px}\n#workout.forge-premium-layout .forge-b-count small{display:block;font-size:9px;font-weight:700;color:#8f8f8f;letter-spacing:.07em;text-transform:uppercase;margin-bottom:3px}\n#workout.forge-premium-layout .forge-b-track{grid-column:1/-1;height:4px;border-radius:20px;background:#343434;overflow:hidden}\n#workout.forge-premium-layout #forgeBProgress{width:0;height:100%;background:#9eff00;border-radius:inherit;box-shadow:0 0 9px #9eff0077;transition:width .25s}\n#workout.forge-premium-layout .forge-b-hidden-status{display:none!important}\n#workout.forge-premium-layout .forge-b-hud{position:static!important;inset:auto!important;margin:0!important;padding:0!important;flex:none;display:flex;align-items:center;justify-content:space-between;gap:9px;min-height:44px}\n#workout.forge-premium-layout .forge-b-hud .forge-clock{display:flex!important;flex-direction:row!important;align-items:center!important;gap:6px!important;margin:0!important;padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important;min-width:0}\n#workout.forge-premium-layout .forge-b-hud .forge-clock-label{font-size:9px!important;font-weight:750!important;color:#aaa!important;letter-spacing:.03em!important}\n#workout.forge-premium-layout .forge-b-hud .forge-clock-digits{font-size:clamp(18px,5vw,25px)!important;line-height:1!important;letter-spacing:.01em!important;font-weight:850!important;font-variant-numeric:tabular-nums!important;color:#9eff00!important;padding:0!important;margin:0!important}\n#workout.forge-premium-layout .forge-b-hud #forgeLiveControls{position:static!important;display:flex!important;flex:none!important;min-width:0!important;max-width:45%!important;width:auto!important;margin:0!important;padding:0!important;background:none!important;border:0!important;box-shadow:none!important}\n#workout.forge-premium-layout .forge-b-hud .forge-live-state{display:none!important}\n#workout.forge-premium-layout .forge-b-hud .forge-live-buttons{width:100%!important;display:flex!important;justify-content:flex-end!important}\n#workout.forge-premium-layout .forge-b-hud #forgeLivePause{display:flex!important;align-items:center!important;justify-content:center!important;max-width:100%!important;min-width:0!important;width:auto!important;min-height:35px!important;height:35px!important;padding:5px 9px!important;background:#272727!important;border:1px solid #ffffff27!important;border-radius:11px!important;color:#e6e6e6!important;font-size:10px!important;font-weight:750!important;white-space:normal!important;box-shadow:none!important}\n#workout.forge-premium-layout .forge-b-hud #forgeLivePause[aria-pressed=\"true\"]{border-color:#9eff00!important;color:#9eff00!important}\n#workout.forge-premium-layout #forgeLiveProgress,#workout.forge-premium-layout .forge-live-state,#workout.forge-premium-layout .forge-b-hud #workoutTimer{display:none!important}\n#workout.forge-premium-layout .forge-b-rest{display:flex;flex:none;width:100%;min-width:0;margin:0!important;padding:0!important}\n#workout.forge-premium-layout .forge-b-rest:not(:has(#forgeRestTimer.forge-live-rest-running)){display:none!important}\n#workout.forge-premium-layout .forge-b-rest #forgeRestTimer:not(.forge-live-rest-running){display:none!important}\n#workout.forge-premium-layout .forge-b-rest #forgeRestTimer.forge-live-rest-running{position:static!important;inset:auto!important;display:flex!important;flex-wrap:wrap!important;align-items:center!important;justify-content:space-between!important;gap:7px!important;min-width:0!important;width:100%!important;margin:0!important;padding:9px 10px!important;background:#20251a!important;border:1px solid #9eff003c!important;border-radius:12px!important;font-size:12px!important;color:#d8f8b2!important}\n#workout.forge-premium-layout .forge-b-rest #forgeRestTimer.forge-live-rest-running button{position:static!important;min-height:35px!important;height:auto!important;min-width:0!important;width:auto!important;margin:0!important;padding:6px 11px!important;background:#303e2f!important;border:1px solid #9eff0040!important;border-radius:9px!important;color:#eef9e5!important;font-size:11px!important}\n#workout.forge-premium-layout .forge-b-rest #forgeRestTimer.forge-live-rest-running :is(.row,.actions,.forge-rest-actions){display:flex!important;flex-wrap:wrap!important;align-items:center!important;gap:6px!important}\n\n#workout.forge-premium-layout .forge-b-media{margin:0!important;padding:0!important;position:relative;display:block;overflow:hidden;flex:none;width:100%;height:clamp(205px,29dvh,295px);border-radius:23px;border:1px solid #ffffff1e;background:#101010;box-shadow:0 15px 32px #0007}\n#workout.forge-premium-layout #forgePremiumHero{position:absolute;inset:0;display:block!important;width:100%!important;height:100%!important;border:0!important;margin:0!important;padding:0!important;background:linear-gradient(135deg,#272727,#111)!important;overflow:hidden!important}\n#workout.forge-premium-layout .forge-b-main-photo{position:absolute;inset:0;display:grid;place-items:center;overflow:hidden;background:linear-gradient(135deg,#262626,#121212)}\n#workout.forge-premium-layout .forge-b-main-photo>img,#workout.forge-premium-layout .forge-b-main-photo>svg{display:block;width:100%!important;height:100%!important;object-fit:cover!important;object-position:center!important}\n#workout.forge-premium-layout .forge-b-media-shade{position:absolute;inset:0;background:linear-gradient(180deg,#0002 0%,transparent 35%,#000d 100%);pointer-events:none}\n#workout.forge-premium-layout .forge-b-counter{position:absolute;top:12px;left:12px;padding:7px 10px;border-radius:30px;color:#f4f4f4;font-size:10px;font-weight:750;letter-spacing:.035em;background:#111c;border:1px solid #ffffff20;backdrop-filter:blur(9px)}\n#workout.forge-premium-layout .forge-b-anatomy{position:absolute;right:12px;top:12px;width:92px;height:119px;padding:6px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;overflow:hidden;border-radius:15px;border:1px solid #ffffff2a;background:#090909b3;backdrop-filter:blur(12px);box-shadow:0 8px 20px #0007}\n#workout.forge-premium-layout .forge-b-anatomy-label{font-size:9px;color:#c6d6aa;font-weight:800;white-space:nowrap}\n#workout.forge-premium-layout .forge-b-anatomy img,#workout.forge-premium-layout .forge-b-anatomy svg{display:block!important;height:88px!important;width:100%!important;object-fit:contain!important;max-width:100%!important}\n#workout.forge-premium-layout .forge-b-anatomy img{filter:hue-rotate(85deg) saturate(1.35)}\n#workout.forge-premium-layout .forge-b-fallback{padding:35px;color:#9eff00;text-align:center;font-size:12px}\n#workout.forge-premium-layout .forge-b-media-bottom{position:absolute;left:13px;right:13px;bottom:13px;display:flex;align-items:flex-end;justify-content:space-between;gap:6px;pointer-events:none}\n#workout.forge-premium-layout #forgeBExerciseName{min-width:0;max-width:70%;font-size:clamp(22px,6vw,29px);font-weight:900;letter-spacing:-.035em;line-height:1.08;color:#fff;text-shadow:0 3px 14px #000}\n#workout.forge-premium-layout .forge-b-media-arrows{display:flex;gap:8px;pointer-events:auto}\n#workout.forge-premium-layout .forge-b-media-arrows button{display:grid;place-items:center;width:38px;height:38px;min-width:38px;padding:0;background:#121212c9;border-radius:50%;border:1px solid #ffffff41;color:white;font-size:22px}\n#workout.forge-premium-layout .forge-b-set-panel{margin:0!important;flex:none;display:block;min-width:0;border-radius:21px;border:1px solid #ffffff1c;padding:13px;background:linear-gradient(150deg,#202020,#151515);box-shadow:0 10px 22px #0005}\n#workout.forge-premium-layout .forge-b-set-heading{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;color:white;font-size:14px;font-weight:800}\n#workout.forge-premium-layout .forge-b-dots{display:flex;align-items:center;gap:7px}\n#workout.forge-premium-layout .forge-b-dots span{width:8px;height:8px;border-radius:50%;background:#535353}\n#workout.forge-premium-layout .forge-b-dots span.current{background:#9eff00;box-shadow:0 0 11px #9eff0077}\n#workout.forge-premium-layout #forgeQuickWorkout{display:block!important;position:static!important;inset:auto!important;transform:none!important;overflow:visible!important;width:100%!important;min-width:0!important;max-height:none!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}\n#workout.forge-premium-layout #forgeQuickWorkout>.forge130-focus-card{display:flex!important;flex-direction:column!important;gap:8px!important;position:static!important;overflow:visible!important;width:100%!important;min-height:0!important;max-height:none!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}\n#workout.forge-premium-layout .forge130-focus-card-eyebrow,#workout.forge-premium-layout .forge130-focus-card-title,#workout.forge-premium-layout .forge130-focus-card-hint{display:none!important}\n#workout.forge-premium-layout #forgeQuickWorkout .forge130-focus-card-grid{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:10px!important;margin:0!important;padding:0!important}\n#workout.forge-premium-layout #forgeQuickWorkout .forge130-focus-card-grid label{display:grid!important;gap:6px!important;min-width:0!important;margin:0!important;padding:11px 12px 9px!important;border-radius:15px!important;border:1px solid #ffffff20!important;background:#111!important;color:#bdbdbd!important;font-size:11px!important;font-weight:720!important}\n#workout.forge-premium-layout #forgeQuickWorkout .forge130-focus-card-grid input{box-sizing:border-box!important;display:block!important;width:100%!important;min-width:0!important;max-width:100%!important;height:38px!important;min-height:38px!important;margin:0!important;padding:0!important;border:0!important;outline:0!important;background:transparent!important;box-shadow:none!important;color:white!important;font-weight:850!important;font-size:26px!important;line-height:1.1!important}\n#workout.forge-premium-layout #forgeQuickWorkout .forge130-focus-card-grid input:focus{outline:2px solid #9eff00!important;outline-offset:3px!important;border-radius:3px}\n#workout.forge-premium-layout #forgeQuickWorkout .forge-v3-progression{display:flex!important;flex-wrap:wrap!important;align-items:center!important;gap:6px 10px!important;justify-content:space-between!important;margin:0!important;padding:9px 0 2px!important;background:none!important;border:0!important;border-top:1px solid #ffffff15!important;border-radius:0!important}\n#workout.forge-premium-layout #forgeQuickWorkout .forge-v3-progression .forge-v3-last{font-size:11px!important;color:#a9a9a9!important;line-height:1.3!important}\n#workout.forge-premium-layout #forgeQuickWorkout .forge-v3-hint{display:contents!important}\n#workout.forge-premium-layout #forgeQuickWorkout .forge-v3-hint>span{display:none!important}\n#workout.forge-premium-layout #forgeQuickWorkout .forge-v3-use-weight{min-height:29px!important;height:29px!important;padding:4px 10px!important;margin:0!important;color:#9eff00!important;background:#9eff0018!important;border:1px solid #9eff0050!important;border-radius:20px!important;font-size:11px!important}\n#workout.forge-premium-layout #forgeQuickWorkout .forge-v3-progression>.forge-v3-last:last-child{display:none!important}\n#workout.forge-premium-layout #forgeQuickWorkout .forge-primary-action{position:static!important;inset:auto!important;z-index:auto!important;display:flex!important;align-items:center!important;justify-content:center!important;transform:none!important;width:100%!important;min-height:52px!important;height:52px!important;margin:7px 0 0!important;padding:10px!important;border:0!important;border-radius:15px!important;background:#9eff00!important;color:#101010!important;font-size:15px!important;font-weight:900!important;box-shadow:0 10px 22px #9eff0025!important}\n#workout.forge-premium-layout #forgeQuickWorkout .forge130-actions{position:static!important;inset:auto!important;z-index:auto!important;transform:none!important;display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:8px!important;width:100%!important;margin:0!important;padding:0!important}\n#workout.forge-premium-layout #forgeQuickWorkout .forge130-actions button{display:flex!important;align-items:center!important;justify-content:center!important;min-width:0!important;width:100%!important;min-height:39px!important;height:39px!important;margin:0!important;padding:6px!important;background:#2a2a2a!important;border:1px solid #ffffff21!important;border-radius:12px!important;color:#ededed!important;font-size:11px!important;font-weight:700!important}\n#workout.forge-premium-layout #forgeQuickWorkout .forge130-suggestion,#workout.forge-premium-layout #forgeQuickWorkout .forge130-substitute,#workout.forge-premium-layout #forgeQuickWorkout .forge140-exercise-warmup,#workout.forge-premium-layout #forgeQuickWorkout .forge-slim-focus-tools:not([open]){display:none!important}\n#workout.forge-premium-layout .forge-b-footer{margin:0!important;flex:none;display:flex;flex-direction:column;gap:8px;padding:0 0 6px}\n#workout.forge-premium-layout #forgeCompactDock{position:static!important;inset:auto!important;z-index:auto!important;transform:none!important;display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:8px!important;width:100%!important;margin:0!important;padding:0!important}\n#workout.forge-premium-layout #forgeCompactDock>button{display:flex!important;align-items:center!important;justify-content:center!important;width:100%!important;min-width:0!important;min-height:42px!important;height:42px!important;margin:0!important;padding:6px 3px!important;background:#222!important;border:1px solid #ffffff21!important;border-radius:12px!important;color:#ddd!important;font-size:11px!important;font-weight:750!important}\n#workout.forge-premium-layout #saveWorkout{position:static!important;inset:auto!important;z-index:auto!important;transform:none!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:9px!important;width:100%!important;min-height:38px!important;height:38px!important;margin:0!important;padding:5px!important;background:transparent!important;border:0!important;border-radius:12px!important;color:#999!important;font-size:11px!important;font-weight:650!important;box-shadow:none!important}\n#workout.forge-premium-layout #saveWorkout:before{content:\"\";width:13px;height:13px;flex:none;border:1.5px solid #777;border-radius:3px}\n#workout.forge-premium-layout #forgeSaveSessionHint{display:none!important}\nbody.forge-b-active #nav.forge-simple-nav{background:#0e0e0e!important;border-top:1px solid #ffffff14!important;box-shadow:0 -8px 22px #0006!important}\nbody.forge-b-active #nav.forge-simple-nav button.active{background:#9eff000e!important;color:#9eff00!important;position:relative}\nbody.forge-b-active #nav.forge-simple-nav button.active:before{position:absolute;content:\"\";height:3px;width:45%;border-radius:9px;top:0;background:#9eff00;box-shadow:0 0 9px #9eff0070}\n#workout.forge-premium-layout #forgePremiumShell button:focus-visible{outline:2px solid #9eff00!important;outline-offset:2px}\nbody.forge-compact-typing #workout.forge-premium-layout #forgePremiumShell{overflow-y:auto!important}\nbody.forge-compact-typing #workout.forge-premium-layout #forgePremiumHero{display:block!important}\n@media(max-height:760px){#workout.forge-premium-layout #forgePremiumShell{gap:7px!important;padding-top:7px!important}#workout.forge-premium-layout .forge-b-media{height:clamp(174px,24dvh,225px)}#workout.forge-premium-layout .forge-b-set-panel{padding:10px!important}#workout.forge-premium-layout #forgeQuickWorkout .forge130-focus-card-grid label{padding:7px 10px!important}#workout.forge-premium-layout #forgeQuickWorkout .forge130-focus-card-grid input{height:29px!important;min-height:29px!important;font-size:23px!important}}\n@media(max-width:360px){#workout.forge-premium-layout .forge-b-anatomy{width:76px;height:105px}#workout.forge-premium-layout .forge-b-anatomy img,#workout.forge-premium-layout .forge-b-anatomy svg{height:75px!important}#workout.forge-premium-layout #forgeBExerciseName{font-size:21px}#workout.forge-premium-layout .forge-b-media-arrows button{width:34px;min-width:34px;height:34px}}\n@media(prefers-reduced-motion:reduce){#workout.forge-premium-layout *{transition:none!important;scroll-behavior:auto!important}}\n";

let installed=false,shell=null,rendered=0,lastHero='',lastCard=null,lastFocus='';
const origins=new Map(),artCache=new Map();
const icon=markup=>{const span=create('span');span.innerHTML=markup;span.setAttribute('aria-hidden','true');return span};
function liveMode(page,appState){
 return !!(page?.classList.contains('forge-compact-live')&&appState?.activeWorkout);
}
function move(node,parent){
 if(!node||!parent)return;
 if(!origins.has(node)){
  const mark=document.createComment('FORGE original location');
  node.before(mark);origins.set(node,mark);
 }
 if(node.parentElement!==parent)parent.append(node);
}
// Local offline visual fallback for the lunge if a user's older catalogue
// doesn't contain the previously shown photography. Never substitute a
// different exercise's movement image.
const lungeSvg=String.raw`<svg viewBox="0 0 310 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Schematische Ausführung eines Ausfallschritts">
<defs><linearGradient id="forgeLungeBg" x2="0" y2="1"><stop stop-color="#343a38"/><stop offset="1" stop-color="#101719"/></linearGradient></defs>
<rect width="310" height="240" fill="url(#forgeLungeBg)"/>
<g opacity=".27" stroke="#7c8880" stroke-width="6"><path d="M29 14v193m53-193v193m158-193v193m44-193v193"/><path d="M23 38h262M20 206h269"/></g>
<path d="M0 226h310" stroke="#7f8980" stroke-width="3"/>
<ellipse cx="155" cy="229" rx="114" ry="8" fill="#070c10" opacity=".75"/>
<g stroke-linecap="round" stroke-linejoin="round">
<path d="M155 125L188 165L229 167" fill="none" stroke="#202c32" stroke-width="30"/>
<path d="M229 167L234 219" fill="none" stroke="#d09f7d" stroke-width="19"/>
<path d="M151 126L105 170L68 212" fill="none" stroke="#242e34" stroke-width="28"/>
<path d="M68 212L39 222" fill="none" stroke="#c68e70" stroke-width="17"/>
<path d="M219 220h34m-220 3h37" stroke="#f4f6ec" stroke-width="11"/>
<path d="M151 126L146 75" stroke="#232d32" stroke-width="48"/>
<path d="M144 76L145 65" stroke="#d1a587" stroke-width="14"/>
<circle cx="145" cy="49" r="18" fill="#cf9b78"/>
<path d="M128 47q-1-23 18-22 22 2 17 23-7-12-17-11-10-1-18 10Z" fill="#222427"/>
<path d="M126 88L112 133M168 89l17 45" fill="none" stroke="#cb987a" stroke-width="16"/>
<path d="M112 131l-3 22m77-20 1 21" stroke="#2c3031" stroke-width="8"/>
<path d="M105 148h11m65 1h12" stroke="#c6c9c6" stroke-width="5"/>
<rect x="99" y="141" width="8" height="18" rx="2" fill="#14191e"/>
<rect x="113" y="141" width="8" height="18" rx="2" fill="#14191e"/>
<rect x="175" y="141" width="8" height="18" rx="2" fill="#14191e"/>
<rect x="191" y="141" width="8" height="18" rx="2" fill="#14191e"/>
</g></svg>`;
const lungeMuscles=String.raw`<svg viewBox="0 0 120 155" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ausfallschritte: besonders beansprucht sind Quadrizeps und Gesäßmuskulatur">
<g fill="#858c8c" stroke="#303a3a" stroke-width="1">
<circle cx="60" cy="18" r="13"/><path d="M43 35q17-9 34 0l-3 54H46Z"/>
<path d="M45 39 31 81l11 7 13-34M75 39l14 42-11 7-13-34"/>
<path d="M47 87 73 87 79 101 41 101Z"/>
<path d="M43 101 39 137l14 2 7-37M77 101l5 36-14 2-8-37"/>
<path d="M40 137 38 151h16l-1-12M68 139l-1 12h16l-2-14"/>
</g><g fill="#9EFF00" stroke="#80cd00" stroke-width="1">
<path d="M42 99q7-10 18-5l-3 16-15 1Z"/>
<path d="M78 99q-7-10-18-5l3 16 15 1Z"/>
<path d="M42 111 57 111l-5 26-14-2Z"/>
<path d="M63 111 78 111l4 24-14 2Z"/>
</g></svg>`;
function imageData(name){
 if(artCache.has(name))return artCache.get(name);
 const art={main:null,muscle:null};
 try{
  // The technique-atlas covers only a subset of exercises; the original
  // catalogue contains additional photos (including Ausfallschritte).
  const primary=typeof window.forgeExerciseIllustrations==='function'
   ?window.forgeExerciseIllustrations(name):'';
  const source=primary||(typeof window.forgePublicExercisePictures==='function'
   ?window.forgePublicExercisePictures(name):'');
  if(source){
   const holder=create('div');holder.innerHTML=source;
   const nodes=Array.from(holder.querySelectorAll('img,svg'));
   if(nodes.length){art.main=(nodes[1]||nodes[0]).cloneNode(true);
    if(nodes.length>=3)art.muscle=nodes[2].cloneNode(true);}
  }
 }catch(err){console.warn('FORGE premium image unavailable',name,err);}
 artCache.set(name,art);return art;
}
function picture(node,text){
 if(!node)return null;
 const copy=node.cloneNode(true),isImg=copy.tagName?.toLowerCase()==='img';
 if(isImg){copy.loading='eager';copy.decoding='async';copy.alt=text;}
 else{copy.setAttribute('role','img');copy.setAttribute('aria-label',text);copy.removeAttribute('tabindex');}
 return copy;
}
function showHero(card,name,session){
 const hero=$('forgePremiumHero');
 if(!hero)return false;
 const identity=session+'|'+name;
 if(identity===lastHero&&card===lastCard)return false;
 const art=imageData(name),visual=create('div','forge-b-main-photo');
 if(art.main)visual.append(picture(art.main,name+' – Ausführung'));
 else if(name==='Ausfallschritte')visual.innerHTML=lungeSvg;
 else visual.append(create('span','forge-b-fallback','Bild zur Übung noch nicht vorhanden'));
 const shade=create('div','forge-b-media-shade');
 hero.replaceChildren(visual,shade);
 const anatomy=$('forgeBAnatomy');
 if(anatomy){
  anatomy.replaceChildren();
  anatomy.append(create('span','forge-b-anatomy-label','Hauptmuskeln'));
  if(art.muscle)anatomy.append(picture(art.muscle,name+' – beanspruchte Muskelgruppen'));
  else if(name==='Ausfallschritte'){
   const drawing=create('div');drawing.innerHTML=lungeMuscles;
   anatomy.append(drawing.firstElementChild||drawing);
  }
 }
 const title=$('forgeBExerciseName');if(title)title.textContent=name;
 lastHero=identity;lastCard=card;rendered++;
 return true;
}
function setProgress(plan,focus,draft){
 const entries=Array.isArray(plan?.ex)?plan.ex:[];
 let total=0,done=0;
 for(let i=0;i<entries.length;i++){
  const count=Math.max(0,Math.trunc(Number(entries[i].sets)||0));
  total+=count;
  const sets=draft?.planId===plan.id?draft.exercises?.[i]?.sets:[];
  for(let j=0;j<count;j++)if(sets?.[j]?.done)done++;
 }
 return {total,done,exercise:Math.max(0,focus?.i||0)+1,totalExercises:entries.length,set:Math.max(0,focus?.j||0)+1,setCount:Math.max(0,Number(entries[focus?.i]?.sets)||0)};
}
function navigateExercise(direction){
 // The existing navigation owns focus and input synchronization.
 // A repeated press on the original set control moves through a multi-set
 // exercise without marking any set as done. Never directly mutate state.
 if(typeof state==='undefined'||!state?.activeWorkout)return;
 const plan=state.plan?.find(p=>String(p.id)===String(state.activeWorkout.planId));
 if(!plan)return;
 const current=window.forge130CurrentFocus?.(plan),start=current?.i;
 const navigate=typeof window.forge130FocusNavigate==='function'
  ?window.forge130FocusNavigate:null;
 if(!navigate){
  // Compatibility fallback: the original set navigation remains interactive.
  $('forgeQuickWorkout')?.querySelector('.forge130-actions')
   ?.querySelectorAll('button')?.[direction<0?0:1]?.click();
  return;
 }
 if(!Number.isInteger(start)){navigate(direction);return;}
 // Reuse the core's validated navigation and persistence. Each step changes
 // focus without confirming/completing any set; stop at the next exercise.
 const limit=(plan.ex||[]).reduce((n,x)=>n+Math.max(1,Number(x.sets)||1),0);
 for(let attempt=0;attempt<limit;attempt++){
  navigate(direction);
  const next=window.forge130CurrentFocus?.(plan);
  if(!next||next.i!==start)break;
 }
}
function mountLayout(){
 if(shell)return true;
 const page=$('workout'),status=$('forgeTrainingV3Status');
 const clock=$('workoutDigitalClock')?.closest('.forge-clock'),controls=$('forgeLiveControls');
 const quick=$('forgeQuickWorkout'),rest=$('forgeRestTimer'),dock=$('forgeCompactDock'),save=$('saveWorkout');
 if(!page||!status||!clock||!controls||!quick||!rest||!dock||!save)return false;
 shell=create('div','forge-b-shell');shell.id='forgePremiumShell';
 const header=create('header','forge-b-header');
 const back=create('button','','‹');back.type='button';back.setAttribute('aria-label','Zum Plan zurück');
 back.addEventListener('click',()=>{if(typeof window.go==='function')window.go('plan');});
 const middle=create('div');middle.append(create('div','forge-b-logo','FORGE'),create('h2','forge-b-page-title','Training'));
 const menu=create('button','','⋯');menu.type='button';menu.setAttribute('aria-label','Trainingsoptionen öffnen');
 menu.addEventListener('click',()=>$('forgeCompactMore')?.click());
 header.append(back,middle,menu);
 const statusCard=create('section','forge-b-status');statusCard.setAttribute('aria-label','Aktueller Trainingsfortschritt');
 const left=create('div','forge-b-status-left'),symbol=create('div','forge-b-status-icon');
 symbol.append(icon('<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9eff00" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/></svg>'));
 symbol.setAttribute('aria-hidden','true');
 const descriptor=create('div'),planTitle=create('div','forge-b-status-title','Ganzkörper · Einheit A');
 planTitle.id='forgeBPlanTitle';
 descriptor.append(planTitle,create('div','forge-b-running','Training läuft'));left.append(symbol,descriptor);
 const right=create('div','forge-b-count');right.id='forgeBCount';
 right.append(create('small','','Fortschritt'),create('span','','0 / 18 Sätze'));
 const track=create('div','forge-b-track'),fill=create('div');fill.id='forgeBProgress';
 track.append(fill);statusCard.append(left,right,track);
 const hidden=create('div','forge-b-hidden-status');hidden.setAttribute('aria-hidden','true');statusCard.append(hidden);
 const hud=create('div','forge-b-hud');
 const media=create('section','forge-b-media');media.setAttribute('aria-label','Aktuelle Übung');
 const photo=create('div','');photo.id='forgePremiumHero';
 const count=create('div','forge-b-counter','Übung 1 / 6');count.id='forgeBExerciseCount';
 const anatomy=create('aside','forge-b-anatomy');anatomy.id='forgeBAnatomy';
 const lower=create('div','forge-b-media-bottom'),title=create('strong');title.id='forgeBExerciseName';
 const arrows=create('div','forge-b-media-arrows');
 for(const [label,glyph,dir] of [['Vorherige Übung','‹',-1],['Nächste Übung','›',1]]){
  const btn=create('button','',glyph);btn.type='button';btn.setAttribute('aria-label',label);
  btn.addEventListener('click',()=>navigateExercise(dir));arrows.append(btn);
 }
 lower.append(title,arrows);media.append(photo,count,anatomy,lower);
 const panel=create('section','forge-b-set-panel');panel.setAttribute('aria-label','Aktuellen Satz erfassen');
 const setHeading=create('div','forge-b-set-heading');
 const setLabel=create('span','','Satz 1 / 3');setLabel.id='forgeBSetLabel';
 const dots=create('div','forge-b-dots');dots.id='forgeBSetDots';
 setHeading.append(setLabel,dots);panel.append(setHeading);
 const restSlot=create('div','forge-b-rest');restSlot.id='forgeBRestSlot';
 const footer=create('footer','forge-b-footer');
 shell.append(header,statusCard,hud,restSlot,media,panel,footer);
 page.prepend(shell);page.classList.add('forge-premium-layout');document.body.classList.add('forge-b-active');
 move(status,hidden);move(clock,hud);move(controls,hud);move(rest,restSlot);move(quick,panel);move(dock,footer);move(save,footer);
 return true;
}
function restoreLayout(){
 if(!shell)return;
 for(const [node,mark] of origins){
  if(mark.parentNode){mark.after(node);mark.remove();}
 }
 origins.clear();shell.remove();shell=null;
 $('workout')?.classList.remove('forge-premium-layout');document.body.classList.remove('forge-b-active');
 lastHero='';lastCard=null;lastFocus='';
}
function sync(){
 const page=$('workout');
 if(!installed||!page)return;
 const active=liveMode(page,typeof state==='undefined'?null:state);
 if(!active){restoreLayout();return;}
 if(!mountLayout())return;
 // Keep original inputs and callbacks; only restore a node if a legacy
 // renderer actually moved it out of the premium layout.
 const hud=shell.querySelector('.forge-b-hud'),restSlot=shell.querySelector('.forge-b-rest'),panel=shell.querySelector('.forge-b-set-panel'),
  footer=shell.querySelector('.forge-b-footer'),hidden=shell.querySelector('.forge-b-hidden-status');
 const clock=$('workoutDigitalClock')?.closest('.forge-clock');
 for(const [node,destination] of [
  [$('forgeTrainingV3Status'),hidden],[clock,hud],[$('forgeLiveControls'),hud],
  [$('forgeRestTimer'),restSlot],[$('forgeQuickWorkout'),panel],
  [$('forgeCompactDock'),footer],[$('saveWorkout'),footer]
 ])if(node&&destination&&node.parentElement!==destination)destination.append(node);
 const plan=state.plan?.find(p=>String(p.id)===String(state.activeWorkout.planId));
 if(!plan)return;
 const current=typeof window.forge130CurrentFocus==='function'?window.forge130CurrentFocus(plan):null;
 if(!current)return;
 const draft=state.workoutDraft,progress=setProgress(plan,current,draft);
 const title=$('forgeBPlanTitle'),name=plan.title||'Ganzkörper · Einheit A';
 if(title&&title.textContent!==name)title.textContent=name;
 const counter=$('forgeBCount')?.querySelector('span');
 const progressText=progress.done+' / '+progress.total+' Sätze';
 if(counter&&counter.textContent!==progressText)counter.textContent=progressText;
 const fill=$('forgeBProgress');
 if(fill)fill.style.width=(progress.total?Math.round(100*progress.done/progress.total):0)+'%';
 const exCount=$('forgeBExerciseCount'),setLabel=$('forgeBSetLabel');
 if(exCount)exCount.textContent='Übung '+progress.exercise+' / '+progress.totalExercises;
 if(setLabel)setLabel.textContent='Satz '+progress.set+' / '+progress.setCount;
 const dotRoot=$('forgeBSetDots'),focusId=progress.exercise+'|'+progress.set+'|'+progress.setCount;
 if(dotRoot&&lastFocus!==focusId){
  dotRoot.replaceChildren();
  for(let j=0;j<Math.min(progress.setCount,10);j++){
   const dot=create('span',j===progress.set-1?'current':'');
   dot.setAttribute('aria-hidden','true');dotRoot.append(dot);
  }
  lastFocus=focusId;
 }
 const nameOfExercise=draft?.exercises?.[current.i]?.name||plan.ex?.[current.i]?.name;
 const card=$('forgeQuickWorkout')?.querySelector(':scope > .forge130-focus-card');
 if(nameOfExercise&&card)showHero(card,nameOfExercise,String(state.activeWorkout.startedAt));
}
function installStyles(){
 if($('forgePremiumWorkoutStyle'))return;
 const node=create('style');node.id='forgePremiumWorkoutStyle';node.textContent=CSS;
 document.head.append(node);
}
function install(){
 if(installed)return true;
 if(!$('workout')||!$('forgeQuickWorkout')||!$('workoutDigitalClock')||!$('forgeLiveControls'))return false;
 installStyles();installed=true;sync();return true;
}
function boot(){
 let attempts=0;
 const start=()=>{if(install())return;if(++attempts<75)setTimeout(start,120);};
 start();
 setInterval(()=>{if(!installed)install();sync();},650);
}
window.ForgePremiumWorkoutB=Object.freeze({liveMode,imageData,showHero,mountLayout,restoreLayout,sync,isInstalled:()=>installed,renderCount:()=>rendered});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
