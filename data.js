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

/* Corridor travel direction. Easy to change later: {x:1,y:0} for rightward,
   {x:0,y:-1} for upward, etc. The corridor map must match. */
const CORRIDOR_DIR = { x: 0, y: 1 };

/* ---------------------------------------------------------------------------
   Tile legend (used by every map below)
     #  wall                     .  floor
     1  path to Level 1          2  path to Level 2       3  path to Level 3
     D  door back to the Hub     B  boss marker
     P  wayfinding signpost (arrow re-points as bosses fall)
     E  Level 3 secret exit (hidden until all 3 bosses are down)
     C  corridor end -> Castle
     K  castle wall (solid)       G  castle gate — walk in to unlock the ending
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

/* Corridor: one long descent, taller than the viewport so the camera scrolls
   down with her. She can only step downward here. */
const CORRIDOR_MAP = [
  '###.###',
  '###.###',
  '###.###',
  '###.###',
  '###.###',
  '###.###',
  '###.###',
  '###.###',
  '###.###',
  '###.###',
  '###.###',
  '###.###',
  '###.###',
  '###.###',
  '###.###',
  '###.###',
  '###.###',
  '###.###',
  '###.###',
  '###.###',
  '###C###'
];

/* Castle grounds. She arrives at the bottom and walks up to the gate. */
const CASTLE_MAP = [
  '###############',
  '#..KKKKKKKKK..#',
  '#..KKKKKKKKK..#',
  '#..KKKKKKKKK..#',
  '#..KKKKKKKKK..#',
  '#..KKKKKKKKK..#',
  '#..KKKKKKKKK..#',
  '#..KKKKKKKKK..#',
  '#..KKKKGKKKK..#',
  '#.............#',
  '#.............#',
  '#.............#',
  '#.............#',
  '#.............#',
  '###############'
];

/* ---------------------------------------------------------------------------
   Outfits. `palette` overrides sprite-palette characters on every player
   sprite, so adding an outfit is one entry here and nothing else. 'P' is the
   sweats. state.outfit names the one she is wearing right now.
   --------------------------------------------------------------------------- */
const OUTFITS = {
  default:    { label: 'Grey sweats', palette: null },
  pinkSweats: { label: 'Pink sweats', palette: { P: '#FFA3C7' } }
};

/* ---------------------------------------------------------------------------
   Boss config — one entry per level. `index` lines up with state.bossesDefeated.

   A fight runs: intro line -> one question at a time -> victory line.
   Every correct answer knocks `damagePerAnswer` off the boss. Wrong answers
   cost nothing — the player cannot die and retries are unlimited — so
   hp / damagePerAnswer must equal questions.length.

   Each question is:
     ask      the question text
     choices  the buttons, in the order they appear on screen
     correct  index into `choices` of the right one (0 = first button)

   The WRONG choices below are placeholders. Swap the strings for whatever you
   want; only keep `correct` pointing at the right one.
   --------------------------------------------------------------------------- */
const BOSSES = [
  {
    index: 0,
    id: 'boss-1',
    name: 'Brandy Boss',
    subtitle: 'Brandy Melville',
    hp: 75,
    damagePerAnswer: 25,
    intro: "These are the last pink sweats in the store. I'll give them to you if you can answer these three math questions.",
    victory: 'You were a formidable. Here are these pink sweats.',
    /* Handed over the moment she goes down, so the player is wearing these when
       she lands back in the lobby on her way to Level 2. */
    reward: { outfit: 'pinkSweats', toast: 'Got the pink sweats!' },
    /* Said each time she loses hp. Used in order, then held on the last one. */
    hitLines: [
      '...Fine. That one was easy.',
      "Lucky guess. Don't get comfortable.",
      'Hmph.'
    ],
    /* Said on a wrong answer. Nothing else happens — try again. */
    wrongLines: [
      'Ugh. Not even close, sweetie.',
      'Do you even shop here? Try again.',
      "That's a no from me. Again.",
      "I'll wait. I have all day."
    ],
    questions: [
      { ask: '2 + 2 = ?',   choices: ['6', '4', '22', '2'],        correct: 1 },  /* -> 4 */
      { ask: '5 x 7 = ?',   choices: ['30', '12', '35', '57'],     correct: 2 },  /* -> 35 */
      { ask: '13 x 12 = ?', choices: ['144', '156', '169', 'IDK'], correct: 1 }   /* -> 156 */
    ]
  },
  {
    index: 1,
    id: 'boss-2',
    name: 'Boss 2 (placeholder)',
    subtitle: 'Level 2',
    hp: 75,
    damagePerAnswer: 25,
    intro: 'Placeholder intro line for the second boss.',
    victory: 'Placeholder victory line for the second boss.',
    reward: null,
    hitLines: ['Placeholder hit line.'],
    wrongLines: ['Placeholder wrong-answer line.'],
    questions: [
      { ask: 'Placeholder question 1',
        choices: ['Right answer', 'Placeholder', 'Placeholder', 'Placeholder'], correct: 0 },
      { ask: 'Placeholder question 2',
        choices: ['Placeholder', 'Right answer', 'Placeholder', 'Placeholder'], correct: 1 },
      { ask: 'Placeholder question 3',
        choices: ['Placeholder', 'Placeholder', 'Right answer', 'Placeholder'], correct: 2 }
    ]
  },
  {
    index: 2,
    id: 'boss-3',
    name: 'Boss 3 (placeholder)',
    subtitle: 'Level 3',
    hp: 75,
    damagePerAnswer: 25,
    intro: 'Placeholder intro line for the third boss.',
    victory: 'Placeholder victory line for the third boss.',
    reward: null,
    hitLines: ['Placeholder hit line.'],
    wrongLines: ['Placeholder wrong-answer line.'],
    questions: [
      { ask: 'Placeholder question 1',
        choices: ['Right answer', 'Placeholder', 'Placeholder', 'Placeholder'], correct: 0 },
      { ask: 'Placeholder question 2',
        choices: ['Placeholder', 'Right answer', 'Placeholder', 'Placeholder'], correct: 1 },
      { ask: 'Placeholder question 3',
        choices: ['Placeholder', 'Placeholder', 'Right answer', 'Placeholder'], correct: 2 }
    ]
  }
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
    spawn: { x: 3, y: 0 },
    /* Movement in this stage is restricted to one axis+direction. */
    lockedDirection: CORRIDOR_DIR
  },
  castle: {
    id: 'castle',
    name: 'Castle',
    map: CASTLE_MAP,
    spawn: { x: 7, y: 13 },
    /* Artwork drawn across a block of tiles; the tiles themselves are solid in
       the map above. Relative path, so it works locally and once deployed. */
    structure: { src: './pinkCastle.png', x: 3, y: 1, w: 9, h: 8 }
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

/* Audio. Relative paths, so it works locally and once deployed. The boss track
   loops from the moment she walks into a boss room until that boss is down. */
const AUDIO = {
  bossMusic: './audio/FightingBossMusic.mp3'
};

const BANNER_TEXT = "You've won 2 tickets to Disneyland!";
