/* Chica Map — Zone Aware school geofences. Primary source: Bexar County GIS Public_Schools. */
(function () {
  "use strict";
  const SRC="yb-zone-aware", DOT="yb-zone-aware-layer", HALO="yb-zone-aware-halo", BTN="btnZoneAware";
  const LIVE="https://maps.bexar.org/arcgis/rest/services/Schools/MapServer/0/query?where=1%3D1&outFields=CAMPUS%2CLABEL%2CTYPE%2CDISTRICT%2CDIST_WEB%2CCAMPUS_WEB%2CAddress%2CCAMPID%2CSpan%2CSchType%2CDIST_ID%2CCharterSchool%2CChoiceSchool%2CMagnetAssociated&returnGeometry=true&outSR=4326&f=geojson";
  const CACHE="chica_zone_aware_geo_v3", VOICE="chica_zone_aware_voice_v2";
  const CACHE_TTL=7*24*60*60*1000, GPS_PAD=25, MAX_ACC=120, COOLDOWN=45000;
  let map=null,data=null,enabled=false,watch=null,timer=null,refresh=null,pos=null,acc=null,lastInside=new Set(),lastSpeak=0,voice=true,source="not loaded",activeCount=0;
  try { voice=localStorage.getItem(VOICE)!=="0"; } catch(_) {}

  const lower=v=>String(v==null?"":v).toLowerCase();
  const mins=v=>{if(v==null||v==="")return null;const a=String(v).split(":");const h=+a[0],m=+(a[1]||0);return Number.isFinite(h)&&Number.isFinite(m)?h*60+m:null;};
  const inWin=(d,s,e)=>{const t=d.getHours()*60+d.getMinutes(),a=mins(s),b=mins(e);return a!=null&&b!=null&&t>=a&&t<=b;};
  const weekday=d=>{const n=(d||new Date()).getDay();return n>=1&&n<=5;};
  const mapFind=()=>map&&map.getSource?map:(window.__YB_MAP&&window.__YB_MAP.getSource?window.__YB_MAP:(window.map&&window.map.getSource?window.map:null));
  const toast=(s,ms=3500)=>{const e=document.getElementById("toast");if(e){e.textContent=s;e.classList.remove("hidden");e.style.display="block";setTimeout(()=>{e.classList.add("hidden");e.style.display=""},ms)}else console.log("[zone-aware]",s)};

  function profile(p){
    const t=lower(p.SchType||p.type), span=lower(p.Span||p.span), name=lower(p.CAMPUS||p.name);
    let radius=400, kind="school";
    if(/high/.test(t)||/high/.test(span)||/9-12|10-12|7-12/.test(span)){radius=500;kind="high school";}
    else if(/middle|junior/.test(t)||/6-8|7-8|5-8/.test(span)){radius=425;kind="middle school";}
    else if(/elementary|primary/.test(t)||/pk-5|k-5|k-6|1-5|1-6/.test(span)){radius=300;kind="elementary school";}
    else if(/early|ece|pre-k/.test(t)||/early childhood|ecec/.test(name)){radius=250;kind="early childhood";}
    else if(/charter/.test(t)||lower(p.CharterSchool)==="yes"||lower(p.CharterSchool)==="y"){radius=400;kind="charter school";}
    return {radius,kind};
  }

  function schedule(p){
    const d=lower(p.DISTRICT||p.district), t=lower(p.SchType||p.type), s=profile(p), high=/high/.test(t)||s.kind==="high school", middle=/middle|junior/.test(t)||s.kind==="middle school";
    let a=["07:00","09:15","14:00","16:15"];
    if(/north\s*east|neisd/.test(d)) a=high?["08:00","09:30","15:30","16:45"]:middle?["07:40","09:10","15:00","16:20"]:["06:55","08:40","14:10","15:30"];
    else if(/northside|nisd/.test(d)) a=high?["07:55","09:30","15:10","16:35"]:middle?["07:40","09:20","14:50","16:20"]:["06:55","08:40","14:15","15:45"];
    else if(/southwest|swisd/.test(d)) a=high?["08:00","09:35","15:35","16:50"]:middle?["07:00","08:30","14:20","15:40"]:["07:15","08:50","14:45","16:00"];
    else if(/harlandale/.test(d)) a=["06:45","08:40","14:00","15:40"];
    else if(/south san antonio|ssaisd/.test(d)) a=["06:30","08:30","14:00","15:40"];
    else if(/san antonio|saisd/.test(d)) a=high?["07:45","09:30","15:20","16:45"]:middle?["07:30","09:15","14:50","16:20"]:["06:50","08:40","14:00","15:30"];
    return a;
  }

  function normalize(f,i){
    if(!f||!f.geometry||!Array.isArray(f.geometry.coordinates))return null;
    const p=f.properties||{}, c=f.geometry.coordinates;
    if(c.length<2||!Number.isFinite(+c[0])||!Number.isFinite(+c[1]))return null;
    const type=lower(p.TYPE||p.type), sch=lower(p.SchType||p.type), span=lower(p.Span||p.span), name=lower(p.CAMPUS||p.name);
    if(/university|college|adult education|vocational adult/.test(type+" "+sch+" "+span+" "+name))return null;
    const prof=profile(p), bell=schedule(p), district=p.DISTRICT||p.district||"Bexar County school", campus=p.CAMPUS||p.name||p.LABEL||"School campus";
    const id=String(p.CAMPID||p.OBJECTID||district+"-"+campus+"-"+i).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
    return {type:"Feature",geometry:{type:"Point",coordinates:[+c[0],+c[1]]},properties:{id,name:campus,district,type:p.SchType||p.TYPE||"School",span:p.Span||"",address:p.Address||"",campus_id:p.CAMPID||"",district_web:p.DIST_WEB||"",campus_web:p.CAMPUS_WEB||"",charter:p.CharterSchool||"",radius_ft:prof.radius,kind:prof.kind,am_start:bell[0],am_end:bell[1],pm_start:bell[2],pm_end:bell[3],source:"Bexar County GIS Public_Schools"}};
  }
  function normalizeCollection(x){if(!x||x.type!=="FeatureCollection"||!Array.isArray(x.features))return null;const features=x.features.map(normalize).filter(Boolean);return features.length?{type:"FeatureCollection",features}:null;}

  async function fetchLive(){
    if(navigator.onLine===false)return null;
    const c=new AbortController(),to=setTimeout(()=>c.abort(),12000);
    try{const r=await fetch(LIVE,{signal:c.signal,cache:"no-store",headers:{Accept:"application/geo+json,application/json"}});if(!r.ok)throw Error("GIS "+r.status);const d=normalizeCollection(await r.json());if(!d)throw Error("no usable campuses");source="Bexar County GIS live";try{localStorage.setItem(CACHE,JSON.stringify({ts:Date.now(),data:d}))}catch(_){}return d}catch(e){console.warn("[zone-aware] GIS unavailable",e.message);return null}finally{clearTimeout(to)}
  }
  async function fallback(){
    try{const r=await fetch("data/zone-aware-schools.geojson?v=zone-final",{cache:"no-store"});if(r.ok){const d=normalizeCollection(await r.json());if(d){source="checked-in fallback";return d}}}catch(_){}
    try{const x=JSON.parse(localStorage.getItem(CACHE)||"null");if(x&&x.data&&Date.now()-x.ts<=CACHE_TTL){source="cached Bexar County GIS";return x.data}}catch(_){}
    return null;
  }
  const load=async()=>await fetchLive()||await fallback();
  function active(d=new Date()){if(!data||!weekday(d))return {type:"FeatureCollection",features:[]};return {type:"FeatureCollection",features:data.features.filter(f=>{const p=f.properties;return inWin(d,p.am_start,p.am_end)||inWin(d,p.pm_start,p.pm_end)})};}
  function state(){if(!weekday())return "Weekend — school geofences inactive";if(!data)return "No school data loaded";const n=active().features.length;return n?`${n} school geofence${n===1?"":"s"} active now`:"Outside school-zone hours";}

  function hav(a,b,c,d){const R=6371000,r=Math.PI/180,la=(d-b)*r,lo=(c-a)*r,q=Math.sin(la/2)**2+Math.cos(b*r)*Math.cos(d*r)*Math.sin(lo/2)**2;return R*2*Math.atan2(Math.sqrt(q),Math.sqrt(1-q));}
  function distanceBuffer(f){return ((+f.properties.radius_ft||400)*0.3048)+GPS_PAD+Math.min(+acc||0,60);}
  function speak(text){if(!voice||!speechSynthesis||Date.now()-lastSpeak<COOLDOWN)return;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.rate=.92;u.volume=.7;speechSynthesis.speak(u);lastSpeak=Date.now()}catch(_){} }
  function check(){
    if(!enabled||!data||!pos||!Number.isFinite(+acc)||+acc>MAX_ACC)return;
    const inside=new Set(),fs=active().features;let nearest=null,nd=Infinity;
    fs.forEach(f=>{const c=f.geometry.coordinates,d=hav(pos[0],pos[1],c[0],c[1]);if(d<nd){nd=d;nearest=f}if(d<=distanceBuffer(f))inside.add(f.properties.id)});
    const entered=[...inside].filter(x=>!lastInside.has(x)),left=[...lastInside].filter(x=>!inside.has(x));
    if(entered.length){const f=fs.find(x=>x.properties.id===entered[0]);speak("Entering school zone. Please slow down.");console.log("[zone-aware] ENTER",f&&f.properties.name)}
    else if(left.length)speak("Leaving school zone.");
    lastInside=inside;
  }

  function radiusExpr(ft){const m=ft*.3048;return ["interpolate",["linear"],["zoom"],9,Math.max(3,m*.02),11,Math.max(6,m*.06),13,Math.max(10,m*.13),15,Math.max(18,m*.27),17,Math.max(32,m*.54),19,Math.max(48,m*.95)];}
  function ensure(m){if(!m||!data)return false;const a=active();activeCount=a.features.length;try{if(!m.getSource(SRC))m.addSource(SRC,{type:"geojson",data:a});else m.getSource(SRC).setData(a);if(!m.getLayer(HALO))m.addLayer({id:HALO,type:"circle",source:SRC,paint:{"circle-radius":radiusExpr(400),"circle-color":"#f0a500","circle-opacity":.16,"circle-stroke-width":0}});if(!m.getLayer(DOT)){m.addLayer({id:DOT,type:"circle",source:SRC,paint:{"circle-radius":["interpolate",["linear"],["zoom"],9,4,13,7,15,10,17,13],"circle-color":"#f0a500","circle-stroke-width":2,"circle-stroke-color":"#b45309","circle-opacity":.92}});m.on("click",DOT,e=>{const f=e.features&&e.features[0];if(!f)return;const p=f.properties||{};new maplibregl.Popup({offset:12,maxWidth:"310px"}).setLngLat(f.geometry.coordinates).setHTML(`<strong>School Zone</strong><br>${String(p.name||"").replace(/[&<>"]/g,"") }<br><small>${String(p.district||"").replace(/[&<>"]/g,"")}<br>${p.kind||"School"} · ${p.radius_ft} ft safety buffer<br>AM ${p.am_start}–${p.am_end} · PM ${p.pm_start}–${p.pm_end}<br><em>Estimated campus safety buffer — not an official legal boundary.</em></small>`).addTo(m)});m.on("mouseenter",DOT,()=>m.getCanvas().style.cursor="pointer");m.on("mouseleave",DOT,()=>m.getCanvas().style.cursor="")};return true}catch(e){console.warn("[zone-aware] layer",e);return false}}
  function visible(m,on){[DOT,HALO].forEach(id=>{if(m&&m.getLayer(id))try{m.setLayoutProperty(id,"visibility",on?"visible":"none")}catch(_){} });}

  function startGPS(){if(!navigator.geolocation){toast("Location unavailable — map geofences still work");return}if(!watch)watch=navigator.geolocation.watchPosition(p=>{pos=[p.coords.longitude,p.coords.latitude];acc=p.coords.accuracy;check()},e=>{if(e.code===1)toast("Location permission denied — enable it for voice alerts")},{enableHighAccuracy:true,maximumAge:10000,timeout:15000});if(!timer)timer=setInterval(()=>{if(enabled){ensure(map);check()}},20000);if(!refresh)refresh=setInterval(async()=>{if(!enabled)return;const d=await fetchLive();if(d){data=d;ensure(map)}},15*60*1000)}
  function stopGPS(){if(watch){navigator.geolocation.clearWatch(watch);watch=null}if(timer){clearInterval(timer);timer=null}if(refresh){clearInterval(refresh);refresh=null}lastInside=new Set()}
  async function toggle(){const b=document.getElementById(BTN);if(b)b.disabled=true;try{map=mapFind();if(!map){await new Promise(r=>setTimeout(r,500));map=mapFind()}if(!map){toast("Map still loading — try again");return}enabled=!enabled;if(b){b.classList.toggle("active",enabled);b.setAttribute("aria-pressed",String(enabled))}if(enabled){data=await load();if(!data){enabled=false;if(b)b.classList.remove("active");toast("School GIS data unavailable");return}ensure(map);visible(map,true);startGPS();toast("Zone Aware on — "+state(),4500);console.log("[zone-aware]",{source,campuses:data.features.length,state:state()});
          try{if(window.ChicaCloseRail)window.ChicaCloseRail();else{var r=document.getElementById("sideRail"),bd=document.getElementById("railBackdrop");if(r)r.classList.remove("open");if(bd){bd.classList.remove("open");bd.hidden=true}}}catch(_){}
}else{visible(map,false);stopGPS();toast("Zone Aware off")}}finally{if(b)b.disabled=false}}

  function inject(){const bar=document.querySelector(".feat-bar")||document.querySelector(".tools-bar");if(!bar||document.getElementById(BTN))return !!document.getElementById(BTN);const b=document.createElement("button");b.type="button";b.className="tool-btn";b.id=BTN;b.textContent="Zone";b.title="School campus safety geofences";b.setAttribute("aria-pressed","false");b.onclick=e=>{e.preventDefault();toggle()};bar.appendChild(b);return true}
  function boot(){inject();const m=mapFind();if(m){map=m;window.__YB_MAP=m} }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();setTimeout(boot,800);setTimeout(boot,2000);setTimeout(boot,4000);
  window.addEventListener("yb-map-ready",e=>{if(e.detail&&e.detail.map){map=e.detail.map;window.__YB_MAP=map;if(enabled)ensure(map)}});
  window.ChicaZoneAware={toggle,setVoice:on=>{voice=!!on;try{localStorage.setItem(VOICE,on?"1":"0")}catch(_){}},isEnabled:()=>enabled,status:()=>({enabled,voiceEnabled:voice,schoolDay:weekday(),schedule:state(),activeCount,featureCount:data?data.features.length:0,source,gps:!!pos,gpsAccuracyM:acc,insideCount:lastInside.size}),forceCheck:()=>{ensure(map);check();return window.ChicaZoneAware.status()}};
})();
