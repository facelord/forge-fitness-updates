/* FORGE keyboard stability — Android WebView + browser/PWA.
 * Full-screen renders must never replace an input while a person is typing.
 * Existing input/change handlers continue to save data immediately; only
 * expensive visual refreshes wait until the user leaves the text field.
 * This is intentionally NOT a focus()/blur() hack: it keeps the same DOM input.
 */
(function(){
'use strict';
const RENDERERS=[
 'render', 'renderPlan', 'renderPlanManager', 'renderCombinedWeek',
 'renderVideoScheduleEditor', 'renderWorkout', 'renderProgress',
 'renderMobility', 'renderForgeCardio', 'renderForgeMealShortcuts',
 'forge130RenderQuick', 'forge130RenderCockpit'
];
const NON_TEXT_TYPES=new Set([
 'button','checkbox','color','date','datetime-local','file','hidden',
 'image','month','radio','range','reset','submit','time','week'
]);
let pending=new Map(),timer=null,installed=false,flushing=false;
function isTextEntry(element){
 if(!element)return false;
 if(element.isContentEditable===true)return true;
 const tag=String(element.tagName||'').toUpperCase();
 if(tag==='TEXTAREA')return true;
 if(tag!=='INPUT')return false;
 const type=String(element.type||'text').toLowerCase();
 return !NON_TEXT_TYPES.has(type);
}
function typing(){
 const element=document.activeElement;
 // Detached elements cannot keep a keyboard and must not postpone a refresh.
 return !!(element&&element.isConnected!==false&&isTextEntry(element));
}
function drain(){
 if(flushing||typing()||!pending.size)return;
 const queue=Array.from(pending.values());
 pending.clear();
 flushing=true;
 try{
  for(const call of queue)call.original.apply(call.context,call.args);
 }finally{flushing=false;}
}
function scheduleDrain(){
 if(timer!==null)clearTimeout(timer);
 // Run after change, focusout and click handlers so a just-entered value is
 // already saved and another newly focused input is not accidentally replaced.
 timer=setTimeout(()=>{timer=null;drain();},0);
}
function wrap(name){
 const original=window[name];
 if(typeof original!=='function'||original.forgeKeyboardWrapped)return;
 const guarded=function(){
  if(typing()){
   // Keep latest arguments for each renderer without queuing one call per key.
   pending.set(name,{original,context:this,args:Array.from(arguments)});
   return;
  }
  return original.apply(this,arguments);
 };
 guarded.forgeKeyboardWrapped=true;
 window[name]=guarded;
}
function install(){
 if(installed)return;
 installed=true;
 RENDERERS.forEach(wrap);
 document.addEventListener('focusout',scheduleDrain,true);
 // Switching application sections must not leave an outdated queued screen.
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&!typing())scheduleDrain();
 });
}
window.ForgeKeyboardStability=Object.freeze({isTextEntry,typing,flush:drain,install});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
else install();
})();