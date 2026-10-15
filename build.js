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

const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const formatDate = (iso) => { const d = new Date(iso + "T12:00:00"); return isNaN(d) ? esc(iso) : `${d.getDate()} ${MAANDEN[d.getMonth()]} ${d.getFullYear()}`; };
const todayISO = () => new Date().toISOString().slice(0, 10);
const formatPeriode = (a) => {
  if (!a.dagen || a.tot === a.datum) return formatDate(a.datum);
  const d = new Date(a.datum + "T12:00:00");
  return `${a.dagen} ${MAANDEN[d.getMonth()]} ${d.getFullYear()}`;
};

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
  const extra = { titel: p.titel, slug: p.zichtbaar === false ? null : p.slug };
  asArray(p.speellijst).forEach((d) => voegToe(d, extra));
  if (p.speellijst_bestand) {
    const bestand = path.join(STATIC, p.speellijst_bestand.replace(/^\//, ""));
    try {
      const rijen = leesBestand(bestand);
      if (!rijen.length) waarschuwingen.push(`Geen datums gevonden in ${p.speellijst_bestand} (${p.titel}).`);
      rijen.forEach((d) => voegToe(d, extra));
    } catch (e) {
      waarschuwingen.push(`Kon ${p.speellijst_bestand} (${p.titel}) niet lezen: ${e.message}`);
    }
  }
}
for (const a of readCollection("agenda")) {
  const key = String(a.project || "").split("/").pop().replace(/\.json$/, "");
  const proj = key && alleProjecten.find((p) => p.slug === key);
  voegToe(a, { titel: a.titel || (proj && proj.titel) || "", slug: proj && proj.zichtbaar !== false ? proj.slug : null });
}
// dubbels weglaten, sorteren op datum en uur
const gezien = new Set();
const agenda = speeldata
  .filter((d) => { const k = [d.datum, d.uur, d.titel, d.locatie].join("|").toLowerCase(); if (gezien.has(k)) return false; gezien.add(k); return true; })
  .sort((a, b) => (a.datum + a.uur).localeCompare(b.datum + b.uur));
const upcoming = agenda.filter((a) => a.tot >= todayISO());
const past = agenda.filter((a) => a.tot < todayISO()).reverse();

// ---------- vaste stukken (originele markup) ----------

const head = (title) => `<!DOCTYPE html>
<!-- Oorspronkelijk ontwerp: Pieterjan Volckaert (Webflow) -->
<html lang="nl">
<head>
  <meta charset="utf-8">
  <title>${esc(site.naam)}${title ? ` - ${esc(title)}` : ""}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
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
  <link rel="shortcut icon" type="image/x-icon" href="https://daks2k3a4ib2z.cloudfront.net/placeholder/favicon.ico">
</head>
<body>`;

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

const menu = (extra = "", naamLink = "/biografie.html", contact = true) =>
  `<div class="republiek-absoluut${extra ? " " + extra : ""}"><a class="menu-top${extra === "" ? "" : ""}" href="${naamLink}">${esc(site.naam)}</a><a class="menu-top" href="/projecten.html">Projecten</a><a class="menu-top" href="/agenda.html">Agenda</a>${contact ? `<a class="menu-top" href="#email-form">Contact</a>` : ""}
      </div>`;

const menuHomepagina = `<div class="republiek-absoluut"><a class="menu-top homepagina" href="/">${esc(site.naam)}</a><a class="menu-top homepagina" href="/projecten.html">Projecten</a><a class="menu-top homepagina" href="/agenda.html">Agenda</a><a class="menu-top homepagina" href="#email-form">Contact</a>
      </div>`;

const footer = () => `  <div class="republiek-createdbalk">
    <div class="w-container">
      <div class="w-row">
        <div class="w-col w-col-3">
          <p>E-mail</p><a class="email" href="mailto:${esc(site.email)}" target="_blank">${esc(site.email).replace("@", " @")}</a>
          ${site.telefoon ? `<p>Telefoon</p><a class="telefoon" href="tel:${esc(site.telefoon.replace(/[^\d+]/g, ""))}" target="_blank">${esc(site.telefoon)}</a>` : ""}
          ${asArray(site.links).map((l) => `<a class="telefoon" href="${esc(l.link)}" target="_blank">${esc(l.titel)}</a>`).join("")}
        </div>
        <div class="w-col w-col-7">
          ${site.nieuwsbrief !== false && site.nieuwsbrief_url ? `<p>Abonneer je op Nikolas’ onregelmatige nieuwsbrief&nbsp;</p>
          <div>
            <form class="form" id="email-form" method="POST" action="${esc(site.nieuwsbrief_url)}" onsubmit="return nieuwsbrief(this)">
              <input type="text" name="email_address_check" value="" tabindex="-1" autocomplete="off" style="display:none">
              <input type="hidden" name="locale" value="nl">
              <input class="w-input" id="email" type="email" placeholder="E-mailadres..." name="EMAIL" required="required">
              <input class="w-button form-button" type="submit" value="Verstuur">
            </form>
            <div class="gelukt" style="display:none;padding:10px 15px;margin-bottom:19px"><p style="margin:0">Dank je wel! Bevestig je inschrijving via de mail die je zo dadelijk krijgt.</p></div>
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
          <p>Webontwerp</p>${site.ontwerp_link ? `<a class="ontwerper" href="${esc(site.ontwerp_link)}" target="_blank">${esc(site.ontwerp)}</a>` : `<span class="ontwerper">${esc(site.ontwerp || "")}</span>`}
        </div>
      </div>
    </div>
  </div>`;

const mediaKolom = (items) => {
  const list = asArray(items);
  if (!list.length) return `<div class="w-col w-col-2 w-col-stack"></div>`;
  return `<div class="w-col w-col-2 w-col-stack">
            <div class="republiek-media">
              <p class="hoofding-links">Media</p>${list.map((m) => m.afbeelding
    ? `<a class="w-inline-block" href="${esc(m.link)}" target="_blank"><img class="logo" src="${esc(m.afbeelding)}" alt="${esc(m.titel)}"></a>`
    : `<a class="menu-top media" href="${esc(m.link)}" target="_blank">${esc(m.titel)}</a>`).join("")}
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

const kop = (p) => lines(p.kop || p.titel).replace(/\n\s*/g, "");

// ---------- speeldata weergeven ----------

const linkStijl = 'class="menu-top media" style="display:inline;padding:0;text-indent:0;font-size:inherit"';

// Eén regel op de agendapagina
const agendaItem = (a) => {
  const titel = a.slug ? `<a class="menu-top media" style="display:inline;padding:0;text-indent:0;font-size:inherit;color:inherit" href="/${a.slug}.html">${esc(a.titel)}</a>` : esc(a.titel);
  const meta = [a.uur, a.locatie, a.opmerking].filter(Boolean).map(esc).join(" · ");
  return `<div data-datum="${a.tot}">
              <p class="inleiding" style="margin-bottom:2px">${formatPeriode(a)} — ${titel}</p>
              <p class="brood">${meta}${a.link ? `${meta ? " · " : ""}<a ${linkStijl} href="${esc(a.link)}" target="_blank">Info en tickets</a>` : ""}</p>
            </div>`;
};

// Archief, gegroepeerd per jaar
// Archief per jaar, elk jaar openklapbaar
const jaarBlok = (j, inhoud, aantal) => `<details data-jaar="${j}" style="margin-top:12px">
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
  return groepen.map((g) => jaarBlok(g.j, g.items.map(render).join(""), g.items.length)).join("\n              ");
};

// Komende data per maand, elke maand openklapbaar (de eerste twee staan open)
const MAANDEN_HOOFD = ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"];
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
                <summary class="hoofding-links" style="display:list-item;cursor:pointer">${MAANDEN_HOOFD[Number(maand) - 1]} ${jaar}</summary>
                <div data-items style="margin-top:8px">${g.items.map(render).join("")}</div>
              </details>`;
  }).join("\n              ");
};

