const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { NewMessage } = require("telegram/events");
const config = require("../config");

let client;
let selfId; // to detect and ignore our own outgoing messages in the event handler
let targetEntity;

async function connect() {
  client = new TelegramClient(
    new StringSession(config.telegram.session),
    config.telegram.apiId,
    config.telegram.apiHash,
    {
      connectionRetries: 10,
      retryDelay: 2000,
      autoReconnect: true,
    }
  );

  await client.connect();

  const me = await client.getMe();
  selfId = me.id.toString();

  targetEntity = await client.getEntity(config.telegram.targetUsername);

  console.log("Telegram connected");
  return client;
}

function onMessage(handler) {
  client.addEventHandler(async (event) => {
    try {
      const message = event.message;
      if (!message) return;

      // Ignore messages we sent ourselves (prevents self-message loop)
      if (message.out) return;
      if (message.senderId && message.senderId.toString() === selfId) return;

      // Only react to messages from the configured target conversation
      const chatId = message.chatId ? message.chatId.toString() : null;
      const targetId = targetEntity.id ? targetEntity.id.toString() : null;
      if (chatId && targetId && chatId !== targetId) return;

      console.log("Received message");
      await handler(message);
    } catch (err) {
      console.error("Telegram error handling message:", err.message);
    }
  }, new NewMessage({}));
}

async function sendMessage(text) {
  await client.sendMessage(targetEntity, { message: text });
  console.log("Message sent");
}

async function disconnect() {
  if (client) {
    await client.disconnect();
  }
}

module.exports = { connect, onMessage, sendMessage, disconnect };
