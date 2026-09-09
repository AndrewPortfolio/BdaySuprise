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
  facing: 'down',       // which way the sprite looks; she turns even when blocked
  outfit: 'default',    // key into OUTFITS — swapped by boss rewards
  /* UI / flow flags */
  battle: null,         // the live fight object while one is open, else null
  inputLocked: false,   // true during transitions and victory beats
  castleUnlocked: false,// set when she reaches the gate and the party starts
  worldVersion: 0       // bumped when the map's appearance changes (locks, doors)
};

/* --- Phase 3 hook: real sound effects get wired in here ------------------- */
function playSound(name) {
  console.log('[playSound]', name);
}

/* --- looping music --------------------------------------------------------
   One track at a time. Browsers refuse to start audio before the page has seen
   a real user gesture, so a rejected play() is remembered and retried on her
   next keypress — by then she has certainly pressed something. */
const trackCache = {};
let currentTrack = null;
let blockedTrack = null;

function getTrack(src) {
  if (!trackCache[src]) {
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = 0.55;
    trackCache[src] = audio;
  }
  return trackCache[src];
}

function playLoop(src) {
  if (currentTrack && currentTrack.src === src) return; // already running
  stopLoop();
  const audio = getTrack(src);
  currentTrack = { src: src, audio: audio };
  audio.currentTime = 0;
  const started = audio.play();
  if (started && started.catch) {
    started.catch(function () { blockedTrack = src; });
  }
}

function stopLoop() {
  blockedTrack = null;
  if (!currentTrack) return;
  currentTrack.audio.pause();
  currentTrack.audio.currentTime = 0;
  currentTrack = null;
}

/* Called from the keydown handler: if autoplay blocked us, try once more. */
function retryBlockedTrack() {
  if (!blockedTrack || !currentTrack || currentTrack.src !== blockedTrack) return;
  blockedTrack = null;
  const started = currentTrack.audio.play();
  if (started && started.catch) started.catch(function () {});
}

/* --- DOM ------------------------------------------------------------------ */
const viewportEl = document.getElementById('viewport');
const stageEl = document.getElementById('stage');
const fadeEl = document.getElementById('fade');
const toastEl = document.getElementById('toast');
const battleEl = document.getElementById('battle');
const battlePortraitEl = document.getElementById('battle-portrait');
const battleNameEl = document.getElementById('battle-name');
const battleHpFillEl = document.getElementById('battle-hp-fill');
const battleHpNumEl = document.getElementById('battle-hp-num');
const battleTextEl = document.getElementById('battle-text');
const battleAskEl = document.getElementById('battle-ask');
const battleChoicesEl = document.getElementById('battle-choices');
const battlePromptEl = document.getElementById('battle-prompt');
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
    classes.push('boss', BOSSES[stage.boss].id);
    if (state.bossesDefeated[stage.boss]) classes.push('defeated');
  } else if (ch === 'D') {
    classes.push('door', 'door-hub');
  } else if (ch === 'C') {
    classes.push('door', 'door-castle');
  } else if (ch === 'E') {
    /* The Level 3 second exit is indistinguishable from wall until every boss
       is down; then it opens up as a separate door from the Hub entrance. */
    classes.push(allBossesDefeated() ? 'door door-exit' : 'wall');
  } else if (ch === 'K' || ch === 'G') {
    classes.push('castle-block');   // artwork covers these; no tile fill
  } else if (ch === 'P') {
    /* Points at whichever shop is open next; -1 (all done) leaves it pointing
       up, toward Level 3 and the way onward. */
    const next = state.bossesDefeated.indexOf(false);
    classes.push('signpost', 'point-' + (next === 0 ? 'left' : next === 1 ? 'right' : 'up'));
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
  if (stage.structure) {
    const art = document.createElement('div');
    art.className = 'structure';
    art.style.left = stage.structure.x * TILE + 'px';
    art.style.top = stage.structure.y * TILE + 'px';
    art.style.width = stage.structure.w * TILE + 'px';
    art.style.height = stage.structure.h * TILE + 'px';
    art.style.backgroundImage = 'url(' + stage.structure.src + ')';
    stageEl.appendChild(art);
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

  playerEl.dataset.facing = state.facing;
  playerEl.dataset.outfit = state.outfit;
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

  renderBattle();
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
    state.battle = null;

    /* Walking into a boss room starts the fight music; it loops until that boss
       is down (finishBattle) or she leaves the room. */
    if (next.boss !== undefined && !state.bossesDefeated[next.boss]) {
      playLoop(AUDIO.bossMusic);
    } else {
      stopLoop();
    }
    render({ instant: true });

    fadeEl.classList.remove('on');
    setTimeout(function () { state.inputLocked = false; }, FADE_MS);
  }, FADE_MS);
}

