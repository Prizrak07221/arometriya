// «Сызбаны тану» экранының логикасы
import { analyze, imageDataFrom, TOPIC_FOR } from "./recognize.js";
import { byId } from "./topics.js";

const LOW_CONFIDENCE = 0.7;

export class Scanner {
  constructor({ feed, canvas, hint, startBtn, shotBtn, fileInput, result }, { openTopic }) {
    this.feed = feed;
    this.canvas = canvas;
    this.hint = hint;
    this.startBtn = startBtn;
    this.shotBtn = shotBtn;
    this.fileInput = fileInput;
    this.result = result;
    this.openTopic = openTopic;
    this.stream = null;

    this.startBtn.addEventListener("click", () => this.toggleCamera());
    this.shotBtn.addEventListener("click", () => this.shoot());
    this.fileInput.addEventListener("change", (e) => this.fromFile(e.target.files[0]));
  }

  /* ---------------- камера ---------------- */
  async toggleCamera() {
    if (this.stream) {
      this.stopCamera();
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this._hint("Бұл браузерде камера қолжетімсіз. «Сурет таңдау» арқылы дайын фотоны жүктей аласың.");
      return;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
        audio: false,
      });
    } catch (err) {
      const name = (err && err.name) || "";
      this._hint(
        name === "NotAllowedError"
          ? "Камераға рұқсат берілмеді. Рұқсат беріп қайта көр немесе дайын суретті жүкте."
          : "Камераны қосу мүмкін болмады. «Сурет таңдау» арқылы фотоны жүктеп көр.",
      );
      return;
    }

    this.feed.srcObject = this.stream;
    this.feed.hidden = false;
    this.canvas.hidden = true;
    await this.feed.play().catch(() => {});
    this.hint.hidden = true;
    this.shotBtn.disabled = false;
    this.startBtn.textContent = "Камераны өшіру";
  }

  stopCamera() {
    if (this.stream) {
      for (const t of this.stream.getTracks()) t.stop();
      this.stream = null;
    }
    this.feed.srcObject = null;
    this.feed.hidden = true;
    this.shotBtn.disabled = true;
    this.startBtn.textContent = "Камераны қосу";
    if (this.canvas.hidden) this._hint("Камераны қосып, сызбаңды көрсет");
  }

  /* ---------------- тану ---------------- */
  shoot() {
    if (!this.stream) return;
    const image = imageDataFrom(this.feed);
    if (!image) {
      this._hint("Кадр алынбады. Қайталап көр.");
      return;
    }
    this._process(image);
  }

  async fromFile(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = url;
      });
      const image = imageDataFrom(img);
      if (!image) {
        this._hint("Суретті оқу мүмкін болмады.");
        return;
      }
      this._process(image);
    } catch {
      this._hint("Суретті оқу мүмкін болмады.");
    } finally {
      URL.revokeObjectURL(url);
      this.fileInput.value = "";
    }
  }

  _process(image) {
    const res = analyze(image);
    this._paint(image, res);
    this._render(res);
  }

  /** Талданған кадрды және табылған контурды экранға саламыз */
  _paint(image, res) {
    const c = this.canvas;
    c.width = image.width;
    c.height = image.height;
    const ctx = c.getContext("2d");
    ctx.putImageData(image, 0, 0);

    if (res.polygon && res.polygon.length > 2) {
      ctx.lineWidth = Math.max(2, image.width / 150);
      ctx.strokeStyle = res.ok ? "#52b788" : "#e07a5f";
      ctx.beginPath();
      res.polygon.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.stroke();

      ctx.fillStyle = res.ok ? "#52b788" : "#e07a5f";
      for (const p of res.polygon) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, ctx.lineWidth * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    c.hidden = false;
    this.feed.hidden = true;
    this.hint.hidden = true;
  }

  _render(res) {
    const box = this.result;
    box.innerHTML = "";
    box.hidden = false;
    box.className = "result" + (res.ok ? "" : " bad");

    if (!res.ok) {
      const h = document.createElement("h3");
      h.textContent = "Фигура танылмады";
      const p = document.createElement("p");
      p.className = "conf";
      p.textContent = res.reason || "";
      box.append(h, p);
      this._addRetry(box);
      return;
    }

    const pct = Math.round(res.confidence * 100);
    const low = res.confidence < LOW_CONFIDENCE;

    const h = document.createElement("h3");
    h.textContent = res.name;
    const conf = document.createElement("p");
    conf.className = "conf";
    conf.textContent = `Сенімділік: ${pct}%`;
    const bar = document.createElement("div");
    bar.className = "bar" + (low ? " low" : "");
    bar.innerHTML = `<i style="width:${pct}%"></i>`;
    box.append(h, conf, bar);

    if (low) {
      const note = document.createElement("p");
      note.className = "conf";
      note.textContent =
        "Сенімділік төмен, сондықтан екі нұсқа ұсынылады. Дұрысын өзің таңда.";
      box.append(note);
    }

    const choices = [{ label: res.label, name: res.name }];
    if (low) {
      for (const a of res.alternatives || []) choices.push({ label: a.label, name: a.name });
    }

    const alts = document.createElement("div");
    alts.className = "alts";
    for (const c of choices.slice(0, 2)) {
      const topic = byId(TOPIC_FOR[c.label]);
      if (!topic) continue;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "primary wide";
      btn.textContent = `${c.name} → ${topic.no}. ${topic.title}`;
      btn.addEventListener("click", () => {
        this.stopCamera();
        this.openTopic(topic.id);
      });
      alts.appendChild(btn);
    }
    box.appendChild(alts);
    this._addRetry(box);
  }

  _addRetry(box) {
    const again = document.createElement("button");
    again.type = "button";
    again.className = "ghost wide";
    again.textContent = "Қайта сканерлеу";
    again.addEventListener("click", () => {
      box.hidden = true;
      this.canvas.hidden = true;
      if (this.stream) {
        this.feed.hidden = false;
      } else {
        this._hint("Камераны қосып, сызбаңды көрсет");
      }
    });
    box.appendChild(again);
  }

  _hint(text) {
    this.hint.textContent = text;
    this.hint.hidden = false;
    this.canvas.hidden = true;
  }
}
