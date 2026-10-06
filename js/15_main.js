/* =========================================================
   15 绘制总入口 + 主循环 + 启动 + 怪物逻辑
   ========================================================= */

/* ---- 怪物状态（本文件自包含） ---- */
let monster = null;
let barnacleBullets = [];
let monsterSpawnTimer = 0;

/* ---- 子弹打中玩家：往回弹 ----
   原来是「瞬间把 player.x 减 36」，人会直接跳一下、很生硬，
   而且连着中弹会被推回好几段。
   现在改成：给一个往左的初速度，按帧缓出（越推越慢），推够距离就停；
   同时给 0.25 秒的短暂无敌，避免一颗接一颗把人钉在原地。 */
const BULLET_KNOCKBACK   = 36;   // 总共往回推多少像素（和以前一样远）
const BULLET_KNOCK_FRAMES = 9;   // 用几帧推完（越小越脆，越大越顺）
const BULLET_HIT_IFRAME  = 15;   // 中弹后的短暂无敌帧数（60fps → 0.25 秒）

let knockV = 0;                  // 当前每帧往回推多少
let knockLeft = 0;               // 还要推几帧
let hitIFrame = 0;               // 剩余无敌帧数

/* =========================================================
   绘制总入口
   ========================================================= */
function draw() {
  ctx.save();
  ctx.translate(0, viewOffset);

  drawBackground();
  drawGround();
  drawPlatforms();
  drawPits();
  drawCoins();
  drawObstacles();
  drawPlayer();
  drawPet();
  drawMonster();
  drawBarnacleBullets();

  ctx.restore();

  drawHUD();
}

/* =========================================================
   主循环
   ========================================================= */
function loop(now) {
  if (!lastT) lastT = now;
  let dt = (now - lastT) / 16.667;
  lastT = now;

  if (!isFinite(dt) || dt <= 0) dt = 1;
  dt = Math.min(dt, 2.5);

  update(dt);
  updateBest();
  draw();

  requestAnimationFrame(loop);
}

/* =========================================================
   怪物更新
   ---------------------------------------------------------
   · 30~50 秒随机出现一次，持续 10 秒
   · 消失时【不清空】子弹，已经射出去的子弹继续飞
   ========================================================= */
function updateMonster(dt) {
  if (!monster) {
    monsterSpawnTimer -= dt;
    if (monsterSpawnTimer <= 0) {
      monster = {
        baseY: H * 0.35,
        y:     H * 0.35,
        t: 0,
        lifeTimer: MONSTER_DURATION,
        fireTimer: MONSTER_FIRE_DELAY,
      };
      monsterSpawnTimer = rnd(MONSTER_INTERVAL_MIN, MONSTER_INTERVAL_MAX);
    }
    return;
  }

  monster.t += dt * 0.05;
  monster.y = monster.baseY + Math.sin(monster.t * 2) * 40;
  monster.lifeTimer -= dt;

  if (monster.lifeTimer <= 0) {
    monster = null;
    return;
  }

  monster.fireTimer -= dt;
  if (monster.fireTimer <= 0) {
    fireBarnacleBullet();
    monster.fireTimer = MONSTER_FIRE_INTERVAL;
  }
}

function fireBarnacleBullet() {
  const sx = W - MONSTER_SCREEN_X;
  const sy = monster.y;
  const px = player.x - cam + pW() / 2;
  const py = player.y - pH() / 2;

  const dx = px - sx;
  const dy = py - sy;
  const d  = Math.sqrt(dx * dx + dy * dy) || 1;

  barnacleBullets.push({
    sx: sx,
    sy: sy,
    vx: dx / d * MONSTER_BULLET_SPEED,
    vy: dy / d * MONSTER_BULLET_SPEED,
    t: 0,
  });
}

/* 子弹：匀速直线运动，不受重力；飞出屏幕就回收 */
function updateBarnacleBullets(dt) {
  for (const b of barnacleBullets) {
    b.sx += b.vx * dt;
    b.sy += b.vy * dt;
    b.t  += dt;
  }
  barnacleBullets = barnacleBullets.filter(b =>
    b.sx > -60 && b.sx < W + 60 && b.sy > -60 && b.sy < H + 60
  );
}

/* 返回第一颗命中玩家的子弹对象（没命中返回 null） */
function barnacleBulletHittingPlayer() {
  const worldBox = pBox();
  const screenBox = {
    x: worldBox.x - cam,
    y: worldBox.y,
    w: worldBox.w,
    h: worldBox.h,
  };
  for (const b of barnacleBullets) {
    if (circleRectHit(b.sx, b.sy, MONSTER_BULLET_R, screenBox)) return b;
  }
  return null;
}

/* =========================================================
   怪物与子弹绘制
   ========================================================= */
