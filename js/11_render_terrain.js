/* =========================================================
   11 绘制：地面 / 深坑 / 高台
   ---------------------------------------------------------
   地面 & 高台统一为「泥土 + 草地」。
   纹理改动：
     · 泥土斑点改成低频大块（8×8），不抢戏、不闪。
     · 删掉顶部 2px 白色高光，减少和运动背景的视觉冲突。
   ========================================================= */

function drawGround() {
  if (SPR.ground && SPR.ground.complete && SPR.ground.naturalWidth > 0) {
    ctx.drawImage(SPR.ground, 0, GY, W, H - GY);
    return;
  }

  /* 泥土主体 */
  ctx.fillStyle = COL.dirt;
  ctx.fillRect(0, GY + 12, W, H - GY - 12);

  /* 泥土低频大块纹理：世界坐标 + 同速滚动 */
  ctx.fillStyle = COL.dirtDark;
  for (let i = 0; i < 18; i++) {
    const worldX = i * 271;
    const x = ((worldX - cam) % (W + 300) + W + 300) % (W + 300) - 150;
    const y = GY + 32 + (i % 4) * 26;
    if (y > H - 10) continue;
    ctx.fillRect(x, y, 8, 8);
  }

  /* 草地上层 */
  ctx.fillStyle = COL.grass;
  ctx.fillRect(0, GY, W, 12);

  /* 草地底下一条暗边 */
  ctx.fillStyle = COL.grassDark;
  ctx.fillRect(0, GY + 10, W, 3);
}

function drawPits() {
  for (const p of pits) {
    const sx = p.x - cam;
    if (sx > W || sx + p.w < 0) continue;

    const topY = (p.y !== undefined) ? p.y : GY;

    const pitGrad = ctx.createLinearGradient(0, topY, 0, H);
    pitGrad.addColorStop(0, COL.pit);
    pitGrad.addColorStop(1, COL.pitDeep);
    ctx.fillStyle = pitGrad;
    ctx.fillRect(sx, topY, p.w, H - topY);

    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(sx, topY, 3, H - topY);
    ctx.fillRect(sx + p.w - 3, topY, 3, H - topY);
  }
}

/* 高台：泥土 + 顶部草地的实心方块 */
function drawPlatforms() {
  for (const p of platforms) {
    const sx = p.x - cam;
    if (sx > W || sx + p.w < 0) continue;

    const h = GY - p.y;
    if (h <= 0) continue;

    /* 泥土主体 */
    ctx.fillStyle = COL.dirt;
    ctx.fillRect(sx, p.y + 12, p.w, h - 12);

    /* 平台内的泥土颗粒：跟平台一起滚动，用世界坐标定位，撒在平台范围内 */
    ctx.save();
    ctx.beginPath();
    ctx.rect(sx, p.y + 12, p.w, h - 12);
    ctx.clip();
    ctx.fillStyle = COL.dirtDark;
    for (let i = 0; i < 10; i++) {
      const worldX = p.x + (i * 137) % Math.max(1, p.w - 8);
      const x = worldX - cam;
      const y = p.y + 22 + (i % 4) * 18;
      if (y > GY - 8) continue;
      ctx.fillRect(x, y, 8, 8);
    }
    ctx.restore();

    /* 草地 */
    ctx.fillStyle = COL.grass;
    ctx.fillRect(sx, p.y, p.w, 12);

    /* 草地底部暗边 */
    ctx.fillStyle = COL.grassDark;
    ctx.fillRect(sx, p.y + 10, p.w, 3);

    /* 左侧竖边（保留一点点立体感，但不是白高光） */
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.fillRect(sx, p.y, 3, h);

    /* 右下角暗边 */
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.fillRect(sx + p.w - 3, p.y, 3, h);
  }
}