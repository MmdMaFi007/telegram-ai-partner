/**
 * Safety net: حتی با پرامپت خوب، بعضی مدل‌ها گاهی چند خط یا چندتا ایموجی
 * می‌نویسن. این فایل خروجی رو قبل از ارسال به تلگرام (و قبل از ذخیره تو
 * memory) به سبک یک پیام واقعی برمی‌گردونه.
 */

const EMOJI_RE = /\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/gu;

function limitEmojis(text, emojiChance) {
  const found = text.match(EMOJI_RE);
  if (!found) return text;
  const stripped = text.replace(EMOJI_RE, "").replace(/\s{2,}/g, " ").trim();
  if (!stripped) return found[0]; // پیام فقط ایموجی بوده؛ همون یکی
  return Math.random() < emojiChance ? `${stripped} ${found[0]}` : stripped;
}

function sanitizeReply(raw, { emojiChance = 0.3 } = {}) {
  let t = String(raw || "").replace(/\r/g, "");

  // حروف عربی → فارسی
  t = t.replace(/ي/g, "ی").replace(/ك/g, "ک");

  // پیشوند اسم گوینده، مارک‌داون، گیومه
  t = t.replace(/[*_#`>~]/g, "");
  t = t.replace(/^\s*(سارا|محمد|Sara)\s*[:：]\s*/i, "");
  t = t.replace(/^[\s"«»“”'‘’]+|[\s"«»“”'‘’]+$/g, "");

  // فقط یک خط: اولین خط غیرخالی
  const lines = t.split("\n").map((l) => l.trim()).filter(Boolean);
  t = lines[0] || "";

  // اگه خیلی بلنده، تا اولین پایان جمله‌ی معقول ببر
  if (t.length > 160) {
    const m = t.match(/^(.{15,160}?[.!؟?…])\s/);
    if (m) t = m[1];
  }

  // تایپ گفتاری: «می‌خوام» → «میخوام»، «را» → «رو»
  t = t.replace(/(^|\s)(نمی|می)\u200c/g, "$1$2");
  t = t.replace(/(^|\s)را(?=\s|$)/g, "$1رو").replace(/چه کار/g, "چیکار");

  t = limitEmojis(t, emojiChance);

  // نقطه‌ی آخر جمله معمولاً تو چت نیست
  t = t.replace(/[.。]+\s*$/, "").trim();
  return t;
}

module.exports = { sanitizeReply };
