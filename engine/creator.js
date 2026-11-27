/* LIFE & LEGACY — engine/creator.js
 * SECTION 12b-ii custom-life creator, geo, focuses, AI background/dictation.
 * Split of src/game.js (mechanical, behavior-identical). Load order = index.html order.
 * Shared scope: classic scripts, globals (S, LL, GDATA, EVENTS). See src/content/index.json (Phase 5).
 */
"use strict";
window.LL=(window.LL||{v:1,files:[]});
var attrAlloc={}, ATTR_POOL=30, ATTR_MAX=10;
function fillCreateModal(){
  function opts(sel,arr){ var e=$(sel); if(!e)return; e.innerHTML=arr.map(function(v){ return "<option>"+esc(v)+"</option>"; }).join(""); }
  var rc=$("cRace"); if(rc)rc.innerHTML=RACES.map(function(v){ return "<option>"+esc(v)+"</option>"; }).join("");
  var rf=$("cRaceF"), rm=$("cRaceM");
  if(rf)rf.innerHTML=RACES_MIXABLE.map(function(v){ return "<option>"+esc(v)+"</option>"; }).join("");
  if(rm)rm.innerHTML=RACES_MIXABLE.map(function(v){ return "<option>"+esc(v)+"</option>"; }).join("");
  opts("cSkin",SKINS); opts("cEyes",EYES); opts("cBuild",BUILDS);
  opts("cHeight",HEIGHTS); opts("cFigure",FIGURES); opts("cHairstyle",HAIRSTYLES);
  opts("cHaircolor",HAIRCOLORS); opts("cHairlen",HAIRLENS); opts("cFace",FACES);
  opts("cFacial",FACIALS); opts("cMarks",MARKS); opts("cStyle",STYLES); opts("cVoice",VOICES);
  drawApprFx();
  var bg=$("cBg"); if(bg)bg.innerHTML=window.GDATA.backgrounds.map(function(b){ return '<option value="'+b.id+'">'+b.icon+" "+esc(b.name)+"</option>"; }).join("");
  toggleCustomBg();
  var gg=$("geneGrid");
  if(gg){ var gc=gg.querySelectorAll("input"); for(var gi=0;gi<gc.length;gi++)gc[gi].onchange=function(){ toggleSexSections(); }; }
  var ci=$("cMkIll"); if(ci)ci.onchange=function(){ toggleSexSections(); };
  toggleSexSections();
  var am=$("cAmb"); if(am)am.innerHTML=window.GDATA.ambitions.map(function(a){ return '<option value="'+a.id+'" title="'+esc(a.desc)+'">'+a.icon+" "+esc(a.name)+"</option>"; }).join("");
  var tg=$("traitGrid"); if(tg){ tg.innerHTML="";
    window.GDATA.traits.forEach(function(t){
      var lab=document.createElement("label"); lab.className="pick"; lab.title=t.desc;
      lab.innerHTML='<input type="checkbox" data-trait="'+t.id+'" data-cong="'+(t.congenital?1:0)+'"/><span><b>'+t.icon+" "+esc(t.name)+(t.congenital?" ★":"")+'</b><small>'+esc(t.desc)+'</small></span>';
      var cb=lab.querySelector("input");
      cb.onchange=function(){ enforceTraits(cb); };
      tg.appendChild(lab);
    }); }
  attrAlloc={}; var ag=$("attrGrid"); if(ag){ ag.innerHTML="";
    var names={health:"❤️ Health",happiness:"😊 Happiness",smarts:"🧠 Smarts",looks:"✨ Looks",fitness:"💪 Fitness",discipline:"🎯 Discipline",creativity:"🎨 Creativity",social:"🗣️ Social",karma:"☯️ Karma"};
    STAT_KEYS.forEach(function(k){
      attrAlloc[k]=0;
      var d=document.createElement("div"); d.className="attrrow";
      d.innerHTML='<span class="grow">'+names[k]+' <small>+<span data-av="'+k+'">0</span></small></span>';
      var m=document.createElement("button"); m.className="step"; m.textContent="−";
      var p=document.createElement("button"); p.className="step"; p.textContent="+";
      m.onclick=function(){ if(attrAlloc[k]>0){ attrAlloc[k]--; drawAttr(); } };
      p.onclick=function(){ if(poolLeft()>0&&attrAlloc[k]<ATTR_MAX){ attrAlloc[k]++; drawAttr(); } else toast(attrAlloc[k]>=ATTR_MAX?"Max +10 per stat!":"No points left — remove some first!"); };
      d.appendChild(m); d.appendChild(p); ag.appendChild(d);
    }); }
  drawAttr();
}
function poolLeft(){ var u=0; for(var k in attrAlloc)u+=attrAlloc[k]; return ATTR_POOL-u; }
function drawApprFx(){
  var el=$("apprFx"); if(!el)return;
  function v(id){ var e=$(id); return e?e.value:""; }
  var ap={height:v("cHeight"),figure:v("cFigure"),face:v("cFace"),facial:v("cFacial"),marks:v("cMarks"),style:v("cStyle"),voice:v("cVoice"),hairlen:v("cHairlen"),haircolor:v("cHaircolor"),hairstyle:v("cHairstyle")};
  var m=appearMods(ap), parts=[], neg=[];
  var nm={looks:"looks",social:"social",fitness:"fitness",discipline:"discipline",creativity:"creativity",health:"health",happiness:"happiness",smarts:"smarts"};
  for(var k in m){ if(!m[k]||!nm[k])continue; (m[k]>0?parts:neg).push((m[k]>0?"+":"")+m[k]+" "+nm[k]); }
  el.innerHTML="✨ Appearance effect: <b>"+(parts.concat(neg).join(" · ")||"purely cosmetic — no stat shifts")+"</b>";
}
function toggleMixedRow(){ var mr=$("mixedRow"), rc=$("cRace"); if(mr)mr.hidden=!rc||rc.value!=="Mixed"; drawApprFx(); }
function toggleCustomBg(){ var cb=$("cBg"), tx=$("cCustomBg"); if(tx)tx.hidden=!cb||cb.value!=="custom"; }
/* ---- GENETICS PATCH: sex-aware creation ----
 * Biological sex drives which sections live: facial hair shows for males and
 * "other" always, but for females ONLY when the hirsutism marker is checked
 * (the gene is the gate, exactly as requested). Figures filter by body;
 * the genome note teaches the inheritance rules up front. */
