// City: a medium, dense, sun-soaked bay city. Grid roads every 36 units, blocks of
// smooth blocky buildings (Minecraft-style boxes, soft lambert shading, no jagged
// edges), a beach and sea to the south, palm trees, street lamps and parked cars.
// Medium map: x,z in [-108, 108], about a minute to cross on foot, seconds by car.
import * as THREE from 'three';

export const CITY = { half: 108, road: 36, block: 24 };

export function makeStickman(color, height) {
  // A smooth stickman: round head, thin cylinder limbs, no sharp corners.
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color });
  const skin = new THREE.MeshLambertMaterial({ color: 0xffd9a0 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), skin);
  head.position.y = height - 0.32;
  g.add(head);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, height * 0.42, 10), mat);
  body.position.y = height * 0.62;
  g.add(body);
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, height * 0.4, 8), mat);
  armL.position.set(-0.32, height * 0.62, 0); armL.rotation.z = 0.35; g.add(armL);
  const armR = armL.clone(); armR.position.x = 0.32; armR.rotation.z = -0.35; g.add(armR);
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, height * 0.42, 8), new THREE.MeshLambertMaterial({ color: 0x223344 }));
  legL.position.set(-0.14, height * 0.21, 0); g.add(legL);
  const legR = legL.clone(); legR.position.x = 0.14; g.add(legR);
  g.userData.legs = [legL, legR];
  g.userData.arms = [armL, armR];
  return g;
}

export function buildCity(scene) {
  const colliders = [];
  const group = new THREE.Group();
  scene.add(group);
  // Sun, sky, fog: warm afternoon light, soft shadows.
  const sun = new THREE.DirectionalLight(0xfff2cc, 2.2);
  sun.position.set(60, 90, 40);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xbfd9ff, 0.9));
  scene.fog = new THREE.Fog(0xcfe8ff, 180, 420);
  // Ground: grass-green base, roads drawn as dark strips.
  const ground = new THREE.Mesh(new THREE.BoxGeometry(260, 1, 260), new THREE.MeshLambertMaterial({ color: 0x7fb069 }));
  ground.position.y = -0.5; group.add(ground);
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x2e3440 });
  for (let i = -3; i <= 3; i += 1) {
    const v = new THREE.Mesh(new THREE.BoxGeometry(10, 0.12, 260), roadMat);
    v.position.set(i * CITY.road, 0.06, 0); group.add(v);
    const h = new THREE.Mesh(new THREE.BoxGeometry(260, 0.12, 10), roadMat);
    h.position.set(0, 0.06, i * CITY.road); group.add(h);
  }
  // Sea and sand to the south (z > 108): the bay Solara Bay is named for.
  const sea = new THREE.Mesh(new THREE.BoxGeometry(300, 0.5, 60), new THREE.MeshLambertMaterial({ color: 0x2a9db5 }));
  sea.position.set(0, -0.2, 150); group.add(sea);
  const sand = new THREE.Mesh(new THREE.BoxGeometry(300, 0.4, 24), new THREE.MeshLambertMaterial({ color: 0xf2e3b3 }));
  sand.position.set(0, 0.05, 118); group.add(sand);
  // Buildings: one smooth block per city block, varied height and warm colour,
  // with a lighter roof cap. Deterministic layout so screenshots are stable.
  const palette = [0xe8b04b, 0xd96a4f, 0x7fb069, 0x5b8dd9, 0xc98bd9, 0xe8e0d0, 0x8ecae6, 0xf4a261];
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  // Buildings sit in the blocks BETWEEN roads, offset by half a road spacing,
  // so roads stay clear for cars, traffic and the camera.
  for (let bx = -3; bx <= 2; bx += 1) {
    for (let bz = -3; bz <= 2; bz += 1) {
      if (bx === -1 && bz === -1) continue; // central plaza block
      const cx = bx * CITY.road + 18;
      const cz = bz * CITY.road + 18;
      const h = 8 + rand() * 22;
      const col = palette[Math.floor(rand() * palette.length)];
      const b = new THREE.Mesh(new THREE.BoxGeometry(20, h, 20), new THREE.MeshLambertMaterial({ color: col }));
      b.position.set(cx, h / 2, cz); group.add(b);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(21, 0.8, 21), new THREE.MeshLambertMaterial({ color: 0xffffff }));
      roof.position.set(cx, h + 0.4, cz); group.add(roof);
      colliders.push({ x: cx - 10, z: cz - 10, x2: cx + 10, z2: cz + 10 });
      // Windows: small bright boxes on the south face, cheap and readable.
      for (let w = 0; w < 4; w += 1) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 0.2), new THREE.MeshLambertMaterial({ color: 0xfff6c9, emissive: 0x554400 }));
        win.position.set(cx - 6 + w * 4, Math.min(h - 3, 6 + w * 3), cz + 10.1); group.add(win);
      }
    }
  }
  // Central plaza with a fountain block and palms.
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 1.2, 20), new THREE.MeshLambertMaterial({ color: 0x7ec8e3 }));
  plaza.position.set(0, 0.6, 0); group.add(plaza);
  // Palm trees: smooth cylinder trunk + green sphere top.
  for (let i = 0; i < 14; i += 1) {
    const px = -100 + rand() * 200;
    const pz = -100 + rand() * 200;
    if (Math.abs(px % CITY.road) < 8 || Math.abs(pz % CITY.road) < 8) continue;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 7, 8), new THREE.MeshLambertMaterial({ color: 0x8a5a2b }));
    trunk.position.set(px, 3.5, pz); group.add(trunk);
    const top = new THREE.Mesh(new THREE.SphereGeometry(2.4, 12, 8), new THREE.MeshLambertMaterial({ color: 0x3f9e4d }));
    top.position.set(px, 7.6, pz); top.scale.y = 0.6; group.add(top);
  }
  // Soft white clouds drifting high above the bay, for a sky that is not plain.
  for (let i = 0; i < 8; i += 1) {
    const cloud = new THREE.Group();
    for (let j = 0; j < 3; j += 1) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(4 + rand() * 3, 12, 8), new THREE.MeshLambertMaterial({ color: 0xffffff }));
      puff.position.set(j * 5 - 5, rand() * 1.5, rand() * 2);
      puff.scale.y = 0.45;
      cloud.add(puff);
    }
    cloud.position.set(-120 + rand() * 240, 55 + rand() * 20, -120 + rand() * 240);
    group.add(cloud);
  }
  // Street lamps along the main avenue.
  for (let i = -2; i <= 2; i += 1) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 7, 8), new THREE.MeshLambertMaterial({ color: 0x333333 }));
    pole.position.set(i * CITY.road + 6, 3.5, -54); group.add(pole);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), new THREE.MeshLambertMaterial({ color: 0xfff6c9, emissive: 0x887722 }));
    lamp.position.set(i * CITY.road + 6, 7.2, -54); group.add(lamp);
  }
  return { group, colliders };
}

export function collides(colliders, x, z, r) {
  for (let i = 0; i < colliders.length; i += 1) {
    const c = colliders[i];
    if (x + r > c.x && x - r < c.x2 && z + r > c.z && z - r < c.z2) return true;
  }
  return false;
}

export function clampCity(x, z) {
  return { x: Math.max(-CITY.half, Math.min(CITY.half, x)), z: Math.max(-CITY.half, Math.min(CITY.half + 8, z)) };
}
