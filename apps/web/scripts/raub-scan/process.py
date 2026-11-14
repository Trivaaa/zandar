"""Raub mađarice, korak 2 (changelog 153). Izrezane karte (detect.py) -> lica za public/cards/hu + ikonice boje.

python process.py <crops> <out_web> <out_master>
"""
import sys, os
import cv2
import numpy as np
from PIL import Image

crops, out_web, out_master = sys.argv[1:4]
os.makedirs(out_web, exist_ok=True)
os.makedirs(out_master, exist_ok=True)

# fajl skena + indeks karte (redoslijed iz detect.py) -> ime slike u aplikaciji
MAP = {
    "Raub karte - bunda 2": ["bells_10", "bells_7", "bells_9", "bells_8"],
    "Raub karte - list 1": ["leaves_king", "leaves_ace", "leaves_ober", "leaves_unter"],
    "Raub karte - list 2": ["leaves_7", "leaves_10", "leaves_9", "leaves_8"],
    "Raub karte bunda 1": ["bells_unter", "bells_ace", "bells_ober", "bells_king"],
    "Raub karte scra 1": ["hearts_7", "hearts_8", "hearts_9", "hearts_10"],
    "Raub karte srca 2": ["hearts_ober", "hearts_unter", "hearts_king", "hearts_ace"],
    "Raub karte zir 1": ["acorns_king", "acorns_ober", "acorns_unter", "acorns_7"],
    "Raub karte zir 2": ["acorns_10", "acorns_9", "acorns_ace", "acorns_8"],
}
INSET = 12           # px na 600 dpi: tamni rub skenera uz ivicu karte
MW, MH = 960, 1508   # master (odnos 1.571)
W, H = 240, 377      # aplikacija: sirina kao francuski komplet, odnos 1.571
RADIUS = 0.075       # udio sirine, isto kao build-cards.mjs i --card-radius
PAPER = 250.0        # cilj za boju papira


def rounded_mask(w, h, r, scale=4):
    big = Image.new("L", (w * scale, h * scale), 0)
    from PIL import ImageDraw
    ImageDraw.Draw(big).rounded_rectangle((0, 0, w * scale - 1, h * scale - 1), r * scale, fill=255)
    return big.resize((w, h), Image.LANCZOS)


masters = {}
for scan, names in MAP.items():
    for i, name in enumerate(names):
        img = cv2.imdecode(np.fromfile(os.path.join(crops, f"{scan}__{i}.png"), np.uint8), cv2.IMREAD_COLOR)
        img = img[INSET:-INSET, INSET:-INSET]
        h, w = img.shape[:2]
        # papir: lijeva i desna margina izmedju ivice i okvirne linije, srednji dio visine
        strips = np.concatenate([img[h // 5: 4 * h // 5, 20:70], img[h // 5: 4 * h // 5, w - 70: w - 20]], axis=1)
        px = strips.reshape(-1, 3).astype(np.float32)
        lum = px.mean(1)
        paper = np.median(px[lum > np.percentile(lum, 40)], axis=0)  # bez prasine i linija
        gain = PAPER / paper
        img = np.clip(img.astype(np.float32) * gain, 0, 255).astype(np.uint8)
        rgb = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB)).resize((MW, MH), Image.LANCZOS)
        masters[name] = rgb
        m = rgb.copy(); m.putalpha(rounded_mask(MW, MH, MW * RADIUS))
        m.save(os.path.join(out_master, f"{name}.png"))
        small = rgb.resize((W, H), Image.LANCZOS)
        small.putalpha(rounded_mask(W, H, W * RADIUS))
        small.save(os.path.join(out_web, f"{name}.webp"), "WEBP", quality=85, alpha_quality=90, method=6)
        print(name, "papir", paper.round(1), "->", os.path.getsize(os.path.join(out_web, f"{name}.webp")), "B")

# Ikonice boje za tekst: znak u gornjem lijevom uglu dame (ober) - jedini znak, bez figure.
ICON = 96
for suit in ["hearts", "leaves", "acorns", "bells"]:
    rgb = np.array(masters[f"{suit}_ober"]).astype(np.float32)
    box = rgb[40:400, 40:400]  # na masteru 960 px: ugao unutar okvira
    dist = np.linalg.norm(box - PAPER, axis=2)
    ink = (dist > 45).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(cv2.morphologyEx(ink, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8)))
    # najveca komponenta koja nije okvirna linija (linija je tanka i duga)
    best = max(range(1, n), key=lambda k: stats[k, cv2.CC_STAT_AREA] if min(stats[k, 2], stats[k, 3]) > 40 else 0)
    keep = (lab == best)
    keep = cv2.dilate(keep.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
    a = np.clip((dist - 20) / 40 * 255, 0, 255) * keep
    x, y, bw, bh = stats[best, 0], stats[best, 1], stats[best, 2], stats[best, 3]
    pad = 4
    rgba = np.dstack([box, a]).astype(np.uint8)[max(0, y - pad): y + bh + pad, max(0, x - pad): x + bw + pad]
    icon = Image.fromarray(rgba, "RGBA")
    icon.thumbnail((ICON, ICON), Image.LANCZOS)
    canvas = Image.new("RGBA", (ICON, ICON), (0, 0, 0, 0))
    canvas.alpha_composite(icon, ((ICON - icon.width) // 2, (ICON - icon.height) // 2))
    canvas.save(os.path.join(out_web, f"suit-{suit}.webp"), "WEBP", quality=90, alpha_quality=100, method=6)
    canvas.save(os.path.join(out_master, f"suit-{suit}.png"))
    print("ikonica", suit, (bw, bh))
