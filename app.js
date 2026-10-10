const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const ACCOUNT_MODULE_URL = "https://hannonuppi.github.io/Tobiservices-Account/auth-core.js";
const FALLBACK_LOGIN_URL = "https://hannonuppi.github.io/Tobiservices-Account/login.html";
const FALLBACK_ACCOUNT_URL = "https://hannonuppi.github.io/Tobiservices-Account/account.html";

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
  $(".ui-modal").classList.remove("catalog-modal", "dancecard-modal");
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
    avatarEl.textContent = "JD";
    pill.setAttribute("aria-label", "Anmelden oder Account öffnen");
    return;
  }
  const display = accountProfile?.displayName || accountUser.displayName || accountUser.email || "TobiServices";
  nameEl.textContent = display;
  const initials = String(display).trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase();
  avatarEl.textContent = initials.slice(0, 2) || "TS";
  pill.setAttribute("aria-label", "TobiServices Account: " + display);
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
  if (!accountUser) {
    openLoginModal();
    return;
  }

  const display = accountProfile?.displayName || accountUser.displayName || accountUser.email || "Dance Player";
  const email = accountProfile?.email || accountUser.email || "(nicht verfügbar)";
  const tags = Array.isArray(accountProfile?.tags) ? accountProfile.tags : [];
  const goldCoins = Number.isSafeInteger(accountProfile?.goldCoins) && accountProfile.goldCoins >= 0
    ? accountProfile.goldCoins
    : 0;

  openModal("Dancecard",
    '<div class="dancecard-layout">' +
      '<section class="dancecard-hero-card" aria-label="Deine Dancecard">' +
        '<div class="dancecard-orbit orbit-a"></div><div class="dancecard-orbit orbit-b"></div><div class="dancecard-orbit orbit-c"></div>' +
        '<div class="dancecard-card-top"><div class="dancecard-brand">JD<span>NEXT</span></div><span class="dancecard-season">SEASON <b>01</b></span></div>' +
        '<div class="dancecard-main"><div class="dancecard-avatar"></div><div class="dancecard-player-copy">' +
          '<span class="dancecard-eyebrow">YOUR DANCECARD</span><h3 class="dancecard-name"></h3><p class="dancecard-email-preview"></p>' +
        '</div></div>' +
        '<div class="dancecard-card-bottom"><div><span>PLAYER CODE</span><code class="dancecard-player-code"></code></div><span class="dancecard-card-star" aria-hidden="true">✦</span></div>' +
      '</section>' +
      '<section class="dancecard-wallet" aria-label="Goldmünzen-Guthaben">' +
        '<div class="dancecard-wallet-coin" aria-hidden="true">✦</div><div class="dancecard-wallet-copy">' +
          '<span>GOLDMÜNZEN</span><small>GEMEINSAMES TOBISERVICES-GUTHABEN</small><strong class="dancecard-gold-coins">0</strong>' +
        '</div><div class="dancecard-wallet-note">Verdienen ist<br>noch nicht verfügbar</div>' +
      '</section>' +
      '<section class="dancecard-social-row">' +
        '<div class="dancecard-tag-panel"><span class="dancecard-section-label">YOUR TAGS</span><div class="dancecard-tag-list" id="dancecardTagPreview"></div></div>' +
        '<div class="dancecard-status-panel"><span class="dancecard-section-label">ACCOUNT STATUS</span><strong>READY TO DANCE</strong><small>Dein TobiServices-Konto ist verbunden.</small></div>' +
      '</section>' +
      (accountApi.isAdmin(accountProfile)
        ? '<section class="dancecard-status-panel dancecard-maintenance-panel"><span class="dancecard-section-label">ADMIN CONTROL</span><strong id="dancecardBypassState"></strong><small id="dancecardBypassDescription"></small><button class="ui-button secondary" id="toggleMaintenanceBypass" type="button">Wartungsbypass aktivieren</button></section>'
        : '') +
      '<details class="dancecard-account-details">' +
        '<summary><span>Kontoinformationen</span><small>E-Mail, Tags und vollständige Account-ID</small><b aria-hidden="true">＋</b></summary>' +
        '<div class="dancecard-detail-grid">' +
          '<div class="dancecard-detail-field"><span>E-MAIL-ADRESSE</span><code class="dancecard-email"></code></div>' +
          '<div class="dancecard-detail-field"><span>VOLLSTÄNDIGE ACCOUNT-ID</span><code class="dancecard-uid"></code></div>' +
          '<div class="dancecard-detail-field full"><span>ALLE TAGS</span><div class="dancecard-tag-list detail-tags" id="dancecardTagDetails"></div></div>' +
        '</div>' +
      '</details>' +
    '</div>' +
    '<div class="modal-actions"><button class="ui-button primary" id="manageAccount">Account verwalten</button>' +
      (accountApi.isAdmin(accountProfile) ? '<button class="ui-button secondary" id="adminAccount">Admin Center</button>' : '') +
      '<button class="ui-button ghost" id="logoutAccount">Abmelden</button></div>',
    () => {
      $(".ui-modal").classList.add("dancecard-modal");
      $(".dancecard-name").textContent = display;
      $(".dancecard-email-preview").textContent = email;
      $(".dancecard-email").textContent = email;
      $(".dancecard-uid").textContent = accountUser.uid;
      $(".dancecard-player-code").textContent = accountUser.uid.slice(-8).toUpperCase();
      $(".dancecard-gold-coins").textContent = goldCoins.toLocaleString("de-DE");
      $(".dancecard-avatar").textContent = initialsFor(display);

      const renderTags = selector => {
        const root = $(selector);
        root.replaceChildren();
        if (!tags.length) {
          const empty = document.createElement("span");
          empty.className = "dancecard-tag muted-tag";
          empty.textContent = "Keine Tags";
          root.appendChild(empty);
          return;
        }
        tags.forEach(tag => {
          const pill = document.createElement("span");
          pill.className = "dancecard-tag";
          pill.textContent = tag;
          root.appendChild(pill);
        });
      };
      renderTags("#dancecardTagPreview");
      renderTags("#dancecardTagDetails");
       renderMaintenanceBypassControls();
       $("#toggleMaintenanceBypass")?.addEventListener("click", async event => {
         await setCurrentMaintenanceBypass(accountProfile?.maintenanceBypass !== true, event.currentTarget);
       });

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
      '<p class="modal-copy">Das gemeinsame Account-Modul ist gerade nicht erreichbar. Öffne den zentralen Login und kehre danach zur Beta zurück.</p>' +
      '<div class="modal-actions"><a class="ui-button primary link-button" href="' + FALLBACK_LOGIN_URL + '?return=' + encodeURIComponent(window.location.href) + '">Zum TobiServices Login ↗</a></div>');
    return;
  }
  openModal("Mit TobiServices anmelden",
    '<p class="modal-copy">Melde dich mit einem bestehenden Firebase-Authentication-Konto und deiner E-Mail-Adresse an.</p>' +
    '<form id="loginForm" class="account-form">' +
      '<label for="accountUsername">E-Mail-Adresse</label><input id="accountUsername" name="email" type="email" autocomplete="email" maxlength="254" required placeholder="name@beispiel.de">' +
      '<label for="accountPassword">Passwort</label><input id="accountPassword" name="password" type="password" autocomplete="current-password" maxlength="128" required placeholder="Dein Passwort">' +
      '<p class="form-message" id="loginMessage" aria-live="polite"></p>' +
      '<button class="ui-button primary" id="loginSubmit" type="submit">Anmelden</button>' +
    '</form><p class="modal-footnote">Neue Konten legst du in Firebase Authentication an. Berechtigungen kommen aus dem geschützten Tag-System.</p>',
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
          if (code.includes("auth/invalid-credential") || code.includes("auth/invalid-login-credentials") || code.includes("unauthenticated")) message.textContent = "E-Mail-Adresse oder Passwort ist falsch.";
          else if (code.includes("invalid-argument")) message.textContent = error?.message || "Bitte prüfe E-Mail-Adresse und Passwort.";
          else if (code.includes("unavailable") || code.includes("failed-precondition")) message.textContent = "Der Accountdienst ist derzeit nicht bereit oder erreichbar.";
          else message.textContent = "Anmeldung fehlgeschlagen. Prüfe deine Verbindung und versuche es erneut.";
          submit.disabled = false;
        }
      });
    });
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
  openModal(mode === "songs" ? "Songs durchsuchen" : "Song-Katalog",
    '<p class="modal-copy">Durchsuche Songs aus Just Dance 2024 und 2025. Cover sind eigenständige Platzhalter; Schwierigkeitsgrade und Genres sind Demo-Metadaten, keine offiziellen In-Game-Werte.</p>' +
    '<div class="catalog-controls">' +
      '<label class="catalog-search-field"><span>SUCHEN</span><input class="search-input" id="catalogSearch" type="search" placeholder="Song, Artist oder Genre …" autocomplete="off" aria-label="Songs suchen"></label>' +
      '<label class="catalog-filter"><span>EDITION</span><select id="catalogEdition"><option value="all">Alle Editionen</option><option value="2025">Just Dance 2025</option><option value="2024">Just Dance 2024</option></select></label>' +
      '<label class="catalog-filter"><span>GENRE</span><select id="catalogGenre"><option value="all">Alle Genres</option></select></label>' +
      '<label class="catalog-filter"><span>SCHWIERIGKEIT</span><select id="catalogDifficulty"><option value="all">Alle</option><option>Easy</option><option>Medium</option><option>Hard</option></select></label>' +
      '<label class="catalog-filter catalog-sort"><span>SORTIEREN</span><select id="catalogSort"><option value="edition">Neueste Edition</option><option value="title">Titel A–Z</option><option value="artist">Artist A–Z</option><option value="difficulty">Schwierigkeit</option></select></label>' +
    '</div>' +
    '<div class="catalog-toolbar"><span class="search-count" id="searchCount" aria-live="polite"></span><button type="button" class="catalog-favorites-toggle" id="favoritesToggle" aria-pressed="false">☆ Favoriten</button><button type="button" class="catalog-layout-toggle" id="catalogLayoutToggle" aria-pressed="false">☷ Listenansicht</button></div>' +
    '<div class="catalog-grid" id="songCatalogGrid" aria-label="Songs"></div>',
    () => {
      $(".ui-modal").classList.add("catalog-modal");
      const searchInput = $("#catalogSearch");
      const editionSelect = $("#catalogEdition");
      const genreSelect = $("#catalogGenre");
      const difficultySelect = $("#catalogDifficulty");
      const sortSelect = $("#catalogSort");
      const grid = $("#songCatalogGrid");
      const favoriteToggle = $("#favoritesToggle");
      const layoutToggle = $("#catalogLayoutToggle");
      const genres = [...new Set(SONG_CATALOG.map(song => song.genre))].sort((a,b)=>a.localeCompare(b));
      genres.forEach(genre => {
        const option = document.createElement("option");
        option.value = genre;
        option.textContent = genre;
        genreSelect.appendChild(option);
      });
      let favoritesOnly = false;
      let listLayout = false;

      function makeSongCard(song) {
        const article = document.createElement("article");
        article.className = "catalog-card";
        article.style.setProperty("--cover-a", song.accent);
        article.style.setProperty("--cover-b", song.accent2);

        const main = document.createElement("button");
        main.type = "button";
        main.className = "catalog-card-main";
        main.setAttribute("aria-label", song.title + " von " + song.artist + " öffnen");

        const cover = document.createElement("span");
        cover.className = "catalog-cover";
        const coverTop = document.createElement("span");
        coverTop.className = "catalog-cover-top";
        const edition = document.createElement("span");
        edition.textContent = "JUST DANCE " + song.edition;
        const miniLogo = document.createElement("span");
        miniLogo.className = "catalog-mini-logo";
        miniLogo.textContent = "JD";
        coverTop.append(edition, miniLogo);
        const coverTitle = document.createElement("span");
        coverTitle.className = "catalog-cover-title";
        coverTitle.textContent = song.title;
        const coverArtist = document.createElement("span");
        coverArtist.className = "catalog-cover-artist";
        coverArtist.textContent = song.artist;
        const coverBottom = document.createElement("span");
        coverBottom.className = "catalog-cover-bottom";
        const genre = document.createElement("span");
        genre.textContent = song.genre.toUpperCase();
        const dots = document.createElement("span");
        dots.className = "catalog-difficulty-dots difficulty-" + song.difficulty.toLowerCase();
        for (let i=0;i<3;i++) {
          const dot = document.createElement("i");
          dots.appendChild(dot);
        }
        coverBottom.append(genre, dots);
        cover.append(coverTop, coverTitle, coverArtist, coverBottom);

        const info = document.createElement("span");
        info.className = "catalog-card-info";
        const title = document.createElement("strong");
        title.className = "catalog-card-title";
        title.textContent = song.title;
        const artist = document.createElement("small");
        artist.className = "catalog-card-artist";
        artist.textContent = song.artist;
        const meta = document.createElement("span");
        meta.className = "catalog-card-meta";
        const editionBadge = document.createElement("span");
        editionBadge.textContent = "JD " + song.edition;
        const difficultyBadge = document.createElement("span");
        difficultyBadge.textContent = song.difficulty.toUpperCase();
        meta.append(editionBadge, difficultyBadge);
        info.append(title, artist, meta);
        main.append(cover, info);
        main.addEventListener("click", () => openCatalogSong(song));

        const favorite = document.createElement("button");
        favorite.type = "button";
        favorite.className = "catalog-card-favorite";
        favorite.textContent = catalogFavorites.has(song.id) ? "★" : "☆";
        favorite.setAttribute("aria-label", catalogFavorites.has(song.id) ? "Favorit entfernen" : "Als Favorit markieren");
        favorite.setAttribute("aria-pressed", String(catalogFavorites.has(song.id)));
        favorite.addEventListener("click", event => {
          event.stopPropagation();
          if (catalogFavorites.has(song.id)) catalogFavorites.delete(song.id);
          else catalogFavorites.add(song.id);
          saveCatalogFavorites();
          refresh();
        });
        article.append(main, favorite);
        return article;
      }

      function refresh() {
        const query = searchInput.value.trim().toLocaleLowerCase("de");
        let songs = SONG_CATALOG.filter(song => {
          const searchable = [song.title, song.artist, song.genre, String(song.edition), "just dance " + song.edition].join(" ").toLocaleLowerCase("de");
          return searchable.includes(query) &&
            (editionSelect.value === "all" || String(song.edition) === editionSelect.value) &&
            (genreSelect.value === "all" || song.genre === genreSelect.value) &&
            (difficultySelect.value === "all" || song.difficulty === difficultySelect.value) &&
            (!favoritesOnly || catalogFavorites.has(song.id));
        });

        if (sortSelect.value === "title") songs.sort((a,b)=>a.title.localeCompare(b.title));
        else if (sortSelect.value === "artist") songs.sort((a,b)=>a.artist.localeCompare(b.artist));
        else if (sortSelect.value === "difficulty") {
          const rank = {Easy:1,Medium:2,Hard:3};
          songs.sort((a,b)=>rank[a.difficulty]-rank[b.difficulty] || a.title.localeCompare(b.title));
        } else songs.sort((a,b)=>b.edition-a.edition || a.title.localeCompare(b.title));

        grid.replaceChildren();
        grid.classList.toggle("list-layout", listLayout);
        if (!songs.length) {
          const empty = document.createElement("div");
          empty.className = "catalog-empty";
          empty.textContent = favoritesOnly && !catalogFavorites.size
            ? "Noch keine Favoriten. Markiere Songs mit ☆, um sie hier zu sammeln."
            : "Keine passenden Songs gefunden. Passe Suche oder Filter an.";
          grid.appendChild(empty);
        } else {
          songs.forEach(song => grid.appendChild(makeSongCard(song)));
        }
        $("#searchCount").textContent = songs.length + (songs.length === 1 ? " SONG" : " SONGS") + " · " + catalogFavorites.size + " FAVORITEN";
        favoriteToggle.setAttribute("aria-pressed", String(favoritesOnly));
        favoriteToggle.textContent = favoritesOnly ? "★ Favoriten anzeigen" : "☆ Nur Favoriten";
        layoutToggle.setAttribute("aria-pressed", String(listLayout));
        layoutToggle.textContent = listLayout ? "▦ Rasteransicht" : "☷ Listenansicht";
      }

      [searchInput, editionSelect, genreSelect, difficultySelect, sortSelect].forEach(element => {
        element.addEventListener(element === searchInput ? "input" : "change", refresh);
      });
      favoriteToggle.addEventListener("click", () => { favoritesOnly = !favoritesOnly; refresh(); });
      layoutToggle.addEventListener("click", () => { listLayout = !listLayout; refresh(); });
      refresh();
      searchInput.focus();
    });
}

