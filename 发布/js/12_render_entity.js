/* =========================================================
   12 绘制：鲸元券与路障
   ========================================================= */

/* 带旋转的贴图：把贴图的中心放在 (cx, cy)，按 w×h 画完再转 angle 弧度。
   高墙素材是横躺的铅笔，要塞进竖条就必须转 90°。 */
function drawSprRot(img, cx, cy, w, h, color, angle) {
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  } else {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }
}

function drawCoins() {
  for (const c of coins) {
    const sx = c.x - cam;
    if (sx < -30 || sx > W + 30) continue;

    c.t += 0.08;
    const cy = c.y + Math.sin(c.t) * 3;

    /* 半透明金色光圈：每个鲸元券都套一层，随浮动一起呼吸。
       用 'lighter' 叠加，在深色夜空和深色海面上都亮得起来。
       想调：COIN_GLOW_* （01_config.js） */
    const pulse = 0.78 + 0.22 * Math.sin(c.t * 1.7);
    const R = COIN_GLOW_R * pulse;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(sx, cy, 0, sx, cy, R);
    glow.addColorStop(0,    `rgba(255,214,102,${(COIN_GLOW_A * 1.25).toFixed(3)})`);
    glow.addColorStop(0.45, `rgba(255,193,58,${COIN_GLOW_A.toFixed(3)})`);
    glow.addColorStop(1,    'rgba(255,180,0,0)');
    ctx.beginPath();
    ctx.arc(sx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();
    ctx.restore();

    if (SPR.coin && SPR.coin.complete && SPR.coin.naturalWidth > 0) {
      // 鲸元券素材是横向票券，按原图比例画、以圆点为心
      const iw = COIN_SPRITE_W;
      const ih = iw * SPR.coin.naturalHeight / SPR.coin.naturalWidth;
      ctx.drawImage(SPR.coin, sx - iw / 2, cy - ih / 2, iw, ih);
    } else {
      // 鲸元券本体
      ctx.beginPath();
      ctx.arc(sx, cy, c.r, 0, Math.PI * 2);
      ctx.fillStyle = COL.coin;
      ctx.fill();
      ctx.strokeStyle = '#e6a700';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 高光，让它看起来是立体的
      ctx.beginPath();
      ctx.arc(sx - c.r * 0.3, cy - c.r * 0.35, c.r * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.fill();
    }
  }
}

/* =========================================================
   高墙（藤蔓）左边的魂技飘字
   ---------------------------------------------------------
   两行白字 + 黑描边，飘在藤蔓左侧一点，随镜头一起走。
   想改文案 / 大小 / 位置：01_config.js 里的 VINE_TEXT_*
   ========================================================= */
function soulTextLine(text, x, y, size) {
  ctx.font = `bold ${size}px "PingFang SC","Microsoft YaHei",system-ui,sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';

  // 黑描边：先把 8 个方向的黑字铺一圈，再盖白色字心
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = Math.max(2, size * 0.22);
  ctx.strokeText(text, x, y);
  ctx.fillStyle = '#fff';
  ctx.fillText(text, x, y);
}

function drawSoulSkillText(sx, topY) {
  const size = VINE_TEXT_SIZE;
  const x    = sx - VINE_TEXT_GAP;      // 贴着藤蔓左边
  const y0   = topY + VINE_TEXT_DY;     // 第一行
  const lh   = size * 1.18;             // 行距

  ctx.save();
  soulTextLine(VINE_TEXT_1, x, y0, size);
  soulTextLine(VINE_TEXT_2, x, y0 + lh, size);
  ctx.restore();
}

function drawObstacles() {
  for (const o of obstacles) {
    const sx = o.x - cam;
    if (sx > W + 100 || sx + o.w < -100) continue;

    if (o.t === 'barn') {
      const r  = o.r;
      const cx = sx + r;
      const cy = o.baseY - r;

      // 按变体号取对应素材：o.v 是 1~5，对应 barn1~barn5
      const barnImg = SPR['barn' + (o.v || 1)];
      if (barnImg && barnImg.complete && barnImg.naturalWidth > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(barnImg, cx - r, cy - r, r * 2, r * 2);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = COL.barn;
        ctx.fill();
      }

    } else if (o.t === 'wall') {
      // 按变体号取素材：o.v 是 1~5，对应 wall1~wall5
      const wallImg = SPR['wall' + (o.v || 1)];
      if (WALL_ROTATE) {
        // 素材是横躺铅笔 → 转 -90°（笔尖朝上）；高按原图比例算，避免压扁
        const ratio = (wallImg && wallImg.naturalWidth)
          ? wallImg.naturalWidth / wallImg.naturalHeight : 200 / 45;
        const wh = o.w * ratio;
        drawSprRot(wallImg, sx + o.w / 2, o.baseY - wh / 2, wh, o.w, COL.wall, -Math.PI / 2);
      } else {
        drawSpr(wallImg, sx, o.baseY - o.h, o.w, o.h, COL.wall);
      }

    } else {
      // 洞墙（藤蔓）：从屏幕顶一直垂到离地 holedGap 的位置，左边飘魂技字
      // 画面按 o.w 铺满，碰撞盒只用尖端那么细的一条（见 obstacleBox）
      const baseY = o.baseY || GY;
      const h = baseY - OBSTACLE_W.holedGap + 200;
      drawSpr(SPR.holed, sx, -200, o.w, h, COL.holed);
      drawSoulSkillText(sx, 0);
    }
  }
}