/* --- boss fight -----------------------------------------------------------
   One template, every room uses it — the difference is entirely BOSSES[i] in
   data.js. She cannot lose: a wrong answer only draws a taunt and the same
   question stays up, unlimited retries. Each correct answer takes
   `damagePerAnswer` off the boss, and the last one empties the bar.

   phases:
     intro     the boss's opening line          -> Enter
     question  the question + its choices       -> click / 1-4 / arrows+Enter
     hit       she just lost hp, reacting       -> Enter
     victory   her closing line + the reward    -> Enter
   --------------------------------------------------------------------------- */
function startBattle(bossIndex) {
  const boss = BOSSES[bossIndex];
  state.battle = {
    bossIndex: bossIndex,
    hp: boss.hp,
    maxHp: boss.hp,
    phase: 'intro',
    questionIndex: 0,
    hitCount: 0,      // how many times she has been hit — picks the hit line
    wrongCount: 0,    // total wrong answers — cycles the taunts
    wrongPicks: [],   // choices already ruled out on the current question
    selected: 0,      // keyboard cursor within the choices
    line: boss.intro
  };
  playSound('battle-start');
  render();
}

function endBattle() {
  state.battle = null;
  battleChoicesEl.innerHTML = '';
  render();
}

function currentQuestion(battle) {
  return BOSSES[battle.bossIndex].questions[battle.questionIndex];
}

function renderBattle() {
  const battle = state.battle;
  if (!battle) {
    battleEl.hidden = true;
    return;
  }

  const boss = BOSSES[battle.bossIndex];
  const asking = battle.phase === 'question';

  battleEl.hidden = false;
  battlePortraitEl.className = boss.id;
  battleNameEl.textContent = boss.subtitle ? boss.name + ' · ' + boss.subtitle : boss.name;
  battleHpFillEl.style.width = (battle.hp / battle.maxHp * 100) + '%';
  battleHpFillEl.classList.toggle('empty', battle.hp <= 0);
  battleHpNumEl.textContent = battle.hp + ' / ' + battle.maxHp + ' HP';
  battleTextEl.textContent = battle.line;

  battleAskEl.hidden = !asking;
  battleChoicesEl.hidden = !asking;
  if (asking) {
    const question = currentQuestion(battle);
    battleAskEl.textContent =
      'Q' + (battle.questionIndex + 1) + '/' + boss.questions.length + '  ' + question.ask;
    buildChoices(battle, question);
  }

  battlePromptEl.hidden = asking;
  if (!asking) {
    battlePromptEl.textContent =
      battle.phase === 'victory' ? 'press Enter to take them' : 'press Enter';
  }
}

/* Rebuild the buttons only when the question changes; otherwise just restyle
   them, so a wrong pick does not yank the row out from under the cursor. */
function buildChoices(battle, question) {
  const key = battle.bossIndex + ':' + battle.questionIndex;
  if (battleChoicesEl.dataset.key !== key) {
    battleChoicesEl.dataset.key = key;
    battleChoicesEl.innerHTML = '';
    question.choices.forEach(function (choice, i) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.choice = i;
      button.innerHTML = '<b>' + (i + 1) + '</b>' + choice;
      battleChoicesEl.appendChild(button);
    });
  }
  Array.prototype.forEach.call(battleChoicesEl.children, function (button, i) {
    button.classList.toggle('ruled-out', battle.wrongPicks.indexOf(i) !== -1);
    button.classList.toggle('selected', battle.selected === i);
  });
}

function moveSelection(delta) {
  const battle = state.battle;
  if (!battle || battle.phase !== 'question') return;
  const count = currentQuestion(battle).choices.length;
  battle.selected = (battle.selected + delta + count) % count;
  render();
}

function answerQuestion(choiceIndex) {
  const battle = state.battle;
  if (!battle || battle.phase !== 'question') return;

  const boss = BOSSES[battle.bossIndex];
  const question = currentQuestion(battle);
  if (choiceIndex < 0 || choiceIndex >= question.choices.length) return;
  battle.selected = choiceIndex;

  /* Wrong: costs nothing. Rule the choice out and let her pick again. */
  if (choiceIndex !== question.correct) {
    if (battle.wrongPicks.indexOf(choiceIndex) === -1) battle.wrongPicks.push(choiceIndex);
    battle.line = boss.wrongLines[battle.wrongCount % boss.wrongLines.length];
    battle.wrongCount++;
    playSound('answer-wrong');
    render();
    return;
  }

  /* Right: she takes a hit and reacts before the next question comes up. */
  battle.hp = Math.max(0, battle.hp - boss.damagePerAnswer);
  battle.line = boss.hitLines[Math.min(battle.hitCount, boss.hitLines.length - 1)];
  battle.hitCount++;
  battle.phase = 'hit';
  playSound('boss-hit');
  render();
}

