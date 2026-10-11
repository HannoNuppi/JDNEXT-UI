const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const ACCOUNT_MODULE_URL = "https://hannonuppi.github.io/Tobiservices-Account/auth-core.js";
const FALLBACK_LOGIN_URL = "https://hannonuppi.github.io/Tobiservices-Account/login.html";
const FALLBACK_ACCOUNT_URL = "https://hannonuppi.github.io/Tobiservices-Account/account.html";

const AVATAR_STORAGE_PREFIX = "jdnext-avatar-v1:";
const AVATAR_PRESETS = [
  { id:"neon", name:"Neon Dancer", symbol:"🕺", a:"#b34aff", b:"#32dff9", style:"NEON ICON" },
  { id:"starlight", name:"Starlight", symbol:"💃", a:"#ff43bb", b:"#ffb34b", style:"STAR POP" },
  { id:"cosmic", name:"Cosmic DJ", symbol:"🧑‍🎤", a:"#5368ff", b:"#bc4bff", style:"COSMIC" },
  { id:"disco", name:"Disco Orb", symbol:"🪩", a:"#ffe46e", b:"#ff43bb", style:"DISCO" },
  { id:"robo", name:"Robo Beat", symbol:"🤖", a:"#54f3fb", b:"#3e4cbb", style:"SYNTH" },
  { id:"alien", name:"Alien Groove", symbol:"👽", a:"#a4ed53", b:"#642be8", style:"EXTRA" },
  { id:"catwalk", name:"Catwalk", symbol:"🐱", a:"#a17bff", b:"#ff61b5", style:"PLAYFUL" },
  { id:"foxfire", name:"Foxfire", symbol:"🦊", a:"#ff9a45", b:"#df3c83", style:"FIRE" }
];
function avatarStorageKey(uid) { return AVATAR_STORAGE_PREFIX + (uid || "guest"); }
function getAvatarPreset(uid) {
  let selectedId = "neon";
  try { selectedId = localStorage.getItem(avatarStorageKey(uid)) || "neon"; } catch {}
  return AVATAR_PRESETS.find(avatar => avatar.id === selectedId) || AVATAR_PRESETS[0];
}

function openScreen(screen, parameters = {}) {
  // Resolve from app.js itself, not from the current browser URL. This also
  // works when GitHub Pages is opened without the trailing slash.
  const allowedScreens = new Set([
    "dancecard", "catalog", "song", "player", "settings",
    "notifications", "content", "playlists", "login"
  ]);
  if (!allowedScreens.has(screen)) {
    console.error("Unknown JDNEXT screen:", screen);
    return;
  }
  const url = new URL("./screens/" + screen + ".html", import.meta.url);
  Object.entries(parameters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  });
  window.location.assign(url.href);
}

let accountApi = null;
let accountUser = null;
let accountProfile = null;
let maintenanceState = { enabled: false, message: "", loaded: false, error: null };
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
  $(".ui-modal").classList.remove("catalog-modal", "dancecard-modal", "season-modal");
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
  if (current) current.textContent = label === "Songs" ? "SONGS" : label === "Playlists" ? "PLAYLISTS" : (label === "Profil" || label === "Dancecard") ? "DANCECARD" : "HOME";
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
    pill.setAttribute("aria-label", "Anmelden oder Account öffnen");
  } else {
    const display = accountProfile?.displayName || accountUser.displayName || accountUser.email || "TobiServices";
    nameEl.textContent = display;
    pill.setAttribute("aria-label", "TobiServices Account: " + display);
  }
  const avatar = getAvatarPreset(accountUser?.uid);
  avatarEl.textContent = avatar.symbol;
  avatarEl.style.background = "linear-gradient(145deg," + avatar.a + "," + avatar.b + ")";
  avatarEl.style.color = "#ffffff";
  avatarEl.title = avatar.name;
  avatarEl.dataset.avatarId = avatar.id;
}

