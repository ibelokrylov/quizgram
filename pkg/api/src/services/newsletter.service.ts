import { and, isNotNull, notInArray, sql } from "drizzle-orm";
import { db, NewsletterTestTable, quizBidTable, UserTable } from "../db";
import { logger } from "../lib/logger";
import { BaseTelegramBotService, type InlineKeyboardMarkup } from "./base-telegram-bot.service";

const NEWSLETTER_BATCH_SIZE = 5;
const NEWSLETTER_BATCH_DELAY_MS =
	parseInt(process.env.NEWSLETTER_BATCH_DELAY_MS || "3000", 10);

async function processInBatches<T, R>(
	items: T[],
	batchSize: number,
	delayMs: number,
	processor: (item: T) => Promise<R>,
): Promise<{ success: R[]; errors: unknown[] }> {
	const success: R[] = [];
	const errors: unknown[] = [];

	for (let i = 0; i < items.length; i += batchSize) {
		const batch = items.slice(i, i + batchSize);
		const results = await Promise.allSettled(batch.map(processor));

		for (const result of results) {
			if (result.status === "fulfilled") {
				success.push(result.value);
			} else {
				errors.push(result.reason);
			}
		}

		if (i + batchSize < items.length) {
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
	}

	return { success, errors };
}

export abstract class NewsletterService {
	static async sendNewsletter(type: "user" | "bid") {
		const alreadySentIds = [...(new Set((
			await db
				.select({tgId: NewsletterTestTable.telegramUserId})
				.from(NewsletterTestTable)
		).map((item) => item.tgId)))];

		logger.info(
			`Newsletter ${type} - already sent: ${JSON.stringify(alreadySentIds)}`,
		);

		const ids: string[] = [];

		if (type === "user") {
			const userTgIds = (
				await db
					.select({tgId: UserTable.telegramId})
					.from(UserTable)
					.where(
						alreadySentIds.length > 0
							? and(
								notInArray(UserTable.telegramId, alreadySentIds),
								isNotNull(UserTable.telegramId),
							)
							: isNotNull(UserTable.telegramId),
					)
			)
				.map((item) => item.tgId)
				.filter((id): id is string => id !== null);

			logger.info(`Newsletter ${type} - new: ${JSON.stringify(userTgIds)}`);
			ids.push(...userTgIds);
		} else {
			const bidQuery = db
				.select({info: quizBidTable.userInfo})
				.from(quizBidTable);

			const bidUserTgIds = (
				await (alreadySentIds.length > 0
					? bidQuery.where(
						sql`(${quizBidTable.userInfo} IS NULL OR (${quizBidTable.userInfo}->>'id'):: int NOT IN (${sql.join(alreadySentIds.map((id) => sql`${id}`), sql`, `)}))`,
					)
					: bidQuery)
			)
				.map((item) => {
					const info = item.info as { id?: number } | null;
					return info?.id?.toString();
				})
				.filter((id): id is string => id !== undefined);

			logger.info(
				`Newsletter ${type} - new: ${JSON.stringify(bidUserTgIds)}`,
			);
			ids.push(...bidUserTgIds);
		}

		const targetIds = new Set(ids);
		logger.info(`Newsletter ${type} - total: ${[...targetIds]}`);

		if (targetIds.size === 0) {
			logger.info(`Newsletter ${type} - нет новых получателей`);
			return;
		}

		const msg = `
Привет! Это QuizGram.\n\n\nЗаметили, что вы начинали создавать квиз, но пока не дошли до запуска.\n\nКвиз — это простой способ <b>собрать целевые заявки</b> и одновременно <b>проанализировать аудиторию</b>: понять, кто к вам приходит, что им нужно и на какие сегменты лучше делать офферы дальше.\n\nЗапустите свой первый квиз за 5 минут и начните собирать заявки уже сегодня.
`;

		const tgAppUrl = `https://t.me/${process.env.ENV === "production" ? "Quiz_gramm_bot" : "tg_union_bot"}`;

		const inlineKeyboardButtons: { text: string; url: string }[][] = [
			[{text: "📱 Открыть в Telegram App", url: tgAppUrl}],
		];

		const crmUrl = (process.env.CRM_URL || "").trim();
		const baseUrl = crmUrl.endsWith("/") ? crmUrl.slice(0, -1) : crmUrl;
		const reportUrl = `${baseUrl}/app`;
		const isLocalhost =
			reportUrl.includes("localhost") || reportUrl.includes("127.0.0.1");

		if (!isLocalhost) {
			inlineKeyboardButtons.push([{text: "🌐 Открыть в Web", url: reportUrl}]);
		}

		const keyboard: InlineKeyboardMarkup = {inline_keyboard: inlineKeyboardButtons};

		const { success: successIds, errors } = await processInBatches(
			[...targetIds],
			NEWSLETTER_BATCH_SIZE,
			NEWSLETTER_BATCH_DELAY_MS,
			(chatId) =>
				BaseTelegramBotService.sendPhoto(
					type === "user" ? "BOT_CRM_TOKEN" : "BOT_QUIZ_TOKEN",
					+chatId,
					msg,
					"HTML",
					"https://s3.twcstorage.ru/94d2afd0-8e4e8b8f-eba1-49c1-a6ea-bb86e479fa7e/images/2026-01-13%2000.59.23%20(1).jpg",
					false,
					keyboard,
				).then(() => {
					logger.info(`Newsletter ${type} - успешно отправлено chatId ${chatId}`);
					return chatId;
				}),
		);

		errors.forEach((err) => {
			const message = err instanceof Error ? err.message : String(err);
			logger.error(`Newsletter ${type} - ошибка отправки: ${message}`);
		});

		if (successIds.length === 0) return;

		await db
			.insert(NewsletterTestTable)
			.values([...(new Set(successIds))].map((id) => ({telegramUserId: id})));
	}
}