/* Enter/Space: the only thing that moves intro, hit and victory along. */
function advanceBattle() {
  const battle = state.battle;
  if (!battle) return;
  const boss = BOSSES[battle.bossIndex];

  if (battle.phase === 'intro') {
    battle.phase = 'question';
    render();
    return;
  }

  if (battle.phase === 'hit') {
    if (battle.hp <= 0) {
      battle.phase = 'victory';
      battle.line = boss.victory;
      playSound('boss-defeated');
      render();
      return;
    }
    battle.questionIndex++;
    battle.phase = 'question';
    battle.wrongPicks = [];
    battle.selected = 0;
    render();
    return;
  }

  if (battle.phase === 'victory') finishBattle();
}

function finishBattle() {
  const battle = state.battle;
  const boss = BOSSES[battle.bossIndex];

  state.bossesDefeated[boss.index] = true;
  state.worldVersion++;          // locks/doors and the boss tile need repainting
  state.inputLocked = true;
  stopLoop();                    // the fight music ends with the fight

  /* The reward lands before the transition, so she is already wearing it when
     the lobby fades back in. */
  if (boss.reward && boss.reward.outfit) {
    state.outfit = boss.reward.outfit;
    playSound('reward');
  }
  endBattle();

  const finished = allBossesDefeated();
  if (finished) playSound('door-unlock');
  showToast((boss.reward && boss.reward.toast) || 'Victory!', 1200);

  setTimeout(function () {
    state.inputLocked = false;
    /* Beating the last boss reveals the Level 3 exit door, so she stays in the
       room to walk through it. Every other victory sends her back to the Hub. */
    if (!finished) transitionTo('hub');
  }, 1200);
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
  /* Nothing moves during a transition, a victory beat, or an open fight. */
  if (state.inputLocked || state.battle !== null) return;

  const stage = stageOf();

  /* She turns to face the way she is pushing even if the step is refused. */
  const facing = dy < 0 ? 'up' : dy > 0 ? 'down' : dx < 0 ? 'left' : 'right';
  if (state.facing !== facing) {
    state.facing = facing;
    render();
  }

  /* Corridor-style stages only allow travel along one direction. */
  if (stage.lockedDirection && (dx !== stage.lockedDirection.x || dy !== stage.lockedDirection.y)) {
    return;
  }

  const tx = state.playerTile.x + dx;
  const ty = state.playerTile.y + dy;
  const ch = tileAt(stage, tx, ty);

  if (ch === '#' || ch === 'P') return;   // walls and signposts are solid

  if (ch === 'B') {
    if (!state.bossesDefeated[stage.boss]) startBattle(stage.boss);
    return; // the boss tile is never walked onto
  }

  if (ch === 'K') return;                 // castle walls
  if (ch === 'G') { unlockCastle(); return; }
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
  if (state.inputLocked || state.battle !== null) return;
  if (!heldKeys.length) return;
  if (now - lastStepAt < STEP_MS) return;
  const dir = KEYS[heldKeys[heldKeys.length - 1]];
  if (!dir) return;
  lastStepAt = now;
  tryStep(dir.x, dir.y);
}

/* --- input ---------------------------------------------------------------- */
document.addEventListener('keydown', function (e) {
  retryBlockedTrack();   // first keypress is the gesture autoplay was waiting for
  if (replayArmed) { replay(); return; }

  /* In a fight the arrow keys drive the answer cursor, not the player. */
  if (state.battle !== null) {
    e.preventDefault();
    /* Ignore OS key-repeat on Enter, or holding it would skip whole lines. */
    if (e.key === 'Enter' || e.key === ' ') {
      if (e.repeat) return;
      if (state.battle.phase === 'question') answerQuestion(state.battle.selected);
      else advanceBattle();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { moveSelection(1); return; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { moveSelection(-1); return; }
    if (e.key >= '1' && e.key <= '9') answerQuestion(Number(e.key) - 1);
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

battleEl.addEventListener('click', function (e) {
  if (!state.battle) return;
  const btn = e.target.closest('button[data-choice]');
  if (btn) { answerQuestion(Number(btn.dataset.choice)); return; }
  /* Anywhere else in the panel advances the lines she has to read. */
  if (state.battle.phase !== 'question') advanceBattle();
});

/* --- castle: fireworks + banner ------------------------------------------- */
let replayArmed = false;

/* She has reached the gate: unlock the castle and set the celebration off. */
function unlockCastle() {
  if (state.castleUnlocked) return;
  state.castleUnlocked = true;
  playSound('castle-unlock');
  startCastle();
}

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
  state.castleUnlocked = false;
  state.outfit = 'default';
  state.worldVersion++;
  transitionTo('hub');
}

/* --- boot ----------------------------------------------------------------- */
installSprites();
render({ instant: true });
requestAnimationFrame(step);
