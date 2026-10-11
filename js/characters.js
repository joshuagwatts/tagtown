// TAGTOWN characters — swappable protagonist builds.
// Every builder returns the same rig: { group, hipL, hipR, shL, shR, headG,
// belly, bellyY, hipY, armZ, headY }. Add a new build function + registry
// entry and it plugs into movement, skate, spray and animation untouched.
import * as THREE from 'three';

const SKIN = 0xfed41d, SHIRT = 0xf5f5f5, PANTS = 0x3a6fd8, SHOE = 0x6b4a2f;

function limb(mat, r, len) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.85, len, 10), mat);
  m.castShadow = true;
  return m;
}

function buildHomer() {
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
  return { group: g, hipL, hipR, shL, shR, headG, belly, bellyY: 1.05, hipY: 0.72, armZ: 0.18, headY: 1.78 };
}


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
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), blackM);
    shoe.scale.set(0.85, 0.7, 1.55);         // huge clown shoes, pointing forward
    shoe.position.set(0, -0.62, 0.12); shoe.castShadow = true;
    hip.add(legM, shoe);
    return hip;
  }
  const hipL = leg(-1), hipR = leg(1);

  // body: big purple gumdrop
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.58, 22, 18), purple);
  belly.scale.set(1.06, 1.08, 0.95);
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
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), whiteM);
  eye.scale.set(1.25, 0.85, 0.6); eye.position.set(0, 0.14, 0.44);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), pupilM);
  pupil.position.set(0, 0.14, 0.54);
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), mouthM);
  mouth.scale.set(1.2, 1.05, 0.55); mouth.position.set(0, -0.2, 0.4);
  const toothGeo = new THREE.BoxGeometry(0.11, 0.11, 0.05);
  const t1 = new THREE.Mesh(toothGeo, whiteM); t1.position.set(-0.06, -0.08, 0.5);
  const t2 = new THREE.Mesh(toothGeo, whiteM); t2.position.set(0.06, -0.08, 0.5);
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), tongueM);
  tongue.scale.set(1.25, 0.5, 0.8); tongue.position.set(0, -0.33, 0.46);
  headG.add(eye, pupil, mouth, t1, t2, tongue);

  g.add(hipL, hipR, belly, tip, shL, shR, headG);
  return { group: g, hipL, hipR, shL, shR, headG, belly, bellyY: 1.32, hipY: 0.78, armZ: 0.25, headY: 1.7 };
}


// NOTE: Joshua has a real 3D Willy model coming. When it lands, add a
// buildWillyHD() here that loads the GLB (vendor GLTFLoader alongside
// three.module.js) and maps its nodes onto the same rig fields
// (hipL/hipR/shL/shR/headG/belly + bellyY/hipY/armZ/headY).
export const CHARACTERS = {
  willy: { name: 'Willy', tag: 'prototype', build: buildWilly },
  homer: { name: 'Homer (dummy)', tag: 'prototype', build: buildHomer },
};
