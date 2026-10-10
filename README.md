# JDNEXT UI — Interactive Prototype

Ein eigenständiger, responsiver Web-UI-Prototyp, der sich am allgemeinen Aufbau des neueren Just-Dance-Menüs orientiert. Die Song-Suche nutzt Titel und Artists aus den offiziellen Tracklists von Just Dance 2024 und 2025. Cover sind eigens gestaltete CSS-Platzhalter; Genre und Schwierigkeitsgrad sind Demo-Metadaten, keine offiziellen In-Game-Werte.

## Interaktionen

- Navigation zu Home, Songs, Playlists, Suche, Profil, weiteren Inhalten und Einstellungen
- Vollständige Katalogsuche mit Textsuche, Edition-, Genre- und Schwierigkeitsfiltern
- Sortierung nach Edition, Songtitel, Artist oder Demo-Schwierigkeit
- Raster- und Listenansicht
- Favoriten mit Speicherung im Browser
- Song-Detailansicht und Demo-Player mit 30-Sekunden-Timer. **Keine echte Musik, Tanzanimation oder Wertung**
- Karussell-Pfeile ordnen Song- und Playlist-Kacheln um
- Einstellungen für reduzierte Bewegung und höheren Kontrast werden lokal im Browser gespeichert
- Spielerprofil öffnet die gemeinsame TobiServices-Account-Anmeldung bzw. das Account-Menü

## TobiServices Accounts

Das UI verwendet das gemeinsame Client-Modul aus [Tobiservices-Account](https://github.com/HannoNuppi/Tobiservices-Account) über dessen veröffentlichte `auth-core.js`. Die Anmeldung erfolgt zentral mit TobiServices-Benutzername und Passwort. JDNEXT UI speichert weder Passwort noch Passwort-Hash und führt keine eigene Passwortprüfung durch.

Die Verbindung setzt voraus, dass GitHub Pages für `Tobiservices-Account` und das Firebase-/Cloud-Functions-Backend korrekt veröffentlicht sind. Für die Anmeldung muss die Website über HTTPS bzw. eine geeignete lokale Entwicklungsumgebung geöffnet werden.

## Administrator-Setup

Die Datei für das Admin-Setup ist absichtlich nicht in der Menü-Navigation verlinkt und trägt `noindex`. Das ist **keine** Zugriffskontrolle: Die Berechtigung wird ausschließlich vom bestehenden Backend durchgesetzt.

- Der Erst-Admin kann nur mit dem geheimen Bootstrap-Schlüssel angelegt werden.
- Das vorhandene Backend erlaubt Bootstrap nur, wenn noch kein Admin-Account besteht.
- Wenn bereits ein Admin existiert, muss ein weiterer Admin im angemeldeten Admin-Modus erstellt werden. Die Seite verwendet dazu die bereits vorhandenen, geschützten Funktionen zum Account-Erstellen und Setzen des `admin`-Tags.
- Bootstrap-Schlüssel und Passwörter stehen nicht als Konstanten im Repository und werden nicht in `localStorage` gespeichert.

## Starten

`index.html` direkt im Browser öffnen oder GitHub Pages unter **Settings → Pages** auf Branch `main` und Verzeichnis `/ (root)` einstellen.

## Dateien

- `index.html` — Menüstruktur
- `styles.css` — Layout, responsives Design und Dialog-/Katalogstile
- `app.js` — UI-Interaktionen, Song-Katalog und TobiServices-Account-Verbindung
- `.nojekyll` — Vorbereitung für GitHub Pages

## Tracklist-Quellen

- [Ubisoft: Just Dance 2024 Edition Song List](https://news.ubisoft.com/en-au/article/4XASVBQVlNLtGtyO6fj1DQ/just-dance-2024-edition-song-list-and-new-mode-details)
- [Ubisoft: Just Dance 2025 Edition](https://news.ubisoft.com/en-gb/article/yJEMRMtbY21JaJZ6JOBMT/just-dance-2025-edition-just-dance-vr-welcome-to-dancity-available-now)

Fan-/Konzeptprojekt, nicht offiziell und nicht mit Ubisoft verbunden. Eigenständige Annäherung an den allgemeinen UI-Stil; keine Original-Songcover oder sonstigen offiziellen Spieldateien enthalten.
