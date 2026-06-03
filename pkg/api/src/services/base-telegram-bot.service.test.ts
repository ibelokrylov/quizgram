import { describe, expect, test, beforeEach, afterEach, mock } from 'bun:test';
import { BaseTelegramBotService } from './base-telegram-bot.service';

const TG_SENDER_URL = 'http://localhost:9999';

beforeEach(() => {
  process.env.TG_SENDER_URL = TG_SENDER_URL;
});

afterEach(() => {
  delete process.env.TG_SENDER_URL;
});

function parseArgs(args: unknown[]) {
  const url = args[0] as string;
  const opts = args[1] as RequestInit;
  return {
    url,
    method: opts.method,
    body: JSON.parse(opts.body as string),
  };
}



describe('BaseTelegramBotService', () => {
  test('sendMessage: правильный URL, метод, заголовки', async () => {
    const fetchMock = mock(globalThis.fetch);
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await BaseTelegramBotService.sendMessage('BOT_CRM_TOKEN', 123, 'test text');

    const req = parseArgs(fetchMock.mock.calls[0]);
    expect(req.url).toBe(`${TG_SENDER_URL}/api/sendMessage`);
    expect(req.method).toBe('POST');
    expect(req.body.bot).toBe('crm');
    expect(req.body.chat_id).toBe(123);
    expect(req.body.text).toBe('test text');
    expect(req.body.parse_mode).toBe('HTML');
    expect(req.body.disable_web_page_preview).toBe(false);

    globalThis.fetch = undefined as never;
  });

  test('sendMessage: replyMarkup передаётся в body', async () => {
    const fetchMock = mock(globalThis.fetch);
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    const replyMarkup = {
      inline_keyboard: [[{ text: 'Button', callback_data: 'btn_1' }]],
    };

    await BaseTelegramBotService.sendMessage('BOT_CRM_TOKEN', 456, 'text', 'HTML', false, replyMarkup);

    const req = parseArgs(fetchMock.mock.calls[0]);
    expect(req.body.reply_markup).toEqual(replyMarkup);

    globalThis.fetch = undefined as never;
  });

  test('sendMessage: BOT_QUIZ_TOKEN маппится в quiz', async () => {
    const fetchMock = mock(globalThis.fetch);
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await BaseTelegramBotService.sendMessage('BOT_QUIZ_TOKEN', 789, 'hello');

    const req = parseArgs(fetchMock.mock.calls[0]);
    expect(req.body.bot).toBe('quiz');

    globalThis.fetch = undefined as never;
  });

  test('sendPhoto: правильный body с photo URL', async () => {
    const fetchMock = mock(globalThis.fetch);
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await BaseTelegramBotService.sendPhoto('BOT_CRM_TOKEN', 111, 'caption', 'HTML', 'https://example.com/img.jpg');

    const req = parseArgs(fetchMock.mock.calls[0]);
    expect(req.url).toBe(`${TG_SENDER_URL}/api/sendPhoto`);
    expect(req.body.bot).toBe('crm');
    expect(req.body.chat_id).toBe(111);
    expect(req.body.caption).toBe('caption');
    expect(req.body.photo).toBe('https://example.com/img.jpg');

    globalThis.fetch = undefined as never;
  });

  test('answerCallbackQuery: правильный body', async () => {
    const fetchMock = mock(globalThis.fetch);
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await BaseTelegramBotService.answerCallbackQuery('BOT_QUIZ_TOKEN', 'cb_123');

    const req = parseArgs(fetchMock.mock.calls[0]);
    expect(req.url).toBe(`${TG_SENDER_URL}/api/answerCallbackQuery`);
    expect(req.body.bot).toBe('quiz');
    expect(req.body.callback_query_id).toBe('cb_123');

    globalThis.fetch = undefined as never;
  });

  test('ошибка сети: fetch выбрасывает', async () => {
    const fetchMock = mock(globalThis.fetch);
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
    fetchMock.mockRejectedValue(new Error('network error'));

    await expect(
      BaseTelegramBotService.sendMessage('BOT_CRM_TOKEN', 1, 'text')
    ).rejects.toThrow();

    globalThis.fetch = undefined as never;
  });

  test('ошибка 4xx: tg-sender ошибка пробрасывается', async () => {
    const fetchMock = mock(globalThis.fetch);
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
    fetchMock.mockResolvedValue(new Response('Bad Request', { status: 400, headers: { 'Content-Type': 'text/plain' } }));

    await expect(
      BaseTelegramBotService.sendMessage('BOT_CRM_TOKEN', 1, 'text')
    ).rejects.toThrow(/tg-sender ответил 400/);

    globalThis.fetch = undefined as never;
  });

  test('sendMessage: MarkdownV2 parseMode', async () => {
    const fetchMock = mock(globalThis.fetch);
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await BaseTelegramBotService.sendMessage('BOT_CRM_TOKEN', 1, '*bold*', 'MarkdownV2');

    const req = parseArgs(fetchMock.mock.calls[0]);
    expect(req.body.parse_mode).toBe('MarkdownV2');

    globalThis.fetch = undefined as never;
  });
});
