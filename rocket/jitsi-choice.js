/* Injected as Custom_Script_Logged_In. Intercepts the video button. */
(function () {
  if (window.__alexolJitsiChoice) return;
  window.__alexolJitsiChoice = true;

  var MAIL = "__MAIL_PUBLIC_URL__".replace(/\/$/, "");
  var MEET = "__JITSI_PUBLIC_URL__".replace(/\/$/, "");

  function isAdminPath() {
    var p = location.pathname || "";
    return p.indexOf("/admin") === 0 || p.indexOf("/administration") === 0;
  }

  function slug(value) {
    var raw = String(value || "")
      .trim()
      .toLowerCase()
      .split("@")[0];
    var out = raw.replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
    return out.slice(0, 48) || "room";
  }

  function roomNameFromUrl() {
    var m = (location.pathname || "").match(
      /\/(?:channel|group|direct|live|d|c|g)\/([^/?#]+)/i
    );
    return m ? decodeURIComponent(m[1]) : "";
  }

  function roomIdFromDom() {
    var el =
      document.querySelector("[data-qa-rc-room]") ||
      document.querySelector("[data-qa-rid]");
    if (!el) return "";
    return el.getAttribute("data-qa-rc-room") || el.getAttribute("data-qa-rid") || "";
  }

  function meteorAuth() {
    var token = "";
    var uid = "";
    try {
      if (window.Meteor && Meteor._localStorage) {
        token = Meteor._localStorage.getItem("Meteor.loginToken") || "";
        uid = Meteor._localStorage.getItem("Meteor.userId") || "";
      }
      if ((!token || !uid) && window.localStorage) {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i) || "";
          var v = localStorage.getItem(k) || "";
          if (!v) continue;
          if (/loginToken$/i.test(k) && k.indexOf("Expires") === -1) token = v;
          if (/userId$/i.test(k)) uid = v;
        }
      }
    } catch (e) {}
    if (!token || !uid) return null;
    return { token: token, uid: uid };
  }

  function authHeaders() {
    var a = meteorAuth();
    if (!a) return null;
    return {
      "X-Auth-Token": a.token,
      "X-User-Id": a.uid,
      "Content-Type": "application/json",
    };
  }

  function isVideoTrigger(node) {
    if (!node || !node.closest) return false;
    if (node.closest("#alexol-jitsi-overlay")) return false;
    var n = node.closest("button, a, [role='button']");
    if (!n) return false;
    var qa =
      (n.getAttribute("data-qa-id") || "") +
      " " +
      (n.getAttribute("data-qa") || "") +
      " " +
      (n.id || "");
    if (/video-conference|videoconf|video-conf|start-call/i.test(qa)) return true;
    var label = (
      (n.getAttribute("aria-label") || "") +
      " " +
      (n.getAttribute("title") || "") +
      " " +
      (n.getAttribute("data-tooltip") || "")
    ).toLowerCase();
    return (
      /видеозвонок|видеоконферен|начать звонок|start a call|video call|start call|conference call|start jitsi|video conference/.test(
        label
      )
    );
  }

  function ensureModal() {
    var existing = document.getElementById("alexol-jitsi-overlay");
    if (existing) return existing;
    var style = document.createElement("style");
    style.textContent =
      "#alexol-jitsi-overlay{position:fixed;inset:0;z-index:100000;background:rgba(8,11,18,.62);display:flex;align-items:center;justify-content:center;padding:16px}" +
      "#alexol-jitsi-modal{width:min(440px,100%);background:var(--rcx-color-surface-light,#1f2329);color:var(--rcx-color-font-default,#e8eef7);border:1px solid rgba(148,163,184,.28);border-radius:16px;padding:26px 22px 20px;position:relative;box-shadow:0 24px 60px rgba(0,0,0,.35);font-family:Inter,system-ui,sans-serif}" +
      "#alexol-jitsi-modal h2{margin:0 0 8px;font-size:1.25rem}" +
      "#alexol-jitsi-modal p{margin:0 0 16px;opacity:.78;line-height:1.45}" +
      "#alexol-jitsi-close{position:absolute;top:10px;right:10px;border:0;background:transparent;color:inherit;opacity:.7;cursor:pointer;font-size:22px;line-height:1;padding:6px}" +
      ".alexol-jitsi-card{display:block;width:100%;text-align:left;margin:0 0 10px;padding:14px 16px;border-radius:12px;border:1px solid rgba(148,163,184,.28);background:transparent;color:inherit;cursor:pointer}" +
      ".alexol-jitsi-card strong{display:block;font-size:15px}" +
      ".alexol-jitsi-card span{display:block;margin-top:4px;font-size:13px;opacity:.72}" +
      ".alexol-jitsi-card:hover{border-color:#06b6d4}";
    document.head.appendChild(style);

    var overlay = document.createElement("div");
    overlay.id = "alexol-jitsi-overlay";
    overlay.hidden = true;
    overlay.innerHTML =
      '<div id="alexol-jitsi-modal" role="dialog" aria-labelledby="alexol-jitsi-title">' +
      '<button type="button" id="alexol-jitsi-close" aria-label="Закрыть">×</button>' +
      '<h2 id="alexol-jitsi-title">Видеозвонок Jitsi</h2>' +
      "<p>Как в почте: гости по ссылке или только ящики @alexol.io. Ссылку отправим в эту комнату.</p>" +
      '<button type="button" class="alexol-jitsi-card" data-kind="open"><strong>Открытая</strong><span>Гости входят без логина (имя на странице входа)</span></button>' +
      '<button type="button" class="alexol-jitsi-card" data-kind="anyone"><strong>Открытая, без организатора</strong><span>Первый вошедший ведёт встречу</span></button>' +
      '<button type="button" class="alexol-jitsi-card" data-kind="closed"><strong>Закрытая</strong><span>Только почта @alexol.io</span></button>' +
      "</div>";
    document.body.appendChild(overlay);
    overlay.addEventListener("click", function (ev) {
      if (ev.target === overlay) hideModal();
    });
    document.getElementById("alexol-jitsi-close").onclick = hideModal;
    overlay.querySelectorAll(".alexol-jitsi-card").forEach(function (btn) {
      btn.onclick = function () {
        startCall(btn.getAttribute("data-kind"));
      };
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") hideModal();
    });
    return overlay;
  }

  function showModal() {
    ensureModal().hidden = false;
  }

  function hideModal() {
    var el = document.getElementById("alexol-jitsi-overlay");
    if (el) el.hidden = true;
  }

  function prefixFor(kind) {
    if (kind === "closed") return "c";
    if (kind === "anyone") return "a";
    return "o";
  }

  function labelFor(kind) {
    if (kind === "closed") return "закрытая, только @alexol.io";
    if (kind === "anyone") return "открытая, без организатора";
    return "открытая, гости по ссылке";
  }

  function postMessage(rid, text) {
    var headers = authHeaders();
    if (!rid || !headers) return Promise.resolve();
    return fetch("/api/v1/chat.postMessage", {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ roomId: rid, text: text }),
    }).catch(function () {});
  }

  function resolveRoomId() {
    var rid = roomIdFromDom();
    if (rid) return Promise.resolve(rid);
    var headers = authHeaders();
    var name = roomNameFromUrl();
    if (!headers || !name) return Promise.resolve("");
    var path = /\/(?:direct|d)\//i.test(location.pathname)
      ? "/api/v1/im.info?username=" + encodeURIComponent(name)
      : "/api/v1/rooms.info?roomName=" + encodeURIComponent(name);
    return fetch(path, { headers: headers })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        return (data.room && data.room._id) || (data.direct && data.direct._id) || "";
      })
      .catch(function () {
        return "";
      });
  }

  function startCall(kind) {
    hideModal();
    var room = prefixFor(kind) + "-chat-" + slug(roomNameFromUrl() || roomIdFromDom() || "room");
    var bounce = MAIL + "/jitsi-auth?room=" + encodeURIComponent(room);
    var meet = MEET + "/" + room;
    var text = "Видеозвонок Jitsi (" + labelFor(kind) + "): " + bounce;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(meet);
      }
    } catch (e) {}
    window.open(bounce, "_blank", "noopener,noreferrer");
    resolveRoomId().then(function (rid) {
      return postMessage(rid, text);
    });
  }

  document.addEventListener(
    "click",
    function (ev) {
      if (isAdminPath()) return;
      if (ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      if (!isVideoTrigger(ev.target)) return;
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      showModal();
    },
    true
  );
})();
