// 9–12 тақырыптар: кеңістіктегі денелер
import * as THREE from "three";
import {
  PALETTE, v, polyline, dashedLine, dot, label, solid,
  disposeChildren, fmt, rad,
} from "../viewer.js";

const SOLID_VIEW = { x: 6, y: 5, z: 11 };

/** Көлденең торкөз — денелер тұратын «еден» */
function groundGrid(size = 14) {
  const grid = new THREE.GridHelper(size, size, 0x33475c, 0x253444);
  grid.material.transparent = true;
  grid.material.opacity = 0.45;
  grid.position.y = -0.001;
  return grid;
}

/** Бір жазық жақ: боялған бет + контуры */
function face(w, h, color = PALETTE.face, opacity = 0.34) {
  const g = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({
      color, transparent: true, opacity,
      side: THREE.DoubleSide, roughness: 0.6, metalness: 0.02,
    }),
  );
  const border = polyline(
    [v(-w / 2, -h / 2), v(w / 2, -h / 2), v(w / 2, h / 2), v(-w / 2, h / 2)],
    PALETTE.line, true,
  );
  border.position.z = 0.002;
  g.add(mesh, border);
  return g;
}

function redrawer(group) {
  return (drawFn) => {
    disposeChildren(group);
    drawFn(group);
  };
}

/* ================= 9. Призма ================= */
export const prism = {
  id: "prism",
  no: 9,
  title: "Призма және оның жазбасы",
  category: "Кеңістік",
  summary: "Жүгірткіні жылжытып, призманың жазбаға жайылуын өз көзіңмен көр.",
  view: SOLID_VIEW,
  theory: [
    "Тік призма — екі табаны өзара тең әрі параллель, ал бүйір жақтары тіктөртбұрыш болатын көпжақ.",
    "Дененің жазбасы — оны қырлары бойымен кесіп, бір жазықтыққа жайғанда шығатын жазық фигура. Жазбаның ауданы дененің толық бетінің ауданына тең.",
    "Тік призма үшін: Sбүйір = Pтабан · h, Sтолық = Sбүйір + 2 · Sтабан, V = Sтабан · h.",
  ],
  controls: [
    { type: "slider", id: "unfold", label: "Жазбаға жаю", min: 0, max: 100, step: 1, value: 0, unit: "%" },
    { type: "slider", id: "a", label: "Табанының ені a", min: 1.5, max: 4, step: 0.1, value: 3 },
    { type: "slider", id: "b", label: "Табанының ұзындығы b", min: 1.5, max: 4, step: 0.1, value: 2 },
    { type: "slider", id: "h", label: "Биіктігі h", min: 1.5, max: 5, step: 0.1, value: 3.5 },
  ],
  build({ group, setReadout }) {
    const draw = redrawer(group);
    return {
      update(p) {
        draw((g) => {
          const { a, b, h } = p;
          const t = p.unfold / 100;
          g.add(groundGrid());

          // табаны
          const base = face(a, b, PALETTE.accent, 0.4);
          base.rotation.x = -Math.PI / 2;
          g.add(base);

          const mkSide = (w, pivotPos, axis, sign) => {
            const pivot = new THREE.Group();
            pivot.position.copy(pivotPos);
            const f = face(w, h);
            f.position.set(0, h / 2, 0);
            pivot.add(f);
            pivot.rotation[axis] = sign * t * (Math.PI / 2);
            g.add(pivot);
            return { pivot, f };
          };

          const front = mkSide(a, v(0, 0, b / 2), "x", 1);
          mkSide(a, v(0, 0, -b / 2), "x", -1);
          const right = mkSide(b, v(a / 2, 0, 0), "z", -1);
          right.f.rotation.y = Math.PI / 2;
          const left = mkSide(b, v(-a / 2, 0, 0), "z", 1);
          left.f.rotation.y = Math.PI / 2;

          // жоғарғы табаны — алдыңғы жақтың үстіне ілінген
          const topPivot = new THREE.Group();
          topPivot.position.set(0, h / 2, 0);
          const topFace = face(a, b, PALETTE.accent, 0.4);
          topFace.position.set(0, b / 2, 0);
          topPivot.add(topFace);
          topPivot.rotation.x = -(1 - t) * (Math.PI / 2);
          front.f.add(topPivot);

          const Sbase = a * b;
          const Pbase = 2 * (a + b);
          const Sside = Pbase * h;
          setReadout(
            `a = ${fmt(a)}   b = ${fmt(b)}   h = ${fmt(h)}\n` +
            `Sбүйір = P · h = ${fmt(Pbase)} · ${fmt(h)} = ${fmt(Sside)}\n` +
            `Sтолық = ${fmt(Sside + 2 * Sbase)}   V = ${fmt(Sbase * h)}`
          );
        });
      },
    };
  },
  quiz: [
    {
      q: "Табаны 3 см × 4 см, биіктігі 10 см тік призманың бүйір бетінің ауданы:",
      options: ["120 см²", "140 см²", "70 см²", "12 см²"],
      answer: 1,
      explain: "Sбүйір = P · h = 2 · (3 + 4) · 10 = 14 · 10 = 140 см².",
    },
    {
      q: "Тік төртбұрышты призманың жазбасы неше жақтан тұрады?",
      options: ["4", "5", "6", "8"],
      answer: 2,
      explain: "Екі табан және төрт бүйір жақ — барлығы 6 тіктөртбұрыш.",
    },
    {
      q: "Призманың көлемі неге тең?",
      options: [
        "Табан ауданы × биіктік",
        "Табан периметрі × биіктік",
        "Табан ауданы × биіктік / 3",
        "Толық бет ауданы × биіктік",
      ],
      answer: 0,
      explain: "V = Sтабан · h. Үштен бірге бөлу пирамидаға қатысты.",
    },
  ],
};

