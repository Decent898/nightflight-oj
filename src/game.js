const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const DPR = Math.min(window.devicePixelRatio || 1, 2);

const C = window.GameContent;
const Store = window.ProfileStore;
const SFX = window.AudioFX;

const ui = {
  score: id("score"),
  life: id("life"),
  shield: id("shield"),
  combo: id("combo"),
  time: id("time"),
  energyText: id("energyText"),
  energyFill: id("energyFill"),
  itemName: id("itemName"),
  dash: id("dash"),
  dashScore: id("dashScore"),
  graze: id("graze"),
  phaseText: id("phaseText"),
  bossbar: id("bossbar"),
  bossName: id("bossName"),
  bossPhase: id("bossPhase"),
  bossFill: id("bossFill"),
  menu: id("menu"),
  pause: id("pause"),
  over: id("over"),
  upgrade: id("upgrade"),
  upgradeList: id("upgradeList"),
  upgradeIntro: id("upgradeIntro"),
  story: id("story"),
  storySpeaker: id("storySpeaker"),
  storyTitle: id("storyTitle"),
  storyText: id("storyText"),
  storyNext: id("storyNext"),
  result: id("result"),
  start: id("start"),
  resume: id("resume"),
  again: id("again"),
  pilotName: id("pilotName"),
  pilotView: id("pilotView"),
  menuRank: id("menuRank"),
  menuBest: id("menuBest"),
  rankName: id("rankName"),
  rankHint: id("rankHint"),
  rankProgress: id("rankProgress"),
  bestScore: id("bestScore"),
  totalScore: id("totalScore"),
  gunLevel: id("gunLevel"),
  engineLevel: id("engineLevel"),
  dashLevel: id("dashLevel"),
  protocolLevel: id("protocolLevel")
};

function id(name) {
  return document.getElementById(name);
}

const keys = new Set();
const pointer = { active: false, x: 0, y: 0 };
const touchStick = { active: false, id: null, x: 0, y: 0 };
const touchDrag = { active: false, id: null, lastX: 0, lastY: 0, dx: 0, dy: 0 };
const gamepad = { x: 0, y: 0, current: new Set(), previous: new Set(), connected: false, name: "", lastInput: "" };
const rand = (min, max) => min + Math.random() * (max - min);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const distance = (a, b, c, d) => Math.hypot(a - c, b - d);

let W = 1180;
let H = 760;
let last = 0;
let state = "menu";
let profile = Store.load();
let player;
let score = 0;
let elapsed = 0;
let combo = 1;
let grazeCount = 0;
let perfectDashCount = 0;
let defeatedBosses = 0;
let spawnTimer = 0;
let itemTimer = 4;
let bossTimer = 38;
let slowMo = 0;
let skillTime = 0;
let shake = 0;
let flash = 0;
let upgradeLevel = 1;
let nextMilestoneIndex = 0;
let upgradeQueued = false;
let upgradeButtons = [];
let selectedUpgradeIndex = 0;
let currentBoss = null;
let pendingBossTemplate = null;
let stars = [];
let enemies = [];
let bullets = [];
let shots = [];
let items = [];
let sparks = [];
let popups = [];
let profileSyncToken = 0;
let touchControls = null;
let gamepadBadge = null;
let netUi = {};

const remotePlayers = new Map();
const netplay = {
  ws: null,
  room: "",
  id: "",
  color: "#4de7ff",
  connected: false,
  sendTimer: 0
};

const itemMeta = {
  shield: { name: "AC 护盾", color: "#79ff9d", glyph: "AC" },
  clear: { name: "CE 清屏", color: "#ffd166", glyph: "CE" },
  slow: { name: "TLE 慢放", color: "#7ba7ff", glyph: "TL" },
  energy: { name: "样例包", color: "#4de7ff", glyph: "IN" },
  heal: { name: "RE 血包", color: "#ff8bd1", glyph: "HP" },
  upgrade: { name: "改造点", color: "#ff8bd1", glyph: "UP" }
};

function resize() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * DPR));
  canvas.height = Math.max(1, Math.floor(rect.height * DPR));
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  W = rect.width;
  H = rect.height;
}

function reset() {
  resize();
  const playerId = cleanPlayerId(ui.pilotName.value || profile.playerId || profile.name || "BITer") || "BITer";
  let name = playerId;
  if (playerId && playerId !== profile.playerId) {
    profile = Store.loadById(playerId, profile);
    name = profile.playerId || playerId;
  }
  profile.name = name;
  profile.playerId = playerId;
  Store.save(profile);
  player = {
    x: W * 0.5,
    y: H * 0.72,
    r: 8,
    life: 3,
    maxLife: 3,
    energy: 0,
    shield: 0,
    inv: 0,
    dash: 0,
    postDashInv: 0,
    dashCooldown: 0,
    fireCooldown: 0,
    trail: [],
    upgrades: { gun: 1, engine: 1, dash: 1, protocol: 1 },
    perks: { magnet: 0, iframe: 0, grazeGain: 0, shieldRecycle: 0, bossDamage: 0, energyTax: 0 }
  };
  score = 0;
  elapsed = 0;
  combo = 1;
  grazeCount = 0;
  perfectDashCount = 0;
  defeatedBosses = 0;
  spawnTimer = 0;
  itemTimer = 3;
  bossTimer = 38;
  slowMo = 0;
  skillTime = 0;
  shake = 0;
  flash = 0;
  upgradeLevel = 1;
  nextMilestoneIndex = 0;
  upgradeQueued = false;
  currentBoss = null;
  pendingBossTemplate = null;
  enemies = [];
  bullets = [];
  shots = [];
  items = [];
  sparks = [];
  popups = [];
  stars = Array.from({ length: 140 }, () => ({
    x: rand(0, W),
    y: rand(0, H),
    size: rand(0.6, 2.1),
    speed: rand(14, 58)
  }));
  updateAllUi();
  updateTouchControls();
}

function syncProfileUi() {
  const ranked = Store.rankFor(profile.totalScore || 0);
  const username = profile.playerId || profile.name || "BITer";
  ui.pilotName.value = username;
  ui.pilotView.textContent = username;
  ui.bestScore.textContent = Math.floor(profile.bestScore || 0).toLocaleString("zh-CN");
  ui.totalScore.textContent = Math.floor(profile.totalScore || 0).toLocaleString("zh-CN");
  ui.rankName.textContent = ranked.current.name;
  ui.rankName.style.color = ranked.current.color;
  ui.rankHint.textContent = ranked.next
    ? `${ranked.current.hint} · 距 ${ranked.next.name.split(" / ")[0]} ${Math.ceil((ranked.next.min - (profile.totalScore || 0))).toLocaleString("zh-CN")} 分`
    : ranked.current.hint;
  ui.rankProgress.style.width = `${Math.floor(ranked.progress * 100)}%`;
  ui.rankProgress.style.background = ranked.current.color;
  ui.menuRank.textContent = ranked.current.name;
  ui.menuBest.textContent = `最高分 ${Math.floor(profile.bestScore || 0).toLocaleString("zh-CN")}`;
}

