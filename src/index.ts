const OMNI_URL = "http://127.0.0.1:8085/webhooks/bigclungus-main";
const PORT = 9876;
const HOST = "127.0.0.1";

const server = Bun.serve({
  hostname: HOST,
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method !== "POST" || url.pathname !== "/inject") {
      return new Response("Not Found", { status: 404 });
    }

    let body: { content?: string; user?: string; chat_id?: string };
    try {
      body = await req.json();
    } catch {
      return new Response("Bad Request: invalid JSON", { status: 400 });
    }

    const { content, user, chat_id } = body;

    if (!content) {
      return new Response("Bad Request: missing content", { status: 400 });
    }

    console.log(`[inject] proxying message from=${user ?? "(unknown)"} chat_id=${chat_id ?? "(ignored)"} content="${content.slice(0, 80)}${content.length > 80 ? "..." : ""}"`);

    const omniPayload = { content, user };

    let omniRes: Response;
    try {
      omniRes = await fetch(OMNI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(omniPayload),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[inject] omni request failed: ${msg}`);
      return new Response(`Bad Gateway: ${msg}`, { status: 502 });
    }

    const responseText = await omniRes.text();
    console.log(`[inject] omni responded ${omniRes.status}`);

    return new Response(responseText, {
      status: omniRes.status,
      headers: { "Content-Type": omniRes.headers.get("Content-Type") ?? "text/plain" },
    });
  },
});

console.log(`[inject] listening on ${HOST}:${PORT} -> ${OMNI_URL}`);
