import { pgTable, uuid, varchar, integer, boolean, time, timestamp } from 'drizzle-orm/pg-core';

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
  reminderTime: time('reminder_time').default('20:00:00'),
  reminderEnabled: boolean('reminder_enabled').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
