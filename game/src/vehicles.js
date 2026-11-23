// Vehicles and pedestrians. Cars are smooth blocky boxes with round wheels; traffic
// drives along the road grid, pedestrians are stickmen walking the sidewalks.
import * as THREE from 'three';
import { makeStickman, CITY, collides, clampCity } from './city.js';

const CAR_COLORS = [0xe63946, 0x457b9d, 0xf4d35e, 0x2a9d8f, 0x9b5de5, 0xf15bb5, 0xffffff, 0x222222];

export function makeCarMesh(color) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 4.4), bodyMat);
  body.position.y = 0.65; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.65, 2.2), new THREE.MeshLambertMaterial({ color: 0x1d3557 }));
  cabin.position.set(0, 1.3, -0.2); g.add(cabin);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  g.userData.wheels = [];
  [[-1.05, 1.4], [1.05, 1.4], [-1.05, -1.4], [1.05, -1.4]].forEach(([x, z]) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14), wheelMat);
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.42, z); g.add(w); g.userData.wheels.push(w);
  });
  return g;
}

export function createCar(scene, x, z, heading, color) {
  const mesh = makeCarMesh(color === undefined ? CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)] : color);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading || 0;
  scene.add(mesh);
  return { mesh, pos: mesh.position, heading: heading || 0, speed: 0, steering: 0, isPolice: false, isPlayer: false };
}

export function driveCar(car, dt, throttle, steer, colliders) {
  const maxSpeed = car.isPolice ? 30 : 26;
  car.speed += (throttle * maxSpeed - car.speed) * Math.min(1, dt * 1.4);
  if (Math.abs(car.speed) > 0.2) car.heading += steer * dt * Math.min(1.6, Math.abs(car.speed) * 0.09) * Math.sign(car.speed);
  const nx = car.pos.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.pos.z + Math.cos(car.heading) * car.speed * dt;
  const c = clampCity(nx, nz);
  if (!collides(colliders, c.x, car.pos.z, 1.4)) car.pos.x = c.x; else car.speed *= 0.5;
  if (!collides(colliders, car.pos.x, c.z, 1.4)) car.pos.z = c.z; else car.speed *= 0.5;
  car.mesh.position.copy(car.pos);
  car.mesh.rotation.y = car.heading;
  car.mesh.userData.wheels.forEach((w) => { w.rotation.x += car.speed * dt * 2; });
}

export function createTraffic(scene, colliders) {
  const cars = [];
  const peds = [];
  let seed = 31;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 9; i += 1) {
    const road = (Math.floor(rand() * 7) - 3) * CITY.road;
    const along = -100 + rand() * 200;
    const horizontal = rand() > 0.5;
    const car = createCar(scene, horizontal ? along : road, horizontal ? road : along, horizontal ? Math.PI / 2 : 0);
    car.route = { horizontal, road, dir: rand() > 0.5 ? 1 : -1, speed: 7 + rand() * 5 };
    cars.push(car);
  }
  const pedColors = [0x2a9d8f, 0xe9c46a, 0x9b5de5, 0xf15bb5, 0xffffff, 0x457b9d];
  for (let i = 0; i < 12; i += 1) {
    const m = makeStickman(pedColors[i % pedColors.length], 1.8);
    m.position.set(-100 + rand() * 200, 0, -100 + rand() * 200);
    scene.add(m);
    peds.push({ mesh: m, pos: m.position, heading: rand() * Math.PI * 2, speed: 1.2 + rand() * 1.2, phase: rand() * 6 });
  }
  return {
    cars, peds,
    update(dt, colliders) {
      for (const car of cars) {
        if (car.isPlayer || !car.route) continue;
        const r = car.route;
        car.speed = r.speed * r.dir;
        if (r.horizontal) {
          car.pos.x += car.speed * dt;
          car.heading = Math.PI / 2 * (r.dir > 0 ? 1 : -1);
          if (car.pos.x > 106) car.pos.x = -106;
          if (car.pos.x < -106) car.pos.x = 106;
        } else {
          car.pos.z += car.speed * dt;
          car.heading = r.dir > 0 ? 0 : Math.PI;
          if (car.pos.z > 106) car.pos.z = -106;
          if (car.pos.z < -106) car.pos.z = 106;
        }
        car.mesh.position.copy(car.pos);
        car.mesh.rotation.y = car.heading;
      }
      for (const p of peds) {
        p.phase += dt * p.speed * 3;
        p.pos.x += Math.sin(p.heading) * p.speed * dt;
        p.pos.z += Math.cos(p.heading) * p.speed * dt;
        if (Math.abs(p.pos.x) > 104 || Math.abs(p.pos.z) > 104) p.heading += Math.PI / 2;
        if (collides(colliders, p.pos.x, p.pos.z, 0.5)) p.heading += Math.PI / 2;
        const s = Math.sin(p.phase);
        p.mesh.userData.legs[0].rotation.x = s * 0.6;
        p.mesh.userData.legs[1].rotation.x = -s * 0.6;
        p.mesh.rotation.y = p.heading + Math.PI;
      }
    },
  };
}
