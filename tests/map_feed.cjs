/* Actual map normalizer/filter tested in a Node VM with Leaflet stubs, no browser/network. */
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('node:assert/strict');
const feed=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const source=process.argv[3]||path.join(__dirname,'../webapp/js/chica-live-map.js');
const code=fs.readFileSync(source,'utf8').replace('})(window);','w.__testAddPins=addPins;})(window);');
const clock=feed.generated+'T20:00:00-06:00';
class Clock extends Date {constructor(...args){super(...(args.length?args:[clock]));}}
const noop=()=>{};
const document={readyState:'loading',documentElement:{classList:{add:noop,remove:noop}},addEventListener:noop};
const window={dispatchEvent:noop};
const context={window,document,Date:Clock,Intl,console,location:{pathname:'/map/'},localStorage:{getItem:()=>null},setInterval:()=>1,clearInterval:noop,setTimeout:()=>1};
vm.runInNewContext(code,context,{filename:source});
const L={divIcon:()=>({}),marker:()=>({_icon:{setAttribute:noop},on:noop,addTo:noop})};
const count=window.__testAddPins({},L,feed.public);
assert.equal(count,feed.total_locations,'Map must not collapse genuine homes sharing a centroid/title');
assert.equal(window.__chicaSales.length,feed.total_locations);
assert.equal(window.__chicaVisibleSales({day:feed.generated,dayTo:feed.generated}).length,feed.today_count);
assert.equal(window.__chicaIsEnded({date_end:feed.generated,hours:'9am - 10am'}),false,'Closing-hour guesses must not change calendar-day counts');
assert.equal(window.__chicaIsEnded({date_end:'2000-01-01'}),true);
for(const sale of window.__chicaSales)assert(Array.isArray(sale.aliases));
console.log('Map module PASS: '+count+' upcoming, '+feed.today_count+' today (CT), stable IDs and same-day closing policy');
