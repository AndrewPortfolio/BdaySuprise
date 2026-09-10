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
     x  shop fitting (solid; the art over it comes from the stage's prop list)
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
   11x9 tiles — smaller than the viewport, so the camera stays put here.

   `shopFittings` fills the two clothing shops out: rails down both side walls
   and folded stacks below them. They are solid, and the column she walks up to
   reach the boss stays clear. The art sits in the stage's `props`. */
function makeRoomMap(opts) {
  const o = opts || {};
  const racks  = o.fittings ? '#xxx...xxx#' : '#.........#';
  const stacks = o.fittings ? '#xx.....xx#' : '#.........#';
  /* June is two tiles wide, so the tiles his art overhangs are solid too —
     otherwise she could stand inside him. */
  const bossRow = o.wideBoss ? '#...xBx...#' : '#....B....#';
  return [
    '###########',
    '#.........#',
    bossRow,
    racks,
    o.exit ? '#.........E' : '#.........#',
    '#.........#',
    stacks,
    '#.........#',
    '#####D#####'
  ];
}

/* The fittings for one shop, in the layout makeRoomMap marks solid above.
   `shop` picks the colourway the racks are rasterized in. */
function shopProps(shop) {
  return [
    { sprite: 'clothingRack', shop: shop, x: 1, y: 3, w: 3, h: 1 },
    { sprite: 'clothingRack', shop: shop, x: 7, y: 3, w: 3, h: 1 },
    { sprite: 'clothesStack', shop: shop, x: 1, y: 6, w: 2, h: 1 },
    { sprite: 'clothesStack', shop: shop, x: 8, y: 6, w: 2, h: 1 }
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

/* Castle grounds. She arrives at the bottom and walks up to the gate. This map
   is exactly one viewport (15x11), so the camera never scrolls here and the
   whole castle — spire included — is always in frame. */
const CASTLE_MAP = [
  '###############',
  '#..KKKKKKKKK..#',
  '#..KKKKKKKKK..#',
  '#..KKKKKKKKK..#',
  '#..KKKKKKKKK..#',
  '#..KKKKKKKKK..#',
  '#..KKKKKKKKK..#',
  '#..KKKKGKKKK..#',
  '#.............#',
  '#.............#',
  '###############'
];

/* Audio. Relative paths, so it works locally and once deployed. The boss track
   loops from the moment she walks into a boss room until that boss is down.
   Spaces are percent-encoded so the URL needs no quoting anywhere. */
const AUDIO = {
  bossMusic: './audio/FightingBossMusic.mp3',
  finaleMusic: './audio/Walt%20Disney%20Theme%20Song.mp3'
};

/* The finale track does not simply loop: it plays once end to end, and then
   repeats one section of itself `times` more times before going quiet.
   start/end are seconds into the file. */
const FINALE_LOOP = { start: 7, end: 21, times: 10 };

/* Sound effects. Anything playSound() is called with that is NOT listed here
   is still just a console line, so adding a sound is one entry. */
const SFX = {
  punch: './audio/punch.mp3'
};

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

   A quiz fight runs: intro line -> one question at a time -> victory line.
   Every correct answer knocks `damagePerAnswer` off the boss. Wrong answers
   cost nothing — the player cannot die and retries are unlimited — so
   hp / damagePerAnswer must equal questions.length.

   A `mode: 'punch'` fight runs: intro line -> Enter throws a punch, over and
   over, each one worth `damagePerAnswer` -> at 0 hp he asks his one question
   (`beaten` is the line he asks it with) -> victory line. So there
   hp / damagePerAnswer is the number of punches, and questions.length is 1.

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
    name: 'Alex Earle',
    subtitle: 'Brandy Melville',
    hp: 75,
    damagePerAnswer: 25,
    intro: "These are the last pink sweats in the store. I'll give them to you if you can answer these three math questions.",
    victory: 'You were a formidable. Here are these pink sweats.',
    /* Handed over the moment she goes down, so the player is wearing these when
       she lands back in the lobby on her way to Level 2. */
    reward: {
      outfit: 'pinkSweats',
      toast: 'Got the pink sweats!',
      prompt: 'press Enter to take them'
    },
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
    name: 'Kim Kardashian',
    subtitle: 'Skims',
    /* Two riddles, so hp is 50 here — hp / damagePerAnswer must equal
       questions.length. */
    hp: 50,
    damagePerAnswer: 25,
    intro: "Nobody gets past the fitting room without solving my riddles. Two of them. Take your time.",
    victory: "Riddled out, fair and square. The way through is yours.",
    reward: null,
    hitLines: [
      'Hm. You have been paying attention.',
      'Fine. That was the last one.'
    ],
    wrongLines: [
      'Not it. Think again.',
      'Cute answer. Wrong answer.',
      "That's not the one. Once more."
    ],
    questions: [
      { ask: 'What has to be broken before you can use it?',
        choices: ['A promise', 'An egg', 'A record', 'A rule'], correct: 1 },
      { ask: "I'm tall when I'm young, and I'm short when I'm old. What am I?",
        choices: ['A candle', 'A tree', 'A shadow', 'A mountain'], correct: 0 }
    ]
  },
  {
    index: 2,
    id: 'boss-3',
    name: 'June',
    subtitle: 'Final Boss',
    /* Not a quiz: Enter throws a punch. 75 / 15 = five punches to put him
       down, and only then does he ask his question. */
    mode: 'punch',
    hp: 75,
    damagePerAnswer: 15,
    intro: "So you want the key to the castle. It's right here in my pocket. Come and take it.",
    /* Said the moment the last punch lands — the line he asks his question with. */
    beaten: "Okay! Okay. You win. One question and the key is yours.",
    victory: "...Yeah. Yeah, he is. Here — take the key. Go get your girl her castle.",
    reward: {
      key: true,
      toast: 'Got the castle key!',
      prompt: 'press Enter to take the key'
    },
    /* One per punch, in order — the fifth punch drops him, so `beaten` covers
       that one and this list only needs the four before it. */
    hitLines: [
      'Ow. Okay, that one was free.',
      "That all you've got?",
      "...Okay, that one actually hurt.",
      'Hold on — hold on —'
    ],
    wrongLines: [
      'Absolutely not. Try again.',
      "Wrong, and you know it's wrong.",
      'Nope. Think about it.'
    ],
    questions: [
      { ask: "Who's the best BF in the world?",
        choices: ['June', 'Andrew Pham', 'Ryan Gosling', "It's a trick question"],
        correct: 1 }
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
    spawn: { x: 11, y: 21 },
    /* The board naming each shop, on the floor tile she walks up to it from —
       above the two lower doors, below the one at the apex. A sign greys out
       with its shop while that shop is still shuttered. */
    signs: [
      { path: '1', label: 'Brandy Melville', x: 1,  y: 16 },
      { path: '2', label: 'Skims',           x: 21, y: 16 },
      { path: '3', label: "June's Store",    x: 11, y: 2  }
    ]
  },
  level1: {
    id: 'level1',
    name: 'Level 1',
    map: makeRoomMap({ fittings: true }),
    spawn: { x: 5, y: 7 },
    boss: 0,
    props: shopProps('brandy')
  },
  level2: {
    id: 'level2',
    name: 'Level 2',
    map: makeRoomMap({ fittings: true }),
    spawn: { x: 5, y: 7 },
    boss: 1,
    props: shopProps('skims')
  },
  level3: {
    id: 'level3',
    name: 'Level 3',
    map: makeRoomMap({ exit: true, wideBoss: true }),
    spawn: { x: 5, y: 7 },
    boss: 2
  },
  corridor: {
    id: 'corridor',
    name: 'Corridor',
    map: CORRIDOR_MAP,
    spawn: { x: 3, y: 0 },
    /* Movement in this stage is restricted to one axis+direction. */
    lockedDirection: CORRIDOR_DIR,
    /* Halfway down the descent the Disney theme starts. It is deliberately not
       tied to the stage change: it carries on through the castle and the
       fireworks without ever restarting. */
    musicCue: { y: 10, src: AUDIO.finaleMusic }
  },
  castle: {
    id: 'castle',
    name: 'Castle',
    map: CASTLE_MAP,
    spawn: { x: 7, y: 9 },
    /* Artwork drawn across a block of tiles; the tiles themselves are solid in
       the map above. Relative path, so it works locally and once deployed.
       8 x 7 tiles keeps the source image's proportions (584x525); it is half a
       tile narrower than the 9-wide wall block, which is invisible because
       those tiles are never painted. */
    structure: { src: './pinkCastle.png', x: 3.5, y: 1, w: 8, h: 7 }
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
