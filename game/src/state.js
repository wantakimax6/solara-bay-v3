// Game state: money, health, wanted, missions, save/load. One clear job: the numbers
// the rest of the game reads and writes, nothing about rendering or input.
export const SAVE_KEY = 'solara-bay-save-v3';

export function createState() {
  return {
    money: 250,
    health: 100,
    ammo: 24,
    wanted: 0,
    wantedTimer: 0,
    missionsDone: 0,
    missionIndex: -1,
    missionState: null,
    score: 0,
    time: 0,
    paused: false,
    over: false,
    won: false,
    inCar: null,
    onFoot: true,
    leak: false,
    leakTimer: 0,
    kills: 0,
    carsStolen: 0,
  };
}

export function addWanted(state, amount) {
  state.wanted = Math.max(0, Math.min(5, state.wanted + amount));
  state.wantedTimer = 0;
}

export function addMoney(state, amount) {
  state.money += amount;
  state.score += amount;
}

export function saveGame(state) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: state.money, missionsDone: state.missionsDone, score: state.score, kills: state.kills,
    }));
  } catch { /* storage can be off; the game still plays */ }
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
