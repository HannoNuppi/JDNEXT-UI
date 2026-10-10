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

## Firebase-Accounts und Tags

JDNEXT UI verwendet das gemeinsame Client-Modul aus [Tobiservices-Account](https://github.com/HannoNuppi/Tobiservices-Account) und meldet Nutzer über **Firebase Authentication (E-Mail + Passwort)** an. Beim ersten Login erzeugt die geschützte Cloud Function `ensureUserProfile` ein Profil für die UID, falls es noch fehlt. Dieses Profil bekommt anfangs immer `tags: []`.

Admin-Rechte werden ausschließlich über das Tag `admin` in `users/{uid}.tags` bestimmt. Das JDNEXT-UI kann selbst keine Admin-Rechte vergeben und speichert keine Passwörter. Die Firestore-Regeln lassen Client-Schreibzugriffe auf Nutzerprofile nicht zu; Tag-Änderungen erfolgen über geschützte Cloud Functions.

## Ersten Admin sicher einrichten

Für das erste Admin-Konto ist eine einmalige Änderung in der vertrauenswürdigen Firebase Console erforderlich:

1. Firebase Console → Authentication → Users öffnen und die UID des eigenen Kontos kopieren.
2. Firestore Database → `users` öffnen und das Dokument mit genau dieser UID (`users/{UID}`) öffnen bzw. neu anlegen.
3. `email` und `displayName` als Strings und `tags` als Array mit dem String `admin` setzen. Für ein neues Dokument außerdem `createdAt` und `lastProfileChangeAt` als Timestamps hinzufügen.

Danach können Admins weitere Konten in der Tag-Verwaltung freischalten. Es gibt bewusst keinen öffentlichen, unangemeldeten Endpunkt zur Rechtevergabe.

Die Datei `account-setup-7f3c.html` ist nicht in der Navigation verlinkt und trägt `noindex`. Sie ist für eingeloggte Admins zum Verwalten von Tags gedacht. Ihr versteckter Pfad ist keine Sicherheitsgrenze: Jeder Tag-Schreibvorgang wird serverseitig autorisiert.

## Starten und bereitstellen

`index.html` direkt im Browser öffnen oder GitHub Pages unter **Settings → Pages** auf Branch `main` und Verzeichnis `/ (root)` einstellen.

Damit native E-Mail-Konten und Tag-Rollen funktionieren, muss das Firebase-Backend aus dem Repository [Tobiservices-Account](https://github.com/HannoNuppi/Tobiservices-Account) veröffentlicht sein:

`firebase deploy --only functions,firestore`

Bestätige beim Deploy die Entfernung der alten Function `bootstrapTobiAdmin`, falls Firebase danach fragt. GitHub-Pages- und Firebase-Liveverhalten wurden hier nicht end-to-end im Browser getestet.

## Dateien

- `index.html` — Menüstruktur
- `styles.css` — Layout, responsives Design und Dialog-/Katalogstile
- `app.js` — UI-Interaktionen, Song-Katalog und Firebase-E-Mail-Anmeldung
- `account-setup-7f3c.html` — nicht verlinkte Admin-Tag-Verwaltung mit Anmeldung
- `.nojekyll` — Vorbereitung für GitHub Pages

Fan-/Konzeptprojekt, nicht offiziell und nicht mit Ubisoft verbunden. Keine Original-Songcover oder sonstigen offiziellen Spieldateien enthalten.
