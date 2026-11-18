// Үш өлшемді көрініс: сахна, камера, жарық, басқару
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export const PALETTE = {
  line: 0x4e9bd4,
  line2: 0xe0a45f,
  accent: 0x52b788,
  bad: 0xe07a5f,
  face: 0x4e9bd4,
  face2: 0xe0a45f,
  ghost: 0x93a5b8,
};

export class Viewer {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.xr.enabled = true;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(45, 4 / 3, 0.01, 200);
    this.homePosition = new THREE.Vector3(0, 2.2, 9);
    this.camera.position.copy(this.homePosition);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 30;

    const hemi = new THREE.HemisphereLight(0xdfe9f2, 0x2a3a4a, 1.15);
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(4, 7, 6);
    const dir2 = new THREE.DirectionalLight(0xffffff, 0.35);
    dir2.position.set(-5, 2, -4);
    this.scene.add(hemi, dir, dir2);

    // Тақырып мазмұны осы топқа қосылады
    this.content = new THREE.Group();
    this.scene.add(this.content);

    // AR режиміндегі тірек (сахна осында кішірейіп орналасады)
    this.arRoot = new THREE.Group();
    this.scene.add(this.arRoot);

    this.current = null;
    this._onFrame = [];

    this._resize = this._resize.bind(this);
    window.addEventListener("resize", this._resize);
    this._ro = new ResizeObserver(this._resize);
    this._ro.observe(canvas.parentElement);
    this._resize();

    this.renderer.setAnimationLoop((time, frame) => this._tick(time, frame));
  }

  _resize() {
    const el = this.canvas.parentElement;
    if (!el) return;
    const w = el.clientWidth || 1;
    const h = el.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  _tick(time, frame) {
    this.controls.update();
    for (const fn of this._onFrame) fn(time, frame);
    if (this.current && this.current.tick) this.current.tick(time);
    this.renderer.render(this.scene, this.camera);
  }

  onFrame(fn) {
    this._onFrame.push(fn);
    return () => {
      const i = this._onFrame.indexOf(fn);
      if (i >= 0) this._onFrame.splice(i, 1);
    };
  }

  /** Тақырыптың мазмұнын ауыстыру */
  setContent(topic, ctx) {
    this.clear();
    const group = new THREE.Group();
    this.content.add(group);
    this.current = topic.build({ THREE, group, viewer: this, ...ctx }) || {};
    this.current.group = group;

    const view = topic.view || {};
    this.homePosition.set(
      view.x ?? 0,
      view.y ?? 2.2,
      view.z ?? 9,
    );

    // Жазық фигураны қырынан қарап қалмас үшін айналуды шектейміз
    const flat = topic.category === "Жазықтық";
    const HALF = Math.PI / 2;
    if (flat) {
      this.controls.minPolarAngle = HALF - 0.55;
      this.controls.maxPolarAngle = HALF + 0.35;
      this.controls.minAzimuthAngle = -0.6;
      this.controls.maxAzimuthAngle = 0.6;
    } else {
      this.controls.minPolarAngle = 0.12;
      this.controls.maxPolarAngle = HALF + 0.12;
      this.controls.minAzimuthAngle = -Infinity;
      this.controls.maxAzimuthAngle = Infinity;
    }

    this.resetView();
    return this.current;
  }

  clear() {
    if (this.current && this.current.dispose) this.current.dispose();
    this.current = null;
    disposeChildren(this.content);
  }

  resetView() {
    this.camera.position.copy(this.homePosition);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  setBackgroundTransparent(on) {
    this.renderer.setClearAlpha(on ? 0 : 1);
  }

  dispose() {
    window.removeEventListener("resize", this._resize);
    this._ro.disconnect();
    this.renderer.setAnimationLoop(null);
    this.clear();
    this.renderer.dispose();
  }
}

export function disposeChildren(obj) {
  for (let i = obj.children.length - 1; i >= 0; i--) {
    const child = obj.children[i];
    disposeChildren(child);
    obj.remove(child);
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const m of mats) {
        if (m.map) m.map.dispose();
        m.dispose();
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Геометрияны салуға арналған көмекші функциялар                     */
/* ------------------------------------------------------------------ */

export function v(x, y, z = 0) {
  return new THREE.Vector3(x, y, z);
}

/** Нүктелерді қосатын сынық сызық */
export function polyline(points, color = PALETTE.line, closed = false, width = 2) {
  const pts = closed ? [...points, points[0]] : points;
  const geom = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({ color, linewidth: width });
  return new THREE.Line(geom, mat);
}

/** Үзік сызық */
export function dashedLine(a, b, color = PALETTE.ghost) {
  const geom = new THREE.BufferGeometry().setFromPoints([a, b]);
  const mat = new THREE.LineDashedMaterial({ color, dashSize: 0.18, gapSize: 0.12 });
  const line = new THREE.Line(geom, mat);
  line.computeLineDistances();
  return line;
}

/** Жазық көпбұрышты бояу */
export function filledPolygon(points, color = PALETTE.face, opacity = 0.22) {
  const shape = new THREE.Shape(points.map((p) => new THREE.Vector2(p.x, p.y)));
  const geom = new THREE.ShapeGeometry(shape);
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  return new THREE.Mesh(geom, mat);
}

/** Нүкте (төбе) */
export function dot(p, color = PALETTE.line, r = 0.09) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(r, 16, 12),
    new THREE.MeshBasicMaterial({ color }),
  );
  m.position.copy(p);
  return m;
}

const labelCache = new Map();

/** Әріп/мәтін белгісі (спрайт) */
export function label(text, position, color = "#e7eef5", size = 0.5) {
  const key = text + color;
  let entry = labelCache.get(key);
  if (!entry) {
    const FONT = "bold 84px system-ui, sans-serif";
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.font = FONT;
    // ұзын жазуға бой жетсін деп кенептің енін мәтінге қарай есептейміз
    const width = Math.max(128, Math.ceil(ctx.measureText(text).width) + 24);
    canvas.width = width;
    canvas.height = 128;
    ctx.font = FONT; // өлшемді өзгерткен соң контекст қайта орнатылады
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, width / 2, 68);
    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 4;
    entry = { texture, aspect: width / 128 };
    labelCache.set(key, entry);
  }
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: entry.texture, transparent: true, depthTest: false }),
  );
  sprite.position.copy(position);
  sprite.scale.set(size * entry.aspect, size, 1);
  sprite.renderOrder = 10;
  return sprite;
}

