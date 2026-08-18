/* Chica Map — road-aware school traffic zones. Driver-awareness only. */
(function(){
  "use strict";
  const SRC="chica-school-road-approaches", LINE="chica-school-road-approach-lines";
  const SCHOOL="https://maps.bexar.org/arcgis/rest/services/Schools/MapServer/0/query?where=1%3D1&outFields=CAMPUS%2CLABEL%2CTYPE%2CDISTRICT%2CCAMPID%2CSpan%2CSchType%2CAddress&returnGeometry=true&outSR=4326&f=geojson";
  const OSM="https://overpass-api.de/api/interpreter";
  let map=null,enabled=false,data=null;
  const lower=v=>String(v==null?"":v).toLowerCase();
  const mapFind=()=>map&&map.getSource?map:(window.__YB_MAP&&window.__YB_MAP.getSource?window.__YB_MAP:null);
  function radius(p){const t=lower(p.SchType||p.TYPE||p.type),s=lower(p.Span||p.span),n=lower(p.CAMPUS||p.name);if(/university|college|adult education|vocational adult/.test(t+" "+s+" "+n))return null;if(/high/.test(t)||/high/.test(s)||/9-12|10-12|7-12/.test(s))return 750;if(/middle|junior/.test(t)||/6-8|7-8|5-8/.test(s))return 600;if(/elementary|primary/.test(t)||/pk-5|k-5|k-6|1-5|1-6/.test(s))return 500;return 600}
  function bbox(c,r){const lat=c[1],dLat=r/364000,dLon=r/(364000*Math.max(.2,Math.cos(lat*Math.PI/180)));return [c[0]-dLon,lat-dLat,c[0]+dLon,lat+dLat]}
  async function roadQuery(c,r){const b=bbox(c,r);const q='[out:json][timeout:18];way[highway]('+b[1]+','+b[0]+','+b[3]+','+b[2]+');out geom;';try{const res=await fetch(OSM,{method:'POST',headers:{'Content-Type':'text/plain'},body:q,cache:'no-store'});if(!res.ok)throw Error(res.status);const j=await res.json();return (j.elements||[]).filter(w=>w.geometry&&w.geometry.length>1).map(w=>({type:'Feature',geometry:{type:'LineString',coordinates:w.geometry.map(p=>[p.lon,p.lat])},properties:{highway:w.tags&&w.tags.highway||'road'}}))}catch(e){console.warn('[chica-road-approach] OSM unavailable',e.message);return []}}
  async function load(){try{const r=await fetch(SCHOOL,{cache:'no-store'});if(!r.ok)throw Error(r.status);const x=await r.json();const schools=(x.features||[]).map((f,i)=>{const p=f.properties||{},r=radius(p),c=f.geometry&&f.geometry.coordinates;if(r===null||!c||c.length<2)return null;return {c:[+c[0],+c[1]],r,name:p.CAMPUS||p.LABEL||'School',id:String(p.CAMPID||i)}}).filter(Boolean);const lines=[];for(const s of schools){const roads=await roadQuery(s.c,s.r);for(const f of roads){f.properties.school=s.name;f.properties.school_id=s.id;f.properties.zone_radius_ft=s.r;lines.push(f)}}return {type:'FeatureCollection',features:lines}}catch(e){console.warn('[chica-road-approach]',e.message);return null}}
  function ensure(m){if(!m||!data)return;if(!m.getSource(SRC))m.addSource(SRC,{type:'geojson',data});else m.getSource(SRC).setData(data);if(!m.getLayer(LINE))m.addLayer({id:LINE,type:'line',source:SRC,paint:{'line-color':'#f59e0b','line-opacity':.48,'line-width':['interpolate',['linear'],['zoom'],9,2,13,3,16,5,19,8],'line-blur':1}})}
  function visible(on){if(map&&map.getLayer(LINE))map.setLayoutProperty(LINE,'visibility',on?'visible':'none')}
  async function toggle(){map=mapFind();if(!map)return;enabled=!enabled;if(enabled){data=await load();if(!data){enabled=false;return}ensure(map);visible(true)}else visible(false)}
  function boot(){map=mapFind();const b=document.getElementById('btnZoneAware');if(b)b.title='Road-aware school traffic zones'}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();setTimeout(boot,1000);setTimeout(boot,3000);
  window.ChicaSchoolRoadApproach={toggle,enable:async()=>{if(!enabled)await toggle()},disable:()=>{if(enabled)toggle()},isEnabled:()=>enabled};
})();
