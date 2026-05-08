const LIMIT = 10;

const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

export async function onRequestGet({ env }) {
  return json({ entries: await topEntries(env.DB) });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const entry = normalize(body);
  if (!entry) return json({ error: "Invalid duo leaderboard entry" }, 400);

  await env.DB.prepare(`
    INSERT INTO duo_leaderboard (
      team_key,
      team_name,
      player_a,
      player_b,
      room,
      score,
      elapsed,
      bosses,
      runs,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    ON CONFLICT(team_key) DO UPDATE SET
      team_name = excluded.team_name,
      player_a = excluded.player_a,
      player_b = excluded.player_b,
      room = excluded.room,
      score = CASE WHEN ${better("excluded", "duo_leaderboard")} THEN excluded.score ELSE duo_leaderboard.score END,
      elapsed = CASE WHEN ${better("excluded", "duo_leaderboard")} THEN excluded.elapsed ELSE duo_leaderboard.elapsed END,
      bosses = CASE WHEN ${better("excluded", "duo_leaderboard")} THEN excluded.bosses ELSE duo_leaderboard.bosses END,
      runs = duo_leaderboard.runs + 1,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  `).bind(
    entry.teamKey,
    entry.teamName,
    entry.playerA,
    entry.playerB,
    entry.room,
    entry.score,
    entry.elapsed,
    entry.bosses
  ).run();

  const current = await env.DB.prepare(`
    SELECT score, elapsed, bosses
    FROM duo_leaderboard
    WHERE team_key = ?
  `).bind(entry.teamKey).first();

  const rank = current ? await rankFor(env.DB, current) : null;
  return json({ entries: await topEntries(env.DB), rank });
}

export function onRequestOptions() {
  return new Response(null, { headers });
}

async function topEntries(db) {
  const { results } = await db.prepare(`
    SELECT
      team_name AS teamName,
      player_a AS playerA,
      player_b AS playerB,
      room,
      score,
      elapsed,
      bosses,
      runs,
      updated_at AS updatedAt
    FROM duo_leaderboard
    ORDER BY score DESC, elapsed DESC, bosses DESC, updated_at ASC
    LIMIT ?
  `).bind(LIMIT).all();
  return results || [];
}

async function rankFor(db, entry) {
  const row = await db.prepare(`
    SELECT COUNT(*) + 1 AS rank
    FROM duo_leaderboard
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
  const players = Array.isArray(body.players)
    ? body.players
        .map(player => cleanPlayerId(player?.id || player?.name || player))
        .filter(Boolean)
    : [];
  const unique = [...new Map(players.map(player => [player.toLowerCase(), player])).values()]
    .sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }))
    .slice(0, 2);
  if (unique.length !== 2) return null;

  return {
    teamKey: unique.map(player => player.toLowerCase()).join("|"),
    teamName: `${unique[0]} + ${unique[1]}`,
    playerA: unique[0],
    playerB: unique[1],
    room: cleanRoom(body.room),
    score: boundedInt(body.score, 0, 999999999),
    elapsed: boundedInt(body.elapsed, 0, 86400),
    bosses: boundedInt(body.bosses, 0, 999)
  };
}

function cleanPlayerId(value) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 32);
}

function cleanRoom(value) {
  return String(value || "")
    .replace(/[^A-Za-z0-9_-]/g, "")
    .slice(0, 24);
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
