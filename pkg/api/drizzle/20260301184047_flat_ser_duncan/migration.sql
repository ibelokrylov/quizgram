-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "code_type" AS ENUM('reset_password', 'change_email', 'registration', 'confirm_auth');--> statement-breakpoint
CREATE TYPE "payment_status" AS ENUM('pending', 'paid', 'underpaid', 'expired', 'failed');--> statement-breakpoint
CREATE TYPE "plan_name" AS ENUM('FREE', 'BASE', 'PRO_PLUS');--> statement-breakpoint
CREATE TYPE "quiz_question_type" AS ENUM('answer_option', 'variant_image', 'variant_image_text', 'emoji', 'input', 'select', 'date', 'slide', 'file', 'page', 'rating', 'question_group');--> statement-breakpoint
CREATE TYPE "payment_provider" AS ENUM('unitpay');--> statement-breakpoint
CREATE TYPE "payment_method" AS ENUM('card', 'bank_transfer');--> statement-breakpoint
CREATE TYPE "email_type" AS ENUM('reset_password', 'payment', 'payment_notification', 'subscribe_send_info_payment_2_days');--> statement-breakpoint
CREATE TABLE "_migrations" (
	"name" text PRIMARY KEY,
	"executed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "code" (
	"id" serial PRIMARY KEY,
	"life_time" timestamp NOT NULL,
	"next_email_send_available" timestamp NOT NULL,
	"type" "code_type" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"user_id" integer NOT NULL,
	"value" varchar(250) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email" (
	"id" serial PRIMARY KEY,
	"type" "email_type" NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"plan_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'USDT' NOT NULL,
	"status" "payment_status" DEFAULT 'pending'::"payment_status" NOT NULL,
	"method" "payment_method" DEFAULT 'card'::"payment_method" NOT NULL,
	"provider" "payment_provider" DEFAULT 'unitpay'::"payment_provider" NOT NULL,
	"invoice_id" text,
	"invoice_url" text,
	"track_id" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan" (
	"id" serial PRIMARY KEY,
	"price" integer NOT NULL,
	"name" "plan_name" NOT NULL,
	"bid_month_limit" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz" (
	"id" serial PRIMARY KEY,
	"uid" varchar(36) NOT NULL CONSTRAINT "quiz_uid_key" UNIQUE,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"name" varchar(255) DEFAULT 'Новый квиз' NOT NULL,
	"is_show_logo" boolean DEFAULT true NOT NULL,
	"start_page" jsonb,
	"question_title" varchar(255) DEFAULT 'Заголовок страницы',
	"isShared" boolean DEFAULT false,
	"nodes" jsonb,
	"edges" jsonb
);
--> statement-breakpoint
CREATE TABLE "quiz_bid" (
	"id" serial PRIMARY KEY,
	"quiz_id" integer NOT NULL,
	"key" varchar(36) DEFAULT gen_random_uuid() NOT NULL CONSTRAINT "quiz_bid_key_key" UNIQUE,
	"answer" jsonb NOT NULL,
	"questions" jsonb,
	"contacts" jsonb DEFAULT 'null',
	"contacts_form" jsonb DEFAULT 'null',
	"first" boolean DEFAULT false NOT NULL,
	"status" varchar(20) DEFAULT 'create' NOT NULL,
	"is_full" boolean DEFAULT false NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"is_equal_payment_limit" boolean DEFAULT false NOT NULL,
	"info" jsonb DEFAULT 'null',
	"init_data" varchar(2048),
	"user_info" jsonb DEFAULT 'null',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"admin_updated_at" timestamp,
	"deleted_at" timestamp,
	"ip_location" jsonb DEFAULT 'null'
);
--> statement-breakpoint
CREATE TABLE "quiz_contact" (
	"id" serial PRIMARY KEY,
	"quiz_id" integer NOT NULL,
	"uid" varchar(36) NOT NULL CONSTRAINT "quiz_contact_uid_key" UNIQUE,
	"title" varchar(100),
	"description" varchar(255),
	"form" jsonb,
	"background" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "quiz_file" (
	"id" serial PRIMARY KEY,
	"uid" varchar(36) NOT NULL CONSTRAINT "quiz_file_uid_key" UNIQUE,
	"quiz_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_key" varchar(255) NOT NULL,
	"file_url" varchar(255) NOT NULL,
	"file_size" integer NOT NULL,
	"file_type" varchar(100) NOT NULL,
	"session_key" varchar(36) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_open" (
	"quiz_uid" varchar(36) PRIMARY KEY,
	"opened" bigint DEFAULT 0 NOT NULL,
	"opened_unique" bigint DEFAULT 0 NOT NULL,
	"full" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_question" (
	"id" serial PRIMARY KEY,
	"quiz_id" integer NOT NULL,
	"type" "quiz_question_type",
	"uid" varchar(36) NOT NULL CONSTRAINT "quiz_question_uid_key" UNIQUE,
	"order" integer NOT NULL,
	"content" jsonb DEFAULT '{}'
);
--> statement-breakpoint
CREATE TABLE "quiz_thx_page" (
	"id" serial PRIMARY KEY,
	"quiz_id" integer NOT NULL,
	"uid" varchar(36) CONSTRAINT "quiz_thx_page_uid_key" UNIQUE,
	"title" varchar(100) DEFAULT 'Спасибо, [name]!' NOT NULL,
	"description" varchar(255) DEFAULT 'Здесь может быть любой текст' NOT NULL,
	"buttons" jsonb,
	"social" jsonb
);
--> statement-breakpoint
CREATE TABLE "up_limit" (
	"id" serial PRIMARY KEY,
	"bid" integer NOT NULL CONSTRAINT "up_limit_bid_unique" UNIQUE,
	"price" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" serial PRIMARY KEY,
	"uid" varchar(36) NOT NULL CONSTRAINT "user_uid_key" UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"login" varchar(100) NOT NULL CONSTRAINT "user_login_key" UNIQUE,
	"is_verification" boolean DEFAULT false NOT NULL,
	"password" varchar(255) NOT NULL,
	"name" varchar(250),
	"plan_id" integer DEFAULT 1 NOT NULL,
	"referral_id" integer,
	"referral_code" varchar(20) CONSTRAINT "user_referral_code_key" UNIQUE,
	"quiz_count" integer DEFAULT 0 NOT NULL,
	"language" varchar(2) DEFAULT 'en',
	"telegram_id" varchar(50),
	"is_admin" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_file" (
	"id" serial PRIMARY KEY,
	"uid" varchar(36) NOT NULL CONSTRAINT "user_file_uid_key" UNIQUE,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_key" varchar(255) NOT NULL,
	"file_url" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_notification" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL CONSTRAINT "user_notification_user_id_key" UNIQUE,
	"telegram" boolean DEFAULT false NOT NULL,
	"email" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_payment" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"plan_id" integer NOT NULL,
	"payment_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"final_day_at" timestamp DEFAULT ((CURRENT_DATE + '1 mon'::interval) + ('23:59:00'::time without time zone)::interval) NOT NULL,
	"limit" integer NOT NULL,
	"current_limit" integer DEFAULT 0 NOT NULL,
	"extended" boolean DEFAULT true NOT NULL,
	"month" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_paid" boolean DEFAULT false NOT NULL,
	"starts_at" timestamp,
	"scheduled_plan_id" integer,
	"payment_attempts" integer DEFAULT 0 NOT NULL,
	"last_payment_attempt_at" timestamp,
	"max_payment_attempts" integer DEFAULT 7 NOT NULL,
	"cancel_auto_renew" boolean DEFAULT false NOT NULL,
	"subscription_id" text
);
--> statement-breakpoint
CREATE TABLE "user_payment_pro" (
	"id" serial PRIMARY KEY,
	"user_id" integer NOT NULL,
	"up_limit_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_plan_id_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan"("id");--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "quiz_contact" ADD CONSTRAINT "quiz_contact_quiz_id_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quiz"("id");--> statement-breakpoint
ALTER TABLE "quiz_question" ADD CONSTRAINT "quiz_question_quiz_id_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quiz"("id");--> statement-breakpoint
ALTER TABLE "quiz" ADD CONSTRAINT "quiz_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "quiz_thx_page" ADD CONSTRAINT "quiz_thx_page_quiz_id_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quiz"("id");--> statement-breakpoint
ALTER TABLE "quiz_bid" ADD CONSTRAINT "quiz_bid_quiz_id_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quiz"("id");--> statement-breakpoint
ALTER TABLE "quiz_file" ADD CONSTRAINT "quiz_file_quiz_id_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quiz"("id");--> statement-breakpoint
ALTER TABLE "quiz_open" ADD CONSTRAINT "quiz_open_quiz_uid_quiz_uid_fkey" FOREIGN KEY ("quiz_uid") REFERENCES "quiz"("uid");--> statement-breakpoint
ALTER TABLE "user_notification" ADD CONSTRAINT "user_notification_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "user_payment" ADD CONSTRAINT "user_payment_payment_id_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment"("id");--> statement-breakpoint
ALTER TABLE "user_payment" ADD CONSTRAINT "user_payment_plan_id_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plan"("id");--> statement-breakpoint
ALTER TABLE "user_payment" ADD CONSTRAINT "user_payment_scheduled_plan_id_plan_id_fkey" FOREIGN KEY ("scheduled_plan_id") REFERENCES "plan"("id");--> statement-breakpoint
ALTER TABLE "user_payment" ADD CONSTRAINT "user_payment_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "user_payment_pro" ADD CONSTRAINT "user_payment_pro_up_limit_id_up_limit_id_fkey" FOREIGN KEY ("up_limit_id") REFERENCES "up_limit"("id");--> statement-breakpoint
ALTER TABLE "user_payment_pro" ADD CONSTRAINT "user_payment_pro_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");
*/