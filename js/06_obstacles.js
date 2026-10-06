/* =========================================================
   06 关卡：生成 / 回收 / 碰撞盒 / 鲸元券
   ========================================================= */

let lastWallX = -Infinity;   // 最近一次生成高墙的 x 坐标，用于 2 秒冷却

function nextSpawnGap() {
  // 除以 OBST_DENSITY：密度越大，障碍之间的间距越短
  return rnd(340, 620) * (0.65 + 0.45 * speed / SPD) / OBST_DENSITY;
}

function addCoins(x, y, n, dx = COIN_DX) {
  for (let i = 0; i < n; i++) {
    coins.push({ x: x + i * dx, y, r: COIN_R, t: Math.random() * 6 });
  }
}

/* =========================================================
   尝试在指定 x 放一个鲸元券（单个）。
   · 藤壶 / 洞墙：只避开自身横向范围
   · 高墙：左右各留 256 像素缓冲区，高墙附近完全不放鲸元券
   · 默认贴地面上方；如果 x 落在平台上，就贴到那块平台的台面上方
   ========================================================= */
function trySpawnCoin(x) {
  for (const o of obstacles) {
    const ow = (o.w !== undefined) ? o.w : (o.r * 2);
    if (o.t === 'wall') {
      // 高墙左右各 256 像素不放鲸元券
      if (x + COIN_R > o.x - 256 && x - COIN_R < o.x + ow + 256) return false;
    } else {
      if (x + COIN_R > o.x && x - COIN_R < o.x + ow) return false;
    }
  }

  // 坑洞：用 pit.x 和 pit.w 判断横向范围
  for (const p of pits) {
    if (x + COIN_R > p.x && x - COIN_R < p.x + p.w) return false;
  }

  // 选高度：三档随机 —— 贴地 / 半空 / 高空
  //   贴地  跑着就能吃
  //   半空  小跳一下
  //   高空  大跳 / 二段跳
  // 先确定鲸元券站在哪条基线上：平地上就用 GY，落在平台上就用 p.y
  let baseY = GY;
  for (const pl of platforms) {
    if (x > pl.x + COIN_R && x < pl.x + pl.w - COIN_R) {
      baseY = pl.y;
      break;
    }
  }

  const roll = Math.random();
  let dy;
  if (roll < 0.45)      dy = 40;    // 贴地：跑着就能吃
  else if (roll < 0.80) dy = 110;   // 半空：小跳
  else                  dy = 170;   // 高空：大跳 / 二段跳

  const y = baseY - dy;

  coins.push({ x, y, r: COIN_R, t: Math.random() * 6 });
  return true;
}

/* 生成一个具体的障碍物，baseY 表示它站在哪条线上（地面 GY 或平台顶 p.y） */
function spawnObstacleAt(x, baseY) {
  const r = Math.random();

  if (r < 0.4) {
    // 藤壶：圆形，1~3 个连成一排
    const n = Math.floor(rnd(1, 4));
    const d = BARN_R * 2;
    for (let i = 0; i < n; i++) {
      obstacles.push({
        t: 'barn',
        x: x + i * (d + BARN_GAP),
        w: d,
        h: d,
        r: BARN_R,
        baseY: baseY,
        v: Math.floor(Math.random() * 5) + 1,   // 变体 1~5
      });
    }
    const rowW = n * d + (n - 1) * BARN_GAP;
    return x + rowW; // 返回这一排障碍占据的终点

  } else if (r < 0.7) {
    // 高墙（平台上或地面）
    obstacles.push({
      t: 'wall', x: x, w: OBSTACLE_W.wall, h: 140, baseY: baseY,
      v: Math.floor(Math.random() * 5) + 1,   // 变体 1~5
    });
    lastWallX = x;                       // ← 记录高墙位置，用于 2 秒冷却
    return x + OBSTACLE_W.wall;

  } else {
    // 洞墙（仅地面）
    obstacles.push({ t: 'holed', x: x, w: OBSTACLE_W.holed, baseY: baseY });
    return x + OBSTACLE_W.holed;
  }
}