function openCatalogSong(song) {
  openModal(song.title,
    '<div class="catalog-detail-cover" id="catalogDetailCover"><div class="catalog-detail-brand">JUST DANCE ' + song.edition + '</div><div class="catalog-detail-title" id="catalogDetailTitle"></div><div class="catalog-detail-artist" id="catalogDetailArtist"></div></div>' +
    '<div class="catalog-detail-metadata"><span id="catalogDetailEdition"></span><span id="catalogDetailGenre"></span><span id="catalogDetailDifficulty"></span><span id="catalogDetailDuration"></span></div>' +
    '<p class="modal-copy">Song- und Artistdaten stammen aus den Edition-Tracklists. Cover und Schwierigkeitsanzeige sind Platzhalter; dieser Prototyp enthält keine Audiodatei und startet kein echtes Gameplay.</p>' +
    '<div class="modal-actions"><button class="ui-button primary" id="catalogDemoStart">▶ Demo-Player</button><button class="ui-button secondary" id="catalogFavoriteToggle"></button><button class="ui-button ghost" id="catalogBackToSearch">Zur Suche</button></div>',
    () => {
      const cover = $("#catalogDetailCover");
      cover.style.setProperty("--cover-a", song.accent);
      cover.style.setProperty("--cover-b", song.accent2);
      $("#catalogDetailTitle").textContent = song.title;
      $("#catalogDetailArtist").textContent = song.artist;
      $("#catalogDetailEdition").textContent = "JUST DANCE " + song.edition;
      $("#catalogDetailGenre").textContent = song.genre;
      $("#catalogDetailDifficulty").textContent = "Demo: " + song.difficulty;
      $("#catalogDetailDuration").textContent = song.duration;
      const favoriteButton = $("#catalogFavoriteToggle");
      const updateFavoriteLabel = () => {
        favoriteButton.textContent = catalogFavorites.has(song.id) ? "★ Favorit gespeichert" : "☆ Als Favorit speichern";
        favoriteButton.setAttribute("aria-pressed", String(catalogFavorites.has(song.id)));
      };
      updateFavoriteLabel();
      favoriteButton.addEventListener("click", () => {
        if (catalogFavorites.has(song.id)) catalogFavorites.delete(song.id);
        else catalogFavorites.add(song.id);
        saveCatalogFavorites();
        updateFavoriteLabel();
      });
      $("#catalogDemoStart").addEventListener("click", () => startDemo(song.title, song.artist + " · JD " + song.edition));
      $("#catalogBackToSearch").addEventListener("click", () => openSearchModal("songs"));
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