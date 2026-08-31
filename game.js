/* ─────────────────────────────────────────────────────────
   Cozy collectible game (main.html only)

   Self-contained module. Builds one persistent DOM layer on
   first start and toggles it on/off; never rebuilds it, so
   there is exactly one delegated click listener and one
   keydown listener for the whole page lifetime, never
   duplicated by repeated starts/restarts.
   ───────────────────────────────────────────────────────── */

(function () {
  "use strict";

  var ITEMS = [
    { id: "cup", label: "coffee cup", points: 10 },
    { id: "note", label: "note", points: 5 },
    { id: "book", label: "book", points: 15, rarePoints: 50 },
    { id: "star", label: "star", points: 25, rarePoints: 50 },
    { id: "folder", label: "folder", points: 10 },
    { id: "floppy", label: "floppy disk", points: 20 },
    { id: "paperclip", label: "paperclip", points: 5 },
    { id: "cassette", label: "cassette", points: 15, rarePoints: 50 },
    { id: "spark", label: "spark", points: 10 },
    { id: "pen", label: "fountain pen", points: 15 },
    { id: "bookmark", label: "bookmark", points: 10 },
    { id: "flower", label: "flower", points: 15, rarePoints: 50 },
    { id: "moon", label: "moon", points: 25, rarePoints: 50 },
    { id: "bulb", label: "light bulb", points: 20 },
  ];

  var ICON_ATTRS = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';

  var ICONS = {
    cup:
      '<svg ' + ICON_ATTRS + '><path d="M4 8h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Z"/><path d="M16 9h2a2 2 0 0 1 0 4h-2"/><path d="M7 5c.4-.9.4-1.4 0-2.3M11 5c.4-.9.4-1.4 0-2.3"/></svg>',
    note:
      '<svg ' + ICON_ATTRS + '><path d="M6 3h9l4 4v14H6V3Z"/><path d="M15 3v4h4"/><path d="M8.5 11h7M8.5 14h7M8.5 17h4"/></svg>',
    book:
      '<svg ' + ICON_ATTRS + '><path d="M4 5c2-1 5-1 7 0v14c-2-1-5-1-7 0V5Z"/><path d="M18 5c-2-1-5-1-7 0v14c2-1 5-1 7 0V5Z"/></svg>',
    star:
      '<svg ' + ICON_ATTRS + '><path d="M12 3.5l2.3 4.8 5.3.5-4 3.6 1.1 5.2L12 15.1l-4.7 2.5 1.1-5.2-4-3.6 5.3-.5L12 3.5Z"/></svg>',
    folder:
      '<svg ' + ICON_ATTRS + '><path d="M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z"/></svg>',
    floppy:
      '<svg ' + ICON_ATTRS + '><path d="M4 4h13l3 3v13H4V4Z"/><path d="M7 4v6h9V4"/><rect x="7.5" y="13.5" width="9" height="6"/></svg>',
    paperclip:
      '<svg ' + ICON_ATTRS + '><path d="M21.4 11.05 12.2 20.2a5 5 0 0 1-7.07-7.07l9.19-9.2a3.33 3.33 0 0 1 4.71 4.72l-9.2 9.19a1.67 1.67 0 0 1-2.36-2.36l8.49-8.49"/></svg>',
    cassette:
      '<svg ' + ICON_ATTRS + '><rect x="3" y="5" width="18" height="14" rx="1.2"/><circle cx="8.5" cy="12" r="2.1"/><circle cx="15.5" cy="12" r="2.1"/><path d="M9.5 16.3h5"/></svg>',
    spark:
      '<svg ' + ICON_ATTRS + '><path d="M12 3v4.5M12 16.5V21M3 12h4.5M16.5 12H21M6.5 6.5l2 2M15.5 15.5l2 2M17.5 6.5l-2 2M8.5 15.5l-2 2"/></svg>',
    pen:
      '<svg ' + ICON_ATTRS + '><path d="M19 3 5 17l-2 4 4-2L21 5Z"/><path d="M14.5 7.5l2 2"/></svg>',
    bookmark:
      '<svg ' + ICON_ATTRS + '><path d="M6 3h12v18l-6-4-6 4V3Z"/></svg>',
    flower:
      '<svg ' + ICON_ATTRS + '><circle cx="12" cy="12" r="2"/><circle cx="12" cy="6.3" r="2.6"/><circle cx="12" cy="17.7" r="2.6"/><circle cx="6.3" cy="12" r="2.6"/><circle cx="17.7" cy="12" r="2.6"/></svg>',
    moon:
      '<svg ' + ICON_ATTRS + '><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/></svg>',
    bulb:
      '<svg ' + ICON_ATTRS + '><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.6.6 1 1.4 1 2.5h6c0-1.1.4-1.9 1-2.5A6 6 0 0 0 12 3Z"/></svg>',
  };

  var GAME_DURATION_S = 28;
  var RARE_CHANCE = 0.14;

  var root, field, foundEl, timeEl, resultEl, resultLineEl, resultMsgEl, resultScoreEl;
  var state = null;

  function isMobile() {
    return window.matchMedia("(max-width: 700px)").matches;
  }

  function buildDom() {
    root = document.createElement("div");
    root.className = "game-root";
    root.setAttribute("aria-hidden", "true");
    root.innerHTML =
      '<div class="game-overlay"></div>' +
      '<div class="game-field" data-field></div>' +
      '<div class="game-hud">' +
      '<div class="game-hud-stats">' +
      '<span>FOUND <span data-found>0</span></span>' +
      '<span>TIME <span data-time>' + GAME_DURATION_S + "</span></span>" +
      "</div>" +
      '<button type="button" class="game-exit" data-exit aria-label="Exit game">EXIT</button>' +
      "</div>" +
      '<div class="game-result" data-result hidden>' +
      '<div class="game-result-card">' +
      '<p class="game-result-title">A NICE LITTLE BREAK</p>' +
      '<p class="game-result-line" data-result-line></p>' +
      '<p class="game-result-msg" data-result-msg></p>' +
      '<p class="game-result-score" data-result-score></p>' +
      '<div class="game-result-actions">' +
      '<button type="button" class="button button-primary" data-play-again>PLAY AGAIN</button>' +
      '<button type="button" class="button" data-return>RETURN TO SITE</button>' +
      "</div>" +
      "</div>" +
      "</div>";

    document.body.appendChild(root);

    field = root.querySelector("[data-field]");
    foundEl = root.querySelector("[data-found]");
    timeEl = root.querySelector("[data-time]");
    resultEl = root.querySelector("[data-result]");
    resultLineEl = root.querySelector("[data-result-line]");
    resultMsgEl = root.querySelector("[data-result-msg]");
    resultScoreEl = root.querySelector("[data-result-score]");

    // One delegated listener for the whole lifetime of the page.
    root.addEventListener("click", onRootClick);
    document.addEventListener("keydown", onKeydown);
  }

  function onRootClick(event) {
    if (event.target.closest("[data-exit]")) {
      exitGame();
      return;
    }
    if (event.target.closest("[data-return]")) {
      exitGame();
      return;
    }
    if (event.target.closest("[data-play-again]")) {
      restartGame();
      return;
    }
    var item = event.target.closest(".game-item");
    if (item && state && state.active) collectItem(item);
  }

  function onKeydown(event) {
    if (event.key === "Escape" && state && state.active) exitGame();
  }

  function pickItem() {
    var def = ITEMS[Math.floor(Math.random() * ITEMS.length)];
    var isRare = !!def.rarePoints && Math.random() < RARE_CHANCE;
    return {
      id: def.id,
      label: def.label,
      points: isRare ? def.rarePoints : def.points,
      isRare: isRare,
    };
  }

  function randomPosition(size) {
    var margin = 16;
    var hudSafeTop = isMobile() ? 92 : 74;
    var w = window.innerWidth;
    var h = window.innerHeight;
    var minX = margin;
    var minY = hudSafeTop;
    var maxX = Math.max(minX + 1, w - size - margin);
    var maxY = Math.max(minY + 1, h - size - margin);

    var existing = field.querySelectorAll(".game-item");
    var best = null;
    var bestDist = -1;

    for (var attempt = 0; attempt < 8; attempt++) {
      var x = minX + Math.random() * (maxX - minX);
      var y = minY + Math.random() * (maxY - minY);

      if (existing.length === 0) {
        best = { x: x, y: y };
        break;
      }

      var minDist = Infinity;
      for (var i = 0; i < existing.length; i++) {
        var ex = parseFloat(existing[i].style.left);
        var ey = parseFloat(existing[i].style.top);
        var d = Math.hypot(ex - x, ey - y);
        if (d < minDist) minDist = d;
      }

      if (minDist > bestDist) {
        bestDist = minDist;
        best = { x: x, y: y };
      }
      if (minDist > 70) break;
    }

    return best;
  }

  function spawnItem() {
    if (!state || !state.active) return;

    var maxVisible = isMobile() ? 4 : 6;
    if (field.querySelectorAll(".game-item").length >= maxVisible) return;

    var picked = pickItem();
    var size = isMobile() ? 46 : 42;
    var pos = randomPosition(size);
    if (!pos) return;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "game-item" + (picked.isRare ? " game-item--rare" : "");
    btn.style.left = pos.x + "px";
    btn.style.top = pos.y + "px";
    btn.style.width = size + "px";
    btn.style.height = size + "px";
    btn.style.animationDelay = "0s, " + (Math.random() * 1.6).toFixed(2) + "s";
    btn.setAttribute("aria-label", "Collect " + picked.label);
    btn.dataset.points = String(picked.points);
    btn.innerHTML = ICONS[picked.id] || "";

    field.appendChild(btn);

    var lifetime = picked.isRare
      ? 4200 + Math.random() * 1500
      : 2500 + Math.random() * 2000;

    var timeoutId = window.setTimeout(function () {
      expireItem(btn);
    }, lifetime);
    state.itemTimers.set(btn, timeoutId);
  }

  function expireItem(btn) {
    if (!state || !btn.isConnected) return;
    state.itemTimers.delete(btn);
    btn.classList.add("game-item--fade");
    window.setTimeout(function () {
      if (btn.isConnected) btn.remove();
    }, 220);
  }

  function collectItem(btn) {
    var timeoutId = state.itemTimers.get(btn);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      state.itemTimers.delete(btn);
    }

    var points = parseInt(btn.dataset.points, 10) || 0;
    state.score += points;
    state.found += 1;
    foundEl.textContent = String(state.found);

    var rect = btn.getBoundingClientRect();
    showPopup(rect.left + rect.width / 2, rect.top, points);

    btn.remove();
  }

  function showPopup(x, y, points) {
    var popup = document.createElement("span");
    popup.className = "game-popup";
    popup.textContent = "+" + points;
    popup.style.left = x + "px";
    popup.style.top = y + "px";
    field.appendChild(popup);

    var cleared = false;
    var clear = function () {
      if (cleared) return;
      cleared = true;
      if (popup.isConnected) popup.remove();
    };
    popup.addEventListener("animationend", clear, { once: true });
    window.setTimeout(clear, 900); // fallback if the animation doesn't fire
  }

  function scheduleSpawn() {
    if (!state || !state.active) return;
    var min = isMobile() ? 1000 : 800;
    var max = isMobile() ? 1600 : 1400;
    var delay = min + Math.random() * (max - min);
    state.spawnTimeoutId = window.setTimeout(function () {
      spawnItem();
      scheduleSpawn();
    }, delay);
  }

  function tickCountdown() {
    if (!state || !state.active) return;
    state.timeLeft -= 1;
    timeEl.textContent = String(Math.max(0, state.timeLeft));
    if (state.timeLeft <= 0) endGame();
  }

  function stopTimers() {
    if (!state) return;
    if (state.spawnTimeoutId) window.clearTimeout(state.spawnTimeoutId);
    if (state.countdownIntervalId) window.clearInterval(state.countdownIntervalId);
    state.itemTimers.forEach(function (id) {
      window.clearTimeout(id);
    });
    state.itemTimers.clear();
  }

  function startGame() {
    if (state && state.active) return;
    if (!root) buildDom();

    state = {
      active: true,
      score: 0,
      found: 0,
      timeLeft: GAME_DURATION_S,
      itemTimers: new Map(),
      spawnTimeoutId: null,
      countdownIntervalId: null,
    };

    field.innerHTML = "";
    foundEl.textContent = "0";
    timeEl.textContent = String(GAME_DURATION_S);
    resultEl.hidden = true;

    root.classList.add("is-active");
    root.removeAttribute("aria-hidden");

    var shell = document.querySelector(".page-shell");
    if (shell) shell.classList.add("game-dim");
    document.body.classList.add("game-scroll-lock");

    state.countdownIntervalId = window.setInterval(tickCountdown, 1000);
    scheduleSpawn();
  }

  function endGame() {
    if (!state) return;
    state.active = false;
    stopTimers();
    field.innerHTML = "";
    showResult();
  }

  function showResult() {
    var score = state.score;
    var message;
    if (score < 60) message = "You were probably reading instead.";
    else if (score < 150) message = "Not bad for a short break.";
    else if (score < 300) message = "You notice everything.";
    else message = "You definitely stayed too long.";

    resultLineEl.textContent =
      "You found " + state.found + (state.found === 1 ? " thing." : " things.");
    resultMsgEl.textContent = message;
    resultScoreEl.textContent = score + " points";
    resultEl.hidden = false;
  }

  function restartGame() {
    stopTimers();
    startGame();
  }

  function exitGame() {
    if (state) {
      state.active = false;
      stopTimers();
    }
    if (field) field.innerHTML = "";
    if (resultEl) resultEl.hidden = true;
    if (root) {
      root.classList.remove("is-active");
      root.setAttribute("aria-hidden", "true");
    }

    var shell = document.querySelector(".page-shell");
    if (shell) shell.classList.remove("game-dim");
    document.body.classList.remove("game-scroll-lock");

    state = null;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var trigger = document.querySelector("[data-game-trigger]");
    if (!trigger) return;
    trigger.addEventListener("click", startGame);
  });
})();
