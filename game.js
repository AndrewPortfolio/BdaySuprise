/* The engine; all content and config lives in data.js.

   The two kinds of movement are kept separate on purpose: within a stage she
   steps tile by tile and the camera scrolls to follow, but between stages it is
   always a hard cut — fade out, swap, fade in — never a pan across a boundary. */

// --- state ---
const state = {
  currentScene: 'hub',
  bossesDefeated: [false, false, false],
  playerTile: { x: STAGES.hub.spawn.x, y: STAGES.hub.spawn.y },
  cameraOffset: { x: 0, y: 0 },
  facing: 'down',       // which way the sprite looks; she turns even when blocked
  outfit: 'default',    // key into OUTFITS — swapped by boss rewards
  hasKey: false,        // the castle key, handed over when the last boss falls
  battle: null,         // the live fight object while one is open, else null
  inputLocked: false,   // true during transitions and victory beats
  castleUnlocked: false,// set when she reaches the gate and the party starts
  worldVersion: 0       // bumped when the map's appearance changes (locks, doors)
};

/* --- sound effects ---

   Every sound gets a few elements, buffered at boot, and hits take them in turn.
   A cloned or freshly built element has to fetch the file before it makes a
   noise — even from cache that is not instant, and a punch that arrives late is
   worse than no punch. Rotating voices also lets fast punches overlap. */
const SFX_VOICES = 3;
const SFX_VOLUME = 0.7;
const sfxPool = {};

function loadSfx(src) {
  if (!sfxPool[src]) {
    const voices = [];
    for (let i = 0; i < SFX_VOICES; i++) {
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.volume = SFX_VOLUME;
      audio.load();
      voices.push(audio);
    }
    sfxPool[src] = { voices: voices, next: 0 };
  }
  return sfxPool[src];
}

function playSound(name) {
  const src = SFX[name];
  if (!src) {
    console.log('[playSound]', name);
    return;
  }
  const pool = loadSfx(src);
  const sfx = pool.voices[pool.next];
  pool.next = (pool.next + 1) % pool.voices.length;
  // A seek drops the element out of the buffered state it was preloaded into,
  // so only rewind a voice that has been used.
  if (sfx.currentTime !== 0) sfx.currentTime = 0;
  const started = sfx.play();
  if (started && started.catch) started.catch(function () {});
}

/* --- looping music ---

   One track at a time. Browsers refuse to start audio before the page has seen a
   real gesture, so a rejected play() is retried on her next keypress. */
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

// Called on keydown: if autoplay blocked us, that keypress is the gesture.
function retryBlockedTrack() {
  if (finaleBlocked) {
    finaleBlocked = false;
    resumeFinale();
  }
  if (!blockedTrack || !currentTrack || currentTrack.src !== blockedTrack) return;
  blockedTrack = null;
  const started = currentTrack.audio.play();
  if (started && started.catch) started.catch(function () {});
}

/* --- the finale track ---

   Not playLoop: this plays once end to end, then repeats the FINALE_LOOP section
   and goes quiet. Its own element, untouched by playLoop/stopLoop, so it carries
   across the corridor, the castle and the fireworks without a break.

   The section end is watched on a frame timer, not 'timeupdate' — that fires
   about four times a second and would overshoot by an audible margin. */
let finaleAudio = null;
let finalePassesLeft = 0;
let finaleWatch = 0;
let finaleBlocked = false;

function startFinaleMusic() {
  if (finaleAudio) return;   // already playing — a second cue must not restart it
  finaleAudio = new Audio(AUDIO.finaleMusic);
  finaleAudio.volume = 0.55;
  finaleAudio.loop = false;
  // Fires once: the section repeats never reach the end of the file.
  finaleAudio.addEventListener('ended', function () {
    finalePassesLeft = FINALE_LOOP.times;
    nextFinalePass();
  });
  playFinale();
}

/* One more pass of the section, or stop when they are all used.

   The seek is not instant, and until it lands currentTime still reads the old
   playhead — past the section end, which would have the watcher below eat every
   remaining pass within a few frames. So nothing plays and nothing is watched
   until 'seeked' says the playhead is back at the start. */
function nextFinalePass() {
  if (!finaleAudio) return;
  if (finalePassesLeft <= 0) { stopFinaleMusic(); return; }
  finalePassesLeft--;

  const audio = finaleAudio;
  audio.addEventListener('seeked', function () {
    if (finaleAudio !== audio) return;   // stopped while the seek was in flight
    playFinale();
    watchFinaleSection();
  }, { once: true });
  audio.currentTime = FINALE_LOOP.start;
}