/* =========================================================
   在地块上放一处障碍
   ---------------------------------------------------------
   规则：
     · 障碍放在中途之后（x + w*0.5 起），给玩家反应时间；
     · 一整排藤壶不能超出地块右缘，否则会压到下一块地上；
     · force = true 时一定会放下一处（用来消灭「空荡荡的平地」）。
   ========================================================= */
function placeObstacleAt(p, x, forForce) {
  const roll = Math.random();

  if (roll < 0.33) {
    // 藤壶：1~3 个连成一排，但整排不许越出地块右缘
    const d = BARN_R * 2;
    const step = d + BARN_GAP;
    const n = Math.min(Math.floor(rnd(1, 4)), Math.max(1, Math.floor((p.x + p.w - 20 - x) / step)));
    for (let i = 0; i < n; i++) {
      obstacles.push({
        t: 'barn', x: x + i * step, w: d, h: d, r: BARN_R, baseY: p.y,
        v: Math.floor(Math.random() * 5) + 1,
      });
    }
    return true;
  }

  if (roll < 0.66) {
    // 高墙
    if (x + OBSTACLE_W.wall > p.x + p.w - 10) return false;
    obstacles.push({
      t: 'wall', x: x, w: OBSTACLE_W.wall, h: 140, baseY: p.y,
      v: Math.floor(Math.random() * 5) + 1,
    });
    lastWallX = x;
    return true;
  }

  // 洞墙：右边要留出一大片安全区
  if (x <= p.x + p.w - HOLED_SAFE_GAP) {
    obstacles.push({ t: 'holed', x: x, w: OBSTACLE_W.holed, baseY: p.y });
    return true;
  }
  // 地块不够长放洞墙 -> 退而放一排藤壶，保证不会留下空地
  if (forForce) {
    const d = BARN_R * 2;
    obstacles.push({ t: 'barn', x: x, w: d, h: d, r: BARN_R, baseY: p.y,
                     v: Math.floor(Math.random() * 5) + 1 });
    return true;
  }
  return false;
}

/* 生成一块地块，含它上面出现的障碍物。返回该地块结束的 x 坐标
   ---------------------------------------------------------
   ★ 除了「鲸元券海」的奖励时间，任何一块地上都至少会有一处东西
     （坑洞 / 藤壶 / 高墙 / 洞墙），不再出现一片空荡荡的平地。 */
function createPlot(x, lvl) {
  const h = PLAT_H[lvl];
  const w = rnd(PLAT_MIN_W, PLAT_MAX_W);
  const p = { x: x, w: w, y: GY - h, lvl: lvl };
  platforms.push(p);

  const obsRangeMin = x + w * 0.5;
  const obsRangeMax = x + w - 120;
  let placed = false;                     // 这块地上有没有放过东西

  // ① 地层坑洞（原本有概率出，现在再加上「兜底」：没别的东西时优先补一个坑）
  const rollPit = Math.random() < PIT_ON_PLAT_CHANCE;
  if (rollPit) {
    if (obsRangeMax > obsRangeMin) {
      const pitW = rnd(PIT_ON_PLAT_MIN_W, PIT_ON_PLAT_MAX_W);
      const pitX = rnd(obsRangeMin, Math.max(obsRangeMin + 1, obsRangeMax - pitW));
      if (pitX + pitW < x + w - 80) { pits.push({ x: pitX, w: pitW, y: p.y }); placed = true; }
    }
    // 有坑就不再叠障碍，避免坑边贴着高墙
    if (placed) return x + w;
  }

  // ② 障碍：原本按概率出，现在改成「没出就兜底补一个」
  const wantObst = Math.random() < PLAT_OBST_CHANCE;
  if (wantObst && obsRangeMax > obsRangeMin) {
    placed = placeObstacleAt(p, rnd(obsRangeMin, obsRangeMax), false);
  }
  if (!placed) {
    placeObstacleAt(p, rnd(obsRangeMin, Math.max(obsRangeMin + 1, obsRangeMax)), true);
  }

  return x + w;
}

