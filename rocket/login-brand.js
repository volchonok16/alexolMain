/* Login / reset-password: Alexol mark, title, no Rocket.Chat chrome. */
(function () {
  if (window.__alexolLoginBrand) return;
  window.__alexolLoginBrand = true;

  var MARK =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="56" height="56" aria-hidden="true">' +
    '<circle cx="40" cy="40" r="40" fill="#0C0F16"/>' +
    '<path fill="#0AE3FF" d="M40 12 L66.5 27.25 V52.75 L40 68 L13.5 52.75 V27.25 Z M40 24 L24.5 32.9 V47.1 L40 56 L55.5 47.1 V32.9 Z"/>' +
    '<circle cx="40" cy="40" r="6" fill="#fff"/>' +
    "</svg>";

  function hide(el) {
    if (el) el.style.setProperty("display", "none", "important");
  }

  function hideRocketChrome() {
    document.querySelectorAll('a[href="https://rocket.chat/"], a[href="https://rocket.chat"]').forEach(function (a) {
      hide(a.parentElement || a);
    });
    document.querySelectorAll('a[href*="terms-of-service"], a[href*="privacy-policy"], a[href*="legal-notice"]').forEach(function (a) {
      var n = a.parentElement;
      var i = 0;
      while (n && i < 6) {
        var t = n.textContent || "";
        if (/proceeding|Terms of Service|Privacy Policy|Legal Notice/i.test(t) && !n.querySelector("input,button")) {
          hide(n);
          break;
        }
        n = n.parentElement;
        i += 1;
      }
    });
    document.querySelectorAll('[aria-label="Rocket.Chat"], [aria-label="Rocket.Chat logo"]').forEach(function (el) {
      if (el.closest("#alexol-login-brand")) return;
      hide(el);
    });
  }

  function paintTitle() {
    var el = document.getElementById("welcomeTitle");
    if (!el) return;

    var titleBox = el.parentElement;
    var aside = titleBox && titleBox.parentElement;
    var hasWorkspaceLogo = !!(aside && aside.querySelector("img"));

    if (!document.getElementById("alexol-login-brand") && !hasWorkspaceLogo) {
      var wrap = document.createElement("div");
      wrap.id = "alexol-login-brand";
      wrap.innerHTML = MARK;
      wrap.setAttribute("aria-hidden", "true");
      var slot = titleBox || el;
      if (slot.parentNode) slot.parentNode.insertBefore(wrap, slot);
    }

    var node = el;
    if (titleBox && /Welcome to/i.test(titleBox.textContent || "") && !titleBox.querySelector("form,input,button")) {
      node = titleBox;
    }
    if ((node.textContent || "").indexOf("Welcome to") !== -1) {
      node.textContent = "Alexol";
    } else if ((el.textContent || "").trim() !== "Alexol") {
      el.textContent = "Alexol";
    }
  }

  function apply() {
    if (!document.getElementById("welcomeTitle")) return;
    hideRocketChrome();
    paintTitle();
  }

  apply();
  new MutationObserver(apply).observe(document.documentElement, { childList: true, subtree: true });
})();
