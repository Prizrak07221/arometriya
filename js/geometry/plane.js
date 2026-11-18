// 1–8 тақырыптар: жазықтықтағы геометрия
import {
  PALETTE, v, polyline, dashedLine, filledPolygon, dot, label,
  angleArc, planeGrid, disposeChildren, fmt, deg, rad,
} from "../viewer.js";

/** Әр қайта сызуда топты тазартып, жаңадан салатын көмекші */
function redrawer(group) {
  return (drawFn) => {
    disposeChildren(group);
    drawFn(group);
  };
}

const PLANE_VIEW = { x: 0, y: 0, z: 11 };

/* ================= 1. Параллелограмм ================= */
export const parallelogram = {
  id: "parallelogram",
  no: 1,
  title: "Параллелограмм және оның қасиеттері",
  category: "Жазықтық",
  summary: "Қабырғасы мен бұрышын өзгертіп, қарама-қарсы қабырғалар мен бұрыштардың тең болатынын тексер.",
  view: PLANE_VIEW,
  theory: [
    "Параллелограмм — қарама-қарсы қабырғалары қос-қостан параллель төртбұрыш.",
    "Негізгі қасиеттері: қарама-қарсы қабырғалары тең, қарама-қарсы бұрыштары тең, көршілес бұрыштарының қосындысы 180°, ал диагональдары қиылысу нүктесінде қақ бөлінеді.",
    "Ауданы табаны мен сол табанға түсірілген биіктіктің көбейтіндісіне тең: S = a · b · sin α.",
  ],
  controls: [
    { type: "slider", id: "b", label: "AD қабырғасы", min: 2, max: 6, step: 0.1, value: 4 },
    { type: "slider", id: "alpha", label: "∠A бұрышы", min: 30, max: 150, step: 1, value: 65, unit: "°" },
    { type: "toggle", id: "diagonals", label: "Диагональдарын көрсету", value: true },
  ],
  build({ group, setReadout }) {
    const draw = redrawer(group);
    const a = 5;

    return {
      update(p) {
        draw((g) => {
          const al = rad(p.alpha);
          const A = v(0, 0), B = v(a, 0);
          const D = v(p.b * Math.cos(al), p.b * Math.sin(al));
          const C = v(B.x + D.x, B.y + D.y);
          const cx = (A.x + B.x + C.x + D.x) / 4;
          const cy = (A.y + B.y + C.y + D.y) / 4;
          for (const pt of [A, B, C, D]) { pt.x -= cx; pt.y -= cy; }

          g.add(planeGrid());
          g.add(filledPolygon([A, B, C, D]));
          g.add(polyline([A, B, C, D], PALETTE.line, true));

          if (p.diagonals) {
            g.add(dashedLine(A, C, PALETTE.line2));
            g.add(dashedLine(B, D, PALETTE.line2));
            const M = v((A.x + C.x) / 2, (A.y + C.y) / 2);
            g.add(dot(M, PALETTE.line2, 0.08));
            g.add(label("O", v(M.x + 0.3, M.y + 0.25), "#e0a45f", 0.42));
          }

          g.add(angleArc(A, B, D, 0.75));
          g.add(angleArc(C, D, B, 0.75));

          const names = ["A", "B", "C", "D"];
          [A, B, C, D].forEach((pt, i) => {
            g.add(dot(pt));
            g.add(label(
              names[i],
              v(pt.x + (pt.x >= 0 ? 0.45 : -0.45), pt.y + (pt.y >= 0 ? 0.45 : -0.45), 0),
            ));
          });

          const S = a * p.b * Math.sin(al);
          const ac = Math.hypot(C.x - A.x, C.y - A.y);
          const bd = Math.hypot(D.x - B.x, D.y - B.y);
          setReadout(
            `AB = CD = ${fmt(a)}   AD = BC = ${fmt(p.b)}\n` +
            `∠A = ∠C = ${p.alpha}°   ∠B = ∠D = ${180 - p.alpha}°\n` +
            `AC = ${fmt(ac)}   BD = ${fmt(bd)}   S = ${fmt(S)}`
          );
        });
      },
    };
  },
  quiz: [
    {
      q: "Параллелограмның бір бұрышы 65°. Оған көршілес бұрыш неше градус?",
      options: ["65°", "115°", "125°", "90°"],
      answer: 1,
      explain: "Көршілес бұрыштардың қосындысы 180°, сондықтан 180° − 65° = 115°.",
    },
    {
      q: "Параллелограмның диагональдары туралы қандай тұжырым дұрыс?",
      options: [
        "Әрқашан тең",
        "Әрқашан перпендикуляр",
        "Қиылысу нүктесінде қақ бөлінеді",
        "Бұрыштарын қақ бөледі",
      ],
      answer: 2,
      explain: "Диагональдары тең болуы тек тіктөртбұрышта, перпендикуляр болуы тек ромбыда орындалады. Ал қақ бөліну — кез келген параллелограмның қасиеті.",
    },
    {
      q: "Қабырғалары 5 см және 4 см, ал арасындағы бұрыш 30° болатын параллелограмның ауданы:",
      options: ["20 см²", "10 см²", "9 см²", "40 см²"],
      answer: 1,
      explain: "S = a · b · sin α = 5 · 4 · sin 30° = 20 · 0,5 = 10 см².",
    },
  ],
};

