/* =========================================================
   17 访问统计（abacus）
   ---------------------------------------------------------
   纯静态站没有后端，用第三方计数器服务：
       https://abacus.jasoncameron.dev
   · /hit   +1 并返回最新值（key 不存在会自动创建）
   · /get   只读
   免费、免注册、所有端点都开放 CORS，所以 github.io 上能直接 fetch。
   命名空间和 key 在 js/01_config.js 里，换服务只改那边。

   ★ 三条铁律（照着做就不会出事）：
     1. 【取数】只在启动 / 事件时做一次，绝不放渲染循环里 ——
        限流是「每个 IP 每 10 秒 30 次」，60fps 每帧一个请求必炸 429。
     2. 同一个会话只 +1 一次（sessionStorage 记着），按 F5 不灌水。
        用 sessionStorage 而不是 localStorage：后者会永久记住，
        老访客永远不再 +1，数字就失真了。
     3. 【拿不到就整块不画】—— 服务挂了 / 被墙 / 断网 / 限流，
        都不许影响玩游戏，也不许显示 0（那会让人以为没人来过）。
   ========================================================= */

/* 拿到的数字放这里。渲染只读内存，不发请求。 */
const visit = { total: 0, clears: 0 };

/* 统一的一层：任何异常都变成 null，调用方只需要判 null */
function visitFetch(url) {
  if (typeof fetch !== 'function') return Promise.resolve(null);   // 无头测试 / 老浏览器
  return fetch(url, { cache: 'no-store' })                         // 别让浏览器缓存旧数字
    .then(r => (r && r.ok ? r.json() : null))                      // 404/429/500 都落到这里
    .then(j => (j && typeof j.value === 'number') ? j.value : null) // 别把 {"error":...} 当数字
    .catch(() => null);                                            // 静默：拿不到就当没有
}

function visitSessionHad(key) {
  try { return sessionStorage.getItem(key) === '1'; } catch (e) { return false; }
}
function visitSessionMark(key) {
  try { sessionStorage.setItem(key, '1'); } catch (e) { /* 存不上也没关系 */ }
}

/* 累计访问：本会话第一次进来算一次，之后只读 */
function startVisitCounter() {
  const counted = visitSessionHad(VISIT_LS_KEY);
  visitFetch(counted ? VISIT_GET : VISIT_HIT).then(n => {
    if (n === null || n <= 0) return;
    visit.total = n;
    visitSessionMark(VISIT_LS_KEY);
  });

  loadClearCount();
}

/* 通关数：只读，不动它 */
function loadClearCount() {
  visitFetch(CLEAR_GET).then(n => {
    if (n !== null) visit.clears = n;
  });
}

/* 玩家买到白饭（= 通关）时调一次；同一个会话只报一次 */
function reportClear() {
  if (typeof fetch !== 'function') return;
  if (visitSessionHad(CLEAR_LS_KEY)) return;
  visitFetch(CLEAR_HIT).then(n => {
    if (n === null) return;
    visit.clears = n;
    visitSessionMark(CLEAR_LS_KEY);
  });
}

/* =========================================================
   画在左下角（「M 静音」那行的上面一行）
   ---------------------------------------------------------
   ★ 这里每帧都会被调用，但只读 visit 里的内存值，不发请求。
     没拿到数字就整行不画。
   ========================================================= */
function drawVisitCounter() {
  if (!visit.total) return;                       // 没数字 → 不画 0、不画「—」

  let text = '累计访问 ' + visit.total;
  if (visit.clears > 0) text += ' · 通关 ' + visit.clears;

  ctx.save();
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font         = '13px system-ui,sans-serif';

  const x = 10 + SAFE_LEFT + 10;
  const y = H - 38 - SAFE_BOTTOM;                 // 「M 静音」在 H-16，这行在它上面

  ctx.lineWidth   = 3;
  ctx.strokeStyle = 'rgba(0,0,0,.55)';            // 描边：压在亮背景上也看得清
  ctx.strokeText(text, x, y);
  ctx.fillStyle   = 'rgba(232,238,252,.5)';
  ctx.fillText(text, x, y);
  ctx.restore();
}
