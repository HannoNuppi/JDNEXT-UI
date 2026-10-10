const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const ACCOUNT_MODULE_URL = "https://hannonuppi.github.io/Tobiservices-Account/auth-core.js";
const FALLBACK_LOGIN_URL = "https://hannonuppi.github.io/Tobiservices-Account/login.html";
const FALLBACK_ACCOUNT_URL = "https://hannonuppi.github.io/Tobiservices-Account/account.html";

let accountApi = null;
let accountUser = null;
let accountProfile = null;
let accountLoadError = null;
let toastTimer = null;
let demoTimer = null;
let demoSeconds = 0;
let demoPlaying = false;
let selectedCard = null;
let moodPosition = 0;

const overlay = document.createElement("div");
overlay.className = "ui-overlay";
overlay.id = "uiOverlay";
overlay.hidden = true;
overlay.innerHTML =
  '<section class="ui-modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">' +
    '<button class="modal-close" type="button" aria-label="Schließen">×</button>' +
    '<div class="modal-content" id="modalContent"></div>' +
  '</section>';
document.body.appendChild(overlay);

const toastElement = document.createElement("div");
toastElement.className = "ui-toast";
toastElement.setAttribute("role", "status");
toastElement.setAttribute("aria-live", "polite");
document.body.appendChild(toastElement);

function showToast(message) {
  toastElement.textContent = message;
  toastElement.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastElement.classList.remove("visible"), 3200);
}

function stopDemoTimer() {
  if (demoTimer !== null) clearInterval(demoTimer);
  demoTimer = null;
  demoPlaying = false;
}

function closeModal() {
  overlay.hidden = true;
  stopDemoTimer();
}

function openModal(title, bodyMarkup, afterRender) {
  stopDemoTimer();
  $("#modalContent").innerHTML =
    '<p class="modal-kicker">JDNEXT UI · PROTOTYP</p>' +
    '<h2 id="modalTitle"></h2>' +
    '<div class="modal-body"></div>';
  $("#modalTitle").textContent = title;
  $(".modal-body").innerHTML = bodyMarkup;
  overlay.hidden = false;
  const focusTarget = $(".modal-body input, .modal-body button, .modal-body a, .modal-close");
  if (focusTarget) focusTarget.focus();
  if (typeof afterRender === "function") afterRender();
}

overlay.addEventListener("click", event => {
  if (event.target === overlay) closeModal();
});
$(".modal-close", overlay).addEventListener("click", closeModal);
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    if (!overlay.hidden) closeModal();
    else window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }
  if ((event.key === "f" || event.key === "F") &&
      overlay.hidden &&
      !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
    event.preventDefault();
    openSearchModal("all");
  }
});

function prefersReducedMotion() {
  try { return localStorage.getItem("jdnext-reduce-motion") === "true"; }
  catch { return false; }
}

function applyPreferences() {
  document.documentElement.classList.toggle("reduce-motion", prefersReducedMotion());
  let highContrast = false;
  try { highContrast = localStorage.getItem("jdnext-high-contrast") === "true"; } catch {}
  document.documentElement.classList.toggle("high-contrast", highContrast);
}
applyPreferences();

function setActiveNav(label) {
  $$(".nav-icon").forEach(item => item.classList.toggle("active", item.getAttribute("aria-label") === label));
  const current = $(".topbar-current");
  if (current) current.textContent = label === "Songs" ? "SONGS" : label === "Playlists" ? "PLAYLISTS" : label === "Profil" ? "PROFILE" : "HOME";
}

function scrollToSection(selector, label) {
  const target = $(selector);
  if (!target) return;
  target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  setActiveNav(label);
}

