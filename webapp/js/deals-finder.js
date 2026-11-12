/* Chica's Deal Finder: is this garage-sale price a deal? Photo ID on-device (CLIP via transformers.js, lazy), price guide,
   verdict vs typical used value + new retail, haggle helper, weekend matches, savings tracker, optional resale math.
   100% static. Guide prices are rough ranges, not appraisals. Revenue switches live in js/chica-config.js. */
(function () {
  "use strict";
  var BASE = "/Chicas-Map", CFG = window.CHICA_CONFIG || {}, HKEY = "chica-flip-haul-v1", TF_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3/dist/transformers.min.js", CLIP = "Xenova/clip-vit-base-patch32";
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
    ["sewing","🧵","Sewing machine","Máquina de coser",10,40,60,250,"L","sewing machine singer bernina"],
    ["typewriter","⌨️","Typewriter","Máquina de escribir",10,30,50,200,"L","typewriter smith corona olympia"],
    ["golf","⛳","Golf clubs","Palos de golf",5,30,30,150,"L","golf clubs callaway taylormade ping"],
    ["fishing","🎣","Fishing reels & lures","Carretes y señuelos",2,15,20,100,"M","fishing reel reels lure lures penn shimano"],
    ["dvd","📀","DVDs/Blu-rays (bulk)","DVDs/Blu-rays",0.5,2,3,15,"S","dvd dvds blu-ray criterion movies"],
    ["perfume","🌸","Designer perfume","Perfume de marca",2,10,20,80,"S","perfume cologne chanel dior"],
    ["dolls","🪆","Vintage dolls/Barbie","Muñecas vintage/Barbie",1,10,15,100,"S","barbie doll dolls american girl muneca"],
    ["smallappl","🍲","Instant Pot/Vitamix/Ninja","Instant Pot/Vitamix/Ninja",10,40,40,200,"M","instant pot vitamix ninja blender air fryer"],
    ["hotwheels","🏎️","Hot Wheels/die-cast","Hot Wheels/autitos",0.25,2,3,30,"S","hot wheels matchbox diecast redline"],
    ["coins","🪙","Coins & silver","Monedas y plata",1,20,15,100,"S","coins coin silver dollar moneda"],
    ["saw","🪚","Table/miter saw","Sierra de mesa/ingletadora",30,100,100,350,"L","table saw miter saw"],
    ["exercise","🏋️","Exercise equipment","Equipo de ejercicio",20,80,80,400,"L","peloton bowflex weights dumbbells treadmill gym"],
    ["washer","💦","Pressure washer/generator","Hidrolavadora/generador",30,100,100,350,"L","pressure washer generator"],
    ["patio","🪴","Patio furniture","Muebles de patio",20,60,80,300,"L","patio outdoor furniture"],
    ["other","✨","Something else","Otra cosa",5,20,20,60,"M",""]
  ];
  var NEW = { castiron: [25, 60], pyrex: [15, 40], console: [300, 500], dewalt: [100, 250], dresser: [300, 900], chair: [100, 400], kitchenaid: [300, 500], lamp: [40, 150], guitar: [150, 600], bike: [250, 700], yeti: [35, 350], mower: [250, 500], electronics: [300, 1100], babygear: [150, 900], sneakers: [90, 180], boots: [180, 450], designer: [200, 600], jeans: [60, 100], watch: [100, 400], sewing: [150, 400], golf: [300, 900], smallappl: [80, 400], saw: [200, 600], exercise: [200, 1500], washer: [200, 700], patio: [200, 900], camera: [400, 900], books: [15, 30], dvd: [10, 25], perfume: [80, 160] };
  // Extra words that help the photo model recognise each item.
  var PHOTO = { castiron: "a black cast iron frying pan", pyrex: "a vintage Pyrex glass mixing bowl", lego: "a pile of LEGO bricks", videogame: "video game cartridges", console: "a video game console", dewalt: "a cordless power drill", handtools: "old hand tools like wrenches and planes", dresser: "a wooden dresser with drawers", mcm: "mid-century modern furniture", chair: "an office chair", vinyl: "vinyl records", books: "a stack of books", comics: "comic books", cards: "trading cards", jewelry: "jewelry necklaces and rings", watch: "a wristwatch", camera: "a film camera", audio: "a vintage stereo receiver", guitar: "a guitar", designer: "a designer handbag purse", jeans: "denim jeans", boots: "cowboy boots", sneakers: "sneakers shoes", kitchenaid: "a KitchenAid stand mixer with a tilting head and metal bowl", corningware: "CorningWare casserole dishes", lamp: "a table lamp", art: "a framed painting", toys: "vintage action figures toys", bike: "a bicycle", yeti: "a cooler or insulated tumbler", mower: "a lawn mower", electronics: "a laptop computer or tablet", babygear: "a baby stroller", holiday: "Christmas decorations", mexican: "colorful Talavera Mexican pottery", sewing: "a sewing machine", typewriter: "a typewriter", golf: "golf clubs in a bag", fishing: "a fishing reel and rod", dvd: "DVD movies", perfume: "a perfume bottle", dolls: "a doll", smallappl: "an Instant Pot pressure cooker, a blender jar or an air fryer", hotwheels: "toy die-cast cars", coins: "coins", saw: "a table saw or miter saw", exercise: "exercise equipment dumbbells", washer: "a pressure washer or generator", patio: "outdoor patio furniture" };
  var T = {
    en: {
      eyebrow: "NEW · BETA · FREE", h1: "Chica's Deal Finder", lede: "Snap a photo or pick the item, enter their price, and Chica tells you in seconds: great deal, fair price, haggle, or pass. Plus what to offer and what to say.",
      hi: "Hola, treasure hunter! 🐾 Show me what you found and tell me their price. I'll sniff out if it's a real deal, and even give you the words to haggle in English and Spanish.",
      s1: "What did you find?", s1sub: "Tap one, or type your own.", own: "Item name (optional)", ownPh: "e.g. Griswold #8 skillet",
      s2: "Is it a deal?", ask: "Their price", resale: "Typical used price", plat: "Where you'd sell", cond: "Condition",
      condOpts: ["Like new", "Good", "Rough"], guide: function (a, b, c, d) { return "Chica's guide: garage sales ask $" + a + "–$" + b + " · usually resells $" + c + "–$" + d + ". Check real sold prices before you buy big."; }, newR: function (a, b) { return " New in store: about $" + a + "–$" + b + "."; },
      plats: { ebay: "eBay (shipped)", mercari: "Mercari (shipped)", fbship: "FB Marketplace (shipped)", fblocal: "FB Marketplace / OfferUp (local cash)", posh: "Poshmark" },
      ship: "Shipping you pay", great: "GREAT DEAL! 🎉", fair: "FAIR PRICE 👍", haggle: "HAGGLE FIRST 🤝", pass: "PASS 🙅",
      sayGreat: function (p) { return "Grab it, neighbor! You're saving about $" + p + " vs. what it usually goes for used. My tail is wagging. 🐾"; }, sayFair: "That's a fair garage-sale price. Buy it if you love it, or try a friendly offer. 😊", sayNew: "Careful! That's close to what it costs brand new. 🙅",
      sayHaggle: function (m) { return "A little high for used. Offer around $" + m + " and see what they say. Try my lines below. 😉"; },
      sayPass: "Ay, no. That's more than it usually sells for used. Leave it for the next pup. 🐶",
      profit: "Profit", roi: "ROI", max: "Max offer", save: "You save", pct: "Of used value", offer: "Offer this", resellT: "Want to resell it?", resellSub: "Profit after fees if you flip it online or locally.", byPlat: "Profit by platform", best: "best",
      comps: "Check real sold prices", ebaySold: "eBay sold listings", fb: "FB Marketplace SA", goog: "Google",
      add: "＋ Save to my deals", added: "Saved to your deals! 🎉",
      s3: "Haggle helper", s3sub: "Tap a line to copy it. English up top, Spanish below, because this is San Antonio. 💜",
      s4: "More of this at sales this weekend", s4sub: "Upcoming San Antonio sales whose posts mention it.", none: "No upcoming posts mention it yet. Check the full map, new sales land every day!", view: "Map →", openMap: "Open the live map",
      s5: "My deals", s5sub: "Saved only on this phone. Share your wins!", empty: "Nothing yet. Save a find above and watch your savings grow.", spent: "Spent", worth: "Worth", gain: "Saved",
      share: "📸 Share my deals card", clear: "Clear deals", sheet: "🖨️ Print price cheat sheet", copied: "Copied! 🐾", confirm: "Clear all your saved deals?",
      proT: "Chica's Deal Hunter Pack", proB: "Printable bilingual haggle cards, the full San Antonio price cheat sheet, and a Saturday sourcing checklist. Supports the free map!", proL: ["Pocket haggle cards (EN/ES)", "Price cheat sheet for 100+ items", "Route + budget planner sheet"],
      buy: function (p) { return "Get the pack · $" + p; }, soon: "Coming soon! Tell Chica you want it", sponT: "Sell your finds locally", sponHouse: "Your San Antonio shop here", sponB: "Consignment, vintage, pawn or buy-sell shop? Put your store in front of local bargain hunters right when they're buying.", sponCta: "Sponsor this spot", visit: "Visit",
      disc: "Guide prices are rough estimates, not appraisals. Fees are approximate 2026 rates and change. Always check sold listings.", aff: "Some eBay links are affiliate links. If you buy, Chicas Map may earn a small commission at no cost to you.",
      phr: [["Would you take $%o?", "¿Me lo deja en $%o?"], ["If I take all of these, would you do $%b?", "Si me llevo todo, ¿me lo deja en $%b?"], ["Any wiggle room on this one?", "¿Me hace un descuentito?"], ["I've got $%o cash right now.", "Traigo $%o en efectivo ahorita."], ["What's the lowest you'd go?", "¿Cuánto es lo menos?"], ["Thank you! Have a great sale!", "¡Gracias! ¡Que le vaya bonito con la venta!"]],
      tip: "Tip: open low, smile, bundle, and come back after 1 PM when sellers want things gone.",
      ph: "Snap a photo 📸", phG: "🖼️ Pick from gallery", phNote: "Your photo stays on your phone. Chica looks at it right here, nothing is uploaded.", phLoad: "Chica is sniffing it out…", phFirst: "First time takes a bit (downloading Chica's nose, ~90 MB, then it's cached).", phPick: "Is it one of these? Tap to confirm:", phFail: "My nose is stuffy on this device. 🤧 Just pick the item from the list below.", or: "or pick it yourself",
      fromSale: "Sniff sniff! 🐾 I picked what this sale mentions. Snap a photo or tap a different item if you spotted something else, and enter their price.",
      visLoad: "Chica is studying your photo…", visSee: "I see:", visBrand: "Brand", visModel: "Model", visSure: "sure", visPick: "Not quite? Tap another guess:", visWhy: "Chica's eyes",
      eHead: "eBay right now · asking prices (not sold)", eLow: "Low", eMid: "Median", eHigh: "High", eCount: function (n) { return n + " comparable used listings"; },
      eNote: "These are what sellers are asking, and items usually sell for less. Chica's verdict trims about 15% off the median. Tap \"eBay sold listings\" below for real sold prices.",
      eLive: function (a, b, c) { return "eBay asking prices right now: $" + a + "–$" + c + ", median $" + b + "."; }, eEx: "A few listings like it:",
      phNoteCloud: "Your photo is sent to Chica's helper to identify it and look up prices. It isn't stored. If the helper is busy, Chica checks it on your phone instead.",
      home: "← Chicas Map", cardTag: "MY GARAGE-SALE DEALS", cardFoot: "Is it a deal? Ask Chica: chicasmap.com/deals", items: "items"
    },
    es: {
      eyebrow: "NUEVO · BETA · GRATIS", h1: "Buscador de Gangas de Chica", lede: "Toma una foto o elige el artículo, pon su precio y Chica te dice en segundos: gran ganga, precio justo, regatea o pásale. Y qué ofrecer y qué decir.",
      hi: "¡Hola, cazador de tesoros! 🐾 Enséñame lo que encontraste y dime su precio. Yo olfateo si es una ganga de verdad, y hasta te doy las frases para regatear en inglés y español.",
      s1: "¿Qué encontraste?", s1sub: "Toca uno o escribe el tuyo.", own: "Nombre del artículo (opcional)", ownPh: "ej. Sartén Griswold #8",
      s2: "¿Es ganga?", ask: "Su precio", resale: "Precio usado típico", plat: "Dónde venderías", cond: "Condición",
      condOpts: ["Como nuevo", "Bueno", "Gastado"], guide: function (a, b, c, d) { return "Guía de Chica: en ventas de garage piden $" + a + "–$" + b + " · normalmente se revende en $" + c + "–$" + d + ". Revisa precios vendidos reales antes de comprar algo grande."; }, newR: function (a, b) { return " Nuevo en tienda: como $" + a + "–$" + b + "."; },
      plats: { ebay: "eBay (con envío)", mercari: "Mercari (con envío)", fbship: "FB Marketplace (con envío)", fblocal: "FB Marketplace / OfferUp (efectivo local)", posh: "Poshmark" },
      ship: "Envío que pagas", great: "¡GRAN GANGA! 🎉", fair: "PRECIO JUSTO 👍", haggle: "REGATEA PRIMERO 🤝", pass: "PÁSALE 🙅",
      sayGreat: function (p) { return "¡Agárralo, vecino! Ahorras como $" + p + " contra lo que suele costar usado. Mi colita se está moviendo. 🐾"; }, sayFair: "Es un precio justo de venta de garage. Cómpralo si te encanta, o haz una oferta amable. 😊", sayNew: "¡Cuidado! Eso es casi lo que cuesta nuevo. 🙅",
      sayHaggle: function (m) { return "Un poco caro para usado. Ofrece como $" + m + " a ver qué dicen. Prueba mis frases abajo. 😉"; },
      sayPass: "Ay, no. Es más de lo que suele costar usado. Déjalo para el siguiente perrito. 🐶",
      profit: "Ganancia", roi: "ROI", max: "Oferta máx.", save: "Ahorras", pct: "Del valor usado", offer: "Ofrece esto", resellT: "¿Quieres revenderlo?", resellSub: "Ganancia después de comisiones si lo revendes en línea o local.", byPlat: "Ganancia por plataforma", best: "mejor",
      comps: "Revisa precios vendidos reales", ebaySold: "Vendidos en eBay", fb: "FB Marketplace SA", goog: "Google",
      add: "＋ Guardar en mis gangas", added: "¡Guardado en tus gangas! 🎉",
      s3: "Ayudante para regatear", s3sub: "Toca una frase para copiarla. Inglés arriba, español abajo, porque esto es San Antonio. 💜",
      s4: "Más de esto en ventas este fin", s4sub: "Ventas próximas en San Antonio que lo mencionan.", none: "Todavía ninguna venta próxima lo menciona. ¡Revisa el mapa, llegan ventas nuevas cada día!", view: "Mapa →", openMap: "Abrir el mapa en vivo",
      s5: "Mis gangas", s5sub: "Se guarda solo en este teléfono. ¡Presume tus logros!", empty: "Nada todavía. Guarda un hallazgo arriba y mira crecer tu ahorro.", spent: "Gastado", worth: "Vale", gain: "Ahorrado",
      share: "📸 Compartir mis gangas", clear: "Borrar gangas", sheet: "🖨️ Imprimir guía de precios", copied: "¡Copiado! 🐾", confirm: "¿Borrar todas tus gangas?",
      proT: "Paquete Cazagangas de Chica", proB: "Tarjetas bilingües para regatear, la guía completa de precios de San Antonio y una lista para el sábado. ¡Apoya el mapa gratis!", proL: ["Tarjetas de bolsillo para regatear (EN/ES)", "Guía de precios de 100+ artículos", "Hoja de ruta y presupuesto"],
      buy: function (p) { return "Obtener paquete · $" + p; }, soon: "¡Muy pronto! Dile a Chica que lo quieres", sponT: "Vende tus hallazgos aquí mismo", sponHouse: "Tu tienda de San Antonio aquí", sponB: "¿Consignación, vintage, empeño o compra-venta? Pon tu tienda frente a cazadores de gangas locales justo cuando están comprando.", sponCta: "Patrocina este espacio", visit: "Visitar",
      disc: "Los precios de la guía son estimados, no avalúos. Las comisiones son tarifas aproximadas de 2026 y cambian. Siempre revisa los vendidos.", aff: "Algunos enlaces de eBay son de afiliado. Si compras, Chicas Map puede ganar una pequeña comisión sin costo para ti.",
      phr: null, tip: "Tip: empieza bajo, sonríe, junta varias cosas y regresa después de la 1 PM cuando quieren vaciar.",
      ph: "Toma una foto 📸", phG: "🖼️ Elegir de la galería", phNote: "Tu foto se queda en tu teléfono. Chica la revisa aquí mismo, no se sube nada.", phLoad: "Chica lo está olfateando…", phFirst: "La primera vez tarda un poco (descarga la nariz de Chica, ~90 MB, luego queda guardada).", phPick: "¿Es uno de estos? Toca para confirmar:", phFail: "Mi nariz está tapada en este aparato. 🤧 Elige el artículo de la lista abajo.", or: "o elígelo tú",
      fromSale: "¡Snif, snif! 🐾 Elegí lo que menciona esta venta. Toma una foto o toca otro artículo si viste algo más y pon su precio.",
      visLoad: "Chica está estudiando tu foto…", visSee: "Veo:", visBrand: "Marca", visModel: "Modelo", visSure: "seguro", visPick: "¿No es? Toca otra opción:", visWhy: "Los ojos de Chica",
      eHead: "eBay ahorita · precios que piden (no vendidos)", eLow: "Bajo", eMid: "Mediana", eHigh: "Alto", eCount: function (n) { return n + " anuncios usados parecidos"; },
      eNote: "Esto es lo que piden los vendedores, y casi siempre se vende por menos. El veredicto de Chica le baja como 15% a la mediana. Toca \"Vendidos en eBay\" abajo para ver precios vendidos de verdad.",
      eLive: function (a, b, c) { return "Precios que piden en eBay ahorita: $" + a + "–$" + c + ", mediana $" + b + "."; }, eEx: "Algunos anuncios parecidos:",
      phNoteCloud: "Tu foto se envía al ayudante de Chica para identificarla y buscar precios. No se guarda. Si el ayudante está ocupado, Chica la revisa en tu teléfono.",
      home: "← Chicas Map", cardTag: "MIS GANGAS DE VENTAS DE GARAGE", cardFoot: "¿Es ganga? Pregúntale a Chica: chicasmap.com/deals", items: "artículos"
    }
  };
  T.es.phr = T.en.phr;
  var S = { item: "castiron", name: "", qry: "", live: null, ask: 5, resale: 40, plat: "ebay", cond: 1, ship: null };
  var sales = null, haul = loadHaul();

  function t() { return T[lang]; }
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function safeUrl(u) {
    var s = String(u == null ? "" : u).trim();
    if (!s) return "";
    if (/^blob:/i.test(s)) {
      try { return new URL(s).protocol === "blob:" ? s : ""; } catch (e) { return ""; }
    }
    if (s.slice(0, 2) === "//") return "";
    if (/^https?:\/\//i.test(s)) return s;
    if (s.charAt(0) === "/" && s.charAt(1) !== "/") return s;
    if (s.charAt(0) === ".") return s;
    if (s.indexOf(":") === -1 && s.indexOf("\\") === -1) return s;
    return "";
  }
  function el(tag, props, kids) {
    var n = document.createElement(tag), k, u;
    if (props) {
      for (k in props) {
        if (!Object.prototype.hasOwnProperty.call(props, k) || props[k] == null) continue;
        if (k === "text") n.textContent = props[k];
        else if (k === "className") n.className = props[k];
        else if (k === "style") {
          var st = props[k];
          for (var sk in st) if (Object.prototype.hasOwnProperty.call(st, sk)) n.style[sk] = st[sk];
        } else if (k === "src" || k === "href") {
          u = safeUrl(props[k]);
          if (u) n.setAttribute(k, u);
        } else n.setAttribute(k, String(props[k]));
      }
    }
    (kids || []).forEach(function (c) {
      if (c == null || c === "") return;
      n.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
    });
    return n;
  }
  function fill(node, kids) {
    while (node.firstChild) node.removeChild(node.firstChild);
    (kids || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }
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
  function q() { var it = item(); return S.qry || S.name || (it[0] === "other" ? "" : it[2].replace(/\(.*\)/, "").trim()); }
  function ebayUrl() {
    var u = "https://www.ebay.com/sch/i.html?_nkw=" + encodeURIComponent(q()) + "&LH_Sold=1&LH_Complete=1";
    var c = String(CFG.FLIP_EBAY_CAMPID || "").replace(/\D/g, "");
    if (c) u += "&mkevt=1&mkcid=1&mkrid=711-53200-19255-0&campid=" + c + "&toolid=10001&customid=dealfinder";
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
      '<div class="ff-chica"><img src="' + BASE + '/images/chica-logo.png" alt="Chica"/><p>' + (S.fromSale ? L.fromSale : L.hi) + "</p></div>" +
      '<div class="ff-cols"><div>' +
      '<section class="ff-card"><h2><span class="ff-step">1</span>' + L.s1 + '</h2>' +
      '<div class="ff-photo"><label class="ff-btn pri ff-snap"><input id="ff-cam" type="file" accept="image/*" capture="environment" hidden/>' + L.ph + '</label><label class="ff-btn ff-gal"><input id="ff-gal" type="file" accept="image/*" hidden/>' + L.phG + '</label></div>' +
      '<p class="ff-hint">🔒 ' + (visionUrl() ? L.phNoteCloud : L.phNote) + '</p><div id="ff-ph-out"></div>' +
      '<p class="sub" style="margin-top:12px">' + L.or + ' · ' + L.s1sub + '</p><div class="ff-chips" id="ff-chips">' + chips + '</div>' +
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
    var L = t(), it = item(), c = calc(S.plat), b = bestPlat(), nw = NEW[it[0]];
    $("ff-guide").textContent = L.guide(it[4], it[5], it[6], it[7]) + (nw ? L.newR(nw[0], nw[1]) : "") + (S.live ? " " + L.eLive(Math.round(S.live.low), Math.round(S.live.median), Math.round(S.live.high)) : "");
    var val = S.resale * [1, 0.85, 0.6][S.cond], ratio = val > 0 ? S.ask / val : 9, offer = Math.max(1, Math.round(val * 0.5));
    var kind = ratio <= 0.5 ? "great" : ratio <= 0.85 ? "fair" : ratio <= 1.25 ? "haggle" : "pass";
    var nearNew = nw && S.ask >= nw[0] * 0.8;
    if (nearNew) kind = "pass";
    var say = nearNew ? L.sayNew : kind === "great" ? L.sayGreat(Math.round(val - S.ask)) : kind === "fair" ? L.sayFair : kind === "haggle" ? L.sayHaggle(offer) : L.sayPass;
    var plats = Object.keys(L.plats).map(function (p) { var x = calc(p); return '<div class="' + (b && b.p === p ? "best" : "") + '"><span>' + L.plats[p] + (b && b.p === p ? "<em>★ " + L.best + "</em>" : "") + "</span><b>" + money(x.profit) + "</b></div>"; }).join("");
    $("ff-verdict").innerHTML = '<section class="ff-verdict ' + (kind === "great" || kind === "fair" ? "flip" : kind) + '"><span class="tag">' + esc(iname(it)) + '</span><div class="big">' + L[kind] + '</div><p class="say">' + say + "</p>" +
      '<div class="ff-stats"><div><b>' + money(Math.max(0, val - S.ask)) + "</b><span>" + L.save + "</span></div><div><b>" + (val > 0 ? Math.round(ratio * 100) + "%" : "–") + "</b><span>" + L.pct + "</span></div><div><b>" + money(Math.min(offer, S.ask || offer)) + "</b><span>" + L.offer + "</span></div></div>" +
      '<p class="ff-hint" style="margin-top:12px;font-weight:700">' + L.comps + '</p><div class="ff-btns" style="margin-top:6px">' +
      '<a class="ff-btn" target="_blank" rel="noopener' + (CFG.FLIP_EBAY_CAMPID ? " sponsored" : "") + '" href="' + ebayUrl() + '">🛒 ' + L.ebaySold + "</a>" +
      '<a class="ff-btn" target="_blank" rel="noopener" href="https://www.facebook.com/marketplace/sanantonio/search?query=' + encodeURIComponent(q()) + '">🏷️ ' + L.fb + "</a>" +
      '<a class="ff-btn" target="_blank" rel="noopener" href="https://www.google.com/search?q=' + encodeURIComponent(q() + " price") + '">🔎 ' + L.goog + "</a></div>" +
      '<div class="ff-btns"><button type="button" class="ff-btn pri" id="ff-add">' + L.add + "</button></div>" +
      '<details class="ff-resell"><summary>💸 ' + L.resellT + '</summary><p class="ff-hint">' + L.resellSub + '</p><div class="ff-stats"><div><b>' + money(c.profit) + "</b><span>" + L.profit + "</span></div><div><b>" + (S.ask > 0 ? Math.round(c.roi * 100) + "%" : "∞") + "</b><span>" + L.roi + "</span></div><div><b>" + money(c.max) + "</b><span>" + L.max + "</span></div></div>" +
      '<p class="ff-hint" style="margin-top:12px;font-weight:700">' + L.byPlat + '</p><div class="ff-plat">' + plats + "</div></details></section>";
    var o = Math.max(1, Math.min(offer, Math.floor(S.ask * 0.7) || 1)), bn = Math.max(1, Math.round(S.ask * 1.6));
    $("ff-add").onclick = function () { haul.unshift({ n: iname(it), p: +S.ask || 0, v: Math.round(S.resale * [1, 0.85, 0.6][S.cond] * 100) / 100, e: it[1], d: today() }); saveHaul(); renderHaul(); toast(L.added); };
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
        return w.some(function (x) { return new RegExp("\\b" + x.replace(/s$/, "") + "(s|es)?\\b").test(h); });
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
        var file = new File([blob], "chica-deals.png", { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: L.h1, text: L.cardFoot }).catch(function () {}); return; }
        var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "chica-deals.png"; document.body.appendChild(a); a.click(); a.remove();
      }, "image/png");
    }
  }

  function sheet() {
    var L = t();
    var rows = [el("tr", null, [el("th"), el("th", { text: L.ask }), el("th", { text: L.resale })])];
    ITEMS.forEach(function (i) {
      if (i[0] === "other") return;
      rows.push(el("tr", null, [
        el("td", { text: i[1] + " " + i[lang === "es" ? 3 : 2] }),
        el("td", { text: "$" + i[4] + "–$" + i[5] }),
        el("td", { text: "$" + i[6] + "–$" + i[7] })
      ]));
    });
    fill($("ff-sheet"), [
      el("h2", { text: L.h1 + " · San Antonio" }),
      el("table", null, rows),
      el("p", { text: L.disc }),
      el("p", { text: "chicasmap.com/deals" })
    ]);
    window.print();
  }

  var clf = null, clfP = null;
  function loadClf(onProg) {
    if (clf) return Promise.resolve(clf);
    if (clfP) return clfP;
    clfP = import(TF_URL).then(function (tf) {
      try { tf.env.allowLocalModels = false; } catch (e) {}
      return tf.pipeline("zero-shot-image-classification", CLIP, { dtype: "q8", progress_callback: onProg });
    }).then(function (p) { clf = p; return p; }).catch(function (e) { clfP = null; throw e; });
    return clfP;
  }
  function clipPhoto(file) {
    var L = t(), out = $("ff-ph-out"); if (!file || !out) return;
    try{window.goatcounter&&window.goatcounter.count&&window.goatcounter.count({path:"evt-deal-finder-photo",title:"Deal Finder photo check",event:true});}catch(x){}
    var url = URL.createObjectURL(file);
    fill(out, [el("div", { className: "ff-sniff" }, [
      el("img", { className: "ff-ph-img", src: url, alt: "" }),
      el("div", null, [
        el("img", { className: "ff-nose", src: BASE + "/images/chica-logo.png", alt: "" }),
        el("b", { text: L.phLoad }),
        el("div", { className: "ff-bar" }, [el("i", { id: "ff-bar", style: { width: "4%" } })]),
        el("small", { text: clf ? "" : L.phFirst })
      ])
    ])]);
    var loaded = {}, total = {};
    var timer = setTimeout(function () { if (!clf) fail(); }, 120000);
    function fail() { clearTimeout(timer); fill(out, [el("p", { className: "ff-hint ff-warn", text: L.phFail })]); }
    loadClf(function (pr) {
      if (pr && pr.file && pr.total) { loaded[pr.file] = pr.loaded || 0; total[pr.file] = pr.total; var l = 0, tt = 0; for (var k in total) { l += loaded[k]; tt += total[k]; } var bar = $("ff-bar"); if (bar) bar.style.width = Math.max(4, Math.round(l / tt * 90)) + "%"; }
    }).then(function (p) {
      var bar = $("ff-bar"); if (bar) bar.style.width = "95%";
      var cands = ITEMS.filter(function (i) { return PHOTO[i[0]]; });
      var labels = cands.map(function (i) { return PHOTO[i[0]]; });
      return p(url, labels, { hypothesis_template: "a photo of {}" }).then(function (res) {
        clearTimeout(timer);
        var top = res.slice(0, 3).map(function (r) { var i = cands[labels.indexOf(r.label)]; return { it: i, s: r.score }; });
        fill(out, [el("div", { className: "ff-sniff" }, [
          el("img", { className: "ff-ph-img", src: url, alt: "" }),
          el("div", null, [
            el("b", { text: L.phPick }),
            el("div", { className: "ff-guess" }, top.map(function (g, n) {
              return el("button", { type: "button", className: "ff-chip", "data-guess": g.it[0], "aria-pressed": String(n === 0) }, [
                g.it[1] + " " + g.it[lang === "es" ? 3 : 2] + " ",
                el("small", { text: Math.round(g.s * 100) + "%" })
              ]);
            }))
          ])
        ])]);
        out.querySelectorAll("[data-guess]").forEach(function (b) { b.onclick = function () { out.querySelectorAll("[data-guess]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); pick(b.dataset.guess, true); }; });
        if (top[0]) pick(top[0].it[0], true);
        window.__chicaPhotoTop = top.map(function (g) { return g.it[0] + ":" + g.s.toFixed(3); });
      });
    }).catch(function (e) { try { console.warn("Deal Finder photo:", e && e.message); } catch (x) {} fail(); });
  }

  /* ---------- cloud photo ID (Deal Vision worker). Off unless CHICA_CONFIG.DEAL_VISION_URL is set; any failure falls back to the on-phone CLIP path above. ---------- */
  var VISION_TIMEOUT_MS = 20000, MAX_PX = 768, MAX_BYTES = 300000, COND_IDX = { like_new: 0, good: 1, rough: 2 };
  function visionUrl() {
    var u = String(CFG.DEAL_VISION_URL || "").trim();
    return /^https:\/\//i.test(u) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(u) ? u : "";
  }
  function ebayHost(u) { try { var x = new URL(u); return x.protocol === "https:" && /(^|\.)ebay\.com$/i.test(x.hostname); } catch (e) { return false; } }
  function findItem(id) { for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i][0] === id) return ITEMS[i]; return ITEMS[ITEMS.length - 1]; }
  function realDownscale(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        try {
          var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, k = Math.min(1, MAX_PX / Math.max(w, h));
          var cv = document.createElement("canvas"); cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(h * k));
          cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
          var q = [0.8, 0.65, 0.5], i = 0, out;
          do { out = cv.toDataURL("image/jpeg", q[i++]); } while (out.length * 0.75 > MAX_BYTES && i < q.length);
          URL.revokeObjectURL(url); resolve(out.replace(/^data:image\/jpeg;base64,/, ""));
        } catch (e) { reject(e); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("decode")); };
      img.src = url;
    });
  }
  function downscale(file) { var h = window.ChicaDealHooks; return (h && h.downscale) ? Promise.resolve(h.downscale(file)) : realDownscale(file); }
  function cleanVision(j) {
    // Re-validate the worker answer on the page too; never trust it blindly.
    if (!j || j.ok !== true || !j.item || typeof j.item.name !== "string" || !j.item.name.trim()) return null;
    var i = j.item, num = function (v, d) { v = Number(v); return isFinite(v) ? v : d; };
    var r = {
      name: String(i.name).slice(0, 90), brand: String(i.brand || "").slice(0, 40), model: String(i.model || "").slice(0, 40),
      category: findItem(String(i.category))[0], query: String(i.query || i.name).slice(0, 80),
      condition: COND_IDX.hasOwnProperty(i.condition) ? i.condition : "unknown", confidence: Math.max(0, Math.min(1, num(i.confidence, 0.5))), alts: [], prices: null
    };
    (Array.isArray(i.alternatives) ? i.alternatives : []).slice(0, 3).forEach(function (a) {
      if (a && typeof a.name === "string" && a.name.trim()) r.alts.push({ name: a.name.slice(0, 90), category: findItem(String(a.category))[0], confidence: Math.max(0, Math.min(1, num(a.confidence, 0))) });
    });
    var p = j.prices;
    if (p && isFinite(+p.median) && +p.median > 0 && +p.n >= 3) {
      r.prices = { basis: p.basis === "sold" ? "sold" : "asking", n: Math.round(+p.n), low: +p.low || +p.median, median: +p.median, high: +p.high || +p.median, examples: [] };
      (Array.isArray(p.examples) ? p.examples : []).slice(0, 3).forEach(function (e) {
        var u = e && typeof e.url === "string" && ebayHost(e.url) ? e.url : "";
        if (e && u && isFinite(+e.price)) r.prices.examples.push({ title: String(e.title || "").slice(0, 90), price: +e.price, url: u });
      });
    }
    return r;
  }
  function cloudIdentify(file) {
    return downscale(file).then(function (b64) {
      var ac = typeof AbortController === "function" ? new AbortController() : null, t1, t2;
      var req = fetch(visionUrl(), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ image: b64, lang: lang }), signal: ac ? ac.signal : undefined })
        .then(function (r) { if (!r.ok) throw new Error("vision_" + r.status); return r.json(); });
      t1 = setTimeout(function () { if (ac) ac.abort(); }, VISION_TIMEOUT_MS);
      var hard = new Promise(function (_, rej) { t2 = setTimeout(function () { rej(new Error("vision_timeout")); }, VISION_TIMEOUT_MS + 300); });
      function done() { clearTimeout(t1); clearTimeout(t2); }
      return Promise.race([req, hard]).then(function (j) { done(); var v = cleanVision(j); if (!v) throw new Error("vision_bad"); return v; }, function (e) { done(); throw e; });
    });
  }
  function pricePanel(v) {
    var L = t(), p = v.prices; if (!p) return null;
    var kids = [
      el("b", { text: L.eHead }),
      el("div", { className: "ff-stats" }, [["eLow", p.low], ["eMid", p.median], ["eHigh", p.high]].map(function (x) { return el("div", null, [el("b", { text: money(x[1]) }), el("span", { text: L[x[0]] })]); })),
      el("small", { text: L.eCount(p.n) })
    ];
    if (p.examples.length) {
      kids.push(el("small", { text: L.eEx }));
      kids.push(el("ul", { className: "ff-ex" }, p.examples.map(function (e) {
        return el("li", null, [el("a", { href: e.url, target: "_blank", rel: "sponsored noopener", text: e.title || "eBay" }), " · " + money(e.price)]);
      })));
    }
    kids.push(el("small", { className: "ff-eNote", text: L.eNote }));
    return el("div", { className: "ff-ebay", id: "ff-ebay" }, kids);
  }
  function applyGuess(v, g, gi) {
    pick(g.category, true);                       // resets name/price to the category defaults, then we layer the AI result on top
    S.name = g.name.slice(0, 60); $("ff-name").value = S.name;
    var nm = $("ff-ebay"); if (nm) nm.hidden = !g.main;
    if (g.main) {
      S.qry = v.query;
      if (COND_IDX.hasOwnProperty(v.condition)) { S.cond = COND_IDX[v.condition]; $("ff-cond").value = String(S.cond); }
      if (v.prices) {
        S.resale = Math.max(1, Math.round(v.prices.median)); $("ff-resale").value = S.resale; S.live = v.prices;
      }
    }
    document.querySelectorAll("#ff-ph-out [data-gi]").forEach(function (x) { x.setAttribute("aria-pressed", String(+x.getAttribute("data-gi") === gi)); }); // the category-chip handler un-presses every .ff-chip
    update(); clearTimeout(bind._n); bind._n = setTimeout(near, 100);
  }
  function renderVision(v, url) {
    var L = t(), out = $("ff-ph-out"), main = { category: v.category, name: v.name, confidence: v.confidence, main: true }, guesses = [main], seen = {};
    seen[v.name.toLowerCase()] = 1;
    v.alts.forEach(function (a) { var k = a.name.toLowerCase(); if (!seen[k] && guesses.length < 3) { seen[k] = 1; guesses.push({ category: a.category, name: a.name, confidence: a.confidence, main: false }); } });
    var sub = [v.brand ? L.visBrand + ": " + v.brand : "", v.model ? L.visModel + ": " + v.model : ""].filter(Boolean).join(" · ");
    var chips = guesses.map(function (g, n) {
      var it = findItem(g.category);
      return el("button", { type: "button", className: "ff-chip", "data-guess": g.category, "data-gi": String(n), "aria-pressed": String(n === 0) }, [it[1] + " " + g.name + " ", el("small", { text: Math.round(g.confidence * 100) + "%" })]);
    });
    var panel = pricePanel(v);
    fill(out, [el("div", { className: "ff-sniff" }, [
      el("img", { className: "ff-ph-img", src: url, alt: "" }),
      el("div", null, [el("small", { text: L.visSee }), el("b", { className: "ff-vname", text: v.name }), sub ? el("small", { text: sub }) : null, el("small", { text: L.visPick }), el("div", { className: "ff-guess" }, chips)])
    ]), panel]);
    out.querySelectorAll("[data-gi]").forEach(function (b) {
      b.onclick = function () { applyGuess(v, guesses[+b.getAttribute("data-gi")], +b.getAttribute("data-gi")); };
    });
    applyGuess(v, main, 0);
    window.__chicaPhotoTop = guesses.map(function (g) { return g.category + ":" + g.confidence.toFixed(3); });
  }
  function onPhoto(file) {
    var L = t(), out = $("ff-ph-out"); if (!file || !out) return;
    if (!visionUrl()) return clipPhoto(file);
    try{window.goatcounter&&window.goatcounter.count&&window.goatcounter.count({path:"evt-deal-finder-photo-cloud",title:"Deal Finder cloud photo check",event:true});}catch(x){}
    var url = URL.createObjectURL(file);
    fill(out, [el("div", { className: "ff-sniff" }, [
      el("img", { className: "ff-ph-img", src: url, alt: "" }),
      el("div", null, [el("img", { className: "ff-nose", src: BASE + "/images/chica-logo.png", alt: "" }), el("b", { text: L.visLoad }), el("div", { className: "ff-bar" }, [el("i", { style: { width: "55%" } })])])
    ])]);
    cloudIdentify(file).then(function (v) { renderVision(v, url); }, function (e) {
      try { console.warn("Deal Finder cloud photo, using on-phone check:", e && e.message); } catch (x) {}
      clipPhoto(file);
    });
  }
  function pick(id, focusAsk) {
    var b = document.querySelector('.ff-chip[data-item="' + id + '"]');
    if (b) b.click();
    if (focusAsk) { var a = $("ff-ask"); if (a) { a.scrollIntoView({ behavior: "smooth", block: "center" }); try { a.focus({ preventScroll: true }); a.select(); } catch (e) {} } }
  }

  function bind() {
    ["ff-cam", "ff-gal"].forEach(function (id) { var el = $(id); if (el) el.addEventListener("change", function () { onPhoto(this.files && this.files[0]); this.value = ""; }); });
    $("ff-chips").addEventListener("click", function (e) {
      var b = e.target.closest(".ff-chip"); if (!b) return;
      S.item = b.dataset.item; var it = item(); S.name = ""; S.qry = ""; S.live = null; $("ff-name").value = "";
      S.ask = Math.round((it[4] + it[5]) / 2 * 2) / 2; S.resale = Math.round((it[6] + it[7]) / 2); S.ship = null;
      if (it[8] === "L" && S.plat !== "fblocal") S.plat = "fblocal";
      if (it[8] !== "L" && S.plat === "fblocal") S.plat = "ebay";
      $("ff-ask").value = S.ask; $("ff-resale").value = S.resale; $("ff-plat").value = S.plat; $("ff-ship").value = shipFor(S.plat === "fblocal" ? "ebay" : S.plat);
      document.querySelectorAll(".ff-chip").forEach(function (c) { c.setAttribute("aria-pressed", String(c === b)); });
      update(); near();
    });
    $("ff-name").addEventListener("input", function () { S.name = this.value.trim(); S.qry = ""; update(); clearTimeout(bind._n); bind._n = setTimeout(near, 300); });
    $("ff-ask").addEventListener("input", function () { S.ask = Math.max(0, parseFloat(this.value) || 0); update(); });
    $("ff-resale").addEventListener("input", function () { S.resale = Math.max(0, parseFloat(this.value) || 0); S.live = null; update(); });
    $("ff-ship").addEventListener("input", function () { S.ship = Math.max(0, parseFloat(this.value) || 0); update(); });
    $("ff-plat").addEventListener("change", function () { S.plat = this.value; update(); });
    $("ff-cond").addEventListener("change", function () { S.cond = +this.value; update(); });
    $("ff-print").onclick = sheet;
  }
  document.querySelectorAll(".ff-lang button").forEach(function (b) {
    b.addEventListener("click", function () { lang = b.dataset.lang; document.documentElement.lang = lang; try { localStorage.setItem("chicas-map-locale", lang); } catch (e) {} shell(); });
  });
  var it0 = item(); S.ask = 5; S.resale = Math.round((it0[6] + it0[7]) / 2);
  (function fromUrl() {
    var u; try { u = new URLSearchParams(location.search); } catch (e) { return; }
    var id = u.get("item"), txt = (u.get("q") || "").slice(0, 300);
    var hit = null;
    if (id) ITEMS.forEach(function (i) { if (i[0] === id) hit = i; });
    if (!hit && (txt || id)) {
      var h = (txt || id).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""), best = 0;
      ITEMS.forEach(function (i) {
        var n = 0; (i[9] || "").split(" ").forEach(function (w) { if (w.length > 2 && new RegExp("\\b" + w + "(s|es)?\\b").test(h)) n++; });
        if (n > best) { best = n; hit = i; }
      });
      if (!hit && id) { hit = ITEMS[ITEMS.length - 1]; S.name = id.slice(0, 60); }
    }
    if (!hit) return;
    S.item = hit[0]; S.ask = Math.round((hit[4] + hit[5]) / 2 * 2) / 2; S.resale = Math.round((hit[6] + hit[7]) / 2);
    if (hit[8] === "L") S.plat = "fblocal";
    S.fromSale = !!txt;
  })();
  shell();
})();
