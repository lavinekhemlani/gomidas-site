#!/usr/bin/env python3
"""Make every photo light enough for a phone on a slow network.

For each photo under cars/ and brand/people/ this writes AVIF and WebP copies
at a few widths next to the original (creta-1.jpg -> creta-1-w480.avif, ...),
shrinks the original JPEG itself (it stays as the fallback for old browsers),
and records which widths exist in index.html between the IMGSET markers, so
the page only ever asks for files that are really there.

Run it after adding or replacing any photo:
    python3 tools/optimize_images.py
Already-current variants are skipped, so re-running is cheap.
"""
import json
import os
import re
import sys

from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIRS = ["cars", "brand/people"]
WIDTHS = [480, 800, 1200, 1600]
AVIF_Q, WEBP_Q, JPEG_Q = 60, 76, 80
VARIANT = re.compile(r"-w\d+\.(avif|webp)$")


def photos():
    for d in DIRS:
        for base, _, files in os.walk(os.path.join(ROOT, d)):
            for f in sorted(files):
                if f.lower().endswith((".jpg", ".jpeg", ".png")) and not VARIANT.search(f):
                    yield os.path.join(base, f)


def fresh(out, src):
    return os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(src)


def wrap_static(s, manifest):
    """Photos written straight into the HTML (not built by the page's JS) get
    their <picture> sources here. Old wrappers are removed first, so re-running
    after photos change keeps them in step. An img's own sizes="" is honoured."""
    parts = re.split(r"(<script(?![^>]*src)[^>]*>.*?</script>)", s, flags=re.S)
    for i in range(0, len(parts), 2):
        seg = re.sub(r"<picture data-auto>(?:<source[^>]*>)*(<img[^>]*>)</picture>", r"\1", parts[i])

        def wrap(m):
            img, src = m.group(0), m.group(1)
            ws = manifest.get(src)
            if not ws:
                return img
            sz = re.search(r'\bsizes="([^"]+)"', img)
            sizes = sz.group(1) if sz else "(max-width:640px) 75vw, 40vw"
            stem = os.path.splitext(src)[0]
            ss = lambda ext: ", ".join(f"{stem}-w{w}.{ext} {w}w" for w in ws)
            return (f'<picture data-auto><source type="image/avif" srcset="{ss("avif")}" sizes="{sizes}">'
                    f'<source type="image/webp" srcset="{ss("webp")}" sizes="{sizes}">{img}</picture>')

        parts[i] = re.sub(r'<img\b[^>]*\bsrc="((?:cars|brand/people)/[^"]+\.(?:jpe?g|png))"[^>]*>', wrap, seg)
    return "".join(parts)


def main():
    manifest, saved_before, saved_after = {}, 0, 0
    for path in photos():
        rel = os.path.relpath(path, ROOT).replace(os.sep, "/")
        with Image.open(path) as im:
            im = ImageOps.exif_transpose(im)
            if im.mode not in ("RGB", "L"):
                if path.lower().endswith(".png") and "A" in im.getbands():
                    continue  # transparent PNGs are logos/cut-outs, leave them alone
                im = im.convert("RGB")
            w0 = im.width
            if w0 < 200:
                continue
            widths = sorted({min(w, w0) for w in WIDTHS})
            stem = os.path.splitext(path)[0]
            for w in widths:
                h = round(im.height * w / w0)
                r = im if w == w0 else im.resize((w, h), Image.LANCZOS)
                for ext, kw in (("avif", {"quality": AVIF_Q, "speed": 6}), ("webp", {"quality": WEBP_Q, "method": 6})):
                    out = f"{stem}-w{w}.{ext}"
                    if not fresh(out, path):
                        r.save(out, **kw)
            manifest[rel] = widths

            # The original stays as the fallback; cap it at 1600px, progressive.
            if path.lower().endswith((".jpg", ".jpeg")):
                before = os.path.getsize(path)
                r = im if w0 <= 1600 else im.resize((1600, round(im.height * 1600 / w0)), Image.LANCZOS)
                tmp = path + ".tmp"
                r.save(tmp, "JPEG", quality=JPEG_Q, optimize=True, progressive=True)
                if os.path.getsize(tmp) < before * 0.85:
                    os.replace(tmp, path)
                    for w in widths:  # keep variants "fresh" relative to the rewritten source
                        for ext in ("avif", "webp"):
                            os.utime(f"{stem}-w{w}.{ext}")
                else:
                    os.remove(tmp)
                saved_before += before
                saved_after += os.path.getsize(path)

    html = os.path.join(ROOT, "index.html")
    s = open(html, encoding="utf-8").read()
    block = "/*IMGSET*/" + json.dumps(manifest, separators=(",", ":")) + "/*END IMGSET*/"
    s2, n = re.subn(r"/\*IMGSET\*/.*?/\*END IMGSET\*/", lambda m: block, s, flags=re.S)
    if n != 1:
        sys.exit("index.html has no IMGSET marker; nothing written")
    s2 = wrap_static(s2, manifest)
    if s2 != s:
        open(html, "w", encoding="utf-8").write(s2)
    print(f"{len(manifest)} photos; fallback JPEGs {saved_before/1e6:.1f} MB -> {saved_after/1e6:.1f} MB")


if __name__ == "__main__":
    main()
