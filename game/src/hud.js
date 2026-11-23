// HUD: DOM text plus a 2D minimap canvas. The minimap draws roads, the player
// arrow, traffic, police and the mission marker, all top-down.
export function createHud() {
  const el = (id) => document.getElementById(id);
  const money = el('money');
  const health = el('health');
  const ammo = el('ammo');
  const speed = el('speed');
  const wanted = el('wanted');
  const mission = el('mission');
  const leak = el('leak');
  const msg = el('msg');
  const map = el('minimap');
  const mapCtx = map.getContext('2d');
  let msgTimer = 0;
  return {
    showMessage(text, seconds) { msg.textContent = text; msgTimer = seconds || 4; },
    update(dt, state, playerPos, heading, speedKmh, traffic, police, missions) {
      money.textContent = String(state.money);
      health.textContent = String(Math.max(0, Math.round(state.health)));
      ammo.textContent = String(state.ammo);
      speed.textContent = String(Math.round(speedKmh));
      wanted.textContent = state.wanted > 0 ? '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted) : '☆☆☆☆☆';
      leak.style.display = state.leak ? 'block' : 'none';
      if (missions.current) {
        const m = missions.current;
        let extra = '';
        if (m.type === 'collect') extra = ` — collected ${missions.collected}/5`;
        if (m.type === 'survive') extra = missions.timer > 30 ? ' — now reach the safehouse!' : ` — survive ${Math.max(0, Math.ceil(30 - missions.timer))}s`;
        mission.innerHTML = `<b>${m.name}</b> — ${m.text}${extra}`;
      } else if (state.won) {
        mission.innerHTML = '<b>YOU ARE THE KING OF SOLARA BAY!</b> — all missions done. Free roam!';
      } else {
        mission.textContent = 'No mission yet — press M to start the next job';
      }
      if (msgTimer > 0) { msgTimer -= dt; if (msgTimer <= 0) msg.textContent = ''; }
      // Minimap: 190px, city half 108 -> scale 0.85, centre 95.
      const c = mapCtx;
      c.clearRect(0, 0, 190, 190);
      c.fillStyle = '#123'; c.beginPath(); c.arc(95, 95, 94, 0, Math.PI * 2); c.fill();
      c.save(); c.beginPath(); c.arc(95, 95, 94, 0, Math.PI * 2); c.clip();
      c.fillStyle = '#2e3440';
      for (let i = -3; i <= 3; i += 1) {
        c.fillRect(95 + i * 36 * 0.85 - 4, 0, 8, 190);
        c.fillRect(0, 95 + i * 36 * 0.85 - 4, 190, 8);
      }
      c.fillStyle = '#2a9db5'; c.fillRect(0, 95 + 108 * 0.85, 190, 30);
      const dot = (x, z, color, r) => { c.fillStyle = color; c.beginPath(); c.arc(95 + x * 0.85, 95 + z * 0.85, r, 0, Math.PI * 2); c.fill(); };
      if (missions.current) dot(missions.current.target[0], missions.current.target[1], '#ffd23e', 6);
      for (const car of traffic.cars) dot(car.pos.x, car.pos.z, '#ffffff', 2.5);
      for (const car of police.cars) dot(car.pos.x, car.pos.z, '#2266ff', 3.5);
      // Player arrow.
      c.save();
      c.translate(95 + playerPos.x * 0.85, 95 + playerPos.z * 0.85);
      c.rotate(heading);
      c.fillStyle = '#ff5a3c';
      c.beginPath(); c.moveTo(0, -7); c.lineTo(5, 6); c.lineTo(-5, 6); c.closePath(); c.fill();
      c.restore();
      c.restore();
    },
  };
}
