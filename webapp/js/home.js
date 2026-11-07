/* No hydration or text swaps: all essential content is served in the right language. */
(function(){
  var es=document.documentElement.lang==='es';
  document.querySelectorAll('.site-header a[lang]').forEach(function(a){if(a.lang===(es?'es':'en'))a.setAttribute('aria-current','page');});
  try{localStorage.setItem('chicas-map-locale',es?'es':'en');}catch(e){}
  var theme=document.getElementById('home-theme');
  if(theme){theme.setAttribute('aria-label',es?'Cambiar tema de color':'Change color theme');theme.addEventListener('click',function(){var next=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=next;try{localStorage.setItem('chicas-map-theme',next);}catch(e){}});}
})();
