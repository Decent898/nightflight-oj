export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const room = cleanRoom(url.pathname.split("/").filter(Boolean).pop() || "main");
    const id = env.ROOMS.idFromName(room);
    return env.ROOMS.get(id).fetch(request);
  }
};

export class RoomServer {
  constructor() {
    this.sessions = new Map();
    this.phase = "lobby";
    this.seed = 0;
    this.startedAt = 0;
    this.lastTick = 0;
    this.tickHandle = null;
    this.score = 0;
    this.elapsed = 0;
    this.bosses = 0;
    this.spawnTimer = 0;
    this.bulletTimer = 0;
    this.itemTimer = 6;
    this.snapshotTimer = 0;
    this.playersState = new Map();
    this.enemies = [];
    this.bullets = [];
    this.shots = [];
    this.items = [];
    this.nextEntityId = 1;
  }

  async fetch(request) {
    if (request.headers.get("upgrade") !== "websocket") {
      return Response.json({ ok: true, phase: this.phase, players: this.players() });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const sessionId = crypto.randomUUID();
    server.accept();

    this.sessions.set(sessionId, {
      socket: server,
      peer: {
        id: sessionId,
        name: "Player",
        color: "#79ff9d",
        ready: false,
        updatedAt: Date.now()
      }
    });
    server.addEventListener("message", event => this.onMessage(sessionId, event.data));
    server.addEventListener("close", () => this.close(sessionId));
    server.addEventListener("error", () => this.close(sessionId));
    this.send(sessionId, { type: "room", ...this.roomState() });

    return new Response(null, { status: 101, webSocket: client });
  }

  onMessage(sessionId, raw) {
    let message;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }
    if (!message || !message.type) return;

    if (message.type === "hello") {
      this.register(sessionId, message);
      return;
    }
    if (message.type === "ready") {
      this.setReady(sessionId, Boolean(message.ready));
      return;
    }
    if (message.type === "input") {
      this.applyInput(sessionId, sanitizeInput(message.input));
      return;
    }
    if (message.type === "state") {
      this.applyLegacyState(sessionId, message);
      return;
    }
    if (message.type === "phase") {
      this.applyPhaseRequest(sessionId, cleanPhase(message.phase));
      return;
    }
    if (message.type === "signal") {
      this.forwardSignal(sessionId, message);
    }
  }

  register(sessionId, message) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const cleanId = cleanToken(message.id) || sessionId;
    const duplicate = [...this.sessions.entries()].find(([id, entry]) => id !== sessionId && entry.peer.id === cleanId);
    if (duplicate) this.close(duplicate[0]);

    const activePlayers = this.players().filter(peer => peer.id !== session.peer.id);
    if (activePlayers.length >= 2) {
      this.send(sessionId, { type: "full" });
      this.close(sessionId);
      return;
    }

