// Қолмен салынған геометриялық фигураны тану
//
// Жұмыс тәртібі:
//   1) сұр түске келтіру және бейімделетін табалдырықпен екілік кескін алу
//   2) ең үлкен байланысқан сия аймағын табу
//   3) сол аймақтың дөңес қабығын (convex hull) құру
//   4) қабықты Дуглас–Пекер әдісімен жеңілдету
//   5) төбе саны, бұрыштары және қабырғаларының параллельдігі бойынша жіктеу
//
// Дөңес қабық таңдалуының себебі: біз танитын бес фигураның бәрі дөңес,
// сондықтан қабық — дәл сол фигураның контуры. Оған қоса, қарындашпен
// салынған сызық үзік-үзік болса да нәтиже бұзылмайды.

export const LABELS = {
  triangle: "Үшбұрыш",
  square: "Шаршы",
  rectangle: "Тіктөртбұрыш",
  parallelogram: "Параллелограмм",
  trapezoid: "Трапеция",
  circle: "Шеңбер",
};

/** Танылған фигураны қай тақырыппен байланыстыру керек */
export const TOPIC_FOR = {
  triangle: "trianglemid",
  square: "quadfamily",
  rectangle: "quadfamily",
  parallelogram: "parallelogram",
  trapezoid: "trapezoid",
  circle: "circleangles",
};

/* ------------------------------------------------------------------ */
/*  1–2. Кескінді дайындау                                             */
/* ------------------------------------------------------------------ */

function toGray(image) {
  const { width: w, height: h, data } = image;
  const gray = new Uint8ClampedArray(w * h);
  for (let p = 0, i = 0; p < gray.length; p++, i += 4) {
    gray[p] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
  }
  return gray;
}

/** Интегралдық кескін — терезе бойынша орташа мәнді жылдам есептеу үшін */
function integral(gray, w, h) {
  const sum = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += gray[y * w + x];
      sum[(y + 1) * (w + 1) + x + 1] = sum[y * (w + 1) + x + 1] + row;
    }
  }
  return sum;
}

/**
 * Бейімделетін табалдырық: пиксел өз маңайының орташасынан C-ға қараңғы
 * болса, оны сия деп санаймыз. Бұл әркелкі жарықта да жұмыс істейді.
 */
function binarize(gray, w, h, C = 10) {
  const sum = integral(gray, w, h);
  const half = Math.max(4, Math.round(Math.min(w, h) / 16));
  const ink = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - half), y1 = Math.min(h - 1, y + half);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - half), x1 = Math.min(w - 1, x + half);
      const area = (x1 - x0 + 1) * (y1 - y0 + 1);
      const s =
        sum[(y1 + 1) * (w + 1) + x1 + 1] - sum[y0 * (w + 1) + x1 + 1] -
        sum[(y1 + 1) * (w + 1) + x0] + sum[y0 * (w + 1) + x0];
      if (gray[y * w + x] < s / area - C) ink[y * w + x] = 1;
    }
  }
  return ink;
}

/** Барлық байланысқан сия аймақтарын шекаралық тіктөртбұрышымен қайтарады */
function components(ink, w, h) {
  const seen = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  const list = [];

  for (let start = 0; start < ink.length; start++) {
    if (!ink[start] || seen[start]) continue;
    let top = 0;
    stack[top++] = start;
    seen[start] = 1;
    const pixels = [];
    let minX = w, maxX = -1, minY = h, maxY = -1;

    while (top > 0) {
      const p = stack[--top];
      pixels.push(p);
      const x = p % w, y = (p / w) | 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = ny * w + nx;
          if (ink[q] && !seen[q]) { seen[q] = 1; stack[top++] = q; }
        }
      }
    }
    list.push({ count: pixels.length, pixels, minX, maxX, minY, maxY });
  }
  return list;
}

const overlaps = (a, b, pad) =>
  a.minX - pad <= b.maxX && b.minX - pad <= a.maxX &&
  a.minY - pad <= b.maxY && b.minY - pad <= a.maxY;

