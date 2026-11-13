/* /submit/: optional photo link field + friendlier "what happens next" note.
   Delivery is handled by form-intake.js (FormSubmit -> owner inbox). */
(function () {
  function isEs() { if ((document.documentElement.lang || "").slice(0, 2) === "es") return true; try { return localStorage.getItem("chicas-map-locale") === "es"; } catch (e) { return false; } }
  if (!/\/submit\/?$|submit\.html$/.test(location.pathname || "")) return;
  function addPhoto(form) {
    if (form.querySelector('[name="photo_url"]')) return;
    var email = form.querySelector('[name="email"]');
    var anchor = email ? (email.closest("label") || email.parentNode) : null;
    var wrap = document.createElement("label");
    wrap.className = "block";
    wrap.style.cssText = "display:block;margin-top:16px";
    wrap.innerHTML =
      '<span style="display:block;font-weight:600;margin-bottom:6px">' + (isEs() ? "Enlace de foto (opcional)" : "Photo link (optional)") + '</span>' +
      '<input name="photo_url" type="url" inputmode="url" placeholder="' + (isEs() ? "Pega un enlace de Facebook, Marketplace, Google Photos o Imgur" : "Paste a Facebook, Marketplace, Google Photos or Imgur link") + '" ' +
      'style="width:100%;min-height:44px;padding:10px 12px;border:1px solid rgba(0,0,0,.2);border-radius:10px;font:inherit;background:#fff">' +
      '<span style="display:block;font-size:13px;opacity:.75;margin-top:4px">' + (isEs() ? "¿Tienes foto de tus cositas? Pega un enlace público y Chica la agrega a tu pin." : "Got a photo of your goodies? Drop a public link and Chica will add it to your pin.") + '</span>';
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
    else form.appendChild(wrap);
  }
  function addNext(root) {
    if (document.getElementById("chica-next-steps")) return;
    var p = document.createElement("p");
    p.id = "chica-next-steps";
    p.style.cssText = "margin-top:12px;padding:12px 14px;border-radius:12px;background:#fff3fb;color:#4a0b41;font-weight:500";
    p.textContent = isEs() ? "Lo que sigue: Chica revisa cada venta, casi siempre en un día. Cuando se aprueba, tu pin sale en chicasmap.com/map y en la lista del fin. ¡Comparte el mapa con tus vecinos para que lleguen! \ud83d\udc3e" : "What happens next: Chica sniffs out every sale, usually within a day. Once it's approved, your pin shows up on chicasmap.com/map and in the weekend list. Share the map with your neighbors so they come by! \ud83d\udc3e";
    root.appendChild(p);
  }
  var tries = 0;
  var id = setInterval(function () {
    tries += 1;
    var form = document.querySelector("main form");
    if (form) addPhoto(form);
    var main = document.querySelector("main");
    if (main && !form && /got it|lo tengo|recib/i.test(main.textContent || "")) addNext(main.querySelector("section,div") || main);
    if (tries > 600) clearInterval(id);
  }, 500);
})();
