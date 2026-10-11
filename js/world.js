// TAGTOWN world: toony chill zone — one building, fence border, paintable walls.
// Every paintable wall owns a canvas texture so spray paint persists on the surface.
import * as THREE from 'three';
import { settings } from './util.js';

function canvasTex(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { canvas, ctx, tex };
}

function lambert(color) {
  return new THREE.MeshLambertMaterial({ color });
}

export function buildWorld(scene) {
  const paintables = [];   // { mesh, canvas, ctx, tex, wM, hM }
  const colliders = [];    // {x,z,r} circles and {minX,maxX,minZ,maxZ} boxes
  const BOUND = 26.6;      // fence inner clamp

  // ---------- sky ----------
  {
    const { canvas, ctx, tex } = canvasTex(4, 256);
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#2f8fe0'); g.addColorStop(0.55, '#7ec8f7'); g.addColorStop(1, '#cfeeff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 256);
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(320, 24, 16),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false })
    );
    scene.add(sky);
  }
  scene.fog = new THREE.Fog(0xcfeeff, 70, 260);

  // ---------- lights ----------
  scene.add(new THREE.HemisphereLight(0xd8f0ff, 0x86c860, 0.95));
  const sun = new THREE.DirectionalLight(0xfff6e0, 1.7);
  sun.position.set(34, 52, 22);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -40; sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 40; sun.shadow.camera.bottom = -40;
  sun.shadow.camera.far = 140;
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  // ---------- ground ----------
  {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), lambert(0x82cf5e));
    g.rotation.x = -Math.PI / 2; g.receiveShadow = true;
    scene.add(g);
    // lighter inner lawn
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(56, 56), lambert(0x8fd96b));
    lawn.rotation.x = -Math.PI / 2; lawn.position.y = 0.01; lawn.receiveShadow = true;
    scene.add(lawn);
  }

  // ---------- clouds ----------
  const clouds = [];
  for (let i = 0; i < 6; i++) {
    const grp = new THREE.Group();
    const m = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
    for (let j = 0; j < 4; j++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(2.4 - j * 0.35, 12, 10), m);
      s.position.set(j * 2.6 - 3.5, (j % 2) * 0.8, (j % 3) * 1.2 - 1);
      s.scale.y = 0.62; grp.add(s);
    }
    grp.position.set((Math.random() - 0.5) * 220, 34 + Math.random() * 14, (Math.random() - 0.5) * 220);
    scene.add(grp); clouds.push(grp);
  }

  // ---------- the building (paintable walls) ----------
  const BW = 14, BH = 8, BD = 10, BZ = -10; // center z
  function wallCanvas(base, trim) {
    const { canvas, ctx, tex } = canvasTex(512, 512);
    ctx.fillStyle = base; ctx.fillRect(0, 0, 512, 512);
    // subtle toony brick lines
    ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 2;
    for (let y = 64; y < 512; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke(); }
    // baseboard trim
    ctx.fillStyle = trim; ctx.fillRect(0, 512 - 46, 512, 46);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, 512 - 46, 512, 8);
    return { canvas, ctx, tex };
  }
  const wallDefs = [
    { wM: BW, hM: BH }, { wM: BW, hM: BH },   // +x, -x
    { wM: BD, hM: BH }, { wM: BD, hM: BH },   // +z, -z
  ];
  const wallMats = wallDefs.map((d, i) => {
    const { canvas, ctx, tex } = wallCanvas('#f6e7c8', '#d94f3d');
    const mat = new THREE.MeshLambertMaterial({ map: tex });
    // box material slots: 0:+x 1:-x 2:+y 3:-y 4:+z 5:-z — record which slot
    // this canvas belongs to so spray paint lands on the face you aimed at
    paintables.push({ mesh: null, mat: [0, 1, 4, 5][i], canvas, ctx, tex, wM: d.wM, hM: d.hM });
    return mat;
  });
  const roofMat = lambert(0xc0392b), underMat = lambert(0x8a6a4a);
  const bldg = new THREE.Mesh(
    new THREE.BoxGeometry(BW, BH, BD),
    [wallMats[0], wallMats[1], roofMat, underMat, wallMats[2], wallMats[3]]
  );
  bldg.position.set(0, BH / 2, BZ);
  bldg.castShadow = bldg.receiveShadow = true;
  scene.add(bldg);
  // link paintables to this mesh (face order matches box material slots)
  paintables[0].mesh = bldg; paintables[1].mesh = bldg;
  paintables[2].mesh = bldg; paintables[3].mesh = bldg;
  colliders.push({ minX: -BW / 2, maxX: BW / 2, minZ: BZ - BD / 2, maxZ: BZ + BD / 2 });

  // gable roof (extruded triangle)
  {
    const shape = new THREE.Shape();
    shape.moveTo(-BW / 2 - 1, 0); shape.lineTo(BW / 2 + 1, 0); shape.lineTo(0, 4.2); shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: BD + 2, bevelEnabled: false });
    geo.translate(0, 0, -(BD + 2) / 2);
    const roof = new THREE.Mesh(geo, lambert(0xd94f3d));
    roof.position.set(0, BH, BZ); roof.castShadow = roof.receiveShadow = true;
    scene.add(roof);
    // gable end caps get the wall color
    const capMat = lambert(0xf6e7c8);
    const capGeo = new THREE.ShapeGeometry(shape);
    for (const z of [BZ - (BD + 2) / 2 - 0.01, BZ + (BD + 2) / 2 + 0.01]) {
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.set(0, BH, z); scene.add(cap);
    }
  }
  // door + windows (proud of walls, stay clean while you paint around them)
  {
    const frame = lambert(0x7a4a2b), glass = new THREE.MeshLambertMaterial({ color: 0x9fd8ef });
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3.1, 0.25), frame);
    door.position.set(2.4, 1.55, BZ + BD / 2 + 0.08); door.castShadow = true; scene.add(door);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), lambert(0xffd76a));
    knob.position.set(3.0, 1.5, BZ + BD / 2 + 0.25); scene.add(knob);
    const winAt = (x, y, z, ry) => {
      const grp = new THREE.Group();
      const f = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.7, 0.14), frame); grp.add(f);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 1.35), glass);
      gl.position.z = 0.08; grp.add(gl);
      const bar1 = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.09, 0.02), frame);
      bar1.position.z = 0.09; grp.add(bar1);
      const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.35, 0.02), frame);
      bar2.position.z = 0.09; grp.add(bar2);
      grp.position.set(x, y, z); grp.rotation.y = ry; scene.add(grp);
    };
    const fz = BZ + BD / 2 + 0.08;
    winAt(-3.4, 4.6, fz, 0); winAt(5.6, 4.6, fz, 0);
    winAt(-BW / 2 - 0.08, 4.6, BZ, -Math.PI / 2); winAt(BW / 2 + 0.08, 4.6, BZ, Math.PI / 2);
  }

  // ---------- fence (paintable inner faces) ----------
  const F = 28, FH = 2.4;
  function fenceRun(len, px, pz, ry, paintFaceIdx) {
    const { canvas, ctx, tex } = canvasTex(1024, 128);
    ctx.fillStyle = '#b9854d'; ctx.fillRect(0, 0, 1024, 128);
    ctx.strokeStyle = 'rgba(60,30,10,0.55)'; ctx.lineWidth = 3;
    for (let x = 0; x <= 1024; x += 42) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 128); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(0, 0, 1024, 14);
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(0, 114, 1024, 14);
    const wood = lambert(0xb9854d);
    const paintMat = new THREE.MeshLambertMaterial({ map: tex });
    const mats = [wood, wood, wood, wood, wood, wood];
    mats[paintFaceIdx] = paintMat;
    const run = new THREE.Mesh(new THREE.BoxGeometry(len, FH, 0.35), mats);
    run.position.set(px, FH / 2, pz); run.rotation.y = ry;
    run.castShadow = run.receiveShadow = true;
    scene.add(run);
    paintables.push({ mesh: run, mat: paintFaceIdx, canvas, ctx, tex, wM: len, hM: FH });
    // posts
    const postMat = lambert(0x8a5a2e);
    const n = Math.round(len / 4);
    for (let i = 0; i <= n; i++) {
      const t = -len / 2 + (len * i) / n;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.45, FH + 0.5, 0.45), postMat);
      post.position.set(px + (ry ? 0 : t), (FH + 0.5) / 2, pz + (ry ? t : 0));
      post.castShadow = true; scene.add(post);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), postMat);
      cap.position.set(post.position.x, FH + 0.5, post.position.z); scene.add(cap);
    }
  }
  // box faces: 0:+x 1:-x 2:+y 3:-y 4:+z 5:-z
  fenceRun(2 * F, 0, -F, 0, 4);   // north, inner face +z
  fenceRun(2 * F, 0, F, 0, 5);    // south, inner face -z
  fenceRun(2 * F, F, 0, Math.PI / 2, 1);  // east, inner face -x
  fenceRun(2 * F, -F, 0, Math.PI / 2, 0); // west, inner face +x

  // ---------- props ----------
  function tree(x, z, s = 1) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * s, 0.38 * s, 2.2 * s, 8), lambert(0x8a5a2e));
    trunk.position.y = 1.1 * s; trunk.castShadow = true; g.add(trunk);
    const greens = [0x4da53a, 0x5cbb47, 0x43a032];
    [[0, 3.1, 0, 1.7], [1.1, 2.5, 0.5, 1.2], [-1.0, 2.6, -0.4, 1.25]].forEach((p, i) => {
      const b = new THREE.Mesh(new THREE.SphereGeometry(p[3] * s, 12, 10), lambert(greens[i % 3]));
      b.position.set(p[0] * s, p[1] * s, p[2] * s); b.castShadow = true; g.add(b);
    });
    g.position.set(x, 0, z); scene.add(g);
    colliders.push({ x, z, r: 0.6 * s });
  }
  tree(-18, -2, 1.1); tree(18, 7, 1); tree(-14, 17, 0.9); tree(20, -18, 1.2); tree(-22, -13, 1);
  function lamp(x, z) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 4.4, 8), lambert(0x3a3a4a));
    pole.position.y = 2.2; pole.castShadow = true; g.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10),
      new THREE.MeshLambertMaterial({ color: 0xfff2b0, emissive: 0xffd76a, emissiveIntensity: 0.7 }));
    bulb.position.y = 4.6; g.add(bulb);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.8, 0.6, 10), lambert(0x3a3a4a));
    shade.position.y = 4.95; g.add(shade);
    g.position.set(x, 0, z); scene.add(g);
    colliders.push({ x, z, r: 0.35 });
  }
  lamp(-7, 9); lamp(11, -1);

  // ---------- paint pickup (normal mode refill) ----------
  const pickup = new THREE.Group();
  {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), lambert(0xa9743f));
    crate.position.y = 0.55; crate.castShadow = true; pickup.add(crate);
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.7, 14), lambert(0xe63946));
    can.position.y = 1.45; can.castShadow = true; pickup.add(can);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.12, 14), lambert(0xdddddd));
    lid.position.y = 1.85; pickup.add(lid);
    pickup.position.set(5.2, 0, -2.5);
    scene.add(pickup);
  }
  colliders.push({ x: 5.2, z: -2.5, r: 0.9 });

  let pickupTimer = 0;
  return {
    paintables, colliders, BOUND, pickup,
    setPickupVisible(v) { pickup.visible = v; if (v) pickupTimer = 0; },
    update(dt, t) {
      for (const c of clouds) { c.position.x += dt * 0.7; if (c.position.x > 130) c.position.x = -130; }
      if (pickup.visible) { pickup.rotation.y += dt * 1.4; pickup.position.y = Math.sin(t * 3) * 0.08; }
      else if (pickupTimer > 0) {
        pickupTimer -= dt;
        if (pickupTimer <= 0) pickup.visible = true;
      }
    },
    takePickup() { pickup.visible = false; pickupTimer = 12; },
  };
}
