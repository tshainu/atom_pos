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

// Debug endpoint to diagnose path issues
server.get("/debug-path", (c) => {
  const cwd = process.cwd();
  const info: Record<string, any> = { cwd, __dirname };
  
  // List top-level dirs
  try { info["cwd_ls"] = fs.readdirSync(cwd); } catch {}
  
  // Check dist-server location
  try { info["dist-server_ls"] = fs.readdirSync(path.join(cwd, "dist-server")); } catch {}
  
  // Check admin-entry
  try { info["admin-entry_ls"] = fs.readdirSync(path.join(cwd, "admin-entry")); } catch {}
  
  // Recursive search for index.html
  const found: string[] = [];
  function findHtml(dir: string, depth: number) {
    if (depth > 4) return;
    try {
      for (const f of fs.readdirSync(dir)) {
        const full = path.join(dir, f);
        if (f === "index.html") found.push(full);
        else if (fs.statSync(full).isDirectory()) findHtml(full, depth + 1);
      }
    } catch {}
  }
  findHtml(cwd, 0);
  info["index_html_locations"] = found;
  
  return c.json(info);
});

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

// Serve static files manually
server.get("*", async (c) => {
  if (!adminDistPath) return c.text("Admin build not found", 404);

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
