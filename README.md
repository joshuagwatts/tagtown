# TAGTOWN 🛹🎨

A toony 3D spray-paint sandbox for mobile — a loving rip-off of The Simpsons: Hit & Run's
vibe (colorful, lighthearted, simple) with Skate 4-style cruising bolted on.

**Play:** https://joshuagwatts.github.io/tagtown/ (open in Chrome on your phone)

- Walk / skate around a chill fenced-in block (the fence is the world border for now)
  as **Willy** — the purple one-eyed star of Joshua's @thrumyeyez__ animation
- Hit the 🎨 SPRAY button for first-person spray mode — paint any wall or the fence,
  the paint sticks (canvas-texture decals). Left stick walks while you paint,
  drag aims, tap the 🎨 button to toggle paint on/off — built for two thumbs
- 8-color palette, spray-can HUD, Easy (infinite paint) / Normal (refill at the paint
  can by the door) difficulty in ⚙️ settings
- 🛹 button or R key: hop on the skateboard — faster, ollie jump, lean-into-turns

**Tech:** three.js (vendored, no CDN dependency), one canvas texture per paintable wall,
all local — no server. Multiplayer is stubbed in `js/net.js` (Trystero room `tagtown-v1`
planned, like LIMBO).

**Files:** `index.html` + `js/` (main, world, player, spray, ui, net, util, characters).
Character system: `js/characters.js` holds swappable protagonist builds (Willy, Willy v2 + Homer dummy, more anytime) — every builder returns the same rig
`{group, hipL, hipR, shL, shR, headG, belly, bellyY, hipY, armZ, headY}`,
pickable in ⚙️ Settings → Character, persisted. When Joshua's real 3D Willy
model lands, add a `buildWillyHD()` GLB loader there (see the NOTE in the file).
