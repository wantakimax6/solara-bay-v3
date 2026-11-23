// Missions: six jobs from Mara, with a story. Each has a target point, a simple
// check (reach it, collect drops, survive), a payout, and HUD text. Mission 4 is
// the informant leak: Cepu tells the rival crew where you are, so hunters spawn
// and the HUD shows the leak warning until you reach the safehouse.
import * as THREE from 'three';

export const MISSIONS = [
  { name: '1 — First Wheels', text: 'Steal a car and drive it to the yellow marker at the plaza.', target: [0, 0], reward: 150, type: 'drive' },
  { name: '2 — Bay Delivery', text: 'Drive the package to the pier at the south beach. Do not get busted.', target: [0, 104], reward: 250, type: 'drive' },
  { name: '3 — Street Cash', text: 'On foot, collect 5 cash drops around the plaza. Watch for police.', target: [0, 0], reward: 200, type: 'collect' },
  { name: '4 — The Leak', text: 'CEPU LEAKED YOUR POSITION! The rival crew is hunting you. Survive 30 seconds, then reach the safehouse in the north-west.', target: [-72, -72], reward: 400, type: 'survive' },
  { name: '5 — Bank Run', text: 'Grab the cash at the bank, then escape with wanted level 3 and reach the hideout.', target: [72, 72], reward: 500, type: 'escape' },
  { name: '6 — Bay King', text: 'Final job: drive to the marina, deliver the goods, and become the king of Solara Bay.', target: [72, 104], reward: 800, type: 'drive' },
];

export function createMissions(scene) {
  const markerGeo = new THREE.CylinderGeometry(2.2, 2.2, 0.3, 20);
  const markerMat = new THREE.MeshLambertMaterial({ color: 0xffd23e, emissive: 0x887700 });
  const marker = new THREE.Mesh(markerGeo, markerMat);
  marker.position.y = 0.2;
  marker.visible = false;
  scene.add(marker);
  const drops = [];
  const dropGeo = new THREE.BoxGeometry(0.8, 0.5, 0.8);
  const dropMat = new THREE.MeshLambertMaterial({ color: 0x2a9d8f, emissive: 0x114433 });
  for (let i = 0; i < 5; i += 1) {
    const d = new THREE.Mesh(dropGeo, dropMat);
    d.position.set(-40 + i * 20, 0.6, -20 + (i % 2) * 40);
    d.visible = false;
    scene.add(d);
    drops.push(d);
  }
  return {
    marker, drops,
    current: null,
    timer: 0,
    collected: 0,
    start(index, state) {
      const m = MISSIONS[index];
      this.current = { ...m, index };
      this.timer = 0;
      this.collected = 0;
      state.missionIndex = index;
      state.leak = index === 3;
      state.leakTimer = 0;
      marker.position.set(m.target[0], 0.2, m.target[1]);
      marker.visible = true;
      for (const d of drops) d.visible = index === 2;
      return m;
    },
    update(dt, playerPos, state, audio) {
      if (!this.current) return null;
      const m = this.current;
      this.timer += dt;
      if (state.leak) {
        state.leakTimer += dt;
        if (Math.random() < dt * 0.4) state.wanted = Math.max(state.wanted, 2);
      }
      if (m.type === 'collect') {
        for (const d of drops) {
          if (!d.visible) continue;
          if (Math.hypot(playerPos.x - d.position.x, playerPos.z - d.position.z) < 2.5) {
            d.visible = false; this.collected += 1; audio.pickup();
          }
        }
        if (this.collected >= 5) return this.complete(state, audio);
      } else if (m.type === 'survive') {
        if (this.timer > 30) {
          // After surviving, the safehouse marker is the goal.
          if (Math.hypot(playerPos.x - m.target[0], playerPos.z - m.target[1]) < 5) return this.complete(state, audio);
        }
      } else {
        if (m.type === 'escape' && state.wanted < 3) state.wanted = 3;
        if (Math.hypot(playerPos.x - m.target[0], playerPos.z - m.target[1]) < 5) return this.complete(state, audio);
      }
      return null;
    },
    complete(state, audio) {
      const m = this.current;
      state.money += m.reward;
      state.score += m.reward;
      state.missionsDone += 1;
      state.leak = false;
      state.missionIndex = -1;
      this.current = null;
      this.marker.visible = false;
      for (const d of this.drops) d.visible = false;
      audio.mission();
      if (state.missionsDone >= MISSIONS.length) state.won = true;
      return m;
    },
    abort(state) {
      this.current = null;
      state.leak = false;
      this.marker.visible = false;
      for (const d of this.drops) d.visible = false;
    },
  };
}
