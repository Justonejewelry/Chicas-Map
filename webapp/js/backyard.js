/* Chica's Backyard — content loader, archive, and UX helpers. */
(function(){
  "use strict";
  const API="https://api.github.com/repos/Justonejewelry/Chicas-Map/contents/daily-packs?ref=main";
  const today=new Date().toISOString().slice(0,10);
  const esc=s=>String(s||"").replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]));
  const strip=s=>String(s||"").replace(/```[\s\S]*?```/g,"").replace(/^#{1,6}\s+/gm,"").replace(/\*\*(.*?)\*\*/g,"$1").replace(/\[(.*?)\]\((.*?)\)/g,"$1").trim();
  const title=s=>{const m=String(s||"").match(/^#\s+(.+)$/m);return m?strip(m[1]):"A note from Chica"};
  const excerpt=s=>{const clean=strip(s).replace(/\n+/g," ");return clean.length>190?clean.slice(0,187)+"…":clean};
  const dateFromName=n=>(String(n||"").match(/\d{4}-\d{2}-\d{2}/)||[])[0]||"";
  async function files(){const r=await fetch(API,{cache:"no-store"});if(!r.ok)throw Error("GitHub "+r.status);return (await r.json()).filter(x=>/chica-update-pack\.md$/i.test(x.name)).sort((a,b)=>dateFromName(b.name).localeCompare(dateFromName(a.name)))}
  async function text(file){const r=await fetch(file.download_url,{cache:"no-store"});if(!r.ok)throw Error("Pack "+r.status);return r.text()}
  async function init(){
    const titleEl=document.getElementById("dailyTitle"),postEl=document.getElementById("dailyPost"),list=document.getElementById("blogList");
    if(!titleEl||!postEl||!list)return;
    try{
      const all=await files(),usable=all.filter(x=>dateFromName(x.name)<=today),latest=usable[0]||all[0];
      if(latest){const md=await text(latest);titleEl.textContent=title(md);const body=strip(md).replace(/^A note from Chica\s*/i,"");postEl.innerHTML=esc(body).split(/\n{2,}/).slice(0,5).map(p=>`<p>${p.replace(/\n/g," ")}</p>`).join("")}
      if(!all.length){list.innerHTML='<div class="by-card by-prose"><p>No archive entries yet.</p></div>';return}
      const cards=[];for(const f of all.slice(0,9)){try{const md=await text(f),d=dateFromName(f);cards.push(`<article class="by-blog-card"><div class="date">${esc(d)}</div><h3>${esc(title(md))}</h3><p>${esc(excerpt(md))}</p><a href="${esc(f.html_url)}" target="_blank" rel="noopener noreferrer">Read the full note →</a></article>`)}catch(_){}}
      list.innerHTML=cards.join("")||'<div class="by-card by-prose"><p>The archive is temporarily unavailable.</p></div>';
    }catch(e){titleEl.textContent="Chica is checking the yard…";postEl.textContent="The latest Backyard note could not be loaded right now. Try again in a moment.";list.innerHTML='<div class="by-card by-prose"><p>The archive is temporarily unavailable.</p></div>';console.warn("[backyard]",e.message)}
  }
  function enhance(){document.querySelectorAll('.by-feature,.by-card-link,.by-blog-card').forEach((el,i)=>el.style.setProperty('--delay',Math.min(i*35,240)+'ms'));const hero=document.querySelector('.by-hero-visual img');if(hero)hero.addEventListener('error',function(){this.style.display='none';this.parentElement.classList.add('by-hero-missing')})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{init();enhance()});else{init();enhance()}
})();
