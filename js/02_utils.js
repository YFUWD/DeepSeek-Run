/* =========================================================
   02 工具函数
   ========================================================= */

/* a ~ b 之间的随机小数 */
const rnd = (a, b) => a + Math.random() * (b - a);

const clamp = (v, a, b) => (v < a ? a : (v > b ? b : v));

/* 画一个「有贴图就用贴图、没有就画色块」的东西。
   图片没加载完（complete=false）时自动回退成矩形，所以素材缺失不会白屏。 */
function drawSpr(img, x, y, w, h, color) {
  if (img && img.complete && img.naturalWidth > 0) ctx.drawImage(img, x, y, w, h);
  else { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }
}

/* 圆角矩形路径（调用方自己 fill / stroke） */
function roundRect(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* 最高分存档：读 / 写都包 try/catch（file:// 下可能被禁用） */
function loadBest() {
  try { return parseInt(localStorage.getItem(BEST_KEY), 10) || 0; }
  catch (e) { return 0; }
}
function saveBest(v) {
  try { localStorage.setItem(BEST_KEY, String(Math.floor(v))); }
  catch (e) { /* 存不上就算了，不影响玩 */ }
}

/* 累计鲸元券：跨局保存，读取 / 写入也包 try/catch */
function loadTotalCoins() {
  try { return parseInt(localStorage.getItem(COIN_KEY), 10) || 0; }
  catch (e) { return 0; }
}
function saveTotalCoins(v) {
  try { localStorage.setItem(COIN_KEY, String(Math.floor(v))); }
  catch (e) { /* 存不上就算了 */ }
}

/* 通用计数读写：给铁盆 / 白饭这类「买了就存」的数量用 */
function loadCount(key) {
  try { return parseInt(localStorage.getItem(key), 10) || 0; }
  catch (e) { return 0; }
}
function saveCount(key, v) {
  try { localStorage.setItem(key, String(Math.floor(v))); }
  catch (e) { /* 存不上就算了 */ }
}