/* ================= 10. Пирамида ================= */
export const pyramid = {
  id: "pyramid",
  no: 10,
  title: "Пирамида және оның қимасы",
  category: "Кеңістік",
  summary: "Қиюшы жазықтықты жоғары-төмен жылжытып, қиманың қалай кішірейетінін көр.",
  view: SOLID_VIEW,
  theory: [
    "Дұрыс төртбұрышты пирамиданың табаны — шаршы, ал төбесі табанның центрінен тұрғызылған перпендикулярда жатады.",
    "Табанға параллель жазықтықпен қиғанда қимада табанға ұқсас фигура шығады. Ұқсастық коэффициенті төбеден есептегенде биіктіктердің қатынасына тең.",
    "Сондықтан қиманың ауданы табан ауданынан k² есе кіші. Пирамиданың көлемі V = (1/3) · Sтабан · h.",
  ],
  controls: [
    { type: "slider", id: "cut", label: "Қиманың биіктігі", min: 0, max: 95, step: 1, value: 45, unit: "%" },
    { type: "slider", id: "a", label: "Табанының қабырғасы", min: 2, max: 5, step: 0.1, value: 4 },
    { type: "slider", id: "h", label: "Биіктігі", min: 2, max: 6, step: 0.1, value: 4.5 },
  ],
  build({ group, setReadout }) {
    const draw = redrawer(group);
    return {
      update(p) {
        draw((g) => {
          const { a, h } = p;
          const d = (p.cut / 100) * h;
          g.add(groundGrid());

          const half = a / 2;
          const A = v(-half, 0, half), B = v(half, 0, half);
          const C = v(half, 0, -half), D = v(-half, 0, -half);
          const S = v(0, h, 0);

          const geom = new THREE.BufferGeometry();
          const verts = [];
          const push = (...pts) => pts.forEach((pt) => verts.push(pt.x, pt.y, pt.z));
          push(A, B, S); push(B, C, S); push(C, D, S); push(D, A, S);
          push(A, B, C); push(A, C, D);
          geom.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
          geom.computeVertexNormals();
          g.add(solid(geom, PALETTE.face, 0.26));

          g.add(dashedLine(v(0, 0, 0), S, PALETTE.ghost));

          // қима
          const k = 1 - d / h;
          const s = half * k;
          const cut = [v(-s, d, s), v(s, d, s), v(s, d, -s), v(-s, d, -s)];
          const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(a * 1.9, a * 1.9),
            new THREE.MeshBasicMaterial({
              color: PALETTE.line2, transparent: true, opacity: 0.1, side: THREE.DoubleSide,
            }),
          );
          plane.rotation.x = -Math.PI / 2;
          plane.position.y = d;
          g.add(plane);

          const cutFill = new THREE.Mesh(
            new THREE.PlaneGeometry(s * 2, s * 2),
            new THREE.MeshBasicMaterial({
              color: PALETTE.accent, transparent: true, opacity: 0.55, side: THREE.DoubleSide,
            }),
          );
          cutFill.rotation.x = -Math.PI / 2;
          cutFill.position.y = d + 0.004;
          g.add(cutFill);
          g.add(polyline(cut, PALETTE.accent, true));

          [[A, "A"], [B, "B"], [C, "C"], [D, "D"], [S, "S"]].forEach(([pt, t]) => {
            g.add(dot(pt));
            g.add(label(t, v(pt.x * 1.16, pt.y + (pt === S ? 0.5 : -0.35), pt.z * 1.16), "#e7eef5", 0.45));
          });

          setReadout(
            `Табаны a = ${fmt(a)}   биіктігі h = ${fmt(h)}\n` +
            `Қима биіктігі = ${fmt(d)}   k = ${fmt(k, 2)}\n` +
            `Қима қабырғасы = ${fmt(a * k)}   Sқима / Sтабан = ${fmt(k * k, 2)}`
          );
        });
      },
    };
  },
  quiz: [
    {
      q: "Дұрыс төртбұрышты пирамиданы табанына параллель жазықтықпен қисақ, қимада қандай фигура шығады?",
      options: ["Үшбұрыш", "Шаршы", "Трапеция", "Дөңгелек"],
      answer: 1,
      explain: "Табанға параллель қима табанға ұқсас фигура береді, ал табан — шаршы.",
    },
    {
      q: "Қима пирамиданы биіктігінің ортасынан қиса, қиманың ауданы табанның ауданынан неше есе кіші?",
      options: ["2 есе", "3 есе", "4 есе", "8 есе"],
      answer: 2,
      explain: "k = 1/2, ал аудандар қатынасы k² = 1/4, демек 4 есе кіші.",
    },
    {
      q: "Пирамиданың көлемі:",
      options: [
        "Sтабан · h",
        "(1/2) · Sтабан · h",
        "(1/3) · Sтабан · h",
        "(1/3) · P · h",
      ],
      answer: 2,
      explain: "Пирамиданың көлемі сондай табаны мен биіктігі бар призма көлемінің үштен біріне тең.",
    },
  ],
};

