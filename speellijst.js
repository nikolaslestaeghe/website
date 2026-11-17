// Leest speellijsten in: uit de beheerpagina, of uit een opgeladen Excel- (.xlsx) of CSV-bestand.
// Geen extra pakketten nodig.
//
// Verwachte kolommen (de naam van de kolom mag variëren, hoofdletters maken niet uit):
//   datum   (ook: date, dag)                       verplicht
//   uur     (ook: tijd, aanvang, time, start)
//   locatie (ook: zaal, plaats, venue, organisator)
//   stad    (ook: gemeente, city, plaats2)
//   link    (ook: tickets, url, website)
//   opmerking (ook: info, notitie, extra)

const fs = require("fs");
const zlib = require("zlib");

const KOLOMMEN = {
  datum: ["datum", "date", "dag", "speeldatum", "data", "wanneer"],
  uur: ["uur", "tijd", "aanvang", "time", "start", "beginuur", "uren", "hour"],
  locatie: ["locatie", "zaal", "venue", "organisator", "organisatie", "cc", "theater", "event", "festival", "cultuurcentrum", "speelplek", "organizer"],
  stad: ["stad", "gemeente", "city", "woonplaats", "waar", "plaats", "town", "where", "land"],
  link: ["link", "tickets", "ticket", "url", "website", "info link", "ticketlink"],
  opmerking: ["opmerking", "info", "notitie", "extra", "opmerkingen", "note", "notes", "remark"],
};

const normKey = (k) => String(k ?? "").trim().toLowerCase().replace(/\s+/g, " ");
// Herkent een kolom aan de volledige naam ("event/cc" niet nodig in de lijst),
// of aan een van de woorden in de naam ("event/cc" → "event" → locatie).
const veldVoor = (kop) => {
  const k = normKey(kop);
  if (!k) return null;
  for (const [veld, namen] of Object.entries(KOLOMMEN)) if (namen.includes(k)) return veld;
  const woorden = k.split(/[^a-zà-ÿ]+/).filter(Boolean);
  for (const [veld, namen] of Object.entries(KOLOMMEN)) if (woorden.some((w) => namen.includes(w))) return veld;
  return null;
};

const pad = (n) => String(n).padStart(2, "0");

// Excel bewaart datums als getal (dagen sinds 30-12-1899) en uren als fractie van een dag.
const excelDatum = (n) => {
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(Number(n) * 86400000));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};
const excelUur = (n) => {
  const min = Math.round((Number(n) % 1) * 1440);
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
};

const MAANDNAMEN = { jan: 1, feb: 2, maa: 3, mrt: 3, apr: 4, mei: 5, jun: 6, jul: 7, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, dec: 12 };

// Geeft JJJJ-MM-DD terug, of "" als dag of maand onmogelijk is (bv. "16-17/11" mag geen "2011-17-16" worden)
function geldig(jaar, maand, dag) {
  const j = +jaar, mnd = +maand, d = +dag;
  if (!(mnd >= 1 && mnd <= 12 && d >= 1 && d <= 31 && j >= 1990 && j <= 2100)) return "";
  const dt = new Date(Date.UTC(j, mnd - 1, d));
  if (dt.getUTCMonth() !== mnd - 1) return "";
  return `${j}-${pad(mnd)}-${pad(d)}`;
}

// Zet allerlei schrijfwijzen om naar JJJJ-MM-DD
function leesDatum(waarde) {
  if (waarde === undefined || waarde === null || waarde === "") return "";
  if (typeof waarde === "number" || /^\d{4,5}(\.\d+)?$/.test(String(waarde).trim())) return excelDatum(waarde);
  const s = String(waarde).trim().toLowerCase();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = s.match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})(?!\d)/);
  if (m) return geldig(m[3].length === 2 ? "20" + m[3] : m[3], m[2], m[1]);
  m = s.match(/(\d{1,2})\s+([a-z]{3})[a-z]*\.?\s+(\d{4})/); // 12 november 2026
  if (m && MAANDNAMEN[m[2]]) return `${m[3]}-${pad(MAANDNAMEN[m[2]])}-${pad(m[1])}`;
  return "";
}

