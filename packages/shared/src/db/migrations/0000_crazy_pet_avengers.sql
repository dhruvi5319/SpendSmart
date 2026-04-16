CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"display_name" varchar(100),
	"primary_currency" varchar(3) DEFAULT 'USD',
	"household_size" integer DEFAULT 1,
	"reminder_time" time DEFAULT '20:00:00',
	"reminder_enabled" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"name" varchar(50) NOT NULL,
	"icon" varchar(50),
	"color" varchar(7),
	"is_default" boolean DEFAULT false,
	"budget_amount" numeric(12, 2),
	"budget_currency" varchar(3) DEFAULT 'USD',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category_id" uuid,
	"amount" numeric(12, 2) NOT NULL,
	"user_share" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD',
	"exchange_rate" numeric(10, 6) DEFAULT '1.0',
	"description" varchar(255) NOT NULL,
	"notes" text,
	"expense_date" date NOT NULL,
	"is_household" boolean DEFAULT false,
	"household_size" integer DEFAULT 1,
	"is_recurring" boolean DEFAULT false,
	"recurring_id" uuid,
	"receipt_url" varchar(500),
	"source" varchar(20) DEFAULT 'manual',
	"ml_category_confidence" numeric(5, 4),
	"card_id" uuid,
	"splitwise_expense_id" bigint,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" varchar(20) NOT NULL,
	"balance" numeric(14, 2) DEFAULT '0',
	"currency" varchar(3) DEFAULT 'USD',
	"institution" varchar(100),
	"is_asset" boolean DEFAULT true,
	"notes" text,
	"last_updated" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;