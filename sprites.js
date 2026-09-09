/* ---------------------------------------------------------------------------
   sprites.js — pixel art, authored as string maps and rasterized to data: URLs
   at boot. No image files, so nothing to break under file:// or on Vercel.

   Each sprite is 16x16 characters. Add a character to PALETTE, use it in a
   sprite, and it just works. Rows must all be 16 wide.
   --------------------------------------------------------------------------- */

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
  P: '#D3D3D3'                  // light grey sweats
};

const SPRITES = {
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
  /* Wayfinding sign: horizontal board on a post. The side version points left
     and is mirrored in CSS to point right. */
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
  /* Player, one sprite per facing. Right is the left sprite mirrored in CSS. */
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

/* Awning colour per destination: Level 1, Level 2, Level 3. */
const STORE_COLORS = ['#6bbf7a', '#5a9fd4', '#c77fb5'];

/* Expose every sprite to CSS as a custom property: --sprite-sign0, etc. */
function installSprites() {
  const root = document.documentElement.style;
  for (const name in SPRITES) {
    root.setProperty('--sprite-' + name, rasterize(SPRITES[name]));
  }
  STORE_COLORS.forEach(function (color, i) {
    root.setProperty('--sprite-store' + (i + 1), rasterize(SPRITES.store, { A: color }));
  });
  root.setProperty('--ground-texture', makeGroundTexture());
}
