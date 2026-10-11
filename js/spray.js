// TAGTOWN spray mode: first-person painting on any wall.
// Walls are canvas textures (see world.js) — paint is drawn at the raycast UV
// so it sticks to the surface permanently.
import * as THREE from 'three';
import { clamp, settings } from './util.js';

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const PALETTE = ['#e63946', '#f4842c', '#ffd23f', '#43c465', '#3a86ff', '#9b5de5', '#222222', '#ffffff'];

class SprayParticles {
  constructor(scene) {
    this.N = 120;
    this.pos = new Float32Array(this.N * 3);
    this.col = new Float32Array(this.N * 3);
    this.vel = new Float32Array(this.N * 3);
    this.life = new Float32Array(this.N);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    // soft round sprite so mist reads as spray, not squares
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    const sprite = new THREE.CanvasTexture(c);
    this.mat = new THREE.PointsMaterial({ size: 0.16, map: sprite, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    this.head = 0;
    scene.add(this.points);
    this._c = new THREE.Color();
  }
  emit(origin, dir, colorHex, n = 6, spread = 0.35, speed = 4) {
    this._c.set(colorHex);
    for (let i = 0; i < n; i++) {
      const k = this.head; this.head = (this.head + 1) % this.N;
      this.pos[k * 3] = origin.x; this.pos[k * 3 + 1] = origin.y; this.pos[k * 3 + 2] = origin.z;
      this.vel[k * 3] = dir.x * speed + (Math.random() - 0.5) * spread * 4;
      this.vel[k * 3 + 1] = dir.y * speed + (Math.random() - 0.5) * spread * 4;
      this.vel[k * 3 + 2] = dir.z * speed + (Math.random() - 0.5) * spread * 4;
      this.col[k * 3] = this._c.r; this.col[k * 3 + 1] = this._c.g; this.col[k * 3 + 2] = this._c.b;
      this.life[k] = 0.5 + Math.random() * 0.3;
    }
  }
  update(dt) {
    for (let k = 0; k < this.N; k++) {
      if (this.life[k] <= 0) { this.pos[k * 3 + 1] = -100; continue; }
      this.life[k] -= dt;
      this.pos[k * 3] += this.vel[k * 3] * dt;
      this.pos[k * 3 + 1] += this.vel[k * 3 + 1] * dt;
      this.pos[k * 3 + 2] += this.vel[k * 3 + 2] * dt;
      this.vel[k * 3 + 1] -= 3 * dt;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}

export class SprayMode {
  constructor(scene, camera, world, player) {
    this.scene = scene; this.camera = camera; this.world = world; this.player = player;
    this.active = false;
    this.yaw = 0; this.pitch = 0;
    this.spraying = false;
    this.color = settings.color || PALETTE[0];
    this.paint = 100;   // normal mode meter
    this.ray = new THREE.Raycaster();
    this.ray.far = 14;
    this.particles = new SprayParticles(scene);
    this._v1 = new THREE.Vector3(); this._v2 = new THREE.Vector3(); this._v3 = new THREE.Vector3();
    this._hitP = new THREE.Vector3();

    // spray can attached to camera (first-person view)
    this.can = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: this.color });
    this.canBodyMat = bodyMat;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.2, 14), bodyMat);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.045, 14),
      new THREE.MeshLambertMaterial({ color: 0xdddddd }));
    cap.position.y = 0.12;
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 8),
      new THREE.MeshLambertMaterial({ color: 0x333333 }));
    nozzle.position.y = 0.155;
    this.can.add(body, cap, nozzle);
    this.can.position.set(0.3, -0.26, -0.55);
    this.can.rotation.set(-0.25, -0.15, 0.08);
    this.can.visible = false;
    camera.add(this.can);
    this.nozzleTip = new THREE.Object3D();
    this.nozzleTip.position.set(0, 0.17, 0);
    this.can.add(this.nozzleTip);
    this.bob = 0;
  }
  setColor(hex) {
    this.color = hex; settings.color = hex;
    this.canBodyMat.color.set(hex);
  }
  get infinite() { return settings.difficulty === 'easy'; }

  enter() {
    this.active = true;
    // camera looks along -z; the toon's face is modeled on +z, so add PI
    // to look the way the character is facing
    this.yaw = this.player.yaw + Math.PI; this.pitch = -0.02;
    this.player.group.visible = false;
    this.can.visible = true;
    document.getElementById('crosshair').style.display = 'block';
    document.getElementById('palette').classList.add('show');
    document.getElementById('btnHoldSpray').classList.add('show');
    document.getElementById('btnSpray').classList.add('active');
    document.getElementById('btnExitSpray').style.display = 'flex';
    document.getElementById('btnJump').style.display = 'none';
    document.getElementById('btnSkate').style.display = 'none';
    document.getElementById('joy').style.display = 'none';
  }
  exit() {
    this.active = false; this.spraying = false;
    this.player.group.visible = true;
    this.can.visible = false;
    document.getElementById('crosshair').style.display = 'none';
    document.getElementById('palette').classList.remove('show');
    document.getElementById('btnHoldSpray').classList.remove('show');
    document.getElementById('btnSpray').classList.remove('active');
    document.getElementById('btnExitSpray').style.display = 'none';
    document.getElementById('btnJump').style.display = 'flex';
    document.getElementById('btnSkate').style.display = 'flex';
    document.getElementById('joy').style.display = 'block';
  }
  addLook(dx, dy) {
    this.yaw -= dx * 0.0042;
    this.pitch = clamp(this.pitch - dy * 0.0038, -1.1, 1.1);
  }

  paintAt(surf, uv, dist) {
    const { canvas, ctx, tex, wM, hM } = surf;
    const px = uv.x * canvas.width, py = (1 - uv.y) * canvas.height;
    const worldR = 0.2 + dist * 0.035;              // wider splat from farther away
    const rx = worldR * canvas.width / wM, ry = worldR * canvas.height / hM;
    const g = ctx.createRadialGradient(px, py, 0, px, py, rx);
    g.addColorStop(0, hexA(this.color, 1));
    g.addColorStop(0.72, hexA(this.color, 0.95));
    g.addColorStop(1, hexA(this.color, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    // toony splatter flecks
    ctx.fillStyle = hexA(this.color, 0.85);
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * Math.PI * 2, d = rx * (0.9 + Math.random() * 1.1);
      const r = 1 + Math.random() * rx * 0.12;
      ctx.beginPath();
      ctx.arc(px + Math.cos(a) * d, py + Math.sin(a) * d * (ry / rx), r, 0, Math.PI * 2);
      ctx.fill();
    }
    tex.needsUpdate = true;
  }

  refill() { this.paint = 100; }

  update(dt) {
    // camera sits at the head
    this.player.getHeadPos(this._v1);
    this.camera.position.copy(this._v1);
    this._v2.set(0, 0, -1).applyEuler(this.camera.rotation);
    const e = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(e);

    this.bob += dt * (this.spraying ? 26 : 3);
    this.can.position.y = -0.26 + Math.sin(this.bob) * (this.spraying ? 0.008 : 0.004);
    this.can.rotation.z = 0.08 + (this.spraying ? Math.sin(this.bob * 1.3) * 0.02 : 0);

    const canSpray = this.spraying && (this.infinite || this.paint > 0);
    if (canSpray) {
      if (!this.infinite) this.paint = Math.max(0, this.paint - dt * 26);
      this.ray.setFromCamera({ x: 0, y: 0 }, this.camera);
      const meshes = this.world.paintables.map(p => p.mesh);
      const hits = this.ray.intersectObjects(meshes, false);
      // nozzle world pos + forward dir for particles
      this.nozzleTip.getWorldPosition(this._v1);
      this.camera.getWorldDirection(this._v3);
      if (hits.length && hits[0].uv) {
        const h = hits[0];
        const surf = this.world.paintables.find(p => p.mesh === h.object);
        if (surf) {
          this.paintAt(surf, h.uv, h.distance);
          this._hitP.copy(h.point);
          const dir = this._v2.copy(this._hitP).sub(this._v1).normalize();
          this.particles.emit(this._v1, dir, this.color, 5, 0.3, h.distance * 1.6);
          // a few bounce-back flecks at the wall
          this.particles.emit(this._hitP, this._v3.clone().negate(), this.color, 2, 1.4, 1.2);
        }
      } else {
        // spraying into the air — mist drifts forward
        this.particles.emit(this._v1, this._v3, this.color, 4, 0.5, 3);
      }
    }
    this.particles.update(dt);
    return canSpray;
  }
}

export { PALETTE };
