/**
 * Current GoatCounter property for www.chicasmap.com.
 * The older chicasmap.goatcounter.com property (justonejewelry.github.io) is legacy only.
 */
export const GOATCOUNTER_URL = "https://chicasmapcom.goatcounter.com/count";
export const GOATCOUNTER =
  '<script>(function(){window.goatcounter=window.goatcounter||{};window.goatcounter.path=function(p){var path=(p||location.pathname||"/").replace(/^\\/Chicas-Map(?=\\/|$)/, "")||"/";if(path.indexOf("/admin")===0||path.indexOf("/__grok")===0||path.indexOf("/google")===0)return;return path;};})();</script><script data-goatcounter="' +
  GOATCOUNTER_URL +
  '" async src="https://gc.zgo.at/count.js"></script>';

const OLD_COUNT = "https://chicasmap.goatcounter.com/count";

/** True only for the count script tag, not data-goatcounter-click event hooks. */
export function hasGoatCounter(html) {
  return /data-goatcounter\s*=/.test(html) || html.includes("gc.zgo.at/count.js");
}

/** Point leftover legacy count URLs at the current property, and add the snippet once if missing. */
export function withGoatCounter(html) {
  if (html.includes(OLD_COUNT)) html = html.split(OLD_COUNT).join(GOATCOUNTER_URL);
  if (hasGoatCounter(html)) return html;
  return html.includes("</body>") ? html.replace("</body>", GOATCOUNTER + "</body>") : html + GOATCOUNTER;
}
