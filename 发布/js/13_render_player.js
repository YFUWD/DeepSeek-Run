/* =========================================================
   13 绘制：人物
   ---------------------------------------------------------
   两件事：
     ① 空中翻跟头（用 ctx.rotate + player.rot）
     ② 复活无敌期间闪烁 + 一圈金色光环

   想让人物显示得大一点/小一点：改下面的 DRAW_SCALE，
   它只影响画面，不影响碰撞盒（手感不变）。
   ========================================================= */

const DRAW_SCALE = 1.0;

/* 人物贴图：脚底对齐 player.y。
   h 是绘制高度，宽度按原图比例算 —— 不按比例的话 105×116 的素材会被压扁。 */
function drawPlayerSprite(img, w, h) {
  if (img && img.complete && img.naturalWidth > 0) {
    const sw = h * img.naturalWidth / img.naturalHeight;
    ctx.drawImage(img, -sw / 2, -h, sw, h);
  } else {
    ctx.fillStyle = COL.player;
    ctx.fillRect(-w / 2, -h, w, h);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeRect(-w / 2, -h, w, h);
  }
}

/* 四帧跑步贴图里已经加载好的那些。
   素材是异步加载的，如果只判断"当前这一帧好没好"，就会出现
   贴图 / 程序色块来回闪的情况 —— 所以只要有任意一帧好了，就都用贴图。 */
function readyRunFrames() {
  return [SPR.player, SPR.playerRun2, SPR.playerRun3, SPR.playerRun4]
    .filter(im => im && im.complete && im.naturalWidth > 0);
}

function drawPlayer() {
  // 无敌时按 8 帧的节奏闪
  const show = invTimer <= 0 || Math.floor(invTimer / 8) % 2 === 0;
  if (!show) return;

  const w = pW() * DRAW_SCALE;
  const h = pH() * DRAW_SCALE;
  const sprH = PLAYER_SPRITE_H;              // 贴图绘制高度（固定 56，脚底对齐）

  // 人物以「脚底中心」为锚点
  ctx.save();
  ctx.translate(player.x - cam + w / 2, player.y);

  // 跑步动画：着地且没趴下时切帧，空中保持当前帧
  if (player.onGround && !player.duck) {
    runFrame = (runFrame + speed * RUN_FRAME_STEP) % 4;
  }
  const frameIdx = Math.floor(runFrame) % 4;

  // 空中翻跟头（保持原来的观感）
  if (!player.onGround && !player.duck) {
    ctx.translate(0, -sprH / 2);
    ctx.rotate(player.rot);
    ctx.translate(0, sprH / 2);
  }

  /* ① 铁盆投影：先画一圈淡淡的椭圆，让铁盆看起来是"落在头上"而不是飘着 */
  if (ironPotActive) {
    const potW = w * POT_WIDTH_RATIO;
    ctx.fillStyle = 'rgba(18,21,28,.30)';
    ctx.beginPath();
    ctx.ellipse(0, -sprH + 6, potW * 0.30, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ② 人物本体（趴下时换滑铲贴图）
        贴图一律按原图比例算宽度，这样两套动作看起来才是同一个角色。
        滑铲再额外「直接压扁」：高度按 DUCK_SQUASH 压，宽度同比例放大
        （等于整体压扁，不是只缩一边）。脚底对齐 player.y，所以一定贴着地面。 */
  if (player.duck) {
    const dh = (PL_DUCK_H + 12) * DUCK_SCALE / DUCK_SQUASH;   // 高度压扁
    const dw = dh * DUCK_W_RATIO;                            // 宽度按比例算，整体压扁
    drawPlayerSprite(SPR.playerDuck || SPR.player, dw, dh);
  } else {
    const frames = readyRunFrames();
    if (frames.length) drawPlayerSprite(frames[frameIdx % frames.length], w, sprH);
    else               drawPlayerSprite(null, w, sprH);
  }

  /* ③ 铁盆：两半是「同一个位置的上下两层」，不是左右拼合
        · 下部分 = 盆身/盆沿 → 画在人物**下方**（图层后面），脸两侧露出来
        · 上部分 = 盆顶/盆盖 → 画在人物**上方**（图层前面），盖住头顶
        两半共用 POT_Y 这个锚点、同一个宽度，只差图层顺序。
        盆身还会被剪掉「脸那一段」，免得把脸糊住。
        位置/大小在 01_config.js 的 POT_Y / POT_WIDTH_RATIO */
  if (ironPotActive) {
    const potW = w * POT_WIDTH_RATIO;
    const potH = potW * POT_BOTTOM_H_RATIO;   // 盆身（下半）
    const topH = potW * POT_TOP_H_RATIO;      // 盆顶（上半）

    const hasTop = SPR.potTop && SPR.potTop.complete && SPR.potTop.naturalWidth > 0;
    const hasBot = SPR.potBottom && SPR.potBottom.complete && SPR.potBottom.naturalWidth > 0;

    if (hasBot) {
      if (hasTop) {
        // 有盆顶时，盆身只画「脸以下」那一段，脸完整露出来
        ctx.save();
        ctx.beginPath();
        ctx.rect(-potW, POT_BOTTOM_CLIP_Y, potW * 2, potH * 4);
        ctx.clip();
        ctx.drawImage(SPR.potBottom, -potW / 2, POT_Y, potW, potH);
        ctx.restore();
      } else {
        ctx.drawImage(SPR.potBottom, -potW / 2, POT_Y, potW, potH);
      }
    }

    if (hasTop) {
      ctx.drawImage(SPR.potTop, -potW / 2, POT_Y, potW, topH);
    }

    // 两半都没有时，退回程序画的金属圈
    if (!hasTop && !hasBot) {
      ctx.fillStyle = '#9aa5b4';
      ctx.beginPath();
      ctx.ellipse(0, POT_Y + potH * 0.35, potW / 2, potH * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7f8899';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  ctx.restore();

  // 无敌光环
  if (invTimer > 0) {
    ctx.beginPath();
    ctx.arc(player.x - cam + w / 2, player.y - sprH / 2, w * 1.15, 0, Math.PI * 2);
    ctx.strokeStyle = COL.invuln;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

/* =========================================================
   宠物「用户」
   ---------------------------------------------------------
   暂时画成一个小长方形，不参与碰撞、不影响玩法。
   以后换贴图：把图片路径填进 js/03_assets.js 的 pet 槽位即可。
   ========================================================= */
function drawPet() {
  const sx = petX - cam;
  const sy = petY;

  // 屏幕外不画
  if (sx < -60 || sx > W + 60) return;

  const w = 22, h = 16;

  // 有一点点上下飘的观感 —— 用 sin 做轻微倾斜
  const tilt = Math.sin(petT * 2.4) * 0.12;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(tilt);

  if (SPR.pet && SPR.pet.complete && SPR.pet.naturalWidth > 0) {
    ctx.drawImage(SPR.pet, -w / 2, -h / 2, w, h);
  } else {
    // 占位：紫色小长方形 + 黑色描边
    ctx.fillStyle = '#a78bfa';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
  }

  ctx.restore();
}
