const LIMIT = 10;

const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const playerId = cleanPlayerId(url.searchParams.get("playerId"));
  const payload = { entries: await topEntries(env.DB) };
  if (playerId) payload.profile = await profileFor(env.DB, playerId);
  return json(payload);
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const entry = normalize(body);
  if (!entry) {
    return json({ error: "Invalid leaderboard entry" }, 400);
  }

  await env.DB.prepare(`
    INSERT INTO leaderboard (
      player_key,
      player_id,
      name,
      score,
      elapsed,
      bosses,
      perfect_dash,
      total_score,
      runs,
      total_bosses,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    ON CONFLICT(player_key) DO UPDATE SET
      player_id = excluded.player_id,
      name = excluded.name,
      score = CASE WHEN ${better("excluded", "leaderboard")} THEN excluded.score ELSE leaderboard.score END,
      elapsed = CASE WHEN ${better("excluded", "leaderboard")} THEN excluded.elapsed ELSE leaderboard.elapsed END,
      bosses = CASE WHEN ${better("excluded", "leaderboard")} THEN excluded.bosses ELSE leaderboard.bosses END,
      perfect_dash = CASE WHEN ${better("excluded", "leaderboard")} THEN excluded.perfect_dash ELSE leaderboard.perfect_dash END,
      total_score = MAX(leaderboard.total_score, excluded.total_score),
      runs = MAX(leaderboard.runs, excluded.runs),
      total_bosses = MAX(leaderboard.total_bosses, excluded.total_bosses),
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  `).bind(
    entry.playerKey,
    entry.playerId,
    entry.name,
    entry.score,
    entry.elapsed,
    entry.bosses,
    entry.perfectDash,
    entry.totalScore,
    entry.runs,
    entry.totalBosses
  ).run();

  const current = await env.DB.prepare(`
    SELECT score, elapsed, bosses
    FROM leaderboard
    WHERE player_key = ?
  `).bind(entry.playerKey).first();

  const rank = current ? await rankFor(env.DB, current) : null;
  return json({ entries: await topEntries(env.DB), rank });
}

export function onRequestOptions() {
  return new Response(null, { headers });
}

async function topEntries(db) {
  const { results } = await db.prepare(`
    SELECT player_id AS playerId, name, score, elapsed, bosses, perfect_dash AS perfectDash, updated_at AS updatedAt
    FROM leaderboard
    ORDER BY score DESC, elapsed DESC, bosses DESC, updated_at ASC
    LIMIT ?
  `).bind(LIMIT).all();
  return results || [];
}

async function profileFor(db, playerId) {
  const row = await db.prepare(`
    SELECT
      player_id AS playerId,
      name,
      score AS bestScore,
      total_score AS totalScore,
      runs,
      total_bosses AS bosses
    FROM leaderboard
    WHERE player_key = ?
  `).bind(`id:${playerId.toLowerCase()}`).first();
  return row || null;
}

async function rankFor(db, entry) {
  const row = await db.prepare(`
    SELECT COUNT(*) + 1 AS rank
    FROM leaderboard
    WHERE score > ?
      OR (score = ? AND elapsed > ?)
      OR (score = ? AND elapsed = ? AND bosses > ?)
  `).bind(
    entry.score,
    entry.score,
    entry.elapsed,
    entry.score,
    entry.elapsed,
    entry.bosses
  ).first();
  return row?.rank || 1;
}

function normalize(body) {
  const clientId = String(body.clientId || "").trim();
  if (!/^[A-Za-z0-9_-]{12,80}$/.test(clientId)) return null;
  const playerId = cleanPlayerId(body.playerId || body.name);
  if (!playerId) return null;

  return {
    clientId,
    playerId,
    playerKey: playerId ? `id:${playerId.toLowerCase()}` : `client:${clientId}`,
    name: playerId,
    score: boundedInt(body.score, 0, 999999999),
    elapsed: boundedInt(body.elapsed, 0, 86400),
    bosses: boundedInt(body.bosses, 0, 999),
    perfectDash: boundedInt(body.perfectDash, 0, 999999),
    totalScore: boundedInt(body.totalScore, 0, 9999999999),
    runs: boundedInt(body.runs, 0, 999999),
    totalBosses: boundedInt(body.totalBosses, 0, 999999)
  };
}

function cleanPlayerId(value) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 32);
}

function cleanName(value) {
  const name = String(value || "BITer")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 16);
  return name || "BITer";
}

function boundedInt(value, min, max) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers });
}

function better(left, right) {
  return `(${left}.score > ${right}.score OR (${left}.score = ${right}.score AND (${left}.elapsed > ${right}.elapsed OR (${left}.elapsed = ${right}.elapsed AND ${left}.bosses > ${right}.bosses))))`;
}
