// TAGTOWN player: movement, camera, collision, animation rig.
// The character model itself is swappable — see js/characters.js.
import * as THREE from 'three';
import { lerp, lerpAngle, clamp, settings } from './util.js';
import { CHARACTERS } from './characters.js';

export class Player {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.position.set(0, 0, 6);
    scene.add(this.group);
    this.toon = null;
    this.setCharacter(settings.character || 'willy');

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
  setCharacter(id) {
    if (!CHARACTERS[id]) id = 'willy';
    if (this.toon) this.group.remove(this.toon);
    const t = CHARACTERS[id].build();
    this.toon = t.group;
    this.parts = t;
    this.characterId = id;
    this.group.add(this.toon);
  }
  get characterName() { return CHARACTERS[this.characterId].name; }
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
    return out.set(this.pos.x, this.pos.y + this.parts.headY, this.pos.z);
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
    this.parts.shL.rotation.z = this.parts.armZ + rb * 0.95;   // arms out for balance
    this.parts.shR.rotation.z = -this.parts.armZ - rb * 0.95;
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