function updateBetaGate() {
  const gate = $("#betaGate");
  const shell = $("#gameShell");
  const isAdmin = Boolean(accountApi?.isAdmin?.(accountProfile));
  const hasBetaTag = Boolean(accountApi?.hasTag?.(accountProfile, "dance-beta"));
  const serviceDisabled = accountProfile?.disabled === true;
  const hasBetaAccess = Boolean(accountUser && accountProfile && !serviceDisabled && (isAdmin || hasBetaTag));
  const bypassActive = isAdmin && accountProfile?.maintenanceBypass === true;
  const maintenanceReady = maintenanceState.loaded && !maintenanceState.error;
  const maintenanceBlocks = Boolean(accountUser && accountProfile &&
    (!maintenanceReady || (maintenanceState.enabled && !bypassActive)));
  const allowed = hasBetaAccess && !maintenanceBlocks;

  if (shell) shell.hidden = !allowed;
  if (gate) gate.hidden = allowed;

  const bypassButton = $("#betaMaintenanceBypass");
  if (bypassButton) {
    const canOfferBypass = Boolean(accountUser && accountProfile && isAdmin && !serviceDisabled &&
      maintenanceReady && maintenanceState.enabled && !bypassActive);
    bypassButton.hidden = !canOfferBypass;
    bypassButton.disabled = false;
    bypassButton.textContent = "Wartungsbypass aktivieren ↗";
  }

  if (!gate || allowed) return allowed;

  const title = $("#betaGateTitle");
  const message = $("#betaGateMessage");
  const status = $("#betaGateStatus");
  const button = $("#betaLogin");

  if (!accountUser) {
    if (title) title.textContent = "Dein nächster Dancefloor wartet.";
    if (message) message.textContent = "Melde dich mit deinem TobiServices-Konto an, um die geschlossene Beta zu öffnen.";
    if (status) status.innerHTML = 'Zugriff erhalten Konten mit dem Tag <code>dance-beta</code> oder <code>admin</code>.';
    if (button) button.textContent = "Mit TobiServices anmelden ↗";
  } else if (!accountProfile) {
    if (title) title.textContent = "Dein Zugang wird geprüft.";
    if (message) message.textContent = "Du bist angemeldet, aber dein Berechtigungsprofil konnte nicht geladen werden. Bitte versuche es erneut.";
    if (status) status.textContent = "Die Beta bleibt geschlossen, bis dein Zugriff bestätigt wurde.";
    if (button) button.textContent = "Konto wechseln ↗";
  } else if (serviceDisabled) {
    if (title) title.textContent = "Der Dienstzugriff ist pausiert.";
    if (message) message.textContent = "Für dieses Konto wurde der Zugriff auf TobiServices-Dienste gesperrt. Bitte wende dich an einen Admin.";
    if (status) status.textContent = "Der Zugang bleibt gesperrt, auch wenn dein Konto den Beta-Tag besitzt.";
    if (button) button.textContent = "Konto wechseln ↗";
  } else if ((isAdmin || hasBetaTag) && (!maintenanceState.loaded || maintenanceState.error)) {
    if (title) title.textContent = "Wartungsstatus wird geprüft.";
    if (message) message.textContent = maintenanceState.error
      ? "Der Wartungsstatus konnte nicht sicher gelesen werden. Bitte lade die Seite neu."
      : "JDNEXT prüft gerade, ob Wartungsarbeiten aktiv sind.";
    if (status) status.textContent = "Der Zugang bleibt gesperrt, bis der Wartungsstatus bestätigt ist.";
    if (button) button.textContent = "Konto wechseln ↗";
  } else if ((isAdmin || hasBetaTag) && maintenanceState.enabled && !bypassActive) {
    if (title) title.textContent = "Wir machen kurz Wartung.";
    if (message) message.textContent = maintenanceState.message || "JDNEXT wird gerade gewartet. Bitte versuche es später erneut.";
    if (status) status.textContent = isAdmin
      ? "Du bist als Admin angemeldet. Aktiviere den Wartungsbypass, um fortzufahren."
      : "Der Wartungsmodus ist aktiv. Bitte versuche es später erneut.";
    if (button) button.textContent = "Konto wechseln ↗";
  } else {
    if (title) title.textContent = "Beta noch nicht freigeschaltet.";
    if (message) message.textContent = "Dieses Konto hat noch keinen Zugang zur JDNEXT Closed Beta. Der Zugriff wird von einem Admin freigeschaltet.";
    if (status) status.innerHTML = 'Benötigter Tag: <code>dance-beta</code> oder <code>admin</code>.';
    if (button) button.textContent = "Anderes Konto verwenden ↗";
  }
  return false;
}

