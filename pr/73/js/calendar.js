/* Static agenda stays usable without JS. JS adds month navigation and filtering. */
(function () {
  'use strict';
  var es = document.documentElement.lang === 'es', locale = es ? 'es-US' : 'en-US';
  var today = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Chicago'}).format(new Date());
  var current = new Date(today + 'T12:00:00'), month = new Date(current.getFullYear(), current.getMonth(), 1);
  var days = [], filter = document.getElementById('sale-type');
  function dateKey(d) { return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
  function localDay(value) { return new Date(value + 'T12:00:00'); }
  document.querySelectorAll('.day-group time').forEach(function (t) { t.textContent = localDay(t.dateTime).toLocaleDateString(locale, {weekday:'long',month:'long',day:'numeric',year:'numeric'}); });
  function render() {
    var kind = filter.value, counts = {}, ids = new Set(), total = 0;
    days.forEach(function(s) { if (s.day >= today && (!kind || s.kind === kind)) { counts[s.day] = (counts[s.day] || 0)+1; ids.add(s.id); total++; } });
    document.querySelectorAll('.sale').forEach(function(card) { card.hidden = !!kind && card.dataset.kind !== kind; });
    document.querySelectorAll('.day-group').forEach(function(group) { group.hidden = group.dataset.date < today || !group.querySelector('.sale:not([hidden])'); });
    var undated = document.getElementById('undated');
    if (undated) undated.hidden = !undated.querySelector('.sale:not([hidden])');
    document.getElementById('sale-count').textContent = ids.size + (es ? ' ventas · ' : ' sales · ') + total + (es ? ' días de venta' : ' sale-days');
    document.getElementById('calendar-status').textContent = total ? '' : (es ? 'No hay ventas para este filtro.' : 'No sales match this filter.');
    document.getElementById('month-title').textContent = month.toLocaleDateString(locale, {month:'long',year:'numeric'});
    var grid = document.getElementById('month-grid'); grid.replaceChildren();
    // Jan 2, 2000 was a Sunday; use it as a stable weekday-label anchor.
    for (var w=0;w<7;w++) { var heading = document.createElement('div'); heading.className='weekday'; heading.textContent=new Date(2000,0,2+w).toLocaleDateString(locale,{weekday:'short'}); grid.appendChild(heading); }
    for (var blank=0;blank<month.getDay();blank++) { var spacer=document.createElement('div'); spacer.setAttribute('aria-hidden','true'); grid.appendChild(spacer); }
    var last = new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
    for (var i=1;i<=last;i++) {
      var d=new Date(month.getFullYear(),month.getMonth(),i), key=dateKey(d), n=counts[key] || 0;
      var cell=document.createElement(n ? 'a' : 'div'); cell.className='day-cell'+(n?' has-sales':'')+(key===today?' current':'');
      if(n) cell.href='#day-'+key;
      cell.setAttribute('aria-label', d.toLocaleDateString(locale,{dateStyle:'full'})+', '+n+(es?' ventas':' sales'));
      if(key===today) cell.setAttribute('aria-current','date');
      var num=document.createElement('span');num.textContent=i;cell.appendChild(num);
      if(n){var count=document.createElement('span');count.className='day-count';count.textContent=n+(es?' ventas':' sales');cell.appendChild(count);}
      grid.appendChild(cell);
    }
  }
  filter.addEventListener('change',render);
  document.getElementById('previous-month').addEventListener('click',function(){month=new Date(month.getFullYear(),month.getMonth()-1,1);render();});
  document.getElementById('next-month').addEventListener('click',function(){month=new Date(month.getFullYear(),month.getMonth()+1,1);render();});
  document.getElementById('this-month').addEventListener('click',function(){month=new Date(current.getFullYear(),current.getMonth(),1);render();});
  document.getElementById('copy-feed').addEventListener('click',async function(){
    var input=document.getElementById('feed-url'), status=document.getElementById('copy-status');
    try { await navigator.clipboard.writeText(input.value); status.textContent=es?'¡Enlace copiado!':'Link copied!'; }
    catch(e){input.focus();input.select();status.textContent=es?'Copia el enlace seleccionado.':'Copy the selected link.';}
  });
  fetch('/Chicas-Map/preview/73/data/calendar.json?v='+Date.now(),{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('feed');return r.json();}).then(function(data){
    days=data.days;document.getElementById('month-calendar').hidden=false;render();
  }).catch(function(){document.getElementById('calendar-status').textContent=es?'El calendario mensual no cargó. Consulta la agenda abajo.':'Month view could not load. The agenda is available below.';});
})();