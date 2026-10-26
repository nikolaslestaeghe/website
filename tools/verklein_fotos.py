"""Verkleint te zware foto's in static/images (automatisch via GitHub, zie .github/workflows/fotos-verkleinen.yml).

Een foto wordt aangepast als de langste zijde groter is dan 2400 pixels of het bestand groter is dan 1,5 MB.
Hij krijgt dan een langste zijde van maximaal 2200 pixels en wordt opnieuw opgeslagen in goede kwaliteit.
De bestandsnaam blijft dezelfde, zodat de site en de beheerpagina gewoon blijven werken.
"""

import os
import sys

from PIL import Image, ImageOps

MAP = sys.argv[1] if len(sys.argv) > 1 else "static/images"
MAX_ZIJDE = 2400        # vanaf hier verkleinen
DOEL_ZIJDE = 2200       # nieuwe langste zijde
MAX_BYTES = 1_500_000   # of vanaf dit gewicht
KWALITEIT = 82

aangepast = []
for naam in sorted(os.listdir(MAP)):
    pad = os.path.join(MAP, naam)
    ext = naam.lower().rsplit(".", 1)[-1] if "." in naam else ""
    if ext not in ("jpg", "jpeg", "png", "webp"):
        continue
    voor = os.path.getsize(pad)
    try:
        im = Image.open(pad)
        im.load()
    except Exception as e:
        print(f"overgeslagen (onleesbaar): {naam}: {e}")
        continue
    if max(im.size) <= MAX_ZIJDE and voor <= MAX_BYTES:
        continue

    im = ImageOps.exif_transpose(im)  # gsm-foto's juist gedraaid houden
    if max(im.size) > DOEL_ZIJDE:
        im.thumbnail((DOEL_ZIJDE, DOEL_ZIJDE), Image.LANCZOS)

    if ext in ("jpg", "jpeg"):
        im.convert("RGB").save(pad, "JPEG", quality=KWALITEIT, optimize=True, progressive=True)
    elif ext == "webp":
        im.save(pad, "WEBP", quality=KWALITEIT)
    else:  # png: formaat behouden (kan transparantie bevatten)
        if im.mode == "P":
            im = im.convert("RGBA")
        im.save(pad, "PNG", optimize=True)
        # een png-foto zonder transparantie die nog steeds zwaar is: sterker comprimeren met behoud van naam
        ondoorzichtig = im.mode == "RGB" or (im.mode == "RGBA" and im.getextrema()[3] == (255, 255))
        if os.path.getsize(pad) > MAX_BYTES and ondoorzichtig:
            im.convert("RGB").quantize(colors=256, method=Image.MEDIANCUT).save(pad, "PNG", optimize=True)

    na = os.path.getsize(pad)
    aangepast.append(naam)
    print(f"verkleind: {naam}: {voor / 1e6:.1f} MB -> {na / 1e6:.1f} MB, {im.size[0]}x{im.size[1]}")

print(f"{len(aangepast)} foto('s) verkleind.")
