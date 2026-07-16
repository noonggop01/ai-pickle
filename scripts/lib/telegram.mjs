const API_BASE = 'https://api.telegram.org/bot';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

export async function sendMessage(text, { replyMarkup } = {}) {
  const token = requireEnv('TELEGRAM_BOT_TOKEN');
  const chatId = requireEnv('TELEGRAM_CHAT_ID');
  const res = await fetch(`${API_BASE}${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: replyMarkup,
      disable_web_page_preview: true,
    }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram sendMessage failed: ${JSON.stringify(data)}`);
  return data.result;
}

export async function getUpdates() {
  const token = requireEnv('TELEGRAM_BOT_TOKEN');
  const res = await fetch(`${API_BASE}${token}/getUpdates?timeout=0`);
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram getUpdates failed: ${JSON.stringify(data)}`);
  return data.result;
}

// Confirms receipt up through updateId so Telegram won't redeliver it.
export async function confirmUpdatesThrough(updateId) {
  const token = requireEnv('TELEGRAM_BOT_TOKEN');
  await fetch(`${API_BASE}${token}/getUpdates?offset=${updateId + 1}&timeout=0`);
}

export async function answerCallbackQuery(callbackQueryId, text) {
  const token = requireEnv('TELEGRAM_BOT_TOKEN');
  await fetch(`${API_BASE}${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}
