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
  datum: ["datum", "date", "dag", "speeldatum"],
  uur: ["uur", "tijd", "aanvang", "time", "start", "beginuur"],
  locatie: ["locatie", "zaal", "plaats", "venue", "organisator", "organisatie", "cc", "theater"],
  stad: ["stad", "gemeente", "city", "woonplaats"],
  link: ["link", "tickets", "ticket", "url", "website", "info link"],
  opmerking: ["opmerking", "info", "notitie", "extra", "opmerkingen"],
};

const normKey = (k) => String(k ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const veldVoor = (kop) => {
  const k = normKey(kop);
  for (const [veld, namen] of Object.entries(KOLOMMEN)) if (namen.includes(k)) return veld;
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

// Zet allerlei schrijfwijzen om naar JJJJ-MM-DD
function leesDatum(waarde) {
  if (waarde === undefined || waarde === null || waarde === "") return "";
  if (typeof waarde === "number" || /^\d{4,5}(\.\d+)?$/.test(String(waarde).trim())) return excelDatum(waarde);
  const s = String(waarde).trim().toLowerCase();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = s.match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
  if (m) return `${m[3].length === 2 ? "20" + m[3] : m[3]}-${pad(m[2])}-${pad(m[1])}`;
  m = s.match(/(\d{1,2})\s+([a-z]{3})[a-z]*\.?\s+(\d{4})/); // 12 november 2026
  if (m && MAANDNAMEN[m[2]]) return `${m[3]}-${pad(MAANDNAMEN[m[2]])}-${pad(m[1])}`;
  return "";
}

// Meerdere dagen in één cel: "8 en 9/11/25", "29-30/11/25", "17,18,19/10/26", "14+15/10/26", "5-7/02/2027"
// Geeft { datum (eerste dag), tot (laatste dag), dagen (tekst, bv. "8 en 9") } terug.
function leesPeriode(waarde) {
  if (typeof waarde !== "number" && !/^\d{4,5}(\.\d+)?$/.test(String(waarde ?? "").trim())) {
    const s = String(waarde ?? "").trim().toLowerCase();
    const m = s.match(/^((?:\d{1,2}\s*(?:-|–|en|&|\+|,)\s*)+\d{1,2})\s*[\/.\-]\s*(\d{1,2})\s*[\/.\-]\s*(\d{2,4})/);
    if (m) {
      const jaar = m[3].length === 2 ? "20" + m[3] : m[3];
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
        const tekst = bereik && dagen.length > 2
          ? `${eerste} – ${laatste}`
          : dagen.length === 1 ? String(eerste) : `${dagen.slice(0, -1).join(", ")} en ${laatste}`;
        return { datum: `${jaar}-${pad(m[2])}-${pad(eerste)}`, tot: `${jaar}-${pad(m[2])}-${pad(laatste)}`, dagen: tekst };
      }
    }
  }
  const d = leesDatum(waarde);
  return { datum: d, tot: d, dagen: "" };
}

function leesUur(waarde) {
  if (waarde === undefined || waarde === null || waarde === "") return "";
  if (typeof waarde === "number" || /^0?\.\d+$/.test(String(waarde).trim())) return excelUur(waarde);
  const m = String(waarde).match(/(\d{1,2})\s*[:hu.]\s*(\d{2})?/i);
  return m ? `${pad(m[1])}:${m[2] || "00"}` : String(waarde).trim();
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

function leesXLSX(buf) {
  const z = unzip(buf);
  const gedeeld = z["xl/sharedStrings.xml"]
    ? [...z["xl/sharedStrings.xml"]().matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => xmlTekst(m[1]))
    : [];
  const blad = Object.keys(z).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()[0];
  if (!blad) return [];
  const xml = z[blad]();
  const kolomNr = (ref) => ref.replace(/\d+/g, "").split("").reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
  const rijen = [];
  for (const r of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const rij = [];
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
      if (ref) rij[kolomNr(ref)] = v;
    }
    rijen.push(rij);
  }
  return rijen.filter((r) => r.some((v) => v !== undefined && String(v).trim() !== ""));
}

// Zet rijen (eerste rij = kolomnamen) om naar speeldata
function rijenNaarData(rijen) {
  if (!rijen.length) return [];
  // Zoek de rij met de kolomnamen (de eerste rij met een "datum"-achtige kolom)
  let kopIndex = rijen.findIndex((r) => r.some((v) => veldVoor(v) === "datum"));
  if (kopIndex < 0) kopIndex = 0;
  const velden = rijen[kopIndex].map(veldVoor);
  return rijen.slice(kopIndex + 1).map((r) => {
    const o = {};
    velden.forEach((veld, i) => { if (veld && r[i] !== undefined && r[i] !== "") o[veld] = r[i]; });
    const plaats = [o.locatie, o.stad].filter((x) => x !== undefined && String(x).trim()).map((x) => String(x).trim()).join(", ");
    const periode = leesPeriode(o.datum);
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
}

function leesBestand(pad) {
  const buf = fs.readFileSync(pad);
  if (/\.xlsx$/i.test(pad)) return rijenNaarData(leesXLSX(buf));
  return rijenNaarData(leesCSV(buf.toString("utf8")));
}

module.exports = { leesBestand, leesDatum, leesPeriode, leesUur };
