// AR режимі: WebXR қолдаса — нақты AR, қолдамаса — камера фоны
//
// МАҢЫЗДЫ: requestSession("immersive-ar") пайдаланушының тікелей әрекетін
// (user activation) талап етеді. Түймені басқаннан кейін кез келген await
// сол әрекеттің «күшін» жоғалтады, сондықтан қолдауды алдын ала тексеріп
// қоямыз да, requestSession-ды түйме басылған сәтте бірден шақырамыз.
export class ARMode {
  constructor(viewer, { stage, video, button, onStatus }) {
    this.viewer = viewer;
    this.stage = stage;
    this.video = video;
    this.button = button;
    this.onStatus = onStatus || (() => {});
    this.mode = null; // "xr" | "camera" | null
    this.session = null;
    this.stream = null;
    this.xrSupported = false;
    this._saved = null;
  }

  get active() {
    return this.mode !== null;
  }

  /** Қосымша ашылғанда бір рет шақырылады */
  async init() {
    try {
      this.xrSupported = !!(
        navigator.xr && (await navigator.xr.isSessionSupported("immersive-ar"))
      );
    } catch {
      this.xrSupported = false;
    }
    return this.xrSupported;
  }

  /** Түйменің өңдеушісі — әдейі async емес */
  toggle() {
    if (this.active) {
      this.stop();
      return;
    }
    if (!window.isSecureContext) {
      this.onStatus("AR тек HTTPS арқылы ашылғанда жұмыс істейді.", "error");
      return;
    }
    if (this.xrSupported) {
      this._startXR();
    } else {
      this._startCamera();
      this.onStatus(
        "Бұл браузерде WebXR жоқ, сондықтан камера фоны қосылды: " +
        "фигура бөлмеге бекітілмейді, оны саусақпен айналдырасың.",
        "info",
      );
    }
  }

  /* ---------------- WebXR ---------------- */
  _startXR() {
    // requestSession бірінші шақырылады — алдында ешқандай await жоқ
    let request;
    try {
      request = navigator.xr.requestSession("immersive-ar", {
        optionalFeatures: ["dom-overlay", "local-floor", "hit-test"],
        domOverlay: { root: document.body },
      });
    } catch (err) {
      this._xrFailed(err);
      return;
    }

    this.onStatus("AR сеансы дайындалып жатыр…", "info");

    request.then(
      (session) => this._attachSession(session),
      (err) => this._xrFailed(err),
    );
  }

  async _attachSession(session) {
    try {
      this.session = session;
      this.mode = "xr";

      const r = this.viewer.renderer;
      r.xr.setReferenceSpaceType("local");
      await r.xr.setSession(session);
      this.viewer.setBackgroundTransparent(true);

      // мазмұнды AR тірегіне көшіріп, бөлмеге сыятындай кішірейтеміз
      const content = this.viewer.content;
      this._saved = {
        parent: content.parent,
        scale: content.scale.clone(),
        position: content.position.clone(),
      };
      this.viewer.arRoot.add(content);
      content.scale.setScalar(0.06);
      content.position.set(0, -0.15, -0.9);

      this._setLabel("AR режимінен шығу");
      this.onStatus("Телефонды баяу жылжытып, фигураны айналып қара.", "ok");

      session.addEventListener("end", () => this._cleanupXR());
    } catch (err) {
      this._cleanupXR();
      this._xrFailed(err);
    }
  }

  _xrFailed(err) {
    this.mode = null;
    const name = (err && err.name) || "";
    let text;
    if (name === "NotAllowedError" || name === "SecurityError") {
      text = "AR сеансына рұқсат берілмеді.";
    } else if (name === "NotSupportedError") {
      text = "Бұл құрылғы AR сеансын қолдамайды.";
    } else {
      text = "AR сеансын бастау мүмкін болмады" +
        (err && err.message ? ": " + err.message : ".");
    }
    this.onStatus(text + " Камера фонына ауысып жатырмыз…", "error");
    this._startCamera();
  }

  _cleanupXR() {
    const content = this.viewer.content;
    if (this._saved) {
      this._saved.parent.add(content);
      content.scale.copy(this._saved.scale);
      content.position.copy(this._saved.position);
      this._saved = null;
    }
    this.viewer.setBackgroundTransparent(false);
    this.viewer.resetView();
    this.session = null;
    this.mode = null;
    this._setLabel("AR режимі");
    this.onStatus("");
  }

  /* ---------------- Камера фоны ---------------- */
  async _startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.onStatus("Бұл браузерде камераға қол жеткізу мүмкін емес.", "error");
      return;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
    } catch (err) {
      const name = (err && err.name) || "";
      this.onStatus(
        name === "NotAllowedError"
          ? "Камераға рұқсат берілмеді. Браузер баптауынан рұқсат беріп, қайта көр."
          : name === "NotFoundError"
            ? "Құрылғыдан камера табылмады."
            : "Камераны қосу мүмкін болмады" + (err && err.message ? ": " + err.message : "."),
        "error",
      );
      return;
    }

    this.video.srcObject = this.stream;
    this.video.hidden = false;
    try {
      await this.video.play();
    } catch {
      this.onStatus("Бейнені іске қосу мүмкін болмады. Экранды бір рет басып көр.", "error");
    }

    this.stage.classList.add("ar-fallback");
    this.viewer.setBackgroundTransparent(true);
    this.mode = "camera";
    this._setLabel("Камерадан шығу");
  }

  async stop() {
    if (this.mode === "xr" && this.session) {
      await this.session.end().catch(() => {});
      return;
    }
    if (this.mode === "camera") {
      if (this.stream) {
        for (const track of this.stream.getTracks()) track.stop();
        this.stream = null;
      }
      this.video.srcObject = null;
      this.video.hidden = true;
      this.stage.classList.remove("ar-fallback");
      this.viewer.setBackgroundTransparent(false);
      this.mode = null;
      this._setLabel("AR режимі");
      this.onStatus("");
    }
  }

  _setLabel(text) {
    if (this.button) this.button.textContent = text;
  }
}
