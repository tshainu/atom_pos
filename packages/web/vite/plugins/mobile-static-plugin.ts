import type { Plugin } from "vite";
import fs from "fs";
import path from "path";

const distDir = path.resolve(__dirname, "../../../mobile/dist");

export default function mobileStaticPlugin(): Plugin {
  return {
    name: "mobile-static",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Skip API routes
        if (req.url?.startsWith("/api")) return next();

        const urlPath = req.url?.split("?")[0] ?? "/";
        let filePath = path.join(distDir, urlPath);

        // Default to index.html for SPA routing
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          filePath = path.join(distDir, "index.html");
        }

        if (!fs.existsSync(filePath)) return next();

        const ext = path.extname(filePath);
        const mimeTypes: Record<string, string> = {
          ".html": "text/html",
          ".js": "application/javascript",
          ".css": "text/css",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".ico": "image/x-icon",
          ".json": "application/json",
          ".woff": "font/woff",
          ".woff2": "font/woff2",
          ".ttf": "font/ttf",
        };

        res.setHeader("Content-Type", mimeTypes[ext] ?? "application/octet-stream");
        res.setHeader("Cache-Control", "no-cache");
        fs.createReadStream(filePath).pipe(res);
      });
    },
  };
}
