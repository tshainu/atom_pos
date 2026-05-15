import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import app from "./src/api/index.js";
import path from "path";
import fs from "fs";

const port = parseInt(process.env.PORT || "3000");

const server = new Hono();

// Mount API
server.route("/", app);

// Serve admin static files
const adminDistPath = path.resolve(process.cwd(), "dist-admin");

if (fs.existsSync(adminDistPath)) {
  // Serve static assets
  server.use(
    "/assets/*",
    serveStatic({ root: path.resolve(process.cwd(), "dist-admin") })
  );

  // SPA fallback — serve index.html for all non-API routes
  server.get("*", async (c) => {
    const indexPath = path.join(adminDistPath, "index.html");
    if (fs.existsSync(indexPath)) {
      const html = fs.readFileSync(indexPath, "utf-8");
      return c.html(html);
    }
    return c.text("Not found", 404);
  });
} else {
  console.log("dist-admin not found at:", adminDistPath);
}

console.log(`Starting server on port ${port}`);

serve({ fetch: server.fetch, port }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});
