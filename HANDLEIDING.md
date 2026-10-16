# Handleiding — website Nikolas Lestaeghe

## Hoe het werkt

- **GitHub** bewaart de bestanden van de site.
- **Cloudflare Pages** zet de site online. Bij elke wijziging bouwt Cloudflare de site automatisch opnieuw (± 1 minuut). Het gratis plan laat 500 publicaties per maand toe.
- **Pages CMS** (app.pagescms.org) is je beheerpagina: formulieren om projecten, agenda en teksten aan te passen.
- Je domeinnaam blijft bij **one.com**.

De site gebruikt exact de opmaak van de oude site. Er valt niets te updaten en er zijn geen plugins. Je betaalt enkel nog de domeinnaam.

## Eenmalige installatie

1. **GitHub-account** maken op github.com.
2. Op github.com: *New repository* → naam bv. `website` → *Create*. Daarna *uploading an existing file* en sleep de **inhoud** van deze map erin (niet de map zelf). Bevestig met *Commit changes*.
   - Let op: het bestand `.pages.yml` begint met een punt en is soms verborgen op je computer. Op een Mac maak je verborgen bestanden zichtbaar met Cmd + Shift + punt.
3. **Cloudflare-account** maken op dash.cloudflare.com → *Workers & Pages* → *Create* → tabblad *Pages* → *Connect to Git* → kies je repository. Framework preset: *None*, build command: `node build.js`, build output directory: `dist` → *Save and Deploy*. Je krijgt een testadres zoals `website-xxx.pages.dev`.
4. **Beheerpagina**: ga naar app.pagescms.org, meld je aan met GitHub en kies je repository.
5. **Nieuwsbrief**: wordt gekoppeld aan een nieuwsbriefdienst (nog in te stellen).
6. **Domein omzetten** (pas als alles goed staat): in Cloudflare bij je Pages-project → *Custom domains* → `nikolaslestaeghe.com`. Cloudflare toont welke DNS-instellingen nodig zijn; die vul je in bij one.com. Https komt er automatisch bij.

## Een project toevoegen

1. Open app.pagescms.org → kies **website** → **Projecten** → **Add an entry** (of *Nieuw*).
2. Vul in:
   - **Titel** en **Jaar** (bv. `2024` of `2018 – 2026`; het laatste jaartal bepaalt de volgorde).
   - **Titel op de foto** alleen als je hem anders wil afbreken dan de gewone titel.
   - De drie sfeerfoto's, net als vroeger: **grote foto bovenaan**, **foto achter 'In beeld'** en **foto op de projectenpagina**.
   - **Inleiding** (blauw gedrukt), **Tekst**, eventueel een **Citaat** en de **Credits** (één rol per regel).
   - **Foto's** voor de slider en de **Fotocredits**. Foto's sleep je gewoon in het veld.
   - **Links** voor de rechterkolom (pers, partners, ...).
   - De **Speellijst** (zie hieronder).
3. Klik **Save**. Na ongeveer een minuut staat het online.

Tips:
- Werk je nog aan een project? Zet **Zichtbaar op de site** uit tot het klaar is.
- Er staan al drie verborgen projecten klaar: *Attraction Park Under Construction*, *Bonkers kidsrave* en *The Introverse*.
- Foto's: liefst liggend, jpg, ongeveer 2000 pixels breed.
- Video: plak een YouTube- of Vimeo-link, of laad een **.mp4-bestand** op bij *Of een videobestand van je computer*. Maximaal 25 MB (± 1 à 2 minuten). Een groter bestand wordt niet gepubliceerd; de rest van de site werkt dan gewoon verder. Maak de video kleiner (bv. met HandBrake of via *Bestand → Exporteer* in QuickTime, 720p) of gebruik YouTube/Vimeo.

## Speellijsten en agenda

Elk project heeft een eigen speellijst. Daar zijn twee manieren voor:

- **Datum per datum**: in het project bij **Speellijst** op *Add* klikken en datum, uur, plaats, ticketlink en eventueel een opmerking (uitverkocht, première, ...) invullen.
- **Als bestand**: laad bij **Speellijst als Excel- of CSV-bestand** een Excel-bestand (.xlsx) of CSV op, bv. de speellijst die je van de productie of het spreidingsbureau krijgt. De eerste rij met kolomnamen moet minstens een kolom **datum** hebben; verder herkent de site *uur/aanvang*, *locatie/zaal*, *stad/gemeente*, *link/tickets* en *opmerking*. Een titelrij erboven mag. Een nieuwe versie van de speellijst? Laad gewoon het nieuwe bestand op.

Beide mogen ook samen.

Wat de site daarmee doet:
- De **agendapagina** toont alle komende data van alle projecten samen, op datum.
- Voorbije data verhuizen **vanzelf** naar het **archief**, gegroepeerd per jaar. Dat gebeurt telkens iemand de pagina opent, dus ook als je een tijd niets aanpast.
- Op elke **projectpagina** staan onder de credits de komende *Speeldata* en, openklapbaar, *Eerder gespeeld*.

Iets dat niet bij een project hoort (een lezing, een workshop)? Gebruik **Losse agendapunten**.

## Biografie en contactgegevens

Bij **Biografie** en **Algemene gegevens** in de beheerpagina.

## Voor wie verder wil knutselen

- De opmaak is de originele van Pieterjan Volckaert: `static/css/` en `static/js/`. Die bestanden best niet aanpassen.
- Paginaopbouw: `build.js`. Lokaal testen kan met `node build.js`; het resultaat staat dan in `dist/`.
