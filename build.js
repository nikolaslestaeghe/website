// Bouwt de website van Nikolas Lestaeghe in de originele opmaak (ontwerp Pieterjan Volckaert).
// Geen extra pakketten nodig: `node build.js` zet alles in de map dist/.
// Inhoud: content/ (aan te passen via de beheerpagina)
// Opmaak: static/css/ en static/js/ (de originele Webflow-bestanden, ongewijzigd)

const fs = require("fs");
const path = require("path");
const { leesBestand, leesDatum, leesPeriode, leesUur } = require("./speellijst");

const ROOT = __dirname;
const CONTENT = path.join(ROOT, "content");
const STATIC = path.join(ROOT, "static");
const OUT = path.join(ROOT, "dist");

// De oude projecten hebben hun foto's in de originele stylesheet staan,
// met aparte (kleinere) versies voor tablet en gsm. Zolang de foto in de
// beheerpagina dezelfde blijft, gebruiken we die originele klassen.
// Kies je een andere foto, dan wint de nieuwe foto.
const ORIGINEEL = {
  pretparkinopbouw: { top: ["foto-pretpark", "/images/pretparktop.jpg"], achter: ["achterfoto-pretpark", "/images/pretpark7.jpg"], tegel: ["pretparkinopbouw", "/images/pretpark5.jpg"] },
  loopgravenoperette: { top: ["foto-loopgraven", "/images/Loopgravenoperette29.jpg"], achter: ["achterfoto-loopgraven", "/images/Loopgravenoperette2.jpg"], tegel: ["loopgravenoperette", "/images/Loopgravenoperette2.jpg"] },
  "giros-5": { top: ["foto-giros", "/images/JongWilt2014_4432 (2).jpg"], achter: ["achterfoto-giros", "/images/JongWilt2014_4482.jpg"], tegel: ["giros", "/images/JongWilt2014_4460.jpg"] },
  "groet-2": { top: ["foto-groet", "/images/01_1.jpg"], achter: ["achterfoto-groet", "/images/06_1.jpg"], tegel: ["salute", "/images/01_3.jpg"] },
  "hut-ii": { top: ["foto-hutii", "/images/4hoog-hut-1ccarolinevincart.jpg"], achter: ["achterfoto-hutii", "/images/4hoog-hut-2ccarolinevincart.jpg"], tegel: ["hut-ii", "/images/4hoog-hut-3ccarolinevincart.jpg"] },
  republiekderdromen: { top: ["foto-republiek", "/images/07.jpg"], achter: ["achterfoto-republiek", "/images/02_1.jpg"], tegel: ["republiek", "/images/11_1.jpg"] },
  manita: { top: ["foto-manita", "/images/Schermafbeelding 2014-07-12 om 18.11.46.png"], achter: ["achterfoto-manita", "/images/07 kopie.jpg"], tegel: ["manita", "/images/08 kopie.jpg"] },
  "hut-i": { top: ["foto-huti", "/images/01_4.jpg"], achter: ["achterfoto-huti", "/images/04_4.jpg"], tegel: ["hut-i", "/images/04 kopie.jpg"] },
  rosalie: { top: ["foto-rosalie", "/images/10.jpg"], achter: ["achterfoto-rosalie", "/images/04_1.jpg"], tegel: ["rosalie", "/images/02_3.jpg"] },
};
const BIO_ORIGINEEL = "/images/JongWilt2014_4495 kopie.jpg";
const HOME_ORIGINEEL = "/images/L1110073.jpg";

// ---------- hulpfuncties ----------

const readJSON = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const readCollection = (dir) => {
  const full = path.join(CONTENT, dir);
  if (!fs.existsSync(full)) return [];
  return fs.readdirSync(full).filter((f) => f.endsWith(".json"))
    .map((f) => ({ ...readJSON(path.join(full, f)), slug: f.replace(/\.json$/, "") }));
};
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const lines = (text) => esc(String(text ?? "").trim()).replace(/\n/g, "\n              <br>");
const paragraphs = (text, cls) => String(text ?? "").trim().split(/\n\s*\n/).filter((p) => p.trim())
  .map((p) => `<p class="${cls}">${lines(p)}</p>`).join("\n            ");
// Tekst uit de beheerpagina krijgt de originele klasse "brood"
const rich = (html) => String(html ?? "").replace(/<p(\s[^>]*)?>/g, '<p class="brood">');
const asArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const cssUrl = (u) => `url('${String(u).replace(/'/g, "%27")}')`;
const sortYear = (j) => { const m = String(j ?? "").match(/\d{4}/g); return m ? parseInt(m[m.length - 1], 10) : 0; };

// Klasse + eventueel inline foto (als de foto afwijkt van het origineel)
const fotoAttr = (base, orig, gekozen, extraStyle = "") => {
  const cls = [base];
  let style = "";
  if (orig && (!gekozen || gekozen === orig[1])) cls.push(orig[0]);
  else if (gekozen) style = `background-image:${cssUrl(gekozen)};${extraStyle}`;
  else style = "background-color:#4778ff;"; // nog geen foto: blauw vlak in de huisstijl
  return `class="${cls.join(" ")}"${style ? ` style="${esc(style)}"` : ""}`;
};

const videoEmbed = (url) => {
  if (!url) return "";
  let m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (m) return `https://www.youtube.com/embed/${m[1]}`;
  m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (m) return `https://player.vimeo.com/video/${m[1]}`;
  return "";
};

