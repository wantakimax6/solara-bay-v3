// Boot and the one loop: Solara Bay, a smooth blocky low-poly 3D open-world
// crime game in third person. Input every frame, world in fixed 1/60 s steps,
// camera follows behind the player or the car. ?shot=cover|chase|mission|traffic
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import * as THREE from 'three';
import { buildCity } from './city.js';
import { createState, addWanted, saveGame, loadSave } from './state.js';
import { createAudio } from './audio.js';
import { createPlayer } from './player.js';
import { createCar, createTraffic, driveCar } from './vehicles.js';
import { createPolice } from './police.js';
import { createMissions, MISSIONS } from './missions.js';
import { createHud } from './hud.js';
import { stageShot } from './shots.js';
import { createRagdoll } from './ragdoll.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const canvas = document.getElementById('game');
const screen = document.getElementById('screen');
const statusEl = document.getElementById('status');
const saveInfo = document.getElementById('saveinfo');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 600);

const state = createState();
const saved = loadSave();
if (saved) { state.money = saved.money || 250; state.missionsDone = saved.missionsDone || 0; state.score = saved.score || 0; }
const audio = createAudio();
const { colliders } = buildCity(scene);
const player = createPlayer(scene, colliders);
const traffic = createTraffic(scene, colliders);
const police = createPolice(scene, colliders);
const missions = createMissions(scene);
const hud = createHud();
const ragdoll = createRagdoll(scene);

const game = { scene, state, player, traffic, police, missions, audio, colliders, camYaw: 0, camPitch: 0.32, placeCar };
window.__game = game;
window.__state = state;

function placeCar(x, z, heading) {
  const car = createCar(scene, x, z, heading, 0xe63946);
  traffic.cars.push(car);
  return car;
}
game.placeCar = placeCar;