    session.peer = {
      ...session.peer,
      id: cleanId,
      name: cleanName(message.name),
      color: cleanColor(message.color),
      ready: false,
      updatedAt: Date.now()
    };
    this.ensurePlayerState(session.peer);
    this.broadcastRoom();
  }

  setReady(sessionId, ready) {
    const session = this.sessions.get(sessionId);
    if (!session || this.phase !== "lobby") return;
    session.peer.ready = ready;
    session.peer.updatedAt = Date.now();
    this.broadcastRoom();

    const players = this.players();
    if (players.length === 2 && players.every(peer => peer.ready)) {
      this.startRun();
    }
  }

  startRun() {
    this.phase = "running";
    this.seed = Date.now();
    this.startedAt = Date.now();
    this.lastTick = this.startedAt;
    this.score = 0;
    this.elapsed = 0;
    this.bosses = 0;
    this.spawnTimer = 0.6;
    this.bulletTimer = 0.55;
    this.itemTimer = 6;
    this.snapshotTimer = 0;
    this.enemies = [];
    this.bullets = [];
    this.shots = [];
    this.items = [];
    this.nextEntityId = 1;
    this.players().forEach((peer, index) => {
      this.playersState.set(peer.id, {
        id: peer.id,
        name: peer.name,
        color: peer.color,
        x: 0.44 + index * 0.12,
        y: 0.76,
        r: 0.014,
        life: 3,
        maxLife: 3,
        shield: 0,
        energy: 0,
        inv: 1.1,
        dash: 0,
        dashCooldown: 0,
        fireCooldown: 0,
        input: { moveX: 0, moveY: 0, dash: false, skill: false, pause: false }
      });
    });
    this.broadcast({ type: "start", seed: this.seed, players: this.publicPlayers() });
    this.broadcastRoom();
    this.ensureTicking();
  }

  ensureTicking() {
    if (this.tickHandle || this.phase !== "running") return;
    this.tickHandle = setInterval(() => this.tick(), 50);
  }

  stopTicking() {
    if (!this.tickHandle) return;
    clearInterval(this.tickHandle);
    this.tickHandle = null;
  }

  tick() {
    if (this.phase !== "running") {
      this.stopTicking();
      return;
    }
    const now = Date.now();
    const dt = Math.min(0.08, Math.max(0.01, (now - this.lastTick) / 1000));
    this.lastTick = now;
    this.elapsed += dt;
    this.score += dt * 18 * Math.max(1, this.alivePlayers().length);

    this.updatePlayers(dt);
    this.updateWorld(dt);
    this.checkCollisions();
    this.cleanup();

    if (!this.alivePlayers().length) {
      this.phase = "over";
      this.broadcast({ type: "phase", phase: "over", snapshot: this.snapshot() });
      this.broadcastRoom();
      this.stopTicking();
      return;
    }
    this.snapshotTimer -= dt;
    if (this.snapshotTimer <= 0) {
      this.snapshotTimer = 0.05;
      this.broadcast({ type: "snapshot", snapshot: this.snapshot() });
    }
  }

  updatePlayers(dt) {
    this.playersState.forEach(player => {
      const input = player.input || {};
      if (player.life <= 0) return;
      player.inv = Math.max(0, player.inv - dt);
      player.shield = Math.max(0, player.shield - dt);
      player.dash = Math.max(0, player.dash - dt);
      player.dashCooldown = Math.max(0, player.dashCooldown - dt);
      if (input.dash && player.dashCooldown <= 0) {
        player.dash = 0.18;
        player.dashCooldown = 0.82;
        player.inv = Math.max(player.inv, 0.22);
      }
      if (input.skill && player.energy >= 100) {
        player.energy = 0;
        this.bullets = [];
        this.enemies.forEach(enemy => {
          enemy.hp -= enemy.boss ? 70 : 42;
        });
        this.score += 420;
      }

      player.fireCooldown -= dt;
      if (player.fireCooldown <= 0) {
        player.fireCooldown = 0.13;
        this.shots.push(this.entity({
          owner: player.id,
          x: player.x - 0.012,
          y: player.y - 0.025,
          vx: -0.035,
          vy: -1.05,
          r: 0.006
        }));
        this.shots.push(this.entity({
          owner: player.id,
          x: player.x + 0.012,
          y: player.y - 0.025,
          vx: 0.035,
          vy: -1.05,
          r: 0.006
        }));
      }
      input.dash = false;
      input.skill = false;
      input.pause = false;
    });
  }

  updateWorld(dt) {
    const difficulty = 1 + this.elapsed / 80;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const x = randFromSeed(this.seed + this.nextEntityId * 17, 0.1, 0.9);
      const kind = this.nextEntityId % 4 === 0 ? "fan" : this.nextEntityId % 3 === 0 ? "drift" : "aim";
      this.enemies.push(this.entity({
        kind,
        x,
        y: -0.04,
        vx: kind === "drift" ? (x < 0.5 ? 0.055 : -0.055) : 0,
        vy: 0.09 + difficulty * 0.012,
        r: kind === "fan" ? 0.024 : 0.02,
        hp: kind === "fan" ? 46 + difficulty * 4 : 30 + difficulty * 3,
        maxHp: kind === "fan" ? 46 + difficulty * 4 : 30 + difficulty * 3,
        cooldown: 0.8,
        t: 0
      }));
      this.spawnTimer = Math.max(0.42, 1.08 - difficulty * 0.045);
    }

    this.itemTimer -= dt;
    if (this.itemTimer <= 0) {
      this.items.push(this.entity({
        kind: this.nextEntityId % 3 === 0 ? "heal" : "energy",
        x: randFromSeed(this.seed + this.nextEntityId * 37, 0.12, 0.88),
        y: -0.03,
        vy: 0.12,
        r: 0.02
      }));
      this.itemTimer = 7.5;
    }

    this.enemies.forEach(enemy => {
      enemy.t += dt;
      enemy.x += Math.sin(enemy.t * 2.1 + enemy.id) * 0.035 * dt + enemy.vx * dt;
      enemy.y += enemy.vy * dt;
      enemy.cooldown -= dt;
      if (enemy.cooldown <= 0) {
        enemy.cooldown = enemy.kind === "fan" ? 1.1 : 0.82;
        this.fireEnemy(enemy);
      }
    });

    this.bullets.forEach(bullet => {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
    });
    this.shots.forEach(shot => {
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
    });
    this.items.forEach(item => {
      item.y += item.vy * dt;
    });
  }

  fireEnemy(enemy) {
    const targets = this.alivePlayers();
    if (!targets.length) return;
    const target = targets[Math.floor((enemy.id + Math.floor(this.elapsed)) % targets.length)];
    const base = Math.atan2(target.y - enemy.y, target.x - enemy.x);
    const count = enemy.kind === "fan" ? 5 : 1;
    const start = count === 1 ? 0 : -0.26;
    for (let index = 0; index < count; index += 1) {
      const angle = base + start + index * 0.13;
      const speed = enemy.kind === "fan" ? 0.3 : 0.42;
      this.bullets.push(this.entity({
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 0.008,
        color: enemy.kind === "fan" ? "#ffd166" : "#ff6378"
      }));
    }
  }

  checkCollisions() {
    this.shots.forEach(shot => {
      this.enemies.forEach(enemy => {
        if (shot.dead || enemy.dead) return;
        if (dist(shot.x, shot.y, enemy.x, enemy.y) < shot.r + enemy.r) {
          shot.dead = true;
          enemy.hp -= 10;
          this.score += 9;
          const owner = this.playersState.get(shot.owner);
          if (owner) owner.energy = Math.min(100, owner.energy + 1.8);
          if (enemy.hp <= 0) {
            enemy.dead = true;
            this.score += enemy.kind === "fan" ? 360 : 230;
            if (owner) owner.energy = Math.min(100, owner.energy + 6);
          }
        }
      });
    });

    this.playersState.forEach(player => {
      if (player.life <= 0) return;
      this.items.forEach(item => {
        if (item.dead) return;
        if (dist(player.x, player.y, item.x, item.y) < player.r + item.r + 0.015) {
          item.dead = true;
          if (item.kind === "heal") player.life = Math.min(player.maxLife, player.life + 1);
          else player.energy = Math.min(100, player.energy + 28);
          this.score += 140;
        }
      });

      this.bullets.forEach(bullet => {
        if (bullet.dead || player.inv > 0 || player.shield > 0) return;
        if (dist(player.x, player.y, bullet.x, bullet.y) < player.r + bullet.r) {
          bullet.dead = true;
          player.life -= 1;
          player.inv = 1.2;
        }
      });

      this.enemies.forEach(enemy => {
        if (enemy.dead || player.inv > 0 || player.shield > 0) return;
        if (dist(player.x, player.y, enemy.x, enemy.y) < player.r + enemy.r) {
          if (!enemy.boss) enemy.dead = true;
          player.life -= 1;
          player.inv = 1.2;
        }
      });
    });
  }

  cleanup() {
    this.enemies = this.enemies.filter(enemy => !enemy.dead && enemy.y < 1.08);
    this.bullets = this.bullets.filter(bullet => !bullet.dead && bullet.x > -0.08 && bullet.x < 1.08 && bullet.y > -0.1 && bullet.y < 1.1).slice(-260);
    this.shots = this.shots.filter(shot => !shot.dead && shot.y > -0.08 && shot.x > -0.08 && shot.x < 1.08).slice(-180);
    this.items = this.items.filter(item => !item.dead && item.y < 1.08);
  }

  applyInput(sessionId, input) {
    const id = this.peerId(sessionId);
    const player = this.playersState.get(id);
    if (!player) return;
    if (input.pause) {
      if (this.phase === "running") {
        this.phase = "paused";
        this.broadcast({ type: "phase", phase: "paused", snapshot: this.snapshot() });
        this.broadcastRoom();
        this.stopTicking();
      } else if (this.phase === "paused") {
        this.phase = "running";
        this.lastTick = Date.now();
        this.broadcast({ type: "phase", phase: "running", snapshot: this.snapshot() });
        this.broadcastRoom();
        this.ensureTicking();
      }
    }
    player.input = {
      moveX: input.moveX,
      moveY: input.moveY,
      dash: input.dash,
      skill: input.skill,
      pause: input.pause
    };
    if (Number.isFinite(input.x)) player.x = input.x;
    if (Number.isFinite(input.y)) player.y = input.y;
  }

  applyLegacyState(sessionId, message) {
    const id = this.peerId(sessionId);
    const player = this.playersState.get(id);
    const session = this.sessions.get(sessionId);
    if (!player || !session) return;
    player.x = clampNumber(message.x, 0.05, 0.95, player.x);
    player.y = clampNumber(message.y, 0.12, 0.94, player.y);
    player.life = clampNumber(message.life, 0, player.maxLife, player.life);
    player.energy = clampNumber(message.energy, 0, 100, player.energy);
    session.peer.name = cleanName(message.name);
    session.peer.color = cleanColor(message.color);
    session.peer.ready = true;
    session.peer.updatedAt = Date.now();
    this.broadcast({
      type: "peer",
      peer: {
        id,
        name: session.peer.name,
        color: session.peer.color,
        x: player.x,
        y: player.y,
        score: Math.floor(Number(message.score) || 0),
        life: player.life,
        energy: player.energy,
        state: cleanPhase(message.state)
      }
    }, sessionId);
  }

  applyPhaseRequest(sessionId, phase) {
    if (!this.playersState.has(this.peerId(sessionId))) return;
    if (phase === "paused" || phase === "running") {
      this.applyInput(sessionId, { moveX: 0, moveY: 0, dash: false, skill: false, pause: true });
    }
  }

  forwardSignal(sessionId, message) {
    const from = this.peerId(sessionId);
    const payload = sanitizeSignal(message);
    if (!payload) return;
    const targetId = cleanToken(message.to);
    const outbound = { type: "signal", from, ...payload };
    if (targetId) {
      const targetSession = [...this.sessions.entries()].find(([, entry]) => entry.peer.id === targetId);
      if (targetSession) this.send(targetSession[0], outbound);
      return;
    }
    this.broadcast(outbound, sessionId);
  }

  close(sessionId) {
    const session = this.sessions.get(sessionId);
    this.sessions.delete(sessionId);
    if (session) {
      this.playersState.delete(session.peer.id);
      this.broadcast({ type: "leave", id: session.peer.id });
    }
    if (this.players().length < 2 && this.phase !== "lobby") {
      this.phase = "lobby";
      this.stopTicking();
      this.players().forEach(peer => {
        peer.ready = false;
      });
    }
    this.broadcastRoom();
  }

  roomState() {
    const players = this.players();
    return {
      phase: this.phase,
      seed: this.seed,
      players: this.publicPlayers(),
      readyCount: players.filter(peer => peer.ready).length,
      maxPlayers: 2
    };
  }

  snapshot() {
    return {
      w: 1,
      h: 1,
      phase: this.phase,
      score: Math.floor(this.score),
      elapsed: this.elapsed,
      defeatedBosses: this.bosses,
      bossTimer: 999,
      players: this.publicPlayers(),
      peers: this.publicPlayers(),
      enemies: this.enemies.map(packEntity),
      bullets: this.bullets.map(packEntity),
      shots: this.shots.map(packEntity),
      items: this.items.map(packEntity)
    };
  }

  publicPlayers() {
    return this.players().map(peer => {
      const state = this.playersState.get(peer.id);
      return {
        id: peer.id,
        name: peer.name,
        color: peer.color,
        ready: peer.ready,
        x: state?.x ?? 0.5,
        y: state?.y ?? 0.76,
        r: state?.r ?? 0.014,
        life: state?.life ?? 3,
        maxLife: state?.maxLife ?? 3,
        shield: state?.shield ?? 0,
        energy: state?.energy ?? 0,
        inv: state?.inv ?? 0
      };
    });
  }

  alivePlayers() {
    return [...this.playersState.values()].filter(player => player.life > 0);
  }

  players() {
    return [...this.sessions.values()].map(entry => entry.peer);
  }

  ensurePlayerState(peer) {
    if (this.playersState.has(peer.id)) return;
    this.playersState.set(peer.id, {
      id: peer.id,
      name: peer.name,
      color: peer.color,
      x: 0.5,
      y: 0.76,
      r: 0.014,
      life: 3,
      maxLife: 3,
      shield: 0,
      energy: 0,
      inv: 0,
      dash: 0,
      dashCooldown: 0,
      fireCooldown: 0,
      input: { moveX: 0, moveY: 0, dash: false, skill: false, pause: false }
    });
  }

  entity(data) {
    return { id: this.nextEntityId++, ...data };
  }

  peerId(sessionId) {
    return this.sessions.get(sessionId)?.peer.id || sessionId;
  }

  broadcastRoom() {
    this.broadcast({ type: "room", ...this.roomState() });
  }

  broadcast(payload, except = null) {
    const text = JSON.stringify(payload);
    this.sessions.forEach((_, sessionId) => {
      if (sessionId !== except) this.send(sessionId, text, true);
    });
  }

  send(sessionId, payload, alreadyString = false) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    try {
      session.socket.send(alreadyString ? payload : JSON.stringify(payload));
    } catch {
      this.close(sessionId);
    }
  }
}