function watchFinaleSection() {
  cancelAnimationFrame(finaleWatch);
  finaleWatch = requestAnimationFrame(function tick() {
    if (!finaleAudio) return;
    if (finaleAudio.currentTime >= FINALE_LOOP.end) { nextFinalePass(); return; }
    finaleWatch = requestAnimationFrame(tick);
  });
}

function playFinale() {
  const started = finaleAudio.play();
  if (started && started.catch) started.catch(function () { finaleBlocked = true; });
}

// Autoplay refused it: pick it up on her next keypress.
function resumeFinale() {
  if (!finaleAudio) return;
  playFinale();
  if (finaleAudio.currentTime >= FINALE_LOOP.start) watchFinaleSection();
}

function stopFinaleMusic() {
  cancelAnimationFrame(finaleWatch);
  finaleWatch = 0;
  finaleBlocked = false;
  finalePassesLeft = 0;
  if (!finaleAudio) return;
  finaleAudio.pause();
  finaleAudio = null;
}

// --- DOM ---
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
const menuEl = document.getElementById('menu');
const fireworksEl = document.getElementById('fireworks');
const bannerEl = document.getElementById('banner');
const bannerTextEl = document.getElementById('banner-text');

const playerEl = document.createElement('div');
playerEl.id = 'player';

viewportEl.style.width = VIEW_W + 'px';
viewportEl.style.height = VIEW_H + 'px';

// --- helpers ---
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

// --- rendering ---
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
    // Indistinguishable from wall until every boss is down.
    classes.push(allBossesDefeated() ? 'door door-exit' : 'wall');
  } else if (ch === 'K' || ch === 'G' || ch === 'x') {
    classes.push('castle-block');   // artwork covers these; no tile fill
  } else if (ch === 'P') {
    // Points at whichever shop is open next; -1 (all done) points up, onward.
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
  // Litter: art only, nothing to walk into.
  if (stage.decals) {
    stage.decals.forEach(function (decal) {
      const bit = document.createElement('div');
      bit.className = 'decal';
      bit.style.left = decal.x * TILE + 'px';
      bit.style.top = decal.y * TILE + 'px';
      bit.style.backgroundImage = 'var(--sprite-' + decal.sprite + ')';
      stageEl.appendChild(bit);
    });
  }

  // Shop fittings, over the tiles the map marked solid.
  if (stage.props) {
    stage.props.forEach(function (prop) {
      const art = document.createElement('div');
      art.className = 'prop';
      art.style.left = prop.x * TILE + 'px';
      art.style.top = prop.y * TILE + 'px';
      art.style.width = prop.w * TILE + 'px';
      art.style.height = prop.h * TILE + 'px';
      art.style.backgroundImage =
        'var(--sprite-' + prop.sprite + (prop.shop ? '--' + prop.shop : '') + ')';
      stageEl.appendChild(art);
    });
  }

  // Real text, because a shop name is unreadable drawn at 16x16.
  if (stage.signs) {
    stage.signs.forEach(function (sign) {
      const board = document.createElement('div');
      // Not the storefront's `locked` class: that one carries a position and a
      // shutter overlay meant for a tile.
      board.className = 'shop-sign' + (pathUnlocked(sign.path) ? '' : ' shut');
      board.textContent = sign.label;
      board.style.left = (sign.x + 0.5) * TILE + 'px';
      board.style.top = sign.y * TILE + 'px';
      stageEl.appendChild(board);
    });
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

// Follows the player, clamped to the stage. A stage smaller than the viewport
// is simply centred and never moves.
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

// --- transient message ---
let toastTimer = null;
function showToast(text, ms) {
  toastEl.textContent = text;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toastEl.hidden = true; }, ms || 900);
}

