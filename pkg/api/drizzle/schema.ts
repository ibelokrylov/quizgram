import { pgEnum, pgTable, varchar, serial, text, integer, timestamp, bigint, boolean, smallint, jsonb, foreignKey, primaryKey, unique } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const codeType = pgEnum("code_type", ["reset_password", "change_email", "registration", "confirm_auth"])
export const paymentStatus = pgEnum("payment_status", ["pending", "paid", "underpaid", "expired", "failed"])
export const planName = pgEnum("plan_name", ["FREE", "BASE", "PRO_PLUS"])
export const quizQuestionType = pgEnum("quiz_question_type", ["answer_option", "variant_image", "variant_image_text", "emoji", "input", "select", "date", "slide", "file", "page", "rating", "question_group"])
export const paymentProvider = pgEnum("payment_provider", ["unitpay"])
export const paymentMethod = pgEnum("payment_method", ["card", "bank_transfer"])
export const emailType = pgEnum("email_type", ["reset_password", "payment", "payment_notification", "subscribe_send_info_payment_2_days"])


export const migrations = pgTable("_migrations", {
	name: text().primaryKey(),
	executedAt: timestamp("executed_at").default(sql`now()`).notNull(),
});

export const code = pgTable("code", {
	id: serial().primaryKey(),
	lifeTime: timestamp("life_time").notNull(),
	nextEmailSendAvailable: timestamp("next_email_send_available").notNull(),
	type: codeType().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	userId: integer("user_id").notNull(),
	value: varchar({ length: 250 }).notNull(),
});

export const email = pgTable("email", {
	id: serial().primaryKey(),
	type: emailType().notNull(),
	userId: integer("user_id").notNull(),
	createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});

export const payment = pgTable("payment", {
	id: serial().primaryKey(),
	userId: integer("user_id").notNull().references(() => user.id),
	planId: integer("plan_id").notNull().references(() => plan.id),
	amount: integer().notNull(),
	currency: text().default("USDT").notNull(),
	status: paymentStatus().default("pending").notNull(),
	method: paymentMethod().default("card").notNull(),
	provider: paymentProvider().default("unitpay").notNull(),
	invoiceId: text("invoice_id"),
	invoiceUrl: text("invoice_url"),
	trackId: text("track_id"),
	metadata: text(),
	createdAt: timestamp("created_at").default(sql`now()`).notNull(),
	updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
});

export const plan = pgTable("plan", {
	id: serial().primaryKey(),
	price: integer().notNull(),
	name: planName().notNull(),
	bidMonthLimit: smallint("bid_month_limit").notNull(),
});

export const quiz = pgTable("quiz", {
	id: serial().primaryKey(),
	uid: varchar({ length: 36 }).notNull(),
	userId: integer("user_id").notNull().references(() => user.id),
	createdAt: timestamp("created_at").default(sql`now()`).notNull(),
	updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
	deletedAt: timestamp("deleted_at"),
	isActive: boolean("is_active").default(true).notNull(),
	name: varchar({ length: 255 }).default("Новый квиз").notNull(),
	isShowLogo: boolean("is_show_logo").default(true).notNull(),
	startPage: jsonb("start_page"),
	questionTitle: varchar("question_title", { length: 255 }).default("Заголовок страницы"),
	isShared: boolean().default(false),
	nodes: jsonb(),
	edges: jsonb(),
}, (table) => [
	unique("quiz_uid_key").on(table.uid),]);

export const quizBid = pgTable("quiz_bid", {
	id: serial().primaryKey(),
	quizId: integer("quiz_id").notNull().references(() => quiz.id),
	key: varchar({ length: 36 }).default(sql`gen_random_uuid()`).notNull(),
	answer: jsonb().notNull(),
	questions: jsonb(),
	contacts: jsonb().default(null),
	contactsForm: jsonb("contacts_form").default(null),
	first: boolean().default(false).notNull(),
	status: varchar({ length: 20 }).default("create").notNull(),
	isFull: boolean("is_full").default(false).notNull(),
	isRead: boolean("is_read").default(false).notNull(),
	isEqualPaymentLimit: boolean("is_equal_payment_limit").default(false).notNull(),
	info: jsonb().default(null),
	initData: varchar("init_data", { length: 2048 }),
	userInfo: jsonb("user_info").default(null),
	createdAt: timestamp("created_at").default(sql`now()`).notNull(),
	updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
	adminUpdatedAt: timestamp("admin_updated_at"),
	deletedAt: timestamp("deleted_at"),
	ipLocation: jsonb("ip_location").default(null),
}, (table) => [
	unique("quiz_bid_key_key").on(table.key),]);

export const quizContact = pgTable("quiz_contact", {
	id: serial().primaryKey(),
	quizId: integer("quiz_id").notNull().references(() => quiz.id),
	uid: varchar({ length: 36 }).notNull(),
	title: varchar({ length: 100 }),
	description: varchar({ length: 255 }),
	form: jsonb(),
	background: varchar({ length: 255 }),
}, (table) => [
	unique("quiz_contact_uid_key").on(table.uid),]);

export const quizFile = pgTable("quiz_file", {
	id: serial().primaryKey(),
	uid: varchar({ length: 36 }).notNull(),
	quizId: integer("quiz_id").notNull().references(() => quiz.id),
	createdAt: timestamp("created_at").default(sql`now()`).notNull(),
	fileName: varchar("file_name", { length: 255 }).notNull(),
	fileKey: varchar("file_key", { length: 255 }).notNull(),
	fileUrl: varchar("file_url", { length: 255 }).notNull(),
	fileSize: integer("file_size").notNull(),
	fileType: varchar("file_type", { length: 100 }).notNull(),
	sessionKey: varchar("session_key", { length: 36 }).notNull(),
}, (table) => [
	unique("quiz_file_uid_key").on(table.uid),]);

