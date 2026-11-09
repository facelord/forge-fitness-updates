/* FORGE Layout B · Einstieg für neue Nutzer.
 * Beim ersten Start ohne Plan, Trainings und Essen erscheint ein ruhiger
 * Willkommens-Bildschirm: FORGE + Slogan, drei kurze Punkte, dann
 *  - „Plan erstellen“ → Plan-Assistent (Ziel, Ort, Erfahrung, Rhythmus)
 *  - „Daten aus Backup holen“ → Datensicherung (Handywechsel)
 *  - „Erst mal umsehen“
 * Wird einmal pro Gerät gezeigt (localStorage), nie während eines Trainings.
 */
(function(){
'use strict';
const KEY_DONE='forge_lb_welcome_v1';
/* Show only for a really empty profile (pure, tested). */
function shouldShow(st,done){
 if(done)return false;
 if(!st||typeof st!=='object')return false;
 if(st.activeWorkout)return false;
 const has=k=>Array.isArray(st[k])&&st[k].length>0;
 if(has('plan')||has('workouts')||has('foods')||has('weights'))return false;
 if(st.mobility&&st.mobility.enabled)return false;
 return true;
}
window.ForgeLayoutBWelcome=Object.freeze({shouldShow,KEY_DONE});
if(typeof document==='undefined')return;

const $=id=>document.getElementById(id);
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function btn(cls,text,fn){const b=el('button',cls,text);b.type='button';if(fn)b.addEventListener('click',fn);return b;}
function enabled(){return !!(document.body&&document.body.classList.contains('forge-layout-b'));}
function done(){try{return localStorage.getItem(KEY_DONE)==='1';}catch(e){return true;}}
function markDone(){try{localStorage.setItem(KEY_DONE,'1');}catch(e){}}
const ACC='#a9f267',TEAL='#5ee0c8',GOLD='#ffb547';
const CSS=`
.forge-lb-welcome{position:fixed;inset:0;z-index:2147480300;background:radial-gradient(120% 70% at 50% 0%,#1a2a1c 0%,#0b1018 60%);color:#f3f7fc;font-family:Inter,system-ui,sans-serif;display:flex;flex-direction:column;padding:calc(28px + env(safe-area-inset-top)) 22px calc(22px + env(safe-area-inset-bottom));overflow:auto}
.forge-lb-welcome *{box-sizing:border-box}
.forge-lb-welcome .wl-in{max-width:460px;width:100%;margin:0 auto;display:flex;flex-direction:column;flex:1}
.forge-lb-welcome .wl-brand{font-size:44px;font-weight:900;letter-spacing:.16em;color:${ACC};margin:18px 0 4px}
.forge-lb-welcome .wl-slogan{font-size:17px;color:#c3cddb;margin:0 0 26px}
.forge-lb-welcome h1{font-size:26px;line-height:1.2;font-weight:800;letter-spacing:-.02em;margin:0 0 16px}
.forge-lb-welcome .wl-pts{display:flex;flex-direction:column;gap:12px;margin:0 0 24px;padding:0;list-style:none}
.forge-lb-welcome .wl-pts li{display:flex;gap:12px;align-items:flex-start;background:#171e2acc;border:1px solid #293346;border-radius:18px;padding:12px 14px}
.forge-lb-welcome .wl-pts i{width:36px;height:36px;flex:0 0 36px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:18px}
.forge-lb-welcome .wl-pts b{display:block;font-size:15px}
.forge-lb-welcome .wl-pts small{display:block;font-size:13px;color:#95a3b7;line-height:1.4;margin-top:2px}
.forge-lb-welcome .wl-sp{flex:1;min-height:12px}
.forge-lb-welcome .wl-main{width:100%;height:58px;border-radius:29px;border:0;background:${ACC};color:#142016;font:inherit;font-size:18px;font-weight:800}
.forge-lb-welcome .wl-sec{width:100%;min-height:50px;border-radius:25px;border:1px solid #3a4556;background:transparent;color:#f3f7fc;font:inherit;font-size:15px;font-weight:700;margin-top:10px}
.forge-lb-welcome .wl-link{display:block;margin:14px auto 0;border:0;background:transparent;color:#95a3b7;font:inherit;font-size:14px;font-weight:600;min-height:44px;padding:0 16px}
.forge-lb-welcome button:focus-visible{outline:2px solid ${ACC};outline-offset:3px}
`;
let root=null;
function close(){if(root){root.remove();root=null;}}
function show(){
 if(root)return;
 if(!$('forgeLayoutBWelcomeStyle')){const st=el('style');st.id='forgeLayoutBWelcomeStyle';st.textContent=CSS;document.head.append(st);}
 root=el('div','forge-lb-welcome');root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Willkommen bei FORGE');
 const inn=el('div','wl-in');
 inn.append(el('div','wl-brand','FORGE'),el('p','wl-slogan','Schmiede, was in dir steckt'),el('h1','','Training, Mobilität und Essen – in einer App.'));
 const pts=el('ul','wl-pts');
 const pt=(icon,color,bg,title,sub)=>{const li=el('li');const i=el('i','',icon);i.style.color=color;i.style.background=bg;const t=el('span');t.append(el('b','',title),el('small','',sub));li.append(i,t);pts.append(li);};
 pt('🏋️',ACC,'#22361f','Dein Plan in einer Minute','Ziel, Ort und Rhythmus wählen – FORGE stellt die Einheiten zusammen.');
 pt('⏱️',TEAL,'#14302d','Geführt durchs Training','Satz für Satz mit Pausen, Gewichten und Steigerungsvorschlägen.');
 pt('🔒',GOLD,'#2e2410','Alles bleibt bei dir','Kein Konto, keine Werbung. Deine Daten bleiben auf dem Gerät.');
 inn.append(pts,el('div','wl-sp'));
 inn.append(btn('wl-main','Plan erstellen',()=>{markDone();close();try{if(typeof window.ForgeLayoutBWizardOpen==='function')window.ForgeLayoutBWizardOpen('strength');}catch(e){console.error(e);}}));
 inn.append(btn('wl-sec','Daten aus Backup holen',()=>{markDone();close();try{if(typeof window.forgeOpenBackup==='function')window.forgeOpenBackup();}catch(e){console.error(e);}}));
 inn.append(btn('wl-link','Erst mal umsehen',()=>{markDone();close();}));
 root.append(inn);document.body.append(root);
 root.querySelector('.wl-main').focus({preventScroll:true});
}
function check(){
 if(!enabled())return false;
 // Audits and deep links run with a query string; the app itself never does.
 try{if(location.search)return true;}catch(e){}
 try{if(shouldShow(typeof state!=='undefined'?state:null,done()))show();}catch(e){console.error('FORGE Willkommen',e);}
 return true;
}
window.forgeShowWelcome=show;
function boot(){setTimeout(()=>{if(check())return;let k=0;const t=setInterval(()=>{if(check()||++k>20)clearInterval(t);},250);},900);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