const todayISO = () => new Date().toISOString().slice(0, 10);

// ---------- te grote bestanden ----------
// Cloudflare publiceert geen bestanden groter dan 25 MB. Zo'n bestand zou de hele site blokkeren,
// dus we laten het weg en melden het in het logboek.
const MAX_BYTES = 25 * 1024 * 1024 - 64 * 1024;
const teGroot = new Set();
(function zoek(dir) {
  for (const naam of fs.readdirSync(dir)) {
    const vol = path.join(dir, naam);
    const st = fs.statSync(vol);
    if (st.isDirectory()) zoek(vol);
    else if (st.size > MAX_BYTES) teGroot.add("/" + path.relative(STATIC, vol).split(path.sep).join("/"));
  }
})(STATIC);
const mb = (bytes) => (bytes / 1024 / 1024).toFixed(0);

// ---------- inhoud ----------

const site = readJSON(path.join(CONTENT, "site.json"));
const bio = readJSON(path.join(CONTENT, "biografie.json"));
const projects = readCollection("projecten").filter((p) => p.zichtbaar !== false)
  .sort((a, b) => sortYear(b.jaar) - sortYear(a.jaar) || (b.volgorde || 0) - (a.volgorde || 0));
const alleProjecten = readCollection("projecten");

// ---------- speeldata ----------
// Alle data komen samen uit: de speellijst van elk project (ingevuld of als bestand)
// en de losse agendapunten.
const waarschuwingen = [];
const speeldata = [];
const voegToe = (d, extra) => {
  const periode = d.tot ? { datum: d.datum, tot: d.tot, dagen: d.dagen || "" } : leesPeriode(d.datum);
  if (!periode.datum) return;
  speeldata.push({ ...periode, uur: d.uur ? leesUur(d.uur) : "", locatie: d.locatie || "", link: d.link || "", opmerking: d.opmerking || "", ...extra });
};
for (const p of alleProjecten) {
  const extra = { titel: p.titel, titel_en: (p.en && p.en.titel) || "", slug: p.zichtbaar === false ? null : p.slug };
  asArray(p.speellijst).forEach((d) => voegToe(d, extra));
  for (const bestandNaam of asArray(p.speellijst_bestand).filter(Boolean)) {
    const bestand = path.join(STATIC, String(bestandNaam).replace(/^\//, ""));
    try {
      const rijen = leesBestand(bestand);
      if (!rijen.length) waarschuwingen.push(`Geen datums gevonden in ${bestandNaam} (${p.titel}). Staat er bovenaan een rij met kolomnamen (datum, locatie, ...)?`);
      if (rijen.onbekend && rijen.onbekend.length) waarschuwingen.push(`Kolommen niet herkend in ${bestandNaam} (${p.titel}): ${rijen.onbekend.join(", ")}. Die worden niet getoond.`);
      rijen.forEach((d) => voegToe(d, extra));
    } catch (e) {
      waarschuwingen.push(`Kon ${bestandNaam} (${p.titel}) niet lezen: ${e.message}`);
    }
  }
}
for (const a of readCollection("agenda")) {
  const key = String(a.project || "").split("/").pop().replace(/\.json$/, "");
  const proj = key && alleProjecten.find((p) => p.slug === key);
  voegToe(a, { titel: a.titel || (proj && proj.titel) || "", titel_en: a.titel_en || (!a.titel && proj && proj.en && proj.en.titel) || "", slug: proj && proj.zichtbaar !== false ? proj.slug : null });
}
// dubbels weglaten, sorteren op datum en uur
const gezien = new Set();
const agenda = speeldata
  .filter((d) => { const k = [d.datum, d.uur, d.titel, d.locatie].join("|").toLowerCase(); if (gezien.has(k)) return false; gezien.add(k); return true; })
  .sort((a, b) => (a.datum + a.uur).localeCompare(b.datum + b.uur));
const upcoming = agenda.filter((a) => a.tot >= todayISO());
const past = agenda.filter((a) => a.tot < todayISO()).reverse();

const SITE_URL = "https://www.nikolaslestaeghe.com";

// ---------- scripts onderaan elke pagina ----------

// Verschuift data die intussen voorbij zijn naar het archief, telkens iemand de pagina bekijkt.
// Zo blijft de agenda juist, ook als de site een tijd niet opnieuw gebouwd werd.
const datumScript = `  <script>
  (function () {
    var t = new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; };
    var vandaag = t.getFullYear() + "-" + p(t.getMonth() + 1) + "-" + p(t.getDate());
    var blokken = document.querySelectorAll("[data-komend]");
    for (var i = 0; i < blokken.length; i++) {
      var komend = blokken[i], archief = document.getElementById(komend.getAttribute("data-komend"));
      if (!archief) continue;
      var items = komend.querySelectorAll("[data-datum]"), verplaatst = 0;
      for (var j = 0; j < items.length; j++) {
        var d = items[j].getAttribute("data-datum");
        if (d < vandaag) {
          var jaar = archief.querySelector("details[data-jaar='" + d.slice(0, 4) + "']");
          if (!jaar && archief.querySelector("details[data-jaar]")) {
            jaar = archief.querySelector("details[data-jaar]").cloneNode(true);
            jaar.removeAttribute("open");
            jaar.setAttribute("data-jaar", d.slice(0, 4));
            jaar.querySelector("summary").firstChild.nodeValue = d.slice(0, 4) + " ";
            jaar.querySelector("[data-items]").innerHTML = "";
            archief.insertBefore(jaar, archief.firstChild);
          }
          if (jaar) {
            var lijst = jaar.querySelector("[data-items]");
            lijst.insertBefore(items[j], lijst.firstChild);
            var tel = jaar.querySelector("[data-aantal]");
            if (tel) tel.textContent = lijst.querySelectorAll("[data-datum]").length;
          } else {
            archief.insertBefore(items[j], archief.firstChild);
          }
          verplaatst++;
        }
      }
      if (verplaatst) {
        var wrap = archief.closest ? archief.closest("[data-archief]") : null;
        if (wrap) wrap.style.display = "";
        var teller = document.querySelector("[data-teller='" + archief.id + "']");
        if (teller) teller.textContent = archief.querySelectorAll("[data-datum]").length;
      }
      // maanden die intussen leeg zijn verbergen, en de eerstvolgende maand openklappen
      var maanden = komend.querySelectorAll("details[data-maand]"), eerste = true;
      for (var m = 0; m < maanden.length; m++) {
        var n = maanden[m].querySelectorAll("[data-datum]").length;
        if (!n) { maanden[m].style.display = "none"; continue; }
        var t = maanden[m].querySelector("[data-aantal]"); if (t) t.textContent = n;
        if (eerste) { maanden[m].open = true; eerste = false; }
      }
      if (!komend.querySelector("[data-datum]")) {
        var leeg = komend.querySelector("[data-leeg]");
        if (leeg) leeg.style.display = "";
      }
    }
  })();
  </script>`;

const scripts = `${datumScript}
  <script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js"></script>
  <script type="text/javascript" src="/js/webflow.js"></script>
</body>
</html>
`;

// ---------- talen ----------
// Nederlands staat op de gewone adressen (/giros-5.html), Engels onder /en/ (/en/giros-5.html).
// Velden met "_en" achteraan (titel_en, tekst_en, ...) zijn de Engelse versie.
// Is een Engels veld leeg, dan toont de Engelse site de Nederlandse tekst.

const TALEN = {
  nl: {
    code: "nl", pre: "", ander: "en", anderLabel: "EN", anderNaam: "English",
    projecten: "Projecten", agenda: "Agenda", filterAlles: "Alles", filterEigen: "Eigen werk", filterSamen: "Samenwerkingen", contact: "Contact", biografie: "Biografie", home: "Home",
    inBeeld: "IN\n            <br>BEELD", media: "Media", credits: "Credits",
    speeldata: "Speeldata", geenGepland: "Momenteel geen geplande voorstellingen.", eerderGespeeld: "Eerder gespeeld",
    archief: "Archief", agendaLeeg: "Binnenkort nieuwe data. Abonneer je op de nieuwsbrief om niets te missen.",
    infoTickets: "Info en tickets", tickets: "tickets", meerFotos: "Binnenkort meer foto’s",
    email: "E-mail", telefoon: "Telefoon", nbTitel: "Abonneer je op Nikolas’ onregelmatige nieuwsbrief",
    nbVeld: "E-mailadres...", nbKnop: "Verstuur", nbDank: "Dank je wel! Bevestig je inschrijving via de mail die je zo dadelijk krijgt.",
    webontwerp: "Webontwerp", en: " en ",
    maanden: ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"],
    maandenHoofd: ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"],
    datum: (d, m, j) => `${d} ${m} ${j}`,
    bedanktTitel: "Dank je wel!", bedanktTekst: (pre) => `We hebben je adres ontvangen. <a href="${pre}/" style="color:#4778ff">Terug naar de voorpagina</a>.`,
    nietGevondenTitel: "Oeps", nietGevondenTekst: (pre) => `Deze pagina bestaat niet (meer). Bekijk de <a href="${pre}/projecten.html" style="color:#4778ff">projecten</a>.`,
    opmerkingen: {},
  },
  en: {
    code: "en", pre: "/en", ander: "nl", anderLabel: "NL", anderNaam: "Nederlands",
    projecten: "Projects", agenda: "Agenda", filterAlles: "All", filterEigen: "Own work", filterSamen: "Collaborations", contact: "Contact", biografie: "Biography", home: "Home",
    inBeeld: "IN\n            <br>PICTURES", media: "Media", credits: "Credits",
    speeldata: "Dates", geenGepland: "No performances scheduled at the moment.", eerderGespeeld: "Past performances",
    archief: "Archive", agendaLeeg: "New dates coming soon. Subscribe to the newsletter so you don’t miss a thing.",
    infoTickets: "Info and tickets", tickets: "tickets", meerFotos: "More photos coming soon",
    email: "E-mail", telefoon: "Phone", nbTitel: "Subscribe to Nikolas’ irregular newsletter",
    nbVeld: "E-mail address...", nbKnop: "Send", nbDank: "Thank you! Please confirm your subscription via the e-mail you will receive shortly.",
    webontwerp: "Web design", en: " and ",
    maanden: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    maandenHoofd: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    datum: (d, m, j) => `${d} ${m} ${j}`,
    bedanktTitel: "Thank you!", bedanktTekst: (pre) => `We have received your address. <a href="${pre}/" style="color:#4778ff">Back to the homepage</a>.`,
    nietGevondenTitel: "Oops", nietGevondenTekst: (pre) => `This page does not exist (anymore). Have a look at the <a href="${pre}/projecten.html" style="color:#4778ff">projects</a>.`,
    // Veelvoorkomende opmerkingen uit speellijsten (kleine letters)
    opmerkingen: {
      "schoolvoorstelling": "school performance", "schoolvoorstellingen": "school performances",
      "premiere": "premiere", "première": "premiere", "avant-première": "preview", "try-out": "try-out", "tryout": "try-out",
      "uitverkocht": "sold out", "volzet": "sold out", "geannuleerd": "cancelled", "afgelast": "cancelled", "cancelled": "cancelled",
      "toonmoment": "showing", "familievoorstelling": "family performance", "gratis": "free", "première!": "premiere!",
    },
  },
};

function bouwTaal(L) {
  const P = L.pre; // voorvoegsel voor interne links
  const vertaling = (obj, veld) => {
    if (!obj) return "";
    const v = obj.en && typeof obj.en === "object" ? obj.en[veld] : obj[veld + "_en"];
    return String(v ?? "").replace(/<p>\s*<\/p>/g, "").trim() ? v : "";
  };
  const tr = (obj, veld) => (L.code === "en" && vertaling(obj, veld) ? vertaling(obj, veld) : obj ? obj[veld] : "");
  const titelVan = (p) => tr(p, "titel");
  const kop = (p) => {
    const en = L.code === "en" && (vertaling(p, "kop") || vertaling(p, "titel"));
    return lines(en || p.kop || p.titel).replace(/\n\s*/g, "");
  };
  const opmerking = (o) => (o && L.opmerkingen[String(o).trim().toLowerCase()]) || o;

  const formatDate = (iso) => {
    const d = new Date(iso + "T12:00:00");
    return isNaN(d) ? esc(iso) : L.datum(d.getDate(), L.maanden[d.getMonth()], d.getFullYear());
  };
  const formatPeriode = (a) => {
    if (!a.dagen || a.tot === a.datum) return formatDate(a.datum);
    const d = new Date(a.datum + "T12:00:00");
    return L.datum(a.dagen.replace(/ en /g, L.en), L.maanden[d.getMonth()], d.getFullYear());
  };

  // ---------- vaste stukken (originele markup) ----------

  const head = (title, bestand) => `<!DOCTYPE html>
<!-- Oorspronkelijk ontwerp: Pieterjan Volckaert (Webflow) -->
<html lang="${L.code}">
<head>
  <meta charset="utf-8">
  <title>${esc(site.naam)}${title ? ` - ${esc(title)}` : ""}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="alternate" hreflang="nl" href="${SITE_URL}${paginaUrl("", bestand)}">
  <link rel="alternate" hreflang="en" href="${SITE_URL}${paginaUrl("/en", bestand)}">
  <link rel="stylesheet" type="text/css" href="/css/normalize.css">
  <link rel="stylesheet" type="text/css" href="/css/webflow.css">
  <link rel="stylesheet" type="text/css" href="/css/nikolaslestaeghenoimages.webflow.css">
  <link rel="stylesheet" type="text/css" href="/css/aanvullingen.css">
  <script src="https://ajax.googleapis.com/ajax/libs/webfont/1.4.7/webfont.js"></script>
  <script>
    if (window.WebFont) WebFont.load({
      google: {
        families: ["Montserrat:400,700"]
      }
    });
  </script>
  <script type="text/javascript" src="/js/modernizr.js"></script>
  ${site.icoon
    ? `<link rel="icon" href="${esc(site.icoon)}">\n  <link rel="apple-touch-icon" href="${esc(site.icoon)}">`
    : `<link rel="icon" type="image/png" sizes="32x32" href="/icoon-32.png">\n  <link rel="icon" href="/favicon.ico" sizes="any">\n  <link rel="apple-touch-icon" href="/apple-touch-icon.png">`}
</head>
<body>`;

  // Taalknop: verwijst naar dezelfde pagina in de andere taal
  const taalLink = (bestand, cls) =>
    `<a class="${cls} taalkeuze" href="${paginaUrl(TALEN[L.ander].pre, bestand)}" hreflang="${L.ander}" lang="${L.ander}" title="${L.anderNaam}">${L.anderLabel}</a>`;

  const menu = (bestand) =>
    `<div class="republiek-absoluut"><a class="menu-top" href="${P}/biografie.html">${esc(site.naam)}</a><a class="menu-top" href="${P}/projecten.html">${L.projecten}</a><a class="menu-top" href="${P}/agenda.html">${L.agenda}</a><a class="menu-top" href="#email-form">${L.contact}</a>${taalLink(bestand, "menu-top")}
      </div>`;

  const menuHomepagina = (bestand) => `<div class="republiek-absoluut"><a class="menu-top homepagina" href="${P}/">${esc(site.naam)}</a><a class="menu-top homepagina" href="${P}/projecten.html">${L.projecten}</a><a class="menu-top homepagina" href="${P}/agenda.html">${L.agenda}</a><a class="menu-top homepagina" href="#email-form">${L.contact}</a>${taalLink(bestand, "menu-top homepagina")}
      </div>`;

  const footer = () => `  <div class="republiek-createdbalk">
    <div class="w-container">
      <div class="w-row">
        <div class="w-col w-col-3">
          <p>${L.email}</p><a class="email" href="mailto:${esc(site.email)}" target="_blank">${esc(site.email).replace("@", " @")}</a>
          ${site.telefoon ? `<p>${L.telefoon}</p><a class="telefoon" href="tel:${esc(site.telefoon.replace(/[^\d+]/g, ""))}" target="_blank">${esc(site.telefoon)}</a>` : ""}
          ${asArray(site.links).map((l) => `<a class="telefoon" href="${esc(l.link)}" target="_blank">${esc(tr(l, "titel"))}</a>`).join("")}
        </div>
        <div class="w-col w-col-7">
          ${site.nieuwsbrief !== false && site.nieuwsbrief_url ? `<p>${L.nbTitel}&nbsp;</p>
          <div>
            <form class="form" id="email-form" method="POST" action="${esc(site.nieuwsbrief_url)}" onsubmit="return nieuwsbrief(this)">
              <input type="text" name="email_address_check" value="" tabindex="-1" autocomplete="off" style="display:none">
              <input type="hidden" name="locale" value="${L.code}">
              <input class="w-input" id="email" type="email" placeholder="${L.nbVeld}" name="EMAIL" required="required">
              <input class="w-button form-button" type="submit" value="${L.nbKnop}">
            </form>
            <div class="gelukt" style="display:none;padding:10px 15px;margin-bottom:19px"><p style="margin:0">${L.nbDank}</p></div>
          </div>
          <script>
            function nieuwsbrief(f) {
              if (!window.fetch || !window.FormData) return true; // oude browser: gewoon versturen
              fetch(f.action, { method: "POST", body: new FormData(f), mode: "no-cors" }).finally(function () {
                f.style.display = "none";
                f.nextElementSibling.style.display = "";
              });
              return false;
            }
          </script>` : `<span id="email-form"></span>`}
        </div>
        <div class="w-col w-col-2">
          <p>${L.webontwerp}</p>${site.ontwerp_link ? `<a class="ontwerper" href="${esc(site.ontwerp_link)}" target="_blank">${esc(site.ontwerp)}</a>` : `<span class="ontwerper">${esc(site.ontwerp || "")}</span>`}
        </div>
      </div>
    </div>
  </div>`;

  const mediaKolom = (items) => {
    const list = asArray(items);
    if (!list.length) return `<div class="w-col w-col-2 w-col-stack"></div>`;
    return `<div class="w-col w-col-2 w-col-stack">
            <div class="republiek-media">
              <p class="hoofding-links">${L.media}</p>${list.map((m) => m.afbeelding
      ? `<a class="w-inline-block" href="${esc(m.link)}" target="_blank"><img class="logo" src="${esc(m.afbeelding)}" alt="${esc(tr(m, "titel"))}"></a>`
      : `<a class="menu-top media" href="${esc(m.link)}" target="_blank">${esc(tr(m, "titel"))}</a>`).join("")}
            </div>
          </div>`;
  };

  const tekstRij = (inner, media) => `      <div class="w-container">
        <div class="w-row republiek-uitleg">
          <div class="w-col w-col-3 w-col-stack w-hidden-medium w-hidden-small w-hidden-tiny"></div>
          <div class="w-col w-col-7 w-col-stack">
            ${inner}
          </div>
          ${mediaKolom(media)}
        </div>
      </div>`;

  const kleineRegel = (txt) => `      <div class="w-row republiek-uitleg">
        <div class="w-col w-col-3 w-col-stack w-hidden-medium w-hidden-small w-hidden-tiny"></div>
        <div class="w-col w-col-7 w-col-stack">
          <p class="republiek-createdbalk-fonts">${lines(txt)}</p>
        </div>
        <div class="w-col w-col-2 w-col-stack w-hidden-medium w-hidden-small w-hidden-tiny"></div>
      </div>`;

  // ---------- speeldata weergeven ----------

  const linkStijl = 'class="menu-top media" style="display:inline;padding:0;text-indent:0;font-size:inherit"';
  const agendaTitel = (a) => (L.code === "en" && a.titel_en ? a.titel_en : a.titel);

  // Eén regel op de agendapagina
  const agendaItem = (a) => {
    const titel = a.slug ? `<a class="menu-top media" style="display:inline;padding:0;text-indent:0;font-size:inherit;color:inherit" href="${P}/${a.slug}.html">${esc(agendaTitel(a))}</a>` : esc(agendaTitel(a));
    const meta = [a.uur, a.locatie, opmerking(a.opmerking)].filter(Boolean).map(esc).join(" · ");
    return `<div data-datum="${a.tot}">
              <p class="inleiding" style="margin-bottom:2px">${formatPeriode(a)} — ${titel}</p>
              <p class="brood">${meta}${a.link ? `${meta ? " · " : ""}<a ${linkStijl} href="${esc(a.link)}" target="_blank">${L.infoTickets}</a>` : ""}</p>
            </div>`;
  };

  // Archief per jaar, elk jaar openklapbaar
  const jaarBlok = (j, inhoud) => `<details data-jaar="${j}" style="margin-top:12px">
                <summary class="hoofding-links" style="display:list-item;cursor:pointer">${j}</summary>
                <div data-items style="margin-top:8px">${inhoud}</div>
              </details>`;
  const perJaar = (items, render) => {
    const groepen = [];
    for (const a of items) {
      const j = a.tot.slice(0, 4);
      if (!groepen.length || groepen[groepen.length - 1].j !== j) groepen.push({ j, items: [] });
      groepen[groepen.length - 1].items.push(a);
    }
    return groepen.map((g) => jaarBlok(g.j, g.items.map(render).join(""))).join("\n              ");
  };

  // Komende data per maand, elke maand openklapbaar (de eerste twee staan open)
  const perMaand = (items, render) => {
    const groepen = [];
    for (const a of items) {
      const m = (a.datum < todayISO() ? a.tot : a.datum).slice(0, 7); // lopende reeks: onder de lopende maand
      if (!groepen.length || groepen[groepen.length - 1].m !== m) groepen.push({ m, items: [] });
      groepen[groepen.length - 1].items.push(a);
    }
    return groepen.map((g, i) => {
      const [jaar, maand] = g.m.split("-");
      return `<details data-maand="${g.m}"${i < 2 ? " open" : ""} style="margin-top:12px">
                <summary class="hoofding-links" style="display:list-item;cursor:pointer">${L.maandenHoofd[Number(maand) - 1]} ${jaar}</summary>
                <div data-items style="margin-top:8px">${g.items.map(render).join("")}</div>
              </details>`;
    }).join("\n              ");
  };

  const agendaInhoud = () => `<div data-komend="archief-agenda">
              <p class="brood" data-leeg${upcoming.length ? ' style="display:none"' : ""}>${L.agendaLeeg}</p>
              ${perMaand(upcoming, agendaItem)}
            </div>
            <div data-archief${past.length ? "" : ' style="display:none"'}>
              <p class="credits-head" style="margin-top:35px">${L.archief}</p>
              <div id="archief-agenda">${perJaar(past, agendaItem)}</div>
            </div>`;

  // Speeldata onderaan een projectpagina
  const projectRegel = (a) => {
    const meta = [a.uur, a.locatie, opmerking(a.opmerking)].filter(Boolean).map(esc).join(" · ");
    return `<p class="credits" data-datum="${a.tot}" style="margin-bottom:6px">${formatPeriode(a)}${meta ? ` · ${meta}` : ""}${a.link ? ` · <a ${linkStijl} href="${esc(a.link)}" target="_blank">${L.tickets}</a>` : ""}</p>`;
  };
  const speeldataProject = (p) => {
    const eigen = agenda.filter((a) => a.titel === p.titel || a.slug === p.slug);
    if (!eigen.length) return "";
    const komend = eigen.filter((a) => a.tot >= todayISO());
    const voorbij = eigen.filter((a) => a.tot < todayISO()).reverse();
    const id = `archief-${p.slug}`;
    return `<div data-komend="${id}">
              <p class="credits-head" style="margin-top:25px">${L.speeldata}</p>
              <p class="credits" data-leeg${komend.length ? ' style="display:none"' : ""}>${L.geenGepland}</p>
              ${komend.map(projectRegel).join("\n              ")}
            </div>
            <details data-archief${voorbij.length ? "" : ' style="display:none"'} style="margin-bottom:15px">
              <summary class="credits-head" style="cursor:pointer;margin-top:15px">${L.eerderGespeeld} (<span data-teller="${id}">${voorbij.length}</span>)</summary>
              <div id="${id}">${voorbij.map(projectRegel).join("")}</div>
            </details>`;
  };

  // ---------- pagina's ----------

  const pages = {};

  // Home: één grote foto met het menu
  const homeFoto = site.achtergrond_home && site.achtergrond_home !== HOME_ORIGINEEL ? ` style="background-image:${esc(cssUrl(site.achtergrond_home))}"` : "";
  pages["index.html"] = `${head(L.home, "index.html")}
  <div class="projecten-achtergrond"${homeFoto}>
    <div class="w-container">
      <div class="republiek-absoluut home"><a class="menu-top" href="${P}/biografie.html">${esc(site.naam)}</a><a class="menu-top" href="${P}/projecten.html">${L.projecten}</a><a class="menu-top" href="${P}/agenda.html">${L.agenda}</a>${taalLink("index.html", "menu-top")}
      </div>
    </div>
  </div>
${scripts}`;

  // Projectenoverzicht
  const isSamen = (p) => p.soort === "samenwerking";
  const metFilter = projects.some(isSamen);
  const filterKnop = (sleutel, label) =>
    `<span class="hoofding-links projecten-filter" data-filter="${sleutel}" role="button" tabindex="0">${label}</span>`;
  pages["projecten.html"] = `${head(L.projecten, "projecten.html")}
  <div>
    <div class="w-container">
      ${menu("projecten.html")}
    </div>
${metFilter ? `    <div class="w-container projecten-container projecten-filterbalk">
      <div class="w-row">
        <div class="w-col w-col-3 w-hidden-small w-hidden-tiny"></div>
        <div class="w-col w-col-7">${filterKnop("alles", L.filterAlles)}${filterKnop("eigen", L.filterEigen)}${filterKnop("samenwerking", L.filterSamen)}</div>
        <div class="w-col w-col-2 w-hidden-small w-hidden-tiny"></div>
      </div>
    </div>` : ""}
${projects.map((p) => {
  const o = ORIGINEEL[p.slug] || {};
  const tegel = p.tegelfoto || p.cover || asArray(p.fotos)[0];
  const met = tr(p, "met");
  return `    <div class="w-container projecten-container" data-soort="${isSamen(p) ? "samenwerking" : "eigen"}">
      <div class="w-row">
        <div class="w-col w-col-3 w-hidden-small w-hidden-tiny"></div>
        <div class="w-col w-col-7">
          <div class="projecten-div-blauw">
            <a ${fotoAttr("w-inline-block projecten-linkfoto", o.tegel, tegel, "background-size:cover;background-position:50% 50%;")} href="${P}/${p.slug}.html">
              <div>${kop(p)}${p.jaar ? `<br>${esc(p.jaar)}` : ""}${met ? `<span class="tegel-met">${esc(met)}</span>` : ""}</div>
            </a>
          </div>
        </div>
        <div class="w-col w-col-2 w-hidden-small w-hidden-tiny"></div>
      </div>
    </div>`;
}).join("\n")}
  </div>
${metFilter ? `  <script>
    (function () {
      var knoppen = document.querySelectorAll("[data-filter]");
      function kies(f) {
        for (var i = 0; i < knoppen.length; i++) knoppen[i].classList.toggle("actief", knoppen[i].getAttribute("data-filter") === f);
        var t = document.querySelectorAll("[data-soort]");
        for (var j = 0; j < t.length; j++) t[j].style.display = f === "alles" || t[j].getAttribute("data-soort") === f ? "" : "none";
        try { if (history.replaceState) history.replaceState(null, "", f === "alles" ? location.pathname : "#" + f); } catch (e) {}
      }
      for (var k = 0; k < knoppen.length; k++) {
        knoppen[k].onclick = function () { kies(this.getAttribute("data-filter")); };
        knoppen[k].onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); kies(this.getAttribute("data-filter")); } };
      }
      var start = location.hash.replace("#", "");
      kies(start === "eigen" || start === "samenwerking" ? start : "alles");
    })();
  </script>` : ""}
${footer()}
${scripts}`;

  // Projectpagina's
  projects.forEach((p, i) => {
    const o = ORIGINEEL[p.slug] || {};
    const n = projects.length;
    const ouder = projects[(i + 1) % n]; // links
    const nieuwer = projects[(i - 1 + n) % n]; // rechts
    const fotos = asArray(p.fotos);
    const embed = videoEmbed(p.video);
    const videoBestand = p.video_bestand && !teGroot.has(p.video_bestand) ? p.video_bestand : "";
    const top = p.cover || fotos[0];
    const achter = p.achterfoto || fotos[1] || top;
    const bestand = `${p.slug}.html`;

    const tekst = [
      tr(p, "intro") ? paragraphs(tr(p, "intro"), "inleiding") : "",
      rich(tr(p, "tekst")),
      tr(p, "citaat") ? `<p class="citaat">${lines(tr(p, "citaat"))}</p>` : "",
      tr(p, "credits") ? `<p class="credits-head">${L.credits}</p>\n            <p class="credits">${lines(tr(p, "credits"))}</p>` : "",
      speeldataProject(p),
    ].filter(Boolean).join("\n            ");

    pages[bestand] = `${head(titelVan(p), bestand)}
  <div ${fotoAttr("republiek-topfoto", o.top, top, "background-size:cover;background-position:50% 50%;background-attachment:fixed;")}>
    <div class="w-container">
      ${menu(bestand)}
    </div>
    <div class="w-container">
      <div class="w-row republiek-fototekst">
        <div class="w-col w-col-3 w-col-stack w-hidden-small w-hidden-tiny">
          ${n > 1 ? `<div class="projecten-link-div projecten-link-div-links"><a class="projecten-link" href="${P}/${ouder.slug}.html">${esc(titelVan(ouder))}</a>
            <div class="w-icon-slider-left fotopijltje links-pijltje"></div>
          </div>` : ""}
        </div>
        <div class="w-col w-col-7 w-col-stack">
          <p class="foto-op-tekst">${kop(p)}</p>
        </div>
        <div class="w-col w-col-2 w-col-stack w-hidden-small w-hidden-tiny">
          ${n > 1 ? `<div class="projecten-link-div">
            <div class="w-icon-slider-right fotopijltje"></div><a class="projecten-link" href="${P}/${nieuwer.slug}.html">${esc(titelVan(nieuwer))}</a>
          </div>` : ""}
        </div>
      </div>
    </div>
  </div>
  <div>
    <div>
${tekstRij(tekst, p.media)}
    </div>
  </div>
  <div ${fotoAttr("republiek-achterfoto", o.achter, achter, "background-size:cover;background-position:50% 50%;")}>
    <div class="w-container republiek-fototekst-2">
      <div class="w-row">
        <div class="w-col w-col-3 w-hidden-small w-hidden-tiny"></div>
        <div class="w-col w-col-7">
          <p class="foto-op-tekst">${L.inBeeld}</p>
        </div>
        <div class="w-col w-col-2 w-hidden-small w-hidden-tiny"></div>
      </div>
    </div>
  </div>
  <div>
    <div class="w-container">
${embed ? `      <div class="w-row republiek-uitleg">
        <div class="w-col w-col-3 w-hidden-medium w-hidden-small w-hidden-tiny"></div>
        <div class="w-col w-col-9">
          <div class="w-embed w-video republiek-video" style="padding-top: 56.25%;">
            <iframe src="${embed}" scrolling="no" frameborder="0" allowfullscreen=""></iframe>
          </div>
        </div>
      </div>` : ""}
${videoBestand ? `      <div class="w-row republiek-uitleg">
        <div class="w-col w-col-3 w-hidden-medium w-hidden-small w-hidden-tiny"></div>
        <div class="w-col w-col-9">
          <video src="${esc(videoBestand)}" controls playsinline preload="metadata"${p.video_poster ? ` poster="${esc(p.video_poster)}"` : ""} style="display:block;width:100%;height:auto;aspect-ratio:auto 16 / 9;background:#000"></video>
        </div>
      </div>` : ""}
${fotos.length ? `      <div class="w-slider republiek-slider" data-animation="slide" data-duration="500" data-infinite="1">
        <div class="w-slider-mask">
${fotos.map((f) => `          <div class="w-slide">
            <img class="republiek-slider-foto-eig" src="${esc(f)}" alt="${esc(titelVan(p))}">
          </div>`).join("\n")}
        </div>
        <div class="w-slider-arrow-left links">
          <div class="w-icon-slider-left icoontjes"></div>
        </div>
        <div class="w-slider-arrow-right rechts">
          <div class="w-icon-slider-right icoontjes"></div>
        </div>
        <div class="w-slider-nav w-round"></div>
      </div>` : ""}
${!fotos.length && !embed && !videoBestand ? kleineRegel(L.meerFotos) : ""}
${tr(p, "fotocredits") ? kleineRegel(tr(p, "fotocredits")) : ""}
    </div>
${footer()}
  </div>
${scripts}`;
  });

  // Biografie
  const bioFoto = bio.portret && bio.portret !== BIO_ORIGINEEL ? ` style="background-image:${esc(cssUrl(bio.portret))};background-size:cover;background-position:50% 50%;background-attachment:fixed;"` : "";
  const bioKlasse = bio.portret && bio.portret !== BIO_ORIGINEEL ? "republiek-topfoto" : "republiek-topfoto foto-nikolas";
  pages["biografie.html"] = `${head(L.biografie, "biografie.html")}
  <div class="${bioKlasse}"${bioFoto}>
    <div class="w-container">
      ${menuHomepagina("biografie.html")}
      <div class="w-row republiek-fototekst">
        <div class="w-col w-col-3 w-hidden-small w-hidden-tiny"></div>
        <div class="w-col w-col-7">
          <p class="foto-op-tekst">${lines(tr(bio, "kop") || site.naam).replace(/\n\s*/g, "")}</p>
        </div>
        <div class="w-col w-col-2 w-hidden-small w-hidden-tiny"></div>
      </div>
    </div>
  </div>
  <div>
${tekstRij([tr(bio, "intro") ? paragraphs(tr(bio, "intro"), "inleiding") : "", rich(tr(bio, "tekst"))].filter(Boolean).join("\n            "), bio.media)}
  </div>
${footer()}
${scripts}`;

  pages["agenda.html"] = `${head(L.agenda, "agenda.html")}
  <div class="republiek-topfoto foto-nikolas">
    <div class="w-container">
      ${menuHomepagina("agenda.html")}
      <div class="w-row republiek-fototekst">
        <div class="w-col w-col-3 w-hidden-small w-hidden-tiny"></div>
        <div class="w-col w-col-7">
          <p class="foto-op-tekst">${L.agenda}</p>
        </div>
        <div class="w-col w-col-2 w-hidden-small w-hidden-tiny"></div>
      </div>
    </div>
  </div>
  <div>
${tekstRij(agendaInhoud(), [])}
  </div>
${footer()}
${scripts}`;

  // Bedankt en 404
  const eenvoudig = (titel, html, bestand) => `${head(titel, bestand)}
  <div class="republiek-topfoto foto-nikolas">
    <div class="w-container">
      ${menuHomepagina(bestand)}
      <div class="w-row republiek-fototekst">
        <div class="w-col w-col-3 w-hidden-small w-hidden-tiny"></div>
        <div class="w-col w-col-7"><p class="foto-op-tekst">${esc(titel)}</p></div>
        <div class="w-col w-col-2 w-hidden-small w-hidden-tiny"></div>
      </div>
    </div>
  </div>
  <div>
${tekstRij(html, [])}
  </div>
${footer()}
${scripts}`;
  pages["bedankt.html"] = eenvoudig(L.bedanktTitel, `<p class="brood">${L.bedanktTekst(P)}</p>`, "bedankt.html");
  pages["404.html"] = eenvoudig(L.nietGevondenTitel, `<p class="brood">${L.nietGevondenTekst(P)}</p>`, "404.html");

  return pages;
}