async function initializeAccounts() {
  try {
    accountApi = await import(ACCOUNT_MODULE_URL);
    if (typeof accountApi.onMaintenanceMode === "function") {
      accountApi.onMaintenanceMode((settings, error) => {
        maintenanceState = error
          ? { enabled: true, message: "", loaded: false, error }
          : {
              enabled: settings?.enabled === true,
              message: typeof settings?.message === "string" ? settings.message : "",
              loaded: true,
              error: null
            };
        updateBetaGate();
        renderMaintenanceBypassControls();
        if (accountUser && accountProfile &&
            (error || (maintenanceState.enabled &&
              !(accountApi.isAdmin(accountProfile) && accountProfile.maintenanceBypass === true))) &&
            !overlay.hidden) {
          closeModal();
        }
      });
    } else {
      maintenanceState = { enabled: false, message: "", loaded: true, error: null };
      updateBetaGate();
    }
    accountApi.onUser((user, profile) => {
      accountUser = user;
      accountProfile = profile;
      renderPlayer();
      updateBetaGate();
      renderMaintenanceBypassControls();
      if (user && !overlay.hidden && $("#loginForm")) closeModal();
    });
  } catch (error) {
    accountLoadError = error;
    console.error("TobiServices Account konnte nicht geladen werden:", error);
    renderPlayer();
    updateBetaGate();
    const status = $("#betaGateStatus");
    if (status) status.textContent = "Der Accountdienst konnte nicht geladen werden. Bitte prüfe deine Verbindung und versuche es erneut.";
  }
}
$("#betaMaintenanceBypass")?.addEventListener("click", async event => {
  await setCurrentMaintenanceBypass(true, event.currentTarget);
});
$("#betaLogin")?.addEventListener("click", async () => {
  if (accountUser && accountApi) {
    try {
      await accountApi.signOut();
    } catch (error) {
      console.error("Abmelden vor Kontowechsel fehlgeschlagen:", error);
      showToast("Konto konnte nicht gewechselt werden. Bitte Seite neu laden.");
      return;
    }
  }
  openLoginModal();
});
updateBetaGate();
initializeAccounts();

function renderMaintenanceBypassControls() {
  const active = accountProfile?.maintenanceBypass === true;
  const state = $("#dancecardBypassState");
  const description = $("#dancecardBypassDescription");
  const button = $("#toggleMaintenanceBypass");
  if (state) state.textContent = active ? "WARTUNGSBYPASS AKTIV" : "WARTUNGSBYPASS INAKTIV";
  if (description) {
    if (!maintenanceState.loaded || maintenanceState.error) {
      description.textContent = "Der Wartungsstatus konnte nicht bestätigt werden. Lade die Seite neu.";
    } else if (maintenanceState.enabled) {
      description.textContent = active
        ? "JDNEXT ist im Wartungsmodus. Dein Admin-Konto darf ihn umgehen."
        : "JDNEXT ist im Wartungsmodus. Aktiviere den Bypass, um fortzufahren.";
    } else {
      description.textContent = active
        ? "Der Bypass ist gespeichert und wird benötigt, wenn JDNEXT in Wartung ist."
        : "Bei aktiver Wartung kannst du den Zugriff hier freischalten.";
    }
  }
  if (button) {
    button.textContent = active ? "Wartungsbypass deaktivieren" : "Wartungsbypass aktivieren";
    button.disabled = !maintenanceState.loaded || Boolean(maintenanceState.error);
  }
}