function agendaInhoud() {
  return `<div data-komend="archief-agenda">
              <p class="brood" data-leeg${upcoming.length ? ' style="display:none"' : ""}>Binnenkort nieuwe data. Abonneer je op de nieuwsbrief om niets te missen.</p>
              ${perMaand(upcoming, agendaItem)}
            </div>
            <div data-archief${past.length ? "" : ' style="display:none"'}>
              <p class="credits-head" style="margin-top:35px">Archief</p>
              <div id="archief-agenda">${perJaar(past, agendaItem)}</div>
            </div>`;
}

// Speeldata onderaan een projectpagina
const projectRegel = (a) => {
  const meta = [a.uur, a.locatie, a.opmerking].filter(Boolean).map(esc).join(" · ");
  return `<p class="credits" data-datum="${a.tot}" style="margin-bottom:6px">${formatPeriode(a)}${meta ? ` · ${meta}` : ""}${a.link ? ` · <a ${linkStijl} href="${esc(a.link)}" target="_blank">tickets</a>` : ""}</p>`;
};
function speeldataProject(p) {
  const eigen = agenda.filter((a) => a.titel === p.titel || a.slug === p.slug);
  if (!eigen.length) return "";
  const komend = eigen.filter((a) => a.tot >= todayISO());
  const voorbij = eigen.filter((a) => a.tot < todayISO()).reverse();
  const id = `archief-${p.slug}`;
  return `<div data-komend="${id}">
              <p class="credits-head" style="margin-top:25px">Speeldata</p>
              <p class="credits" data-leeg${komend.length ? ' style="display:none"' : ""}>Momenteel geen geplande voorstellingen.</p>
              ${komend.map(projectRegel).join("\n              ")}
            </div>
            <details data-archief${voorbij.length ? "" : ' style="display:none"'} style="margin-bottom:15px">
              <summary class="credits-head" style="cursor:pointer;margin-top:15px">Eerder gespeeld (<span data-teller="${id}">${voorbij.length}</span>)</summary>
              <div id="${id}">${voorbij.map(projectRegel).join("")}</div>
            </details>`;
}

