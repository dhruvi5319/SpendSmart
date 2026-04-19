import { pgTable, uuid, varchar, text, numeric, date, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';
import { categories } from './categories';

/**
 * Bills table - Recurring Bills Management
 * Phase 3 - Financial Planning
 */
export const bills = pgTable('bills', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),

  // Bill details
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),

  // Due date and frequency
  dueDate: date('due_date').notNull(),
  frequency: varchar('frequency', { length: 20 }).notNull(), // weekly, biweekly, monthly, quarterly, yearly

  // Reminders
  reminderDays: integer('reminder_days').default(3),

  // Autopay settings
  isAutopay: boolean('is_autopay').default(false),
  autopayAccount: varchar('autopay_account', { length: 100 }),

  // Status
  isActive: boolean('is_active').default(true),

  // Visual
  icon: varchar('icon', { length: 10 }),
  color: varchar('color', { length: 7 }),

  // Last paid tracking
  lastPaidDate: date('last_paid_date'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export type Bill = typeof bills.$inferSelect;
export type NewBill = typeof bills.$inferInsert;
