// Pixel art as string maps, rasterized to data: URLs at boot — no image files,
// so nothing breaks under file:// or once deployed. Sprites are 16x16 unless a
// comment says otherwise, and every row of one must be the same width.

const PALETTE = {
  '.': null,                    // transparent
  K: 'rgba(0,0,0,0.16)',        // ground shadow
  A: '#6b7280',                 // sign board (recoloured per storefront awning)
  p: '#9aa0ab',                 // sign post
  d: '#2b3040',                 // shop interior / glass
  X: '#22222c',                 // sprite outline
  S: '#f2c795',                 // skin
  E: '#2a2a35',                 // eye
  W: '#fdfdfd',                 // white detail
  H: '#3d2a1d',                 // dark brown hair
  h: '#543926',                 // hair highlight / centre part
  N: '#17171c',                 // black tube top
  P: '#D3D3D3',                 // light grey sweats (recoloured per outfit)
  // Brandy Boss
  Y: '#e6c56f',                 // blonde bob
  M: '#e3cdb8',                 // mannequin plastic
  R: '#c95d7e',                 // pursed lip
  Q: '#FFA3C7',                 // the pink sweats she is guarding
  // Skims Boss
  B: '#241d2b',                 // black hair
  b: '#4a3f56',                 // hair sheen / centre part
  D: '#4f4956',                 // dark Skims dress — kept off the outline colour
                                //   so the silhouette does not go to one blob
  // June
  T: '#D2B48C',                 // his skin
  v: '#4a5f7a',                 // his shirt
  // The mess around him
  c: '#c0392b',                 // soda red / pepperoni / a dumped tee
  g: '#c9ced6',                 // aluminium, plastic, a grey sock
  j: '#b98a53',                 // cardboard, pizza crust
  k: '#8a6237',                 // cardboard in shadow
  z: '#f2c14e',                 // cheese
  q: 'rgba(74, 58, 84, .5)',    // something spilled and left
  m: '#a8b0bd',                 // chrome rail / shelf board
  n: '#6a7280',                 // chrome in shadow — posts, feet, frame
  // Garments. SHOP_PALETTES swaps these to give each store its colourway.
  '1': '#f4a6c0',
  '2': '#f6d9a0',
  '3': '#bcd9f0',
  '4': '#d9c2ee',
  '5': '#f6f2ea'
};