// Meerdere dagen in één cel: "8 en 9/11/25", "29-30/11/25", "17,18,19/10/26", "14+15/10/26", "5-7/02/2027",
// "29/10 tot 1/11/26". Zonder jaartal ("16-17/11", "15/10") wordt standaardJaar gebruikt (zonderJaar: true).
// Geeft { datum (eerste dag), tot (laatste dag), dagen (tekst, bv. "8 en 9") } terug.
function leesPeriode(waarde, standaardJaar) {
  const leeg = { datum: "", tot: "", dagen: "" };
  if (typeof waarde !== "number" && !/^\d{4,5}(\.\d+)?$/.test(String(waarde ?? "").trim())) {
    const s = String(waarde ?? "").trim().toLowerCase();
    // "29/10 tot 1/11" of "31/3 tot 3-4-2025": van ... tot ...
    const t = s.match(/^(.+?)\s+(?:tot|t\/m|tem|until|to)\s+(.+)$/);
    if (t) {
      const eind = leesPeriode(t[2], standaardJaar);
      if (!eind.datum) return leeg;
      let begin = leesPeriode(t[1], eind.datum.slice(0, 4));
      if (begin.datum && begin.datum > eind.datum && begin.zonderJaar) begin = leesPeriode(t[1], String(+eind.datum.slice(0, 4) - 1));
      if (!begin.datum) return leeg;
      const kort = (d) => `${+d.slice(8)}/${+d.slice(5, 7)}`;
      return { datum: begin.datum, tot: eind.tot, dagen: `${kort(begin.datum)} – ${kort(eind.tot)}`, zonderJaar: eind.zonderJaar, ruimMaand: true };
    }
    const m = s.match(/^((?:\d{1,2}\s*(?:-|–|en|&|\+|,)\s*)*\d{1,2})\s*[\/.\-]\s*(\d{1,2})(?:\s*[\/.\-]\s*(\d{2,4}))?(?![\d\/.\-])/);
    if (m) {
      const zonderJaar = !m[3];
      if (zonderJaar && !standaardJaar) return leeg;
      const jaar = zonderJaar ? String(standaardJaar) : m[3].length === 2 ? "20" + m[3] : m[3];
      const delen = m[1].split(/\s*(-|–|en|&|\+|,)\s*/);
      let dagen = [], bereik = false;
      for (let i = 0; i < delen.length; i += 2) {
        const d = parseInt(delen[i], 10);
        const vorigeSep = delen[i - 1];
        if ((vorigeSep === "-" || vorigeSep === "–") && dagen.length) {
          bereik = true;
          for (let x = dagen[dagen.length - 1] + 1; x <= d; x++) dagen.push(x);
        } else dagen.push(d);
      }
      dagen = [...new Set(dagen)].filter((d) => d >= 1 && d <= 31).sort((a, b) => a - b);
      if (dagen.length) {
        const eerste = dagen[0], laatste = dagen[dagen.length - 1];
        const van = geldig(jaar, m[2], eerste), tot = geldig(jaar, m[2], laatste);
        if (!van || !tot) return leeg;
        const tekst = bereik && dagen.length > 2
          ? `${eerste} – ${laatste}`
          : dagen.length === 1 ? "" : `${dagen.slice(0, -1).join(", ")} en ${laatste}`;
        return { datum: van, tot, dagen: tekst, zonderJaar };
      }
    }
  }
  const d = leesDatum(waarde);
  return { datum: d, tot: d, dagen: "" };
}

// Eén of meer uren: "17u" → "17:00", "11u & 17u" → "11:00 & 17:00", "20.30" → "20:30"
function leesUur(waarde) {
  if (waarde === undefined || waarde === null || waarde === "") return "";
  if (typeof waarde === "number" || /^0?\.\d+$/.test(String(waarde).trim())) return excelUur(waarde);
  const uren = [...String(waarde).matchAll(/(\d{1,2})\s*(?:[:hu.]\s*(\d{2})?|(?=\s*(?:&|en|and|\+|,|\/|$)))/gi)]
    .filter((m) => Number(m[1]) <= 24)
    .map((m) => `${pad(m[1])}:${m[2] || "00"}`);
  return uren.length ? [...new Set(uren)].join(" & ") : String(waarde).trim();
}

// ---------- CSV ----------
function leesCSV(tekst) {
  tekst = tekst.replace(/^﻿/, "");
  const eersteRegel = tekst.split(/\r?\n/)[0] || "";
  const sep = (eersteRegel.match(/;/g) || []).length >= (eersteRegel.match(/,/g) || []).length ? ";" : ",";
  const rijen = [];
  let rij = [], veld = "", inQuotes = false;
  for (let i = 0; i < tekst.length; i++) {
    const c = tekst[i];
    if (inQuotes) {
      if (c === '"' && tekst[i + 1] === '"') { veld += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else veld += c;
    } else if (c === '"') inQuotes = true;
    else if (c === sep) { rij.push(veld); veld = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && tekst[i + 1] === "\n") i++;
      rij.push(veld); rijen.push(rij); rij = []; veld = "";
    } else veld += c;
  }
  if (veld !== "" || rij.length) { rij.push(veld); rijen.push(rij); }
  return rijen.filter((r) => r.some((v) => String(v).trim() !== ""));
}

