# Handleiding — website Nikolas Lestaeghe

## Hoe het werkt

- **GitHub** bewaart de bestanden van de site.
- **Netlify** zet de site online. Bij elke wijziging bouwt Netlify de site automatisch opnieuw (± 1 minuut).
- **Pages CMS** (app.pagescms.org) is je beheerpagina: formulieren om projecten, agenda en teksten aan te passen.
- Je domeinnaam blijft bij **one.com**.

De site gebruikt exact de opmaak van de oude site. Er valt niets te updaten en er zijn geen plugins. Je betaalt enkel nog de domeinnaam.

## Eenmalige installatie

1. **GitHub-account** maken op github.com.
2. Op github.com: *New repository* → naam bv. `website` → *Create*. Daarna *uploading an existing file* en sleep de **inhoud** van deze map erin (niet de map zelf). Bevestig met *Commit changes*.
   - Let op: het bestand `.pages.yml` begint met een punt en is soms verborgen op je computer. Op een Mac maak je verborgen bestanden zichtbaar met Cmd + Shift + punt.
3. **Netlify-account** maken op netlify.com, aanmelden met GitHub → *Add new site → Import an existing project* → kies je repository. De instellingen worden automatisch herkend → *Deploy*. Je krijgt een testadres zoals `iets.netlify.app`.
4. **Beheerpagina**: ga naar app.pagescms.org, meld je aan met GitHub en kies je repository.
5. **Nieuwsbrief**: in Netlify bij *Forms* het formulier aanzetten (*Enable form detection*) en bij *Form notifications* je e-mailadres invullen. Elke inschrijving komt dan in je mailbox.
6. **Domein omzetten** (pas als alles goed staat): in Netlify *Domain management → Add a domain* → `nikolaslestaeghe.com`. Netlify toont welke DNS-instellingen je bij one.com moet invullen. Pas die aan in het one.com-controlepaneel bij *DNS-instellingen*. Https komt er automatisch bij.

## Een project toevoegen

1. Open app.pagescms.org → **Projecten** → **Add an entry**.
2. Vul titel, jaar, tekst, credits en foto's in. Elk project heeft drie sfeerfoto's, net als vroeger: de grote foto bovenaan, de foto achter 'In beeld' en de tegel op de projectenpagina. Daaronder komen de foto's van de slider. Foto's sleep je gewoon in het veld.
3. Klik **Save**. Na ongeveer een minuut staat het online.

Tips:
- Het jaar bepaalt de volgorde. Bij een lopend project schrijf je bv. `2018 – 2026`.
- Verberg een project dat nog niet klaar is met **Zichtbaar op de site** uit te zetten.
- Er staan al drie verborgen projecten klaar om in te vullen: *Attraction Park Under Construction*, *Bonkers kidsrave* en *The Introverse*.
- Foto's: liefst jpg, ongeveer 2000 pixels breed. Grotere foto's maken de site traag. Liggende foto's werken het best.

## Agenda

**Agenda → Add an entry**: datum, titel, plaats en eventueel een link. Voorbije data verhuizen vanzelf naar het archief. Koppel je een project, dan linkt de titel naar de projectpagina. 

## Biografie en contactgegevens

Bij **Biografie** en **Algemene gegevens** in de beheerpagina.

## Voor wie verder wil knutselen

- De opmaak is de originele van Pieterjan Volckaert: `static/css/` en `static/js/`. Die bestanden best niet aanpassen.
- Paginaopbouw: `build.js`. Lokaal testen kan met `node build.js`; het resultaat staat dan in `dist/`.
