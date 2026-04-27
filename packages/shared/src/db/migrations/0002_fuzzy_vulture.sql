ALTER TABLE "users" ADD COLUMN "monthly_income" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pay_frequency" varchar(20) DEFAULT 'biweekly';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "next_pay_date" date;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "is_notable" boolean DEFAULT false;