/* ================= 2. Төртбұрыштар отбасы ================= */
export const quadfamily = {
  id: "quadfamily",
  no: 2,
  title: "Тіктөртбұрыш, ромб, шаршы",
  category: "Жазықтық",
  summary: "Қабырға мен бұрышты өзгерткенде фигураның аты қалай өзгеретінін көр.",
  view: PLANE_VIEW,
  theory: [
    "Тіктөртбұрыш, ромб және шаршы — параллелограмның дербес түрлері.",
    "Тіктөртбұрышта барлық бұрыш 90°, сондықтан диагональдары тең. Ромбыда барлық қабырға тең, сондықтан диагональдары перпендикуляр әрі бұрыштарын қақ бөледі.",
    "Шаршы — бір мезгілде тіктөртбұрыш та, ромб та болатын фигура: оның диагональдары әрі тең, әрі перпендикуляр.",
  ],
  controls: [
    { type: "slider", id: "a", label: "a қабырғасы", min: 2, max: 6, step: 0.1, value: 5 },
    { type: "slider", id: "b", label: "b қабырғасы", min: 2, max: 6, step: 0.1, value: 3.5 },
    { type: "slider", id: "alpha", label: "Бұрышы", min: 40, max: 140, step: 1, value: 90, unit: "°" },
  ],
  build({ group, setReadout }) {
    const draw = redrawer(group);
    return {
      update(p) {
        draw((g) => {
          const al = rad(p.alpha);
          const A = v(0, 0), B = v(p.a, 0);
          const D = v(p.b * Math.cos(al), p.b * Math.sin(al));
          const C = v(B.x + D.x, B.y + D.y);
          const cx = (A.x + B.x + C.x + D.x) / 4, cy = (A.y + B.y + C.y + D.y) / 4;
          for (const pt of [A, B, C, D]) { pt.x -= cx; pt.y -= cy; }

          const isRight = Math.abs(p.alpha - 90) < 1.5;
          const equal = Math.abs(p.a - p.b) < 0.08;
          let name = "Параллелограмм";
          if (isRight && equal) name = "Шаршы";
          else if (isRight) name = "Тіктөртбұрыш";
          else if (equal) name = "Ромб";

          const color = name === "Параллелограмм" ? PALETTE.face : PALETTE.accent;
          g.add(planeGrid());
          g.add(filledPolygon([A, B, C, D], color, 0.2));
          g.add(polyline([A, B, C, D], color, true));
          g.add(dashedLine(A, C, PALETTE.line2));
          g.add(dashedLine(B, D, PALETTE.line2));

          const names = ["A", "B", "C", "D"];
          [A, B, C, D].forEach((pt, i) => {
            g.add(dot(pt, color));
            g.add(label(names[i], v(pt.x + (pt.x >= 0 ? 0.42 : -0.42), pt.y + (pt.y >= 0 ? 0.42 : -0.42), 0)));
          });

          const ac = Math.hypot(C.x - A.x, C.y - A.y);
          const bd = Math.hypot(D.x - B.x, D.y - B.y);
          const perp = Math.abs(((C.x - A.x) * (D.x - B.x) + (C.y - A.y) * (D.y - B.y))) < 0.25;
          setReadout(
            `${name}\n` +
            `a = ${fmt(p.a)}   b = ${fmt(p.b)}   α = ${p.alpha}°\n` +
            `AC = ${fmt(ac)}   BD = ${fmt(bd)}` +
            (Math.abs(ac - bd) < 0.12 ? "  → диагональдары тең" : "") +
            (perp ? "\nДиагональдары перпендикуляр" : "")
          );
        });
      },
    };
  },
  quiz: [
    {
      q: "Диагональдары тең әрі перпендикуляр болатын төртбұрыш:",
      options: ["Ромб", "Тіктөртбұрыш", "Шаршы", "Трапеция"],
      answer: 2,
      explain: "Шаршы — тіктөртбұрыш та, ромб та болғандықтан, оның диагональдары әрі тең, әрі перпендикуляр.",
    },
    {
      q: "Ромбының диагональдары 6 см және 8 см. Оның қабырғасы неше см?",
      options: ["5 см", "7 см", "10 см", "14 см"],
      answer: 0,
      explain: "Диагональдары қақ бөлініп, перпендикуляр болғандықтан катеттері 3 және 4 болатын тікбұрышты үшбұрыш шығады: √(3² + 4²) = 5 см.",
    },
    {
      q: "Қай тұжырым ДҰРЫС ЕМЕС?",
      options: [
        "Әрбір шаршы — ромб",
        "Әрбір ромб — шаршы",
        "Әрбір тіктөртбұрыш — параллелограмм",
        "Әрбір шаршы — тіктөртбұрыш",
      ],
      answer: 1,
      explain: "Ромбының бұрышы 90° болмауы мүмкін, сондықтан әрбір ромб шаршы емес. Ал кері тұжырым дұрыс.",
    },
  ],
};

