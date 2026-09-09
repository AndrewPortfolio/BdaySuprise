/* ---------------------------------------------------------------------------
   sprites.js — pixel art, authored as string maps and rasterized to data: URLs
   at boot. No image files, so nothing to break under file:// or on Vercel.

   Each sprite is 16x16 characters. Add a character to PALETTE, use it in a
   sprite, and it just works. Rows must all be 16 wide.
   --------------------------------------------------------------------------- */

const PALETTE = {
  '.': null,                    // transparent
  K: 'rgba(0,0,0,0.16)',        // ground shadow
  A: '#d9534f',                 // sign face (recoloured per storefront)
  p: '#9aa0ab',                 // sign post
  d: '#2b3040',                 // shop interior / glass
  X: '#22222c',                 // sprite outline
  S: '#f2c795',                 // skin
  E: '#2a2a35',                 // eye
  W: '#fdfdfd',                 // cap brim
  R: '#d9534f',                 // cap
  H: '#6b4423',                 // hair
  N: '#3f5bb5',                 // shirt
  P: '#39405a'                  // trousers
};

const SPRITES = {
  /* A vertical storefront sign: board with stacked lettering, on a post. */
  sign: [
    '....XXXXXXXX....',
    '....XAAAAAAX....',
    '....XAWWWWAX....',
    '....XAWWWWAX....',
    '....XAAAAAAX....',
    '....XAWWWWAX....',
    '....XAWWWWAX....',
    '....XAAAAAAX....',
    '....XAWWWWAX....',
    '....XAWWWWAX....',
    '....XAAAAAAX....',
    '....XXXXXXXX....',
    '......XppX......',
    '......XppX......',
    '.....XXppXX.....',
    '....KKKKKKKK....'
  ],
  /* A shop entrance: striped awning over a glass door. Used for the three
     paths out of the lobby, recoloured per destination. */
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
  /* Player, one sprite per facing. Right is the left sprite mirrored in CSS. */
  playerDown: [
    '................',
    '.....XXXXXX.....',
    '....XRRRRRRX....',
    '...XRRRRRRRRX...',
    '...XWWWWWWWWX...',
    '...XSSSSSSSSX...',
    '...XSEESSEESX...',
    '...XSSSSSSSSX...',
    '....XSSSSSSX....',
    '...XNNNNNNNNX...',
    '..XSNNNNNNNNSX..',
    '..XSNNNNNNNNSX..',
    '...XNNNNNNNNX...',
    '...XPPPPPPPPX...',
    '...XPPPXXPPPX...',
    '...XXX..XXX.....'
  ],
  playerUp: [
    '................',
    '.....XXXXXX.....',
    '....XRRRRRRX....',
    '...XRRRRRRRRX...',
    '...XRRRRRRRRX...',
    '...XHHHHHHHHX...',
    '...XHHHHHHHHX...',
    '...XHHHHHHHHX...',
    '....XHHHHHHX....',
    '...XNNNNNNNNX...',
    '..XSNNNNNNNNSX..',
    '..XSNNNNNNNNSX..',
    '...XNNNNNNNNX...',
    '...XPPPPPPPPX...',
    '...XPPPXXPPPX...',
    '...XXX..XXX.....'
  ],
  playerSide: [
    '................',
    '.....XXXXX......',
    '....XRRRRRX.....',
    '...XRRRRRRRX....',
    '..XWWXRRRRRX....',
    '...XSSSSSSX.....',
    '...XSESSSSX.....',
    '...XSSSSSSX.....',
    '....XSSSSX......',
    '...XNNNNNNX.....',
    '..XSNNNNNNX.....',
    '..XSNNNNNNX.....',
    '...XNNNNNNX.....',
    '...XPPPPPPX.....',
    '...XPPPPPPX.....',
    '...XXXXXX.......'
  ]
};

/* Draw a sprite at the size it will actually be shown, so no browser upscaling
   softens the pixels. */
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

/* A seamless scatter of faint specks for the ground. Drawn once and repeated,
   at a size that is NOT a multiple of TILE so the repeat never lines up with
   the tile edges and re-creates the grid we just got rid of. */
function makeGroundTexture() {
  const size = 224;   /* 4.67 tiles — a big enough pitch that the repeat reads as scatter */
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  for (let i = 0; i < 420; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 0.8 + Math.random() * 1.5;
    ctx.fillStyle = 'rgba(0, 0, 0, ' + (0.02 + Math.random() * 0.035).toFixed(3) + ')';
    /* Draw each speck up to four times so ones near an edge wrap cleanly. */
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

/* Storefront colours. Add one and the hub picks it up automatically. */
const SIGN_COLORS = ['#d9534f', '#3f7bb5', '#e0a13c', '#4f9d76'];

/* Awning colour per destination: Level 1, Level 2, Level 3. */
const STORE_COLORS = ['#6bbf7a', '#5a9fd4', '#c77fb5'];

/* Expose every sprite to CSS as a custom property: --sprite-sign0, etc. */
function installSprites() {
  const root = document.documentElement.style;
  for (const name in SPRITES) {
    root.setProperty('--sprite-' + name, rasterize(SPRITES[name]));
  }
  SIGN_COLORS.forEach(function (color, i) {
    root.setProperty('--sprite-sign' + i, rasterize(SPRITES.sign, { A: color }));
  });
  STORE_COLORS.forEach(function (color, i) {
    root.setProperty('--sprite-store' + (i + 1), rasterize(SPRITES.store, { A: color }));
  });
  root.setProperty('--ground-texture', makeGroundTexture());
}