async function setCurrentMaintenanceBypass(enabled, control = null) {
  if (!accountUser || !accountProfile || !accountApi?.isAdmin?.(accountProfile)) {
    showToast("Der Wartungsbypass ist nur für angemeldete Admins verfügbar.");
    return false;
  }
  if (!maintenanceState.loaded || maintenanceState.error || typeof accountApi.setMaintenanceBypass !== "function") {
    showToast("Wartungsstatus konnte nicht bestätigt werden. Bitte lade die Seite neu.");
    return false;
  }
  const button = control || $("#toggleMaintenanceBypass") || $("#betaMaintenanceBypass");
  if (button) button.disabled = true;
  try {
    await accountApi.setMaintenanceBypass(Boolean(enabled));
    accountProfile = { ...accountProfile, maintenanceBypass: Boolean(enabled) };
    const canAccess = updateBetaGate();
    renderMaintenanceBypassControls();
    showToast(enabled ? "Wartungsbypass aktiviert." : "Wartungsbypass deaktiviert.");
    if (!canAccess && maintenanceState.enabled && !overlay.hidden) closeModal();
    return true;
  } catch (error) {
    console.error("Wartungsbypass konnte nicht gespeichert werden:", error);
    showToast("Wartungsbypass konnte nicht gespeichert werden. Prüfe die Firestore-Regeln.");
    return false;
  } finally {
    if (button?.isConnected) renderMaintenanceBypassControls();
  }
}

function showProfile() {
  openScreen("dancecard");
}

function initialsFor(value) {
  return String(value || "TS").trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase().slice(0, 2) || "TS";
}

function openLoginModal() {
  openScreen("login", { return: window.location.href });
}

