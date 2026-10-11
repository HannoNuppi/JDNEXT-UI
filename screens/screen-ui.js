import {
  auth,
  CONFIG,
  login,
  onUser,
  isAdmin,
  hasTag,
  onMaintenanceMode,
  setMaintenanceBypass,
  safeReturnUrl
} from "https://hannonuppi.github.io/Tobiservices-Account/auth-core.js";

const $ = selector => document.querySelector(selector);
const screenName = document.body.dataset.screen || "content";
const HOME_URL = "../index.html";
const SONGS = [
  { id:"flowers",title:"Flowers",artist:"Miley Cyrus",edition:2024,genre:"Pop",difficulty:"Easy",duration:"3:20",accent:"#ff8b47",accent2:"#f23591" },
  { id:"calm-down",title:"Calm Down",artist:"Rema",edition:2024,genre:"Afrobeats",difficulty:"Easy",duration:"3:58",accent:"#f9ab45",accent2:"#d92776" },
  { id:"butter",title:"Butter",artist:"BTS",edition:2024,genre:"K-pop",difficulty:"Medium",duration:"2:44",accent:"#e5c752",accent2:"#ef7f43" },
  { id:"cure-for-me",title:"Cure For Me",artist:"AURORA",edition:2024,genre:"Electropop",difficulty:"Medium",duration:"3:19",accent:"#62dfd0",accent2:"#5262df" },
  { id:"despecha",title:"DESPECHÁ",artist:"ROSALÍA",edition:2024,genre:"Latin",difficulty:"Hard",duration:"2:37",accent:"#ff8d4d",accent2:"#e53b62" },
  { id:"gimme-more",title:"Gimme More",artist:"Britney Spears",edition:2024,genre:"Dance-pop",difficulty:"Hard",duration:"3:12",accent:"#dd49d4",accent2:"#4923a9" },
  { id:"how-you-like-that",title:"How You Like That",artist:"BLACKPINK",edition:2024,genre:"K-pop",difficulty:"Hard",duration:"3:00",accent:"#f45aa9",accent2:"#5934dc" },
  { id:"kill-bill",title:"Kill Bill",artist:"SZA",edition:2024,genre:"R&B",difficulty:"Medium",duration:"2:34",accent:"#c0d750",accent2:"#248f82" },
  { id:"makeba",title:"Makeba",artist:"Jain",edition:2024,genre:"World pop",difficulty:"Medium",duration:"3:43",accent:"#ff9e43",accent2:"#e84d3a" },
  { id:"sail",title:"Sail",artist:"AWOLNATION",edition:2024,genre:"Alternative rock",difficulty:"Hard",duration:"4:18",accent:"#e55a49",accent2:"#70275c" },
  { id:"seven",title:"Seven",artist:"Jung Kook ft. Latto",edition:2024,genre:"K-pop",difficulty:"Medium",duration:"3:04",accent:"#68c7ef",accent2:"#7168d8" },
  { id:"treasure",title:"Treasure",artist:"Bruno Mars",edition:2024,genre:"Funk / Pop",difficulty:"Medium",duration:"2:58",accent:"#ffca48",accent2:"#e94c8a" },
  { id:"vampire",title:"vampire",artist:"Olivia Rodrigo",edition:2024,genre:"Pop rock",difficulty:"Medium",duration:"3:39",accent:"#a58aff",accent2:"#d83f8f" },
  { id:"wasabi",title:"Wasabi",artist:"Little Mix",edition:2024,genre:"Pop",difficulty:"Hard",duration:"2:34",accent:"#92e74e",accent2:"#e7459e" },
  { id:"espresso",title:"Espresso",artist:"Sabrina Carpenter",edition:2025,genre:"Pop",difficulty:"Medium",duration:"2:55",accent:"#d49a6a",accent2:"#e94d8a" },
  { id:"yes-and",title:"yes, and?",artist:"Ariana Grande",edition:2025,genre:"Dance-pop",difficulty:"Medium",duration:"3:34",accent:"#b5a2ff",accent2:"#ec8fd3" },
  { id:"poker-face",title:"Poker Face",artist:"Lady Gaga",edition:2025,genre:"Dance-pop",difficulty:"Hard",duration:"3:58",accent:"#e9dd55",accent2:"#d33b92" },
  { id:"lunch",title:"LUNCH",artist:"Billie Eilish",edition:2025,genre:"Pop",difficulty:"Hard",duration:"3:00",accent:"#91f05e",accent2:"#14a88c" },
  { id:"basket-case",title:"Basket Case",artist:"Green Day",edition:2025,genre:"Punk rock",difficulty:"Hard",duration:"3:02",accent:"#b7da59",accent2:"#e95b40" },
  { id:"calabria-2007",title:"Calabria 2007",artist:"Enur ft. Natasja",edition:2025,genre:"Dancehall",difficulty:"Medium",duration:"3:05",accent:"#4ce0db",accent2:"#e84a9c" },
  { id:"training-season",title:"Training Season",artist:"Dua Lipa",edition:2025,genre:"Disco-pop",difficulty:"Hard",duration:"3:29",accent:"#ffe16b",accent2:"#f05c9b" },
  { id:"unstoppable",title:"Unstoppable",artist:"Sia",edition:2025,genre:"Pop",difficulty:"Medium",duration:"3:37",accent:"#65d7f2",accent2:"#6d61d9" }
];
const FEATURED = [
  {title:"Neon Nights",subtitle:"LIGHTS. MUSIC. YOU.",duration:"18 MIN",a:"#162b87",b:"#d52d97"},
  {title:"Heatwave",subtitle:"FEEL THE BEAT",duration:"22 MIN",a:"#ff784c",b:"#bd2358"},
  {title:"Blue Hour",subtitle:"FIND YOUR FLOW",duration:"16 MIN",a:"#126ba6",b:"#542bcb"},
  {title:"Pixel Fever",subtitle:"BOLD MOVES ONLY",duration:"20 MIN",a:"#75a52c",b:"#e04495"}
];
const FAVORITES_KEY = "jdnext-catalog-favorites-v1";
let favorites = new Set();
try { favorites = new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]")); } catch {}
let currentUser = null;
let currentProfile = null;
let maintenance = {enabled:false,message:"",loaded:false,error:null};
let authReady = false;
let screenStarted = false;
let toastTimer = null;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[char]));
}
function safeColor(value, fallback="#5532a6") {
  return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : fallback;
}
function saveFavorites() {
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites])); }
  catch { screenToast("Der Browser-Speicher ist nicht verfügbar."); }
}
function screenToast(message) {
  let toast = $(".screen-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "screen-toast";
    toast.setAttribute("role","status");
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast?.remove(), 3200);
}
function go(url) { window.location.href = url; }
function rootQuery(page, values={}) {
  const url = new URL("./" + page, window.location.href);
  Object.entries(values).forEach(([key,value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key,String(value));
  });
  return url.href;
}
function slug(value) {
  return String(value||"song").toLocaleLowerCase("de").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,70) || "song";
}
function updateScreenHeader(kicker, title, user) {
  const k = $("#screenKicker"), h = $("#screenHeading"), badge = $("#screenUser");
  if (k) k.textContent = kicker;
  if (h) h.textContent = title;
  if (badge && user) badge.innerHTML = '<span class="screen-user-dot"></span><span>' + escapeHtml((user.email || "TOBISERVICES").toLocaleUpperCase("de").slice(0,32)) + '</span>';
  const back = $("#screenBack");
  if (back) {
    back.href = HOME_URL;
    if (screenName === "song") {
      back.href = "./catalog.html";
      back.innerHTML = '<span aria-hidden="true">←</span> KATALOG';
    } else if (screenName === "player") {
      back.href = "./catalog.html";
      back.innerHTML = '<span aria-hidden="true">←</span> KATALOG';
    } else if (screenName === "login") {
      back.href = HOME_URL;
      back.innerHTML = '<span aria-hidden="true">×</span> SCHLIESSEN';
    } else {
      back.innerHTML = '<span aria-hidden="true">←</span> MENÜ';
    }
  }
}
function currentHasAccess() {
  const roleAllowed = isAdmin(currentProfile) || hasTag(currentProfile,"dance-beta");
  return Boolean(currentUser && currentProfile && currentProfile.disabled !== true && roleAllowed);
}
function checkScreenAccess() {
  if (screenName === "login") return;
  if (!authReady) return;
  if (!currentUser || !currentProfile) {
    go(HOME_URL);
    return;
  }
  if (!currentHasAccess()) {
    go(HOME_URL);
    return;
  }
  if (!maintenance.loaded) return;
  if (maintenance.error || (maintenance.enabled && !(isAdmin(currentProfile) && currentProfile.maintenanceBypass === true))) {
    go(HOME_URL);
    return;
  }
  document.body.classList.add("screen-ready");
  $("#screenUser") && updateScreenHeader("JDNEXT · PLAYER HUB", $("#screenHeading")?.textContent || "MENU", currentUser);
  if (!screenStarted) {
    screenStarted = true;
    renderScreen();
  } else if (screenName === "dancecard") {
    refreshDancecardStatus();
  }
}
function initializeAccessGuard() {
  onUser((user, profile) => {
    currentUser = user;
    currentProfile = profile;
    authReady = true;
    checkScreenAccess();
  });
  onMaintenanceMode((state,error) => {
    maintenance = error
      ? {enabled:true,message:"",loaded:false,error}
      : {enabled:state?.enabled===true,message:state?.message||"",loaded:true,error:null};
    checkScreenAccess();
  });
}
function openSong(song) {
  go(rootQuery("song.html",{id:song.id}));
}
function makeTrackCard(song) {
  const isFavorite = favorites.has(song.id);
  return '<article class="song-screen-card" style="--art-a:'+safeColor(song.accent)+';--art-b:'+safeColor(song.accent2)+'">' +
    '<button class="song-screen-main" type="button" data-song-id="'+escapeHtml(song.id)+'" aria-label="'+escapeHtml(song.title+' von '+song.artist+' öffnen')+'">' +
      '<span class="song-screen-cover"><span class="song-screen-cover-top"><span>JUST DANCE '+song.edition+'</span><span class="song-screen-mark">JD</span></span>' +
      '<span><span class="song-screen-cover-title">'+escapeHtml(song.title)+'</span><span class="song-screen-cover-artist">'+escapeHtml(song.artist)+'</span></span>' +
      '<span class="song-screen-cover-bottom"><span>'+escapeHtml(song.genre.toUpperCase())+'</span><span class="song-screen-dots difficulty-'+song.difficulty.toLowerCase()+'"><i></i><i></i><i></i></span></span></span>' +
      '<span class="song-screen-info"><strong class="song-screen-title">'+escapeHtml(song.title)+'</strong><span class="song-screen-artist">'+escapeHtml(song.artist)+'</span><span class="song-screen-meta"><span>JD '+song.edition+'</span><span>'+song.difficulty.toUpperCase()+'</span></span></span>' +
    '</button><button class="song-favorite" type="button" data-favorite-id="'+escapeHtml(song.id)+'" aria-pressed="'+String(isFavorite)+'" aria-label="'+(isFavorite?"Favorit entfernen":"Als Favorit speichern")+'">'+(isFavorite?"★":"☆")+'</button></article>';
}
function renderCatalog() {
  const mode = new URLSearchParams(location.search).get("mode")==="songs" ? "songs" : "all";
  updateScreenHeader(mode==="songs"?"LIBRARY · TRACKS":"LIBRARY · ALL CONTENT",mode==="songs"?"SONGS":"SONG-KATALOG",currentUser);
  $("#screenContent").innerHTML =
    '<div class="screen-title-row"><div><p class="screen-overline">FIND YOUR NEXT ROUTINE</p><h2 class="screen-title">'+(mode==="songs"?"ALLE SONGS":"DER SONG-KATALOG")+'</h2><p class="screen-lede">Durchsuche den Konzept-Katalog, sortiere nach Edition und Genre oder speichere Favoriten. Cover, Schwierigkeitsgrade und Previews sind eigenständige Demo-Elemente.</p></div><span class="screen-chip">LOCAL LIBRARY · 22 TRACKS</span></div>' +
    '<div class="catalog-toolbar-screen">' +
      '<label class="screen-field"><span>SUCHEN</span><input id="trackSearch" class="screen-input" type="search" placeholder="Song, Artist oder Genre …" autocomplete="off"></label>' +
      '<label class="screen-field"><span>EDITION</span><select id="trackEdition" class="screen-select"><option value="all">Alle Editionen</option><option value="2025">Just Dance 2025</option><option value="2024">Just Dance 2024</option></select></label>' +
      '<label class="screen-field"><span>GENRE</span><select id="trackGenre" class="screen-select"><option value="all">Alle Genres</option></select></label>' +
      '<label class="screen-field"><span>SCHWIERIGKEIT</span><select id="trackDifficulty" class="screen-select"><option value="all">Alle</option><option>Easy</option><option>Medium</option><option>Hard</option></select></label>' +
    '</div>' +
    '<div class="catalog-toolbar-bottom"><span class="catalog-count" id="trackCount">22 SONGS</span><button type="button" class="screen-chip-button" id="trackSort" data-sort="edition">SORT: NEUESTE EDITION</button><button type="button" class="screen-chip-button" id="trackFavOnly" aria-pressed="false">☆ NUR FAVORITEN</button><button type="button" class="screen-chip-button" id="trackLayout" aria-pressed="false">☷ LISTENANSICHT</button></div>' +
    '<div id="trackGrid" class="song-screen-grid"></div>';
  const search=$("#trackSearch"),edition=$("#trackEdition"),genre=$("#trackGenre"),difficulty=$("#trackDifficulty"),grid=$("#trackGrid");
  [...new Set(SONGS.map(song=>song.genre))].sort((a,b)=>a.localeCompare(b)).forEach(value=>{
    const option=document.createElement("option");option.value=value;option.textContent=value;genre.appendChild(option);
  });
  let favOnly=false,listLayout=false,sortMode="edition";
  function refresh(){
    const q=search.value.trim().toLocaleLowerCase("de");
    let filtered=SONGS.filter(song=>{
      const searchable=[song.title,song.artist,song.genre,String(song.edition),"just dance "+song.edition].join(" ").toLocaleLowerCase("de");
      return searchable.includes(q)&&(edition.value==="all"||String(song.edition)===edition.value)&&(genre.value==="all"||song.genre===genre.value)&&(difficulty.value==="all"||song.difficulty===difficulty.value)&&(!favOnly||favorites.has(song.id));
    });
    if(sortMode==="title")filtered.sort((a,b)=>a.title.localeCompare(b.title));
    else if(sortMode==="artist")filtered.sort((a,b)=>a.artist.localeCompare(b.artist));
    else if(sortMode==="difficulty"){const rank={Easy:1,Medium:2,Hard:3};filtered.sort((a,b)=>rank[a.difficulty]-rank[b.difficulty]||a.title.localeCompare(b.title));}
    else filtered.sort((a,b)=>b.edition-a.edition||a.title.localeCompare(b.title));
    grid.classList.toggle("list-layout",listLayout);
    grid.innerHTML=filtered.map(makeTrackCard).join("")||'<div class="catalog-empty-screen">Keine passenden Songs gefunden.<br>Ändere Suche oder Filter oder markiere einen Song als Favorit.</div>';
    $("#trackCount").textContent=filtered.length+" SONGS · "+favorites.size+" FAVORITEN";
    $("#trackFavOnly").setAttribute("aria-pressed",String(favOnly));
    $("#trackFavOnly").textContent=favOnly?"★ FAVORITEN AKTIV":"☆ NUR FAVORITEN";
    $("#trackLayout").setAttribute("aria-pressed",String(listLayout));
    $("#trackLayout").textContent=listLayout?"▦ RASTERANSICHT":"☷ LISTENANSICHT";
    $("#trackSort").textContent="SORT: "+({edition:"NEUESTE EDITION",title:"TITEL A–Z",artist:"ARTIST A–Z",difficulty:"SCHWIERIGKEIT"}[sortMode]);
  }
  [search,edition,genre,difficulty].forEach(control=>control.addEventListener(control===search?"input":"change",refresh));
  $("#trackSort").addEventListener("click",()=>{const modes=["edition","title","artist","difficulty"];sortMode=modes[(modes.indexOf(sortMode)+1)%modes.length];refresh();});
  $("#trackFavOnly").addEventListener("click",()=>{favOnly=!favOnly;refresh();});
  $("#trackLayout").addEventListener("click",()=>{listLayout=!listLayout;refresh();});
  grid.addEventListener("click",event=>{
    const favoriteButton=event.target.closest("[data-favorite-id]");
    if(favoriteButton){
      const id=favoriteButton.dataset.favoriteId;
      if(favorites.has(id))favorites.delete(id);else favorites.add(id);
      saveFavorites();refresh();return;
    }
    const main=event.target.closest("[data-song-id]");
    if(main){const song=SONGS.find(item=>item.id===main.dataset.songId);if(song)openSong(song);}
  });
  refresh();
}
function renderDancecard() {
  updateScreenHeader("PLAYER HUB · YOUR PROFILE","DANCECARD",currentUser);
  const display=currentProfile.displayName||currentUser.displayName||currentUser.email||"Dance Player";
  const email=currentProfile.email||currentUser.email||"Nicht verfügbar";
  const tags=Array.isArray(currentProfile.tags)?currentProfile.tags:[];
  const coins=Number.isSafeInteger(currentProfile.goldCoins)&&currentProfile.goldCoins>=0?currentProfile.goldCoins:0;
  const code=currentUser.uid.slice(-8).toUpperCase();
  const access=isAdmin(currentProfile)?"ADMIN":hasTag(currentProfile,"dance-beta")?"CLOSED BETA":"PLAYER";
  $("#screenContent").innerHTML =
    '<div class="screen-title-row"><div><p class="screen-overline">YOUR PROFILE · PLAYER ID</p><h2 class="screen-title">DEIN DANCEFLOOR. DEIN PROFIL.</h2><p class="screen-lede">Deine TobiServices-Dancecard mit echtem Kontostand, Zugangsstatus und deinen aktuellen Tags.</p></div><span class="screen-chip">ACCOUNT CONNECTED</span></div>' +
    '<div class="dancecard-grid"><article class="player-id-card">' +
      '<header class="player-id-top"><div class="player-id-brand">JUST DANCE <span>NEXT PLAYER CARD</span></div><div class="player-id-season">SEASON <b>01</b></div></header>' +
      '<div class="player-id-main"><div class="player-avatar-stage"><div class="player-avatar-initial">'+escapeHtml(initials(display))+'</div><span class="player-avatar-caption">PLAYER EMBLEM</span></div>' +
      '<div class="player-id-copy"><span class="player-id-label">YOUR DANCE ID</span><h2 class="player-id-name">'+escapeHtml(display)+'</h2><div class="player-id-email">'+escapeHtml(email)+'</div><span class="player-access-stamp"><i></i> '+escapeHtml(access)+' · VERIFIED</span></div></div>' +
      '<footer class="player-id-bottom"><div class="player-id-code"><small>PLAYER CODE</small><strong>'+escapeHtml(code)+'</strong></div><span class="player-code-bars" aria-hidden="true"></span><span class="player-id-star" aria-hidden="true">✦</span></footer>' +
    '</article><div class="dancecard-side">' +
      '<section class="wallet-panel"><div class="wallet-coin" aria-hidden="true">✦</div><div class="wallet-detail"><span>GOLDMÜNZEN</span><strong>'+coins.toLocaleString("de-DE")+'</strong><small>Gemeinsames Guthaben bei TobiServices · read-only in der Dancecard</small></div></section>' +
      '<section class="screen-panel"><h3 class="screen-panel-title">PLAYER DETAILS <small>ACCOUNT DATA</small></h3><div class="dancecard-facts">' +
        '<div class="dancecard-fact"><span>ACCESS LEVEL</span><strong>'+escapeHtml(access)+'</strong></div>' +
        '<div class="dancecard-fact"><span>ACCOUNT STATUS</span><strong>CONNECTED</strong></div>' +
        '<div class="dancecard-fact"><span>PLAYER CODE</span><strong>'+escapeHtml(code)+'</strong></div>' +
        '<div class="dancecard-fact"><span>PROFILE ID</span><strong>'+escapeHtml(currentUser.uid.slice(0,8))+'…</strong></div>' +
      '</div></section>' +
      '<section class="screen-panel"><h3 class="screen-panel-title">YOUR TAGS <small>'+tags.length+' ACTIVE</small></h3><div class="dancecard-tags" id="dancecardTags"></div></section>' +
      (isAdmin(currentProfile)?'<section class="screen-panel"><h3 class="screen-panel-title">ADMIN ACCESS <small>PERSONAL CONTROL</small></h3><p class="bypass-status" id="bypassDescription"></p><div class="dancecard-actions"><button class="screen-btn cyan" type="button" id="toggleBypass">WARTUNGSBYPASS</button><button class="screen-btn secondary" type="button" id="adminCenter">ADMIN CENTER ↗</button></div></section>':'') +
    '</div></div>';
  const tagRoot=$("#dancecardTags");
  if(!tags.length)tagRoot.innerHTML='<span class="screen-muted" style="font-size:10px">Keine Tags zugewiesen</span>';
  else tagRoot.innerHTML=tags.map(tag=>'<span class="dancecard-tag '+(tag==="admin"?"admin":tag==="dance-beta"?"beta":"")+'">'+escapeHtml(tag)+'</span>').join("");
  refreshDancecardStatus();
  $("#toggleBypass")?.addEventListener("click",async()=>{
    const button=$("#toggleBypass");
    button.disabled=true;
    try{
      const enabled=currentProfile.maintenanceBypass!==true;
      await setMaintenanceBypass(enabled);
      currentProfile={...currentProfile,maintenanceBypass:enabled};
      refreshDancecardStatus();
      screenToast(enabled?"Wartungsbypass gespeichert.":"Wartungsbypass deaktiviert.");
      if(maintenance.enabled&&!enabled)go(HOME_URL);
    }catch(error){
      console.error(error);screenToast("Speichern fehlgeschlagen. Prüfe, ob die aktuellen Firestore-Regeln veröffentlicht sind.");
    }finally{if(button.isConnected)button.disabled=false;}
  });
  $("#adminCenter")?.addEventListener("click",()=>go("https://hannonuppi.github.io/Tobiservices-Account/admin.html"));
}
function initials(value){return String(value||"TS").trim().split(/\s+/).slice(0,2).map(part=>part[0]||"").join("").toUpperCase().slice(0,2)||"TS";}
function refreshDancecardStatus(){
  const button=$("#toggleBypass"),description=$("#bypassDescription");
  if(!button)return;
  const active=currentProfile?.maintenanceBypass===true;
  button.textContent=active?"BYPASS DEAKTIVIEREN":"WARTUNGSBYPASS AKTIVIEREN";
  if(description){
    if(!maintenance.loaded||maintenance.error)description.textContent="Wartungsstatus nicht verfügbar. Bitte lade die Seite neu.";
    else if(maintenance.enabled)description.textContent=active?"Wartung ist aktiv; dein Admin-Konto darf sie umgehen.":"JDNEXT ist im Wartungsmodus. Aktiviere deinen persönlichen Bypass.";
    else description.textContent=active?"Der Bypass ist gespeichert und greift, sobald Wartung aktiviert wird.":"Du kannst den persönlichen Bypass vor Beginn einer Wartung aktivieren.";
  }
  button.disabled=!maintenance.loaded||Boolean(maintenance.error);
}
function renderSongDetail(){
  const params=new URLSearchParams(location.search);
  const song=SONGS.find(item=>item.id===params.get("id"));
  const kind=params.get("kind")==="playlist"?"playlist":"song";
  const title=song?.title||params.get("title")||"Song";
  const artist=song?.artist||params.get("artist")||"JDNEXT COLLECTION";
  const edition=song?"JUST DANCE "+song.edition:(params.get("edition")?"JUST DANCE "+params.get("edition"):"JDNEXT FEATURE");
  const accent=safeColor(song?.accent||params.get("accent"),"#5630a9"),accent2=safeColor(song?.accent2||params.get("accent2"),"#d42c91");
  const genre=song?.genre||params.get("genre")||(kind==="playlist"?"PLAYLIST":"POP");
  const difficulty=song?.difficulty||params.get("difficulty")||"—";
  const duration=song?.duration||params.get("duration")||"PREVIEW";
  const favoriteKey=song?.id||"featured-"+slug(title);
  const subtitle=params.get("subtitle")||(kind==="playlist"?"CURATED PLAYLIST":artist);
  updateScreenHeader("LIBRARY · "+(kind==="playlist"?"PLAYLIST DETAILS":"TRACK DETAILS"),title,currentUser);
  $("#screenContent").innerHTML =
    '<div class="screen-title-row"><div><p class="screen-overline">'+escapeHtml(edition)+' · DETAILS</p><h2 class="screen-title">'+escapeHtml(kind==="playlist"?"PLAYLIST SELECTED":"TRACK SELECTED")+'</h2><p class="screen-lede">Wähle den Demo-Player oder markiere diesen Eintrag als Favorit. Dies ist ein Konzeptbildschirm ohne Original-Audio oder echtes Scoring.</p></div><span class="screen-chip">PREVIEW ONLY</span></div>' +
    '<div class="song-detail-grid"><article class="song-detail-art" style="--art-a:'+accent+';--art-b:'+accent2+'"><div class="song-detail-jd">JD <span style="font-size:12px;letter-spacing:2px">NEXT</span></div><div><h2 class="song-detail-title">'+escapeHtml(title)+'</h2><div class="song-detail-artist">'+escapeHtml(artist)+'</div></div><span class="screen-chip">'+escapeHtml(kind==="playlist"?"PLAYLIST":"TRACK DETAILS")+'</span></article>' +
    '<section class="song-detail-copy"><div><p class="screen-overline">READY WHEN YOU ARE</p><h3 class="screen-title" style="font-size:34px">'+escapeHtml(title)+'</h3><p class="screen-lede">'+escapeHtml(subtitle)+'</p></div><div class="detail-stat-row"><div class="detail-stat"><span>EDITION</span><strong>'+escapeHtml(edition)+'</strong></div><div class="detail-stat"><span>GENRE</span><strong>'+escapeHtml(genre)+'</strong></div><div class="detail-stat"><span>DIFFICULTY</span><strong>'+escapeHtml(difficulty)+'</strong></div><div class="detail-stat"><span>DURATION</span><strong>'+escapeHtml(duration)+'</strong></div></div><div class="screen-panel"><h3 class="screen-panel-title">TRACK INFO <small>CONCEPT UI</small></h3><p class="demo-note">'+(song?"Song- und Artistdaten sind Katalog-Metadaten. Covergestaltung und Schwierigkeitsanzeige sind eigene Platzhalter.":"Dieser Eintrag stammt aus der Featured-Ansicht und hat noch keine reale Playlist-Datenquelle.")+' Es wird keine Originalmusik abgespielt und es gibt noch keine Bewegungsauswertung.</p><div class="dancecard-actions"><button class="screen-btn" id="detailPlay">▶ PREVIEW-PLAYER</button><button class="screen-btn secondary" id="detailFavorite">'+(favorites.has(favoriteKey)?"★ FAVORIT GESPEICHERT":"☆ ALS FAVORIT SPEICHERN")+'</button></div></div></section></div>';
  $("#detailPlay").addEventListener("click",()=>go(rootQuery("player.html",{title,artist,subtitle,kind})));
  $("#detailFavorite").addEventListener("click",()=>{
    if(favorites.has(favoriteKey))favorites.delete(favoriteKey);else favorites.add(favoriteKey);
    saveFavorites();
    $("#detailFavorite").textContent=favorites.has(favoriteKey)?"★ FAVORIT GESPEICHERT":"☆ ALS FAVORIT SPEICHERN";
    screenToast(favorites.has(favoriteKey)?"Zu Favoriten hinzugefügt.":"Aus Favoriten entfernt.");
  });
}
function renderPlayer(){
  const params=new URLSearchParams(location.search);
  const title=params.get("title")||"JDNEXT PREVIEW";
  const artist=params.get("artist")||"CONCEPT PLAYER";
  const subtitle=params.get("subtitle")||"DEMO SESSION";
  updateScreenHeader("NOW PLAYING · SIMULATION","PREVIEW PLAYER",currentUser);
  $("#screenContent").innerHTML =
    '<div class="screen-title-row"><div><p class="screen-overline">A LITTLE BIT OF RHYTHM</p><h2 class="screen-title">'+escapeHtml(title)+'</h2><p class="screen-lede">'+escapeHtml(artist)+' · '+escapeHtml(subtitle)+'</p></div><span class="screen-chip">NO AUDIO OUTPUT</span></div>' +
    '<div class="demo-player-screen"><div class="demo-stage" id="demoStage"><div><div class="demo-jd-mark">JD</div><div class="demo-beat-bars">'+[19,40,26,60,33,51,22,43,29,62,25].map((height,i)=>'<i style="--h:'+height+'px;--delay:'+(i*.07)+'s"></i>').join("")+'</div></div></div><div class="demo-player-side"><section class="screen-panel"><h3 class="screen-panel-title">SESSION STATUS <small>PREVIEW</small></h3><p class="demo-note">Dies ist ein animierter 30-Sekunden-UI-Test. Es wird keine Musik abgespielt, keine Karte geladen und kein Score berechnet.</p><div class="demo-time"><span id="demoElapsed">0:00</span><span>0:30</span></div><div class="demo-progress"><span id="demoProgress"></span></div><div class="dancecard-actions"><button class="screen-btn" id="demoToggle">▶ STARTEN</button><button class="screen-btn secondary" id="demoReset">↺ RESET</button></div></section><button class="screen-btn secondary" id="demoBack">← ZUR SONGAUSWAHL</button></div></div>';
  let seconds=0,playing=false,interval=null;
  const update=()=>{
    $("#demoElapsed").textContent="0:"+String(seconds).padStart(2,"0");
    $("#demoProgress").style.width=(seconds/30*100)+"%";
    $("#demoToggle").textContent=playing?"Ⅱ PAUSE":seconds>=30?"↺ ERNEUT STARTEN":"▶ STARTEN";
    $("#demoStage").classList.toggle("paused",!playing);
  };
  $("#demoToggle").addEventListener("click",()=>{
    if(seconds>=30)seconds=0;
    playing=!playing;
    update();
  });
  $("#demoReset").addEventListener("click",()=>{seconds=0;playing=false;update();});
  $("#demoBack").addEventListener("click",()=>go("./catalog.html"));
  interval=window.setInterval(()=>{
    if(!playing)return;
    seconds++;
    if(seconds>=30){seconds=30;playing=false;screenToast("Preview beendet · Kein Gameplay ausgeführt.");}
    update();
  },1000);
  window.addEventListener("pagehide",()=>window.clearInterval(interval),{once:true});
  update();
}
function applySavedPreferences(){
  let reduce=false,contrast=false;
  try{reduce=localStorage.getItem("jdnext-reduce-motion")==="true";contrast=localStorage.getItem("jdnext-high-contrast")==="true";}catch{}
  document.documentElement.classList.toggle("reduce-motion",reduce);
  document.documentElement.classList.toggle("high-contrast",contrast);
}
function renderSettings(){
  updateScreenHeader("SYSTEM · ACCESSIBILITY","EINSTELLUNGEN",currentUser);
  let reduce=false,contrast=false;
  try{reduce=localStorage.getItem("jdnext-reduce-motion")==="true";contrast=localStorage.getItem("jdnext-high-contrast")==="true";}catch{}
  $("#screenContent").innerHTML =
    '<div class="screen-title-row"><div><p class="screen-overline">TUNE YOUR EXPERIENCE</p><h2 class="screen-title">SPIELE DAS MENÜ AUF DEINE ART.</h2><p class="screen-lede">Diese Optionen werden lokal in deinem Browser gespeichert. Sie verändern die Bedienoberfläche, nicht das Gameplay.</p></div><span class="screen-chip">LOCAL SETTINGS</span></div>' +
    '<div class="screen-grid-two"><section class="screen-panel"><h3 class="screen-panel-title">ACCESSIBILITY <small>VISUAL OPTIONS</small></h3><label class="setting-line"><span><strong>Bewegung reduzieren</strong><small>Schaltet dekorative Animationen und Übergänge weitgehend ab.</small></span><input class="screen-toggle" id="settingReduceMotion" type="checkbox" '+(reduce?"checked":"")+'></label><label class="setting-line"><span><strong>Hoher Kontrast</strong><small>Betont Kanten und Rahmen, damit die Karten leichter unterscheidbar sind.</small></span><input class="screen-toggle" id="settingHighContrast" type="checkbox" '+(contrast?"checked":"")+'></label><div class="dancecard-actions"><button class="screen-btn" id="settingsSave">EINSTELLUNGEN SPEICHERN</button></div></section><section class="screen-panel"><h3 class="screen-panel-title">ACCOUNT <small>TOBISERVICES</small></h3><p class="demo-note">Dein Login und deine Tags werden über den zentralen TobiServices-Account verwaltet. In diesem Bildschirm werden keine Passwörter gespeichert.</p><div class="dancecard-facts" style="margin-top:18px"><div class="dancecard-fact"><span>SESSION</span><strong>VERBUNDEN</strong></div><div class="dancecard-fact"><span>ACCESS</span><strong>'+escapeHtml(isAdmin(currentProfile)?"ADMIN":hasTag(currentProfile,"dance-beta")?"CLOSED BETA":"PLAYER")+'</strong></div></div><div class="dancecard-actions"><button class="screen-btn secondary" id="settingsDancecard">DANCECARD ÖFFNEN ↗</button></div></section></div>';
  $("#settingsSave").addEventListener("click",()=>{
    try{
      localStorage.setItem("jdnext-reduce-motion",String($("#settingReduceMotion").checked));
      localStorage.setItem("jdnext-high-contrast",String($("#settingHighContrast").checked));
      applySavedPreferences();screenToast("Einstellungen gespeichert.");
    }catch{screenToast("Speichern nicht möglich. Der Browser blockiert lokalen Speicher.");}
  });
  $("#settingsDancecard").addEventListener("click",()=>go("./dancecard.html"));
  applySavedPreferences();
}
function renderNotifications(){
  updateScreenHeader("PLAYER HUB · INBOX","BENACHRICHTIGUNGEN",currentUser);
  $("#screenContent").innerHTML =
    '<div class="screen-title-row"><div><p class="screen-overline">YOUR LATEST UPDATES</p><h2 class="screen-title">INBOX</h2><p class="screen-lede">Lokale UI-Hinweise für diesen Prototyp. Es werden keine serverseitigen Benachrichtigungen abgerufen.</p></div><span class="screen-chip">LOCAL FEED</span></div>' +
    '<div class="notice-list"><article class="notice-card"><div class="notice-icon">✦</div><div><h3>JDNEXT UI bereit</h3><p>Die Navigation verwendet nun eigene Vollbild-Seiten für Katalog, Dancecard, Settings und weitere Bereiche.</p></div><time>JUST NOW</time></article>' +
    '<article class="notice-card"><div class="notice-icon">◈</div><div><h3>TobiServices verbunden</h3><p>Deine Account-Tags und das gemeinsame Goldmünzen-Guthaben kommen aus deinem Profil.</p></div><time>ACCOUNT</time></article>' +
    '<article class="notice-card"><div class="notice-icon">♫</div><div><h3>Preview-Modus</h3><p>Der Player enthält nur eine visuelle 30-Sekunden-Demo. Er spielt keine Songs ab und wertet keine Bewegungen aus.</p></div><time>INFO</time></article></div>';
}
function renderContent(){
  updateScreenHeader("DISCOVER · SEASON HUB","SEASON HUB",currentUser);
  $("#screenContent").innerHTML =
    '<div class="screen-title-row"><div><p class="screen-overline">A NEW WORLD OF DANCE</p><h2 class="screen-title">YOUR NEXT SEASON STARTS HERE.</h2><p class="screen-lede">Ein eigenständiger Season-Hub für das Konzept. Saisoninhalte, Downloads und Fortschritt sind momentan nicht mit einem Spielserver verbunden.</p></div><span class="screen-chip">SEASON 01 · CONCEPT</span></div>' +
    '<section class="season-feature"><span class="screen-eyebrow">JDNEXT · SEASON COLLECTION</span><div class="season-number">01</div><h2 class="screen-title" style="font-size:clamp(34px,5vw,60px)">NEON FREQUENCY</h2><p>Ein farbenfroher Platzhalter für einen Season-Aufbau mit Featured-Playlists, Song-Kollektionen und kosmetischen Belohnungen.</p><div class="dancecard-actions"><button class="screen-btn cyan" id="hubBrowseSongs">SONG-KATALOG ÖFFNEN ↗</button><button class="screen-btn secondary" id="hubPlaylists">PLAYLISTS ENTDECKEN</button></div></section>' +
    '<div class="screen-grid-three" style="margin-top:16px"><article class="season-card" style="--panel-a:#203e91;--panel-b:#401e76"><small>COLLECTION 01</small><strong>SONG LIBRARY</strong><p>Entdecke Songs aus dem Konzept-Katalog von Just Dance 2024 und 2025.</p><button class="screen-btn secondary" data-hub="catalog">ÖFFNEN →</button></article><article class="season-card" style="--panel-a:#8c235c;--panel-b:#36104e"><small>MADE FOR YOUR MOOD</small><strong>PLAYLISTS</strong><p>Stilisierte Featured-Playlist-Karten mit eigenen Farbwelten.</p><button class="screen-btn secondary" data-hub="playlists">ÖFFNEN →</button></article><article class="season-card" style="--panel-a:#126c79;--panel-b:#322063"><small>PLAYER HUB</small><strong>DANCECARD</strong><p>Dein Kontostand, dein Zugang und deine TobiServices-Tags.</p><button class="screen-btn secondary" data-hub="dancecard">ÖFFNEN →</button></article></div>';
  $("#hubBrowseSongs").addEventListener("click",()=>go("./catalog.html"));
  $("#hubPlaylists").addEventListener("click",()=>go("./playlists.html"));
  $("#screenContent").addEventListener("click",event=>{const btn=event.target.closest("[data-hub]");if(btn)go("./"+btn.dataset.hub+".html");},{once:true});
}
function renderPlaylists(){
  updateScreenHeader("LIBRARY · CURATED MOODS","PLAYLISTS",currentUser);
  $("#screenContent").innerHTML =
    '<div class="screen-title-row"><div><p class="screen-overline">PICK YOUR MOOD</p><h2 class="screen-title">MADE FOR YOUR MOMENT</h2><p class="screen-lede">Featured-Playlists aus der JDNEXT Konzeptoberfläche. Öffne eine Karte, um Details zu sehen.</p></div><span class="screen-chip">4 FEATURED SETS</span></div>' +
    '<div class="playlist-grid">'+FEATURED.map((p,i)=>'<button class="playlist-card" type="button" data-playlist="'+i+'" style="--art-a:'+p.a+';--art-b:'+p.b+'"><small>FEATURED PLAYLIST · 0'+(i+1)+'</small><span><h3>'+escapeHtml(p.title)+'</h3><p>'+escapeHtml(p.subtitle)+'</p></span><small>◷ '+p.duration+' · OPEN ↗</small></button>').join("")+'</div>' +
    '<div class="screen-panel" style="margin-top:18px"><h3 class="screen-panel-title">MORE TRACKS <small>JUST DANCE 2024 / 2025</small></h3><p class="demo-note">Die Songbibliothek bietet Suche, Filter, Favoriten und eigene Detailseiten.</p><button class="screen-btn" id="playlistCatalog">ZUM SONG-KATALOG ↗</button></div>';
  $("#screenContent").addEventListener("click",event=>{
    const card=event.target.closest("[data-playlist]");
    if(!card)return;
    const playlist=FEATURED[Number(card.dataset.playlist)];
    go(rootQuery("song.html",{kind:"playlist",title:playlist.title,artist:"JDNEXT CURATED",subtitle:playlist.subtitle,duration:playlist.duration,accent:playlist.a,accent2:playlist.b,genre:"FEATURED PLAYLIST"}));
  });
  $("#playlistCatalog").addEventListener("click",()=>go("./catalog.html"));
}
function renderLogin(){
  document.body.classList.add("screen-ready");
  updateScreenHeader("PLAYER HUB · SECURE SIGN IN","TOBISERVICES LOGIN",null);
  $("#screenUser")?.classList.add("screen-hidden");
  $("#screenContent").innerHTML =
    '<div class="screen-login-wrap"><section class="login-art"><strong>JD<br>NEXT</strong><small>ONE ACCOUNT · EVERY DANCEFLOOR</small><span class="screen-chip">CLOSED BETA ACCESS</span></section><section class="login-copy"><span class="screen-eyebrow">TOBISERVICES ACCOUNT</span><h2>WELCOME<br>BACK, PLAYER.</h2><p>Melde dich mit deinem TobiServices-Konto an. Zugang zur JDNEXT-Beta erhalten Konten mit dem Tag <b>dance-beta</b> oder <b>admin</b>.</p><form class="login-form" id="screenLoginForm"><label for="screenEmail">E-MAIL-ADRESSE</label><input id="screenEmail" name="email" type="email" autocomplete="username" maxlength="254" required placeholder="name@beispiel.de"><label for="screenPassword">PASSWORT</label><input id="screenPassword" name="password" type="password" autocomplete="current-password" maxlength="128" required placeholder="Dein Passwort"><p class="login-message" id="screenLoginMessage" role="status" aria-live="polite"></p><button class="screen-btn" id="screenLoginSubmit" type="submit">ANMELDEN ↗</button></form><p>Neue Konten werden in Firebase Authentication verwaltet. Diese Seite speichert dein Passwort nicht selbst.</p></section></div>';
  const form=$("#screenLoginForm");
  form.addEventListener("submit",async event=>{
    event.preventDefault();
    const submit=$("#screenLoginSubmit"),message=$("#screenLoginMessage");
    submit.disabled=true;message.classList.remove("error");message.textContent="Anmeldung wird geprüft …";
    try{
      const result=await login($("#screenEmail").value.trim(),$("#screenPassword").value);
      const profile=result.profile;
      if(!profile||profile.disabled===true||!(isAdmin(profile)||hasTag(profile,"dance-beta"))){
        message.classList.add("error");message.textContent="Anmeldung war erfolgreich, aber dieses Konto ist noch nicht für die Closed Beta freigeschaltet.";
        submit.disabled=false;return;
      }
      const requested=new URLSearchParams(location.search).get("return");
      const destination=safeReturnUrl(requested)||new URL("../index.html",location.href).href;
      window.location.replace(destination);
    }catch(error){
      console.error("JDNEXT Anmeldung fehlgeschlagen:",error);
      const code=String(error?.code||"");
      message.classList.add("error");
      if(code.includes("invalid-credential")||code.includes("invalid-login-credentials"))message.textContent="E-Mail-Adresse oder Passwort ist falsch.";
      else message.textContent="Die Anmeldung hat nicht geklappt. Prüfe deine Verbindung und versuche es erneut.";
      submit.disabled=false;
    }
  });
}
function renderScreen(){
  document.documentElement.classList.toggle("reduce-motion",localStorage.getItem("jdnext-reduce-motion")==="true");
  document.documentElement.classList.toggle("high-contrast",localStorage.getItem("jdnext-high-contrast")==="true");
  switch(screenName){
    case "dancecard":renderDancecard();break;
    case "catalog":renderCatalog();break;
    case "song":renderSongDetail();break;
    case "player":renderPlayer();break;
    case "settings":renderSettings();break;
    case "notifications":renderNotifications();break;
    case "content":renderContent();break;
    case "playlists":renderPlaylists();break;
    default:renderContent();
  }
}
if(screenName==="login")renderLogin();
else initializeAccessGuard();
