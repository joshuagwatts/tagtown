# TAGTOWN 🛹🎨

A toony 3D spray-paint sandbox for mobile — a loving rip-off of The Simpsons: Hit & Run's
vibe (colorful, lighthearted, simple) with Skate 4-style cruising bolted on.

**Play:** https://joshuagwatts.github.io/tagtown/ (open in Chrome on your phone)

- Walk / skate around a chill fenced-in block (the fence is the world border for now)
- Hit the 🎨 SPRAY button for first-person spray mode — paint any wall or the fence,
  the paint sticks (canvas-texture decals)
- 8-color palette, spray-can HUD, Easy (infinite paint) / Normal (refill at the paint
  can by the door) difficulty in ⚙️ settings
- 🛹 button or R key: hop on the skateboard — faster, ollie jump, lean-into-turns

**Tech:** three.js (vendored, no CDN dependency), one canvas texture per paintable wall,
all local — no server. Multiplayer is stubbed in `js/net.js` (Trystero room `tagtown-v1`
planned, like LIMBO).

**Files:** `index.html` + `js/` (main, world, player, spray, ui, net, util).
Swap the main character later by replacing `buildToon()` in `js/player.js`.