const SONG_CATALOG = [
  { id:"flowers", title:"Flowers", artist:"Miley Cyrus", edition:2024, genre:"Pop", difficulty:"Easy", duration:"3:20", accent:"#ff8b47", accent2:"#f23591" },
  { id:"calm-down", title:"Calm Down", artist:"Rema", edition:2024, genre:"Afrobeats", difficulty:"Easy", duration:"3:58", accent:"#f9ab45", accent2:"#d92776" },
  { id:"butter", title:"Butter", artist:"BTS", edition:2024, genre:"K-pop", difficulty:"Medium", duration:"2:44", accent:"#e5c752", accent2:"#ef7f43" },
  { id:"cure-for-me", title:"Cure For Me", artist:"AURORA", edition:2024, genre:"Electropop", difficulty:"Medium", duration:"3:19", accent:"#62dfd0", accent2:"#5262df" },
  { id:"despecha", title:"DESPECHÁ", artist:"ROSALÍA", edition:2024, genre:"Latin", difficulty:"Hard", duration:"2:37", accent:"#ff8d4d", accent2:"#e53b62" },
  { id:"gimme-more", title:"Gimme More", artist:"Britney Spears", edition:2024, genre:"Dance-pop", difficulty:"Hard", duration:"3:12", accent:"#dd49d4", accent2:"#4923a9" },
  { id:"how-you-like-that", title:"How You Like That", artist:"BLACKPINK", edition:2024, genre:"K-pop", difficulty:"Hard", duration:"3:00", accent:"#f45aa9", accent2:"#5934dc" },
  { id:"kill-bill", title:"Kill Bill", artist:"SZA", edition:2024, genre:"R&B", difficulty:"Medium", duration:"2:34", accent:"#c0d750", accent2:"#248f82" },
  { id:"makeba", title:"Makeba", artist:"Jain", edition:2024, genre:"World pop", difficulty:"Medium", duration:"3:43", accent:"#ff9e43", accent2:"#e84d3a" },
  { id:"sail", title:"Sail", artist:"AWOLNATION", edition:2024, genre:"Alternative rock", difficulty:"Hard", duration:"4:18", accent:"#e55a49", accent2:"#70275c" },
  { id:"seven", title:"Seven", artist:"Jung Kook ft. Latto", edition:2024, genre:"K-pop", difficulty:"Medium", duration:"3:04", accent:"#68c7ef", accent2:"#7168d8" },
  { id:"treasure", title:"Treasure", artist:"Bruno Mars", edition:2024, genre:"Funk / Pop", difficulty:"Medium", duration:"2:58", accent:"#ffca48", accent2:"#e94c8a" },
  { id:"vampire", title:"vampire", artist:"Olivia Rodrigo", edition:2024, genre:"Pop rock", difficulty:"Medium", duration:"3:39", accent:"#a58aff", accent2:"#d83f8f" },
  { id:"wasabi", title:"Wasabi", artist:"Little Mix", edition:2024, genre:"Pop", difficulty:"Hard", duration:"2:34", accent:"#92e74e", accent2:"#e7459e" },
  { id:"espresso", title:"Espresso", artist:"Sabrina Carpenter", edition:2025, genre:"Pop", difficulty:"Medium", duration:"2:55", accent:"#d49a6a", accent2:"#e94d8a" },
  { id:"yes-and", title:"yes, and?", artist:"Ariana Grande", edition:2025, genre:"Dance-pop", difficulty:"Medium", duration:"3:34", accent:"#b5a2ff", accent2:"#ec8fd3" },
  { id:"poker-face", title:"Poker Face", artist:"Lady Gaga", edition:2025, genre:"Dance-pop", difficulty:"Hard", duration:"3:58", accent:"#e9dd55", accent2:"#d33b92" },
  { id:"lunch", title:"LUNCH", artist:"Billie Eilish", edition:2025, genre:"Pop", difficulty:"Hard", duration:"3:00", accent:"#91f05e", accent2:"#14a88c" },
  { id:"basket-case", title:"Basket Case", artist:"Green Day", edition:2025, genre:"Punk rock", difficulty:"Hard", duration:"3:02", accent:"#b7da59", accent2:"#e95b40" },
  { id:"calabria-2007", title:"Calabria 2007", artist:"Enur ft. Natasja", edition:2025, genre:"Dancehall", difficulty:"Medium", duration:"3:05", accent:"#4ce0db", accent2:"#e84a9c" },
  { id:"training-season", title:"Training Season", artist:"Dua Lipa", edition:2025, genre:"Disco-pop", difficulty:"Hard", duration:"3:29", accent:"#ffe16b", accent2:"#f05c9b" },
  { id:"unstoppable", title:"Unstoppable", artist:"Sia", edition:2025, genre:"Pop", difficulty:"Medium", duration:"3:37", accent:"#65d7f2", accent2:"#6d61d9" }
];

const CATALOG_FAVORITES_KEY = "jdnext-catalog-favorites-v1";
let catalogFavorites = new Set();
try { catalogFavorites = new Set(JSON.parse(localStorage.getItem(CATALOG_FAVORITES_KEY) || "[]")); } catch {}

function saveCatalogFavorites() {
  try { localStorage.setItem(CATALOG_FAVORITES_KEY, JSON.stringify([...catalogFavorites])); }
  catch { showToast("Favoriten konnten nicht dauerhaft gespeichert werden."); }
}

function openSearchModal(mode = "all") {
  openScreen("catalog", { mode });
}

function openCatalogSong(song) {
  openScreen("song", { id: song.id });
}