function startGame() {
  if (state === "playing") return;
  document.activeElement?.blur?.();
  SFX.start();
  reset();
  if (netUi.room?.value && !netplay.connected) joinNetRoom(netUi.room.value);
  state = "playing";
  updateTouchControls();
  ui.menu.classList.add("hidden");
  ui.pause.classList.add("hidden");
  ui.over.classList.add("hidden");
  ui.upgrade.classList.add("hidden");
  ui.story.classList.add("hidden");
  last = performance.now();
  requestAnimationFrame(loop);
}

function pauseGame() {
  if (state !== "playing") return;
  state = "paused";
  updateTouchControls();
  ui.pause.classList.remove("hidden");
}

function resumeGame() {
  if (state !== "paused" && state !== "upgrade" && state !== "story") return;
  state = "playing";
  updateTouchControls();
  ui.pause.classList.add("hidden");
  ui.upgrade.classList.add("hidden");
  ui.story.classList.add("hidden");
  last = performance.now();
  requestAnimationFrame(loop);
}

function endGame() {
  state = "over";
  updateTouchControls();
  SFX.gameOver();
  const run = {
    playerId: profile.playerId,
    name: profile.name,
    score,
    elapsed,
    bosses: defeatedBosses,
    perfectDash: perfectDashCount
  };
  profile = Store.commitRun(profile, run);
  syncProfileUi();
  window.Leaderboard?.submitRun(profile, run);
  ui.result.innerHTML = `分数 <strong>${Math.floor(score).toLocaleString("zh-CN")}</strong>，坚持 <strong>${formatTime(elapsed)}</strong>，击破 Boss <strong>${defeatedBosses}</strong> 个，Perfect Dash <strong>${perfectDashCount}</strong> 次。账号段位已写入本地档案。`;
  ui.over.classList.remove("hidden");
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function cleanPlayerId(value) {
  return Store.normalizePlayerId(value);
}

async function syncProfileById(playerId) {
  const id = cleanPlayerId(playerId);
  if (!id) return;
  const token = ++profileSyncToken;
  profile = Store.loadById(id, profile);
  Store.save(profile);
  syncProfileUi();

  const remote = await window.Leaderboard?.loadProfile(id);
  if (token !== profileSyncToken || !remote) return;
  profile = Store.mergeRemote(profile, remote);
  Store.save(profile);
  syncProfileUi();
}

function updateAllUi() {
  ui.score.textContent = Math.floor(score).toLocaleString("zh-CN");
  ui.life.textContent = `${player.life}/${player.maxLife}`;
  ui.shield.textContent = `${Math.max(0, player.shield).toFixed(1)}s`;
  ui.combo.textContent = `${combo.toFixed(1)}x`;
  ui.time.textContent = formatTime(elapsed);
  ui.energyText.textContent = `${Math.floor(player.energy)}%`;
  ui.energyFill.style.width = `${clamp(player.energy, 0, 100)}%`;
  ui.itemName.textContent = items[0] ? itemMeta[items[0].kind].name : "无";
  ui.dash.textContent = player.dashCooldown <= 0 ? "就绪" : `${player.dashCooldown.toFixed(1)}s`;
  ui.dashScore.textContent = perfectDashCount;
  ui.graze.textContent = grazeCount;
  ui.gunLevel.textContent = `Lv.${player.upgrades.gun}`;
  ui.engineLevel.textContent = `Lv.${player.upgrades.engine}`;
  ui.dashLevel.textContent = `Lv.${player.upgrades.dash}`;
  ui.protocolLevel.textContent = `Lv.${player.upgrades.protocol}`;
  ui.phaseText.textContent = currentBoss ? "Boss 压力测试中" : `下一次 Boss：${Math.ceil(bossTimer)}s`;
  syncProfileUi();

  if (currentBoss && currentBoss.hp > 0) {
    ui.bossbar.classList.remove("hidden");
    ui.bossName.textContent = currentBoss.name;
    ui.bossPhase.textContent = `Phase ${currentBoss.phase}`;
    ui.bossFill.style.width = `${clamp(currentBoss.hp / currentBoss.maxHp, 0, 1) * 100}%`;
    ui.bossFill.style.background = currentBoss.color;
  } else {
    ui.bossbar.classList.add("hidden");
  }
  updateTouchControls();
}

function spawnEnemy() {
  const difficulty = 1 + elapsed / 65 + defeatedBosses * 0.14;
  const roll = Math.random();
  const kind = roll > 0.78 ? "fan" : roll > 0.45 ? "drift" : "aim";
  enemies.push({
    kind,
    x: rand(70, W - 70),
    y: -32,
    r: kind === "fan" ? 19 : 16,
    hp: kind === "fan" ? 34 + difficulty * 4 : 24 + difficulty * 3,
    maxHp: kind === "fan" ? 34 + difficulty * 4 : 24 + difficulty * 3,
    t: 0,
    cooldown: rand(0.3, 0.9),
    wobble: rand(0, Math.PI * 2),
    boss: false
  });
}

function queueBossStory() {
  if (currentBoss) return;
  pendingBossTemplate = C.bosses[defeatedBosses % C.bosses.length];
  const story = pendingBossTemplate.story;
  state = "story";
  updateTouchControls();
  ui.storySpeaker.textContent = story.speaker;
  ui.storyTitle.textContent = story.title;
  ui.storyText.textContent = story.text;
  ui.story.classList.remove("hidden");
  SFX.setBossMusic(true);
}

function beginBossEncounter() {
  if (!pendingBossTemplate) return;
  const template = pendingBossTemplate;
  pendingBossTemplate = null;
  const hp = template.hp + defeatedBosses * 170 + elapsed * 2.5;
  currentBoss = {
    ...template,
    kind: "boss",
    x: W * 0.5,
    y: -70,
    r: 42,
    hp,
    maxHp: hp,
    phase: 1,
    t: 0,
    cooldown: 0.35,
    boss: true
  };
  enemies.push(currentBoss);
  bullets = bullets.slice(0, Math.floor(bullets.length * 0.35));
  addPopup(W * 0.5, H * 0.22, template.quote, template.color);
  SFX.boss(template.name);
  shake = 10;
  resumeGame();
}

function spawnItem(kind = null) {
  const kinds = ["shield", "clear", "slow", "energy", "heal"];
  const pick = kind || kinds[Math.floor(Math.random() * kinds.length)];
  items.push({
    kind: pick,
    x: rand(58, W - 58),
    y: -24,
    r: pick === "upgrade" ? 17 : 15,
    vy: rand(54, 78),
    spin: rand(0, Math.PI * 2)
  });
}

function update(dt) {
  elapsed += dt;
  const difficulty = 1 + elapsed / 70 + defeatedBosses * 0.18;

  spawnTimer -= dt;
  if (spawnTimer <= 0 && !currentBoss) {
    spawnEnemy();
    spawnTimer = Math.max(0.62, 1.35 - difficulty * 0.1);
  }

  bossTimer -= dt;
  if (bossTimer <= 0) {
    queueBossStory();
    bossTimer = 58 + defeatedBosses * 8;
    return;
  }

  itemTimer -= dt;
  if (itemTimer <= 0) {
    spawnItem();
    itemTimer = rand(5.4, 8.2);
  }

  updatePlayer(dt);
  updateWorld(dt);
  checkCollisions();
  cleanup();

  const nextMilestone = C.upgradeMilestones[nextMilestoneIndex];
  if (nextMilestone && score >= nextMilestone && !upgradeQueued) queueUpgrade(`积分里程碑 ${nextMilestone.toLocaleString("zh-CN")}`);
  score += dt * 13 * combo;
  combo = Math.max(1, combo - dt * 0.035);
  player.inv = Math.max(0, player.inv - dt);
  player.postDashInv = Math.max(0, player.postDashInv - dt);
  player.shield = Math.max(0, player.shield - dt);
  slowMo = Math.max(0, slowMo - dt);
  skillTime = Math.max(0, skillTime - dt);
  flash = Math.max(0, flash - dt);
  shake = Math.max(0, shake - dt * 34);
  updateNetplay(dt);
  updateAllUi();
}

function updatePlayer(dt) {
  let mx = 0;
  let my = 0;
  const keyX = Number(keys.has("arrowright") || keys.has("d")) - Number(keys.has("arrowleft") || keys.has("a"));
  const keyY = Number(keys.has("arrowdown") || keys.has("s")) - Number(keys.has("arrowup") || keys.has("w"));
  const keyboardActive = Math.hypot(keyX, keyY) > 0;
  if (keyboardActive) {
    mx = keyX;
    my = keyY;
  } else {
    if (pointer.active) {
      const dx = pointer.x - player.x;
      const dy = pointer.y - player.y;
      const d = Math.hypot(dx, dy);
      if (d > 4) {
        mx += dx / d;
        my += dy / d;
      }
    }
    if (touchStick.active) {
      mx += touchStick.x;
      my += touchStick.y;
    }
    mx += gamepad.x;
    my += gamepad.y;
  }

  const len = Math.hypot(mx, my) || 1;
  if (keys.has("shift")) triggerDash();

  const wasDashing = player.dash > 0;
  player.dash = Math.max(0, player.dash - dt);
  if (wasDashing && player.dash <= 0) {
    player.postDashInv = Math.max(player.postDashInv, 0.16 + player.perks.iframe * 0.025);
    player.inv = Math.max(player.inv, player.postDashInv);
  }
  player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  const speed = (286 + player.upgrades.engine * 16) * (player.dash > 0 ? 2.45 : 1);
  const dragX = keyboardActive ? 0 : touchDrag.dx * 1.08;
  const dragY = keyboardActive ? 0 : touchDrag.dy * 1.08;
  touchDrag.dx = 0;
  touchDrag.dy = 0;
  player.x = clamp(player.x + dragX + (mx / len) * speed * dt, 26, W - 26);
  player.y = clamp(player.y + dragY + (my / len) * speed * dt, 76, H - 28);
  player.trail.push({ x: player.x, y: player.y, life: 0.24, dash: player.dash > 0 });
  player.trail = player.trail.filter(p => (p.life -= dt) > 0).slice(-18);

  player.fireCooldown -= dt;
  const fireRate = Math.max(0.045, (skillTime > 0 ? 0.06 : 0.108) - player.upgrades.gun * 0.006);
  if (player.fireCooldown <= 0) {
    player.fireCooldown = fireRate;
    const side = player.upgrades.gun >= 3 || skillTime > 0;
    const wide = player.upgrades.gun >= 5;
    const offsets = wide ? [-21, -8, 8, 21] : side ? [-16, 0, 16] : [-8, 8];
    offsets.forEach((offset, index) => {
      const vx = wide ? (index - 1.5) * 34 : 0;
      shots.push({ x: player.x + offset, y: player.y - 12, px: player.x + offset, py: player.y - 12, vx, vy: -660, r: 3.2 });
    });
    SFX.shoot();
  }
}

function triggerDash() {
  if (!player || player.dashCooldown > 0 || player.dash > 0) return;
  player.dash = 0.18 + player.upgrades.dash * 0.012;
  player.dashCooldown = Math.max(0.38, 0.86 - player.upgrades.dash * 0.06);
  player.inv = Math.max(player.inv, 0.24 + player.upgrades.dash * 0.01 + player.perks.iframe * 0.025);
  addSpark(player.x, player.y, "#4de7ff", 16, 1.7);
  SFX.dash();
}

function updateWorld(dt) {
  stars.forEach(s => {
    s.y += s.speed * dt;
    if (s.y > H) {
      s.y = -4;
      s.x = rand(0, W);
    }
  });

  enemies.forEach(e => {
    e.t += dt;
    if (e.boss) {
      e.y = Math.min(H * 0.2, e.y + 48 * dt);
      e.x = W * 0.5 + Math.sin(e.t * 0.9) * W * 0.22;
      e.phase = e.hp < e.maxHp * 0.35 ? 3 : e.hp < e.maxHp * 0.68 ? 2 : 1;
      fireBoss(e, dt);
    } else {
      e.y += (e.kind === "fan" ? 38 : 52) * dt;
      e.x += Math.sin(e.t * 1.7 + e.wobble) * 35 * dt;
      fireEnemy(e, dt);
    }
  });

  const bulletFactor = slowMo > 0 ? 0.55 : 1;
  bullets.forEach(b => {
    b.x += b.vx * dt * bulletFactor;
    b.y += b.vy * dt * bulletFactor;
  });

  shots.forEach(s => {
    s.px = s.x;
    s.py = s.y;
    s.x += (s.vx || 0) * dt;
    s.y += s.vy * dt;
  });
  items.forEach(i => {
    i.y += i.vy * dt;
    i.spin += dt * 3.4;
  });
  sparks.forEach(p => {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.94;
    p.vy *= 0.94;
  });
  popups.forEach(p => {
    p.life -= dt;
    p.y -= 34 * dt;
  });
}

function fireEnemy(e, dt) {
  e.cooldown -= dt;
  if (e.cooldown > 0) return;
  const difficulty = Math.min(4, 1 + elapsed / 70);
  const speed = 118 + difficulty * 22;

  if (e.kind === "fan") {
    e.cooldown = Math.max(0.82, 1.5 - elapsed / 160);
    const base = Math.atan2(player.y - e.y, player.x - e.x);
    for (let i = -2; i <= 2; i++) {
      const a = base + i * 0.18 + Math.sin(e.t * 1.6) * 0.1;
      bullets.push(makeBullet(e.x, e.y, Math.cos(a) * speed, Math.sin(a) * speed, "#ffd166"));
    }
    SFX.enemyFire();
  } else if (e.kind === "drift") {
    e.cooldown = Math.max(0.68, 1.18 - elapsed / 190);
    for (let i = 0; i < 2; i++) {
      const a = e.t * 1.4 + i * Math.PI;
      bullets.push(makeBullet(e.x, e.y, Math.cos(a) * 88, Math.sin(a) * 88 + 86, "#7ba7ff"));
    }
    SFX.enemyFire();
  } else {
    e.cooldown = Math.max(0.58, 1.02 - elapsed / 220);
    const a = Math.atan2(player.y - e.y, player.x - e.x);
    bullets.push(makeBullet(e.x, e.y, Math.cos(a) * speed, Math.sin(a) * speed, "#ff6378"));
    SFX.enemyFire();
  }
}

function fireBoss(e, dt) {
  e.cooldown -= dt;
  if (e.cooldown > 0) return;
  e.cooldown = Math.max(0.12, 0.34 - e.phase * 0.045 - defeatedBosses * 0.012);
  const baseSpeed = 118 + e.phase * 28 + defeatedBosses * 8;

  if (e.phase === 1) {
    const count = 10;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + e.t * 0.75;
      bullets.push(makeBullet(e.x, e.y, Math.cos(a) * baseSpeed, Math.sin(a) * baseSpeed, e.color));
    }
    SFX.enemyFire();
  } else if (e.phase === 2) {
    const aim = Math.atan2(player.y - e.y, player.x - e.x);
    for (let i = -3; i <= 3; i++) {
      const a = aim + i * 0.13 + Math.sin(e.t * 4) * 0.08;
      bullets.push(makeBullet(e.x, e.y, Math.cos(a) * (baseSpeed + 40), Math.sin(a) * (baseSpeed + 40), i ? e.color : "#4de7ff"));
    }
    SFX.enemyFire();
  } else {
    for (let k = 0; k < 2; k++) {
      const a = e.t * (1.8 + k * 0.4) + k * Math.PI;
      bullets.push(makeBullet(e.x, e.y, Math.cos(a) * baseSpeed, Math.sin(a) * baseSpeed + 45, e.color));
    }
    const aim = Math.atan2(player.y - e.y, player.x - e.x);
    bullets.push(makeBullet(e.x, e.y, Math.cos(aim) * (baseSpeed + 85), Math.sin(aim) * (baseSpeed + 85), "#ff6378"));
    SFX.enemyFire();
  }
}

