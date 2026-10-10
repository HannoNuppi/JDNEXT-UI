# JDNEXT UI — Interactive Prototype

Ein eigenständiger, responsiver Web-UI-Prototyp, der sich am allgemeinen Aufbau des neueren Just-Dance-Menüs orientiert. Eigene CSS-Platzhaltergrafiken, keine Original-Songcover oder Spieldateien.

## Interaktionen

- Linke Navigation: Home, Song-/Playlist-Bereich, Suche, Benachrichtigungen, Profil, mehr Inhalte und Einstellungen
- Katalogsuche über die sichtbaren Songs und Playlists
- Song- und Playlist-Karten öffnen eine Detailansicht und lassen sich auswählen
- Demo-Player mit 30-Sekunden-Timer, Start/Pause und Neustart. **Keine echte Musik, Tanzanimation oder Wertung**
- Pfeile sortieren die angezeigten Kacheln um; Tastaturbedienung mit Enter/Leertaste, Escape und Taste F für die Suche
- Einstellungen für reduzierten Bewegungsumfang und höheren Kontrast werden lokal im Browser gespeichert
- Profilknopf öffnet die zentrale TobiServices-Anmeldung bzw. das Account-Menü

## TobiServices Accounts

JDNEXT UI verwendet das bestehende gemeinsame Client-Modul aus [Tobiservices-Account](https://github.com/HannoNuppi/Tobiservices-Account) über dessen veröffentlichte `auth-core.js`. Die Anmeldung erfolgt zentral mit TobiServices-Benutzername und Passwort. Das JDNEXT-UI speichert weder Passwort noch Passwort-Hash und führt keine eigene Passwortprüfung durch.

- Angemeldete Accounts werden oben rechts im Spielerprofil angezeigt.
- Das Profilmenü führt zur zentralen Account-Seite; Accounts mit Admin-Tag sehen außerdem den Admin-Center-Link.
- Neue Konten werden weiterhin zentral durch einen TobiServices-Admin angelegt; es gibt keine lokale Selbstregistrierung.
- Die Integration setzt voraus, dass GitHub Pages für `Tobiservices-Account` veröffentlicht ist und dessen Firebase Authentication/Cloud Functions ordnungsgemäß bereitgestellt sind. Zugangsdaten bitte nur auf der erwarteten HTTPS-Seite eingeben.

## Starten

Lokal kann `index.html` im Browser geöffnet werden. Für die Anmeldung mit dem zentralen Account-System muss der Prototyp über HTTPS/localhost laufen, und der veröffentlichte `auth-core.js`-Pfad muss erreichbar sein.

Für GitHub Pages: Repository → **Settings → Pages** → Branch `main`, Ordner `/ (root)`.

## Dateien

- `index.html` — Menüstruktur
- `styles.css` — Layout, responsives Design und Dialog-/Interaktionsstile
- `app.js` — UI-Interaktionen und TobiServices-Account-Verbindung
- `.nojekyll` — Vorbereitung für GitHub Pages

Fan-/Konzeptprojekt, nicht offiziell und nicht mit Ubisoft verbunden. Eigenständige Annäherung an den allgemeinen UI-Stil; kein pixelgenauer Nachbau offizieller Spieldateien.
