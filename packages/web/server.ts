import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import app from "./src/api/index.js";
import path from "path";
import fs from "fs";

const port = parseInt(process.env.PORT || "3000");

// Wrap API + serve admin static files
const server = new Hono();

// Mount API
server.route("/", app);

// Serve admin static files from dist-admin/
const adminDistPath = path.resolve(process.cwd(), "dist-admin");
if (fs.existsSync(adminDistPath)) {
  server.use("/admin/*", serveStatic({ root: "./dist-admin" }));
  server.use("/assets/*", serveStatic({ root: "./dist-admin" }));
  // SPA fallback — all non-API routes serve admin index.html
  server.get("*", async (c) => {
    const indexPath = path.join(adminDistPath, "index.html");
    const html = fs.readFileSync(indexPath, "utf-8");
    return c.html(html);
  });
}

console.log(`Starting server on port ${port}`);

serve({ fetch: server.fetch, port }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});