function makeBullet(x, y, vx, vy, color) {
  return { x, y, vx, vy, r: 5.2, color, grazed: false, dashScored: false };
}

function activateSkill() {
  if (state !== "playing" || player.energy < 100) return;
  player.energy = 0;
  skillTime = 3.8 + player.upgrades.protocol * 0.35;
  flash = 0.24;
  shake = 11;
  score += bullets.length * 18 * combo;
  bullets.forEach(b => addSpark(b.x, b.y, "#4de7ff", 2, 1.3));
  bullets = [];
  enemies.forEach(e => e.hp -= e.boss ? 55 + player.perks.bossDamage * 14 : 45);
  addPopup(player.x, player.y - 34, "判题模式", "#ffd166");
  SFX.skill();
}

function collectItem(item) {
  const meta = itemMeta[item.kind];
  addSpark(item.x, item.y, meta.color, 18, 1.4);
  addPopup(item.x, item.y - 18, meta.name, meta.color);
  SFX.item(meta.name);
  score += 120 * combo;

  if (item.kind === "shield") player.shield = Math.max(player.shield, 4.8 + player.upgrades.protocol * 0.55);
  if (item.kind === "clear") {
    score += bullets.length * 12 * combo;
    bullets.forEach(b => addSpark(b.x, b.y, meta.color, 1, 1));
    bullets = [];
    shake = 8;
  }
  if (item.kind === "slow") slowMo = 5.4 + player.upgrades.protocol * 0.25;
  if (item.kind === "energy") player.energy = clamp(player.energy + 24 + player.upgrades.protocol * 2, 0, 100);
  if (item.kind === "heal") {
    player.life = Math.min(player.maxLife, player.life + 1);
    player.shield = Math.max(player.shield, 1.5);
  }
  if (item.kind === "upgrade") queueUpgrade("拾取改造点");
}