// Adres van een pagina in een taal ("" = Nederlands, "/en" = Engels)
const paginaUrl = (pre, bestand) => `${pre}/${bestand === "index.html" ? "" : bestand}`;

// ---------- wegschrijven ----------

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.cpSync(STATIC, OUT, {
  recursive: true,
  filter: (src) => !teGroot.has("/" + path.relative(STATIC, src).split(path.sep).join("/")),
});
teGroot.forEach((f) => waarschuwingen.push(`${f} is groter dan 25 MB (${mb(fs.statSync(path.join(STATIC, f)).size)} MB) en wordt niet gepubliceerd. Maak het bestand kleiner of gebruik een YouTube- of Vimeo-link.`));
let aantalPaginas = 0;
for (const L of Object.values(TALEN)) {
  const map = path.join(OUT, L.pre);
  fs.mkdirSync(map, { recursive: true });
  for (const [file, html] of Object.entries(bouwTaal(L))) { fs.writeFileSync(path.join(map, file), html); aantalPaginas++; }
}

const missing = new Set();
const check = (src) => { if (src && src.startsWith("/") && !fs.existsSync(path.join(OUT, src))) missing.add(src); };
projects.forEach((p) => [p.cover, p.achterfoto, p.tegelfoto, ...asArray(p.fotos)].forEach(check));
check(bio.portret);
console.log(`Klaar: ${aantalPaginas} pagina's (NL + EN), ${projects.length} projecten, ${agenda.length} speeldata (${upcoming.length} komend).`);
waarschuwingen.forEach((w) => console.log("Let op: " + w));
if (missing.size) console.log(`Let op, ontbrekende foto's: ${[...missing].join(", ")}`);
