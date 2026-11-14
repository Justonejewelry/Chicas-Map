/* Resale Trail catches. Same pins as the KEY layer.
   A catch is a character on a real thrift pin. Not a second rank ladder.
*/
(function (root) {
  var SPECIES = {
    chain: { id: "rack-rat", name: "Rack Rat", art: "assets/catch-rack-rat.jpg", line: "Hangs the color tag. Catch it before the cheap rack is gone." },
    goodwill: { id: "bin-bear", name: "Bin Bear", art: "assets/catch-bin-bear.jpg", line: "Sits on the donation bag. Catch it at the blue bins." },
    "salvation-army": { id: "bell-hound", name: "Bell Hound", art: "assets/catch-bell-hound.jpg", line: "Rings once when the door opens. Catch the bell." },
    habitat: { id: "hammer-hound", name: "Hammer Hound", art: "assets/catch-hammer-hound.jpg", line: "Guards the ReStore aisle. Catch the hammer." },
    independent: { id: "porch-pup", name: "Porch Pup", art: "assets/catch-porch-pup.jpg", line: "Lives on the independent porch. Catch the pup." },
    "resale-clothing": { id: "mirror-mink", name: "Mirror Mink", art: "assets/catch-mirror-mink.jpg", line: "Checks the tag in the mirror. Catch the mink." },
    "kids-resale": { id: "tiny-train", name: "Tiny Train", art: "assets/catch-tiny-train.jpg", line: "Rolls the kids rack. Catch the train." },
    vintage: { id: "cape-moth", name: "Cape Moth", art: "assets/catch-cape-moth.jpg", line: "Lands on the brooch. Catch the moth." },
    consignment: { id: "gold-finch", name: "Gold Finch", art: "assets/catch-gold-finch.jpg", line: "Perches on the consignment tag. Catch the finch." },
    "flea-market": { id: "stall-fox", name: "Stall Fox", art: "assets/catch-stall-fox.jpg", line: "Sets the folding table. Catch the fox." }
  };

  function token(name) {
    var text = String(name || "Trail");
    var paren = text.match(/\(([^)]+)\)/);
    var raw = paren ? paren[1] : text.split(/\s+/)[0];
    raw = raw.replace(/['’]s$/i, "").replace(/^the\s+/i, "");
    return raw.split(/[\s/]+/)[0] || "Trail";
  }

  function forFeature(feat) {
    var props = feat.properties || {};
    var coords = (feat.geometry && feat.geometry.coordinates) || [];
    var lng = coords[0], lat = coords[1];
    var species = SPECIES[props.category] || SPECIES.independent;
    var who = token(props.name) + " " + species.name;
    return {
      kind: "trail",
      type: "trail",
      title: who,
      address: props.address || props.name || "",
      lat: lat,
      lon: lng,
      shop: props.name || "Resale",
      category: props.category || "independent",
      catch: { name: who, species: species.name, art: species.art, line: species.line, id: species.id }
    };
  }

  root.ChicaCatches = { species: SPECIES, forFeature: forFeature, token: token };
})(window);