// --- cut-screen transition between stages ---
function transitionTo(sceneId) {
  if (state.inputLocked) return; // a cut-screen is already running
  state.inputLocked = true;
  playSound('transition');
  fadeEl.classList.add('on');

  setTimeout(function () {
    const next = STAGES[sceneId];
    state.currentScene = sceneId;
    // A stage change resets position and camera; nothing carries over.
    state.playerTile = { x: next.spawn.x, y: next.spawn.y };
    state.cameraOffset = { x: 0, y: 0 };
    state.battle = null;

    // The fight music loops until that boss is down or she leaves the room.
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

/* --- boss fight ---

   One template for every room; the difference is entirely BOSSES[i] in data.js.
   She cannot lose — a wrong answer draws a taunt and the same question stays up.

   Phases, each advanced by Enter: intro, question (or punch), hit, victory. */
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
    // Over a single question — the last boss's — the counter is just noise.
    battleAskEl.textContent = boss.questions.length > 1
      ? 'Q' + (battle.questionIndex + 1) + '/' + boss.questions.length + '  ' + question.ask
      : question.ask;
    buildChoices(battle, question);
  }

  battlePromptEl.hidden = asking;
  if (!asking) {
    if (battle.phase === 'punch') {
      battlePromptEl.textContent = promptText('press Enter to punch');
    } else if (battle.phase === 'victory') {
      battlePromptEl.textContent = promptText((boss.reward && boss.reward.prompt) || 'press Enter');
    } else {
      battlePromptEl.textContent = promptText('press Enter');
    }
  }
}

// Rebuilt only when the question changes, so a wrong pick does not yank the row
// out from under the cursor.
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

  // Wrong costs nothing: rule the choice out and let her pick again.
  if (choiceIndex !== question.correct) {
    if (battle.wrongPicks.indexOf(choiceIndex) === -1) battle.wrongPicks.push(choiceIndex);
    battle.line = boss.wrongLines[battle.wrongCount % boss.wrongLines.length];
    battle.wrongCount++;
    playSound('answer-wrong');
    render();
    return;
  }

  // In a punch fight his hp is already gone, so the answer ends it.
  if (boss.mode === 'punch') {
    battle.phase = 'victory';
    battle.line = boss.victory;
    playSound('boss-defeated');
    render();
    return;
  }

  // She reacts before the next question comes up.
  battle.hp = Math.max(0, battle.hp - boss.damagePerAnswer);
  battle.line = boss.hitLines[Math.min(battle.hitCount, boss.hitLines.length - 1)];
  battle.hitCount++;
  battle.phase = 'hit';
  playSound('boss-hit');
  render();
}

// The last punch draws no hit line: it drops him, and he asks his question.
function throwPunch(battle, boss) {
  battle.hp = Math.max(0, battle.hp - boss.damagePerAnswer);
  playSound('punch');

  if (battle.hp <= 0) {
    battle.line = boss.beaten;
    battle.phase = 'question';
    battle.selected = 0;
  } else {
    battle.line = boss.hitLines[Math.min(battle.hitCount, boss.hitLines.length - 1)];
    battle.hitCount++;
  }
  render();
  flashHit();   // after the render, which rewrites the portrait's class
}

// Restarted from zero on every punch, so fast punches each shake.
function flashHit() {
  battlePortraitEl.classList.remove('hit');
  void battlePortraitEl.offsetWidth;
  battlePortraitEl.classList.add('hit');
}

// Enter/Space is the only thing that moves intro, hit and victory along.
function advanceBattle() {
  const battle = state.battle;
  if (!battle) return;
  const boss = BOSSES[battle.bossIndex];

  if (battle.phase === 'intro') {
    battle.phase = boss.mode === 'punch' ? 'punch' : 'question';
    render();
    return;
  }

  // Every Enter is one more punch until he is down.
  if (battle.phase === 'punch') {
    throwPunch(battle, boss);
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

  // Before the transition, so she is already wearing it when the lobby returns.
  if (boss.reward && boss.reward.outfit) {
    state.outfit = boss.reward.outfit;
    playSound('reward');
  }
  if (boss.reward && boss.reward.key) {
    state.hasKey = true;
    playSound('reward');
  }
  endBattle();

  const finished = allBossesDefeated();
  if (finished) playSound('door-unlock');
  showToast((boss.reward && boss.reward.toast) || 'Victory!', 1200);

  setTimeout(function () {
    state.inputLocked = false;
    // The last victory reveals the Level 3 exit, so she stays to walk through it.
    if (!finished) transitionTo('hub');
  }, 1200);
}

// --- movement ---
const KEYS = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }
};

const heldKeys = [];   // most recently pressed key wins
let lastStepAt = 0;