function sexBio(){ var b=$("cBio"); return b?b.value:"male"; }
function toggleSexSections(){
  var bio=sexBio();
  var hirs=false; try{ hirs=!(!$("cMkHirs")||!$("cMkHirs").checked); }catch(e){}
  var showFacial=bio!=="female"||hirs;
  var fc=$("facialCell"); if(fc)fc.hidden=!showFacial;
  if(!showFacial){ var f=$("cFacial"); if(f)f.value="clean-shaven"; }
  var fg=$("cFigure");
  if(fg){ var cur=fg.value, list=figureFor(bio);
    fg.innerHTML=list.map(function(v){ return "<option>"+esc(v)+"</option>"; }).join("");
    if(list.indexOf(cur)>=0)fg.value=cur;
  }
  var gn=$("geneNote");
  if(gn)gn.textContent=bio==="female"
    ?"daughters pass mitochondria · sons get your X · facial hair needs hirsutism"
    :(bio==="other"?"expression follows assigned biology — pick markers freely"
    :"sons get your Y · daughters get your X · twin line passes maternally");
  try{ drawApprFx(); }catch(e){}
}
/* markers -> founder genome, layered over the look-derived genome */
function collectGenes(bio,ap){
  var G=null;
  try{ G=genesForAppearance(ap||{},bio); }catch(e){ G=founderGenes(bio); }
  function chk(id){ try{ var e=$(id); return !!(e&&e.checked); }catch(e2){ return false; } }
  try{
    if(chk("cMkRed"))G.L.mc1r="aa";
    if(chk("cMkFreck"))G.L.freck="Aa";
    if(chk("cMkDimp"))G.L.dimp="Aa";
    if(chk("cMkHet"))G.L.het="aa";
    if(chk("cMkHirs"))G.L.hirs="aa";
    if(chk("cMkTwin"))G.L.twin="Aa";
    var ill=$("cMkIll")?$("cMkIll").value:"none";
    if(ill==="salt")G.L.salt="Aa";
    else if(ill==="thin"){ if(bio==="female")G.X.thin="Aa"; else G.X.thin="aY"; }
    else if(ill==="sweet"){ G.P.metab=-0.5; }
  }catch(e){}
  return G;
}
function drawAttr(){
  var ap=$("attrPool"); if(ap)ap.textContent=poolLeft()+" points left (max +10 each)";
  var spans=document.querySelectorAll("#attrGrid [data-av]");
  for(var i=0;i<spans.length;i++)spans[i].textContent=attrAlloc[spans[i].getAttribute("data-av")];
  var picks=document.querySelectorAll("#traitGrid .pick");
  for(var j=0;j<picks.length;j++){ var cb=picks[j].querySelector("input"); picks[j].classList.toggle("on",!!(cb&&cb.checked)); }
}
function enforceTraits(cb){
  var boxes=document.querySelectorAll('#traitGrid input[data-trait]');
  var pers=0,cong=0,i;
  for(i=0;i<boxes.length;i++){ if(!boxes[i].checked)continue; if(boxes[i].getAttribute("data-cong")==="1")cong++; else pers++; }
  if(cb.checked&&cb.getAttribute("data-cong")!=="1"&&pers>3){ cb.checked=false; toast("🔒 Max 3 personality traits!"); }
  if(cb.checked&&cb.getAttribute("data-cong")==="1"&&cong>1){ cb.checked=false; toast("🔒 Max 1 congenital trait!"); }
  drawAttr();
}
function collectCreateOpts(){
  var bio=$("cBio").value;
  var effBio=bio==="other"?pick(["male","female"]):bio; /* assigned biology drives expression */
  var tr=[]; var boxes=document.querySelectorAll('#traitGrid input[data-trait]:checked');
  for(var i=0;i<boxes.length;i++)tr.push(boxes[i].getAttribute("data-trait"));
  (function(){ var cong=window.GDATA.traits.filter(function(t){return t.congenital;}).map(function(t){return t.id;});
    var p=0, c=0, kept=[];
    for(var i=0;i<tr.length;i++){ var isC=cong.indexOf(tr[i])>=0;
      if(isC){ if(c<1){kept.push(tr[i]); c++;} } else { if(p<3){kept.push(tr[i]); p++;} } }
    tr=kept; })();
  var bg=$("cBg")?$("cBg").value:"humble";
  /* the designed face implies a genome; markers override; the gene gates the look */
  var ap0={skin:$("cSkin").value,eyes:$("cEyes").value,build:$("cBuild").value,
    height:$("cHeight").value,figure:$("cFigure").value,hairstyle:$("cHairstyle").value,
    haircolor:$("cHaircolor").value,hairlen:$("cHairlen").value,face:$("cFace").value,
    facial:$("cFacial").value,marks:$("cMarks").value,style:$("cStyle").value,voice:$("cVoice").value};
  var g0=null;
  try{
    g0=collectGenes(effBio,ap0);
    if(!facialAllowed(effBio,g0))ap0.facial="clean-shaven";
  }catch(e){}
  return {first:$("cFirst").value||"Alex",last:$("cLast").value||"Smith",
    gender:effBio,bioSex:bio,
    genderIdentity:$("cIdent").value,sexuality:$("cSex").value,race:$("cRace").value,
    raceF:$("cRace").value==="Mixed"?$("cRaceF").value:null,raceM:$("cRace").value==="Mixed"?$("cRaceM").value:null,
    dob:geoDOB?(geoDOB.m+"/"+geoDOB.d+"/"+geoDOB.y):"",birthYear:geoDOB?geoDOB.y:new Date().getFullYear(),
    country:geoCountry(),region:geoRegion(),city:geoCity().trim(),religion:$("cRel").value,
    wealth:$("cWealth").value,startAge:parseInt($("cAge").value,10)||0,
    customWorld:$("cWorld").value.trim(),
    noBad:$("cNoBad").checked,focus:"none",unfiltered:true,
    appearance:ap0,genes:g0,
    background:bg,customBg:bg==="custom"?($("cCustomBg")?$("cCustomBg").value.trim():""):"",
    ambition:$("cAmb").value,traits:tr,
    attr:Object.assign({},attrAlloc),
    fate:{nemesis:tr.indexOf("nemesis")>=0,ill:tr.indexOf("frail")>=0,trust:tr.indexOf("trustfund")>=0}};
}
/* ================= era-accurate geography + DOB gating ================= */
var geoDOB=null;
function dateNumYMD(y,m,d){ return y*10000+m*100+d; }
function isoNum(iso){ var p=String(iso).split("-"); return (+p[0])*10000+(+p[1])*100+(+p[2]); }
function parseDOB(str){
  var m=String(str||"").trim().match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/);
  if(!m)return null;
  var mo=+m[1], d=+m[2], y=+m[3]; if(y<100)y=(y<=30?2000+y:1900+y);
  if(mo<1||mo>12||y<1000||y>2100)return null;
  var dim=new Date(y,mo,0).getDate(); if(d<1||d>dim)return null;
  var now=new Date(), ny=now.getFullYear(), nm=now.getMonth()+1, nd=now.getDate();
  if(y>ny||(y===ny&&(mo>nm||(mo===nm&&d>nd))))return null;
  return {y:y,m:mo,d:d};
}
function dobISO(o){ function p(n){return (n<10?"0":"")+n;} return o.y+"-"+p(o.m)+"-"+p(o.d); }
function modernFromOk(name,y){
  var f=window.GDATA.MODERN_FROM[name];
  if(f===undefined)return y>=1800;
  if(typeof f==="number")return y>=f;
  for(var i=0;i<f.length;i++) if(y>=f[i][0]&&y<=f[i][1])return true;
  return false;
}
function histInRange(h,dn){
  var f=isoNum(h.from); if(dn<f)return false;
  if(h.to&&dn>isoNum(h.to))return false;
  return true;
}
function countriesForDate(y,m,d){
  var dn=dateNumYMD(y,m||6,d||15), out=[], seen={};
  for(var i=0;i<window.GDATA.HIST_GEO.length;i++){ var h=window.GDATA.HIST_GEO[i];
    if(histInRange(h,dn)){ out.push(h.name); seen[h.name]=1; } }
  for(var j=0;j<window.GDATA.countries.length;j++){ var c=window.GDATA.countries[j];
    if(!seen[c]&&modernFromOk(c,y))out.push(c); }
  out.sort();
  return out;
}
function histEntityFor(country,dn){
  for(var i=0;i<window.GDATA.HIST_GEO.length;i++){ var h=window.GDATA.HIST_GEO[i];
    if(h.name===country&&(!dn||histInRange(h,dn)))return h; }
  return null;
}
function regionWindow(key){
  var m=String(key).match(/\((?:to (\d{4})|from (\d{4})|(\d{4})\s*[–—-]\s*(\d{4}))\)/);
  if(!m)return null;
  if(m[1])return {from:0,to:+m[1]};
  if(m[2])return {from:+m[2],to:9999};
  return {from:+m[3],to:+m[4]};
}
function regionVisible(key,y){
  if(!y)return true;
  var w=regionWindow(key); if(!w)return true;
  return y>=w.from&&y<=w.to;
}
function geoRegionsFor(country,y){
  if(!country)return null;
  var h=histEntityFor(country,null);
  if(h)return h.regions;
  var mr=window.GDATA.MODERN_REGIONS[country];
  if(mr)return mr;
  return null;
}
function geoCitiesFor(country,region){
  if(!country||!region)return null;
  var regs=geoRegionsFor(country,null);
  if(!regs||regs[region]===undefined)return null;
  return regs[region];
}
function geoCountry(){ var e=$("cCountry"); return e?e.value:""; }
function geoRegion(){
  var s=$("cRegionSel");
  if(s&&!s.hidden&&s.options.length)return s.value;
  var t=$("cRegionTxt"); return t?t.value.trim():"";
}
function geoCity(){
  var s=$("cCitySel");
  if(s&&!s.hidden&&s.options.length)return s.value;
  var t=$("cCity"); return t?(t.value.trim()):"";
}
function dobChanged(fromCal){
  var inp=$("cDOB"), hint=$("cDOBHint");
  var v=inp?inp.value:"";
  var p=parseDOB(v);
  if(!p){
    geoDOB=null;
    var cs=$("cCountry"); if(cs){cs.disabled=true; cs.innerHTML="<option>Set DOB first</option>";}
    ["cRegionSel","cRegionTxt","cCitySel","cCity"].forEach(function(id){var e=$(id); if(e)e.disabled=true;});
    if(hint)hint.textContent=v?"⚠️ Use MM/DD/YYYY (past date).":"Set your DOB to unlock country, region & city.";
    drawStartLine(); return false;
  }
  geoDOB=p;
  var ds=$("cDOBDate"); if(ds&&!fromCal)ds.value=dobISO(p);
  if(hint)hint.textContent="✓ "+inp.value.trim()+" — now pick a country.";
  fillCountries();
  drawStartLine(); return true;
}
function fillCountries(){
  var sel=$("cCountry"); if(!sel||!geoDOB)return;
  var keep=sel.value, list=countriesForDate(geoDOB.y,geoDOB.m,geoDOB.d);
  sel.disabled=false;
  sel.innerHTML=list.map(function(c){return "<option"+(c===keep?" selected":"")+">"+esc(c)+"</option>";}).join("")||"<option>No recorded states — pick nearest</option>";
  ["cRegionSel","cRegionTxt","cCitySel","cCity"].forEach(function(id){var e=$(id); if(e)e.disabled=false;});
  renderGeoControls();
}
function renderGeoControls(){
  var c=geoCountry(), y=geoDOB?geoDOB.y:null;
  var rS=$("cRegionSel"), rT=$("cRegionTxt");
  var regs=geoRegionsFor(c,y);
  var keys=regs?Object.keys(regs).filter(function(k){return regionVisible(k,y);}):null;
  if(keys&&keys.length){
    rS.hidden=false; rT.hidden=true;
    var keep=rS.value;
    rS.innerHTML=keys.map(function(k){return "<option"+(k===keep?" selected":"")+">"+esc(k)+"</option>";}).join("");
  } else {
    rS.hidden=true; rT.hidden=false;
    if(rT&&!rT.value)rT.placeholder="Region / province (free text)";
  }
  renderCityControl();
}
function renderCityControl(){
  var c=geoCountry(), r=geoRegion();
  var cities=geoCitiesFor(c,r);
  var cS=$("cCitySel"), cT=$("cCity");
  if(cities&&cities.length){
    cS.hidden=false; cT.hidden=true;
    cS.innerHTML=cities.map(function(x){return "<option>"+esc(x)+"</option>";}).join("");
  } else {
    cS.hidden=true; cT.hidden=false;
    if(cT&&!cT.value)cT.placeholder="e.g. Muzaffarabad";
  }
}
function drawStartLine(){
  var el=$("cStartLine"); if(!el)return;
  var sa=$("cAge")?parseInt($("cAge").value,10)||0:0;
  el.innerHTML=geoDOB?("▶ Simulation starts <b>"+(geoDOB.y+sa)+"</b> (born "+geoDOB.m+"/"+geoDOB.d+"/"+geoDOB.y+(sa?", taking control at age "+sa:"")+")"):"▶ Set DOB + start age to begin.";
}

