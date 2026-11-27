/* LIFE & LEGACY — engine/appearance.js
 * SECTION 2 appearance DNA.
 * Split of src/game.js (mechanical, behavior-identical). Load order = index.html order.
 * Shared scope: classic scripts, globals (S, LL, GDATA, EVENTS). See src/content/index.json (Phase 5).
 */
"use strict";
window.LL=(window.LL||{v:1,files:[]});
/* ============ SECTION 2 — appearance DNA v2 (every axis matters; race is stat-neutral) ============ */
var SKINS=["porcelain skin","alabaster skin","warm fair skin","rosy fair skin","freckled fair skin","light olive skin","medium beige skin","tanned beige skin","sun-kissed skin","golden tan skin","honey skin","bronze skin","copper skin","olive-brown skin","warm brown skin","ash brown skin","reddish-brown skin","deep brown skin","rich ebony skin","cool ebony skin"];
var HAIRS=["short black hair","long dark wavy hair","curly brown hair","straight blonde hair","auburn shoulder-length hair","tight coily black hair","silver-streaked dark hair","shaved head","wavy chestnut hair","sleek straight black hair"];
var EYES=["deep brown eyes","light brown eyes","dark round eyes","large expressive brown eyes","hazel eyes","gold-flecked hazel eyes","green eyes","upturned green eyes","blue-grey eyes","ice-blue eyes","steel grey eyes","deep-set grey eyes","dark almond eyes","hooded brown eyes","monolid dark eyes","warm amber eyes","heterochromia (brown & green eyes)","heterochromia (blue & brown eyes)"];
var BUILDS=["lean build","slender build","wiry build","athletic build","muscular build","powerful build","brawny build","stocky build","soft build","heavyset build","petite frame","tall lanky frame"];
/* ---- extended designer axes (race names; race itself is stat-neutral by design) ---- */
var RACES=["Black","White","East Asian","South Asian","Southeast Asian","Middle Eastern","Latino","Pacific Islander","Indigenous","Mixed","Other"];
var RACES_MIXABLE=["Black","White","East Asian","South Asian","Southeast Asian","Middle Eastern","Latino","Pacific Islander","Indigenous"];
var HEIGHTS=["very short","short","below average","average","above average","tall","very tall"];
var FIGURES=["slim","athletic-toned","curvy","hourglass","pear-shaped","rectangular","broad-shouldered","willowy","barrel-chested","full-figured"];
var HAIRSTYLES=["straight","wavy","curly","coily","twists","cornrows","braids","dreadlocks","afro","pixie cut","bob","long loose waves","ponytail","topknot","bun","side part","buzz cut","fade","undercut","slicked back","mohawk","wolf cut","messy","balding"];
var HAIRCOLORS=["jet black","dark brown","chestnut","light brown","ash blonde","dirty blonde","golden blonde","platinum blonde","strawberry blonde","red","copper","auburn","grey","white","salt-and-pepper","silver-white","dyed blue","dyed pink","dyed green","pastel purple","crimson red","teal"];
var HAIRLENS=["shaved/bald","very short","short","chin-length","medium","shoulder-length","long","very long"];
var FACES=["round face","oval face","oblong face","square jaw","chiseled jaw","heart-shaped face","diamond face","long face","baby face","high forehead","soft features","sharp cheekbones"];
var FACIALS=["clean-shaven","stubble shadow","light stubble","heavy stubble","soul patch","goatee","chinstrap","mustache","short boxed beard","full beard","long beard"];
var MARKS=["none","freckles","dimples","mole","beauty mark","cleft chin","birthmark","vitiligo patches","acne scars","facial scar","burn scar","nose ring","eyebrow piercing","lip ring","piercings","neck tattoo","hand tattoo","tattoo sleeve","full tattoos"];
var STYLES=["scruffy","neat","fashionable","flashy","streetwear","preppy","business-casual","classic","sporty","minimalist","bohemian","vintage","punk","alt/goth"];
var VOICES=["soft voice","high-pitched voice","clear voice","melodic voice","husky voice","breathy voice","deep voice","commanding voice","gravelly voice","raspy voice","accented voice","nasal voice"];
var SKIN_BY_RACE={"Black":["deep brown skin","rich ebony skin","cool ebony skin","warm brown skin","reddish-brown skin","ash brown skin","medium beige skin"],"White":["porcelain skin","alabaster skin","warm fair skin","rosy fair skin","freckled fair skin","light olive skin","sun-kissed skin","medium beige skin"],"East Asian":["porcelain skin","alabaster skin","light olive skin","medium beige skin","tanned beige skin","warm fair skin"],"South Asian":["golden tan skin","honey skin","copper skin","medium beige skin","warm brown skin","deep brown skin"],"Southeast Asian":["golden tan skin","honey skin","bronze skin","light olive skin","medium beige skin","tanned beige skin"],"Middle Eastern":["light olive skin","olive-brown skin","golden tan skin","bronze skin","copper skin","sun-kissed skin","medium beige skin"],"Latino":["golden tan skin","honey skin","bronze skin","copper skin","sun-kissed skin","medium beige skin","light olive skin"],"Pacific Islander":["golden tan skin","bronze skin","sun-kissed skin","warm brown skin","deep brown skin","medium beige skin"],"Indigenous":["golden tan skin","copper skin","warm brown skin","reddish-brown skin","medium beige skin","deep brown skin"]};
var HAIRCOL_BY_RACE={"Black":["jet black","dark brown"],"White":["dark brown","chestnut","light brown","ash blonde","dirty blonde","golden blonde","platinum blonde","strawberry blonde","red","copper","auburn","jet black"],"East Asian":["jet black","dark brown"],"South Asian":["jet black","dark brown","chestnut"],"Southeast Asian":["jet black","dark brown"],"Middle Eastern":["jet black","dark brown","chestnut","light brown"],"Latino":["jet black","dark brown","chestnut","light brown","copper"],"Pacific Islander":["jet black","dark brown"],"Indigenous":["jet black","dark brown"]};
/* vivid (unnatural) hair colors: stripped from kids, flagged in compliments */
var VIVID_HAIR=["pastel purple","crimson red","teal"];
function isVividHair(c){ c=String(c||""); if(c.indexOf("dyed")===0)return true; return VIVID_HAIR.indexOf(c)>=0; }
function isGreyHair(c){ c=String(c||""); return c==="grey"||c==="white"||c==="silver-white"||c==="salt-and-pepper"; }
function raceSkins(race,raceF,raceM){
  if(race==="Mixed"){ var p=(SKIN_BY_RACE[raceF]||SKINS).concat(SKIN_BY_RACE[raceM]||SKINS); return p.length?p:SKINS; }
  return SKIN_BY_RACE[race]||SKINS;
}
function raceHaircols(race,raceF,raceM){
  if(race==="Mixed"){ var p=(HAIRCOL_BY_RACE[raceF]||HAIRCOLORS).concat(HAIRCOL_BY_RACE[raceM]||HAIRCOLORS); return p.length?p:HAIRCOLORS; }
  return HAIRCOL_BY_RACE[race]||HAIRCOLORS;
}
function raceLabel(){
  if(!S)return "Mixed";
  if(S.race==="Mixed"&&S.raceF)return "Mixed ("+S.raceF+" × "+S.raceM+")";
  return S.race||"Mixed";
}
function genAppearance(gender,race,raceF,raceM){
  var sk=raceSkins(race,raceF,raceM);
  var hc=raceHaircols(race,raceF,raceM).filter(function(c){ return !isVividHair(c)&&!isGreyHair(c); });
  if(!hc.length)hc=["dark brown"];
  var col=pick(hc);
  return { skin:pick(sk), hair:pick(HAIRS), eyes:pick(EYES), build:pick(BUILDS),
    height:pick(HEIGHTS), figure:pick(FIGURES), hairstyle:pick(["straight","wavy","curly","coily","twists","cornrows","afro","braids","pixie cut","bob","long loose waves","side part","ponytail","topknot","bun","messy"]), haircolor:col,
    hairlen:pick(["shaved/bald","very short","short","chin-length","medium","shoulder-length"]), face:pick(FACES),
    facial:"clean-shaven",
    marks:rnd()<0.86?"none":pick(["birthmark","vitiligo patches","freckles","dimples","mole","cleft chin"]), style:pick(STYLES), voice:pick(["soft voice","clear voice","melodic voice","husky voice","high-pitched voice"]) };
}
/* adult-only styling: never on young faces */
var ADULT_MARKS=["tattoo sleeve","full tattoos","piercings","nose ring","eyebrow piercing","lip ring","neck tattoo","hand tattoo","facial scar","burn scar"];
var ADULT_HAIR=["mohawk","wolf cut"];
/* babies are born clean: strip adult features a designer (or fate) put on a young face */
function sanitizeApForAge(){
  if(!S||!S.appearance||S.age>=13)return;
  var ap=S.appearance;
  ap.facial="clean-shaven";
  if(isVividHair(ap.haircolor))ap.haircolor="dark brown";
  if(ADULT_MARKS.indexOf(ap.marks)>=0)ap.marks="none";
  if(ADULT_HAIR.indexOf(ap.hairstyle)>=0)ap.hairstyle="messy";
  if(ap.hairlen==="very long")ap.hairlen="long";
}
/* facial hair arrives with puberty, never before — males only */
function facialEmergence(){
  if(!S||!S.appearance||S.gender==="female")return;
  var ap=S.appearance;
  if(S.age===15&&ap.facial==="clean-shaven"){ ap.facial="light stubble"; pushLog(S.age,"🪒","Peach fuzz arrives. The mirror gets interesting.","event"); }
  else if(S.age===22&&ap.facial==="light stubble"&&rnd()<0.3){ ap.facial=pick(["heavy stubble","goatee","full beard"]); pushLog(S.age,"🪒","Your facial hair fills in: "+ap.facial+".","event"); }
}
/* stat weights per axis (race deliberately absent: looks never gatekeep heritage) */
var APPEAR_MODS={
  height:{"very short":{fitness:-2,looks:1,discipline:2},"short":{fitness:-1,discipline:1},"below average":{fitness:1},"average":{},"above average":{fitness:2,looks:1},"tall":{fitness:3,looks:2},"very tall":{fitness:4,looks:2,social:2}},
  figure:{"slim":{looks:2,fitness:2},"athletic-toned":{fitness:4,looks:2},"curvy":{looks:4,social:2},hourglass:{looks:4,social:2},"pear-shaped":{looks:2,happiness:1},rectangular:{fitness:1,discipline:1},"broad-shouldered":{fitness:3,discipline:1},"willowy":{looks:3},"barrel-chested":{health:2,fitness:2},"full-figured":{looks:2,happiness:2,fitness:-2}},
  face:{"round face":{social:2,happiness:1},"oval face":{looks:2},"oblong face":{looks:1},"square jaw":{looks:2,discipline:2},"chiseled jaw":{looks:3,discipline:1},"heart-shaped face":{looks:2,social:1},"diamond face":{looks:2},"long face":{looks:1},"baby face":{social:2,happiness:1},"high forehead":{smarts:1},"soft features":{social:1},"sharp cheekbones":{looks:3}},
  facial:{"clean-shaven":{social:2},"stubble shadow":{looks:2},"light stubble":{looks:3},"heavy stubble":{looks:2},"soul patch":{creativity:2},goatee:{looks:1,creativity:2},chinstrap:{looks:1},mustache:{discipline:1},"short boxed beard":{looks:2,discipline:1},"full beard":{looks:2,discipline:2},"long beard":{discipline:3,social:-1}},
  marks:{"none":{},freckles:{looks:2,social:1},dimples:{looks:2,social:2},mole:{looks:1},"beauty mark":{looks:3},"cleft chin":{looks:2},"facial scar":{discipline:3,social:-1},"tattoo sleeve":{creativity:5,social:-2},"full tattoos":{creativity:6,social:-3},piercings:{creativity:4,social:2},"nose ring":{creativity:3,social:1},"eyebrow piercing":{creativity:3},"lip ring":{creativity:3,social:-1},"neck tattoo":{creativity:4,social:-2},"hand tattoo":{creativity:4,social:-2},"vitiligo patches":{discipline:3},birthmark:{discipline:2},"burn scar":{discipline:3,social:-1},"acne scars":{discipline:1,social:-1}},
  style:{scruffy:{creativity:3,looks:-3,social:-2},neat:{discipline:3,social:2},fashionable:{looks:4,social:3},flashy:{looks:3,social:4},streetwear:{creativity:2,social:2},preppy:{social:2,discipline:1},"business-casual":{social:2,discipline:2},classic:{discipline:2,social:2},sporty:{fitness:4,looks:1},minimalist:{discipline:2},bohemian:{creativity:4},vintage:{creativity:2,looks:1},punk:{creativity:4,social:-2},"alt/goth":{creativity:5,social:-2}},
  voice:{"soft voice":{social:1},"high-pitched voice":{social:-1},"clear voice":{social:3},"melodic voice":{social:3,creativity:2},"husky voice":{social:2,creativity:1},"breathy voice":{social:1},"deep voice":{social:3,discipline:1},"commanding voice":{social:4,discipline:2},"gravelly voice":{discipline:1},"raspy voice":{creativity:2,social:1},"accented voice":{social:1},"nasal voice":{social:-3}},
  hairlen:{"shaved/bald":{discipline:1},"very short":{discipline:1},short:{},"chin-length":{looks:1},medium:{looks:1},"shoulder-length":{looks:1,creativity:1},long:{looks:2,creativity:1},"very long":{looks:2,creativity:2,discipline:-1}},
  haircolor:{"dyed blue":{creativity:3,social:-1},"dyed pink":{creativity:3,social:-1},"dyed green":{creativity:3,social:-1},"pastel purple":{creativity:3,social:-1},"crimson red":{creativity:3},teal:{creativity:3,social:-1},"salt-and-pepper":{discipline:1},red:{social:1},copper:{social:1},"strawberry blonde":{social:1},auburn:{social:1}},
  hairstyle:{mohawk:{creativity:2,social:-1},"wolf cut":{creativity:2,social:-1},"pixie cut":{looks:2,creativity:1},bob:{looks:1},"buzz cut":{discipline:2},fade:{looks:1},undercut:{creativity:2},topknot:{discipline:1},twists:{creativity:1},cornrows:{creativity:1},"side part":{discipline:1},"long loose waves":{looks:2},dreadlocks:{creativity:2},"slicked back":{discipline:1},bun:{discipline:1},ponytail:{discipline:1}}
};
function appearMods(ap){
  var out={}, ax;
  for(ax in APPEAR_MODS){ var d=(APPEAR_MODS[ax]||{})[ap&&ap[ax]||""]; if(!d)continue; for(var k in d)out[k]=(out[k]||0)+d[k]; }
  return out;
}
function applyAppearanceMods(t){
  var m=appearMods(t.appearance||{});
  for(var k in m) if(STAT_KEYS.indexOf(k)>=0) t.stats[k]=clamp100(t.stats[k]+m[k]);
}
/* one-line + full-prompt appearance text (legacy saves fall back to old hair string) */
function hairPhrase(ap){
  if(!ap)return "short hair";
  if(ap.hairlen==="shaved/bald"||ap.hairstyle==="shaved head")return "shaved head";
  if(ap.hairstyle)return (ap.hairlen||"short")+" "+(ap.haircolor||"dark")+" "+ap.hairstyle+" hair";
  return ap.hair||"short hair";
}
function appearancePrompt(){
  var ap=(S&&S.appearance)||{};
  var bits=[ap.height||"average-height",ap.build||"average build"];
  if(ap.figure)bits.push("with a "+ap.figure+" figure");
  if(ap.face)bits.push(ap.face);
  if(ap.facial&&ap.facial!=="clean-shaven")bits.push(ap.facial);
  if(ap.marks&&ap.marks!=="none")bits.push(ap.marks==="piercings"?"facial piercings":ap.marks);
  bits.push(hairPhrase(ap));
  if(ap.eyes)bits.push(ap.eyes);
  if(ap.skin)bits.push(ap.skin);
  if(ap.style)bits.push(ap.style+" style");
  return bits.join(", ");
}
function subjWord(){
  if(!S)return "person";
  if(S.age<13)return S.gender==="female"?"girl":"boy";
  return S.gender==="female"?"woman":"man";
}
/* age-safe appearance string for IMAGE prompts: no beards on babies, no ink on kids */
function promptAppearance(){
  var ap=(S&&S.appearance)||{}, bits=[];
  bits.push(ap.height||"average-height",ap.build||"average build");
  if(ap.figure)bits.push("with a "+ap.figure+" figure");
  if(ap.face)bits.push(ap.face);
  var kid=S&&S.age<13;
  if(!kid&&ap.facial&&ap.facial!=="clean-shaven")bits.push(ap.facial);
  if(ap.marks&&ap.marks!=="none"){
    if(kid&&ADULT_MARKS.indexOf(ap.marks)>=0){
      if(ap.marks==="piercings"||ap.marks==="nose ring"||ap.marks==="eyebrow piercing"||ap.marks==="lip ring")bits.push("small earrings");
    }
    else bits.push(ap.marks==="piercings"?"small earrings":ap.marks);
  }
  bits.push(kid?kidHair(ap):hairPhrase(ap));
  if(ap.eyes)bits.push(ap.eyes);
  if(ap.skin)bits.push(ap.skin);
  if(ap.style)bits.push(ap.style+" style");
  return bits.join(", ");
}
function kidHair(ap){
  if(!ap)return "short hair";
  if(ap.hairlen==="shaved/bald")return "shaved head";
  var col=String(ap.haircolor||"dark"); if(isVividHair(col)||isGreyHair(col))col="dark brown";
  return ((ap.hairlen||"short")+" "+col+" "+(ap.hairstyle||"straight")+" hair");
}
/* identity lock: short, face-first descriptor reused by every painter so the
 * model keeps rendering the SAME person. Identity leads, scene follows. */