function renderPlayer() {
  const nameEl = $(".player-name");
  const avatarEl = $(".player-avatar");
  const pill = $(".player-pill");
  if (!nameEl || !avatarEl || !pill) return;
  if (!accountUser) {
    nameEl.textContent = "PLAYER 01";
    avatarEl.textContent = "JD";
    pill.setAttribute("aria-label", "Anmelden oder Account öffnen");
    return;
  }
  const display = accountProfile?.displayName || accountProfile?.username ||
    accountUser.displayName || "TobiServices";
  nameEl.textContent = display;
  const initials = String(display).trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase();
  avatarEl.textContent = initials.slice(0, 2) || "TS";
  pill.setAttribute("aria-label", "TobiServices Account: " + display);
}

async function initializeAccounts() {
  try {
    accountApi = await import(ACCOUNT_MODULE_URL);
    accountApi.onUser((user, profile) => {
      accountUser = user;
      accountProfile = profile;
      renderPlayer();
      if (user && !overlay.hidden && $("#loginForm")) closeModal();
    });
  } catch (error) {
    accountLoadError = error;
    console.error("TobiServices Account konnte nicht geladen werden:", error);
    renderPlayer();
  }
}
initializeAccounts();

function showProfile() {
  if (!accountUser) {
    openLoginModal();
    return;
  }
  const display = accountProfile?.displayName || accountProfile?.username || accountUser.displayName || "TobiServices Account";
  const username = accountProfile?.username || "(nicht verfügbar)";
  const tags = Array.isArray(accountProfile?.tags) ? accountProfile.tags : [];
  const tagHtml = tags.length
    ? tags.map(tag => '<span class="account-tag"></span>').join("")
    : '<span class="account-tag muted-tag">Keine Tags</span>';
  openModal("TobiServices Account",
    '<p class="modal-copy">Du bist mit deinem zentralen TobiServices-Account angemeldet.</p>' +
    '<div class="account-summary"><div class="account-avatar"></div><div><strong class="account-display"></strong><span class="account-username"></span></div></div>' +
    '<div class="account-details"><span>ACCOUNT-ID</span><code class="account-uid"></code></div>' +
    '<div class="account-tags"><span class="field-caption">TAGS</span><div class="tag-list">' + tagHtml + '</div></div>' +
    '<div class="modal-actions"><button class="ui-button primary" id="manageAccount">Account verwalten</button>' +
      (accountApi.isAdmin(accountProfile) ? '<button class="ui-button secondary" id="adminAccount">Admin Center</button>' : '') +
      '<button class="ui-button ghost" id="logoutAccount">Abmelden</button></div>',
    () => {
      $(".account-display").textContent = display;
      $(".account-username").textContent = "@" + username;
      $(".account-uid").textContent = accountUser.uid;
      $(".account-avatar").textContent = initialsFor(display);
      $$(".account-tag:not(.muted-tag)").forEach((el, index) => { el.textContent = tags[index] || ""; });
      $("#manageAccount").addEventListener("click", () => {
        const url = accountApi.CONFIG?.accountUrl || FALLBACK_ACCOUNT_URL;
        window.location.href = url;
      });
      $("#adminAccount")?.addEventListener("click", () => {
        window.location.href = "https://hannonuppi.github.io/Tobiservices-Account/admin.html";
      });
      $("#logoutAccount").addEventListener("click", async () => {
        const button = $("#logoutAccount");
        button.disabled = true;
        try {
          await accountApi.signOut();
          closeModal();
          showToast("Du wurdest von TobiServices abgemeldet.");
        } catch (error) {
          console.error(error);
          showToast("Abmelden hat nicht geklappt. Bitte erneut versuchen.");
          button.disabled = false;
        }
      });
    });
}

function initialsFor(value) {
  return String(value || "TS").trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase().slice(0, 2) || "TS";
}

