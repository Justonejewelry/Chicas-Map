/** Zone honesty toast enhancement — loads after zone-aware-layer */
(function () {
  function enhance() {
    if (!window.ChicaZoneAware || window.ChicaZoneAware.__honesty) return;
    var api = window.ChicaZoneAware;
    var orig = api.toggle;
    if (typeof orig !== "function") return;
    api.__honesty = true;
    api.toggle = async function () {
      var before = api.isEnabled && api.isEnabled();
      var ret = orig.apply(api, arguments);
      try {
        if (ret && ret.then) await ret;
      } catch (_) {}
      try {
        var after = api.isEnabled && api.isEnabled();
        if (after && !before) {
          var st = (api.status && api.status()) || {};
          var schedule = st.schedule || "";
          var src = st.source || "";
          var srcHint = /live/i.test(src) ? " · live GIS" : /cache/i.test(src) ? " · cached" : "";
          var hoursNote = /Outside school-zone hours|Weekend|inactive/i.test(schedule)
            ? " — buffers still shown"
            : "";
          if (window.ChicaUx && window.ChicaUx.toast) {
            window.ChicaUx.toast("Zone Aware on — " + schedule + hoursNote + srcHint, 4800);
          }
        }
      } catch (_) {}
      return ret;
    };
  }
  setTimeout(enhance, 800);
  setTimeout(enhance, 2000);
  setTimeout(enhance, 4000);
})();
