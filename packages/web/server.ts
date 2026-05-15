import { serve } from "@hono/node-server";
import { Hono } from "hono";
import app from "./src/api/index.js";
import path from "path";
import fs from "fs";
import { getMimeType } from "hono/utils/mime";

const port = parseInt(process.env.PORT || "3000");

const server = new Hono();

// Mount API
server.route("/", app);

const adminDistPath = path.resolve(process.cwd(), "dist-admin");
console.log("Admin dist path:", adminDistPath, "exists:", fs.existsSync(adminDistPath));

// Serve static files manually
server.get("*", async (c) => {
  const url = new URL(c.req.url);
  let filePath = path.join(adminDistPath, url.pathname);

  // Check if file exists
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    // SPA fallback
    filePath = path.join(adminDistPath, "index.html");
  }

  if (!fs.existsSync(filePath)) {
    return c.text("Not found", 404);
  }

  const ext = path.extname(filePath);
  const mime = getMimeType(ext) || "application/octet-stream";
  const content = fs.readFileSync(filePath);
  return new Response(content, {
    headers: { "Content-Type": mime },
  });
});

console.log(`Starting server on port ${port}`);

serve({ fetch: server.fetch, port }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});
