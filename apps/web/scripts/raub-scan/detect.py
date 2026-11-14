"""Raub mađarice, korak 1 (changelog 153). Nadji karte na skenu (crna podloga), ispravi nagib, snimi svaku kao PNG.

python detect.py <folder_skenova> <izlaz>
"""
import sys, os, glob, json
import cv2
import numpy as np

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
report = []
for path in sorted(glob.glob(os.path.join(src, "*.jpg"))):
    name = os.path.splitext(os.path.basename(path))[0]
    img = cv2.imdecode(np.fromfile(path, np.uint8), cv2.IMREAD_COLOR)
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # karta je svijetla, podloga crna; zatvori rupe od crteza
    _, th = cv2.threshold(cv2.GaussianBlur(gray, (9, 9), 0), 90, 255, cv2.THRESH_BINARY)
    th = cv2.morphologyEx(th, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
    cnts, _ = cv2.findContours(th, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cards = [c for c in cnts if cv2.contourArea(c) > 0.02 * w * h]
    cards.sort(key=lambda c: (cv2.boundingRect(c)[1] // 800, cv2.boundingRect(c)[0]))
    for i, c in enumerate(cards):
        (cx, cy), (rw, rh), ang = cv2.minAreaRect(c)
        x, y, bw, bh = cv2.boundingRect(c)
        touches = x <= 3 or y <= 3 or x + bw >= w - 3 or y + bh >= h - 3
        box = cv2.boxPoints(((cx, cy), (rw, rh), ang)).astype(np.float32)
        # poredaj tacke: gore-lijevo, gore-desno, dole-desno, dole-lijevo
        s = box.sum(1); d = np.diff(box, axis=1).ravel()
        tl, br = box[np.argmin(s)], box[np.argmax(s)]
        tr, bl = box[np.argmin(d)], box[np.argmax(d)]
        W = int(round(np.linalg.norm(tr - tl))); H = int(round(np.linalg.norm(bl - tl)))
        M = cv2.getPerspectiveTransform(np.array([tl, tr, br, bl]), np.float32([[0, 0], [W, 0], [W, H], [0, H]]))
        warped = cv2.warpPerspective(img, M, (W, H), flags=cv2.INTER_CUBIC)
        if W > H:
            warped = cv2.rotate(warped, cv2.ROTATE_90_CLOCKWISE)
            W, H = H, W
        fn = f"{name}__{i}.png"
        cv2.imencode(".png", warped)[1].tofile(os.path.join(out, fn))
        report.append({"file": fn, "w": W, "h": H, "ratio": round(H / W, 3), "touches_edge": touches, "angle": round(ang, 2)})
for r in report:
    print(r)
print(len(report), "karata")
