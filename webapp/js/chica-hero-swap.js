(function(){
  var IMG="/Chicas-Map/images/chica-hero.jpg?v=bb7";
  function s(){
    document.querySelectorAll("img").forEach(function(img){
      var x=(img.getAttribute("src")||"")+(img.currentSrc||"");
      if(x.indexOf("chica-hero")!==-1){
        if(img.getAttribute("data-bb")==="1") return;
        img.src=IMG;
        img.alt="Justin and Chica in the bluebonnets";
        img.style.objectPosition="center 35%";
        img.setAttribute("data-bb","1");
      }
    });
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",s);
  else s();
  setInterval(s,1500);
})();