function identityLock(){
  if(!S)return "the same person";
  var ap=(S&&S.appearance)||{};
  var face=[ap.eyes||"",ap.skin||"",hairPhrase(ap)].filter(function(x){return x;}).join(", ");
  return "the SAME "+ageWord(S.age)+" "+raceLabel()+" "+subjWord(S)+" as every other portrait of "+S.firstName+" "+S.lastName+" (same face, "+(face||"same features")+")";
}
function npcSubj(n){
  var w=n.age<2?"newborn baby":(n.age<5?"toddler":(n.age<13?(n.sex==="female"?"girl":"boy"):(n.sex==="female"?"woman":"man")));
  return "a "+w;
}
/* NPCs notice looks: yearly reactions + befriending kickers */
function apprCompliment(){
  if(!S||!S.alive||S.age<4)return;
  if(rnd()>0.30)return;
  var ap=S.appearance||{}, c=[];
  if(ap.marks==="tattoo sleeve"||ap.marks==="full tattoos")c.push(["🎨","A stranger stops you: \"Sick ink! Who's your artist?\" Strangers buy your story.",{happiness:3,creativity:1}]);
  if(ap.marks==="piercings")c.push(["✨","Your piercings catch the light — three compliments before lunch.",{happiness:2,social:2}]);
  if(ap.facial==="full beard"||ap.facial==="long beard")c.push(["🧔","Someone calls your beard 'majestic'. You stand a little taller.",{happiness:3}]);
  if(ap.haircolor&&isVividHair(ap.haircolor)){c.push(["🌈","Your "+ap.haircolor+" hair turns heads all day.",{happiness:2,social:1}]);}
  if(ap.height==="very tall")c.push(["🦒","You help three strangers reach top shelves. Hero status.",{social:2,happiness:1}]);
  if(String(ap.eyes||"").indexOf("heterochromia")===0)c.push(["👁️","A stranger is mesmerized by your two-colored eyes. You explain, twice.",{social:2,happiness:2}]);
  if(ap.marks==="dimples")c.push(["😊","Your dimples end two arguments and start one friendship.",{social:2,happiness:2}]);
  if(ap.marks==="mole"||ap.marks==="beauty mark")c.push(["✨","Someone calls your beauty mark iconic. You believe them.",{happiness:2}]);
  if(ap.voice==="commanding voice")c.push(["📣","Your voice carries across the room — people listen.",{social:2}]);
  if(ap.voice==="melodic voice")c.push(["🎵","You hum in line and two strangers join in. Lovely.",{happiness:3}]);
  if(ap.style==="flashy"||ap.style==="fashionable")c.push(["📸","A street-style blog photographs your outfit.",{happiness:3}]);
  if(ap.style==="alt/goth")c.push(["🤘","Someone with the same vibe nods at you. Tribe recognized.",{social:2}]);
  if(ap.marks==="facial scar"||ap.marks==="burn scar")c.push(["💪","A kid asks about your scar. Your story makes them brave.",{happiness:2,karma:2}]);
  if(ap.marks==="vitiligo patches"||ap.marks==="birthmark")c.push(["💛","A child with the same marks says you made them feel normal.",{happiness:3,karma:4}]);
  if(!c.length&&S.stats.looks>=70)c.push(["😍","Strangers keep glancing your way. Good genes, good day.",{happiness:2}]);
  if(!c.length)return;
  var w=pick(c);
  for(var k in w[2]){ if(k==="karma")gainStat("karma",w[2][k]); else S.stats[k]=clamp100((S.stats[k]||50)+w[2][k]); }
  pushLog(S.age,w[0],w[1],"good");
}
function apprKicker(){
  if(!S||rnd()>0.35)return "";
  var ap=S.appearance||{}, c=[];
  if(ap.haircolor&&isVividHair(ap.haircolor))c.push("\"Love the "+ap.haircolor+" hair,\" they say.");
  if(ap.marks==="tattoo sleeve"||ap.marks==="full tattoos")c.push("\"Your tattoos are unreal,\" they admit.");
  if(ap.voice==="commanding voice"||ap.voice==="deep voice")c.push("Your voice alone wins them over.");
  if(ap.style==="flashy"||ap.style==="fashionable")c.push("Your outfit does half the talking.");
  if(ap.marks==="piercings")c.push("\"Cool piercings,\" they grin.");
  if(!c.length)return "";
  return " "+pick(c);
}
function ageWord(a){
  if(a<2) return "newborn baby"; if(a<5) return "toddler"; if(a<10) return "young child";
  if(a<13) return "preteen child"; if(a<18) return "teenager"; if(a<26) return "young adult";
  if(a<36) return "adult in their early thirties"; if(a<46) return "middle-aged adult";
  if(a<60) return "mature adult in their fifties"; if(a<72) return "senior"; return "very elderly person";
}
function attireFor(){
  var j=S.jobId||"unemployed";
  if(j==="doctor"||j==="nurse") return "wearing medical scrubs with a stethoscope";
  if(j==="soldier"||j==="police") return "wearing a crisp service uniform";
  if(j==="athlete") return "wearing athletic sportswear";
  if(j==="chef") return "wearing a chef coat";
  if(j==="mayor"||j==="senator"||j==="exec"||j==="ceo"||j==="judge"||j==="lawyer") return "wearing an elegant tailored suit";
  if(j==="pilot") return "wearing a pilot uniform with epaulettes";
  if(j==="influencer"||j==="model"||j==="actor"||j==="streamer"||j==="musician"||j==="director") return "wearing fashionable streetwear";
  if(S.flags.student) return "wearing casual student clothes with a backpack";
  if(S.age<13) return "wearing cute casual kid clothes";
  if(S.assets.houseId==="mansion"||S.assets.houseId==="island") return "wearing luxurious smart-casual clothes";
  return "wearing simple everyday clothes";
}


LL.files.push("appearance"); /* end-of-file registration: counts as loaded only after this file fully ran */