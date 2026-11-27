/* LIFE & LEGACY — engine/portrait.js
 * SECTION 6b portrait + biography.
 * Split of src/game.js (mechanical, behavior-identical). Load order = index.html order.
 * Shared scope: classic scripts, globals (S, LL, GDATA, EVENTS). See src/content/index.json (Phase 5).
 */
"use strict";
window.LL=(window.LL||{v:1,files:[]});
/* ============ SECTION 6b — portrait + AI biography (display only) ============ */
var portraitToken=0, portraitBusy=false, descToken=0, descBusy=false;
/* portrait freshness is tracked separately from the biography: faces should
 * visibly grow up (a repaint every ~3 years AND at every developmental tier),
 * while the text bio keeps its 5-year cadence to save AI quota. A failed
 * generation marks portraitOk=false so next year retries instead of going
 * stale for half a decade. */
var portraitOk=true, lastPaintTier=null;
function paintTier(){ try{ return identityLock().split(" ").slice(2,4).join(" "); }catch(e){ return ""; } }
function paintStale(k){ return !portraitOk || (k.age-lastStory.age>=3) || (paintTier()!==lastPaintTier)
  || k.job!==lastStory.job || k.partner!==lastStory.partner || k.kids!==lastStory.kids || k.house!==lastStory.house; }
var lastStory={age:-999,job:"",partner:"",kids:-1,house:""};
function storyKey(){ return {age:S.age,job:S.jobId||"",partner:S.relationships.partner?S.relationships.partner.name+"m"+(S.relationships.partner.married?1:0):"",kids:S.relationships.children.length,house:S.assets.houseId||""}; }
function storyStale(){ var k=storyKey(),l=lastStory; return (k.age-l.age>=5)||k.job!==l.job||k.partner!==l.partner||k.kids!==l.kids||k.house!==l.house; }
function maybeStory(force){
  if(!S||!S.alive)return;
  var k=storyKey();
  var needDesc=force||storyStale(), needPaint=force||paintStale(k);
  if(!needDesc&&!needPaint)return;
  if(!force&&(portraitBusy||descBusy))return;
  lastStory=k;
  if(needPaint){ lastPaintTier=paintTier(); paintPortrait(); }
  if(needDesc)writeDesc();
}
function paintPortrait(){
  var my=++portraitToken; portraitBusy=true;
  var img=$("portraitImg"), fb=$("avatar");
  if(!img){ portraitBusy=false; return; }
  if(img.hidden){ if(fb)fb.style.display="grid"; }
  if(!artEnabled()){ portraitBusy=false; portraitOk=true; return; }
  var mood=(S.stats.happiness>70?"genuine soft smile":(S.stats.happiness<30?"weary tired expression":"calm neutral expression"));
  var prompt="Ultra-photorealistic portrait photograph of a real human, 85mm lens, shallow depth of field, natural detailed skin texture, sharp lifelike eyes, realistic cinematic lighting, no cartoon no illustration no painting no CGI no text no watermark. IDENTITY — draw "+identityLock()+", "+S.genderIdentity+", "+attireFor()+", "+mood+(S.age>=13&&S.relationships.partner?", with the warmth of someone loved":"")+". Setting: "+(S.city?S.city+", ":"")+S.country+(S.customWorld?". World note: "+S.customWorld.slice(0,100):"");
  try{
    requestImage({prompt:prompt,negativePrompt:photoNeg(S.age<18?"beard, mustache, goatee, facial hair, tattoos":""),resolution:"512x512",guidanceScale:9,seed:S.imgSeed}).then(function(r){
      portraitBusy=false;
      if(my!==portraitToken||!r||!r.dataUrl){ if(my===portraitToken)portraitOk=false; return; }
      portraitOk=true;
      img.src=r.dataUrl; img.hidden=false; if(fb)fb.style.display="none";
    }).catch(function(){ portraitBusy=false; if(my===portraitToken)portraitOk=false; });
  }catch(e){ portraitBusy=false; }
}
async function writeDesc(){
  var my=++descToken; descBusy=true;
  var el=$("lifeDesc");
  var task="Sum up this person's life so far in 2-3 vivid sentences, second person (You ...). Weave in traits ("+S.traits.join(", ")+"), lifestyle ("+focusTag()+"), "+bgEssence()+" roots, the ambition of "+(S.ambition||"drifting")+", and House "+S.lastName+" prestige ("+S.prestige+"). They look like this: "+appearancePrompt()+" — let one physical detail surface naturally (a glance, a habit, how rooms react). No preamble, just the summary.";
  try{
    var res=await aiText({instruction:aiPrompt(task),
      onChunk:function(d){ if(my===descToken)el.textContent=d.fullTextSoFar; }});
    if(my===descToken&&S&&S.alive){
      var finalT=(res&&res.text)?String(res.text):el.textContent;
      if(S.flags.heirLegacy){ finalT=S.flags.heirLegacy+"\n\n"+finalT; S.flags.heirLegacy=null; }
      el.textContent=finalT;
    }
  }catch(e){ if(my===descToken){ var fb="Your story is still being written…"; if(S&&S.flags.heirLegacy){ fb=S.flags.heirLegacy+"\n\n"+fb; S.flags.heirLegacy=null; } el.textContent=fb; } }
  descBusy=false;
  if(descDirty){ descDirty=false; if(S&&S.alive){ lastStory=storyKey(); writeDesc(); } }
}
var descDirty=false;
function refreshDesc(){
  if(!S||!S.alive)return;
  lastStory=storyKey();
  if(descBusy){ descDirty=true; return; }
  writeDesc();
}



LL.files.push("portrait"); /* end-of-file registration: counts as loaded only after this file fully ran */