// ---------- pagina's ----------

const pages = {};

// Home: één grote foto met het menu
const homeFoto = site.achtergrond_home && site.achtergrond_home !== HOME_ORIGINEEL ? ` style="background-image:${esc(cssUrl(site.achtergrond_home))}"` : "";
pages["index.html"] = `${head("Home")}
  <div class="projecten-achtergrond"${homeFoto}>
    <div class="w-container">
      <div class="republiek-absoluut home"><a class="menu-top" href="/biografie.html">${esc(site.naam)}</a><a class="menu-top" href="/projecten.html">Projecten</a><a class="menu-top" href="/agenda.html">Agenda</a>
      </div>
    </div>
  </div>
${scripts}`;

// Projectenoverzicht
pages["projecten.html"] = `${head("Projecten")}
  <div>
    <div class="w-container">
      ${menu()}
    </div>
${projects.map((p) => {
  const o = ORIGINEEL[p.slug] || {};
  const tegel = p.tegelfoto || p.cover || asArray(p.fotos)[0];
  return `    <div class="w-container projecten-container">
      <div class="w-row">
        <div class="w-col w-col-3 w-hidden-small w-hidden-tiny"></div>
        <div class="w-col w-col-7">
          <div class="projecten-div-blauw">
            <a ${fotoAttr("w-inline-block projecten-linkfoto", o.tegel, tegel, "background-size:cover;background-position:50% 50%;")} href="/${p.slug}.html">
              <div>${kop(p)}${p.jaar ? `<br>${esc(p.jaar)}` : ""}</div>
            </a>
          </div>
        </div>
        <div class="w-col w-col-2 w-hidden-small w-hidden-tiny"></div>
      </div>
    </div>`;
}).join("\n")}
  </div>
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
  const top = p.cover || fotos[0];
  const achter = p.achterfoto || fotos[1] || top;

  const tekst = [
    p.intro ? paragraphs(p.intro, "inleiding") : "",
    rich(p.tekst),
    p.citaat ? `<p class="citaat">${lines(p.citaat)}</p>` : "",
    p.credits ? `<p class="credits-head">Credits</p>\n            <p class="credits">${lines(p.credits)}</p>` : "",
    speeldataProject(p),
  ].filter(Boolean).join("\n            ");

  pages[`${p.slug}.html`] = `${head(p.titel)}
  <div ${fotoAttr("republiek-topfoto", o.top, top, "background-size:cover;background-position:50% 50%;background-attachment:fixed;")}>
    <div class="w-container">
      ${menu()}
    </div>
    <div class="w-container">
      <div class="w-row republiek-fototekst">
        <div class="w-col w-col-3 w-col-stack w-hidden-small w-hidden-tiny">
          ${n > 1 ? `<div class="projecten-link-div projecten-link-div-links"><a class="projecten-link" href="/${ouder.slug}.html">${esc(ouder.titel)}</a>
            <div class="w-icon-slider-left fotopijltje links-pijltje"></div>
          </div>` : ""}
        </div>
        <div class="w-col w-col-7 w-col-stack">
          <p class="foto-op-tekst">${kop(p)}</p>
        </div>
        <div class="w-col w-col-2 w-col-stack w-hidden-small w-hidden-tiny">
          ${n > 1 ? `<div class="projecten-link-div">
            <div class="w-icon-slider-right fotopijltje"></div><a class="projecten-link" href="/${nieuwer.slug}.html">${esc(nieuwer.titel)}</a>
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
          <p class="foto-op-tekst">IN
            <br>BEELD</p>
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
${fotos.length ? `      <div class="w-slider republiek-slider" data-animation="slide" data-duration="500" data-infinite="1">
        <div class="w-slider-mask">
${fotos.map((f) => `          <div class="w-slide">
            <img class="republiek-slider-foto-eig" src="${esc(f)}" alt="${esc(p.titel)}">
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
${!fotos.length && !embed ? kleineRegel("Binnenkort meer foto’s") : !fotos.length ? kleineRegel("Binnenkort meer foto’s") : ""}
${p.fotocredits ? kleineRegel(p.fotocredits) : ""}
    </div>
${footer()}
  </div>
${scripts}`;
});

// Biografie
const bioFoto = bio.portret && bio.portret !== BIO_ORIGINEEL ? ` style="background-image:${esc(cssUrl(bio.portret))};background-size:cover;background-position:50% 50%;background-attachment:fixed;"` : "";
const bioKlasse = bio.portret && bio.portret !== BIO_ORIGINEEL ? "republiek-topfoto" : "republiek-topfoto foto-nikolas";
pages["biografie.html"] = `${head("Biografie")}
  <div class="${bioKlasse}"${bioFoto}>
    <div class="w-container">
      ${menuHomepagina}
      <div class="w-row republiek-fototekst">
        <div class="w-col w-col-3 w-hidden-small w-hidden-tiny"></div>
        <div class="w-col w-col-7">
          <p class="foto-op-tekst">${lines(bio.kop || site.naam).replace(/\n\s*/g, "")}</p>
        </div>
        <div class="w-col w-col-2 w-hidden-small w-hidden-tiny"></div>
      </div>
    </div>
  </div>
  <div>
${tekstRij([bio.intro ? paragraphs(bio.intro, "inleiding") : "", rich(bio.tekst)].filter(Boolean).join("\n            "), bio.media)}
  </div>
${footer()}
${scripts}`;

pages["agenda.html"] = `${head("Agenda")}
  <div class="republiek-topfoto foto-nikolas">
    <div class="w-container">
      ${menuHomepagina}
      <div class="w-row republiek-fototekst">
        <div class="w-col w-col-3 w-hidden-small w-hidden-tiny"></div>
        <div class="w-col w-col-7">
          <p class="foto-op-tekst">Agenda</p>
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
const eenvoudig = (titel, html) => `${head(titel)}
  <div class="republiek-topfoto foto-nikolas">
    <div class="w-container">
      ${menuHomepagina}
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
pages["bedankt.html"] = eenvoudig("Dank je wel!", `<p class="brood">We hebben je adres ontvangen. <a href="/" style="color:#4778ff">Terug naar de voorpagina</a>.</p>`);
pages["404.html"] = eenvoudig("Oeps", `<p class="brood">Deze pagina bestaat niet (meer). Bekijk de <a href="/projecten.html" style="color:#4778ff">projecten</a>.</p>`);

// ---------- wegschrijven ----------

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.cpSync(STATIC, OUT, { recursive: true });
for (const [file, html] of Object.entries(pages)) fs.writeFileSync(path.join(OUT, file), html);

const missing = new Set();
const check = (src) => { if (src && src.startsWith("/") && !fs.existsSync(path.join(OUT, src))) missing.add(src); };
projects.forEach((p) => [p.cover, p.achterfoto, p.tegelfoto, ...asArray(p.fotos)].forEach(check));
check(bio.portret);
console.log(`Klaar: ${Object.keys(pages).length} pagina's, ${projects.length} projecten, ${agenda.length} speeldata (${upcoming.length} komend).`);
waarschuwingen.forEach((w) => console.log("Let op: " + w));
if (missing.size) console.log(`Let op, ontbrekende foto's: ${[...missing].join(", ")}`);
