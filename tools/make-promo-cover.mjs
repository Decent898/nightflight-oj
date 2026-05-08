import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const root = resolve(import.meta.dirname, "..");
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.BROWSER_PATH || undefined
});
const page = await browser.newPage({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1
});

await page.route("**/api/leaderboard**", route => {
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ entries: [] })
  });
});

await page.goto(pathToFileURL(resolve(root, "index.html")).href, { waitUntil: "load" });
await page.waitForSelector("#game");
await page.evaluate(async () => {
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const style = document.createElement("style");
  style.textContent = `
    .shell{max-width:1280px!important;margin:0!important}
    .side-panel{display:none!important}
    .game-stage{min-height:720px!important;border-radius:0!important}
    canvas{border-radius:0!important}
    .cover-title{
      position:fixed;left:48px;bottom:52px;z-index:9999;color:white;
      font-family:"Microsoft YaHei","Noto Sans SC",system-ui,sans-serif;
      text-shadow:0 4px 24px rgba(0,0,0,.8)
    }
    .cover-title b{display:block;font-size:58px;line-height:1.05}
    .cover-title span{display:block;margin-top:12px;font-size:22px;color:#dff8ff}
    .cover-site{position:fixed;right:42px;top:34px;z-index:9999;color:#7df5ff;font:700 18px system-ui,sans-serif}
  `;
  document.head.append(style);
  const title = document.createElement("div");
  title.className = "cover-title";
  title.innerHTML = "<b>良乡夜航</b><span>弹幕冲刺 · Boss 压力测试 · 在线排行榜</span>";
  document.body.append(title);
  const site = document.createElement("div");
  site.className = "cover-site";
  site.textContent = "netflight.bitdate.date";
  document.body.append(site);

  startGame();
  await sleep(300);
  player.upgrades.gun = 6;
  player.upgrades.engine = 4;
  player.upgrades.dash = 8;
  player.upgrades.protocol = 4;
  player.energy = 100;
  updateAllUi();
  queueBossStory();
  setTimeout(() => beginBossEncounter(), 250);
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", code: "ArrowRight", bubbles: true }));
  setInterval(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift", code: "Shift", bubbles: true }));
    setTimeout(() => {
      window.dispatchEvent(new KeyboardEvent("keyup", { key: "Shift", code: "Shift", bubbles: true }));
    }, 60);
  }, 390);
  await sleep(2600);
});

await page.screenshot({
  path: resolve(root, "promo-output", "nightflight-promo-cover.png"),
  fullPage: false
});
await browser.close();
