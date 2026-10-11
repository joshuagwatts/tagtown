// TAGTOWN UI/input: virtual joystick, drag-look, buttons, palette, settings.
import { settings, saveSettings, toast } from './util.js';
import { PALETTE } from './spray.js';

export class UI {
  constructor(hooks) {
    this.hooks = hooks;               // {onJump,onToggleSpray,onExitSpray,onHoldSpray(down),onLook,onColor,onSettings}
    this.joy = { x: 0, z: 0 };
    this.keys = {};
    this._joyId = null; this._lookId = null; this._sprayTouchId = null;
    this._joyCX = 0; this._joyCY = 0;
    this._lastLX = 0; this._lastLY = 0;
    this._mouseLook = false; this._mlx = 0; this._mly = 0;

    const $ = id => document.getElementById(id);
    this.joyZone = $('joy'); this.joyBase = $('joyBase'); this.joyKnob = $('joyKnob');
    this.paintPct = $('paintPct'); this.paintBar = $('paintBar');

    this.bindTouch();
    this.bindMouse();
    this.bindKeys();
    this.bindButtons();
    this.buildPalette();
    this.bindSettings();
    this.refreshSettingsUI();
    this.applyHandedness();
  }

  applyHandedness() {
    document.body.classList.toggle('lefty', settings.handed === 'left');
  }
  inLookZone(x) {
    // right-handed: look on the right; left-handed: look on the left
    return settings.handed === 'left'
      ? x < window.innerWidth * 0.58
      : x > window.innerWidth * 0.42;
  }

  // ---------- touch ----------
  bindTouch() {
    const jz = this.joyZone;
    jz.addEventListener('touchstart', e => {
      e.preventDefault();
      if (this._joyId !== null) return;
      const t = e.changedTouches[0];
      this._joyId = t.identifier;
      this._joyCX = t.clientX; this._joyCY = t.clientY;
      this.joyBase.style.display = this.joyKnob.style.display = 'block';
      this.joyBase.style.left = (t.clientX - 55) + 'px';
      this.joyBase.style.top = (t.clientY - 55) + 'px';
      this.joyKnob.style.left = (t.clientX - 26) + 'px';
      this.joyKnob.style.top = (t.clientY - 26) + 'px';
    }, { passive: false });
    const move = e => {
      for (const t of e.changedTouches) {
        if (t.identifier === this._joyId) {
          let dx = t.clientX - this._joyCX, dy = t.clientY - this._joyCY;
          const d = Math.hypot(dx, dy), max = 52;
          if (d > max) { dx = dx / d * max; dy = dy / d * max; }
          this.joy.x = dx / max; this.joy.z = dy / max;
          this.joyKnob.style.left = (this._joyCX + dx - 26) + 'px';
          this.joyKnob.style.top = (this._joyCY + dy - 26) + 'px';
        } else if (t.identifier === this._lookId) {
          this.hooks.onLook(t.clientX - this._lastLX, t.clientY - this._lastLY);
          this._lastLX = t.clientX; this._lastLY = t.clientY;
        }
      }
      if (e.cancelable) e.preventDefault();
    };
    const end = e => {
      for (const t of e.changedTouches) {
        if (t.identifier === this._joyId) {
          this._joyId = null; this.joy.x = this.joy.z = 0;
          this.joyBase.style.display = this.joyKnob.style.display = 'none';
        }
        if (t.identifier === this._lookId) this._lookId = null;
        if (t.identifier === this._sprayTouchId) {
          this._sprayTouchId = null;
          this.hooks.onHoldSpray(false);
        }
      }
    };
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('touchend', end);
    document.addEventListener('touchcancel', end);
    // look-drag starts on the 3D view (not on HUD buttons).
    // spray mode: first finger aims, ANY second finger on the view sprays —
    // no more reaching for a corner button while aiming.
    document.getElementById('game').addEventListener('touchstart', e => {
      for (const t of e.changedTouches) {
        if (this.hooks.sprayActive()) {
          if (this._lookId === null && this.inLookZone(t.clientX)) {
            this._lookId = t.identifier;
            this._lastLX = t.clientX; this._lastLY = t.clientY;
          } else if (this._sprayTouchId === null) {
            this._sprayTouchId = t.identifier;
            this.hooks.onHoldSpray(true);
          }
        } else if (this._lookId === null && this.inLookZone(t.clientX)) {
          this._lookId = t.identifier;
          this._lastLX = t.clientX; this._lastLY = t.clientY;
        }
      }
    }, { passive: true });
  }

