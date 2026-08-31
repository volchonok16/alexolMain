/* Login page only. Overlay on <html>, no inserts into Rocket.Chat React trees. */
(function () {
  if (window.__alexolLoginBrand) return;
  window.__alexolLoginBrand = true;

  var MARK =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="56" height="56" aria-hidden="true">' +
    '<circle cx="40" cy="40" r="40" fill="#0C0F16"/>' +
    '<path fill="#0AE3FF" d="M40 12 L66.5 27.25 V52.75 L40 68 L13.5 52.75 V27.25 Z M40 24 L24.5 32.9 V47.1 L40 56 L55.5 47.1 V32.9 Z"/>' +
    '<circle cx="40" cy="40" r="6" fill="#fff"/>' +
    "</svg>";

  var CSS =
    "a[href='https://rocket.chat/'],a[href='https://rocket.chat']{display:none!important}" +
    "a[href*='terms-of-service'],a[href*='privacy-policy'],a[href*='legal-notice']{display:none!important}" +
    "#alexol-login-overlay{position:fixed;left:48px;top:38%;z-index:30;display:flex;align-items:center;gap:14px;pointer-events:none}" +
    "#alexol-login-overlay span{font-weight:700;font-size:28px;color:#1f2329;letter-spacing:.02em}" +
    "@media (max-width:1439px){#alexol-login-overlay{left:50%;top:24px;transform:translateX(-50%)}}";

  function isLogin() {
    return !!document.getElementById("welcomeTitle");
  }

  function injectCss() {
    if (document.getElementById("alexol-brand-css")) return;
    var s = document.createElement("style");
    s.id = "alexol-brand-css";
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  function overlay() {
    if (document.getElementById("alexol-login-overlay")) return;
    var wrap = document.createElement("div");
    wrap.id = "alexol-login-overlay";
    wrap.setAttribute("aria-hidden", "true");
    wrap.innerHTML = MARK + "<span>Alexol</span>";
    document.documentElement.appendChild(wrap);
  }

  function removeOverlay() {
    var el = document.getElementById("alexol-login-overlay");
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function hideChrome() {
    var el = document.getElementById("welcomeTitle");
    if (!el) return;
    var aside = el;
    while (aside.parentElement && !aside.parentElement.querySelector("form, input[type=password]")) {
      aside = aside.parentElement;
    }
    if (aside && aside !== el) {
      aside.querySelectorAll("svg, img").forEach(function (g) {
        if (g.closest("#alexol-login-overlay")) return;
        g.style.setProperty("display", "none", "important");
      });
    }
    var n = el;
    var i;
    for (i = 0; i < 5 && n; i++) {
      var t = (n.textContent || "").replace(/\s+/g, " ").trim();
      if (/Welcome to .+ workspace/i.test(t) && t.length < 90 && !n.querySelector("form,input,button")) {
        n.style.setProperty("visibility", "hidden", "important");
        break;
      }
      n = n.parentElement;
    }
    document.querySelectorAll('a[href="https://rocket.chat/"], a[href="https://rocket.chat"]').forEach(function (a) {
      var p = a.parentElement;
      if (p) p.style.setProperty("display", "none", "important");
    });
    document.querySelectorAll('a[href*="terms-of-service"], a[href*="privacy-policy"], a[href*="legal-notice"]').forEach(function (a) {
      var p = a.parentElement;
      var j = 0;
      while (p && j < 5) {
        if (/proceeding|Terms of Service|Privacy Policy/i.test(p.textContent || "") && !p.querySelector("input,button")) {
          p.style.setProperty("display", "none", "important");
          break;
        }
        p = p.parentElement;
        j += 1;
      }
    });
  }

  var ticking = false;
  function apply() {
    if (!isLogin()) {
      removeOverlay();
      return;
    }
    injectCss();
    hideChrome();
    overlay();
  }
  function schedule() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      apply();
    });
  }

  apply();
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
})();
