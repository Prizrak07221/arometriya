// Қосымшаның кіреберісі: экрандар, басқару панелі, тест және нәтиже
import { Viewer } from "./viewer.js";
import { TOPICS, CATEGORIES, byId, defaultParams } from "./topics.js";
import { ARMode } from "./ar.js";
import { Quiz } from "./quiz.js";
import * as progress from "./progress.js";

const $ = (sel) => document.querySelector(sel);

const views = {
  topics: $("#view-topics"),
  topic: $("#view-topic"),
  quiz: $("#view-quiz"),
  progress: $("#view-progress"),
  about: $("#view-about"),
};

const el = {
  title: $("#title"),
  subtitle: $("#subtitle"),
  back: $("#backBtn"),
  grid: $("#topicGrid"),
  chips: $("#filterChips"),
  canvas: $("#canvas"),
  stage: document.querySelector(".stage"),
  video: $("#camFeed"),
  readout: $("#readout"),
  controls: $("#controls"),
  theory: $("#theory"),
  arBtn: $("#arBtn"),
  resetView: $("#resetViewBtn"),
  quizBtn: $("#quizBtn"),
  arStatus: $("#arStatus"),
  progressSummary: $("#progressSummary"),
  progressList: $("#progressList"),
  resetProgress: $("#resetProgress"),
  buildInfo: $("#buildInfo"),
};

let viewer = null;
let ar = null;
let currentTopic = null;
let params = {};
let filter = "Барлығы";

/* ---------------------------------------------------------- */
/*  Экрандарды ауыстыру                                        */
/* ---------------------------------------------------------- */
function show(name, opts = {}) {
  for (const [key, node] of Object.entries(views)) node.hidden = key !== name;

  const isTopic = name === "topic" || name === "quiz";
  el.back.hidden = !isTopic;

  for (const btn of document.querySelectorAll(".tabbar button")) {
    btn.classList.toggle("active", btn.dataset.view === name);
  }

  if (name === "topics") {
    el.title.textContent = "ARометрия";
    el.subtitle.textContent = "Геометрияны үш өлшемде үйрен";
    renderGrid();
  } else if (name === "progress") {
    el.title.textContent = "Менің нәтижем";
    el.subtitle.textContent = "Тест нәтижелерің осы құрылғыда сақталады";
    renderProgress();
  } else if (name === "about") {
    el.title.textContent = "Жоба туралы";
    el.subtitle.textContent = "«Зерде» ғылыми жобасы";
  } else if (isTopic && opts.topic) {
    el.title.textContent = `${opts.topic.no}. ${opts.topic.title}`;
    el.subtitle.textContent = opts.topic.category;
  }

  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

/* ---------------------------------------------------------- */
/*  Тақырыптар тізімі                                          */
/* ---------------------------------------------------------- */
function renderChips() {
  el.chips.innerHTML = "";
  for (const c of CATEGORIES) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = c;
    b.classList.toggle("active", c === filter);
    b.addEventListener("click", () => {
      filter = c;
      renderChips();
      renderGrid();
    });
    el.chips.appendChild(b);
  }
}

function renderGrid() {
  const all = progress.getAll();
  el.grid.innerHTML = "";
  const list = TOPICS.filter((t) => filter === "Барлығы" || t.category === filter);

  for (const topic of list) {
    const res = all[topic.id];
    const done = res && res.correct === res.total;

    const card = document.createElement("button");
    card.type = "button";
    card.className = "card";
    card.innerHTML = `
      <span class="no${done ? " done" : ""}">${done ? "✓" : topic.no}</span>
      <span>
        <h3></h3>
        <p></p>
      </span>`;
    card.querySelector("h3").textContent = topic.title;
    card.querySelector("p").textContent = res
      ? `Тест: ${res.correct} / ${res.total} · ${topic.summary}`
      : topic.summary;
    card.addEventListener("click", () => openTopic(topic.id));
    el.grid.appendChild(card);
  }
}

/* ---------------------------------------------------------- */
/*  Тақырыпты ашу                                              */
/* ---------------------------------------------------------- */
function openTopic(id) {
  const topic = byId(id);
  if (!topic) return;
  currentTopic = topic;
  params = defaultParams(topic);

  show("topic", { topic });

  if (!viewer) {
    viewer = new Viewer(el.canvas);
    ar = new ARMode(viewer, {
      stage: el.stage,
      video: el.video,
      button: el.arBtn,
      onStatus: setArStatus,
    });
    // қолдауды алдын ала тексереміз: басқан сәтте await жасауға болмайды
    ar.init().then((xr) => {
      el.arBtn.textContent = xr ? "AR режимі" : "Камера режимі";
      el.arBtn.title = xr
        ? "Фигураны бөлменің ішінен көру"
        : "Бұл браузерде WebXR жоқ — камера тек фон ретінде қолданылады";
    });
    el.arBtn.addEventListener("click", () => ar.toggle());
    el.resetView.addEventListener("click", () => viewer.resetView());
  }
  setArStatus("");

  const instance = viewer.setContent(topic, { setReadout });
  instance.update(params);

  renderControls(topic, instance);
  renderTheory(topic);
}

