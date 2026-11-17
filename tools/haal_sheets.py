"""Haalt speellijsten op uit Google Sheets en bewaart ze als CSV in static/bestanden/sheets/.

Draait automatisch via GitHub (.github/workflows/speellijsten-ophalen.yml): elke ochtend en middag,
en telkens een project bewaard wordt. Verandert er iets in een sheet, dan wordt de site opnieuw gebouwd.

Rijen met rode tekst (bv. nog niet bevestigd, of enkel voor intern gebruik) worden weggelaten.
Daarvoor wordt naast de gewone gegevens (CSV) ook de opmaak (xlsx) opgehaald.

Werkt met twee soorten links (veld "Google Sheets-link" bij een project):
  - een gewone link naar het blad, gedeeld als "Iedereen met de link kan bekijken"
    https://docs.google.com/spreadsheets/d/<ID>/edit?gid=<tabblad>
  - een link via Bestand > Delen > Publiceren op internet
    https://docs.google.com/spreadsheets/d/e/<ID>/pubhtml?gid=<tabblad>
"""

import glob
import hashlib
import json
import os
import re
import sys
import csv
import io
import urllib.request

try:
    import openpyxl
except ImportError:  # zonder openpyxl werkt alles, maar worden rode rijen niet herkend
    openpyxl = None

PROJECTEN = "content/projecten"
DOEL = "static/bestanden/sheets"


def csv_url(link):
    link = link.strip()
    gid = re.search(r"[#&?]gid=(\d+)", link)
    gid = gid.group(1) if gid else None
    m = re.search(r"/spreadsheets/d/e/([\w-]+)", link)
    if m:  # gepubliceerd op internet
        url = f"https://docs.google.com/spreadsheets/d/e/{m.group(1)}/pub?output=csv"
        return url + (f"&gid={gid}&single=true" if gid else "")
    m = re.search(r"/spreadsheets/d/([\w-]+)", link)
    if m:  # gewone deellink
        return f"https://docs.google.com/spreadsheets/d/{m.group(1)}/export?format=csv" + (f"&gid={gid}" if gid else "")
    return None


def xlsx_url(link):
    """Zelfde sheet, maar als Excel-bestand (met opmaak)."""
    url = csv_url(link)
    if not url:
        return None
    if "/pub?" in url:
        return url.replace("output=csv", "output=xlsx")
    return url.replace("format=csv", "format=xlsx")


def ophalen(url):
    req = urllib.request.Request(url, headers={"User-Agent": "website-speellijsten"})
    with urllib.request.urlopen(req, timeout=60) as r:
        inhoud = r.read()
    if inhoud.lstrip()[:15].lower().startswith((b"<!doctype", b"<html")):
        raise ValueError("Google gaf een webpagina terug in plaats van gegevens. Staat het blad gedeeld als 'Iedereen met de link kan bekijken'?")
    return inhoud


def is_rood(kleur):
    """Herkent rood en donker-/lichtrood (#ff0000, #cc0000, #e06666, ...), geen oranje of roze."""
    if kleur is None or getattr(kleur, "type", None) != "rgb" or not isinstance(kleur.rgb, str):
        if kleur is not None and getattr(kleur, "type", None) == "indexed" and kleur.indexed in (2, 10, 16):
            return True
        return False
    h = kleur.rgb[-6:]
    try:
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    except ValueError:
        return False
    return r >= 0xB0 and g <= 0x70 and b <= 0x70 and r - max(g, b) >= 0x60


def cel_is_rood(cel):
    v = cel.value
    if v is None or str(v).strip() == "":
        return False
    if cel.font is not None and is_rood(cel.font.color):
        return True
    # tekst waarvan maar een deel rood is
    if not isinstance(v, (str, int, float)) and hasattr(v, "__iter__"):
        for deel in v:
            font = getattr(deel, "font", None)
            if font is not None and str(getattr(deel, "text", "")).strip() and is_rood(getattr(font, "color", None)):
                return True
    return False


