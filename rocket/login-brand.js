/* Login overlay + hide leftover Rocket.Chat chrome. Not inserted into React trees. */
(function () {
  if (window.__alexolLoginBrand) return;
  window.__alexolLoginBrand = true;

  var MARK =
    '<img class="alexol-login-mark" src="/alexol-logo.png" width="88" height="100" alt="">';

  var APPLE =
    '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.37 12.62c.02 2.4 2.1 3.2 2.12 3.21-.02.06-.33 1.13-1.09 2.24-.66.96-1.34 1.91-2.41 1.93-1.05.02-1.39-.62-2.59-.62-1.21 0-1.58.6-2.58.64-1.04.04-1.83-1.04-2.5-2-1.36-1.95-2.4-5.51-1-8.16.69-1.32 1.93-2.16 3.27-2.18 1.02-.02 1.99.69 2.59.69.6 0 1.73-.85 2.92-.73.5.02 1.9.2 2.8 1.51-.07.04-1.67 1-1.53 2.96zM14.7 6.3c.55-.67.92-1.6.82-2.53-.8.03-1.76.53-2.33 1.2-.51.59-.96 1.54-.84 2.45.89.07 1.8-.45 2.35-1.12z"/></svg>';

  var WINDOWS =
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 5.5 11 4.3v7.2H3V5.5zm8.5-.3 9.5-1.4v8.9h-9.5V5.2zM3 13.5h8v7.3L3 19.6v-6.1zm8.5 0h9.5V22l-9.5-1.4v-7.1z"/></svg>';

  function isLogin() {
    return !!document.getElementById("welcomeTitle");
  }

  function setFavicon() {
    var svg = "/alexol-favicon.svg";
    var png = "/alexol-favicon.png";
    var hasSvg = false;
    var hasPng = false;
    document.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"]').forEach(function (el) {
      var href = el.getAttribute("href") || "";
      if (href.indexOf("alexol-favicon.svg") !== -1) hasSvg = true;
      if (href.indexOf("alexol-favicon.png") !== -1) hasPng = true;
    });
    if (!hasSvg) {
      var l = document.createElement("link");
      l.rel = "icon";
      l.type = "image/svg+xml";
      l.href = svg;
      (document.head || document.documentElement).appendChild(l);
    }
    if (!hasPng) {
      var p = document.createElement("link");
      p.rel = "icon";
      p.type = "image/png";
      p.href = png;
      (document.head || document.documentElement).appendChild(p);
    }
    if (!document.querySelector('link[rel="apple-touch-icon"][href*="alexol-favicon"]')) {
      var a = document.createElement("link");
      a.rel = "apple-touch-icon";
      a.href = png;
      (document.head || document.documentElement).appendChild(a);
    }
  }

  function overlay() {
    var wrap = document.getElementById("alexol-login-overlay");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "alexol-login-overlay";
      wrap.innerHTML =
        '<div class="alexol-login-brand" aria-hidden="true">' +
        MARK +
        "<span>Alexol</span></div>" +
        '<div class="alexol-login-apps">' +
        '<a href="/desktop/mac" title="Скачать для macOS" aria-label="Скачать для macOS">' +
        APPLE +
        "</a>" +
        '<a href="/desktop/win" title="Скачать для Windows" aria-label="Скачать для Windows">' +
        WINDOWS +
        "</a></div>";
      document.documentElement.appendChild(wrap);
    }
    return wrap;
  }

  function removeOverlay() {
    var el = document.getElementById("alexol-login-overlay");
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function findCard(form) {
    var card = form;
    var hops = 0;
    while (card.parentElement && hops < 12) {
      var parent = card.parentElement;
      if (parent.querySelector && parent.querySelector("#welcomeTitle")) break;
      if (parent.offsetWidth > 720) break;
      card = parent;
      hops += 1;
    }
    return card;
  }

  function centerLayout() {
    document.documentElement.classList.add("alexol-login");
    var welcome = document.getElementById("welcomeTitle");
    var form = document.querySelector("form");
    if (!welcome || !form) return null;

    var aside = welcome;
    while (aside.parentElement && aside.parentElement.querySelector && !aside.parentElement.querySelector("form, input[type=password]")) {
      aside = aside.parentElement;
    }
    if (aside && aside !== welcome) aside.classList.add("alexol-login-aside");

    var card = findCard(form);
    card.classList.add("alexol-login-card");

    var shell = card.parentElement;
    while (shell && shell !== document.body) {
      try {
        var st = window.getComputedStyle(shell);
        if (st.display.indexOf("flex") !== -1 && shell.offsetWidth > 720 && shell.offsetHeight > 280) {
          shell.classList.add("alexol-login-shell");
          break;
        }
      } catch (e) {}
      shell = shell.parentElement;
    }
    return card;
  }

  function positionOverlay(card) {
    var wrap = document.getElementById("alexol-login-overlay");
    if (!wrap || !card) return;
    if (window.innerWidth < 1200) return;
    var r = card.getBoundingClientRect();
    var w = wrap.offsetWidth || 240;
    var left = Math.max(16, r.left - w - 48);
    wrap.style.left = left + "px";
    wrap.style.top = r.top + r.height / 2 + "px";
    wrap.style.transform = "translateY(-50%)";
    wrap.style.alignItems = "flex-start";
  }

  function hideRocketMarks(root) {
    if (!root || !root.querySelectorAll) return;
    var nodes = root.querySelectorAll("a, span, p, small, div, svg, img");
    var i;
    for (i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.closest && el.closest("#alexol-login-overlay,#alexol-jitsi-overlay,#alexol-jitsi-launch,form")) continue;
      if (el.children && el.children.length > 6) continue;
      var href = (el.getAttribute && (el.getAttribute("href") || el.getAttribute("src") || "")) || "";
      var t = (el.textContent || "").replace(/\s+/g, " ").trim();
      var isLink = /https?:\/\/(www\.)?rocket\.chat/i.test(href);
      var isLabel =
        /^(powered by\s*)?rocket\.chat$/i.test(t) ||
        /^powered by rocket\.chat$/i.test(t) ||
        (t.length < 48 && /powered by rocket\.chat/i.test(t));
      var parentText = (el.parentElement && (el.parentElement.textContent || "").replace(/\s+/g, " ").trim()) || "";
      var isPlan =
        /^(starter|community)$/i.test(t) &&
        parentText.length < 80 &&
        /rocket\.chat/i.test(parentText);
      if (!isLink && !isLabel && !isPlan) continue;
      var block = el;
      if (el.parentElement && parentText.length < 80) block = el.parentElement;
      block.style.setProperty("display", "none", "important");
    }
  }

  function hideChrome() {
    hideRocketMarks(document.body);
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

  function hideSidebarRocket() {
    var roots = document.querySelectorAll("aside, nav");
    if (!roots.length) hideRocketMarks(document.body);
    var i;
    for (i = 0; i < roots.length; i++) hideRocketMarks(roots[i]);
  }

  var ticking = false;
  function apply() {
    setFavicon();
    if (isLogin()) {
      hideChrome();
      overlay();
      positionOverlay(centerLayout());
      return;
    }
    document.documentElement.classList.remove("alexol-login");
    removeOverlay();
    hideSidebarRocket();
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
  window.addEventListener("resize", schedule);
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
})();
