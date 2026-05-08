export async function onRequest({ request, env, params }) {
  const room = cleanRoom(params.room);
  if (!room) return new Response("Bad room", { status: 400 });
  if (request.headers.get("upgrade") !== "websocket") {
    return Response.json({ room, websocket: true });
  }
  const id = env.ROOMS.idFromName(room);
  return env.ROOMS.get(id).fetch(request);
}

function cleanRoom(value) {
  return String(value || "main").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 24) || "main";
}