/* ================= 3. Трапеция ================= */
export const trapezoid = {
  id: "trapezoid",
  no: 3,
  title: "Трапеция және оның орта сызығы",
  category: "Жазықтық",
  summary: "Табандарын өзгертіп, орта сызығының ұзындығы қалай есептелетінін тексер.",
  view: PLANE_VIEW,
  theory: [
    "Трапеция — екі қабырғасы параллель, қалған екеуі параллель емес төртбұрыш. Параллель қабырғалары табандар деп аталады.",
    "Орта сызық бүйір қабырғалардың орталарын қосады. Ол табандарға параллель, ал ұзындығы табандардың жарты қосындысына тең: m = (a + b) / 2.",
    "Трапецияның ауданы орта сызық пен биіктіктің көбейтіндісіне тең: S = m · h.",
  ],
  controls: [
    { type: "slider", id: "a", label: "Үлкен табаны a", min: 4, max: 9, step: 0.1, value: 7 },
    { type: "slider", id: "b", label: "Кіші табаны b", min: 1, max: 6, step: 0.1, value: 3 },
    { type: "slider", id: "h", label: "Биіктігі h", min: 1, max: 5, step: 0.1, value: 3 },
    { type: "toggle", id: "mid", label: "Орта сызығын көрсету", value: true },
  ],
  build({ group, setReadout }) {
    const draw = redrawer(group);
    return {
      update(p) {
        draw((g) => {
          const a = p.a, b = Math.min(p.b, p.a - 0.4), h = p.h;
          const A = v(-a / 2, -h / 2), B = v(a / 2, -h / 2);
          const C = v(b / 2 + 0.6, h / 2), D = v(-b / 2 + 0.6, h / 2);

          g.add(planeGrid());
          g.add(filledPolygon([A, B, C, D]));
          g.add(polyline([A, B, C, D], PALETTE.line, true));

          if (p.mid) {
            const M = v((A.x + D.x) / 2, 0);
            const N = v((B.x + C.x) / 2, 0);
            g.add(polyline([M, N], PALETTE.accent));
            g.add(dot(M, PALETTE.accent, 0.08));
            g.add(dot(N, PALETTE.accent, 0.08));
            g.add(label("M", v(M.x - 0.42, M.y + 0.3, 0), "#52b788", 0.42));
            g.add(label("N", v(N.x + 0.42, N.y + 0.3, 0), "#52b788", 0.42));
          }

          g.add(dashedLine(v(D.x, D.y), v(D.x, A.y), PALETTE.ghost));

          const names = ["A", "B", "C", "D"];
          [A, B, C, D].forEach((pt, i) => {
            g.add(dot(pt));
            g.add(label(names[i], v(pt.x + (pt.x >= 0 ? 0.42 : -0.42), pt.y + (pt.y >= 0 ? 0.42 : -0.42), 0)));
          });

          const m = (a + b) / 2;
          setReadout(
            `a = ${fmt(a)}   b = ${fmt(b)}   h = ${fmt(h)}\n` +
            `Орта сызығы m = (a + b) / 2 = ${fmt(m)}\n` +
            `S = m · h = ${fmt(m * h)}`
          );
        });
      },
    };
  },
  quiz: [
    {
      q: "Трапецияның орта сызығы 12 см, кіші табаны 8 см. Үлкен табаны неше см?",
      options: ["14 см", "16 см", "20 см", "10 см"],
      answer: 1,
      explain: "m = (a + b)/2 болғандықтан a = 2m − b = 2 · 12 − 8 = 16 см.",
    },
    {
      q: "Табандары 6 см және 10 см, биіктігі 4 см трапецияның ауданы:",
      options: ["32 см²", "40 см²", "24 см²", "60 см²"],
      answer: 0,
      explain: "S = ((6 + 10)/2) · 4 = 8 · 4 = 32 см².",
    },
    {
      q: "Трапецияның орта сызығы:",
      options: [
        "Диагональдарының орталарын қосады",
        "Бүйір қабырғаларының орталарын қосады",
        "Табандарының орталарын қосады",
        "Төбелерін қосады",
      ],
      answer: 1,
      explain: "Анықтама бойынша орта сызық бүйір қабырғалардың орталарын қосады және табандарға параллель болады.",
    },
  ],
};

