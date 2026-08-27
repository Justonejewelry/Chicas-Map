(function () {
  var pairs = [
    ["Come hunt with me.", "Find what\u2019s happening."],
    [
      "I found",
      "POSTED_LEAD",
    ],
    ["Share a sale", "Share with the pack"],
    ["Three I\u2019d start with", "Where the pack is active"],
    ["Why I\u2019m here", "Pack principle"],
    ["I watched too many wasted Saturdays.", "Loyalty. Duty. Respect. Service. Honor. Integrity. Courage."],
    ["I\u2019m Chica. Come find something good with us.", "Chica listens. Send a tip. Your time matters."],
    ["Ven a buscar conmigo.", "Encuentra lo que est\u00e1 pasando."],
    ["Compartir una venta", "Comparte con la manada"],
    ["Tres con las que yo empezar\u00eda", "Donde se mueve la manada"],
    ["Por qu\u00e9 estoy aqu\u00ed", "Principio de la manada"],
    ["Vi demasiados s\u00e1bados tirados a la basura.", "Lealtad. Deber. Respeto. Servicio. Honor. Integridad. Valor."],
    ["Soy Chica. Vamos a hallar algo bueno juntos.", "Chica escucha. Manda un tip. Tu tiempo importa."],
  ];

  var ledeEn =
    "Chica\u2019s Map brings San Antonio neighbors useful local information in one place \u2014 sales, events, community resources, and the details that help you plan your day.";
  var ledeEs =
    "El Mapa de Chica junta informaci\u00f3n \u00fatil del vecindario en un solo lugar \u2014 ventas, eventos, recursos y lo que necesitas para armar el d\u00eda.";
  var whyEn =
    "Those Army values are useful in any neighborhood: keep your word, respect people\u2019s time, serve where you can, be honest about what you know, and have the courage to make the community better.";
  var whyEs =
    "Esos valores del Ej\u00e9rcito sirven en cualquier vecindario: cumple tu palabra, respeta el tiempo de la gente, sirve donde puedas, s\u00e9 honesto con lo que sabes y ten el valor de mejorar la comunidad.";

  function swapText(t) {
    if (!t) return t;
    if (t.indexOf("My person is a veteran") !== -1 || t.indexOf("verified sales for this weekend") !== -1) {
      return t.replace(/I found \d+ verified sales[\s\S]*?ride along\./, ledeEn).replace(/^I found[\s\S]*$/, ledeEn);
    }
    if (t.indexOf("Mi persona es veterano") !== -1 || t.indexOf("ventas verificadas para este fin") !== -1) {
      return t.replace(/Encontr[\s\S]*?manada\./, ledeEs);
    }
    if (t.indexOf("Empty driveways. Dead pins.") !== -1) return whyEn;
    if (t.indexOf("Entradas vac\u00edas. Pines muertos.") !== -1) return whyEs;
    for (var i = 0; i < pairs.length; i++) {
      if (pairs[i][1] === "POSTED_LEAD") continue;
      if (t.indexOf(pairs[i][0]) !== -1) t = t.split(pairs[i][0]).join(pairs[i][1]);
    }
    return t;
  }

  function walk(node) {
    if (!node) return;
    if (node.nodeType === 3) {
      var next = swapText(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
      return;
    }
    if (node.nodeType !== 1) return;
    var tag = node.tagName;
    if (tag === "SCRIPT" || tag === "STYLE") return;
    var kids = node.childNodes;
    for (var i = 0; i < kids.length; i++) walk(kids[i]);
  }

  function run() {
    walk(document.body);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
  setInterval(run, 800);
  window.addEventListener("popstate", function () {
    setTimeout(run, 50);
  });
})();
