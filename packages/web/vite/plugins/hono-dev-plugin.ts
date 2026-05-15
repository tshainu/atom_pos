import type { Plugin, ViteDevServer } from "vite";

export default function honoDevPlugin(): Plugin {
  return {
    name: "hono-dev-server",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // SPA fallback: serve index.html for /admin/* so deep links work via platform proxy
        if (req.url?.startsWith("/admin") && !req.url.startsWith("/api")) {
          req.url = "/";
          return next();
        }
        if (!req.url?.startsWith("/api")) return next();

        try {
          const request = await toWebRequest(req);
          const app = await loadApp(server);
          const response = await app.fetch(request);

          res.statusCode = response.status;
          response.headers.forEach((value: string, key: string) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (err) {
          server.ssrFixStacktrace(err as Error);
          console.error("[hono-dev]", err);
          res.statusCode = 500;
          res.end("Internal Server Error");
        }
      });
    },
  };
}

async function loadApp(server: ViteDevServer) {
  // resolve relative to the web package root (works regardless of vite root)
  const apiPath = new URL("../../src/api/index.ts", import.meta.url).pathname;
  const mod = await server.ssrLoadModule(apiPath);
  return mod.default;
}

function toWebRequest(req: import("http").IncomingMessage): Request {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const headers = new Headers();
  for (const [key, val] of Object.entries(req.headers)) {
    if (val) headers.set(key, Array.isArray(val) ? val.join(", ") : val);
  }

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  return new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? (req as unknown as ReadableStream) : undefined,
    // @ts-expect-error duplex needed for streaming request bodies
    duplex: hasBody ? "half" : undefined,
  });
}