/* ================= 4. Үшбұрыштың орта сызығы ================= */
export const trianglemid = {
  id: "trianglemid",
  no: 4,
  title: "Үшбұрыштың орта сызығы",
  category: "Жазықтық",
  summary: "Төбесін жылжытсаң да орта сызық табанның жартысына тең болып қала береді.",
  view: PLANE_VIEW,
  theory: [
    "Үшбұрыштың орта сызығы — екі қабырғасының орталарын қосатын кесінді.",
    "Орта сызық үшінші қабырғаға параллель, ал ұзындығы оның жартысына тең.",
    "Сондықтан орта сызық кесіп алатын үшбұрыш бастапқысына ұқсас, ұқсастық коэффициенті 1/2, ал ауданы 4 есе кіші.",
  ],
  controls: [
    { type: "slider", id: "cx", label: "Төбенің орны (x)", min: -4, max: 4, step: 0.1, value: 1 },
    { type: "slider", id: "cy", label: "Төбенің биіктігі (y)", min: 1.5, max: 6, step: 0.1, value: 4.5 },
  ],
  build({ group, setReadout }) {
    const draw = redrawer(group);
    return {
      update(p) {
        draw((g) => {
          const A = v(-3.5, -2), B = v(3.5, -2), C = v(p.cx, p.cy - 2);
          const M = v((A.x + C.x) / 2, (A.y + C.y) / 2);
          const N = v((B.x + C.x) / 2, (B.y + C.y) / 2);

          g.add(planeGrid());
          g.add(filledPolygon([A, B, C]));
          g.add(filledPolygon([M, N, C], PALETTE.accent, 0.25));
          g.add(polyline([A, B, C], PALETTE.line, true));
          g.add(polyline([M, N], PALETTE.accent));

          [[A, "A"], [B, "B"], [C, "C"]].forEach(([pt, t]) => {
            g.add(dot(pt));
            g.add(label(t, v(pt.x + (pt.x >= 0 ? 0.42 : -0.42), pt.y + (pt === C ? 0.45 : -0.42), 0)));
          });
          [[M, "M"], [N, "N"]].forEach(([pt, t]) => {
            g.add(dot(pt, PALETTE.accent, 0.08));
            g.add(label(t, v(pt.x + (pt.x >= 0 ? 0.4 : -0.4), pt.y + 0.3, 0), "#52b788", 0.42));
          });

          const ab = Math.hypot(B.x - A.x, B.y - A.y);
          const mn = Math.hypot(N.x - M.x, N.y - M.y);
          setReadout(
            `AB = ${fmt(ab)}   MN = ${fmt(mn)}\n` +
            `MN / AB = ${fmt(mn / ab, 2)}  (әрқашан 0,5)\n` +
            `MN ∥ AB`
          );
        });
      },
    };
  },
  quiz: [
    {
      q: "Үшбұрыштың қабырғасы 14 см. Оған параллель орта сызықтың ұзындығы:",
      options: ["28 см", "7 см", "14 см", "3,5 см"],
      answer: 1,
      explain: "Орта сызық қабырғаның жартысына тең: 14 : 2 = 7 см.",
    },
    {
      q: "Үш орта сызығы кесіп алған кіші үшбұрыштың ауданы бастапқысынан неше есе кіші?",
      options: ["2 есе", "3 есе", "4 есе", "8 есе"],
      answer: 2,
      explain: "Ұқсастық коэффициенті 1/2, ал аудандар қатынасы коэффициенттің квадратына тең: (1/2)² = 1/4.",
    },
    {
      q: "Орта сызық туралы қай тұжырым дұрыс?",
      options: [
        "Ол биіктікке параллель",
        "Ол үшінші қабырғаға параллель",
        "Ол бұрышты қақ бөледі",
        "Ол әрқашан табанға перпендикуляр",
      ],
      answer: 1,
      explain: "Орта сызық өзі қоспайтын үшінші қабырғаға параллель болады.",
    },
  ],
};

