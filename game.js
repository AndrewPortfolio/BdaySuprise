/* ---------------------------------------------------------------------------
   game.js — engine. Content/config lives in data.js.

   Movement rules (two distinct kinds, kept separate on purpose):
     WITHIN a stage  -> tile-snapped stepping, camera scrolls smoothly to follow
                        (or stays put if the stage fits in the viewport).
     BETWEEN stages  -> hard cut-screen: fade to black, swap stage, fade back in.
                        Never a pan or scroll across a stage boundary.
   --------------------------------------------------------------------------- */

/* --- state: the single source of truth ----------------------------------- */
const state = {
  currentScene: 'hub',
  bossesDefeated: [false, false, false],
  playerTile: { x: STAGES.hub.spawn.x, y: STAGES.hub.spawn.y },
  cameraOffset: { x: 0, y: 0 },
  /* UI / flow flags */
  dialogueBoss: null,   // boss index while a dialogue is open, else null
  inputLocked: false,   // true during transitions and victory beats
  worldVersion: 0       // bumped when the map's appearance changes (locks, doors)
};

/* --- Phase 3 hook: real audio gets wired in here, nothing else changes ---- */
function playSound(name) {
  console.log('[playSound]', name);
}

/* --- DOM ------------------------------------------------------------------ */
const viewportEl = document.getElementById('viewport');
const stageEl = document.getElementById('stage');
const fadeEl = document.getElementById('fade');
const toastEl = document.getElementById('toast');
const dialogueEl = document.getElementById('dialogue');
const dialogueTextEl = document.getElementById('dialogue-text');
const fireworksEl = document.getElementById('fireworks');
const bannerEl = document.getElementById('banner');
const bannerTextEl = document.getElementById('banner-text');

const playerEl = document.createElement('div');
playerEl.id = 'player';

viewportEl.style.width = VIEW_W + 'px';
viewportEl.style.height = VIEW_H + 'px';

/* --- helpers -------------------------------------------------------------- */
function stageOf() {
  return STAGES[state.currentScene];
}

function tileAt(stage, x, y) {
  if (y < 0 || y >= stage.map.length) return '#';
  const row = stage.map[y];
  if (x < 0 || x >= row.length) return '#';
  return row[x];
}

function allBossesDefeated() {
  return state.bossesDefeated.every(Boolean);
}

function pathUnlocked(key) {
  const path = HUB_PATHS[key];
  return path.requiresBoss === null || state.bossesDefeated[path.requiresBoss] === true;
}

/* --- rendering ------------------------------------------------------------ */
const rendered = { scene: null, version: -1 };

function tileClasses(ch, stage) {
  const classes = ['tile'];
  if (ch === '#') {
    classes.push('wall');
  } else if (ch === 'B') {
    classes.push('boss');
    if (state.bossesDefeated[stage.boss]) classes.push('defeated');
  } else if (ch === 'D') {
    classes.push('door', 'door-hub');
  } else if (ch === 'C') {
    classes.push('door', 'door-castle');
  } else if (ch === 'E') {
    /* The Level 3 second exit is indistinguishable from wall until every boss
       is down; then it opens up as a separate door from the Hub entrance. */
    classes.push(allBossesDefeated() ? 'door door-exit' : 'wall');
  } else if (HUB_PATHS[ch]) {
    classes.push('door', 'path', 'path-' + ch);
    if (!pathUnlocked(ch)) classes.push('locked');
  } else {
    classes.push('floor');
  }
  return classes.join(' ');
}

function buildStage(stage) {
  const cols = stage.map[0].length;
  const rows = stage.map.length;
  stageEl.innerHTML = '';
  stageEl.dataset.scene = stage.id;
  stageEl.style.width = cols * TILE + 'px';
  stageEl.style.height = rows * TILE + 'px';
  stageEl.style.gridTemplateColumns = 'repeat(' + cols + ', ' + TILE + 'px)';
  stageEl.style.gridTemplateRows = 'repeat(' + rows + ', ' + TILE + 'px)';

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const tile = document.createElement('div');
      tile.className = tileClasses(tileAt(stage, x, y), stage);
      stageEl.appendChild(tile);
    }
  }
  stageEl.appendChild(playerEl);

  rendered.scene = stage.id;
  rendered.version = state.worldVersion;
}

/* Camera for one axis: follow the player, clamped to the stage bounds. If the
   stage is smaller than the viewport it is simply centered and never moves. */
