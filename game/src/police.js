// Police: black-and-white patrol cars and blue stickman officers. They spawn with
// the wanted level, chase the player, ram the car, and back off when wanted fades.
// Busted when an officer gets close on foot with wanted stars up.
import * as THREE from 'three';
import { makeStickman } from './city.js';
import { createCar, driveCar } from './vehicles.js';

export function createPolice(scene, colliders) {
  const cars = [];
  const officers = [];
  return {
    cars, officers, colliders,
    wanted: 0,
    update(dt, playerPos, inCar, state, audio) {
      const want = Math.min(3, state.wanted);
      while (cars.length < want) {
        const c = createCar(scene, playerPos.x + 30 - Math.random() * 60, playerPos.z + 30, 0, 0xffffff);
        c.isPolice = true;
        // Police livery: white body, dark cabin is already in the mesh; add a light bar.
        const bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 0.5), new THREE.MeshLambertMaterial({ color: 0x2266ff, emissive: 0x1122aa }));
        bar.position.y = 1.75; c.mesh.add(bar);
        cars.push(c);
      }
      while (officers.length < (state.wanted >= 2 ? 2 : 0)) {
        const m = makeStickman(0x2266ff, 1.9);
        m.position.set(playerPos.x + 15, 0, playerPos.z + 15);
        scene.add(m);
        officers.push({ mesh: m, pos: m.position, heading: 0, phase: 0 });
      }
      for (const c of cars) {
        const dx = playerPos.x - c.pos.x;
        const dz = playerPos.z - c.pos.z;
        const dist = Math.hypot(dx, dz) || 1;
        const wantHeading = Math.atan2(dx, dz);
        let diff = wantHeading - c.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const steer = Math.max(-1, Math.min(1, diff * 1.5));
        driveCar(c, dt, dist > 6 ? 1 : 0.2, steer, this.colliders);
        if (dist < 3 && inCar) { state.health -= 2 * dt; }
        if (Math.random() < dt * 0.5) audio.siren(true);
      }
      for (const o of officers) {
        const dx = playerPos.x - o.pos.x;
        const dz = playerPos.z - o.pos.z;
        const dist = Math.hypot(dx, dz) || 1;
        o.heading = Math.atan2(dx, dz);
        o.pos.x += Math.sin(o.heading) * 5 * dt;
        o.pos.z += Math.cos(o.heading) * 5 * dt;
        o.phase += dt * 8;
        const s = Math.sin(o.phase);
        o.mesh.userData.legs[0].rotation.x = s * 0.6;
        o.mesh.userData.legs[1].rotation.x = -s * 0.6;
        o.mesh.rotation.y = o.heading + Math.PI;
        if (dist < 1.6 && !inCar) {
          state.health -= 12 * dt;
          if (state.health <= 0) { state.over = true; audio.busted(); }
        }
      }
      // Wanted decays slowly when the player is far from police and not committing crimes.
      if (state.wanted > 0) {
        state.wantedTimer += dt;
        if (state.wantedTimer > 25) { state.wanted -= 1; state.wantedTimer = 0; }
      }
    },
    clear(scene) {
      for (const c of this.cars) scene.remove(c.mesh);
      for (const o of this.officers) scene.remove(o.mesh);
      this.cars.length = 0; this.officers.length = 0;
    },
  };
}
