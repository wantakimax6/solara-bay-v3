// Player: a smooth stickman in third person. Walks, jumps, punches/shoots, gets
// in and out of cars. Movement is camera-relative; the camera follows behind.
import * as THREE from 'three';
import { makeStickman, collides, clampCity } from './city.js';

export function createPlayer(scene, colliders) {
  const mesh = makeStickman(0xff5a3c, 1.9);
  mesh.position.set(0, 0, 20);
  scene.add(mesh);
  return {
    mesh, colliders,
    pos: mesh.position,
    heading: 0,
    speed: 0,
    vy: 0,
    grounded: true,
    walkPhase: 0,
    inCar: null,
    update(dt, input, camYaw) {
      if (this.inCar) return;
      const fwd = (input.w ? 1 : 0) - (input.s ? 1 : 0);
      const strafe = (input.d ? 1 : 0) - (input.a ? 1 : 0);
      const moving = fwd !== 0 || strafe !== 0;
      const target = moving ? 9 : 0;
      this.speed += (target - this.speed) * Math.min(1, dt * 8);
      if (moving) {
        const ang = camYaw + Math.atan2(strafe, fwd);
        this.heading = ang;
        const nx = this.pos.x + Math.sin(ang) * this.speed * dt;
        const nz = this.pos.z + Math.cos(ang) * this.speed * dt;
        const c = clampCity(nx, nz);
        if (!collides(this.colliders, c.x, this.pos.z, 0.7)) this.pos.x = c.x;
        if (!collides(this.colliders, this.pos.x, c.z, 0.7)) this.pos.z = c.z;
        this.walkPhase += dt * this.speed * 1.6;
        const s = Math.sin(this.walkPhase);
        mesh.userData.legs[0].rotation.x = s * 0.7;
        mesh.userData.legs[1].rotation.x = -s * 0.7;
        mesh.userData.arms[0].rotation.x = -s * 0.5;
        mesh.userData.arms[1].rotation.x = s * 0.5;
      }
      mesh.rotation.y = this.heading + Math.PI;
      if (input.jump && this.grounded) { this.vy = 7; this.grounded = false; }
      if (!this.grounded) {
        this.vy -= 22 * dt;
        this.pos.y += this.vy * dt;
        if (this.pos.y <= 0) { this.pos.y = 0; this.vy = 0; this.grounded = true; }
      }
    },
    place(x, z, heading) {
      this.pos.set(x, 0, z);
      this.heading = heading || 0;
      mesh.rotation.y = this.heading + Math.PI;
    },
  };
}