function openCardDetail(card) {
  selectedCard = card;
  $$(".selected-tile").forEach(el => el.classList.remove("selected-tile"));
  card.classList.add("selected-tile");
  $$(".song-tile, .track-tile").forEach(el => el.setAttribute("aria-pressed", String(el === card)));

  const title = card.querySelector("h3")?.textContent?.trim() || "Unbenannter Eintrag";
  const isPlaylist = card.classList.contains("mood-tile");
  const subtitle = card.querySelector(".tile-sub, .track-info p")?.textContent?.trim() || (isPlaylist ? "PLAYLIST" : "SONG");
  const duration = card.querySelector(".tile-duration")?.textContent?.replace(/^◷\s*/, "").trim() || "";
  const difficulty = card.querySelector(".track-stats span:nth-child(2)")?.textContent?.trim() || "—";
  const palette = card.classList.contains("tile-neon") ? ["#182e92","#e83d9c"]
    : card.classList.contains("tile-coral") ? ["#fb7950","#b92d58"]
    : card.classList.contains("tile-aqua") ? ["#1679ae","#5735c6"]
    : card.classList.contains("tile-lime") ? ["#80ad34","#e54396"]
    : card.classList.contains("cover-prism") ? ["#253fb2","#ec4596"]
    : card.classList.contains("cover-pulse") ? ["#343084","#df459f"]
    : card.classList.contains("cover-stardust") ? ["#133d7a","#6f42c2"]
    : ["#5331a5","#d63293"];
  openScreen("song", {
    title,
    artist: isPlaylist ? "JDNEXT CURATED" : subtitle,
    subtitle,
    kind: isPlaylist ? "playlist" : "song",
    difficulty: isPlaylist ? "" : difficulty,
    duration,
    accent: palette[0],
    accent2: palette[1],
    genre: isPlaylist ? "FEATURED PLAYLIST" : "FEATURED TRACK"
  });
}

function startDemo(title, subtitle) {
  openScreen("player", { title, subtitle, artist: subtitle });
}

function openSettings() {
  openScreen("settings");
}

function showNotifications() {
  openScreen("notifications");
}

function showMoreContent() {
  openScreen("content");
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
    } else if (label === "Songs") openSearchModal("songs");
    else if (label === "Playlists") openScreen("playlists");
    else if (label === "Profil" || label === "Dancecard") showProfile();
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