/* ================= 11. Цилиндр және конус ================= */
export const revolution = {
  id: "revolution",
  no: 11,
  title: "Цилиндр және конус — айналу денелері",
  category: "Кеңістік",
  summary: "Тіктөртбұрышты немесе үшбұрышты айналдырып, дененің қалай пайда болатынын көр.",
  view: SOLID_VIEW,
  theory: [
    "Цилиндр тіктөртбұрышты оның бір қабырғасынан өтетін түзудің айналасында толық айналдырғанда пайда болады.",
    "Конус тікбұрышты үшбұрышты оның катетінің айналасында айналдырғанда шығады. Екінші катет — табан радиусы, ал айналу осі — биіктік.",
    "Цилиндр үшін V = πr²h, ал конус үшін V = (1/3)πr²h: сондай радиус пен биіктікте конус цилиндрден дәл 3 есе кіші.",
  ],
  controls: [
    { type: "select", id: "kind", label: "Дене", value: "cylinder",
      options: [{ value: "cylinder", text: "Цилиндр" }, { value: "cone", text: "Конус" }] },
    { type: "slider", id: "angle", label: "Айналу бұрышы", min: 0, max: 360, step: 1, value: 360, unit: "°" },
    { type: "slider", id: "r", label: "Радиусы r", min: 1, max: 3, step: 0.1, value: 2 },
    { type: "slider", id: "h", label: "Биіктігі h", min: 1.5, max: 5.5, step: 0.1, value: 4 },
  ],
  build({ group, setReadout }) {
    const draw = redrawer(group);
    return {
      update(p) {
        draw((g) => {
          const { r, h } = p;
          const theta = rad(Math.max(p.angle, 0.5));
          const isCone = p.kind === "cone";
          g.add(groundGrid());

          const geom = new THREE.CylinderGeometry(
            isCone ? 0.001 : r, r, h, 48, 1, false, 0, theta,
          );
          geom.translate(0, h / 2, 0);
          g.add(solid(geom, PALETTE.face, 0.3));

          // айналу осі
          g.add(dashedLine(v(0, -0.3, 0), v(0, h + 0.5, 0), PALETTE.line2));

          // жасаушы жазық фигура — ағымдағы бұрышта
          const ca = Math.cos(theta), sa = Math.sin(theta);
          const outer = v(r * sa, 0, r * ca);
          const gen = isCone
            ? [v(0, 0, 0), outer, v(0, h, 0)]
            : [v(0, 0, 0), outer, v(outer.x, h, outer.z), v(0, h, 0)];
          const mat = new THREE.MeshBasicMaterial({
            color: PALETTE.accent, transparent: true, opacity: 0.6, side: THREE.DoubleSide,
          });
          const gg = new THREE.BufferGeometry();
          const tri = [];
          const push = (...pts) => pts.forEach((pt) => tri.push(pt.x, pt.y, pt.z));
          if (isCone) push(gen[0], gen[1], gen[2]);
          else { push(gen[0], gen[1], gen[2]); push(gen[0], gen[2], gen[3]); }
          gg.setAttribute("position", new THREE.Float32BufferAttribute(tri, 3));
          gg.computeVertexNormals();
          g.add(new THREE.Mesh(gg, mat));
          g.add(polyline(gen, PALETTE.accent, true));

          const V = isCone ? (Math.PI * r * r * h) / 3 : Math.PI * r * r * h;
          const Sside = isCone ? Math.PI * r * Math.hypot(r, h) : 2 * Math.PI * r * h;
          setReadout(
            `${isCone ? "Конус" : "Цилиндр"}   r = ${fmt(r)}   h = ${fmt(h)}\n` +
            `Айналу бұрышы = ${p.angle}°\n` +
            `V = ${fmt(V, 2)}   Sбүйір = ${fmt(Sside, 2)}` +
            (isCone ? `\nЖасаушысы l = ${fmt(Math.hypot(r, h), 2)}` : "")
          );
        });
      },
    };
  },
  quiz: [
    {
      q: "Тікбұрышты үшбұрышты катетінің айналасында айналдырсақ, қандай дене шығады?",
      options: ["Цилиндр", "Конус", "Шар", "Призма"],
      answer: 1,
      explain: "Айналу осі — катет, екінші катет табан радиусын береді, нәтижесінде конус пайда болады.",
    },
    {
      q: "Радиусы мен биіктігі бірдей цилиндр мен конустың көлемдері қалай қатысты?",
      options: [
        "Тең",
        "Цилиндр 2 есе үлкен",
        "Цилиндр 3 есе үлкен",
        "Конус 3 есе үлкен",
      ],
      answer: 2,
      explain: "V цилиндр = πr²h, V конус = (1/3)πr²h, демек цилиндр 3 есе үлкен.",
    },
    {
      q: "Радиусы 3, биіктігі 4 конустың жасаушысы неге тең?",
      options: ["5", "7", "12", "25"],
      answer: 0,
      explain: "l = √(r² + h²) = √(9 + 16) = √25 = 5.",
    },
  ],
};