/* ================= custom background: AI weighing + fallback ================= */
function bgEssence(){
  if(!S)return "commoner";
  if(S.background==="custom"&&S.customBg)return "a self-written past ("+S.customBg.slice(0,90)+")";
  for(var i=0;i<window.GDATA.backgrounds.length;i++) if(window.GDATA.backgrounds[i].id===S.background) return window.GDATA.backgrounds[i].name;
  return S.background||"commoner";
}
function applyCustomBgFallback(){
  var t=(S.customBg||"").toLowerCase();
  function has(){ for(var i=0;i<arguments.length;i++) if(t.indexOf(arguments[i])>=0)return true; return false; }
  var m={money:0,prestige:5,stats:{}};
  if(has("royal","noble","king","queen","wealth","rich","million","palace")){ m.money+=2000; m.prestige+=40; m.stats.social=(m.stats.social||0)+3; }
  else if(has("poor","street","orphan","slum","beggar","hungry")){ m.money+=100; m.stats.discipline=(m.stats.discipline||0)+4; m.stats.social=(m.stats.social||0)-2; }
  else if(has("scholar","school","teacher","book","library","university")){ m.stats.smarts=(m.stats.smarts||0)+4; }
  else if(has("priest","faith","monk","church","temple","god")){ m.stats.karma=(m.stats.karma||0)+8; }
  else if(has("soldier","war","army","battle","warrior")){ m.stats.fitness=(m.stats.fitness||0)+5; m.stats.discipline=(m.stats.discipline||0)+3; }
  else if(has("merchant","trade","shop","market","business")){ m.money+=800; m.stats.social=(m.stats.social||0)+2; }
  else if(has("artist","music","paint","song","poet")){ m.stats.creativity=(m.stats.creativity||0)+5; }
  else if(has("crime","thief","gang","steal","smuggl")){ m.stats.karma=(m.stats.karma||0)-8; m.stats.discipline=(m.stats.discipline||0)+3; }
  else if(has("tragedy","dead","died","loss","lost","fire","fled","refugee")){ m.stats.karma=(m.stats.karma||0)+4; m.stats.discipline=(m.stats.discipline||0)+3; }
  applyBgMods(m,"your past");
}
function applyBgMods(m,why){
  S.money+=m.money||0; S.prestige=Math.max(0,S.prestige+(m.prestige||0));
  for(var k in (m.stats||{})) if(STAT_KEYS.indexOf(k)>=0) S.stats[k]=clamp100(S.stats[k]+m.stats[k]);
  pushLog(S.age,"📜","The fates weigh "+why+": "+(m.prestige?("+"+m.prestige+" prestige "):"")+(m.money?("+ $"+m.money+" "):"")+"— "+(S.customBg||"").slice(0,120),"event");
  toast("📜 Your past settles into fate.");
  autosave(); render(); refreshDesc();
}
async function aiAdjudicateBg(){
  if(!S||!S.alive||!S.customBg)return;
  var me=S.firstName+" "+S.lastName+", born "+(S.dob||S.birthYear)+" in "+(S.city?S.city+", ":"")+S.country+(S.region?" ("+S.region+")":"");
  var task="A player begins a life sim as "+me+" with this self-written past: \""+S.customBg.slice(0,300)+"\"\nTASK: Weigh it like a seasoned game master. Reply with ONLY a JSON object like {\"money\":500,\"prestige\":20,\"stats\":{\"smarts\":3},\"summary\":\"one vivid sentence on how this past shaped them\"}. money -2000..5000, prestige 0..80, stats any of "+STAT_KEYS.join(", ")+" -8..8 (omit zeros). Fit the era and the text; tragedy/discipline, privilege/prestige, scholarship/smarts, crime/karma-loss.";
  try{
    var res=await aiText({instruction:aiPrompt(task),startWith:"{"});
    if(!S||!S.alive||!S.customBg||S.customBgDone)return;
    var txt=String(res.text||""), o=JSON.parse(txt.slice(txt.indexOf("{"),txt.lastIndexOf("}")+1));
    S.customBgDone=true;
    applyBgMods({money:clamp(typeof o.money==="number"?o.money:0,-2000,5000),prestige:clamp(typeof o.prestige==="number"?o.prestige:0,0,80),stats:o.stats||{}},"your past");
  }catch(e){ if(S&&S.alive&&S.customBg&&!S.customBgDone){ S.customBgDone=true; applyCustomBgFallback(); } }
}

