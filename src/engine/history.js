/* LIFE & LEGACY — engine/history.js
 * Historical-year engine (data + lookup). Gives every calendar year a distinct
 * real-world flavour headline, shown in the World tab ("This year in history")
 * and available to AI prompts. Pure data + two functions; no save touched.
 * Load order: after yearly.js (needs nothing, but boot order lists it there).
 * Shared scope: classic scripts, globals.
 */
"use strict";
window.LL=(window.LL||{v:1,files:[]});
/* Year -> headlines. One line per year 1900-2070; marquee years get extras.
 * Kept to broad, durable real-world flavour (no living-person claims). */
var HIST_YEARS={
1900:["A new century dawns; cities glow with new electric light."],
1901:["Wireless signals cross the ocean for the first time."],
1902:["Moving pictures flicker in nickelodeons everywhere."],
1903:["The first powered flight lifts off a windy beach."],
1904:["Subways rumble beneath the great cities."],
1905:["Physics rewrites the universe on paper."],
1906:["Radio voices crackle over the airwaves."],
1907:["Plastics begin their quiet conquest of everything."],
1908:["The Model T rolls out; the horse era starts fading."],
1909:["North Pole fever grips the front pages."],
1910:["Neon signs buzz to life on main streets."],
1911:["Explorers race for the bottom of the world."],
1912:["A great liner sinks; the world mourns and reforms sea law."],
1913:["Assembly lines pick up speed; goods get cheap."],
1914:["War engulfs Europe; the old order cracks."],
1915:["Trenched stalemate; nurses and medics become heroes."],
1916:["The home front rations, saves, and waits."],
1917:["Revolutions redraw the eastern map."],
1918:["War ends; a flu pandemic circles the globe."],
1919:["Prohibition begins; jazz gets louder."],
1920:["Radio stations bloom; everyone tunes in."],
1921:["Insulin is discovered; despair turns to hope for millions."],
1922:["Tut's tomb opens; Egyptomania sweeps fashion."],
1923:["Time zones of the air age begin; airmail stitches continents."],
1924:["The Winter Games debut in the Alps."],
1925:["Television is demonstrated in a laboratory."],
1926:["A pilot crosses the Atlantic alone, nonstop."],
1927:["Talking pictures arrive; silence leaves the cinema."],
1928:["Penicillin is noticed in a petri dish; the future of medicine shifts."],
1929:["The market crashes; breadlines form."],
1930:["Depression deepens; radio comedy keeps spirits up."],
1931:["Skyscrapers race upward despite the hard times."],
1932:["The long slump grinds on; public works begin."],
1933:["New deals, new hopes; gold leaves the standard."],
1934:["Dust storms darken the plains; many head west."],
1935:["Radar, nylon, and the first canned beer: the future leaks in."],
1936:["The Games play on under gathering clouds."],
1937:["The great airships burn out; airplanes inherit the sky."],
1938:["Nylon stockings and xeroxed dreams of plenty."],
1939:["War returns to Europe; cities black out."],
1940:["Blitz nights; radar watches the skies."],
1941:["The war goes global; factories never sleep."],
1942:["Ration books, victory gardens, swing music."],
1943:["Penicillin reaches the front; countless lives saved."],
1944:["Beaches stormed at dawn; the tide turns."],
1945:["The war ends; the atomic age begins in a flash."],
1946:["Baby boom: maternity wards overflow with hope."],
1947:["Transistors whisper; the computer age stirs."],
1948:["Supermarkets and suburbs reshape daily life."],
1949:["Loyalty oaths and neon suburbs: the fifties gestate."],
1950:["Credit cards appear; buy now, pay later is born."],
1951:["Color TV flickers into living rooms."],
1952:["Polio vaccine trials bring parents to tears of relief."],
1953:["DNA's double helix revealed; biology's code cracked."],
1954:["Rock and roll detonates on the radio."],
1955:["Suburbs sprawl; highways unroll like ribbons."],
1956:["A vaccine ends polio's terror in the playground."],
1957:["A beeping satellite crosses the night sky; space fever starts."],
1958:["Stereo records spin; peace signs get painted."],
1959:["Microchips shrink the future onto silicon."],
1960:["Televised debates change politics forever."],
1961:["A human orbits the Earth; everyone looks up."],
1962:["The missile crisis brings the world to the brink — and back."],
1963:["A president falls; a generation loses innocence."],
1964:["Civil rights march; freedom rings louder."],
1965:["Miniskirts, satellites, and escalating drums abroad."],
1966:["World Cup fever; television unites the street."],
1967:["Summer of love: flowers in rifle barrels."],
1968:["A year of shock: assassinations, protests, resolve."],
1969:["A boot print on the Moon, watched live by millions."],
1970:["Earth Day: the planet gets a holiday and a movement."],
1971:["Pocket calculators make arithmetic electronic."],
1972:["Atari blips; the arcade age ignites."],
1973:["Oil shock: gas lines snake around blocks worldwide."],
1974:["A president resigns on live TV; trust rebuilds slowly."],
1975:["Disco balls spin up; the dance floor forgives all."],
1976:["VCRs blink midnight; movie night moves home."],
1977:["A space opera rewires every kid's imagination."],
1978:["Test-tube babies: life's beginnings go high-tech."],
1979:["Walkmans privatize music; streets fill with head-nodders."],
1980:["A hockey miracle on ice; arcade cabinets eat quarters."],
1981:["Shuttles rise; a new disease puzzles doctors."],
1982:["CDs gleam; the future sounds crystal clear."],
1983:["The network splits; the internet quietly begins."],
1984:["Synths rule the charts; big hair, bigger choruses."],
1985:["A live concert for the world raises millions."],
1986:["A reactor melts down; the sky keeps the score."],
1987:["Black Monday: markets plunge, then claw back."],
1988:["The Games dazzle Seoul; benztown beats go global."],
1989:["The Wall falls; maps get redrawn overnight."],
1990:["A space telescope opens above the blur of air."],
1991:["The web goes public with its first pages."],
1992:["Text messages buzz across new mobile nets."],
1993:["Browsers bloom; the information age gets a face."],
1994:["Searchable channels multiply; cable goes wild."],
1995:["DVDs spin; e-commerce sells its first books."],
1996:["A sheep is cloned; biology debates itself."],
1997:["Tiny phones, huge ringtones; everyone is reachable."],
1998:["Search engines index the swelling web."],
1999:["Millennium fever: parties planned, computers patched."],
2000:["The clocks roll over; the lights stay on."],
2001:["Towers fall; the century's innocence ends."],
2002:["Reality TV crowns ordinary strangers."],
2003:["The human genome is mapped; medicine dreams bigger."],
2004:["Social networks connect the campuses first."],
2005:["Video sites bloom; cats become the first stars."],
2006:["Microblogs shrink the news to 140 characters."],
2007:["A glass slab replaces ten gadgets at once."],
2008:["Markets crash; banks fall like dominoes."],
2009:["Streaming replaces the video store run."],
2010:["Tablets turn magazines into apps."],
2011:["Protests ripple square to square across the world."],
2012:["A rover lands on Mars by sky-crane; nerds weep."],
2013:["Wearables count every step you take."],
2014:["Ice buckets drench the internet for charity."],
2015:["Reusable rockets land standing up; space gets cheap."],
2016:["Viral votes stun the pollsters everywhere."],
2017:["A solar eclipse blacks out the afternoon."],
2018:["Esports fill arenas; gamers go pro."],
2019:["A black hole gets its first photograph."],
2020:["The world stays home; sourdough starters multiply."],
2021:["Vaccines roll out; hope comes in two doses."],
2022:["AI paints and writes; every job description wobbles."],
2023:["Power bills bite; rooftops sprout panels."],
2024:["The grid strains; batteries carry the evening."],
2025:["Delivery bots waddle down the sidewalks."],
2026:["Fusion demos net energy; the grid of tomorrow flickers on."],
2027:["Lunar crews keep permanent lights on the Moon."],
2028:["Longevity clinics promise centenarians by default."],
2029:["Ocean farms bloom; seaweed feeds millions."],
2030:["Mars tickets sell out; volunteers queue one-way."],
2031:["Mind archives back up memories like files."],
2032:["Climate tech patches the sky; weather calms."],
2033:["Orbital rings spin up gravity and groceries."],
2034:["Star probes ride light sails toward near stars."],
2035:["Deep-time schools teach centuries as semesters."],
2036:["Fusion desalination blooms the deserts green."],
2037:["The census counts its first lunar-born citizen."],
2038:["Autonomous freight hums through the night highways."],
2039:["Coral arks reseed the reefs, polyp by polyp."],
2040:["The 2010s turn nostalgic; retro everything returns."],
2041:["Talking houses negotiate power prices while you sleep."],
2042:["Asteroid mining returns its first platinum haul."],
2043:["Universal translators dissolve the last language gaps."],
2044:["The great rewilding returns wolves to old ranges."],
2045:["Floating districts ride out the rising seas."],
2046:["Dream recorders sketch the night's cinema."],
2047:["The oldest human turns 125 on every channel."],
2048:["Sky farms stack greens a hundred stories high."],
2049:["Time capsules from 2000 get opened on live streams."],
2050:["The century turns halfway; retrospectives everywhere."],
2051:["Gravity assists sling cargo between worlds."],
2052:["The desert observatories hear a strange, repeating signal."],
2053:["Debate rages: is the signal us, or them?"],
2054:["Silent probes confirm: the signal was ours, reflected."],
2055:["Cities vote to dim the skies; stars return downtown."],
2056:["The deep ocean census finds ten thousand new species."],
2057:["Century-old forests get legal personhood in three nations."],
2058:["Printed organs clear trials; waiting lists vanish."],
2059:["The Mars census passes one million souls."],
2060:["Starship lanes get their first traffic rules."],
2061:["A message capsule returns from the outer dark."],
2062:["Children learn zero-g sports in school gyms."],
2063:["The tide farms power whole coastlines."],
2064:["History AIs debate the 2020s with eerie confidence."],
2065:["The deep time library opens its first wing."],
2066:["Terraforming trials green a crater plain."],
2067:["The signal repeats — from the opposite direction."],
2068:["Storms calm to a century low; planners take credit."],
2069:["The last landfills close; everything cycles now."],
2070:["A new generation asks what scarcity even felt like."]
};
/* seeded pick: stable per (year) so headlines don't flicker between renders */
function histSeed(y){ var h=(y*2654435761)>>>0; h^=h>>>13; h=(h*2246822519)>>>0; h^=h>>>16; return (h>>>0)/4294967296; }
function historyFor(y){
  var a=HIST_YEARS[y];
  if(a&&a.length)return a.slice();
  return ["An ordinary year in an extraordinary century."];
}
function historyHeadline(y){
  var a=historyFor(y);
  return a[Math.floor(histSeed(y)*a.length)%a.length];
}
function historyEra(y){
  if(y<1914)return "the long peace";
  if(y<1919)return "the Great War years";
  if(y<1930)return "the roaring twenties";
  if(y<1940)return "the hungry thirties";
  if(y<1946)return "the war years";
  if(y<1960)return "the boom years";
  if(y<1970)return "the swinging sixties";
  if(y<1980)return "the restless seventies";
  if(y<1990)return "the neon eighties";
  if(y<2000)return "the wired nineties";
  if(y<2010)return "the connected noughties";
  if(y<2020)return "the social teens";
  if(y<2030)return "the AI turn";
  if(y<2040)return "the off-world decade";
  if(y<2055)return "the repair years";
  return "the deep future";
}
LL.files.push("history");
