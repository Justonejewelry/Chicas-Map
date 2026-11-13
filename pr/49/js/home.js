/* No hydration or text swaps: all essential content is served in the right language. */
(function(){
  var es=document.documentElement.lang==='es';
  document.querySelectorAll('.site-header a[lang]').forEach(function(a){if(a.lang===(es?'es':'en'))a.setAttribute('aria-current','page');});
  try{localStorage.setItem('chicas-map-locale',es?'es':'en');}catch(e){}
  var theme=document.getElementById('home-theme');
  function labelTheme(){if(!theme)return;var light=document.documentElement.dataset.theme==='light';theme.setAttribute('aria-label',es?(light?'Cambiar a tema oscuro':'Cambiar a tema claro'):(light?'Switch to dark theme':'Switch to light theme'));theme.setAttribute('aria-pressed',String(light));}
  labelTheme();
  if(theme)theme.addEventListener('click',function(){var next=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=next;document.documentElement.style.colorScheme=next;try{localStorage.setItem('chicas-map-theme',next);}catch(e){}labelTheme();});
  document.addEventListener('click',function(e){var menu=document.getElementById('home-menu');if(menu&&!menu.contains(e.target))menu.open=false;});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){var menu=document.getElementById('home-menu');if(menu&&menu.open){menu.open=false;menu.querySelector('summary').focus();}}});
})();
