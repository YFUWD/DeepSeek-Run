/* =========================================================
   05 人物：尺寸 / 跳跃 / 物理
   ========================================================= */

const PL_W = 32, PL_H = 56;
const PL_DUCK_W = 48, PL_DUCK_H = 26;

const BOX_PAD_X = 5;
const BOX_PAD_Y = 3;

const pW = () => (player.duck ? PL_DUCK_W : PL_W);
const pH = () => (player.duck ? PL_DUCK_H : PL_H);

const pBox = () => ({
  x: player.x + BOX_PAD_X,
  y: player.y - pH() + BOX_PAD_Y,
  w: pW() - BOX_PAD_X * 2,
  h: pH() - BOX_PAD_Y * 2,
});

function doJump() {
  if (state !== 'playing') return;

  if (player.jumps === 0 && (player.onGround || coyoteTimer > 0 || overPit(player.x + pW() / 2))) {
    player.vy       = JUMPV;
    player.jumps    = 1;
    player.onGround = false;
    player.duck     = false;
    player.rot      = 0;
    coyoteTimer     = 0;
    SFX.jump();
  } else if (player.jumps < 2) {
    player.vy  = JUMPV;
    player.jumps = 2;
    player.rot = 0;
    SFX.djump();
  } else {
    jumpBuffer = BUFFER;
  }
}

function updatePlayerPhysics(dt) {
  const wasAir = !player.onGround;

  if (duckHeld && !player.onGround) player.vy = Math.max(player.vy, FAST_FALL);
  player.duck = duckHeld;

  const g = player.vy < 0 ? GRAV_UP : GRAV_DOWN;
  player.vy += g * dt;

  const prevY = player.y;
  player.y   += player.vy * dt;

  const cx = player.x + pW() / 2;
  const gy = groundYAt(cx);

  if (player.y >= gy && player.vy >= 0 && prevY <= gy + 1) {
    player.y        = gy;
    player.vy       = 0;
    player.onGround = true;
    player.jumps    = 0;
    player.rot      = 0;
    if (wasAir) SFX.land();
  } else {
    player.onGround = false;
    if (!player.duck) player.rot += 0.22 * dt;
  }

  if (player.onGround) coyoteTimer = COYOTE;
  else if (coyoteTimer > 0) coyoteTimer -= dt;
}

function updateJumpBuffer(dt) {
  if (jumpBuffer <= 0) return;
  jumpBuffer -= dt;
  if (player.onGround && player.jumps === 0) {
    player.vy       = JUMPV;
    player.jumps    = 1;
    player.onGround = false;
    player.rot      = 0;
    jumpBuffer      = 0;
    coyoteTimer     = 0;
    SFX.jump();
  }
}

function accelerate(dt) {
  if (speed < SPD_MAX) speed = Math.min(SPD_MAX, speed + SPD_ACC * dt);
}

function overPit(x) {
  for (const p of pits) if (x > p.x && x < p.x + p.w) return true;
  return false;
}