function axisCamera(playerCenter, mapSize, viewSize) {
  if (mapSize <= viewSize) return -(viewSize - mapSize) / 2;
  return Math.max(0, Math.min(playerCenter - viewSize / 2, mapSize - viewSize));
}

function computeCamera(stage) {
  return {
    x: axisCamera(state.playerTile.x * TILE + TILE / 2, stage.map[0].length * TILE, VIEW_W),
    y: axisCamera(state.playerTile.y * TILE + TILE / 2, stage.map.length * TILE, VIEW_H)
  };
}

function render(opts) {
  const instant = !!(opts && opts.instant);
  const stage = stageOf();

  if (rendered.scene !== stage.id || rendered.version !== state.worldVersion) {
    buildStage(stage);
  }

  if (instant) {
    stageEl.classList.add('no-tween');
    playerEl.classList.add('no-tween');
  }

  playerEl.style.transform =
    'translate(' + state.playerTile.x * TILE + 'px, ' + state.playerTile.y * TILE + 'px)';

  state.cameraOffset = computeCamera(stage);
  stageEl.style.transform =
    'translate(' + -state.cameraOffset.x + 'px, ' + -state.cameraOffset.y + 'px)';

  if (instant) {
    void stageEl.offsetWidth; // force the jump to land before tweening resumes
    stageEl.classList.remove('no-tween');
    playerEl.classList.remove('no-tween');
  }

  if (state.dialogueBoss === null) {
    dialogueEl.hidden = true;
  } else {
    const boss = BOSSES[state.dialogueBoss];
    dialogueTextEl.textContent = boss.name + ' — ' + boss.prompt;
    dialogueEl.hidden = false;
  }
}

/* --- transient message ---------------------------------------------------- */
let toastTimer = null;
function showToast(text, ms) {
  toastEl.textContent = text;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toastEl.hidden = true; }, ms || 900);
}

/* --- cut-screen transition between stages --------------------------------- */
function transitionTo(sceneId) {
  if (state.inputLocked) return; // a cut-screen is already running
  state.inputLocked = true;
  playSound('transition');
  fadeEl.classList.add('on');

  setTimeout(function () {
    const next = STAGES[sceneId];
    state.currentScene = sceneId;
    /* A stage change always resets position/camera — nothing carries over. */
    state.playerTile = { x: next.spawn.x, y: next.spawn.y };
    state.cameraOffset = { x: 0, y: 0 };
    state.dialogueBoss = null;
    render({ instant: true });

    if (sceneId === 'castle') startCastle();

    fadeEl.classList.remove('on');
    setTimeout(function () { state.inputLocked = false; }, FADE_MS);
  }, FADE_MS);
}

/* --- boss encounter (one template, all three rooms call it with config) ---- */
function openBossDialogue(bossIndex) {
  state.dialogueBoss = bossIndex;
  playSound('dialogue-open');
  render();
}

function resolveBossDialogue(answer) {
  const bossIndex = state.dialogueBoss;
  if (bossIndex === null) return;

  /* No: close the box, change nothing — she can walk up and try again. */
  if (answer !== 'yes') {
    state.dialogueBoss = null;
    playSound('dialogue-close');
    render();
    return;
  }

  state.bossesDefeated[bossIndex] = true;
  state.dialogueBoss = null;
  state.worldVersion++;          // locks/doors need repainting
  state.inputLocked = true;
  playSound('boss-defeated');

  const finished = allBossesDefeated();
  if (finished) playSound('door-unlock');
  showToast('Victory!', 1000);
  render();

  setTimeout(function () {
    state.inputLocked = false;
    /* Beating the last boss reveals the Level 3 exit door, so she stays in the
       room to walk through it. Every other victory sends her back to the Hub. */
    if (!finished) transitionTo('hub');
  }, 1000);
}

/* --- movement ------------------------------------------------------------- */
const KEYS = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }
};

const heldKeys = [];   // most recently pressed key wins
let lastStepAt = 0;

