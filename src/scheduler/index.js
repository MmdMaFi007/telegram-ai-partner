const config = require("../config");
const memory = require("../memory");
const ai = require("../ai");
const telegram = require("../telegram");

function randomIntervalMs() {
  const { minIntervalMinutes, maxIntervalMinutes } = config.proactive;
  const minMs = minIntervalMinutes * 60 * 1000;
  const maxMs = maxIntervalMinutes * 60 * 1000;
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

let timer = null;

function tehranHour() {
  const h = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Tehran" }).format(new Date());
  return parseInt(h, 10) % 24;
}

function inQuietHours() {
  const { quietStartHour: s, quietEndHour: e } = config.proactive;
  const h = tehranHour();
  return s <= e ? h >= s && h < e : h >= s || h < e;
}

// چند پیام آخر پشت‌سرهم مال خودشه (محمد جواب نداده)؟
function trailingAssistantCount(messages) {
  let n = 0;
  for (let i = messages.length - 1; i >= 0 && messages[i].role === "assistant"; i--) n++;
  return n;
}

function scheduleNextCheck() {
  const delay = randomIntervalMs();
  timer = setTimeout(tick, delay);
}

async function tick() {
  try {
    await maybeSendProactiveMessage();
  } catch (err) {
    console.error("Proactive scheduler error:", err.message);
  } finally {
    scheduleNextCheck();
  }
}

async function maybeSendProactiveMessage() {
  const { lastInteractionAt, lastProactiveAt, recentMessages, summary } = memory.getContext();
  const now = Date.now();
  const { minIntervalMinutes } = config.proactive;
  const minGapMs = minIntervalMinutes * 60 * 1000;

  // Never sent anything yet — wait for a real interaction first.
  if (!lastInteractionAt) return;

  if (inQuietHours()) return; // نصفه‌شب پیام نده
  if (trailingAssistantCount(recentMessages) >= config.proactive.maxConsecutive) return; // پشت‌سرهم پیام نده

  const silenceMs = now - lastInteractionAt;
  if (silenceMs < minGapMs) return; // not silent long enough yet

  // Rate limit: don't send proactive messages back to back too fast.
  if (lastProactiveAt && now - lastProactiveAt < minGapMs) return;

  const instruction =
    "مدتیه پیامی نگرفتی. یه پیام خیلی کوتاه (یک خط) بفرست، انگار دلت براش تنگ شده یا کنجکاوی چیکار می‌کنه. تکراری یا کلیشه‌ای ننویس، به context قبلی توجه کن.";

  const reply = await ai.generateReply({ recentMessages, summary, instruction });
  if (!reply) return; // AI failed after retries; skip this cycle silently

  await telegram.sendMessage(reply);
  memory.addMessage("assistant", reply);
  memory.markProactiveSent();
  console.log("Proactive message sent");
}

function start() {
  if (!config.proactive.enabled) {
    console.log("Proactive scheduler disabled via config");
    return;
  }
  console.log("Proactive scheduler started");
  scheduleNextCheck();
}

function stop() {
  if (timer) clearTimeout(timer);
}

module.exports = { start, stop };
