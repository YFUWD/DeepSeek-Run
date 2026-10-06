/* =========================================================
   14 HUD：分数 / 最高分 / 速度条 / 状态提示
   ---------------------------------------------------------
   全部画在 canvas 上（不是 DOM），所以缩放和游戏画面天然一致。
   文字大小用逻辑单位，改数字就行。
   ========================================================= */

function drawHUD() {
  /* 刘海 / 药丸屏的安全区（10_camera.js 里算好的逻辑单位），
     免得分数被状态栏或挖孔挡住 */
  const padX = 10 + SAFE_LEFT;
  const padY = 10 + SAFE_TOP;

  /* 左上角 HUD 半透明底板：让静止文字和运动背景脱开 */
  ctx.fillStyle = 'rgba(18,21,28,.35)';
  roundRect(padX, padY, 260, 40, 12);
  ctx.fill();

  ctx.fillStyle = 'rgba(232,238,252,.85)';
  ctx.font = 'bold 20px system-ui,sans-serif';

  // 左上：分数
  ctx.textAlign = 'left';
  const scoreStr = '分数 ' + Math.floor(score);
  ctx.fillText(scoreStr, padX + 10, padY + 24);

  // 分数右边：鲸元券图标 + 本局收集数量（有贴图就用贴图，没有才画金币圆）
  const scoreW = ctx.measureText(scoreStr).width;
  const coinIconX = padX + 10 + scoreW + 30;
  const coinIconY = padY + 17;
  if (SPR.coin && SPR.coin.complete && SPR.coin.naturalWidth > 0) {
    const iw = 34;
    const ih = iw * SPR.coin.naturalHeight / SPR.coin.naturalWidth;
    ctx.drawImage(SPR.coin, coinIconX - iw / 2, coinIconY - ih / 2, iw, ih);
  } else {
    ctx.beginPath();
    ctx.arc(coinIconX, coinIconY, 8, 0, Math.PI * 2);
    ctx.fillStyle = COL.coin;
    ctx.fill();
    ctx.strokeStyle = '#e6a700';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(coinIconX - 2.4, coinIconY - 2.8, 2.8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fill();
  }

  ctx.fillStyle = COL.txt;
  // 左上角显示「总数」：存档总鲸元券 + 本局已吃，实时变化
  // （死亡时 coinsCollected 会并入 totalCoins 并清零，所以数字前后连续不断档）
  ctx.fillText('× ' + (totalCoins + coinsCollected), coinIconX + 14, padY + 24);

  // 右上：最高分（同样躲开右边的刘海）
  ctx.textAlign = 'right';
  ctx.fillText('最高 ' + Math.floor(best), W - 20 - SAFE_RIGHT, padY + 24);

  // 右下：速度条
  drawSpeedBar();

  // 复活后的无敌倒计时（贴在人头顶上方，比放角落更容易注意到）
  if (invTimer > 0 && state === 'playing') {
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px system-ui,sans-serif';
    ctx.fillStyle = COL.invuln;
    ctx.fillText('无敌 ' + (invTimer / 60).toFixed(1) + 's',
                 player.x - cam + pW() / 2, player.y - pH() - 14);
  }

  // 静音开关的提示（小字，不抢视线；底部躲开手机的手势条）
  ctx.textAlign = 'left';
  ctx.font = '13px system-ui,sans-serif';
  ctx.fillStyle = 'rgba(232,238,252,.45)';
  ctx.fillText(muted ? '🔇 M 开启声音' : '🔊 M 静音', padX + 10, H - 16 - SAFE_BOTTOM);

  /* 左下角上面一行：累计访问 / 通关（见 js/17_visit.js）。
     用 typeof 保护：万一那个文件没加载，HUD 照画不误。 */
  if (typeof drawVisitCounter === 'function') drawVisitCounter();
}


/* 速度条：从起跑速度到上限的进度 */
function drawSpeedBar() {
  const ratio = clamp((speed - SPD) / (SPD_MAX - SPD), 0, 1);
  const bw = 160, bh = 10;
  const bx = W - bw - 20 - SAFE_RIGHT;
  const by = H - 30 - SAFE_BOTTOM;

  ctx.fillStyle = 'rgba(255,255,255,.15)';
  ctx.fillRect(bx, by, bw, bh);

  ctx.fillStyle = COL.coin;
  ctx.fillRect(bx, by, bw * ratio, bh);
}