  // ---------- mouse (desktop) ----------
  bindMouse() {
    const cv = document.querySelector('#game canvas');
    const start = () => {};
    document.getElementById('game').addEventListener('mousedown', e => {
      this._mouseLook = true; this._mlx = e.clientX; this._mly = e.clientY;
      if (this.hooks.sprayActive()) this.hooks.onHoldSpray(true);
    });
    document.addEventListener('mousemove', e => {
      if (!this._mouseLook) return;
      this.hooks.onLook(e.clientX - this._mlx, e.clientY - this._mly);
      this._mlx = e.clientX; this._mly = e.clientY;
    });
    document.addEventListener('mouseup', () => {
      this._mouseLook = false;
      this.hooks.onHoldSpray(false);
    });
    document.addEventListener('contextmenu', e => e.preventDefault());
  }

  // ---------- keyboard ----------
  bindKeys() {
    document.addEventListener('keydown', e => {
      if (e.repeat) return;
      this.keys[e.code] = true;
      if (e.code === 'Space') { this.hooks.onJump(); e.preventDefault(); }
      if (e.code === 'KeyF') this.hooks.onToggleSpray();
      if (e.code === 'KeyR') this.hooks.onToggleRide();
      const n = parseInt(e.key);
      if (n >= 1 && n <= PALETTE.length) this.hooks.onColor(PALETTE[n - 1]);
    });
    document.addEventListener('keyup', e => { this.keys[e.code] = false; });
  }
  keyInput() {
    let x = 0, z = 0;
    const k = this.keys;
    if (k['KeyW'] || k['ArrowUp']) z -= 1;
    if (k['KeyS'] || k['ArrowDown']) z += 1;
    if (k['KeyA'] || k['ArrowLeft']) x -= 1;
    if (k['KeyD'] || k['ArrowRight']) x += 1;
    return { x, z };
  }

  // ---------- buttons ----------
  press(el, down, up) {
    el.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); down(); }, { passive: false });
    if (up) {
      el.addEventListener('touchend', e => { e.preventDefault(); up(); });
      el.addEventListener('touchcancel', () => up());
    }
    el.addEventListener('mousedown', e => { e.stopPropagation(); down(); });
    if (up) el.addEventListener('mouseup', up);
  }
  bindButtons() {
    const $ = id => document.getElementById(id);
    this.press($('btnJump'), () => this.hooks.onJump());
    this.press($('btnSkate'), () => this.hooks.onToggleRide());
    this.press($('btnSpray'), () => this.hooks.onToggleSpray());
    this.press($('btnExitSpray'), () => this.hooks.onExitSpray());
    this.press($('btnHoldSpray'), () => this.hooks.onHoldSpray(true), () => this.hooks.onHoldSpray(false));
    this.press($('btnGear'), () => $('settingsPanel').classList.add('show'));
    this.press($('btnCloseSettings'), () => $('settingsPanel').classList.remove('show'));
  }

  // ---------- palette ----------
  buildPalette() {
    const pal = document.getElementById('palette');
    pal.innerHTML = '';
    this.swatches = [];
    PALETTE.forEach(hex => {
      const d = document.createElement('div');
      d.className = 'swatch' + (hex === settings.color ? ' sel' : '');
      d.style.background = hex;
      const pick = e => { e.preventDefault(); e.stopPropagation(); this.hooks.onColor(hex); };
      d.addEventListener('touchstart', pick, { passive: false });
      d.addEventListener('mousedown', e => { e.stopPropagation(); this.hooks.onColor(hex); });
      pal.appendChild(d);
      this.swatches.push({ hex, el: d });
    });
  }
  markColor(hex) {
    for (const s of this.swatches) s.el.classList.toggle('sel', s.hex === hex);
  }

  // ---------- settings ----------
  bindSettings() {
    const seg = (id, key) => {
      document.getElementById(id).addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        settings[key] = b.dataset.v; saveSettings();
        this.refreshSettingsUI();
        this.hooks.onSettings(key);
        toast(key === 'difficulty'
          ? (settings.difficulty === 'easy' ? '😌 Easy: infinite paint' : '🎯 Normal: paint runs out — refill at the can by the door')
          : key === 'handed'
            ? (settings.handed === 'left' ? '👈 Left-handed controls' : '👉 Right-handed controls')
            : ('Quality: ' + settings.quality));
      });
    };
    seg('segDiff', 'difficulty'); seg('segQual', 'quality'); seg('segHand', 'handed');
  }
  refreshSettingsUI() {
    for (const [id, key] of [['segDiff', 'difficulty'], ['segQual', 'quality'], ['segHand', 'handed']]) {
      document.getElementById(id).querySelectorAll('button').forEach(b =>
        b.classList.toggle('sel', b.dataset.v === settings[key]));
    }
    document.getElementById('btnGear').style.display = 'flex';
  }

  // ---------- HUD ----------
  setPaint(pct, infinite) {
    this.paintPct.textContent = infinite ? '∞' : Math.ceil(pct) + '%';
    this.paintBar.style.width = (infinite ? 100 : pct) + '%';
  }
}
