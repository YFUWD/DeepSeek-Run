/* =========================================================
   09 每帧更新
   ========================================================= */

/* =========================================================
   入场动画
   ========================================================= */
function updateIntro(dt) {
  if (viewOffset < 2) viewOffset = 0;

  const targetX = cam + SCREEN_X;
  if (player.x < targetX) {
    player.x = Math.min(targetX, player.x + SPD * dt);
  }

  if (viewOffset === 0 && player.x >= targetX) {
    player.x = targetX;
    state    = 'playing';
  }

  petT += dt * 0.05;
  const petTargetX = player.x + 50 + Math.cos(petT * 1.3) * 24;
  const petTargetY = player.y - pH() / 2 - 50 + Math.sin(petT * 1.9) * 18;
  petX += (petTargetX - petX) * 0.08 * dt;
  petY += (petTargetY - petY) * 0.08 * dt;

  spawnAhead();
  recycle();
}


function update(dt) {
  /* ---- 视角过渡 ---- */
  const viewTarget = (state === 'menu') ? MENU_VIEW_OFFSET : 0;
  viewOffset += (viewTarget - viewOffset) * 0.06 * dt;

  /* ---- 昼夜循环推进（任何时候都在走） ---- */
  dayTime = (dayTime + dt / DAY_LENGTH) % 1;

  if (state === 'ad')    { updateAd(dt);    return; }
  if (state === 'intro') { updateIntro(dt); return; }
  if (state !== 'playing') return;

  accelerate(dt);
  if (invTimer > 0) invTimer -= dt;

  /* ---- 坡 ---- */
  if (slopeActive) {
    slopeTimer -= dt;
    if (slopeTimer <= 0) {
      slopeStage++;
      if (slopeStage >= SLOPE_SEQUENCE.length) {
        slopeActive = false;
        levelTimer  = rnd(LEVEL_DUR_MIN, LEVEL_DUR_MAX) * 60;
      } else {
        groundLevel = SLOPE_SEQUENCE[slopeStage];
        slopeTimer  = SLOPE_STAGE_FRAMES;
      }
    }
  } else {
    levelTimer -= dt;
    if (levelTimer <= 0) {
      if (Math.random() < SLOPE_CHANCE) {
        slopeActive = true;
        slopeStage  = 0;
        slopeTimer  = SLOPE_STAGE_FRAMES;
        groundLevel = SLOPE_SEQUENCE[0];
      } else {
        groundLevel = Math.floor(Math.random() * PLAT_H.length);
        levelTimer  = rnd(LEVEL_DUR_MIN, LEVEL_DUR_MAX) * 60;
      }
    }
  }

  /* ---- 鲸元券海状态机 ---- */
  if (coinSeaPhase === 'none') {
    if (score >= nextCoinSeaScore) {
      coinSeaPhase = 'transition';
      coinSeaTimer = COIN_SEA_TRANSITION;
    }
  } else if (coinSeaPhase === 'transition') {
    coinSeaTimer -= dt;
    if (coinSeaTimer <= 0) {
      coinSeaPhase = 'active';

      coinSeaTriggerCount++;
      coinSeaLeft = Math.min(coinSeaTriggerCount, 3);

      const durIdx = Math.min(coinSeaTriggerCount - 1, COIN_SEA_DURATIONS.length - 1);
      coinSeaTimer = COIN_SEA_DURATIONS[durIdx];
    }
  } else if (coinSeaPhase === 'active') {
    coinSeaTimer -= dt;
    if (coinSeaTimer <= 0) {
      coinSeaPhase = 'none';
      nextCoinSeaScore += COIN_SEA_TRIGGER_STEP;
    }
  }

  /* ---- 玩家前进 ---- */
  player.x += speed * dt;

  /* ---- 平台侧壁 ---- */
  const isPushed = resolvePlatformPush(dt);

  /* ---- 镜头控制 ---- */
  if (isPushed) {
    wasPushed = true;
    isRecovering = false;
    cam += speed * dt;
  } else {
    if (wasPushed) {
      wasPushed = false;
      isRecovering = true;
    }

    if (isRecovering) {
      if (player.onGround) {
        const diff = SCREEN_X - (player.x - cam);
        const recoverSpeed = diff / 300;
        player.x += recoverSpeed * dt;
        cam += speed * dt;

        if (Math.abs(diff) < 1) {
          isRecovering = false;
          cam = player.x - SCREEN_X;
        }
      } else {
        cam += speed * dt;
      }
    } else if (typeof knockLeft !== 'undefined' && knockLeft > 0) {
      /* 正在被藤壶子弹往回弹：镜头【不跟着人走】，照常按 speed 前进。
         既不能倒退（画面倒抽），也不能冻结（画面突然停住），
         人只是在画面里稍微往右挪一点 —— 看起来就是"被撞了一下"。
         （现在回弹是纯视觉偏移，不动物理坐标，所以这里其实和下面等效。） */
      cam += speed * dt;
      camSoft = true;      // 回弹结束后柔和地拉回正常跟随
    } else if (camSoft) {
      /* 中弹恢复期：柔和地把镜头拉回目标位置。
         只在刚被子弹打完那几帧启用，避免起步/状态切换时画面生硬地挪一下。 */
      const want = player.x - SCREEN_X;
      cam += (want - cam) * CAM_CATCHUP * dt;
      if (Math.abs(want - cam) < 0.5) { cam = want; camSoft = false; }
    } else {
      /* 正常情况：精确跟随（不做平滑）。
         精确跟随能保证「镜头推进量 == 当帧速度」，不会有恒定落差；
         而被子弹打中的回弹是纯画面偏移、不动物理坐标，
         所以这里根本不会出现需要追赶的落差。 */
      cam = player.x - SCREEN_X;
    }
  }

  /* ---- 被推出屏幕左缘 = 死 ---- */
  if (player.x + pW() - cam < 0) { die(); return; }

  score += 0.1 * dt;

  /* ---- 跳跃缓冲 ---- */
  updateJumpBuffer(dt);

  /* ---- 兜底：不在 playing 状态就强制松开滑铲 ---- */
  if (state !== 'playing') duckHeld = false;

  /* ---- 垂直物理 ---- */
  updatePlayerPhysics(dt);

  /* ---- 宠物「用户」 ---- */
  petT += dt * 0.05;
  const petTargetX = player.x + 50 + Math.cos(petT * 1.3) * 24;
  const petTargetY = player.y - pH() / 2 - 50 + Math.sin(petT * 1.9) * 18;
  petX += (petTargetX - petX) * 0.08 * dt;
  petY += (petTargetY - petY) * 0.08 * dt;

  /* ---- 掉出屏幕 = 死 ---- */
  if (player.y - pH() > H) { die(); return; }

  /* ---- 铺路 / 回收 ---- */
  spawnAhead();
  recycle();

  /* ---- 吃鲸元券 ---- */
  eatCoins();

  /* ---- 撞障碍 ---- */
  if (invTimer <= 0) {
    const hit = hitObstacle();
    if (hit) {
      if (ironPotActive) {
        smashObstacle(hit);
      } else {
        die();
        return;
      }
    }
  }
}