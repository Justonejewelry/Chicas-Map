/* Chica Map — road-approach school traffic zones. Practical driver-awareness only. */
(function(){
  "use strict";
  const SRC="chica-school-road-approaches", LAYER="chica-school-road-approaches-fill", DOT="chica-school-road-approaches-dot";
  const SCHOOL="https://maps.bexar.org/arcgis/rest/services/Schools/MapServer/0/query?where=1%3D1&outFields=CAMPUS%2CLABEL%2CTYPE%2CDISTRICT%2CCAMPID%2CSpan%2CSchType%2CAddress&returnGeometry=true&outSR=4326&f=geojson";
  let map=null,enabled=false,data=null;
  const lower=v=>String(v==null?"":v).toLowerCase();
  const mapFind=()=>map&&map.getSource?map:(window.__YB_MAP&&window.__YB_MAP.getSource?window.__YB_MAP:null);
  function radius(p){const t=lower(p.SchType||p.TYPE||p.type),s=lower(p.Span||p.span),n=lower(p.CAMPUS||p.name);if(/university|college|adult education|vocational adult/.test(t+" "+s+" "+n))return null;if(/high/.test(t)||/high/.test(s)||/9-12|10-12|7-12/.test(s))return 750;if(/middle|junior/.test(t)||/6-8|7-8|5-8/.test(s))return 600;if(/elementary|primary/.test(t)||/pk-5|k-5|k-6|1-5|1-6/.test(s))return 500;return 600}
  async function load(){try{const r=await fetch(SCHOOL,{cache:"no-store"});if(!r.ok)throw Error(r.status);const x=await r.json();const features=(x.features||[]).map((f,i)=>{const p=f.properties||{},r=radius(p),c=f.geometry&&f.geometry.coordinates;if(r===null||!c||c.length<2)return null;return {type:"Feature",geometry:{type:"Point",coordinates:[+c[0],+c[1]]},properties:{name:p.CAMPUS||p.LABEL||"School",district:p.DISTRICT||"",radius_ft:r,id:String(p.CAMPID||i)}}}).filter(Boolean);return features.length?{type:"FeatureCollection",features}:null}catch(e){console.warn("[school-road-approach]",e.message);return null}}
  function ensure(m){if(!m||!data)return;if(!m.getSource(SRC))m.addSource(SRC,{type:"geojson",data});else m.getSource(SRC).setData(data);if(!m.getLayer(LAYER))m.addLayer({id:LAYER,type:"circle",source:SRC,paint:{"circle-radius":["interpolate",["linear"],["zoom"],9,18,11,30,13,55,15,95,17,145,19,220],"circle-color":"#f59e0b","circle-opacity":.09,"circle-stroke-width":0}});if(!m.getLayer(DOT))m.addLayer({id:DOT,type:"circle",source:SRC,paint:{"circle-radius":["interpolate",["linear"],["zoom"],9,4,13,7,16,11,19,15],"circle-color":"#f59e0b","circle-opacity":.82,"circle-stroke-width":1,"circle-stroke-color":"#92400e"}})}
  function visible(on){[LAYER,DOT].forEach(id=>{if(map&&map.getLayer(id))map.setLayoutProperty(id,"visibility",on?"visible":"none")})}
  async function toggle(){map=mapFind();if(!map)return;enabled=!enabled;if(enabled){data=await load();if(!data){enabled=false;return}ensure(map);visible(true)}else visible(false)}
  function boot(){map=mapFind();const b=document.getElementById("btnZoneAware");if(b)b.title="School traffic-awareness zones — road approach view"}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();setTimeout(boot,1000);setTimeout(boot,3000);
  window.ChicaSchoolRoadApproach={toggle,enable:async()=>{if(!enabled)await toggle()},disable:()=>{if(enabled)toggle()},isEnabled:()=>enabled};
})();