function tryStep(dx, dy) {
  // Nothing moves during a transition, a victory beat, or an open fight.
  if (state.inputLocked || state.battle !== null) return;

  const stage = stageOf();

  // She turns to face the way she is pushing even when the step is refused.
  const facing = dy < 0 ? 'up' : dy > 0 ? 'down' : dx < 0 ? 'left' : 'right';
  if (state.facing !== facing) {
    state.facing = facing;
    render();
  }

  // Corridor-style stages allow travel along one direction only.
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
  if (ch === 'x') return;                 // racks and shelves are furniture
  if (ch === 'G') {
    if (!state.hasKey) {
      playSound('locked');
      showToast('The gate is locked. The key is the last boss\'s.', 1200);
      return;
    }
    unlockCastle();
    return;
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
  // From here the finale track runs unbroken through the gate and the banner.
  if (stage.musicCue && ty >= stage.musicCue.y) startFinaleMusic();
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

/* --- input ---

   Every press goes through pressKey, whatever sent it — a real key or a tap on
   the on-screen pad — so the two can never drift apart. It answers whether the
   press was the game's to handle, which is what tells a keydown to swallow it.
   `repeated` is the OS auto-repeat of a held key; a tap is never one. */
function pressKey(key, repeated) {
  retryBlockedTrack();   // the first press is the gesture autoplay was waiting for

  if (menuOpen) {
    if (key === 'Enter' || key === ' ') { startGame(); return true; }
    return false;
  }

  if (replayArmed) { replay(); return true; }

  // In a fight the arrow keys drive the answer cursor, not the player.
  if (state.battle !== null) {
    if (key === 'Enter' || key === ' ') {
      // Repeats are dropped, or holding Enter would skip whole lines.
      if (repeated) return true;
      if (state.battle.phase === 'question') answerQuestion(state.battle.selected);
      else advanceBattle();
      return true;
    }
    if (key === 'ArrowDown' || key === 'ArrowRight') { moveSelection(1); return true; }
    if (key === 'ArrowUp' || key === 'ArrowLeft') { moveSelection(-1); return true; }
    if (key >= '1' && key <= '9') answerQuestion(Number(key) - 1);
    return true;   // nothing else reaches the map while a fight is open
  }

  if (KEYS[key]) {
    if (heldKeys.indexOf(key) === -1) {
      heldKeys.push(key);
      /* The first step is taken here and now, not left to the next frame of
         step(): a quick tap on the d-pad can be over inside a frame, and the
         step would go with it. From here on step() handles the repeat. */
      lastStepAt = performance.now();
      tryStep(KEYS[key].x, KEYS[key].y);
    }
    return true;
  }

  return false;
}

function releaseKey(key) {
  const i = heldKeys.indexOf(key);
  if (i !== -1) heldKeys.splice(i, 1);
}

document.addEventListener('keydown', function (e) {
  if (pressKey(e.key, e.repeat)) e.preventDefault();
});

document.addEventListener('keyup', function (e) { releaseKey(e.key); });

// Held keys would otherwise stick if focus left the window mid-step.
window.addEventListener('blur', function () { heldKeys.length = 0; });

battleEl.addEventListener('click', function (e) {
  if (!state.battle) return;
  const btn = e.target.closest('button[data-choice]');
  if (btn) { answerQuestion(Number(btn.dataset.choice)); return; }
  // Anywhere else in the panel advances the lines she has to read.
  if (state.battle.phase !== 'question') advanceBattle();
});

/* --- touch ---

   A coarse pointer gets a d-pad and an A button. They feed pressKey/releaseKey,
   so a tap is a keypress in every way that matters — including counting as the
   gesture blocked audio is waiting for, since play() is reached synchronously
   from the pointerdown. Nothing here runs on a desktop. */
const touchEl = document.getElementById('touch');
const hintEl = document.getElementById('hint');
const menuStartEl = document.getElementById('menu-start');
const bannerSubEl = document.getElementById('banner-sub');

const touchMode = window.matchMedia('(pointer: coarse)').matches;

// Re-labels a prompt written for a keyboard. A no-op unless the pad is up.
function promptText(text) {
  if (!touchMode) return text;
  return text.replace(TOUCH_TEXT.keyName, TOUCH_TEXT.buttonName);
}

function bindPadButton(btn) {
  const key = btn.dataset.key;

  btn.addEventListener('pointerdown', function (e) {
    e.preventDefault();   // no focus ring, no synthesised click, no zoom
    btn.classList.add('held');
    pressKey(key, false);
    /* Capture keeps a finger that slides off the button still driving it, and
       guarantees the pointerup. It is a nicety though, not the input path, so
       the press above happens first and a browser that refuses the capture
       still gets a working button. */
    try { btn.setPointerCapture(e.pointerId); } catch (err) { /* not captureable */ }
  });

  function release() {
    if (!btn.classList.contains('held')) return;
    btn.classList.remove('held');
    releaseKey(key);
  }
  btn.addEventListener('pointerup', release);
  btn.addEventListener('pointercancel', release);
  // iOS pops a callout on a long press otherwise.
  btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
}

/* How wide a strip the floating pad needs at each edge — measured off what
   style.css actually drew, so the two can't disagree at a given screen size. */
function padGutter() {
  const dpad = document.getElementById('dpad');
  const btnA = document.getElementById('btn-a');
  return Math.max(dpad.offsetWidth, btnA.offsetWidth) + 24;
}

function setUpTouch() {
  if (!touchMode) return;

  document.body.classList.add('touch');   // the larger overlay type in style.css
  touchEl.hidden = false;
  const buttons = touchEl.querySelectorAll('button[data-key]');
  for (let i = 0; i < buttons.length; i++) bindPadButton(buttons[i]);

  hintEl.textContent = TOUCH_TEXT.hint;
  menuStartEl.textContent = TOUCH_TEXT.menuStart;
  bannerSubEl.textContent = TOUCH_TEXT.bannerSub;

  /* The title card and the replay card both say "tap anywhere", so they mean
     it — the A button works too, but reaching for it is not the instinct. The
     fight panel has its own click handler and is never open at these moments. */
  viewportEl.addEventListener('pointerdown', function (e) {
    if (!menuOpen && !replayArmed) return;
    e.preventDefault();
    pressKey('Enter', false);
  });
}

/* --- fitting the screen ---

   The stage is a fixed 15x11 grid of 48px art. Rather than reflow any of it for
   a small screen, the whole block is scaled down as one piece, so the art keeps
   its ratio and every layout inside it stays exactly as designed. #game is out
   of flow, so offset sizes below are its natural unscaled ones; #fit is what the
   page lays out, and is sized to the scaled result. */
const fitEl = document.getElementById('fit');
const gameEl = document.getElementById('game');

function fitToScreen() {
  const natW = gameEl.offsetWidth;
  const natH = gameEl.offsetHeight;
  if (!natW || !natH) return;

  /* What the pad has already claimed. Upright it sits under the stage and costs
     height; held sideways there is none to give, so style.css floats it over
     the screen instead and it costs width — the stage has to stay narrow enough
     to leave a clear gutter down each side for it to land in. Which of the two
     is in force is read back off the element rather than re-decided here. */
  const padInFlow = !touchEl.hidden && getComputedStyle(touchEl).position !== 'fixed';
  let availW = window.innerWidth - 16;
  let availH = window.innerHeight - 16;
  if (padInFlow) availH -= touchEl.offsetHeight + 10;
  else if (!touchEl.hidden) availW -= 2 * padGutter();

  // Never scaled up: at 1x the art is already at its intended 3x pixel size.
  const scale = Math.min(availW / natW, availH / natH, 1);

  gameEl.style.transform = 'scale(' + scale + ')';
  fitEl.style.width = Math.round(natW * scale) + 'px';
  fitEl.style.height = Math.round(natH * scale) + 'px';
}

window.addEventListener('resize', fitToScreen);
window.addEventListener('orientationchange', fitToScreen);

// --- title screen ---
// Nothing else reads input while it is up, and the keypress that dismisses it is
// also the gesture the audio was waiting for.
let menuOpen = true;

function startGame() {
  if (!menuOpen) return;
  menuOpen = false;
  menuEl.hidden = true;
  state.inputLocked = false;
  playSound('game-start');
}

// --- castle: fireworks + banner ---
let replayArmed = false;

// She has reached the gate.
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
    // Out of the middle band, so the banner never hides them.
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
  state.hasKey = false;
  stopFinaleMusic();
  state.worldVersion++;
  transitionTo('hub');
}

// --- boot ---
installSprites();
for (const name in SFX) loadSfx(SFX[name]);   // fetched before they are needed
state.inputLocked = true;                     // she is on the title screen
setUpTouch();                                 // before the fit: the pad takes room
render({ instant: true });
fitToScreen();
// The first fit measures text that web-font and image loads can still resize.
window.addEventListener('load', fitToScreen);
requestAnimationFrame(step);
