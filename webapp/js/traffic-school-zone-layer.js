/* Chica Map — School Traffic Zones
 * Purpose: practical driver-awareness geofences around Bexar County school campuses.
 * These are traffic-awareness buffers, NOT legal attendance or speed-zone boundaries.
 */
(function(){
  "use strict";
  const SRC="chica-school-traffic-zones", DOT="chica-school-traffic-zone-dot", HALO="chica-school-traffic-zone-halo", BTN="btnZoneAware";
  const LIVE="https://maps.bexar.org/arcgis/rest/services/Schools/MapServer/0/query?where=1%3D1&outFields=CAMPUS%2CLABEL%2CTYPE%2CDISTRICT%2CDIST_WEB%2CCAMPUS_WEB%2CAddress%2CCAMPID%2CSpan%2CSchType%2CDIST_ID%2CCharterSchool%2CChoiceSchool%2CMagnetAssociated&returnGeometry=true&outSR=4326&f=geojson";
  const CACHE="chica_school_traffic_zones_v1";
  let map=null,data=null,enabled=false,watch=null,pos=null,acc=null,lastInside=new Set(),lastSpeak=0;
  const lower=v=>String(v==null?"":v).toLowerCase();
  function mapFind(){return map&&map.getSource?map:(window.__YB_MAP&&window.__YB_MAP.getSource?window.__YB_MAP:null);}
  function radius(p){
    const t=lower(p.SchType||p.TYPE||p.type), s=lower(p.Span||p.span), n=lower(p.CAMPUS||p.name);
    if(/university|college|adult education|vocational adult/.test(t+" "+s+" "+n)) return null;
    if(/high/.test(t)||/high/.test(s)||/9-12|10-12|7-12/.test(s)) return 750;
    if(/middle|junior/.test(t)||/6-8|7-8|5-8/.test(s)) return 600;
    if(/elementary|primary/.test(t)||/pk-5|k-5|k-6|1-5|1-6/.test(s)) return 500;
    if(/early|ece|pre-k/.test(t)||/early childhood|ecec/.test(n)) return 400;
    return /charter/.test(t)||/yes|y/.test(lower(p.CharterSchool)) ? 600 : 600;
  }
  function normalize(x){
    if(!x||x.type!=="FeatureCollection"||!Array.isArray(x.features))return null;
    const features=[];
    x.features.forEach((f,i)=>{
      if(!f.geometry||!Array.isArray(f.geometry.coordinates))return;
      const p=f.properties||{}, r=radius(p); if(r===null)return;
      const c=f.geometry.coordinates; if(c.length<2)return;
      const district=p.DISTRICT||"Bexar County school";
      const name=p.CAMPUS||p.LABEL||"School campus";
      const id=String(p.CAMPID||district+"-"+name+"-"+i).toLowerCase().replace(/[^a-z0-9]+/g,"-");
      features.push({type:"Feature",geometry:{type:"Point",coordinates:[+c[0],+c[1]]},properties:{id,name,district,type:p.SchType||p.TYPE||"School",radius_ft:r,address:p.Address||"",source:"Bexar County GIS Public_Schools"}});
    });
    return features.length?{type:"FeatureCollection",features}:null;
  }
  async function load(){
    try{
      const r=await fetch(LIVE,{cache:"no-store",headers:{Accept:"application/geo+json,application/json"}});
      if(!r.ok)throw Error("GIS "+r.status);
      const d=normalize(await r.json()); if(!d)throw Error("no schools");
      try{localStorage.setItem(CACHE,JSON.stringify({ts:Date.now(),data:d}))}catch(_){ }
      return d;
    }catch(e){
      try{const x=JSON.parse(localStorage.getItem(CACHE)||"null");if(x&&x.data)return x.data}catch(_){ }
      console.warn("[traffic-zones] GIS unavailable",e.message);return null;
    }
  }
  function meters(ft){return ft*.3048}
  function hav(lon1,lat1,lon2,lat2){const R=6371000,r=Math.PI/180,dLat=(lat2-lat1)*r,dLon=(lon2-lon1)*r,a=Math.sin(dLat/2)**2+Math.cos(lat1*r)*Math.cos(lat2*r)*Math.sin(dLon/2)**2;return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));}
  function speak(t){if(!window.speechSynthesis||Date.now()-lastSpeak<45000)return;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.rate=.92;u.volume=.7;speechSynthesis.speak(u);lastSpeak=Date.now()}catch(_){} }
  function check(){
    if(!enabled||!data||!pos||!Number.isFinite(acc)||acc>120)return;
    const inside=new Set();
    data.features.forEach(f=>{const c=f.geometry.coordinates,p=f.properties,d=hav(pos[0],pos[1],c[0],c[1]);if(d<=meters(p.radius_ft)+25+Math.min(acc,60))inside.add(p.id)});
    const entered=[...inside].filter(x=>!lastInside.has(x));
    if(entered.length){const f=data.features.find(x=>x.properties.id===entered[0]);if(f)speak("School traffic zone ahead. Please slow down and watch for pedestrians, buses, and turning traffic.")}
    lastInside=inside;
  }
  function radiusExpr(){return ["interpolate",["linear"],["zoom"],9,8,11,15,13,28,15,55,17,100,19,180]}
  function ensure(m){
    if(!m||!data)return;
    if(!m.getSource(SRC))m.addSource(SRC,{type:"geojson",data});else m.getSource(SRC).setData(data);
    if(!m.getLayer(HALO))m.addLayer({id:HALO,type:"circle",source:SRC,paint:{"circle-radius":radiusExpr(),"circle-color":"#f0a500","circle-opacity":.15,"circle-stroke-width":1,"circle-stroke-color":"#b45309"}});
    if(!m.getLayer(DOT))m.addLayer({id:DOT,type:"circle",source:SRC,paint:{"circle-radius":["interpolate",["linear"],["zoom"],9,3,13,6,16,10,19,14],"circle-color":"#f0a500","circle-stroke-width":2,"circle-stroke-color":"#b45309","circle-opacity":.9}});
    m.on("click",DOT,e=>{const f=e.features&&e.features[0];if(!f)return;const p=f.properties;new maplibregl.Popup({offset:12,maxWidth:"320px"]).setLngLat(f.geometry.coordinates).setHTML("<strong>School Traffic Zone</strong><br>"+String(p.name).replace(/[&<>]/g,"")+"<br><small>"+String(p.district).replace(/[&<>]/g,"")+"<br>Traffic-awareness buffer: "+p.radius_ft+" ft<br><em>Practical driver-awareness zone; not an official legal boundary.</em></small>").addTo(m)});
  }
  function visible(on){[DOT,HALO].forEach(id=>{if(map&&map.getLayer(id))map.setLayoutProperty(id,"visibility",on?"visible":"none")})}
  function gps(){if(!navigator.geolocation)return;watch=navigator.geolocation.watchPosition(p=>{pos=[p.coords.longitude,p.coords.latitude];acc=p.coords.accuracy;check()},()=>{}, {enableHighAccuracy:true,maximumAge:10000,timeout:15000})}
  async function toggle(){
    map=mapFind();if(!map){setTimeout(toggle,500);return}
    enabled=!enabled;const b=document.getElementById(BTN);if(b){b.classList.toggle("active",enabled);b.setAttribute("aria-pressed",String(enabled))}
    if(enabled){data=await load();if(!data){enabled=false;return}ensure(map);visible(true);gps();console.log("[traffic-zones] schools:",data.features.length)}
    else{visible(false);if(watch)navigator.geolocation.clearWatch(watch);watch=null;lastInside=new Set()}
  }
  function boot(){
    map=mapFind(); const b=document.getElementById(BTN); if(b){b.title="School traffic-awareness zones";b.onclick=e=>{e.preventDefault();toggle()};}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
  setTimeout(boot,1000);setTimeout(boot,3000);
})();