def tekst(v):
    if v is None:
        return ""
    if hasattr(v, "strftime"):
        return v.strftime("%Y-%m-%d")
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return str(v).strip()


def rode_rijen_weglaten(csv_bytes, xlsx_bytes):
    """Geeft de CSV terug zonder de rijen die in het Excel-bestand rode tekst bevatten.
    Het juiste tabblad wordt gezocht door de tekst te vergelijken met de CSV;
    rij 1 van de CSV is rij 1 van het tabblad."""
    rijen = list(csv.reader(io.StringIO(csv_bytes.decode("utf-8-sig"))))
    if not openpyxl or not rijen:
        return csv_bytes, 0
    wb = openpyxl.load_workbook(io.BytesIO(xlsx_bytes), rich_text=True)
    beste, beste_score = None, -1
    for ws in wb.worksheets:
        score = 0
        for i, rij in enumerate(ws.iter_rows(min_row=1, max_row=min(ws.max_row, len(rijen), 40))):
            waarden = {tekst(c.value) for c in rij}
            score += sum(1 for w in rijen[i] if w.strip() and w.strip() in waarden)
        if score > beste_score:
            beste, beste_score = ws, score
    if beste is None or beste_score <= 0:
        return csv_bytes, 0
    excel_rijen = list(beste.iter_rows(min_row=1, max_row=len(rijen)))
    uit, weg = [], 0
    for i, r in enumerate(rijen):
        if i < len(excel_rijen) and any(cel_is_rood(c) for c in excel_rijen[i]):
            weg += 1
            continue
        uit.append(r)
    buf = io.StringIO()
    csv.writer(buf, lineterminator="\n").writerows(uit)
    return buf.getvalue().encode("utf-8"), weg


def bestandsnaam(slug, link):
    # Moet overeenkomen met sheetBestand() in build.js
    return f"{slug}-{hashlib.sha1(link.strip().encode()).hexdigest()[:10]}.csv"


def main():
    os.makedirs(DOEL, exist_ok=True)
    nodig = set()
    fouten = 0
    for pad in sorted(glob.glob(f"{PROJECTEN}/*.json")):
        slug = os.path.basename(pad)[:-5]
        d = json.load(open(pad, encoding="utf-8"))
        links = d.get("speellijst_sheet") or []
        if isinstance(links, str):
            links = [links]
        for link in [l for l in links if str(l).strip()]:
            naam = bestandsnaam(slug, link)
            nodig.add(naam)
            url = csv_url(link)
            if not url:
                print(f"::warning::{slug}: geen geldige Google Sheets-link: {link}")
                fouten += 1
                continue
            try:
                inhoud = ophalen(url)
            except Exception as e:
                print(f"::warning::{slug}: kon de sheet niet ophalen ({e}). De vorige versie blijft staan.")
                fouten += 1
                continue
            try:
                inhoud, weg = rode_rijen_weglaten(inhoud, ophalen(xlsx_url(link)))
                if weg:
                    print(f"{slug}: {weg} rij(en) met rode tekst weggelaten")
            except Exception as e:
                print(f"::warning::{slug}: kon de opmaak niet lezen ({e}); rode rijen konden niet herkend worden. De vorige versie blijft staan.")
                fouten += 1
                continue
            doel = os.path.join(DOEL, naam)
            oud = open(doel, "rb").read() if os.path.exists(doel) else None
            if oud != inhoud:
                open(doel, "wb").write(inhoud)
                print(f"bijgewerkt: {slug} ({naam})")
            else:
                print(f"ongewijzigd: {slug}")
    # sheets die niet meer gekoppeld zijn opruimen
    for f in os.listdir(DOEL):
        if f.endswith(".csv") and f not in nodig:
            os.remove(os.path.join(DOEL, f))
            print(f"verwijderd (niet meer gekoppeld): {f}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