function queueUpgrade(reason) {
  if (state !== "playing") return;
  upgradeQueued = true;
  if (C.upgradeMilestones[nextMilestoneIndex] && score >= C.upgradeMilestones[nextMilestoneIndex]) nextMilestoneIndex += 1;
  state = "upgrade";
  updateTouchControls();
  ui.upgradeIntro.textContent = `${reason}，选择一个机体模块。`;
  ui.upgradeList.innerHTML = "";
  upgradeButtons = [];
  selectedUpgradeIndex = 0;
  pickUpgrades(3).forEach((upgrade, index) => {
    const button = document.createElement("button");
    button.className = "upgrade-card";
    button.innerHTML = `<em>${upgrade.group}</em><b>${upgrade.title}</b><span>${upgrade.text}</span>`;
    button.addEventListener("click", () => {
      chooseUpgrade(index);
    });
    upgradeButtons.push({ button, upgrade });
    ui.upgradeList.appendChild(button);
  });
  updateUpgradeSelection();
  ui.upgrade.classList.remove("hidden");
  SFX.upgrade();
}

function pickUpgrades(count) {
  const groups = [...new Set(C.upgrades.map(u => u.group))].sort(() => Math.random() - 0.5);
  const picked = [];
  groups.forEach(group => {
    if (picked.length >= count) return;
    const pool = C.upgrades.filter(u => u.group === group);
    picked.push(pool[Math.floor(Math.random() * pool.length)]);
  });
  while (picked.length < count) {
    const next = C.upgrades[Math.floor(Math.random() * C.upgrades.length)];
    if (!picked.includes(next)) picked.push(next);
  }
  return picked;
}

function updateUpgradeSelection() {
  upgradeButtons.forEach((entry, index) => {
    entry.button.classList.toggle("selected", index === selectedUpgradeIndex);
  });
  upgradeButtons[selectedUpgradeIndex]?.button.focus({ preventScroll: true });
}

function chooseUpgrade(index = selectedUpgradeIndex) {
  const entry = upgradeButtons[index];
  if (!entry) return;
  entry.upgrade.apply(player);
  upgradeLevel += 1;
  upgradeQueued = false;
  addPopup(player.x, player.y - 34, entry.upgrade.title, "#ff8bd1");
  SFX.item(entry.upgrade.title);
  updateAllUi();
  resumeGame();
}

