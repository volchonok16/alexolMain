/* Login + sidebar: Alexol mark. Safe on both logged-out and logged-in pages. */
(function () {
  if (window.__alexolLoginBrand) return;
  window.__alexolLoginBrand = true;

  var MARK =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="40" height="40" aria-hidden="true">' +
    '<circle cx="40" cy="40" r="40" fill="#0C0F16"/>' +
    '<path fill="#0AE3FF" d="M40 12 L66.5 27.25 V52.75 L40 68 L13.5 52.75 V27.25 Z M40 24 L24.5 32.9 V47.1 L40 56 L55.5 47.1 V32.9 Z"/>' +
    '<circle cx="40" cy="40" r="6" fill="#fff"/>' +
    "</svg>";

  var CSS =
    "#alexol-login-brand,#alexol-sidebar-brand{display:flex;align-items:center;gap:12px}" +
    "#alexol-login-brand{margin:0 0 16px}" +
    "#alexol-login-brand span,#alexol-sidebar-brand span{font-weight:700;font-size:22px;letter-spacing:.02em;color:inherit}" +
    "#alexol-sidebar-brand{padding:8px 16px;height:70px;box-sizing:border-box;text-decoration:none;color:#F8FAFC}" +
    "#alexol-sidebar-brand svg{flex:none}" +
    "a[href='https://rocket.chat/'],a[href='https://rocket.chat']{display:none!important}" +
    "a[href*='terms-of-service'],a[href*='privacy-policy'],a[href*='legal-notice']{display:none!important}";

  function hide(el) {
    if (el) el.style.setProperty("display", "none", "important");
  }

  function injectCss() {
    if (document.getElementById("alexol-brand-css")) return;
    var s = document.createElement("style");
    s.id = "alexol-brand-css";
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  function brandBox(id, size) {
    var wrap = document.createElement("div");
    wrap.id = id;
    wrap.innerHTML = MARK.replace('width="40"', 'width="' + size + '"').replace('height="40"', 'height="' + size + '"');
    var name = document.createElement("span");
    name.textContent = "Alexol";
    wrap.appendChild(name);
    return wrap;
  }

  function findWelcome() {
    var el = document.getElementById("welcomeTitle");
    if (el) {
      var box = el.parentElement;
      if (box && /Welcome to/i.test(box.textContent || "") && !box.querySelector("input,button,form")) return box;
      return el;
    }
    var nodes = document.querySelectorAll("h1,h2,p,div,span");
    for (var i = 0; i < nodes.length; i++) {
      var t = (nodes[i].textContent || "").replace(/\s+/g, " ").trim();
      if (/^Welcome to .+ workspace$/i.test(t) && !nodes[i].querySelector("input,form") && t.length < 80) {
        return nodes[i];
      }
    }
    return null;
  }

  function hideRocketSvgs(root) {
    if (!root) return;
    root.querySelectorAll("svg").forEach(function (svg) {
      if (svg.closest("#alexol-login-brand,#alexol-sidebar-brand")) return;
      var label =
        (svg.getAttribute("aria-label") || "") +
        " " +
        (svg.getAttribute("title") || "") +
        " " +
        ((svg.querySelector("title") && svg.querySelector("title").textContent) || "");
      if (/rocket/i.test(label)) hide(svg);
    });
  }

  function brandLogin() {
    var welcome = findWelcome();
    if (!welcome) return;

    hideRocketSvgs(welcome.parentElement || document);
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

    var aside = welcome.parentElement;
    if (aside) {
      Array.prototype.forEach.call(aside.children || [], function (child) {
        if (child.id === "alexol-login-brand") return;
        if (child === welcome || child.contains(welcome)) return;
        if (child.querySelector("form,input,button")) return;
        var t = (child.textContent || "").replace(/\s+/g, " ").trim();
        if (!t || /rocket\.chat|powered by/i.test(t) || child.querySelector("svg,img")) hide(child);
      });
    }

    var hideTitle = welcome;
    var parentText = welcome.parentElement && (welcome.parentElement.textContent || "").replace(/\s+/g, " ").trim();
    if (welcome.parentElement && /^Welcome to .+ workspace$/i.test(parentText) && !welcome.parentElement.querySelector("form,input")) {
      hideTitle = welcome.parentElement;
    }
    if (!document.getElementById("alexol-login-brand") && hideTitle.parentNode) {
      hideTitle.parentNode.insertBefore(brandBox("alexol-login-brand", 56), hideTitle);
    }
    hide(hideTitle);
  }

  function isWatermarkText(t) {
    t = (t || "").replace(/\s+/g, " ").trim();
    return (
      t === "Starter" ||
      t === "Community" ||
      t === "Powered by Rocket.Chat" ||
      t === "Powered by Rocket.chat" ||
      /powered by rocket\.chat/i.test(t) ||
      t === "Работает на Rocket.Chat"
    );
  }

  function brandSidebar() {
    var nav = document.querySelector("nav") || document.querySelector("aside") || document.body;
    if (!nav) return;

    var all = nav.querySelectorAll("a, p, span, div, footer, small");
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.closest("#alexol-sidebar-brand,#alexol-login-brand")) continue;
      if (el.children.length > 3) continue;
      var t = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (!isWatermarkText(t) && !/^powered by/i.test(t)) continue;
      var block = el;
      if (el.parentElement && (el.parentElement.textContent || "").length < 80) block = el.parentElement;
      hide(block);
    }

    var rocketWord = null;
    var imgs = nav.querySelectorAll("img, svg");
    for (var j = 0; j < imgs.length; j++) {
      var g = imgs[j];
      if (g.closest("#alexol-sidebar-brand,#alexol-login-brand")) continue;
      var alt = (g.getAttribute("alt") || "") + " " + (g.getAttribute("aria-label") || "");
      var src = g.getAttribute("src") || "";
      if (/rocket/i.test(alt) || /assets\/logo/i.test(src) || /rocket/i.test(src)) {
        rocketWord = g.closest("a") || g.parentElement || g;
        break;
      }
    }
    if (!rocketWord) {
      var links = nav.querySelectorAll("a");
      for (var k = 0; k < links.length; k++) {
        var tx = (links[k].textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
        if (tx === "rocket.chat" || tx === "rocket chat" || (/\brocket\.chat\b/i.test(tx) && tx.length < 48 && !/alexol/i.test(tx))) {
          rocketWord = links[k];
          break;
        }
      }
    }

    if (document.getElementById("alexol-sidebar-brand")) return;
    if (rocketWord && rocketWord.parentNode) {
      rocketWord.parentNode.insertBefore(brandBox("alexol-sidebar-brand", 32), rocketWord);
      hide(rocketWord);
    }
  }

  var ticking = false;
  function apply() {
    injectCss();
    brandLogin();
    brandSidebar();
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
