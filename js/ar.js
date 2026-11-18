// AR режимі: WebXR қолдаса — нақты AR, қолдамаса — камера фоны
export class ARMode {
  constructor(viewer, { stage, video, button, onMessage }) {
    this.viewer = viewer;
    this.stage = stage;
    this.video = video;
    this.button = button;
    this.onMessage = onMessage || (() => {});
    this.mode = null; // "xr" | "camera" | null
    this.session = null;
    this.stream = null;
    this._saved = null;
  }

  get active() {
    return this.mode !== null;
  }

  async supportsXR() {
    try {
      return !!(navigator.xr && (await navigator.xr.isSessionSupported("immersive-ar")));
    } catch {
      return false;
    }
  }

  async toggle() {
    if (this.active) {
      await this.stop();
      return;
    }
    if (!window.isSecureContext) {
      this.onMessage("AR режимі HTTPS арқылы ашылғанда ғана жұмыс істейді.");
      return;
    }
    if (await this.supportsXR()) {
      await this._startXR();
    } else {
      await this._startCamera();
    }
  }

  /* ---------------- WebXR ---------------- */
  async _startXR() {
    try {
      const session = await navigator.xr.requestSession("immersive-ar", {
        optionalFeatures: ["dom-overlay", "local-floor"],
        domOverlay: { root: document.body },
      });
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
      this.onMessage("Телефонды баяу жылжытып, фигураны айналып қара.");

      session.addEventListener("end", () => this._cleanupXR());
    } catch (err) {
      this.mode = null;
      this.onMessage("AR сеансын бастау мүмкін болмады: " + (err && err.message ? err.message : err));
      await this._startCamera();
    }
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
  }

  /* ---------------- Камера фоны ---------------- */
  async _startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.onMessage("Бұл құрылғыда камераға қол жеткізу мүмкін емес.");
      return;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
    } catch (err) {
      const name = err && err.name;
      this.onMessage(
        name === "NotAllowedError"
          ? "Камераға рұқсат берілмеді. Браузер баптауынан рұқсат беріп, қайта көр."
          : "Камераны қосу мүмкін болмады: " + (err && err.message ? err.message : err),
      );
      return;
    }
    this.video.srcObject = this.stream;
    this.video.hidden = false;
    await this.video.play().catch(() => {});
    this.stage.classList.add("ar-fallback");
    this.viewer.setBackgroundTransparent(true);
    this.mode = "camera";
    this._setLabel("Камерадан шығу");
    this.onMessage("Камера фоны қосылды. Фигураны саусақпен айналдыруға болады.");
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
      this.onMessage("");
    }
  }

  _setLabel(text) {
    if (this.button) this.button.textContent = text;
  }
}