// ---------- XLSX (eerste werkblad) ----------
function unzip(buf) {
  // Zoek de centrale map achteraan het zip-bestand
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error("geen geldig xlsx-bestand");
  const aantal = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const bestanden = {};
  for (let i = 0; i < aantal; i++) {
    const methode = buf.readUInt16LE(p + 10);
    const grootte = buf.readUInt32LE(p + 20);
    const naamLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commLen = buf.readUInt16LE(p + 32);
    const lokaal = buf.readUInt32LE(p + 42);
    const naam = buf.toString("utf8", p + 46, p + 46 + naamLen);
    const start = lokaal + 30 + buf.readUInt16LE(lokaal + 26) + buf.readUInt16LE(lokaal + 28);
    const data = buf.subarray(start, start + grootte);
    bestanden[naam] = () => (methode === 0 ? data : zlib.inflateRawSync(data)).toString("utf8");
    p += 46 + naamLen + extraLen + commLen;
  }
  return bestanden;
}

const xmlTekst = (s) => s.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

// Rode tekst herkennen (#ff0000, #cc0000, #e06666, ...; geen oranje of roze).
// Rijen met rode tekst worden niet opgenomen: bv. nog niet bevestigd of enkel voor intern gebruik.
const INDEX_ROOD = new Set(["2", "10", "16"]);
const kleurIsRood = (xml) => {
  const rgb = (xml.match(/<(?:\w+:)?color[^>]*\srgb="([0-9A-Fa-f]{6,8})"/) || [])[1];
  if (rgb) {
    const h = rgb.slice(-6), r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return r >= 0xb0 && g <= 0x70 && b <= 0x70 && r - Math.max(g, b) >= 0x60;
  }
  const idx = (xml.match(/<(?:\w+:)?color[^>]*\sindexed="(\d+)"/) || [])[1];
  return idx ? INDEX_ROOD.has(idx) : false;
};

// Tekst met opmaak per stukje (<r><rPr>…</rPr><t>…</t></r>): is een niet-leeg stukje rood?
const stukjesRood = (x) => [...String(x || "").matchAll(/<r>([\s\S]*?)<\/r>/g)].some((r) => {
  const rPr = (r[1].match(/<rPr>([\s\S]*?)<\/rPr>/) || [])[1] || "";
  return kleurIsRood(rPr) && !!xmlTekst((r[1].match(/<t[^>]*>([\s\S]*?)<\/t>/) || [])[1] || "").trim();
});

function leesXLSX(buf) {
  const z = unzip(buf);
  const si = z["xl/sharedStrings.xml"] ? [...z["xl/sharedStrings.xml"]().matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => m[1]) : [];
  const gedeeld = si.map(xmlTekst);
  // tekst waarvan (een deel) rood is
  const gedeeldRood = si.map(stukjesRood);
  // opmaak: welke stijlnummers (s="..") hebben een rood lettertype?
  const stijlRood = [];
  if (z["xl/styles.xml"]) {
    const st = z["xl/styles.xml"]();
    const fonts = [...((st.match(/<fonts[^>]*>([\s\S]*?)<\/fonts>/) || [])[1] || "").matchAll(/<font>([\s\S]*?)<\/font>|<font\/>/g)].map((m) => kleurIsRood(m[1] || ""));
    const xfs = ((st.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/) || [])[1] || "").match(/<xf\b[^>]*>/g) || [];
    xfs.forEach((xf, i) => { stijlRood[i] = !!fonts[Number((xf.match(/fontId="(\d+)"/) || [])[1] || 0)]; });
  }
  const blad = Object.keys(z).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()[0];
  if (!blad) return [];
  const xml = z[blad]();
  const kolomNr = (ref) => ref.replace(/\d+/g, "").split("").reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
  const rijen = [];
  for (const r of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const rij = [];
    let rood = false;
    for (const c of r[1].matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1];
      const ref = (attrs.match(/r="([A-Z]+\d+)"/) || [])[1];
      const type = (attrs.match(/t="(\w+)"/) || [])[1];
      const inhoud = c[2] || "";
      let v = (inhoud.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
      if (type === "s") v = gedeeld[Number(v)];
      else if (type === "inlineStr") v = xmlTekst((inhoud.match(/<is>([\s\S]*?)<\/is>/) || [])[1] || "");
      else if (type === "str") v = xmlTekst(v || "");
      else if (v !== undefined && !type) v = Number(v);
      const stijl = (attrs.match(/\ss="(\d+)"/) || [])[1];
      const gevuld = v !== undefined && String(v).trim() !== "";
      if (gevuld && ((stijl && stijlRood[Number(stijl)]) ||
          (type === "s" && gedeeldRood[Number((inhoud.match(/<v>(\d+)<\/v>/) || [])[1])]) ||
          (type === "inlineStr" && stukjesRood(inhoud)))) rood = true;
      if (ref) rij[kolomNr(ref)] = v;
    }
    rij.rood = rood;
    rijen.push(rij);
  }
  const gevuld = rijen.filter((r) => r.some((v) => v !== undefined && String(v).trim() !== ""));
  // de rij met kolomnamen nooit weglaten, ook al is ze rood opgemaakt
  const kop = gevuld.findIndex((r) => r.some((v) => veldVoor(v) === "datum"));
  const uit = gevuld.filter((r, i) => !r.rood || i === kop);
  uit.weggelaten = gevuld.length - uit.length;
  return uit;
}

