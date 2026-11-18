# -*- coding: utf-8 -*-
"""Тануды тексеруге арналған синтетикалық «қолмен салынған» суреттер.

Нақты оқушы сызбалары емес — қолдың дірілі, қисық сызық, әркелкі жарық және
қағаз түйіршігі имитацияланады. Алгоритмнің шегін жылдам өлшеуге арналған.
"""
import hashlib
import math
import os
import random
import sys

from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures")
W = H = 420


def paper(rng):
    """Қағаз фоны: әркелкі жарық + түйіршік."""
    img = Image.new("RGB", (W, H), (243, 240, 232))
    d = ImageDraw.Draw(img)
    # жарықтың біркелкі түспеуі
    cx, cy = rng.uniform(0, W), rng.uniform(0, H)
    for i in range(26):
        k = 1 - i / 26
        r = int(max(W, H) * (0.25 + 0.75 * k))
        v = int(244 - 26 * (1 - k))
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(v, v - 2, v - 8))
    img = img.filter(ImageFilter.GaussianBlur(14))
    px = img.load()
    for _ in range(5200):
        x, y = rng.randrange(W), rng.randrange(H)
        n = rng.randint(-13, 7)
        r, g, b = px[x, y]
        px[x, y] = (max(0, r + n), max(0, g + n), max(0, b + n))
    return img


def shaky_line(d, a, b, rng, width):
    """Қолмен сызылғандай дірілдеген сызық."""
    length = math.hypot(b[0] - a[0], b[1] - a[1])
    steps = max(6, int(length / 9))
    ux, uy = (b[0] - a[0]) / length, (b[1] - a[1]) / length
    nx, ny = -uy, ux
    amp = rng.uniform(0.9, 2.3)
    pts = []
    phase = rng.uniform(0, 6.28)
    for i in range(steps + 1):
        t = i / steps
        off = math.sin(phase + t * rng.uniform(2.0, 4.5)) * amp + rng.uniform(-0.7, 0.7)
        pts.append((a[0] + ux * length * t + nx * off,
                    a[1] + uy * length * t + ny * off))
    for i in range(len(pts) - 1):
        gray = rng.randint(38, 92)
        d.line([pts[i], pts[i + 1]], fill=(gray, gray, gray + rng.randint(0, 12)),
               width=max(1, int(width + rng.randint(-1, 1))))


def draw_polygon(img, pts, rng, gap=False):
    d = ImageDraw.Draw(img)
    width = rng.choice([2, 3, 3, 4])
    n = len(pts)
    for i in range(n):
        a, b = pts[i], pts[(i + 1) % n]
        if gap and i == rng.randrange(n):
            # қарындаш үзіліп қалған жағдай
            mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
            shaky_line(d, a, (a[0] + (mx - a[0]) * 0.72, a[1] + (my - a[1]) * 0.72), rng, width)
            shaky_line(d, (mx + (b[0] - mx) * 0.28, my + (b[1] - my) * 0.28), b, rng, width)
        else:
            shaky_line(d, a, b, rng, width)
    return img


def rotate(pts, ang, cx, cy):
    c, s = math.cos(ang), math.sin(ang)
    return [((x - cx) * c - (y - cy) * s + cx, (x - cx) * s + (y - cy) * c + cy) for x, y in pts]


def fit_to_canvas(pts, margin=26):
    """Фигура кадрға толық сыятындай етіп масштабтап, ортаға түсіреді."""
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    bw, bh = max(xs) - min(xs), max(ys) - min(ys)
    k = min((W - 2 * margin) / bw, (H - 2 * margin) / bh, 1.0)
    cx0, cy0 = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
    return [((x - cx0) * k + W / 2, (y - cy0) * k + H / 2) for x, y in pts]


def make(kind, rng):
    img = paper(rng)
    cx, cy = W / 2 + rng.uniform(-18, 18), H / 2 + rng.uniform(-18, 18)
    s = rng.uniform(105, 150)
    ang = rng.uniform(-0.28, 0.28)

    if kind == "triangle":
        pts = [(cx, cy - s), (cx + s * rng.uniform(0.8, 1.1), cy + s * 0.78),
               (cx - s * rng.uniform(0.8, 1.1), cy + s * 0.78)]
    elif kind == "square":
        pts = [(cx - s, cy - s), (cx + s, cy - s), (cx + s, cy + s), (cx - s, cy + s)]
    elif kind == "rectangle":
        a, b = s * rng.uniform(1.05, 1.35), s * rng.uniform(0.52, 0.72)
        pts = [(cx - a, cy - b), (cx + a, cy - b), (cx + a, cy + b), (cx - a, cy + b)]
    elif kind == "parallelogram":
        sh = s * rng.uniform(0.42, 0.62)
        a, b = s * rng.uniform(0.95, 1.2), s * rng.uniform(0.6, 0.78)
        pts = [(cx - a + sh, cy - b), (cx + a + sh, cy - b), (cx + a - sh, cy + b), (cx - a - sh, cy + b)]
    elif kind == "trapezoid":
        top = s * rng.uniform(0.42, 0.62)
        bot = s * rng.uniform(1.0, 1.25)
        b = s * rng.uniform(0.62, 0.8)
        pts = [(cx - top, cy - b), (cx + top, cy - b), (cx + bot, cy + b), (cx - bot, cy + b)]
    elif kind == "circle":
        pts = []
        r = s * rng.uniform(0.9, 1.05)
        steps = 40
        for i in range(steps):
            t = i / steps * 2 * math.pi
            rr = r * (1 + rng.uniform(-0.035, 0.035))
            pts.append((cx + math.cos(t) * rr, cy + math.sin(t) * rr * rng.uniform(0.95, 1.0)))
    else:
        raise ValueError(kind)

    if kind != "circle":
        pts = rotate(pts, ang, cx, cy)

    pts = fit_to_canvas(pts)
    draw_polygon(img, pts, rng, gap=rng.random() < 0.35)
    return img


KINDS = ["triangle", "square", "rectangle", "parallelogram", "trapezoid", "circle"]

if __name__ == "__main__":
    per = int(sys.argv[1]) if len(sys.argv) > 1 else 5
    salt = sys.argv[2] if len(sys.argv) > 2 else ""
    outdir = sys.argv[3] if len(sys.argv) > 3 else None
    OUT = outdir and os.path.join(os.path.dirname(os.path.abspath(__file__)), outdir) or OUT
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith((".png", ".jpg")):
            os.remove(os.path.join(OUT, f))
    names = []
    for kind in KINDS:
        for i in range(per):
            seed = hashlib.sha1(f"{kind}|{i}|{salt}".encode()).hexdigest()[:8]
            rng = random.Random(int(seed, 16))
            img = make(kind, rng)
            # нақты телефон суретіне жақын болу үшін JPEG: қысу іздері де бар
            name = f"{kind}-{i + 1}.jpg"
            img.save(os.path.join(OUT, name), quality=82)
            names.append(name)
    with open(os.path.join(OUT, "index.json"), "w", encoding="utf-8") as fh:
        import json
        json.dump(names, fh, ensure_ascii=False, indent=1)
    print(f"{len(names)} сурет жасалды -> {OUT}")
