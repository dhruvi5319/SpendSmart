import { pgTable, uuid, varchar, integer, boolean, time, timestamp, decimal, date } from 'drizzle-orm/pg-core';

/**
 * Pay frequency options
 */
export const payFrequencyEnum = [
  'weekly',      // Every week
  'biweekly',    // Every 2 weeks
  'semimonthly', // Twice a month (1st and 15th)
  'monthly',     // Once a month
] as const;
export type PayFrequency = (typeof payFrequencyEnum)[number];

/**
 * Users table - extends Supabase auth.users
 * Based on Technical Documentation
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // References auth.users(id)
  email: varchar('email', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 100 }),
  primaryCurrency: varchar('primary_currency', { length: 3 }).default('USD'),
  householdSize: integer('household_size').default(1),
  monthlyIncome: decimal('monthly_income', { precision: 14, scale: 2 }), // Monthly income for budget calculations
  payFrequency: varchar('pay_frequency', { length: 20 }).default('biweekly'), // How often user gets paid
  nextPayDate: date('next_pay_date'), // Next expected pay date
  reminderTime: time('reminder_time').default('20:00:00'),
  reminderEnabled: boolean('reminder_enabled').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
