#!/usr/bin/env node
// The homepage is plain HTML, not a hydrated app with post-paint DOM patches.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
const root=process.argv[2]||'_site';
const es={"supportLabel":"QUE SIGA LA CAPA","supportTitle":"Apoya a Chica's Map","supportIntro":"Ayuda a mantener la búsqueda gratis para los vecinos de San Antonio.","footerTagline":"Un mapa gratis de sábado para los vecinos de San Antonio.","footerSupport":"Ayúdame a mantener la capa puesta","footerHunt":"Busca","footerPack":"Manada","footerFine":"Avisos","mapShort":"Mapa","disclaimer":"Aviso legal","madeWith":"Hecho con","thisMap":"Este mapa es","principle":"Principio de la manada","badgeDisclosure":"Hecho por un veterano. La insignia dorada es nuestra declaración de conformidad WCAG 2.2 AA para este sitio, no una certificación ADA del Departamento de Justicia. Los contenidos de Facebook, GitHub y los mapas son de terceros.",sponsors:'Patrocinios',skip:'Ir al contenido',tagline:'VER ES GRATIS. PUBLICAR ES GRATIS.',title:'Encuentra las ventas que valen el viaje.',lede:'Tu guía vecinal de ventas de garaje, patio y bienes en San Antonio.',add:'Agregar mi venta',calendar:'Calendario de ventas',hoods:'Ventas por vecindario',map:'Abrir el mapa',list:'Lista de ventas',liveMap:'Mapa en vivo · San Antonio',fullscreen:'Pantalla completa',hoodIntro:'Elige tu zona, vecino. 🐾',allHoods:'Ver todos los vecindarios',subscribe:'Calendario y suscripción',footer:'Hecho por un vecino. Siempre gratis para ver y publicar.',story:'Nuestra historia',contact:'Contacto',privacy:'Privacidad',legal:'Aviso legal'};
let html=readFileSync(join(root,'index.html'),'utf8');
const fontCss=readFileSync(join(root,'css/home-fonts.css'),'utf8');
const fontPreloads=[...fontCss.matchAll(/url\((data:font\/woff2;base64,[^)]+)\)/g)].map(m=>'<link rel="preload" as="font" type="font/woff2" crossorigin href="'+m[1]+'"/>').join('');
html=html.replace('<!--HOME_FONT_PRELOADS-->',fontPreloads);
html=html.replace('<!--HOME_SITE_FOOTER-->',readFileSync(new URL('../templates/site-footer.html',import.meta.url),'utf8'));
writeFileSync(join(root,'index.html'),html);
if(!html.includes('data-home-static'))throw new Error('Expected a static homepage');
html=html.replace('<html lang="en"','<html lang="es"').replace(/(data-home-i18n="([^"]+)"[^>]*>)[^<]*/g,(_,start,key)=>{if(!es[key])throw new Error('Missing Spanish copy: '+key);return start+es[key];});
// Neighborhood landing pages currently exist only in English. Keep those links real.
for(const path of ['submit','calendar','list','claim','atlas','media','backstory','bulletin','privacy','legal','sponsors','facebook','principle','deals'])html=html.split('/Chicas-Map/'+path+'/').join('/Chicas-Map/es/'+path+'/');
html=html.replace('lang="en" aria-label="English" aria-current="page"','lang="en" aria-label="English"').replace('lang="es" aria-label="Español"','lang="es" aria-label="Español" aria-current="page"');
html=html.replace('aria-label="Language and theme"','aria-label="Idioma y tema"').replace('aria-label="Browse sales"','aria-label="Buscar ventas"').replace('aria-label="More from Chica"','aria-label="Más de Chica"').replace('aria-label="Open the map full screen"','aria-label="Abrir el mapa a pantalla completa"').replace('aria-label="Upcoming sale highlights"','aria-label="Ventas próximas destacadas"');
html=html.replace('aria-label="Site"','aria-label="Sitio"').replace('aria-label="Menu"','aria-label="Menú"').replace('aria-label="Language"','aria-label="Idioma"').replace('aria-label="Hunt"','aria-label="Buscar"').replace('aria-label="Pack"','aria-label="Manada"').replace('aria-label="Fine print"','aria-label="Avisos"').split('(opens in a new tab)').join('(se abre en otra pestaña)');
mkdirSync(join(root,'es'),{recursive:true});writeFileSync(join(root,'es/index.html'),html);
console.log('home: static EN/ES essentials; no app hydration or delayed copy/fold patches');
