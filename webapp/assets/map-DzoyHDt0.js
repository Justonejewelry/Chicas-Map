/* Restore last-good map chunk. KEY toggles live in key-layers.js. */
const BASE = "https://justonejewelry.github.io/Chicas-Map/assets/";
const GOOD = "https://cdn.jsdelivr.net/gh/Justonejewelry/Chicas-Map@f3365c745f0a04ef5922ca91b2956684bda3f81e/webapp/assets/map-DzoyHDt0.js";
const text = (await fetch(GOOD).then((r) => {
  if (!r.ok) throw new Error("map chunk " + r.status);
  return r.text();
}))
  .split('from"./').join('from"' + BASE)
  .split("import(`./").join("import(`" + BASE);
const mod = await import(URL.createObjectURL(new Blob([text], { type: "text/javascript" })));
export const component = mod.component;