export const quizOpen = pgTable("quiz_open", {
	quizUid: varchar("quiz_uid", { length: 36 }).primaryKey().references(() => quiz.uid),
	opened: bigint({ mode: 'number' }).default(0).notNull(),
	openedUnique: bigint("opened_unique", { mode: 'number' }).default(0).notNull(),
	full: bigint({ mode: 'number' }).default(0).notNull(),
});

export const quizQuestion = pgTable("quiz_question", {
	id: serial().primaryKey(),
	quizId: integer("quiz_id").notNull().references(() => quiz.id),
	type: quizQuestionType(),
	uid: varchar({ length: 36 }).notNull(),
	order: integer().notNull(),
	content: jsonb().default({}),
}, (table) => [
	unique("quiz_question_uid_key").on(table.uid),]);

export const quizThxPage = pgTable("quiz_thx_page", {
	id: serial().primaryKey(),
	quizId: integer("quiz_id").notNull().references(() => quiz.id),
	uid: varchar({ length: 36 }),
	title: varchar({ length: 100 }).default("Спасибо, [name]!").notNull(),
	description: varchar({ length: 255 }).default("Здесь может быть любой текст").notNull(),
	buttons: jsonb(),
	social: jsonb(),
}, (table) => [
	unique("quiz_thx_page_uid_key").on(table.uid),]);

export const upLimit = pgTable("up_limit", {
	id: serial().primaryKey(),
	bid: integer().notNull(),
	price: integer().notNull(),
}, (table) => [
	unique("up_limit_bid_unique").on(table.bid),]);

export const user = pgTable("user", {
	id: serial().primaryKey(),
	uid: varchar({ length: 36 }).notNull(),
	createdAt: timestamp("created_at").default(sql`now()`).notNull(),
	updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
	deletedAt: timestamp("deleted_at"),
	login: varchar({ length: 100 }).notNull(),
	isVerification: boolean("is_verification").default(false).notNull(),
	password: varchar({ length: 255 }).notNull(),
	name: varchar({ length: 250 }),
	planId: integer("plan_id").default(1).notNull(),
	referralId: integer("referral_id"),
	referralCode: varchar("referral_code", { length: 20 }),
	quizCount: integer("quiz_count").default(0).notNull(),
	language: varchar({ length: 2 }).default("en"),
	telegramId: varchar("telegram_id", { length: 50 }),
	isAdmin: boolean("is_admin").default(false).notNull(),
}, (table) => [
	unique("user_login_key").on(table.login),	unique("user_referral_code_key").on(table.referralCode),	unique("user_uid_key").on(table.uid),]);

export const userFile = pgTable("user_file", {
	id: serial().primaryKey(),
	uid: varchar({ length: 36 }).notNull(),
	userId: integer("user_id").notNull(),
	createdAt: timestamp("created_at").default(sql`now()`).notNull(),
	fileName: varchar("file_name", { length: 255 }).notNull(),
	fileKey: varchar("file_key", { length: 255 }).notNull(),
	fileUrl: varchar("file_url", { length: 255 }).notNull(),
}, (table) => [
	unique("user_file_uid_key").on(table.uid),]);

export const userNotification = pgTable("user_notification", {
	id: serial().primaryKey(),
	userId: integer("user_id").notNull().references(() => user.id),
	telegram: boolean().default(false).notNull(),
	email: boolean().default(true).notNull(),
	createdAt: timestamp("created_at").default(sql`now()`).notNull(),
	updatedAt: timestamp("updated_at").default(sql`now()`).notNull(),
}, (table) => [
	unique("user_notification_user_id_key").on(table.userId),]);

export const userPayment = pgTable("user_payment", {
	id: serial().primaryKey(),
	userId: integer("user_id").notNull().references(() => user.id),
	planId: integer("plan_id").notNull().references(() => plan.id),
	paymentId: integer("payment_id").references(() => payment.id),
	createdAt: timestamp("created_at").default(sql`now()`).notNull(),
	finalDayAt: timestamp("final_day_at").default(sql`((CURRENT_DATE + '1 mon'::interval) + ('23:59:00'::time without time zone)::interval)`).notNull(),
	limit: integer().notNull(),
	currentLimit: integer("current_limit").default(0).notNull(),
	extended: boolean().default(true).notNull(),
	month: integer().default(1).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	isPaid: boolean("is_paid").default(false).notNull(),
	startsAt: timestamp("starts_at"),
	scheduledPlanId: integer("scheduled_plan_id").references(() => plan.id),
	paymentAttempts: integer("payment_attempts").default(0).notNull(),
	lastPaymentAttemptAt: timestamp("last_payment_attempt_at"),
	maxPaymentAttempts: integer("max_payment_attempts").default(7).notNull(),
	cancelAutoRenew: boolean("cancel_auto_renew").default(false).notNull(),
	subscriptionId: text("subscription_id"),
});

export const userPaymentPro = pgTable("user_payment_pro", {
	id: serial().primaryKey(),
	userId: integer("user_id").notNull().references(() => user.id),
	upLimitId: integer("up_limit_id").notNull().references(() => upLimit.id),
	createdAt: timestamp("created_at").default(sql`now()`).notNull(),
});