function showSeasonMenu() {
  const markup =
    '<div class="season-menu-hero">' +
      '<div class="season-menu-topline"><span>JDNEXT · SEASON HUB</span><span class="season-menu-live"><i></i> AKTUELL</span></div>' +
      '<div class="season-menu-identity"><div class="season-menu-zero">0</div><div><p class="season-menu-kicker">DIE ERSTE RUNDE BEGINNT</p><h3>EARLY ACCESS</h3><p class="season-menu-description">Willkommen in der ersten JDNEXT-Test-Saison. Entdecke den Hub, passe deinen Avatar an und begleite das Projekt von Anfang an.</p></div></div>' +
      '<div class="season-menu-badges"><span>SEASON 0</span><span>EARLY ACCESS</span><span>NEON FREQUENCY</span></div>' +
    '</div>' +
    '<div class="season-menu-tabs" role="tablist" aria-label="Saison-Menü">' +
      '<button type="button" class="season-tab active" data-season-tab="overview" role="tab" aria-selected="true">ÜBERSICHT</button>' +
      '<button type="button" class="season-tab" data-season-tab="rewards" role="tab" aria-selected="false">BELOHNUNGEN</button>' +
      '<button type="button" class="season-tab" data-season-tab="challenges" role="tab" aria-selected="false">HERAUSFORDERUNGEN</button>' +
    '</div>' +
    '<section class="season-menu-panel season-overview-panel" data-season-panel="overview">' +
      '<div class="season-menu-panel-heading"><div><span>AKTUELLE SAISON</span><h4>NEON FREQUENCY</h4></div><span class="season-status-pill">EARLY ACCESS</span></div>' +
      '<p class="season-menu-copy">Season 0 ist die Vorschau auf die geplante Saison-Oberfläche. Inhalte, Herausforderungen und Fortschritt sind noch Konzeptfunktionen und derzeit nicht mit echtem Gameplay verbunden.</p>' +
      '<div class="season-progress-card"><div class="season-progress-line"><span>SAISON-FORTSCHRITT</span><strong>VORSCHAU</strong></div><div class="season-progress-track"><i></i></div><small>Fortschrittsanzeige wird mit einem späteren Spiel-/Punktesystem verbunden.</small></div>' +
      '<div class="season-menu-actions"><button type="button" class="ui-button primary" id="seasonChooseAvatar">AVATAR ANPASSEN ↗</button><button type="button" class="ui-button secondary" id="seasonBrowseSongs">SONGS ENTDECKEN ↗</button></div>' +
    '</section>' +
    '<section class="season-menu-panel" data-season-panel="rewards" hidden>' +
      '<div class="season-menu-panel-heading"><div><span>SEASON COLLECTION</span><h4>GEPLANTE BELOHNUNGEN</h4></div><span class="season-status-pill">VORSCHAU</span></div>' +
      '<div class="season-reward-grid">' +
        '<article class="season-reward-card"><div class="season-reward-art reward-pink">✦</div><strong>NEON FRAME</strong><small>Profilrahmen · geplant</small><span>DEMO</span></article>' +
        '<article class="season-reward-card"><div class="season-reward-art reward-cyan">★</div><strong>FIRST WAVE</strong><small>Spielertitel · geplant</small><span>DEMO</span></article>' +
        '<article class="season-reward-card"><div class="season-reward-art reward-gold">🪩</div><strong>DISCO ORB</strong><small>Avatar-Look · verfügbar als Auswahl</small><span>AVATAR</span></article>' +
        '<article class="season-reward-card"><div class="season-reward-art reward-purple">♫</div><strong>NEON FREQUENCY</strong><small>Saison-Thema · Konzept</small><span>CONCEPT</span></article>' +
      '</div>' +
    '</section>' +
    '<section class="season-menu-panel" data-season-panel="challenges" hidden>' +
      '<div class="season-menu-panel-heading"><div><span>EARLY ACCESS TASKS</span><h4>ERSTE SCHRITTE</h4></div><span class="season-status-pill">DEMO</span></div>' +
      '<div class="season-challenge-list">' +
        '<div class="season-challenge"><span class="season-challenge-icon">✦</span><div><strong>Wähle deinen Dancer</strong><small>Personalisiere deine Dancecard.</small></div><span>OPTIONAL</span></div>' +
        '<div class="season-challenge"><span class="season-challenge-icon">♫</span><div><strong>Entdecke den Katalog</strong><small>Sieh dir Songs und Details an.</small></div><span>OPTIONAL</span></div>' +
        '<div class="season-challenge"><span class="season-challenge-icon">◎</span><div><strong>Sieh dich in Season 0 um</strong><small>Erkunde das aktuelle Early-Access-Menü.</small></div><span>JETZT</span></div>' +
      '</div>' +
      '<p class="modal-footnote">Diese Aufgaben sind UI-Demos. Es werden noch keine Punkte oder Belohnungen gutgeschrieben.</p>' +
    '</section>' +
    '<p class="season-menu-footer">JDNEXT CONCEPT · SEASON 0 EARLY ACCESS · KEINE OFFIZIELLEN SPIELINHALTE</p>';
  openModal("SEASON 0 · EARLY ACCESS", markup, () => {
    $(".ui-modal").classList.add("season-modal");
    const buttons = $(".season-tab");
    const panels = $(".season-menu-panel");
    buttons.forEach(button => button.addEventListener("click", () => {
      const tab = button.dataset.seasonTab;
      buttons.forEach(item => {
        const selected = item === button;
        item.classList.toggle("active", selected);
        item.setAttribute("aria-selected", String(selected));
      });
      panels.forEach(panel => { panel.hidden = panel.dataset.seasonPanel !== tab; });
    }));
    $("#seasonChooseAvatar")?.addEventListener("click", () => { closeModal(); showProfile(); });
    $("#seasonBrowseSongs")?.addEventListener("click", () => openScreen("catalog"));
  });
}

$(".season-pill")?.addEventListener("click", showSeasonMenu);
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