/**
 * Бір сызбаға жататын барлық бөлікті жинау.
 *
 * Оқушы фигураны бір қозғалыспен сызбайды: үшбұрышты үш бөлек сызықпен
 * салады, қарындаш үзіліп қалады, бұрыштар қосылмай қалады. Сондықтан ең
 * үлкен бөлікті ғана алсақ, контурдың бір қабырғасы жоғалып, фигура басқа
 * болып танылады. Бұл функция өлшемі жеткілікті әрі бір-біріне жақын
 * бөліктердің бәрін біріктіреді, ал ұсақ дақтарды елемейді.
 */
function collectShape(ink, w, h) {
  const comps = components(ink, w, h);
  if (!comps.length) return null;
  comps.sort((a, b) => b.count - a.count);

  const main = comps[0];
  const pad = Math.round(Math.max(w, h) * 0.06);
  const box = { minX: main.minX, maxX: main.maxX, minY: main.minY, maxY: main.maxY };
  const used = new Set([0]);

  // Қағаздың түйіршігі мен ұсақ дақтар контурға қосылып кетсе, дөңес қабық
  // бұрмаланып, фигура танылмай қалады. Сондықтан қосылатын бөлік әрі
  // жеткілікті үлкен, әрі сызыққа ұқсап созылыңқы болуы керек.
  const minCount = Math.max(main.count * 0.07, w * h * 0.0012);
  const minSpan = Math.max(w, h) * 0.06;

  let grew = true;
  while (grew) {
    grew = false;
    for (let i = 1; i < comps.length; i++) {
      if (used.has(i)) continue;
      const c = comps[i];
      if (c.count < minCount) continue;
      if (Math.max(c.maxX - c.minX, c.maxY - c.minY) < minSpan) continue;
      if (!overlaps(box, c, pad)) continue;
      used.add(i);
      box.minX = Math.min(box.minX, c.minX);
      box.maxX = Math.max(box.maxX, c.maxX);
      box.minY = Math.min(box.minY, c.minY);
      box.maxY = Math.max(box.maxY, c.maxY);
      grew = true;
    }
  }

  const pixels = [];
  let count = 0;
  for (const i of used) {
    pixels.push(...comps[i].pixels);
    count += comps[i].count;
  }
  return { count, pixels, parts: used.size };
}

/* ------------------------------------------------------------------ */
/*  3–4. Дөңес қабық және оны жеңілдету                                */
/* ------------------------------------------------------------------ */

/** Эндрю әдісі (monotone chain) */
function convexHull(points) {
  const pts = points.slice().sort((a, b) => (a.x - b.x) || (a.y - b.y));
  if (pts.length < 3) return pts;
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function pointLineDistance(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return dist(p, a);
  return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / len;
}

function douglasPeucker(points, eps) {
  if (points.length < 3) return points.slice();
  let maxD = -1, index = 0;
  const first = points[0], last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = pointLineDistance(points[i], first, last);
    if (d > maxD) { maxD = d; index = i; }
  }
  if (maxD <= eps) return [first, last];
  const left = douglasPeucker(points.slice(0, index + 1), eps);
  const right = douglasPeucker(points.slice(index), eps);
  return left.slice(0, -1).concat(right);
}

/** Тұйық көпбұрышты жеңілдету: ең алыс екі төбеден екі тізбекке бөлеміз */
function simplifyClosed(hull, eps) {
  const n = hull.length;
  if (n < 4) return hull.slice();
  let ai = 0, bi = 0, best = -1;
  for (let i = 0; i < n; i++) {
    const d = dist(hull[0], hull[i]);
    if (d > best) { best = d; bi = i; }
  }
  best = -1;
  for (let i = 0; i < n; i++) {
    const d = dist(hull[bi], hull[i]);
    if (d > best) { best = d; ai = i; }
  }
  const lo = Math.min(ai, bi), hi = Math.max(ai, bi);
  const chain1 = hull.slice(lo, hi + 1);
  const chain2 = hull.slice(hi).concat(hull.slice(0, lo + 1));
  const s1 = douglasPeucker(chain1, eps);
  const s2 = douglasPeucker(chain2, eps);
  return s1.slice(0, -1).concat(s2.slice(0, -1));
}