/* ================= 12. Шар ================= */
export const sphere = {
  id: "sphere",
  no: 12,
  title: "Шар және оның қимасы",
  category: "Кеңістік",
  summary: "Қиюшы жазықтықты жылжытып, қима дөңгелегінің радиусы қалай өзгеретінін бақыла.",
  view: { x: 5, y: 4, z: 10 },
  theory: [
    "Шар — центрден берілген қашықтықтан аспайтын нүктелердің жиыны, ал сфера — дәл сол қашықтықтағы нүктелердің беті.",
    "Шарды жазықтықпен қиғанда әрқашан дөңгелек шығады. Центрден қашықтық d болса, қима радиусы r = √(R² − d²).",
    "Жазықтық центр арқылы өтсе (d = 0), қима ең үлкен болады — оны үлкен дөңгелек деп атайды, радиусы шардың радиусына тең.",
  ],
  controls: [
    { type: "slider", id: "d", label: "Центрден қашықтық d", min: -95, max: 95, step: 1, value: 40, unit: "%" },
    { type: "slider", id: "R", label: "Шардың радиусы R", min: 1.5, max: 3.5, step: 0.1, value: 2.6 },
    { type: "toggle", id: "half", label: "Жартысын жасыру", value: true },
  ],
  build({ group, setReadout }) {
    const draw = redrawer(group);
    return {
      update(p) {
        draw((g) => {
          const R = p.R;
          const d = (p.d / 100) * R;
          g.add(groundGrid());

          const phiLength = p.half ? Math.PI : Math.PI * 2;
          const geom = new THREE.SphereGeometry(R, 48, 32, 0, phiLength);
          const mesh = new THREE.Mesh(
            geom,
            new THREE.MeshStandardMaterial({
              color: PALETTE.face, transparent: true, opacity: 0.25,
              side: THREE.DoubleSide, roughness: 0.5,
            }),
          );
          mesh.position.y = R;
          g.add(mesh);

          // контуры
          const outline = [];
          for (let i = 0; i <= 72; i++) {
            const a = (i / 72) * Math.PI * 2;
            outline.push(v(Math.cos(a) * R, R + Math.sin(a) * R, 0));
          }
          g.add(polyline(outline, PALETTE.line));

          const rr = Math.sqrt(Math.max(R * R - d * d, 0));
          const planeY = R + d;

          const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(R * 2.8, R * 2.8),
            new THREE.MeshBasicMaterial({
              color: PALETTE.line2, transparent: true, opacity: 0.12, side: THREE.DoubleSide,
            }),
          );
          plane.rotation.x = -Math.PI / 2;
          plane.position.y = planeY;
          g.add(plane);

          const disc = new THREE.Mesh(
            new THREE.CircleGeometry(rr, 48),
            new THREE.MeshBasicMaterial({
              color: PALETTE.accent, transparent: true, opacity: 0.5, side: THREE.DoubleSide,
            }),
          );
          disc.rotation.x = -Math.PI / 2;
          disc.position.y = planeY + 0.004;
          g.add(disc);

          const ring = [];
          for (let i = 0; i <= 64; i++) {
            const a = (i / 64) * Math.PI * 2;
            ring.push(v(Math.cos(a) * rr, planeY + 0.006, Math.sin(a) * rr));
          }
          g.add(polyline(ring, PALETTE.accent));

          g.add(dot(v(0, R, 0), PALETTE.line2, 0.08));
          g.add(label("O", v(0.35, R + 0.3, 0), "#e0a45f", 0.45));
          g.add(dashedLine(v(0, R, 0), v(0, planeY, 0), PALETTE.line2));
          g.add(dashedLine(v(0, planeY, 0), v(rr, planeY, 0), PALETTE.accent));

          setReadout(
            `R = ${fmt(R)}   d = ${fmt(Math.abs(d), 2)}\n` +
            `Қима радиусы r = √(R² − d²) = ${fmt(rr, 2)}\n` +
            `Qима ауданы = ${fmt(Math.PI * rr * rr, 2)}` +
            (Math.abs(d) < 0.05 ? "\nҮлкен дөңгелек (d = 0)" : "")
          );
        });
      },
    };
  },
  quiz: [
    {
      q: "Шарды жазықтықпен қиғанда қимада не шығады?",
      options: ["Эллипс", "Дөңгелек", "Шаршы", "Парабола"],
      answer: 1,
      explain: "Қандай бағытта қисақ та, шардың қимасы әрқашан дөңгелек болады.",
    },
    {
      q: "Радиусы 10 см шарды центрден 6 см қашықтықтағы жазықтықпен қидық. Қима радиусы:",
      options: ["4 см", "8 см", "6 см", "16 см"],
      answer: 1,
      explain: "r = √(R² − d²) = √(100 − 36) = √64 = 8 см.",
    },
    {
      q: "Қима қай жағдайда ең үлкен болады?",
      options: [
        "Жазықтық шарға жанасқанда",
        "Жазықтық центр арқылы өткенде",
        "Жазықтық көлбеу орналасқанда",
        "Қима әрқашан бірдей",
      ],
      answer: 1,
      explain: "d = 0 болғанда r = R, бұл ең үлкен қима — үлкен дөңгелек.",
    },
  ],
};