function tryStep(dx, dy) {
  /* Nothing moves during a transition, a victory beat, or an open dialogue. */
  if (state.inputLocked || state.dialogueBoss !== null) return;

  const stage = stageOf();

  /* Corridor-style stages only allow travel along one direction. */
  if (stage.lockedDirection && (dx !== stage.lockedDirection.x || dy !== stage.lockedDirection.y)) {
    return;
  }

  const tx = state.playerTile.x + dx;
  const ty = state.playerTile.y + dy;
  const ch = tileAt(stage, tx, ty);

  if (ch === '#') return;

  if (ch === 'B') {
    if (!state.bossesDefeated[stage.boss]) openBossDialogue(stage.boss);
    return; // the boss tile is never walked onto
  }

  if (ch === 'D') { transitionTo('hub'); return; }
  if (ch === 'C') { transitionTo('castle'); return; }

  if (ch === 'E') {
    if (!allBossesDefeated()) return; // still a wall
    transitionTo('corridor');
    return;
  }

  if (HUB_PATHS[ch]) {
    if (!pathUnlocked(ch)) {
      playSound('locked');
      showToast('Locked. Beat the previous boss first.');
      return;
    }
    transitionTo(HUB_PATHS[ch].target);
    return;
  }

  state.playerTile = { x: tx, y: ty };
  playSound('step');
  render();
}

function step(now) {
  requestAnimationFrame(step);
  if (state.inputLocked || state.dialogueBoss !== null) return;
  if (!heldKeys.length) return;
  if (now - lastStepAt < STEP_MS) return;
  const dir = KEYS[heldKeys[heldKeys.length - 1]];
  if (!dir) return;
  lastStepAt = now;
  tryStep(dir.x, dir.y);
}

/* --- input ---------------------------------------------------------------- */
document.addEventListener('keydown', function (e) {
  if (replayArmed) { replay(); return; }

  if (state.dialogueBoss !== null) {
    if (e.key === 'y' || e.key === 'Y' || e.key === 'Enter') resolveBossDialogue('yes');
    if (e.key === 'n' || e.key === 'N' || e.key === 'Escape') resolveBossDialogue('no');
    e.preventDefault();
    return;
  }

  if (KEYS[e.key]) {
    e.preventDefault();
    if (heldKeys.indexOf(e.key) === -1) {
      heldKeys.push(e.key);
      lastStepAt = 0; // first press steps immediately, then repeats on a timer
    }
  }
});

document.addEventListener('keyup', function (e) {
  const i = heldKeys.indexOf(e.key);
  if (i !== -1) heldKeys.splice(i, 1);
});

/* Held keys can get stuck if focus leaves the window mid-step. */
window.addEventListener('blur', function () { heldKeys.length = 0; });

dialogueEl.addEventListener('click', function (e) {
  const btn = e.target.closest('button[data-choice]');
  if (btn) resolveBossDialogue(btn.dataset.choice);
});

/* --- castle: fireworks + banner ------------------------------------------- */
let replayArmed = false;

function buildFireworks() {
  fireworksEl.innerHTML = '';
  for (let b = 0; b < 6; b++) {
    const burst = document.createElement('div');
    burst.className = 'burst';
    /* Keep bursts out of the middle band so the banner never hides them. */
    burst.style.left = (8 + Math.random() * 84) + '%';
    burst.style.top = (b % 2 ? 74 + Math.random() * 14 : 8 + Math.random() * 18) + '%';
    burst.style.setProperty('--burst-delay', (b * 0.45).toFixed(2) + 's');
    for (let p = 0; p < 12; p++) {
      const angle = (p / 12) * Math.PI * 2;
      const dist = 34 + Math.random() * 26;
      const particle = document.createElement('i');
      particle.style.setProperty('--tx', (Math.cos(angle) * dist).toFixed(1) + 'px');
      particle.style.setProperty('--ty', (Math.sin(angle) * dist).toFixed(1) + 'px');
      particle.style.setProperty('--hue', Math.floor(Math.random() * 360) + 'deg');
      burst.appendChild(particle);
    }
    fireworksEl.appendChild(burst);
  }
  fireworksEl.hidden = false;
}

function startCastle() {
  playSound('fireworks');
  buildFireworks();
  bannerTextEl.textContent = BANNER_TEXT;
  bannerEl.hidden = false;
  playSound('banner');
  setTimeout(function () { replayArmed = true; }, 2500);
}

function replay() {
  replayArmed = false;
  fireworksEl.hidden = true;
  bannerEl.hidden = true;
  state.bossesDefeated = [false, false, false];
  state.worldVersion++;
  transitionTo('hub');
}

/* --- boot ----------------------------------------------------------------- */
render({ instant: true });
requestAnimationFrame(step);