function polygonArea(poly) {
  let a = 0;
  for (let i = 0, n = poly.length; i < n; i++) {
    const p = poly[i], q = poly[(i + 1) % n];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

function polygonPerimeter(poly) {
  let p = 0;
  for (let i = 0, n = poly.length; i < n; i++) p += dist(poly[i], poly[(i + 1) % n]);
  return p;
}

/* ------------------------------------------------------------------ */
/*  5. Жіктеу                                                          */
/* ------------------------------------------------------------------ */

const angleBetween = (u, v) => {
  const dot = u.x * v.x + u.y * v.y;
  const m = Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y);
  if (m < 1e-9) return 0;
  return (Math.acos(Math.max(-1, Math.min(1, dot / m))) * 180) / Math.PI;
};

/** Екі кесіндінің бағыттары арасындағы бұрыш (0–90°) */
function directionGap(a, b, c, d) {
  const u = { x: b.x - a.x, y: b.y - a.y };
  const v = { x: d.x - c.x, y: d.y - c.y };
  const ang = angleBetween(u, v);
  return Math.min(ang, 180 - ang);
}

function interiorAngles(poly) {
  const n = poly.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const prev = poly[(i - 1 + n) % n], cur = poly[i], next = poly[(i + 1) % n];
    out.push(angleBetween(
      { x: prev.x - cur.x, y: prev.y - cur.y },
      { x: next.x - cur.x, y: next.y - cur.y },
    ));
  }
  return out;
}

/** 0-ден 1-ге дейінгі сенімділік: ауытқу неғұрлым аз, соғұрлым жоғары */
const score = (deviation, tolerance) =>
  Math.max(0, Math.min(1, 1 - deviation / tolerance));

function classifyQuad(poly) {
  const sides = [];
  for (let i = 0; i < 4; i++) sides.push(dist(poly[i], poly[(i + 1) % 4]));
  const angles = interiorAngles(poly);

  const rightDev = angles.reduce((s, a) => s + Math.abs(a - 90), 0) / 4;
  const avg = sides.reduce((s, x) => s + x, 0) / 4;
  const sideDev = sides.reduce((s, x) => s + Math.abs(x - avg), 0) / 4 / avg;

  // қарама-қарсы қабырғалардың параллельдігі
  const par1 = directionGap(poly[0], poly[1], poly[3], poly[2]);
  const par2 = directionGap(poly[1], poly[2], poly[0], poly[3]);

  const opp1 = Math.abs(sides[0] - sides[2]) / Math.max(sides[0], sides[2]);
  const opp2 = Math.abs(sides[1] - sides[3]) / Math.max(sides[1], sides[3]);

  // Қатаң шектеулердің орнына әр үміткерге үздіксіз баға береміз де, ең
  // жоғарысын таңдаймыз. Бір градус айырма жауапты түбегейлі өзгертпейді.
  const minPar = Math.min(par1, par2);
  const maxPar = Math.max(par1, par2);
  const isRight = rightDev < 14;

  // Шаршы да, тіктөртбұрыш та — параллелограмм. Бәрі бірдей жақсы келгенде
  // оқушыға ең НАҚТЫ жауапты айтқан дұрыс, сондықтан жалпылау атаулары
  // тік бұрыш табылған жағдайда шегінеді.
  const candidates = [
    {
      label: "parallelogram",
      confidence: 0.6 * score((par1 + par2) / 2, 22) + 0.4 * score((opp1 + opp2) / 2, 0.3)
        - (rightDev < 14 ? 0.14 : 0),
    },
    {
      // бір жұбы ғана параллель: екіншісінің ауытқуы айқын болуы керек
      label: "trapezoid",
      confidence: 0.55 * score(minPar, 16) +
        0.45 * Math.max(0, Math.min(1, (maxPar - minPar - 5) / 22)),
    },
  ];

  if (isRight) {
    candidates.push({
      label: "rectangle",
      confidence: 0.1 + 0.6 * score(rightDev, 20) + 0.3 * score((opp1 + opp2) / 2, 0.3)
        - (sideDev < 0.18 ? 0.07 : 0),
    });
    if (sideDev < 0.18) {
      // шаршы — тіктөртбұрыштың дербес түрі, нақтырақ жауап ретінде басым
      candidates.push({
        label: "square",
        confidence: 0.18 + 0.44 * score(rightDev, 20) + 0.38 * score(sideDev, 0.26),
      });
    }
  }

  candidates.sort((a, b) => b.confidence - a.confidence);
  return candidates;
}

