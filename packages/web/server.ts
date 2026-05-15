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

// Find admin dist — try multiple candidate paths
function findAdminDist(): string | null {
  const candidates = [
    path.resolve(process.cwd(), "admin-entry", "dist-admin"),
    path.resolve(process.cwd(), "dist-admin"),
    path.resolve(__dirname, "..", "admin-entry", "dist-admin"),
    path.resolve(__dirname, "admin-entry", "dist-admin"),
    path.resolve(__dirname, "dist-admin"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p) && fs.existsSync(path.join(p, "index.html"))) {
      console.log("Found admin dist at:", p);
      return p;
    }
  }
  console.error("Admin dist NOT found. Tried:", candidates);
  return null;
}

const adminDistPath = findAdminDist();

// Serve admin SPA static files
server.get("*", async (c) => {
  if (!adminDistPath) return c.text("Admin build not found", 404);

  const url = new URL(c.req.url);
  let filePath = path.join(adminDistPath, url.pathname);

  // If not a file or is a directory, SPA fallback to index.html
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
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
