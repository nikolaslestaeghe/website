"""Haalt speellijsten op uit Google Sheets en bewaart ze als CSV in static/bestanden/sheets/.

Draait automatisch via GitHub (.github/workflows/speellijsten-ophalen.yml): elke ochtend en middag,
en telkens een project bewaard wordt. Verandert er iets in een sheet, dan wordt de site opnieuw gebouwd.

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
import urllib.request

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
                req = urllib.request.Request(url, headers={"User-Agent": "website-speellijsten"})
                with urllib.request.urlopen(req, timeout=30) as r:
                    inhoud = r.read()
                if inhoud.lstrip()[:15].lower().startswith((b"<!doctype", b"<html")):
                    raise ValueError("Google gaf een webpagina terug in plaats van gegevens. Staat het blad gedeeld als 'Iedereen met de link kan bekijken'?")
            except Exception as e:
                print(f"::warning::{slug}: kon de sheet niet ophalen ({e}). De vorige versie blijft staan.")
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