/**
 * Негізгі функция.
 * @param {ImageData} image
 * @returns {{ok:boolean, label?:string, name?:string, confidence?:number,
 *             alternatives?:Array, polygon?:Array, reason?:string}}
 */
export function analyze(image) {
  const w = image.width, h = image.height;
  const gray = toGray(image);
  const ink = binarize(gray, w, h);

  const blob = collectShape(ink, w, h);
  if (!blob || blob.count < (w * h) / 900) {
    return { ok: false, reason: "Сызба табылмады. Суретті жарығырақ жерде, фигура толық сыятындай етіп түсір." };
  }

  const pts = blob.pixels.map((p) => ({ x: p % w, y: (p / w) | 0 }));
  const hull = convexHull(pts);
  if (hull.length < 3) {
    return { ok: false, reason: "Фигураның пішінін ажырату мүмкін болмады." };
  }

  const area = polygonArea(hull);
  const perim = polygonPerimeter(hull);
  if (area < (w * h) / 400) {
    return { ok: false, reason: "Фигура тым кішкентай. Жақынырақ түсіріп көр." };
  }

  // Сызба кадрдың шетіне тіреліп тұрса, оның бұрышы кесіліп қалады да,
  // төртбұрыш бес- не алтыбұрыш болып көрінеді. Мұны үнсіз қате жауапқа
  // айналдырғанша, оқушыға анық айтқан дұрыс.
  const edge = 2;
  let onBorder = 0;
  for (const p of hull) {
    if (p.x <= edge || p.y <= edge || p.x >= w - 1 - edge || p.y >= h - 1 - edge) onBorder++;
  }
  if (onBorder / hull.length > 0.18) {
    return {
      ok: false,
      reason: "Фигура кадрға толық сыймаған. Телефонды сәл алысырақ ұстап, " +
        "сызбаның барлық бұрышы көрінетіндей етіп қайта түсір.",
    };
  }

  // дөңгелектік: шеңбер үшін 1-ге жуық, шаршы үшін ≈0,79, үшбұрыш үшін ≈0,6
  const circularity = (4 * Math.PI * area) / (perim * perim);

  // Бір ғана epsilon сенімсіз: таяз бұрышты параллелограмм үшбұрышқа айналып
  // кетуі мүмкін. Сондықтан epsilon-ды кең аралықта сүзіп, төбе саны 3-тен
  // 6-ға дейінгі үміткерлерді жинаймыз да, әрқайсысының қабықты қаншалық
  // жақсы жапқанын (аудан қатынасын) өлшейміз.
  const best = new Map();
  for (let f = 0.004; f <= 0.18; f *= 1.06) {
    const cand = simplifyClosed(hull, f * perim);
    const n = cand.length;
    if (n < 3 || n > 7) continue;
    const ratio = polygonArea(cand) / area;
    const prev = best.get(n);
    if (!prev || ratio > prev.ratio) best.set(n, { poly: cand, ratio });
  }

  const result = { circularity, area, hullSize: hull.length, parts: blob.parts };

  // Шеңберді көпбұрышпен жуықтап отырудың қажеті жоқ: дөңгелектік оны
  // көпбұрыштардан айқын ажыратады (сынақта шеңбер 0,98-ден жоғары, ал
  // кез келген көпбұрыш 0,82-ден төмен).
  if (circularity > 0.88) {
    return {
      ok: true, ...result, polygon: hull, fit: 1,
      label: "circle", name: LABELS.circle,
      confidence: Math.min(0.99, 0.72 + (circularity - 0.88) * 2.5),
      alternatives: [],
    };
  }

  // Төбе қосқан сайын сәйкестік әрқашан жақсарады, сондықтан белгілі бір
  // табалдырықты емес, «шынтақты» іздейміз: келесі төбе қосқанда пайда
  // шамалы болып қалатын ең кіші төбе саны — фигураның шын төбе саны.
  // Қолмен салынған сызық дірілдегендіктен қабық сәл бұжырланады, сол
  // себепті абсолютті сәйкестік 0,85-ке дейін түсуі қалыпты жағдай.
  let chosen = null;
  let chosenGain = 0;
  for (let n = 3; n <= 5; n++) {
    const cur = best.get(n);
    if (!cur || cur.ratio < 0.8) continue;
    const next = best.get(n + 1);
    const gain = next ? next.ratio - cur.ratio : 0;
    if (gain < 0.09) { chosen = n; chosenGain = gain; break; }
  }

  if (chosen === 3) {
    const tri = best.get(3);
    return {
      ok: true, ...result, polygon: tri.poly, fit: tri.ratio,
      label: "triangle", name: LABELS.triangle,
      confidence: Math.min(0.99, 0.64 + 1.8 * (tri.ratio - 0.85) + 1.6 * (0.09 - chosenGain)),
      alternatives: [],
    };
  }

  if (chosen === 4) {
    const quad = best.get(4);
    const cands = classifyQuad(quad.poly);
    const top = cands[0];
    return {
      ok: true, ...result, polygon: quad.poly, fit: quad.ratio,
      label: top.label,
      name: LABELS[top.label],
      confidence: Math.max(0.3, Math.min(0.99, top.confidence)),
      alternatives: cands.slice(1, 3).map((c) => ({
        label: c.label, name: LABELS[c.label],
        confidence: Math.max(0.2, Math.min(0.98, c.confidence)),
      })),
    };
  }

  // Көпбұрыш та жарамаса — шеңберге жақындығын соңғы рет тексереміз
  if (circularity > 0.8) {
    return {
      ok: true, ...result, polygon: hull,
      label: "circle", name: LABELS.circle,
      confidence: 0.55,
      alternatives: [],
    };
  }

  const got = best.get(4) || best.get(3);
  return {
    ok: false, ...result,
    polygon: got ? got.poly : hull,
    fit: got ? got.ratio : 0,
    reason: "Фигураны сенімді ажырату мүмкін болмады. Танылатын фигуралар: үшбұрыш, " +
      "шаршы, тіктөртбұрыш, параллелограмм, трапеция және шеңбер. " +
      "Сызбаны толық әрі ашық фонда түсіріп көр.",
  };
}

