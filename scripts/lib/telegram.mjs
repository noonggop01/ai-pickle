const API_BASE = 'https://api.telegram.org/bot';
const DEFAULT_RETRY_DELAYS_MS = [1000, 2000, 4000];
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const APPROVAL_COMMANDS = new Set(['발행', '승인', '승인하고 발행', 'publish', 'approve']);

export function isApprovalCommand(text) {
  return typeof text === 'string' && APPROVAL_COMMANDS.has(text.trim().toLowerCase());
}

// A reply-keyboard button sends an ordinary Telegram message. This is more
// reliable for the scheduled poller than an inline callback, which can expire
// or be consumed before the next GitHub Actions run sees it.
export function approvalReplyKeyboard() {
  return {
    keyboard: [[{ text: '발행' }]],
    resize_keyboard: true,
    one_time_keyboard: true,
    selective: true,
  };
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function telegramRequest(
  method,
  {
    httpMethod = 'GET',
    query = {},
    body,
    retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
    fetchImpl = fetch,
    sleepImpl = sleep,
    timeoutMs = 20000,
  } = {},
) {
  const token = requireEnv('TELEGRAM_BOT_TOKEN');
  const url = new URL(`${API_BASE}${token}/${method}`);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, String(value));
  }

  let lastError;
  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
    try {
      const response = await fetchImpl(url, {
        method: httpMethod,
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: timeoutMs > 0 ? AbortSignal.timeout(timeoutMs) : undefined,
      });
      const raw = await response.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        data = { ok: false, description: raw || `HTTP ${response.status}` };
      }

      if (response.ok && data.ok) return data.result;

      const errorCode = data.error_code ?? response.status;
      const error = new Error(`Telegram ${method} failed: ${JSON.stringify(data)}`);
      error.retryable = RETRYABLE_STATUS_CODES.has(errorCode);
      error.retryAfterMs = Number(data.parameters?.retry_after || 0) * 1000;
      throw error;
    } catch (error) {
      const normalizedError = ['AbortError', 'TimeoutError'].includes(error?.name)
        ? Object.assign(new Error(`Telegram ${method} timed out after ${timeoutMs}ms.`), { retryable: true })
        : error;
      lastError = normalizedError;
      const retryable = normalizedError.retryable !== false;
      if (!retryable || attempt === retryDelaysMs.length) throw normalizedError;

      const delayMs = normalizedError.retryAfterMs || retryDelaysMs[attempt];
      console.warn(`Telegram ${method} attempt ${attempt + 1} failed; retrying in ${delayMs}ms.`);
      await sleepImpl(delayMs);
    }
  }

  throw lastError;
}

export async function sendMessage(text, { replyMarkup, requestOptions } = {}) {
  const chatId = requireEnv('TELEGRAM_CHAT_ID');
  return telegramRequest('sendMessage', {
    httpMethod: 'POST',
    body: {
      chat_id: chatId,
      text,
      reply_markup: replyMarkup,
      disable_web_page_preview: true,
    },
    ...requestOptions,
  });
}

export async function getUpdates(requestOptions = {}) {
  return telegramRequest('getUpdates', {
    query: { timeout: 0 },
    ...requestOptions,
  });
}

// Confirms receipt up through updateId so Telegram won't redeliver it.
export async function confirmUpdatesThrough(updateId, requestOptions = {}) {
  return telegramRequest('getUpdates', {
    query: { offset: updateId + 1, timeout: 0 },
    ...requestOptions,
  });
}

export async function answerCallbackQuery(callbackQueryId, text, requestOptions = {}) {
  return telegramRequest('answerCallbackQuery', {
    httpMethod: 'POST',
    body: { callback_query_id: callbackQueryId, text },
    ...requestOptions,
  });
}
