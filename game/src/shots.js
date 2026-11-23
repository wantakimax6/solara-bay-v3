// Screenshot scenes behind ?shot=cover|chase|mission|traffic. Each stages a real
// game state (player, cars, police, mission, wanted level), steps the world a
// little, and the renderer paints it; main.js sets window.__shotReady after
// two paints, so a screenshot tool can wait for it.
export function stageShot(name, game) {
  const { state, player, traffic, police, missions, placeCar } = game;
  state.wanted = 0;
  state.leak = false;
  police.clear(game.scene);
  if (name === 'chase') {
    state.wanted = 3;
    const car = placeCar(0, 30, Math.PI);
    player.inCar = car; car.isPlayer = true;
    player.mesh.visible = false;
    missions.start(4, state);
    state.leak = false;
    game.camYaw = Math.PI;
    game.camPitch = 0.32;
  } else if (name === 'mission') {
    missions.start(3, state);
    state.leak = true;
    player.place(-72, -36, Math.PI * 0.75);
    game.camYaw = Math.PI * 0.75;
    game.camPitch = 0.35;
  } else if (name === 'traffic') {
    player.place(0, -36, 0);
    game.camYaw = 0;
    game.camPitch = 0.5;
    // A couple of traffic cars on the avenue ahead, so the shot shows traffic.
    const t1 = placeCar(2, -18, 0);
    const t2 = placeCar(-2, -2, Math.PI);
    t1.speed = 0; t2.speed = 0;
  } else {
    // cover: player driving down the main avenue, HUD and minimap on.
    const car = placeCar(0, 40, 0);
    player.inCar = car; car.isPlayer = true;
    player.mesh.visible = false;
    missions.start(0, state);
    game.camYaw = 0;
    game.camPitch = 0.3;
  }
  // Step traffic a little so cars and pedestrians are mid-street, not at spawn.
  for (let i = 0; i < 40; i += 1) traffic.update(1 / 30, game.colliders);
  police.update(0.5, player.pos, !!player.inCar, state, game.audio);
  return name;
}
