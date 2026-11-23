// Ragdoll: when a stickman is shot, run over, or busted, they do not freeze —
// they tumble. Limbs flail with a springy wobble, the body tips over, bounces
// once on the ground, and settles lying flat, arms out. Funny, natural, never stiff.
export function createRagdoll(scene) {
  const falling = [];
  return {
    fall(mesh, pos) {
      // Start the tumble from where the character stands.
      falling.push({ mesh, pos, t: 0, spin: (Math.random() - 0.5) * 6, dir: Math.random() * Math.PI * 2 });
      try { mesh.rotation.z = 0.2; } catch { /* never crash on a fall */ }
    },
    update(dt) {
      for (let i = falling.length - 1; i >= 0; i -= 1) {
        const f = falling[i];
        f.t += dt;
        const m = f.mesh;
        // Tip over with a wobble, arms windmilling.
        const tip = Math.min(1, f.t * 2.2);
        m.rotation.x = -tip * Math.PI / 2 * 0.96;
        m.rotation.z = Math.sin(f.t * 9) * 0.25 * (1 - tip);
        m.rotation.y += f.spin * dt * (1 - tip);
        if (m.userData.legs) {
          const w = Math.sin(f.t * 14) * 0.9 * (1 - tip * 0.7);
          m.userData.legs[0].rotation.x = w;
          m.userData.legs[1].rotation.x = -w;
        }
        if (m.userData.arms) {
          const w = Math.sin(f.t * 11 + 1) * 1.1 * (1 - tip * 0.7);
          m.userData.arms[0].rotation.z = 0.35 + w;
          m.userData.arms[1].rotation.z = -0.35 - w;
        }
        // Small bounce as they hit the ground, then rest.
        if (f.t > 0.45 && f.t < 0.8) m.position.y = Math.sin((f.t - 0.45) / 0.35 * Math.PI) * 0.35;
        else if (f.t >= 0.8) m.position.y = 0.35;
        if (f.t > 2.5) falling.splice(i, 1);
      }
    },
  };
}