/* ================= 5. Пифагор теоремасы ================= */
export const pythagoras = {
  id: "pythagoras",
  no: 5,
  title: "Пифагор теоремасы",
  category: "Жазықтық",
  summary: "Катеттердегі шаршылардың ауданы гипотенузадағы шаршыға қалай сыйып кететінін көр.",
  view: { x: 0, y: 0, z: 19 },
  theory: [
    "Тікбұрышты үшбұрышта катеттердің квадраттарының қосындысы гипотенузаның квадратына тең: a² + b² = c².",
    "Теореманың геометриялық мағынасы: катеттерге салынған екі шаршының ауданының қосындысы гипотенузаға салынған шаршының ауданына дәл тең.",
    "Бұл теорема арқылы үшбұрыштың белгісіз қабырғасын, тіктөртбұрыштың диагоналін, нүктелер арасындағы қашықтықты табуға болады.",
  ],
  controls: [
    { type: "slider", id: "a", label: "a катеті", min: 1.5, max: 5, step: 0.1, value: 3 },
    { type: "slider", id: "b", label: "b катеті", min: 1.5, max: 5, step: 0.1, value: 4 },
    { type: "slider", id: "fill", label: "Аудандарды көшіру", min: 0, max: 100, step: 1, value: 0, unit: "%" },
  ],
  build({ group, setReadout }) {
    const draw = redrawer(group);
    return {
      update(p) {
        draw((g) => {
          const a = p.a, b = p.b, c = Math.hypot(a, b);
          const t = p.fill / 100;
          const C = v(0, 0), B = v(b, 0), A = v(0, a);

          // гипотенузаға сыртқа қарай салынған шаршы
          const nx = a / c, ny = b / c;
          const A2 = v(A.x + nx * c, A.y + ny * c);
          const B2 = v(B.x + nx * c, B.y + ny * c);

          // сурет x ∈ [−a, a+b], y ∈ [−b, a+b] аралығын алады — ортасына түсіреміз
          const shift = v(-b / 2, -a / 2, 0);
          const mv = (pt) => v(pt.x + shift.x, pt.y + shift.y, 0);

          const Cs = mv(C), Bs = mv(B), As = mv(A), A2s = mv(A2), B2s = mv(B2);

          g.add(planeGrid(16, 16));

          // катеттердегі шаршылар
          const sqB = [Cs, Bs, v(Bs.x, Bs.y - b), v(Cs.x, Cs.y - b)];
          const sqA = [Cs, As, v(As.x - a, As.y), v(Cs.x - a, Cs.y)];
          g.add(filledPolygon(sqB, PALETTE.line2, 0.35 * (1 - t) + 0.08));
          g.add(polyline(sqB, PALETTE.line2, true));
          g.add(filledPolygon(sqA, PALETTE.accent, 0.35 * (1 - t) + 0.08));
          g.add(polyline(sqA, PALETTE.accent, true));

          // гипотенузадағы шаршы
          const sqC = [As, Bs, B2s, A2s];
          g.add(polyline(sqC, PALETTE.line, true));
          g.add(filledPolygon(sqC, PALETTE.line, 0.1));

          // ауданды "көшіру": c-шаршысын a² және b² бөліктеріне бөлу
          if (t > 0) {
            const ux = (Bs.x - As.x) / c, uy = (Bs.y - As.y) / c; // As→Bs бағыты
            const part = (fromLen, toLen, color) => {
              const p1 = v(As.x + ux * fromLen, As.y + uy * fromLen);
              const p2 = v(As.x + ux * toLen, As.y + uy * toLen);
              const p3 = v(p2.x + nx * c, p2.y + ny * c);
              const p4 = v(p1.x + nx * c, p1.y + ny * c);
              g.add(filledPolygon([p1, p2, p3, p4], color, 0.42));
              g.add(polyline([p1, p2, p3, p4], color, true));
            };
            const lenA = (a * a) / c;
            part(0, lenA * t, PALETTE.accent);
            part(lenA, lenA + ((b * b) / c) * t, PALETTE.line2);
          }

          g.add(filledPolygon([Cs, Bs, As], PALETTE.ghost, 0.3));
          g.add(polyline([Cs, Bs, As], 0xffffff, true));

          [[Cs, "C"], [Bs, "B"], [As, "A"]].forEach(([pt, tx]) => {
            g.add(dot(pt));
            g.add(label(tx, v(pt.x - 0.45, pt.y - 0.45, 0)));
          });

          const mid = (p1, p2) => v((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, 0);
          g.add(label("a² = " + fmt(a * a), mid(sqA[1], sqA[3]), "#52b788", 1.1));
          g.add(label("b² = " + fmt(b * b), mid(sqB[1], sqB[3]), "#e0a45f", 1.1));

          setReadout(
            `a = ${fmt(a)}   b = ${fmt(b)}   c = ${fmt(c, 2)}\n` +
            `a² + b² = ${fmt(a * a, 2)} + ${fmt(b * b, 2)} = ${fmt(a * a + b * b, 2)}\n` +
            `c² = ${fmt(c * c, 2)}`
          );
        });
      },
    };
  },
  quiz: [
    {
      q: "Катеттері 6 см және 8 см тікбұрышты үшбұрыштың гипотенузасы:",
      options: ["10 см", "12 см", "14 см", "48 см"],
      answer: 0,
      explain: "c = √(6² + 8²) = √(36 + 64) = √100 = 10 см.",
    },
    {
      q: "Гипотенузасы 13 см, бір катеті 5 см болса, екінші катеті:",
      options: ["8 см", "12 см", "18 см", "144 см"],
      answer: 1,
      explain: "b = √(13² − 5²) = √(169 − 25) = √144 = 12 см.",
    },
    {
      q: "Қабырғалары 9, 12 және 15 болатын үшбұрыш тікбұрышты ма?",
      options: [
        "Иә, өйткені 9² + 12² = 15²",
        "Жоқ, өйткені қабырғалары әртүрлі",
        "Иә, өйткені 9 + 12 > 15",
        "Анықтау мүмкін емес",
      ],
      answer: 0,
      explain: "81 + 144 = 225 = 15². Пифагор теоремасына кері теорема бойынша үшбұрыш тікбұрышты.",
    },
  ],
};

/* ================= 6. Ұқсас үшбұрыштар ================= */
export const similar = {
  id: "similar",
  no: 6,
  title: "Ұқсас үшбұрыштар",
  category: "Жазықтық",
  summary: "Ұқсастық коэффициентін өзгертіп, периметр мен аудан қалай өзгеретінін салыстыр.",
  view: { x: 0, y: 0, z: 14 },
  theory: [
    "Екі үшбұрыш ұқсас деп аталады, егер олардың сәйкес бұрыштары тең, ал сәйкес қабырғалары пропорционал болса.",
    "Ұқсастық коэффициенті k — сәйкес қабырғалардың қатынасы. Периметрлер де нақ сол k еселенеді.",
    "Ал аудандардың қатынасы k² болады: қабырғаны 2 есе үлкейтсек, аудан 4 есе өседі.",
  ],
  controls: [
    { type: "slider", id: "k", label: "Ұқсастық коэффициенті k", min: 0.4, max: 2, step: 0.05, value: 1.5 },
  ],
  build({ group, setReadout }) {
    const draw = redrawer(group);
    const base = [v(0, 0), v(3.2, 0), v(1.1, 2.4)];
    return {
      update(p) {
        draw((g) => {
          g.add(planeGrid(16, 16));
          const k = p.k;

          const t1 = base.map((pt) => v(pt.x - 4.6, pt.y - 1.5));
          const t2 = base.map((pt) => v(pt.x * k + 0.8, pt.y * k - 1.5));

          g.add(filledPolygon(t1, PALETTE.line, 0.25));
          g.add(polyline(t1, PALETTE.line, true));
          g.add(filledPolygon(t2, PALETTE.accent, 0.25));
          g.add(polyline(t2, PALETTE.accent, true));

          ["A", "B", "C"].forEach((t, i) => {
            g.add(dot(t1[i]));
            g.add(label(t, v(t1[i].x - 0.4, t1[i].y + (i === 2 ? 0.45 : -0.42), 0)));
            g.add(dot(t2[i], PALETTE.accent));
            g.add(label(t + "₁", v(t2[i].x + 0.45, t2[i].y + (i === 2 ? 0.45 : -0.42), 0), "#52b788"));
          });

          const side = (t, i, j) => Math.hypot(t[j].x - t[i].x, t[j].y - t[i].y);
          const per = (t) => side(t, 0, 1) + side(t, 1, 2) + side(t, 2, 0);
          const area = (t) =>
            Math.abs((t[1].x - t[0].x) * (t[2].y - t[0].y) - (t[2].x - t[0].x) * (t[1].y - t[0].y)) / 2;

          setReadout(
            `k = ${fmt(k, 2)}\n` +
            `P₁ / P = ${fmt(per(t2) / per(t1), 2)}  (k)\n` +
            `S₁ / S = ${fmt(area(t2) / area(t1), 2)}  (k²)`
          );
        });
      },
    };
  },
  quiz: [
    {
      q: "Ұқсас үшбұрыштардың ұқсастық коэффициенті 3. Аудандарының қатынасы:",
      options: ["3", "6", "9", "1/3"],
      answer: 2,
      explain: "Аудандар қатынасы коэффициенттің квадратына тең: 3² = 9.",
    },
    {
      q: "Ұқсас үшбұрыштардың аудандары 16 см² және 25 см². Ұқсастық коэффициенті:",
      options: ["4/5", "16/25", "5/4", "2/5"],
      answer: 0,
      explain: "k = √(16/25) = 4/5.",
    },
    {
      q: "Екі үшбұрыштың ұқсас болуының белгісі емесі қайсы?",
      options: [
        "Екі бұрышы сәйкес тең",
        "Үш қабырғасы пропорционал",
        "Екі қабырғасы пропорционал әрі арасындағы бұрыш тең",
        "Аудандары тең",
      ],
      answer: 3,
      explain: "Аудандардың тең болуы ұқсастықты білдірмейді: аудандары бірдей, бірақ мүлде басқа пішінді үшбұрыштар болуы мүмкін.",
    },
  ],
};

/* ================= 7. Синус, косинус, тангенс ================= */
export const trig = {
  id: "trig",
  no: 7,
  title: "Тікбұрышты үшбұрыштағы синус, косинус, тангенс",
  category: "Жазықтық",
  summary: "Сүйір бұрышты өзгертіп, қатынастардың қалай өзгеретінін бақыла.",
  view: { x: 0, y: 0, z: 13 },
  theory: [
    "Тікбұрышты үшбұрышта сүйір бұрыштың синусы — қарсы катеттің гипотенузаға қатынасы, косинусы — іргелес катеттің гипотенузаға қатынасы, тангенсі — қарсы катеттің іргелес катетке қатынасы.",
    "Бұл қатынастар үшбұрыштың өлшеміне емес, тек бұрышына тәуелді: үшбұрышты үлкейтсек те sin α өзгермейді.",
    "Бірлік шеңберде косинус — нүктенің x координатасы, синус — y координатасы. Сондықтан sin²α + cos²α = 1.",
  ],
  controls: [
    { type: "slider", id: "alpha", label: "α бұрышы", min: 10, max: 80, step: 1, value: 35, unit: "°" },
    { type: "toggle", id: "circle", label: "Бірлік шеңберді көрсету", value: true },
  ],
  build({ group, setReadout }) {
    const draw = redrawer(group);
    const R = 4;
    return {
      update(p) {
        draw((g) => {
          const al = rad(p.alpha);
          const A = v(-4, -2.4);
          const B = v(A.x + R * Math.cos(al), A.y);
          const C = v(B.x, A.y + R * Math.sin(al));

          g.add(planeGrid(16, 16));

          if (p.circle) {
            const pts = [];
            for (let i = 0; i <= 64; i++) {
              const a = (i / 64) * Math.PI * 2;
              pts.push(v(A.x + Math.cos(a) * R, A.y + Math.sin(a) * R));
            }
            g.add(polyline(pts, PALETTE.ghost));
            g.add(dashedLine(v(A.x - R, A.y), v(A.x + R, A.y), PALETTE.ghost));
            g.add(dashedLine(v(A.x, A.y - R), v(A.x, A.y + R), PALETTE.ghost));
          }

          g.add(filledPolygon([A, B, C], PALETTE.face, 0.22));
          g.add(polyline([A, B, C], PALETTE.line, true));
          g.add(polyline([B, C], PALETTE.line2));
          g.add(angleArc(A, B, C, 0.9));

          // тік бұрыш белгісі
          const s = 0.35;
          g.add(polyline([
            v(B.x, B.y + s * Math.sign(C.y - B.y)),
            v(B.x - s, B.y + s * Math.sign(C.y - B.y)),
            v(B.x - s, B.y),
          ], PALETTE.ghost));

          [[A, "A"], [B, "B"], [C, "C"]].forEach(([pt, t]) => {
            g.add(dot(pt));
            g.add(label(t, v(pt.x + 0.42, pt.y - 0.42, 0)));
          });
          g.add(label("α", v(A.x + 1.25, A.y + 0.45, 0), "#e0a45f", 0.5));

          const sin = Math.sin(al), cos = Math.cos(al), tan = Math.tan(al);
          setReadout(
            `α = ${p.alpha}°\n` +
            `sin α = BC / AC = ${fmt(sin, 3)}\n` +
            `cos α = AB / AC = ${fmt(cos, 3)}\n` +
            `tg α = BC / AB = ${fmt(tan, 3)}`
          );
        });
      },
    };
  },
  quiz: [
    {
      q: "Тікбұрышты үшбұрышта қарсы катет 3, гипотенуза 5. sin α неге тең?",
      options: ["0,6", "0,8", "0,75", "1,67"],
      answer: 0,
      explain: "sin α — қарсы катеттің гипотенузаға қатынасы: 3 / 5 = 0,6.",
    },
    {
      q: "sin²α + cos²α неге тең?",
      options: ["0", "1", "2", "α-ға тәуелді"],
      answer: 1,
      explain: "Бұл — негізгі тригонометриялық тепе-теңдік, кез келген α үшін 1-ге тең.",
    },
    {
      q: "Үшбұрыштың барлық қабырғасын 2 есе үлкейтсек, sin α қалай өзгереді?",
      options: ["2 есе артады", "2 есе кемиді", "Өзгермейді", "4 есе артады"],
      answer: 2,
      explain: "Синус — қатынас, ал екі қабырға да бірдей еселенгенде қатынас өзгермейді.",
    },
  ],
};

/* ================= 8. Шеңбердегі бұрыштар ================= */
export const circleangles = {
  id: "circleangles",
  no: 8,
  title: "Центрлік және іштей сызылған бұрыш",
  category: "Жазықтық",
  summary: "Төбені доға бойымен жылжытсаң да іштей сызылған бұрыш өзгермейтінін тексер.",
  view: { x: 0, y: 0, z: 12 },
  theory: [
    "Центрлік бұрыш — төбесі шеңбердің центрінде жатқан бұрыш. Оның шамасы тірелген доғаның градустық өлшеміне тең.",
    "Іштей сызылған бұрыш — төбесі шеңберде жатқан, қабырғалары хордалар болатын бұрыш. Ол сол доғаға тірелген центрлік бұрыштың жартысына тең.",
    "Салдары: бір доғаға тірелген барлық іштей сызылған бұрыштар өзара тең, ал диаметрге тірелген бұрыш әрқашан 90°.",
  ],
  controls: [
    { type: "slider", id: "arc", label: "AB доғасы", min: 30, max: 300, step: 1, value: 110, unit: "°" },
    { type: "slider", id: "pos", label: "C төбесінің орны", min: 0, max: 100, step: 1, value: 50, unit: "%" },
  ],
  build({ group, setReadout }) {
    const draw = redrawer(group);
    const R = 3.2;
    return {
      update(p) {
        draw((g) => {
          const O = v(0, 0);
          const a0 = rad(200), a1 = a0 + rad(p.arc);
          const onC = (ang) => v(Math.cos(ang) * R, Math.sin(ang) * R);
          const A = onC(a0), B = onC(a1);
          // C — үлкен доғада
          const major = Math.PI * 2 - rad(p.arc);
          const ac = a1 + major * (0.08 + 0.84 * (p.pos / 100));
          const C = onC(ac);

          const circlePts = [];
          for (let i = 0; i <= 96; i++) circlePts.push(onC((i / 96) * Math.PI * 2));
          g.add(polyline(circlePts, PALETTE.ghost));

          // тірелген доға
          const arcPts = [];
          for (let i = 0; i <= 48; i++) arcPts.push(onC(a0 + (rad(p.arc) * i) / 48));
          g.add(polyline(arcPts, PALETTE.bad));

          g.add(polyline([A, O, B], PALETTE.line2));
          g.add(angleArc(O, A, B, 0.8, PALETTE.line2));
          g.add(polyline([A, C, B], PALETTE.accent));
          g.add(angleArc(C, A, B, 0.8, PALETTE.accent));

          [[O, "O"], [A, "A"], [B, "B"], [C, "C"]].forEach(([pt, t]) => {
            g.add(dot(pt, pt === C ? PALETTE.accent : PALETTE.line));
            const k = pt === O ? 0.45 : 0.5;
            g.add(label(t, v(pt.x * 1.14 + (pt === O ? 0.4 : 0), pt.y * 1.14 + (pt === O ? -0.4 : 0), 0), "#e7eef5", k));
          });

          setReadout(
            `AB доғасы = ${p.arc}°\n` +
            `Центрлік ∠AOB = ${p.arc}°\n` +
            `Іштей сызылған ∠ACB = ${fmt(p.arc / 2, 1)}°  (центрліктің жартысы)`
          );
        });
      },
    };
  },
  quiz: [
    {
      q: "Шеңберге іштей сызылған бұрыш 40°. Сол доғаға тірелген центрлік бұрыш:",
      options: ["20°", "40°", "80°", "140°"],
      answer: 2,
      explain: "Центрлік бұрыш іштей сызылғаннан 2 есе үлкен: 40° · 2 = 80°.",
    },
    {
      q: "Диаметрге тірелген іштей сызылған бұрыш неше градус?",
      options: ["45°", "60°", "90°", "180°"],
      answer: 2,
      explain: "Диаметр 180°-тық доғаға сәйкес келеді, ал іштей сызылған бұрыш оның жартысы — 90°.",
    },
    {
      q: "Бір доғаға тірелген екі түрлі іштей сызылған бұрыш туралы не айтуға болады?",
      options: [
        "Олар өзара тең",
        "Олардың қосындысы 180°",
        "Біреуі екіншісінен 2 есе үлкен",
        "Салыстыруға болмайды",
      ],
      answer: 0,
      explain: "Екеуі де сол доғаның жартысына тең, демек өзара тең.",
    },
  ],
};
