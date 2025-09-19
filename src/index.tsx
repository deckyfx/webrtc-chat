import { serve } from "bun";
import index from "./index.html";

// Get port from environment variable or use default
const port = process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT) : 10001;

// Simple static file server - no WebSocket, no tracking, no backend logic
const server = serve({
  port,
  hostname: "0.0.0.0", // Bind to all interfaces
  routes: {
    // Serve index.html for all routes - purely static hosting
    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Static server running at ${server.url}`);
