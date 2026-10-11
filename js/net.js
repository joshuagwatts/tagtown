// TAGTOWN net — multiplayer stub (NOT wired yet).
// Future plan: Trystero (same as LIMBO) room `tagtown-v1`.
// Each peer broadcasts 10x/sec: { p:[x,y,z], y:yaw, s:spraying?1:0 }.
// Remote toons reuse player.js buildToon() with a name tag; remote paint
// strokes replicate as { surf, uv:[u,v], color, r } -> spray.paintAt().
// Nothing here runs yet — the game is fully local until this is built.
export class Net {
  constructor() { this.enabled = false; this.peers = new Map(); }
  connect(roomId = 'tagtown-v1') {
    // TODO: import Trystero, join room, wire send/receive.
    console.info('[net] multiplayer not implemented yet; staying local.', roomId);
    return false;
  }
  broadcast(/* state */) {}
  onPeerPaint(/* cb */) {}
}
