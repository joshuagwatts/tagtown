// TAGTOWN v1 — toony spray-paint sandbox. Boot + main loop.
import * as THREE from 'three';
import { buildWorld } from './world.js';
import { Player } from './player.js';
import { SprayMode } from './spray.js';
import { UI } from './ui.js';
import { Net } from './net.js';
import { settings, toast } from './util.js';

const errBox = document.getElementById('err');
window.addEventListener('error', e => {
  errBox.style.display = 'block';
  errBox.textContent = 'Error: ' + (e.message || e.error) + '\n' + (e.filename || '') + ':' + (e.lineno || '');
});
window.addEventListener('unhandledrejection', e => {
  errBox.style.display = 'block';
  errBox.textContent = 'Promise error: ' + (e.reason && e.reason.message || e.reason);
});

const container = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 700);
camera.position.set(0, 6, 16);
scene.add(camera); // needed: spray can is a child of the camera

function applyQuality() {
  if (settings.quality === 'low') {
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = false;
  } else {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
  }
}
function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);
applyQuality(); resize();

const world = buildWorld(scene);
const player = new Player(scene);
const spray = new SprayMode(scene, camera, world, player);
const net = new Net(); // local-only for v1
spray.setColor(settings.color);

world.setPickupVisible(settings.difficulty === 'normal');

const ui = new UI({
  onJump: () => { if (!spray.active) player.jump(); },
  onToggleRide: () => {
    if (spray.active) return;
    const riding = player.toggleRide();
    document.getElementById('btnSkate').classList.toggle('active', riding);
    toast(riding ? '🛹 rolling — JUMP is an ollie now' : 'back on foot');
  },
  onToggleSpray: () => {
    if (spray.active) spray.exit();
    else {
      if (player.riding) {  // spray mode is on foot
        player.toggleRide();
        document.getElementById('btnSkate').classList.remove('active');
      }
      spray.enter();
      toast('Left stick walks · drag aims · tap 🎨 to toggle paint');
    }
  },
  onExitSpray: () => spray.exit(),
  onToggleSprayBtn: () => spray.toggleSpray(),
  onLook: (dx, dy) => { spray.active ? spray.addLook(dx, dy) : player.addLook(dx, dy); },
  onColor: hex => { spray.setColor(hex); ui.markColor(hex); },
  onSettings: key => {
    if (key === 'difficulty') {
      world.setPickupVisible(settings.difficulty === 'normal');
      if (settings.difficulty === 'easy') spray.refill();
    }
    if (key === 'quality') { applyQuality(); resize(); }
    if (key === 'handed') ui.applyHandedness();
    if (key === 'character') {
      player.setCharacter(settings.character);
      document.querySelector('#title small').textContent = `starring ${player.characterName} · v5`;
    }
  },
  sprayActive: () => spray.active,
});

document.querySelector('#title small').textContent = `starring ${player.characterName} · v5`;

const clock = new THREE.Clock();
let first = true;
const _pp = new THREE.Vector3();

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (spray.active) {
    const k = ui.keyInput();
    spray.setWalk(ui.joy.x + k.x, ui.joy.z + k.z);
    spray.update(dt);
  } else {
    const k = ui.keyInput();
    player.setInput(ui.joy.x + k.x, ui.joy.z + k.z);
    player.update(dt, world);
    player.placeCamera(camera, dt);
    // paint-can pickup (normal mode)
    if (settings.difficulty === 'normal' && world.pickup.visible) {
      world.pickup.getWorldPosition(_pp);
      const d = Math.hypot(player.pos.x - _pp.x, player.pos.z - _pp.z);
      if (d < 1.6) { spray.refill(); world.takePickup(); toast('🎨 Paint refilled!'); }
    }
  }
  world.update(dt, t);
  ui.setPaint(spray.paint, spray.infinite);

  if (first) {
    first = false;
    setTimeout(() => toast('Left stick to walk · drag to look · 🎨 button for spray mode', 3600), 600);
  }
  renderer.render(scene, camera);
}
loop();