function spawn() {
  const startX = spawnX;

  /* ── 鲸元券海阶段：★ 这是「奖励时间」，唯一允许一片平坦、什么都不放的地方 ──
     铺平地，不放障碍 / 坑洞，等级保持当前 groundLevel。
     每次鲸元券海能放的阵列数由 coinSeaLeft 控制（由 09_update.js 按触发次数设置），
     放完就继续铺平地、不再撒鲸元券。 */
  if (coinSeaPhase === 'active') {
    const w = rnd(PLAT_MIN_W, PLAT_MAX_W);
    const p = { x: spawnX, w: w, y: GY - PLAT_H[groundLevel], lvl: groundLevel };
    platforms.push(p);
    spawnX += w;

    if (coinSeaLeft > 0) {
      const matrixW = (COIN_SEA_COLS - 1) * COIN_DX;
      if (w > matrixW + 80) {
        spawnCoinMatrix(p.x + (w - matrixW) / 2, p.y);
        coinSeaLeft--;
      }
    }
    return;
  }

  // 连片地块：正常情况下直接铺一块；
  // 剩下的概率就插一个独立障碍 —— 概率乘上障碍密度，所以密度越高越常出障碍。
  const obstChance = Math.min(0.6, 0.1 * OBST_DENSITY);
  if (Math.random() >= obstChance) {
    // 高墙后 2 秒内（按当前速度折算成距离）不得出现高级地层：
    // 如果最近刚生成过高墙，且当前地块离它太近，就把等级强制降为 0。
    let lvl = groundLevel;
    // 高墙右侧 260 像素内不得出现高层地层（>=1 级）；
    // 坡进行中时不打断坡的节奏。
    if (!slopeActive && lvl >= 1 && spawnX - lastWallX < 260) {
      lvl = 0;
    }
    spawnX = createPlot(spawnX, lvl);
  } else {
    // 插入普通障碍（藤壶 / 高墙 / 洞墙 / 深坑）
    spawnX += nextSpawnGap();
    spawnX = spawnObstacleAt(spawnX, GY);

    const lastObst = obstacles[obstacles.length - 1];
    if (lastObst && lastObst.t === 'holed') {
      spawnX += HOLED_SAFE_GAP;
    } else {
      spawnX += 120;
    }
  }

  // 鲸元券：每次都尝试，必出一个。
  const coinStart = startX + 80;
  const coinEnd   = spawnX - 80;
  if (coinEnd > coinStart) {
    let placed = false;
    for (let attempt = 0; attempt < 12; attempt++) {
      const cx = rnd(coinStart, coinEnd);
      if (trySpawnCoin(cx)) { placed = true; break; }
    }
    if (!placed) trySpawnCoin((coinStart + coinEnd) / 2);
  }
}

/* =========================================================
   三排 10 列鲸元券阵列
   · 低排 GY-50   跑着就能吃
   · 中排 GY-110  小跳
   · 高排 GY-170  大跳 / 二段跳
   baseY 传平台顶（p.y），高度都相对它算。
   ========================================================= */
function spawnCoinMatrix(x, baseY) {
  const rows = [50, 110, 170];
  for (const dy of rows) {
    for (let c = 0; c < COIN_SEA_COLS; c++) {
      coins.push({
        x: x + c * COIN_DX,
        y: baseY - dy,
        r: COIN_R,
        t: Math.random() * 6,
      });
    }
  }
}

function spawnAhead() {
  while (spawnX < player.x + SPAWN_AHEAD) spawn();
}

function recycle() {
  obstacles = obstacles.filter(o => o.x + 200 > cam);
  pits      = pits.filter(p => p.x + p.w > cam - RECYCLE_BEHIND);
  coins     = coins.filter(c => !c.got && c.x > cam - 100);
  platforms = platforms.filter(p => p.x + p.w > cam - RECYCLE_BEHIND);
}

