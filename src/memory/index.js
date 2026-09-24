const fs = require("fs");
const path = require("path");
const config = require("../config");

const STORE_PATH = config.memory.filePath;

function defaultState() {
  return {
    recentMessages: [], // { role: 'user'|'assistant', text, timestamp }
    summary: "",
    lastInteractionAt: null,
    lastProactiveAt: null,
    processedMessageIds: [], // for dedupe, capped
  };
}

let state = loadFromDisk();

function loadFromDisk() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf8");
      return { ...defaultState(), ...JSON.parse(raw) };
    }
  } catch (err) {
    console.error("Memory load failed, starting fresh:", err.message);
  }
  return defaultState();
}

function persist() {
  try {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(state, null, 2), "utf8");
  } catch (err) {
    console.error("Memory persist failed:", err.message);
  }
}

function isDuplicate(messageId) {
  return state.processedMessageIds.includes(messageId);
}

function markProcessed(messageId) {
  state.processedMessageIds.push(messageId);
  // cap dedupe list so it doesn't grow unbounded
  if (state.processedMessageIds.length > 500) {
    state.processedMessageIds = state.processedMessageIds.slice(-500);
  }
}

function addMessage(role, text) {
  state.recentMessages.push({ role, text, timestamp: Date.now() });
  state.lastInteractionAt = Date.now();
  if (role === "assistant") {
    state.lastProactiveAt = state.lastProactiveAt; // untouched here; set explicitly for proactive sends
  }

  const { maxRecentMessages, summarizeAfter } = config.memory;
  if (state.recentMessages.length > summarizeAfter) {
    // Fold oldest messages into the rolling summary, keep only the tail.
    const toFold = state.recentMessages.slice(0, state.recentMessages.length - maxRecentMessages);
    const foldedText = toFold
      .map((m) => `${m.role === "user" ? "او" : "من"}: ${m.text}`)
      .join("\n");
    state.summary = `${state.summary}\n${foldedText}`.trim().slice(-4000); // bound summary size
    state.recentMessages = state.recentMessages.slice(-maxRecentMessages);
  }
  persist();
}

function markProactiveSent() {
  state.lastProactiveAt = Date.now();
  persist();
}

function getContext() {
  return {
    recentMessages: state.recentMessages,
    summary: state.summary,
    lastInteractionAt: state.lastInteractionAt,
    lastProactiveAt: state.lastProactiveAt,
  };
}

module.exports = {
  isDuplicate,
  markProcessed,
  addMessage,
  markProactiveSent,
  getContext,
};
