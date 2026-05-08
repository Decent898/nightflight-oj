import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
const root = resolve(import.meta.dirname, "..");

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.BROWSER_PATH || undefined
});
const page = await browser.newPage({
  viewport: { width: 720, height: 1280 },
  deviceScaleFactor: 1
});

await page.route("**/api/leaderboard**", route => {
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ entries: [], rank: null })
  });
});

await page.goto(pathToFileURL(resolve(root, "index.html")).href, { waitUntil: "load" });
await page.waitForSelector("#game");
await page.evaluate(async () => {
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const style = document.createElement("style");
  style.textContent = `
    html,body{width:720px!important;height:1280px!important;overflow:hidden!important;background:#050914!important}
    .shell{width:720px!important;height:1280px!important;display:block!important;padding:0!important;margin:0!important}
    .side-panel,.dialog{display:none!important}
    .game-stage{width:720px!important;height:1280px!important;min-height:1280px!important;border:0!important;border-radius:0!important}
    canvas{width:720px!important;height:1280px!important;border-radius:0!important}
    .quick-stats{display:none!important}
    .overlay.top{top:28px!important;left:24px!important;right:24px!important}
    .overlay.bottom{bottom:28px!important;left:24px!important;right:24px!important}
    .meter-group{width:100%!important;background:rgba(4,8,18,.62)!important}
    .bossbar{top:118px!important;width:642px!important;background:rgba(4,8,18,.72)!important}
    .cover-shade{position:fixed;inset:0;z-index:9000;background:linear-gradient(180deg,rgba(3,7,14,.75),transparent 30%,rgba(3,7,14,.86));pointer-events:none}
    .cover-main{position:fixed;z-index:9999;left:34px;right:34px;top:172px;color:white;text-align:center;font-family:"Microsoft YaHei","Noto Sans SC",system-ui,sans-serif;text-shadow:0 5px 22px rgba(0,0,0,.85)}
    .cover-main em{display:inline-block;padding:8px 14px;border-radius:999px;border:1px solid rgba(255,209,102,.7);color:#ffd166;background:rgba(12,9,3,.62);font-style:normal;font-size:22px;font-weight:1000}
    .cover-main b{display:block;margin-top:18px;font-size:74px;line-height:.96;font-weight:1000}
    .cover-main strong{color:#4de7ff}
    .cover-main span{display:inline-block;margin-top:18px;padding:11px 18px;border-radius:10px;background:rgba(5,10,22,.72);font-size:28px;font-weight:1000}
    .cover-url{position:fixed;z-index:9999;left:42px;right:42px;bottom:76px;text-align:center;font-family:"Microsoft YaHei","Noto Sans SC",system-ui,sans-serif}
    .cover-url b{display:inline-block;padding:14px 22px;border-radius:12px;color:#06131c;background:linear-gradient(180deg,#7df5ff,#36c6ff);font-size:34px;font-weight:1000;box-shadow:0 18px 42px rgba(54,198,255,.35)}
  `;
  document.head.append(style);
  document.body.insertAdjacentHTML("beforeend", `
    <div class="cover-shade"></div>
    <div class="cover-main">
      <em>刷题人专属弹幕游戏</em>
      <b>这不是<br><strong>普通飞机</strong></b>
      <span>OJ 压力测试变 Boss 战 · 在线排行榜</span>
    </div>
    <div class="cover-url"><b>netflight.bitdate.date</b></div>
  `);
  startGame();
  await sleep(400);
  player.upgrades.gun = 7;
  player.upgrades.engine = 5;
  player.upgrades.dash = 8;
  player.upgrades.protocol = 5;
  player.energy = 100;
  score = 88000;
  updateAllUi();
  queueBossStory();
  setTimeout(() => beginBossEncounter(), 220);
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", code: "ArrowRight", bubbles: true }));
  setInterval(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift", code: "Shift", bubbles: true }));
    setTimeout(() => window.dispatchEvent(new KeyboardEvent("keyup", { key: "Shift", code: "Shift", bubbles: true })), 58);
  }, 385);
  await sleep(2600);
});

await page.screenshot({
  path: resolve(root, "promo-output", "nightflight-marketing-cover.png"),
  fullPage: false
});
await browser.close();
