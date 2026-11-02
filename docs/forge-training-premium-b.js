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
const CSS="\n#workout.forge-compact-live.forge-premium-layout.active{inset:0 0 auto 0!important;height:var(--forge-b-visible-height,calc(100dvh - var(--forge-compact-nav-height,78px)))!important;min-height:0!important;padding:0!important;margin:0!important;background:#0d0d0d!important;overflow:hidden!important}\n#workout.forge-premium-layout #forgePremiumShell{box-sizing:border-box!important;display:grid!important;grid-template-columns:minmax(0,1fr)!important;grid-template-rows:40px 64px 38px auto minmax(116px,1fr) auto 72px!important;align-content:stretch!important;align-items:stretch!important;justify-content:stretch!important;width:100%!important;max-width:620px!important;height:100%!important;min-height:0!important;margin:0 auto!important;padding:5px 10px 5px!important;gap:5px!important;overflow:hidden!important;overscroll-behavior:contain!important;background:radial-gradient(circle at 12% 18%,rgba(158,255,0,.055),transparent 32%),linear-gradient(180deg,#0d0d0d,#141414 55%,#0d0d0d)!important;color:#fff!important}\n#workout.forge-premium-layout #forgePremiumShell *{box-sizing:border-box}\n#workout.forge-premium-layout .forge-b-header{grid-row:1!important;position:static!important;inset:auto!important;display:grid!important;grid-template-columns:42px minmax(0,1fr) 42px;align-items:center;gap:8px!important;min-height:0!important;height:100%!important;margin:0!important;padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important;transform:none!important}\n#workout.forge-premium-layout .forge-b-header button{height:40px;width:40px;min-width:40px;padding:0;display:grid;place-items:center;border:1px solid rgba(255,255,255,.09);border-radius:50%;background:#202020;color:#f6f6f6;font-size:24px;line-height:1}\n#workout.forge-premium-layout .forge-b-logo{text-align:center;min-width:0;font-size:18px;line-height:1.05;font-weight:950;font-style:italic;letter-spacing:.13em;color:#9eff00;text-shadow:0 0 16px #9eff0038}\n#workout.forge-premium-layout .forge-b-page-title{font-size:13px;line-height:1.1;text-align:center;font-weight:700;color:#fff;margin:4px 0 0}\n#workout.forge-premium-layout .forge-b-status{grid-row:2!important;min-width:0;min-height:0;height:100%;position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:1fr 3px;gap:2px 8px;align-items:center;margin:0!important;padding:5px 9px 5px;background:linear-gradient(140deg,#222,#161616);border:1px solid #ffffff1c;border-radius:17px;box-shadow:0 7px 20px #0004}\n#workout.forge-premium-layout .forge-b-status-left{display:flex;align-items:center;gap:10px;min-width:0}\n#workout.forge-premium-layout .forge-b-status-icon{flex:none;display:grid;place-items:center;width:36px;height:36px;border-radius:12px;background:#9eff0018;border:1px solid #9eff0041;color:#9eff00;font-size:20px}\n#workout.forge-premium-layout .forge-b-status-title{font-size:14px;font-weight:800;line-height:1.2;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n#workout.forge-premium-layout .forge-b-running{font-size:11px;color:#dedede;margin-top:4px}\n#workout.forge-premium-layout .forge-b-running:before{content:\"\";width:7px;height:7px;border-radius:50%;display:inline-block;background:#9eff00;box-shadow:0 0 8px #9eff0066;margin-right:7px}\n#workout.forge-premium-layout .forge-b-count{text-align:right;white-space:nowrap;color:#fff;font-weight:800;font-size:13px}\n#workout.forge-premium-layout .forge-b-count small{display:block;font-size:9px;font-weight:700;color:#8f8f8f;letter-spacing:.07em;text-transform:uppercase;margin-bottom:3px}\n#workout.forge-premium-layout .forge-b-track{grid-column:1/-1;height:4px;border-radius:20px;background:#343434;overflow:hidden}\n#workout.forge-premium-layout #forgeBProgress{width:0;height:100%;background:#9eff00;border-radius:inherit;box-shadow:0 0 9px #9eff0077;transition:width .25s}\n#workout.forge-premium-layout .forge-b-hidden-status{display:none!important}\n#workout.forge-premium-layout .forge-b-hud{grid-row:3!important;position:static!important;inset:auto!important;display:grid!important;grid-template-columns:minmax(0,1fr) auto;align-items:center;justify-content:space-between;gap:8px;height:100%;min-height:0;margin:0!important;padding:0!important}\n#workout.forge-premium-layout .forge-b-hud .forge-clock{display:flex!important;flex-direction:row!important;align-items:center!important;gap:6px!important;margin:0!important;padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important;min-width:0}\n#workout.forge-premium-layout .forge-b-hud .forge-clock-label{font-size:9px!important;font-weight:750!important;color:#aaa!important;letter-spacing:.03em!important}\n#workout.forge-premium-layout .forge-b-hud .forge-clock-digits{font-size:clamp(18px,5vw,25px)!important;line-height:1!important;letter-spacing:.01em!important;font-weight:850!important;font-variant-numeric:tabular-nums!important;color:#9eff00!important;padding:0!important;margin:0!important}\n#workout.forge-premium-layout .forge-b-hud #forgeLiveControls{position:static!important;display:flex!important;flex:none!important;min-width:0!important;max-width:45%!important;width:auto!important;margin:0!important;padding:0!important;background:none!important;border:0!important;box-shadow:none!important}\n#workout.forge-premium-layout .forge-b-hud .forge-live-state{display:none!important}\n#workout.forge-premium-layout .forge-b-hud .forge-live-buttons{width:100%!important;display:flex!important;justify-content:flex-end!important}\n#workout.forge-premium-layout .forge-b-hud #forgeLivePause{display:flex!important;align-items:center!important;justify-content:center!important;max-width:100%!important;min-width:0!important;width:auto!important;min-height:35px!important;height:35px!important;padding:5px 9px!important;background:#272727!important;border:1px solid #ffffff27!important;border-radius:11px!important;color:#e6e6e6!important;font-size:10px!important;font-weight:750!important;white-space:normal!important;box-shadow:none!important}\n#workout.forge-premium-layout .forge-b-hud #forgeLivePause[aria-pressed=\"true\"]{border-color:#9eff00!important;color:#9eff00!important}\n#workout.forge-premium-layout #forgeLiveProgress,#workout.forge-premium-layout .forge-live-state,#workout.forge-premium-layout .forge-b-hud #workoutTimer{display:none!important}\n#workout.forge-premium-layout .forge-b-rest{grid-row:4!important;display:flex;min-width:0;min-height:0;width:100%;margin:0!important;padding:0!important}\n#workout.forge-premium-layout .forge-b-rest:not(:has(#forgeRestTimer.forge-live-rest-running)){display:none!important}\n#workout.forge-premium-layout .forge-b-rest #forgeRestTimer:not(.forge-live-rest-running){display:none!important}\n#workout.forge-premium-layout .forge-b-rest #forgeRestTimer.forge-live-rest-running{position:static!important;inset:auto!important;display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:center!important;gap:7px!important;min-width:0!important;width:100%!important;margin:0!important;padding:9px 10px!important;background:#20251a!important;border:1px solid #9eff003c!important;border-radius:12px!important;font-size:12px!important;color:#d8f8b2!important}\n#workout.forge-premium-layout .forge-b-rest #forgeRestTimer.forge-live-rest-running button{position:static!important;min-height:35px!important;height:auto!important;min-width:0!important;width:auto!important;margin:0!important;padding:6px 11px!important;background:#303e2f!important;border:1px solid #9eff0040!important;border-radius:9px!important;color:#eef9e5!important;font-size:11px!important}\n#workout.forge-premium-layout .forge-b-rest #forgeRestTimer.forge-live-rest-running :is(.row,.actions,.forge-rest-actions){display:flex!important;flex-wrap:wrap!important;align-items:center!important;gap:6px!important}\n#workout.forge-premium-layout .forge-b-rest .forge-rest-control{display:none!important}\n#workout.forge-premium-layout .forge-b-rest .forge-rest-top{display:flex!important;flex-wrap:wrap!important;align-items:center!important;gap:4px 10px!important;min-width:0!important;width:auto!important;margin:0!important;padding:0!important;border:0!important}\n#workout.forge-premium-layout .forge-b-rest .forge-rest-top strong{color:#dfffab!important;font-size:11px!important}\n#workout.forge-premium-layout .forge-b-rest .forge-rest-top .forge130-focus-card-hint{display:none!important}\n#workout.forge-premium-layout .forge-b-rest .forge-rest-digits{font-size:15px!important;font-variant-numeric:tabular-nums!important;font-weight:800!important;color:#9eff00!important}\n#workout.forge-premium-layout .forge-b-rest .forge-rest-actions{display:flex!important;flex-wrap:wrap!important;justify-content:flex-end!important;align-items:center!important;gap:5px!important;width:auto!important;margin:0!important;padding:0!important}\n@media(max-width:390px){#workout.forge-premium-layout .forge-b-rest #forgeRestTimer.forge-live-rest-running{grid-template-columns:minmax(0,1fr)!important}#workout.forge-premium-layout .forge-b-rest .forge-rest-actions{justify-content:flex-start!important}}\n\n\n#workout.forge-premium-layout .forge-b-media{grid-row:5!important;position:relative;display:block;overflow:hidden;min-width:0;min-height:0;width:100%;height:100%!important;margin:0!important;padding:0!important;border-radius:20px;border:1px solid #ffffff1e;background:#101010;box-shadow:0 10px 25px #0007}\n#workout.forge-premium-layout #forgePremiumHero{position:absolute;inset:0;display:block!important;width:100%!important;height:100%!important;border:0!important;margin:0!important;padding:0!important;background:linear-gradient(135deg,#272727,#111)!important;overflow:hidden!important}\n#workout.forge-premium-layout .forge-b-main-photo{position:absolute;inset:0;display:grid;place-items:center;overflow:hidden;background:linear-gradient(135deg,#262626,#121212)}\n#workout.forge-premium-layout .forge-b-main-photo>img,#workout.forge-premium-layout .forge-b-main-photo>svg{display:block;width:100%!important;height:100%!important;object-fit:cover!important;object-position:center!important}\n#workout.forge-premium-layout .forge-b-media-shade{position:absolute;inset:0;background:linear-gradient(180deg,#0002 0%,transparent 35%,#000d 100%);pointer-events:none}\n#workout.forge-premium-layout .forge-b-counter{position:absolute;top:9px;left:9px;padding:6px 9px;border-radius:30px;color:#f4f4f4;font-size:10px;font-weight:750;letter-spacing:.02em;background:#111c;border:1px solid #ffffff20;backdrop-filter:blur(9px)}\n#workout.forge-premium-layout .forge-b-anatomy{position:absolute;right:9px;top:9px;width:75px;height:99px;padding:5px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;overflow:hidden;border-radius:13px;border:1px solid #ffffff29;background:#090909b5;backdrop-filter:blur(10px);box-shadow:0 6px 16px #0006}\n#workout.forge-premium-layout .forge-b-anatomy-label{font-size:9px;color:#c6d6aa;font-weight:800;white-space:nowrap}\n#workout.forge-premium-layout .forge-b-anatomy img,#workout.forge-premium-layout .forge-b-anatomy svg{display:block!important;height:72px!important;width:100%!important;object-fit:contain!important;max-width:100%!important}\n#workout.forge-premium-layout .forge-b-anatomy img{filter:hue-rotate(85deg) saturate(1.35)}\n#workout.forge-premium-layout .forge-b-fallback{padding:35px;color:#9eff00;text-align:center;font-size:12px}\n#workout.forge-premium-layout .forge-b-media-bottom{position:absolute;left:10px;right:10px;bottom:10px;display:flex;align-items:flex-end;justify-content:space-between;gap:6px;pointer-events:none}\n#workout.forge-premium-layout #forgeBExerciseName{min-width:0;max-width:68%;font-size:clamp(19px,5.5vw,25px);font-weight:850;letter-spacing:-.035em;line-height:1.05;color:#fff;text-shadow:0 3px 14px #000}\n#workout.forge-premium-layout .forge-b-media-arrows{display:flex;gap:8px;pointer-events:auto}\n#workout.forge-premium-layout .forge-b-media-arrows button{display:grid;place-items:center;width:35px;height:35px;min-width:35px;padding:0;background:#121212ca;border-radius:50%;border:1px solid #ffffff41;color:white;font-size:22px}\n#workout.forge-premium-layout .forge-b-set-panel{grid-row:6!important;display:block;min-width:0;min-height:0;margin:0!important;padding:9px 10px;border-radius:18px;border:1px solid #ffffff1c;background:linear-gradient(150deg,#202020,#151515);box-shadow:0 8px 18px #0005}\n#workout.forge-premium-layout .forge-b-set-heading{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:0 0 5px;color:white;font-size:13px;font-weight:800;line-height:1.1}\n#workout.forge-premium-layout .forge-b-dots{display:flex;align-items:center;gap:7px}\n#workout.forge-premium-layout .forge-b-dots span{width:8px;height:8px;border-radius:50%;background:#535353}\n#workout.forge-premium-layout .forge-b-dots span.current{background:#9eff00;box-shadow:0 0 11px #9eff0077}\n#workout.forge-premium-layout #forgeQuickWorkout{display:block!important;position:static!important;inset:auto!important;transform:none!important;overflow:visible!important;width:100%!important;min-width:0!important;max-height:none!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}\n#workout.forge-premium-layout #forgeQuickWorkout>.forge130-focus-card{display:flex!important;flex-direction:column!important;gap:4px!important;position:static!important;overflow:visible!important;width:100%!important;min-height:0!important;max-height:none!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important}\n#workout.forge-premium-layout .forge130-focus-card-eyebrow,#workout.forge-premium-layout .forge130-focus-card-title,#workout.forge-premium-layout .forge130-focus-card-hint{display:none!important}\n#workout.forge-premium-layout #forgeQuickWorkout .forge130-focus-card-grid{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:8px!important;margin:0!important;padding:0!important}\n#workout.forge-premium-layout #forgeQuickWorkout .forge130-focus-card-grid label{display:grid!important;gap:3px!important;min-width:0!important;margin:0!important;padding:5px 7px!important;border-radius:11px!important;border:1px solid #ffffff17!important;background:#1b1b1b!important;color:#bdbdbd!important;font-size:10px!important;font-weight:720!important}\n#workout.forge-premium-layout #forgeQuickWorkout .forge130-focus-card-grid input{box-sizing:border-box!important;display:block!important;width:100%!important;min-width:0!important;max-width:100%!important;height:27px!important;min-height:27px!important;margin:0!important;padding:0!important;border:0!important;outline:0!important;background:transparent!important;box-shadow:none!important;color:white!important;font-weight:850!important;font-size:22px!important;line-height:1.1!important}\n#workout.forge-premium-layout #forgeQuickWorkout .forge130-focus-card-grid input:focus{outline:2px solid #9eff00!important;outline-offset:3px!important;border-radius:3px}\n#workout.forge-premium-layout #forgeQuickWorkout .forge-v3-progression{display:flex!important;flex-wrap:wrap!important;align-items:center!important;gap:5px!important;justify-content:space-between!important;margin:0!important;padding:2px 0 0!important;min-height:24px!important;background:none!important;border:0!important;border-top:1px solid #ffffff15!important;border-radius:0!important}\n#workout.forge-premium-layout #forgeQuickWorkout .forge-v3-progression .forge-v3-last{font-size:11px!important;color:#a9a9a9!important;line-height:1.3!important}\n#workout.forge-premium-layout #forgeQuickWorkout .forge-v3-hint{display:contents!important}\n#workout.forge-premium-layout #forgeQuickWorkout .forge-v3-hint>span{display:none!important}\n#workout.forge-premium-layout #forgeQuickWorkout .forge-v3-use-weight{min-height:26px!important;height:26px!important;padding:3px 9px!important;margin:0!important;color:#9eff00!important;background:#9eff0018!important;border:1px solid #9eff0050!important;border-radius:20px!important;font-size:10px!important}\n#workout.forge-premium-layout #forgeQuickWorkout .forge-v3-progression>.forge-v3-last:last-child{display:none!important}\n#workout.forge-premium-layout #forgeQuickWorkout .forge-primary-action{position:static!important;inset:auto!important;z-index:auto!important;display:flex!important;align-items:center!important;justify-content:center!important;transform:none!important;width:100%!important;min-height:43px!important;height:43px!important;margin:1px 0 0!important;padding:6px!important;border:0!important;border-radius:12px!important;background:#9eff00!important;color:#101010!important;font-size:14px!important;font-weight:850!important;box-shadow:0 8px 20px #9eff0020!important}\n#workout.forge-premium-layout #forgeQuickWorkout .forge130-actions{position:static!important;inset:auto!important;z-index:auto!important;transform:none!important;display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:8px!important;width:100%!important;margin:0!important;padding:0!important}\n#workout.forge-premium-layout #forgeQuickWorkout .forge130-actions button{display:flex!important;align-items:center!important;justify-content:center!important;min-width:0!important;width:100%!important;min-height:36px!important;height:36px!important;margin:0!important;padding:5px!important;background:#2a2a2a!important;border:1px solid #ffffff21!important;border-radius:11px!important;color:#ededed!important;font-size:11px!important;font-weight:700!important}\n#workout.forge-premium-layout #forgeQuickWorkout .forge130-suggestion,#workout.forge-premium-layout #forgeQuickWorkout .forge130-substitute,#workout.forge-premium-layout #forgeQuickWorkout .forge140-exercise-warmup,#workout.forge-premium-layout #forgeQuickWorkout .forge-slim-focus-tools:not([open]){display:none!important}\n#workout.forge-premium-layout .forge-b-footer{grid-row:7!important;min-width:0;min-height:0;display:grid!important;grid-template-rows:36px 31px!important;align-items:stretch;gap:5px;margin:0!important;padding:0!important}\n#workout.forge-premium-layout #forgeCompactDock{position:static!important;inset:auto!important;z-index:auto!important;transform:none!important;display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:8px!important;width:100%!important;margin:0!important;padding:0!important}\n#workout.forge-premium-layout #forgeCompactDock>button{display:flex!important;align-items:center!important;justify-content:center!important;width:100%!important;min-width:0!important;min-height:36px!important;height:36px!important;margin:0!important;padding:5px 3px!important;background:#222!important;border:1px solid #ffffff21!important;border-radius:11px!important;color:#ddd!important;font-size:11px!important;font-weight:750!important}\n#workout.forge-premium-layout #saveWorkout{position:static!important;inset:auto!important;z-index:auto!important;transform:none!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;width:100%!important;min-height:31px!important;height:31px!important;margin:0!important;padding:4px!important;background:#1a201e!important;border:1px solid #ffffff18!important;border-radius:10px!important;color:#c4c4c4!important;font-size:10px!important;font-weight:650!important;box-shadow:none!important}\n#workout.forge-premium-layout #saveWorkout:before{content:\"\";width:13px;height:13px;flex:none;border:1.5px solid #777;border-radius:3px}\n#workout.forge-premium-layout #forgeSaveSessionHint{display:none!important}\nbody.forge-b-active #nav.forge-simple-nav{background:#0e0e0e!important;border-top:1px solid #ffffff14!important;box-shadow:0 -8px 22px #0006!important}\nbody.forge-b-active #nav.forge-simple-nav button.active{background:#9eff000e!important;color:#9eff00!important;position:relative}\nbody.forge-b-active #nav.forge-simple-nav button.active:before{position:absolute;content:\"\";height:3px;width:45%;border-radius:9px;top:0;background:#9eff00;box-shadow:0 0 9px #9eff0070}\n#workout.forge-premium-layout #forgePremiumShell button:focus-visible{outline:2px solid #9eff00!important;outline-offset:2px}\nbody.forge-compact-typing #workout.forge-premium-layout #forgePremiumShell{overflow-y:auto!important}\nbody.forge-compact-typing #workout.forge-premium-layout #forgePremiumHero{display:block!important}\n@media(max-height:760px){#workout.forge-premium-layout #forgePremiumShell{grid-template-rows:38px 61px 35px auto minmax(92px,1fr) auto 69px!important;gap:4px!important;padding:4px 9px!important}#workout.forge-premium-layout .forge-b-status{padding:5px 9px!important}#workout.forge-premium-layout .forge-b-set-panel{padding:6px 8px!important}#workout.forge-premium-layout #forgeQuickWorkout>.forge130-focus-card{gap:4px!important}#workout.forge-premium-layout #forgeQuickWorkout .forge130-focus-card-grid label{padding:5px 8px!important}#workout.forge-premium-layout #forgeQuickWorkout .forge130-focus-card-grid input{height:26px!important;min-height:26px!important;font-size:21px!important}#workout.forge-premium-layout .forge-b-set-heading{margin-bottom:4px!important}#workout.forge-premium-layout #forgeQuickWorkout .forge-v3-progression{min-height:25px!important}#workout.forge-premium-layout .forge-b-footer{grid-template-rows:35px 30px!important;gap:4px!important}#workout.forge-premium-layout #forgeCompactDock>button{min-height:35px!important;height:35px!important}#workout.forge-premium-layout #saveWorkout{min-height:30px!important;height:30px!important}}\n@media(max-width:360px){#workout.forge-premium-layout .forge-b-anatomy{width:76px;height:105px}#workout.forge-premium-layout .forge-b-anatomy img,#workout.forge-premium-layout .forge-b-anatomy svg{height:75px!important}#workout.forge-premium-layout #forgeBExerciseName{font-size:21px}#workout.forge-premium-layout .forge-b-media-arrows button{width:34px;min-width:34px;height:34px}}\n@media(prefers-reduced-motion:reduce){#workout.forge-premium-layout *{transition:none!important;scroll-behavior:auto!important}}\n\n/* The screen is one grid: only the hero receives remaining vertical space.\n   Avoid viewport-based media heights and absolutely-positioned action stacks. */\n#workout.forge-premium-layout .forge-b-rest:not(:has(#forgeRestTimer.forge-live-rest-running)){display:none!important}\nbody.forge-compact-typing #workout.forge-premium-layout #forgePremiumShell{overflow-y:auto!important}\n#workout.forge-premium-layout #forgeQuickWorkout :is(.forge130-focus-card-grid input,.forge-v3-use-weight):focus-visible{outline:2px solid #9eff00!important;outline-offset:2px}\n\n#workout.forge-premium-layout #forgeQuickWorkout .forge130-focus-card-grid input{border:0!important;border-radius:0!important}\n#workout.forge-premium-layout #forgeQuickWorkout .forge130-focus-card-grid label{box-shadow:none!important}\n#workout.forge-premium-layout .forge-b-hud .forge-clock-digits{font-variant-numeric:tabular-nums!important;white-space:nowrap!important}\n@media(max-height:710px){\n #workout.forge-premium-layout #forgePremiumShell{grid-template-rows:36px 58px 33px auto minmax(86px,1fr) auto 66px!important;gap:3px!important;padding:3px 8px!important}\n #workout.forge-premium-layout #forgeQuickWorkout .forge130-focus-card-grid label{padding:4px 7px!important}\n #workout.forge-premium-layout #forgeQuickWorkout .forge130-focus-card-grid input{height:25px!important;min-height:25px!important;font-size:20px!important}\n #workout.forge-premium-layout .forge-b-set-panel{padding:5px 8px!important}\n #workout.forge-premium-layout .forge-b-footer{grid-template-rows:34px 28px!important;gap:4px!important}\n #workout.forge-premium-layout #forgeCompactDock>button{height:34px!important;min-height:34px!important}\n #workout.forge-premium-layout #saveWorkout{height:28px!important;min-height:28px!important}\n}\n\n/* The image is a true background for exercise name and live set status. */\n#workout.forge-premium-layout .forge-b-title-stack{min-width:0;max-width:70%;display:flex;flex-direction:column;gap:5px;justify-content:flex-end}\n#workout.forge-premium-layout .forge-b-media-bottom .forge-b-set-heading{display:flex;justify-content:flex-start;align-items:center;gap:12px;width:auto;min-width:0;margin:0!important;padding:0!important;border:0!important;background:none!important;color:#e8e8e8;font-size:11px!important;text-shadow:0 1px 7px #000}\n#workout.forge-premium-layout .forge-b-media-bottom #forgeBSetDots{display:flex;gap:5px}\n#workout.forge-premium-layout .forge-b-media-bottom #forgeBSetDots span{height:6px;width:6px}\n#workout.forge-premium-layout .forge-b-title-stack #forgeBExerciseName{max-width:100%!important}\n#workout.forge-premium-layout .forge-b-anatomy[hidden]{display:none!important}\n#workout.forge-premium-layout .forge-b-muscle-fallback{flex:1;min-height:0;width:100%;display:grid;place-items:center}\n#workout.forge-premium-layout .forge-b-muscle-fallback svg{height:73px!important;width:60px!important;max-width:100%;object-fit:contain;display:block}\n#workout.forge-premium-layout .forge-b-main-photo>img.forge-b-split-photo{position:absolute!important;left:0;top:0;width:200%!important;max-width:none!important;height:100%!important;object-fit:fill!important}\n#workout.forge-premium-layout .forge-b-main-photo[data-exercise=\"Latziehen\"]>img{object-position:center 90%!important}\n#workout.forge-premium-layout .forge-b-main-photo[data-exercise=\"Bankdrücken\"]>img{object-position:left center!important}\n#workout.forge-premium-layout .forge-b-media-shade{background:linear-gradient(180deg,#0001 0%,transparent 35%,#000d 100%)!important}\n#workout.forge-premium-layout #forgePremiumHero .forge-b-main-photo{overflow:hidden}\n#workout.forge-premium-layout .forge-b-set-panel{padding:7px 9px!important}\n#workout.forge-premium-layout .forge-b-footer{position:relative!important;z-index:2}\n#workout.forge-premium-layout .forge-b-media{min-height:0!important}\n\n/* V5: All header and footer rows remain in document flow; the exercise\n   photo alone expands into the remaining viewport area. */\n#workout.forge-premium-layout #forgePremiumShell.forge-b-overflow{\n overflow-y:auto!important;\n scrollbar-width:thin;\n}\n#workout.forge-premium-layout .forge-b-media{isolation:isolate}\n#workout.forge-premium-layout .forge-b-main-photo{background:#101314!important}\n#workout.forge-premium-layout .forge-b-main-photo>.forge-b-photo{\n display:block;width:100%!important;height:100%!important;max-width:100%!important;\n object-fit:contain;object-position:center;\n}\n#workout.forge-premium-layout .forge-b-main-photo>.forge-b-split-photo{\n position:absolute!important;left:0!important;top:0!important;\n width:200%!important;min-width:200%!important;max-width:none!important;\n height:100%!important;object-fit:fill!important;object-position:0 50%!important;\n}\n#workout.forge-premium-layout .forge-b-media-shade{\n background:linear-gradient(180deg,#0505051a 0%,transparent 38%,#050505cc 100%)!important;\n}\n#workout.forge-premium-layout .forge-b-hud #forgeLivePause{\n width:115px!important;max-width:115px!important;min-width:115px!important;\n padding:6px!important;line-height:1.1!important;letter-spacing:-.025em!important;\n font-size:10px!important;\n}\n#workout.forge-premium-layout .forge-b-set-panel{\n background:linear-gradient(155deg,#222,#171717)!important;\n border-color:rgba(255,255,255,.10)!important;\n}\n#workout.forge-premium-layout #forgeQuickWorkout .forge130-focus-card-grid label{\n background:#191919!important;\n border-color:rgba(255,255,255,.11)!important;\n}\n#workout.forge-premium-layout #forgeQuickWorkout .forge130-focus-card-grid input{\n background:transparent!important;border-color:transparent!important;\n}\n#workout.forge-premium-layout #saveWorkout{\n background:#222b26!important;border:1px solid #ffffff2a!important;\n color:#e8e8e8!important;\n}\n/* Timed exercises: countdown is a compact instrument, not a second hero. */\n#workout.forge-premium-layout #forgeQuickWorkout #forgeTimeTimerArea{display:block!important;min-width:0!important;margin:0!important;padding:0!important}\n#workout.forge-premium-layout #forgeQuickWorkout .forge-time-panel{\n margin:2px 0 0!important;padding:7px 9px!important;display:grid!important;\n grid-template-columns:minmax(0,1fr) auto!important;\n grid-template-areas:\"title digits\" \"meta controls\"!important;\n gap:4px 8px!important;align-items:center!important;min-height:0!important;\n background:#202622!important;color:#fff!important;border:1px solid #a0ff0033!important;\n border-radius:12px!important;box-shadow:none!important;\n}\n#workout.forge-premium-layout #forgeQuickWorkout .forge-time-title{\n grid-area:title!important;margin:0!important;padding:0!important;\n font-size:11px!important;line-height:1.2!important;color:#d4e9d2!important;\n}\n#workout.forge-premium-layout #forgeQuickWorkout .forge-time-digits{\n grid-area:digits!important;margin:0!important;font-size:clamp(25px,6.5vw,32px)!important;\n line-height:1!important;font-weight:850!important;color:#9eff00!important;\n font-variant-numeric:tabular-nums!important;\n}\n#workout.forge-premium-layout #forgeQuickWorkout .forge-time-sub{\n grid-area:meta!important;margin:0!important;padding:0!important;\n font-size:10px!important;line-height:1.2!important;color:#a8aba8!important;\n}\n#workout.forge-premium-layout #forgeQuickWorkout .forge-time-controls{\n grid-area:controls!important;display:flex!important;flex-wrap:nowrap!important;\n justify-content:flex-end!important;align-items:center!important;\n gap:5px!important;width:auto!important;margin:0!important;padding:0!important;\n}\n#workout.forge-premium-layout #forgeQuickWorkout .forge-time-controls button{\n width:auto!important;min-width:0!important;min-height:31px!important;height:31px!important;\n padding:5px 7px!important;border-radius:8px!important;font-size:10px!important;\n background:#2c3631!important;border:1px solid #ffffff1f!important;color:white!important;\n}\n#workout.forge-premium-layout #forgeQuickWorkout .forge-time-controls button:first-child{\n background:#9eff00!important;border-color:#9eff00!important;color:#161616!important;\n}\n#workout.forge-premium-layout #forgeQuickWorkout .forge-time-hint{display:none!important}\n@media(max-width:375px){\n #workout.forge-premium-layout .forge-b-hud .forge-clock-label{display:none!important}\n #workout.forge-premium-layout .forge-b-hud #forgeLivePause{width:103px!important;min-width:103px!important;max-width:103px!important}\n #workout.forge-premium-layout #forgeQuickWorkout .forge-time-panel{\n  grid-template-columns:minmax(0,1fr)!important;\n  grid-template-areas:\"title\" \"digits\" \"meta\" \"controls\"!important;\n }\n #workout.forge-premium-layout #forgeQuickWorkout .forge-time-controls{\n  justify-content:flex-start!important\n }\n}\n\n/* V5 definitive footer ownership: legacy full-workout CSS sets min-height:44\n   and vertical 14/10px margins on save. Prevent that rule from spilling out\n   of the allocated 31px grid row, while leaving the native click handler. */\n#workout.forge-compact-live.forge-premium-layout #forgePremiumShell .forge-b-footer #saveWorkout{\n position:static!important;box-sizing:border-box!important;\n width:100%!important;height:31px!important;min-height:31px!important;\n max-height:31px!important;margin:0!important;margin-block:0!important;\n padding:4px 8px!important;align-self:stretch!important;\n}\n#workout.forge-compact-live.forge-premium-layout #forgePremiumShell .forge-b-footer #forgeSaveSessionHint{\n display:none!important;margin:0!important;min-height:0!important;\n height:0!important;padding:0!important;\n}\n@media(max-height:760px){\n #workout.forge-compact-live.forge-premium-layout #forgePremiumShell .forge-b-footer #saveWorkout{\n height:30px!important;min-height:30px!important;max-height:30px!important;\n }\n}\n@media(max-height:710px){\n #workout.forge-compact-live.forge-premium-layout #forgePremiumShell .forge-b-footer #saveWorkout{\n height:28px!important;min-height:28px!important;max-height:28px!important;\n }\n}\n\n/* Movement image roles outrank the legacy global cover rule. */\n#workout.forge-premium-layout .forge-b-main-photo>img.forge-b-photo[data-fit=\"contain\"]{object-fit:contain!important;object-position:center!important}\n#workout.forge-premium-layout .forge-b-main-photo>img.forge-b-photo[data-fit=\"cover\"]:not(.forge-b-split-photo){object-fit:cover!important}\n#workout.forge-premium-layout .forge-b-main-photo[data-exercise=\"Latziehen\"]>img.forge-b-photo{object-fit:contain!important;object-position:center!important}\n#workout.forge-premium-layout .forge-b-main-photo[data-exercise=\"Seitheben\"]>img.forge-b-photo{object-fit:contain!important;object-position:center!important}\n#workout.forge-premium-layout .forge-b-main-photo[data-exercise=\"Plank\"]>img.forge-b-photo{object-fit:contain!important;object-position:center!important}\n/* Timed movements keep a usable photograph instead of a narrow 129px strip.\n   Scroll is allowed if the native time controls require additional space. */\n#workout.forge-premium-layout #forgePremiumShell.forge-b-timed .forge-b-media{min-height:clamp(180px,24dvh,224px)!important}\n#workout.forge-premium-layout #forgePremiumShell.forge-b-timed .forge-b-set-panel{padding:6px 8px!important}\n\n/* V5 timed grid: minimum hero and its grid TRACK share one size.\n   Without this, the hero can overflow its row over the weight inputs. */\n#workout.forge-premium-layout #forgePremiumShell.forge-b-timed{\n grid-template-rows:40px 64px 38px auto minmax(clamp(180px,24dvh,224px),1fr) auto 72px!important;\n overflow-y:auto!important;overflow-x:hidden!important;\n}\n@media(max-height:760px){\n #workout.forge-premium-layout #forgePremiumShell.forge-b-timed{\n  grid-template-rows:38px 61px 35px auto minmax(clamp(180px,24dvh,224px),1fr) auto 69px!important;\n }\n}\n@media(max-height:710px){\n #workout.forge-premium-layout #forgePremiumShell.forge-b-timed{\n  grid-template-rows:36px 58px 33px auto minmax(clamp(180px,24dvh,224px),1fr) auto 66px!important;\n }\n}\n\n/* Portrait pulldown assets must retain their intrinsic ratio. Stretching the\n   image element to 100% width made only the cable and head visible. */\n#workout.forge-premium-layout .forge-b-main-photo[data-exercise=\"Latziehen\"]>img.forge-b-photo{\n width:auto!important;height:100%!important;max-width:100%!important;\n object-fit:contain!important;object-position:center center!important;\n position:relative!important;left:auto!important;top:auto!important;\n}\n";

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
const muscleGroups={
 'Bankdrücken':['chest','triceps','shoulders'],
 'Latziehen':['lats','biceps'],
 'Seitheben':['shoulders'],
 'Plank':['abs','core'],
 'Ausfallschritte':['quads','glutes']
};
function anatomyFallback(name){
 const groups=muscleGroups[name];if(!groups)return null;
 // Latissimus is posterior: a front-facing silhouette would be misleading.
 if(groups.includes('lats')){
  const out=create('div','forge-b-muscle-fallback');
  out.innerHTML=[
   '<svg viewBox="0 0 106 156" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Latziehen – schematische Rückansicht, Latissimus hervorgehoben">',
   '<g stroke="#36403d" stroke-width="1.5" stroke-linejoin="round">',
   '<circle cx="53" cy="14" r="10" fill="#7a8582"/>',
   '<path d="M38 29Q53 22 68 29L67 84H39Z" fill="#63716b"/>',
   '<path d="M37 32 24 74 33 78 46 43M69 32 82 74 73 78 60 43" fill="#737f79"/>',
   '<path d="M43 83h20l7 12H36Z" fill="#65716c"/>',
   '<path d="M40 96 35 134l14 2 7-36M66 96l5 38-14 2-6-36" fill="#737e78"/>',
   '<path d="M35 134 33 151h16v-15M71 134l2 17H57v-15" fill="#7c8983"/>',
   '<path d="M38 37 52 48 46 81 39 79Z" fill="#9EFF00"/>',
   '<path d="M68 37 54 48 60 81 67 79Z" fill="#9EFF00"/>',
   '<path d="M53 38v42" stroke="#33413c" stroke-width="2"/>',
   '</g></svg>'
  ].join('');
  return out;
 }
 const col=k=>groups.includes(k)?'#9EFF00':'#697571';
 const out=create('div','forge-b-muscle-fallback');
 out.innerHTML=[
 '<svg viewBox="0 0 106 156" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+name+' – vereinfachte Muskelansicht">',
 '<g stroke="#36403d" stroke-width="1.5" stroke-linejoin="round">',
 '<circle cx="53" cy="14" r="10" fill="#7a8582"/>',
 '<path d="M37 29Q53 23 69 29L65 80H41Z" fill="#626e6a"/>',
 '<path d="M36 31 23 75l9 4 14-34M70 31l13 44-9 4-14-34" fill="#78827c"/>',
 '<path d="M42 80h22l5 14H37Z" fill="#65706d"/>',
 '<path d="M40 95 35 132l13 2 8-35M66 95l5 37-13 2-5-35" fill="#79847d"/>',
 '<path d="M35 132 34 148h15l-1-14M71 132l1 16H57l1-14" fill="#87918d"/>',
 '<path d="M40 37l13 4 13-4-5 19H45Z" fill="'+col('chest')+'"/>',
 '<path d="M45 58h16l-2 19H47Z" fill="'+col('abs')+'"/>',
 '<path d="M38 30 29 50l8 4 8-19M68 30l9 20-8 4-8-19" fill="'+col('shoulders')+'"/>',
 '<path d="M27 50l-6 22 9 3 7-21M79 50l6 22-9 3-7-21" fill="'+(groups.includes('triceps')||groups.includes('biceps')?'#9EFF00':'#6d7874')+'"/>',
 '<path d="M39 97 53 98l-4 30-13-2ZM67 97 53 98l4 30 13-2Z" fill="'+col('quads')+'"/>',
 '<path d="M40 81q14-9 26 0l3 14H37Z" fill="'+col('glutes')+'"/>',
 '<path d="M45 31l-6 39 5 8 4-37M61 31l6 39-5 8-4-37" fill="'+col('lats')+'"/>',
 '</g></svg>'
 ].join('');
 return out;
}
// V5: explicit movement-stage policy. A third phase is NOT automatically
// an anatomy image (some exercises have Y/T/W movement series).
const MEDIA_RULES=Object.freeze({
 'Bankdrücken':Object.freeze({stage:0,composite:'legacy-paired',fit:'cover',position:'left center'}),
 'Latziehen':Object.freeze({stage:1,fit:'contain',position:'center center'}),
 'Seitheben':Object.freeze({stage:1,fit:'contain',position:'center center'}),
 'Ausfallschritte':Object.freeze({stage:1,fit:'cover',position:'center center'}),
 'Plank':Object.freeze({stage:0,fit:'contain',position:'center center'})
});
function imageData(name){
 if(artCache.has(name))return artCache.get(name);
 const rule=MEDIA_RULES[name]||{stage:1,fit:'contain',position:'center center'};
 const art={main:null,muscle:null,rule,assetCount:0,composite:false};
 try{
  const primary=typeof window.forgeExerciseIllustrations==='function'
   ?window.forgeExerciseIllustrations(name):'';
  const source=primary||(typeof window.forgePublicExercisePictures==='function'
   ?window.forgePublicExercisePictures(name):'');
  if(source){
   const holder=create('div');holder.innerHTML=source;
   const nodes=Array.from(holder.querySelectorAll('img,svg'));
   const label=node=>String(
    node.getAttribute?.('alt')||node.getAttribute?.('aria-label')||
    node.closest?.('figure')?.querySelector?.('figcaption')?.textContent||''
   ).toLocaleLowerCase('de');
   const isAnatomy=(node,index)=>/hauptmuskel|beanspruchte muskel|muskelgruppe|anatom/i.test(label(node))||
    node.classList?.contains('forge-anatomy-v2-image');
   const movement=nodes.filter((node,i)=>!isAnatomy(node,i));
   const chosen=movement[Math.min(rule.stage,Math.max(0,movement.length-1))]||movement[0];
   art.assetCount=movement.length;
   art.main=chosen?.cloneNode(true)||null;
   // Legacy Bankdrücken explicitly stores composite motion pictures.
   // Do not infer a crop from a generic image aspect ratio.
   art.composite=!!(rule.composite&&chosen&&(
    chosen.closest?.('.forge-offline-pair,.forge-photo-pair')||
    /start.*endposition|zwei position/i.test(label(chosen))
   ));
   const anatomies=nodes.filter((node,i)=>isAnatomy(node,i));
   art.muscle=anatomies.length?anatomies[0].cloneNode(true):null;
  }
 }catch(error){console.warn('FORGE: movement image unavailable',name,error);}
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
 visual.dataset.exercise=name;
 if(art.main){
  const mainPhoto=picture(art.main,name+' – Ausführung');
  if(mainPhoto.tagName==='IMG'){
   mainPhoto.classList.add('forge-b-photo');
   mainPhoto.dataset.fit=art.rule.fit;
   mainPhoto.style.objectPosition=art.rule.position;
   if(art.composite)mainPhoto.classList.add('forge-b-split-photo');
  }
  visual.append(mainPhoto);
 }
 else if(name==='Ausfallschritte')visual.innerHTML=lungeSvg;
 else visual.append(create('span','forge-b-fallback','Bild zur Übung noch nicht vorhanden'));
 const shade=create('div','forge-b-media-shade');
 hero.replaceChildren(visual,shade);
 const anatomy=$('forgeBAnatomy');
 if(anatomy){
  anatomy.replaceChildren();
  anatomy.append(create('span','forge-b-anatomy-label','Hauptmuskeln'));
  if(art.muscle)anatomy.append(picture(art.muscle,name+' – beanspruchte Muskelgruppen'));
  else {
   const fallback=anatomyFallback(name);
   if(fallback)anatomy.append(fallback);
   else anatomy.hidden=true;
  }
  if(art.muscle||muscleGroups[name])anatomy.hidden=false;
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
 setHeading.append(setLabel,dots);
 const titleStack=create('div','forge-b-title-stack');
 titleStack.append(title,setHeading);lower.replaceChildren(titleStack,arrows);
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
// Measure the real bottom-navigation boundary instead of assuming its height.
// The value changes only when the viewport or nav actually changes.
function fitViewport(){
 const page=$('workout'),nav=$('nav');
 if(!page||!nav||!shell||typeof nav.getBoundingClientRect!=='function'
   ||typeof page.getBoundingClientRect!=='function')return;
 const upper=page.getBoundingClientRect().top;
 const navTop=nav.getBoundingClientRect().top;
 const height=Math.max(0,Math.floor(navTop-upper-10));
 if(height<=0)return;
 const value=height+'px';
 if(page.style.getPropertyValue('--forge-b-visible-height')!==value)
  page.style.setProperty('--forge-b-visible-height',value);
}
// The one-screen grid is the primary mode. If an exceptional exercise
// (for example a long timed-set widget) exceeds its measured space, do not
// silently clip the finish button behind the bottom navigation.
function protectFinishAction(){
 if(!shell||typeof shell.getBoundingClientRect!=='function')return;
 const nav=$('nav'),save=$('saveWorkout');
 if(!nav||!save||typeof nav.getBoundingClientRect!=='function'
   ||typeof save.getBoundingClientRect!=='function')return;
 const covered=save.getBoundingClientRect().bottom>nav.getBoundingClientRect().top-10;
 const overflow=shell.scrollHeight>shell.clientHeight+2;
 shell.classList.toggle('forge-b-overflow',covered||overflow);
}
function sync(){
 const page=$('workout');
 if(!installed||!page)return;
 const active=liveMode(page,typeof state==='undefined'?null:state);
 if(!active){restoreLayout();return;}
 if(!mountLayout())return;
 fitViewport();
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
 // Composition only: never alter the native countdown or its saved timestamps.
 const exercise=plan.ex?.[current.i];
 const timed=exercise?.unit==='sec'||/\b(plank|hold|wandsitz|seitstütz|isometrisch)\b/i.test(nameOfExercise||'');
 shell.classList.toggle('forge-b-timed',!!timed);
 protectFinishAction();
}
// Read-only measurements for visual QA on real Android and web viewports.
// No DOM writes, no timers, no training data mutations.
function measureLayout(){
 if(!shell||typeof shell.getBoundingClientRect!=='function')return null;
 const rect=el=>el?.getBoundingClientRect?.()||null;
 const nav=rect($('nav')),viewport=rect(shell),page=rect($('workout'));
 const regions=[
  ['header',shell.querySelector('.forge-b-header')],
  ['status',shell.querySelector('.forge-b-status')],
  ['timer',shell.querySelector('.forge-b-hud')],
  ['rest',shell.querySelector('.forge-b-rest')],
  ['media',shell.querySelector('.forge-b-media')],
  ['sets',shell.querySelector('.forge-b-set-panel')],
  ['actions',shell.querySelector('.forge-b-footer')]
 ];
 const rows={};let lastBottom=viewport.top;
 for(const [name,node] of regions){
  const box=rect(node);
  rows[name]=box?Math.round(box.height*10)/10:0;
  if(box&&box.height>0)lastBottom=Math.max(lastBottom,box.bottom);
 }
 const footer=rect($('saveWorkout'));
 const controls=rect($('forgeCompactDock'));
 const safeBottom=nav?.top??page?.bottom??viewport.bottom;
 return {
  viewport:{width:Math.round(viewport.width),height:Math.round(viewport.height)},
  regions:rows,
  contentBottom:Math.round(lastBottom-viewport.top),
  availableHeight:Math.round(viewport.height),
  overflowPx:Math.max(0,Math.ceil(shell.scrollHeight-shell.clientHeight)),
  actionCoveredPx:Math.max(0,Math.ceil(Math.max(footer?.bottom||0,controls?.bottom||0)-safeBottom)),
  allVisible:!!(footer&&controls&&lastBottom<=viewport.bottom+1
   &&footer.bottom<=safeBottom+1&&controls.bottom<=safeBottom+1),
  keyboardOpen:document.body.classList.contains('forge-compact-typing')
 };
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
 window.addEventListener?.('resize',fitViewport,{passive:true});
 window.visualViewport?.addEventListener?.('resize',fitViewport,{passive:true});
 setInterval(()=>{if(!installed)install();sync();},650);
}
window.ForgePremiumWorkoutB=Object.freeze({liveMode,imageData,showHero,mountLayout,restoreLayout,sync,measureLayout,isInstalled:()=>installed,renderCount:()=>rendered});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
