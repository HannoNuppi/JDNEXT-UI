# JDNEXT UI — Interactive Prototype

Ein eigenständiger, responsiver Web-UI-Prototyp, der sich am allgemeinen Aufbau des neueren Just-Dance-Menüs orientiert. Die Song-Suche nutzt Titel und Artists aus Tracklists von Just Dance 2024 und 2025. Cover sind eigens gestaltete CSS-Platzhalter; Genre und Schwierigkeitsgrad sind Demo-Metadaten, keine offiziellen In-Game-Werte.

## Interaktionen

- Navigation zu Home, Songs, Playlists, Suche, Profil, weiteren Inhalten und Einstellungen
- Katalogsuche mit Textsuche, Edition-, Genre- und Schwierigkeitsfiltern
- Sortierung nach Edition, Songtitel, Artist oder Demo-Schwierigkeit
- Raster- und Listenansicht
- Favoriten mit Speicherung im Browser
- Song-Detailansicht und Demo-Player mit 30-Sekunden-Timer. **Keine echte Musik, Tanzanimation oder Wertung**
- Einstellungen für reduzierte Bewegung und höheren Kontrast werden lokal im Browser gespeichert

## Closed-Beta-Zugang

Die Startseite zeigt zunächst nur den geschlossenen Beta-Zugang. Das JDNEXT-Menü wird im Browser erst nach einer erfolgreichen TobiServices-Anmeldung und einem Profil mit dem Tag `dance-beta` oder `admin` eingeblendet. `admin` hat dabei Vorrang und erhält ebenfalls Zugriff.

Die Zugangssperre auf GitHub Pages ist eine UI-Sperre, keine sichere Auslieferungsgrenze für statische HTML-/JavaScript-Dateien. Für echte geschützte Inhalte müssen Daten und Aktionen zusätzlich serverseitig geprüft werden. Die vorhandenen TobiServices-Admin-Cloud-Functions prüfen Admin-Rechte bereits serverseitig.

## Firebase-Accounts und Tags

JDNEXT UI verwendet das gemeinsame Client-Modul aus [Tobiservices-Account](https://github.com/HannoNuppi/Tobiservices-Account) und meldet Nutzer über **Firebase Authentication (E-Mail + Passwort)** an. Beim ersten Login wird das Profil `users/{UID}` direkt über Firestore angelegt, sofern die veröffentlichten Firestore-Regeln dies für das eigene Konto erlauben. Neue Profile beginnen immer mit `tags: []` und `goldCoins: 0`.

Admin-Rechte werden über das Tag `admin` in `users/{uid}.tags` bestimmt. Nutzer können ihre Tags nicht ändern; Firestore Security Rules erlauben Tag-Schreibzugriffe nur bereits bestehenden Admins. Das JDNEXT-UI speichert keine Passwörter und benötigt keine Cloud Functions für die Anmeldung.

## Ersten Admin sicher einrichten

Für das erste Admin-Konto ist eine einmalige Änderung in der vertrauenswürdigen Firebase Console erforderlich:

1. Firebase Console → Authentication → Users öffnen und die UID des eigenen Kontos kopieren.
2. Firestore Database → `users` öffnen und das Dokument mit genau dieser UID (`users/{UID}`) öffnen bzw. neu anlegen.
3. `email` und `displayName` als Strings und `tags` als Array mit dem String `admin` setzen. Für ein neues Dokument außerdem `createdAt` und `lastProfileChangeAt` als Timestamps hinzufügen.

Danach können Admins weitere Konten in der Tag-Verwaltung freischalten. Es gibt bewusst keinen öffentlichen, unangemeldeten Endpunkt zur Rechtevergabe.

Die Datei `account-setup-7f3c.html` ist nicht in der Navigation verlinkt und trägt `noindex`. Sie ist für eingeloggte Admins zum Verwalten von Tags gedacht. Ihr versteckter Pfad ist keine Sicherheitsgrenze: Jeder Tag-Schreibvorgang wird serverseitig autorisiert.

## Starten und bereitstellen

`index.html` direkt im Browser öffnen oder GitHub Pages unter **Settings → Pages** auf Branch `main` und Verzeichnis `/ (root)` einstellen.

Damit E-Mail-Konten und Tag-Rollen funktionieren, öffne Firebase Console → Firestore Database → Rules und veröffentliche den Inhalt von [`firestore.rules`](https://github.com/HannoNuppi/Tobiservices-Account/blob/main/firestore.rules). Das geht ohne Terminal und ohne Blaze. Die Anwendung benutzt für neue Konten und die Tag-Verwaltung keine Cloud Functions. GitHub-Pages- und Firebase-Liveverhalten wurden hier nicht end-to-end im Browser getestet.

## Dateien

- `index.html` — Menüstruktur
- `styles.css` — Layout, responsives Design und Dialog-/Katalogstile
- `app.js` — UI-Interaktionen, Song-Katalog und Firebase-E-Mail-Anmeldung
- `account-setup-7f3c.html` — nicht verlinkte Admin-Tag-Verwaltung mit Anmeldung
- `.nojekyll` — Vorbereitung für GitHub Pages

Fan-/Konzeptprojekt, nicht offiziell und nicht mit Ubisoft verbunden. Keine Original-Songcover oder sonstigen offiziellen Spieldateien enthalten.