function drawMonster() {
  if (!monster) return;

  const sx = W - MONSTER_SCREEN_X;
  const sy = monster.y;

  if (SPR.monster && SPR.monster.complete && SPR.monster.naturalWidth > 0) {
    const mw = MONSTER_SPRITE_W;
    const mh = mw * SPR.monster.naturalHeight / SPR.monster.naturalWidth;
    const bob = Math.sin(monster.t * 2) * 4;
    ctx.save();
    ctx.translate(sx, sy + bob);
    ctx.drawImage(SPR.monster, -mw / 2, -mh / 2, mw, mh);
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.arc(sx, sy, MONSTER_R, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(sx - MONSTER_R * 0.32, sy - MONSTER_R * 0.15, 4, 0, Math.PI * 2);
  ctx.arc(sx + MONSTER_R * 0.32, sy - MONSTER_R * 0.15, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawBarnacleBullets() {
  const haveSpr = SPR.bullet && SPR.bullet.complete && SPR.bullet.naturalWidth > 0;
  for (const b of barnacleBullets) {
    let rad = MONSTER_BULLET_R;                 // 圈有多大
    if (haveSpr) {
      const bw = MONSTER_BULLET_R * 2.8;
      const bh = bw * SPR.bullet.naturalHeight / SPR.bullet.naturalWidth;
      ctx.drawImage(SPR.bullet, b.sx - bw / 2, b.sy - bh / 2, bw, bh);
      rad = bw / 2;                             // 描边贴着子弹本体
    } else {
      ctx.beginPath();
      ctx.arc(b.sx, b.sy, MONSTER_BULLET_R, 0, Math.PI * 2);
      ctx.fillStyle = '#e8eefc';
      ctx.fill();
    }

    /* 粉红色外圈：画在子弹外面，所以先描边再补一层柔和的粉光，
       在深色夜空里一眼就能看见飞过来的东西。
       想调：BULLET_RING_*（01_config.js） */
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(b.sx, b.sy, rad * 0.4, b.sx, b.sy, rad * BULLET_RING_GLOW);
    glow.addColorStop(0, 'rgba(255,120,190,0)');
    glow.addColorStop(0.55, `rgba(255,120,190,${BULLET_RING_ALPHA})`);
    glow.addColorStop(1, 'rgba(255,120,190,0)');
    ctx.beginPath();
    ctx.arc(b.sx, b.sy, rad * BULLET_RING_GLOW, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(b.sx, b.sy, rad + BULLET_RING_W / 2, 0, Math.PI * 2);
    ctx.strokeStyle = BULLET_RING_COLOR;
    ctx.lineWidth = BULLET_RING_W;
    ctx.stroke();
  }
}

/* =========================================================
   包装 update / reset：把怪物逻辑挂进主循环
   ========================================================= */
const _origUpdate = update;
update = function (dt) {
  _origUpdate(dt);
  if (state !== 'playing') return;

  updateMonster(dt);
  updateBarnacleBullets(dt);

  /* ---- 中弹后的回弹 + 短暂无敌 ---- */
  if (hitIFrame > 0) hitIFrame -= dt;

  if (knockLeft > 0) {
    const step = Math.min(knockLeft, dt);
    player.x -= knockV * step;      // 往回推
    knockV *= Math.pow(0.72, dt);   // 缓出：越推越慢，像被撞了一下滑停
    knockLeft -= step;
  }

  /* 子弹 vs 玩家：
     · 命中后子弹消失
     · 不扣命，只往回弹一小段（见上面的 knockV）
     · 复活无敌 / 中弹短暂无敌期间直接穿过，不推、不消失 */
  if (invTimer <= 0 && hitIFrame <= 0) {
    const hitBullet = barnacleBulletHittingPlayer();
    if (hitBullet) {
      // 初速度取成「指数缓出后刚好推完 BULLET_KNOCKBACK 像素」
      const total = (1 - Math.pow(0.72, BULLET_KNOCK_FRAMES)) / (1 - 0.72);
      knockV    = BULLET_KNOCKBACK / total;
      knockLeft = BULLET_KNOCK_FRAMES;
      hitIFrame = BULLET_HIT_IFRAME;
      barnacleBullets = barnacleBullets.filter(b => b !== hitBullet);
      SFX.smash();
    }
  }
};

const _origReset = reset;
reset = function () {
  _origReset();
  monster = null;
  barnacleBullets = [];
  monsterSpawnTimer = rnd(MONSTER_INTERVAL_MIN, MONSTER_INTERVAL_MAX);
  // 回弹状态也要清掉，否则重开一局可能带着上次的推力
  knockV = 0;
  knockLeft = 0;
  hitIFrame = 0;
};

/* =========================================================
   启动
   ========================================================= */
resize();
best          = loadBest();
totalCoins    = loadTotalCoins();
ironPotsOwned = loadCount(POT_KEY);
riceOwned     = loadCount(RICE_KEY);
reset();
loadAssets();
setTimeout(reportAssets, 1500);

if (typeof isFirstPlay === 'function' && isFirstPlay()) {
  showMenu();
} else {
  state = 'playing';
}

requestAnimationFrame(loop);