function openLoginModal() {
  if (!accountApi) {
    openModal("TobiServices Login",
      '<p class="modal-copy">Das gemeinsame Account-Modul ist gerade nicht erreichbar. Du kannst den zentralen Login separat öffnen.</p>' +
      '<div class="modal-actions"><a class="ui-button primary link-button" href="' + FALLBACK_LOGIN_URL + '">Zum TobiServices Login ↗</a></div>');
    return;
  }
  openModal("Mit TobiServices anmelden",
    '<p class="modal-copy">Melde dich mit deinem bestehenden TobiServices-Benutzernamen an. Es wird kein E-Mail-Login verwendet.</p>' +
    '<form id="loginForm" class="account-form">' +
      '<label for="accountUsername">Benutzername</label><input id="accountUsername" name="username" autocomplete="username" maxlength="32" required placeholder="Dein Username">' +
      '<label for="accountPassword">Passwort</label><input id="accountPassword" name="password" type="password" autocomplete="current-password" maxlength="128" required placeholder="Dein Passwort">' +
      '<p class="form-message" id="loginMessage" aria-live="polite"></p>' +
      '<button class="ui-button primary" id="loginSubmit" type="submit">Anmelden</button>' +
    '</form><p class="modal-footnote">Noch kein Account? Accounts werden zentral durch TobiServices-Admins angelegt.</p>',
    () => {
      $("#loginForm").addEventListener("submit", async event => {
        event.preventDefault();
        const submit = $("#loginSubmit");
        const message = $("#loginMessage");
        submit.disabled = true;
        message.textContent = "Anmeldung wird geprüft …";
        message.className = "form-message";
        try {
          await accountApi.login($("#accountUsername").value.trim(), $("#accountPassword").value);
          $("#accountPassword").value = "";
          closeModal();
          showToast("TobiServices-Anmeldung erfolgreich.");
        } catch (error) {
          console.error("TobiServices Login fehlgeschlagen:", error);
          const code = String(error?.code || "");
          message.className = "form-message error";
          if (code.includes("unauthenticated")) message.textContent = "Benutzername oder Passwort ist falsch.";
          else if (code.includes("invalid-argument")) message.textContent = error?.message || "Bitte prüfe Benutzername und Passwort.";
          else if (code.includes("unavailable") || code.includes("failed-precondition")) message.textContent = "Der Accountdienst ist derzeit nicht bereit oder erreichbar.";
          else message.textContent = "Anmeldung fehlgeschlagen. Prüfe deine Verbindung und versuche es erneut.";
          submit.disabled = false;
        }
      });
    });
}

function openSearchModal(mode = "all") {
  const cards = $$(".song-tile, .track-tile").filter(card => mode !== "songs" || card.classList.contains("track-tile"));
  const placeholder = mode === "songs" ? "Song oder Artist suchen …" : "Song oder Playlist suchen …";
  openModal(mode === "songs" ? "Song-Suche" : "Katalog durchsuchen",
    '<p class="modal-copy">Die Suche filtert die aktuell im Prototyp angezeigten Einträge.</p>' +
    '<input class="search-input" id="catalogSearch" type="search" placeholder="' + placeholder + '" autocomplete="off" aria-label="Katalog durchsuchen">' +
    '<p class="search-count" id="searchCount"></p><div class="search-results" id="searchResults"></div>',
    () => {
      const results = $("#searchResults");
      const searchInput = $("#catalogSearch");
      const entries = cards.map(card => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "search-result";
        const title = card.querySelector("h3")?.textContent?.trim() || "Unbenannter Eintrag";
        const subtitle = card.querySelector(".tile-sub, .track-info p")?.textContent?.trim() || "JDNEXT Demo";
        const cover = card.querySelector(".tile-art, .track-cover");
        const swatch = cover ? getComputedStyle(cover).backgroundImage : "";
        const copy = document.createElement("span");
        copy.className = "search-result-copy";
        const strong = document.createElement("strong");
        strong.textContent = title;
        const small = document.createElement("small");
        small.textContent = subtitle;
        copy.append(strong, small);
        const type = document.createElement("span");
        type.className = "search-result-type";
        type.textContent = card.classList.contains("mood-tile") ? "PLAYLIST" : "SONG";
        button.append(copy, type);
        button.addEventListener("click", () => {
          closeModal();
          card.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
          window.setTimeout(() => openCardDetail(card), 180);
        });
        button.dataset.search = (title + " " + subtitle).toLowerCase();
        if (swatch) button.style.setProperty("--result-art", swatch);
        return button;
      });
      entries.forEach(button => results.appendChild(button));
      const refresh = () => {
        const query = searchInput.value.trim().toLowerCase();
        let count = 0;
        entries.forEach(button => {
          const show = button.dataset.search.includes(query);
          button.hidden = !show;
          if (show) count++;
        });
        $("#searchCount").textContent = count + (count === 1 ? " Treffer" : " Treffer");
      };
      searchInput.addEventListener("input", refresh);
      refresh();
    });
}

