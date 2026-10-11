// TAGTOWN player: a dummy Homer-style toon built from primitives.
// NOTE (future): the whole character lives in buildToon() — swap this one
// function to drop in the new main character later; movement/camera stay.
import * as THREE from 'three';
import { lerp, lerpAngle, clamp } from './util.js';

const SKIN = 0xfed41d, SHIRT = 0xf5f5f5, PANTS = 0x3a6fd8, SHOE = 0x6b4a2f;

function limb(mat, r, len) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.85, len, 10), mat);
  m.castShadow = true;
  return m;
}

function buildToon() {
  const g = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: SKIN });
  const shirt = new THREE.MeshLambertMaterial({ color: SHIRT });
  const pants = new THREE.MeshLambertMaterial({ color: PANTS });
  const shoeM = new THREE.MeshLambertMaterial({ color: SHOE });

  // legs + shoes
  const legL = limb(pants, 0.13, 0.55), legR = limb(pants, 0.13, 0.55);
  legL.position.set(-0.16, 0.42, 0); legR.position.set(0.16, 0.42, 0);
  const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.42), shoeM);
  shoeL.position.set(-0.16, 0.08, 0.06); shoeL.castShadow = true;
  const shoeR = shoeL.clone(); shoeR.position.x = 0.16;
  // pivot groups so limbs swing from the hip/shoulder
  const hipL = new THREE.Group(), hipR = new THREE.Group();
  hipL.position.set(-0.16, 0.72, 0); hipR.position.set(0.16, 0.72, 0);
  legL.position.set(0, -0.3, 0); legR.position.set(0, -0.3, 0);
  shoeL.position.set(0, -0.62, 0.08); shoeR.position.set(0, -0.62, 0.08);
  hipL.add(legL, shoeL); hipR.add(legR, shoeR);

  // round belly body
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.46, 18, 14), shirt);
  belly.scale.set(1, 0.95, 0.9); belly.position.y = 1.05; belly.castShadow = true;

  // arms
  const armL = limb(skin, 0.1, 0.5), armR = limb(skin, 0.1, 0.5);
  const shL = new THREE.Group(), shR = new THREE.Group();
  shL.position.set(-0.52, 1.32, 0); shR.position.set(0.52, 1.32, 0);
  armL.position.set(0, -0.28, 0); armR.position.set(0, -0.28, 0);
  const handL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), skin);
  handL.position.set(0, -0.56, 0);
  const handR = handL.clone();
  shL.add(armL, handL); shR.add(armR, handR);
  shL.rotation.z = 0.18; shR.rotation.z = -0.18;

  // head
  const headG = new THREE.Group(); headG.position.y = 1.78;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 16), skin);
  head.castShadow = true; headG.add(head);
  // eyes
  const eyeW = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const pupM = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.105, 12, 10), eyeW);
    eye.position.set(sx * 0.13, 0.06, 0.3); eye.scale.z = 0.7; headG.add(eye);
    const pup = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), pupM);
    pup.position.set(sx * 0.13, 0.06, 0.375); headG.add(pup);
  }
  // ears + mouth + the two hairs
  for (const sx of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), skin);
    ear.position.set(sx * 0.35, -0.02, 0.02); headG.add(ear);
  }
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.045, 0.03),
    new THREE.MeshLambertMaterial({ color: 0x8a4a2a }));
  mouth.position.set(0, -0.16, 0.33); headG.add(mouth);
  for (const [hx, hz] of [[-0.05, 0], [0.06, 0.02]]) {
    const hair = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6), pupM);
    hair.position.set(hx, 0.42, hz); hair.rotation.z = hx * 4; headG.add(hair);
  }

  g.add(hipL, hipR, belly, shL, shR, headG);
  return { group: g, hipL, hipR, shL, shR, headG, belly };
}

