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
  console.log(
    `[DEBUG] Logged in as: id=${selfId}, username=${me.username || "(none)"}, phone=${me.phone || "(none)"}`
  );
  console.log(
    `[DEBUG] Target username config: "${config.telegram.targetUsername}"`
  );
  console.log(
    `[DEBUG] Resolved target entity: id=${targetEntity.id ? targetEntity.id.toString() : "(none)"}, className=${targetEntity.className}, username=${targetEntity.username || "(none)"}, firstName=${targetEntity.firstName || "(none)"}`
  );
  return client;
}

function onMessage(handler) {
  client.addEventHandler(async (event) => {
    try {
      const message = event.message;
      if (!message) {
        console.log("[DEBUG] Event fired but no message object present:", JSON.stringify(event, null, 2).slice(0, 500));
        return;
      }

      const senderId = message.senderId ? message.senderId.toString() : null;
      const chatId = message.chatId ? message.chatId.toString() : null;
      const targetId = targetEntity.id ? targetEntity.id.toString() : null;

      console.log(
        `[DEBUG] Event received: out=${message.out}, senderId=${senderId}, chatId=${chatId}, targetId=${targetId}, text="${(message.message || "").slice(0, 50)}"`
      );

      // Ignore messages we sent ourselves (prevents self-message loop)
      if (message.out) {
        console.log("[DEBUG] Ignored: message.out is true (this is an outgoing message)");
        return;
      }
      if (senderId && senderId === selfId) {
        console.log("[DEBUG] Ignored: senderId matches our own id");
        return;
      }

      // Only react to messages from the configured target conversation
      if (chatId && targetId && chatId !== targetId) {
        console.log(`[DEBUG] Ignored: chatId (${chatId}) does not match targetId (${targetId})`);
        return;
      }

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