function openCardDetail(card) {
  selectedCard = card;
  $$(".selected-tile").forEach(el => el.classList.remove("selected-tile"));
  card.classList.add("selected-tile");
  $(".song-tile, .track-tile").forEach(el => el.setAttribute("aria-pressed", String(el === card)));
  const title = card.querySelector("h3")?.textContent?.trim() || "Unbenannter Eintrag";
  const isPlaylist = card.classList.contains("mood-tile");
  const subtitle = card.querySelector(".tile-sub, .track-info p")?.textContent?.trim() || (isPlaylist ? "PLAYLIST" : "SONG");
  const rating = card.querySelector(".rating-stars, .track-rating")?.textContent?.trim() || "";
  const duration = card.querySelector(".tile-duration")?.textContent?.trim() || "";
  const difficulty = card.querySelector(".track-stats span:nth-child(2)")?.textContent?.trim() || "—";
  openModal(title,
    '<div class="detail-art ' + (isPlaylist ? "detail-playlist" : "detail-song") + '"></div>' +
    '<p class="detail-subtitle"></p><div class="detail-facts"><span class="detail-type"></span><span class="detail-duration"></span><span class="detail-difficulty"></span><span class="detail-rating"></span></div>' +
    '<p class="modal-copy">Dies ist eine interaktive UI-Demo. Es werden keine Original-Audiodateien abgespielt und es gibt noch kein Tanz-Gameplay oder Scoring.</p>' +
    '<div class="modal-actions"><button class="ui-button primary" id="startDemo">▶ Demo starten</button><button class="ui-button secondary" id="chooseCard">Auswählen</button></div>',
    () => {
      $(".detail-subtitle").textContent = subtitle;
      $(".detail-type").textContent = isPlaylist ? "PLAYLIST" : "SONG";
      $(".detail-duration").textContent = duration;
      $(".detail-difficulty").textContent = isPlaylist ? "" : difficulty;
      $(".detail-rating").textContent = rating;
      const art = card.querySelector(".tile-art, .track-cover");
      if (art) {
        const background = getComputedStyle(art).backgroundImage;
        if (background && background !== "none") $(".detail-art").style.backgroundImage = background;
        else $(".detail-art").classList.add(card.classList.contains("tile-neon") ? "tile-neon" : "");
      }
      $("#startDemo").addEventListener("click", () => startDemo(title, subtitle));
      $("#chooseCard").addEventListener("click", () => {
        closeModal();
        showToast("„" + title + "“ ausgewählt.");
      });
    });
}

