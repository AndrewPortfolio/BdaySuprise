/* ---------------------------------------------------------------------------
   data.js — all content/config for the game lives here.
   Phase 2 should only need to touch this file to swap in real boss content.
   --------------------------------------------------------------------------- */

/* Tile geometry. Everything on screen is a multiple of TILE. */
const TILE = 48;   /* 16px sprites drawn at 3x — stays crisp, no half pixels */
const VIEW_COLS = 15;
const VIEW_ROWS = 11;
const VIEW_W = TILE * VIEW_COLS; // 720
const VIEW_H = TILE * VIEW_ROWS; // 528

/* How long a single tile-step takes (ms). Camera + player tween over this. */
const STEP_MS = 140;
/* Half of a cut-screen transition (fade out, then fade in). */
const FADE_MS = 220;

/* Corridor travel direction. Easy to change later: {x:-1,y:0} for leftward,
   {x:0,y:-1} for upward, etc. The corridor map must match. */
const CORRIDOR_DIR = { x: 1, y: 0 };

/* ---------------------------------------------------------------------------
   Tile legend (used by every map below)
     #  wall                     .  floor
     1  path to Level 1          2  path to Level 2       3  path to Level 3
     D  door back to the Hub     B  boss marker
     P  wayfinding signpost (arrow re-points as bosses fall)
     E  Level 3 secret exit (hidden until all 3 bosses are down)
     C  corridor end -> Castle
   --------------------------------------------------------------------------- */

/* Hub: paths arranged in a triangle — Level 1 lower-left, Level 2 lower-right,
   Level 3 at the top-center apex. 23x23 tiles — larger than the viewport on
   both axes, so the camera scrolls with her as she walks. */
const HUB_MAP = [
  '#######################',
  '##########.3.##########',
  '##########...##########',
  '#########.....#########',
  '########.......########',
  '#######.........#######',
  '######...........######',
  '#####.............#####',
  '####...............####',
  '###.................###',
  '##...................##',
  '#.....................#',
  '#.....................#',
  '#.....................#',
  '#.....................#',
  '#.....................#',
  '#.....................#',
  '#1...................2#',
  '##...................##',
  '###.................###',
  '####......P........####',
  '#####.............#####',
  '#######################'
];

/* Level rooms are all the same shape: boss at the top, door back to the Hub at
   the bottom. `withExit` adds the Level 3-only second door on the right wall.
   11x9 tiles — smaller than the viewport, so the camera stays put here. */
function makeRoomMap(withExit) {
  return [
    '###########',
    '#.........#',
    '#....B....#',
    '#.........#',
    withExit ? '#.........E' : '#.........#',
    '#.........#',
    '#.........#',
    '#.........#',
    '#####D#####'
  ];
}

/* Corridor: one long lane, wider than the viewport so the camera scrolls. */
const CORRIDOR_MAP = [
  '###############################',
  '###############################',
  '..............................C',
  '###############################',
  '###############################'
];

const CASTLE_MAP = [
  '###############',
  '#.............#',
  '#.............#',
  '#.............#',
  '#.............#',
  '#.............#',
  '#.............#',
  '#.............#',
  '#.............#',
  '#.............#',
  '###############'
];

/* Boss config — one entry per level, kept as data so Phase 2 is a content
   change rather than a rebuild. `index` lines up with state.bossesDefeated. */
const BOSSES = [
  { index: 0, id: 'boss-1', name: 'Boss 1 (placeholder)', prompt: 'Do you want to continue?' },
  { index: 1, id: 'boss-2', name: 'Boss 2 (placeholder)', prompt: 'Do you want to continue?' },
  { index: 2, id: 'boss-3', name: 'Boss 3 (placeholder)', prompt: 'Do you want to continue?' }
];

/* Stages. `spawn` is where the player lands when the stage is entered — a
   cut-screen transition always resets the player to this tile. */
const STAGES = {
  hub: {
    id: 'hub',
    name: 'Hub',
    map: HUB_MAP,
    spawn: { x: 11, y: 21 }
  },
  level1: {
    id: 'level1',
    name: 'Level 1',
    map: makeRoomMap(false),
    spawn: { x: 5, y: 7 },
    boss: 0
  },
  level2: {
    id: 'level2',
    name: 'Level 2',
    map: makeRoomMap(false),
    spawn: { x: 5, y: 7 },
    boss: 1
  },
  level3: {
    id: 'level3',
    name: 'Level 3',
    map: makeRoomMap(true),
    spawn: { x: 5, y: 7 },
    boss: 2
  },
  corridor: {
    id: 'corridor',
    name: 'Corridor',
    map: CORRIDOR_MAP,
    spawn: { x: 0, y: 2 },
    /* Movement in this stage is restricted to one axis+direction. */
    lockedDirection: CORRIDOR_DIR
  },
  castle: {
    id: 'castle',
    name: 'Castle',
    map: CASTLE_MAP,
    spawn: { x: 7, y: 5 }
  }
};

/* Which hub path leads where, and which boss has to fall first.
   NOTE: this is deliberately NOT left-to-right order.
     '1' (lower-left)  -> Level 1, open from the start
     '2' (lower-right) -> Level 2, needs boss 1 down
     '3' (top apex)    -> Level 3, needs boss 2 down */
const HUB_PATHS = {
  '1': { target: 'level1', requiresBoss: null },
  '2': { target: 'level2', requiresBoss: 0 },
  '3': { target: 'level3', requiresBoss: 1 }
};

const BANNER_TEXT = "You've won 2 tickets to Disneyland!";