/** Бұрыш доғасы */
export function angleArc(center, from, to, radius = 0.7, color = PALETTE.line2) {
  const a0 = Math.atan2(from.y - center.y, from.x - center.x);
  let a1 = Math.atan2(to.y - center.y, to.x - center.x);
  let delta = a1 - a0;
  while (delta <= -Math.PI) delta += Math.PI * 2;
  while (delta > Math.PI) delta -= Math.PI * 2;
  const pts = [];
  const steps = 32;
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (delta * i) / steps;
    pts.push(v(center.x + Math.cos(a) * radius, center.y + Math.sin(a) * radius, center.z));
  }
  return polyline(pts, color);
}

/** Тұйық беттен тұратын дене (қырларымен бірге) */
export function solid(geometry, color = PALETTE.face, opacity = 0.3) {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity,
      roughness: 0.55,
      metalness: 0.05,
      side: THREE.DoubleSide,
    }),
  );
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 15),
    new THREE.LineBasicMaterial({ color: PALETTE.line }),
  );
  group.add(mesh, edges);
  group.userData.mesh = mesh;
  group.userData.edges = edges;
  return group;
}

/** Координат жазықтығы — жазық фигуралар үшін торкөз */
export function planeGrid(size = 12, divisions = 12) {
  const grid = new THREE.GridHelper(size, divisions, 0x33475c, 0x253444);
  grid.rotation.x = Math.PI / 2;
  grid.position.z = -0.02;
  grid.material.transparent = true;
  grid.material.opacity = 0.5;
  return grid;
}

export const fmt = (x, digits = 1) =>
  Number(x).toFixed(digits).replace(".", ",").replace("-", "−");

export const deg = (rad) => (rad * 180) / Math.PI;
export const rad = (d) => (d * Math.PI) / 180;