const verschuif = (iso, dagen) => new Date(Date.parse(iso + "T00:00:00Z") + dagen * 86400000).toISOString().slice(0, 10);

// Interne rijen (opbouw, reizen, overnachten, ...) komen niet op de site, ook als ze niet in het rood staan.
// Er wordt alleen gekeken naar de kolommen locatie/zaal/event en stad, niet naar opmerkingen.
const INTERNE_WOORDEN = [
  "opbouw", "opbouwen", "afbouw", "afbouwen", "build up", "buildup", "build-up", "build", "setup", "set up", "set-up",
  "get in", "get-in", "get out", "get-out", "load in", "load-in", "load out", "inladen", "uitladen", "laden",
  "reizen", "reis", "reisdag", "travel", "travelling", "traveling", "rijden", "terugrijden", "heenrijden", "terugreis", "heenreis", "drive", "driving",
  "overnachten", "overnachting", "slapen", "sleep", "hotel", "camionette", "bestelwagen",
  "repareren", "herstellen", "repetitie", "repetities", "repeteren", "rehearsal", "rehearsals",
];
const INTERN_RE = new RegExp(`(^|[^a-zà-ÿ])(${INTERNE_WOORDEN.map((w) => w.replace(/[-\s]/g, "[-\\s]?")).join("|")})(?=$|[^a-zà-ÿ])`, "i");
const isIntern = (o) => [o.locatie, o.stad].some((v) => v !== undefined && INTERN_RE.test(String(v)));

// Zet rijen (eerste rij = kolomnamen) om naar speeldata
function rijenNaarData(rijen) {
  if (!rijen.length) return [];
  // Zoek de rij met de kolomnamen (de eerste rij met een "datum"-achtige kolom)
  let kopIndex = rijen.findIndex((r) => r.some((v) => veldVoor(v) === "datum"));
  if (kopIndex < 0) kopIndex = 0;
  const velden = rijen[kopIndex].map(veldVoor);
  const onbekend = rijen[kopIndex].filter((k, i) => normKey(k) && !velden[i]).map((k) => String(k).trim());
  let vorige = "";
  const intern = [];
  const data = rijen.slice(kopIndex + 1).map((r) => {
    const o = {};
    velden.forEach((veld, i) => { if (veld && r[i] !== undefined && r[i] !== "") o[veld] = r[i]; });
    const plaats = [o.locatie, o.stad].filter((x) => x !== undefined && String(x).trim()).map((x) => String(x).trim()).join(", ");
    let periode = leesPeriode(o.datum, vorige ? vorige.slice(0, 4) : "");
    // Zonder jaartal: speellijsten lopen chronologisch, dus het jaar van de vorige rij,
    // of het jaar erna als de datum anders ruim vóór de vorige zou vallen (december → januari).
    if (periode.zonderJaar && vorige && periode.datum < verschuif(vorige, -60)) periode = leesPeriode(o.datum, String(+vorige.slice(0, 4) + 1));
    if (periode.datum) vorige = periode.datum;
    if (periode.datum && isIntern(o)) { intern.push(`${o.datum}: ${[o.locatie, o.stad].filter(Boolean).join(", ")}`.trim()); return { datum: "" }; }
    return {
      datum: periode.datum,
      tot: periode.tot,
      dagen: periode.dagen,
      uur: leesUur(o.uur),
      locatie: plaats,
      link: o.link ? String(o.link).trim() : "",
      opmerking: o.opmerking ? String(o.opmerking).trim() : "",
    };
  }).filter((d) => d.datum);
  data.onbekend = onbekend;
  data.intern = intern;
  return data;
}

function leesBestand(pad) {
  const buf = fs.readFileSync(pad);
  if (/\.xlsx$/i.test(pad)) {
    const rijen = leesXLSX(buf);
    const data = rijenNaarData(rijen);
    data.rood = rijen.weggelaten || 0;
    return data;
  }
  return rijenNaarData(leesCSV(buf.toString("utf8")));
}

module.exports = { leesXLSX, leesBestand, leesDatum, leesPeriode, leesUur };
