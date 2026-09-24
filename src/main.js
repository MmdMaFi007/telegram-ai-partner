const telegram = require("./telegram");
const ai = require("./ai");
const memory = require("./memory");
const scheduler = require("./scheduler");
const { createServer } = require("./server");

let telegramConnected = false;
let httpServer;

async function handleIncomingMessage(message) {
  const messageId = `${message.chatId}:${message.id}`;
  if (memory.isDuplicate(messageId)) return;
  memory.markProcessed(messageId);

  const text = message.message || "";
  if (!text) return;

  memory.addMessage("user", text);

  console.log("Generating AI response");
  const { recentMessages, summary } = memory.getContext();
  const reply = await ai.generateReply({ recentMessages, summary });

  if (!reply) {
    console.error("AI response generation failed after retries; skipping reply");
    return;
  }

  console.log("AI response generated");
  await telegram.sendMessage(reply);
  memory.addMessage("assistant", reply);
}

async function main() {
  await telegram.connect();
  telegramConnected = true;

  telegram.onMessage(handleIncomingMessage);

  scheduler.start();

  httpServer = createServer(() => ({ telegramConnected }));

  process.on("uncaughtException", (err) => {
    console.error("Unexpected exception (continuing):", err.message);
  });
  process.on("unhandledRejection", (err) => {
    console.error("Unhandled rejection (continuing):", err instanceof Error ? err.message : err);
  });
}

async function shutdown(signal) {
  console.log(`Received ${signal}, shutting down gracefully`);
  scheduler.stop();
  try {
    await telegram.disconnect();
  } catch (err) {
    console.error("Error during Telegram disconnect:", err.message);
  }
  if (httpServer) {
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  } else {
    process.exit(0);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

main().catch((err) => {
  console.error("Fatal startup error:", err.message);
  process.exit(1);
});
