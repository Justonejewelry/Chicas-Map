/* Public press-kit page: tooltips and Spanish chrome. */
(function () {
  var BASE = "/Chicas-Map";

  var ES = {
    skip: "Ir al contenido",
    eyebrow: "PARA LA PRENSA",
    title: "Kit de prensa",
    lede: "Logos, fotos de Chica y el arte de marca que usa el mapa gratis de ventas de garaje en San Antonio. Descarga un archivo o todo el kit.",
    aboutTitle: "Sobre Chicas Map",
    about: "Chicas Map es un mapa gratis, hecho por un veterano, de ventas de garaje, patio y bienes en San Antonio y pueblos cercanos. La mascota es Chica, una chihuahua con capa, que ayuda a los vecinos a encontrar las ventas que valen el viaje. Ver el mapa es gratis. Publicar una venta también.",
    colorsTitle: "Colores de marca",
    colorsIntro: "Tomados de la hoja de estilo del sitio. El rosa de la capa es el color principal.",
    usageTitle: "Cómo usar estas imágenes",
    usage: "Puedes usar estos archivos para hablar de Chicas Map. Mantén la capa en magenta, no estires ni recolorees el logo, y no digas que Chica respalda un producto que no respalda. ¿Necesitas otro recorte? Escríbenos en Contacto.",
    contactTitle: "Contacto de prensa",
    contactHtml: "Para preguntas de prensa o un tamaño distinto, usa la <a href=\"" + BASE + "/bulletin/\">página de Contacto</a>. Si quieres publicar una venta, <a href=\"" + BASE + "/submit/\">agrégala gratis</a>.",
    downloadAll: "Descargar todo (ZIP)",
    download: "Descargar",
    secLogos: "Logos e iconos",
    secSocial: "Tarjetas sociales",
    secMascot: "Fotos de la mascota",
    secPosters: "Pósters y cierre",
    secCampaign: "Campaña y producto",
    swCape: "Rosa de la capa",
    swMid: "Rosa medio",
    swDeep: "Rosa profundo",
    swDark: "Fondo oscuro",
    swLight: "Fondo claro",
    swInkDark: "Texto (tema oscuro)",
    swInkLight: "Texto (tema claro)",
    tips: {
      about: "Quién es Chicas Map y quién es Chica, en pocas líneas, para una nota o un crédito.",
      colors: "Estos valores hex salen de las variables CSS del sitio. --chica-pine es el rosa de la capa, no un verde.",
      usage: "Una guía corta para usar el logo y las fotos sin alterar la marca.",
      contact: "El contacto de prensa es la misma página de Contacto del sitio. Aquí no publicamos un correo privado.",
      downloadAll: "Un archivo ZIP con todas las imágenes de esta página, listas para guardar."
    },
    use: {
      logo: "Logo principal, fondos claros u oscuros",
      logoSrc: "Archivo fuente del logo",
      logo144: "Logo mediano, para compartir o un ícono",
      logo72: "Logo del encabezado y la interfaz chica",
      logo72w: "Logo del encabezado, archivo más liviano",
      favicon: "Icono de pestaña: pin de mapa con capa",
      og: "Imagen al compartir el sitio",
      ogDeals: "Tarjeta social del Buscador de ofertas",
      hero: "Chica con su persona, foto de portada",
      sale: "Chica en una venta, con la capa puesta",
      promo: "Primer plano de Chica",
      citywide: "Foto vertical de la mascota con el logo",
      flys: "Chica de camino a la cacería, con capa",
      poster: "Póster oficial de Chicas Garage Sale",
      intro: "Póster del video de presentación",
      reelIntro: "Póster vertical para reels",
      cover: "Cierre con el logo sobre fondo oscuro",
      weekend: "Still de promoción del fin de semana",
      banner: "Muestra de banner de patrocinio con el logo",
      claimed: "Arte de un pin reclamado en el mapa",
      s1: "Still de campaña, inicio e historia",
      s2: "Still de campaña del mapa en vivo",
      s3: "Still de campaña de los filtros",
      s4: "Still de campaña de una ruta de cacería",
      s5: "Still de campaña con la mascota",
      atlas: "Tarjeta de título de Alamo Atlas",
      atlasReel: "Promo vertical de Alamo Atlas"
    },
    menu: {
      navFind: "Encontrar ventas",
      mapShort: "Mapa",
      list: "Lista de ventas",
      calendar: "Calendario de ventas",
      hoods: "Ventas por vecindario",
      navList: "Publicar una venta",
      add: "Agregar mi venta",
      boost: "Destacar mi venta",
      more: "Más",
      stats: "Números del mapa",
      press: "Kit de prensa",
      deals: "Buscador de ofertas 💸",
      contact: "Contacto",
      story: "Nuestra historia",
      principle: "Principio de la manada",
      sponsors: "Patrocinios",
      legal: "Aviso legal",
      findSales: "Ver ventas",
      listSale: "Publicar",
      footerTagline: "Un mapa gratis de sábado para los vecinos de San Antonio.",
      footerSupport: "Ayúdame a mantener la capa puesta",
      footerHunt: "Busca",
      footerPack: "Manada",
      footerFine: "Avisos",
      disclaimer: "Aviso legal",
      badgeDisclosure: "Hecho por un veterano. Buscamos cumplir WCAG 2.2 AA en este sitio. No ha sido auditado de forma independiente y no es una certificación ADA del Departamento de Justicia. ¿Ves una barrera? Avísanos en Contacto. Los contenidos de Facebook, GitHub y los mapas son de terceros."
    }
  };

  function isEs() {
    try {
      var p = location.pathname || "";
      if (/\/es(\/|$)/.test(p)) return true;
      return String(document.documentElement.lang || "").toLowerCase().indexOf("es") === 0;
    } catch (e) {
      return false;
    }
  }

  function applySpanish() {
    if (!isEs()) return;
    document.documentElement.lang = "es";
    var set = function (sel, text) {
      var el = document.querySelector(sel);
      if (el && text) el.textContent = text;
    };
    var skip = document.querySelector("a.skip");
    if (skip) skip.textContent = ES.skip;
    set(".eyebrow", ES.eyebrow);
    set("#press-title", ES.title);
    set("#press-lede", ES.lede);
    set("#about-title", ES.aboutTitle);
    set("#about-body", ES.about);
    set("#colors-title", ES.colorsTitle);
    set("#colors-intro", ES.colorsIntro);
    set("#usage-title", ES.usageTitle);
    set("#usage-body", ES.usage);
    set("#contact-title", ES.contactTitle);
    var contact = document.getElementById("contact-body");
    if (contact) contact.innerHTML = ES.contactHtml;
    set("#download-all", ES.downloadAll);
    set("#sec-logos", ES.secLogos);
    set("#sec-social", ES.secSocial);
    set("#sec-mascot", ES.secMascot);
    set("#sec-posters", ES.secPosters);
    set("#sec-campaign", ES.secCampaign);
    document.querySelectorAll("[data-swatch]").forEach(function (el) {
      var key = el.getAttribute("data-swatch");
      if (ES[key]) el.textContent = ES[key];
    });
    document.querySelectorAll("[data-use]").forEach(function (el) {
      var key = el.getAttribute("data-use");
      if (ES.use[key]) el.textContent = ES.use[key];
    });
    document.querySelectorAll(".asset-dl").forEach(function (a) {
      a.textContent = ES.download;
    });
    document.querySelectorAll("[data-tip-copy]").forEach(function (el) {
      var key = el.getAttribute("data-tip-copy");
      if (ES.tips[key]) el.textContent = ES.tips[key];
    });
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (ES.menu[key]) el.textContent = ES.menu[key];
    });
    document.querySelectorAll("a[href]").forEach(function (a) {
      if (a.hasAttribute("data-lang-switch")) return;
      if (a.hasAttribute("download")) return;
      var href = a.getAttribute("href") || "";
      if (href.charAt(0) !== "/") return;
      if (href.indexOf(BASE + "/es/") === 0 || href === BASE + "/es/") return;
      if (/\/(css|js|images|assets|data|vendor|favicon|media|badges|showcase|adventure|og\.jpg|alamo-atlas|chica-atlas|press\/chicas-map-press-kit)/.test(href)) return;
      var rest = href.indexOf(BASE) === 0 ? href.slice(BASE.length) : href;
      if (rest.charAt(0) !== "/") rest = "/" + rest;
      a.setAttribute("href", BASE + "/es" + rest);
    });
  }

  function wireTips() {
    var cards = document.querySelectorAll(".press-panel");
    function closeAll(except) {
      cards.forEach(function (c) {
        if (c !== except) {
          c.classList.remove("is-open");
          var b = c.querySelector(".stat-tip");
          if (b) b.setAttribute("aria-expanded", "false");
        }
      });
    }
    cards.forEach(function (card) {
      var btn = card.querySelector(".stat-tip");
      if (!btn || btn.getAttribute("data-wired") === "1") return;
      btn.setAttribute("data-wired", "1");
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var open = !card.classList.contains("is-open");
        closeAll(card);
        card.classList.toggle("is-open", open);
        btn.setAttribute("aria-expanded", String(open));
        if (open) btn.focus();
      });
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".press-panel")) closeAll();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" || e.key === "Esc") closeAll();
    });
  }

  function boot() {
    applySpanish();
    wireTips();
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
  }
})();
