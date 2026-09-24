const config = require("../config");
const { buildSystemPrompt } = require("../personality");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {object} params
 * @param {Array<{role:string, text:string}>} params.recentMessages
 * @param {string} params.summary
 * @param {string} [params.instruction] extra instruction for proactive messages etc.
 */
async function generateReply({ recentMessages, summary, instruction }) {
  const systemPrompt = buildSystemPrompt({ recentSummary: summary });

  const messages = [
    { role: "system", content: systemPrompt },
    ...recentMessages.map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.text,
    })),
  ];

  if (instruction) {
    messages.push({ role: "system", content: instruction });
  }

  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.openrouter.apiKey}`,
        },
        body: JSON.stringify({
          model: config.openrouter.model,
          messages,
          max_tokens: 500,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.status === 429 || response.status >= 500) {
        throw new Error(`OpenRouter transient error: ${response.status}`);
      }

      if (!response.ok) {
        const bodyText = await response.text().catch(() => "");
        throw Object.assign(new Error(`OpenRouter error: ${response.status}`), {
          fatal: true,
          body: bodyText,
        });
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;

      if (!text || typeof text !== "string") {
        throw Object.assign(new Error("Malformed AI response: no content"), { fatal: true });
      }

      return text.trim();
    } catch (err) {
      lastError = err;
      if (err.fatal || attempt === MAX_RETRIES) break;
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      console.error(`OpenRouter error (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${delay}ms:`, err.message);
      await sleep(delay);
    }
  }

  console.error("OpenRouter error: giving up after retries:", lastError?.message);
  return null; // caller decides fallback behavior; must not crash the process
}

module.exports = { generateReply };