const SPRITES = {
  // Shop entrance, recoloured per destination.
  store: [
    '................',
    '..XXXXXXXXXXXX..',
    '..XAAAAAAAAAAX..',
    '..XAWAWAWAWAWX..',
    '..XXXXXXXXXXXX..',
    '..XddddddddddX..',
    '..XdWWWWWWWWdX..',
    '..XdWddddddWdX..',
    '..XdWddddddWdX..',
    '..XdWddddddWdX..',
    '..XdWddddddWdX..',
    '..XdWddddddWdX..',
    '..XdWWWWWWWWdX..',
    '..XXXXXXXXXXXX..',
    '....KKKKKKKK....',
    '................'
  ],
  // Points left; mirrored in CSS to point right.
  signArrowSide: [
    '................',
    '.XXXXXXXXXXXXXX.',
    '.XAAAAAAAAAAAAX.',
    '.XAAAAWAAAAAAAX.',
    '.XAAAWWAAAAAAAX.',
    '.XAAWWWWWWWWWAX.',
    '.XAAAWWAAAAAAAX.',
    '.XAAAAWAAAAAAAX.',
    '.XAAAAAAAAAAAAX.',
    '.XXXXXXXXXXXXXX.',
    '.......XX.......',
    '.......XX.......',
    '.......XX.......',
    '......XXXX......',
    '....KKKKKKKK....',
    '................'
  ],
  signArrowUp: [
    '................',
    '.XXXXXXXXXXXXXX.',
    '.XAAAAAAAAAAAAX.',
    '.XAAAAAAWAAAAAX.',
    '.XAAAAAWWWAAAAX.',
    '.XAAAAWWWWWAAAX.',
    '.XAAAAAAWAAAAAX.',
    '.XAAAAAAWAAAAAX.',
    '.XAAAAAAAAAAAAX.',
    '.XXXXXXXXXXXXXX.',
    '.......XX.......',
    '.......XX.......',
    '.......XX.......',
    '......XXXX......',
    '....KKKKKKKK....',
    '................'
  ],
  // A mannequin on a stand, arms folded around the sweats she will not hand over.
  bossMannequin: [
    '................',
    '.....YYYYYY.....',
    '....YYddddYY....',
    '....YYMMMMYY....',
    '....YYMEMEYY....',
    '....YYMMMMYY....',
    '.....YMRRMY.....',
    '.....YMMMMY.....',
    '....YYMMMMYY....',
    '...XMMWWWWMMX...',
    '...XMMWWWWMMX...',
    '....XMQQQQMX....',
    '....XMQQQQMX....',
    '.....XMMMMX.....',
    '......XppX......',
    '...XAAAAAAAAX...'
  ],
  // The same mannequin and stand as above, so the two read as one chain.
  bossKim: [
    '................',
    '.....BBBBBB.....',
    '....BBbbbbBB....',
    '....BBMMMMBB....',
    '....BBMEMEBB....',
    '....BBMMMMBB....',
    '....BBMRRMBB....',
    '....BbMMMMbB....',
    '...BBbMMMMbBB...',
    '...XBDDMMDDBX...',
    '...XBDDDDDDBX...',
    '....XDDDDDDX....',
    '....XDDDDDDX....',
    '.....XMMMMX.....',
    '......XppX......',
    '...XAAAAAAAAX...'
  ],
  // 32 wide where every other model is 16, so he is drawn across two tiles. The
  // braid is pulled forward because behind him it would just read as head-shaped.
  bossJune: [
    '...........BBBBBBBBBB...........',
    '..........BBbbbbbbbbBB..........',
    '..........BBTTTTTTTTBB..........',
    '..........BBTEETTEETBB..........',
    '..........BBTTTTTTTTBB..........',
    '..........BBTTTXXTTTBB..........',
    '..........BBBTTTTTTTBB..........',
    '.....XvvvvvbbbTTTTvvvvvvvvX.....',
    '.....XvvvvBBBvvvvvvvvvvvvvX.....',
    '.....XTTTvvbbbvvvvvvvvvTTTX.....',
    '.....XTTTvBBBvvvvvvvvvvTTTX.....',
    '.........NNXXNNNNNNNNNN.........',
    '.........NNNNNNNNNNNNNN.........',
    '..........TTTTT..TTTTT..........',
    '..........TTTTT..TTTTT..........',
    '....KKKKKKKKKKKKKKKKKKKKKKKK....',
  ],
  // Litter, one tile each. Drawn from a stage's decal list, never the map.
  trashCan: [
    '................',
    '................',
    '................',
    '................',
    '......XXXX......',
    '.....XggggX.....',
    '.....XcccgX.....',
    '.....XcccgX.....',
    '.....XcgccX.....',
    '.....XcccgX.....',
    '.....XggggX.....',
    '......XXXX......',
    '......KKKK......',
    '................',
    '................',
    '................'
  ],
  trashPaper: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '.....XXXX.......',
    '....XWWWWX......',
    '...XWWgWWWX.....',
    '...XWWWgWWX.....',
    '....XWWgWX......',
    '.....XXXX.......',
    '.....KKKK.......',
    '................',
    '................',
    '................',
    '................'
  ],
  trashShirt: [
    '................',
    '................',
    '................',
    '................',
    '..XXX.XXXX.XXX..',
    '.XcccXccccXcccX.',
    '.XccccccccccccX.',
    '.XccccccccccccX.',
    '..XXccccccccXX..',
    '...XccccccccX...',
    '...XccccccccX...',
    '...XXXXXXXXXX...',
    '....KKKKKKKK....',
    '................',
    '................',
    '................'
  ],
  trashSock: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '.....XXX........',
    '.....XggX.......',
    '.....XggX.......',
    '.....XggX.......',
    '....XggggXX.....',
    '....XggggggX....',
    '.....XXXXXX.....',
    '.....KKKKKK.....',
    '................',
    '................',
    '................'
  ],
  trashBox: [
    '................',
    '................',
    '................',
    '................',
    '...XX......XX...',
    '...XjXXXXXXjX...',
    '...XjjjjjjjjX...',
    '...XjjjjjjjjX...',
    '...XkkkkkkkkX...',
    '...XkkkkkkkkX...',
    '...XXXXXXXXXX...',
    '....KKKKKKKK....',
    '................',
    '................',
    '................',
    '................'
  ],
  trashPizza: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '.......XX.......',
    '......XzzX......',
    '.....XzczzX.....',
    '....XzzzzczX....',
    '...XjjjjjjjjX...',
    '...XXXXXXXXXX...',
    '....KKKKKKKK....',
    '................',
    '................',
    '................',
    '................'
  ],
  trashBag: [
    '................',
    '................',
    '................',
    '................',
    '....X..XX..X....',
    '....XggggggX....',
    '...XggWgggggX...',
    '...XgggggWggX...',
    '...XgggggggggX..',
    '....XgggggggX...',
    '.....XXXXXX.....',
    '.....KKKKKK.....',
    '................',
    '................',
    '................',
    '................'
  ],
  trashSpill: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.....qqqqq......',
    '...qqqqqqqqq....',
    '..qqqqqqqqqqqq..',
    '..qqqqqqqqqqq...',
    '...qqqqqqqq.....',
    '.....qqqq.......',
    '................',
    '................',
    '................'
  ],
  trashShoe: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.....XXXX.......',
    '....XWWWcX......',
    '...XWWWccXX.....',
    '...XWWWWWWWX....',
    '...XXXXXXXXX....',
    '....KKKKKKK.....',
    '................',
    '................',
    '................',
    '................'
  ],
  // Wider than one tile: a rail reads as a rail only when it runs the length of
  // a wall. Drawn from the stage's prop list, over tiles the map marks solid.
  clothingRack: [
    '................................................',
    '....nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn....',
    '....mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm....',
    '....n..mm...mm...mm...mm...mm...mm...mm....n....',
    '....n..11...22...33...44...55...11...33....n....',
    '....n.1111.2222.3333.4444.5555.1111.3333...n....',
    '....n.1111.2222.3333.4444.5555.1111.3333...n....',
    '....n.1111.2222.3333.4444.5555.1111.3333...n....',
    '....n.1111.2222.3333.4444.5555.1111.3333...n....',
    '....n.1111.2222.3333.4444.5555.1111.3333...n....',
    '....n.1111.2222.3333.4444.5555.1111.3333...n....',
    '....n.1111.2222......4444.5555.1111........n....',
    '....n......2222......4444......1111........n....',
    '....n................4444..................n....',
    '..nnnnn..................................nnnnn..',
    '..KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK..',
  ],
  clothesStack: [
    '................................',
    '.n.33333333.11111111.44444444.n.',
    '.n.n333333n.n111111n.n444444n.n.',
    '.n..222222...555555...333333..n.',
    '.n..n2222n...n5555n...n3333n..n.',
    '.n.11111111.44444444.22222222.n.',
    '.n.n111111n.n444444n.n222222n.n.',
    '.mmmmmmmmmmmmmmmmmmmmmmmmmmmmmm.',
    '.n............................n.',
    '.n..222222...444444...111111..n.',
    '.n..n2222n...n4444n...n1111n..n.',
    '.n.11111111.33333333.55555555.n.',
    '.n.n111111n.n333333n.n555555n.n.',
    '.mmmmmmmmmmmmmmmmmmmmmmmmmmmmmm.',
    '.nnnnnnnnnnnnnnnnnnnnnnnnnnnnnn.',
    'KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK',
  ],
  // One per facing; right is this one mirrored in CSS.
  playerDown: [
    '................',
    '.....HHHHHH.....',
    '....HHhhhhHH....',
    '....HHSSSSHH....',
    '....HHSESEHH....',
    '....HHSSSSHH....',
    '.....HSSSSH.....',
    '.....HSSSSH.....',
    '...HHSSSSSSHH...',
    '...XHSNNNNSHX...',
    '...XHSNNNNSHX...',
    '....XSNNNNSX....',
    '....XPPPPPPX....',
    '....XPPXXPPX....',
    '....XPPXXPPX....',
    '....XXX..XXX....'
  ],
  playerUp: [
    '................',
    '.....HHHHHH.....',
    '....HHhhhhHH....',
    '....HHhhhhHH....',
    '....HHHhhHHH....',
    '....HHHHHHHH....',
    '.....HHHHHH.....',
    '.....HHHHHH.....',
    '...HHHHHHHHHH...',
    '...XHHHHHHHHX...',
    '...XSHHHHHHSX...',
    '....XSHHHHSX....',
    '....XPPPPPPX....',
    '....XPPXXPPX....',
    '....XPPXXPPX....',
    '....XXX..XXX....'
  ],
  playerSide: [
    '................',
    '......HHHHH.....',
    '.....HHhhHHH....',
    '.....HSSSHHH....',
    '.....HSESHHH....',
    '.....HSSSHHH....',
    '......HSSHHH....',
    '......HSSHHH....',
    '.....HHHHHHH....',
    '.....XSNNHHX....',
    '.....XSNNHHX....',
    '.....XSNNNHX....',
    '.....XPPPPPX....',
    '.....XPPPPPX....',
    '.....XPPPPPX....',
    '.....XXXXXXX....'
  ]
};