function checkCollisions() {
  shots.forEach(s => enemies.forEach(e => {
    if (e.hp > 0 && segmentCircleHit(s.px ?? s.x, s.py ?? s.y, s.x, s.y, e.x, e.y, s.r + e.r)) {
      e.hp -= (skillTime > 0 ? 13 : 8) + player.upgrades.gun * 0.8 + (e.boss ? player.perks.bossDamage * 0.9 : 0);
      s.dead = true;
      score += (e.boss ? 8 : 5) * combo;
      addSpark(s.x, s.y, "#4de7ff", 1, 0.8);
      SFX.hit();
    }
  }));

  enemies.forEach(e => {
    if (e.hp <= 0 && !e.dead) {
      e.dead = true;
      if (e.boss) {
        defeatedBosses += 1;
        currentBoss = null;
        SFX.setBossMusic(false);
        bossTimer = 42 + defeatedBosses * 9;
        score += 2400 * combo;
        combo = Math.min(9.9, combo + player.perks.bossDamage * 0.2);
        player.energy = clamp(player.energy + 45, 0, 100);
        spawnItem("upgrade");
        addSpark(e.x, e.y, e.color, 46, 1.8);
        addPopup(W * 0.5, H * 0.24, "Boss Accepted", "#79ff9d");
        SFX.bossDown();
        queueUpgrade("Boss 击破");
      } else {
        score += (e.kind === "fan" ? 360 : 240) * combo;
        player.energy = clamp(player.energy + 5, 0, 100);
        addSpark(e.x, e.y, "#79ff9d", 18, 1.4);
        addPopup(e.x, e.y - 18, "Accepted", "#79ff9d");
      }
    }
  });

  items.forEach(i => {
    if (!i.dead && distance(player.x, player.y, i.x, i.y) < player.r + i.r + 6 + player.perks.magnet * 14) {
      i.dead = true;
      collectItem(i);
    }
  });

  bullets.forEach(b => {
    const d = distance(player.x, player.y, b.x, b.y);
    if (!b.grazed && d < player.r + b.r + 18 && d > player.r + b.r - 2) {
      b.grazed = true;
      grazeCount += 1;
      combo = Math.min(9.9, combo + 0.07);
      player.energy = clamp(player.energy + Math.max(0.8, 1.6 + player.perks.grazeGain * 0.35 - player.perks.energyTax), 0, 100);
      score += 26 * combo;
      addSpark(b.x, b.y, "#ffd166", 4, 1);
    }
    if (player.dash > 0 && !b.dashScored && d < player.r + b.r + 34) {
      b.dashScored = true;
      perfectDashCount += 1;
      combo = Math.min(9.9, combo + 0.13);
      player.energy = clamp(player.energy + Math.max(1.6, 3.5 + player.upgrades.dash * 0.75 + player.perks.grazeGain * 0.8 - player.perks.energyTax), 0, 100);
      score += 58 * combo;
      addSpark(b.x, b.y, "#4de7ff", 5, 1.2);
      SFX.perfect();
      if (perfectDashCount % 5 === 0) addPopup(player.x, player.y - 26, "Perfect Dash", "#4de7ff");
    }
    if (d < player.r + b.r && player.inv <= 0 && player.shield <= 0) {
      hitPlayer();
      b.dead = true;
    }
    if (d < player.r + b.r && player.shield > 0) {
      b.dead = true;
      player.energy = clamp(player.energy + player.perks.shieldRecycle * 0.35, 0, 100);
      addSpark(b.x, b.y, "#79ff9d", 5, 1);
    }
  });

  enemies.forEach(e => {
    if (!e.dead && distance(player.x, player.y, e.x, e.y) < player.r + e.r && player.inv <= 0 && player.shield <= 0) {
      if (!e.boss) e.dead = true;
      hitPlayer();
    }
  });
}

function hitPlayer() {
  player.life -= 1;
  player.inv = 1.15;
  combo = Math.max(1, combo * 0.62);
  shake = 16;
  addSpark(player.x, player.y, "#ff6378", 34, 1.8);
  addPopup(player.x, player.y - 30, "Wrong Answer", "#ff6378");
  SFX.hurt();
  if (player.life <= 0) endGame();
}

function segmentCircleHit(x1, y1, x2, y2, cx, cy, radius) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (!len2) return distance(x1, y1, cx, cy) <= radius;
  const t = clamp(((cx - x1) * dx + (cy - y1) * dy) / len2, 0, 1);
  const x = x1 + dx * t;
  const y = y1 + dy * t;
  return distance(x, y, cx, cy) <= radius;
}

function cleanup() {
  enemies = enemies.filter(e => !e.dead && (e.boss || e.y < H + 62));
  bullets = bullets.filter(b => !b.dead && b.x > -80 && b.x < W + 80 && b.y > -90 && b.y < H + 90);
  shots = shots.filter(s => !s.dead && s.y > -46 && s.x > -40 && s.x < W + 40);
  items = items.filter(i => !i.dead && i.y < H + 46);
  sparks = sparks.filter(p => p.life > 0);
  popups = popups.filter(p => p.life > 0);
}

function addSpark(x, y, color, count = 10, power = 1) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2);
    const v = rand(42, 210) * power;
    sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.22, 0.58), maxLife: 0.58, color, r: rand(1.2, 3.4) });
  }
}

function addPopup(x, y, text, color) {
  popups.push({ x, y, text, color, life: 0.86 });
}

function draw() {
  const ox = shake ? rand(-shake, shake) : 0;
  const oy = shake ? rand(-shake, shake) : 0;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.translate(ox, oy);
  drawBackground();
  drawItems();
  drawEnemies();
  drawShots();
  drawBullets();
  drawRemotePlayers();
  drawPlayer();
  drawParticles();
  if (flash > 0) {
    ctx.fillStyle = `rgba(125, 245, 255, ${flash * 2.6})`;
    ctx.fillRect(-30, -30, W + 60, H + 60);
  }
  ctx.restore();
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#081421");
  g.addColorStop(0.55, "#111c2a");
  g.addColorStop(1, "#060910");
  ctx.fillStyle = g;
  ctx.fillRect(-40, -40, W + 80, H + 80);

  ctx.fillStyle = "rgba(255,255,255,.72)";
  stars.forEach(s => {
    ctx.globalAlpha = 0.22 + s.size / 5;
    ctx.fillRect(s.x, s.y, s.size, s.size);
  });
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "rgba(77,231,255,.14)";
  ctx.lineWidth = 1;
  for (let x = (elapsed * 16) % 62; x < W + 120; x += 62) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - 125, H);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,255,255,.045)";
  ctx.fillRect(0, H * 0.84, W, H * 0.16);
  ctx.fillStyle = "rgba(77,231,255,.18)";
  ctx.fillRect(W * 0.08, H * 0.84, W * 0.84, 4);
  ctx.fillStyle = "rgba(255,209,102,.24)";
  ctx.font = `${Math.max(14, W * 0.016)}px Microsoft YaHei`;
  ctx.fillText("良乡校区 · Online Judge 夜航路线", W * 0.08, H * 0.84 - 12);
}