/* ================= beginnings: simulate the start from the rest ================= */
function deriveBeginnings(){
  var bg=bgD(), w=S.familyWealth, t0=S.traits[0]?traitName(S.traits[0]):"an open heart";
  var mems=[
    "Your earliest memory: "+(S.customBg?S.customBg.split(".")[0].slice(0,90):bg.name+" walls, "+(w==="rich"?"warm milk and music":(w==="poor"?"cold floors and loud love":"bread, chores, laughter")))+".",
    (w==="rich"?"Servants hush when you enter. You learn to listen at doors.":(w==="poor"?"You learn young which neighbors share soup. You never forget.":"Dinner-table arguments about money teach you arithmetic early.")),
    "They say you were born "+t0.toLowerCase()+" — the village still talks about your first steps.",
    (S.familyWealth==="rich"?"A tutor declares you 'promising, if wild.'":(hasTrait("genius")?"You read before you can tie your shoes.":(hasTrait("gregarious")?"You befriend every stray dog on the street.":"You watch the world like it owes you an explanation.")))
  ];
  pushLog(0,"🍼",mems[0]);
  pushLog(0,"🌱",pick(mems.slice(1)));
  if(S.customBg)pushLog(0,"✍️","Your past, in your words: \""+S.customBg.slice(0,140)+"\"");
}

