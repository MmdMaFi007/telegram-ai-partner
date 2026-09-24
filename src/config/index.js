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
  },
  proactive: {
    enabled: optionalEnv("PROACTIVE_ENABLED", "true") === "true",
    minIntervalMinutes: parseInt(optionalEnv("MIN_PROACTIVE_INTERVAL_MINUTES", "5"), 10),
    maxIntervalMinutes: parseInt(optionalEnv("MAX_PROACTIVE_INTERVAL_MINUTES", "8"), 10),
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