export class Player {
  constructor(scene) {
    const t = buildToon();
    this.group = t.group; this.parts = t;
    this.group.position.set(0, 0, 6);
    scene.add(this.group);

    this.pos = this.group.position;
    this.vel = new THREE.Vector3();
    this.vy = 0; this.grounded = true;
    this.yaw = Math.PI;           // facing -z (toward building)
    this.baseSpeed = 6.2;
    this.skateSpeed = 10.8;
    this.speed = this.baseSpeed;
    this.riding = false;

    // skateboard (hidden until riding) — Skate-4-style cruise for the sandbox
    this.board = new THREE.Group();
    const deckMat = new THREE.MeshLambertMaterial({ color: 0x2b2b3a });
    const topMat = new THREE.MeshLambertMaterial({ color: 0x44445a });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 1.0), deckMat);
    deck.position.y = 0.14; deck.castShadow = true;
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.94), topMat);
    grip.position.y = 0.175;
    this.board.add(deck, grip);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0xffd23f });
    const wheelGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.05, 10);
    for (const [wx, wz] of [[-0.14, 0.36], [0.14, 0.36], [-0.14, -0.36], [0.14, -0.36]]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.055, wz);
      this.board.add(w);
    }
    // board faces the way the toon faces (deck long axis = forward)
    this.board.position.set(0, 0, 0.02);
    this.board.visible = false;
    this.group.add(this.board);
    this._lastYaw = this.yaw;
    this.input = { x: 0, z: 0 };  // -1..1
    this.walkPhase = 0;
    this.moveAmt = 0;

    // third-person orbit
    this.camYaw = 0; this.camPitch = 0.32;
    this.camDist = 8.2;
    this._camTarget = new THREE.Vector3();
  }
  setInput(x, z) { this.input.x = x; this.input.z = z; }
  toggleRide() {
    this.riding = !this.riding;
    this.board.visible = this.riding;
    this.speed = this.riding ? this.skateSpeed : this.baseSpeed;
    return this.riding;
  }
  addLook(dx, dy) {
    this.camYaw -= dx * 0.0052;
    this.camPitch = clamp(this.camPitch + dy * 0.004, -0.15, 1.05);
  }
  jump() { if (this.grounded) { this.vy = this.riding ? 7.2 : 5.4; this.grounded = false; } }

  getHeadPos(out) {
    return out.set(this.pos.x, this.pos.y + 1.78, this.pos.z);
  }

  update(dt, world) {
    // camera-relative move dir
    const ix = this.input.x, iz = this.input.z;
    const mag = Math.min(1, Math.hypot(ix, iz));
    const s = Math.sin(this.camYaw), c = Math.cos(this.camYaw);
    // input (0,-1) = forward; rotate by camYaw
    let mx = 0, mz = 0;
    if (mag > 0.01) {
      const fx = -s, fz = -c;          // camera forward on ground
      const rx = -c, rz = s;           // camera right
      mx = (rx * ix + fx * -iz) * mag;
      mz = (rz * ix + fz * -iz) * mag;
      const targetYaw = Math.atan2(mx, mz);
      this.yaw = lerpAngle(this.yaw, targetYaw, Math.min(1, dt * 12));
    }
    const spd = this.speed * (mag > 0.92 ? 1 : 0.62 * mag + 0.25 * mag);
    this.pos.x += mx * spd * dt;
    this.pos.z += mz * spd * dt;

    // gravity / jump
    this.vy -= 15 * dt;
    this.pos.y += this.vy * dt;
    if (this.pos.y <= 0) { this.pos.y = 0; this.vy = 0; this.grounded = true; }

    // collisions: fence clamp
    const B = world.BOUND;
    this.pos.x = clamp(this.pos.x, -B, B);
    this.pos.z = clamp(this.pos.z, -B, B);
    // box + circle colliders: push out
    for (const col of world.colliders) {
      if (col.r !== undefined) {
        const dx = this.pos.x - col.x, dz = this.pos.z - col.z;
        const d = Math.hypot(dx, dz), min = col.r + 0.42;
        if (d < min && d > 0.0001) {
          this.pos.x = col.x + (dx / d) * min;
          this.pos.z = col.z + (dz / d) * min;
        }
      } else {
        const px = clamp(this.pos.x, col.minX, col.maxX);
        const pz = clamp(this.pos.z, col.minZ, col.maxZ);
        const dx = this.pos.x - px, dz = this.pos.z - pz;
        const d = Math.hypot(dx, dz);
        if (d < 0.42) {
          if (d > 0.0001) { this.pos.x = px + (dx / d) * 0.42; this.pos.z = pz + (dz / d) * 0.42; }
          else {
            // inside the box: push out along smallest penetration axis
            const pens = [this.pos.x - col.minX, col.maxX - this.pos.x, this.pos.z - col.minZ, col.maxZ - this.pos.z];
            const m = Math.min(...pens);
            if (m === pens[0]) this.pos.x = col.minX - 0.42;
            else if (m === pens[1]) this.pos.x = col.maxX + 0.42;
            else if (m === pens[2]) this.pos.z = col.minZ - 0.42;
            else this.pos.z = col.maxZ + 0.42;
          }
        }
      }
    }

    this.group.rotation.y = this.yaw;

    // skateboard lean + cruise pose
    this._rideBlend = lerp(this._rideBlend || 0, this.riding ? 1 : 0, Math.min(1, dt * 8));
    const yawRate = dt > 0 ? (this.yaw - this._lastYaw) / dt : 0;
    this._lastYaw = this.yaw;
    this._lean = lerp(this._lean || 0, clamp(-yawRate * 0.22, -0.45, 0.45), Math.min(1, dt * 10));
    this.board.rotation.z = this._lean;
    const rb = this._rideBlend;

    // walk cycle (blends into a knees-bent cruise stance while riding)
    this.moveAmt = lerp(this.moveAmt, mag, Math.min(1, dt * 10));
    this.walkPhase += dt * (4 + 9 * this.moveAmt) * (this.moveAmt > 0.05 ? 1 : 0);
    const sw = Math.sin(this.walkPhase) * 0.62 * this.moveAmt * (1 - rb * 0.85);
    this.parts.hipL.rotation.x = sw - rb * 0.42;
    this.parts.hipR.rotation.x = -sw - rb * 0.42;
    this.parts.shL.rotation.x = -sw * 0.8;
    this.parts.shR.rotation.x = sw * 0.8;
    this.parts.shL.rotation.z = 0.18 + rb * 0.95;   // arms out for balance
    this.parts.shR.rotation.z = -0.18 - rb * 0.95;
    this.parts.hipL.position.y = 0.72 + rb * 0.16;  // feet up on the deck
    this.parts.hipR.position.y = 0.72 + rb * 0.16;
    this.parts.belly.position.y = 1.05 + Math.abs(Math.sin(this.walkPhase)) * 0.05 * this.moveAmt;
    this.parts.headG.rotation.y = Math.sin(this.walkPhase * 0.5) * 0.08 * this.moveAmt;
  }

  // third-person camera placement (called when not in spray mode)
  placeCamera(camera, dt) {
    const ty = this.pos.y + 1.7;
    this._camTarget.set(
      this.pos.x + Math.sin(this.camYaw) * Math.cos(this.camPitch) * this.camDist,
      ty + Math.sin(this.camPitch) * this.camDist,
      this.pos.z + Math.cos(this.camYaw) * Math.cos(this.camPitch) * this.camDist
    );
    const k = Math.min(1, dt * 14);
    camera.position.lerp(this._camTarget, k);
    camera.lookAt(this.pos.x, ty - 0.3, this.pos.z);
  }
}
