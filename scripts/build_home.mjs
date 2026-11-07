#!/usr/bin/env node
// The homepage is plain HTML, not a hydrated app with post-paint DOM patches.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
const root=process.argv[2]||'_site';
const es={sponsors:'Patrocinios',skip:'Ir al contenido',tagline:'VER ES GRATIS. PUBLICAR ES GRATIS.',title:'Encuentra las ventas que valen el viaje.',lede:'Tu guía vecinal de ventas de garaje, patio y bienes en San Antonio.',add:'Agregar mi venta',calendar:'Calendario de ventas',hoods:'Ventas por vecindario',map:'Abrir el mapa',list:'Lista de ventas',liveMap:'Mapa en vivo · San Antonio',fullscreen:'Pantalla completa',hoodIntro:'Elige tu zona, vecino. 🐾',allHoods:'Ver todos los vecindarios',subscribe:'Calendario y suscripción',footer:'Hecho por un vecino. Siempre gratis para ver y publicar.',story:'Nuestra historia',contact:'Contacto',privacy:'Privacidad',legal:'Aviso legal'};
let html=readFileSync(join(root,'index.html'),'utf8');
if(!html.includes('data-home-static'))throw new Error('Expected a static homepage');
html=html.replace('<html lang="en"','<html lang="es"').replace(/(data-home-i18n="([^"]+)"[^>]*>)[^<]*/g,(_,start,key)=>{if(!es[key])throw new Error('Missing Spanish copy: '+key);return start+es[key];});
// Neighborhood landing pages currently exist only in English. Keep those links real.
for(const path of ['submit','calendar','list','claim','atlas','media','backstory','bulletin','privacy','legal','sponsors'])html=html.split('/Chicas-Map/'+path+'/').join('/Chicas-Map/es/'+path+'/');
html=html.replace('aria-label="Language and theme"','aria-label="Idioma y tema"').replace('aria-label="Browse sales"','aria-label="Buscar ventas"').replace('aria-label="More from Chica"','aria-label="Más de Chica"').replace('aria-label="Open the map full screen"','aria-label="Abrir el mapa a pantalla completa"').replace('aria-label="Upcoming sale highlights"','aria-label="Ventas próximas destacadas"');
mkdirSync(join(root,'es'),{recursive:true});writeFileSync(join(root,'es/index.html'),html);
console.log('home: static EN/ES essentials; no app hydration or delayed copy/fold patches');
