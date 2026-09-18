import "dotenv/config";
import { createServer } from "http";
import net from "net";
import { buildApp } from "./app";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = buildApp();
  const server = createServer(app);

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Bind to 0.0.0.0 in production (for container health checks)
  // Bind to localhost in development
  const bindAddress = process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost";

  server.listen(port, bindAddress, () => {
    console.log(`Server running on http://${bindAddress}:${port}/`);
    if (process.env.NODE_ENV === "production") {
      console.log("[Security] Running in production mode with security hardening enabled");
    }
  });
}

startServer().catch((error) => {
  console.error("[Server] Fatal error starting server:", error);
  process.exit(1);
});