function drawItems() {
  items.forEach(i => {
    const meta = itemMeta[i.kind];
    ctx.save();
    ctx.translate(i.x, i.y);
    ctx.rotate(i.spin);
    ctx.fillStyle = meta.color;
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.arc(0, 0, i.r + 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillRect(-i.r, -i.r, i.r * 2, i.r * 2);
    ctx.fillStyle = "#07111b";
    ctx.font = "900 12px Microsoft YaHei";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(meta.glyph, 0, 1);
    ctx.restore();
  });
  ctx.textAlign = "start";
  ctx.textBaseline = "alphabetic";
}

function drawEnemies() {
  enemies.forEach(e => {
    const color = e.boss ? e.color : e.kind === "fan" ? "#ffd166" : e.kind === "drift" ? "#7ba7ff" : "#ff6378";
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.t * (e.boss ? 0.28 : 0.8));
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.arc(0, 0, e.r + (e.boss ? 24 : 13), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (e.boss) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const r = i % 2 ? e.r * 0.72 : e.r;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#eef5ff";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -e.r);
      ctx.lineTo(e.r, 0);
      ctx.lineTo(0, e.r);
      ctx.lineTo(-e.r, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "#07111b";
    ctx.fillRect(-e.r * 0.52, -3, e.r * 1.04, 6);
    ctx.restore();
  });
}

function drawShots() {
  ctx.fillStyle = skillTime > 0 ? "#ffd166" : "#7df5ff";
  shots.forEach(s => {
    ctx.beginPath();
    ctx.roundRect(s.x - 2, s.y - 13, 4, 19, 2);
    ctx.fill();
  });
}

function drawBullets() {
  bullets.forEach(b => {
    ctx.fillStyle = b.color;
    ctx.globalAlpha = b.grazed ? 0.56 : 1;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r + 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

function drawRemotePlayers() {
  const now = performance.now();
  remotePlayers.forEach((peer, id) => {
    if (now - peer.seen > 5000) {
      remotePlayers.delete(id);
      return;
    }
    const x = clamp((peer.x || 0.5) * W, 26, W - 26);
    const y = clamp((peer.y || 0.72) * H, 76, H - 28);
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.translate(x, y);
    ctx.fillStyle = peer.color || "#79ff9d";
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(11, 11);
    ctx.lineTo(0, 6);
    ctx.lineTo(-11, 11);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.36;
    ctx.strokeStyle = peer.color || "#79ff9d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 19, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.globalAlpha = 0.88;
    ctx.fillStyle = peer.color || "#79ff9d";
    ctx.font = "800 12px Microsoft YaHei";
    ctx.textAlign = "center";
    ctx.fillText(peer.name || "Player", x, y - 24);
    ctx.fillStyle = "rgba(238,245,255,.78)";
    ctx.font = "700 11px Microsoft YaHei";
    ctx.fillText(Math.floor(peer.score || 0).toLocaleString("zh-CN"), x, y + 30);
    ctx.globalAlpha = 1;
    ctx.textAlign = "start";
  });
}

function drawPlayer() {
  player.trail.forEach((p, index) => {
    ctx.globalAlpha = p.life * (p.dash ? 3 : 1.6);
    ctx.fillStyle = p.dash ? "#4de7ff" : "#7ba7ff";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4 + index * 0.16, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.globalAlpha = player.inv > 0 && Math.floor(elapsed * 18) % 2 ? 0.42 : 1;
  if (player.shield > 0) {
    ctx.strokeStyle = "rgba(121,255,157,.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r + 17, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.fillStyle = "#eef5ff";
  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.lineTo(12, 12);
  ctx.lineTo(0, 7);
  ctx.lineTo(-12, 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = skillTime > 0 ? "#ffd166" : "#4de7ff";
  ctx.beginPath();
  ctx.arc(0, 0, 3.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawParticles() {
  sparks.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  popups.forEach(p => {
    ctx.globalAlpha = Math.min(1, p.life * 2);
    ctx.fillStyle = p.color;
    ctx.font = "900 17px Microsoft YaHei";
    ctx.textAlign = "center";
    ctx.fillText(p.text, p.x, p.y);
  });
  ctx.globalAlpha = 1;
  ctx.textAlign = "start";
}

function loop(now) {
  if (state !== "playing") return;
  const dt = Math.min(0.033, (now - last) / 1000 || 0.016);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function inputLoop() {
  pollGamepad();
  requestAnimationFrame(inputLoop);
}

function pollGamepad() {
  const pads = readGamepads().filter(candidate => candidate?.connected);
  const pad = pads.find(hasGamepadInput) || pads[0];
  gamepad.previous = new Set(gamepad.current);
  gamepad.current = new Set();

  if (!pad) {
    gamepad.connected = false;
    gamepad.name = "";
    gamepad.x = 0;
    gamepad.y = 0;
    updateGamepadBadge();
    return;
  }

  gamepad.connected = true;
  gamepad.name = pad.id || "\u624b\u67c4";
  const stick = strongestStick(pad);
  const dpadAxis = dpadAxes(pad);
  const dpadX = buttonDown(pad, 15) - buttonDown(pad, 14) + dpadAxis.x;
  const dpadY = buttonDown(pad, 13) - buttonDown(pad, 12) + dpadAxis.y;

  gamepad.x = clamp(stick.x + dpadX, -1, 1);
  gamepad.y = clamp(stick.y + dpadY, -1, 1);

  pad.buttons.forEach((button, index) => {
    if (button.pressed || button.value > 0.42) gamepad.current.add(`b${index}`);
  });
  if (gamepad.x > 0.55) gamepad.current.add("right");
  if (gamepad.x < -0.55) gamepad.current.add("left");
  if (gamepad.y > 0.55) gamepad.current.add("down");
  if (gamepad.y < -0.55) gamepad.current.add("up");
  const pressedButtons = [...gamepad.current].filter(code => code.startsWith("b") && !gamepad.previous.has(code));
  if (pressedButtons.length) gamepad.lastInput = pressedButtons[0].toUpperCase();
  updateGamepadBadge();

  if (anyGamepadPressed(["b8", "b9"])) togglePauseOrResume();

  if (state === "upgrade") {
    if (anyGamepadPressed(["right", "down", "b15", "b13"])) {
      selectedUpgradeIndex = (selectedUpgradeIndex + 1) % upgradeButtons.length;
      updateUpgradeSelection();
      SFX.click();
    }
    if (anyGamepadPressed(["left", "up", "b14", "b12"])) {
      selectedUpgradeIndex = (selectedUpgradeIndex - 1 + upgradeButtons.length) % upgradeButtons.length;
      updateUpgradeSelection();
      SFX.click();
    }
    if (anyGamepadPressed(["b0", "b1", "b2", "b3"]) || anyGamepadButtonPressed()) chooseUpgrade();
    return;
  }

  if (state === "story" && (anyGamepadPressed(["b0", "b1", "b2", "b3", "b8", "b9"]) || anyGamepadButtonPressed())) {
    beginBossEncounter();
    return;
  }

  if ((state === "menu" || state === "over") && (anyGamepadPressed(["b0", "b1", "b2", "b3", "b8", "b9"]) || anyGamepadButtonPressed())) {
    startGame();
    return;
  }

  if (state !== "playing") return;
  if (anyGamepadPressed(["b1", "b4", "b5"])) triggerDash();
  if (anyGamepadPressed(["b0", "b2", "b3", "b6", "b7"]) || anyGamepadButtonPressedExcept(["b1", "b4", "b5", "b8", "b9"])) {
    activateSkill();
  }
}

function readGamepads() {
  const list = navigator.getGamepads?.() || navigator.webkitGetGamepads?.() || [];
  return [...list];
}

function strongestStick(pad) {
  const pairs = [
    [0, 1],
    [2, 3],
    [3, 4]
  ];
  return pairs
    .map(([xIndex, yIndex]) => ({
      x: deadzone(pad.axes[xIndex] || 0),
      y: deadzone(pad.axes[yIndex] || 0)
    }))
    .sort((a, b) => Math.hypot(b.x, b.y) - Math.hypot(a.x, a.y))[0] || { x: 0, y: 0 };
}

function dpadAxes(pad) {
  const x = axisToDirection(pad.axes[6]);
  const y = axisToDirection(pad.axes[7]);
  return { x, y };
}

function axisToDirection(value) {
  if (!Number.isFinite(value) || Math.abs(value) < 0.55) return 0;
  return value > 0 ? 1 : -1;
}

function hasGamepadInput(pad) {
  return pad.buttons.some(button => button.pressed || button.value > 0.42)
    || pad.axes.some(axis => Math.abs(axis || 0) > 0.25);
}

function buttonDown(pad, index) {
  const button = pad.buttons[index];
  return button && (button.pressed || button.value > 0.55) ? 1 : 0;
}

function deadzone(value) {
  return Math.abs(value) < 0.18 ? 0 : value;
}

function gamepadPressed(code) {
  return gamepad.current.has(code) && !gamepad.previous.has(code);
}

function anyGamepadPressed(codes) {
  return codes.some(gamepadPressed);
}

function anyGamepadButtonPressed() {
  return [...gamepad.current].some(code => code.startsWith("b") && !gamepad.previous.has(code));
}

function anyGamepadButtonPressedExcept(excluded) {
  const blocked = new Set(excluded);
  return [...gamepad.current].some(code => code.startsWith("b") && !blocked.has(code) && !gamepad.previous.has(code));
}

function togglePauseOrResume() {
  if (state === "playing") pauseGame();
  else if (state === "paused") resumeGame();
}

function createGamepadBadge() {
  const stage = document.querySelector(".game-stage");
  if (!stage || gamepadBadge) return;
  gamepadBadge = document.createElement("div");
  gamepadBadge.className = "gamepad-badge";
  stage.append(gamepadBadge);
  updateGamepadBadge();
}

function updateGamepadBadge() {
  if (!gamepadBadge) return;
  gamepadBadge.classList.toggle("visible", gamepad.connected);
  gamepadBadge.textContent = gamepad.connected
    ? `\u624b\u67c4\u5df2\u8fde\u63a5${gamepad.lastInput ? ` ${gamepad.lastInput}` : ""}`
    : "";
}

function createNetPanel() {
  const nameField = document.getElementById("pilotName")?.closest(".field");
  if (!nameField || netUi.room) return;

  const panel = document.createElement("div");
  panel.className = "net-panel";
  panel.innerHTML = `
    <label class="field">
      <span>Room</span>
      <input id="roomCode" maxlength="24" autocomplete="off" placeholder="main">
    </label>
    <div class="net-actions">
      <button id="joinRoom" type="button">\u8054\u673a</button>
      <button id="leaveRoom" type="button">\u65ad\u5f00</button>
    </div>
    <div class="net-status" id="netStatus">\u5355\u673a\u6a21\u5f0f</div>
  `;
  nameField.after(panel);

  netUi = {
    panel,
    room: panel.querySelector("#roomCode"),
    join: panel.querySelector("#joinRoom"),
    leave: panel.querySelector("#leaveRoom"),
    status: panel.querySelector("#netStatus")
  };
  netUi.room.value = localStorage.getItem("nightflight-room") || "main";
  netUi.join.addEventListener("click", () => joinNetRoom(netUi.room.value));
  netUi.leave.addEventListener("click", leaveNetRoom);
}

function joinNetRoom(roomValue) {
  const room = cleanRoom(roomValue);
  if (!room) return setNetStatus("\u8bf7\u8f93\u5165 Room");
  if (location.protocol === "file:") return setNetStatus("\u8054\u673a\u9700\u8981\u4ece\u7ebf\u4e0a\u5730\u5740\u6253\u5f00");
  if (netplay.ws && netplay.room === room && netplay.connected) return;

  leaveNetRoom(false);
  localStorage.setItem("nightflight-room", room);
  netplay.room = room;
  netplay.id = profile.clientId || Store.load().clientId || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  netplay.color = colorFor(netplay.id);

  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const ws = new WebSocket(`${protocol}//${location.host}/api/room/${encodeURIComponent(room)}`);
  netplay.ws = ws;
  setNetStatus(`Room ${room}: \u8fde\u63a5\u4e2d...`);

  ws.addEventListener("open", () => {
    netplay.connected = true;
    sendNetMessage({ type: "hello", id: netplay.id, name: currentNetName(), color: netplay.color });
    setNetStatus(`Room ${room}: \u5df2\u8054\u673a`);
  });
  ws.addEventListener("message", event => {
    try {
      handleNetMessage(JSON.parse(event.data));
    } catch {
      setNetStatus(`Room ${room}: \u6536\u5230\u65e0\u6548\u6570\u636e`);
    }
  });
  ws.addEventListener("close", () => {
    netplay.connected = false;
    netplay.ws = null;
    remotePlayers.clear();
    setNetStatus("\u5df2\u65ad\u5f00");
  });
  ws.addEventListener("error", () => setNetStatus(`Room ${room}: \u8fde\u63a5\u5931\u8d25`));
}

function leaveNetRoom(showStatus = true) {
  if (netplay.ws) {
    netplay.ws.close(1000, "leave");
    netplay.ws = null;
  }
  netplay.connected = false;
  remotePlayers.clear();
  if (showStatus) setNetStatus("\u5355\u673a\u6a21\u5f0f");
}

function updateNetplay(dt) {
  if (!netplay.connected || !player) return;
  netplay.sendTimer -= dt;
  if (netplay.sendTimer > 0) return;
  netplay.sendTimer = 0.08;
  sendNetMessage({
    type: "state",
    id: netplay.id,
    name: currentNetName(),
    color: netplay.color,
    x: player.x / W,
    y: player.y / H,
    score: Math.floor(score),
    life: player.life,
    energy: Math.floor(player.energy),
    state
  });
}

function handleNetMessage(message) {
  if (!message || !message.type) return;
  if (message.type === "peers") {
    (message.peers || []).forEach(updateRemotePeer);
    return;
  }
  if (message.type === "peer") {
    updateRemotePeer(message.peer);
    return;
  }
  if (message.type === "leave") {
    remotePlayers.delete(message.id);
    return;
  }
  if (message.type === "room") {
    setNetStatus(`Room ${netplay.room}: ${message.count || 1} \u4eba\u5728\u7ebf`);
  }
}

function updateRemotePeer(peer) {
  if (!peer || !peer.id || peer.id === netplay.id) return;
  remotePlayers.set(peer.id, {
    ...peer,
    x: clamp(Number(peer.x) || 0.5, 0, 1),
    y: clamp(Number(peer.y) || 0.72, 0, 1),
    score: Math.floor(Number(peer.score) || 0),
    seen: performance.now()
  });
}

function sendNetMessage(payload) {
  if (!netplay.ws || netplay.ws.readyState !== WebSocket.OPEN) return;
  netplay.ws.send(JSON.stringify(payload));
}

function currentNetName() {
  return profile.playerId || profile.name || "Player";
}

function cleanRoom(value) {
  return String(value || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 24);
}

function colorFor(value) {
  let hash = 0;
  for (const char of String(value || "")) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const colors = ["#79ff9d", "#ffd166", "#7ba7ff", "#ff8bd1", "#4de7ff", "#ff6378"];
  return colors[hash % colors.length];
}

function setNetStatus(message) {
  if (netUi.status) netUi.status.textContent = message;
}

window.addEventListener("resize", () => {
  resize();
  if (player) {
    player.x = clamp(player.x, 26, W - 26);
    player.y = clamp(player.y, 76, H - 28);
  }
  draw();
});

window.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();
  if (state === "upgrade") {
    if (event.code === "ArrowDown" || event.code === "ArrowRight" || key === "s" || key === "d") {
      event.preventDefault();
      selectedUpgradeIndex = (selectedUpgradeIndex + 1) % upgradeButtons.length;
      updateUpgradeSelection();
      SFX.click();
      return;
    }
    if (event.code === "ArrowUp" || event.code === "ArrowLeft" || key === "w" || key === "a") {
      event.preventDefault();
      selectedUpgradeIndex = (selectedUpgradeIndex - 1 + upgradeButtons.length) % upgradeButtons.length;
      updateUpgradeSelection();
      SFX.click();
      return;
    }
    if (event.code === "Enter" || event.code === "Space") {
      event.preventDefault();
      chooseUpgrade();
      return;
    }
  }
  if (state === "story" && (event.code === "Enter" || event.code === "Space")) {
    event.preventDefault();
    beginBossEncounter();
    return;
  }
  keys.add(key);
  if (["w", "a", "s", "d", "arrowup", "arrowleft", "arrowdown", "arrowright"].includes(key)) {
    if (state === "playing") event.preventDefault();
    pointer.active = false;
    touchStick.active = false;
    touchStick.x = 0;
    touchStick.y = 0;
  }
  if (event.code === "Space") {
    event.preventDefault();
    if (state === "menu" || state === "over") startGame();
    else activateSkill();
  }
  if (key === "p" || key === "escape") {
    togglePauseOrResume();
  }
});

window.addEventListener("keyup", event => keys.delete(event.key.toLowerCase()));
window.addEventListener("gamepadconnected", event => {
  gamepad.connected = true;
  gamepad.name = event.gamepad?.id || "\u624b\u67c4";
  updateGamepadBadge();
});
window.addEventListener("gamepaddisconnected", () => {
  gamepad.connected = false;
  gamepad.name = "";
  updateGamepadBadge();
});
canvas.addEventListener("pointerdown", event => {
  if (isRelativeTouch(event)) {
    event.preventDefault();
    pointer.active = false;
    touchDrag.active = true;
    touchDrag.id = event.pointerId;
    touchDrag.lastX = event.clientX;
    touchDrag.lastY = event.clientY;
    touchDrag.dx = 0;
    touchDrag.dy = 0;
    canvas.setPointerCapture?.(event.pointerId);
    return;
  }
  pointer.active = true;
  movePointer(event);
  canvas.setPointerCapture?.(event.pointerId);
});
canvas.addEventListener("pointermove", event => {
  if (touchDrag.active && touchDrag.id === event.pointerId) {
    event.preventDefault();
    if (state === "playing") {
      touchDrag.dx += event.clientX - touchDrag.lastX;
      touchDrag.dy += event.clientY - touchDrag.lastY;
    }
    touchDrag.lastX = event.clientX;
    touchDrag.lastY = event.clientY;
    return;
  }
  movePointer(event);
});
window.addEventListener("pointerup", event => {
  if (touchDrag.active && touchDrag.id === event.pointerId) {
    touchDrag.active = false;
    touchDrag.id = null;
    touchDrag.dx = 0;
    touchDrag.dy = 0;
    canvas.releasePointerCapture?.(event.pointerId);
    return;
  }
  pointer.active = false;
  canvas.releasePointerCapture?.(event.pointerId);
});
window.addEventListener("pointercancel", event => {
  if (touchDrag.id === event.pointerId) {
    touchDrag.active = false;
    touchDrag.id = null;
    touchDrag.dx = 0;
    touchDrag.dy = 0;
  }
});

function movePointer(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = event.clientX - rect.left;
  pointer.y = event.clientY - rect.top;
}

function isRelativeTouch(event) {
  return event.pointerType === "touch" || event.pointerType === "pen";
}

ui.pilotName.addEventListener("change", () => {
  const username = cleanPlayerId(ui.pilotName.value) || "BITer";
  profile = Store.loadById(username, profile);
  profile.playerId = username;
  profile.name = username;
  Store.save(profile);
  syncProfileUi();
  syncProfileById(username);
});
ui.start.addEventListener("click", startGame);
ui.resume.addEventListener("click", resumeGame);
ui.again.addEventListener("click", startGame);
ui.storyNext.addEventListener("click", beginBossEncounter);

createNetPanel();
createTouchControls();
createGamepadBadge();
syncProfileUi();
reset();
draw();
inputLoop();

function createTouchControls() {
  const stage = document.querySelector(".game-stage");
  if (!stage || touchControls) return;

  const root = document.createElement("div");
  root.className = "touch-controls";
  root.setAttribute("aria-label", "Touch controls");

  const stick = document.createElement("div");
  stick.className = "touch-stick";
  stick.setAttribute("aria-label", "Move");
  stick.innerHTML = '<i></i>';

  const actions = document.createElement("div");
  actions.className = "touch-actions";

  const dashButton = makeTouchButton("D", "Dash");
  const skillButton = makeTouchButton("OJ", "Skill");
  const pauseButton = makeTouchButton("P", "Pause");

  actions.append(dashButton, skillButton, pauseButton);
  root.append(stick, actions);
  stage.append(root);

  const knob = stick.querySelector("i");
  const updateStick = event => {
    const rect = stick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const limit = rect.width * 0.32;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const distance = Math.hypot(dx, dy);
    const scale = distance > limit ? limit / distance : 1;
    const x = dx * scale;
    const y = dy * scale;
    touchStick.x = x / limit;
    touchStick.y = y / limit;
    knob.style.transform = `translate(${x}px, ${y}px)`;
  };

  stick.addEventListener("pointerdown", event => {
    event.preventDefault();
    touchStick.active = true;
    touchStick.id = event.pointerId;
    stick.setPointerCapture?.(event.pointerId);
    updateStick(event);
  });
  stick.addEventListener("pointermove", event => {
    if (!touchStick.active || touchStick.id !== event.pointerId) return;
    event.preventDefault();
    updateStick(event);
  });
  const resetStick = event => {
    if (touchStick.id !== event.pointerId) return;
    touchStick.active = false;
    touchStick.id = null;
    touchStick.x = 0;
    touchStick.y = 0;
    knob.style.transform = "translate(0, 0)";
    stick.releasePointerCapture?.(event.pointerId);
  };
  stick.addEventListener("pointerup", resetStick);
  stick.addEventListener("pointercancel", resetStick);

  dashButton.addEventListener("pointerdown", event => {
    event.preventDefault();
    if (state === "playing") triggerDash();
  });
  skillButton.addEventListener("pointerdown", event => {
    event.preventDefault();
    if (state === "menu" || state === "over") startGame();
    else if (state === "story") beginBossEncounter();
    else if (state === "upgrade") chooseUpgrade();
    else if (state === "playing") activateSkill();
  });
  pauseButton.addEventListener("pointerdown", event => {
    event.preventDefault();
    if (state === "playing") pauseGame();
    else if (state === "paused") resumeGame();
  });

  touchControls = root;
  updateTouchControls();
}

function updateTouchControls() {
  if (!touchControls) return;
  touchControls.classList.toggle("visible", state === "playing");
}

function makeTouchButton(label, ariaLabel) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.setAttribute("aria-label", ariaLabel);
  return button;
}