/* =========================================================
   复活兜底：保证「安全区」外面马上有东西
   ---------------------------------------------------------
   复活时会清掉前方一段障碍（安全区），免得一站起来就撞死。
   问题是如果正好清在「奖励时间」那片平地上，前方会一路空下去，
   看起来就像关卡不生成东西了（用户反馈的「一望无际的大平地」）。

   所以这里做一次硬保证：安全区之外 REVIVE_ENSURE_WITHIN 像素内
   如果既没有障碍也没有坑，就当场补一排藤壶。
   ========================================================= */
function ensureSomethingAhead(safeDist) {
  const from  = player.x;
  const limit = from + safeDist + REVIVE_ENSURE_WITHIN;

  for (const o of obstacles) {
    const ow = (o.w !== undefined) ? o.w : (o.r * 2);
    if (o.x + ow > from && o.x < limit) return;   // 前方已经有东西了
  }
  for (const p of pits) {
    if (p.x + p.w > from && p.x < limit) return;
  }

  // 找一段能站人的地面（跳过坑洞），最多试几个位置
  let x = from + safeDist + 40;
  let gy = Infinity;
  for (let i = 0; i < 5; i++) {
    gy = groundYAt(x);
    if (isFinite(gy)) break;
    x += 90;
  }
  if (!isFinite(gy)) return;                      // 实在找不到落脚点就算了

  const d    = BARN_R * 2;
  const step = d + BARN_GAP;
  for (let i = 0; i < 2; i++) {
    obstacles.push({
      t: 'barn', x: x + i * step, w: d, h: d, r: BARN_R,
      baseY: gy, v: Math.floor(Math.random() * 5) + 1,
    });
  }
}

/* =========================================================
   地面高度 / 平台侧壁推回
   ========================================================= */
function groundYAt(x) {
  let y = GY;
  for (const p of platforms) {
    if (x > p.x && x < p.x + p.w && p.y < y) y = p.y;
  }
  // 坑洞检查：同一层有坑洞，就没有地面（返回 Infinity）
  for (const pit of pits) {
    const py = (pit.y !== undefined) ? pit.y : GY;
    if (x > pit.x && x < pit.x + pit.w && py === y) return Infinity;
  }
  return y;
}

function resolvePlatformPush(dt) {
  for (const p of platforms) {
    // 把平台按它上面的坑洞切成若干「实心段」
    const pPits = pits.filter(pit => {
      const py = (pit.y !== undefined) ? pit.y : GY;
      return py === p.y && pit.x + pit.w > p.x && pit.x < p.x + p.w;
    });
    pPits.sort((a, b) => a.x - b.x);

    const segs = [];
    let cursor = p.x;
    for (const pit of pPits) {
      if (pit.x > cursor) segs.push({ x: cursor, w: pit.x - cursor });
      cursor = Math.max(cursor, pit.x + pit.w);
    }
    if (cursor < p.x + p.w) segs.push({ x: cursor, w: p.x + p.w - cursor });

    // ── 坑洞右边缘的「虚拟阻挡线」 ──────────────────────
    if (player.y > p.y + 1) {
      const playerRight = player.x + pW() - BOX_PAD_X;
      for (const pit of pPits) {
        const rightWall = pit.x + pit.w;
        if (playerRight > rightWall && player.x < rightWall) {
          player.x = rightWall - pW() + BOX_PAD_X;
          return true;
        }
      }
    }

    // ── 平台侧面推挤（从左侧撞上实心段） ──────────────
    if (player.y <= p.y + 1) continue;
    if (player.y - pH() + BOX_PAD_Y >= GY) continue;

    for (const seg of segs) {
      const limit = seg.x - pW() + BOX_PAD_X - 1;
      if (player.x > limit && player.x < seg.x) {
        player.x = limit;
        player.x -= PUSH_BACK_SPEED * dt;
        // 记下是谁挡的路：复活时要站到它顶上去（否则会一直贴在侧面被推到死）
        blockedPlatform = p;
        blockedSeg = seg;
        return true;
      }
    }
  }
  return false;
}