// Input: keyboard + mouse drag for the camera.
const input = { w: false, a: false, s: false, d: false, jump: false, shoot: false };
let dragging = false;
let lastX = 0;
let lastY = 0;
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'w' || k === 'arrowup') input.w = true;
  if (k === 'a' || k === 'arrowleft') input.a = true;
  if (k === 's' || k === 'arrowdown') input.s = true;
  if (k === 'd' || k === 'arrowright') input.d = true;
  if (k === ' ') { input.jump = true; e.preventDefault(); }
  if (k === 'f') input.shoot = true;
  if (k === 'e') tryEnterExit();
  if (k === 'm') nextMission();
  if (k === 'p') togglePause();
  if (k === 'r') restart();
});
window.addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'w' || k === 'arrowup') input.w = false;
  if (k === 'a' || k === 'arrowleft') input.a = false;
  if (k === 's' || k === 'arrowdown') input.s = false;
  if (k === 'd' || k === 'arrowright') input.d = false;
  if (k === ' ') input.jump = false;
});
canvas.addEventListener('mousedown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
window.addEventListener('mouseup', () => { dragging = false; });
window.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  game.camYaw -= (e.clientX - lastX) * 0.005;
  game.camPitch = Math.max(0.05, Math.min(1.1, game.camPitch + (e.clientY - lastY) * 0.003));
  lastX = e.clientX; lastY = e.clientY;
});
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function nearestCar(maxDist) {
  let best = null; let bestD = maxDist;
  for (const car of traffic.cars) {
    const d = Math.hypot(car.pos.x - player.pos.x, car.pos.z - player.pos.z);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

function tryEnterExit() {
  if (state.paused || state.over) return;
  audio.unlock();
  if (player.inCar) {
    const car = player.inCar;
    car.isPlayer = false;
    player.inCar = null;
    player.mesh.visible = true;
    player.place(car.pos.x + 3, car.pos.z + 2, car.heading);
    hud.showMessage('You got out of the car.');
    return;
  }
  const car = nearestCar(4);
  if (car) {
    player.inCar = car;
    car.isPlayer = true;
    player.mesh.visible = false;
    state.carsStolen += 1;
    if (state.carsStolen === 1) addWanted(state, 1);
    hud.showMessage('You stole the car! Wanted level up.');
    audio.pickup();
  }
}

function nextMission() {
  if (state.paused || state.over) return;
  const idx = state.missionsDone % MISSIONS.length;
  if (missions.current) { hud.showMessage('Mission already running — finish it first!'); return; }
  const m = missions.start(idx, state);
  hud.showMessage(`Mission started: ${m.name}`);
  audio.mission();
}

function togglePause() {
  if (state.over) return;
  state.paused = !state.paused;
  screen.classList.toggle('hidden', !state.paused);
  if (state.paused) {
    screen.querySelector('h1').textContent = 'PAUSED';
    screen.querySelector('p').textContent = 'Press P to keep playing Solara Bay.';
  }
}

function restart() {
  const fresh = createState();
  Object.assign(state, fresh);
  if (saved) state.money = saved.money || 250;
  missions.abort(state);
  police.clear(scene);
  player.mesh.visible = true;
  player.inCar = null;
  player.place(0, 20, 0);
  screen.classList.add('hidden');
}

function shoot() {
  if (state.ammo <= 0) { hud.showMessage('Out of ammo — find a car, ammo refills when you steal one.'); return; }
  state.ammo -= 1;
  audio.shoot();
  // Nearest pedestrian or officer in front, within 14 units: ragdoll fall.
  let best = null; let bestD = 14;
  const targets = [...traffic.peds.map((p) => ({ pos: p.pos, mesh: p.mesh, kind: 'ped' })), ...police.officers.map((o) => ({ pos: o.pos, mesh: o.mesh, kind: 'cop' }))];
  for (const t of targets) {
    const d = Math.hypot(t.pos.x - player.pos.x, t.pos.z - player.pos.z);
    if (d < bestD) { bestD = d; best = t; }
  }
  if (best) {
    ragdoll.fall(best.mesh, best.pos);
    state.kills += 1;
    addWanted(state, 1);
    hud.showMessage(best.kind === 'cop' ? 'You shot an officer! Wanted level up.' : 'Pedestrian down! Wanted level up.');
    audio.hit();
  }
}

function updateCamera(dt) {
  const target = player.inCar ? player.inCar.pos : player.pos;
  const yaw = player.inCar ? player.inCar.heading : game.camYaw;
  const dist = player.inCar ? 14 : 10;
  const height = 6 + game.camPitch * 7;
  const cx = target.x - Math.sin(yaw) * dist;
  const cz = target.z - Math.cos(yaw) * dist;
  camera.position.x += (cx - camera.position.x) * Math.min(1, dt * 6);
  camera.position.y += (height - camera.position.y) * Math.min(1, dt * 6);
  camera.position.z += (cz - camera.position.z) * Math.min(1, dt * 6);
  camera.lookAt(target.x, target.y + 1.6, target.z);
}

function step(dt) {
  state.time += dt;
  if (input.shoot) { input.shoot = false; shoot(); }
  if (player.inCar) {
    const car = player.inCar;
    const throttle = (input.w ? 1 : 0) - (input.s ? 0.7 : 0);
    const steer = (input.a ? 1 : 0) - (input.d ? 1 : 0);
    driveCar(car, dt, throttle, steer, colliders);
    audio.engine(true, Math.abs(car.speed));
    // Hitting a pedestrian with the car: ragdoll, wanted up.
    for (const p of traffic.peds) {
      if (Math.hypot(p.pos.x - car.pos.x, p.pos.z - car.pos.z) < 2.2 && Math.abs(car.speed) > 4) {
        ragdoll.fall(p.mesh, p.pos);
        p.pos.set(60 + Math.random() * 40, 0, 60 + Math.random() * 40);
        addWanted(state, 1);
        audio.hit();
      }
    }
  } else {
    player.update(dt, input, game.camYaw);
    audio.engine(false, 0);
  }
  traffic.update(dt, colliders);
  police.update(dt, player.pos, !!player.inCar, state, audio);
  ragdoll.update(dt);
  const done = missions.update(dt, player.pos, state, audio);
  if (done) {
    hud.showMessage(`Mission complete: ${done.name} — $${done.reward}!`);
    saveGame(state);
    if (state.won) { hud.showMessage('YOU ARE THE KING OF SOLARA BAY!'); saveGame(state); }
  }
  if (state.health <= 0 && !state.over) {
    state.over = true;
    ragdoll.fall(player.mesh, player.pos);
    audio.busted();
    saveGame(state);
  }
  const speedKmh = player.inCar ? Math.abs(player.inCar.speed) * 3.6 : Math.abs(player.speed) * 3.6;
  const heading = player.inCar ? player.inCar.heading : player.heading;
  hud.update(dt, state, player.pos, heading, speedKmh, traffic, police, missions);
  updateCamera(dt);
  renderer.render(scene, camera);
}

function runShot(name) {
  stageShot(name, game);
  screen.classList.add('hidden');
  // Step the world half a second first so the camera converges behind the
  // player/car and traffic is mid-street, then paint twice.
  for (let i = 0; i < 30; i += 1) step(1 / 60);
  let painted = 0;
  function paint() {
    step(1 / 60);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  if (saved) saveInfo.textContent = `Save found: $${saved.money}, ${saved.missionsDone} missions done. Your progress is kept.`;
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.25);
    last = now;
    if (state.paused || state.over) {
      if (state.over) {
        screen.classList.remove('hidden');
        screen.querySelector('h1').textContent = state.won ? 'BAY KING!' : 'BUSTED';
        screen.querySelector('p').textContent = state.won ? 'All missions done. Solara Bay is yours.' : 'You were busted. Press R to restart, or reload to try again.';
      }
      renderer.render(scene, camera);
      return;
    }
    acc += dt;
    while (acc >= 1 / 60) { step(1 / 60); acc -= 1 / 60; }
  }
  document.getElementById('play').addEventListener('click', () => {
    audio.unlock();
    screen.classList.add('hidden');
    statusEl.textContent = 'Playing Solara Bay. Press M to start a mission.';
  });
  screen.classList.remove('hidden');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