/** Жөндеуге арналған: төбе саны бойынша сәйкестік профилін қайтарады */
export function debugRatios(image) {
  const w = image.width, h = image.height;
  const ink = binarize(toGray(image), w, h);
  const blob = collectShape(ink, w, h);
  if (!blob) return null;
  const pts = blob.pixels.map((p) => ({ x: p % w, y: (p / w) | 0 }));
  const hull = convexHull(pts);
  const area = polygonArea(hull);
  const perim = polygonPerimeter(hull);
  const best = new Map();
  for (let f = 0.004; f <= 0.18; f *= 1.06) {
    const cand = simplifyClosed(hull, f * perim);
    const n = cand.length;
    if (n < 3 || n > 8) continue;
    const ratio = polygonArea(cand) / area;
    if (!best.has(n) || ratio > best.get(n)) best.set(n, ratio);
  }
  const ratios = {};
  for (const [n, r] of [...best].sort((a, b) => a[0] - b[0])) ratios[n] = +r.toFixed(3);
  return { parts: blob.parts, hullSize: hull.length, ratios };
}

/** Видео немесе суреттен ImageData дайындау (ұзын қабырғасы ~360 px) */
export function imageDataFrom(source, maxSide = 360) {
  const sw = source.videoWidth || source.naturalWidth || source.width;
  const sh = source.videoHeight || source.naturalHeight || source.height;
  if (!sw || !sh) return null;
  const k = Math.min(1, maxSide / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * k));
  const h = Math.max(1, Math.round(sh * k));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}