/* ================= focus system: era+background generated, dictated, situational ================= */
function eraOf(y){ return y<500?"ancient":(y<1400?"medieval":(y<1800?"earlymodern":(y<1945?"industrial":(y<2000?"modern":"digital")))); }
function focusDef(id){
  if(!id)return null;
  for(var i=0;i<window.GDATA.lifestyles.length;i++) if(window.GDATA.lifestyles[i].id===id) return window.GDATA.lifestyles[i];
  if(window.GDATA.FOCUS_X) for(var j=0;j<window.GDATA.FOCUS_X.length;j++) if(window.GDATA.FOCUS_X[j].id===id) return window.GDATA.FOCUS_X[j];
  if(S&&S.customFocuses) for(var k=0;k<S.customFocuses.length;k++) if(S.customFocuses[k].id===id) return S.customFocuses[k];
  return null;
}
function focusTag(){ var d=focusDef(S?S.lifestyle:"none"); return d?(d.tag||d.id):"none"; }
function buildFocusList(birthYear,bg){
  var era=eraOf(birthYear||2000), out=[], seen={};
  function add(id){ if(!seen[id]){seen[id]=1; out.push(id);} }
  var classics=["scholar","athlete","socialite","mogul","artist","ascetic"];
  var matched=(window.GDATA.FOCUS_X||[]).filter(function(f){ return f.eras.indexOf(era)>=0; });
  matched.filter(function(f){return f.bg&&f.bg.indexOf(bg)>=0;}).forEach(function(f){add(f.id);});
  classics.forEach(add);
  matched.filter(function(f){return !(f.bg&&f.bg.indexOf(bg)>=0);}).forEach(function(f){add(f.id);});
  return out;
}
function setFocus(id,quiet){
  var d=focusDef(id); if(!d)return;
  S.lifestyle=id;
  if(!quiet){
    pushLog(S.age,"🎯","New focus: "+d.icon+" "+d.name+" — "+d.desc,"event");
    toast("🎯 Focus: "+d.icon+" "+d.name);
  }
  autosave(); render();
}
function openFocusModal(){
  if(!S||!S.alive)return;
  renderFocusModal(); openModal("focusModal");
}
function renderFocusModal(){
  var box=$("focusList"); if(!box||!S)return;
  var list=S.focusList&&S.focusList.length?S.focusList:["scholar","athlete","socialite","mogul","artist","ascetic"];
  box.innerHTML="";
  list.forEach(function(id){
    var d=focusDef(id); if(!d)return;
    var el=document.createElement("div"); el.className="slot";
    el.innerHTML='<div class="grow"><b>'+d.icon+" "+esc(d.name)+'</b><small>'+esc(d.desc)+(S.lifestyle===id?" · <b>ACTIVE</b>":"")+'</small></div>';
    var b=document.createElement("button"); b.className="mini"+(S.lifestyle===id?" gold":""); b.textContent=S.lifestyle===id?"Active":"Set focus";
    b.onclick=function(){ setFocus(id); closeModal("focusModal"); };
    el.appendChild(b); box.appendChild(el);
  });
  var era=$("focusEra"); if(era)era.textContent="Era: "+eraOf(S.birthYear)+" · "+(S.focusList?S.focusList.length:6)+" paths";
}
async function dictateFocus(){
  var inp=$("focusDictate"); if(!S||!S.alive||!inp)return;
  var txt=(inp.value||"").trim(); if(!txt){ toast("✍️ Type what to focus on first!"); return; }
  inp.value=""; toast("🧭 The fates consider \""+txt.slice(0,60)+"\"…");
  var list=S.focusList||[];
  var avail=list.map(function(id){var d=focusDef(id); return d?d.icon+" "+d.name+" ("+id+"): "+d.desc:"";}).filter(Boolean).join(" | ").slice(0,1200);
  var task="Player dictates a new life focus: \""+txt+"\"\nAvailable focuses: "+avail+"\nPlayer: "+S.firstName+", age "+S.age+", traits ["+S.traits.join(", ")+"], job "+jobName()+". Situation: "+aiLogTail(3)+"\nTASK: Decide. If the order matches an available focus, reply {\"action\":\"assign\",\"id\":\"...\",\"reason\":\"...\"}. If it is genuinely new but sane, reply {\"action\":\"create\",\"focus\":{\"name\":\"...\",\"icon\":\"emoji\",\"desc\":\"...\",\"tick\":{\"stat\":2}},\"reason\":\"...\"} with tick any of "+STAT_KEYS.join(", ")+" (1-4 total). If it is absurd/impossible, assign the closest available instead. ONLY the JSON object.";
  try{
    var res=await aiText({instruction:aiPrompt(task),startWith:"{"});
    var o=JSON.parse(String(res.text||"").slice(String(res.text||"").indexOf("{"),String(res.text||"").lastIndexOf("}")+1));
    if(o.action==="assign"&&focusDef(o.id)){ setFocus(o.id); toast("🧭 "+(o.reason||"It is decided.")); closeModal("focusModal"); return; }
    if(o.action==="create"&&o.focus&&o.focus.name){
      var f={id:"cx"+Date.now(),icon:String(o.focus.icon||"🧭").slice(0,4),name:String(o.focus.name).slice(0,40),desc:String(o.focus.desc||"A self-declared path.").slice(0,140),tick:{},tag:null,eras:[],bg:null};
      var tk=o.focus.tick||{}, sum=0;
      for(var k in tk) if(STAT_KEYS.indexOf(k)>=0&&sum<4){ var v=clamp(Math.round(tk[k])||0,0,4); if(v>0){f.tick[k]=v; sum+=v;} }
      if(!S.customFocuses)S.customFocuses=[];
      S.customFocuses.push(f); S.focusList.push(f.id);
      setFocus(f.id); toast("🧭 New focus forged: "+f.icon+" "+f.name+(o.reason?" — "+o.reason:""));
      closeModal("focusModal"); return;
    }
    throw new Error("bad shape");
  }catch(e){
    var low=txt.toLowerCase(), best=null;
    var all=(window.GDATA.lifestyles.concat(window.GDATA.FOCUS_X||[]));
    for(var i=0;i<all.length;i++){ var d=all[i];
      if(low.indexOf(d.id)>=0||low.indexOf(d.name.toLowerCase())>=0){best=d.id;break;} }
    if(!best){
      if(low.match(/muscl|gym|fit|sport|fight|run/))best="athlete";
      else if(low.match(/stud|learn|school|book|read|science/))best="scholar";
      else if(low.match(/money|rich|business|work|career|hustle/))best="mogul";
      else if(low.match(/friend|party|people|love|fame|social/))best="socialite";
      else if(low.match(/art|music|paint|write|song|draw/))best="artist";
      else if(low.match(/god|faith|pray|karma|peace|calm|meditat/))best="ascetic";
    }
    if(best&&(S.focusList||[]).indexOf(best)<0){S.focusList.push(best);}
    if(best){ setFocus(best); closeModal("focusModal"); }
    else toast("🧭 The fates shrug — pick a listed focus.");
  }
}
function pickFocusForSituation(){
  var list=S.focusList||["scholar","athlete","socialite","mogul","artist","ascetic"];
  function has(id){return list.indexOf(id)>=0?id:null;}
  if(S.flags.student)return has("scholar")||has("computing")||list[0];
  if((!S.jobId||S.jobId==="unemployed")&&S.age>=18)return has("mogul")||has("stewardship")||has("trade")||list[0];
  if(S.stats.health<40)return has("healer")||has("athlete")||list[0];
  if(S.stats.happiness<30)return has("kinship")||has("socialite")||list[0];
  if(S.stats.karma<20)return has("devotion")||has("ascetic")||list[0];
  return list[Math.floor(Math.random()*list.length)];
}
var focusAiBusy=false;
async function aiAutoFocus(){
  if(focusAiBusy||!S||!S.alive)return;
  if(S.lifestyle&&S.lifestyle!=="none")return;
  focusAiBusy=true;
  var list=S.focusList||[];
  var avail=list.map(function(id){var d=focusDef(id); return d?d.icon+" "+d.name+" ("+id+")":"";}).filter(Boolean).join(" | ").slice(0,900);
  var task="The player's life lacks direction (no focus). Player: "+S.firstName+", age "+S.age+", traits ["+S.traits.join(", ")+"], job "+jobName()+", money $"+S.money+". Recent life: "+aiLogTail(4)+"\nAvailable focuses: "+avail+"\nTASK: Is a focus NECESSARY now? If yes, reply with ONLY a JSON object like {\"id\":\"...\",\"reason\":\"one sentence\"} picking the single best fit. If life is fine undirected, reply {\"id\":\"none\",\"reason\":\"...\"}.";
  try{
    var res=await aiText({instruction:aiPrompt(task),startWith:"{"});
    var txt=String(res.text||""), o=JSON.parse(txt.slice(txt.indexOf("{"),txt.lastIndexOf("}")+1));
    if(o.id&&o.id!=="none"&&focusDef(o.id)){
      pushLog(S.age,"🧭","Life calls you toward "+focusDef(o.id).icon+" "+focusDef(o.id).name+": "+(o.reason||"the moment demands it")+".","event");
      setFocus(o.id,true); toast("🧭 New focus: "+focusDef(o.id).icon+" "+focusDef(o.id).name);
    }
  }catch(e){
    var f=pickFocusForSituation(); if(f){ setFocus(f,true); toast("🧭 Life pushes you toward "+(focusDef(f)?focusDef(f).name:f)+"."); }
  }
  focusAiBusy=false;
}


LL.files.push("creator"); /* end-of-file registration: counts as loaded only after this file fully ran */