# Telegram AI Partner

یک AI companion شخصی که روی یک اکانت کاربری تلگرام (نه Bot) اجرا می‌شود، با شخصیت قابل تنظیم پاسخ می‌دهد، context مکالمه را نگه می‌دارد، و در صورت سکوت طولانی خودش پیام proactive می‌فرستد. برای اجرای دائمی روی **Railway** طراحی شده.

## ⚠️ نکته مهم درباره‌ی ToS

این پروژه از **MTProto** (کتابخانه [GramJS](https://github.com/gram-js/gramjs)) برای لاگین به‌عنوان یک اکانت کاربری واقعی تلگرام استفاده می‌کند، نه Bot API. Telegram معمولاً رفتار خودکار روی اکانت‌های کاربری را در قوانین استفاده خود منع می‌کند و ریسک محدودیت/بن شدن آن اکانت وجود دارد. این پروژه فقط باید روی اکانتی استفاده شود که خودتان مالک آن هستید و ریسک آن را می‌پذیرید.

## معماری

```
src/
├── telegram/     اتصال MTProto، دریافت/ارسال پیام، جلوگیری از self-loop
├── ai/           فراخوانی OpenRouter با retry + exponential backoff
├── memory/       پیام‌های اخیر + خلاصه‌ی مکالمات قدیمی (رشد نامحدود ندارد)
├── personality/  تعریف شخصیت، جدا از منطق تلگرام
├── scheduler/    ارسال proactive بعد از سکوت طولانی
├── config/       خواندن environment variables
├── server.js     Express health server برای Railway
└── main.js       نقطه‌ی شروع + graceful shutdown
```

## پیش‌نیاز: گرفتن API ID / API Hash

از https://my.telegram.org وارد شوید → API Development Tools → یک اپلیکیشن بسازید → `api_id` و `api_hash` را بردارید.

## مرحله ۱ — تولید Session String (لوکال، یک‌بار)

این اسکریپت را **روی کامپیوتر خودتان** اجرا کنید، نه روی Railway:

```bash
npm install
TELEGRAM_API_ID=xxxx TELEGRAM_API_HASH=xxxx npm run generate-session
```

شماره تلفن، کد ورود و رمز دو مرحله‌ای (در صورت وجود) را وارد کنید. در پایان یک رشته‌ی طولانی به‌عنوان `TELEGRAM_SESSION` چاپ می‌شود — آن را کپی کنید. این مقدار هرگز نباید در Git قرار بگیرد.

## مرحله ۲ تا ۹ — Deploy روی Railway

1. یک repository جدید در GitHub بسازید.
2. این پروژه را push کنید (فایل‌های `.env`, `*.session`, `memory-store.json` به‌خاطر `.gitignore` push نمی‌شوند).
3. در [Railway](https://railway.com) یک پروژه‌ی جدید بسازید.
4. repository گیت‌هاب را متصل کنید (Railway به‌صورت خودکار `Dockerfile` را تشخیص می‌دهد).
5. در بخش Variables، مقادیر زیر را اضافه کنید:
   - `TELEGRAM_API_ID`
   - `TELEGRAM_API_HASH`
   - `TELEGRAM_SESSION` (از مرحله ۱)
   - `OPENROUTER_API_KEY`
   - `OPENROUTER_MODEL` (مثلاً `openai/gpt-4o-mini` یا هر مدلی که در OpenRouter فعال است)
   - `TARGET_USERNAME=mhmd59`
   - `PROACTIVE_ENABLED=true`
   - `MIN_PROACTIVE_INTERVAL_MINUTES=5`
   - `MAX_PROACTIVE_INTERVAL_MINUTES=8`
   - (`PORT` را Railway خودش تنظیم می‌کند، نیازی به تنظیم دستی نیست)
6. Deploy کنید.
7. در تب Logs بررسی کنید که خطایی وجود نداشته باشد.
8. باید خط `Telegram connected` را در لاگ‌ها ببینید.
9. یک پیام تست به/از اکانت هدف بفرستید و بررسی کنید `Received message` → `Generating AI response` → `AI response generated` → `Message sent` در لاگ ظاهر شود.

می‌توانید سلامت سرویس را از مسیر `/health` (روی دامنه‌ای که Railway به شما می‌دهد) بررسی کنید؛ این مسیر هیچ اطلاعات حساسی برنمی‌گرداند.

## شخصیت را تغییر دهید

فایل `src/personality/index.js` را ویرایش کنید — تن، سطح شوخ‌طبعی، میزان ایموجی، سبک نگارش و... همگی آنجا تعریف شده‌اند و از منطق تلگرام/AI جدا هستند.

## Memory

پیام‌های اخیر در فایل JSON نگه‌داری می‌شوند (مسیر آن با `MEMORY_FILE_PATH` قابل تنظیم است). وقتی تعداد پیام‌ها از `SUMMARIZE_AFTER` بیشتر شود، پیام‌های قدیمی‌تر به‌صورت خلاصه در می‌آیند و فقط `MAX_RECENT_MESSAGES` پیام اخیر + خلاصه به OpenRouter فرستاده می‌شود — یعنی context بدون محدودیت رشد نمی‌کند.

توجه: روی Railway، دیسک به‌صورت پیش‌فرض ephemeral است؛ یعنی با هر deploy جدید ممکن است `memory-store.json` پاک شود. برای persistence کامل بین deployها می‌توانید یک [Railway Volume](https://docs.railway.com/reference/volumes) متصل کنید و `MEMORY_FILE_PATH` را روی مسیر آن volume تنظیم کنید.

## متغیرهای محیطی کامل

به فایل `.env.example` مراجعه کنید.