/* =========================================================
   复活时要用到的两个判断
   · pitOnPlatformAt   某块平台上某个 x 处有没有坑洞
   · canStandOnPlatformAt  玩家脚底落在台面上时，四角会不会插进别的高台
   ========================================================= */
function pitOnPlatformAt(p, x) {
  for (const pit of pits) {
    const py = (pit.y !== undefined) ? pit.y : GY;
    if (py === p.y && x > pit.x && x < pit.x + pit.w) return pit;
  }
  return null;
}

function canStandOnPlatformAt(p, x) {
  const left  = x + BOX_PAD_X;
  const right = x + pW() - BOX_PAD_X;
  const top   = p.y - pH() + BOX_PAD_Y;

  if (pitOnPlatformAt(p, x)) return false;            // 站在坑上

  for (const q of platforms) {
    if (q === p || q.y >= p.y) continue;              // 只关心更高的台子
    if (right <= q.x || left >= q.x + q.w) continue;  // 横向没重叠
    if (top >= q.y) continue;                         // 人在台面之上，挤不到
    const l = Math.max(left, q.x);
    const r = Math.min(right, q.x + q.w);
    if (r <= l) continue;
    const pit = pitOnPlatformAt(q, (l + r) / 2);
    if (!pit || r - l > pit.w) return false;
  }
  return true;
}

/* =========================================================
   碰撞盒
   ========================================================= */
function obstacleBox(o) {
  if (o.t === 'holed') {
    const baseY = o.baseY || GY;
    // 画面按 o.w（68）铺开，碰撞盒只有尖端那么细，并且居中落在藤蔓中间。
    // 想改粗细：01_config.js 的 OBSTACLE_W.holedHit
    const hw = Math.min(OBSTACLE_W.holedHit, o.w);
    return {
      x: o.x + (o.w - hw) / 2,
      y: -200,
      w: hw,
      h: baseY - OBSTACLE_W.holedGap + 200,
    };
  }
  if (o.t === 'barn') {
    return { x: o.x, y: o.baseY - o.r * 2, w: o.r * 2, h: o.r * 2 };
  }
  return { x: o.x, y: o.baseY - o.h, w: o.w, h: o.h };
}

function rectHit(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

function circleRectHit(cx, cy, r, rect) {
  const nx = clamp(cx, rect.x, rect.x + rect.w);
  const ny = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy <= r * r;
}

function hitObstacle() {
  const b = pBox();
  for (const o of obstacles) {
    if (o.t === 'barn') {
      const cx = o.x + o.r;
      const cy = o.baseY - o.r;
      if (circleRectHit(cx, cy, o.r, b)) return o;
    } else {
      if (rectHit(b, obstacleBox(o))) return o;
    }
  }
  return null;
}

function eatCoins() {
  const b = pBox();
  let got = 0;
  for (const c of coins) {
    if (c.got) continue;
    if (c.x + c.r > b.x && c.x - c.r < b.x + b.w &&
        c.y + c.r > b.y && c.y - c.r < b.y + b.h) {
      c.got = true;
      coinsCollected++;      // 本局收获 +1（一个鲸元券就是一个）
      got++;
    }
  }
  if (got) SFX.coin();
}

/* =========================================================
   铁盆撞碎障碍
   · 撞到藤壶：同一排（同 baseY、x 相邻）的藤壶一起碎
   · 撞到高墙 / 洞墙：只碎那一个
   · 碎完铁盆就消耗掉（ironPotActive = false）
   ========================================================= */
function smashObstacle(o) {
  if (o.t === 'barn') {
    const baseY = o.baseY;
    obstacles = obstacles.filter(x =>
      !(x.t === 'barn' && x.baseY === baseY &&
        x.x > o.x - 150 && x.x < o.x + 650)
    );
  } else {
    obstacles = obstacles.filter(x => x !== o);
  }

  ironPotActive = false;
  SFX.smash();
  if (typeof refreshPotButton === 'function') refreshPotButton();
}