/* Chica's Flip Finder: resale estimates, fee-aware profit, haggle helper, weekend matches, haul tracker.
   100% static. Guide prices are rough ranges, not appraisals. Revenue switches live in js/chica-config.js. */
(function () {
  "use strict";
  var BASE = "/Chicas-Map", CFG = window.CHICA_CONFIG || {}, HKEY = "chica-flip-haul-v1";
  var app = document.getElementById("flip-app");
  var lang = document.documentElement.lang === "es" ? "es" : "en";
  // [id, emoji, en, es, garageLow, garageHigh, resaleLow, resaleHigh, ship(S|M|L), search words]
  var ITEMS = [
    ["castiron","🍳","Cast iron skillet","Sartén de hierro",3,10,20,60,"M","cast iron skillet griswold lodge sarten"],
    ["pyrex","🥣","Vintage Pyrex","Pyrex vintage",2,8,15,60,"M","pyrex vintage bowl"],
    ["lego","🧱","LEGO (bulk, per lb)","LEGO (por libra)",3,8,8,15,"M","lego"],
    ["videogame","🎮","Retro video games","Videojuegos retro",2,10,15,80,"S","nintendo sega playstation game cartridge video game"],
    ["console","🕹️","Game console","Consola de videojuegos",15,50,50,200,"M","nintendo playstation xbox console"],
    ["dewalt","🔧","Power tools","Herramientas eléctricas",10,30,35,120,"M","dewalt milwaukee makita ryobi drill tool herramienta"],
    ["handtools","🛠️","Vintage hand tools","Herramientas de mano",1,5,10,40,"M","craftsman snap-on stanley plane wrench tool"],
    ["dresser","🪑","Solid wood dresser","Cómoda de madera",25,80,150,450,"L","dresser furniture mid century mueble"],
    ["mcm","🛋️","Mid-century furniture","Muebles mid-century",20,100,200,800,"L","mid century mcm teak furniture vintage"],
    ["chair","💺","Office/accent chair","Silla de oficina",10,30,50,200,"L","chair herman miller steelcase silla"],
    ["vinyl","💿","Vinyl records","Discos de vinil",0.5,2,5,30,"S","vinyl records lp album"],
    ["books","📚","Books (first ed./sets)","Libros",0.5,2,5,40,"S","books book libro"],
    ["comics","📖","Comic books","Cómics",0.5,3,5,50,"S","comic books marvel dc"],
    ["cards","🃏","Sports/Pokémon cards","Tarjetas Pokémon/deportes",1,10,10,100,"S","pokemon cards baseball cards trading"],
    ["jewelry","💍","Costume & silver jewelry","Joyería de fantasía y plata",1,10,15,75,"S","jewelry sterling silver necklace joya"],
    ["watch","⌚","Watches","Relojes",5,25,30,200,"S","watch seiko citizen reloj"],
    ["camera","📷","Film camera","Cámara de rollo",5,25,40,200,"S","film camera canon nikon minolta polaroid"],
    ["audio","🔊","Vintage stereo/receiver","Estéreo vintage",10,40,80,400,"L","receiver stereo marantz pioneer sansui speakers"],
    ["guitar","🎸","Guitar","Guitarra",25,100,100,400,"L","guitar fender yamaha guitarra"],
    ["designer","👜","Designer purse","Bolsa de diseñador",5,30,50,300,"M","coach michael kors louis vuitton purse bag bolsa"],
    ["jeans","👖","Vintage jeans/denim","Jeans vintage",2,8,25,90,"S","levis jeans denim vintage"],
    ["boots","👢","Cowboy boots","Botas vaqueras",5,25,50,200,"M","cowboy boots lucchese justin ariat botas"],
    ["sneakers","👟","Name-brand sneakers","Tenis de marca",3,15,30,150,"M","nike jordan sneakers shoes tenis"],
    ["kitchenaid","🧁","Stand mixer","Batidora KitchenAid",20,60,100,250,"L","kitchenaid mixer"],
    ["corningware","🫕","CorningWare/Fiesta","CorningWare/Fiesta",2,8,15,50,"M","corningware fiesta fiestaware dishes"],
    ["lamp","💡","Vintage lamp","Lámpara vintage",5,20,40,150,"L","lamp vintage brass lampara"],
    ["art","🖼️","Original art/prints","Arte y cuadros",2,20,30,300,"L","painting art print signed frame cuadro"],
    ["toys","🧸","Vintage toys/action figures","Juguetes vintage",1,10,15,100,"S","star wars action figure hot wheels toy juguete"],
    ["bike","🚲","Bicycle","Bicicleta",15,60,80,300,"L","bike bicycle trek schwinn bicicleta"],
    ["yeti","🧊","YETI cooler/tumbler","YETI hielera/vaso",5,40,25,200,"L","yeti cooler tumbler hielera"],
    ["mower","🌱","Lawn mower","Podadora",20,75,80,250,"L","mower lawn honda toro podadora"],
    ["electronics","💻","Laptop/tablet","Laptop/tableta",20,80,80,300,"M","laptop ipad tablet apple computer"],
    ["babygear","🍼","Baby gear (stroller etc.)","Artículos de bebé",10,30,40,150,"L","stroller uppababy baby car seat bebe"],
    ["holiday","🎄","Vintage holiday decor","Decoración navideña vintage",1,8,15,80,"M","christmas halloween blow mold vintage decor navidad"],
    ["mexican","🌵","Talavera & Mexican folk art","Talavera y arte mexicano",3,20,30,150,"M","talavera mexican folk art pottery tonala"],
    ["other","✨","Something else","Otra cosa",5,20,20,60,"M",""]
  ];
  var T = {
    en: {
      eyebrow: "NEW · BETA · FREE", h1: "Chica's Flip Finder", lede: "Spot a deal at a garage sale? Find out in 10 seconds if it's worth flipping, what to offer, and what to say. Then see which San Antonio sales have more.",
      hi: "Hola, flipper! 🐾 Pick what you found, punch in the price, and I'll sniff out your profit after fees. I even give you the words to haggle in English and Spanish.",
      s1: "What did you find?", s1sub: "Tap one, or type your own.", own: "Item name (optional)", ownPh: "e.g. Griswold #8 skillet",
      s2: "Run the numbers", ask: "Their price", resale: "Est. resale price", plat: "Where you'd sell", cond: "Condition",
      condOpts: ["Like new", "Good", "Rough"], guide: function (a, b, c, d) { return "Chica's guide: garage sales ask $" + a + "–$" + b + " · usually resells $" + c + "–$" + d + ". Check real sold prices before you buy big."; },
      plats: { ebay: "eBay (shipped)", mercari: "Mercari (shipped)", fbship: "FB Marketplace (shipped)", fblocal: "FB Marketplace / OfferUp (local cash)", posh: "Poshmark" },
      ship: "Shipping you pay", flip: "FLIP IT! 🚀", haggle: "HAGGLE FIRST 🤝", pass: "PASS 🙅",
      sayFlip: function (p) { return "Grab it, neighbor! That's about $" + p + " in your pocket after fees. My tail is wagging. 🐾"; },
      sayHaggle: function (m) { return "There's money here, but only if you get it to $" + m + " or less. Try my lines below. 😉"; },
      sayPass: "Ay, no. After fees this one costs you money. Leave it for the next pup. 🐶",
      profit: "Profit", roi: "ROI", max: "Max offer", byPlat: "Profit by platform", best: "best",
      comps: "Check real sold prices", ebaySold: "eBay sold listings", fb: "FB Marketplace SA", goog: "Google",
      add: "＋ Add to my haul", added: "Added to your haul! 🎉",
      s3: "Haggle helper", s3sub: "Tap a line to copy it. English up top, Spanish below, because this is San Antonio. 💜",
      s4: "More of this at sales this weekend", s4sub: "Upcoming San Antonio sales whose posts mention it.", none: "No upcoming posts mention it yet. Check the full map, new sales land every day!", view: "Map →", openMap: "Open the live map",
      s5: "My haul tracker", s5sub: "Saved only on this phone. Share your wins!", empty: "Nothing yet. Add a find above and watch your profit grow.", spent: "Spent", worth: "Est. resale", gain: "Est. profit",
      share: "📸 Share my haul card", clear: "Clear haul", sheet: "🖨️ Print price cheat sheet", copied: "Copied! 🐾", confirm: "Clear your whole haul?",
      proT: "Chica's Flipper Pack", proB: "Printable bilingual haggle cards, the full San Antonio price cheat sheet, and a Saturday sourcing checklist. Supports the free map!", proL: ["Pocket haggle cards (EN/ES)", "Price cheat sheet for 100+ items", "Route + budget planner sheet"],
      buy: function (p) { return "Get the pack · $" + p; }, soon: "Coming soon! Tell Chica you want it", sponT: "Sell your finds locally", sponHouse: "Your San Antonio shop here", sponB: "Consignment, vintage, pawn or buy-sell shop? Put your store in front of local flippers right when they're buying.", sponCta: "Sponsor this spot", visit: "Visit",
      disc: "Guide prices are rough estimates, not appraisals. Fees are approximate 2026 rates and change. Always check sold listings.", aff: "Some eBay links are affiliate links. If you buy, Chicas Map may earn a small commission at no cost to you.",
      phr: [["Would you take $%o?", "¿Me lo deja en $%o?"], ["If I take all of these, would you do $%b?", "Si me llevo todo, ¿me lo deja en $%b?"], ["Any wiggle room on this one?", "¿Me hace un descuentito?"], ["I've got $%o cash right now.", "Traigo $%o en efectivo ahorita."], ["What's the lowest you'd go?", "¿Cuánto es lo menos?"], ["Thank you! Have a great sale!", "¡Gracias! ¡Que le vaya bonito con la venta!"]],
      tip: "Tip: open low, smile, bundle, and come back after 1 PM when sellers want things gone.",
      home: "← Chicas Map", cardTag: "MY GARAGE-SALE HAUL", cardFoot: "Find sales + flip smarter: chicasmap.com/flip", items: "items"
    },
    es: {
      eyebrow: "NUEVO · BETA · GRATIS", h1: "Flip Finder de Chica", lede: "¿Viste una ganga en una venta de garage? Descubre en 10 segundos si vale la pena revenderla, cuánto ofrecer y qué decir. Y mira qué ventas en San Antonio tienen más.",
      hi: "¡Hola, revendedor! 🐾 Elige lo que encontraste, pon el precio y yo olfateo tu ganancia después de comisiones. Hasta te doy las frases para regatear en inglés y español.",
      s1: "¿Qué encontraste?", s1sub: "Toca uno o escribe el tuyo.", own: "Nombre del artículo (opcional)", ownPh: "ej. Sartén Griswold #8",
      s2: "Haz las cuentas", ask: "Su precio", resale: "Precio de reventa est.", plat: "Dónde venderías", cond: "Condición",
      condOpts: ["Como nuevo", "Bueno", "Gastado"], guide: function (a, b, c, d) { return "Guía de Chica: en ventas de garage piden $" + a + "–$" + b + " · normalmente se revende en $" + c + "–$" + d + ". Revisa precios vendidos reales antes de comprar algo grande."; },
      plats: { ebay: "eBay (con envío)", mercari: "Mercari (con envío)", fbship: "FB Marketplace (con envío)", fblocal: "FB Marketplace / OfferUp (efectivo local)", posh: "Poshmark" },
      ship: "Envío que pagas", flip: "¡REVÉNDELO! 🚀", haggle: "REGATEA PRIMERO 🤝", pass: "PÁSALE 🙅",
      sayFlip: function (p) { return "¡Agárralo, vecino! Son como $" + p + " en tu bolsillo después de comisiones. Mi colita se está moviendo. 🐾"; },
      sayHaggle: function (m) { return "Aquí hay dinero, pero solo si lo bajas a $" + m + " o menos. Prueba mis frases abajo. 😉"; },
      sayPass: "Ay, no. Después de comisiones pierdes dinero. Déjalo para el siguiente perrito. 🐶",
      profit: "Ganancia", roi: "ROI", max: "Oferta máx.", byPlat: "Ganancia por plataforma", best: "mejor",
      comps: "Revisa precios vendidos reales", ebaySold: "Vendidos en eBay", fb: "FB Marketplace SA", goog: "Google",
      add: "＋ Agregar a mi botín", added: "¡Agregado a tu botín! 🎉",
      s3: "Ayudante para regatear", s3sub: "Toca una frase para copiarla. Inglés arriba, español abajo, porque esto es San Antonio. 💜",
      s4: "Más de esto en ventas este fin", s4sub: "Ventas próximas en San Antonio que lo mencionan.", none: "Todavía ninguna venta próxima lo menciona. ¡Revisa el mapa, llegan ventas nuevas cada día!", view: "Mapa →", openMap: "Abrir el mapa en vivo",
      s5: "Mi botín", s5sub: "Se guarda solo en este teléfono. ¡Presume tus logros!", empty: "Nada todavía. Agrega un hallazgo arriba y mira crecer tu ganancia.", spent: "Gastado", worth: "Reventa est.", gain: "Ganancia est.",
      share: "📸 Compartir mi botín", clear: "Borrar botín", sheet: "🖨️ Imprimir guía de precios", copied: "¡Copiado! 🐾", confirm: "¿Borrar todo tu botín?",
      proT: "Paquete Flipper de Chica", proB: "Tarjetas bilingües para regatear, la guía completa de precios de San Antonio y una lista para el sábado. ¡Apoya el mapa gratis!", proL: ["Tarjetas de bolsillo para regatear (EN/ES)", "Guía de precios de 100+ artículos", "Hoja de ruta y presupuesto"],
      buy: function (p) { return "Obtener paquete · $" + p; }, soon: "¡Muy pronto! Dile a Chica que lo quieres", sponT: "Vende tus hallazgos aquí mismo", sponHouse: "Tu tienda de San Antonio aquí", sponB: "¿Consignación, vintage, empeño o compra-venta? Pon tu tienda frente a revendedores locales justo cuando están comprando.", sponCta: "Patrocina este espacio", visit: "Visitar",
      disc: "Los precios de la guía son estimados, no avalúos. Las comisiones son tarifas aproximadas de 2026 y cambian. Siempre revisa los vendidos.", aff: "Algunos enlaces de eBay son de afiliado. Si compras, Chicas Map puede ganar una pequeña comisión sin costo para ti.",
      phr: null, tip: "Tip: empieza bajo, sonríe, junta varias cosas y regresa después de la 1 PM cuando quieren vaciar.",
      home: "← Chicas Map", cardTag: "MI BOTÍN DE VENTAS DE GARAGE", cardFoot: "Encuentra ventas y revende mejor: chicasmap.com/flip", items: "artículos"
    }
  };
  T.es.phr = T.en.phr;
  var S = { item: "castiron", name: "", ask: 5, resale: 40, plat: "ebay", cond: 1, ship: null };
  var sales = null, haul = loadHaul();

  function t() { return T[lang]; }
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function item() { for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i][0] === S.item) return ITEMS[i]; return ITEMS[ITEMS.length - 1]; }
  function iname(it) { return S.name || it[lang === "es" ? 3 : 2]; }
  function money(n) { var r = Math.round(n * 100) / 100; return (r < 0 ? "-$" : "$") + Math.abs(r).toFixed(Math.abs(r) >= 100 || r % 1 === 0 ? 0 : 2); }
  function shipDefault(it) { return { S: 5, M: 12, L: 0 }[it[8]]; }
  function fees(p, price) {
    if (price <= 0) return 0;
    if (p === "ebay") return price * 0.136 + 0.4;
    if (p === "mercari") return price * 0.10 + price * 0.029 + 0.5;
    if (p === "fbship") return Math.max(0.8, price * 0.10);
    if (p === "posh") return price < 15 ? 2.95 : price * 0.20;
    return 0;
  }
  function shipFor(p) { return p === "fblocal" ? 0 : (S.ship == null ? shipDefault(item()) || 15 : S.ship); }
  function calc(p) {
    var price = S.resale * [1, 0.85, 0.6][S.cond], f = fees(p, price), sh = shipFor(p), net = price - f - sh, profit = net - S.ask;
    return { price: price, fees: f, ship: sh, net: net, profit: profit, roi: S.ask > 0 ? profit / S.ask : (profit > 0 ? 99 : 0), max: Math.max(0, Math.floor(net / 2)) };
  }
  function bestPlat() { var b = null; Object.keys(T.en.plats).forEach(function (p) { if (p === "fblocal" && item()[8] === "S") return; var c = calc(p); if (!b || c.profit > b.c.profit) b = { p: p, c: c }; }); return b; }
  function words() {
    var it = item(), w = (S.name ? S.name : it[9] || it[2]).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return w.split(/[^a-z0-9]+/).filter(function (x) { return x.length > 3 && ["vintage", "with", "from", "bulk"].indexOf(x) < 0; });
  }
  function q() { var it = item(); return S.name || (it[0] === "other" ? "" : it[2].replace(/\(.*\)/, "").trim()); }
  function ebayUrl() {
    var u = "https://www.ebay.com/sch/i.html?_nkw=" + encodeURIComponent(q()) + "&LH_Sold=1&LH_Complete=1";
    var c = String(CFG.FLIP_EBAY_CAMPID || "").replace(/\D/g, "");
    if (c) u += "&mkevt=1&mkcid=1&mkrid=711-53200-19255-0&campid=" + c + "&toolid=10001&customid=flipfinder";
    return u;
  }
  function today() { try { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); } }
  function loadHaul() { try { return JSON.parse(localStorage.getItem(HKEY)) || []; } catch (e) { return []; } }
  function saveHaul() { try { localStorage.setItem(HKEY, JSON.stringify(haul)); } catch (e) {} }
  function toast(msg) { var el = $("ff-toast"); if (!el) return; el.textContent = msg; el.classList.add("on"); clearTimeout(toast._t); toast._t = setTimeout(function () { el.classList.remove("on"); }, 1800); }

  function shell() {
    var L = t();
    document.title = L.h1 + " · Chicas Map";
    document.querySelectorAll(".ff-lang button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.lang === lang)); });
    var chips = ITEMS.map(function (it) { return '<button type="button" class="ff-chip" data-item="' + it[0] + '" aria-pressed="' + (it[0] === S.item) + '">' + it[1] + " " + esc(it[lang === "es" ? 3 : 2]) + "</button>"; }).join("");
    var platOpts = Object.keys(L.plats).map(function (p) { return '<option value="' + p + '"' + (p === S.plat ? " selected" : "") + ">" + L.plats[p] + "</option>"; }).join("");
    var condOpts = L.condOpts.map(function (c, i) { return '<option value="' + i + '"' + (i === S.cond ? " selected" : "") + ">" + c + "</option>"; }).join("");
    var spon = CFG.FLIP_SPONSOR && CFG.FLIP_SPONSOR.url
      ? '<h2>🏪 ' + esc(CFG.FLIP_SPONSOR.name) + '</h2><p class="sub">' + esc(lang === "es" && CFG.FLIP_SPONSOR.es ? CFG.FLIP_SPONSOR.es : CFG.FLIP_SPONSOR.blurb) + '</p><div class="ff-btns"><a class="ff-btn pri" rel="sponsored noopener" target="_blank" href="' + esc(CFG.FLIP_SPONSOR.url) + '">' + L.visit + " →</a></div>"
      : '<p class="sub" style="margin:0 0 4px;color:var(--gold);font-weight:800;letter-spacing:.08em;font-size:11px">' + L.sponT.toUpperCase() + '</p><h2>🏪 ' + L.sponHouse + '</h2><p class="sub">' + L.sponB + '</p><div class="ff-btns"><a class="ff-btn" href="' + BASE + '/sponsors/">' + L.sponCta + " →</a></div>";
    var proUrl = String(CFG.FLIP_PRO_PAYMENT_URL || "");
    app.innerHTML =
      '<section class="ff-hero"><p class="eyebrow">' + L.eyebrow + "</p><h1>" + L.h1 + "</h1><p>" + L.lede + "</p></section>" +
      '<div class="ff-chica"><img src="' + BASE + '/images/chica-logo.png" alt="Chica"/><p>' + L.hi + "</p></div>" +
      '<div class="ff-cols"><div>' +
      '<section class="ff-card"><h2><span class="ff-step">1</span>' + L.s1 + '</h2><p class="sub">' + L.s1sub + '</p><div class="ff-chips" id="ff-chips">' + chips + '</div>' +
      '<label class="ff-f" style="margin-top:10px">' + L.own + '<input id="ff-name" type="text" maxlength="60" placeholder="' + esc(L.ownPh) + '" value="' + esc(S.name) + '"/></label></section>' +
      '<section class="ff-card"><h2><span class="ff-step">2</span>' + L.s2 + '</h2><div class="ff-grid">' +
      '<label class="ff-f">' + L.ask + '<span class="ff-money"><input id="ff-ask" type="number" inputmode="decimal" min="0" step="0.5" value="' + S.ask + '"/></span></label>' +
      '<label class="ff-f">' + L.resale + '<span class="ff-money"><input id="ff-resale" type="number" inputmode="decimal" min="0" step="1" value="' + S.resale + '"/></span></label>' +
      '<label class="ff-f full">' + L.plat + '<select id="ff-plat">' + platOpts + "</select></label>" +
      '<label class="ff-f">' + L.cond + '<select id="ff-cond">' + condOpts + "</select></label>" +
      '<label class="ff-f">' + L.ship + '<span class="ff-money"><input id="ff-ship" type="number" inputmode="decimal" min="0" step="1" value="' + shipFor(S.plat === "fblocal" ? "ebay" : S.plat) + '"/></span></label>' +
      '</div><p class="ff-hint" id="ff-guide"></p></section>' +
      '<div id="ff-verdict"></div>' +
      '<section class="ff-card"><h2><span class="ff-step">3</span>' + L.s3 + '</h2><p class="sub">' + L.s3sub + '</p><div class="ff-phr" id="ff-phr"></div><p class="ff-hint">' + L.tip + "</p></section>" +
      '</div><div>' +
      '<section class="ff-card" id="ff-near"><h2>📍 ' + L.s4 + '</h2><p class="sub">' + L.s4sub + '</p><ul class="ff-list" id="ff-near-list"></ul><div class="ff-btns"><a class="ff-btn" href="' + BASE + '/map/">' + L.openMap + "</a></div></section>" +
      '<section class="ff-card" id="ff-haul"><h2>🧺 ' + L.s5 + '</h2><p class="sub">' + L.s5sub + '</p><div id="ff-haul-body"></div></section>' +
      '<section class="ff-card ff-pro"><h2>⭐ ' + L.proT + '</h2><p class="sub" style="color:#f3e2c0">' + L.proB + "</p><ul>" + L.proL.map(function (x) { return "<li>" + x + "</li>"; }).join("") + '</ul><div class="ff-btns">' +
      (proUrl ? '<a class="ff-btn gold" target="_blank" rel="noopener" href="' + esc(proUrl) + '">' + L.buy(CFG.FLIP_PRO_PRICE_USD || 7) + "</a>" : '<a class="ff-btn gold" href="' + BASE + '/bulletin/">' + L.soon + "</a>") +
      '<button type="button" class="ff-btn" id="ff-print">' + L.sheet + "</button></div></section>" +
      '<section class="ff-card ff-spon">' + spon + "</section>" +
      "</div></div>" +
      '<div id="ff-sheet"></div>' +
      '<p class="ff-foot">' + L.disc + (CFG.FLIP_EBAY_CAMPID ? " " + L.aff : "") + '<br/><a href="' + BASE + '/">' + L.home + "</a></p>" +
      '<div class="ff-toast" id="ff-toast" role="status"></div>';
    bind(); update(); near(); renderHaul();
  }

  function update() {
    var L = t(), it = item(), c = calc(S.plat), b = bestPlat();
    $("ff-guide").textContent = L.guide(it[4], it[5], it[6], it[7]);
    var kind = c.profit >= 10 && c.roi >= 1 ? "flip" : (c.max >= 1 && c.net >= 2 ? "haggle" : "pass");
    var say = kind === "flip" ? L.sayFlip(Math.round(c.profit)) : kind === "haggle" ? L.sayHaggle(c.max) : L.sayPass;
    var plats = Object.keys(L.plats).map(function (p) { var x = calc(p); return '<div class="' + (b && b.p === p ? "best" : "") + '"><span>' + L.plats[p] + (b && b.p === p ? "<em>★ " + L.best + "</em>" : "") + "</span><b>" + money(x.profit) + "</b></div>"; }).join("");
    $("ff-verdict").innerHTML = '<section class="ff-verdict ' + kind + '"><span class="tag">' + esc(iname(it)) + '</span><div class="big">' + L[kind] + '</div><p class="say">' + say + "</p>" +
      '<div class="ff-stats"><div><b>' + money(c.profit) + "</b><span>" + L.profit + "</span></div><div><b>" + (S.ask > 0 ? Math.round(c.roi * 100) + "%" : "∞") + "</b><span>" + L.roi + "</span></div><div><b>" + money(c.max) + "</b><span>" + L.max + "</span></div></div>" +
      '<p class="ff-hint" style="margin-top:12px;font-weight:700">' + L.byPlat + '</p><div class="ff-plat">' + plats + "</div>" +
      '<p class="ff-hint" style="margin-top:12px;font-weight:700">' + L.comps + '</p><div class="ff-btns" style="margin-top:6px">' +
      '<a class="ff-btn" target="_blank" rel="noopener' + (CFG.FLIP_EBAY_CAMPID ? " sponsored" : "") + '" href="' + ebayUrl() + '">🛒 ' + L.ebaySold + "</a>" +
      '<a class="ff-btn" target="_blank" rel="noopener" href="https://www.facebook.com/marketplace/sanantonio/search?query=' + encodeURIComponent(q()) + '">🏷️ ' + L.fb + "</a>" +
      '<a class="ff-btn" target="_blank" rel="noopener" href="https://www.google.com/search?q=' + encodeURIComponent(q() + " sold price") + '">🔎 ' + L.goog + "</a></div>" +
      '<div class="ff-btns"><button type="button" class="ff-btn pri" id="ff-add">' + L.add + "</button></div></section>";
    $("ff-add").onclick = function () { haul.unshift({ n: iname(it), p: +S.ask || 0, v: Math.round(c.net * 100) / 100, e: it[1], d: today() }); saveHaul(); renderHaul(); toast(L.added); };
    var o = Math.max(1, Math.min(c.max || 1, Math.floor(S.ask * 0.6) || 1)), bn = Math.max(1, Math.round(S.ask * 1.6));
    $("ff-phr").innerHTML = T.en.phr.map(function (p) { var f = function (s) { return s.replace(/%o/g, o).replace(/%b/g, bn); }; return '<button type="button" data-copy="' + esc(f(p[0]) + " / " + f(p[1])) + '"><b>' + esc(f(p[0])) + "</b><span>" + esc(f(p[1])) + "</span></button>"; }).join("");
    $("ff-phr").querySelectorAll("button").forEach(function (btn) { btn.onclick = function () { try { navigator.clipboard.writeText(btn.dataset.copy); } catch (e) {} toast(L.copied); }; });
  }

  function near() {
    var L = t(), ul = $("ff-near-list"); if (!ul) return;
    function draw() {
      var w = words(), d = today();
      var hits = !w.length ? [] : (sales || []).filter(function (s) {
        if ((s.date_to || s.date_end || "9999") < d) return false;
        var h = [s.title, s.details, s.description, (s.categories || []).join(" ")].join(" ").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return w.some(function (x) { return h.indexOf(x) !== -1 || (x.length > 4 && h.indexOf(x.replace(/s$/, "")) !== -1); });
      }).slice(0, 6);
      ul.innerHTML = hits.length ? hits.map(function (s) {
        var id = s.external_id || s.id || "";
        return "<li><span><b>" + esc(s.title || "Sale") + "</b></span><a href=\"" + BASE + "/map/?sale=" + encodeURIComponent(id) + "\">" + L.view + "</a><small>" + esc((s.dates || "") + (s.hours ? " · " + s.hours : "")) + " · " + esc(String(s.address || "").replace(/, ?(SAN ANTONIO|San Antonio).*/i, "")) + "</small></li>";
      }).join("") : '<li><small style="grid-column:1/-1">' + L.none + "</small></li>";
    }
    if (sales) return draw();
    fetch(BASE + "/data/sales-clean.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (j) { sales = (j.public || []).concat(j.unconfirmed || []); draw(); }).catch(function () { sales = []; draw(); });
  }

  function totals() { var s = 0, v = 0; haul.forEach(function (h) { s += +h.p || 0; v += +h.v || 0; }); return { s: s, v: v, g: v - s }; }
  function renderHaul() {
    var L = t(), el = $("ff-haul-body"), tt = totals();
    el.innerHTML = '<div class="ff-haulsum"><div><b style="color:var(--ink)">' + money(tt.s) + "</b><span>" + L.spent + "</span></div><div><b style=\"color:#c9a6ff\">" + money(tt.v) + "</b><span>" + L.worth + "</span></div><div><b>" + money(tt.g) + "</b><span>" + L.gain + "</span></div></div>" +
      (haul.length ? '<ul class="ff-list">' + haul.map(function (h, i) { return "<li><span>" + esc(h.e || "✨") + " <b>" + esc(h.n) + "</b></span><button class=\"ff-x\" data-i=\"" + i + "\" aria-label=\"Remove\">×</button><small>" + money(h.p) + " → " + money(h.v) + "</small></li>"; }).join("") + "</ul>" +
        '<div class="ff-btns"><button type="button" class="ff-btn pri" id="ff-share">' + L.share + '</button><button type="button" class="ff-btn" id="ff-clear">' + L.clear + "</button></div>"
        : '<p class="ff-hint">' + L.empty + "</p>");
    el.querySelectorAll(".ff-x").forEach(function (b) { b.onclick = function () { haul.splice(+b.dataset.i, 1); saveHaul(); renderHaul(); }; });
    if ($("ff-clear")) $("ff-clear").onclick = function () { if (confirm(L.confirm)) { haul = []; saveHaul(); renderHaul(); } };
    if ($("ff-share")) $("ff-share").onclick = shareCard;
  }

  function shareCard() {
    var L = t(), tt = totals(), cv = document.createElement("canvas"), W = 1080, H = 1350; cv.width = W; cv.height = H;
    var x = cv.getContext("2d"), g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#3a1240"); g.addColorStop(0.6, "#161018"); g.addColorStop(1, "#24113f");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    var img = new Image(); img.onload = go; img.onerror = go; img.src = BASE + "/images/chica-logo.png";
    function go() {
      try { if (img.naturalWidth) { x.save(); x.beginPath(); x.arc(W / 2, 200, 110, 0, 7); x.clip(); x.drawImage(img, W / 2 - 110, 90, 220, 220); x.restore(); } } catch (e) {}
      x.textAlign = "center"; x.fillStyle = "#ffc94d"; x.font = "800 34px Inter, sans-serif"; x.fillText(L.cardTag, W / 2, 370);
      x.fillStyle = "#4ade80"; x.font = "800 150px Syne, Inter, sans-serif"; x.fillText("+" + money(tt.g).replace("-", "−"), W / 2, 540);
      x.fillStyle = "#e8dcef"; x.font = "600 40px Inter, sans-serif"; x.fillText(L.spent + " " + money(tt.s) + "  →  " + L.worth + " " + money(tt.v), W / 2, 610);
      x.textAlign = "left"; x.font = "600 44px Inter, sans-serif";
      haul.slice(0, 6).forEach(function (h, i) { var y = 720 + i * 82; x.fillStyle = "#ffffff14"; x.fillRect(90, y - 56, W - 180, 70); x.fillStyle = "#fff"; x.fillText((h.e || "✨") + " " + String(h.n).slice(0, 26), 115, y); x.textAlign = "right"; x.fillStyle = "#ed65dc"; x.fillText(money(h.p) + " → " + money(h.v), W - 115, y); x.textAlign = "left"; });
      x.textAlign = "center"; x.fillStyle = "#c513af"; x.fillRect(0, H - 150, W, 150); x.fillStyle = "#fff"; x.font = "800 42px Inter, sans-serif"; x.fillText(L.cardFoot, W / 2, H - 62);
      cv.toBlob(function (blob) {
        if (!blob) return;
        var file = new File([blob], "chica-haul.png", { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: L.h1, text: L.cardFoot }).catch(function () {}); return; }
        var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "chica-haul.png"; document.body.appendChild(a); a.click(); a.remove();
      }, "image/png");
    }
  }

  function sheet() {
    var L = t();
    $("ff-sheet").innerHTML = "<h2>" + L.h1 + " · San Antonio</h2><table><tr><th></th><th>" + L.ask + "</th><th>" + L.resale + "</th></tr>" + ITEMS.filter(function (i) { return i[0] !== "other"; }).map(function (i) { return "<tr><td>" + i[1] + " " + esc(i[lang === "es" ? 3 : 2]) + "</td><td>$" + i[4] + "–$" + i[5] + "</td><td>$" + i[6] + "–$" + i[7] + "</td></tr>"; }).join("") + "</table><p>" + L.disc + "</p><p>chicasmap.com/flip</p>";
    window.print();
  }

  function bind() {
    $("ff-chips").addEventListener("click", function (e) {
      var b = e.target.closest(".ff-chip"); if (!b) return;
      S.item = b.dataset.item; var it = item(); S.name = ""; $("ff-name").value = "";
      S.ask = Math.round((it[4] + it[5]) / 2 * 2) / 2; S.resale = Math.round((it[6] + it[7]) / 2); S.ship = null;
      if (it[8] === "L" && S.plat !== "fblocal") S.plat = "fblocal";
      if (it[8] !== "L" && S.plat === "fblocal") S.plat = "ebay";
      $("ff-ask").value = S.ask; $("ff-resale").value = S.resale; $("ff-plat").value = S.plat; $("ff-ship").value = shipFor(S.plat === "fblocal" ? "ebay" : S.plat);
      document.querySelectorAll(".ff-chip").forEach(function (c) { c.setAttribute("aria-pressed", String(c === b)); });
      update(); near();
    });
    $("ff-name").addEventListener("input", function () { S.name = this.value.trim(); update(); clearTimeout(bind._n); bind._n = setTimeout(near, 300); });
    $("ff-ask").addEventListener("input", function () { S.ask = Math.max(0, parseFloat(this.value) || 0); update(); });
    $("ff-resale").addEventListener("input", function () { S.resale = Math.max(0, parseFloat(this.value) || 0); update(); });
    $("ff-ship").addEventListener("input", function () { S.ship = Math.max(0, parseFloat(this.value) || 0); update(); });
    $("ff-plat").addEventListener("change", function () { S.plat = this.value; update(); });
    $("ff-cond").addEventListener("change", function () { S.cond = +this.value; update(); });
    $("ff-print").onclick = sheet;
  }
  document.querySelectorAll(".ff-lang button").forEach(function (b) {
    b.addEventListener("click", function () { lang = b.dataset.lang; document.documentElement.lang = lang; try { localStorage.setItem("chicas-map-locale", lang); } catch (e) {} shell(); });
  });
  var it0 = item(); S.ask = 5; S.resale = Math.round((it0[6] + it0[7]) / 2);
  shell();
})();
