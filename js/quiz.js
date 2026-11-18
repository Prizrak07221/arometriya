// Тақырып соңындағы үш сұрақтық тест
import * as progress from "./progress.js";

export class Quiz {
  constructor(els, { onFinish }) {
    this.els = els;
    this.onFinish = onFinish;
    els.next.addEventListener("click", () => this._next());
  }

  start(topic) {
    this.topic = topic;
    this.index = 0;
    this.correct = 0;
    this._render();
  }

  _render() {
    const { els } = this;
    const q = this.topic.quiz[this.index];
    els.counter.textContent = `${this.topic.no}-тақырып · ${this.index + 1} / ${this.topic.quiz.length} сұрақ`;
    els.score.textContent = `Дұрыс: ${this.correct}`;
    els.question.textContent = q.q;
    els.explain.hidden = true;
    els.explain.textContent = "";
    els.next.hidden = true;
    els.options.innerHTML = "";

    q.options.forEach((text, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = text;
      btn.addEventListener("click", () => this._answer(i, btn));
      els.options.appendChild(btn);
    });
  }

  _answer(i, btn) {
    const q = this.topic.quiz[this.index];
    const buttons = [...this.els.options.children];
    buttons.forEach((b) => (b.disabled = true));

    if (i === q.answer) {
      this.correct++;
      btn.classList.add("correct");
    } else {
      btn.classList.add("wrong");
      buttons[q.answer].classList.add("correct");
    }

    this.els.score.textContent = `Дұрыс: ${this.correct}`;
    this.els.explain.textContent = q.explain;
    this.els.explain.hidden = false;
    this.els.next.hidden = false;
    this.els.next.textContent =
      this.index + 1 < this.topic.quiz.length ? "Келесі сұрақ" : "Нәтижені көру";
  }

  _next() {
    if (this.index + 1 < this.topic.quiz.length) {
      this.index++;
      this._render();
      return;
    }
    progress.save(this.topic.id, this.correct, this.topic.quiz.length);
    this.onFinish(this.topic, this.correct, this.topic.quiz.length);
  }
}