function setReadout(text) {
  el.readout.textContent = text;
}

function setArStatus(text, kind = "info") {
  el.arStatus.textContent = text || "";
  el.arStatus.className = "arstatus " + kind;
  el.arStatus.hidden = !text;
}

function renderTheory(topic) {
  el.theory.innerHTML = "<h3>Қысқаша теория</h3>";
  for (const para of topic.theory || []) {
    const p = document.createElement("p");
    p.textContent = para;
    el.theory.appendChild(p);
  }
}

function renderControls(topic, instance) {
  el.controls.innerHTML = "";

  for (const c of topic.controls || []) {
    const wrap = document.createElement("div");
    wrap.className = "ctl";

    if (c.type === "slider") {
      const lab = document.createElement("label");
      const value = document.createElement("b");
      lab.append(c.label, value);

      const input = document.createElement("input");
      input.type = "range";
      input.min = c.min;
      input.max = c.max;
      input.step = c.step;
      input.value = params[c.id];

      const paint = () => {
        const raw = Number(input.value);
        value.textContent =
          (c.step < 1 ? raw.toFixed(1).replace(".", ",") : String(raw)) + (c.unit || "");
      };
      paint();

      input.addEventListener("input", () => {
        params[c.id] = Number(input.value);
        paint();
        instance.update(params);
      });

      wrap.append(lab, input);
    } else if (c.type === "toggle") {
      const lab = document.createElement("label");
      lab.className = "toggle";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = !!params[c.id];
      input.addEventListener("change", () => {
        params[c.id] = input.checked;
        instance.update(params);
      });
      lab.append(input, document.createTextNode(c.label));
      wrap.append(lab);
    } else if (c.type === "select") {
      const lab = document.createElement("label");
      lab.textContent = c.label;
      const select = document.createElement("select");
      for (const o of c.options) {
        const opt = document.createElement("option");
        opt.value = o.value;
        opt.textContent = o.text;
        select.appendChild(opt);
      }
      select.value = params[c.id];
      select.addEventListener("change", () => {
        params[c.id] = select.value;
        instance.update(params);
      });
      wrap.append(lab, select);
    }

    el.controls.appendChild(wrap);
  }
}

/* ---------------------------------------------------------- */
/*  Тест                                                       */
/* ---------------------------------------------------------- */
const quiz = new Quiz(
  {
    counter: $("#quizCounter"),
    score: $("#quizScore"),
    question: $("#quizQuestion"),
    options: $("#quizOptions"),
    explain: $("#quizExplain"),
    next: $("#quizNext"),
  },
  {
    onFinish: (topic, correct, total) => {
      show("progress");
      const note = document.createElement("p");
      note.className = "muted";
      note.textContent =
        correct === total
          ? `«${topic.title}» тақырыбы бойынша барлық сұраққа дұрыс жауап бердің.`
          : `«${topic.title}»: ${total} сұрақтың ${correct}-еуі дұрыс. Тақырыпқа оралып, қайта көруге болады.`;
      el.progressSummary.appendChild(note);
    },
  },
);

el.quizBtn.addEventListener("click", () => {
  if (!currentTopic) return;
  if (ar && ar.active) ar.stop();
  quiz.start(currentTopic);
  show("quiz", { topic: currentTopic });
});

/* ---------------------------------------------------------- */
/*  Нәтиже                                                     */
/* ---------------------------------------------------------- */
function renderProgress() {
  const all = progress.getAll();
  const s = progress.summary(TOPICS);

  el.progressSummary.innerHTML =
    `<b>${s.done}</b> / ${s.topics} тақырып өтілді` +
    (s.total ? `<br />Жалпы нәтиже: ${s.correct} / ${s.total} дұрыс жауап` : "");

  el.progressList.innerHTML = "";
  for (const t of TOPICS) {
    const r = all[t.id];
    const row = document.createElement("div");
    row.className = "prow" + (r && r.correct === r.total ? " done" : "");
    const left = document.createElement("span");
    left.textContent = `${t.no}. ${t.title}`;
    const right = document.createElement("span");
    right.textContent = r ? `${r.correct} / ${r.total}` : "—";
    row.append(left, right);
    row.addEventListener("click", () => openTopic(t.id));
    el.progressList.appendChild(row);
  }
}

el.resetProgress.addEventListener("click", () => {
  if (!confirm("Барлық нәтижені өшіруге сенімдісің бе?")) return;
  progress.reset();
  renderProgress();
});

/* ---------------------------------------------------------- */
/*  Навигация                                                  */
/* ---------------------------------------------------------- */
for (const btn of document.querySelectorAll(".tabbar button")) {
  btn.addEventListener("click", () => {
    if (ar && ar.active) ar.stop();
    show(btn.dataset.view);
  });
}

el.back.addEventListener("click", () => {
  if (!views.quiz.hidden) {
    show("topic", { topic: currentTopic });
    return;
  }
  if (ar && ar.active) ar.stop();
  show("topics");
});

/* ---------------------------------------------------------- */
/*  Бастау                                                     */
/* ---------------------------------------------------------- */
renderChips();
show("topics");

el.buildInfo.textContent = "Нұсқасы 1.0.0 · " + new Date().getFullYear();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
