/* Chica's Backyard — content loader, archive, and UX helpers. */
(function(){
  "use strict";
  const API="https://api.github.com/repos/Justonejewelry/Chicas-Map/contents/daily-packs?ref=main";
  const today=new Date().toISOString().slice(0,10);
  const esc=value=>String(value||"").replace(/[&<>"]/g,character=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[character]));
  const strip=value=>String(value||"").replace(/\x60\x60\x60[\s\S]*?\x60\x60\x60/g,"").replace(/^#{1,6}\s+/gm,"").replace(/\*\*(.*?)\*\*/g,"$1").replace(/\[(.*?)\]\((.*?)\)/g,"$1").trim();
  const title=value=>{const match=String(value||"").match(/^#\s+(.+)$/m);return match?strip(match[1]):"A note from Chica";};
  const excerpt=value=>{const clean=strip(value).replace(/\n+/g," ");return clean.length>190?clean.slice(0,187)+"…":clean;};
  const dateFromName=name=>(String(name||"").match(/\d{4}-\d{2}-\d{2}/)||[])[0]||"";

  async function getFiles(){
    const response=await fetch(API,{cache:"no-store"});
    if(!response.ok)throw Error("GitHub "+response.status);
    return (await response.json()).filter(file=>/chica-update-pack\.md$/i.test(file.name)).sort((first,second)=>dateFromName(second.name).localeCompare(dateFromName(first.name)));
  }

  async function getText(file){
    const response=await fetch(file.download_url,{cache:"no-store"});
    if(!response.ok)throw Error("Pack "+response.status);
    return response.text();
  }

  function archiveCard(file,content){
    const date=dateFromName(file.name);
    return '<article class="by-blog-card"><div class="date">'+esc(date)+'</div><h3>'+esc(title(content))+'</h3><p>'+esc(excerpt(content))+'</p><a href="'+esc(file.html_url)+'" target="_blank" rel="noopener noreferrer">Read the full note →</a></article>';
  }

  async function init(){
    const titleEl=document.getElementById("dailyTitle");
    const postEl=document.getElementById("dailyPost");
    const list=document.getElementById("blogList");
    if(!titleEl&&!postEl&&!list)return;
    try{
      const all=await getFiles();
      const usable=all.filter(file=>dateFromName(file.name)<=today);
      const latest=usable[0]||all[0];

      if(latest&&titleEl&&postEl){
        const content=await getText(latest);
        const body=strip(content).replace(/^A note from Chica\s*/i,"");
        titleEl.textContent=title(content);
        postEl.innerHTML=esc(body).split(/\n{2,}/).slice(0,5).map(paragraph=>"<p>"+paragraph.replace(/\n/g," ")+"</p>").join("");
      }

      if(!list)return;
      if(!all.length){
        list.innerHTML='<div class="by-card by-prose"><p>No archive entries yet.</p></div>';
        return;
      }

      const cards=[];
      for(const file of all.slice(0,9)){
        try{cards.push(archiveCard(file,await getText(file)));}catch(_){}
      }
      list.innerHTML=cards.join("")||'<div class="by-card by-prose"><p>The archive is temporarily unavailable.</p></div>';
    }catch(error){
      if(titleEl)titleEl.textContent="Chica is checking the yard…";
      if(postEl)postEl.textContent="The latest Backyard note could not be loaded right now. Try again in a moment.";
      if(list)list.innerHTML='<div class="by-card by-prose"><p>The archive is temporarily unavailable.</p></div>';
      console.warn("[backyard]",error.message);
    }
  }

  function setupCarousel(){
    const carousel=document.querySelector("[data-action-carousel]");
    if(!carousel)return;
    const track=carousel.querySelector(".by-actions");
    const previous=document.querySelector("[data-carousel-prev]");
    const next=document.querySelector("[data-carousel-next]");
    if(!track||!previous||!next)return;

    const step=()=>Math.max(260,Math.round(track.clientWidth*.78));
    const update=()=>{
      const max=track.scrollWidth-track.clientWidth;
      previous.disabled=track.scrollLeft<=2;
      next.disabled=track.scrollLeft>=max-2;
    };

    previous.addEventListener("click",()=>track.scrollBy({left:-step(),behavior:"smooth"}));
    next.addEventListener("click",()=>track.scrollBy({left:step(),behavior:"smooth"}));
    track.addEventListener("scroll",update,{passive:true});
    window.addEventListener("resize",update);
    update();
  }

  function enhance(){
    document.querySelectorAll(".by-card-link,.by-blog-card").forEach((element,index)=>element.style.setProperty("--delay",Math.min(index*35,240)+"ms"));
    const hero=document.querySelector(".by-hero-visual img");
    if(hero)hero.addEventListener("error",function(){this.style.display="none";this.parentElement.classList.add("by-hero-missing");});
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{init();enhance();setupCarousel();});
  else{init();enhance();setupCarousel();}
})();
