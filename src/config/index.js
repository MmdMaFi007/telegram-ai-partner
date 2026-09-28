require("dotenv").config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

const config = {
  telegram: {
    apiId: parseInt(requireEnv("TELEGRAM_API_ID"), 10),
    apiHash: requireEnv("TELEGRAM_API_HASH"),
    session: requireEnv("TELEGRAM_SESSION"),
    targetUsername: requireEnv("TARGET_USERNAME"),
  },
  openrouter: {
    apiKey: requireEnv("OPENROUTER_API_KEY"),
    model: requireEnv("OPENROUTER_MODEL"),
    // برای مدل‌های reasoning‌دار (مثل space-bunny-alpha): سقف کل توکن‌ها (فکر + جواب)
    maxTokens: parseInt(optionalEnv("MAX_OUTPUT_TOKENS", "1000"), 10),
    // none | minimal | low | medium | high ؛ خالی = پارامتر reasoning اصلاً فرستاده نشه
    reasoningEffort: optionalEnv("REASONING_EFFORT", "low"),
  },
  proactive: {
    enabled: optionalEnv("PROACTIVE_ENABLED", "true") === "true",
    minIntervalMinutes: parseInt(optionalEnv("MIN_PROACTIVE_INTERVAL_MINUTES", "90"), 10),
    maxIntervalMinutes: parseInt(optionalEnv("MAX_PROACTIVE_INTERVAL_MINUTES", "180"), 10),
    maxConsecutive: parseInt(optionalEnv("MAX_CONSECUTIVE_PROACTIVE", "2"), 10),
    quietStartHour: parseInt(optionalEnv("QUIET_START_HOUR", "1"), 10), // به وقت تهران
    quietEndHour: parseInt(optionalEnv("QUIET_END_HOUR", "8"), 10),
  },
  style: {
    // احتمال اینکه ایموجی (حداکثر یکی) تو پیام بمونه؛ 0 = هیچ‌وقت، 1 = همیشه
    emojiChance: parseFloat(optionalEnv("EMOJI_CHANCE", "0.3")),
  },
  reply: {
    // صبر می‌کنه تا اگه محمد چند پیام پشت‌سرهم فرستاد، یه جواب بده
    debounceMs: parseInt(optionalEnv("REPLY_DEBOUNCE_MS", "3500"), 10),
  },
  server: {
    port: parseInt(optionalEnv("PORT", "3000"), 10),
  },
  memory: {
    maxRecentMessages: parseInt(optionalEnv("MAX_RECENT_MESSAGES", "30"), 10),
    summarizeAfter: parseInt(optionalEnv("SUMMARIZE_AFTER", "40"), 10),
    filePath: optionalEnv("MEMORY_FILE_PATH", "/tmp/memory-store.json"),
  },
};

module.exports = config;
