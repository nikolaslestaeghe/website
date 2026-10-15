// Bouwt de website van Nikolas Lestaeghe in de originele opmaak (ontwerp Pieterjan Volckaert).
// Geen extra pakketten nodig: `node build.js` zet alles in de map dist/.
// Inhoud: content/ (aan te passen via de beheerpagina)
// Opmaak: static/css/ en static/js/ (de originele Webflow-bestanden, ongewijzigd)

const fs = require("fs");
const path = require("path");

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

// ---------- inhoud ----------

const site = readJSON(path.join(CONTENT, "site.json"));
const bio = readJSON(path.join(CONTENT, "biografie.json"));
const projects = readCollection("projecten").filter((p) => p.zichtbaar !== false)
  .sort((a, b) => sortYear(b.jaar) - sortYear(a.jaar) || (b.volgorde || 0) - (a.volgorde || 0));
const agenda = readCollection("agenda").sort((a, b) => String(a.datum).localeCompare(String(b.datum)));
const upcoming = agenda.filter((a) => String(a.datum) >= todayISO());
const past = agenda.filter((a) => String(a.datum) < todayISO()).reverse();

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

const scripts = `  <script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js"></script>
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
          ${site.nieuwsbrief !== false ? `<p>Abonneer je op Nikolas’ onregelmatige nieuwsbrief&nbsp;</p>
          <div>
            <form class="form" id="email-form" name="nieuwsbrief" method="POST" action="/bedankt.html" data-netlify="true" netlify-honeypot="bot-veld">
              <input type="hidden" name="form-name" value="nieuwsbrief">
              <p style="display:none"><label>Niet invullen: <input name="bot-veld"></label></p>
              <input class="w-input" id="email" type="email" placeholder="E-mailadres..." name="email" required="required">
              <input class="w-button form-button" type="submit" value="Verstuur">
            </form>
          </div>` : `<span id="email-form"></span>`}
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

// Agenda (zelfde opbouw als de biografie)
const agendaItem = (a) => {
  const key = String(a.project || "").split("/").pop().replace(/\.json$/, "");
  const proj = key && projects.find((p) => p.slug === key);
  const titel = proj ? `<a class="projecten-link" style="color:inherit;font-size:inherit" href="/${proj.slug}.html">${esc(a.titel)}</a>` : esc(a.titel);
  const meta = [a.uur, a.locatie].filter(Boolean).map(esc).join(" · ");
  return `<p class="inleiding">${formatDate(a.datum)} — ${titel}</p>
            <p class="brood">${meta}${a.link ? `${meta ? "<br>" : ""}<a class="menu-top media" style="display:inline;padding:0;text-indent:0" href="${esc(a.link)}" target="_blank">Meer info en tickets</a>` : ""}</p>`;
};
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
${tekstRij(
  (upcoming.length ? upcoming.map(agendaItem).join("\n            ") : `<p class="brood">Binnenkort nieuwe data. Abonneer je op de nieuwsbrief om niets te missen.</p>`) +
  (past.length ? `\n            <p class="credits-head">Archief</p>\n            ${past.map(agendaItem).join("\n            ")}` : ""),
  []
)}
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
console.log(`Klaar: ${Object.keys(pages).length} pagina's, ${projects.length} projecten, ${agenda.length} agendapunten.`);
if (missing.size) console.log(`Let op, ontbrekende foto's: ${[...missing].join(", ")}`);
