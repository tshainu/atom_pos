import { serve } from "@hono/node-server";
import app from "./src/api/index.js";

const port = parseInt(process.env.PORT || "3000");

console.log(`Starting server on port ${port}`);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});