// Drawn at the size it will actually be shown, so no upscaling softens it.
function rasterize(rows, overrides) {
  const scale = TILE / 16;
  const canvas = document.createElement('canvas');
  canvas.width = rows[0].length * scale;
  canvas.height = rows.length * scale;
  const ctx = canvas.getContext('2d');

  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      const color = (overrides && overrides[ch]) || PALETTE[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return 'url(' + canvas.toDataURL() + ')';
}

// Faint specks for the ground, on a pitch that is NOT a multiple of TILE — so
// the repeat never lines up with the tile edges and redraws the grid.
function makeGroundTexture() {
  const size = 224;   // 4.67 tiles — big enough that the repeat reads as scatter
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  for (let i = 0; i < 420; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 0.8 + Math.random() * 1.5;
    ctx.fillStyle = 'rgba(0, 0, 0, ' + (0.02 + Math.random() * 0.035).toFixed(3) + ')';
    // Up to four times each, so specks near an edge wrap cleanly.
    for (const dx of [0, x < r ? size : x > size - r ? -size : 0]) {
      for (const dy of [0, y < r ? size : y > size - r ? -size : 0]) {
        ctx.beginPath();
        ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  return 'url(' + canvas.toDataURL() + ')';
}

// Awning colour per destination.
const STORE_COLORS = ['#6bbf7a', '#5a9fd4', '#c77fb5'];

// Brandy keeps the sprite's own pastels, Skims takes neutrals — two different
// stores out of one set of sprites.
const SHOP_PALETTES = {
  brandy: null,
  skims: {
    '1': '#3a3540',   // onyx
    '2': '#c4ab97',   // sand
    '3': '#8a7f76',   // clay
    '4': '#5c5560',   // slate
    '5': '#e3d5c8'    // bone
  }
};

// One rasterization each per shop colourway.
const PROP_SPRITES = ['clothingRack', 'clothesStack'];

// Re-rasterized once per outfit.
const PLAYER_SPRITES = ['playerDown', 'playerUp', 'playerSide'];

// Every sprite becomes a CSS custom property: --sprite-playerDown, and
// --sprite-playerDown--pinkSweats for the variants.
function installSprites() {
  const root = document.documentElement.style;
  for (const name in SPRITES) {
    root.setProperty('--sprite-' + name, rasterize(SPRITES[name]));
  }
  STORE_COLORS.forEach(function (color, i) {
    root.setProperty('--sprite-store' + (i + 1), rasterize(SPRITES.store, { A: color }));
  });
  // CSS then picks the right variable off #player[data-outfit].
  for (const outfit in OUTFITS) {
    const palette = OUTFITS[outfit].palette;
    PLAYER_SPRITES.forEach(function (name) {
      root.setProperty('--sprite-' + name + '--' + outfit, rasterize(SPRITES[name], palette));
    });
  }
  // --sprite-clothingRack--skims and friends.
  for (const shop in SHOP_PALETTES) {
    PROP_SPRITES.forEach(function (name) {
      root.setProperty('--sprite-' + name + '--' + shop,
                       rasterize(SPRITES[name], SHOP_PALETTES[shop]));
    });
  }
  root.setProperty('--ground-texture', makeGroundTexture());
}
