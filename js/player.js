// TAGTOWN player: WILLY — the purple one-eyed star of holowattstheartist's
// "thrumyeyez" animation. Built from primitives; the whole character lives in
// buildWilly() — movement/camera/animation rig stay untouched.
import * as THREE from 'three';
import { lerp, lerpAngle, clamp } from './util.js';

const PURPLE = 0xb14ac9, DARK_PURPLE = 0x8f36a8;

function buildWilly() {
  const g = new THREE.Group();
  const purple = new THREE.MeshLambertMaterial({ color: PURPLE });
  const darkPurple = new THREE.MeshLambertMaterial({ color: DARK_PURPLE });
  const blackM = new THREE.MeshLambertMaterial({ color: 0x161616 });
  const whiteM = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const pupilM = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const mouthM = new THREE.MeshLambertMaterial({ color: 0x3d0f2e });
  const tongueM = new THREE.MeshLambertMaterial({ color: 0xff8fa3 });

  // legs: thin purple stems + HUGE black clown shoes
  function leg(side) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.2, 0.78, 0);
    const legM = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.55, 10), darkPurple);
    legM.position.y = -0.28; legM.castShadow = true;
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), blackM);
    shoe.scale.set(0.85, 0.7, 1.5);          // oversized, pointing forward
    shoe.position.set(0, -0.62, 0.12); shoe.castShadow = true;
    hip.add(legM, shoe);
    return hip;
  }
  const hipL = leg(-1), hipR = leg(1);

  // body: big purple gumdrop
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.58, 22, 18), purple);
  belly.scale.set(1, 1.12, 0.92);
  belly.position.y = 1.32; belly.castShadow = true;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.35, 14), purple);  // the little point on top
  tip.position.y = 1.95; tip.castShadow = true;

  // arms: thin, mitten hands
  function arm(side) {
    const sh = new THREE.Group();
    sh.position.set(side * 0.58, 1.5, 0);
    const a = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.5, 10), darkPurple);
    a.position.y = -0.26; a.castShadow = true;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), purple);
    hand.scale.set(1, 1.25, 0.8); hand.position.y = -0.56; hand.castShadow = true;
    sh.add(a, hand);
    return sh;
  }
  const shL = arm(-1), shR = arm(1);
  shL.rotation.z = 0.25; shR.rotation.z = -0.25;

  // face (rides the head-turn anim): one big eye, buck teeth, tongue out
  const headG = new THREE.Group(); headG.position.y = 1.62;
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), whiteM);
  eye.scale.set(1.25, 0.85, 0.6); eye.position.set(0, 0.12, 0.42);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), pupilM);
  pupil.position.set(0, 0.12, 0.52);
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), mouthM);
  mouth.scale.set(1.15, 1.0, 0.55); mouth.position.set(0, -0.18, 0.38);
  const toothGeo = new THREE.BoxGeometry(0.09, 0.09, 0.05);
  const t1 = new THREE.Mesh(toothGeo, whiteM); t1.position.set(-0.05, -0.06, 0.47);
  const t2 = new THREE.Mesh(toothGeo, whiteM); t2.position.set(0.05, -0.06, 0.47);
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), tongueM);
  tongue.scale.set(1.1, 0.45, 0.8); tongue.position.set(0, -0.3, 0.44);
  headG.add(eye, pupil, mouth, t1, t2, tongue);

  g.add(hipL, hipR, belly, tip, shL, shR, headG);
  return { group: g, hipL, hipR, shL, shR, headG, belly, bellyY: 1.32, hipY: 0.78 };
}

export class Player {
  constructor(scene) {
    const t = buildWilly();
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

  // Horizontal move + collide. refYaw = the camera yaw the stick is relative to.
  // right vector = (-fz, fx) — the old (-c, s) was mirrored (fixed).
  moveStep(ix, iz, refYaw, dt, world, speedScale = 1) {
    const mag = Math.min(1, Math.hypot(ix, iz));
    const s = Math.sin(refYaw), c = Math.cos(refYaw);
    // input (0,-1) = forward; rotate by refYaw
    let mx = 0, mz = 0;
    if (mag > 0.01) {
      const fx = -s, fz = -c;          // camera forward on ground
      const rx = c, rz = -s;           // camera right
      mx = (rx * ix + fx * -iz) * mag;
      mz = (rz * ix + fz * -iz) * mag;
      const targetYaw = Math.atan2(mx, mz);
      this.yaw = lerpAngle(this.yaw, targetYaw, Math.min(1, dt * 12));
    }
    const spd = this.speed * speedScale * (mag > 0.92 ? 1 : 0.87 * mag);
    this.pos.x += mx * spd * dt;
    this.pos.z += mz * spd * dt;

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
    return mag;
  }

  update(dt, world) {
    const mag = this.moveStep(this.input.x, this.input.z, this.camYaw, dt, world);

    // gravity / jump
    this.vy -= 15 * dt;
    this.pos.y += this.vy * dt;
    if (this.pos.y <= 0) { this.pos.y = 0; this.vy = 0; this.grounded = true; }

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
    this.parts.hipL.position.y = this.parts.hipY + rb * 0.16;  // feet up on the deck
    this.parts.hipR.position.y = this.parts.hipY + rb * 0.16;
    this.parts.belly.position.y = this.parts.bellyY + Math.abs(Math.sin(this.walkPhase)) * 0.05 * this.moveAmt;
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