function sanitizeInput(input = {}) {
  return {
    moveX: clampNumber(input.moveX, -1, 1, 0),
    moveY: clampNumber(input.moveY, -1, 1, 0),
    x: clampNumber(input.x, 0.05, 0.95, null),
    y: clampNumber(input.y, 0.12, 0.94, null),
    dash: Boolean(input.dash),
    skill: Boolean(input.skill),
    pause: Boolean(input.pause),
    confirm: Boolean(input.confirm)
  };
}

function sanitizeSignal(message = {}) {
  const kind = String(message.kind || "");
  if (!["offer", "answer", "candidate", "ready"].includes(kind)) return null;
  if (kind === "ready") return { kind };
  if (kind === "candidate") {
    return {
      kind,
      candidate: message.candidate && typeof message.candidate === "object" ? message.candidate : null
    };
  }
  const description = message.description && typeof message.description === "object" ? message.description : null;
  if (!description || typeof description.type !== "string" || typeof description.sdp !== "string") return null;
  return { kind, description };
}

function packEntity(entity) {
  return { ...entity };
}

function cleanRoom(value) {
  return String(value || "main").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 24) || "main";
}

function cleanToken(value) {
  return String(value || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80);
}

function cleanName(value) {
  return String(value || "Player")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 32) || "Player";
}

function cleanColor(value) {
  const color = String(value || "");
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#79ff9d";
}

function cleanPhase(value) {
  return ["lobby", "running", "paused", "over"].includes(value) ? value : "running";
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function randFromSeed(seed, min, max) {
  const x = Math.sin(seed) * 10000;
  return min + (x - Math.floor(x)) * (max - min);
}
