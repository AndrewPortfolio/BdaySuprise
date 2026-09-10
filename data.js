// All the game's content and config. game.js is the engine and reads this.

const TILE = 48;   // 16px sprites at 3x — crisp, no half pixels
const VIEW_COLS = 15;
const VIEW_ROWS = 11;
const VIEW_W = TILE * VIEW_COLS;
const VIEW_H = TILE * VIEW_ROWS;

const STEP_MS = 140;
const FADE_MS = 220;   // half a transition: fade out, then fade in

// The corridor map has to match this direction.
const CORRIDOR_DIR = { x: 0, y: 1 };

/* Tile legend for every map below.
     #  wall                     .  floor
     1  path to Level 1          2  path to Level 2       3  path to Level 3
     D  door back to the Hub     B  boss marker
     P  wayfinding signpost (arrow re-points as bosses fall)
     E  Level 3 secret exit (hidden until all 3 bosses are down)
     C  corridor end -> Castle
     K  castle wall (solid)       G  castle gate — walk in to unlock the ending
     x  shop fitting (solid; the art over it comes from the stage's prop list) */

// 23x23 — larger than the viewport both ways, so the camera scrolls with her.
// Level 1 lower-left, Level 2 lower-right, Level 3 at the top apex.
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

// Every level room is the same shape. 11x9 — smaller than the viewport, so the
// camera stays put. Fittings are solid; the column she walks up to reach the
// boss stays clear either way.
function makeRoomMap(opts) {
  const o = opts || {};
  const racks  = o.fittings ? '#xxx...xxx#' : '#.........#';
  const stacks = o.fittings ? '#xx.....xx#' : '#.........#';
  // June is two tiles wide, so the tiles his art overhangs are solid too —
  // otherwise she could stand inside him.
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

// Decals are decoration only — not in the map, so she walks straight over them.
// Positions are in tiles, fractional so the litter does not sit on a grid.
const JUNE_TRASH = [
  // Banked up against him: above, either side, underfoot.
  { sprite: 'trashCan',   x: 5.5, y: 1.1 },
  { sprite: 'trashPaper', x: 4.3, y: 1.1 },
  { sprite: 'trashCan',   x: 3.1, y: 1.2 },
  { sprite: 'trashPaper', x: 6.6, y: 1.1 },
  { sprite: 'trashSock',  x: 2.9, y: 2.6 },
  { sprite: 'trashShoe',  x: 6.9, y: 2.6 },
  { sprite: 'trashSpill', x: 4.4, y: 2.9 },
  { sprite: 'trashBag',   x: 5.1, y: 3.1 },
  { sprite: 'trashShirt', x: 3.4, y: 3.2 },
  { sprite: 'trashPizza', x: 6.3, y: 3.3 },
  { sprite: 'trashBox',   x: 1.6, y: 1.5 },
  { sprite: 'trashSock',  x: 8.0, y: 1.4 },
  { sprite: 'trashBag',   x: 2.2, y: 2.4 },
  { sprite: 'trashSpill', x: 7.3, y: 2.2 },
  // Thinning out towards the door she comes in by.
  { sprite: 'trashCan',   x: 4.5, y: 4.0 },
  { sprite: 'trashShoe',  x: 2.6, y: 4.1 },
  { sprite: 'trashPaper', x: 7.5, y: 3.9 },
  { sprite: 'trashSpill', x: 4.0, y: 4.7 },
  { sprite: 'trashCan',   x: 2.2, y: 5.4 },
  { sprite: 'trashShirt', x: 7.0, y: 5.2 },
  { sprite: 'trashPaper', x: 4.3, y: 5.9 },
  { sprite: 'trashPizza', x: 6.6, y: 6.1 }
];

// Matches the tiles makeRoomMap marks solid. `shop` picks the colourway.
function shopProps(shop) {
  return [
    { sprite: 'clothingRack', shop: shop, x: 1, y: 3, w: 3, h: 1 },
    { sprite: 'clothingRack', shop: shop, x: 7, y: 3, w: 3, h: 1 },
    { sprite: 'clothesStack', shop: shop, x: 1, y: 6, w: 2, h: 1 },
    { sprite: 'clothesStack', shop: shop, x: 8, y: 6, w: 2, h: 1 }
  ];
}

// Taller than the viewport, so the camera scrolls down with her.
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

// Exactly one viewport (15x11), so the camera never scrolls and the whole
// castle — spire included — is always in frame.
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

// Relative paths, so this works locally and deployed. Spaces are
// percent-encoded so the URL needs no quoting anywhere.
const AUDIO = {
  bossMusic: './audio/FightingBossMusic.mp3',
  finaleMusic: './audio/Walt%20Disney%20Theme%20Song.mp3'
};

// The finale track plays once end to end, then repeats this section `times`
// more times before going quiet. Seconds into the file.
const FINALE_LOOP = { start: 7, end: 21, times: 10 };

// A name that is not listed here stays a console line, so adding a sound is one
// entry. The fireworks are deliberately absent: the finale track plays over that
// whole scene and the two together were a mess.
const SFX = {
  punch: './audio/punch.mp3'
};

// `palette` overrides sprite-palette characters on every player sprite, so
// adding an outfit is one entry here and nothing else. 'P' is the sweats.
const OUTFITS = {
  default:    { label: 'Grey sweats', palette: null },
  pinkSweats: { label: 'Pink sweats', palette: { P: '#FFA3C7' } }
};

/* One entry per level; `index` lines up with state.bossesDefeated.

   A quiz fight is intro -> questions -> victory, and every correct answer takes
   `damagePerAnswer` off. Wrong answers cost nothing — she cannot lose and
   retries are unlimited — so hp / damagePerAnswer must equal questions.length.

   A punch fight (`mode: 'punch'`) is intro -> a punch per Enter -> at 0 hp his
   one question (`beaten` is the line he asks it with) -> victory. There
   hp / damagePerAnswer is the punch count instead. */
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
    // Handed over the moment she goes down, so she is wearing them by the time
    // the lobby fades back in.
    reward: {
      outfit: 'pinkSweats',
      toast: 'Got the pink sweats!',
      prompt: 'press Enter to take them'
    },
    // Used in order, then held on the last one.
    hitLines: [
      '...Fine. That one was easy.',
      "Lucky guess. Don't get comfortable.",
      'Hmph.'
    ],
    wrongLines: [
      'Ugh. Not even close, sweetie.',
      'Do you even shop here? Try again.',
      "That's a no from me. Again.",
      "I'll wait. I have all day."
    ],
    questions: [
      { ask: '2 + 2 = ?',   choices: ['6', '4', '22', '2'],        correct: 1 },  // -> 4
      { ask: '5 x 7 = ?',   choices: ['30', '12', '35', '57'],     correct: 2 },  // -> 35
      { ask: '13 x 12 = ?', choices: ['144', '156', '169', 'IDK'], correct: 1 }   // -> 156
    ]
  },
  {
    index: 1,
    id: 'boss-2',
    name: 'Kim Kardashian',
    subtitle: 'Skims',
    // Two riddles, so hp is 50: hp / damagePerAnswer must equal questions.length.
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
    // Five punches to put him down, and only then does he ask his question.
    mode: 'punch',
    hp: 75,
    damagePerAnswer: 15,
    intro: "So you want the key to the castle. It's right here in my pocket. Come and take it.",
    // The line he asks his question with, the moment the last punch lands.
    beaten: "Okay! Okay. You win. One question and the key is yours.",
    victory: "...Yeah. Yeah, he is. Here — take the key. Go get your girl her castle.",
    reward: {
      key: true,
      toast: 'Got the castle key!',
      prompt: 'press Enter to take the key'
    },
    // The fifth punch drops him and `beaten` covers that one, so four is enough.
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

// A transition always resets the player to the stage's `spawn`.
const STAGES = {
  hub: {
    id: 'hub',
    name: 'Hub',
    map: HUB_MAP,
    spawn: { x: 11, y: 21 },
    // On the floor tile she approaches each shop from: above the two lower
    // doors, below the one at the apex.
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
    boss: 2,
    decals: JUNE_TRASH
  },
  corridor: {
    id: 'corridor',
    name: 'Corridor',
    map: CORRIDOR_MAP,
    spawn: { x: 3, y: 0 },
    lockedDirection: CORRIDOR_DIR,
    // Deliberately not tied to the stage change: the theme carries on through
    // the castle and the fireworks without ever restarting.
    musicCue: { y: 10, src: AUDIO.finaleMusic }
  },
  castle: {
    id: 'castle',
    name: 'Castle',
    map: CASTLE_MAP,
    spawn: { x: 7, y: 9 },
    // 8x7 keeps the source image's proportions (584x525). It is half a tile
    // narrower than the wall block, which shows because those tiles are never
    // painted.
    structure: { src: './pinkCastle.png', x: 3.5, y: 1, w: 8, h: 7 }
  }
};

// Which hub path leads where, and which boss has to fall first. Deliberately
// not left-to-right: '1' is lower-left, '2' lower-right, '3' the top apex.
const HUB_PATHS = {
  '1': { target: 'level1', requiresBoss: null },
  '2': { target: 'level2', requiresBoss: 0 },
  '3': { target: 'level3', requiresBoss: 1 }
};

const BANNER_TEXT = "You've won 2 tickets to Disneyland!";

// Every line that names a key, restated for the on-screen pad. Swapped in when
// the page opens on a touch device — see setUpTouch() in game.js.
const TOUCH_TEXT = {
  hint: 'D-pad to move · walk into a path, door or boss to interact',
  menuStart: 'tap anywhere to start playing',
  bannerSub: 'tap anywhere to replay',
  // Battle prompts are written for a keyboard, here and in game.js alike, so
  // one substring swap re-labels the lot rather than duplicating every string.
  keyName: 'press Enter',
  buttonName: 'tap A'
};