function startDemo(title, subtitle) {
  demoSeconds = 0;
  demoPlaying = false;
  openModal("Demo-Player",
    '<div class="demo-visual"><span class="demo-beat beat-one"></span><span class="demo-beat beat-two"></span><span class="demo-beat beat-three"></span><strong class="demo-play-mark">JD</strong></div>' +
    '<p class="detail-subtitle demo-track-title"></p><p class="modal-copy">Simulierter Ablauf ohne Musikdatei. Der 30-Sekunden-Timer demonstriert nur die Oberfläche.</p>' +
    '<div class="demo-timer-row"><span id="demoElapsed">0:00</span><span>0:30</span></div><progress id="demoProgress" max="30" value="0"></progress>' +
    '<div class="modal-actions"><button class="ui-button primary" id="toggleDemo">▶ Starten</button><button class="ui-button secondary" id="resetDemo">↺ Neu starten</button></div>',
    () => {
      $(".demo-track-title").textContent = title + " — " + subtitle;
      const update = () => {
        $("#demoProgress").value = demoSeconds;
        $("#demoElapsed").textContent = "0:" + String(demoSeconds).padStart(2, "0");
        $("#toggleDemo").textContent = demoPlaying ? "Ⅱ Pause" : demoSeconds >= 30 ? "↺ Erneut starten" : "▶ Starten";
      };
      $("#toggleDemo").addEventListener("click", () => {
        if (demoSeconds >= 30) demoSeconds = 0;
        demoPlaying = !demoPlaying;
        update();
      });
      $("#resetDemo").addEventListener("click", () => {
        demoSeconds = 0;
        demoPlaying = false;
        update();
      });
      demoTimer = setInterval(() => {
        if (!demoPlaying || overlay.hidden) return;
        demoSeconds++;
        if (demoSeconds >= 30) {
          demoSeconds = 30;
          demoPlaying = false;
          showToast("Demo beendet – kein echtes Gameplay ausgeführt.");
        }
        update();
      }, 1000);
      update();
    });
}

function openSettings() {
  let reduceMotion = prefersReducedMotion();
  let highContrast = false;
  try { highContrast = localStorage.getItem("jdnext-high-contrast") === "true"; } catch {}
  openModal("Einstellungen",
    '<p class="modal-copy">Diese Einstellungen werden nur in diesem Browser gespeichert.</p>' +
    '<label class="setting-row"><span><strong>Bewegung reduzieren</strong><small>Schaltet Scroll- und UI-Übergänge ab.</small></span><input type="checkbox" id="reduceMotionToggle"></label>' +
    '<label class="setting-row"><span><strong>Hoher Kontrast</strong><small>Verstärkt den Kontrast von Flächen und Rahmen.</small></span><input type="checkbox" id="highContrastToggle"></label>' +
    '<div class="modal-actions"><button class="ui-button primary" id="saveSettings">Einstellungen speichern</button></div>',
    () => {
      $("#reduceMotionToggle").checked = reduceMotion;
      $("#highContrastToggle").checked = highContrast;
      $("#saveSettings").addEventListener("click", () => {
        reduceMotion = $("#reduceMotionToggle").checked;
        highContrast = $("#highContrastToggle").checked;
        try {
          localStorage.setItem("jdnext-reduce-motion", String(reduceMotion));
          localStorage.setItem("jdnext-high-contrast", String(highContrast));
        } catch {
          showToast("Browser-Speicher nicht verfügbar; Einstellung gilt nur bis zum Neuladen.");
        }
        applyPreferences();
        closeModal();
        showToast("Einstellungen gespeichert.");
      });
    });
}

function showNotifications() {
  openModal("Benachrichtigungen",
    '<div class="notice-item"><span class="notice-dot"></span><div><strong>UI-Prototyp bereit</strong><p>Die Menüelemente können nun ausprobiert werden.</p></div></div>' +
    '<div class="notice-item"><span class="notice-dot muted"></span><div><strong>Account-Verbindung</strong><p>Der Profilknopf verwendet dein bestehendes TobiServices-Konto.</p></div></div>' +
    '<p class="modal-footnote">Dies sind lokale Demo-Mitteilungen, keine Serverbenachrichtigungen.</p>');
}

function showMoreContent() {
  openModal("Mehr Inhalte",
    '<p class="modal-copy">Der Katalog ist noch ein lokaler Prototyp. Hier könnten später Seasons, benutzerdefinierte Maps und Playlists erscheinen.</p>' +
    '<div class="coming-soon"><span>✦</span><strong>MORE CONTENT</strong><small>IN EINEM SPÄTEREN MILESTONE</small></div>' +
    '<div class="modal-actions"><button class="ui-button primary" id="browseContent">Katalog durchsuchen</button></div>',
    () => $("#browseContent").addEventListener("click", () => openSearchModal("all")));
}

