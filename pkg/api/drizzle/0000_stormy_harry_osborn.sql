CREATE TYPE "public"."code_type" AS ENUM('reset_password', 'change_email', 'registration', 'confirm_auth');--> statement-breakpoint
CREATE TYPE "public"."plan_name" AS ENUM('FREE', 'BASE');--> statement-breakpoint
CREATE TYPE "public"."quiz_question_type" AS ENUM('answer_option', 'variant_image', 'variant_image_text', 'emoji', 'input', 'select', 'date', 'slide', 'file', 'page', 'rating', 'question_group');--> statement-breakpoint
CREATE TABLE "code" (
	"id" serial PRIMARY KEY NOT NULL,
	"life_time" timestamp NOT NULL,
	"next_email_send_available" timestamp NOT NULL,
	"type" "code_type" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"user_id" integer NOT NULL,
	"value" varchar(250) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan" (
	"id" serial PRIMARY KEY NOT NULL,
	"price" integer NOT NULL,
	"name" "plan_name" NOT NULL,
	"bid_month_limit" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_contact_form" (
	"id" serial PRIMARY KEY NOT NULL,
	"quiz_contact_id" integer NOT NULL,
	"label" varchar(50),
	"placeholder" varchar(50),
	"required" boolean DEFAULT true NOT NULL,
	"mask" varchar(255),
	"step" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_contact" (
	"id" serial PRIMARY KEY NOT NULL,
	"quiz_id" integer NOT NULL,
	"uid" varchar(36) NOT NULL,
	"title" varchar(100),
	"description" varchar(255),
	CONSTRAINT "quiz_contact_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "quiz_question" (
	"id" serial PRIMARY KEY NOT NULL,
	"quiz_id" integer NOT NULL,
	"type" "quiz_question_type" NOT NULL,
	"uid" varchar(36) NOT NULL,
	"order" integer NOT NULL,
	"content" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(36) NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"opened" bigint DEFAULT 0 NOT NULL,
	"full" bigint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"name" varchar(255) DEFAULT 'Новый квиз' NOT NULL,
	"start_page" jsonb,
	"question_title" varchar(255) DEFAULT 'Заголовок страницы',
	CONSTRAINT "quiz_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "quiz_thx_page" (
	"id" serial PRIMARY KEY NOT NULL,
	"quiz_id" integer NOT NULL,
	"uid" varchar(36),
	"title" varchar(100) DEFAULT 'Спасибо, [name]!' NOT NULL,
	"description" varchar(255) DEFAULT 'Здесь может быть любой текст' NOT NULL,
	"buttons" jsonb,
	"social" jsonb,
	CONSTRAINT "quiz_thx_page_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "quiz_open" (
	"uid" varchar(36) PRIMARY KEY NOT NULL,
	"quiz_uid" varchar(36) NOT NULL,
	"unique_id" varchar(36) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(36) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"login" varchar(100) NOT NULL,
	"is_verification" boolean DEFAULT false NOT NULL,
	"password" varchar(255) NOT NULL,
	"name" varchar(250),
	"plan_id" integer DEFAULT 1 NOT NULL,
	"referral_id" integer,
	"quiz_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "user_uid_unique" UNIQUE("uid"),
	CONSTRAINT "user_login_unique" UNIQUE("login")
);
--> statement-breakpoint
CREATE TABLE "user_file" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" varchar(36) NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_key" varchar(255) NOT NULL,
	"file_url" varchar(255) NOT NULL,
	CONSTRAINT "user_file_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
ALTER TABLE "quiz_contact_form" ADD CONSTRAINT "quiz_contact_form_quiz_contact_id_quiz_contact_id_fk" FOREIGN KEY ("quiz_contact_id") REFERENCES "public"."quiz_contact"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_contact" ADD CONSTRAINT "quiz_contact_quiz_id_quiz_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quiz"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_question" ADD CONSTRAINT "quiz_question_quiz_id_quiz_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quiz"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_thx_page" ADD CONSTRAINT "quiz_thx_page_quiz_id_quiz_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quiz"("id") ON DELETE no action ON UPDATE no action;