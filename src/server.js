const express = require("express");
const config = require("./config");

function createServer(getStatus) {
  const app = express();

  app.get("/health", (req, res) => {
    const status = getStatus();
    res.status(status.telegramConnected ? 200 : 503).json({
      status: status.telegramConnected ? "ok" : "degraded",
      telegramConnected: status.telegramConnected,
      uptimeSeconds: process.uptime(),
    });
  });

  const server = app.listen(config.server.port, () => {
    console.log(`Health check server listening on port ${config.server.port}`);
  });

  return server;
}

module.exports = { createServer };