$$(".nav-icon").forEach(icon => {
  icon.setAttribute("role", "button");
  icon.tabIndex = 0;
  icon.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); icon.click(); }
  });
  icon.addEventListener("click", () => {
    const label = icon.getAttribute("aria-label");
    if (label === "Benachrichtigungen") showNotifications();
    else if (label === "Suche") openSearchModal("all");
    else if (label === "Home") {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
      setActiveNav("Home");
    } else if (label === "Songs") scrollToSection(".tracks-section", "Songs");
    else if (label === "Playlists") scrollToSection(".feature-section", "Playlists");
    else if (label === "Profil") showProfile();
    else if (label === "Mehr Inhalte") showMoreContent();
    else if (label === "Einstellungen") openSettings();
  });
});

$(".player-pill")?.addEventListener("click", showProfile);
$(".player-pill")?.setAttribute("role", "button");
$(".player-pill")?.setAttribute("tabindex", "0");
$(".player-pill")?.addEventListener("keydown", event => {
  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); showProfile(); }
});
$(".season-pill")?.addEventListener("click", () => openModal("Season 01",
  '<p class="modal-copy">Das Saison-Badge ist vorerst ein UI-Element. Saisoninhalte und Fortschritt sind noch nicht mit einem Backend verbunden.</p>'));
$(".season-pill")?.setAttribute("role", "button");
$(".season-pill")?.setAttribute("tabindex", "0");
$(".season-pill")?.addEventListener("keydown", event => {
  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); $(".season-pill").click(); }
});

$(".hero-cta")?.setAttribute("role", "button");
$(".hero-cta")?.setAttribute("tabindex", "0");
$(".hero-cta")?.setAttribute("aria-label", "Playlists entdecken");
function exploreFeatured() {
  scrollToSection(".feature-section", "Playlists");
  const first = $(".mood-tile");
  if (first) {
    $$(".selected-tile").forEach(el => el.classList.remove("selected-tile"));
    first.classList.add("selected-tile");
  }
}
$(".hero-cta")?.addEventListener("click", exploreFeatured);
$(".hero-cta")?.addEventListener("keydown", event => {
  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); exploreFeatured(); }
});

$$(".song-tile, .track-tile").forEach(card => {
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-pressed", "false");
  card.setAttribute("aria-label", (card.querySelector("h3")?.textContent?.trim() || "Titel") + " öffnen");
  card.addEventListener("click", event => {
    if (event.target.closest("button, a")) return;
    openCardDetail(card);
  });
  card.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openCardDetail(card);
    }
  });
});

function rotateCards(section, direction) {
  const row = $(".tile-row", section);
  if (!row || row.children.length < 2) return;
  if (direction > 0) row.appendChild(row.firstElementChild);
  else row.insertBefore(row.lastElementChild, row.firstElementChild);
  if (section.classList.contains("feature-section")) {
    moodPosition = (moodPosition + direction + 4) % 4;
    const counter = $(".counter", section);
    if (counter) counter.textContent = String(moodPosition + 1).padStart(2, "0") + " — 04";
  }
}

$$(".section-controls .circle-arrow").forEach((arrow, index) => {
  const section = arrow.closest(".content-section");
  const direction = index % 2 === 0 ? -1 : 1;
  arrow.setAttribute("role", "button");
  arrow.tabIndex = 0;
  arrow.setAttribute("aria-label", direction > 0 ? "Weiter" : "Zurück");
  arrow.addEventListener("click", () => rotateCards(section, direction));
  arrow.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      rotateCards(section, direction);
    }
  });
});

$(".view-all")?.setAttribute("role", "button");
$(".view-all")?.setAttribute("tabindex", "0");
$(".view-all")?.addEventListener("click", () => openSearchModal("songs"));
$(".view-all")?.addEventListener("keydown", event => {
  if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openSearchModal("songs"); }
});

$$(".bottom-hints kbd").forEach(key => {
  const text = key.textContent.trim().toUpperCase();
  if (text === "F") key.parentElement.title = "Taste F öffnet die Suche";
  if (text === "ESC") key.parentElement.title = "Escape schließt Dialoge oder springt nach oben";
});
renderPlayer();